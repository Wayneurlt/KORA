<script setup lang="ts">
import type { ChipTone } from '~/utils/format'

definePageMeta({
  middleware: 'auth',
  section: 'staff',
  title: 'Staff',
  description: 'Who can sign in to the dashboard, and what each person can do.',
  hideHeader: true
})

const route = useRoute()
const toast = useToast()
const { user: me } = useUserSession()

const { data: staff, refresh } = await useFetch('/api/staff', { default: () => [] })

type Member = (typeof staff.value)[number]
type Role = 'ADMIN' | 'FINANCE' | 'ACADEMIC' | 'SUPPORT'

const ROLES: { value: Role, label: string, access: string }[] = [
  { value: 'ADMIN', label: 'Admin', access: 'Everything, including settings and staff' },
  { value: 'FINANCE', label: 'Finance', access: 'Fees and payments, view students' },
  { value: 'ACADEMIC', label: 'Academic', access: 'Exams and results, view students' },
  { value: 'SUPPORT', label: 'Support', access: 'Parent conversations' }
]
const roleLabel = (role: string) => ROLES.find(item => item.value === role)?.label ?? role
const roleTone = (role: string): ChipTone => ({ ADMIN: 'violet', FINANCE: 'amber', ACADEMIC: 'blue', SUPPORT: 'green' } as Record<string, ChipTone>)[role] ?? 'gray'

const activeCount = computed(() => staff.value.filter(member => member.status === 'ACTIVE').length)

// Add / edit -------------------------------------------------------------
const formOpen = ref(false)
const editing = ref<Member | null>(null)
const form = reactive({ name: '', email: '', role: 'SUPPORT' as Role })
const saving = ref(false)
const formError = ref('')

function addStaff() {
  editing.value = null
  Object.assign(form, { name: '', email: '', role: 'SUPPORT' })
  formError.value = ''
  formOpen.value = true
}

function editStaff(member: Member) {
  editing.value = member
  Object.assign(form, { name: member.name, email: member.email, role: member.role })
  formError.value = ''
  formOpen.value = true
}

// One-time password result screen
const issued = ref<{ name: string, email: string, password: string, reset: boolean } | null>(null)
const issuedOpen = computed({
  get: () => !!issued.value,
  set: (value: boolean) => {
    if (!value) issued.value = null
  }
})

async function saveStaff() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/staff/${editing.value.id}`, { method: 'PATCH', body: { name: form.name, role: form.role } })
      toast.add({ title: 'Staff member updated', color: 'success' })
    } else {
      const result = await $fetch('/api/staff', { method: 'POST', body: form })
      issued.value = { name: result.user.name, email: result.user.email, password: result.tempPassword, reset: false }
    }
    formOpen.value = false
    await refresh()
  } catch (error) {
    formError.value = apiErrorMessage(error)
  } finally {
    saving.value = false
  }
}

// Deactivate / reset -----------------------------------------------------
const confirm = ref<{ member: Member, action: 'deactivate' | 'reactivate' | 'reset' } | null>(null)
const confirmOpen = computed({
  get: () => !!confirm.value,
  set: (value: boolean) => {
    if (!value) confirm.value = null
  }
})
const working = ref(false)
const confirmError = ref('')

const confirmCopy = computed(() => {
  const target = confirm.value
  if (!target) return { title: '', description: '', label: '' }
  const first = target.member.name.split(' ')[0]
  if (target.action === 'deactivate') return { title: `Deactivate ${target.member.name}?`, description: `${first} is signed out straight away and can't sign in again until reactivated.`, label: 'Deactivate' }
  if (target.action === 'reactivate') return { title: `Reactivate ${target.member.name}?`, description: `${first} can sign in again with their existing password.`, label: 'Reactivate' }
  return { title: `Reset ${target.member.name}'s password?`, description: `You'll get a one-time password to give ${first}. They choose a new one when they sign in.`, label: 'Reset password' }
})

async function runConfirmed() {
  const target = confirm.value
  if (!target) return
  working.value = true
  confirmError.value = ''
  try {
    if (target.action === 'reset') {
      const result = await $fetch(`/api/staff/${target.member.id}/reset-password`, { method: 'POST' })
      issued.value = { name: target.member.name, email: target.member.email, password: result.tempPassword, reset: true }
    } else {
      await $fetch(`/api/staff/${target.member.id}`, { method: 'PATCH', body: { status: target.action === 'deactivate' ? 'INACTIVE' : 'ACTIVE' } })
      toast.add({ title: target.action === 'deactivate' ? 'Staff member deactivated' : 'Staff member reactivated', color: 'success' })
    }
    confirm.value = null
    await refresh()
  } catch (error) {
    confirmError.value = apiErrorMessage(error)
  } finally {
    working.value = false
  }
}

const copied = ref(false)
async function copyPassword() {
  if (!issued.value) return
  try {
    await navigator.clipboard.writeText(issued.value.password)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Copy failed — select the password and copy it manually.', color: 'warning' })
  }
}
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
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          @click="addStaff"
        >
          <UIcon
            name="i-lucide-user-plus"
            class="size-4.5"
          />
          Add staff
        </button>
      </template>
    </PageHeader>

    <div class="grid flex-1 grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div class="overflow-hidden rounded-[20px] bg-shell-card xl:self-start">
        <div class="border-b border-shell-line px-4 py-3 text-xs text-shell-muted">
          {{ activeCount }} active · {{ staff.length - activeCount }} inactive
        </div>
        <ul class="divide-y divide-shell-line">
          <li
            v-for="member in staff"
            :key="member.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
            :class="member.status === 'INACTIVE' && 'opacity-60'"
          >
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
              :class="avatarTone(member.name)"
            >{{ initials(member.name) }}</span>
            <div class="min-w-0 flex-1">
              <p class="flex items-center gap-2 truncate text-sm font-medium">
                {{ member.name }}
                <span
                  v-if="member.id === me?.id"
                  class="text-xs font-normal text-shell-muted"
                >(you)</span>
              </p>
              <p class="truncate text-xs text-shell-muted">
                {{ member.email }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <DataChip
                :tone="roleTone(member.role)"
                :label="roleLabel(member.role)"
              />
              <DataChip
                v-if="member.status === 'INACTIVE'"
                status="INACTIVE"
              />
              <DataChip
                v-else-if="member.mustChangePassword"
                tone="amber"
                label="Awaiting first sign-in"
              />
              <span
                v-if="member.openConversations"
                class="rounded-full bg-shell-panel px-2 py-0.5 text-[11px] text-shell-muted"
              >{{ member.openConversations }} open chats</span>
            </div>
            <div class="flex gap-1">
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-panel hover:text-leaf-800"
                :aria-label="`Edit ${member.name}`"
                title="Edit"
                @click="editStaff(member)"
              >
                <UIcon
                  name="i-lucide-pencil"
                  class="size-4"
                />
              </button>
              <button
                v-if="member.id !== me?.id && member.status === 'ACTIVE'"
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-panel hover:text-leaf-800"
                :aria-label="`Reset password for ${member.name}`"
                title="Reset password"
                @click="confirm = { member, action: 'reset' }"
              >
                <UIcon
                  name="i-lucide-key-round"
                  class="size-4"
                />
              </button>
              <button
                v-if="member.id !== me?.id"
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-shell-muted transition-colors hover:bg-shell-panel"
                :class="member.status === 'ACTIVE' ? 'hover:text-[#B91C1C]' : 'hover:text-leaf-800'"
                :aria-label="`${member.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} ${member.name}`"
                :title="member.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'"
                @click="confirm = { member, action: member.status === 'ACTIVE' ? 'deactivate' : 'reactivate' }"
              >
                <UIcon
                  :name="member.status === 'ACTIVE' ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                  class="size-4"
                />
              </button>
            </div>
          </li>
        </ul>
      </div>

      <aside class="rounded-[20px] bg-shell-card p-4 xl:self-start">
        <p class="text-base font-medium tracking-[-0.01em]">
          Roles
        </p>
        <ul class="mt-3 space-y-3">
          <li
            v-for="role in ROLES"
            :key="role.value"
            class="flex items-start gap-2.5"
          >
            <DataChip
              :tone="roleTone(role.value)"
              :label="role.label"
              class="mt-0.5"
            />
            <span class="text-xs leading-relaxed text-shell-muted">{{ role.access }}</span>
          </li>
        </ul>
      </aside>
    </div>

    <FormModal
      v-model:open="formOpen"
      :title="editing ? 'Edit staff member' : 'Add staff member'"
      :description="editing ? undefined : 'They get a one-time password to sign in with.'"
      :submit-label="editing ? 'Save changes' : 'Add staff'"
      :loading="saving"
      :error="formError"
      @submit="saveStaff"
    >
      <FormField
        label="Full name"
        for="staff-name"
        required
      >
        <UInput
          id="staff-name"
          v-model="form.name"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField
        v-if="!editing"
        label="Email"
        for="staff-email"
        hint="Used to sign in."
        required
      >
        <UInput
          id="staff-email"
          v-model="form.email"
          type="email"
          variant="none"
          :ui="pillInputOnCardUi"
        />
      </FormField>
      <FormField label="Role">
        <div class="grid gap-2 sm:grid-cols-2">
          <label
            v-for="role in ROLES"
            :key="role.value"
            class="flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 ring-1 transition-colors"
            :class="form.role === role.value ? 'bg-leaf-50 ring-leaf-600 dark:bg-leaf-900/40' : 'bg-shell-panel ring-transparent'"
          >
            <input
              v-model="form.role"
              type="radio"
              name="staff-role"
              :value="role.value"
              class="mt-0.5 accent-[#14532D]"
            >
            <span>
              <span class="block text-sm font-medium">{{ role.label }}</span>
              <span class="block text-[11px] leading-snug text-shell-muted">{{ role.access }}</span>
            </span>
          </label>
        </div>
      </FormField>
    </FormModal>

    <FormModal
      v-model:open="confirmOpen"
      :title="confirmCopy.title"
      :description="confirmCopy.description"
      :submit-label="confirmCopy.label"
      :danger="confirm?.action === 'deactivate'"
      :loading="working"
      :error="confirmError"
      @submit="runConfirmed"
    />

    <FormModal
      v-model:open="issuedOpen"
      :title="issued?.reset ? 'Password reset' : 'Staff member added'"
      hide-footer
    >
      <template v-if="issued">
        <p class="text-sm text-shell-muted">
          Give <strong class="text-shell-ink">{{ issued.name }}</strong> this one-time password. They'll choose their own when they sign in at <strong class="text-shell-ink">{{ issued.email }}</strong>.
        </p>
        <div class="flex items-center gap-2 rounded-2xl bg-shell-panel p-2 pl-4">
          <code class="flex-1 font-mono text-lg tracking-wider select-all">{{ issued.password }}</code>
          <button
            type="button"
            class="flex h-10 items-center gap-1.5 rounded-full bg-shell-card px-4 text-sm font-medium transition-colors hover:text-leaf-800"
            @click="copyPassword"
          >
            <UIcon
              :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              class="size-4"
            />
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p class="flex items-start gap-2 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-[13px] text-[#92400E] dark:bg-[#B45309]/15 dark:text-[#FCD34D]">
          <UIcon
            name="i-lucide-eye-off"
            class="mt-0.5 size-4 shrink-0"
          />
          This is the only time it's shown. If it's lost, reset the password again.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end border-t border-shell-line px-5 py-4">
          <button
            type="button"
            class="bg-leaf-gradient h-11 rounded-full px-6 text-sm font-medium text-white"
            @click="issued = null"
          >
            Done
          </button>
        </div>
      </template>
    </FormModal>
  </div>
</template>
