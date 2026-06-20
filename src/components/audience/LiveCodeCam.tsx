import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, EyeOff, Code2 } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import type { LiveCodeFeed } from '../../store/gameStore';
import { useUserStore } from '../../store/userStore';
import StatusDot from '../shared/StatusDot';

const MIN_DISPLAY_MS = 8000;

interface LiveCodeCamProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function LiveCodeCam({ isFullscreen, onToggleFullscreen }: LiveCodeCamProps = {}) {
  const liveCodeFeed = useGameStore((s) => s.liveCodeFeed);
  const students = useGameStore((s) => s.students);
  const { alias: myAlias, codeBroadcastEnabled } = useUserStore();

  const [displayedFeed, setDisplayedFeed] = useState<LiveCodeFeed | null>(liveCodeFeed);
  const displayedSinceRef = useRef<number>(Date.now());
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!liveCodeFeed) {
      setDisplayedFeed(null);
      return;
    }

    const isSameStudent =
      (liveCodeFeed.studentId && liveCodeFeed.studentId === displayedFeed?.studentId) ||
      (liveCodeFeed.alias && liveCodeFeed.alias === displayedFeed?.alias);

    if (isSameStudent) {
      // Same student — update code in place without resetting the timer
      setDisplayedFeed(liveCodeFeed);
      return;
    }

    // Different student — respect the minimum display time
    const elapsed = Date.now() - displayedSinceRef.current;
    const remaining = MIN_DISPLAY_MS - elapsed;

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);

    if (remaining <= 0) {
      setDisplayedFeed(liveCodeFeed);
      displayedSinceRef.current = Date.now();
    } else {
      const captured = liveCodeFeed;
      pendingTimerRef.current = setTimeout(() => {
        setDisplayedFeed(captured);
        displayedSinceRef.current = Date.now();
      }, remaining);
    }
  }, [liveCodeFeed]);

  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  const student = displayedFeed
    ? students.find((s) => s.id === displayedFeed.studentId) ?? students.find((s) => s.alias === displayedFeed.alias)
    : null;

  const broadcastingAlias = student?.alias ?? displayedFeed?.alias;
  const isHidden = broadcastingAlias === myAlias && !codeBroadcastEnabled;

  const lines = displayedFeed ? displayedFeed.code.split('\n') : [];
  const displayLines = lines.slice(-30);

  // Key drives the cross-fade when the student changes
  const feedKey = displayedFeed?.studentId || displayedFeed?.alias || 'none';

  return (
    <div className={`flex flex-col rounded-2xl border overflow-hidden relative ${
      displayedFeed ? 'border-accent-gold/20 bg-space-950 shadow-gold-sm' : 'border-space-700/30 bg-space-900/30'
    } ${isFullscreen ? 'w-full h-full' : 'h-full'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-space-900/80 border-b border-space-700/40 shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={feedKey + '-header'}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 min-w-0"
          >
            {displayedFeed && student ? (
              <>
                <StatusDot status={student.status} />
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display font-bold text-space-950 shrink-0"
                  style={{ backgroundColor: student.avatarColor }}
                >
                  {(student.alias ?? '?').charAt(0)}
                </span>
                <span className="font-display font-semibold text-xs text-white truncate">{student.alias}</span>
              </>
            ) : displayedFeed ? (
              <>
                <StatusDot status="connected" />
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-display font-bold text-space-950 shrink-0"
                  style={{ backgroundColor: '#3DD8FF' }}
                >
                  {(displayedFeed.alias ?? '?').charAt(0)}
                </span>
                <span className="font-display font-semibold text-xs text-white truncate">
                  {displayedFeed.alias ?? 'Hacker'}
                </span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5 text-space-600" />
                <span className="font-display text-xs text-white/30 uppercase tracking-widest">Live Code Cam</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${displayedFeed ? 'bg-accent-gold animate-pulse' : 'bg-space-700'}`} />
            <span className={`font-display text-[10px] uppercase tracking-widest hidden sm:inline-block ${displayedFeed ? 'text-accent-gold' : 'text-white/20'}`}>
              Live Cam
            </span>
          </div>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="text-white/40 hover:text-white transition-colors ml-1"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed custom-scrollbar">
        <AnimatePresence mode="wait">
          {!displayedFeed ? (
            <motion.div
              key="awaiting"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-2 text-white/20"
            >
              <Code2 className="w-6 h-6" />
              <p className="font-body text-center text-[11px]">Awaiting feed…</p>
            </motion.div>
          ) : isHidden ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-2 text-white/30"
            >
              <EyeOff className="w-5 h-5" />
              <p className="font-body">🔒 Hidden by hacker</p>
            </motion.div>
          ) : (
            <motion.div
              key={feedKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-status-success"
            >
              {displayLines.map((line, i) => {
                const globalLineIndex = lines.length - displayLines.length + i;
                const isCursorLine = globalLineIndex === displayedFeed.cursorLine;
                return (
                  <div key={globalLineIndex} className="flex">
                    <span className="w-6 shrink-0 text-space-600 select-none">{globalLineIndex + 1}</span>
                    <span className="whitespace-pre-wrap break-all relative">
                      {line}
                      {isCursorLine && (
                        <motion.span
                          className="inline-block w-2 h-3 bg-status-success ml-0.5 align-middle"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {displayedFeed && (
        <div className="px-3 py-1.5 bg-space-900/50 border-t border-space-700/30 shrink-0 text-right">
          <span className="font-display italic text-[10px] text-white/40">{displayedFeed.mission}</span>
        </div>
      )}
    </div>
  );
}
