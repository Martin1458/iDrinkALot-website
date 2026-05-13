# iDrinkALot — Output Formats

Reference for how specific data types are formatted for display throughout the app.

---

## BAC

BAC is stored as a decimal (e.g. `0.082`). Display format depends on `bacUnit` from `BacUnitContext`.

| Unit setting | Display | Function |
|---|---|---|
| `'promille'` | `"0.82 ‰"` | `fmtBac(value)` |
| `'bac'` | `"0.082%"` | `fmtBac(value)` |

`fmtBac` is exposed by `useBacUnit()` and handles both cases. Always use `fmtBac` — never format BAC manually.

The BAC warn threshold (turns red) is: `bac * 10 > 0.5` (i.e. above 0.05% or 0.5‰).

---

## Units (alcohol units)

Stored as `numeric(4,2)` in DB. Display:

```typescript
formatUnits(units: number): string
// 1 → "1 unit"
// 2.5 → "2.5 units"
// 0 → "0.0 units"
```

In stat boxes / compact contexts: `units.toFixed(2)` for the value, `"units"` as the label.
In lists / summaries: `formatUnits(e.units_consumed)`.

---

## Duration

Session duration is in milliseconds. Use:

```typescript
formatDuration(ms: number): string
// 3600000  → "1h 0m"
// 5400000  → "1h 30m"
// 1800000  → "30m"
```

---

## Sober Time

```typescript
formatSoberTime(hoursFromNow: number): string
// 0 or negative → "Sober now"
// 1.5           → "10:30 PM"  (locale 12/24h)
```

---

## Date / Time

For drink log timestamps in list items:
```typescript
new Date(e.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
// → "09:45" or "9:45 AM"
```

For session start times (same format).

For dates in chart x-axis labels (stats screen):
- 7d: `"Mon"`, `"Tue"` etc (short weekday)
- 30d: `"Apr 1"`, `"Apr 8"` etc (month + day of week start)
- 3m: `"Jan"`, `"Feb"` etc (month abbrev) or week numbers
- All: `"2024"`, `"2025"` etc (year)

---

## Volume

Stored as integer millilitres. Display:
- In stat boxes: `{volumeMl}` as the value, `"ml"` as the label
- In volume stepper: `"Volume: {volumeMl} ml"`

---

## ABV

Stored as `numeric(5,2)`. Display:
- `"{abv}%"` — e.g. `"4.4%"` (no toFixed needed, DB value is already 2dp)

---

## Calories

Stored as integer. Display:
- In stat boxes: `{calories}` as the value, `"kcal"` as the label
- Computed: `Math.round(drink.default_calories * (volumeMl / drink.default_volume_ml))`

---

## Drinking Time

Computed from `drinkingMinutes(volumeMl)`. Display:
- In DrinkLogSheet stat box: `"~{N}m"` as value, `"drink time"` as label
- E.g. `"~15m"` for a beer

---

## BAC Graph Y-Axis

BAC is displayed in promille units on the graph (×10 scaling factor):
- `FACTOR = 10` — multiply BAC by 10 for the axis
- Y-tick labels: `promille.toFixed(yStep < 0.1 ? 2 : 1)`
- E.g. BAC `0.082` → `"0.8"` on axis at normal scale, `"0.82"` at fine scale

---

## Friend Code

8-character uppercase alphanumeric. Stored in `profiles.friend_code`.
Display: as-is, e.g. `"A3B7F2D9"`.

---

## Drink Count

Integer. No special formatting needed. Pluralized in banners:
```typescript
`${count} drink${count !== 1 ? 's' : ''}`
// 1 → "1 drink"
// 3 → "3 drinks"
```

---

## Percentages (stats, goals, drinkdex)

Progress bars use raw percentage as `width`:
```typescript
width: `${Math.min(pct * 100, 100)}%` as any
```

For display text in records: `Math.round(pct * 100)` → `"73%"`

---

## Weekly Limit Progress

`progressPercent = Math.min((weeklyUnits / weeklyLimit) * 100, 100)`

Bar fill uses `progressPercent`. The label shows actual units vs limit:
```
{weeklyUnits.toFixed(1)} / {weeklyLimit} units
```

---

## Session Goal Display

In goal rows (`DrinkLogSheet`, home screen):
```typescript
key === 'units'
  ? current.toFixed(1)   // "2.5"
  : String(current)       // "3"
// always shown as: "{current}/{limit}"
```

---

## Stat Card Values (`StatCard` component)

The `StatCard` component takes a `value: string` — pre-format before passing:
```typescript
// BAC
<StatCard label="Current BAC" value={canComputeBAC ? fmtBac(bac) : '—'} />

// Units
<StatCard label="Units" value={formatUnits(totalUnits)} />

// Counts
<StatCard label="Drinks" value={String(entries.length)} />
```

Always show `'—'` (em dash) when a value is unavailable, never `null`, `"N/A"`, or `"0"`.

---

## Timeframe Selector Labels

Displayed in the segmented control on the stats screen:
- `'7d'` → `"7d"`
- `'30d'` → `"30d"`
- `'3m'` → `"3m"`
- `'All'` → `"All"`

---

## Chart Bar Tooltip Values

Not shown as tooltips (no tooltip implementation). Values appear as bar tops or in the selected state — use the same unit format as the axis.

---

## Records (Stats Screen)

| Record | Format |
|---|---|
| Biggest day (units) | `"{N} units"` |
| Drink streak | `"{N} days"` or `"{N} day"` |
| Sober streak | `"{N} days"` |
| Total units | `"{N}"` (no label needed, shown in card) |
| Avg per session | `"{N.N} u"` |
| Most drinks / day | `"{N}"` |
| Favourite drink | Name string from catalog |
