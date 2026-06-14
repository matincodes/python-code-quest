import { motion, AnimatePresence } from 'framer-motion';
import type { MontyState } from '../../store/montyStore';

interface MontyAvatarProps {
  state: MontyState;
  size?: number;
}

const stateConfig: Record<MontyState, { bg: string; emoji: string; label: string }> = {
  idle: { bg: 'bg-accent-gold/20 border-accent-gold/40', emoji: '🤖', label: 'idle' },
  thinking: { bg: 'bg-status-warning/20 border-status-warning/40', emoji: '🤔', label: 'thinking' },
  happy: { bg: 'bg-status-success/20 border-status-success/40', emoji: '😄', label: 'happy' },
  celebrating: { bg: 'bg-status-warning/20 border-status-warning/40', emoji: '🎉', label: 'celebrating' },
  sad: { bg: 'bg-status-danger/20 border-status-danger/40', emoji: '😟', label: 'sad' },
  hint: { bg: 'bg-status-danger/20 border-status-danger/40', emoji: '💡', label: 'hint' },
};

export default function MontyAvatar({ state, size = 80 }: MontyAvatarProps) {
  const config = stateConfig[state];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ width: size, height: size }}
        className={`rounded-full border-2 ${config.bg} flex items-center justify-center relative shrink-0`}
      >
        <motion.span
          style={{ fontSize: size * 0.45 }}
          animate={
            state === 'celebrating'
              ? { rotate: [-10, 10, -10, 10, 0], y: [0, -4, 0] }
              : state === 'thinking'
              ? { rotate: [0, -5, 5, 0] }
              : {}
          }
          transition={{ duration: 0.8, repeat: state === 'idle' || state === 'thinking' ? Infinity : 0, repeatDelay: 3 }}
        >
          {config.emoji}
        </motion.span>

        {/* "M" label badge */}
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-space-800 border border-space-700 flex items-center justify-center text-xs font-display font-bold text-accent-gold"
          style={{ fontSize: 10 }}
        >
          M
        </span>

        {/* Idle breathing ring */}
        {state === 'idle' && (
          <motion.span
            className="absolute inset-0 rounded-full border border-accent-gold/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
