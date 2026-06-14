import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import type { Student } from '../../data/mockStudents';

const PIECE_THRESHOLDS = [10, 20, 30, 40, 60, 80]; // score needed for each piece

interface Props {
  student: Student;
}

export default function SpotlightClosestToLaunch({ student }: Props) {
  const nextPiece = student.piecesUnlocked;
  const nextThreshold = PIECE_THRESHOLDS[nextPiece] ?? null;
  const ptsNeeded = nextThreshold !== null ? Math.max(0, nextThreshold - student.score) : 0;
  const progressPct = nextThreshold
    ? Math.min(100, ((student.score - (PIECE_THRESHOLDS[nextPiece - 1] ?? 0)) /
        (nextThreshold - (PIECE_THRESHOLDS[nextPiece - 1] ?? 0))) * 100)
    : 100;
  const isComplete = nextThreshold === null;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full text-center">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-status-danger" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Closest to Launch</span>
      </div>

      {/* Avatar */}
      <motion.div
        className="w-16 h-16 rounded-full border-2 border-status-danger/60 shadow-gold-sm flex items-center justify-center text-2xl font-display font-bold text-space-950"
        style={{ backgroundColor: student.avatarColor }}
        animate={{ boxShadow: ['0 0 16px rgba(255,107,181,0.2)', '0 0 32px rgba(255,107,181,0.5)', '0 0 16px rgba(255,107,181,0.2)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {student.alias.charAt(0)}
      </motion.div>

      <div>
        <p className="font-display font-bold text-xl text-white">{student.alias}</p>
        <p className="font-mono text-status-warning text-sm mt-0.5">{student.score} pts</p>
      </div>

      {/* Progress bar to next piece */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>Piece {nextPiece + 1}</span>
          {!isComplete && <span className="text-status-danger font-bold">+{ptsNeeded} pts away!</span>}
        </div>
        <div className="w-full h-3 rounded-full bg-space-800 overflow-hidden border border-space-700/40">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-status-danger to-accent-gold-muted"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/20">
          <span>{PIECE_THRESHOLDS[nextPiece - 1] ?? 0}</span>
          <span>{nextThreshold ?? '🚀 LAUNCHED'}</span>
        </div>
      </div>

      {/* Pieces unlocked dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={i}
            className={`w-3 h-3 rounded-sm ${i < student.piecesUnlocked ? 'bg-status-danger' : 'bg-space-700'}`}
            animate={i === student.piecesUnlocked - 1 ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
