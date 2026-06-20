import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import type { Student } from '../../data/mockStudents';

interface LeaderboardPinProps {
  students: Student[];
  completionTimes?: Record<string, number>;
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

export default function LeaderboardPin({ students, completionTimes = {}, totalChallenges }: LeaderboardPinProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...students].sort((a, b) => {
    const tc = totalChallenges ?? 0;
    const aFinished = tc > 0 && a.piecesUnlocked >= tc;
    const bFinished = tc > 0 && b.piecesUnlocked >= tc;

    // Finished beats unfinished
    if (aFinished && !bFinished) return -1;
    if (!aFinished && bFinished) return 1;

    // Both finished: higher score wins, then earlier finish time
    if (aFinished && bFinished) {
      if (b.score !== a.score) return b.score - a.score;
      return (completionTimes[a.id] ?? Infinity) - (completionTimes[b.id] ?? Infinity);
    }

    // Neither finished: higher score wins, then more pieces
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
          const finishTs = completionTimes[student.id];

          return (
            <motion.div
              key={student.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.03 }}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 ${
                idx === 0 ? 'bg-status-warning/10 border border-status-warning/20' :
                finished ? 'bg-status-success/10 border border-status-success/10' :
                'bg-space-800/40'
              }`}
            >
              <span className={`font-display font-bold text-xs w-5 shrink-0 ${rankColor(idx)}`}>
                #{idx + 1}
              </span>

              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: student.avatarColor }}
              />

              <span className="flex-1 font-body text-xs text-white truncate min-w-0">
                {student.alias}
              </span>

              {finished && (
                <span title={finishTs ? `Finished at ${formatTime(finishTs)}` : 'Finished'}>
                  <CheckCircle2 className="w-3 h-3 text-status-success shrink-0" />
                </span>
              )}

              <div className="flex flex-col items-end shrink-0 min-w-[40px]">
                <motion.span
                  key={student.score}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                  className="font-mono text-xs font-bold text-status-warning leading-none"
                >
                  {student.score}
                </motion.span>
                {finished && finishTs && (
                  <span className="font-mono text-[9px] text-status-success/70 leading-none mt-0.5">
                    {formatTime(finishTs)}
                  </span>
                )}
              </div>
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
