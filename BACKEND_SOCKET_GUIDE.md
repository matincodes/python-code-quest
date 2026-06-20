# Backend Socket.io Guide — Thynkcity Code Quest

The frontend connects to `http://localhost:3001` (configured via `VITE_SOCKET_URL`).  
The server uses **Express + Socket.io + Prisma**. This document covers every socket event
the frontend emits or expects, the exact payload shapes, and the logic the server must implement.

---

## 1. In-Memory Session Store

The server needs a fast in-memory map of every connected student (in addition to the DB).
The DB is the source of truth for persistence; the in-memory store is used for real-time lookups.

```ts
interface SessionStudent {
  socketId: string;
  studentId: string;        // DB id
  alias: string;
  pin: string;              // session PIN
  score: number;
  piecesUnlocked: number;   // number of challenges correctly solved
  completedChallengeIds: string[];
  currentChallengeIndex: number;
  plotStatus: PlotStatus;   // see type below
  avatarColor: string;
  status: 'connected' | 'disconnected';
  codeBroadcastEnabled: boolean;
  challengeStartedAt: number; // Date.now() when current challenge was pushed
}

type PlotStatus =
  | 'idle' | 'writing' | 'thinking' | 'running'
  | 'success' | 'failed' | 'hint_used' | 'awaiting';

// Map socket.id → SessionStudent
const connectedStudents = new Map<string, SessionStudent>();
```

---

## 2. Socket Rooms

| Room name | Who joins | What gets sent to it |
|---|---|---|
| `session:{pin}` | Students (CockpitPage) | `challenge:pushed`, `game:started`, `game:ended`, `code:result` |
| `audience:{pin}` | Audience browsers | `student:joined`, `student:updated`, `student:left`, `code:live`, `solve:latest`, `session:state`, `challenge:pushed`, `game:reset`, `monty:narrator` |
| `admin:{pin}` | Instructor (CockpitPage admin mode) | Internal admin confirmations |

---

## 3. Student Object Shape

This exact shape must be used in every `student:joined` and `student:updated` broadcast.
The frontend `Student` type expects all of these fields.

```ts
{
  id: string;
  alias: string;
  score: number;
  piecesUnlocked: number;     // count of correctly solved challenges (NOT score-based)
  status: 'connected' | 'disconnected';
  plotStatus: PlotStatus;     // current activity state
  avatarColor: string;        // hex colour e.g. '#3DD8FF'
}
```

---

## 4. Events the Server Must Handle

### 4.1 `join:audience`  ← from AudiencePage

```ts
socket.on('join:audience', ({ pin }: { pin: string }) => {
  socket.join(`audience:${pin}`);

  // Send current session state
  const session = await prisma.session.findUnique({ where: { pin } });
  socket.emit('session:state', {
    status: session.status,
    activeChallengeId: session.activeChallengeId,
  });

  // Send every currently connected student
  const studentsInSession = [...connectedStudents.values()].filter(s => s.pin === pin);
  for (const s of studentsInSession) {
    socket.emit('student:joined', toStudentObject(s));
  }
});
```

---

### 4.2 `join:session`  ← from CockpitPage

```ts
socket.on('join:session', async ({ pin, alias, isBeginner, editorMode }) => {
  // Look up or create student in DB
  const dbStudent = await prisma.student.upsert({
    where: { pin_alias: { pin, alias } },
    create: { pin, alias, score: 0, piecesUnlocked: 0, avatarColor: randomColor() },
    update: { status: 'connected' },
  });

  // Build in-memory entry
  const sessionStudent: SessionStudent = {
    socketId: socket.id,
    studentId: dbStudent.id,
    alias: dbStudent.alias,
    pin,
    score: dbStudent.score,
    piecesUnlocked: dbStudent.piecesUnlocked,
    completedChallengeIds: dbStudent.completedChallengeIds ?? [],
    currentChallengeIndex: dbStudent.currentChallengeIndex ?? 0,
    plotStatus: 'idle',
    avatarColor: dbStudent.avatarColor,
    status: 'connected',
    codeBroadcastEnabled: true,
    challengeStartedAt: Date.now(),
  };
  connectedStudents.set(socket.id, sessionStudent);

  socket.join(`session:${pin}`);

  // Send the student their current state (score, completed challenges, etc.)
  socket.emit('student:state', {
    score: sessionStudent.score,
    piecesUnlocked: sessionStudent.piecesUnlocked,
    completedChallengeIds: sessionStudent.completedChallengeIds,
    currentChallengeIndex: sessionStudent.currentChallengeIndex,
  });

  // Tell the audience a student joined
  io.to(`audience:${pin}`).emit('student:joined', toStudentObject(sessionStudent));
});
```

---

### 4.3 `code:broadcast`  ← from CockpitPage (debounced every 500ms)

This is the live typing feed. Relay it to the audience with identity attached.

```ts
socket.on('code:broadcast', ({ code }: { code: string }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  // Update plot status to 'writing'
  s.plotStatus = 'writing';

  // Relay to audience only if student has broadcast enabled
  if (s.codeBroadcastEnabled) {
    io.to(`audience:${s.pin}`).emit('code:live', {
      studentId: s.studentId,
      alias: s.alias,
      code,
    });
  }

  // Broadcast updated plot status to audience
  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
});
```

---

### 4.4 `code:broadcast:toggle`  ← from CockpitPage

Student toggled their live cam on/off.

```ts
socket.on('code:broadcast:toggle', ({ enabled }: { enabled: boolean }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;
  s.codeBroadcastEnabled = enabled;

  // If they turned it OFF, clear the audience feed for this student
  if (!enabled) {
    io.to(`audience:${s.pin}`).emit('code:live', {
      studentId: s.studentId,
      alias: s.alias,
      code: '',
    });
  }
});
```

---

### 4.5 `code:submit`  ← from CockpitPage  ⚠️ Most critical event

```ts
socket.on('code:submit', async ({ challengeId, code, editorMode, hintUsed, timeTaken }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  // Update plot status to 'running' immediately
  s.plotStatus = 'running';
  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));

  // --- Execute Python code in your sandbox ---
  const { output, error, isSuccess } = await runPythonSandbox(code);

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  const correct = isSuccess && output.trim() === challenge.expectedOutput.trim();

  if (correct && !s.completedChallengeIds.includes(challengeId)) {
    const pointsAwarded = challenge.points;

    // Update in-memory state
    s.score += pointsAwarded;
    s.piecesUnlocked += 1;              // ← one piece per solved challenge
    s.completedChallengeIds.push(challengeId);
    s.plotStatus = 'success';

    // Persist to DB
    await prisma.student.update({
      where: { id: s.studentId },
      data: {
        score: s.score,
        piecesUnlocked: s.piecesUnlocked,
        completedChallengeIds: s.completedChallengeIds,
      },
    });

    // Tell the student they succeeded
    socket.emit('code:result', {
      output,
      isSuccess: true,
      pointsAwarded,
    });

    // Tell the audience the student's score/pieces updated
    io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));

    // Trigger the celebration on audience (spotlight, sparkle, narrator)
    io.to(`audience:${s.pin}`).emit('solve:latest', {
      studentId: s.studentId,
      alias: s.alias,
      missionTitle: challenge.title,
      points: pointsAwarded,
      timeTaken,
    });

  } else {
    s.plotStatus = 'failed';

    socket.emit('code:result', {
      output,
      error: error || 'Output did not match expected.',
      isSuccess: false,
      pointsAwarded: 0,
    });

    // Let audience see the failed status
    io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
  }
});
```

---

### 4.6 `challenge:advance`  ← from CockpitPage

Student moved to the next challenge (auto-advance after solve or manual skip).

```ts
socket.on('challenge:advance', async ({ challengeIndex }: { challengeIndex: number }) => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  s.currentChallengeIndex = challengeIndex;
  s.plotStatus = 'idle';
  s.challengeStartedAt = Date.now();

  await prisma.student.update({
    where: { id: s.studentId },
    data: { currentChallengeIndex: challengeIndex },
  });

  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
});
```

---

### 4.7 `hint:request`  ← from CockpitPage

```ts
socket.on('hint:request', async () => {
  const s = connectedStudents.get(socket.id);
  if (!s) return;

  s.score = Math.max(0, s.score - 5);
  s.plotStatus = 'hint_used';

  await prisma.student.update({
    where: { id: s.studentId },
    data: { score: s.score },
  });

  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
});
```

---

### 4.8 `student:logout` + `disconnect`

Both should do the same thing:

```ts
const handleStudentLeave = async (socketId: string) => {
  const s = connectedStudents.get(socketId);
  if (!s) return;

  s.status = 'disconnected';
  s.plotStatus = 'awaiting';

  await prisma.student.update({
    where: { id: s.studentId },
    data: { status: 'disconnected' },
  });

  io.to(`audience:${s.pin}`).emit('student:updated', toStudentObject(s));
  connectedStudents.delete(socketId);
};

socket.on('student:logout', () => handleStudentLeave(socket.id));
socket.on('disconnect', () => handleStudentLeave(socket.id));
```

---

## 5. Admin-Triggered Events (HTTP or Socket)

These are fired by the instructor from the admin/cockpit panel.

### 5.1 Push a challenge

When the instructor pushes a challenge to the session:

```ts
// After updating DB:
const startedAt = new Date().toISOString();

// Tell students which challenge is now active
io.to(`session:${pin}`).emit('challenge:pushed', { challengeId, startedAt });

// Tell audience too (so the ticker and spotlight update)
io.to(`audience:${pin}`).emit('challenge:pushed', { challengeId });
io.to(`audience:${pin}`).emit('session:state', {
  status: 'active',
  activeChallengeId: challengeId,
});

// Reset all students' plotStatus to 'idle' for the new challenge
for (const s of connectedStudents.values()) {
  if (s.pin === pin) {
    s.plotStatus = 'idle';
    s.challengeStartedAt = Date.now();
    io.to(`audience:${pin}`).emit('student:updated', toStudentObject(s));
  }
}
```

### 5.2 Start game

```ts
io.to(`session:${pin}`).emit('game:started', {
  startedAt: new Date().toISOString(),
  totalTimeLimit: session.totalTimeLimit, // seconds e.g. 600
});
io.to(`audience:${pin}`).emit('session:state', { status: 'active', activeChallengeId: null });
```

### 5.3 End game

```ts
io.to(`session:${pin}`).emit('game:ended');
io.to(`audience:${pin}`).emit('session:state', { status: 'ended', activeChallengeId: null });
```

### 5.4 Reset scores

```ts
// Reset DB
await prisma.student.updateMany({ where: { pin }, data: { score: 0, piecesUnlocked: 0, completedChallengeIds: [] } });

// Reset in-memory
for (const s of connectedStudents.values()) {
  if (s.pin === pin) {
    s.score = 0;
    s.piecesUnlocked = 0;
    s.completedChallengeIds = [];
    s.plotStatus = 'idle';
  }
}

io.to(`audience:${pin}`).emit('game:reset');
```

### 5.5 Narrator message (optional)

If you want the server to send automated Monty lines:

```ts
io.to(`audience:${pin}`).emit('monty:narrator', { message: 'Some hype message here!' });
```

---

## 6. Helper: `toStudentObject`

This converts the in-memory session entry into the exact shape the frontend expects:

```ts
function toStudentObject(s: SessionStudent) {
  return {
    id: s.studentId,
    alias: s.alias,
    score: s.score,
    piecesUnlocked: s.piecesUnlocked,
    status: s.status,
    plotStatus: s.plotStatus,
    avatarColor: s.avatarColor,
  };
}
```

---

## 7. Event Summary Table

| Event | Direction | Payload |
|---|---|---|
| `join:audience` | client → server | `{ pin }` |
| `join:session` | client → server | `{ pin, alias, isBeginner, editorMode }` |
| `code:broadcast` | client → server | `{ code }` |
| `code:broadcast:toggle` | client → server | `{ enabled: boolean }` |
| `code:submit` | client → server | `{ challengeId, code, editorMode, hintUsed, timeTaken }` |
| `challenge:advance` | client → server | `{ challengeIndex }` |
| `hint:request` | client → server | _(none)_ |
| `student:logout` | client → server | _(none)_ |
| `student:state` | server → student | `{ score, piecesUnlocked, completedChallengeIds, currentChallengeIndex }` |
| `student:joined` | server → audience | Student object (see §3) |
| `student:updated` | server → audience | Student object (see §3) |
| `student:left` | server → audience | `studentId` (string) |
| `code:result` | server → student | `{ output, error?, isSuccess, pointsAwarded }` |
| `code:live` | server → audience | `{ studentId, alias, code }` |
| `solve:latest` | server → audience | `{ studentId, alias, missionTitle, points, timeTaken }` |
| `session:state` | server → both | `{ status, activeChallengeId }` |
| `challenge:pushed` | server → both | `{ challengeId, startedAt? }` |
| `game:started` | server → students | `{ startedAt, totalTimeLimit }` |
| `game:ended` | server → students | _(none)_ |
| `game:reset` | server → audience | _(none)_ |
| `monty:narrator` | server → audience | `{ message }` |
| `error` | server → student | `{ message }` |

---

## 8. Key Rules

1. **`piecesUnlocked` = number of challenges correctly solved**, not score-based. Increment by 1 per correct unique submission. The frontend calculates which visual spaceship piece to show based on `piecesUnlocked / totalChallenges`.

2. **Always send `student:updated` after any state change** — score, plotStatus, piecesUnlocked. The audience page drives all its visuals from this event.

3. **`code:live` must include `studentId` AND `alias`** — the audience needs both to match the feed to a student card.

4. **`solve:latest` must fire once per correct unique solve** — it triggers the spotlight celebration, sparkle animation, and Monty narrator on the audience screen.

5. **`plotStatus` must be reset to `'idle'` when a new challenge is pushed** — otherwise old statuses linger on the audience grid.
