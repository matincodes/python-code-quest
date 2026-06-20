import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import type { Student } from '../../data/mockStudents';
import type { ScoreSnapshot } from '../../store/gameStore';

interface LeaderboardPinProps {
  students: Student[];
  completionTimes?: Record<string, number>;
  scoreHistory?: Record<string, ScoreSnapshot[]>;
  totalChallenges?: number;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function rankColor(idx: number) {
  if (idx === 0) return 'text-status-warning';
  if (idx === 1) return 'text-slate-300';
  if (idx === 2) return 'text-amber-700';
  return 'text-white/30';
}

export default function LeaderboardPin({
  students,
  completionTimes = {},
  scoreHistory = {},
  totalChallenges,
}: LeaderboardPinProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...students].sort((a, b) => {
    const tc = totalChallenges ?? 0;
    const aFinished = tc > 0 && a.piecesUnlocked >= tc;
    const bFinished = tc > 0 && b.piecesUnlocked >= tc;

    if (aFinished && !bFinished) return -1;
    if (!aFinished && bFinished) return 1;

    if (aFinished && bFinished) {
      if (b.score !== a.score) return b.score - a.score;
      return (completionTimes[a.id] ?? Infinity) - (completionTimes[b.id] ?? Infinity);
    }

    if (b.score !== a.score) return b.score - a.score;
    return b.piecesUnlocked - a.piecesUnlocked;
  });

  const visible = expanded ? sorted : sorted.slice(0, 3);

  return (
    <GlassCard className="p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-status-warning" />
          <span className="font-display font-bold text-sm text-status-warning uppercase tracking-wide">
            Leaderboard
          </span>
        </div>
        {students.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-white/40 hover:text-white/80 transition-colors text-[11px] font-display"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Top 3</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> All {students.length}</>
            )}
          </button>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {visible.map((student, idx) => {
          const tc = totalChallenges ?? 0;
          const finished = tc > 0 && student.piecesUnlocked >= tc;

          // Finished students show their completion time; others show last solve time
          const finishTs = completionTimes[student.id];
          const history = scoreHistory[student.id] ?? [];
          const lastSolveTs = history.length > 0 ? history[history.length - 1].timestamp : null;
          const displayTs = finished ? (finishTs ?? lastSolveTs) : lastSolveTs;

          return (
            <motion.div
              key={student.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.03 }}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 ${
                finished
                  ? 'bg-status-success/10 border border-status-success/20'
                  : idx === 0
                  ? 'bg-status-warning/10 border border-status-warning/20'
                  : 'bg-space-800/40'
              }`}
            >
              <span className={`font-display font-bold text-xs w-5 shrink-0 ${rankColor(idx)}`}>
                #{idx + 1}
              </span>

              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: student.avatarColor }}
              />

              <div className="flex-1 min-w-0">
                <span className="font-body text-xs text-white truncate block">{student.alias}</span>
                {displayTs && (
                  <span className={`font-mono text-[10px] leading-none ${finished ? 'text-status-success' : 'text-white/35'}`}>
                    {finished ? '✓ ' : ''}{formatTime(displayTs)}
                  </span>
                )}
              </div>

              {finished && (
                <span title="Completed all challenges">
                  <CheckCircle2 className="w-3 h-3 text-status-success shrink-0" />
                </span>
              )}

              <motion.span
                key={student.score}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
                className="font-mono text-xs font-bold text-status-warning shrink-0"
              >
                {student.score} pts
              </motion.span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {!expanded && sorted.length > 3 && (
        <p className="text-center text-[10px] text-white/20 font-body mt-1">
          +{sorted.length - 3} more hackers
        </p>
      )}
    </GlassCard>
  );
}
