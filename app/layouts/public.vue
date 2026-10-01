<script setup lang="ts">
const { loggedIn } = useUserSession()
const { data: school } = await useFetch('/api/public/school')
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (dark: boolean) => { colorMode.preference = dark ? 'dark' : 'light' }
})

const menuOpen = ref(false)

const navLinks = [
  { label: 'About', to: '#about' },
  { label: 'For Parents', to: '#parents' },
  { label: 'For Staff', to: '#staff' },
  { label: 'Contact', to: '#contact' }
]
</script>

<template>
  <div class="min-h-screen bg-shell-frame font-dash text-shell-ink">
    <header class="sticky top-0 z-40 border-b border-transparent bg-shell-frame/80 backdrop-blur-md">
      <div class="mx-auto flex h-18 max-w-6xl items-center gap-4 px-5 sm:h-20 sm:px-8">
        <NuxtLink
          to="/"
          class="min-w-0"
        >
          <AppLogo
            :name="school?.name ?? 'Kora'"
            :logo="school?.logo"
          />
        </NuxtLink>

        <nav class="mx-auto hidden items-center gap-8 md:flex">
          <a
            v-for="link in navLinks"
            :key="link.to"
            :href="link.to"
            class="text-[15px] text-shell-muted transition-colors hover:text-shell-ink"
          >
            {{ link.label }}
          </a>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <ClientOnly>
            <button
              type="button"
              class="hidden size-10 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-panel hover:text-shell-ink sm:flex"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="isDark = !isDark"
            >
              <UIcon
                :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
                class="size-5"
              />
            </button>
            <template #fallback>
              <div class="hidden size-10 sm:block" />
            </template>
          </ClientOnly>

          <NuxtLink
            :to="loggedIn ? '/dashboard' : '/login'"
            class="bg-leaf-gradient flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {{ loggedIn ? 'Dashboard' : 'Staff Login' }}
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-4"
            />
          </NuxtLink>

          <button
            type="button"
            class="flex size-10 items-center justify-center rounded-full text-shell-ink hover:bg-shell-panel md:hidden"
            :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <UIcon
              :name="menuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
              class="size-5"
            />
          </button>
        </div>
      </div>

      <nav
        v-if="menuOpen"
        class="mx-auto flex max-w-6xl flex-col px-5 pb-4 md:hidden"
      >
        <a
          v-for="link in navLinks"
          :key="link.to"
          :href="link.to"
          class="border-b border-shell-line py-3.5 text-base text-shell-ink"
          @click="menuOpen = false"
        >
          {{ link.label }}
        </a>
        <button
          type="button"
          class="flex items-center justify-between py-3.5 text-base text-shell-ink sm:hidden"
          @click="isDark = !isDark"
        >
          Appearance
          <UIcon
            :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            class="size-5"
          />
        </button>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer
      id="contact"
      class="mx-auto max-w-6xl scroll-mt-24 px-5 pt-16 pb-10 sm:px-8"
    >
      <div class="grid gap-10 border-t border-shell-line pt-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <AppLogo
            :name="school?.name ?? 'Kora'"
            :logo="school?.logo"
          />
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-shell-muted">
            Results, fees, announcements and support for every parent — right inside WhatsApp.
          </p>
        </div>

        <div>
          <p class="text-sm font-medium">
            Explore
          </p>
          <ul class="mt-4 space-y-2.5 text-sm text-shell-muted">
            <li
              v-for="link in navLinks.slice(0, 3)"
              :key="link.to"
            >
              <a
                :href="link.to"
                class="transition-colors hover:text-shell-ink"
              >{{ link.label }}</a>
            </li>
            <li>
              <NuxtLink
                to="/login"
                class="transition-colors hover:text-shell-ink"
              >
                Staff Login
              </NuxtLink>
            </li>
          </ul>
        </div>

        <div>
          <p class="text-sm font-medium">
            Contact
          </p>
          <ul class="mt-4 space-y-2.5 text-sm text-shell-muted">
            <li v-if="school?.phone">
              <a
                :href="`tel:${school.phone}`"
                class="flex items-center gap-2 transition-colors hover:text-shell-ink"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="size-4"
                />
                {{ school.phone }}
              </a>
            </li>
            <li v-if="school?.email">
              <a
                :href="`mailto:${school.email}`"
                class="flex items-center gap-2 transition-colors hover:text-shell-ink"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-4"
                />
                {{ school.email }}
              </a>
            </li>
            <li
              v-if="school?.address"
              class="flex items-center gap-2"
            >
              <UIcon
                name="i-lucide-map-pin"
                class="size-4"
              />
              {{ school.address }}
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-12 text-xs text-shell-muted">
        © {{ new Date().getFullYear() }} {{ school?.name ?? 'Kora' }}. All rights reserved.
      </p>
    </footer>
  </div>
</template>
