<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest'
})

const { fetch: refreshSession } = useUserSession()
const router = useRouter()
const { data: school } = await useFetch('/api/public/school')

const state = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: state
    })
    await refreshSession()
    await router.push('/dashboard')
  } catch {
    errorMessage.value = 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

const staffTools = [
  { icon: 'i-lucide-graduation-cap', title: 'Results', description: 'Enter and publish exam results' },
  { icon: 'i-lucide-wallet', title: 'Fees', description: 'Record payments, track balances' },
  { icon: 'i-lucide-megaphone', title: 'Announcements', description: 'Notify every parent at once' },
  { icon: 'i-lucide-message-circle', title: 'Inbox', description: 'Reply to parents on WhatsApp' }
]

const inputUi = pillInputUi
</script>

<template>
  <div class="grid w-full gap-2.5 lg:grid-cols-[1fr_1.05fr]">
    <section class="flex min-h-[calc(100vh-20px)] flex-col rounded-[22px] bg-shell-panel px-5 py-5 sm:px-8">
      <div class="flex items-center justify-between gap-3">
        <NuxtLink to="/">
          <AppLogo
            :name="school?.name ?? 'Kora'"
            :logo="school?.logo"
          />
        </NuxtLink>
        <NuxtLink
          to="/"
          class="flex h-10 items-center gap-1.5 rounded-full bg-shell-card px-4 text-[13px] text-shell-muted transition-colors hover:text-shell-ink"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to site
        </NuxtLink>
      </div>

      <div class="mx-auto my-auto w-full max-w-sm py-12">
        <h1 class="text-[34px] leading-tight font-medium tracking-[-0.02em]">
          Welcome back
        </h1>
        <p class="mt-1.5 text-sm text-shell-muted">
          Log in to manage students, fees and parent conversations.
        </p>

        <form
          class="mt-8 space-y-4"
          @submit.prevent="onSubmit"
        >
          <div>
            <label
              for="email"
              class="mb-1.5 block px-1 text-[13px] font-medium"
            >Email</label>
            <UInput
              id="email"
              v-model="state.email"
              type="email"
              autocomplete="email"
              placeholder="you@school.com"
              required
              variant="none"
              :ui="inputUi"
            />
          </div>

          <div>
            <label
              for="password"
              class="mb-1.5 block px-1 text-[13px] font-medium"
            >Password</label>
            <UInput
              id="password"
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="••••••••"
              required
              variant="none"
              :ui="{ ...inputUi, base: `${inputUi.base} pe-12`, trailing: 'pe-2' }"
            >
              <template #trailing>
                <button
                  type="button"
                  class="flex size-9 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-panel hover:text-shell-ink"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <UIcon
                    :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    class="size-4.5"
                  />
                </button>
              </template>
            </UInput>
          </div>

          <p
            v-if="errorMessage"
            class="flex items-center gap-2 rounded-2xl border border-[#DC2626]/25 bg-[#FEE2E2] px-4 py-3 text-[13px] text-[#B91C1C] dark:bg-[#DC2626]/15 dark:text-[#FCA5A5]"
            role="alert"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="size-4.5 shrink-0"
            />
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            class="bg-leaf-gradient flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-70"
            :disabled="loading"
          >
            <UIcon
              v-if="loading"
              name="i-lucide-loader-circle"
              class="size-4.5 animate-spin"
            />
            {{ loading ? 'Logging in…' : 'Log in' }}
          </button>
        </form>
      </div>

      <p class="text-center text-xs text-shell-muted">
        Trouble logging in? Ask your school administrator to reset your account.
      </p>
    </section>

    <section class="relative hidden overflow-hidden rounded-[22px] bg-[#0C2416] p-8 text-white lg:flex lg:flex-col xl:p-10">
      <SwirlBackdrop
        :cx="72"
        :cy="38"
        :lines="34"
      />

      <span class="relative inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs ring-1 ring-white/15">
        <span class="size-2 rounded-full bg-leaf-400" />
        Staff portal
      </span>

      <div class="relative mt-auto">
        <h2 class="max-w-md text-[44px] leading-[1.05] font-medium tracking-[-0.03em] xl:text-[52px]">
          Every parent, one WhatsApp message away.
        </h2>
        <p class="mt-4 max-w-sm text-sm text-white/65">
          Results, fees, announcements and support — handled from one dashboard, delivered where parents already are.
        </p>

        <div class="mt-10 grid grid-cols-2 gap-2.5">
          <div
            v-for="tool in staffTools"
            :key="tool.title"
            class="rounded-[20px] bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm"
          >
            <span class="flex size-9 items-center justify-center rounded-full bg-white text-leaf-900">
              <UIcon
                :name="tool.icon"
                class="size-4.5"
              />
            </span>
            <p class="mt-4 text-[15px] font-medium">
              {{ tool.title }}
            </p>
            <p class="mt-0.5 text-xs text-white/60">
              {{ tool.description }}
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
