<script setup lang="ts" generic="T extends string">
// Segmented pill filter: <DataFilterPills v-model="status" :options="[{ value: 'ALL', label: 'All', count: 10 }]" />
const model = defineModel<T>({ required: true })

defineProps<{
  options: { value: T, label: string, count?: number }[]
  /** Accessible name for the group */
  label?: string
  /** Sitting inside a white card: use the gray fill instead */
  onCard?: boolean
}>()
</script>

<template>
  <div
    class="flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]"
    :class="onCard ? 'bg-shell-panel' : 'bg-shell-card'"
    role="radiogroup"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="model === option.value"
      class="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] whitespace-nowrap transition-colors"
      :class="model === option.value ? 'bg-leaf-800 font-medium text-white dark:bg-leaf-600' : 'text-shell-muted hover:text-shell-ink'"
      @click="model = option.value"
    >
      {{ option.label }}
      <span
        v-if="option.count !== undefined"
        class="rounded-full px-1.5 text-[10px] leading-4 font-medium"
        :class="model === option.value ? 'bg-white/20 text-white' : 'bg-shell-panel text-shell-muted'"
      >{{ option.count }}</span>
    </button>
  </div>
</template>
