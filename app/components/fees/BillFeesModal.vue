<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const { data: classes } = await useFetch('/api/options/classes', { lazy: true, default: () => [] })

const blank = () => ({
  target: 'CLASS' as 'CLASS' | 'STUDENT',
  className: '',
  studentId: null as string | null,
  description: '',
  term: 'Term 3',
  academicYear: String(new Date().getFullYear()),
  amount: '',
  dueDate: ''
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

const classOptions = computed(() => [
  { value: '', label: 'Choose a class' },
  ...classes.value.map(item => ({ value: item.className, label: `${item.className} (${item.count} students)` }))
])

const selectedCount = computed(() => classes.value.find(item => item.className === form.className)?.count ?? 0)
const total = computed(() => (Number(form.amount) || 0) * (form.target === 'CLASS' ? selectedCount.value : 1))

async function save() {
  error.value = ''
  saving.value = true
  try {
    const result = await $fetch('/api/fees/charges', {
      method: 'POST',
      body: {
        target: form.target,
        className: form.target === 'CLASS' ? form.className : undefined,
        studentId: form.target === 'STUDENT' ? form.studentId : undefined,
        description: form.description,
        term: form.term,
        academicYear: form.academicYear,
        amount: Number(form.amount),
        dueDate: form.dueDate || null
      }
    })
    toast.add({ title: `Billed ${result.count} ${result.count === 1 ? 'student' : 'students'}`, description: `${formatMoney(result.total)} added`, color: 'success' })
    emit('saved')
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not add the fees.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    title="Bill fees"
    description="Add a fee charge for one student or a whole class."
    submit-label="Add fees"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <FormField label="Who to bill">
      <DataFilterPills
        v-model="form.target"
        label="Who to bill"
        :options="[{ value: 'CLASS', label: 'A whole class' }, { value: 'STUDENT', label: 'One student' }]"
        on-card
      />
    </FormField>

    <FormField
      v-if="form.target === 'CLASS'"
      label="Class"
      required
    >
      <DataSelect
        v-model="form.className"
        label="Class"
        icon="i-lucide-school"
        :options="classOptions"
        on-card
        class="w-full"
      />
    </FormField>
    <FormField
      v-else
      label="Student"
      for="bill-student"
      required
    >
      <FormOptionPicker
        v-model="form.studentId"
        endpoint="/api/options/students"
        input-id="bill-student"
        placeholder="Search name or admission no."
      />
    </FormField>

    <FormField
      label="Description"
      for="bill-description"
      required
    >
      <UInput
        id="bill-description"
        v-model="form.description"
        placeholder="e.g. Term 3 Tuition, Swimming club"
        variant="none"
        :ui="pillInputOnCardUi"
      />
    </FormField>

    <div class="grid gap-4 sm:grid-cols-3">
      <FormField
        label="Term"
        for="bill-term"
        required
      >
        <UInput
          id="bill-term"
          v-model="form.term"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Year"
        for="bill-year"
        required
      >
        <UInput
          id="bill-year"
          v-model="form.academicYear"
          inputmode="numeric"
          maxlength="4"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Due date"
        for="bill-due"
      >
        <UInput
          id="bill-due"
          v-model="form.dueDate"
          type="date"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <FormField
      label="Amount per student (KES)"
      for="bill-amount"
      required
    >
      <UInput
        id="bill-amount"
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

    <p
      v-if="total > 0 && (form.target === 'STUDENT' || selectedCount)"
      class="rounded-2xl bg-leaf-50 px-4 py-3 text-[13px] text-leaf-800 dark:bg-leaf-900/40 dark:text-leaf-200"
    >
      This adds <strong>{{ formatMoney(total) }}</strong>
      <template v-if="form.target === 'CLASS'">
        across {{ selectedCount }} students in {{ form.className }}.
      </template>
      <template v-else>
        to the student's balance.
      </template>
    </p>
  </FormModal>
</template>
