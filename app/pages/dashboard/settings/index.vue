<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'settings',
  title: 'School Settings',
  description: 'Update your school\'s profile, contact details and branding.',
  hideHeader: true
})

const route = useRoute()
const { data } = await useFetch('/api/settings')

type SettingsForm = {
  name: string
  logo: string
  phone: string
  email: string
  address: string
  website: string
  currency: string
  timezone: string
}

const state = reactive<SettingsForm>({
  name: '',
  logo: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  currency: '',
  timezone: ''
})

const saved = ref<SettingsForm | null>(null)

function load() {
  if (!data.value) return
  const values: SettingsForm = {
    name: data.value.name ?? '',
    logo: data.value.logo ?? '',
    phone: data.value.phone ?? '',
    email: data.value.email ?? '',
    address: data.value.address ?? '',
    website: data.value.website ?? '',
    currency: data.value.currency ?? '',
    timezone: data.value.timezone ?? ''
  }
  Object.assign(state, values)
  saved.value = values
}

watch(data, load, { immediate: true })

const dirty = computed(() => !!saved.value && JSON.stringify(state) !== JSON.stringify(saved.value))

const saving = ref(false)
const errorMessage = ref('')
const toast = useToast()

async function onSubmit() {
  saving.value = true
  errorMessage.value = ''

  try {
    data.value = await $fetch('/api/settings', { method: 'PUT', body: state })
    // Sidebar, landing page and login read the public school profile.
    await refreshNuxtData()
    toast.add({ title: 'School settings saved', color: 'success' })
  } catch (error: unknown) {
    const statusMessage = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = statusMessage ?? 'Could not save school settings.'
  } finally {
    saving.value = false
  }
}

const logoFailed = ref(false)
watch(() => state.logo, () => {
  logoFailed.value = false
})

const lastSaved = computed(() => {
  const updatedAt = data.value?.updatedAt
  return updatedAt
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt))
    : null
})

const sections = [
  { id: 'profile', title: 'School profile', description: 'The name and logo parents see in WhatsApp and on the website.' },
  { id: 'contact', title: 'Contact details', description: 'Shown on the landing page and shared when parents ask how to reach you.' },
  { id: 'region', title: 'Region', description: 'Used to format fee amounts and message times.' }
]
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template #actions>
        <button
          type="button"
          class="flex h-11 items-center rounded-full border-[1.5px] border-leaf-800 px-5 text-sm font-medium text-leaf-900 transition-colors hover:bg-leaf-50 disabled:pointer-events-none disabled:opacity-40 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
          :disabled="!dirty || saving"
          @click="load"
        >
          Discard
        </button>
        <button
          type="submit"
          form="settings-form"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          :disabled="!dirty || saving"
        >
          <UIcon
            :name="saving ? 'i-lucide-loader-circle' : 'i-lucide-check'"
            class="size-4.5"
            :class="saving && 'animate-spin'"
          />
          {{ saving ? 'Saving…' : 'Save Changes' }}
        </button>
      </template>
    </PageHeader>

    <div class="grid flex-1 grid-cols-1 gap-2.5 lg:grid-cols-[1fr_320px]">
      <form
        id="settings-form"
        class="flex flex-col gap-2.5"
        @submit.prevent="onSubmit"
      >
        <p
          v-if="errorMessage"
          class="flex items-center gap-2 rounded-[20px] border border-[#DC2626]/25 bg-[#FEE2E2] px-4 py-3 text-[13px] text-[#B91C1C] dark:bg-[#DC2626]/15 dark:text-[#FCA5A5]"
          role="alert"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="size-4.5 shrink-0"
          />
          {{ errorMessage }}
        </p>

        <!-- Profile -->
        <section class="grid gap-5 rounded-[20px] bg-shell-card p-5 md:grid-cols-[220px_1fr] md:gap-8">
          <div>
            <p class="text-base font-medium tracking-[-0.01em]">
              {{ sections[0]!.title }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-shell-muted">
              {{ sections[0]!.description }}
            </p>
          </div>

          <div class="space-y-4">
            <div class="flex items-center gap-4 rounded-[18px] bg-shell-panel p-3">
              <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-shell-card">
                <img
                  v-if="state.logo && !logoFailed"
                  :src="state.logo"
                  alt="School logo preview"
                  class="size-full object-contain"
                  @error="logoFailed = true"
                >
                <AppLogo
                  v-else
                  name=""
                />
              </div>
              <div class="min-w-0">
                <p class="truncate text-[15px] font-medium">
                  {{ state.name || 'Your school' }}
                </p>
                <p class="text-xs text-shell-muted">
                  {{ logoFailed ? 'Logo URL could not be loaded' : state.logo ? 'Logo preview' : 'No logo yet — using the Kora mark' }}
                </p>
              </div>
            </div>

            <div>
              <label
                for="name"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >School name <span class="text-[#DC2626]">*</span></label>
              <UInput
                id="name"
                v-model="state.name"
                required
                variant="none"
                :ui="pillInputOnCardUi"
              />
            </div>

            <div>
              <label
                for="logo"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >Logo URL</label>
              <UInput
                id="logo"
                v-model="state.logo"
                placeholder="https://…"
                variant="none"
                :ui="pillInputOnCardUi"
              />
            </div>
          </div>
        </section>

        <!-- Contact -->
        <section class="grid gap-5 rounded-[20px] bg-shell-card p-5 md:grid-cols-[220px_1fr] md:gap-8">
          <div>
            <p class="text-base font-medium tracking-[-0.01em]">
              {{ sections[1]!.title }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-shell-muted">
              {{ sections[1]!.description }}
            </p>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="phone"
                  class="mb-1.5 block px-1 text-[13px] font-medium"
                >Phone</label>
                <UInput
                  id="phone"
                  v-model="state.phone"
                  placeholder="+254 700 000 000"
                  variant="none"
                  :ui="pillInputOnCardUi"
                />
              </div>
              <div>
                <label
                  for="email"
                  class="mb-1.5 block px-1 text-[13px] font-medium"
                >Email</label>
                <UInput
                  id="email"
                  v-model="state.email"
                  type="email"
                  placeholder="info@school.com"
                  variant="none"
                  :ui="pillInputOnCardUi"
                />
              </div>
            </div>

            <div>
              <label
                for="address"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >Address</label>
              <UTextarea
                id="address"
                v-model="state.address"
                :rows="3"
                variant="none"
                :ui="softTextareaOnCardUi"
              />
            </div>

            <div>
              <label
                for="website"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >Website</label>
              <UInput
                id="website"
                v-model="state.website"
                placeholder="https://school.com"
                variant="none"
                :ui="pillInputOnCardUi"
              />
            </div>
          </div>
        </section>

        <!-- Region -->
        <section class="grid gap-5 rounded-[20px] bg-shell-card p-5 md:grid-cols-[220px_1fr] md:gap-8">
          <div>
            <p class="text-base font-medium tracking-[-0.01em]">
              {{ sections[2]!.title }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-shell-muted">
              {{ sections[2]!.description }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                for="currency"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >Currency <span class="text-[#DC2626]">*</span></label>
              <UInput
                id="currency"
                v-model="state.currency"
                placeholder="KES"
                maxlength="3"
                required
                variant="none"
                :ui="pillInputOnCardUi"
              />
              <p class="mt-1.5 px-1 text-[11px] text-shell-muted">
                3-letter code, e.g. KES
              </p>
            </div>
            <div>
              <label
                for="timezone"
                class="mb-1.5 block px-1 text-[13px] font-medium"
              >Timezone <span class="text-[#DC2626]">*</span></label>
              <UInput
                id="timezone"
                v-model="state.timezone"
                placeholder="Africa/Nairobi"
                required
                variant="none"
                :ui="pillInputOnCardUi"
              />
              <p class="mt-1.5 px-1 text-[11px] text-shell-muted">
                e.g. Africa/Nairobi
              </p>
            </div>
          </div>
        </section>
      </form>

      <!-- Live preview -->
      <aside class="flex flex-col gap-2.5 self-start lg:sticky lg:top-0">
        <div class="relative overflow-hidden rounded-[20px] bg-[#0C2416] p-4 pb-5 text-white">
          <SwirlBackdrop
            :cx="80"
            :cy="20"
          />
          <div class="relative">
            <p class="text-base font-medium tracking-[-0.01em]">
              What parents see
            </p>
            <p class="mt-0.5 text-[11px] text-white/60">
              Updates as you type
            </p>

            <div class="mt-5 overflow-hidden rounded-2xl bg-[#E5DDD5] text-[#111b21] shadow-lg">
              <div class="flex items-center gap-2.5 bg-[#075E54] px-3 py-2.5 text-white">
                <div class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                  <img
                    v-if="state.logo && !logoFailed"
                    :src="state.logo"
                    alt=""
                    class="size-full object-contain"
                  >
                  <UIcon
                    v-else
                    name="i-lucide-school"
                    class="size-4 text-[#075E54]"
                  />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">
                    {{ state.name || 'Your school' }}
                  </p>
                  <p class="text-[10px] text-white/70">
                    online
                  </p>
                </div>
              </div>
              <div class="space-y-2 p-3">
                <div class="max-w-[90%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[12px] leading-snug shadow-sm">
                  Hi 👋 thanks for messaging {{ state.name || 'your school' }}. How can we help?
                </div>
                <div
                  v-if="state.phone || state.email || state.website"
                  class="max-w-[90%] space-y-1 rounded-lg bg-white px-3 py-2 text-[12px] leading-snug shadow-sm"
                >
                  <p
                    v-if="state.phone"
                    class="flex items-center gap-1.5"
                  >
                    <UIcon
                      name="i-lucide-phone"
                      class="size-3.5 text-[#075E54]"
                    />{{ state.phone }}
                  </p>
                  <p
                    v-if="state.email"
                    class="flex items-center gap-1.5 break-all"
                  >
                    <UIcon
                      name="i-lucide-mail"
                      class="size-3.5 shrink-0 text-[#075E54]"
                    />{{ state.email }}
                  </p>
                  <p
                    v-if="state.website"
                    class="flex items-center gap-1.5 break-all"
                  >
                    <UIcon
                      name="i-lucide-globe"
                      class="size-3.5 shrink-0 text-[#075E54]"
                    />{{ state.website }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 rounded-[20px] bg-shell-card p-4">
          <span
            class="flex size-10 shrink-0 items-center justify-center rounded-full"
            :class="dirty ? 'bg-[#FEF3C7] text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#FCD34D]' : 'bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400'"
          >
            <UIcon
              :name="dirty ? 'i-lucide-pencil' : 'i-lucide-check'"
              class="size-4.5"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-medium">
              {{ dirty ? 'Unsaved changes' : 'All changes saved' }}
            </p>
            <p
              v-if="lastSaved"
              class="truncate text-[11px] text-shell-muted"
            >
              Last saved {{ lastSaved }}
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
