<script setup lang="ts">
import { canAccessSection } from '~~/shared/access'

// Layout copied from design/references/dashboard.png — see design/DESIGN.md.
definePageMeta({
  middleware: 'auth',
  section: 'dashboard',
  title: 'Dashboard',
  description: 'Track students, fees and parent conversations with ease.',
  hideHeader: true
})

const route = useRoute()
const { user } = useUserSession()
const { data } = await useFetch('/api/dashboard/overview')
const { canManage } = usePermissions()

const can = (section: Parameters<typeof canAccessSection>[1]) =>
  !!user.value && canAccessSection(user.value.role, section)

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const stats = computed(() => {
  const d = data.value
  const fees = d?.fees
  return [
    {
      title: 'Active Students',
      value: String(d?.studentCount ?? 0),
      to: can('students') ? '/dashboard/students' : undefined,
      featured: true,
      delta: String(d?.studentsThisMonth ?? 0),
      caption: 'New this month'
    },
    {
      title: 'Parents',
      value: String(d?.parentCount ?? 0),
      to: can('students') ? '/dashboard/parents' : undefined,
      delta: String(d?.parentsThisMonth ?? 0),
      caption: 'Joined this month'
    },
    {
      title: 'Fees Collected',
      value: fees ? compact.format(fees.collected) : '—',
      to: can('fees') ? '/dashboard/fees' : undefined,
      delta: fees ? String(fees.paymentsThisMonth) : undefined,
      caption: fees ? `${d?.currency} · payments this month` : 'Finance access only'
    },
    {
      title: 'Outstanding',
      value: fees ? compact.format(fees.outstanding) : '—',
      to: can('fees') ? '/dashboard/fees' : undefined,
      caption: fees ? `${d?.currency} · awaiting payment` : 'Finance access only'
    }
  ]
})

const targetLabels: Record<string, string> = { ALL: 'All parents', CLASS: 'Class', STUDENT: 'One student' }

const reminder = computed(() => {
  const draft = data.value?.nextDraft
  if (draft) {
    const target = draft.targetType === 'CLASS' && draft.targetClass ? draft.targetClass : targetLabels[draft.targetType]
    return {
      title: draft.title,
      meta: `Draft · ${target} · ${shortDate.format(new Date(draft.createdAt))}`,
      message: draft.message,
      action: 'Review & Send'
    }
  }
  if (can('announcements')) {
    return { title: 'No drafts waiting to send', meta: 'Write a notice for parents', message: null, action: 'New Announcement' }
  }
  return { title: 'You\'re all caught up', meta: 'Nothing needs your attention', message: null, action: null }
})

const listIcons = [
  { icon: 'i-lucide-megaphone', class: 'text-[#3B5BDB]' },
  { icon: 'i-lucide-graduation-cap', class: 'text-[#0E9F8E]' },
  { icon: 'i-lucide-wallet', class: 'text-[#F59F00]' },
  { icon: 'i-lucide-calendar-days', class: 'text-[#E8590C]' },
  { icon: 'i-lucide-heart-handshake', class: 'text-[#7048E8]' }
]

const announcements = computed(() =>
  (data.value?.announcements ?? []).map((item, i) => ({
    ...item,
    ...listIcons[i % listIcons.length]!,
    meta: item.status === 'PUBLISHED' && item.publishedAt
      ? `Published: ${shortDate.format(new Date(item.publishedAt))}`
      : `${item.status === 'DRAFT' ? 'Draft' : 'Archived'}: ${shortDate.format(new Date(item.createdAt))}`
  }))
)

const roleFocus: Record<string, string> = {
  ADMIN: 'School setup & announcements',
  FINANCE: 'Fees & payment records',
  ACADEMIC: 'Exams & result uploads',
  SUPPORT: 'Parent conversations'
}

const avatarTones = ['bg-[#F8B4B4]', 'bg-[#B9E4A8]', 'bg-[#B9C3F5]', 'bg-[#F7D9A6]']

const staff = computed(() =>
  (data.value?.staff ?? []).map((member, i) => ({
    ...member,
    initials: member.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase(),
    tone: avatarTones[i % avatarTones.length],
    focus: roleFocus[member.role] ?? member.role
  }))
)
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template #actions>
        <NuxtLink
          v-if="canManage('students')"
          to="/dashboard/students?new=1"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          Add Student
        </NuxtLink>
        <NuxtLink
          v-if="canManage('announcements')"
          to="/dashboard/announcements?new=1"
          class="flex h-11 items-center rounded-full border-[1.5px] border-leaf-800 px-5 text-sm font-medium text-leaf-900 transition-colors hover:bg-leaf-50 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
        >
          Send Notice
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStatCard
        v-for="stat in stats"
        :key="stat.title"
        v-bind="stat"
      />
    </div>

    <div class="mt-2.5 grid flex-1 grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
      <div class="flex min-h-72 flex-col rounded-[20px] bg-shell-card p-4 md:col-span-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-base font-medium tracking-[-0.01em]">
            Staff Team
          </p>
          <NuxtLink
            v-if="can('staff')"
            to="/dashboard/staff"
            class="flex h-6.5 items-center gap-1 rounded-full border border-leaf-800 px-2.5 text-[11px] font-medium text-leaf-900 transition-colors hover:bg-leaf-50 dark:border-leaf-400 dark:text-leaf-200 dark:hover:bg-leaf-900/40"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3"
            />
            Add Member
          </NuxtLink>
        </div>

        <ul class="mt-3 flex flex-1 flex-col gap-2">
          <li
            v-for="member in staff"
            :key="member.id"
            class="flex max-h-24 flex-1 items-center gap-3 rounded-[16px] bg-shell-panel px-3 py-2.5"
          >
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
              :class="member.tone"
            >
              {{ member.initials }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] text-shell-ink">
                {{ member.name }}
              </p>
              <p class="truncate text-[10px] text-shell-muted">
                Working on <span class="font-medium text-shell-ink">{{ member.focus }}</span>
              </p>
            </div>
            <span
              class="shrink-0 rounded-[4px] border px-1.5 text-[8px] leading-3.5"
              :class="member.status === 'ACTIVE'
                ? 'border-leaf-600/40 bg-leaf-50 text-leaf-600 dark:bg-leaf-900/40 dark:text-leaf-400'
                : 'border-[#DC2626]/30 bg-[#FEE2E2] text-[#DC2626] dark:bg-[#DC2626]/15'"
            >
              {{ member.status === 'ACTIVE' ? 'Active' : 'Inactive' }}
            </span>
          </li>
        </ul>
      </div>

      <div class="flex min-h-72 flex-col rounded-[20px] bg-shell-card p-4">
        <p class="text-base font-medium tracking-[-0.01em]">
          Reminders
        </p>
        <p class="mt-4 line-clamp-2 text-[19px] leading-[1.15] font-semibold tracking-[-0.01em] text-leaf-800 dark:text-leaf-400">
          {{ reminder.title }}
        </p>
        <p class="mt-1.5 truncate text-[11px] text-shell-muted">
          {{ reminder.meta }}
        </p>
        <div class="my-4 flex flex-1 flex-col justify-center rounded-[18px] bg-shell-panel p-3">
          <template v-if="reminder.message">
            <p class="mb-2 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-shell-muted uppercase">
              <UIcon
                name="i-simple-icons-whatsapp"
                class="size-3 text-[#25D366]"
              />
              Message preview
            </p>
            <p class="line-clamp-6 rounded-xl rounded-tl-none bg-shell-card px-3 py-2 text-[12px] leading-relaxed text-shell-ink shadow-xs">
              {{ reminder.message }}
            </p>
          </template>
          <div
            v-else
            class="flex flex-col items-center gap-2 py-4 text-center"
          >
            <UIcon
              name="i-lucide-calendar-check"
              class="size-7 text-leaf-600 dark:text-leaf-400"
            />
            <p class="text-xs text-shell-muted">
              Drafted announcements show up here, ready to review.
            </p>
          </div>
        </div>
        <NuxtLink
          v-if="reminder.action"
          to="/dashboard/announcements"
          class="bg-leaf-gradient flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <UIcon
            name="i-lucide-send"
            class="size-4.5"
          />
          {{ reminder.action }}
        </NuxtLink>
      </div>

      <div class="flex min-h-72 flex-col rounded-[20px] bg-shell-card p-4">
        <div class="flex items-center justify-between gap-2">
          <p class="text-base font-medium tracking-[-0.01em]">
            Announcements
          </p>
          <NuxtLink
            v-if="can('announcements')"
            to="/dashboard/announcements"
            class="flex h-6.5 items-center gap-1 rounded-full border border-shell-ink/80 px-2.5 text-[11px] font-medium text-shell-ink transition-colors hover:bg-shell-panel"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3"
            />
            New
          </NuxtLink>
        </div>

        <ul
          v-if="announcements.length"
          class="mt-3.5 space-y-3"
        >
          <li
            v-for="item in announcements"
            :key="item.id"
            class="flex items-start gap-2.5"
          >
            <UIcon
              :name="item.icon"
              class="mt-0.5 size-5 shrink-0"
              :class="item.class"
            />
            <div class="min-w-0">
              <p class="truncate text-[13px] text-shell-ink">
                {{ item.title }}
              </p>
              <p class="truncate text-[9px] text-shell-muted">
                {{ item.meta }}
              </p>
            </div>
          </li>
        </ul>
        <p
          v-else
          class="mt-6 text-center text-xs text-shell-muted"
        >
          {{ can('announcements') ? 'No announcements yet.' : 'Announcements are managed by admins.' }}
        </p>
        <NuxtLink
          v-if="announcements.length"
          to="/dashboard/announcements"
          class="mt-auto flex items-center justify-between gap-2 border-t border-shell-line pt-3 text-xs font-medium text-leaf-800 transition-colors hover:text-leaf-600 dark:text-leaf-400"
        >
          View all announcements
          <UIcon
            name="i-lucide-arrow-right"
            class="size-3.5"
          />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
