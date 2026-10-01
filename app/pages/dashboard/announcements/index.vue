<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  section: 'announcements',
  title: 'Announcements',
  description: 'Reach the whole school, a single class, or one family.',
  hideHeader: true
})

const route = useRoute()

const search = ref('')
const status = ref<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL')

const { data, status: fetchStatus } = await useFetch('/api/announcements', {
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
</script>

<template>
  <div class="flex flex-1 flex-col font-dash">
    <PageHeader
      :title="(route.meta.title as string)"
      :description="(route.meta.description as string)"
    />

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
          <UIcon
            name="i-lucide-arrow-up-right"
            class="size-4 shrink-0 text-shell-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
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
  </div>
</template>
