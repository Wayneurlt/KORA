<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  conversationId: string
  /** WhatsApp name of the sender, e.g. "Gift" */
  contactName: string
}>()

const emit = defineEmits<{ linked: [] }>()

const parentId = ref<string | null>(null)
const saving = ref(false)
const error = ref('')
const toast = useToast()

watch(open, (isOpen) => {
  if (isOpen) {
    parentId.value = null
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
    const result = await $fetch(`/api/conversations/${props.conversationId}/link`, { method: 'POST', body: { parentId: parentId.value } })
    toast.add(result.welcomeSent
      ? { title: 'Linked — the parent has been sent the menu', color: 'success' }
      : { title: 'Linked, but the welcome message wasn\'t delivered', description: result.welcomeError ?? undefined, color: 'warning' })
    emit('linked')
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not link this chat.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    title="Link to a parent"
    :description="`Which parent is ${contactName}? From now on the bot will recognise this WhatsApp account and answer them automatically.`"
    submit-label="Link parent"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <FormField
      label="Parent"
      for="link-conversation-parent"
      required
    >
      <FormOptionPicker
        :key="String(open)"
        v-model="parentId"
        endpoint="/api/options/parents"
        input-id="link-conversation-parent"
        placeholder="Search name or WhatsApp number"
      />
    </FormField>
    <p class="text-[13px] text-shell-muted">
      Only link someone you've confirmed is this parent — they'll be able to see their children's results and fees.
      Not registered yet? Add them on the
      <NuxtLink
        to="/dashboard/parents"
        class="font-medium text-leaf-700 hover:underline dark:text-leaf-400"
      >Parents page</NuxtLink>
      first.
    </p>
  </FormModal>
</template>
