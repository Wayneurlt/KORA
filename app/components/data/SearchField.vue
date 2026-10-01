<script setup lang="ts">
// Debounced pill search box for list toolbars.
const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  placeholder?: string
  /** Sitting inside a white card: use the gray fill instead */
  onCard?: boolean
}>(), { placeholder: 'Search…', onCard: false })

const local = ref(model.value)
let timer: ReturnType<typeof setTimeout> | undefined

watch(local, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    model.value = value.trim()
  }, 300)
})
watch(model, (value) => {
  if (value !== local.value.trim()) local.value = value
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <label
    class="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full pr-2 pl-4 text-sm ring-1 ring-transparent transition-shadow focus-within:ring-2 focus-within:ring-leaf-600"
    :class="onCard ? 'bg-shell-panel' : 'bg-shell-card sm:max-w-80'"
  >
    <UIcon
      name="i-lucide-search"
      class="size-4.5 shrink-0 text-shell-muted"
    />
    <input
      v-model="local"
      type="search"
      :placeholder="placeholder"
      class="min-w-0 flex-1 bg-transparent text-shell-ink outline-none placeholder:text-shell-muted [&::-webkit-search-cancel-button]:hidden"
    >
    <button
      v-if="local"
      type="button"
      class="flex size-7 items-center justify-center rounded-full text-shell-muted hover:bg-shell-panel hover:text-shell-ink"
      aria-label="Clear search"
      @click="local = ''"
    >
      <UIcon
        name="i-lucide-x"
        class="size-4"
      />
    </button>
  </label>
</template>
