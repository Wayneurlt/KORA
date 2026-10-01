<script setup lang="ts">
const page = defineModel<number>({ required: true })

const props = defineProps<{
  total: number
  pageSize: number
  noun?: string
}>()

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total ? (page.value - 1) * props.pageSize + 1 : 0))
const to = computed(() => Math.min(page.value * props.pageSize, props.total))
</script>

<template>
  <div class="flex items-center justify-between gap-3 border-t border-shell-line px-4 py-3 text-xs text-shell-muted">
    <p>
      Showing <span class="font-medium text-shell-ink">{{ from }}–{{ to }}</span> of
      <span class="font-medium text-shell-ink">{{ total }}</span> {{ noun ?? 'results' }}
    </p>
    <div
      v-if="pages > 1"
      class="flex items-center gap-1.5"
    >
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full bg-shell-panel text-shell-ink transition-colors hover:bg-leaf-50 disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="page--"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="size-4"
        />
      </button>
      <span class="min-w-14 text-center">Page {{ page }} / {{ pages }}</span>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full bg-shell-panel text-shell-ink transition-colors hover:bg-leaf-50 disabled:opacity-40"
        :disabled="page >= pages"
        aria-label="Next page"
        @click="page++"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4"
        />
      </button>
    </div>
  </div>
</template>
