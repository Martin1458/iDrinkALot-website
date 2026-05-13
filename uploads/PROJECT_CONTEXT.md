# iDrinkALot — Project Context

## What It Is

iDrinkALot is a personal drink-tracking app built for iOS and Android. It helps users monitor their alcohol intake in real time during a session, estimate their current BAC, track long-term habits, and share sessions with friends. It is built to feel like a polished consumer app, not a dev tool.

---

## Core Purpose

- Log drinks as you go during a night out
- See live BAC estimates and sober-by time
- Set session limits and get notified when you hit them
- Share a session with friends and see each other's stats in real time
- Review history, records, and weekly charts after the fact

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 / Expo SDK 54 |
| Routing | expo-router (file-based, v6) |
| Language | TypeScript 5.9 |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) |
| Animation | react-native-reanimated v4 |
| Gestures | react-native-gesture-handler v2 |
| Images | expo-image, expo-image-picker, expo-file-system |
| Local storage | @react-native-async-storage/async-storage |
| UUIDs | expo-crypto |
| Notifications | expo-notifications + Supabase Edge Function (FCM v1) |
| QR codes | react-native-qrcode-svg |
| Charts | Custom SVG bars (react-native-svg) — no charting library |
| Styling | React Native StyleSheet only — no NativeWind / Tailwind in use |

> **Note:** nativewind and tailwindcss appear in package.json but are **not used** anywhere in the codebase. All styling is done with `StyleSheet.create`.

---

## Folder Structure

```
app/
  (auth)/          Sign-in screen
  (tabs)/
    index.tsx      Home — active session, BAC, goals, shared session
    log.tsx        Drink catalog + search
    stats.tsx      History charts, records, calendar
    profile.tsx    Settings, body stats, default goals
    friends.tsx    Friends list, QR code, invite by code
  _layout.tsx      Root layout, providers, nav config
  add-friend.tsx   Deep-link handler for friend code QR scans

src/
  components/
    BacGraph.tsx            SVG BAC curve with drink markers
    CocktailSearch.tsx      CocktailDB API search sheet
    DrinkLogSheet.tsx       Bottom sheet for confirming a drink log
    FriendInviteBanner.tsx  Pending session invite banner
    FriendRecordsSheet.tsx  Friend's lifetime stats bottom sheet
    MemberDetailSheet.tsx   Live stats sheet for a shared session member
    SharedMembersPanel.tsx  Horizontal member cards panel
    SharedSessionOverview.tsx  Group tab with Me/Group pill switcher
    StartSessionSheet.tsx   Bottom sheet to start a session + invite friends
    StatCard.tsx            Reusable stat tile (emoji, value, label)
    VenuePicker.tsx         Location + venue name picker

  context/
    AuthContext.tsx         User session, profile, sign-in/out
    BacUnitContext.tsx      BAC display unit: promille ‰ or BAC %
    DrinksContext.tsx       All drink/session state + Supabase sync
    StomachContext.tsx      Stomach fullness factor (numeric 0.7–1.0)
    TabContext.tsx          Programmatic tab navigation helper

  lib/
    notifications.ts        FCM push notification helpers
    quotes.json             Random session quotes
    storage.ts              AsyncStorage key helpers
    supabase.ts             Supabase client singleton
    theme.ts                COLORS and CATEGORY_EMOJI constants
    types.ts                All TypeScript interfaces
    units.ts                BAC formula, drink time, duration helpers

supabase/
  migrations/001_schema.sql  Full schema (single merged migration)
  seed.sql                   Drink catalog seed data
  functions/                 Edge functions (push notifications)
  config.toml                Local Supabase config
```

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | User profile, body stats, weekly limit, push token |
| `drink_catalog` | Predefined + custom drinks (ABV, volume, calories) |
| `sessions` | Drinking sessions with start/end time and venue |
| `drink_entries` | Individual drink logs linked to session + catalog item |
| `shared_sessions` | Group session host record |
| `shared_session_members` | Member rows with live BAC/units/drink_count stats |
| `friendships` | Accepted/pending/blocked friend relationships |
| `tried_drinks` | Drinkdex — first time a user tried each catalog item |
| `cocktail_ingredients` | Reference data for CocktailDB API |

All tables have Row Level Security. Users can only read/write their own data, except:
- `shared_session_members` — all members of the same shared session can read each other
- `drink_entries` — joined shared session members can read each other's session entries
- `profiles` — any authenticated user can look up profiles (needed for friend code discovery)
- `drink_catalog` — public read for predefined items; users own their custom items

Realtime is enabled on: `shared_session_members`, `drink_entries`, `friendships`

---

## Auth Flow

- Google Sign-In (iOS + Android via `@react-native-google-signin/google-signin`)
- Apple Sign-In (iOS via `expo-apple-authentication`)
- Supabase handles the session token
- `AuthContext` exposes `user`, `profile`, `session`, `signOut`, `refreshProfile`
- New users get a profile row automatically via a Postgres trigger (`handle_new_user`)

---

## BAC Calculation

Uses the Widmark formula with a time-spread absorption model:

```
r = 0.68 (male) or 0.55 (female)
alcoholGrams = units * 8
BAC = (alcoholGrams * stomachFactor) / (weightKg * 1000 * r) * 100 - 0.015 * tHours
```

Each drink has a **drinking duration** (`drinkingMinutes`) derived from volume:
- <50 ml → 2 min (shot)
- <150 ml → 5 min
- ≤400 ml → 15 min (beer/wine)
- >400 ml → 25 min (large beer)

The absorption window per drink is `ABSORB_H (0.75h) + drinkingMinutes/60`, making slow-sipped drinks give a smoother BAC curve.

`stomachFactor` ranges from 0.7 (full) to 1.0 (empty), controlled by the stomach slider on the home screen. Stored in `StomachContext` and persisted to AsyncStorage.

---

## Offline Support

Drinks and sessions are written to AsyncStorage queues before Supabase. On next launch or network restore, `flushQueue()` in `DrinksContext` retries failed inserts with `upsert`. Users see optimistic UI immediately.

---

## Shared Sessions

1. Host starts a session with invited friends → creates `shared_sessions` + `shared_session_members` rows
2. Invited friends see a `FriendInviteBanner` via Realtime INSERT subscription
3. When a friend accepts, their own personal `session` is created and linked
4. `drink_count` and `units_total` in `shared_session_members` are updated by a DB trigger (`sync_shared_member_drink_stats`) on every `drink_entries` INSERT/DELETE — propagates to other members via Realtime in ~100ms
5. `bac_estimate` is pushed every 60 seconds (and on drink count change) by `updateSharedStats` in `DrinksContext`
6. All members see live group stats via a Realtime UPDATE subscription on `shared_session_members`
7. `MemberDetailSheet` shows a member's individual drink list + BAC graph, updated in real time via a Realtime INSERT subscription on `drink_entries`
8. Sessions (individual and shared) are automatically ended after 5 hours of drink inactivity — server-side via `auto_end_stale_sessions()` cron (every 15 min), client-side via an `AppState` foreground listener in `DrinksContext`

---

## Push Notifications

- Tokens are stored in `profiles.push_token` / `profiles.push_platform`
- A Supabase Edge Function (`notify-friends`) sends FCM v1 notifications when a session starts
- Triggered client-side by calling `notifyFriendsSessionStarted()` in `notifications.ts`

---

## Key State Management Decisions

- `DrinksContext` is the single source of truth for all drink/session data
- Callbacks that need current state use `useRef` mirrors to avoid stale closures (e.g. `entriesRef`, `activeSessionRef`)
- `updateSharedStats` receives values as parameters (not reads from refs) because React flushes child effects before parent provider effects — the ref lags by one render at the point the child effect fires
- `sessionEntriesWithDrinkTime` is computed in `index.tsx` and passed to all BAC functions so `drinking_minutes` enrichment happens once

---

## Full Feature List (User-Facing)

### Home Screen
- Live BAC estimate and peak BAC using the Widmark formula with absorption model
- "Sober by" time estimate
- Session duration counter
- Stomach fullness slider (Empty ↔ Full) — adjusts BAC calculation in real time
- Weekly unit progress bar against your set limit
- Per-category session goal progress bars (beer / shot / wine / cocktail + total units)
- Scrollable drink log for the current session with swipe-to-delete
- Pending group session invite banner with Join / Decline
- Random drinking quote in the header next to your avatar
- Goal reached water reminder (optional): alert fires once when session limit is hit

### Log Screen
- Full drink catalog (beers, shots, wines, cocktails) — predefined + your custom drinks
- Live search across the catalog
- CocktailDB API search tab for thousands of named cocktails
- Per-drink detail sheet: ABV slider, volume slider, live stat row (units, kcal, ABV%, drink time)
- Time picker: ±5m stepper lets you backdate a drink up to 4 hours; defaults to "Now"
- "Add to session" logs immediately; "Log {drink}" works without an active session

### Stats Screen
- Timeframe selector: 7 days / 30 days / 3 months / All time
- **Timeline tab**: full chronological drink history grouped by session
- **Charts tab**:
  - Units by day bar chart
  - Average units by day of week (Mon–Sun)
  - Top 5 most-logged drinks
- **Records tab**: biggest day (units + count), drink streak, sober streak, total units, avg per session, most drinks in one day, favourite drink
- **Calendar tab**: monthly grid with drink days highlighted

### Profile Screen
- View / edit mode toggle: tap "Edit profile" to enter edit mode (TextInput + avatar picker with camera badge); avatar is only tappable in edit mode
- Display name and avatar photo editing (avatar uploads to Supabase Storage `avatars` bucket)
- Name and avatar auto-populated from Google OAuth metadata on first login if not already set
- Body stats: weight (kg), height (cm), age, sex — all required for accurate BAC; amber banner + dashed borders highlight missing fields
- Weekly unit limit (defaults to 14 on first setup)
- BAC display unit toggle: promille ‰ or percentage % (immediate, no save)
- Default session goals: pre-loaded at the start of every new session; goal reached reminder toggle
- Drinkdex progress card (appears below profile header)
- Sign out

### Friends Screen
- Friends list with lifetime stats access (tap any friend → `FriendRecordsSheet`)
- Add friends via QR code scan or by entering a friend code manually
- Your own QR code — tap to show full-screen modal for others to scan; Share button for link sharing
- Accept or decline incoming friend requests; long-press a friend to remove
- **Scan button**: opens the native camera app (not in-app camera) — platform-aware: iOS `camera://`, Android intent URL
- **Fake friends**: seeding via Dev Tools generates 10 in-memory fake friends shown in the list; tapping opens their pre-computed stats in `FriendRecordsSheet` with no DB fetch

### Shared / Group Sessions
- Start a session and invite friends at the same time
- Friends receive a push notification and in-app invite banner
- Me / Group pill tabs on the home screen when a group session is active
- Group tab shows a live member panel: avatar, name, drink count, units, BAC estimate
- Tap any member to open their live stats sheet (drink list + BAC graph)
- Drink count and units update across all members within ~100ms via DB trigger
- BAC estimates update across all members every 60 seconds
- Group session ends when all members end their individual sessions, or after 5 hours of inactivity

### Session Auto-End
- Sessions (individual and group) automatically end after 5 hours of drink inactivity
- Server-side cron runs every 15 minutes (catches killed apps / forgotten sessions)
- Client-side check fires instantly when the app is reopened

### Drinkdex
- Tracks the first time you tried each drink in the catalog
- Progress bar showing how many of the catalog you've tried

### Offline Support
- Drinks and sessions are saved locally first — the app works without internet
- Queued entries sync automatically when connectivity is restored

### Notifications
- Push notification when a friend starts a session and invites you (Android FCM working; iOS APNs pending)

---

## Pre-Production Checklist

- [ ] **`APNS_ENVIRONMENT=production`** — set this in Supabase → Edge Functions → notify-friends → Secrets. Sandbox tokens only work with debug builds. TestFlight and App Store builds use the production APNs endpoint (`api.push.apple.com`). Wrong value causes silent `BadDeviceToken` rejections.
- [ ] **APNs key verified** — confirm on developer.apple.com → Keys that the key has APNs enabled, Key ID matches `APNS_KEY_ID`, Team ID matches `APNS_TEAM_ID`, and bundle ID matches `APNS_BUNDLE_ID`.
- [ ] **Push Notifications capability** — Identifiers → your app → Capabilities → Push Notifications must show "Configured".
- [ ] **`avatars` Storage bucket** — create in Supabase dashboard → Storage → New bucket, name `avatars`, set to Public. Avatar upload silently fails without it.
- [ ] **Cron job** — Supabase dashboard → Database → Cron Jobs → New cron job: name `auto-end-stale-sessions`, schedule `*/15 * * * *`, command `SELECT auto_end_stale_sessions()`, schema `postgres`.
- [ ] **Full DB migration** — reset and run `001_schema.sql` from scratch to verify the migration runs clean end-to-end.

---

## Current Production State

- Android APK built and working
- Both iOS and Android tested on real devices
- Real-time group sessions functional; drink_count/units_total driven by DB trigger (~100ms latency)
- BAC display requires weight + sex to be set in Profile
- Stats screen has Timeline / Charts / Records / Calendar tabs with 7d/30d/3m/All timeframe selector
- Profile screen supports avatar upload (Supabase Storage `avatars` bucket) and display name editing
- Sessions auto-end after 5h inactivity (server cron + client AppState listener)
- iOS push notifications (APNs) not yet working — Android FCM functional
