<script setup lang="ts">
const { items } = useDashboardNav()
const { clear } = useUserSession()
const { isOpen, close } = useSidebar()
const route = useRoute()
const router = useRouter()
const { data: school } = await useFetch('/api/public/school')
const { data: badges } = await useFetch('/api/dashboard/badges')

const GENERAL = ['/dashboard/staff', '/dashboard/settings']
const mainItems = computed(() => items.value.filter(item => !GENERAL.includes(item.to)))
const generalItems = computed(() => items.value.filter(item => GENERAL.includes(item.to)))
const canOpenInbox = computed(() => items.value.some(item => item.to === '/dashboard/conversations'))

function isActive(to: string) {
  return to === '/dashboard' ? route.path === '/dashboard' : route.path.startsWith(to)
}

function badgeLabel(key?: 'openConversations') {
  const count = key ? badges.value?.[key] : null
  if (!count) return null
  return count > 12 ? '12+' : String(count)
}

watch(() => route.fullPath, () => close())

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await router.push('/login')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="close"
    />
  </Teleport>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col rounded-r-[22px] bg-shell-panel font-dash transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 lg:rounded-[22px]"
    :class="{ 'translate-x-0': isOpen }"
  >
    <div class="flex h-19 shrink-0 items-center gap-2.5 px-5 pt-2">
      <AppLogo
        :name="school?.name ?? 'Kora'"
        :logo="school?.logo"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        class="ml-auto lg:hidden"
        aria-label="Close menu"
        @click="close"
      />
    </div>

    <nav class="flex-1 overflow-y-auto pt-8 pb-4">
      <p class="px-5.5 text-[11px] font-medium tracking-wide text-shell-muted uppercase">
        Menu
      </p>
      <div class="mt-3 space-y-1">
        <NuxtLink
          v-for="item in mainItems"
          :key="item.to"
          :to="item.to"
          class="relative flex h-9 items-center gap-2.5 pr-4 pl-5.5 text-[15px] transition-colors"
          :class="isActive(item.to) ? 'font-medium text-shell-ink' : 'text-shell-muted hover:text-shell-ink'"
        >
          <span
            v-if="isActive(item.to)"
            class="absolute inset-y-0.5 left-0 w-1.5 rounded-r-full bg-leaf-800 dark:bg-leaf-400"
          />
          <UIcon
            :name="item.icon"
            class="size-5 shrink-0"
            :class="isActive(item.to) ? 'text-leaf-800 dark:text-leaf-400' : ''"
          />
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="badgeLabel(item.badge)"
            class="ml-auto shrink-0 rounded-[5px] bg-leaf-900 px-1.5 py-px text-[9px] font-semibold text-white"
          >
            {{ badgeLabel(item.badge) }}
          </span>
        </NuxtLink>
      </div>

      <p class="mt-8 px-5.5 text-[11px] font-medium tracking-wide text-shell-muted uppercase">
        General
      </p>
      <div class="mt-3 space-y-1">
        <NuxtLink
          v-for="item in generalItems"
          :key="item.to"
          :to="item.to"
          class="relative flex h-9 items-center gap-2.5 pr-4 pl-5.5 text-[15px] transition-colors"
          :class="isActive(item.to) ? 'font-medium text-shell-ink' : 'text-shell-muted hover:text-shell-ink'"
        >
          <span
            v-if="isActive(item.to)"
            class="absolute inset-y-0.5 left-0 w-1.5 rounded-r-full bg-leaf-800 dark:bg-leaf-400"
          />
          <UIcon
            :name="item.icon"
            class="size-5 shrink-0"
            :class="isActive(item.to) ? 'text-leaf-800 dark:text-leaf-400' : ''"
          />
          {{ item.label }}
        </NuxtLink>

        <button
          type="button"
          class="flex h-9 w-full items-center gap-3 px-5.5 text-[15px] text-shell-muted transition-colors hover:text-error"
          @click="logout"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-5 shrink-0"
          />
          Logout
        </button>
      </div>
    </nav>

    <div
      v-if="canOpenInbox"
      class="p-3"
    >
      <div class="relative overflow-hidden rounded-2xl bg-[#0B110D] p-3 text-white">
        <SwirlBackdrop
          :lines="20"
          :cx="70"
          :cy="85"
        />
        <div class="relative">
          <div class="flex size-5 items-center justify-center rounded-full bg-white">
            <UIcon
              name="i-simple-icons-whatsapp"
              class="size-3 text-leaf-900"
            />
          </div>
          <p class="mt-3 text-[15px] leading-[1.15] font-medium">
            Reach parents<br>on WhatsApp
          </p>
          <p class="mt-1.5 text-[9px] text-white/60">
            Results, fees and notices in one chat
          </p>
          <UButton
            to="/dashboard/conversations"
            block
            size="sm"
            class="mt-5 h-8 justify-center rounded-full bg-leaf-800 text-[11px] font-medium text-white hover:bg-leaf-700"
          >
            Open Inbox
          </UButton>
        </div>
      </div>
    </div>
  </aside>
</template>
