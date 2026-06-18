/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Play, ChevronRight, Trophy, Zap, LogOut } from 'lucide-react';
import Editor from '@monaco-editor/react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import CountdownTimer from '../components/shared/CountdownTimer';
import MissionBrief from '../components/cockpit/MissionBrief';
import ModeToggle from '../components/cockpit/ModeToggle';
import MontyAvatar from '../components/monty/MontyAvatar';
import MontyBubble from '../components/monty/MontyBubble';
import { useUserStore } from '../store/userStore';
import { useStudentAuthStore } from '../store/studentAuthStore';
import { useMontyStore } from '../store/montyStore';
import { useMonty } from '../hooks/useMonty';
import { api } from '../api/client';

const BlocklyEditor = lazy(() => import('../components/cockpit/BlocklyEditor'));

type ConsoleStatus = 'idle' | 'running' | 'success' | 'error' | 'expired';

export default function PracticeCockpitPage() {
  const { id: practiceSessionId } = useParams();
  const navigate = useNavigate();
  const { user, checkAuth } = useStudentAuthStore();
  const { cockpitState, cockpitLine, clearLine } = useMontyStore();
  const { trigger } = useMonty();
  const { editorMode, isBeginner } = useUserStore();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeIdx, setChallengeIdx] = useState(0);

  const challenge = challenges[challengeIdx] || { id: '', title: 'Loading...', description: '', expectedOutput: '', points: 0, timeLimit: 0, hints: [] };

  const [code, setCode] = useState(challenge?.starterCode ?? '');
  const [blocksCode, setBlocksCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [consoleStatus, setConsoleStatus] = useState<ConsoleStatus>('idle');
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const stuckTimerRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef<number>(Date.now());

  const triggerRef = useRef(trigger);
  useEffect(() => { triggerRef.current = trigger; });

  useEffect(() => {
    checkAuth().catch(() => navigate('/student/login'));
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user || !practiceSessionId) return;
      try {
        const data = await api.practiceChallenges.getAll();
        const allChs = data.challenges || [];
        // Shuffle the challenges and pick up to 10 for the session
        const shuffled = [...allChs].sort(() => 0.5 - Math.random());
        const chs = shuffled.slice(0, 10);
        setChallenges(chs);
        if (chs.length > 0) {
          setCode(chs[0].starterCode ?? '');
          challengeStartTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error("Failed to fetch practice challenges:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.id, practiceSessionId]);

  // Sync state when challenge index changes
  useEffect(() => {
    if (challenges.length > 0) {
      setCode(challenges[challengeIdx].starterCode ?? '');
      setConsoleOutput('');
      setConsoleStatus('idle');
      setIsExpired(false);
      setShowExpiredBanner(false);
      setHintUsed(false);
      setTimerKey(k => k + 1);
      challengeStartTimeRef.current = Date.now();
      
      triggerRef.current('challenge_start');
      clearLine();
    }
  }, [challengeIdx, challenges]);

  useEffect(() => {
    clearTimeout(stuckTimerRef.current as number);
    if (!completedSet.has(challenge.id) && !isFinished) {
      stuckTimerRef.current = window.setTimeout(() => {
        triggerRef.current('stuck');
      }, 45000);
    }
    return () => clearTimeout(stuckTimerRef.current as number);
  }, [challenge.id, completedSet, isFinished]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) setCode(value);
  };

  const handleBlocksChange = useCallback((newPythonCode: string) => {
    setBlocksCode(newPythonCode);
  }, []);

  const handleNextChallenge = () => {
    clearLine();
    if (challengeIdx < challenges.length - 1) {
      setChallengeIdx(challengeIdx + 1);
    } else {
      setIsFinished(true);
      trigger('success', { points: '0' });
    }
  };

  const handleEndSession = async () => {
    try {
      if (practiceSessionId) {
        await api.practiceSessions.end(practiceSessionId);
      }
    } catch(e) {}
    navigate('/student/dashboard');
  };

  const executeCode = async () => {
    if (consoleStatus === 'running' || isExpired || !practiceSessionId) return;

    setConsoleStatus('running');
    setConsoleOutput('Running...\n');

    try {
      const timeTaken = Math.floor((Date.now() - challengeStartTimeRef.current) / 1000);
      const activeCode = editorMode === 'blocks' ? blocksCode : code;
      const payload = {
        challengeId: challenge.id,
        code: activeCode,
        editorMode,
        hintUsed,
        timeTaken
      };

      const res = await api.practiceSessions.submit(practiceSessionId, payload);
      const result = res.executionResult;

      if (res.submission.isCorrect) {
        setConsoleOutput(`✓ ${challenge.expectedOutput}\n\nMission complete! +${res.submission.pointsAwarded} pts\n\nOutput:\n${result.stdout}`);
        setConsoleStatus('success');
        setCompletedSet(prev => new Set(prev).add(challenge.id));
        setSessionScore(s => s + res.submission.pointsAwarded);
        trigger('success', { points: String(res.submission.pointsAwarded) });
        checkAuth(); // Update score locally
      } else {
        setConsoleOutput(`${result.stderr || result.stdout}\n\nTry again.`);
        setConsoleStatus('error');
        trigger('fail');
      }
    } catch (e: any) {
      setConsoleOutput(`System Error: ${e.message}`);
      setConsoleStatus('error');
      trigger('fail');
    }
  };

  const handleTimeout = () => {
    setIsExpired(true);
    setConsoleStatus('expired');
    setShowExpiredBanner(true);
    trigger('fail');
    clearLine();
  };

  const showNextHint = () => {
    if (!challenge.hints || challenge.hints.length === 0) return;
    setHintUsed(true);
    setShowHintModal(true);
  };

  return (
    <div className="h-screen w-full bg-space-900 bg-premium-gradient overflow-hidden flex flex-col font-mono text-white relative">
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none mix-blend-overlay" />

      {/* Header */}
      <header className="h-14 bg-space-900/80 border-b border-space-700/50 px-4 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Thynkcity" className="h-5" />
          <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink tracking-wide text-sm sm:text-base">
            THYNKCITY // PRACTICE ARENA
          </span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 bg-space-800/80 px-3 py-1 rounded-full border border-space-700/50 shadow-inner">
            <Trophy className="w-4 h-4 text-accent-gold" />
            <span className="font-bold text-accent-gold text-sm drop-shadow-[0_0_8px_rgba(255,191,0,0.5)]">
              {sessionScore} pts
            </span>
          </div>
          
          <button 
            onClick={handleEndSession}
            className="flex items-center gap-2 text-status-danger hover:text-status-danger/80 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">End Session</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10">
        {loading ? (
          <div className="w-full flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="font-mono text-white/50 animate-pulse">Initializing Practice Arena...</p>
            </div>
          </div>
        ) : challenges.length === 0 ? (
          <div className="w-full flex-1 flex items-center justify-center p-8">
            <GlassCard className="p-8 max-w-lg text-center flex flex-col items-center gap-4">
              <Lightbulb className="w-16 h-16 text-accent-gold mb-2 opacity-50" />
              <h2 className="font-display font-bold text-2xl text-white">No Questions Available</h2>
              <p className="text-white/60 text-sm">The Global Question Bank is currently empty. Please check back later when new challenges are added!</p>
              <NeonButton variant="primary" onClick={handleEndSession} className="mt-4">
                Return to Dashboard
              </NeonButton>
            </GlassCard>
          </div>
        ) : (
          <>
            {/* Left Column */}
            <div className="w-full lg:w-1/3 xl:w-[400px] lg:min-w-[300px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-space-700/50 bg-space-900/40 relative z-20 lg:shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {isFinished ? (
              <GlassCard className="p-8 text-center flex flex-col items-center gap-4">
                <Trophy className="w-16 h-16 text-accent-gold mb-2" />
                <h2 className="font-display font-bold text-2xl text-white">Practice Complete!</h2>
                <p className="text-white/60 text-sm">You have finished all available challenges in the practice arena.</p>
                <NeonButton variant="primary" onClick={handleEndSession} className="mt-4">
                  Return to Dashboard
                </NeonButton>
              </GlassCard>
            ) : (
              <MissionBrief 
                challenge={challenge}
              />
            )}
          </div>
        </div>

        {/* Center / Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-space-900 relative">
          {/* Editor Header */}
          <div className="min-h-12 border-b border-space-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:px-4 gap-2 bg-space-800/30">
            <ModeToggle lockBlocks={isBeginner} />
            {!isFinished && (
              <div className="flex items-center gap-4">
                {challenge.timeLimit > 0 && !completedSet.has(challenge.id) && (
                  <CountdownTimer 
                    key={timerKey} 
                    seconds={challenge.timeLimit} 
                    onExpire={handleTimeout} 
                  />
                )}
                <button 
                  onClick={handleNextChallenge}
                  disabled={consoleStatus === 'running' || isExpired}
                  className="px-4 py-2 text-sm font-bold text-white/50 hover:text-white transition-colors disabled:opacity-50"
                >
                  SKIP
                </button>
                <NeonButton 
                  variant="primary"
                  className="px-6 shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)]"
                  onClick={executeCode}
                  disabled={consoleStatus === 'running' || isExpired}
                  icon={<Play className="w-4 h-4" fill="currentColor" />}
                >
                  {consoleStatus === 'running' ? 'Executing...' : 'Run Code'}
                </NeonButton>
              </div>
            )}
          </div>

          {/* Code Area */}
          <div className="flex-1 min-h-0 relative">
            {!isFinished && (
              editorMode === 'code' ? (
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={code}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    fontFamily: '"Fira Code", monospace',
                    padding: { top: 24, bottom: 24 },
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    formatOnPaste: true,
                    readOnly: consoleStatus === 'running' || isExpired || completedSet.has(challenge.id),
                  }}
                />
              ) : (
                <Suspense fallback={<div className="h-full flex items-center justify-center text-accent-blue/50">Loading Blockly...</div>}>
                  <BlocklyEditor
                    onChange={handleBlocksChange}
                  />
                </Suspense>
              )
            )}
          </div>

          {/* Console Output */}
          <div className="h-[30vh] sm:h-[250px] border-t border-space-700/50 bg-[#0A0A0F] flex flex-col relative z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
            <div className="h-8 bg-space-800/80 border-b border-space-700/50 px-4 flex items-center justify-between">
              <span className="text-xs text-white/50 font-bold tracking-wider">TERMINAL</span>
              {consoleStatus === 'running' && (
                <div className="flex items-center gap-2 text-accent-blue">
                  <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                  <span className="text-xs">Processing...</span>
                </div>
              )}
              {consoleStatus === 'success' && (
                <div className="flex items-center gap-2 text-status-success">
                  <Zap className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold">SUCCESS</span>
                </div>
              )}
            </div>
            <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
              <pre className={`text-sm leading-relaxed whitespace-pre-wrap ${
                consoleStatus === 'error' ? 'text-status-danger' :
                consoleStatus === 'success' ? 'text-status-success font-bold' :
                'text-white/80'
              }`}>
                {consoleOutput || '> System ready. Awaiting transmission...'}
              </pre>
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* HUD Overlays */}
      {challenges.length > 0 && (
        <>
          <AnimatePresence>
        {showExpiredBanner && !completedSet.has(challenge.id) && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 bg-status-danger/90 backdrop-blur-md px-8 py-4 rounded-xl border border-status-danger text-center shadow-[0_0_40px_rgba(255,51,102,0.4)] z-50 flex flex-col items-center gap-4"
          >
            <div>
              <h3 className="font-display font-bold text-2xl text-white">Time Expired</h3>
              <p className="text-white/80 mt-1">This challenge has been locked.</p>
            </div>
            <NeonButton variant="primary" onClick={handleNextChallenge} className="text-sm px-6">
              Skip to Next
            </NeonButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {completedSet.has(challenge.id) && !isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-32 right-12 bg-space-800/90 backdrop-blur-md p-6 rounded-2xl border border-accent-gold shadow-[0_0_30px_rgba(255,191,0,0.3)] z-50 text-center"
          >
            <h3 className="font-display font-bold text-xl text-accent-gold mb-2">Challenge Solved!</h3>
            <p className="text-white/70 text-sm mb-4">Great work. Ready for the next one?</p>
            <NeonButton variant="success" onClick={handleNextChallenge} className="w-full" icon={<ChevronRight className="w-4 h-4" />}>
              Next Challenge
            </NeonButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monty floating bottom right */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <MontyBubble 
          text={cockpitLine} 
          onComplete={clearLine}
          duration={cockpitState === 'hint' ? 0 : 4000}
        />
        <div className="mt-4 flex justify-end pointer-events-auto cursor-pointer drop-shadow-[0_0_25px_rgba(0,240,255,0.4)]" onClick={() => trigger('poke')}>
          <MontyAvatar state={cockpitState} />
        </div>
      </div>

      {/* Hint Modal */}
      <AnimatePresence>
        {showHintModal && challenge.hints && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-space-900 border border-accent-gold/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(255,191,0,0.2)]"
            >
              <div className="flex items-center gap-3 mb-4 text-accent-gold">
                <Lightbulb className="w-6 h-6" />
                <h3 className="font-display font-bold text-xl">Intelligence Gathered</h3>
              </div>
              <p className="text-white/80 leading-relaxed mb-6 bg-space-800 p-4 rounded-lg font-mono text-sm border border-white/5">
                {challenge.hints[hintIdx]}
              </p>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {challenge.hints.map((_h: string, i: number) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === hintIdx ? 'bg-accent-gold' : 'bg-white/20'}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowHintModal(false)} className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
                    Close
                  </button>
                  {hintIdx < challenge.hints.length - 1 ? (
                    <NeonButton variant="primary" className="text-sm px-4" onClick={() => setHintIdx(i => i + 1)}>
                      Next Hint
                    </NeonButton>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Hint Button */}
      {challenge.hints && challenge.hints.length > 0 && !completedSet.has(challenge.id) && !isFinished && (
        <button
          onClick={showNextHint}
          className="fixed bottom-6 left-6 z-40 bg-space-800/80 backdrop-blur-md border border-accent-gold/40 text-accent-gold p-4 rounded-full shadow-[0_0_20px_rgba(255,191,0,0.2)] hover:shadow-[0_0_30px_rgba(255,191,0,0.4)] hover:bg-space-800 transition-all flex items-center gap-2 group"
        >
          <Lightbulb className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm tracking-widest hidden md:inline opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto group-hover:ml-2 transition-all duration-300 whitespace-nowrap">
            REQUEST HINT (50% PENALTY)
          </span>
        </button>
      )}
      </>
      )}
    </div>
  );
}
