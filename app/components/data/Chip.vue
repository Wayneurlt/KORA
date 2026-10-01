<script setup lang="ts">
import type { ChipTone } from '~/utils/format'

// Small status pill, e.g. <DataChip status="PAID" /> or <DataChip tone="blue" label="Grade 6" />.
const props = defineProps<{
  status?: string
  tone?: ChipTone
  label?: string
}>()

const TONE_CLASSES: Record<ChipTone, string> = {
  green: 'bg-leaf-50 text-leaf-700 ring-leaf-600/20 dark:bg-leaf-900/40 dark:text-leaf-400',
  amber: 'bg-[#FEF3C7] text-[#B45309] ring-[#D97706]/20 dark:bg-[#B45309]/15 dark:text-[#FCD34D]',
  red: 'bg-[#FEE2E2] text-[#B91C1C] ring-[#DC2626]/20 dark:bg-[#DC2626]/15 dark:text-[#FCA5A5]',
  gray: 'bg-shell-panel text-shell-muted ring-shell-line',
  blue: 'bg-[#E0E7FF] text-[#3730A3] ring-[#4F46E5]/20 dark:bg-[#4F46E5]/15 dark:text-[#A5B4FC]',
  violet: 'bg-[#F3E8FF] text-[#6B21A8] ring-[#9333EA]/20 dark:bg-[#9333EA]/15 dark:text-[#D8B4FE]'
}

const toneClass = computed(() => TONE_CLASSES[props.tone ?? STATUS_TONES[props.status ?? ''] ?? 'gray'])
const text = computed(() => props.label ?? (props.status ? statusLabel(props.status) : ''))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset"
    :class="toneClass"
  >
    <slot />{{ text }}
  </span>
</template>
