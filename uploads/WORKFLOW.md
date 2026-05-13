# iDrinkALot — Development Workflow

## Local Dev Setup

```bash
# Start local Supabase (Docker required)
supabase start

# Run the app
npx expo start

# Run on Android device
npx expo run:android

# Run on iOS device
npx expo run:ios
```

After making DB schema changes, reset the local database:
```bash
supabase db reset
```
This drops everything, re-runs `migrations/001_schema.sql`, then `seed.sql`.

---

## Migration Strategy

All schema is in a **single migration file**: `supabase/migrations/001_schema.sql`

- There are no incremental migrations — everything is merged into one file
- To add a DB change: edit `001_schema.sql` directly, then run `supabase db reset` locally
- To deploy to production: paste the relevant new SQL into the Supabase dashboard SQL editor, or push with `supabase db push` if the project is linked

Do **not** create new numbered migration files for incremental changes. Merge them in.

`supabase/seed.sql` contains the drink catalog (beer, shots, wines, cocktails) and is run after migrations on `db reset`.

---

## Adding a New Screen

1. Create the file under `app/(tabs)/` for a tab screen or `app/` for a modal/page
2. expo-router picks it up automatically based on the file name
3. If it's a new tab, add it to `app/(tabs)/_layout.tsx`
4. Use `SafeAreaView` with `edges={['top']}` from `react-native-safe-area-context` as the root

---

## Adding a New Component

1. Create it in `src/components/`
2. Bottom sheets follow the `DrinkLogSheet` or `MemberDetailSheet` pattern:
   - `Modal` with `transparent` + `animationType="none"`
   - `GestureHandlerRootView` wrapping the modal content (required because modals are outside the normal component tree)
   - `Animated.View` with `useSharedValue` + `withTiming` for slide-in/out
   - `Gesture.Pan()` for drag-to-dismiss
   - Backdrop as `Animated.View` with opacity fade + `Pressable` child for tap-to-close
3. All styles go in a `StyleSheet.create` at the bottom of the file
4. Import colors from `@/src/lib/theme`

---

## Adding a New Context

1. Create `src/context/YourContext.tsx`
2. Follow the `BacUnitContext` pattern for simple toggle-style preferences:
   - Load from AsyncStorage in `useEffect`
   - Persist on every change
3. Add the provider to `app/_layout.tsx` (wrap inside existing providers)
4. Export a `useYourContext()` hook

---

## Adding a DB Column / Table

1. Add to `supabase/migrations/001_schema.sql` in the right place (dependency order matters)
2. Add the corresponding RLS policies immediately after the table
3. If it needs Realtime, add `ALTER TABLE x REPLICA IDENTITY FULL` and the publication block
4. Add the TypeScript interface update in `src/lib/types.ts`
5. Run `supabase db reset` locally
6. Apply to production manually via SQL editor or `supabase db push`

---

## Adding a SECURITY DEFINER Function

Used when you need to bypass RLS (e.g., reading another user's aggregated data):

```sql
CREATE OR REPLACE FUNCTION my_function(p_arg uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always verify authorization inside the function
  -- Never trust that the caller is allowed just because the function exists
END;
$$;
```

Add it to `001_schema.sql` after all tables and policies.

---

## Realtime Subscriptions

Pattern used throughout `DrinksContext`:

```typescript
const channel = supabase
  .channel('unique-channel-name')
  .on('postgres_changes', {
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    schema: 'public',
    table: 'table_name',
    filter: 'column=eq.value',
  }, (payload) => {
    // handle event
  })
  .subscribe()

return () => { void supabase.removeChannel(channel) }
```

Requirements for column-level filters to work:
- Table must be in the `supabase_realtime` publication
- Table must have `REPLICA IDENTITY FULL` set (for UPDATE/DELETE; INSERT works without it)

---

## Updating Shared Session Stats

When a user logs a drink, `index.tsx` fires `updateSharedStats(bac, drinkCount, unitsTotal)` via a `useEffect` that depends on `[now, activeSharedSessionId, sessionEntries.length]`. This:
- Updates `shared_session_members` in Supabase
- Other members receive the change via the Realtime UPDATE subscription
- The `now` dependency makes it also fire every 60s (for BAC decay)

The values are passed **as parameters** (not read from refs) because React flushes child component effects before parent provider effects, making refs stale at the time the effect runs.

---

## Push Notifications Workflow

1. Token is registered in `notifications.ts` → stored in `profiles.push_token`
2. When a session starts with invited friends, `notifyFriendsSessionStarted()` is called
3. It calls the Supabase Edge Function `notify-friends` with the list of user IDs
4. The Edge Function looks up each user's push token from `profiles` and calls FCM v1
5. The Edge Function uses a service account credential (stored as Supabase secret)

---

## Key AsyncStorage Keys

| Key | Purpose |
|---|---|
| `@idrinkalot/active_session` | Serialized `Session` object for the current session |
| `@idrinkalot/active_shared_session_id` | UUID of the active shared session |
| `@idrinkalot/drink_queue` | Array of unsynced `DrinkEntry` objects |
| `@idrinkalot/session_queue` | Array of unsynced `Session` objects |
| `@idrinkalot/catalog_cache` | Cached drink catalog to avoid re-fetching |
| `@idrinkalot/session_goals` | Current session's goal settings |
| `@idrinkalot/default_goals` | Default goals loaded at session start |
| `@idrinkalot/bac_unit` | `'promille'` or `'bac'` |
| `@idrinkalot/stomach_factor` | Numeric 0.7–1.0 |
| `@idrinkalot/goal_water_reminder` | `'true'` or `'false'` |

---

## Common Patterns

### Optimistic UI
All write operations (logDrink, startSession, endSession) update local state immediately before the Supabase call completes. The Supabase call happens in a fire-and-forget `void (async () => {...})()`.

### Stale Closure Prevention
Any callback that reads state inside a `useEffect` or event handler uses a `useRef` mirror updated via its own `useEffect`. This is the pattern for `entriesRef`, `activeSessionRef`, `userRef`, etc. in `DrinksContext`.

### Bottom Sheets in Modals
Because React Native `Modal` renders outside the main component tree, gesture handlers inside modals require their own `GestureHandlerRootView` wrapper.

### Deduplicating Realtime INSERTs
When a Realtime INSERT arrives that might already be in local state (e.g., a row the current user just inserted), always check for existence before adding:
```typescript
setSharedMembers(prev => {
  if (prev.find(m => m.user_id === payload.new.user_id)) return prev
  return [...prev, payload.new as SharedSessionMember]
})
```
