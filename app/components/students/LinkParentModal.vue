<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  studentId: string
  studentName: string
  /** Parents already linked (hidden from the picker) */
  linkedIds: string[]
}>()

const emit = defineEmits<{ saved: [], createNew: [] }>()

const parentId = ref<string | null>(null)
const relationship = ref('Parent')
const saving = ref(false)
const error = ref('')
const toast = useToast()

watch(open, (isOpen) => {
  if (isOpen) {
    parentId.value = null
    relationship.value = 'Parent'
    error.value = ''
  }
})

async function save() {
  error.value = ''
  if (!parentId.value) {
    error.value = 'Choose a parent.'
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/students/${props.studentId}/parents`, { method: 'POST', body: { parentId: parentId.value, relationship: relationship.value } })
    toast.add({ title: 'Parent linked', color: 'success' })
    emit('saved')
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not link the parent.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    title="Link a parent"
    :description="`Connect an existing parent to ${studentName}.`"
    submit-label="Link parent"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <FormField
      label="Parent"
      for="link-parent"
      required
    >
      <FormOptionPicker
        :key="String(open)"
        v-model="parentId"
        endpoint="/api/options/parents"
        input-id="link-parent"
        placeholder="Search name or WhatsApp number"
        :exclude="linkedIds"
      />
    </FormField>
    <FormField
      label="Relationship"
      for="link-relationship"
    >
      <UInput
        id="link-relationship"
        v-model="relationship"
        list="kora-link-relationships"
        variant="none"
        :ui="pillInputOnCardUi"
      />
      <datalist id="kora-link-relationships">
        <option value="Parent" />
        <option value="Mother" />
        <option value="Father" />
        <option value="Guardian" />
      </datalist>
    </FormField>
    <p class="text-[13px] text-shell-muted">
      Parent not registered yet?
      <button
        type="button"
        class="font-medium text-leaf-700 hover:underline dark:text-leaf-400"
        @click="emit('createNew'); open = false"
      >
        Add a new parent
      </button>
    </p>
  </FormModal>
</template>
