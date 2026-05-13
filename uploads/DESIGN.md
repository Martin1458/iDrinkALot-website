# iDrinkALot — Design Reference

Single source of truth for visual design, UI patterns, voice, and copy. Supersedes `DESIGN_RULES.md` and `COPYWRITING_RULES.md` where they overlap — those files remain for backward compatibility but this document is the canonical reference.

---

## Overall Feel

iDrinkALot is a **warm, slightly retro consumer app**. Not a health tool, not a tracker in the clinical sense — it feels like something you'd use with friends on a night out. The palette is cream/amber with dark navy and warm orange. Typography is heavy and confident. Cards feel tactile.

**What it is not:** sterile, clinical, corporate, nannying. It knows what it is.

---

## Color System

All colors from `src/lib/theme.ts`. Never hardcode hex values — always import `COLORS`.

```typescript
export const COLORS = {
  background:      '#fff9e3',          // Warm cream — screen/page backgrounds
  primary:         '#081126',          // Dark navy — headings, body text, icons
  accent:          '#ea7a53',          // Warm orange — CTAs, active states, highlights
  accentDark:      '#c43c1a',          // Darker orange — pressed/active states
  muted:           '#f6eecf',          // Light amber — secondary backgrounds, avatar fallbacks
  mutedForeground: 'rgba(0,0,0,0.55)', // Subdued text — labels, hints, captions
  border:          'rgba(0,0,0,0.1)',  // Dividers, card outlines
  card:            '#fff8e7',          // Card surfaces — slightly warmer than background
  green:           '#16a34a',          // Success, sober status
  red:             '#ef4444',          // Danger, exceeded goals, high BAC
}
```

### Accent Color Usage

`#ea7a53` signals **active** or **action required**:
- Session running indicator (dot + text)
- Primary CTA buttons
- Active/selected pill or tab state
- Goal exceeded highlight
- Live status indicators

Do **not** use accent for passive or informational content.

### Danger / Warning States

| State | Color |
|---|---|
| Exceeded goal / high BAC | `COLORS.red` (`#ef4444`) |
| Missing required profile data (BAC) | Amber: `#f59e0b` border, `#fef9c3` bg, `#b45309` text |
| Health nudges / soft warnings | Amber palette — red is reserved for critical |

---

## Typography

System fonts only. No custom font families.

| Role | Size | Weight |
|---|---|---|
| Page title | 28 | 800 |
| Section heading | 16–20 | 800 |
| Card title / drink name | 16–22 | 700–800 |
| Body / label | 13–15 | 600–700 |
| Hint / caption | 11–12 | 500–600 |
| Stat value (large hero number) | 20–32 | 800 |

- `800` = hero numbers, screen titles, drink names
- `700` = button text, section labels, card titles
- `600` = secondary labels, list items
- `500` = hints, metadata, timestamps

**Never** use weights below 500. Light text on cream becomes unreadable.

---

## Spacing & Layout

| Element | Value |
|---|---|
| Screen horizontal padding | 20–24px |
| Card internal padding | 14–16px |
| Section gap | 12–20px |
| Card border radius | 14–16px |
| Button border radius | 14–18px |
| Pill / badge border radius | 8–10px |
| Large hero button (confirm, save) | 16px |

Use `gap` in flex containers rather than individual margins where possible.

---

## Component Patterns

### Cards

Standard card:
```typescript
{
  backgroundColor: COLORS.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  padding: 16,
}
```

Flush card (list items fill edge to edge):
```typescript
{
  backgroundColor: COLORS.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  overflow: 'hidden',
}
```

### Buttons

**Primary CTA (confirm, save, add to session):**
```typescript
{
  backgroundColor: COLORS.accent,
  borderRadius: 16,
  paddingVertical: 18,
  alignItems: 'center',
}
// Text: fontSize: 16, fontWeight: '800', color: '#fff'
```

**Secondary / outline:**
```typescript
{
  borderWidth: 1.5,
  borderColor: COLORS.border,
  backgroundColor: COLORS.background,
  borderRadius: 12,
  paddingVertical: 12,
}
```

**Active / selected pill:**
```typescript
{ borderColor: COLORS.accent, backgroundColor: COLORS.accent }
// Text: color: '#fff'
```

**Destructive (delete, sign out, end session):**
```typescript
{ backgroundColor: COLORS.red }
// Text: color: '#fff', fontWeight: '700'
```

**Disabled:** `opacity: 0.45` — do not change the color, only opacity.

### Section Headers (small uppercase dividers)

```typescript
{
  fontSize: 13,
  fontWeight: '600',
  color: COLORS.primary,
  opacity: 0.4,
  letterSpacing: 1,
  textTransform: 'uppercase',
}
```
Examples: `PREFERENCES`, `BODY STATS`, `DEV TOOLS`, `DRINKDEX`, `FRIENDS · 3`

### Stats Row (value + label boxes in a row)

Used in DrinkLogSheet, MemberDetailSheet, stat cards:
```
[value]    [value]    [value]
[label]    [label]    [label]
```
- Value: 17–20px, weight 800, `COLORS.primary`
- Label: 11px, weight 600, `COLORS.mutedForeground`
- Separated by 1px `COLORS.border` vertical dividers
- Each cell: `flex: 1, alignItems: 'center'`
- Container: `flexDirection: 'row'`, card background, 16px padding

### Pill Tab (Me / Group, timeframe selectors)

- Container: `flexDirection: 'row'`, `borderRadius: 10`, `backgroundColor: COLORS.muted`, `padding: 3`
- Pill: `borderRadius: 8`, `paddingHorizontal: 14`, `paddingVertical: 6`
- Active pill: `backgroundColor: COLORS.accent`, text `color: '#fff'`
- Inactive pill: transparent, text `color: COLORS.primary`

### Bottom Sheets

All bottom sheets use `Modal` with an animated slide-up:
- Drag handle: 40×4px, `borderRadius: 2`, `backgroundColor: COLORS.border`, centered at top
- Sheet background: `COLORS.background`
- Top corners: `borderTopLeftRadius: 28, borderTopRightRadius: 28`
- Bottom safe padding: 44px (iPhone home indicator clearance)
- Max height: 85–92% of screen height
- Backdrop: `Animated.View`, `backgroundColor: 'rgba(0,0,0,0.4)'`, fades in with sheet
- Wrap content in `GestureHandlerRootView` — Modals render outside the app root tree

Dismiss gesture: pan down with `translationY > 80 || velocityY > 800`.

### Avatar / Profile Images

- List row avatar: 48×48px, `borderRadius: 24`
- Sheet / detail avatar: 56×56px, `borderRadius: 28`
- Profile header avatar: 80×80px, `borderRadius: 40`
- Fallback: initials from `display_name`, weight 700, `COLORS.mutedForeground` on `COLORS.muted` background
- Images: `expo-image` with `contentFit="cover"`
- Camera badge on editable avatars: 24×24px circle, `COLORS.accent` background, bottom-right corner

### Progress Bars

- Track: `COLORS.muted`, height 6–8px, `borderRadius: 4`
- Fill: `COLORS.accent` (normal) or `COLORS.red` (exceeded)
- Never animate the fill — update synchronously

### BAC Graph

- Custom View-based renderer (`BacGraph.tsx`) — no SVG library. Each curve segment is a rotated `<View>` rectangle; grid lines, markers, and the "now" line are absolutely positioned `<View>` elements.
- Line color: `COLORS.accent`
- Grid lines: `COLORS.border`
- Drink markers: thin vertical lines at each drink's `logged_at` time (`COLORS.accent`, 35% opacity)
- Current time indicator: vertical green line (`COLORS.green`)
- X-axis: clock-time labels; Y-axis: BAC values with a unit badge (‰ or %) above the top gridline
- **Unit-aware**: calls `useBacUnit()` internally — all instances switch between promille and BAC % with no call-site changes
- Width is always `SCREEN_W - 40`. Cards containing the graph must have zero horizontal padding beyond 20px per side or the graph overflows.

---

## Screen-by-Screen UI Overview

### Home (index.tsx)

- Header row: avatar (tappable → profile) + random quote
- **Stomach slider** (when session active): labeled "Empty ↔ Full", drives BAC calculation
- **Session banner**: accent-bordered card showing BAC, peak BAC, sober-by time, session duration
- **Me / Group pill tabs**: visible only during an active shared session
  - Me tab: personal stats, goals, drink list
  - Group tab: `SharedSessionOverview` with member cards
- **Current session section**: "since HH:MM" timestamp + red End button
- **Weekly unit progress bar**
- **Session goal progress bars**: per-category (beer/shot/wine/cocktail) + total units
- **Drink entry list**: each entry shows emoji + name + units + time + swipe-to-delete
- **Pending invite banner** (`FriendInviteBanner`): appears above session when invited to group

### Log (log.tsx)

- Drink catalog organized by category tabs (Beer / Shot / Wine / Cocktail)
- Search bar filters the catalog live
- CocktailDB search tab for API-sourced cocktails
- Tapping a drink opens `DrinkLogSheet` (bottom sheet)
  - ABV slider, volume slider, stat row (units, kcal, ABV%, drink time)
  - "Add to session" or "Log {DrinkName}" CTA
  - "Start a session first" prompt when no active session

### Stats (stats.tsx)

- Timeframe selector pill: 7d / 30d / 3m / All
- **Timeline tab**: chronological drink history list grouped by session
- **Charts tab**:
  - "Units by day" bar chart (days of current timeframe on x-axis)
  - "By day of week" bar chart (Mon–Sun average units per drinking day)
  - "Top 5 drinks" bar chart (by logged count)
- **Records tab**: biggest day (units + drink count), drink streak, sober streak, total units, avg units/session, most drinks in one day, favourite drink callout
- **Calendar tab**: month grid, days with drinks highlighted in accent color

### Profile (profile.tsx)

Section order (top to bottom):
1. **Profile header card**: avatar + name + email in view mode. "Edit profile" button switches to edit mode: TextInput + tappable avatar (camera badge) + Save/Cancel. Avatar picker only active in edit mode.
2. **Drinkdex card**: tried/total progress bar — immediately below profile card.
3. **LIMITS**: weekly unit limit input + 5 goal steppers (units/beer/shot/wine/cocktail) + goal reached reminder toggle. "Save limits" button.
4. **BODY STATS**: amber banner if any field missing ("Fill in all fields below for accurate BAC readings"). Weight / height / age inputs (amber dashed border when empty) + Male/Female sex selector (amber dashed border when null). "Save body stats" button.
5. **PREFERENCES**: BAC unit toggle (Promille ‰ / BAC %) — immediate, no save button.
6. **ACCOUNT**: Email + Provider rows only.
7. **Dev tools**: Generate 50 days of data (purple) + Delete all drink records (red).
8. **Sign out** button.

### Friends (friends.tsx)

- Friends list: avatar + name + status; long-press to remove
- Your QR code: tappable → full-screen QR modal for sharing
- "Add by code" input field
- Friend requests section: accept / decline
- Tapping a friend → `FriendRecordsSheet` (their lifetime drinking records)

---

## Voice & Tone

- **Direct.** Short sentences. No filler words.
- **Warm but not sappy.** Friendly without being cheesy.
- **Honest.** It tracks drinking. It doesn't pretend you're doing something virtuous.
- **Gently responsible when it matters.** BAC warnings and goal reminders land softly, never preachy.

---

## Copy Conventions

### Capitalisation

| Context | Style |
|---|---|
| Screen titles | Title Case |
| Section labels (ALLCAPS dividers) | ALL CAPS with letter-spacing |
| Primary CTA buttons | Sentence case ("Add to session") |
| Tab labels | Title Case |
| Stat labels | lowercase (units, kcal, ml) |

### Key UI Labels

| Scenario | Label |
|---|---|
| Log drink to active session | "Add to session" |
| Log drink, no session | "Log {DrinkName}" |
| Start session | "Start session" |
| End session | "End session" |
| Accept group invite | "Join" |
| Decline group invite | "Decline" |
| Remove friend (Alert) | "Remove" — never "unfriend" |
| Save body stats | "Save body stats" |
| Save preferences | "Save preferences" |
| Session running | "Session running" |
| BAC currently sober | "Sober" |
| BAC computing (missing data) | "—" — never "calculating" |
| Goal not set | "—" — never "No limit" |

### Numbers & Units

| Value | Format |
|---|---|
| Units | `2.5 units` — one decimal, space |
| BAC (promille) | `0.82 ‰` — two decimals, space before ‰ |
| BAC (percent) | `0.082%` — three decimals |
| Volume | `500 ml` — lowercase, space |
| Calories | `215 kcal` — lowercase, space |
| ABV | `4.4%` — no space |
| Duration | `1h 30m` or `45m` |
| Time of day | locale `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })` |

### Errors

Short and honest. Never "An error occurred." Say what failed.

| Scenario | Copy |
|---|---|
| Save failed | `"Could not save."` |
| Delete failed | `"Could not delete records."` |
| Friend code not found | `"No user found with that code."` |
| Already friends | `"Already friends or request pending."` |
| Generic network error | `"Something went wrong. Try again."` |

### Empty States

| Context | Copy |
|---|---|
| No friends | `"Share your QR code to add friends"` |
| No drinks logged | `"No drinks logged yet"` |
| No session data | `"No session data available"` |

### BAC Copy

- Frame BAC as estimates, not measurements
- Missing profile data: `"Add weight & sex"`, `"Add weight in Profile"`, `"Add sex in Profile"` (granular, not generic)
- Other users in group: `"Stomach factor assumed empty — BAC is an estimate"`
- Sober time: `"Sober by {time}"` — not "You'll be sober at..."

### Things to Avoid

- ❌ "successfully" → ✅ just "Saved" / "Updated"
- ❌ "please" in UI copy
- ❌ Exclamation marks on errors
- ❌ Ellipsis on button labels — use a spinner for async
- ❌ "tap here to..." — the target is self-evident
- ❌ "invalid" — describe the actual problem
- ❌ Random capitalisation for emphasis

---

## Emoji

- Category icons from `CATEGORY_EMOJI` in `theme.ts`: `beer: '🍺'`, `shot: '🥃'`, `wine: '🍷'`, `cocktail: '🍸'`
- Fallback drink emoji: `'🍶'`
- Use as leading visual elements in stat cards, goal rows, section titles
- Avoid in body text or explanatory copy
- Acceptable in headers when they add warmth (`'🎯 Session goals'`)

---

## Quotes (Home Screen)

Loaded from `src/lib/quotes.json`. Display next to the user's avatar in the home header.

Rules:
- Under 60 characters
- Darkly funny, self-aware, or nostalgic about drinking
- Never health-advice flavored
- Never corporate
