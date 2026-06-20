export const VISUAL_PIECE_COUNT = 6;

/** How many spaceship pieces are visually shown, scaled to the session's challenge count. */
export function getVisualPieces(piecesUnlocked: number, totalChallenges: number): number {
  if (totalChallenges <= 0) return 0;
  return Math.min(
    Math.floor((piecesUnlocked / totalChallenges) * VISUAL_PIECE_COUNT),
    VISUAL_PIECE_COUNT
  );
}

/**
 * The challenge-count threshold at which the student will earn the next visual piece.
 * Returns null if all pieces are already unlocked.
 */
export function getNextPieceThreshold(piecesUnlocked: number, totalChallenges: number): number | null {
  const vp = getVisualPieces(piecesUnlocked, totalChallenges);
  if (vp >= VISUAL_PIECE_COUNT) return null;
  return Math.ceil(((vp + 1) / VISUAL_PIECE_COUNT) * totalChallenges);
}

/** The challenge-count threshold at which the current visual piece was earned (0 if no pieces yet). */
export function getPrevPieceThreshold(piecesUnlocked: number, totalChallenges: number): number {
  const vp = getVisualPieces(piecesUnlocked, totalChallenges);
  if (vp <= 0) return 0;
  return Math.ceil((vp / VISUAL_PIECE_COUNT) * totalChallenges);
}

/** How many more challenges must be solved to unlock the next visual piece. */
export function getChallengesNeededForNextPiece(piecesUnlocked: number, totalChallenges: number): number {
  const next = getNextPieceThreshold(piecesUnlocked, totalChallenges);
  if (next === null) return 0;
  return next - piecesUnlocked;
}

/** 0-100 progress percentage toward the next visual piece unlock. */
export function getPieceProgressPct(piecesUnlocked: number, totalChallenges: number): number {
  const next = getNextPieceThreshold(piecesUnlocked, totalChallenges);
  if (next === null) return 100;
  const prev = getPrevPieceThreshold(piecesUnlocked, totalChallenges);
  const range = next - prev;
  if (range <= 0) return 100;
  return Math.min(100, ((piecesUnlocked - prev) / range) * 100);
}
