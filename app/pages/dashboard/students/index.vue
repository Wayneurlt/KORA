<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'students',
  title: 'Students',
  description: 'Manage student records and keep parent-child relationships accurate.',
  hideHeader: true
})

const route = useRoute()
const router = useRouter()

// Parents used to be a tab here; old links land on the Parents page.
if (route.query.tab === 'parents') await navigateTo('/dashboard/parents', { replace: true })

const search = ref('')
const className = ref('')
const status = ref<'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'ALL'>('ACTIVE')
const page = ref(1)
watch([search, className, status], () => {
  page.value = 1
})

const { canManage } = usePermissions()

const { data: students, status: studentsStatus, refresh: refreshStudents } = await useFetch('/api/students', {
  query: { search, className, status, page }
})

const classOptions = computed(() => [
  { value: '', label: 'All classes' },
  ...(students.value?.classes ?? []).map(item => ({ value: item.className, label: `${item.className} (${item.count})` }))
])

const statusOptions = [
  { value: 'ACTIVE' as const, label: 'Active' },
  { value: 'INACTIVE' as const, label: 'Inactive' },
  { value: 'GRADUATED' as const, label: 'Graduated' },
  { value: 'ALL' as const, label: 'All' }
]

const showFees = computed(() => students.value?.items.some(item => item.fee !== null) ?? false)

// Detail panel -----------------------------------------------------------
const panelOpen = ref(false)
const selectedId = ref<string | null>(null)
function openStudent(id: string) {
  selectedId.value = id
  panelOpen.value = true
}

// Forms ------------------------------------------------------------------
const studentFormOpen = ref(false)

async function onStudentCreated(id: string) {
  await refreshStudents()
  openStudent(id)
}

// The dashboard's "Add Student" button links here with ?new=1.
onMounted(() => {
  if (route.query.new && canManage('students')) {
    studentFormOpen.value = true
    router.replace({ query: { ...route.query, new: undefined } })
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template #actions>
        <button
          v-if="canManage('students')"
          type="button"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          @click="studentFormOpen = true"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          Add student
        </button>
      </template>
    </PageHeader>

    <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
      <DataSearchField
        v-model="search"
        placeholder="Search name, admission no. or parent"
      />
      <DataSelect
        v-model="className"
        label="Class"
        icon="i-lucide-school"
        :options="classOptions"
      />
      <DataFilterPills
        v-model="status"
        label="Status"
        :options="statusOptions"
        class="sm:ml-auto"
      />
    </div>

    <div
      class="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-shell-card transition-opacity"
      :class="studentsStatus === 'pending' && 'opacity-60'"
    >
      <div
        class="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_24px] gap-4 border-b border-shell-line px-4 py-3 text-[11px] font-medium tracking-wide text-shell-muted uppercase md:grid"
        :class="!showFees && 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_24px]'"
      >
        <span>Student</span>
        <span>Class</span>
        <span>Parents</span>
        <span v-if="showFees">Fee balance</span>
        <span />
      </div>

      <ul class="flex-1 divide-y divide-shell-line">
        <li
          v-for="student in students?.items"
          :key="student.id"
        >
          <button
            type="button"
            class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-shell-panel/60 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_24px]"
            :class="!showFees && 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_24px]'"
            @click="openStudent(student.id)"
          >
            <span class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
                :class="avatarTone(`${student.firstName} ${student.lastName}`)"
              >{{ initials(`${student.firstName} ${student.lastName}`) }}</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{{ student.firstName }} {{ student.lastName }}</span>
                <span class="block text-xs text-shell-muted">{{ student.admissionNumber }}<span class="md:hidden"> · {{ student.className }}</span></span>
              </span>
            </span>
            <span class="hidden text-sm md:block">
              {{ student.className }}<span
                v-if="student.stream"
                class="text-shell-muted"
              > · {{ student.stream }}</span>
            </span>
            <span class="hidden min-w-0 md:block">
              <span
                v-if="student.parents.length"
                class="block truncate text-sm"
              >{{ student.parents.map(parent => parent.name).join(', ') }}</span>
              <span
                v-else
                class="text-sm text-shell-muted"
              >No parent linked</span>
            </span>
            <span
              v-if="student.fee"
              class="flex items-center gap-2 justify-self-end md:justify-self-start"
            >
              <DataChip :status="student.fee.status" />
              <span
                v-if="student.fee.balance"
                class="hidden text-sm font-medium lg:inline"
              >{{ formatMoney(student.fee.balance) }}</span>
            </span>
            <UIcon
              name="i-lucide-chevron-right"
              class="hidden size-4 text-shell-muted md:block"
            />
          </button>
        </li>
      </ul>

      <EmptyState
        v-if="students && !students.items.length"
        icon="i-lucide-search-x"
        title="No students match"
        description="Try a different name, class or status."
        class="min-h-72"
      />

      <DataPager
        v-if="students?.total"
        v-model="page"
        :total="students.total"
        :page-size="students.pageSize"
        noun="students"
      />
    </div>

    <StudentPanel
      v-model:open="panelOpen"
      :student-id="selectedId"
      @changed="refreshStudents"
    />

    <StudentsStudentFormModal
      v-model:open="studentFormOpen"
      @saved="onStudentCreated"
    />
  </div>
</template>
