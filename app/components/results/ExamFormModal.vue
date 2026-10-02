<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [id: string] }>()

const blank = () => ({
  name: '',
  term: 'Term 3',
  academicYear: String(new Date().getFullYear()),
  startDate: '',
  endDate: ''
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
  saving.value = true
  try {
    const exam = await $fetch('/api/exams', { method: 'POST', body: { ...form, startDate: form.startDate || null, endDate: form.endDate || null } })
    toast.add({ title: 'Exam created', description: 'Enter scores, then publish when ready.', color: 'success' })
    emit('saved', exam.id)
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not create the exam.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    title="New exam"
    description="Starts as a draft — parents only see results once you publish."
    submit-label="Create exam"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <FormField
      label="Exam name"
      for="exam-name"
      required
    >
      <UInput
        id="exam-name"
        v-model="form.name"
        placeholder="e.g. Mid-Term 3 Exam"
        variant="none"
        :ui="pillInputOnCardUi"
      />
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Term"
        for="exam-term"
        required
      >
        <UInput
          id="exam-term"
          v-model="form.term"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Academic year"
        for="exam-year"
        required
      >
        <UInput
          id="exam-year"
          v-model="form.academicYear"
          inputmode="numeric"
          maxlength="4"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Start date"
        for="exam-start"
      >
        <UInput
          id="exam-start"
          v-model="form.startDate"
          type="date"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="End date"
        for="exam-end"
      >
        <UInput
          id="exam-end"
          v-model="form.endDate"
          type="date"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>
  </FormModal>
</template>
