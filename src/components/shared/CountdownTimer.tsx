import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

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

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isPaused) return;
    if (remaining <= 0) {
      onExpireRef.current?.();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, isPaused]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const isCritical = remaining <= 10;

  return (
    <motion.span
      className={`font-mono text-xl font-bold tabular-nums ${
        isCritical ? 'text-status-danger' : 'text-accent-gold'
      }`}
      animate={isCritical ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: isCritical ? Infinity : 0 }}
    >
      {mins}:{secs}
    </motion.span>
  );
}
