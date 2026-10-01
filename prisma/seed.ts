import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPasswordScrypt } from '../server/utils/password'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const STAFF = [
  { name: 'Amani Otieno', email: 'admin@kora.app', role: 'ADMIN' as const },
  { name: 'Brenda Kiptoo', email: 'finance@kora.app', role: 'FINANCE' as const },
  { name: 'Charles Mwangi', email: 'academic@kora.app', role: 'ACADEMIC' as const },
  { name: 'Diana Wambui', email: 'support@kora.app', role: 'SUPPORT' as const }
]

const SEED_PASSWORD = 'Password123!'

const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'English', code: 'ENG' },
  { name: 'Science', code: 'SCI' },
  { name: 'Kiswahili', code: 'KIS' }
]

const GRADE_BANDS = [
  { grade: 'A', minScore: 80, maxScore: 100 },
  { grade: 'B', minScore: 70, maxScore: 79 },
  { grade: 'C', minScore: 60, maxScore: 69 },
  { grade: 'D', minScore: 50, maxScore: 59 },
  { grade: 'E', minScore: 0, maxScore: 49 }
]

const STUDENTS = [
  { admissionNumber: 'KOR-1001', firstName: 'Brian', lastName: 'Gift', className: 'Grade 6', stream: '6A' },
  { admissionNumber: 'KOR-1002', firstName: 'Sharon', lastName: 'Gift', className: 'Grade 3', stream: '3B' },
  { admissionNumber: 'KOR-1003', firstName: 'Kevin', lastName: 'Otieno', className: 'Grade 6', stream: '6A' },
  { admissionNumber: 'KOR-1004', firstName: 'Faith', lastName: 'Njeri', className: 'Grade 4', stream: '4A' },
  { admissionNumber: 'KOR-1005', firstName: 'Dennis', lastName: 'Kamau', className: 'Grade 5', stream: '5B' },
  { admissionNumber: 'KOR-1006', firstName: 'Mercy', lastName: 'Achieng', className: 'Grade 2', stream: '2A' },
  { admissionNumber: 'KOR-1007', firstName: 'Ian', lastName: 'Mutua', className: 'Grade 6', stream: '6B' },
  { admissionNumber: 'KOR-1008', firstName: 'Lilian', lastName: 'Wanjiru', className: 'Grade 3', stream: '3A' },
  { admissionNumber: 'KOR-1009', firstName: 'Peter', lastName: 'Kiprop', className: 'Grade 4', stream: '4B' },
  { admissionNumber: 'KOR-1010', firstName: 'Grace', lastName: 'Atieno', className: 'Grade 5', stream: '5A' }
]

const PARENTS = [
  { firstName: 'John', lastName: 'Gift', whatsappNumber: '254700000001', phoneNumber: '254700000001', email: 'john.gift@example.com', children: ['KOR-1001', 'KOR-1002'] },
  { firstName: 'Alice', lastName: 'Otieno', whatsappNumber: '254700000002', phoneNumber: '254700000002', email: 'alice.otieno@example.com', children: ['KOR-1003'] },
  { firstName: 'Samuel', lastName: 'Njeri', whatsappNumber: '254700000003', phoneNumber: '254700000003', email: 'samuel.njeri@example.com', children: ['KOR-1004'] },
  { firstName: 'Esther', lastName: 'Kamau', whatsappNumber: '254700000004', phoneNumber: '254700000004', email: 'esther.kamau@example.com', children: ['KOR-1005', 'KOR-1006'] },
  { firstName: 'Michael', lastName: 'Mutua', whatsappNumber: '254700000005', phoneNumber: '254700000005', email: 'michael.mutua@example.com', children: ['KOR-1007', 'KOR-1008', 'KOR-1009', 'KOR-1010'] }
]

async function main() {
  console.log('Seeding school settings...')
  const existingSettings = await prisma.schoolSettings.findFirst()
  const settings = existingSettings
    ? existingSettings
    : await prisma.schoolSettings.create({
        data: {
          name: 'Kora',
          phone: '+254700123456',
          email: 'info@kora.app',
          address: 'Nairobi, Kenya',
          website: 'https://kora.app',
          currency: 'KES',
          timezone: 'Africa/Nairobi'
        }
      })

  const gradeBandCount = await prisma.gradeBand.count({ where: { schoolSettingsId: settings.id } })
  if (gradeBandCount === 0) {
    console.log('Seeding grade bands...')
    await prisma.gradeBand.createMany({
      data: GRADE_BANDS.map(band => ({ ...band, schoolSettingsId: settings.id }))
    })
  }

  console.log('Seeding staff users...')
  const passwordHash = await hashPasswordScrypt(SEED_PASSWORD)
  for (const staff of STAFF) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: { ...staff, passwordHash }
    })
  }

  console.log('Seeding subjects...')
  for (const subject of SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: subject.code },
      update: {},
      create: subject
    })
  }

  console.log('Seeding students...')
  for (const student of STUDENTS) {
    await prisma.student.upsert({
      where: { admissionNumber: student.admissionNumber },
      update: {},
      create: student
    })
  }

  console.log('Seeding parents and linking children...')
  for (const parent of PARENTS) {
    const record = await prisma.parent.upsert({
      where: { whatsappNumber: parent.whatsappNumber },
      update: {},
      create: {
        firstName: parent.firstName,
        lastName: parent.lastName,
        whatsappNumber: parent.whatsappNumber,
        phoneNumber: parent.phoneNumber,
        email: parent.email,
        verificationStatus: 'VERIFIED'
      }
    })

    for (const admissionNumber of parent.children) {
      const student = await prisma.student.findUnique({ where: { admissionNumber } })
      if (!student) continue

      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: record.id, studentId: student.id } },
        update: {},
        create: { parentId: record.id, studentId: student.id, relationship: 'Parent' }
      })
    }
  }

  console.log('Seed complete. Staff can log in with password:', SEED_PASSWORD)
  for (const staff of STAFF) {
    console.log(`  ${staff.role.padEnd(8)} ${staff.email}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
