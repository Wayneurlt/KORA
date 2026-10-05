<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'students',
  title: 'Parents',
  description: 'Parents on WhatsApp, the children they are linked to and whether they are verified.',
  hideHeader: true
})

const route = useRoute()
const { canManage } = usePermissions()

const search = ref('')
const verification = ref<'ALL' | 'VERIFIED' | 'PENDING' | 'UNVERIFIED'>('ALL')
const page = ref(1)
watch([search, verification], () => {
  page.value = 1
})

const { data: parents, status, refresh } = await useFetch('/api/parents', {
  query: { search, verification, page }
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

// Student panel (opened from a child chip) -------------------------------
const panelOpen = ref(false)
const selectedId = ref<string | null>(null)
function openStudent(id: string) {
  selectedId.value = id
  panelOpen.value = true
}

// Form -------------------------------------------------------------------
const formOpen = ref(false)
const editingParent = ref<NonNullable<typeof parents.value>['items'][number] | null>(null)

function addParent() {
  editingParent.value = null
  formOpen.value = true
}

function editParent(parent: NonNullable<typeof parents.value>['items'][number]) {
  editingParent.value = parent
  formOpen.value = true
}
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
          @click="addParent"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          Add parent
        </button>
      </template>
    </PageHeader>

    <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
      <DataSearchField
        v-model="search"
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
      :class="status === 'pending' && 'opacity-60'"
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
        v-model="page"
        :total="parents.total"
        :page-size="parents.pageSize"
        noun="parents"
      />
    </div>

    <StudentPanel
      v-model:open="panelOpen"
      :student-id="selectedId"
      @changed="refresh"
    />

    <StudentsParentFormModal
      v-model:open="formOpen"
      :parent="editingParent"
      @saved="refresh"
    />
  </div>
</template>
