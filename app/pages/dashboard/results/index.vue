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

const { data, status } = await useFetch('/api/results', {
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
          <DataChip :status="data.exam.status" />
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
  </div>
</template>
