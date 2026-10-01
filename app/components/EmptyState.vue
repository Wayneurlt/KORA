<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="flex min-h-96 flex-1 flex-col items-center justify-center rounded-[20px] bg-shell-card px-6 py-16 text-center font-dash">
    <!-- Open, blank book -->
    <svg
      viewBox="0 0 160 104"
      class="h-24 w-auto"
      aria-hidden="true"
    >
      <ellipse
        cx="80"
        cy="96"
        rx="62"
        ry="5"
        class="fill-shell-ink/5"
      />
      <!-- cover -->
      <path
        d="M80 26c-17-10-42-12-66-8v66c24-4 49-2 66 8 17-10 42-12 66-8V18c-24-4-49-2-66 8Z"
        class="fill-leaf-800 dark:fill-leaf-600"
      />
      <!-- pages -->
      <path
        d="M80 22c-16-10-39-12-60-8v64c21-4 44-2 60 8V22Z"
        class="fill-shell-card stroke-leaf-800/25 dark:stroke-leaf-400/30"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M80 22c16-10 39-12 60-8v64c-21-4-44-2-60 8V22Z"
        class="fill-shell-panel stroke-leaf-800/25 dark:stroke-leaf-400/30"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M80 22v64"
        class="stroke-leaf-800/30 dark:stroke-leaf-400/40"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <!-- sparkles -->
      <path
        d="M146 4v8M142 8h8"
        class="stroke-leaf-400"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle
        cx="12"
        cy="8"
        r="2.5"
        class="fill-leaf-400/60"
      />
    </svg>

    <div class="mt-6 flex size-12 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
      <UIcon
        :name="icon"
        class="size-5.5"
      />
    </div>

    <p class="mt-5 text-lg font-medium tracking-[-0.01em] text-shell-ink">
      {{ title }}
    </p>
    <p class="mt-1.5 max-w-sm text-sm leading-relaxed text-shell-muted">
      {{ description }}
    </p>

    <div
      v-if="$slots.default"
      class="mt-6 flex flex-wrap justify-center gap-3"
    >
      <slot />
    </div>
  </div>
</template>
