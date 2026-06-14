import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownTimerProps {
  seconds: number;
  onExpire?: () => void;
  isPaused?: boolean;
}

export default function CountdownTimer({ seconds, onExpire, isPaused = false }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (isPaused) return;
    
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire, isPaused]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const isCritical = remaining <= 10;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={remaining}
        className={`font-mono text-xl font-bold tabular-nums ${
          isCritical ? 'text-status-danger' : 'text-accent-gold'
        }`}
        animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
      >
        {mins}:{secs}
      </motion.span>
    </AnimatePresence>
  );
}
