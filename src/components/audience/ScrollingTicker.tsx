interface ScrollingTickerProps {
  text: string;
}

export default function ScrollingTicker({ text }: ScrollingTickerProps) {
  // Duplicate content so the scroll is seamless
  const content = `${text}   🚀   ${text}`;

  return (
    <div className="w-full h-[44px] bg-space-900/90 border-t border-space-700/50 flex items-center overflow-hidden shrink-0">
      {/* LIVE badge */}
      <div className="flex items-center gap-2 shrink-0 px-4 text-accent-gold font-display font-bold text-xs uppercase tracking-widest border-r border-space-700/50 h-full">
        LIVE
        <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden h-full flex items-center relative">
        <p
          className="ticker-scroll font-body text-sm text-white/70 whitespace-nowrap absolute"
          style={{ animation: 'ticker-slide 60s linear infinite' }}
        >
          {content}
        </p>
      </div>

      <style>{`
        @keyframes ticker-slide {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
