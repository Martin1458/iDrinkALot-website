# iDrinkALot — Changelog

Format: most recent first. Each entry describes what changed and why.

---

## [Unreleased]

### Stats Timeline — Session-Based View
- **Timeline replaced**: drink history list replaced with collapsible session cards. Each card shows date, venue, drink count, total units, and duration. Tap the header to open the session detail modal; tap the bottom toggle to expand an inline drink list.
- **Group session badge**: sessions with a `shared_session_id` display a "👥 Group" pill badge in the card header.
- **Session detail modal**: full-screen slide-up with safe-area handling (`useSafeAreaInsets()` on a plain `<View>`) — X button sits correctly inside the notch. Stats grid shows drinks, units, duration, and peak BAC. Displays the full `BacGraph` with `nowMs` set to session end (shows the complete curve). Falls back to "Add weight & sex in Profile" if body stats are missing.
- **`buildSessionGroups()`**: groups `historyEntries` by `session_id`, matches to `historySessions` (last 90 days fetched from DB). Synthesises a fallback session object for orphaned entries (e.g. very old data before `historySessions` coverage).
- **`historySessions` added to `DrinksContext`**: fetches the last 90 days of sessions and exposes them on the context; included in the `refresh()` `Promise.all`.
- **Timeline always shows all history**: timeframe selector removed from the Timeline tab. Charts and Records tabs still have the 7d/30d/3m/All selector.
- **Unified List / Calendar toggle**: replaces the separate `timelineHeader` toggle UI. Uses the same `s.tfRow / s.tfBtn / s.tfBtnActive` pill styles as the timeframe selector, so both controls are visually identical.

### Fake Data Consolidated — `src/lib/fakeData.ts`
- **New file**: all fake data generation extracted from `profile.tsx` and `DrinksContext.tsx` into `src/lib/fakeData.ts`.
- Exports: `deleteAllData(userId)`, `generateFakeFriends()`, `seedRandomData(userId, catalogItems, fakeFriends)`, `buildFakeSoloSession(userId, catalog)`, `buildFakeGroupSession(userId, catalog, fakeFriends, profileDisplay)`.
- **Group sessions in seed**: `seedRandomData` now generates ~25% group sessions on drinking days. Each group session creates a `shared_sessions` row (host = current user) and links the personal session via `shared_session_id`. `shared_sessions` is inserted before `sessions` to satisfy the FK constraint.
- `profile.tsx` now imports from `fakeData.ts` — all local constant and function definitions removed.
- `DrinksContext` `createFakeSoloSession` and `createFakeGroupSession` are thin wrappers that call the builders and handle DB writes + state updates.

### BacGraph — Unit-Aware Y-Axis
- Y-axis labels switch automatically with the BAC unit setting: shows ‰ values (e.g. `0.82`) in promille mode, or % values (e.g. `0.082`) in BAC % mode.
- Unit badge (`‰` or `%`) rendered above the top gridline in a small bold label — always visible without relying on external context.
- `useBacUnit()` called inside `BacGraph` so all graph instances (home screen, session detail modal, member detail sheet) switch automatically with no call-site changes.

### FriendRecordsSheet — Unit Labels Cleaned Up
- Removed `" u"` suffix from "Biggest day" and "Avg per session" values.
- "Biggest day" label changed to `"Biggest day (units)"`.
- "Avg per session" label changed to `"Avg units / session"`.

### Bug Fixes
- **Session modal X outside safe area**: `<SafeAreaView edges={['top']}>` inside a `Modal` was not applying insets (Modals render outside the normal view hierarchy). Fixed by replacing with `<View style={[dm.screen, { paddingTop: insets.top }]}>` using `useSafeAreaInsets()`.
- **BacGraph overflow in session modal**: `dm.graphCard` had `padding: 16` on top of `dm.content`'s `paddingHorizontal: 20`, totalling 36px per side. `BacGraph` assumes 20px total. Fixed by removing horizontal padding from `graphCard` and applying `paddingHorizontal: 16` only to the title text inline.

### Profile Screen Overhaul
- **Edit mode toggle**: Header card now shows name + email + "Edit profile" button (view mode) or TextInput + avatar picker + Save/Cancel (edit mode). Avatar is only tappable in edit mode.
- **Google OAuth metadata backfill** (`AuthContext`): On login, if `display_name` or `avatar_url` is null in the DB, they're automatically populated from `user_metadata` (`full_name`/`name`, `avatar_url`/`picture`). No user action required.
- **Weekly limit defaults to 14**: `weeklyLimitInput` initialises to `'14'` instead of `''` — sensible default for first-time users.
- **Drinkdex repositioned**: Now appears immediately below the profile header card (above LIMITS), not between PREFERENCES and ACCOUNT.
- **"Required for BAC" banner**: Replaced per-field "Needed" badges with a single amber banner above all body stat fields that checks all four (weight, height, age, sex). Inputs and sex selector show amber dashed border when empty.
- **Goal reached reminder moved**: Toggle is now inside the LIMITS card alongside the weekly limit + goals, not in PREFERENCES.
- **Account card slimmed**: Only Email + Provider rows remain. User ID and Session expires rows removed (debug-level noise).
- **PREFERENCES card**: Now only contains the BAC unit toggle — no save button (immediate).

### Friends Screen
- **Scan button**: Header now has a camera-icon "Scan" button. Opens the native camera app directly — no in-app camera. Platform-aware: iOS → `camera://`, Android → `intent:#Intent;action=android.media.action.STILL_IMAGE_CAMERA;end`. `LSApplicationQueriesSchemes: ["camera"]` added to `app.json` iOS infoPlist (requires rebuild, not JS reload).
- **Fake friends**: Seeding also generates 10 in-memory fake friends (`DrinksContext.fakeFriends` state). They appear in the friends list and are tappable — opens `FriendRecordsSheet` with pre-computed stats, no Supabase fetch. Cleared on "Delete all drink records". Intentionally not persisted — gone on restart.
- `FriendRecordsSheet` now accepts an optional `preloadedRecords?: FriendRecords` prop — if present, skips the `get_friend_records` RPC call entirely.

### Drink Log Time Picker
- `DrinkLogSheet` now shows a time stepper below the volume stepper.
- ±5m buttons adjust the logged time up to 4 hours back; +5m is disabled when already at "Now".
- Tapping the time label resets to "Now".
- Passes `loggedAt?: Date` to `onConfirm` — `undefined` = now, a value = backdated.
- `logDrink` and `logApiCocktail` in `DrinksContext` accept `loggedAt?: Date` and use it for `logged_at`.

### Bug Fixes
- **`PGRST205` schema cache miss**: `AuthContext.fetchProfile` was silently falling through on any select error, causing name/avatar not to load after login. Fixed: now bails early for non-`PGRST116` errors. Immediate fix: `NOTIFY pgrst, 'reload schema'` in Supabase SQL editor reloads the PostgREST schema cache without a restart.
- **iOS hermes-engine `[CP] Copy XCFrameworks` build failure**: CocoaPods silently times out mid-download leaving the pod directory empty, then treats the empty dir as already installed on future runs. Fix: `pod cache clean 'hermes-engine' --all && pod install`. The simulator `ios-arm64_x86_64-simulator` slice must be present in the XCFramework before building. Clear DerivedData after.

### Avatar and Display Name Editing
- Profile screen now has a header card: tappable avatar with camera badge, display name TextInput, and a Save button
- `pickAvatar()`: requests permissions, launches square-crop image picker (quality 0.7), uploads to `avatars` Supabase Storage bucket via `fetch(uri).arrayBuffer()`, saves public URL to `profiles.avatar_url`, calls `refreshProfile()`
- Filename includes `Date.now()` timestamp (`avatar_{ts}.jpg`) so each upload gets a unique URL — avoids CDN serving stale cached images on re-upload
- `saveProfile()`: writes `display_name` to the `profiles` table
- `avatars` bucket is public; RLS allows own-user INSERT/UPDATE/DELETE scoped by `(string_to_array(name, '/'))[1] = auth.uid()::text`
- Storage policies added to `001_schema.sql`
- Dependencies added: `expo-image-picker`, `expo-file-system`

### Auto-End Stale Sessions (5-hour inactivity)
- **Server-side**: `auto_end_stale_sessions()` SQL function ends sessions/shared_sessions with no drink activity for 5+ hours. Scheduled every 15 minutes via Supabase Dashboard → Database → Cron Jobs. Uses `SET search_path = public` (required for SECURITY DEFINER functions to see tables).
- **Client-side**: `AppState` listener in `DrinksContext` — on every foreground resume, checks if last drink (or session start if no drinks) was ≥5h ago and silently calls `endSession()`

### Session Start Timestamp Always Visible
- "since HH:MM" label next to the End button now always shows when a session is active — was previously conditional on `sessionStats` being non-null (which required at least one drink logged)
- Time is now derived directly from `activeSession.started_at` instead of `sessionStats.startTime`

### DB Trigger: Real-Time Group Drink Stats
- `sync_shared_member_drink_stats()` AFTER INSERT OR DELETE trigger on `drink_entries` — updates `drink_count` and `units_total` in the matching `shared_session_members` row immediately on every drink log/delete
- Other group members see the change via Realtime within ~100ms (down from up to 60s)
- `updateSharedStats` in `DrinksContext` now only pushes `bac_estimate` — the trigger owns `drink_count` and `units_total`

### DB Schema Cleanup
- Removed dead `profiles` columns: `health_warnings_enabled` (bool) and `unit_display` (text) — no longer used anywhere
- Replaced `profiles_select_own` + `profiles_select_friends` RLS policies with a single `profiles_select_any` (any authenticated user can read profiles — needed for friend discovery)
- `shared_session_members` column types tightened: `units_total NUMERIC(6,2)`, `drink_count INTEGER`, `bac_estimate NUMERIC(6,4)`
- Added index `idx_shared_session_members_user_status ON shared_session_members (user_id, status)` — covers `get_my_shared_session_ids()`, `fetchPendingInvite`, and the `entries_select_shared_session` RLS policy self-join
- Migration table ordering fixed: `shared_session_members` now created immediately after `shared_sessions` (before `sessions` and `drink_entries`), so RLS policies that reference it don't fail on a fresh run

### DrinksContext Write Optimisations
- `getOrCreateSession`: replaced `await getActiveSession()` (AsyncStorage disk read) with `activeSessionRef.current` (in-memory, always in sync)
- `logApiCocktail`: catalog upsert and `getOrCreateSession` now run in `Promise.all` (parallel)
- Session creation paths: `setActiveSession` + `saveQueuedSession` AsyncStorage writes now run in `Promise.all` (parallel)

### Codebase Consistency Fixes
- `friends.tsx`: local `COLORS` object was using wrong hardcoded values — replaced with aliased imports from `@/src/lib/theme`
- `profile.tsx`: duplicate `AsyncStorage` import on lines 3 and 6 removed (was a compile error)
- `MemberDetailSheet`: Modal content now wrapped in `GestureHandlerRootView` — required because Modals render outside the app root view tree; without it, gesture handlers silently fail on Android
- `types.ts`: `Profile` — removed dead `health_warnings_enabled` and `unit_display` fields; added `push_token: string | null` and `push_platform: 'ios' | 'android' | null`
- `types.ts`: `SharedSessionMember` — added optional `id?`, `shared_session_id?`, and `updated_at?` fields to match the actual DB row shape

### Goal Reached Water Reminder
- Added a toggle in Profile → Preferences: "Goal reached reminder"
- When enabled, shows an Alert popup the first time session goals are exceeded
- Popup fires once per session (keyed by `activeSession.id`) to avoid repeat alerts
- Setting persists in AsyncStorage (`@idrinkalot/goal_water_reminder`)
- `useFocusEffect` in the home screen reloads the setting when the tab gains focus

### Friend Records Sheet
- Tapping a friend in the Friends tab opens a bottom sheet with their lifetime drinking records
- Shows: total drinks, total units, sessions, biggest day, most drinks/day, avg per session, favourite drink
- Powered by `get_friend_records(p_friend_id)` Supabase RPC (SECURITY DEFINER — verifies friendship before returning data)
- Migration: `supabase/migrations/001_schema.sql` (merged in)

### Drinking Time per Drink
- Added `drinkingMinutes(volumeMl)` helper in `src/lib/units.ts`: <50ml→2m, <150ml→5m, ≤400ml→15m, >400ml→25m
- `DrinkLogSheet` now shows a 5th stat: `~{N}m` / `drink time`, updates live as volume is adjusted
- BAC absorption window per drink is now `ABSORB_H + drinkingMinutes/60` — slower-sipped drinks produce a smoother, more realistic BAC curve
- `BacEntry` type in `units.ts` carries optional `drinking_minutes`
- `sessionEntriesWithDrinkTime` memo in `index.tsx` enriches entries before passing to all BAC functions and `BacGraph`

### Group Session Real-Time Fixes
- **Race condition at session start**: host's own `sharedMembers` row is now seeded immediately in local state — no longer waits for DB insert + Realtime bounce
- **Race condition at session join**: own member row is updated locally to `'joined'` immediately — no longer waits for the DB UPDATE to Realtime-bounce back
- **`endSession` now marks `shared_sessions.ended_at`** in the DB so sessions don't linger as active
- **`MemberDetailSheet` real-time entries**: subscribes to `drink_entries` INSERT events for the member's `session_id` — new drinks appear in the sheet live
- **Migration 005** (now merged): adds `drink_entries` to `supabase_realtime` publication + `REPLICA IDENTITY FULL`

### Stats Screen Improvements
- Added Records tab: biggest day (units + count), drink streak, sober streak, total units, avg per session, most drinks in one day, favourite drink callout
- Added Charts: "By day of week" (avg units per drinking day per weekday), "Top 5 drinks" (by logged count)
- Added timeframe selector: 7d / 30d / 3m / All — applies to Timeline, Charts, and Records tabs
- Fixed y-axis misalignment: separated bars and x-labels into independent flex rows so y-axis height exactly equals chart height
- Fixed 3-month x-label wrapping: smaller font (7px) for 3m timeframe; `numberOfLines={1}` on all bar labels

### Migration Merge
- Consolidated `001_schema.sql` through `005_*` into a single `supabase/migrations/001_schema.sql`
- Seed data (cocktail ingredients) folded into the main migration
- All incremental files deleted — only one migration file remains

### Shared Session Stats Real-Time (updateSharedStats)
- `updateSharedStats` now accepts `(bac, drinkCount, unitsTotal)` as explicit parameters instead of recomputing from `entriesRef` (which was stale due to effect flush order)
- Effect in `index.tsx` now depends on `[now, activeSharedSessionId, sessionEntries.length]` — fires every 60s for BAC decay AND immediately on drink count change

### Home Screen BAC Missing Data Hints
- StatCard now shows granular hint: "Add weight & sex", "Add weight in Profile", or "Add sex in Profile" depending on which fields are missing
- Profile tab: sex selector shows amber dashed border + "Required for BAC" badge when sex is null

### Stomach Fullness Slider
- Replaced the "Empty / Half full / Full" category buttons with a continuous slider
- `StomachContext` migrated from category enum to numeric factor (0.7–1.0)
- `@react-native-community/slider` installed

### Home Screen Quote
- Random quote from `quotes.json` moved into the header row next to the user's avatar

### Me / Group Pill Tab
- Added `sharedTab` state (`'me' | 'group'`) to the home screen
- "Me" tab shows personal session stats; "Group" tab shows `SharedSessionOverview`
- Tabs only visible when in an active shared session

### StartSessionSheet
- Replaced the inline modal for starting sessions with a proper animated draggable bottom sheet (`StartSessionSheet.tsx`)
- Supports friend selection and "notify all friends" option

---

## Initial Build

### Core Features Shipped
- Google + Apple Sign-In via Supabase Auth
- Drink catalog (beers, shots, wines, cocktails) with predefined + custom items
- CocktailDB API search and custom cocktail logging (`CocktailSearch.tsx`)
- Session tracking: start / log drinks / end session
- BAC calculation with Widmark formula and absorption model
- BAC graph (SVG, custom) with drink markers and current time indicator
- Stomach fullness factor affecting BAC
- Session goals (units, beer, shot, wine, cocktail) with live progress bars
- Weekly unit limit with progress bar on home screen
- Push notifications for session start invites (FCM v1 via Supabase Edge Function)
- Offline queue for drinks and sessions (AsyncStorage + retry on next launch)
- Stats screen: bar charts, calendar view, history list
- Friends system: QR code, friend code input, accept/decline requests
- Shared sessions: invite friends, join, real-time group stats panel
- Drinkdex: tried drinks tracker with progress bar
- Profile screen: body stats, weekly limit, default session goals, BAC unit preference
- BAC unit toggle: promille ‰ vs BAC %
- `supabase/migrations/001_schema.sql`: full schema with RLS, Realtime, SECURITY DEFINER functions
- `supabase/seed.sql`: full drink catalog seeded
