# KORA design reference

Rule: when building a screen that has a reference in `references/`, **copy the reference**:
same layout, proportions, spacing, type scale, colors and component shapes. Don't invent a
different style, and don't fall back to a stock admin dashboard.

| Screen    | Reference                       | Status |
|-----------|---------------------------------|--------|
| Dashboard | `references/dashboard.png` ("Donezo" style) | built: `app/pages/dashboard/index.vue`, shell in `app/layouts/default.vue` |
| Landing | dashboard colors/type/shapes, but a classic marketing layout: centered max-w-6xl column with padding, open white page (no panels), centered hero + product shot | built: `app/pages/index.vue`, `app/layouts/public.vue` |
| Login | same pattern as the dashboard (no separate reference) | built: `app/pages/login.vue`, `app/layouts/auth.vue` |

Links to inspiration (add screenshots too, because a link alone gives text and code, not visuals):

- _(add links here)_

---

## Dashboard — breakdown of `references/dashboard.png`

### Shell
- In the reference the app sits in a white frame on a gray canvas (presentation only). **In KORA the white
  frame is the browser window**: no outer canvas/margin, just a 10px gutter, and the layout fills the full height.
- Inside it there are three **light-gray panels** (`#F5F5F5`, radius ~22px, no border, no shadow):
  sidebar (left, ~200px), topbar (top right, ~76px tall) and the main content panel.
- Cards inside the main panel are **pure white**, radius ~20px, **no borders, no shadows**. Gap between cards ~10–12px.

### Color tokens
| Token | Value | Use |
|---|---|---|
| green-900 | `#0F3D24` | darkest gradient stop, Time Tracker bg |
| green-800 | `#14532D` | primary buttons, tallest bar, "in progress" |
| green-700 | `#1A6B3C` | gradient top / featured card |
| green-600 | `#2E7D50` | mid bars, "completed" arc |
| green-400 | `#5DBB8A` | highlighted bar (T, 74%) |
| green-200 | `#BFE8D0` | text on the featured card's footer |
| ink | `#111111` | headings, numbers |
| muted | `#8A8A8A` | subtitles, labels, inactive nav |
| hatch | `#9CA3AF` diagonal stripes on white | "empty" bars and pending arc |
| amber | `#D97706` on `#FEF3C7` | In Progress chip |
| red | `#DC2626` on `#FEE2E2` | Pending chip, stop button |

Featured surfaces (Total Projects card, Add Project, Start Meeting, Download) use a **diagonal green
gradient** `#1F7A4A → #0F3D24`, top-left lighter.

### Typography
- One geometric/grotesk sans, regular to medium weights (no heavy bold): **Inter**.
- Page title "Dashboard": ~34px, weight 500, tight tracking. Subtitle: 14px muted.
- Stat numbers: ~46px, weight 500. Timer: ~36px, weight 500, tabular numbers.
- Card titles: 16px, weight 500. Body/list: 13–14px. Meta (due date, "Working on"): 10–11px muted.

### Sidebar
- Logo: green ring mark + wordmark (20px, semibold).
- Small muted section labels "MENU" and "GENERAL" (11px).
- Nav item: 20px outline icon + 16px label, muted gray. **Active**: label black (medium), icon solid green,
  plus a **4px green vertical bar on the far left edge of the panel**, no background highlight.
- A count badge (e.g. "12+") is a tiny dark-green rounded rectangle with white text, right-aligned.
- Bottom: **promo card**, dark (near black) with green swirl/glow lines, a small round icon, white two-line
  title, tiny caption, and a full-width green pill button.

### Topbar
- Left: white pill search (~290px) with a search icon, muted placeholder and a gray `⌘ F` key chip.
- Right: two **white circular icon buttons** (mail, bell, ~44px), then a round avatar + name (medium) and email (muted).

### Page header
- Left: title + subtitle. Right: **filled green gradient pill** with a "+" icon, and an **outline pill**
  (1.5px dark-green border, dark-green text). Both ~44px tall, fully rounded.

### Grid (4 equal columns)
```
| Stat (featured) | Stat           | Stat            | Stat           |
| Analytics (span 2)               | Reminders       | Project list   |
| Team collaboration   | Progress gauge              | (cont.)        |
|                      |                             | Time tracker   |
```
- Row 3's left area is split ~56/44 (team / progress), so it does not follow the 4 columns.
- The right column is a vertical stack: project list (taller), then time tracker.

### Components
- **Stat card**: title (16px medium) + 32px **circular arrow-up-right button** (1px dark outline on white
  cards; solid white with dark arrow on the featured card). Big number. Footer: a tiny bordered chip
  ("5 ▲") + green text ("Increased from last month").
- **Bar chart**: 7 **fully rounded capsules** (no axes or gridlines), different heights, day letters below.
  Empty days use gray diagonal hatching; data days are solid greens (mid, light, dark). The highlighted bar
  has a small bordered tooltip chip ("74%") with a dot connector above it.
- **Reminder**: title, then a large dark-green event name (~22px medium), muted time line, and a full-width
  green gradient pill button with a video icon.
- **List rows** (projects): colorful 20px icon, title 14px, muted due-date line 10px. A "+ New" outline pill in the header.
- **Team rows**: 40px round avatar on a pastel circle, name 14px, "Working on **bold task**" 11px,
  status chip on the right (tiny, rounded, light tinted bg + 1px border).
- **Gauge**: thick semicircle with rounded caps, three segments (green / dark green / hatched), a large
  "41%" centered with a muted caption, and a legend row below with dots.
- **Time tracker**: dark green card with a swirl-line texture, white title, big white timer, and two round
  buttons (white with a dark pause icon, red with a white stop square).

### How the reference maps to KORA content
Same visuals; the cards hold school data instead of project data. The analytics chart, progress gauge and
time tracker were dropped on request (2026-10-02): they had no real meaning for a school.

| Reference card | KORA card | Source |
|---|---|---|
| Total / Ended / Running / Pending Projects | Active Students / Parents / Fees Collected / Outstanding | `/api/dashboard/overview` |
| Reminders / Start Meeting | Newest draft announcement / Review & Send | announcements |
| Project list | Recent announcements | announcements |
| Team Collaboration | Staff team with role focus + status chip | users |
| Download our Mobile App | Reach parents on WhatsApp / Open Inbox | — |

Each card only shows data the user's role can access. Without access, it shows "—" or a short note.
