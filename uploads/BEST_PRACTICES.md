# iDrinkALot — Best Practices

## General Principles

- Write the minimum code that solves the problem. No speculative abstractions.
- Prefer editing existing files over creating new ones.
- No comments unless the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).
- Never explain WHAT code does — names do that. Never reference the task or issue in comments.
- No backwards-compatibility shims, re-exports, or `// removed` comments for deleted code.

---

## TypeScript

- All types live in `src/lib/types.ts` for data models
- Component-local types (props, internal state shapes) stay in the component file
- Use `as const` for literal arrays/tuples
- Prefer `interface` over `type` for object shapes
- Never use `any` unless interfacing with untyped Supabase returns — cast immediately with `as unknown as YourType`
- Supabase joined queries return single relations as object OR array depending on FK inference — always handle both: `const item = Array.isArray(raw) ? raw[0] : raw`

---

## React / React Native

### State
- Put state as close to where it's used as possible. Only lift to context when multiple screens need it.
- `DrinksContext` is the single source of truth for all drink data — never duplicate it locally.
- For values that need to be readable inside effects/callbacks without causing re-runs, use a `useRef` mirror updated by its own `useEffect`.
- Never read context values directly inside a `useCallback` that needs to be stable — use a ref.

### Effects
- React flushes **child** component effects before parent provider effects. If a child effect reads data from a context that the parent provider just updated, the data will be one render behind. Fix: pass the value as a parameter from the child (where it's computed fresh during render), not read from a ref in the parent.
- Include all values read inside a `useEffect` in its dependency array, or use refs to opt specific values out of the dep tracking intentionally.
- Clean up all subscriptions, intervals, and channels in the effect return function.

### Memos
- Use `useMemo` for derived data that is expensive to compute or needed by multiple children.
- Don't memoize things that are already cheap (simple filter/map on small arrays).

### Optimistic UI
All user-initiated writes follow this pattern:
1. Update local state immediately (optimistic)
2. Queue to AsyncStorage as a fallback
3. Fire the Supabase call in a `void (async () => {...})()` background task
4. On success: mark as synced, remove from queue
5. On failure: leave in queue for `flushQueue()` to retry on next app open

Never show a loading spinner for logDrink or startSession — these should feel instant.

---

## Supabase

### Queries
- Always destructure `{ data, error }` from Supabase responses
- In fire-and-forget blocks, use `try/catch` to swallow errors silently (offline scenario)
- In user-triggered actions (save profile, etc.), propagate errors to the user with `Alert.alert`
- Use `.maybeSingle()` instead of `.single()` when a row might not exist — `.single()` throws on empty results

### RLS
- Every new table needs RLS enabled immediately after creation
- Default to "own data only" policies (`auth.uid() = user_id`)
- For cross-user reads (shared sessions, friend records), use SECURITY DEFINER functions with explicit authorization checks inside
- Never add a policy that allows unauthenticated reads unless it's truly public data

### Realtime
- Tables need `REPLICA IDENTITY FULL` + the `supabase_realtime` publication for subscriptions to work
- INSERT events include the full new row in the WAL regardless of REPLICA IDENTITY — it's only needed for UPDATE/DELETE column-level filters
- Channel names must be unique per subscription. Use `${tableName}-${contextId}` patterns (e.g. `shared-${sharedSessionId}`)
- Always remove channels in the effect cleanup: `void supabase.removeChannel(channel)`
- When a Realtime INSERT arrives for something the local user just created, deduplicate by checking existence before adding to state

### SECURITY DEFINER Functions
- Set `search_path = public` to prevent search path injection
- Always verify authorization **inside** the function body (don't rely on the caller being legitimate)
- Use for: aggregated cross-user queries, breaking RLS recursion (`get_my_shared_session_ids`), computed stats for friends

---

## BAC Calculations

- All BAC math lives in `src/lib/units.ts` — no inline formulas anywhere else
- `bacAtTime` is the core function used for the graph, current BAC, peak BAC, and sober time
- Always pass `sessionEntriesWithDrinkTime` (enriched with `drinking_minutes`) to BAC functions, not raw `sessionEntries`
- `sessionEntriesWithDrinkTime` is computed once in `index.tsx` and passed down
- `stomachFactor` for other users (in `MemberDetailSheet`) defaults to `1.0` (empty stomach) since you can't know their actual state
- The BAC graph loops in 1-minute steps — keep `STEP = 1/60`
- `peakBACWithAbsorption` scans 0–12 hours in 1-minute steps — this is intentionally exhaustive

---

## Bottom Sheets

- Wrap Modal content in `GestureHandlerRootView` — Modals render outside the app tree
- Use `useSharedValue` + `withTiming` + `Animated.View` for the slide animation
- Use `Gesture.Pan()` with `.activeOffsetY([0, 8])` to allow vertical pans without immediately stealing scroll gestures
- Dismiss threshold: `translationY > 80 || velocityY > 800`
- Always call `runOnJS(close)()` inside animation callbacks, not `onClose()` directly — Reanimated v4 worklets run on the UI thread
- The `onClose` prop reference changes on every parent render — always use a `useRef` + `useCallback` pattern to keep the pan gesture stable

---

## Offline / Queue

- Sessions are queued before drinks (FK constraint: drink_entries.session_id references sessions)
- `flushQueue` runs at the start of every `refresh()` call
- Use `upsert` with `{ onConflict: 'id' }` for retried inserts — safe to call multiple times
- The `is_synced: false` flag on `DrinkEntry` is used for UI to show pending-sync indicators

---

## Styling

- All styles in `StyleSheet.create` at the bottom of the file
- Never use inline styles for anything more than `{ flex: 1 }` or a quick width override
- Never use magic numbers — define sizes as named style keys
- Import `COLORS` from `@/src/lib/theme` — do not hardcode colors
- For conditional styles: `[s.base, condition && s.modifier]`
- For percentage widths in flex: `width: \`${pct}%\` as any` (TypeScript limitation with RN)

---

## Navigation

- All navigation is file-based via expo-router
- Programmatic tab switching uses `TabContext` (`const { goTo } = useTab()`)
- Deep links (QR code friend invites) are handled in `app/add-friend.tsx`
- Use `useFocusEffect` (from expo-router) when state needs to reload every time a tab gains focus

---

## Notifications

- Never hard-code FCM API keys in the app
- Push tokens are optional — the app functions fully without them
- Always guard notification calls with a check that the token exists
- Notification sends are fire-and-forget — failures are logged but not surfaced to the user

---

## Storage (Supabase)

- Use a timestamp in the filename on avatar/photo re-uploads (`avatar_{Date.now()}.jpg`) — uploading to the same path with `upsert: true` keeps the old CDN-cached URL, so the user sees no change
- Upload via `fetch(uri).arrayBuffer()` then pass the ArrayBuffer directly to `supabase.storage.from().upload()` — avoids base64 encoding overhead
- Scope own-user storage RLS policies using `(string_to_array(name, '/'))[1] = auth.uid()::text` (first path segment is the user's UUID)

---

## Things to Avoid

- **Don't create new migration files** — merge into `001_schema.sql`
- **Define tables before any policy or function that references them** — `CREATE POLICY` and SQL function bodies (for non-PL/pgSQL) validate table references at creation time; wrong order causes `relation does not exist` on a fresh migration run
- **Always set `SET search_path = public` on SECURITY DEFINER functions** — Supabase runs them with an empty search path by default, making unqualified table names fail at runtime
- **Don't add NativeWind/Tailwind classes** — StyleSheet only
- **Don't use `useEffect` to sync local state from props** — derive it during render with `useMemo`
- **Don't call `supabase.removeChannel` synchronously in an effect cleanup** that might still receive events — always `void` it
- **Don't add error handling for things that can't fail** (e.g., `JSON.parse` on data you just serialized)
- **Don't show loading spinners for optimistic operations** (logDrink, startSession)
- **Don't add comments that describe what the code does** — only why
- **Don't create `useRef` for values only needed in render** — that's `useMemo` or plain `const`
- **Don't read stale refs in effects** — if a value needs to be fresh in an effect, either include it in deps or (for stable callbacks) pass it as a parameter
