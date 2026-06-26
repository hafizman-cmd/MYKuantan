# MYKuantan — Agent Context Memory Bank

> Long-term context file for token-saving and codegraph scanning.
> All agents working in this repo MUST read this file first.

## Project Identity

**MYKuantan** — an editorial celebration of Kuantan, Pahang, Malaysia.
Built as a luxury travel lookbook in the spirit of *Condé Nast Traveler*:
modern print-magazine feel, elegant typography, generous breathing room.

## Tech Stack

- **Framework:** Next.js 16.2+ (App Router, RSC-first)
- **UI Runtime:** React 19
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";` in `app/globals.css`,
  theme tokens declared via `@theme {}` block, PostCSS plugin
  `@tailwindcss/postcss`)
- **Motion:** Framer Motion 11
- **Data Layer:** Supabase (`@supabase/supabase-js`)
- **Language:** TypeScript 5.6 (strict)
- **Package Manager:** npm
- **Node:** v25+

## Verification Rule (STRICT)

> **Do NOT run `npm run build` for verification tasks.**
> Only use `npx tsc --noEmit` to check type safety.

`npm run build` is reserved for production. Typechecking uses
`npm run typecheck` (which runs `tsc --noEmit`).

## Folder Structure

```
MYKuantan/
├── AGENTS.md                       ← this file (context memory)
├── .env.local                       ← Supabase keys + admin secrets (NOT committed)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── app/
│   ├── globals.css                  ← Tailwind v4 import + @theme tokens
│   ├── layout.tsx                   ← anti-void body shell + font + UploadModalProvider wrap
│   ├── page.tsx                     ← home vertical flex stack (Navbar / Hero+Gallery / Footer)
│   ├── admin/
│   │   └── page.tsx                 ← gated admin route (cookie check → AdminGate | AdminDashboard)
│   └── api/admin/auth/
│       └── route.ts                 ← POST/GET/DELETE HttpOnly session cookie handler
├── components/
│   ├── Navbar.tsx                   ← sticky nav + mobile drawer + SUBMIT → upload modal
│   ├── Hero.tsx                     ← horizontal accordion slider (responsive overlays)
│   ├── Gallery.tsx                  ← approved-photos grid (RSC)
│   ├── Footer.tsx                   ← editorial footer
│   ├── UploadModalProvider.tsx      ← client context + drag/drop + canvas compress + Supabase upload
│   ├── AdminGate.tsx               ← password entry card (no Framer Motion mount crash risk)
│   └── AdminDashboard.tsx           ← sidebar tabs + metrics + SVG chart + moderation queue + archive grid
├── lib/
│   ├── supabase.ts                  ← shared Supabase client (singleton)
│   ├── api.ts                       ← server-side fetch utilities + updatePhotoDetails mutation
│   └── admin-auth.ts                ← HMAC session token issue/verify + env-quote cleanup
└── types/
    └── photo.ts                     ← Photo interface + PhotoStatus union
```

## Design Goals & Visual Vision

1. **LUXURY TRAVEL LOOKBOOK AESTHETIC**
   - Elite modern print-magazine feel.
   - Typography pairing: **Playfair Display** (via `next/font`) for editorial
     headers, **Inter** (via `next/font`) for descriptions. CSS variables
     `--font-playfair` / `--font-inter` wired into `@theme` in globals.css;
     `.font-display` utility maps to Playfair.
   - Sophisticated color contrast: cream `#F5F0E8`, deep sea `#0F3460`,
     muted nature accents (clay, moss, sand).

2. **PERFECT AXIAL SYMMETRY**
   - All core typography, metrics grids, and layout modules line up cleanly
     down a centered vertical axis.
   - Nothing leans awkwardly left or right unless balanced on both sides.

3. **FLUID RESPONSIVENESS**
   - Background container fields span edge-to-edge on large screens.
   - Inner content elements stay strictly caged in standard boxes.
   - Text overlays wrap inside glassmorphic badges — never bleed outside.
   - Compressed accordion panels hide descriptive text on narrow phones
     (`hidden md:block`) to prevent overlap; only the location tag remains
     on mobile, scaling via `text-sm md:text-xl font-bold`.

## Global Layout Framework

### Vertical Flex Stack Principle
The home page lives on a single-column vertical flex engine:
```tsx
<div className="w-full min-h-screen flex flex-col items-stretch justify-start bg-[#F5F0E8] overflow-x-hidden">
  <Navbar />
  <main className="w-full flex flex-col items-stretch justify-start flex-1">
    <Hero latestPhotos={latestPhotos} />
    <Gallery photos={allPhotos} />
  </main>
  <Footer />
</div>
```
Horizontal side-by-side split screens and 50/50 grid halves are **forbidden**
for main layout sections.

### 1600px Max-Width Inner Container
Navbar, Hero, Gallery, Footer, and AdminDashboard workspace all share the
identical `max-w-[1600px] mx-auto px-6 lg:px-16` inner content cage so the
entire page lines up top-to-bottom (Absolute Component Cohesion).

### Two-Layer Component Container Spec
- **Outer Wrapper** (full-viewport section background):
  `className="w-full overflow-hidden block"`
- **Inner Content Cage** (centered, capped to navbar layout block):
  `className="w-full max-w-[1600px] mx-auto px-6 lg:px-16"`

### Mobile Responsive Safety Patches
- **Navbar drawer**: hamburger toggles `isOpen` state; a `md:hidden` frosted
  dropdown (`bg-[#F5F0E8]/95 backdrop-blur-xl`) renders vertical menu items
  only on small screens. Desktop `hidden md:flex` horizontal list untouched.
- **Hero accordion overlays**: collapsed caption line scales via
  `text-sm md:text-xl font-bold` with `px-2 md:px-3` and `max-w-[90%]`;
  expanded description grid hides photographer line and caption on phones
  (`hidden md:block` / `hidden md:block text-xs text-white/80 mt-1`) and
  restores them on tablets+. Inner padding `p-4 md:p-10 lg:p-14`.
- **Rule of thumb**: never alter any class prefixed with `md:` or `lg:` —
  responsive patches are *additive* scaling only, preserving desktop styling.

## Media Storage Pipeline

### Browser-Side Canvas Compression
`components/UploadModalProvider.tsx` intercepts every selected file before
upload and compresses it in-browser via the `compressImage(file, maxDim, quality)`
helper:
- Decodes via `createImageBitmap(file)`.
- Downscales to a **max 1920px boundary** on the longest edge, preserving
  aspect ratio.
- Renders to an offscreen `<canvas>` and exports via `canvas.toBlob` as
  **`image/jpeg` at 0.80 quality** (target payload < 500KB, sharp fidelity).
- Returns a new `File([blob], "${baseName}.jpg", { type: "image/jpeg" })`.
- Adds a `"compressing"` status phase (button reads "Optimizing...") before
  the `"submitting"` phase.

### Live Supabase Bucket Pathing
- **Bucket name:** `kuantan-photos` (constant `SUPABASE_STORAGE_BUCKET`).
- Upload call: `supabase.storage.from("kuantan-photos").upload(filePath, compressed, { contentType: "image/jpeg", cacheControl: "3600", upsert: false })`.
- Public URL extraction:
  `const { data } = supabase.storage.from("kuantan-photos").getPublicUrl(filePath);`
  → `data.publicUrl` populates the `image_url` column on insert.
- Row insert sets `status: "pending"` so new submissions route into
  moderation, not onto the public home page.
- Local preview uses `URL.createObjectURL(file)` tracked in a ref + state;
  revoked cleanly on close/replace/unmount to prevent memory leaks.

## Security Control Deck

### Async HttpOnly Cookie Authentication Route
`app/api/admin/auth/route.ts` exposes three handlers:
- **POST** `{ password }` — constant-time compares via `safeComparePassword`
  against `ADMIN_ACCESS_PASSWORD`; on match issues a 12-hour HMAC-signed
  token cookie `kuantan_admin_session` (`HttpOnly`, `sameSite: "lax"`,
  `secure` in production, `maxAge: 43200`). Returns 401 on mismatch.
- **GET** — returns `{ authed }` by re-verifying the cookie (used by
  AdminGate's mount-time session check).
- **DELETE** — clears the cookie (sign-out).

### Server-Side HMAC Validation Workflow
`lib/admin-auth.ts` (server-only, uses Node `crypto`):
- `issueAdminSessionToken(secret)` — `HMAC-SHA256(secret, "exp=<ts>")` →
  `<exp>.<mac>` string.
- `verifyAdminSessionToken(token, secret)` — splits, checks token expiry,
  recomputes the HMAC, and compares with `timingSafeEqual` (constant-time).
- `getAdminEnv()` — returns `{ password, secret }` reading
  `ADMIN_ACCESS_PASSWORD` + `ADMIN_SESSION_SECRET`; both are scrubbed via
  `cleanEnvValue` (strips leading/trailing `"`, `'`, `` ` ``) so values like
  `"pa#ss"` survive `.env` quote artifacts.
- `safeComparePassword(input, expected)` — constant-time `timingSafeEqual`.

### Gated Admin Route
`app/admin/page.tsx` is a server component (`force-dynamic`):
1. Reads `await cookies()` inside an isolated `readAdminToken()` helper
   wrapped in try/catch — if `cookies()` throws in a conflicting render
   context, it logs and returns `null`, falling straight to the Gate.
2. Outer try/catch verifies the HMAC token; any failure → `authed = false`.
3. If unverified → renders `<AdminGate loadingFallback={…}>` (premium login
   card). No data fetched, no metrics exposed.
4. If verified → fetches Supabase data and renders `<AdminDashboard />`.
   Data fetch is wrapped in its own try/catch that also falls back to the
   Gate on failure — so no path produces a blank viewport.

### AdminGate Entry Card
`components/AdminGate.tsx` ("Editorial Control Deck"):
- Cream `#F5F0E8` backdrop + soft radial halo; elevated white card with
  `#0F3460` accent bar; Playfair Display heading; `type="password"` input.
- On invalid key the card **shakes** via a local `@keyframes adminShake`
  CSS animation keyed by `shakeKey` (Framer Motion was removed from the
  mount path to eliminate the silent React-19 mount crash that blanked
  the screen).
- Mount-time `GET /api/admin/auth` detects an already-valid session and
  reloads past the gate.
- `handleSubmit` opens with `e.preventDefault()` as its absolute first
  line to block native browser reload loops.
- Failsafe visual anchor
  `<div className="absolute top-4 left-4 text-xs font-mono text-[#0F3460]/40 font-bold z-50">GATEWAY MOUNTED SUCCESSFULLY</div>`
  proves the component mounted.

## Admin Dashboard — Management Utilities

`app/admin/page.tsx` (gated) renders `components/AdminDashboard.tsx`: a
dark-slate sidebar (`w-64`, `md:sticky`) with four tabs — **Overview**,
**Moderation**, **Analytics**, **Active Archive** — animated via
`layoutId="admin-tab"` spring. Sidebar footer hosts a Sign-out button
that `DELETE`s the auth cookie then reloads.

### Tabs
- **Overview** — metric cards + upload-volume chart + moderation queue.
- **Moderation** — metric cards + moderation queue table.
- **Analytics** — upload-volume chart only.
- **Active Archive** — metric cards + published lookbook grid.

### Performance Metric Widgets
Top row, 3 cards computed live from Supabase state:
- **Pending Queue** — `status === "pending"` count.
- **Published Archive** — `status === "approved"` count.
- **Contributor Count** — `new Set(photographer).size`.
Each card count-ups via `animate(0, value, …)` (Framer Motion) and carries
an accent bar + icon chip.

### Visual Analytics Chart
Custom SVG area/line chart (no Recharts dep — keeps bundle slim per the
inline-SVG rule). Smooth cubic-bezier path through bucket counts, gradient
area fill, animated `pathLength` draw-in, spring-popped point dots, dashed
grid lines. Toggle `[Day][Week][Month]` with `layoutId="range-pill"` spring.
Buckets group by `created_at`: Day = last 24h hourly, Week = last 7d daily,
Month = last 30d daily. Peak + span readout. Empty-state fallback.

### Real-Time Moderation Queue
Structured table (rounded-xl `w-20 h-16` thumbnails, contributor, location
pin, caption, action buttons). Approve → optimistic remove + DB
`.update({status:"approved"})` + slides out via
`exit={{x:48}}` (`AnimatePresence mode="popLayout"`); Reject →
`status:"rejected"`. Sidebar badge shows live pending count. Empty
"All clear" state.

### Active Lookbook Archive Manager (Path 2)
The "Active Archive" tab surfaces the live `status === "approved"` set:
- **Glassmorphic search bar** — frosted `bg-[#F5F0E8]/60 backdrop-blur-md`
  input narrowed by a `useMemo` filter matching `photographer` OR
  `location` (case-insensitive, `filteredApproved`).
- **Lookbook grid** —
  `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`; each card a
  strict `aspect-[4/3] rounded-2xl` thumbnail with metadata overlaid at the
  bottom inside glassmorphic badges (`break-words whitespace-normal
  leading-relaxed max-w-[85%]`).
- **Inline edit** — pen-icon button toggles an absolute-positioned frosted
  form card (`bg-white/95 backdrop-blur-xl`) over the photo with
  photographer / location / caption inputs + Save. Save optimistically
  patches local state then calls `updatePhotoDetails(id, updates)` (mapped
  to `supabase.from(table).update(updates).eq("id", id)`).
- **Take-Down control** — "Take Down" button optimistically flips the
  row's status to `"pending"` in local state (removing it from the
  approved grid, restoring it to the Moderation queue), animates the card
  out via `AnimatePresence mode="popLayout"` (spring scale+fade), then
  calls `updatePhotoDetails(id, { status: "pending" })` so it instantly
  drops off the public home page too.

All admin transitions use spring timings
(`stiffness/damping` + `[0.22, 1, 0.36, 1]` ease) matching the editorial
aesthetic.

## Supabase Data Model

`Photo` interface (see `types/photo.ts`):

| field          | type                                    |
| -------------- | --------------------------------------- |
| id             | string                                  |
| image_url      | string                                  |
| photographer   | string                                  |
| location       | string                                  |
| caption        | string                                  |
| status         | `'approved' \| 'pending' \| 'rejected'` |
| created_at     | string                                  |

Server-side fetch + mutation utilities live in `lib/api.ts`:
- `fetchLatestPhotos(limit)` — `status='approved'`, `created_at` desc, limited.
- `fetchAllPhotos()` — `status='approved'`, `created_at` desc.
- `fetchPendingPhotos()` — `status='pending'`, `created_at` desc.
- `fetchAdminAnalyticsPhotos()` — all rows (any status), for chart + counts.
- `updatePhotoDetails(id, updates)` — inline row update accepting
  `{ status?, location?, caption?, photographer? }`; returns boolean success.

Shared Supabase client lives in `lib/supabase.ts` (singleton, throws on
missing env). `SUPABASE_PHOTOS_TABLE = "photos"`.

## Optimization Tracking

- Prefer server components for data fetching (Hero/Gallery/admin page receive
  props from server fetches in `app/page.tsx` and `app/admin/page.tsx`).
- Client islands (`"use client"`) only where interaction is required
  (Navbar scroll + drawer, Hero accordion, UploadModalProvider,
  AdminDashboard, AdminGate).
- Keep image payloads lazy-loaded (`next/image` with `loading="lazy"` for
  gallery/archive items, `priority` for the first hero slide).
- Track bundle: avoid pulling entire icon libraries; all icons are inline
  SVG components defined at the bottom of `AdminDashboard.tsx` /
  `AdminGate.tsx`.
- `next.config.ts` whitelists `**.supabase.co` for `next/image` remote
  patterns.

## Evolution Log

- 2026-06-26 — Initial scaffold: project, env, supabase client, types, api,
  app shell (layout + page), Navbar/Hero/Gallery/Footer.
- 2026-06-26 — Removed `.eq("approved", true)` filter bypass; switched to
  `status` text column with `'approved' | 'pending' | 'rejected'` union;
  new uploads default to `status: "pending"`.
- 2026-06-26 — UploadModalProvider + Navbar SUBMIT wiring; canvas
  compression engine (1920px / 0.8 JPEG) + `kuantan-photos` bucket path.
- 2026-06-26 — Admin Dashboard (app/admin): metrics, SVG analytics chart,
  moderation queue with optimistic Approve/Reject.
- 2026-06-26 — Path 2: Active Archive tab — glassmorphic search, inline
  edit mutations, optimistic take-down; `updatePhotoDetails` added to api.
- 2026-06-26 — Path 1: Admin Protection Gate — `/api/admin/auth` route,
  HMAC HttpOnly cookie, `lib/admin-auth.ts`, `AdminGate` card, gated
  `app/admin/page.tsx` with try/catch Gate fallback + env-quote cleanup +
  visible loading anchor.
- 2026-06-26 — Mobile polish: Navbar hamburger drawer (`md:hidden`),
  Hero accordion overlays `hidden md:block` on phones, location tag
  `text-sm md:text-xl font-bold`. Desktop `md:`/`lg:` classes preserved.
- 2026-06-26 — AdminGate stability: stripped Framer Motion from mount
  path (silent React-19 crash), CSS-keyed shake, `e.preventDefault()` first
  line, `GATEWAY MOUNTED SUCCESSFULLY` failsafe anchor.