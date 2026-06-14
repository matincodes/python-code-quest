import { Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../shared/GlassCard';
import type { Student } from '../../data/mockStudents';

interface LeaderboardPinProps {
  students: Student[];
}

export default function LeaderboardPin({ students }: LeaderboardPinProps) {
  const top3 = [...students].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <GlassCard className="p-4 w-52">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-status-warning" />
        <span className="font-display font-bold text-sm text-status-warning uppercase tracking-wide">Leaderboard</span>
      </div>
      <AnimatePresence mode="popLayout">
        {top3.map((student, idx) => (
          <motion.div
            key={student.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.05 }}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg mb-1 ${
              idx === 0 ? 'bg-status-warning/10' : 'bg-space-800/40'
            }`}
          >
            <span className={`font-display font-bold text-xs w-4 ${
              idx === 0 ? 'text-status-warning' : idx === 1 ? 'text-slate-300' : 'text-slate-500'
            }`}>#{idx + 1}</span>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: student.avatarColor }}
            />
            <span className="flex-1 font-body text-xs text-white truncate">{student.alias}</span>
            <motion.span
              key={student.score}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
              className="font-mono text-xs font-bold text-status-warning"
            >
              {student.score}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </GlassCard>
  );
}
