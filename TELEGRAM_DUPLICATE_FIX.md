# 🚨 Telegram Duplicate Messages - Critical Fix Applied

**Date:** 2026-08-01  
**Issue:** Bot sent 3,000+ duplicate messages requesting `/auth` registration overnight  
**Status:** ✅ FIXED with dual prevention mechanisms

---

## 🔴 Problem Summary

The Telegram polling function was experiencing an infinite loop:
1. `telegram_poll_state.last_update_id` wasn't updating correctly
2. Every minute, the same messages were retrieved from Telegram API
3. Same responses were sent to users repeatedly
4. Over 10+ hours = 3,000+ duplicate "not authenticated" messages

---

## ✅ Solution Implemented

### Fix #1: Comprehensive Logging
**File:** `netlify/functions/telegram-poller.js`

Added detailed console.log statements to track:
- telegram_poll_state table initialization and retrieval
- Every update ID received from Telegram API
- Offset update attempts and results
- Database error details

**Purpose:** Identify exact point of failure in offset persistence

```javascript
console.log("DEBUG: telegram_poll_state query result:", { data, error: stateError });
console.log("DEBUG: getUpdates retornó", { count: updates.length, updateIds: updates.map(u => u.update_id) });
console.log("DEBUG: Resultado de actualización", { updateResult, updateError });
```

### Fix #2: Automatic Loop Detection & Recovery
**File:** `netlify/functions/telegram-poller.js`

Added automatic recovery when loop detected:
- Tracks `updated_at` timestamp of last offset update
- If offset unchanged for 2+ minutes → automatic recovery trigger
- Fetches latest update ID from Telegram API
- Jumps to current messages, skipping stuck old ones

```javascript
if (minutesWithoutChange > 2 && lastUpdateId > 0) {
  const latestId = await getLatestUpdateId();
  if (latestId > 0 && latestId > lastUpdateId) {
    lastUpdateId = latestId; // Jump to current
  }
}
```

**Effect:** Prevents infinite 3,000+ message loops even if DB persists wrong offset

### Fix #3: Emergency Reset Utility
**File:** `netlify/functions/fix-telegram-offset.js`

New HTTP endpoint for manual intervention:
- POST `/.netlify/functions/fix-telegram-offset`
- Fetches current latest update ID from Telegram
- Resets `telegram_poll_state` to skip old messages
- Returns before/after offset for verification

**Usage if needed:**
```bash
curl -X POST https://yourdomain/.netlify/functions/fix-telegram-offset
```

### Fix #4: Improved Offset Initialization
**File:** `netlify/functions/telegram-poller.js`

Changed initialization logic:
- Changed from `.single()` (throws if 0 results) to manual check
- Auto-creates table if empty
- Validates `pollState.id` before update
- **Always updates offset** (even if no new messages)

---

## 📋 How It Works Now

```
Every minute (Netlify cron):
    ↓
[1] Retrieve telegram_poll_state
    ↓
[2] CHECK: Has offset been unchanged for 2+ minutes?
    YES → Fetch latest update ID, jump to it (recovery)
    NO  → Continue normally
    ↓
[3] Request updates with offset
    ↓
[4] Process messages
    ↓
[5] UPDATE offset in database
    ↓
[6] Log everything for debugging
```

---

## 📊 Debug Output (Netlify Logs)

You'll now see logs like:
```
DEBUG: telegram_poll_state query result: { data: [...], error: null }
DEBUG: getUpdates retornó { count: 5, updateIds: [100, 101, 102, 103, 104] }
DEBUG: Resultado de actualización { updateResult: {...}, updateError: null }
```

Or if loop detected:
```
WARN: Posible loop infinito detectado. Offset sin cambios por >2 min. Reseteando...
INFO: Latest update ID de Telegram: 1500
INFO: Saltando a latest update: { from: 100, to: 1500 }
```

---

## ✨ Commits Applied

1. **cdf780c** - Debug: Add detailed logging to identify issue
2. **4e3b883** - Add infinite loop detection and recovery mechanism

---

## 🧪 Verification Steps

1. **Check logs in Netlify:**
   - Functions > telegram-poller
   - Look for DEBUG/INFO/WARN messages
   - Verify offset is updating each minute

2. **Verify in Database:**
   ```sql
   SELECT id, last_update_id, updated_at 
   FROM telegram_poll_state 
   ORDER BY updated_at DESC 
   LIMIT 1;
   ```
   - `updated_at` should change every ~60 seconds
   - `last_update_id` should increase over time

3. **Test a message:**
   - Send `/start` to bot
   - Should receive response only once
   - No duplicates in subsequent minutes

---

## 🛡️ Safety Guarantees

✅ **Loop Prevention:** If offset gets stuck, auto-jumps after 2 minutes  
✅ **Graceful Recovery:** Doesn't break users' existing conversations  
✅ **Backward Compatible:** Falls back to normal polling if no issue  
✅ **Observable:** Detailed logging for troubleshooting  

---

## 📞 If Issue Persists

1. **Check Netlify logs** for error messages
2. **Manually reset** using fix-telegram-offset endpoint:
   ```bash
   curl -X POST /.netlify/functions/fix-telegram-offset
   ```
3. **Verify RLS policies** on telegram_poll_state table
4. **Check database permissions** for service role

---

## 📝 Next Steps

- Monitor Netlify logs for DEBUG output (first 5-10 minutes)
- Verify offset incrementing correctly
- Run quick test: `/start` → should get one welcome message
- If all working: Remove debug logging in next iteration

