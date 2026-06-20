/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket } from 'lucide-react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import MontyAvatar from '../components/monty/MontyAvatar';
import MontyBubble from '../components/monty/MontyBubble';
import { useUserStore } from '../store/userStore';
import { api } from '../api/client';

const LOBBY_LINES = [
  "Welcome, Commander! Ready to code?",
  "Beginners welcome — I'll guide you.",
  "Let's launch this rocket together!",
];

// Generated once at module load — no randomness during render
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  size: Math.random() * 2 + 1,
  duration: Math.random() * 4 + 2,
  delay: Math.random() * 5,
}));

function Starfield() {
  const stars = STARS;
  return (
    <div className="fixed inset-0 pointer-events-none">
      {stars.map((s) => (
        <span
          key={s.id}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            '--duration': `${s.duration}s`,
            '--delay': `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const { setAlias, setPin, setRole, setIsBeginner } = useUserStore();


  const [pin, setPinValue] = useState('');
  const [alias, setAliasValue] = useState('');
  const [isBeginner, setIsBeginnerValue] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ pin?: string; alias?: string }>({});
  const [lobbyLineIdx, setLobbyLineIdx] = useState(0);
  const [currentLine, setCurrentLine] = useState(LOBBY_LINES[0]);

  useEffect(() => {
    const id = setInterval(() => {
      setLobbyLineIdx((i) => {
        const next = (i + 1) % LOBBY_LINES.length;
        setCurrentLine(LOBBY_LINES[next]);
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const [skillError, setSkillError] = useState('');

  const validate = () => {
    const errs: typeof errors = {};
    if (!/^\d{4}$/.test(pin)) errs.pin = 'Mission code must be exactly 4 digits.';
    if (alias.trim().length < 2 || alias.trim().length > 12) errs.alias = 'Alias must be 2–12 characters.';
    setErrors(errs);
    if (isBeginner === null) {
      setSkillError('Please select your skill level.');
      return false;
    }
    setSkillError('');
    return Object.keys(errs).length === 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Validate PIN with backend
      const session = await api.sessions.getByPin(pin);
      
      if (session.status === 'ended') {
        throw new Error('This session has ended.');
      }
      
      setAlias(alias.trim());
      setPin(pin);
      setRole('student');
      if (isBeginner !== null) setIsBeginner(isBeginner);
      
      navigate('/cockpit');
    } catch (err: any) {
      setErrors({ ...errors, pin: err.message || 'Invalid mission code' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-premium-gradient overflow-hidden">
      <Starfield />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <GlassCard glow>
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block mb-3"
            >
              <img src="/logo.png" alt="Thynkcity" className="h-14 object-contain mx-auto" />
            </motion.div>
            <h1 className="font-display font-bold text-3xl text-accent-gold tracking-wide">
              CODE QUEST
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mission Code */}
            <div>
              <label className="block text-sm font-body font-medium text-white/60 mb-1">
                Mission Code (PIN)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => { setPinValue(e.target.value.replace(/\D/g, '')); setErrors((err) => ({ ...err, pin: undefined })); }}
                placeholder="Enter your mission code"
                className={`w-full px-4 py-3 rounded-xl bg-space-950 border ${
                  errors.pin ? 'border-status-danger' : 'border-space-700'
                } text-white font-mono placeholder:text-white/20 focus:outline-none focus:border-accent-gold transition-colors`}
              />
              {errors.pin && <p className="text-status-danger text-xs mt-1">{errors.pin}</p>}
            </div>

            {/* Hacker Alias */}
            <div>
              <label className="block text-sm font-body font-medium text-white/60 mb-1">
                Hacker Alias
              </label>
              <input
                type="text"
                maxLength={12}
                value={alias}
                onChange={(e) => { setAliasValue(e.target.value); setErrors((err) => ({ ...err, alias: undefined })); }}
                placeholder="Choose your code name"
                className={`w-full px-4 py-3 rounded-xl bg-space-950 border ${
                  errors.alias ? 'border-status-danger' : 'border-space-700'
                } text-white font-body placeholder:text-white/20 focus:outline-none focus:border-accent-gold transition-colors`}
              />
              {errors.alias && <p className="text-status-danger text-xs mt-1">{errors.alias}</p>}
            </div>

            {/* Skill level */}
            <div>
              <label className="block text-sm font-body font-medium text-white/60 mb-2">
                Are you new to Python?
              </label>
              <div className="flex gap-3">
                {[{ label: 'Total beginner', value: true }, { label: 'I know some Python', value: false }].map(({ label, value }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => { setIsBeginnerValue(value); setSkillError(''); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-body border transition-colors ${
                      isBeginner === value
                        ? 'border-accent-gold bg-accent-gold/20 text-accent-gold'
                        : 'border-space-700 text-white/50 hover:border-space-700/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {skillError && <p className="text-status-danger text-xs mt-1">{skillError}</p>}
            </div>

            <NeonButton
              type="submit"
              variant="primary"
              icon={<Rocket className="w-4 h-4" />}
              className="w-full py-3 mt-2 text-base"
            >
              PREPARE FOR LAUNCH
            </NeonButton>
          </form>
        </GlassCard>
      </motion.div>

      {/* Monty Cameo */}
      <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-2">
        <AnimatePresence mode="wait">
          <MontyBubble key={lobbyLineIdx} text={currentLine} duration={3500} />
        </AnimatePresence>
        <MontyAvatar state="idle" size={72} />
      </div>
    </div>
  );
}
