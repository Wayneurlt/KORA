<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'students',
  title: 'Students & Parents',
  description: 'Manage student records and keep parent-child relationships accurate.',
  hideHeader: true
})

const route = useRoute()
const router = useRouter()

const tab = ref<'students' | 'parents'>(route.query.tab === 'parents' ? 'parents' : 'students')
watch(tab, value => router.replace({ query: { ...route.query, tab: value === 'parents' ? 'parents' : undefined } }))

// Students ---------------------------------------------------------------
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

// Parents ----------------------------------------------------------------
const parentSearch = ref('')
const verification = ref<'ALL' | 'VERIFIED' | 'PENDING' | 'UNVERIFIED'>('ALL')
const parentPage = ref(1)
watch([parentSearch, verification], () => {
  parentPage.value = 1
})

const { data: parents, status: parentsStatus, refresh: refreshParents } = await useFetch('/api/parents', {
  query: { search: parentSearch, verification, page: parentPage }
})

const verificationOptions = computed(() => {
  const counts = parents.value?.counts ?? {}
  const total = (counts.VERIFIED ?? 0) + (counts.PENDING ?? 0) + (counts.UNVERIFIED ?? 0)
  return [
    { value: 'ALL' as const, label: 'All', count: total },
    { value: 'VERIFIED' as const, label: 'Verified', count: counts.VERIFIED ?? 0 },
    { value: 'PENDING' as const, label: 'Pending', count: counts.PENDING ?? 0 },
    { value: 'UNVERIFIED' as const, label: 'Unverified', count: counts.UNVERIFIED ?? 0 }
  ]
})

// Detail panel -----------------------------------------------------------
const panelOpen = ref(false)
const selectedId = ref<string | null>(null)
function openStudent(id: string) {
  selectedId.value = id
  panelOpen.value = true
}

// Forms ------------------------------------------------------------------
const studentFormOpen = ref(false)
const parentFormOpen = ref(false)
const editingParent = ref<NonNullable<typeof parents.value>['items'][number] | null>(null)

function addParent() {
  editingParent.value = null
  parentFormOpen.value = true
}

function editParent(parent: NonNullable<typeof parents.value>['items'][number]) {
  editingParent.value = parent
  parentFormOpen.value = true
}

async function refreshAll() {
  await Promise.all([refreshStudents(), refreshParents()])
}

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
          @click="tab === 'students' ? (studentFormOpen = true) : addParent()"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          {{ tab === 'students' ? 'Add student' : 'Add parent' }}
        </button>
        <DataFilterPills
          v-model="tab"
          label="Show"
          :options="[
            { value: 'students', label: 'Students', count: students?.total },
            { value: 'parents', label: 'Parents', count: parents?.total }
          ]"
        />
      </template>
    </PageHeader>

    <!-- Students -->
    <template v-if="tab === 'students'">
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
    </template>

    <!-- Parents -->
    <template v-else>
      <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
        <DataSearchField
          v-model="parentSearch"
          placeholder="Search name, number or child"
        />
        <DataFilterPills
          v-model="verification"
          label="Verification"
          :options="verificationOptions"
          class="sm:ml-auto"
        />
      </div>

      <div
        class="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-shell-card transition-opacity"
        :class="parentsStatus === 'pending' && 'opacity-60'"
      >
        <div class="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-4 border-b border-shell-line px-4 py-3 text-[11px] font-medium tracking-wide text-shell-muted uppercase md:grid">
          <span>Parent</span>
          <span>WhatsApp</span>
          <span>Children</span>
          <span>Status</span>
          <span>Last message</span>
        </div>

        <ul class="flex-1 divide-y divide-shell-line">
          <li
            v-for="parent in parents?.items"
            :key="parent.id"
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]"
          >
            <span class="flex min-w-0 items-center gap-3">
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
                :class="avatarTone(parent.name)"
              >{{ initials(parent.name) }}</span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{{ parent.name }}</span>
                <span class="block truncate text-xs text-shell-muted">{{ parent.email ?? 'No email' }}</span>
              </span>
            </span>
            <a
              :href="waLink(parent.whatsappNumber)"
              target="_blank"
              rel="noopener"
              class="hidden items-center gap-1.5 text-sm text-leaf-700 hover:underline md:flex dark:text-leaf-400"
            >
              <UIcon
                name="i-simple-icons-whatsapp"
                class="size-3.5"
              />
              +{{ parent.whatsappNumber }}
            </a>
            <span class="col-span-2 flex flex-wrap gap-1.5 md:col-span-1">
              <button
                v-for="child in parent.children"
                :key="child.id"
                type="button"
                class="rounded-full bg-shell-panel px-2.5 py-1 text-xs transition-colors hover:bg-leaf-50 hover:text-leaf-800"
                @click="openStudent(child.id)"
              >
                {{ child.name }} <span class="text-shell-muted">· {{ child.className }}</span>
              </button>
            </span>
            <span class="row-start-1 justify-self-end md:row-auto md:justify-self-start">
              <DataChip :status="parent.verificationStatus" />
            </span>
            <span class="hidden items-center justify-between gap-2 text-sm text-shell-muted md:flex">
              {{ formatRelative(parent.lastMessageAt) }}
              <button
                v-if="canManage('students')"
                type="button"
                class="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-shell-panel hover:text-leaf-800"
                :aria-label="`Edit ${parent.name}`"
                @click="editParent(parent)"
              >
                <UIcon
                  name="i-lucide-pencil"
                  class="size-4"
                />
              </button>
            </span>
          </li>
        </ul>

        <EmptyState
          v-if="parents && !parents.items.length"
          icon="i-lucide-search-x"
          title="No parents match"
          description="Try a different name, number or verification status."
          class="min-h-72"
        />

        <DataPager
          v-if="parents?.total"
          v-model="parentPage"
          :total="parents.total"
          :page-size="parents.pageSize"
          noun="parents"
        />
      </div>
    </template>

    <StudentPanel
      v-model:open="panelOpen"
      :student-id="selectedId"
      @changed="refreshAll"
    />

    <StudentsStudentFormModal
      v-model:open="studentFormOpen"
      @saved="onStudentCreated"
    />
    <StudentsParentFormModal
      v-model:open="parentFormOpen"
      :parent="editingParent"
      @saved="refreshAll"
    />
  </div>
</template>
