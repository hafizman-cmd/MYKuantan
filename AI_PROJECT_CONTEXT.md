# MYKuantan Project Context

> A detailed technical and product brief for AI assistants working on the MYKuantan codebase.
>
> This document describes the implementation currently present in the repository. It is intentionally separate from `AGENTS.md`: `AGENTS.md` contains agent rules and long-term memory, while this file explains the product, architecture, data flows, and practical development context.

## 1. Project Identity

**MYKuantan** is an editorial travel and photography platform celebrating Kuantan, Pahang, Malaysia.

The product combines:

- A luxury travel lookbook homepage.
- An approved-photo gallery and interactive location atlas.
- Curated travel routes through coastline, highlands, and heritage locations.
- A contributor submission workflow with Supabase authentication.
- A personal saved-photo and saved-location itinerary.
- A protected editorial/admin dashboard for moderation and archive management.
- PWA support and offline caching for selected static, image, and map resources.

The visual direction is closer to a premium travel magazine than a utility dashboard: generous whitespace, Playfair Display headlines, Inter utility text, dark navy surfaces, cream editorial backgrounds, amber accents, restrained motion, and highly composed layouts.

## 2. Current Technical Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16.2 with App Router |
| Runtime | React 19 |
| Language | TypeScript 5.6, strict mode |
| Styling | Tailwind CSS v4 through `@tailwindcss/postcss` |
| Motion | Framer Motion 11 |
| Backend/data | Supabase JavaScript client |
| Maps | Leaflet, React Leaflet, OpenStreetMap/ArcGIS tiles |
| Images | `next/image` plus Supabase Storage URLs |
| Auth | Supabase Auth with email/password and Google OAuth |
| PWA | `@ducanh2912/next-pwa` and Workbox |
| Package manager | npm |
| Node expectation | Node 25+ per repository memory |

### Important scripts

```bash
npm run dev       # Next development server using webpack
npm run typecheck # tsc --noEmit
npm run build     # Production build; reserved for production use
npm run start     # Start a production server after build
```

**Verification rule:** use `npx tsc --noEmit` or `npm run typecheck` for normal verification. Do not use `npm run build` as a routine verification command.

## 3. Repository Layout

```text
MYKuantan/
├── AGENTS.md                    Agent memory, design rules, and verification rules
├── AI_PROJECT_CONTEXT.md        This shareable AI project brief
├── app/
│   ├── globals.css               Tailwind import, theme tokens, global styles
│   ├── layout.tsx                Root fonts, metadata, splash, cursor
│   ├── page.tsx                  Homepage/lookbook
│   ├── gallery/page.tsx          Approved photo gallery
│   ├── visit/page.tsx            Curated visit routes and map atlas
│   ├── stories/page.tsx          Editorial stories page
│   ├── submit/page.tsx           Contributor auth and photo submission
│   ├── collection/page.tsx       Personal saved frames and itinerary
│   ├── admin/page.tsx            Supabase-authenticated admin entry point
│   └── manifest.ts                PWA manifest metadata
├── components/
│   ├── Navbar.tsx                Responsive navigation and auth-aware profile UI
│   ├── Hero.tsx                  Homepage editorial hero, photo accordion, weather data
│   ├── Gallery.tsx               Interactive atlas/archive, likes, reporting, filters
│   ├── VisitGalleryShell.tsx     Visit page content cage
│   ├── VisitTracks.tsx           Curated route selection and saved stops
│   ├── VisitMiniMap.tsx          Client-only Leaflet map
│   ├── EditorialMap.tsx          Gallery map module
│   ├── KuantanChronicles.tsx     Stories/editorial content
│   ├── LikeButton.tsx            Auth-aware and guest photo likes
│   ├── AdminGate.tsx             Supabase sign-in/admin privilege gate
│   ├── AdminDashboard.tsx        Moderation, analytics, reports, archive
│   ├── Footer.tsx                Editorial footer
│   ├── SplashScreen.tsx           Initial loading/splash experience
│   └── CustomCursor.tsx           Desktop editorial cursor enhancement
├── lib/
│   ├── api.ts                    Shared photo queries and admin mutations
│   ├── format.ts                 Text formatting helpers
│   ├── i18n.tsx                  English/Bahasa Melayu context and dictionary
│   ├── locations.ts              Canonical location names and coordinates
│   ├── routes.ts                 Curated route categories and itinerary data
│   ├── useCollection.ts          Bookmark state and collection mutations
│   ├── supabase.ts               Shared non-persistent Supabase client
│   └── supabase/client.ts        Persistent browser Supabase client
├── types/photo.ts                Photo and status types
├── public/                       PWA icons, loading videos, homepage image, service worker
├── next.config.ts                Image hosts and Workbox caching
└── postcss.config.mjs            Tailwind/PostCSS setup
```

Generated/runtime directories such as `.next`, `node_modules`, and `tsconfig.tsbuildinfo` are not application source. Do not edit them manually.

## 4. Global Design System

### Typography

`app/layout.tsx` loads Google fonts through `next/font/google`:

- `Playfair Display` is assigned to `--font-playfair` and used for editorial headings.
- `Inter` is assigned to `--font-inter` and used for body, labels, controls, and metadata.

The Tailwind v4 theme maps these variables to `font-display` and `font-sans`. The `.font-display` class is also defined globally.

### Main colors

Defined in `app/globals.css`:

```text
cream       #F5F0E8
deep sea    #0F3460
deep sea soft #1A4A7A
sand        #E8DCC8
clay        #A67B5B
moss        #5B6B4F
stone 850  #231F1B
```

Many components also use direct Tailwind colors such as `#0B192C`, slate surfaces, amber `#F59E0B`/`#FBBF24`, and WhatsApp green `#25D366`.

### Layout rules

- Preserve the vertical, single-column page flow for major sections.
- Use full-width section backgrounds with centered inner content cages.
- The common desktop cage is approximately `max-w-[1600px] mx-auto px-6 lg:px-16`; some specialized pages use `max-w-5xl`, `max-w-7xl`, or `max-w-6xl` for content density.
- Keep mobile layouts intentional. Do not assume desktop flex arrangements will naturally work on a narrow viewport.
- Existing mobile patches in `AGENTS.md` are additive guidance; avoid casually changing established `md:` and `lg:` behavior.

### Motion and interaction

Framer Motion is used for the hero accordion, gallery transitions, route details, admin tabs, card entrances/exits, and modal transitions. Prefer the existing spring/easing language and avoid introducing a new animation system for small changes.

Inline SVG icons are preferred over adding a large icon dependency.

## 5. Route Map

| URL | Purpose | Data/rendering model |
| --- | --- | --- |
| `/` | Lookbook homepage | Server page fetches latest approved photos; client Hero handles interaction/weather |
| `/gallery` | Full approved gallery | Server fetches approved photos; client Gallery handles atlas/archive interactions |
| `/visit` | Curated trails and location atlas | Server fetches approved photos; client route/map workspace |
| `/stories` | Editorial Kuantan stories | Client editorial component inside a dynamic page |
| `/submit` | Contributor sign-in, profile onboarding, upload | Client-only authenticated workflow |
| `/collection` | Personal saved frames and itinerary | Client-only Supabase-authenticated workflow |
| `/admin` | Editorial control deck | Client Supabase auth plus `profiles.is_admin` privilege check |

The homepage, gallery, visit, stories, and admin pages currently export `dynamic = "force-dynamic"` where applicable. This is consistent with live Supabase-backed content.

## 6. Root Layout and Navigation

`app/layout.tsx` provides:

- Global metadata and Open Graph basics.
- PWA manifest reference.
- Theme color `#0F3460`.
- Playfair and Inter font variables.
- `SplashScreen` and `CustomCursor` mounted globally.
- A full-screen, cream default body shell.

`components/Navbar.tsx` is a client component. It:

- Renders links to Lookbook, Stories, Gallery, Visit, and My Trip.
- Shows a Submit link.
- Reads the Supabase session and public `profiles` row.
- Displays the contributor handle when a profile exists.
- Supports desktop and mobile navigation states.
- Tracks scroll position and changes between light transparent mode and dark frosted mode.
- Shows a logout confirmation modal and signs out through Supabase.

`lib/i18n.tsx` provides the lightweight bilingual layer. `LanguageProvider` is mounted in `app/layout.tsx`, defaults to English, persists `en` or `ms` in `localStorage` under `mykuantan_lang`, and updates the document language attribute. `useLanguage()` exposes the active language, setter/toggle functions, and dictionary copy. Navbar, Hero, Stories, Gallery, Visit, and My Trip currently consume the dictionary. User-generated photo captions, contributor names, and canonical location names intentionally remain unchanged.

## 7. Homepage and Weather/Coastal Tracker

`app/page.tsx` fetches five latest approved photos with `fetchLatestPhotos(5)` and passes them to `Hero`.

`components/Hero.tsx` contains:

- The editorial headline “Where the Sea Remembers.”
- A horizontal accordion slider using the latest five photos.
- Active/collapsed photo behavior with location labels and desktop-only photographer/caption overlays.
- An Explore Full Gallery link.
- Dynamic coastal metrics loaded from Open-Meteo:
  - Wind speed converted from km/h to knots.
  - Wind direction converted to a cardinal label.
  - A heuristic onshore-wind indicator.
  - A locally computed semi-diurnal tide estimate.
  - A countdown to the first returned sunset.
- Open-Meteo is polled every ten minutes in the browser. Network or parse failures leave the previous state unchanged.

The tide display is an approximation, not an authoritative tide service. Do not describe it as live measured tidal data without changing the implementation.

## 8. Gallery and Likes

`app/gallery/page.tsx` fetches every approved photo with `fetchAllPhotos()` and passes them to `Gallery`.

`components/Gallery.tsx` has two major experiences:

1. **Atlas workspace**
   - Location cards and an `EditorialMap` loaded with `next/dynamic` and `ssr: false`.
   - Active-location state and scroll-linked/selected gallery behavior.

2. **Archive**
   - Location filter.
   - Newest/oldest sorting.
   - Incremental pagination in batches of 12.
   - Photo preview modal.
   - Report flow with reasons such as inappropriate content, copyright, spam/wrong location, and other.
   - Save/bookmark photo controls through `useCollection`.
   - Like state that supports authenticated users and guest local storage.

`components/LikeButton.tsx` owns the shared like behavior. Authenticated likes use Supabase; guest likes use local storage until an authenticated flow is available.

## 9. Visit Routes and Maps

`app/visit/page.tsx` fetches all approved photos and passes them to `VisitGalleryShell`.

`VisitGalleryShell` provides the page content cage. `VisitTracks` provides:

- Three route categories: `Coastline`, `Highlands`, and `Heritage`.
- Curated titles, descriptions, and default itinerary points from `lib/routes.ts`.
- A route selector that filters available approved photo locations using `locationRouteMap`.
- A dynamic, client-only `VisitMiniMap`.
- Location bookmark controls using `useCollection`.
- A route URL builder for Google Maps.
- A maximum of ten route stops for generated journeys, with a truncation notice when necessary.
- A standard itinerary timeline showing time, activity, location, and bookmark state.

Canonical coordinates are duplicated in two useful registries:

- `lib/locations.ts`: `KUANTAN_LOCATIONS`, `KUANTAN_CENTER`, and `getCoordinatesByName`.
- `lib/routes.ts`: `locationCoords` and route category mapping.

When adding or renaming a location, keep these registries synchronized. Location names are used as database values and map lookup keys, so spelling/case changes can break bookmarks, route filters, coordinates, or itinerary rendering.

## 10. Contributor Submission Workflow

`app/submit/page.tsx` is a client component and directly uses a persistent browser Supabase client.

### Authentication

- Email/password sign-in.
- Email/password sign-up.
- Google OAuth.
- Auth state is tracked with `getSession()` and `onAuthStateChange()`.
- OAuth redirects back to `/admin` from the admin gate and uses the current site origin.

### Profile onboarding

The page reads `profiles.username` and `profiles.display_name` for the current user. If no username exists, it asks the contributor to create a sanitized handle:

- Lowercase.
- Removes leading `@` characters.
- Keeps only ASCII letters, digits, underscore, and period.
- Maximum length of 32 characters.

The stored username becomes the contributor identity used in the upload form.

### Upload processing

Before upload, `compressImage()`:

- Uses `createImageBitmap`.
- Downscales the longest edge to a maximum of 1920px.
- Renders through an offscreen canvas.
- Exports JPEG at quality `0.8`.
- Returns a `.jpg` `File`.

The UI has explicit phases: `idle`, `compressing`, `submitting`, `success`, and `error`.

Uploads go to the Supabase Storage bucket `kuantan-photos`. New storage paths are generated client-side. The database insert targets the `photos` table and should create a `pending` row with contributor, location, caption, coordinates, image URL, and timestamp. Pending submissions do not appear in the public approved gallery until moderation.

Preview object URLs are tracked and revoked to avoid browser memory leaks.

## 11. Personal Collection and Itinerary

`app/collection/page.tsx` is the most stateful page in the application. It supports two tabs:

- Saved Frames.
- My Itinerary.

### Collection storage

The `user_collections` table stores either a `photo_id` or a `location_name`, with itinerary metadata on location rows.

Important fields used by the current code:

```text
user_id
photo_id nullable
location_name nullable
order_index nullable
custom_time nullable/text
custom_notes nullable/text
```

`lib/useCollection.ts` hydrates bookmarked location/photo sets from `user_collections`, listens for auth changes, and toggles rows. Newly bookmarked locations receive an `order_index`, `custom_time: "Flexible"`, and an empty notes string.

### Itinerary behavior

The collection page:

- Loads the signed-in user and collection rows.
- Sorts saved locations by `order_index`.
- Supports desktop drag reordering with Framer Motion `Reorder.Group`.
- Provides mobile-safe up/down arrow controls because touch long-press dragging is unreliable.
- Persists ordering through a two-phase temporary negative index update followed by final sequential indexes, preventing duplicate order collisions during swaps.
- Saves custom time and notes to Supabase on blur/selection.
- Supports removal of a saved location.

### Time picker

The itinerary time field is not free text. `TimePicker` offers:

- `Flexible`.
- 30-minute slots from `12:00 AM` through `11:30 PM`.
- AM/PM toggle.
- Consistent zero-padded formatting such as `09:00 AM`.
- A scrollable dropdown that closes when clicking outside.

This formatting is important because itinerary data is printed and shared. Avoid reintroducing an arbitrary text input unless parsing/normalization is also added.

### Route, print, and WhatsApp sharing

The itinerary action bar provides:

- A Google Maps directions/search URL based on saved location coordinates.
- Print/Save as PDF through `window.print()`.
- WhatsApp sharing through `https://wa.me/?text=...`.

The WhatsApp message includes ordered stop names, normalized times, optional notes, and the Google Maps route URL. The message is URL encoded with `encodeURIComponent`.

The itinerary also derives inter-stop travel estimates from `getTravelEstimate()` in `lib/locations.ts`. It uses a Haversine distance, applies a 1.35 road-winding multiplier, and assumes 45 km/h average travel speed. The resulting connectors and total drive/distance summary are derived from the current ordered rows, so drag and arrow reordering immediately recalculates them. The same estimates are included in WhatsApp and print output.

When at least three stops exist, the itinerary action bar also exposes `Shortest Route`. `optimizeRouteOrder()` keeps the first stop fixed and repeatedly selects the nearest unvisited location by direct Haversine distance. The optimized order is applied through the same local reorder and Supabase persistence path used by drag/arrow reordering, so all route estimates and external exports update automatically.

The print-only itinerary is separate from the screen UI. Print CSS hides `.screen-collection`, buttons, navigation, and other `.print-hidden` elements, then displays `.print-itinerary`.

## 12. Admin and Moderation

`app/admin/page.tsx` is currently a client component. It renders `AdminGate` first. After successful admin verification, it fetches:

- Pending photos.
- All photos for analytics/archive.
- Top-liked photos.

`components/AdminGate.tsx` uses Supabase Auth and checks `profiles.is_admin === true`. It supports email/password and Google OAuth. Non-admin authenticated users see an access-denied state and can sign out.

`components/AdminDashboard.tsx` has four main tabs:

- **Overview**: metrics, upload chart, moderation content.
- **Moderation**: pending submissions and reports views.
- **Analytics**: upload-volume visualization with day/week/month ranges.
- **Active Archive**: approved-photo search, edit, take-down, and permanent delete operations.

Current moderation/data operations include:

- Approve pending photo.
- Reject pending photo.
- Load and review photo reports.
- Update photo metadata, coordinates, or status.
- Search approved archive by photographer/location.
- Take down approved photos by returning them to pending.
- Permanently delete a photo and attempt to remove its Supabase Storage object.

Admin state uses optimistic UI in several actions. If changing this behavior, ensure failed mutations restore or reload the affected data.

### Current security boundary

The repository currently uses Supabase Auth plus the public profile `is_admin` field in `AdminGate`. The admin page and dashboard make browser-side Supabase calls with the anon key. Do not assume there is a server-side HMAC cookie or `/api/admin/auth` route unless such files are actually added to the repository. Any production security hardening should move sensitive authorization checks and destructive operations behind server-side policies/routes and enforce matching Supabase Row Level Security.

## 13. Supabase Data Model Used by the Code

### `photos`

```text
id              string/uuid
image_url       string
photographer    string
location        string
caption         string
status          approved | pending | rejected
created_at      timestamp string
latitude        number nullable
longitude       number nullable
likes_count     number nullable
```

The TypeScript representation is in `types/photo.ts`.

### `profiles`

Fields referenced by the frontend:

```text
id
username
display_name nullable
is_admin boolean
```

### `user_collections`

See the itinerary fields in Section 11. A user can have a saved photo row, a saved location row, or both as separate collection records.

### `photo_reports`

Fields referenced by gallery/admin code include:

```text
id
photo_id
reason
details nullable
status nullable
created_at
```

The dashboard also expects a joined photo object for report review.

### Storage

- Bucket: `kuantan-photos`.
- Public image URLs are stored in `photos.image_url`.
- `lib/api.ts` includes storage path extraction for permanent photo deletion.

The database schema and RLS policies are not stored in the visible application source. Treat the frontend field usage as a contract, not as proof that every policy is correctly configured.

## 14. Supabase Client Boundaries

There are two client patterns:

### `lib/supabase.ts`

Exports `supabase` with `persistSession: false`. It is used by shared API helpers such as `lib/api.ts` and by some client components that do not need browser session persistence.

### `lib/supabase/client.ts`

Exports `supabaseClient` with:

```text
persistSession: true
autoRefreshToken: true
```

Use this for browser auth-sensitive interactions such as Navbar, collection, likes, and bookmark state.

Environment variables are public client variables and must exist in `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never write actual secret values into this documentation or source control.

## 15. Shared API Helpers

`lib/api.ts` centralizes photo queries:

- `fetchLatestPhotos(limit)` — approved, newest first.
- `fetchAllPhotos()` — all approved photos, newest first.
- `fetchPendingPhotos()` — pending photos, newest first.
- `fetchAdminAnalyticsPhotos()` — all statuses for admin analytics.
- `fetchTopLikedPhotos(limit)` — highest `likes_count`.
- `updatePhotoDetails(id, updates)` — metadata/status update.
- `deletePhotoPermanently(id, imageUrl)` — attempts storage deletion then database deletion.

Errors are logged and most query helpers return an empty array. If a future feature needs to distinguish “empty data” from “query failed,” change these helpers to return structured results instead of silently returning `[]`.

## 16. PWA, Images, and External Services

`next.config.ts`:

- Allows `next/image` hosts matching `**.supabase.co`.
- Enables PWA in production and disables it in development.
- Caches Next static assets, fonts/CSS, local images, ArcGIS tiles, and OpenStreetMap tiles through Workbox.

`app/manifest.ts` defines a standalone portrait travel/lifestyle/photography PWA with 192px and 512px icons.

External services currently used:

- Supabase database, auth, and storage.
- Open-Meteo weather forecast API.
- Google Maps external directions links.
- Google OAuth through Supabase Auth.
- OpenStreetMap and ArcGIS map tiles through Leaflet modules.

Network-dependent features should have graceful fallbacks. The home coastal tracker already keeps the UI usable if Open-Meteo fails; map and image modules should follow the same principle when changed.

## 17. Development Conventions for AI Assistants

Before editing:

1. Read `AGENTS.md`.
2. Inspect the actual target component and nearby state/data flow.
3. Check whether a feature is server-side, client-side, or shared.
4. Preserve existing visual language and responsive behavior.
5. Avoid exposing or reading secret values from `.env.local` into documentation.

When editing:

- Use `apply_patch` for manual changes.
- Prefer the smallest correct change.
- Keep reusable logic in the existing module unless there is a concrete reason to extract it.
- Use strict TypeScript types; do not introduce `any` casually.
- Prefer inline SVGs over a new icon library.
- Keep major layouts vertically stacked and aligned with existing content cages.
- Preserve `next/image` usage and provide appropriate `sizes`, `priority`, or lazy behavior.
- Keep mobile touch targets usable and do not depend only on drag gestures.
- Do not add backward-compatibility code without a concrete persistence or external-consumer requirement.

After editing:

- Run `npx tsc --noEmit`.
- Do not run `npm run build` as routine verification.
- Review the diff and confirm unrelated files were not changed.
- If a change affects Supabase, document the expected table/column/RLS requirement.

## 18. Known Caveats and Risks

These are useful facts for future debugging and planning:

1. **Frontend authorization is not a complete security boundary.** Admin privilege checks currently happen through a browser Supabase client and `profiles.is_admin`. RLS must enforce the real security boundary.
2. **There are duplicated location registries.** `locations.ts` and `routes.ts` both contain coordinates. Keep them synchronized or consolidate them carefully.
3. **Location names are identifiers.** Changing a name can orphan existing collection records and break route/map lookups.
4. **Photo query helpers collapse errors to empty arrays.** A blank gallery may mean either no approved photos or a failed query.
5. **The tide display is heuristic.** It is calculated locally from a sinusoidal approximation.
6. **Map components require browser APIs.** Leaflet components are dynamically imported with SSR disabled.
7. **Guest likes are local.** They are not automatically transferred to a user account.
8. **WhatsApp sharing includes notes.** Notes are labeled private in the UI, but the current share feature intentionally includes them in the outbound message. Revisit this if privacy expectations change.
9. **Printed output uses a separate DOM section.** Changes to on-screen itinerary markup do not automatically change PDF output.
10. **The project uses an incremental TypeScript build file.** `tsconfig.tsbuildinfo` may change after typechecking; it is generated state, not hand-authored application logic.

## 19. Useful Change Recipes

### Add a new location

Update all relevant sources:

1. `lib/locations.ts` with name and coordinates.
2. `lib/routes.ts` with coordinates/category if it belongs to route filtering.
3. `components/VisitTracks.tsx` `locationDetailsRegistry` if it needs curated time/activity copy.
4. Any Supabase seed/data records that use the location.
5. Tests or manual checks for bookmark, map, route, collection, and gallery behavior.

### Add a new photo field

Update:

1. `types/photo.ts`.
2. `SELECT_COLS` in `lib/api.ts`.
3. Submission insert/update code.
4. Gallery/admin display and edit paths.
5. Supabase table schema and RLS policies.

### Add an itinerary field

Update:

1. `CollectionRow` in `app/collection/page.tsx`.
2. The `user_collections` select list.
3. Draft update and save functions.
4. `ItineraryRow` UI.
5. Print itinerary output.
6. WhatsApp share message formatting if the field should be shared.

### Change public moderation behavior

Trace the whole path:

```text
submit upload
  -> photos.status = pending
  -> AdminDashboard moderation
  -> status approved/rejected
  -> fetchAllPhotos/fetchLatestPhotos only return approved
  -> public gallery/homepage
```

Do not bypass the status filter in public query helpers.

## 20. Recommended AI Conversation Starter

When handing this project to another AI, provide this file together with `AGENTS.md` and a specific task. A useful prompt format is:

```text
You are working on MYKuantan, a Next.js 16 / React 19 / TypeScript project.
Read AGENTS.md and AI_PROJECT_CONTEXT.md first.

Task: [specific feature or bug]
Target area: [route/component/file]
Constraints: preserve the editorial visual language, responsive behavior, Supabase data contracts, and use npx tsc --noEmit for verification.

Inspect the current implementation before proposing changes. Implement the smallest correct change, then report changed files and verification results.
```
