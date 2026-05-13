# iDrinkALot — Design Rules

## Visual Identity

iDrinkALot has a warm, slightly retro feel. The palette is cream/amber with a dark navy primary and a warm orange accent. It should feel approachable and social, not clinical or sterile.

---

## Color System

All colors come from `src/lib/theme.ts`. Never hardcode hex values in components — always import `COLORS`.

```typescript
export const COLORS = {
  background:      '#fff9e3',   // Warm cream — page/screen backgrounds
  primary:         '#081126',   // Dark navy — headings, body text, buttons
  accent:          '#ea7a53',   // Warm orange — CTAs, active states, highlights
  accentDark:      '#c43c1a',   // Darker orange — pressed states
  muted:           '#f6eecf',   // Light amber — secondary backgrounds, avatars
  mutedForeground: 'rgba(0,0,0,0.55)', // Subdued text — labels, hints
  border:          'rgba(0,0,0,0.1)',  // Dividers, card borders
  card:            '#fff8e7',   // Slightly warmer than background — card surfaces
  green:           '#16a34a',   // Success states, sober status
  red:             '#ef4444',   // Danger, exceeded goals, BAC warnings
}
```

**Exception:** Some screens (friends.tsx, profile.tsx) define their own local `COLORS` object that mirrors the same values. Keep them consistent.

---

## Typography

No custom fonts — system fonts only. Weights and sizes:

| Role | Size | Weight |
|---|---|---|
| Page title | 28 | 800 |
| Section heading | 16–20 | 800 |
| Card title / name | 16–22 | 700–800 |
| Body / label | 13–15 | 600–700 |
| Hint / caption | 11–12 | 500–600 |
| Stat value (large) | 20–32 | 800 |

- `fontWeight: '800'` = hero numbers, screen titles, drink names
- `fontWeight: '700'` = button text, section labels, card titles
- `fontWeight: '600'` = secondary labels, list items
- `fontWeight: '500'` = hints, metadata

Never use weights below 500 in the app. Light text at low weight on cream becomes unreadable.

---

## Spacing & Layout

- Screen horizontal padding: **20–24px**
- Card padding: **14–16px**
- Gap between sections: **12–20px**
- Border radius for cards: **14–16px**
- Border radius for buttons: **14–18px**
- Border radius for pill/badge elements: **8–10px**
- Border radius for large hero buttons (confirm, save): **16px**

Use `gap` in flex containers rather than individual margins where possible.

---

## Cards

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

Cards with no internal padding (list items flush to edges):
```typescript
{
  backgroundColor: COLORS.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: COLORS.border,
  overflow: 'hidden',
}
```

---

## Buttons

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

**Destructive (delete, sign out):**
```typescript
{ backgroundColor: '#ef4444' }
```

**Disabled state:** `opacity: 0.45` or `opacity: 0.6` — do not change the color.

---

## Bottom Sheets

All bottom sheets are rendered as `Modal` with the sheet sliding up from the bottom. Standard structure:

- Drag handle: 40×4px, borderRadius 2, `COLORS.border` colored, centered
- Sheet bg: `COLORS.background`
- Top corners: `borderTopLeftRadius: 28, borderTopRightRadius: 28`
- Bottom padding: 44px (clears home indicator on iPhone)
- Max height: 85–92% of screen

The backdrop is a separate `Animated.View` with `backgroundColor: 'rgba(0,0,0,0.4)'` that fades in with the sheet.

---

## Stats Row (stat boxes in a row)

Used in `DrinkLogSheet`, `MemberDetailSheet`, stats cards:
```
[value]
[label]
```
- Value: 17–20px, weight 800, `COLORS.primary`
- Label: 11px, weight 600, `COLORS.mutedForeground`
- Divided by 1px `COLORS.border` vertical lines
- Each box: `flex: 1, alignItems: 'center'`
- Container: `flexDirection: 'row'`, card background, 16px padding

---

## Emoji Usage

- Category icons are defined in `CATEGORY_EMOJI` from theme: `beer: '🍺', shot: '🥃', wine: '🍷', cocktail: '🍸'`
- Fallback drink emoji: `'🍶'`
- Use emojis as leading visual elements in stat cards, goal rows, section titles
- Avoid using emojis in body text or explanatory copy
- Emojis in headers/titles: acceptable when they add warmth (e.g., `'🎯 Session goals'`)

---

## Session Accent Color Usage

The accent color `#ea7a53` is used for:
- Session running indicator (dot + text)
- Active session banner border and background tint
- Goal exceeded states
- Primary CTA buttons
- Active toggle/pill states
- Live status indicators

Do **not** use the accent color for passive or informational content. It signals "active" or "action required".

---

## Danger / Warning States

- **Exceeded goals / high BAC:** `COLORS.red` (`#ef4444`)
- **Missing required data (BAC body stats):** amber — `#f59e0b` border, `#fef9c3` badge background, `#b45309` text
- **Warnings / health nudges:** amber palette (not red — red is reserved for critical states)

---

## Avatar / Profile Images

- Avatar circle: 48×48px (list rows), 56×56px (sheets), 28px border radius
- Fallback: initials from display_name, weight 700, `COLORS.mutedForeground` on `COLORS.muted` background
- Images use `expo-image` with `contentFit="cover"`

---

## Progress Bars / Goal Tracks

```typescript
track: { height: 8, borderRadius: 4, backgroundColor: COLORS.muted, overflow: 'hidden' }
fill:  { height: 8, borderRadius: 4, backgroundColor: COLORS.accent }
fillDanger: { backgroundColor: COLORS.red }
```

Width is set as a percentage: `width: \`${pct * 100}%\` as any`

---

## Charts (Stats Screen)

- Bar charts are custom — no charting library
- Bar height is proportional within a fixed container height (`CHART_H = 180–200`)
- Y-axis labels are in a separate column (`width: 36`, aligned right)
- Bars and x-labels are **separate** flex rows to avoid y-axis misalignment
- `chartWrap`: `flexDirection: 'row', alignItems: 'flex-start'`
- Bar label font size: 9 normally, 7 for 3-month view or >14 bars
- All bar label Text nodes use `numberOfLines={1}` to prevent wrapping

---

## Segmented Controls / Pill Tabs

Pattern used for tab switches (Me/Group, timeframe selectors):
```typescript
<View style={segmentedContainer}>
  {options.map(opt => (
    <TouchableOpacity
      key={opt}
      style={[segmentBtn, selected === opt && segmentBtnActive]}
      onPress={() => setSelected(opt)}
    >
      <Text style={[segmentText, selected === opt && segmentTextActive]}>
        {opt}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```
- Container: `flexDirection: 'row'`, light bg, `borderRadius: 12`
- Active pill: `backgroundColor: COLORS.accent`
- Active text: `color: '#fff'`
- Inactive text: `COLORS.mutedForeground`

---

## Icons

Use `@expo/vector-icons` / `Ionicons` for system icons. Common icons:
- `chevron-forward` — navigable rows
- `qr-code` — QR code button
- `person-add` — add friend
- `close` / `✕` — dismiss

---

## Loading States

- Use `ActivityIndicator` with `color={COLORS.accent}` for async operations
- Disabled buttons use `opacity: 0.45–0.6`, never change color or hide
- Never show a loading spinner on screen mount if cached data is available — show cached data immediately and update silently

---

## Animations

- Sheet slide-in duration: **280–340ms**, `Easing.out(Easing.cubic)`
- Sheet slide-out duration: **220–280ms**, `Easing.in(Easing.cubic)`
- Backdrop fade: **200ms**
- Do not use spring animations for sheet transitions — cubic easing feels more controlled

---

## Screen-Level Layout

Every tab screen:
```
SafeAreaView edges={['top']}
  ScrollView (or flat content)
    Header row (title + actions)
    Content sections
```

Avoid `edges={['bottom']}` on tabs — the tab bar handles bottom safe area.
