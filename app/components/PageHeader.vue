<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
    <div class="min-w-0">
      <h1 class="text-[28px] leading-tight font-medium tracking-[-0.02em] text-shell-ink sm:text-[34px]">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1.5 text-sm text-shell-muted"
      >
        {{ description }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 items-center gap-3 pt-1"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
