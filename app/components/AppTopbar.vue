<script setup lang="ts">
const { user } = useUserSession()
const { toggle } = useSidebar()
const { items } = useDashboardNav()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (dark: boolean) => { colorMode.preference = dark ? 'dark' : 'light' }
})

const canOpenInbox = computed(() => items.value.some(item => item.to === '/dashboard/conversations'))

const initials = computed(() =>
  (user.value?.name ?? '').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
)

const searchOpen = ref(false)

const searchGroups = computed(() => [{
  id: 'nav',
  label: 'Go to',
  items: items.value.map(item => ({
    label: item.label,
    icon: item.icon,
    to: item.to,
    onSelect: () => { searchOpen.value = false }
  }))
}])

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchOpen.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-3 rounded-[22px] bg-shell-panel px-3 font-dash sm:h-19 sm:px-4">
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      size="sm"
      class="shrink-0 lg:hidden"
      aria-label="Open menu"
      @click="toggle"
    />

    <button
      type="button"
      class="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-shell-card pr-2 pl-3.5 text-[13px] text-shell-muted transition-colors hover:text-shell-ink sm:max-w-72.5"
      @click="searchOpen = true"
    >
      <UIcon
        name="i-lucide-search"
        class="size-5 shrink-0 text-shell-ink"
      />
      <span class="truncate">Search</span>
      <span class="ml-auto hidden rounded-md bg-shell-panel px-1.5 py-0.5 text-[11px] font-medium text-shell-ink/70 sm:inline-flex">
        ⌘ K
      </span>
    </button>

    <div class="ml-auto flex shrink-0 items-center gap-2.5">
      <NuxtLink
        v-if="canOpenInbox"
        to="/dashboard/conversations"
        class="flex size-11 items-center justify-center rounded-full bg-shell-card text-shell-ink transition-colors hover:text-leaf-800"
        aria-label="Conversations"
      >
        <UIcon
          name="i-lucide-mail"
          class="size-5"
        />
      </NuxtLink>
      <ClientOnly>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full bg-shell-card text-shell-ink transition-colors hover:text-leaf-800"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="isDark = !isDark"
        >
          <UIcon
            :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            class="size-5"
          />
        </button>
        <template #fallback>
          <div class="size-11 rounded-full bg-shell-card" />
        </template>
      </ClientOnly>

      <div
        v-if="user"
        class="ml-1 flex items-center gap-2.5"
      >
        <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F4B9A8] text-sm font-semibold text-[#7A2E1B]">
          {{ initials }}
        </div>
        <div class="hidden min-w-0 sm:block">
          <p class="truncate text-[15px] font-medium text-shell-ink">
            {{ user.name }}
          </p>
          <p class="truncate text-[13px] text-shell-muted">
            {{ user.email }}
          </p>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="searchOpen"
      title="Search"
      description="Jump to any section of the dashboard"
      :ui="{ content: 'sm:max-w-md' }"
    >
      <template #content>
        <UCommandPalette
          :groups="searchGroups"
          placeholder="Search dashboard sections..."
          @update:open="searchOpen = $event"
        />
      </template>
    </UModal>
  </header>
</template>
