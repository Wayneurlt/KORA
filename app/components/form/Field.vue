<script setup lang="ts">
defineProps<{
  label: string
  /** id of the control, for the label's `for` */
  for?: string
  hint?: string
  required?: boolean
}>()
</script>

<template>
  <div>
    <label
      :for="$props.for"
      class="mb-1.5 block px-1 text-[13px] font-medium"
    >
      {{ label }}<span
        v-if="required"
        class="text-[#DC2626]"
      > *</span>
    </label>
    <slot />
    <p
      v-if="hint"
      class="mt-1.5 px-1 text-[11px] text-shell-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
