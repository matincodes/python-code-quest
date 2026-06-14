import { motion } from 'framer-motion';
import { Code2, Blocks } from 'lucide-react';
import { useUserStore } from '../../store/userStore';

export default function ModeToggle() {
  const { editorMode, setMode } = useUserStore();

  return (
    <div className="flex items-center gap-1 bg-space-950 rounded-full p-1 border border-space-700">
      <button
        onClick={() => setMode('blocks')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
          editorMode === 'blocks'
            ? 'text-space-950 z-10'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        {editorMode === 'blocks' && (
          <motion.span
            layoutId="mode-pill"
            className="absolute inset-0 rounded-full bg-accent-gold shadow-gold-sm"
          />
        )}
        <Blocks className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">BLOCKS <span className="opacity-70">(×0.8)</span></span>
      </button>

      <button
        onClick={() => setMode('code')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-semibold transition-colors ${
          editorMode === 'code'
            ? 'text-space-950 z-10'
            : 'text-white/50 hover:text-white/80'
        }`}
      >
        {editorMode === 'code' && (
          <motion.span
            layoutId="mode-pill"
            className="absolute inset-0 rounded-full bg-accent-gold shadow-gold-sm"
          />
        )}
        <Code2 className="w-3.5 h-3.5 relative z-10" />
        <span className="relative z-10">CODE <span className="opacity-70">(×1.0)</span></span>
      </button>
    </div>
  );
}
