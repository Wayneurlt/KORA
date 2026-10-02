<script setup lang="ts">
import { canAccessSection } from '~~/shared/access'

definePageMeta({
  middleware: 'auth',
  section: 'results',
  title: 'Results',
  description: 'Exam scores by student and subject, with class averages.',
  hideHeader: true
})

const route = useRoute()
const { user } = useUserSession()

const examId = ref('')
const className = ref('')
const search = ref('')

const { canManage } = usePermissions()
const toast = useToast()

const { data, status, refresh } = await useFetch('/api/results', {
  query: { examId, className, search }
})

// Keep the picker in sync with the exam the API defaulted to.
watch(() => data.value?.exam?.id, (id) => {
  if (id && !examId.value) examId.value = id
}, { immediate: true })

const examOptions = computed(() => (data.value?.exams ?? []).map(exam => ({
  value: exam.id,
  label: `${exam.name} · ${exam.term} ${exam.academicYear}${exam.status === 'DRAFT' ? ' (draft)' : ''}`
})))

const classOptions = computed(() => [
  { value: '', label: 'All classes' },
  ...(data.value?.classes ?? []).map(item => ({ value: item.className, label: `${item.className} (${item.count})` }))
])

const stats = computed(() => {
  const summary = data.value?.summary
  const exam = data.value?.exam
  return [
    { title: 'Average score', value: summary ? `${summary.average}%` : '—', featured: true, caption: summary ? `Across ${summary.students} students` : 'No results yet' },
    { title: 'Pass rate', value: summary ? `${summary.passRate}%` : '—', caption: summary ? `Average of ${summary.passMark}% or more` : '—' },
    { title: 'Top performer', value: summary ? `${summary.topAverage}%` : '—', caption: summary?.top ?? '—' },
    { title: 'Scores entered', value: String(exam?.resultCount ?? 0), caption: exam ? `${exam.status === 'DRAFT' ? 'Draft — not visible to parents' : 'Published to parents'}` : '—' }
  ]
})

const canOpenStudents = computed(() => !!user.value && canAccessSection(user.value.role, 'students'))
const panelOpen = ref(false)
const selectedId = ref<string | null>(null)
function openStudent(id: string) {
  if (!canOpenStudents.value) return
  selectedId.value = id
  panelOpen.value = true
}

const examFormOpen = ref(false)
const statusChange = ref<'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | null>(null)
const changingStatus = ref(false)
const statusError = ref('')

const statusOpen = computed({
  get: () => !!statusChange.value,
  set: (value: boolean) => {
    if (!value) statusChange.value = null
  }
})

const statusCopy = computed(() => {
  const name = data.value?.exam?.name ?? 'this exam'
  if (statusChange.value === 'PUBLISHED') return { title: `Publish ${name}?`, description: 'Parents can then see these results by replying RESULTS on WhatsApp.', label: 'Publish results' }
  if (statusChange.value === 'DRAFT') return { title: `Unpublish ${name}?`, description: 'Parents will stop seeing these results until you publish again.', label: 'Move to draft' }
  return { title: `Archive ${name}?`, description: 'It disappears from the exam list and can no longer be edited.', label: 'Archive exam' }
})

async function applyStatus() {
  if (!data.value?.exam || !statusChange.value) return
  changingStatus.value = true
  statusError.value = ''
  try {
    await $fetch(`/api/exams/${data.value.exam.id}`, { method: 'PATCH', body: { status: statusChange.value } })
    toast.add({ title: statusChange.value === 'PUBLISHED' ? 'Results published' : statusChange.value === 'DRAFT' ? 'Moved back to draft' : 'Exam archived', color: 'success' })
    if (statusChange.value === 'ARCHIVED') examId.value = ''
    statusChange.value = null
    await refresh()
  } catch (error) {
    statusError.value = apiErrorMessage(error)
  } finally {
    changingStatus.value = false
  }
}

async function onExamCreated(id: string) {
  examId.value = id
  await refresh()
}

function scoreClass(score: number | undefined) {
  if (score === undefined) return 'text-shell-muted'
  if (score >= 80) return 'text-leaf-700 dark:text-leaf-400 font-medium'
  if (score < 50) return 'text-[#B91C1C] dark:text-[#FCA5A5]'
  return ''
}
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template #actions>
        <template v-if="canManage('results')">
          <button
            type="button"
            class="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-leaf-800 px-5 text-sm font-medium text-leaf-900 transition-colors hover:bg-leaf-50 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
            @click="examFormOpen = true"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4.5"
            />
            New exam
          </button>
          <NuxtLink
            v-if="data?.exam"
            :to="{ path: '/dashboard/results/entry', query: { examId: data.exam.id, className: className || undefined } }"
            class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <UIcon
              name="i-lucide-table-2"
              class="size-4.5"
            />
            Enter scores
          </NuxtLink>
        </template>
        <DataSelect
          v-if="examOptions.length"
          v-model="examId"
          label="Exam"
          icon="i-lucide-clipboard-list"
          :options="examOptions"
        />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!data?.exam"
      icon="i-lucide-graduation-cap"
      title="No exams yet"
      description="Once an exam is created and scores are entered, results will show up here."
    />

    <template v-else>
      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          v-for="stat in stats"
          :key="stat.title"
          v-bind="stat"
        />
      </div>

      <!-- Subject averages -->
      <div class="mt-2.5 rounded-[20px] bg-shell-card p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-base font-medium tracking-[-0.01em]">
            Subject averages
          </p>
          <div class="flex items-center gap-2">
            <DataChip :status="data.exam.status" />
            <template v-if="canManage('results')">
              <button
                v-if="data.exam.status === 'DRAFT'"
                type="button"
                class="bg-leaf-gradient flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                @click="statusChange = 'PUBLISHED'"
              >
                <UIcon
                  name="i-lucide-send"
                  class="size-3.5"
                />
                Publish to parents
              </button>
              <button
                v-else
                type="button"
                class="flex h-8 items-center rounded-full bg-shell-panel px-3.5 text-xs font-medium transition-colors hover:text-leaf-800"
                @click="statusChange = 'DRAFT'"
              >
                Unpublish
              </button>
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-full bg-shell-panel text-shell-muted transition-colors hover:text-shell-ink"
                aria-label="Archive exam"
                title="Archive exam"
                @click="statusChange = 'ARCHIVED'"
              >
                <UIcon
                  name="i-lucide-archive"
                  class="size-3.5"
                />
              </button>
            </template>
          </div>
        </div>
        <div class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div
            v-for="subject in data.subjects"
            :key="subject.id"
            class="grid grid-cols-[96px_1fr_48px] items-center gap-3 text-sm"
          >
            <span class="truncate text-shell-muted">{{ subject.name }}</span>
            <span class="bg-hatch h-3 overflow-hidden rounded-full">
              <span
                class="bg-leaf-gradient block h-full rounded-full"
                :style="{ width: `${subject.average ?? 0}%` }"
              />
            </span>
            <span class="text-right font-medium">{{ subject.average ?? '—' }}{{ subject.average !== null ? '%' : '' }}</span>
          </div>
        </div>
      </div>

      <div class="mt-2.5 mb-2.5 flex flex-wrap items-center gap-2.5">
        <DataSearchField
          v-model="search"
          placeholder="Search student or admission no."
        />
        <DataSelect
          v-model="className"
          label="Class"
          icon="i-lucide-school"
          :options="classOptions"
        />
      </div>

      <div
        class="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-shell-card transition-opacity"
        :class="status === 'pending' && 'opacity-60'"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-180 text-sm">
            <thead>
              <tr class="border-b border-shell-line text-left text-[11px] font-medium tracking-wide text-shell-muted uppercase">
                <th class="w-14 px-4 py-3 font-medium">
                  #
                </th>
                <th class="px-2 py-3 font-medium">
                  Student
                </th>
                <th
                  v-for="subject in data.subjects"
                  :key="subject.id"
                  class="px-2 py-3 text-center font-medium"
                  :title="subject.name"
                >
                  {{ subject.code }}
                </th>
                <th class="px-2 py-3 text-center font-medium">
                  Avg
                </th>
                <th class="px-4 py-3 text-center font-medium">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-shell-line">
              <tr
                v-for="row in data.rows"
                :key="row.student.id"
                class="transition-colors"
                :class="canOpenStudents && 'cursor-pointer hover:bg-shell-panel/60'"
                @click="openStudent(row.student.id)"
              >
                <td class="px-4 py-2.5">
                  <span
                    class="flex size-7 items-center justify-center rounded-full text-xs font-medium"
                    :class="row.position <= 3 ? 'bg-leaf-gradient text-white' : 'bg-shell-panel text-shell-muted'"
                  >{{ row.position }}</span>
                </td>
                <td class="px-2 py-2.5">
                  <p class="font-medium">
                    {{ row.student.name }}
                  </p>
                  <p class="text-xs text-shell-muted">
                    {{ row.student.admissionNumber }} · {{ row.student.className }}{{ row.student.stream ? ` · ${row.student.stream}` : '' }}
                  </p>
                </td>
                <td
                  v-for="subject in data.subjects"
                  :key="subject.id"
                  class="px-2 py-2.5 text-center tabular-nums"
                  :class="scoreClass(row.scores[subject.id]?.score)"
                >
                  {{ row.scores[subject.id]?.score ?? '—' }}
                </td>
                <td class="px-2 py-2.5 text-center font-medium tabular-nums">
                  {{ row.average }}
                </td>
                <td class="px-4 py-2.5 text-center">
                  <DataChip
                    :tone="row.grade === 'A' ? 'green' : row.grade === 'B' ? 'blue' : row.grade === 'C' ? 'violet' : row.grade === 'D' ? 'amber' : 'red'"
                    :label="row.grade ?? '—'"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <EmptyState
          v-if="!data.rows.length"
          icon="i-lucide-search-x"
          title="No results match"
          description="Try another class or search, or pick a different exam."
          class="min-h-72"
        />

        <p
          v-else
          class="mt-auto border-t border-shell-line px-4 py-3 text-xs text-shell-muted"
        >
          {{ data.rows.length }} students ranked by average score.
        </p>
      </div>
    </template>

    <StudentPanel
      v-model:open="panelOpen"
      :student-id="selectedId"
      focus="results"
    />

    <ResultsExamFormModal
      v-model:open="examFormOpen"
      @saved="onExamCreated"
    />
    <FormModal
      v-model:open="statusOpen"
      :title="statusCopy.title"
      :description="statusCopy.description"
      :submit-label="statusCopy.label"
      :loading="changingStatus"
      :error="statusError"
      @submit="applyStatus"
    />
  </div>
</template>
