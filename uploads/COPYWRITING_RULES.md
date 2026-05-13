# iDrinkALot — Copywriting Rules

## Voice & Tone

iDrinkALot speaks like a smart, self-aware friend who's also out drinking with you — not a health app, not a nanny, not a brand. The tone is:

- **Direct.** Short sentences. No filler words.
- **Warm but not sappy.** Friendly without being cheesy.
- **Honest about what the app is.** It tracks drinking. It doesn't pretend you're doing something virtuous.
- **Gently responsible when it matters.** BAC warnings and goal reminders land softly, never preachy.

---

## Capitalization

- Screen titles: **Title Case** ("Session goals", "Body stats" — actually **Sentence case** for section labels inside screens)
- Section labels (the small uppercase caps above cards): **ALL CAPS** with letter-spacing (e.g. PREFERENCES, BODY STATS, DEV TOOLS)
- Button text: **Title Case** or **Sentence case** depending on context — primary CTAs use Sentence case ("Add to session", "Save preferences")
- Tab labels: **Title Case** (Home, Log, Stats, Profile, Friends)
- Stat labels: **lowercase** (units, kcal, ml, drink time)

---

## UI Labels

### Actions
- Logging a drink to an active session → **"Add to session"**
- Logging a drink without an active session → **"Log [DrinkName]"** (e.g. "Log Pilsner")
- Starting a session → **"Start session"**
- Ending a session → **"End session"**
- Accepting a group invite → **"Join"**
- Declining a group invite → **"Decline"**
- Removing a friend → **"Remove"** (in Alert) — never "unfriend"
- Saving profile data → **"Save preferences"** / **"Save body stats"** (separate buttons)

### States
- Session currently running → **"Session running"**
- No active session → **"No active session"**
- Session ended → no special label needed, just the timestamp
- BAC: currently sober → **"Sober"**
- BAC: computing → show `—` not "calculating"

### Goal states
- Goal not set → show **"—"** not "No limit" or "Unlimited"
- Goal in progress → show `{current}/{limit}` (e.g. "2/4")
- Goal hit → use `COLORS.red` for the value, no extra label needed

### Empty states
- No friends yet → **"Share your QR code to add friends"**
- No drinks logged → **"No drinks logged yet"**
- No session data → **"No session data available"**

---

## Numbers & Units

- Units: always show one decimal place for non-integer values (e.g. **"2.5 units"**, **"1.0 units"** not "1 units")
- BAC in promille: **"0.82 ‰"** — two decimal places, space before ‰
- BAC as percentage: **"0.082%"** — three decimal places
- Volume: **"500 ml"** (lowercase, space before unit)
- Calories: **"215 kcal"** (lowercase, space before unit)
- ABV: **"4.4%"** (no space before %)
- Duration: **"1h 30m"** or **"45m"** (h and m, no colon format)
- Time of day: use locale 12/24h via `toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })`

---

## Drink Naming

- Use the drink's catalog `name` field as-is — it's already correctly cased
- Category labels: **"Beer"**, **"Shot"**, **"Wine"**, **"Cocktail"** (Title Case)
- Category is capitalized for display: `drink.category.charAt(0).toUpperCase() + drink.category.slice(1)`

---

## Error Messages

Keep errors short and honest. No stack traces, no technical jargon.

| Scenario | Copy |
|---|---|
| Save failed | `"Could not save."` |
| Delete failed | `"Could not delete records."` |
| Friend code not found | `"No user found with that code."` |
| Already friends | `"Already friends or request pending."` |
| Friend records failed | `"Could not load records"` |
| Generic network error | `"Something went wrong. Try again."` |

Never say "An error occurred". Say what couldn't happen.

---

## Success / Confirmation Messages

Short and done. No enthusiasm overload.

| Scenario | Copy |
|---|---|
| Body stats saved | `"Body stats updated."` |
| Preferences saved | `"Preferences updated."` |
| Friend request sent | `"Request sent to {name}!"` |
| Random data generated | `"Random data generated!"` |
| All data deleted | `"All drink records deleted."` |

---

## Hints / Helper Text

- Field hints go below the field in a smaller muted style
- Keep to one sentence max
- Examples: `"Pre-loaded at the start of each session. Leave blank to disable."`, `"Applies to BAC readings across the app"`, `"Long-press a friend to remove them"`

---

## BAC & Health Copy

The app shows BAC estimates. Always frame them as estimates, not medical measurements.

- "BAC is an estimate" (not "Your BAC is X")
- Stomach factor disclaimer: **"Stomach factor assumed empty — BAC is an estimate"** (for other users in group sessions where you don't know their actual stomach state)
- Missing body data: **"BAC unavailable — member hasn't set weight & sex"**
- Sober time: **"Sober by {time}"** — not "You'll be sober at..." — keep it compact

---

## Goal Reached Reminder

When the water reminder fires:
- Title: `"Goal reached! 💧"`
- Body: `"You've hit your session limit — great effort! Time to switch to water and take care of yourself."`
- Button: `"On it!"`

Tone: affirming (not scolding), practical (not medical).

---

## Section Labels (the small uppercase ones)

```
PREFERENCES
BODY STATS
DEV TOOLS
DRINKDEX
FRIENDS · {count}
FRIEND REQUESTS
```

These are visually small (13px, 40% opacity, letter-spaced) and serve as dividers, not headings. Keep them to 1–3 words.

---

## Quotes (Home Screen)

Quotes are loaded from `src/lib/quotes.json`. They display next to the user's avatar at the top of the home screen. They should be:
- Short (under 60 characters ideally)
- Darkly funny, self-aware, or nostalgic about drinking
- Never health-advice flavored
- Never corporate / brand-y

---

## Things to Avoid

- **Don't write "successfully"** — "Saved" is better than "Successfully saved"
- **Don't write "please"** in UI copy — it's passive; just state what to do
- **Don't use exclamation marks on errors** — only on genuine success moments
- **Don't use ellipsis (...) on button labels** — if an action is async, use a spinner instead
- **Don't capitalize random words for emphasis** — use bold in explanatory text if needed, not random caps
- **Don't write "tap here to..."** — the tap target is self-evident from the button
- **Don't say "invalid"** — say what the actual problem is ("No user found with that code.")
