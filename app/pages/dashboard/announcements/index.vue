<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'announcements',
  title: 'Announcements',
  description: 'Reach the whole school, a single class, or one family.',
  hideHeader: true
})

const route = useRoute()
const router = useRouter()
const { canManage } = usePermissions()
const toast = useToast()

const search = ref('')
const status = ref<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL')

const { data, status: fetchStatus, refresh } = await useFetch('/api/announcements', {
  query: { search, status }
})

const statusOptions = computed(() => {
  const counts = data.value?.counts ?? {}
  return [
    { value: 'ALL' as const, label: 'All', count: (counts.PUBLISHED ?? 0) + (counts.DRAFT ?? 0) + (counts.ARCHIVED ?? 0) },
    { value: 'PUBLISHED' as const, label: 'Published', count: counts.PUBLISHED ?? 0 },
    { value: 'DRAFT' as const, label: 'Drafts', count: counts.DRAFT ?? 0 },
    { value: 'ARCHIVED' as const, label: 'Archived', count: counts.ARCHIVED ?? 0 }
  ]
})

const targetIcon: Record<string, string> = {
  ALL: 'i-lucide-users',
  CLASS: 'i-lucide-school',
  STUDENT: 'i-lucide-user'
}

type Announcement = NonNullable<typeof data.value>['items'][number]
const selected = ref<Announcement | null>(null)
const panelOpen = ref(false)
function openAnnouncement(item: Announcement) {
  selected.value = item
  panelOpen.value = true
}

// Keep the open panel in sync after a refresh.
watch(data, (value) => {
  if (selected.value) selected.value = value?.items.find(item => item.id === selected.value!.id) ?? null
  if (!selected.value) panelOpen.value = false
})

// Actions ----------------------------------------------------------------
const formOpen = ref(false)
const editing = ref<Announcement | null>(null)
const confirm = ref<'publish' | 'delete' | 'archive' | null>(null)
const working = ref(false)
const actionError = ref('')

const confirmOpen = computed({
  get: () => !!confirm.value,
  set: (value: boolean) => {
    if (!value) confirm.value = null
  }
})

function newAnnouncement() {
  editing.value = null
  formOpen.value = true
}

function editDraft() {
  editing.value = selected.value
  formOpen.value = true
}

async function onSaved(id: string) {
  await refresh()
  const item = data.value?.items.find(entry => entry.id === id)
  if (item) openAnnouncement(item)
}

async function runConfirmed() {
  if (!selected.value || !confirm.value) return
  working.value = true
  actionError.value = ''
  const id = selected.value.id
  try {
    if (confirm.value === 'publish') {
      const result = await $fetch(`/api/announcements/${id}/publish`, { method: 'POST' })
      toast.add({
        title: `Sent to ${result.sent} of ${result.audience} parents`,
        description: result.simulated ? 'WhatsApp is in test mode — nothing left the server.' : result.failed ? `${result.failed} failed — you can retry from the announcement.` : undefined,
        color: result.failed ? 'warning' : 'success'
      })
    } else if (confirm.value === 'delete') {
      await $fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Draft deleted', color: 'success' })
      panelOpen.value = false
    } else {
      await $fetch(`/api/announcements/${id}/archive`, { method: 'POST' })
      toast.add({ title: 'Announcement archived', color: 'success' })
    }
    confirm.value = null
    await refresh()
  } catch (error) {
    actionError.value = apiErrorMessage(error)
  } finally {
    working.value = false
  }
}

async function resendFailed() {
  if (!selected.value) return
  working.value = true
  try {
    const result = await $fetch(`/api/announcements/${selected.value.id}/resend`, { method: 'POST' })
    toast.add({ title: `Retried ${result.audience}: ${result.sent} sent, ${result.failed} failed`, color: result.failed ? 'warning' : 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: apiErrorMessage(error), color: 'error' })
  } finally {
    working.value = false
  }
}

const confirmCopy = computed(() => {
  const item = selected.value
  if (!item) return { title: '', description: '', label: '' }
  if (confirm.value === 'publish') {
    return { title: `Send to ${item.reach} ${item.reach === 1 ? 'parent' : 'parents'}?`, description: `"${item.title}" goes out on WhatsApp to ${item.targetLabel.toLowerCase() === 'all parents' ? 'every parent' : `parents in ${item.targetLabel}`}. Sent messages can't be edited.`, label: 'Publish & send' }
  }
  if (confirm.value === 'delete') return { title: 'Delete this draft?', description: 'This can\'t be undone.', label: 'Delete draft' }
  return { title: 'Archive this announcement?', description: 'It stays on record but parents will no longer see it under "latest announcements".', label: 'Archive' }
})

// The dashboard's "Send Notice" button links here with ?new=1.
onMounted(() => {
  if (route.query.new && canManage('announcements')) {
    newAnnouncement()
    router.replace({ query: { ...route.query, new: undefined } })
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    >
      <template
        v-if="canManage('announcements')"
        #actions
      >
        <button
          type="button"
          class="bg-leaf-gradient flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          @click="newAnnouncement"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4.5"
          />
          New announcement
        </button>
      </template>
    </PageHeader>

    <div class="mb-2.5 flex flex-wrap items-center gap-2.5">
      <DataSearchField
        v-model="search"
        placeholder="Search title, message or class"
      />
      <DataFilterPills
        v-model="status"
        label="Status"
        :options="statusOptions"
        class="sm:ml-auto"
      />
    </div>

    <div
      v-if="data?.items.length"
      class="grid grid-cols-1 gap-2.5 transition-opacity md:grid-cols-2 2xl:grid-cols-3"
      :class="fetchStatus === 'pending' && 'opacity-60'"
    >
      <button
        v-for="item in data.items"
        :key="item.id"
        type="button"
        class="group flex flex-col rounded-[20px] bg-shell-card p-4 text-left transition-shadow hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)]"
        @click="openAnnouncement(item)"
      >
        <div class="flex items-center justify-between gap-2">
          <DataChip :status="item.status" />
          <span class="text-[11px] text-shell-muted">
            {{ item.status === 'PUBLISHED' || item.status === 'ARCHIVED' ? `Sent ${formatDate(item.publishedAt)}` : `Drafted ${formatDate(item.createdAt)}` }}
          </span>
        </div>
        <p class="mt-4 text-[17px] leading-snug font-medium tracking-[-0.01em]">
          {{ item.title }}
        </p>
        <p class="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-shell-muted">
          {{ item.message }}
        </p>
        <div class="mt-auto flex items-center justify-between gap-2 pt-4">
          <span class="flex min-w-0 items-center gap-1.5 rounded-full bg-shell-panel px-2.5 py-1 text-xs">
            <UIcon
              :name="targetIcon[item.targetType] ?? 'i-lucide-users'"
              class="size-3.5 shrink-0 text-leaf-700 dark:text-leaf-400"
            />
            <span class="truncate">{{ item.targetLabel }}</span>
            <span class="shrink-0 text-shell-muted">· {{ item.reach }} {{ item.reach === 1 ? 'parent' : 'parents' }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-2">
            <span
              v-if="item.delivery"
              class="text-[11px]"
              :class="item.delivery.failed ? 'text-[#B91C1C] dark:text-[#FCA5A5]' : 'text-shell-muted'"
            >
              <UIcon
                name="i-lucide-check-check"
                class="mr-0.5 inline size-3.5 align-[-3px]"
              />{{ item.delivery.sent }}/{{ item.delivery.total }}
            </span>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="size-4 text-shell-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </button>
    </div>

    <EmptyState
      v-else-if="data"
      icon="i-lucide-megaphone"
      :title="search || status !== 'ALL' ? 'No announcements match' : 'No announcements yet'"
      :description="search || status !== 'ALL' ? 'Try a different search or status.' : 'Announcements you write will show up here.'"
    />

    <DataPanel
      v-model:open="panelOpen"
      :title="selected?.title ?? 'Announcement'"
    >
      <template
        v-if="selected"
        #header
      >
        <DataChip :status="selected.status" />
        <p class="mt-2 text-xl font-medium tracking-[-0.01em]">
          {{ selected.title }}
        </p>
      </template>

      <template v-if="selected">
        <section class="relative overflow-hidden rounded-[20px] bg-[#0C2416] p-4 text-white">
          <SwirlBackdrop
            :cx="85"
            :cy="15"
            :lines="20"
          />
          <p class="relative text-[11px] font-medium tracking-wide text-white/60 uppercase">
            As parents see it
          </p>
          <div class="relative mt-3 rounded-2xl bg-[#E5DDD5] p-3">
            <div class="max-w-[92%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line text-[#111b21] shadow-sm">
              <p class="mb-1 font-semibold">
                {{ selected.title }}
              </p>
              {{ selected.message }}
              <p class="mt-1 text-right text-[10px] text-black/40">
                {{ selected.publishedAt ? formatTime(selected.publishedAt) : 'Not sent' }}
              </p>
            </div>
          </div>
        </section>

        <section
          v-if="canManage('announcements') && selected.status !== 'ARCHIVED'"
          class="flex flex-wrap gap-2 rounded-[20px] bg-shell-card p-3"
        >
          <template v-if="selected.status === 'DRAFT'">
            <button
              type="button"
              class="bg-leaf-gradient flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              @click="confirm = 'publish'"
            >
              <UIcon
                name="i-lucide-send"
                class="size-4"
              />
              Publish & send
            </button>
            <button
              type="button"
              class="flex h-10 items-center gap-1.5 rounded-full bg-shell-panel px-4 text-sm font-medium transition-colors hover:text-leaf-800"
              @click="editDraft"
            >
              <UIcon
                name="i-lucide-pencil"
                class="size-4"
              />
              Edit
            </button>
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-full bg-shell-panel text-shell-muted transition-colors hover:text-[#B91C1C]"
              aria-label="Delete draft"
              @click="confirm = 'delete'"
            >
              <UIcon
                name="i-lucide-trash-2"
                class="size-4"
              />
            </button>
          </template>
          <template v-else>
            <button
              v-if="selected.delivery?.failed"
              type="button"
              class="bg-leaf-gradient flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              :disabled="working"
              @click="resendFailed"
            >
              <UIcon
                name="i-lucide-rotate-cw"
                class="size-4"
              />
              Retry {{ selected.delivery.failed }} failed
            </button>
            <button
              type="button"
              class="flex h-10 items-center gap-1.5 rounded-full bg-shell-panel px-4 text-sm font-medium transition-colors hover:text-leaf-800"
              @click="confirm = 'archive'"
            >
              <UIcon
                name="i-lucide-archive"
                class="size-4"
              />
              Archive
            </button>
          </template>
        </section>

        <section
          v-if="selected.delivery"
          class="rounded-[20px] bg-shell-card p-4"
        >
          <p class="text-base font-medium tracking-[-0.01em]">
            Delivery
          </p>
          <div class="mt-3 grid grid-cols-4 gap-2 text-center">
            <div
              v-for="stat in [
                { label: 'Sent', value: selected.delivery.sent },
                { label: 'Delivered', value: selected.delivery.delivered },
                { label: 'Read', value: selected.delivery.read },
                { label: 'Failed', value: selected.delivery.failed }
              ]"
              :key="stat.label"
              class="rounded-2xl bg-shell-panel px-2 py-3"
            >
              <p
                class="text-xl font-medium tracking-[-0.02em]"
                :class="stat.label === 'Failed' && stat.value ? 'text-[#B91C1C] dark:text-[#FCA5A5]' : ''"
              >
                {{ stat.value }}
              </p>
              <p class="text-[11px] text-shell-muted">
                {{ stat.label }}
              </p>
            </div>
          </div>
          <p class="mt-3 text-[11px] text-shell-muted">
            Out of {{ selected.delivery.total }} parents. Delivered and read update as WhatsApp reports back.
          </p>
        </section>

        <section class="rounded-[20px] bg-shell-card p-4">
          <dl class="divide-y divide-shell-line text-sm">
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-shell-muted">
                Audience
              </dt>
              <dd class="flex items-center gap-1.5 font-medium">
                <UIcon
                  :name="targetIcon[selected.targetType] ?? 'i-lucide-users'"
                  class="size-4 text-leaf-700 dark:text-leaf-400"
                />
                {{ selected.targetLabel }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-shell-muted">
                Reaches
              </dt>
              <dd class="font-medium">
                {{ selected.reach }} {{ selected.reach === 1 ? 'parent' : 'parents' }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-shell-muted">
                Written by
              </dt>
              <dd class="font-medium">
                {{ selected.createdBy }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-shell-muted">
                Created
              </dt>
              <dd class="font-medium">
                {{ formatDateTime(selected.createdAt) }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3 py-2.5">
              <dt class="text-shell-muted">
                Sent
              </dt>
              <dd class="font-medium">
                {{ formatDateTime(selected.publishedAt) }}
              </dd>
            </div>
          </dl>
        </section>
      </template>
    </DataPanel>

    <AnnouncementsFormModal
      v-model:open="formOpen"
      :announcement="editing"
      @saved="onSaved"
    />
    <FormModal
      v-model:open="confirmOpen"
      :title="confirmCopy.title"
      :description="confirmCopy.description"
      :submit-label="confirmCopy.label"
      :danger="confirm === 'delete'"
      :loading="working"
      :error="actionError"
      @submit="runConfirmed"
    />
  </div>
</template>
