import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MontyBubbleProps {
  text: string | null;
  onComplete?: () => void;
  duration?: number;
  wide?: boolean;
}

export default function MontyBubble({ text, onComplete, duration = 4000, wide = false }: MontyBubbleProps) {
  const [displayed, setDisplayed] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      setDisplayed('');
      return;
    }
    setVisible(true);
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        if (duration > 0) {
          const timeout = setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, duration);
          return () => clearTimeout(timeout);
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [text, duration, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={`relative bg-space-800 border border-space-700 rounded-2xl px-4 py-3 ${
            wide ? 'max-w-xs' : 'max-w-[200px]'
          } pointer-events-auto pr-8`}
        >
          {duration === 0 && (
            <button 
              onClick={() => {
                setVisible(false);
                onComplete?.();
              }}
              className="absolute top-2 right-2 text-white/50 hover:text-white bg-space-700/50 hover:bg-space-700 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <p className="font-display text-sm text-white leading-snug">{displayed}</p>
          {/* Tail */}
          <span className="absolute -bottom-2 left-4 w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-space-800" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
