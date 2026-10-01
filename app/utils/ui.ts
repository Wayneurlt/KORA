// Shared `:ui` overrides so Nuxt UI form controls match design/DESIGN.md
// (white pill fields on the light-gray panels). Use with variant="none".

const field = 'bg-shell-card text-sm text-shell-ink ring-1 ring-transparent placeholder:text-shell-muted transition-shadow focus-visible:ring-2 focus-visible:ring-leaf-600'

/** Pill input for fields sitting on a gray panel */
export const pillInputUi = {
  root: 'w-full',
  base: `h-12 rounded-full px-5 ${field}`
}

/** Pill input for fields sitting inside a white card */
export const pillInputOnCardUi = {
  root: 'w-full',
  base: `h-11 rounded-full px-4.5 ${field} bg-shell-panel`
}

/** Rounded textarea for fields sitting inside a white card */
export const softTextareaOnCardUi = {
  root: 'w-full',
  base: `min-h-24 rounded-[18px] px-4.5 py-3 ${field} bg-shell-panel`
}
