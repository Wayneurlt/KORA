<script setup lang="ts">
// Dashboard-styled form dialog: <FormModal v-model:open title="Record payment" @submit="save">…fields…</FormModal>
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  title: string
  description?: string
  submitLabel?: string
  loading?: boolean
  error?: string
  /** Red submit button for destructive confirmations */
  danger?: boolean
  /** Hide the footer (e.g. a result screen supplies its own buttons) */
  hideFooter?: boolean
  wide?: boolean
}>(), {
  submitLabel: 'Save',
  loading: false,
  error: '',
  danger: false,
  hideFooter: false,
  wide: false
})

const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="{ content: `${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} bg-transparent shadow-none ring-0` }"
  >
    <template #content>
      <form
        class="flex max-h-[90vh] flex-col overflow-hidden rounded-[22px] bg-shell-card font-dash text-shell-ink"
        novalidate
        @submit.prevent="emit('submit')"
      >
        <div class="flex items-start gap-3 px-5 pt-5">
          <div class="min-w-0 flex-1">
            <p class="text-lg font-medium tracking-[-0.01em]">
              {{ title }}
            </p>
            <p
              v-if="description"
              class="mt-0.5 text-[13px] text-shell-muted"
            >
              {{ description }}
            </p>
          </div>
          <button
            type="button"
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-shell-panel transition-colors hover:text-leaf-800"
            aria-label="Close"
            @click="open = false"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4.5"
            />
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <slot />

          <p
            v-if="error"
            class="flex items-start gap-2 rounded-2xl border border-[#DC2626]/25 bg-[#FEE2E2] px-4 py-3 text-[13px] text-[#B91C1C] dark:bg-[#DC2626]/15 dark:text-[#FCA5A5]"
            role="alert"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="mt-0.5 size-4 shrink-0"
            />
            {{ error }}
          </p>
        </div>

        <div
          v-if="!hideFooter"
          class="flex items-center justify-end gap-2.5 border-t border-shell-line px-5 py-4"
        >
          <slot name="footer-start" />
          <button
            type="button"
            class="h-11 rounded-full px-5 text-sm font-medium text-shell-muted transition-colors hover:bg-shell-panel hover:text-shell-ink"
            @click="open = false"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            :class="danger ? 'bg-[#DC2626]' : 'bg-leaf-gradient'"
            :disabled="loading"
          >
            <UIcon
              v-if="loading"
              name="i-lucide-loader-circle"
              class="size-4.5 animate-spin"
            />
            {{ submitLabel }}
          </button>
        </div>
        <slot name="footer" />
      </form>
    </template>
  </UModal>
</template>
