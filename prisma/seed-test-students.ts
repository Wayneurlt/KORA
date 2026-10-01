import { existsSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

if (existsSync('.env')) process.loadEnvFile('.env')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Bulk, deterministic test data for the Students & Parents screens — separate
// from prisma/seed.ts so the core demo seed stays small while this can grow
// a realistic volume of students/parents for list, search and pagination testing.

const CHILD_FIRST_NAMES = [
  'Brian', 'Sharon', 'Kevin', 'Faith', 'Dennis', 'Mercy', 'Ian', 'Lilian', 'Peter', 'Grace',
  'Collins', 'Esther', 'Victor', 'Winnie', 'Felix', 'Caroline', 'Erick', 'Beatrice', 'Joseph', 'Susan',
  'Samuel', 'Agnes', 'Allan', 'Joy', 'Moses', 'Irene', 'Daniel', 'Purity', 'Patrick', 'Eunice',
  'Simon', 'Catherine', 'Anthony', 'Doreen', 'Emmanuel', 'Rose', 'Geoffrey', 'Diana', 'Stephen', 'Nancy',
  'Timothy', 'Mitchelle', 'Brandon', 'Valerie', 'Kelvin', 'Sandra', 'Austin', 'Wendy', 'Derrick', 'Michelle'
]

const FAMILY_SURNAMES = [
  'Otieno', 'Wanjiru', 'Kamau', 'Achieng', 'Mutua', 'Kiprop', 'Atieno', 'Njoroge', 'Wambui', 'Kiplagat',
  'Mwangi', 'Nyambura', 'Omondi', 'Chebet', 'Kariuki', 'Akinyi', 'Kigen', 'Njeri', 'Odhiambo', 'Wafula'
]

const PARENT_FIRST_NAMES = [
  'John', 'Alice', 'Samuel', 'Esther', 'Michael', 'Jane', 'David', 'Mary', 'Francis', 'Lucy',
  'Paul', 'Ann', 'George', 'Judy', 'Charles', 'Nancy', 'Robert', 'Elizabeth', 'Kennedy', 'Carol'
]

const CLASSES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']
const STREAMS = ['A', 'B']
const STUDENTS_PER_STREAM = 3

// How many children land in the same family, consumed in order and repeated.
const FAMILY_SIZE_PATTERN = [1, 1, 2, 1, 2, 1, 1, 3, 1, 2]
const VERIFICATION_PATTERN = ['VERIFIED', 'VERIFIED', 'PENDING', 'VERIFIED', 'UNVERIFIED'] as const

const ADMISSION_PREFIX = 'KOR-2'
const WHATSAPP_BASE = 254_711_000_000 // distinct from the primary seed's 2547000000xx range

interface StudentSeed {
  admissionNumber: string
  firstName: string
  lastName: string
  className: string
  stream: string
  dateOfBirth: Date
}

interface FamilyGroup {
  surname: string
  parentFirstName: string
  whatsappNumber: string
  email: string
  verificationStatus: (typeof VERIFICATION_PATTERN)[number]
  students: StudentSeed[]
}

function buildStudents(): StudentSeed[] {
  const students: StudentSeed[] = []
  let index = 0

  for (const [gradeIndex, className] of CLASSES.entries()) {
    for (const stream of STREAMS) {
      for (let i = 0; i < STUDENTS_PER_STREAM; i++) {
        const age = 6 + gradeIndex
        const birthYear = new Date().getFullYear() - age
        const birthMonth = (index % 12) + 1
        const birthDay = (index % 28) + 1

        students.push({
          admissionNumber: `${ADMISSION_PREFIX}${String(index + 1).padStart(3, '0')}`,
          firstName: CHILD_FIRST_NAMES[index % CHILD_FIRST_NAMES.length]!,
          lastName: '',
          className,
          stream,
          dateOfBirth: new Date(Date.UTC(birthYear, birthMonth - 1, birthDay))
        })
        index++
      }
    }
  }

  return students
}

function groupIntoFamilies(students: StudentSeed[]): FamilyGroup[] {
  const families: FamilyGroup[] = []
  let cursor = 0
  let familyIndex = 0

  while (cursor < students.length) {
    const size = FAMILY_SIZE_PATTERN[familyIndex % FAMILY_SIZE_PATTERN.length]!
    const members = students.slice(cursor, cursor + size)
    const surname = FAMILY_SURNAMES[familyIndex % FAMILY_SURNAMES.length]!
    const parentFirstName = PARENT_FIRST_NAMES[familyIndex % PARENT_FIRST_NAMES.length]!

    for (const member of members) member.lastName = surname

    families.push({
      surname,
      parentFirstName,
      whatsappNumber: String(WHATSAPP_BASE + familyIndex),
      email: `${parentFirstName.toLowerCase()}.${surname.toLowerCase()}${familyIndex}@example.com`,
      verificationStatus: VERIFICATION_PATTERN[familyIndex % VERIFICATION_PATTERN.length]!,
      students: members
    })

    cursor += size
    familyIndex++
  }

  return families
}

async function main() {
  const students = buildStudents()
  const families = groupIntoFamilies(students)

  console.log(`Seeding ${students.length} test students across ${families.length} families...`)

  for (const student of students) {
    await prisma.student.upsert({
      where: { admissionNumber: student.admissionNumber },
      update: {},
      create: {
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.className,
        stream: student.stream,
        dateOfBirth: student.dateOfBirth
      }
    })
  }

  for (const family of families) {
    const parent = await prisma.parent.upsert({
      where: { whatsappNumber: family.whatsappNumber },
      update: {},
      create: {
        firstName: family.parentFirstName,
        lastName: family.surname,
        whatsappNumber: family.whatsappNumber,
        phoneNumber: family.whatsappNumber,
        email: family.email,
        verificationStatus: family.verificationStatus
      }
    })

    for (const member of family.students) {
      const student = await prisma.student.findUniqueOrThrow({
        where: { admissionNumber: member.admissionNumber }
      })

      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        update: {},
        create: { parentId: parent.id, studentId: student.id, relationship: 'Parent' }
      })
    }
  }

  console.log(`Done — ${students.length} students and ${families.length} parents are ready for testing.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
