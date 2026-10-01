<script setup lang="ts">
interface Props {
  text: string
  class?: string
}

const props = defineProps<Props>()

const words = computed(() => props.text.split(' '))
</script>

<template>
  <span :class="props.class">
    <span
      v-for="(word, index) in words"
      :key="word + index"
      class="animate-text-reveal inline-block opacity-0"
      :style="{ animationDelay: `${index * 45}ms` }"
    >{{ word }}&nbsp;</span>
  </span>
</template>
