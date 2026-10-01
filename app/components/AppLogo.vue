<script setup lang="ts">
// School logo (if uploaded) or the Kora ring mark, plus the school name.
withDefaults(defineProps<{
  name?: string
  logo?: string | null
  /** Light text for dark backgrounds */
  inverted?: boolean
}>(), {
  name: 'Kora',
  logo: null,
  inverted: false
})
</script>

<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <img
      v-if="logo"
      :src="logo"
      :alt="name"
      class="size-8.5 shrink-0 rounded-full object-contain"
    >
    <svg
      v-else
      viewBox="0 0 36 36"
      class="size-8.5 shrink-0"
      :class="inverted ? 'text-leaf-400' : 'text-leaf-800 dark:text-leaf-400'"
      aria-hidden="true"
    >
      <circle
        cx="18"
        cy="18"
        r="15.5"
        fill="none"
        stroke="currentColor"
        stroke-width="3.5"
      />
      <path
        d="M18 26c-4.6-2.6-7-5.3-7-8.6 0-2.3 1.7-4 3.8-4 1.4 0 2.5.7 3.2 1.8.7-1.1 1.8-1.8 3.2-1.8 2.1 0 3.8 1.7 3.8 4 0 3.3-2.4 6-7 8.6Z"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linejoin="round"
      />
    </svg>
    <p
      class="min-w-0 truncate text-[19px] font-semibold tracking-[-0.02em]"
      :class="inverted ? 'text-white' : 'text-shell-ink'"
    >
      {{ name }}
    </p>
  </div>
</template>
