# Backend Issues & Required Fixes — Thynkcity Code Quest

This is a targeted punch list of backend problems identified during QA.
The full implementation spec is in `BACKEND_SOCKET_GUIDE.md`.

---

## Priority 1 — CRITICAL (these make the live session visually broken)

---

### 1. `code:live` is missing `studentId` and `alias`

**What's broken:** The live code cam on the audience screen never shows a student's name or avatar. The cam stays blank.

**Why:** `CockpitPage` emits:
```js
emit('code:broadcast', { code })
```
It only sends the raw code. The backend must attach the student's identity before relaying to the audience.

**Fix — in your `code:broadcast` handler:**
```ts
socket.on('code:broadcast', ({ code }: { code: string }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  s.plotStatus = 'writing';

  if (s.codeBroadcastEnabled) {
    io.to(`audience:${s.pin}`).emit('code:live', {
      studentId: s.studentId,   // ← REQUIRED — was missing
      alias: s.alias,           // ← REQUIRED — was missing
      code,
    });
  }

  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
});
```

---

### 2. `student:updated` must always include `piecesUnlocked` and `plotStatus`

**What's broken:** The spaceship build progress on the audience screen never updates. All student cards show the wrong status icon (always "idle" even when coding or running code).

**Why:** If `piecesUnlocked` or `plotStatus` are missing from `student:updated`, the frontend skips the update for those fields.

**Fix — verify your `toStudentObject` helper returns all 7 fields every time:**
```ts
function toStudentObject(s: SessionStudent) {
  return {
    id: s.studentId,
    alias: s.alias,
    score: s.score,
    piecesUnlocked: s.piecesUnlocked,   // ← must be present
    status: s.status,
    plotStatus: s.plotStatus,            // ← must be present
    avatarColor: s.avatarColor,
  };
}
```

Never send a partial student object. Even if only the score changed, send the full shape.

---

### 3. `solve:latest` must fire once per correct unique solve

**What's broken:** The spotlight celebration, sparkle animation, and Monty narrator line never trigger on the audience screen. The "Latest Solve" panel stays empty.

**Why:** The audience page drives all celebrations from the `solve:latest` event. If it's never emitted, none of the hype features work.

**Fix — inside `code:submit`, after a correct unique solve:**
```ts
if (correct && !s.completedChallengeIds.includes(challengeId)) {
  // ... update score, piecesUnlocked, etc. ...

  io.to(`audience:${s.pin}`).emit('solve:latest', {
    studentId: s.studentId,
    alias: s.alias,
    missionTitle: challenge.title,
    points: pointsAwarded,
    timeTaken,                   // seconds since challengeStartedAt (optional but used by spotlight)
  });
}
```

Do NOT fire this on wrong answers, or on re-solving an already-completed challenge.

---

### 4. `plotStatus` must be reset on every challenge transition

**What's broken:** After a student solves a challenge and moves to the next one, their audience card stays on `success` or `failed` status indefinitely. The whole grid looks frozen.

**Fix — in `challenge:advance` handler:**
```ts
socket.on('challenge:advance', async ({ challengeIndex }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  s.currentChallengeIndex = challengeIndex;
  s.plotStatus = 'idle';              // ← reset to idle
  s.challengeStartedAt = Date.now(); // ← reset timer for next challenge

  // ... persist to DB ...

  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
});
```

Also reset all `plotStatus` values to `'idle'` when the admin pushes a new challenge (see §3 in the full guide, section 5.1).

---

## Priority 2 — HIGH (breaks important features)

---

### 5. Handle duplicate `join:session` from the same student

**What's broken:** If a student's internet drops and reconnects, `CockpitPage` re-emits `join:session`. If the backend creates a new in-memory entry instead of updating the existing one, the student appears twice in the audience grid and their score resets.

**Fix — upsert by `alias + pin`, not by `socket.id`:**
```ts
socket.on('join:session', async ({ pin, alias, ... }) => {
  // Check if this alias is already in the session
  const existing = [...connectedStudents.values()].find(s => s.alias === alias && s.pin === pin);

  if (existing) {
    // Update socket.id and status for the reconnected student
    connectedStudents.delete(existing.socketId);
    existing.socketId = socket.id;
    existing.status = 'connected';
    existing.plotStatus = 'idle';
    connectedStudents.set(socket.id, existing);
    socket.join(`session:${pin}`);
    socket.emit('student:state', { /* existing state */ });
    io.to(`audience:${pin}`).emit('student:updated', toStudentObject(existing));
  } else {
    // New student — create fresh entry
    // ... (existing logic from guide §4.2) ...
  }
});
```

---

### 6. Hint deduction — don't double-deduct

**What's broken:** The frontend deducts 5 points locally the moment the student confirms a hint (so the UI feels instant). Then the backend also deducts 5 via `hint:request`, and then broadcasts `student:updated` with the server score. This causes a visible score jump: -5 immediately, then the server shows another -5, netting -10.

**Fix:** The backend's `hint:request` handler should deduct from its in-memory `score` and the DB, but when it broadcasts `student:updated` to the audience, the score in the student object already reflects the deduction. The frontend syncs its local score from `student:state` (sent only to the student), not from `student:updated` (broadcast to audience). So the student's own displayed score comes from local state, the audience's displayed score comes from the server. They should match.

**Action required:** Ensure `hint:request` sends `student:updated` to the **audience room only** (not back to the student who requested it). The student already updated their own score locally.

```ts
socket.on('hint:request', async () => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  s.score = Math.max(0, s.score - 5);
  s.plotStatus = 'hint_used';

  await prisma.student.update({ where: { id: s.studentId }, data: { score: s.score } });

  // Send to AUDIENCE only — not back to the student
  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));

  // If you want to confirm the server score to the student, use:
  // socket.emit('student:state', { score: s.score, ... });
  // But only do this if the frontend expects it — currently it doesn't.
});
```

---

### 7. `challenge:advance` index validation — prevent wrong-challenge advance

**What's broken:** CockpitPage auto-advances 2.5 seconds after a correct solve. If the admin pushes a different challenge during that window, the student's auto-advance fires and sends the wrong `challengeIndex`.

**Fix — validate that the index is a sensible step forward:**
```ts
socket.on('challenge:advance', async ({ challengeIndex }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  // Only allow advancing forward by 1, or to the finish
  const challengeCount = await prisma.challenge.count({ where: { sessionPin: s.pin } });
  if (challengeIndex > challengeCount || challengeIndex < s.currentChallengeIndex) {
    return; // silently ignore invalid jumps
  }

  // ... rest of handler ...
});
```

---

### 8. Session status must be updated in DB on game start / end / reset

**What's broken:** The audience page filters out `status === 'ended'` sessions. If the backend never updates the DB `status` field, ended sessions remain visible and new audience members can join ghost sessions.

**Required DB updates:**

| Admin action | DB update required |
|---|---|
| Start game | `session.status = 'active'` |
| End game | `session.status = 'ended'` |
| Reset scores | `session.status = 'waiting'` (or keep `'active'` — your call) |

```ts
// Example for end game:
await prisma.session.update({
  where: { pin },
  data: { status: 'ended' },
});
io.to(`session:${pin}`).emit('game:ended');
io.to(`audience:${pin}`).emit('session:state', { status: 'ended', activeChallengeId: null });
```

---

## Priority 3 — MEDIUM (noticeable but not session-breaking)

---

### 9. `join:admin` handler is missing

The AdminPage emits `join:admin` but there was no handler for it. It has now been added to `BACKEND_SOCKET_GUIDE.md` (§5.0). Implement it so the admin receives the current student list on connect without doing a separate HTTP request.

---

### 10. `student:left` payload must be the student ID string

**Frontend expects:**
```ts
on('student:left', (studentId: string) => { ... })
```

Make sure the server emits a plain string, not a student object:
```ts
io.to(`audience:${s.pin}`).emit('student:left', s.studentId);
```

---

### 11. `game:reset` should be followed by updated student objects

Currently the frontend resets scores locally when it receives `game:reset`. This is a best-effort local update. Ideally, after resetting scores in the DB, emit individual `student:updated` events so the audience grid syncs correctly:

```ts
// After resetting DB:
for (const s of connectedStudents.values()) {
  if (s.pin === pin) {
    s.score = 0;
    s.piecesUnlocked = 0;
    s.completedChallengeIds = [];
    s.plotStatus = 'idle';
    io.to(`audience:${pin}`).emit('student:updated', toStudentObject(s));
  }
}
io.to(`audience:${pin}`).emit('game:reset');
```

---

## Summary Checklist

| # | Issue | Priority | Status |
|---|---|---|---|
| 1 | Attach `studentId` + `alias` to `code:live` | CRITICAL | ❌ Not implemented |
| 2 | `toStudentObject` always includes all 7 fields | CRITICAL | ❌ Verify |
| 3 | Emit `solve:latest` on every correct unique solve | CRITICAL | ❌ Not implemented |
| 4 | Reset `plotStatus` to `'idle'` on challenge advance | CRITICAL | ❌ Not implemented |
| 5 | Idempotent `join:session` — upsert on reconnect | HIGH | ❌ Not implemented |
| 6 | `hint:request` only broadcasts to audience, not student | HIGH | ❌ Verify |
| 7 | Validate `challengeIndex` in `challenge:advance` | HIGH | ❌ Not implemented |
| 8 | Update session `status` in DB on game events | HIGH | ❌ Not implemented |
| 9 | Implement `join:admin` handler (see guide §5.0) | MEDIUM | ❌ Not implemented |
| 10 | `student:left` emits a plain `studentId` string | MEDIUM | ❌ Verify |
| 11 | Emit `student:updated` per student after `game:reset` | MEDIUM | ❌ Not implemented |
