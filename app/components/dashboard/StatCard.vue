<script setup lang="ts">
defineProps<{
  title: string
  value: string
  to?: string
  featured?: boolean
  /** Small bordered chip before the caption, e.g. "5" */
  delta?: string
  caption?: string
}>()
</script>

<template>
  <div
    class="relative flex min-h-35 flex-col overflow-hidden rounded-[20px] p-4"
    :class="featured ? 'bg-leaf-gradient text-white' : 'bg-shell-card text-shell-ink'"
  >
    <div
      v-if="featured"
      class="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-[#3BA06A]/25 blur-2xl"
    />

    <div class="relative flex items-start justify-between gap-2">
      <p class="pt-1 text-base font-medium tracking-[-0.01em]">
        {{ title }}
      </p>
      <NuxtLink
        v-if="to"
        :to="to"
        class="flex size-8 shrink-0 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5"
        :class="featured ? 'bg-white text-leaf-900' : 'border border-shell-ink/80 text-shell-ink'"
        :aria-label="`Open ${title.toLowerCase()}`"
      >
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-4.5"
        />
      </NuxtLink>
    </div>

    <p class="relative mt-3 truncate text-[44px] leading-none font-medium tracking-[-0.03em]">
      {{ value }}
    </p>

    <div
      class="relative mt-auto flex items-center gap-1.5 pt-4 text-[11px]"
      :class="featured ? 'text-leaf-200' : 'text-leaf-600 dark:text-leaf-400'"
    >
      <span
        v-if="delta"
        class="inline-flex items-center gap-px rounded-[4px] border px-1 text-[8px] leading-3 font-medium"
        :class="featured ? 'border-leaf-200/80' : 'border-leaf-600/70 dark:border-leaf-400/70'"
      >
        {{ delta }}
        <UIcon
          name="i-lucide-arrow-up"
          class="size-2"
        />
      </span>
      <span class="truncate">{{ caption }}</span>
    </div>
  </div>
</template>
