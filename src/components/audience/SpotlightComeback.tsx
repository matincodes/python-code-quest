import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { Student } from '../../data/mockStudents';
import type { ScoreSnapshot } from '../../store/gameStore';

interface Props {
  student: Student;
  history: ScoreSnapshot[];
  gained: number;
}

export default function SpotlightComeback({ student, history, gained }: Props) {
  // Build a mini sparkline from score history (normalize to 0-100% height)
  const maxScore = Math.max(...history.map((h) => h.score), 1);
  const minScore = Math.min(...history.map((h) => h.score), 0);
  const range = maxScore - minScore || 1;
  const W = 120;
  const H = 40;
  const points = history.map((snap, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * W;
    const y = H - ((snap.score - minScore) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full text-center">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-status-success" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Comeback!</span>
      </div>

      {/* Avatar */}
      <motion.div
        className="w-14 h-14 rounded-full border-2 border-status-success/60 shadow-gold-sm flex items-center justify-center text-xl font-display font-bold text-space-950"
        style={{ backgroundColor: student.avatarColor }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {student.alias.charAt(0)}
      </motion.div>

      <div>
        <p className="font-display font-bold text-xl text-white">{student.alias}</p>
        <motion.p
          className="font-mono font-bold text-status-success text-2xl mt-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          +{gained} pts
        </motion.p>
        <p className="font-body text-xs text-white/40 mt-0.5">in the last 2 minutes</p>
      </div>

      {/* Sparkline */}
      {history.length > 1 && (
        <div className="w-full px-4">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
            <polyline
              points={points}
              fill="none"
              stroke="#42FF7B"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
            {/* Gradient fill under line */}
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#42FF7B" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#42FF7B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${H} ${points} ${W},${H}`}
              fill="url(#sg)"
            />
          </svg>
          <p className="text-[10px] font-mono text-white/20 text-right mt-0.5">Last 2 min</p>
        </div>
      )}

      <div className="rounded-xl bg-space-900/60 border border-status-success/20 px-4 py-2">
        <p className="font-body text-xs text-white/40">Total score</p>
        <p className="font-mono font-bold text-status-warning text-lg">{student.score}</p>
      </div>
    </div>
  );
}
