<script setup lang="ts">
defineProps<{
  schoolName: string
}>()
</script>

<template>
  <div class="mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5">
    <!-- Chat header -->
    <div class="flex items-center gap-2.5 bg-[#075E54] px-4 py-3">
      <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
        <UIcon
          name="i-lucide-school"
          class="size-4"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-white">
          {{ schoolName }}
        </p>
        <p class="text-[11px] text-white/70">
          online
        </p>
      </div>
      <UIcon
        name="i-lucide-video"
        class="size-4 shrink-0 text-white/80"
      />
      <UIcon
        name="i-lucide-phone"
        class="size-4 shrink-0 text-white/80"
      />
    </div>

    <!-- Chat body -->
    <div class="space-y-2.5 bg-[#E5DDD5] px-3 py-4">
      <div class="flex">
        <div class="max-w-[82%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm">
          Hi 👋 thanks for messaging {{ schoolName }}. How can we help?
          <p class="mt-1 text-right text-[10px] text-black/40">
            9:02 AM
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <div class="max-w-[82%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm">
          Can I check Brian's fee balance?
          <p class="mt-1 flex items-center justify-end gap-1 text-[10px] text-black/40">
            9:02 AM
            <span class="text-[#53bdeb]">✓✓</span>
          </p>
        </div>
      </div>

      <div class="flex">
        <div class="max-w-[82%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm">
          Brian Otieno — Grade 6A<br>
          Balance: <span class="font-semibold">KES 4,500</span><br>
          Due: 30 Nov
          <p class="mt-1 text-right text-[10px] text-black/40">
            9:03 AM
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <div class="max-w-[82%] rounded-lg rounded-tr-none bg-[#D9FDD3] px-3 py-2 text-[13px] leading-snug text-[#111b21] shadow-sm">
          Perfect, thank you! 🙏
          <p class="mt-1 flex items-center justify-end gap-1 text-[10px] text-black/40">
            9:03 AM
            <span class="text-[#53bdeb]">✓✓</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div class="flex items-center gap-2 bg-[#F0F2F5] px-3 py-3">
      <div class="flex-1 rounded-full bg-white px-4 py-2 text-[13px] text-black/40 ring-1 ring-black/5">
        Type a message
      </div>
      <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#075E54]">
        <UIcon
          name="i-lucide-mic"
          class="size-4 text-white"
        />
      </div>
    </div>
  </div>
</template>
