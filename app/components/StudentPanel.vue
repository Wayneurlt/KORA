<script setup lang="ts">
// Student detail slide-over, opened from the Students, Results and Fees pages.
// Sections the user's role can't see (fees / results) come back as null from the API.
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  studentId: string | null
  /** Section to show first */
  focus?: 'fees' | 'results'
}>()

type StudentDetail = Awaited<ReturnType<typeof fetchStudent>>

function fetchStudent(id: string) {
  return $fetch(`/api/students/${id}`)
}

const student = ref<StudentDetail | null>(null)
const loading = ref(false)
const error = ref('')

watch(() => [props.studentId, open.value] as const, async ([id, isOpen]) => {
  if (!id || !isOpen) return
  if (student.value?.id === id) return
  loading.value = true
  error.value = ''
  try {
    student.value = await fetchStudent(id)
  } catch {
    error.value = 'Could not load this student.'
    student.value = null
  } finally {
    loading.value = false
  }
}, { immediate: true })

const name = computed(() => (student.value ? `${student.value.firstName} ${student.value.lastName}` : 'Student'))
const paidPercent = computed(() => {
  const summary = student.value?.fees?.summary
  return summary?.billed ? Math.min(100, Math.round((summary.paid / summary.billed) * 100)) : 0
})
const pendingPercent = computed(() => {
  const summary = student.value?.fees?.summary
  return summary?.billed ? Math.min(100 - paidPercent.value, Math.round((summary.pending / summary.billed) * 100)) : 0
})
const sections = computed(() => (props.focus === 'results' ? ['results', 'fees'] : ['fees', 'results']))
</script>

<template>
  <DataPanel
    v-model:open="open"
    :title="name"
  >
    <template #header>
      <div
        v-if="student"
        class="flex items-center gap-3.5"
      >
        <div
          class="flex size-14 shrink-0 items-center justify-center rounded-full text-base font-semibold text-[#1F2933]/80"
          :class="avatarTone(name)"
        >
          {{ initials(name) }}
        </div>
        <div class="min-w-0">
          <p class="truncate text-xl font-medium tracking-[-0.01em]">
            {{ name }}
          </p>
          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-shell-muted">
            <span>{{ student.admissionNumber }}</span>
            <span>·</span>
            <span>{{ student.className }}{{ student.stream ? ` · ${student.stream}` : '' }}</span>
            <DataChip :status="student.status" />
          </div>
        </div>
      </div>
      <div
        v-else
        class="flex items-center gap-3.5"
      >
        <div class="size-14 animate-pulse rounded-full bg-shell-card" />
        <div class="space-y-2">
          <div class="h-5 w-40 animate-pulse rounded-full bg-shell-card" />
          <div class="h-3.5 w-28 animate-pulse rounded-full bg-shell-card" />
        </div>
      </div>
    </template>

    <div
      v-if="loading && !student"
      class="space-y-2.5"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="h-32 animate-pulse rounded-[20px] bg-shell-card"
      />
    </div>

    <p
      v-else-if="error"
      class="rounded-[20px] bg-shell-card p-5 text-sm text-[#B91C1C]"
    >
      {{ error }}
    </p>

    <template v-else-if="student">
      <!-- Parents -->
      <section class="rounded-[20px] bg-shell-card p-4">
        <p class="text-base font-medium tracking-[-0.01em]">
          Parents & guardians
        </p>
        <ul
          v-if="student.parents.length"
          class="mt-3 space-y-2"
        >
          <li
            v-for="parent in student.parents"
            :key="parent.id"
            class="flex items-center gap-3 rounded-2xl bg-shell-panel p-3"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
              :class="avatarTone(parent.name)"
            >
              {{ initials(parent.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ parent.name }} <span class="font-normal text-shell-muted">· {{ parent.relationship }}</span>
              </p>
              <a
                :href="waLink(parent.whatsappNumber)"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 text-xs text-leaf-700 hover:underline dark:text-leaf-400"
              >
                <UIcon
                  name="i-simple-icons-whatsapp"
                  class="size-3"
                />
                +{{ parent.whatsappNumber }}
              </a>
            </div>
            <DataChip :status="parent.verificationStatus" />
          </li>
        </ul>
        <p
          v-else
          class="mt-3 text-sm text-shell-muted"
        >
          No parent linked yet.
        </p>
      </section>

      <template
        v-for="section in sections"
        :key="section"
      >
        <!-- Fees -->
        <section
          v-if="section === 'fees' && student.fees"
          class="rounded-[20px] bg-shell-card p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-base font-medium tracking-[-0.01em]">
                Fees
              </p>
              <p class="mt-3 text-[32px] leading-none font-medium tracking-[-0.03em]">
                {{ formatMoney(student.fees.summary.balance) }}
              </p>
              <p class="mt-1.5 text-xs text-shell-muted">
                Balance of {{ formatMoney(student.fees.summary.billed) }} billed
              </p>
            </div>
            <DataChip :status="student.fees.summary.status" />
          </div>

          <div class="mt-4 flex h-2.5 overflow-hidden rounded-full bg-hatch">
            <div
              class="bg-leaf-600"
              :style="{ width: `${paidPercent}%` }"
            />
            <div
              class="bg-[#F59E0B]"
              :style="{ width: `${pendingPercent}%` }"
            />
          </div>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-shell-muted">
            <span class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-leaf-600" />Paid {{ formatMoney(student.fees.summary.paid) }}</span>
            <span
              v-if="student.fees.summary.pending"
              class="flex items-center gap-1.5"
            ><span class="size-2 rounded-full bg-[#F59E0B]" />Awaiting confirmation {{ formatMoney(student.fees.summary.pending) }}</span>
          </div>

          <div
            v-if="student.fees.records.length"
            class="mt-5"
          >
            <p class="text-[11px] font-medium tracking-wide text-shell-muted uppercase">
              Billed
            </p>
            <ul class="mt-2 divide-y divide-shell-line">
              <li
                v-for="record in student.fees.records"
                :key="record.id"
                class="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div class="min-w-0">
                  <p class="truncate">
                    {{ record.description }}
                  </p>
                  <p class="text-[11px] text-shell-muted">
                    {{ record.term }} {{ record.academicYear }} · Due {{ formatDate(record.dueDate) }}
                  </p>
                </div>
                <span class="shrink-0 font-medium">{{ formatMoney(record.amount) }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-4">
            <p class="text-[11px] font-medium tracking-wide text-shell-muted uppercase">
              Payments
            </p>
            <ul
              v-if="student.fees.payments.length"
              class="mt-2 divide-y divide-shell-line"
            >
              <li
                v-for="payment in student.fees.payments"
                :key="payment.id"
                class="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div class="min-w-0">
                  <p class="truncate">
                    {{ statusLabel(payment.method) }}<span
                      v-if="payment.reference"
                      class="text-shell-muted"
                    > · {{ payment.reference }}</span>
                  </p>
                  <p class="text-[11px] text-shell-muted">
                    {{ formatDateTime(payment.date) }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <DataChip
                    v-if="payment.status !== 'COMPLETED'"
                    :status="payment.status"
                  />
                  <span class="font-medium">{{ formatMoney(payment.amount) }}</span>
                </div>
              </li>
            </ul>
            <p
              v-else
              class="mt-2 text-sm text-shell-muted"
            >
              No payments yet.
            </p>
          </div>
        </section>

        <!-- Results -->
        <section
          v-if="section === 'results' && student.results"
          class="rounded-[20px] bg-shell-card p-4"
        >
          <p class="text-base font-medium tracking-[-0.01em]">
            Results
          </p>
          <p
            v-if="!student.results.length"
            class="mt-3 text-sm text-shell-muted"
          >
            No results recorded yet.
          </p>
          <div
            v-for="group in student.results"
            :key="group.exam.id"
            class="mt-3 rounded-2xl bg-shell-panel p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">
                  {{ group.exam.name }}
                </p>
                <p class="text-[11px] text-shell-muted">
                  {{ group.exam.term }} {{ group.exam.academicYear }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <DataChip :status="group.exam.status" />
                <span class="text-lg font-medium tracking-[-0.02em]">{{ group.average }}%</span>
              </div>
            </div>
            <ul class="mt-3 space-y-2">
              <li
                v-for="subject in group.subjects"
                :key="subject.code"
                class="grid grid-cols-[88px_1fr_56px] items-center gap-3 text-xs"
              >
                <span class="truncate text-shell-muted">{{ subject.name }}</span>
                <span class="h-2 overflow-hidden rounded-full bg-shell-card">
                  <span
                    class="block h-full rounded-full"
                    :class="subject.score >= 70 ? 'bg-leaf-600' : subject.score >= 50 ? 'bg-leaf-400' : 'bg-[#F59E0B]'"
                    :style="{ width: `${subject.score}%` }"
                  />
                </span>
                <span class="text-right font-medium">{{ subject.score }} <span class="text-shell-muted">{{ subject.grade }}</span></span>
              </li>
            </ul>
          </div>
        </section>
      </template>
    </template>
  </DataPanel>
</template>
