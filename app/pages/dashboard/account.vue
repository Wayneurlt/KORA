<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  title: 'My account',
  description: 'Your sign-in details and password.',
  hideHeader: true
})

const route = useRoute()
const { user, fetch: refreshSession } = useUserSession()
const toast = useToast()

const roleLabels: Record<string, string> = { ADMIN: 'Admin', FINANCE: 'Finance', ACADEMIC: 'Academic', SUPPORT: 'Support' }
const required = computed(() => !!user.value?.mustChangePassword)

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const show = ref(false)
const saving = ref(false)
const error = ref('')

const checks = computed(() => [
  { label: 'At least 8 characters', ok: form.newPassword.length >= 8 },
  { label: 'Letters and at least one number', ok: /[a-z]/i.test(form.newPassword) && /\d/.test(form.newPassword) },
  { label: 'Both new passwords match', ok: !!form.newPassword && form.newPassword === form.confirmPassword }
])

async function changePassword() {
  error.value = ''
  if (!checks.value.every(check => check.ok)) {
    error.value = 'Check the password requirements below.'
    return
  }
  const wasRequired = required.value
  saving.value = true
  try {
    await $fetch('/api/account/password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } })
    await refreshSession()
    Object.assign(form, { currentPassword: '', newPassword: '', confirmPassword: '' })
    toast.add({ title: 'Password changed', color: 'success' })
    if (wasRequired) await navigateTo('/dashboard')
  } catch (err) {
    error.value = apiErrorMessage(err, 'Could not change your password.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    />

    <p
      v-if="required"
      class="mb-2.5 flex items-start gap-3 rounded-[20px] bg-[#FEF3C7] p-4 text-sm text-[#92400E] dark:bg-[#B45309]/15 dark:text-[#FCD34D]"
    >
      <UIcon
        name="i-lucide-key-round"
        class="mt-0.5 size-5 shrink-0"
      />
      <span>
        <strong class="block">Choose your own password to continue</strong>
        You signed in with a one-time password. Pick a new one below — you'll be taken to the dashboard afterwards.
      </span>
    </p>

    <div class="grid gap-2.5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section
        v-if="user"
        class="rounded-[20px] bg-shell-card p-5 lg:self-start"
      >
        <div
          class="flex size-16 items-center justify-center rounded-full bg-[#F4B9A8] text-lg font-semibold text-[#7A2E1B]"
        >
          {{ initials(user.name) }}
        </div>
        <p class="mt-4 text-lg font-medium tracking-[-0.01em]">
          {{ user.name }}
        </p>
        <p class="text-sm text-shell-muted">
          {{ user.email }}
        </p>
        <DataChip
          tone="green"
          :label="roleLabels[user.role] ?? user.role"
          class="mt-3"
        />
        <p class="mt-4 text-xs leading-relaxed text-shell-muted">
          To change your name, email or role, ask a school admin.
        </p>
      </section>

      <form
        class="rounded-[20px] bg-shell-card p-5"
        novalidate
        @submit.prevent="changePassword"
      >
        <p class="text-base font-medium tracking-[-0.01em]">
          Change password
        </p>
        <div class="mt-4 max-w-md space-y-4">
          <FormField
            :label="required ? 'One-time password' : 'Current password'"
            for="current-password"
            required
          >
            <UInput
              id="current-password"
              v-model="form.currentPassword"
              :type="show ? 'text' : 'password'"
              autocomplete="current-password"
              variant="none"
              :ui="pillInputOnCardUi"
            />
          </FormField>
          <FormField
            label="New password"
            for="new-password"
            required
          >
            <UInput
              id="new-password"
              v-model="form.newPassword"
              :type="show ? 'text' : 'password'"
              autocomplete="new-password"
              variant="none"
              :ui="pillInputOnCardUi"
            />
          </FormField>
          <FormField
            label="Confirm new password"
            for="confirm-password"
            required
          >
            <UInput
              id="confirm-password"
              v-model="form.confirmPassword"
              :type="show ? 'text' : 'password'"
              autocomplete="new-password"
              variant="none"
              :ui="pillInputOnCardUi"
            />
          </FormField>

          <ul class="space-y-1.5">
            <li
              v-for="check in checks"
              :key="check.label"
              class="flex items-center gap-2 text-xs"
              :class="check.ok ? 'text-leaf-700 dark:text-leaf-400' : 'text-shell-muted'"
            >
              <UIcon
                :name="check.ok ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                class="size-4"
              />
              {{ check.label }}
            </li>
          </ul>

          <label class="flex cursor-pointer items-center gap-2 text-xs text-shell-muted">
            <input
              v-model="show"
              type="checkbox"
              class="accent-[#14532D]"
            >
            Show passwords
          </label>

          <p
            v-if="error"
            class="flex items-start gap-2 rounded-2xl border border-[#DC2626]/25 bg-[#FEE2E2] px-4 py-3 text-[13px] text-[#B91C1C] dark:bg-[#DC2626]/15 dark:text-[#FCA5A5]"
            role="alert"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="mt-0.5 size-4 shrink-0"
            />
            {{ error }}
          </p>

          <button
            type="submit"
            class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            :disabled="saving"
          >
            <UIcon
              v-if="saving"
              name="i-lucide-loader-circle"
              class="size-4.5 animate-spin"
            />
            Change password
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
