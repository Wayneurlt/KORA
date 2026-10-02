<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

export interface StudentFormValue {
  id?: string
  admissionNumber: string
  firstName: string
  lastName: string
  className: string
  stream: string | null
  dateOfBirth: string | Date | null
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED'
}

const props = defineProps<{
  /** Existing student to edit; omit to create */
  student?: StudentFormValue | null
}>()

const emit = defineEmits<{ saved: [id: string] }>()

const { data: classes } = await useFetch('/api/options/classes', { lazy: true, default: () => [] })

const blank = () => ({
  admissionNumber: props.student?.admissionNumber ?? '',
  firstName: props.student?.firstName ?? '',
  lastName: props.student?.lastName ?? '',
  className: props.student?.className ?? '',
  stream: props.student?.stream ?? '',
  dateOfBirth: props.student?.dateOfBirth ? new Date(props.student.dateOfBirth).toISOString().slice(0, 10) : '',
  status: props.student?.status ?? 'ACTIVE'
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

const editing = computed(() => !!props.student?.id)

async function save() {
  error.value = ''
  saving.value = true
  try {
    const body = { ...form, dateOfBirth: form.dateOfBirth || null }
    const saved = editing.value
      ? await $fetch(`/api/students/${props.student!.id}`, { method: 'PUT', body })
      : await $fetch('/api/students', { method: 'POST', body })
    toast.add({ title: editing.value ? 'Student updated' : 'Student added', color: 'success' })
    emit('saved', saved.id)
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save the student.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    :title="editing ? 'Edit student' : 'Add student'"
    :description="editing ? undefined : 'Link parents afterwards from the student\'s profile.'"
    :submit-label="editing ? 'Save changes' : 'Add student'"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="First name"
        for="student-first"
        required
      >
        <UInput
          id="student-first"
          v-model="form.firstName"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Last name"
        for="student-last"
        required
      >
        <UInput
          id="student-last"
          v-model="form.lastName"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <FormField
      label="Admission number"
      for="student-adm"
      hint="Parents use this to verify themselves on WhatsApp."
      required
    >
      <UInput
        id="student-adm"
        v-model="form.admissionNumber"
        placeholder="e.g. KOR-1011"
        variant="none"
        :ui="pillInputOnCardUi"
      />
    </FormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Class"
        for="student-class"
        required
      >
        <UInput
          id="student-class"
          v-model="form.className"
          list="kora-classes"
          placeholder="e.g. Grade 4"
          variant="none"
          :ui="pillInputOnCardUi"
        />
        <datalist id="kora-classes">
          <option
            v-for="item in classes"
            :key="item.className"
            :value="item.className"
          />
        </datalist>
      </FormField>
      <FormField
        label="Stream"
        for="student-stream"
      >
        <UInput
          id="student-stream"
          v-model="form.stream"
          placeholder="e.g. A"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Date of birth"
        for="student-dob"
      >
        <UInput
          id="student-dob"
          v-model="form.dateOfBirth"
          type="date"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        v-if="editing"
        label="Status"
      >
        <DataSelect
          v-model="form.status"
          label="Status"
          :options="[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'GRADUATED', label: 'Graduated' }]"
          on-card
          class="w-full"
        />
      </FormField>
    </div>
  </FormModal>
</template>
