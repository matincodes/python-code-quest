import { motion } from 'framer-motion';
import { Star, Clock, Zap } from 'lucide-react';
import type { LatestSolve } from '../../store/gameStore';
import type { Student } from '../../data/mockStudents';

interface Props {
  solve: LatestSolve;
  student: Student | undefined;
}

export default function SpotlightLatestSolve({ solve, student }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full text-center">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-status-warning" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Just Solved!</span>
      </div>

      {/* Burst animation */}
      <motion.div
        className="relative flex items-center justify-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 15 }}
      >
        {/* Glow ring */}
        <motion.div
          className="absolute w-20 h-20 rounded-full border-2 border-status-warning/40"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div
          className="w-16 h-16 rounded-full border-2 border-status-warning/60 shadow-gold-sm flex items-center justify-center text-2xl font-display font-bold text-space-950"
          style={{ backgroundColor: student?.avatarColor ?? '#FFE34D' }}
        >
          {solve.alias.charAt(0)}
        </div>
      </motion.div>

      {/* Alias + mission */}
      <div>
        <p className="font-display font-bold text-2xl text-white">{solve.alias}</p>
        <p className="font-body text-xs text-white/50 mt-0.5">solved</p>
        <p className="font-display font-semibold text-sm text-accent-gold mt-1 px-2">{solve.missionTitle}</p>
      </div>

      {/* Stats chips */}
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-warning/10 border border-status-warning/30">
          <Zap className="w-3 h-3 text-status-warning" />
          <span className="font-mono font-bold text-status-warning text-sm">+{solve.points} pts</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-space-800 border border-space-700/40">
          <Clock className="w-3 h-3 text-white/40" />
          <span className="font-mono text-white/60 text-sm">{solve.timeTaken}s</span>
        </div>
      </div>

      {/* Sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-status-warning text-xs"
            style={{
              left: `${15 + i * 13}%`,
              top: `${20 + (i % 3) * 20}%`,
            }}
            animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity, repeatDelay: 1 }}
          >
            ✦
          </motion.div>
        ))}
      </div>
    </div>
  );
}
