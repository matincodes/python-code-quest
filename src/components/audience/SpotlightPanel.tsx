import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useGameStore, type SpotlightMode } from '../../store/gameStore';
import { mockChallenges } from '../../data/mockChallenges';
import { getChallengesNeededForNextPiece } from '../../utils/pieces';
import SpotlightStudent from './SpotlightStudent';
import SpotlightHeadToHead from './SpotlightHeadToHead';
import SpotlightClosestToLaunch from './SpotlightClosestToLaunch';
import SpotlightComeback from './SpotlightComeback';
import SpotlightLatestSolve from './SpotlightLatestSolve';

const ROTATION_MS = 25_000;
const SOLVE_DISPLAY_MS = 8_000;
const MODES: SpotlightMode[] = ['student', 'headToHead', 'closestToLaunch', 'comeback'];

interface SpotlightPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  totalChallenges?: number;
}

export default function SpotlightPanel({ isFullscreen, onToggleFullscreen, totalChallenges }: SpotlightPanelProps = {}) {
  const students = useGameStore((s) => s.students);
  const scoreHistory = useGameStore((s) => s.scoreHistory);
  const latestSolve = useGameStore((s) => s.latestSolve);
  const spotlightOverride = useGameStore((s) => s.spotlightOverride);
  const setSpotlight = useGameStore((s) => s.setSpotlight);

  const [modeIdx, setModeIdx] = useState(0);
  const [isShowingLatestSolve, setIsShowingLatestSolve] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = [...students].sort((a, b) => b.score - a.score);

  // ── Auto-rotation every 25s ──────────────────────────────────────────────
  const startRotation = () => {
    if (rotationRef.current) clearInterval(rotationRef.current);
    rotationRef.current = setInterval(() => {
      setModeIdx((i) => (i + 1) % MODES.length);
    }, ROTATION_MS);
  };

  useEffect(() => {
    startRotation();
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
   
  }, []);

  // ── Interrupt rotation when a new solve arrives ──────────────────────────
  useEffect(() => {
    if (!latestSolve) return;
    setIsShowingLatestSolve(true);
    if (rotationRef.current) clearInterval(rotationRef.current);
    if (solveTimerRef.current) clearTimeout(solveTimerRef.current);
    solveTimerRef.current = setTimeout(() => {
      setIsShowingLatestSolve(false);
      startRotation();
    }, SOLVE_DISPLAY_MS);
   
  }, [latestSolve]);

  // ── Derive current mode & sync store ────────────────────────────────────
  const activeMode: SpotlightMode = spotlightOverride?.mode
    ?? (isShowingLatestSolve ? 'latestSolve' : MODES[modeIdx]);

  useEffect(() => {
    setSpotlight(activeMode, null);
  }, [activeMode, setSpotlight]);

  // ── Compute comeback data ────────────────────────────────────────────────
  const comebackStudent = (() => {
    let best: typeof sorted[0] | null = null;
    let bestGain = -Infinity;
    for (const s of sorted) {
      const hist = scoreHistory[s.id] ?? [];
      if (hist.length < 2) continue;
      const oldest = hist[0].score;
      const gain = s.score - oldest;
      if (gain > bestGain) { bestGain = gain; best = s; }
    }
    return best;
  })();

  const comebackGain = comebackStudent
    ? comebackStudent.score - (scoreHistory[comebackStudent.id]?.[0]?.score ?? comebackStudent.score)
    : 0;

  // ── Compute closest-to-launch (challenge-count based) ───────────────────
  const tc = totalChallenges ?? mockChallenges.length;
  const closestStudent = sorted.reduce<typeof sorted[0] | null>((best, s) => {
    if (!best) return s;
    const gap = getChallengesNeededForNextPiece(s.piecesUnlocked, tc);
    const bestGap = getChallengesNeededForNextPiece(best.piecesUnlocked, tc);
    return gap < bestGap ? s : best;
  }, null);



  const modeLabel: Record<SpotlightMode, string> = {
    student:           'Spotlight',
    headToHead:        'Head to Head',
    closestToLaunch:   'Closest to Launch',
    comeback:          'Comeback',
    latestSolve:       'Just Solved!',
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border border-space-700/40 bg-space-900/90 backdrop-blur-md overflow-hidden ${isFullscreen ? 'w-full h-full' : 'h-full'}`}>

      {/* ── Panel header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-space-700/30 shrink-0">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-2 h-2 rounded-full bg-accent-gold"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-display text-xs font-bold text-white/60 uppercase tracking-widest">
            {modeLabel[activeMode]}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Rotation progress dots */}
          {!isShowingLatestSolve && !spotlightOverride && (
            <div className="flex gap-1">
              {MODES.map((m, i) => (
                <div
                  key={m}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === modeIdx ? 'bg-accent-gold' : 'bg-space-700'}`}
                />
              ))}
            </div>
          )}
          {isShowingLatestSolve && (
            <span className="font-mono text-[10px] text-status-warning animate-pulse">8s</span>
          )}
          {spotlightOverride && (
            <span className="font-mono text-[10px] text-status-warning">PINNED</span>
          )}
          
          {onToggleFullscreen && (
            <button 
              onClick={onToggleFullscreen}
              className="text-white/40 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Content — AnimatePresence cross-fade ── */}
      <div className="flex-1 relative min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode + (isShowingLatestSolve ? '-solve' : '')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {activeMode === 'student' && sorted[0] && (
              <SpotlightStudent
                student={sorted[0]}
                rank={1}
                totalChallenges={totalChallenges ?? mockChallenges.length}
              />
            )}

            {activeMode === 'headToHead' && sorted.length >= 2 && (
              <SpotlightHeadToHead
                studentA={sorted[0]}
                studentB={sorted[1]}
                rankA={1}
                rankB={2}
                totalChallenges={totalChallenges ?? mockChallenges.length}
              />
            )}

            {activeMode === 'closestToLaunch' && closestStudent && (
              <SpotlightClosestToLaunch student={closestStudent} totalChallenges={tc} />
            )}

            {activeMode === 'comeback' && comebackStudent && (
              <SpotlightComeback
                student={comebackStudent}
                history={scoreHistory[comebackStudent.id] ?? []}
                gained={comebackGain}
              />
            )}

            {activeMode === 'comeback' && !comebackStudent && sorted[0] && (
              // Fallback: show top student if no comeback data yet
              <SpotlightStudent student={sorted[0]} rank={1} totalChallenges={totalChallenges ?? mockChallenges.length} />
            )}

            {activeMode === 'latestSolve' && latestSolve && (
              <SpotlightLatestSolve
                solve={latestSolve}
                student={students.find((s) => s.id === latestSolve.studentId)}
              />
            )}

            {/* Fallback for empty state */}
            {!sorted.length && (
              <div className="flex items-center justify-center h-full">
                <p className="font-display text-xs text-white/20 uppercase tracking-widest">Waiting for hackers…</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Progress bar at bottom (resets every 25s) ── */}
      {!isShowingLatestSolve && !spotlightOverride && (
        <div className="h-0.5 bg-space-800 shrink-0">
          <motion.div
            className="h-full bg-accent-gold/60"
            key={modeIdx}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: ROTATION_MS / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}
