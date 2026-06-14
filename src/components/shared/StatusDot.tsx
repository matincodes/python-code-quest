import { motion } from 'framer-motion';

type Status = 'connected' | 'disconnected' | 'coding';

interface StatusDotProps {
  status: Status;
}

const colorMap: Record<Status, string> = {
  connected: 'bg-status-success',
  disconnected: 'bg-status-danger',
  coding: 'bg-status-warning',
};

export default function StatusDot({ status }: StatusDotProps) {
  return (
    <motion.span
      className={`inline-block w-2 h-2 rounded-full ${colorMap[status]}`}
      animate={status === 'coding' ? { opacity: [1, 0.3, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}
