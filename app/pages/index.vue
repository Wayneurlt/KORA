<script setup lang="ts">
definePageMeta({
  layout: 'public'
})

const { data: school } = await useFetch('/api/public/school')

const whatsappHref = computed(() => {
  if (!school.value?.phone) return undefined
  const digits = school.value.phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}`
})

const parentFeatures = [
  {
    icon: 'i-lucide-users',
    title: 'My Children',
    description: 'See every child linked to your account, their class and admission details, in one place.'
  },
  {
    icon: 'i-lucide-graduation-cap',
    title: 'Exam Results',
    description: 'Published exam results and teacher comments, as soon as the school releases them.'
  },
  {
    icon: 'i-lucide-wallet',
    title: 'Fees & Balance',
    description: 'Current fee balance, due dates and recent payment history — no statements to chase.'
  },
  {
    icon: 'i-lucide-megaphone',
    title: 'School Announcements',
    description: 'Closures, events and other school-wide or class-specific notices, delivered straight to WhatsApp.'
  }
]

const staffFeatures = [
  {
    icon: 'i-lucide-users',
    title: 'Students & Parents',
    description: 'Manage student records and keep parent-child relationships accurate and secure.'
  },
  {
    icon: 'i-lucide-graduation-cap',
    title: 'Results',
    description: 'Bulk score entry, configurable grading, and a clear publish workflow before parents see anything.'
  },
  {
    icon: 'i-lucide-wallet',
    title: 'Fees',
    description: 'Record payments and track outstanding balances with a server-calculated source of truth.'
  },
  {
    icon: 'i-lucide-message-circle',
    title: 'WhatsApp Conversations',
    description: 'A shared inbox for every parent conversation — assign, reply and track status as a team.'
  }
]

const facts = [
  { value: '0', label: 'Apps for parents to install' },
  { value: '24/7', label: 'Access to results and balances' },
  { value: '1', label: 'WhatsApp number for the school' },
  { value: '4', label: 'Staff roles with their own access' }
]

const steps = [
  { title: 'Save the school number', description: 'Add the school\'s WhatsApp number to your contacts — that\'s the whole setup.' },
  { title: 'Send a message', description: 'Say hi from the phone number you registered with the school.' },
  { title: 'Get answers instantly', description: 'Ask for results, fee balances or the latest notices and get them in the chat.' }
]

const ctaPoints = [
  'One school, one setup',
  'No per-parent fees',
  'Your own WhatsApp number'
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-150 bg-[radial-gradient(45%_45%_at_50%_40%,rgba(93,187,138,0.20),transparent_100%)]"
        aria-hidden="true"
      />

      <div class="relative mx-auto max-w-6xl px-5 pt-14 text-center sm:px-8 sm:pt-20 lg:pt-24">
        <span class="inline-flex items-center gap-2 rounded-full border border-shell-line bg-shell-card px-3.5 py-1.5 text-xs text-shell-muted">
          <UIcon
            name="i-simple-icons-whatsapp"
            class="size-3.5 text-[#25D366]"
          />
          School communication, right inside WhatsApp
        </span>

        <h1 class="mx-auto mt-7 max-w-4xl text-[42px] leading-[1.02] font-medium tracking-[-0.04em] sm:text-[64px] lg:text-[76px]">
          <TextReveal :text="school ? `Keep the conversation going with ${school.name}` : 'Keep the conversation going with your school'" />
        </h1>

        <p class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-shell-muted sm:text-lg">
          A direct line between the school and every parent — exam results, fees, announcements and support, all through WhatsApp.
        </p>

        <div class="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            :href="whatsappHref"
            target="_blank"
            rel="noopener"
            class="bg-leaf-gradient flex h-13 items-center gap-2.5 rounded-full px-7 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(20,83,45,0.6)] transition-transform hover:-translate-y-0.5"
            :class="!whatsappHref && 'pointer-events-none opacity-50'"
            :aria-disabled="!whatsappHref"
          >
            <UIcon
              name="i-simple-icons-whatsapp"
              class="size-5"
            />
            Chat on WhatsApp
          </a>
          <a
            href="#parents"
            class="flex h-13 items-center gap-2 rounded-full px-6 text-[15px] font-medium text-shell-ink transition-colors hover:bg-shell-panel"
          >
            See how it works
            <UIcon
              name="i-lucide-arrow-down"
              class="size-4"
            />
          </a>
        </div>

        <!-- Product stage -->
        <div class="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <div class="relative overflow-hidden rounded-[28px] bg-[#0C2416] px-4 pt-8 sm:rounded-[36px] sm:px-12 sm:pt-14">
            <SwirlBackdrop
              :cx="50"
              :cy="15"
              :lines="36"
            />
            <img
              src="/images/dashboard-preview.png"
              alt="The Kora staff dashboard with student, fee and message summaries"
              class="relative mx-auto w-full rounded-t-[14px] shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.5)] sm:rounded-t-[20px]"
            >
          </div>

          <div class="absolute -right-2 -bottom-10 hidden w-72 origin-bottom-right rotate-2 lg:block xl:-right-12">
            <WhatsAppPreview :school-name="school?.name ?? 'Kora'" />
          </div>
        </div>
      </div>
    </section>

    <!-- Facts -->
    <section class="mx-auto max-w-6xl px-5 pt-24 sm:px-8 lg:pt-28">
      <dl class="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        <div
          v-for="(fact, i) in facts"
          :key="fact.label"
          class="px-2 text-center lg:px-6"
          :class="i > 0 && 'lg:border-l lg:border-shell-line'"
        >
          <dt class="text-[44px] leading-none font-medium tracking-[-0.03em] text-leaf-800 sm:text-[56px] dark:text-leaf-400">
            {{ fact.value }}
          </dt>
          <dd class="mx-auto mt-3 max-w-40 text-sm text-shell-muted">
            {{ fact.label }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- For parents -->
    <section
      id="parents"
      class="mx-auto max-w-6xl scroll-mt-24 px-5 pt-28 sm:px-8 lg:pt-36"
    >
      <div class="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p class="text-sm font-medium text-leaf-600 dark:text-leaf-400">
            For Parents
          </p>
          <h2 class="mt-3 text-[34px] leading-[1.08] font-medium tracking-[-0.03em] sm:text-[46px]">
            Everything you need, without installing an app
          </h2>
          <p class="mt-5 max-w-md text-base leading-relaxed text-shell-muted">
            Open WhatsApp, send a message, and get what you came for — no downloads, no new passwords to remember.
          </p>

          <div class="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
            <div
              v-for="feature in parentFeatures"
              :key="feature.title"
            >
              <span class="flex size-11 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
                <UIcon
                  :name="feature.icon"
                  class="size-5"
                />
              </span>
              <p class="mt-4 text-base font-medium">
                {{ feature.title }}
              </p>
              <p class="mt-1.5 text-sm leading-relaxed text-shell-muted">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="relative">
          <img
            src="/images/parent-classroom.jpg"
            alt="A teacher helping a student with schoolwork"
            class="aspect-4/5 w-full rounded-[32px] object-cover"
          >
          <div class="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-shell-card p-3 pr-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] sm:-left-8">
            <span class="bg-leaf-gradient flex size-10 items-center justify-center rounded-full text-white">
              <UIcon
                name="i-lucide-check-check"
                class="size-5"
              />
            </span>
            <div class="text-left">
              <p class="text-sm font-medium">
                Fee balance sent
              </p>
              <p class="text-xs text-shell-muted">
                Delivered on WhatsApp · just now
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="mx-auto max-w-6xl px-5 pt-28 sm:px-8 lg:pt-36">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-medium text-leaf-600 dark:text-leaf-400">
          How it works
        </p>
        <h2 class="mt-3 text-[34px] leading-[1.08] font-medium tracking-[-0.03em] sm:text-[46px]">
          Three steps, zero downloads
        </h2>
      </div>

      <ol class="mt-14 grid gap-4 md:grid-cols-3">
        <li
          v-for="(step, i) in steps"
          :key="step.title"
          class="rounded-[28px] bg-shell-panel p-7"
        >
          <span class="text-[56px] leading-none font-medium tracking-[-0.04em] text-leaf-800/20 dark:text-leaf-400/30">
            0{{ i + 1 }}
          </span>
          <p class="mt-6 text-lg font-medium">
            {{ step.title }}
          </p>
          <p class="mt-2 text-sm leading-relaxed text-shell-muted">
            {{ step.description }}
          </p>
        </li>
      </ol>
    </section>

    <!-- For staff -->
    <section
      id="staff"
      class="mx-auto max-w-6xl scroll-mt-24 px-5 pt-28 sm:px-8 lg:pt-36"
    >
      <div class="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div class="relative order-2 lg:order-1">
          <img
            src="/images/staff-classroom.jpg"
            alt="School staff working together"
            class="aspect-5/4 w-full rounded-[32px] object-cover"
          >
          <div class="absolute -right-2 -bottom-6 flex items-center gap-3 rounded-2xl bg-shell-card p-3 pr-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.35)] sm:-right-8">
            <span class="flex size-10 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
              <UIcon
                name="i-lucide-graduation-cap"
                class="size-5"
              />
            </span>
            <div>
              <p class="text-sm font-medium">
                Results published
              </p>
              <p class="text-xs text-shell-muted">
                Parents notified on WhatsApp
              </p>
            </div>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <p class="text-sm font-medium text-leaf-600 dark:text-leaf-400">
            For School Staff
          </p>
          <h2 class="mt-3 text-[34px] leading-[1.08] font-medium tracking-[-0.03em] sm:text-[46px]">
            One dashboard to manage it all
          </h2>
          <p class="mt-5 max-w-md text-base leading-relaxed text-shell-muted">
            Students, results, fees, announcements and the WhatsApp inbox — in a single, role-aware dashboard.
          </p>

          <ul class="mt-9 space-y-5">
            <li
              v-for="feature in staffFeatures"
              :key="feature.title"
              class="flex gap-4"
            >
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
                <UIcon
                  :name="feature.icon"
                  class="size-4.5"
                />
              </span>
              <div>
                <p class="text-[15px] font-medium">
                  {{ feature.title }}
                </p>
                <p class="mt-1 text-sm leading-relaxed text-shell-muted">
                  {{ feature.description }}
                </p>
              </div>
            </li>
          </ul>

          <NuxtLink
            to="/login"
            class="mt-10 inline-flex items-center gap-2 text-[15px] font-medium text-leaf-800 transition-colors hover:text-leaf-600 dark:text-leaf-400"
          >
            Log in to the dashboard
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- About / CTA -->
    <section
      id="about"
      class="mx-auto max-w-6xl scroll-mt-24 px-5 pt-28 sm:px-8 lg:pt-36"
    >
      <div class="relative overflow-hidden rounded-[32px] bg-[#0C2416] px-6 py-16 text-center text-white sm:rounded-[40px] sm:py-24">
        <SwirlBackdrop
          :cx="50"
          :cy="100"
          :lines="34"
        />
        <div class="relative mx-auto max-w-2xl">
          <h2 class="text-[34px] leading-[1.08] font-medium tracking-[-0.03em] sm:text-[50px]">
            Built for one school, done properly
          </h2>
          <p class="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70">
            This platform is configured specifically for our school — its data, its grading, its WhatsApp number. No juggling multiple schools, no unnecessary complexity.
          </p>

          <ul class="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3">
            <li
              v-for="point in ctaPoints"
              :key="point"
              class="flex items-center gap-2 text-sm text-white/85"
            >
              <UIcon
                name="i-lucide-check"
                class="size-4 text-leaf-400"
              />
              {{ point }}
            </li>
          </ul>

          <div class="mt-10 flex flex-wrap justify-center gap-3">
            <a
              :href="whatsappHref"
              target="_blank"
              rel="noopener"
              class="flex h-13 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-medium text-leaf-900 transition-transform hover:-translate-y-0.5"
              :class="!whatsappHref && 'pointer-events-none opacity-50'"
              :aria-disabled="!whatsappHref"
            >
              <UIcon
                name="i-simple-icons-whatsapp"
                class="size-5 text-[#25D366]"
              />
              Chat on WhatsApp
            </a>
            <NuxtLink
              to="/login"
              class="flex h-13 items-center rounded-full px-7 text-[15px] font-medium text-white ring-1 ring-white/30 transition-colors hover:bg-white/10"
            >
              Staff Login
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
