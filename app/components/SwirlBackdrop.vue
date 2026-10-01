<script setup lang="ts">
// Decorative contour-line texture for the dark green cards
// (Time Tracker, sidebar promo) — see design/references/dashboard.png.
const props = withDefaults(defineProps<{
  lines?: number
  /** Swirl centre, in % of the box */
  cx?: number
  cy?: number
}>(), {
  lines: 26,
  cx: 78,
  cy: 70
})

const paths = computed(() => {
  const out: string[] = []
  for (let i = 0; i < props.lines; i++) {
    const base = 6 + i * 4.2
    const points: string[] = []
    for (let step = 0; step <= 72; step++) {
      const t = (step / 72) * Math.PI * 2
      const r = base * (1 + 0.22 * Math.sin(3 * t + i * 0.22) + 0.08 * Math.cos(5 * t - i * 0.1))
      const x = props.cx + r * Math.cos(t) * 1.35
      const y = props.cy + r * Math.sin(t)
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
    }
    out.push(`M${points.join('L')}Z`)
  }
  return out
})
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0"
      :style="{ background: `radial-gradient(circle at ${cx}% ${cy}%, rgba(46,160,90,0.55) 0%, rgba(20,83,45,0.35) 35%, transparent 70%)` }"
    />
    <svg
      class="absolute inset-0 size-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        v-for="(d, i) in paths"
        :key="i"
        :d="d"
        fill="none"
        :stroke="`rgba(120, 230, 160, ${0.08 + (i % 4) * 0.035})`"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </div>
</template>
