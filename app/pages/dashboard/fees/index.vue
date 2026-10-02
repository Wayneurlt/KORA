<script setup lang="ts">
import { canAccessSection } from '~~/shared/access'

definePageMeta({
  middleware: 'auth',
  section: 'fees',
  title: 'Fees',
  description: 'Track what has been billed, what has been paid, and who still owes.',
  hideHeader: true
})

const route = useRoute()
const { user } = useUserSession()

const search = ref('')
const className = ref('')
const feeStatus = ref<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL')
const page = ref(1)
watch([search, className, feeStatus], () => {
  page.value = 1
})

const { canManage } = usePermissions()
const toast = useToast()

const { data, status, refresh } = await useFetch('/api/fees', {
  query: { search, className, status: feeStatus, page }
})

const currency = computed(() => data.value?.currency ?? 'KES')

const stats = computed(() => {
  const summary = data.value?.summary
  if (!summary) return []
  const students = summary.counts.PAID + summary.counts.PARTIAL + summary.counts.UNPAID
  return [
    { title: 'Collected', value: formatCompact(summary.collected), featured: true, delta: `${summary.collectionRate}%`, caption: `of ${currency.value} ${formatCompact(summary.billed)} billed` },
    { title: 'Outstanding', value: formatCompact(summary.outstanding), caption: `${currency.value} · still to be paid` },
    { title: 'Awaiting confirmation', value: formatCompact(summary.pending), caption: `${currency.value} · M-Pesa / pending payments` },
    { title: 'Fully paid', value: String(summary.counts.PAID), caption: `of ${students} students billed` }
  ]
})

const statusOptions = computed(() => {
  const counts = data.value?.summary.counts
  return [
    { value: 'ALL' as const, label: 'All', count: counts ? counts.PAID + counts.PARTIAL + counts.UNPAID : undefined },
    { value: 'UNPAID' as const, label: 'Unpaid', count: counts?.UNPAID },
    { value: 'PARTIAL' as const, label: 'Partial', count: counts?.PARTIAL },
    { value: 'PAID' as const, label: 'Paid', count: counts?.PAID }
  ]
})

const classOptions = computed(() => [
  { value: '', label: 'All classes' },
  ...(data.value?.classes ?? []).map(item => ({ value: item.className, label: item.className }))
])

const canOpenStudents = computed(() => !!user.value && canAccessSection(user.value.role, 'students'))
const panelOpen = ref(false)
const selectedId = ref<string | null>(null)
function openStudent(id: string) {
  if (!canOpenStudents.value) return
  selectedId.value = id
  panelOpen.value = true
}

const paymentOpen = ref(false)
const billOpen = ref(false)
const updating = ref<string | null>(null)

async function setPaymentStatus(id: string, next: 'COMPLETED' | 'FAILED') {
  updating.value = id
  try {
    await $fetch(`/api/payments/${id}`, { method: 'PATCH', body: { status: next } })
    toast.add({ title: next === 'COMPLETED' ? 'Payment confirmed' : 'Payment marked as failed', color: next === 'COMPLETED' ? 'success' : 'neutral' })
    await refresh()
  } catch (error) {
    toast.add({ title: apiErrorMessage(error), color: 'error' })
  } finally {
    updating.value = null
  }
}

const methodIcon: Record<string, string> = {
  MPESA: 'i-lucide-smartphone',
  BANK_TRANSFER: 'i-lucide-landmark',
  CASH: 'i-lucide-banknote',
  CHEQUE: 'i-lucide-receipt',
  OTHER: 'i-lucide-wallet'
}
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template
        v-if="canManage('fees')"
        #actions
      >
        <button
          type="button"
          class="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-leaf-800 px-5 text-sm font-medium text-leaf-900 transition-colors hover:bg-leaf-50 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
          @click="billOpen = true"
        >
          <UIcon
            name="i-lucide-file-plus-2"
            class="size-4.5"
          />
          Bill fees
        </button>
        <button
          type="button"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          @click="paymentOpen = true"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          Record payment
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStatCard
        v-for="stat in stats"
        :key="stat.title"
        v-bind="stat"
      />
    </div>

    <div class="mt-2.5 grid flex-1 grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex min-w-0 flex-col">
        <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
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
          <DataFilterPills
            v-model="feeStatus"
            label="Payment status"
            :options="statusOptions"
            class="2xl:ml-auto"
          />
        </div>

        <div
          class="flex flex-1 flex-col overflow-hidden rounded-[20px] bg-shell-card transition-opacity"
          :class="status === 'pending' && 'opacity-60'"
        >
          <div class="hidden grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-4 border-b border-shell-line px-4 py-3 text-[11px] font-medium tracking-wide text-shell-muted uppercase md:grid">
            <span>Student</span>
            <span class="text-right">Billed</span>
            <span>Paid</span>
            <span class="text-right">Balance</span>
            <span class="text-right">Status</span>
          </div>

          <ul class="flex-1 divide-y divide-shell-line">
            <li
              v-for="row in data?.items"
              :key="row.student.id"
            >
              <button
                type="button"
                class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)]"
                :class="canOpenStudents ? 'hover:bg-shell-panel/60' : 'cursor-default'"
                @click="openStudent(row.student.id)"
              >
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ row.student.name }}</span>
                  <span class="block text-xs text-shell-muted">{{ row.student.admissionNumber }} · {{ row.student.className }}{{ row.student.stream ? ` · ${row.student.stream}` : '' }}</span>
                </span>
                <span class="hidden text-right text-sm tabular-nums md:block">{{ formatMoney(row.billed, currency) }}</span>
                <span class="col-span-2 flex items-center gap-2.5 md:col-span-1">
                  <span class="flex h-2 flex-1 overflow-hidden rounded-full bg-shell-panel">
                    <span
                      class="bg-leaf-600"
                      :style="{ width: `${Math.min(100, (row.paid / row.billed) * 100)}%` }"
                    />
                    <span
                      class="bg-[#F59E0B]"
                      :style="{ width: `${Math.min(100 - (row.paid / row.billed) * 100, (row.pending / row.billed) * 100)}%` }"
                    />
                  </span>
                  <span class="w-20 text-right text-xs text-shell-muted tabular-nums">{{ formatCompact(row.paid) }}</span>
                </span>
                <span
                  class="hidden text-right text-sm font-medium tabular-nums md:block"
                  :class="row.balance ? '' : 'text-shell-muted'"
                >{{ row.balance ? formatMoney(row.balance, currency) : '—' }}</span>
                <span class="row-start-1 justify-self-end md:row-auto">
                  <DataChip :status="row.status" />
                </span>
              </button>
            </li>
          </ul>

          <EmptyState
            v-if="data && !data.items.length"
            icon="i-lucide-search-x"
            title="No students match"
            description="Try a different name, class or payment status."
            class="min-h-72"
          />

          <DataPager
            v-if="data?.total"
            v-model="page"
            :total="data.total"
            :page-size="data.pageSize"
            noun="students"
          />
        </div>
      </div>

      <!-- Recent payments -->
      <aside class="flex flex-col rounded-[20px] bg-shell-card p-4 xl:self-start">
        <p class="text-base font-medium tracking-[-0.01em]">
          Recent payments
        </p>
        <ul class="mt-3 space-y-1">
          <li
            v-for="payment in data?.recentPayments"
            :key="payment.id"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors"
              :class="canOpenStudents ? 'hover:bg-shell-panel' : 'cursor-default'"
              @click="openStudent(payment.student.id)"
            >
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
                <UIcon
                  :name="methodIcon[payment.method] ?? 'i-lucide-wallet'"
                  class="size-4.5"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-medium">{{ payment.student.name }}</span>
                <span class="block truncate text-[11px] text-shell-muted">{{ statusLabel(payment.method) }} · {{ formatRelative(payment.date) }}</span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-0.5">
                <span class="text-[13px] font-medium tabular-nums">{{ formatCompact(payment.amount) }}</span>
                <DataChip
                  v-if="payment.status !== 'COMPLETED'"
                  :status="payment.status"
                />
              </span>
            </button>
            <div
              v-if="payment.status === 'PENDING' && canManage('fees')"
              class="mb-1 ml-15 flex gap-1.5"
            >
              <button
                type="button"
                class="flex h-7 items-center gap-1 rounded-full bg-leaf-800 px-3 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-leaf-600"
                :disabled="updating === payment.id"
                @click="setPaymentStatus(payment.id, 'COMPLETED')"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-3.5"
                />
                Confirm
              </button>
              <button
                type="button"
                class="h-7 rounded-full px-3 text-[11px] font-medium text-shell-muted transition-colors hover:bg-shell-panel hover:text-[#B91C1C] disabled:opacity-50"
                :disabled="updating === payment.id"
                @click="setPaymentStatus(payment.id, 'FAILED')"
              >
                Reject
              </button>
            </div>
          </li>
        </ul>
        <p
          v-if="!data?.recentPayments.length"
          class="mt-3 text-sm text-shell-muted"
        >
          No payments recorded yet.
        </p>
      </aside>
    </div>

    <StudentPanel
      v-model:open="panelOpen"
      :student-id="selectedId"
      focus="fees"
      @changed="refresh()"
    />

    <FeesRecordPaymentModal
      v-model:open="paymentOpen"
      @saved="refresh()"
    />
    <FeesBillFeesModal
      v-model:open="billOpen"
      @saved="refresh()"
    />
  </div>
</template>
