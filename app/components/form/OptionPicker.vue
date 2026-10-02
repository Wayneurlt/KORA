<script setup lang="ts">
// Search-as-you-type picker backed by one of the /api/options/* endpoints.
interface Option {
  id: string
  label: string
  description?: string
}

const model = defineModel<string | null>({ default: null })

const props = withDefaults(defineProps<{
  endpoint: '/api/options/students' | '/api/options/parents'
  placeholder?: string
  /** Label shown for an initial value that isn't in the first page of results */
  initialLabel?: string
  inputId?: string
  /** Ids to hide (e.g. already linked) */
  exclude?: string[]
}>(), {
  placeholder: 'Search…',
  initialLabel: '',
  inputId: undefined,
  exclude: () => []
})

const emit = defineEmits<{ select: [option: Option] }>()

const term = ref('')
const options = ref<Option[]>([])
const selected = ref<Option | null>(model.value && props.initialLabel ? { id: model.value, label: props.initialLabel } : null)
const open = ref(false)
const loading = ref(false)
const active = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    options.value = (await $fetch<Option[]>(props.endpoint, { query: { search: term.value || undefined } }))
      .filter(option => !props.exclude.includes(option.id))
    active.value = 0
  } catch {
    options.value = []
  } finally {
    loading.value = false
  }
}

watch(term, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 200)
})

function choose(option: Option) {
  selected.value = option
  model.value = option.id
  emit('select', option)
  open.value = false
  term.value = ''
}

function clear() {
  selected.value = null
  model.value = null
}

function onFocus() {
  open.value = true
  if (!options.value.length) load()
}

function onBlur() {
  // Let a click on an option land before the list closes.
  setTimeout(() => {
    open.value = false
  }, 150)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    active.value = Math.min(active.value + 1, options.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (event.key === 'Enter' && options.value[active.value]) {
    event.preventDefault()
    choose(options.value[active.value]!)
  } else if (event.key === 'Escape') {
    open.value = false
  }
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="relative">
    <div
      v-if="selected"
      class="flex h-11 items-center gap-3 rounded-full bg-shell-panel pr-1.5 pl-4.5 text-sm"
    >
      <span class="min-w-0 flex-1 truncate">
        <span class="font-medium">{{ selected.label }}</span>
        <span
          v-if="selected.description"
          class="text-shell-muted"
        > · {{ selected.description }}</span>
      </span>
      <button
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-shell-muted hover:bg-shell-card hover:text-shell-ink"
        aria-label="Change selection"
        @click="clear"
      >
        <UIcon
          name="i-lucide-x"
          class="size-4"
        />
      </button>
    </div>

    <template v-else>
      <label class="flex h-11 items-center gap-2.5 rounded-full bg-shell-panel px-4.5 text-sm ring-1 ring-transparent focus-within:ring-2 focus-within:ring-leaf-600">
        <UIcon
          :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-search'"
          class="size-4 shrink-0 text-shell-muted"
          :class="loading && 'animate-spin'"
        />
        <input
          :id="inputId"
          v-model="term"
          type="text"
          role="combobox"
          :aria-expanded="open"
          autocomplete="off"
          :placeholder="placeholder"
          class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-shell-muted"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
        >
      </label>

      <ul
        v-if="open"
        class="absolute inset-x-0 top-12 z-20 max-h-64 overflow-y-auto rounded-2xl bg-shell-card p-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] ring-1 ring-shell-line"
        role="listbox"
      >
        <li
          v-for="(option, index) in options"
          :key="option.id"
          role="option"
          :aria-selected="index === active"
        >
          <button
            type="button"
            class="flex w-full flex-col rounded-xl px-3 py-2 text-left"
            :class="index === active ? 'bg-leaf-50 dark:bg-leaf-900/40' : 'hover:bg-shell-panel'"
            @mousedown.prevent="choose(option)"
            @mouseenter="active = index"
          >
            <span class="text-sm font-medium">{{ option.label }}</span>
            <span
              v-if="option.description"
              class="text-xs text-shell-muted"
            >{{ option.description }}</span>
          </button>
        </li>
        <li
          v-if="!loading && !options.length"
          class="px-3 py-3 text-sm text-shell-muted"
        >
          No matches
        </li>
      </ul>
    </template>
  </div>
</template>
