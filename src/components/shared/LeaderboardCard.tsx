import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Student } from '../../data/mockStudents';

interface LeaderboardCardProps {
  students: Student[];
  top?: number;
  compact?: boolean;
}

export default function LeaderboardCard({ students, top = 5, compact = false }: LeaderboardCardProps) {
  const sorted = [...students].sort((a, b) => b.score - a.score).slice(0, top);

  return (
    <div className="space-y-1">
      <AnimatePresence mode="popLayout">
        {sorted.map((student, idx) => (
          <motion.div
            key={student.id}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center gap-3 ${compact ? 'py-1 px-2' : 'py-2 px-3'} rounded-xl ${
              idx === 0 ? 'bg-status-warning/10 border border-status-warning/30' : 'bg-space-800/50'
            }`}
          >
            <span className={`font-display font-bold text-sm w-5 text-center ${
              idx === 0 ? 'text-status-warning' : idx === 1 ? 'text-slate-300' : 'text-slate-500'
            }`}>
              {idx === 0 ? <Trophy className="w-4 h-4 text-status-warning" /> : `#${idx + 1}`}
            </span>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: student.avatarColor }}
            />
            <span className="flex-1 font-body text-sm text-white truncate">{student.alias}</span>
            <motion.span
              className="font-mono text-sm font-bold text-status-warning tabular-nums"
              key={student.score}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              {student.score}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
