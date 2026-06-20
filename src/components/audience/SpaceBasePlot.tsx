import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Brain, CheckCircle2, XCircle, Lightbulb, Clock, Loader2 } from 'lucide-react';
import type { Student, PlotStatus } from '../../data/mockStudents';
import { getVisualPieces } from '../../utils/pieces';

interface SpaceBasePlotProps {
  student: Student;
  isLeader?: boolean;
  totalChallenges?: number;
}

// ── Status chip config ───────────────────────────────────────────────────────
const STATUS_MAP: Record<PlotStatus, {
  label: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
  pulse?: boolean;
  shake?: boolean;
  spin?: boolean;
}> = {
  idle: { label: 'Idle', bg: 'bg-space-700/80', text: 'text-white/50', icon: <Clock className="w-3 h-3" /> },
  writing: { label: 'Writing…', bg: 'bg-accent-gold/20 border border-accent-gold/40', text: 'text-accent-gold', icon: <Pencil className="w-3 h-3" />, pulse: true },
  thinking: { label: 'Thinking…', bg: 'bg-status-warning/20 border border-status-warning/40', text: 'text-status-warning', icon: <Brain className="w-3 h-3" />, pulse: true },
  running: { label: 'Running…', bg: 'bg-status-warning/20 border border-status-warning/40', text: 'text-status-warning', icon: <Loader2 className="w-3 h-3" />, spin: true },
  success: { label: 'Solved!', bg: 'bg-status-success/20 border border-status-success/40', text: 'text-status-success', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: 'Failed', bg: 'bg-status-danger/20 border border-status-danger/40', text: 'text-status-danger', icon: <XCircle className="w-3 h-3" />, shake: true },
  hint_used: { label: 'Hint', bg: 'bg-status-danger/20 border border-status-danger/40', text: 'text-status-danger', icon: <Lightbulb className="w-3 h-3" /> },
  awaiting: { label: 'Awaiting', bg: 'bg-space-800/60', text: 'text-white/20', icon: <Clock className="w-3 h-3" /> },
};

// ── Base piece definitions ────────────────────────────────────────────────────
const BASE_PIECES = [
  { id: 'foundation', label: 'Foundation', color: '#2A3170', h: 16, shape: 'rect' },
  { id: 'walls', label: 'Walls', color: '#1A2153', h: 24, shape: 'walls' },
  { id: 'solar', label: 'Solar Panel', color: '#3DD8FF', h: 8, shape: 'panel' },
  { id: 'tower', label: 'Radio Tower', color: '#42FF7B', h: 32, shape: 'tower' },
  { id: 'launchpad', label: 'Launch Pad', color: '#FFB347', h: 12, shape: 'pad' },
  { id: 'rocket', label: 'Rocket', color: '#FF6BB5', h: 40, shape: 'rocket' },
];

const pieceVariants = {
  hidden: { opacity: 0, y: -30, scale: 0.5 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 15 } },
} as const;

const shakeVariants = {
  shake: { x: [0, -4, 4, -4, 4, 0], transition: { duration: 0.4 } },
};

function PieceShape({ shape, color }: { shape: string; color: string }) {
  const w = 80;
  switch (shape) {
    case 'rect':
      return <rect x={4} y={0} width={w - 8} height={12} rx={2} fill={color} opacity={0.9} />;
    case 'walls':
      return (
        <>
          <rect x={8} y={0} width={w - 16} height={20} rx={3} fill={color} />
          <rect x={16} y={4} width={8} height={12} rx={1} fill="#3DD8FF" opacity={0.4} />
          <rect x={w - 24} y={4} width={8} height={12} rx={1} fill="#3DD8FF" opacity={0.4} />
        </>
      );
    case 'panel':
      return (
        <>
          <rect x={12} y={0} width={20} height={6} rx={1} fill={color} />
          <rect x={w - 32} y={0} width={20} height={6} rx={1} fill={color} />
          <rect x={38} y={2} width={4} height={4} rx={1} fill="#ffffff" opacity={0.4} />
        </>
      );
    case 'tower':
      return (
        <>
          <rect x={37} y={0} width={6} height={28} rx={2} fill={color} />
          <circle cx={40} cy={4} r={4} fill={color} />
          <line x1={40} y1={4} x2={20} y2={14} stroke={color} strokeWidth={1.5} opacity={0.5} />
          <line x1={40} y1={4} x2={60} y2={14} stroke={color} strokeWidth={1.5} opacity={0.5} />
        </>
      );
    case 'pad':
      return (
        <>
          <ellipse cx={40} cy={8} rx={30} ry={6} fill={color} opacity={0.7} />
          <rect x={32} y={2} width={16} height={8} rx={2} fill={color} />
        </>
      );
    case 'rocket':
      return (
        <>
          <polygon points="40,0 30,8 50,8" fill={color} />
          <rect x={33} y={8} width={14} height={28} rx={4} fill={color} />
          <polygon points="33,36 26,48 40,42" fill="#FFB347" opacity={0.8} />
          <polygon points="47,36 54,48 40,42" fill="#FFB347" opacity={0.8} />
          <circle cx={40} cy={14} r={4} fill="#ffffff" opacity={0.3} />
        </>
      );
    default:
      return <rect x={4} y={0} width={w - 8} height={10} rx={2} fill={color} />;
  }
}

// ── Status Chip sub-component ────────────────────────────────────────────────
function StatusChip({ status }: { status: PlotStatus }) {
  const cfg = STATUS_MAP[status];
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={cfg.shake ? 'shake' : { opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      variants={cfg.shake ? shakeVariants : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-display font-bold ${cfg.bg} ${cfg.text}`}
    >
      <span className={cfg.spin ? 'animate-spin' : cfg.pulse ? 'animate-pulse' : ''}>
        {cfg.icon}
      </span>
      {cfg.label}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SpaceBasePlot({ student, isLeader = false, totalChallenges = 9 }: SpaceBasePlotProps) {
  const visualPieces = getVisualPieces(student.piecesUnlocked, totalChallenges);
  const pieces = BASE_PIECES.slice(0, visualPieces);
  const isLaunching = visualPieces >= BASE_PIECES.length;
  const plotStatus: PlotStatus = student.plotStatus ?? (student.status === 'disconnected' ? 'awaiting' : 'idle');

  return (
    <div className={`relative flex flex-col bg-space-900/40 border rounded-2xl p-3 gap-2 transition-shadow ${isLeader ? 'border-status-warning/50 shadow-gold-sm' : 'border-space-700/40'
      }`}>

      {/* ── Status chip — absolutely positioned top-right ── */}
      <div className="absolute top-2 right-2 z-10">
        <AnimatePresence mode="wait">
          <StatusChip key={plotStatus} status={plotStatus} />
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 pr-16">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-display font-bold text-space-950 shrink-0"
          style={{ backgroundColor: student.avatarColor }}
        >
          {student.alias.charAt(0)}
        </span>
        <span className="font-display font-semibold text-sm text-white truncate">{student.alias}</span>
        {isLeader && <span className="text-status-warning text-xs">👑</span>}
        <span className="font-mono text-status-warning font-bold text-xs ml-auto">{student.score}</span>
      </div>

      {/* Space Base Canvas */}
      <div className="relative flex items-end justify-center" style={{ height: 120 }}>
        <div className="absolute bottom-0 left-2 right-2 h-1 rounded-full bg-space-700/50" />
        <div className="relative flex flex-col-reverse items-center pb-1" style={{ width: 80 }}>
          <AnimatePresence>
            {pieces.map((piece) => (
              <motion.svg
                key={piece.id}
                variants={pieceVariants}
                initial="hidden"
                animate="visible"
                width={80}
                height={piece.h}
                className="overflow-visible"
                style={{ marginTop: -2 }}
              >
                <PieceShape shape={piece.shape} color={piece.color} />
              </motion.svg>
            ))}
          </AnimatePresence>
          {pieces.length === 0 && (
            <div className="text-white/20 text-xs font-body text-center pb-2">Awaiting…</div>
          )}
          {isLaunching && (
            <motion.div
              className="absolute text-lg"
              animate={{ y: [-0, -60], opacity: [1, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              style={{ bottom: 40 }}
            >
              🚀
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1 justify-center flex-wrap">
        {Array.from({ length: totalChallenges }).map((_, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i < student.piecesUnlocked ? 'bg-accent-gold' : 'bg-space-700'}`}
          />
        ))}
      </div>
    </div>
  );
}
