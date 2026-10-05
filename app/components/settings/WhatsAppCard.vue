<script setup lang="ts">
// WhatsApp connection status + a simulator for trying the parent bot without a phone.
const { data: status } = await useFetch('/api/whatsapp/status', { lazy: true })
const toast = useToast()

const from = ref('')
const text = ref('')
const sending = ref(false)
const transcript = ref<{ id: string, direction: 'in' | 'out', content: string }[]>([])
const scroller = ref<HTMLElement | null>(null)
let counter = 0

async function send(message = text.value) {
  const content = message.trim()
  if (!content || !from.value.trim() || sending.value) return
  transcript.value.push({ id: `local-${counter++}`, direction: 'in', content })
  text.value = ''
  sending.value = true
  try {
    const result = await $fetch('/api/whatsapp/simulate', { method: 'POST', body: { from: from.value, text: content } })
    if (!result.registered) {
      transcript.value.push({ id: `local-${counter++}`, direction: 'out', content: 'This number isn\'t registered as a parent, so the bot only replies with "contact the school office".' })
    } else if (!result.replies.length) {
      transcript.value.push({ id: `local-${counter++}`, direction: 'out', content: '(No automatic reply — a member of staff is handling this conversation. Check the Conversations inbox.)' })
    }
    for (const reply of result.replies) transcript.value.push({ id: reply.id, direction: 'out', content: reply.content })
  } catch (error) {
    toast.add({ title: apiErrorMessage(error), color: 'error' })
  } finally {
    sending.value = false
    await nextTick()
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })
  }
}

// WhatsApp's *bold* → <strong>, escaping everything else.
function formatWhatsApp(value: string) {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
}

const copied = ref(false)
async function copyWebhook() {
  if (!status.value) return
  await navigator.clipboard.writeText(status.value.webhookUrl).catch(() => {})
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <section class="grid gap-2.5 lg:grid-cols-2">
    <div class="rounded-[20px] bg-shell-card p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="flex items-center gap-2 text-base font-medium tracking-[-0.01em]">
            <UIcon
              name="i-simple-icons-whatsapp"
              class="size-4.5 text-[#25D366]"
            />
            WhatsApp connection
          </p>
          <p class="mt-1 text-xs leading-relaxed text-shell-muted">
            Sent through SendPulse. Keys are set in the server's environment variables — see the README.
          </p>
        </div>
        <DataChip
          v-if="status"
          :tone="status.live ? 'green' : 'amber'"
          :label="status.live ? 'Live' : 'Test mode'"
        />
      </div>

      <p
        v-if="status && !status.live"
        class="mt-4 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-[13px] text-[#92400E] dark:bg-[#B45309]/15 dark:text-[#FCD34D]"
      >
        No SendPulse keys yet, so messages are logged on the server instead of being sent. Everything else — the bot, announcements, inbox replies — works normally for testing.
      </p>

      <p
        v-if="status && !status.webhookSecretSet"
        class="mt-3 rounded-2xl bg-shell-panel px-4 py-3 text-[13px] text-shell-muted"
      >
        Set <code>SENDPULSE_WEBHOOK_SECRET</code> before connecting SendPulse — it's added to the webhook URL so only SendPulse can post messages to Kora.
      </p>

      <dl
        v-if="status"
        class="mt-4 divide-y divide-shell-line text-sm"
      >
        <div class="flex items-center justify-between gap-3 py-2.5">
          <dt class="shrink-0 text-shell-muted">
            Webhook URL
          </dt>
          <dd class="flex min-w-0 items-center gap-1.5">
            <code class="truncate text-xs">{{ status.webhookUrl }}</code>
            <button
              type="button"
              class="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-shell-panel"
              aria-label="Copy webhook URL"
              @click="copyWebhook"
            >
              <UIcon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="size-3.5"
              />
            </button>
          </dd>
        </div>
        <div
          v-for="row in [
            { label: 'API credentials', ok: status.apiKeySet || (status.clientIdSet && status.clientSecretSet), value: status.apiKeySet ? 'API key' : status.clientIdSet && status.clientSecretSet ? 'Client ID + secret' : 'Not set' },
            { label: 'WhatsApp bot ID', ok: !!status.botId, value: status.botId ?? 'Not set' },
            { label: 'Webhook secret', ok: status.webhookSecretSet, value: status.webhookSecretSet ? 'Set' : 'Not set' },
            { label: 'Announcement template', ok: !!status.announcementTemplate, value: status.announcementTemplate ? `${status.announcementTemplate} (${status.templateLanguage})` : 'Not set — sends plain text' }
          ]"
          :key="row.label"
          class="flex items-center justify-between gap-3 py-2.5"
        >
          <dt class="text-shell-muted">
            {{ row.label }}
          </dt>
          <dd class="flex items-center gap-1.5 text-right text-xs">
            <UIcon
              :name="row.ok ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'"
              class="size-4 shrink-0"
              :class="row.ok ? 'text-leaf-600 dark:text-leaf-400' : 'text-shell-muted'"
            />
            {{ row.value }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="flex flex-col overflow-hidden rounded-[20px] bg-shell-card">
      <div class="p-5 pb-3">
        <p class="text-base font-medium tracking-[-0.01em]">
          Try the parent bot
        </p>
        <p class="mt-1 text-xs leading-relaxed text-shell-muted">
          Send a message as if from a parent's phone. Replies are real — they're stored in that parent's conversation.
        </p>
        <div
          v-if="status?.simulatorEnabled === false"
          class="mt-3 rounded-2xl bg-shell-panel px-4 py-3 text-[13px] text-shell-muted"
        >
          The simulator is switched off while WhatsApp is live in production.
        </div>
        <FormField
          v-else
          label="Parent's WhatsApp number"
          for="sim-from"
          hint="Try a seeded parent, e.g. 0700 000 004"
          class="mt-3"
        >
          <UInput
            id="sim-from"
            v-model="from"
            type="tel"
            placeholder="0700 000 004"
            variant="none"
            :ui="pillInputOnCardUi"
          />
        </FormField>
      </div>

      <div
        ref="scroller"
        class="mx-3 flex-1 space-y-2 overflow-y-auto rounded-2xl bg-[#EFEAE2] p-3 dark:bg-[#0E1512]"
        style="min-height: 220px; max-height: 360px"
      >
        <p
          v-if="!transcript.length"
          class="py-10 text-center text-xs text-[#667781] dark:text-white/50"
        >
          Messages appear here. Start with "hi".
        </p>
        <div
          v-for="message in transcript"
          :key="message.id"
          class="flex"
          :class="message.direction === 'in' ? 'justify-end' : 'justify-start'"
        >
          <!-- eslint-disable vue/no-v-html -- content is HTML-escaped by formatWhatsApp -->
          <p
            class="max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-line text-[#111B21] shadow-xs dark:text-white"
            :class="message.direction === 'in' ? 'rounded-tr-none bg-[#D9FDD3] dark:bg-[#005C4B]' : 'rounded-tl-none bg-white dark:bg-[#202C33]'"
            v-html="formatWhatsApp(message.content)"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </div>

      <form
        class="flex flex-wrap items-center gap-2 p-3"
        @submit.prevent="send()"
      >
        <div class="flex w-full gap-1.5">
          <button
            v-for="quick in ['hi', '1', '2', '3', '5']"
            :key="quick"
            type="button"
            class="h-7 rounded-full bg-shell-panel px-3 text-xs transition-colors hover:text-leaf-800 disabled:opacity-50"
            :disabled="!from || sending"
            @click="send(quick)"
          >
            {{ quick }}
          </button>
        </div>
        <input
          v-model="text"
          type="text"
          placeholder="Type a message…"
          class="h-11 min-w-0 flex-1 rounded-full bg-shell-panel px-4 text-sm outline-none placeholder:text-shell-muted focus:ring-2 focus:ring-leaf-600"
          :disabled="status?.simulatorEnabled === false"
        >
        <button
          type="submit"
          class="flex size-11 shrink-0 items-center justify-center rounded-full bg-leaf-800 text-white disabled:opacity-40 dark:bg-leaf-600"
          :disabled="!text.trim() || !from.trim() || sending"
          aria-label="Send test message"
        >
          <UIcon
            :name="sending ? 'i-lucide-loader-circle' : 'i-lucide-send'"
            class="size-4.5"
            :class="sending && 'animate-spin'"
          />
        </button>
      </form>
    </div>
  </section>
</template>
