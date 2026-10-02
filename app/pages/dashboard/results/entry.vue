<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'results',
  title: 'Enter scores',
  description: 'Type scores out of 100 — grades are worked out automatically.',
  hideHeader: true
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { canManage } = usePermissions()

if (!canManage('results')) {
  await navigateTo('/dashboard/results')
}

// The results endpoint also returns the exam list; a search that matches nobody skips the rows.
const { data: exams } = await useFetch('/api/results', { query: { search: '__none__' } })
const { data: classes } = await useFetch('/api/options/classes', { default: () => [] })

const examId = ref(typeof route.query.examId === 'string' ? route.query.examId : '')
const className = ref(typeof route.query.className === 'string' ? route.query.className : '')

watch(exams, (value) => {
  if (!examId.value && value?.exam) examId.value = value.exam.id
}, { immediate: true })
watch(classes, (value) => {
  if (!className.value && value[0]) className.value = value[0].className
}, { immediate: true })
watch([examId, className], () => router.replace({ query: { examId: examId.value || undefined, className: className.value || undefined } }))

const examOptions = computed(() => (exams.value?.exams ?? []).map(exam => ({
  value: exam.id,
  label: `${exam.name} · ${exam.term} ${exam.academicYear}${exam.status === 'DRAFT' ? ' (draft)' : ''}`
})))
const classOptions = computed(() => classes.value.map(item => ({ value: item.className, label: `${item.className} (${item.count})` })))

type Grid = Awaited<ReturnType<typeof loadGrid>>
function loadGrid() {
  return $fetch('/api/results/entry', { query: { examId: examId.value, className: className.value } })
}

const grid = ref<Grid | null>(null)
const loading = ref(false)
// Edited values keyed "studentId:subjectId" — string so empty means "clear".
const draft = ref<Record<string, string>>({})
const original = ref<Record<string, string>>({})

async function load() {
  if (!examId.value || !className.value) return
  loading.value = true
  try {
    grid.value = await loadGrid()
    const values: Record<string, string> = {}
    for (const student of grid.value.students) {
      for (const subject of grid.value.subjects) {
        const score = student.scores[subject.id]
        values[`${student.id}:${subject.id}`] = score === undefined ? '' : String(score)
      }
    }
    original.value = values
    draft.value = { ...values }
  } catch (error) {
    toast.add({ title: apiErrorMessage(error, 'Could not load the score sheet.'), color: 'error' })
  } finally {
    loading.value = false
  }
}

watch([examId, className], load, { immediate: true })

const changes = computed(() => Object.keys(draft.value).filter(key => draft.value[key] !== original.value[key]))
const invalid = computed(() => Object.entries(draft.value).filter(([, value]) => value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100)).map(([key]) => key))
const filled = computed(() => Object.values(draft.value).filter(value => value !== '').length)

const saving = ref(false)
async function save() {
  if (invalid.value.length) {
    toast.add({ title: 'Fix the highlighted scores first (0–100).', color: 'error' })
    return
  }
  saving.value = true
  try {
    const scores = changes.value.map((key) => {
      const [studentId, subjectId] = key.split(':') as [string, string]
      return { studentId, subjectId, score: draft.value[key] === '' ? null : Number(draft.value[key]) }
    })
    const result = await $fetch('/api/results/entry', { method: 'PUT', body: { examId: examId.value, scores } })
    toast.add({ title: `Saved ${result.saved} ${result.saved === 1 ? 'score' : 'scores'}${result.cleared ? `, cleared ${result.cleared}` : ''}`, color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: apiErrorMessage(error, 'Could not save scores.'), color: 'error' })
  } finally {
    saving.value = false
  }
}

// Enter / arrow keys move between cells like a spreadsheet.
function onKeydown(event: KeyboardEvent, row: number, col: number) {
  const moves: Record<string, [number, number]> = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
  const move = moves[event.key]
  if (!move) return
  event.preventDefault()
  document.querySelector<HTMLInputElement>(`[data-cell="${row + move[0]}-${col + move[1]}"]`)?.focus()
}

function cellClass(key: string) {
  if (invalid.value.includes(key)) return 'ring-2 ring-[#DC2626] bg-[#FEE2E2] dark:bg-[#DC2626]/15'
  if (draft.value[key] !== original.value[key]) return 'ring-2 ring-[#F59E0B] bg-[#FEF3C7] dark:bg-[#B45309]/20'
  return 'bg-shell-panel'
}

onBeforeRouteLeave(() => {
  if (changes.value.length && !window.confirm('You have unsaved scores. Leave anyway?')) return false
})
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template #actions>
        <NuxtLink
          to="/dashboard/results"
          class="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-leaf-800 px-5 text-sm font-medium text-leaf-900 transition-colors hover:bg-leaf-50 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to results
        </NuxtLink>
        <button
          type="button"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          :disabled="!changes.length || saving"
          @click="save"
        >
          <UIcon
            :name="saving ? 'i-lucide-loader-circle' : 'i-lucide-check'"
            class="size-4.5"
            :class="saving && 'animate-spin'"
          />
          {{ changes.length ? `Save ${changes.length} ${changes.length === 1 ? 'change' : 'changes'}` : 'Saved' }}
        </button>
      </template>
    </PageHeader>

    <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
      <DataSelect
        v-model="examId"
        label="Exam"
        icon="i-lucide-clipboard-list"
        :options="examOptions"
      />
      <DataSelect
        v-model="className"
        label="Class"
        icon="i-lucide-school"
        :options="classOptions"
      />
      <p
        v-if="grid"
        class="ml-auto text-xs text-shell-muted"
      >
        {{ filled }} of {{ grid.students.length * grid.subjects.length }} scores entered
        <DataChip
          :status="grid.exam.status"
          class="ml-2"
        />
      </p>
    </div>

    <p
      v-if="grid?.exam.status === 'PUBLISHED'"
      class="mb-2.5 flex items-center gap-2 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-[13px] text-[#92400E] dark:bg-[#B45309]/15 dark:text-[#FCD34D]"
    >
      <UIcon
        name="i-lucide-eye"
        class="size-4 shrink-0"
      />
      This exam is published — parents see changes straight away.
    </p>

    <div
      class="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-shell-card transition-opacity"
      :class="loading && 'opacity-60'"
    >
      <div
        v-if="grid?.students.length"
        class="overflow-x-auto"
      >
        <table class="w-full min-w-160 text-sm">
          <thead>
            <tr class="border-b border-shell-line text-left text-[11px] font-medium tracking-wide text-shell-muted uppercase">
              <th class="px-4 py-3 font-medium">
                Student
              </th>
              <th
                v-for="subject in grid.subjects"
                :key="subject.id"
                class="px-2 py-3 text-center font-medium"
              >
                {{ subject.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-shell-line">
            <tr
              v-for="(student, row) in grid.students"
              :key="student.id"
            >
              <td class="px-4 py-2">
                <p class="font-medium">
                  {{ student.name }}
                </p>
                <p class="text-xs text-shell-muted">
                  {{ student.admissionNumber }}{{ student.stream ? ` · ${student.stream}` : '' }}
                </p>
              </td>
              <td
                v-for="(subject, col) in grid.subjects"
                :key="subject.id"
                class="px-2 py-2 text-center"
              >
                <input
                  v-model="draft[`${student.id}:${subject.id}`]"
                  :data-cell="`${row}-${col}`"
                  type="text"
                  inputmode="decimal"
                  maxlength="5"
                  :aria-label="`${subject.name} score for ${student.name}`"
                  class="h-10 w-20 rounded-xl text-center tabular-nums outline-none focus:ring-2 focus:ring-leaf-600"
                  :class="cellClass(`${student.id}:${subject.id}`)"
                  @keydown="onKeydown($event, row, col)"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <EmptyState
        v-else-if="grid && !loading"
        icon="i-lucide-users"
        title="No students in this class"
        description="Pick another class, or add students first."
        class="min-h-72"
      />

      <p
        v-if="grid?.students.length"
        class="mt-auto border-t border-shell-line px-4 py-3 text-xs text-shell-muted"
      >
        <span class="mr-3 inline-flex items-center gap-1.5"><span class="size-2.5 rounded bg-[#FEF3C7] ring-2 ring-[#F59E0B]" />Unsaved</span>
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded bg-[#FEE2E2] ring-2 ring-[#DC2626]" />Not a valid score</span>
        <span class="ml-3">Clear a box to remove a score. Press Enter to move down.</span>
      </p>
    </div>
  </div>
</template>
