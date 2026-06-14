import { motion } from 'framer-motion';
import type { Student } from '../../data/mockStudents';
import SpaceBasePlot from './SpaceBasePlot';

interface Props {
  studentA: Student;
  studentB: Student;
  rankA: number;
  rankB: number;
  totalChallenges: number;
}

export default function SpotlightHeadToHead({ studentA, studentB, rankA, rankB, totalChallenges }: Props) {
  const gap = studentA.score - studentB.score;
  const closing = gap < 15; // gap is small → tension

  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Head to Head</span>
      </div>

      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-2 items-center min-h-0">
        {/* Player A */}
        <motion.div
          initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="h-full flex flex-col"
        >
          <SpaceBasePlot student={studentA} isLeader={rankA === 1} totalChallenges={totalChallenges} />
        </motion.div>

        {/* VS Divider */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="font-display font-bold text-sm text-white/60">VS</span>
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-space-600 to-transparent" />
          <motion.span
            className={`font-mono text-xs font-bold ${closing ? 'text-status-warning' : 'text-white/30'}`}
            animate={{ opacity: closing ? [1, 0.4, 1] : 1 }}
            transition={{ duration: 1.5, repeat: closing ? Infinity : 0 }}
          >
            {closing ? '▲ CLOSING' : `+${gap}`}
          </motion.span>
        </div>

        {/* Player B */}
        <motion.div
          initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="h-full flex flex-col"
        >
          <SpaceBasePlot student={studentB} isLeader={rankB === 1} totalChallenges={totalChallenges} />
        </motion.div>
      </div>

      {/* Score comparison bar */}
      <div className="shrink-0 grid grid-cols-2 gap-1 text-center">
        <div className="rounded-lg bg-space-900/60 border border-accent-gold/20 px-2 py-1">
          <p className="font-mono font-bold text-status-warning text-sm">{studentA.score}</p>
          <p className="font-display text-[10px] text-white/40">#{rankA}</p>
        </div>
        <div className="rounded-lg bg-space-900/60 border border-space-700/20 px-2 py-1">
          <p className="font-mono font-bold text-status-warning text-sm">{studentB.score}</p>
          <p className="font-display text-[10px] text-white/40">#{rankB}</p>
        </div>
      </div>
    </div>
  );
}
