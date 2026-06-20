import { motion } from 'framer-motion';
import type { Student } from '../../data/mockStudents';
import SpaceBasePlot from './SpaceBasePlot';
import { getVisualPieces, VISUAL_PIECE_COUNT } from '../../utils/pieces';

interface Props {
  student: Student;
  rank: number;
  totalChallenges: number;
}

export default function SpotlightStudent({ student, rank, totalChallenges }: Props) {
  const visualPieces = getVisualPieces(student.piecesUnlocked, totalChallenges);
  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      {/* Label */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Spotlight</span>
        <span className="font-mono text-xs text-white/30 ml-auto">#{rank}</span>
      </div>

      {/* Zoomed plot */}
      <motion.div
        className="flex-1 rounded-xl overflow-hidden border border-accent-gold/40 shadow-gold-sm"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="transform scale-110 origin-center h-full flex items-center justify-center p-2">
          <SpaceBasePlot
            student={student}
            isLeader={rank === 1}
            totalChallenges={totalChallenges}
          />
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <div className="rounded-xl bg-space-900/60 border border-space-700/30 px-3 py-2">
          <p className="font-body text-xs text-white/40">Score</p>
          <p className="font-mono font-bold text-status-warning text-lg leading-tight">{student.score}</p>
        </div>
        <div className="rounded-xl bg-space-900/60 border border-space-700/30 px-3 py-2">
          <p className="font-body text-xs text-white/40">Pieces</p>
          <p className="font-mono font-bold text-accent-gold text-lg leading-tight">
            {visualPieces} <span className="text-white/20 text-xs font-normal">/ {VISUAL_PIECE_COUNT}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
