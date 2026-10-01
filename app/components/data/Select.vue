<script setup lang="ts">
// Pill-shaped native select for toolbars (class / exam pickers).
const model = defineModel<string>({ default: '' })

defineProps<{
  options: { value: string, label: string }[]
  label: string
  icon?: string
  /** Sitting inside a white card: use the gray fill instead */
  onCard?: boolean
}>()
</script>

<template>
  <label
    class="relative flex h-11 shrink-0 items-center rounded-full pr-9 pl-4 text-[13px] ring-1 ring-transparent focus-within:ring-2 focus-within:ring-leaf-600"
    :class="onCard ? 'bg-shell-panel' : 'bg-shell-card'"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="mr-2 size-4 shrink-0 text-shell-muted"
    />
    <span class="sr-only">{{ label }}</span>
    <select
      v-model="model"
      class="min-w-0 appearance-none bg-transparent pr-1 text-shell-ink outline-none"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <UIcon
      name="i-lucide-chevron-down"
      class="pointer-events-none absolute right-3.5 size-4 text-shell-muted"
    />
  </label>
</template>
