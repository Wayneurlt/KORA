<script setup lang="ts">
const route = useRoute()

useHead({
  title: computed(() => route.meta.title as string | undefined)
})
</script>

<template>
  <div class="flex h-screen gap-2.5 overflow-hidden bg-shell-frame p-2.5 font-dash text-shell-ink">
    <AppSidebar />

    <div class="flex min-w-0 flex-1 flex-col gap-2.5">
      <AppTopbar />

      <main class="flex flex-1 flex-col overflow-y-auto rounded-[22px] bg-shell-panel p-3.5 sm:p-4">
        <PageHeader
          v-if="!route.meta.hideHeader"
          :title="route.meta.title ?? 'Dashboard'"
          :description="route.meta.description"
        />

        <slot />
      </main>
    </div>
  </div>
</template>
