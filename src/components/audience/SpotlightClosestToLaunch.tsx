import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import type { Student } from '../../data/mockStudents';
import {
  getVisualPieces,
  getNextPieceThreshold,
  getPrevPieceThreshold,
  getChallengesNeededForNextPiece,
  getPieceProgressPct,
  VISUAL_PIECE_COUNT,
} from '../../utils/pieces';

interface Props {
  student: Student;
  totalChallenges: number;
}

export default function SpotlightClosestToLaunch({ student, totalChallenges }: Props) {
  const visualPieces = getVisualPieces(student.piecesUnlocked, totalChallenges);
  const nextThreshold = getNextPieceThreshold(student.piecesUnlocked, totalChallenges);
  const prevThreshold = getPrevPieceThreshold(student.piecesUnlocked, totalChallenges);
  const challengesNeeded = getChallengesNeededForNextPiece(student.piecesUnlocked, totalChallenges);
  const progressPct = getPieceProgressPct(student.piecesUnlocked, totalChallenges);
  const isComplete = nextThreshold === null;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4 h-full text-center">
      <div className="flex items-center gap-2">
        <Rocket className="w-4 h-4 text-status-danger" />
        <span className="font-display text-xs text-white/40 uppercase tracking-widest">Closest to Launch</span>
      </div>

      {/* Avatar */}
      <motion.div
        className="w-16 h-16 rounded-full border-2 border-status-danger/60 shadow-gold-sm flex items-center justify-center text-2xl font-display font-bold text-space-950"
        style={{ backgroundColor: student.avatarColor }}
        animate={{ boxShadow: ['0 0 16px rgba(255,107,181,0.2)', '0 0 32px rgba(255,107,181,0.5)', '0 0 16px rgba(255,107,181,0.2)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {student.alias.charAt(0)}
      </motion.div>

      <div>
        <p className="font-display font-bold text-xl text-white">{student.alias}</p>
        <p className="font-mono text-status-warning text-sm mt-0.5">{student.score} pts</p>
      </div>

      {/* Progress bar to next piece */}
      <div className="w-full space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>Piece {visualPieces + 1}</span>
          {!isComplete && (
            <span className="text-status-danger font-bold">
              {challengesNeeded === 1 ? '1 solve away!' : `${challengesNeeded} solves away!`}
            </span>
          )}
        </div>
        <div className="w-full h-3 rounded-full bg-space-800 overflow-hidden border border-space-700/40">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-status-danger to-accent-gold-muted"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-white/20">
          <span>Q{prevThreshold}</span>
          <span>{isComplete ? '🚀 LAUNCHED' : `Q${nextThreshold}`}</span>
        </div>
      </div>

      {/* Visual piece dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: VISUAL_PIECE_COUNT }).map((_, i) => (
          <motion.span
            key={i}
            className={`w-3 h-3 rounded-sm ${i < visualPieces ? 'bg-status-danger' : 'bg-space-700'}`}
            animate={i === visualPieces - 1 ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
