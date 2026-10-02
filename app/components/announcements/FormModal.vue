<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

export interface AnnouncementFormValue {
  id: string
  title: string
  message: string
  targetType: 'ALL' | 'CLASS' | 'STUDENT'
  targetClass: string | null
  targetStudentId: string | null
  targetLabel: string
}

const props = defineProps<{
  /** Draft to edit; omit to create */
  announcement?: AnnouncementFormValue | null
}>()

const emit = defineEmits<{ saved: [id: string] }>()

const { data: classes } = await useFetch('/api/options/classes', { lazy: true, default: () => [] })

const blank = () => ({
  title: props.announcement?.title ?? '',
  message: props.announcement?.message ?? '',
  targetType: props.announcement?.targetType ?? 'ALL',
  targetClass: props.announcement?.targetClass ?? '',
  targetStudentId: props.announcement?.targetStudentId ?? null as string | null
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

const editing = computed(() => !!props.announcement?.id)
const classOptions = computed(() => [
  { value: '', label: 'Choose a class' },
  ...classes.value.map(item => ({ value: item.className, label: `${item.className} (${item.count} students)` }))
])

async function save() {
  error.value = ''
  saving.value = true
  try {
    const body = {
      title: form.title,
      message: form.message,
      targetType: form.targetType,
      targetClass: form.targetType === 'CLASS' ? form.targetClass : null,
      targetStudentId: form.targetType === 'STUDENT' ? form.targetStudentId : null
    }
    const saved = editing.value
      ? await $fetch(`/api/announcements/${props.announcement!.id}`, { method: 'PUT', body })
      : await $fetch('/api/announcements', { method: 'POST', body })
    toast.add({ title: editing.value ? 'Draft updated' : 'Draft saved', description: 'Open it to review and send.', color: 'success' })
    emit('saved', saved.id)
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save the announcement.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    :title="editing ? 'Edit draft' : 'New announcement'"
    description="Saved as a draft — nothing is sent until you publish it."
    submit-label="Save draft"
    :loading="saving"
    :error="error"
    wide
    @submit="save"
  >
    <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
      <div class="space-y-4">
        <FormField
          label="Title"
          for="ann-title"
          required
        >
          <UInput
            id="ann-title"
            v-model="form.title"
            maxlength="120"
            placeholder="e.g. Sports day schedule"
            variant="none"
            :ui="pillInputOnCardUi"
          />
        </FormField>

        <FormField
          label="Message"
          for="ann-message"
          :hint="`${form.message.length} / 1000 characters`"
          required
        >
          <UTextarea
            id="ann-message"
            v-model="form.message"
            :rows="6"
            maxlength="1000"
            placeholder="Dear parents, …"
            variant="none"
            :ui="softTextareaOnCardUi"
          />
        </FormField>

        <FormField label="Send to">
          <DataFilterPills
            v-model="form.targetType"
            label="Audience"
            :options="[{ value: 'ALL', label: 'All parents' }, { value: 'CLASS', label: 'A class' }, { value: 'STUDENT', label: 'One family' }]"
            on-card
          />
        </FormField>

        <DataSelect
          v-if="form.targetType === 'CLASS'"
          v-model="form.targetClass"
          label="Class"
          icon="i-lucide-school"
          :options="classOptions"
          on-card
          class="w-full"
        />
        <FormOptionPicker
          v-if="form.targetType === 'STUDENT'"
          v-model="form.targetStudentId"
          endpoint="/api/options/students"
          placeholder="Search the student whose parents should get this"
          :initial-label="announcement?.targetType === 'STUDENT' ? announcement.targetLabel : ''"
        />
      </div>

      <div class="hidden md:block">
        <p class="mb-1.5 px-1 text-[13px] font-medium">
          Preview
        </p>
        <div class="rounded-2xl bg-[#E5DDD5] p-3 dark:bg-[#0E1512]">
          <div class="rounded-lg rounded-tl-none bg-white px-3 py-2 text-[12px] leading-relaxed whitespace-pre-line text-[#111B21] shadow-xs dark:bg-[#202C33] dark:text-white">
            <p class="font-semibold">
              📢 {{ form.title || 'Title' }}
            </p>
            <p class="mt-1 break-words">
              {{ form.message || 'Your message appears here.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </FormModal>
</template>
