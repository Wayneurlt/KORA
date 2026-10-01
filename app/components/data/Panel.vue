<script setup lang="ts">
// Right-hand detail panel in the dashboard style (gray panel, white cards inside).
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="title"
    :description="description"
    :ui="{ content: 'max-w-xl bg-transparent shadow-none ring-0 sm:p-2.5' }"
  >
    <template #content>
      <div class="flex h-full flex-col overflow-hidden bg-shell-panel font-dash text-shell-ink sm:rounded-[22px]">
        <div class="flex items-start gap-3 px-5 pt-5 pb-4">
          <div class="min-w-0 flex-1">
            <slot name="header">
              <p class="truncate text-xl font-medium tracking-[-0.01em]">
                {{ title }}
              </p>
              <p
                v-if="description"
                class="mt-0.5 text-[13px] text-shell-muted"
              >
                {{ description }}
              </p>
            </slot>
          </div>
          <button
            type="button"
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-shell-card text-shell-ink transition-colors hover:text-leaf-800"
            aria-label="Close"
            @click="open = false"
          >
            <UIcon
              name="i-lucide-x"
              class="size-5"
            />
          </button>
        </div>
        <div class="flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2.5">
          <slot />
        </div>
      </div>
    </template>
  </USlideover>
</template>
