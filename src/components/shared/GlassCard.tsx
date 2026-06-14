import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', glow = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 ${
        glow ? 'shadow-gold-md border-accent-gold/20' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
