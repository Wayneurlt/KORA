<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'conversations',
  title: 'Conversations',
  description: 'The shared WhatsApp inbox for every parent conversation.',
  hideHeader: true
})

const route = useRoute()
const router = useRouter()

const search = ref('')
const status = ref<'ACTIVE' | 'RESOLVED' | 'CLOSED' | 'ALL'>('ACTIVE')
const category = ref('ALL')

const { data, status: listStatus } = await useFetch('/api/conversations', {
  query: { search, status, category }
})

const statusOptions = computed(() => {
  const counts = data.value?.counts
  return [
    { value: 'ACTIVE' as const, label: 'Active', count: counts?.ACTIVE },
    { value: 'RESOLVED' as const, label: 'Resolved', count: counts?.RESOLVED ?? 0 },
    { value: 'CLOSED' as const, label: 'Closed', count: counts?.CLOSED ?? 0 },
    { value: 'ALL' as const, label: 'All' }
  ]
})

const categoryOptions = [
  { value: 'ALL', label: 'All topics' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'GENERAL', label: 'General' },
  { value: 'TALK_TO_SCHOOL', label: 'Talk to school' }
]

const categoryIcon: Record<string, string> = {
  FINANCE: 'i-lucide-wallet',
  ACADEMIC: 'i-lucide-graduation-cap',
  GENERAL: 'i-lucide-message-circle',
  TALK_TO_SCHOOL: 'i-lucide-school'
}

// Selected conversation lives in the URL (?c=id) so it survives reloads and can be shared.
const selectedId = computed(() => (typeof route.query.c === 'string' ? route.query.c : null))
function select(id: string | null) {
  router.replace({ query: { ...route.query, c: id ?? undefined } })
}

// On wide screens, open the newest conversation by default.
onMounted(() => {
  if (!selectedId.value && data.value?.items[0] && window.matchMedia('(min-width: 1024px)').matches) {
    select(data.value.items[0].id)
  }
})

type Detail = Awaited<ReturnType<typeof loadConversation>>
function loadConversation(id: string) {
  return $fetch(`/api/conversations/${id}`)
}

const detail = ref<Detail | null>(null)
const detailLoading = ref(false)
const thread = ref<HTMLElement | null>(null)

watch(selectedId, async (id) => {
  if (!id) {
    detail.value = null
    return
  }
  detailLoading.value = true
  try {
    detail.value = await loadConversation(id)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
  await nextTick()
  thread.value?.scrollTo({ top: thread.value.scrollHeight })
}, { immediate: true })

// Group messages under day separators.
const days = computed(() => {
  const groups: { label: string, messages: Detail['messages'] }[] = []
  for (const message of detail.value?.messages ?? []) {
    const label = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(message.createdAt))
    const last = groups[groups.length - 1]
    if (last?.label === label) last.messages.push(message)
    else groups.push({ label, messages: [message] })
  }
  return groups
})
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    />

    <div class="grid min-h-[560px] flex-1 grid-cols-1 gap-2.5 lg:grid-cols-[384px_minmax(0,1fr)]">
      <!-- List -->
      <section
        class="flex min-h-0 flex-col overflow-hidden rounded-[20px] bg-shell-card"
        :class="selectedId && 'hidden lg:flex'"
      >
        <div class="space-y-2.5 border-b border-shell-line p-3">
          <div class="flex gap-2">
            <DataSearchField
              v-model="search"
              placeholder="Search parent or message"
              on-card
            />
          </div>
          <div class="flex items-center gap-2">
            <DataFilterPills
              v-model="status"
              label="Status"
              :options="statusOptions"
              on-card
              class="min-w-0 flex-1"
            />
          </div>
          <DataSelect
            v-model="category"
            label="Topic"
            icon="i-lucide-tag"
            :options="categoryOptions"
            on-card
          />
        </div>

        <ul
          class="flex-1 overflow-y-auto p-1.5 transition-opacity"
          :class="listStatus === 'pending' && 'opacity-60'"
        >
          <li
            v-for="item in data?.items"
            :key="item.id"
          >
            <button
              type="button"
              class="flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition-colors"
              :class="selectedId === item.id ? 'bg-leaf-50 dark:bg-leaf-900/40' : 'hover:bg-shell-panel'"
              @click="select(item.id)"
            >
              <span class="relative shrink-0">
                <span
                  class="flex size-11 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
                  :class="avatarTone(item.parent.name)"
                >{{ initials(item.parent.name) }}</span>
                <span
                  v-if="item.awaitingReply"
                  class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-[#25D366] ring-2 ring-shell-card"
                  title="Waiting for a reply"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline justify-between gap-2">
                  <span
                    class="truncate text-sm"
                    :class="item.awaitingReply ? 'font-semibold' : 'font-medium'"
                  >{{ item.parent.name }}</span>
                  <span
                    class="shrink-0 text-[11px]"
                    :class="item.awaitingReply ? 'font-medium text-[#128C4B] dark:text-[#25D366]' : 'text-shell-muted'"
                  >{{ formatRelative(item.updatedAt) }}</span>
                </span>
                <span
                  class="mt-0.5 line-clamp-1 text-[13px]"
                  :class="item.awaitingReply ? 'text-shell-ink' : 'text-shell-muted'"
                >
                  <span v-if="item.lastMessage?.direction === 'OUTBOUND'">You: </span>{{ item.lastMessage?.content ?? 'No messages yet' }}
                </span>
                <span class="mt-1.5 flex items-center gap-1.5">
                  <span class="flex items-center gap-1 rounded-full bg-shell-panel px-2 py-0.5 text-[10px] text-shell-muted">
                    <UIcon
                      :name="categoryIcon[item.category] ?? 'i-lucide-message-circle'"
                      class="size-3"
                    />
                    {{ statusLabel(item.category) }}
                  </span>
                  <DataChip
                    :status="item.status"
                    class="text-[10px]"
                  />
                </span>
              </span>
            </button>
          </li>
        </ul>

        <div
          v-if="data && !data.items.length"
          class="flex flex-1 flex-col items-center justify-center p-8 text-center"
        >
          <UIcon
            name="i-lucide-inbox"
            class="size-8 text-shell-muted"
          />
          <p class="mt-3 text-sm font-medium">
            No conversations here
          </p>
          <p class="mt-1 text-xs text-shell-muted">
            Try another status, topic or search.
          </p>
        </div>
      </section>

      <!-- Thread -->
      <section
        class="flex min-h-0 flex-col overflow-hidden rounded-[20px] bg-shell-card"
        :class="!selectedId && 'hidden lg:flex'"
      >
        <template v-if="detail">
          <header class="flex items-center gap-3 border-b border-shell-line p-3 sm:p-4">
            <button
              type="button"
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-shell-panel lg:hidden"
              aria-label="Back to conversations"
              @click="select(null)"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-5"
              />
            </button>
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[#1F2933]/80"
              :class="avatarTone(detail.parent.name)"
            >{{ initials(detail.parent.name) }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[15px] font-medium">
                {{ detail.parent.name }}
              </p>
              <p class="flex flex-wrap items-center gap-x-2 text-xs text-shell-muted">
                <a
                  :href="waLink(detail.parent.whatsappNumber)"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 text-leaf-700 hover:underline dark:text-leaf-400"
                >
                  <UIcon
                    name="i-simple-icons-whatsapp"
                    class="size-3"
                  />+{{ detail.parent.whatsappNumber }}
                </a>
                <span v-if="detail.parent.children.length">· Parent of {{ detail.parent.children.map(child => `${child.name} (${child.className})`).join(', ') }}</span>
              </p>
            </div>
            <div class="hidden shrink-0 flex-col items-end gap-1 sm:flex">
              <DataChip :status="detail.status" />
              <span class="text-[11px] text-shell-muted">{{ detail.assignedTo ? `Assigned to ${detail.assignedTo}` : 'Unassigned' }}</span>
            </div>
          </header>

          <div
            ref="thread"
            class="flex-1 space-y-4 overflow-y-auto bg-[#EFEAE2] p-4 sm:p-5 dark:bg-[#0E1512]"
          >
            <div
              v-for="day in days"
              :key="day.label"
              class="space-y-2"
            >
              <p class="mx-auto w-fit rounded-full bg-white/80 px-3 py-1 text-[11px] text-[#54656F] shadow-xs dark:bg-white/10 dark:text-white/60">
                {{ day.label }}
              </p>
              <div
                v-for="message in day.messages"
                :key="message.id"
                class="flex"
                :class="message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[78%] rounded-xl px-3 py-2 text-[13.5px] leading-relaxed text-[#111B21] shadow-xs sm:max-w-[65%]"
                  :class="message.direction === 'OUTBOUND' ? 'rounded-tr-none bg-[#D9FDD3] dark:bg-[#005C4B] dark:text-white' : 'rounded-tl-none bg-white dark:bg-[#202C33] dark:text-white'"
                >
                  <p
                    v-if="message.direction === 'OUTBOUND' && message.staff"
                    class="mb-0.5 text-[11px] font-semibold text-[#128C4B] dark:text-[#7AE3B0]"
                  >
                    {{ message.staff }}
                  </p>
                  <p class="whitespace-pre-line">
                    {{ message.content }}
                  </p>
                  <p class="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-black/45 dark:text-white/50">
                    {{ formatTime(message.createdAt) }}
                    <UIcon
                      v-if="message.direction === 'OUTBOUND'"
                      :name="message.deliveryStatus === 'SENT' || message.deliveryStatus === 'QUEUED' ? 'i-lucide-check' : 'i-lucide-check-check'"
                      class="size-3.5"
                      :class="message.deliveryStatus === 'READ' && 'text-[#53BDEB]'"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <footer class="flex items-center gap-2.5 border-t border-shell-line p-3">
            <div class="flex h-11 flex-1 items-center rounded-full bg-shell-panel px-4 text-sm text-shell-muted">
              Replying from the dashboard arrives with the WhatsApp connection
            </div>
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-full bg-leaf-800/40 text-white"
              aria-hidden="true"
            >
              <UIcon
                name="i-lucide-send"
                class="size-4.5"
              />
            </span>
          </footer>
        </template>

        <div
          v-else-if="detailLoading"
          class="flex flex-1 items-center justify-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-shell-muted"
          />
        </div>

        <div
          v-else
          class="flex flex-1 flex-col items-center justify-center p-8 text-center"
        >
          <span class="flex size-14 items-center justify-center rounded-full bg-leaf-50 text-leaf-800 dark:bg-leaf-900/50 dark:text-leaf-400">
            <UIcon
              name="i-lucide-messages-square"
              class="size-6"
            />
          </span>
          <p class="mt-4 font-medium">
            Pick a conversation
          </p>
          <p class="mt-1 max-w-xs text-sm text-shell-muted">
            Choose a parent on the left to read the full WhatsApp thread.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
