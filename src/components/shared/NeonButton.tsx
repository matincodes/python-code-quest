import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'success' | 'warning' | 'danger';

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'border-accent-gold/40 text-accent-gold bg-accent-gold/[0.08] hover:bg-accent-gold/[0.15] hover:border-accent-gold/60',
  success:
    'border-status-success/40 text-status-success bg-status-success/[0.08] hover:bg-status-success/[0.15] hover:border-status-success/60',
  warning:
    'border-status-warning/40 text-status-warning bg-status-warning/[0.08] hover:bg-status-warning/[0.15] hover:border-status-warning/60',
  danger:
    'border-status-danger/40 text-status-danger bg-status-danger/[0.08] hover:bg-status-danger/[0.15] hover:border-status-danger/60',
};

export default function NeonButton({
  children,
  onClick,
  variant = 'primary',
  icon,
  disabled = false,
  type = 'button',
  className = '',
}: NeonButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border font-display font-semibold text-sm tracking-wide transition-all duration-200 ${variantStyles[variant]} ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
