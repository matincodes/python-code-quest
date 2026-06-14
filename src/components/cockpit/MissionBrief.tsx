import { useState } from 'react';
import { Target, Clock, Terminal, Copy, Check } from 'lucide-react';
import GlassCard from '../shared/GlassCard';
import type { Challenge } from '../../data/mockChallenges';

interface MissionBriefProps {
  challenge: Challenge;
}

const difficultyConfig = {
  1: { label: 'EASY', color: 'text-status-success border-status-success/40 bg-status-success/10' },
  2: { label: 'MEDIUM', color: 'text-accent-gold border-accent-gold/40 bg-accent-gold/10' },
  3: { label: 'HARD', color: 'text-status-danger border-status-danger/40 bg-status-danger/10' },
};

export default function MissionBrief({ challenge }: MissionBriefProps) {
  const diff = difficultyConfig[challenge.difficulty];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(challenge.expectedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="flex flex-col gap-5 h-full">
      <div className="flex items-start justify-between gap-3 border-b border-space-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-accent-gold" />
            <h2 className="font-display font-bold text-lg text-white leading-tight">
              {challenge.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`shrink-0 text-[10px] font-display font-bold px-2 py-0.5 rounded-full border ${diff.color}`}>
              {diff.label}
            </span>
            <span className="font-display font-bold text-status-warning text-xs">
              {challenge.points} pts
            </span>
            <div className="flex items-center gap-1 text-white/40 text-xs font-body">
              <Clock className="w-3.5 h-3.5" /> {challenge.timeLimit}s
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 font-body text-sm text-white/80 leading-relaxed overflow-y-auto pr-2 space-y-4">
        {challenge.description.split('\n\n').map((paragraph, i) => (
          <p key={i} className="text-white/80">{paragraph}</p>
        ))}
      </div>

      <div className="rounded-xl bg-space-950/80 border border-space-700 p-4 mt-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-status-success" />
            <span className="text-xs font-display font-bold text-white/50 uppercase tracking-widest">Expected Output</span>
          </div>
          <button 
            onClick={handleCopy}
            className="text-white/40 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <pre className="font-mono text-sm text-status-success whitespace-pre-wrap p-3 bg-black/40 rounded-lg border border-white/5">{challenge.expectedOutput}</pre>
      </div>
    </GlassCard>
  );
}
