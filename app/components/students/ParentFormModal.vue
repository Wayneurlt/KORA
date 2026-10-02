<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

export interface ParentFormValue {
  id: string
  name: string
  whatsappNumber: string
  phoneNumber?: string | null
  email: string | null
}

const props = defineProps<{
  /** Existing parent to edit; omit to create */
  parent?: ParentFormValue | null
  /** When creating from a student's profile, link to that student */
  linkStudent?: { id: string, label: string } | null
}>()

const emit = defineEmits<{ saved: [] }>()

const blank = () => {
  const [firstName = '', ...rest] = (props.parent?.name ?? '').split(' ')
  return {
    firstName,
    lastName: rest.join(' '),
    whatsappNumber: props.parent ? `+${props.parent.whatsappNumber}` : '',
    phoneNumber: props.parent?.phoneNumber && props.parent.phoneNumber !== props.parent.whatsappNumber ? `+${props.parent.phoneNumber}` : '',
    email: props.parent?.email ?? '',
    relationship: 'Parent',
    children: props.linkStudent ? [{ ...props.linkStudent }] : [] as { id: string, label: string }[]
  }
}

const form = reactive(blank())
const pickerValue = ref<string | null>(null)
const saving = ref(false)
const error = ref('')
const toast = useToast()

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(form, blank())
    pickerValue.value = null
    error.value = ''
  }
})

const editing = computed(() => !!props.parent?.id)

// Picking a child adds a chip and resets the picker for the next one.
const pickerKey = ref(0)
function addChild(option: { id: string, label: string }) {
  if (!form.children.some(child => child.id === option.id)) form.children.push({ id: option.id, label: option.label })
  pickerValue.value = null
  pickerKey.value++
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const body = {
      firstName: form.firstName,
      lastName: form.lastName,
      whatsappNumber: form.whatsappNumber,
      phoneNumber: form.phoneNumber,
      email: form.email,
      children: form.children.map(child => ({ studentId: child.id, relationship: form.relationship }))
    }
    if (editing.value) await $fetch(`/api/parents/${props.parent!.id}`, { method: 'PUT', body })
    else await $fetch('/api/parents', { method: 'POST', body })
    toast.add({ title: editing.value ? 'Parent updated' : 'Parent added', color: 'success' })
    emit('saved')
    open.value = false
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not save the parent.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <FormModal
    v-model:open="open"
    :title="editing ? 'Edit parent' : 'Add parent'"
    :description="editing ? 'Changing the WhatsApp number means the parent verifies again.' : 'Parents get school updates on this WhatsApp number.'"
    :submit-label="editing ? 'Save changes' : 'Add parent'"
    :loading="saving"
    :error="error"
    @submit="save"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="First name"
        for="parent-first"
        required
      >
        <UInput
          id="parent-first"
          v-model="form.firstName"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Last name"
        for="parent-last"
        required
      >
        <UInput
          id="parent-last"
          v-model="form.lastName"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <FormField
      label="WhatsApp number"
      for="parent-wa"
      hint="Any format works, e.g. 0712 345 678 or +254 712 345 678."
      required
    >
      <UInput
        id="parent-wa"
        v-model="form.whatsappNumber"
        type="tel"
        placeholder="0712 345 678"
        variant="none"
        :ui="pillInputOnCardUi"
      />
    </FormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Other phone"
        for="parent-phone"
        hint="Only if different from WhatsApp"
      >
        <UInput
          id="parent-phone"
          v-model="form.phoneNumber"
          type="tel"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        label="Email"
        for="parent-email"
      >
        <UInput
          id="parent-email"
          v-model="form.email"
          type="email"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
    </div>

    <template v-if="!editing">
      <FormField
        label="Children"
        for="parent-children"
      >
        <div
          v-if="form.children.length"
          class="mb-2 flex flex-wrap gap-1.5"
        >
          <span
            v-for="(child, index) in form.children"
            :key="child.id"
            class="flex items-center gap-1 rounded-full bg-leaf-50 py-1 pr-1 pl-3 text-xs text-leaf-800 dark:bg-leaf-900/40 dark:text-leaf-200"
          >
            {{ child.label }}
            <button
              type="button"
              class="flex size-5 items-center justify-center rounded-full hover:bg-leaf-100 dark:hover:bg-leaf-900"
              :aria-label="`Remove ${child.label}`"
              @click="form.children.splice(index, 1)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-3"
              />
            </button>
          </span>
        </div>
        <FormOptionPicker
          :key="pickerKey"
          v-model="pickerValue"
          endpoint="/api/options/students"
          input-id="parent-children"
          placeholder="Add a child — search name or admission no."
          :exclude="form.children.map(child => child.id)"
          @select="addChild"
        />
      </FormField>

      <FormField
        v-if="form.children.length"
        label="Relationship"
        for="parent-relationship"
      >
        <UInput
          id="parent-relationship"
          v-model="form.relationship"
          list="kora-relationships"
          variant="none"
          :ui="pillInputOnCardUi"
        />
        <datalist id="kora-relationships">
          <option value="Parent" />
          <option value="Mother" />
          <option value="Father" />
          <option value="Guardian" />
        </datalist>
      </FormField>
    </template>
  </FormModal>
</template>
