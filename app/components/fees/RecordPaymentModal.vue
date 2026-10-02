<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  /** Pre-select a student (e.g. from the student panel) */
  student?: { id: string, label: string } | null
}>()

const emit = defineEmits<{ saved: [] }>()

const methods = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' }
]

const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({
  studentId: props.student?.id ?? null as string | null,
  amount: '',
  paymentMethod: 'MPESA',
  paymentReference: '',
  paymentDate: today(),
  status: 'COMPLETED' as 'COMPLETED' | 'PENDING'
})

const form = reactive(blank())
const saving = ref(false)
const error = ref('')
const toast = useToast()

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(form, blank())
    error.value = ''
  }
})

async function save() {
  error.value = ''
  if (!form.studentId) {
    error.value = 'Choose a student.'
    return
  }
  saving.value = true
  try {
    const result = await $fetch('/api/payments', {
      method: 'POST',
      body: { ...form, amount: Number(form.amount), paymentDate: form.paymentDate || null }
    })
    toast.add({
      title: 'Payment recorded',
      description: result.balance ? `New balance: ${formatMoney(result.balance.balance)}` : undefined,
      color: 'success'
    })
    emit('saved')
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not record the payment.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    title="Record payment"
    description="Log money received for a student's fees."
    submit-label="Record payment"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <FormField
      label="Student"
      for="payment-student"
      required
    >
      <FormOptionPicker
        :key="String(open)"
        v-model="form.studentId"
        endpoint="/api/options/students"
        input-id="payment-student"
        placeholder="Search name or admission no."
        :initial-label="student?.label"
      />
    </FormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Amount (KES)"
        for="payment-amount"
        required
      >
        <UInput
          id="payment-amount"
          v-model="form.amount"
          type="number"
          inputmode="decimal"
          min="1"
          step="any"
          placeholder="0"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Date received"
        for="payment-date"
      >
        <UInput
          id="payment-date"
          v-model="form.paymentDate"
          type="date"
          :max="today()"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <FormField label="Method">
      <DataFilterPills
        v-model="form.paymentMethod"
        label="Payment method"
        :options="methods"
        on-card
      />
    </FormField>

    <FormField
      label="Reference"
      for="payment-ref"
      :hint="form.paymentMethod === 'MPESA' ? 'The M-Pesa confirmation code, e.g. SJK2X7Y9QP' : 'Receipt, transfer or cheque number'"
    >
      <UInput
        id="payment-ref"
        v-model="form.paymentReference"
        placeholder="Optional"
        variant="none"
        :ui="pillInputOnCardUi"
      />
    </FormField>

    <label class="flex cursor-pointer items-start gap-3 rounded-2xl bg-shell-panel p-3.5">
      <input
        type="checkbox"
        class="mt-0.5 size-4 accent-[#14532D]"
        :checked="form.status === 'PENDING'"
        @change="form.status = ($event.target as HTMLInputElement).checked ? 'PENDING' : 'COMPLETED'"
      >
      <span>
        <span class="block text-sm font-medium">Not confirmed yet</span>
        <span class="block text-xs text-shell-muted">Record it as pending until the money shows in the account. It won't reduce the balance until confirmed.</span>
      </span>
    </label>
  </FormModal>
</template>
