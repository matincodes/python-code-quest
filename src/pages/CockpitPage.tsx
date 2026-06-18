/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Play, ChevronRight, Trophy, Zap, Eye, EyeOff, LogOut } from 'lucide-react';
import Editor from '@monaco-editor/react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import CountdownTimer from '../components/shared/CountdownTimer';
import MissionBrief from '../components/cockpit/MissionBrief';
import ModeToggle from '../components/cockpit/ModeToggle';
import MontyAvatar from '../components/monty/MontyAvatar';
import MontyBubble from '../components/monty/MontyBubble';
import SpaceBasePlot from '../components/audience/SpaceBasePlot';
import { useUserStore } from '../store/userStore';
import { useGameStore } from '../store/gameStore';
import { useMontyStore } from '../store/montyStore';
import { useMonty } from '../hooks/useMonty';
import { useSocket } from '../hooks/useSocket';
import { api } from '../api/client';

const BlocklyEditor = lazy(() => import('../components/cockpit/BlocklyEditor'));

type ConsoleStatus = 'idle' | 'running' | 'success' | 'error' | 'expired';

export default function CockpitPage() {
  const navigate = useNavigate();
  const { alias, pin, editorMode, codeBroadcastEnabled, isBeginner, setCodeBroadcastEnabled, reset } = useUserStore();
  const { currentChallenge, myScore, myPiecesUnlocked, updateScore, setChallenge } = useGameStore();
  const { cockpitState, cockpitLine, clearLine } = useMontyStore();
  const { trigger } = useMonty();
  const { connected, emit, on } = useSocket();

  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeIdx, setChallengeIdx] = useState(0);

  const challenge = challenges[challengeIdx] || currentChallenge || { id: '', title: 'Loading...', description: '', expectedOutput: '', points: 0, timeLimit: 60, hints: [] };

  const [code, setCode] = useState(challenge?.starterCode ?? '');
  const [blocksCode, setBlocksCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [consoleStatus, setConsoleStatus] = useState<ConsoleStatus>('idle');
  const [showHintModal, setShowHintModal] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [totalTimeLimit, setTotalTimeLimit] = useState(600);

  // Refs to avoid stale closures in socket handlers
  const challengesRef = useRef<any[]>([]);
  const challengeIdxRef = useRef(0);
  const completedSetRef = useRef<Set<string>>(new Set());
  const stuckTimerRef = useRef<number | null>(null);
  const challengeStartTimeRef = useRef<number>(Date.now());

  // Keep refs in sync with state
  useEffect(() => { challengesRef.current = challenges; }, [challenges]);
  useEffect(() => { challengeIdxRef.current = challengeIdx; }, [challengeIdx]);
  useEffect(() => { completedSetRef.current = completedSet; }, [completedSet]);

  const triggerRef = useRef(trigger);
  useEffect(() => { triggerRef.current = trigger; });

  // 1. Fetch Challenges & Join Session
  useEffect(() => {
    if (!alias || !pin) {
      navigate('/');
      return;
    }

    const init = async () => {
      try {
        const data = await api.challenges.getBySession(pin);
        setChallenges(data);
        challengesRef.current = data; // set ref immediately so socket handlers can use it
        if (data.length > 0) {
          setChallenge(data[0]);
          setCode(data[0].starterCode ?? '');
        }
        
        // Fetch session to get initial status
        const sessionInfo = await api.sessions.getByPin(pin);
        setSessionStatus(sessionInfo.status);
        if (sessionInfo.startedAt) {
          setSessionStartedAt(new Date(sessionInfo.startedAt).getTime());
        }
        if (sessionInfo.totalTimeLimit) {
          setTotalTimeLimit(sessionInfo.totalTimeLimit);
        }
        if (sessionInfo.activeChallengeId && data.length > 0) {
          const idx = data.findIndex((c: any) => c.id === sessionInfo.activeChallengeId);
          if (idx !== -1) {
            setChallengeIdx(idx);
          }
        }
        
        // Join via socket AFTER challenges are loaded
        if (connected) {
          emit('join:session', { pin, alias, isBeginner, editorMode });
        }
      } catch (err) {
        console.error("Failed to fetch session:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alias, pin, connected]);

  // 2. Socket Listeners — use refs to avoid stale closures
  on('student:state', useCallback((studentInfo: any) => {
    useGameStore.setState({ myScore: studentInfo.score, myPiecesUnlocked: studentInfo.piecesUnlocked });
    // Restore completed challenges from server
    if (studentInfo.completedChallengeIds && studentInfo.completedChallengeIds.length > 0) {
      setCompletedSet(new Set<string>(studentInfo.completedChallengeIds));
    }
    // Use server's authoritative challenge position (prevents reload cheating)
    const serverIdx = studentInfo.currentChallengeIndex ?? 0;
    const totalChallenges = challengesRef.current.length;
    if (totalChallenges > 0) {
      if (serverIdx >= totalChallenges) {
        setIsFinished(true);
      } else {
        setChallengeIdx(serverIdx);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('session:state', useCallback((session: any) => {
    setSessionStatus(session.status);
    if (session.activeChallengeId) {
      const currentChallenges = challengesRef.current;
      if (currentChallenges.length > 0) {
        const idx = currentChallenges.findIndex((c: any) => c.id === session.activeChallengeId);
        if (idx !== -1) {
          setChallengeIdx(idx);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('challenge:pushed', useCallback(({ challengeId, startedAt }: any) => {
    if (startedAt) {
      challengeStartTimeRef.current = new Date(startedAt).getTime();
    } else {
      challengeStartTimeRef.current = Date.now();
    }
    const currentChallenges = challengesRef.current;
    const idx = currentChallenges.findIndex((c: any) => c.id === challengeId);
    if (idx !== -1) {
      setChallengeIdx(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('code:result', useCallback(({ output, error, isSuccess, pointsAwarded }: any) => {
    if (isSuccess) {
      const curChallenges = challengesRef.current;
      const curIdx = challengeIdxRef.current;
      const curChallenge = curChallenges[curIdx];
      const expectedOutput = curChallenge?.expectedOutput || '';
      
      setConsoleOutput(`✓ ${expectedOutput}\n\nMission complete! +${pointsAwarded} pts\n\nOutput:\n${output}`);
      setConsoleStatus('success');
      useGameStore.getState().updateScore(pointsAwarded);
      useGameStore.getState().unlockPiece();
      
      if (curChallenge?.id) {
        setCompletedSet(prev => {
          const newSet = new Set(prev).add(curChallenge.id);
          completedSetRef.current = newSet;
          return newSet;
        });
      }
      
      triggerRef.current('success', { points: String(pointsAwarded) });
      // Auto-advance after a short delay
      setTimeout(() => {
        const nextIdx = curIdx + 1;
        if (curIdx < curChallenges.length - 1) {
          setChallengeIdx(nextIdx);
          emit('challenge:advance', { challengeIndex: nextIdx });
        } else {
          setIsFinished(true);
          emit('challenge:advance', { challengeIndex: curChallenges.length });
        }
      }, 2500);
    } else {
      setConsoleOutput(`${error || output}\n\nTry again.`);
      setConsoleStatus('error');
      triggerRef.current('fail');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('game:started', useCallback(({ startedAt, totalTimeLimit: tl }: any) => {
    setSessionStatus('active');
    const ts = new Date(startedAt).getTime();
    setSessionStartedAt(ts);
    if (tl) setTotalTimeLimit(tl);
    setTimerKey(k => k + 1);
    triggerRef.current('challenge_start');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('game:ended', useCallback(() => {
    triggerRef.current('success', { points: '0' });
    setSessionStatus('ended');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  on('error', useCallback(({ message }: any) => {
    setConsoleOutput(`System Error: ${message}`);
    setConsoleStatus('error');
    triggerRef.current('fail');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  // Sync store when challenge index changes
  useEffect(() => {
    if (challenges.length > 0) {
      setChallenge(challenges[challengeIdx]);
      
      const savedCode = localStorage.getItem(`pcq_code_${pin}_${challenges[challengeIdx].id}`);
      setCode(savedCode !== null ? savedCode : (challenges[challengeIdx].starterCode ?? ''));
      
      const savedBlocks = localStorage.getItem(`pcq_blocks_${pin}_${challenges[challengeIdx].id}`);
      if (savedBlocks !== null) setBlocksCode(savedBlocks);
      setConsoleOutput('');
      setConsoleStatus('idle');
      setIsExpired(false);
      setHintIdx(0);
      triggerRef.current('challenge_start');
      clearLine(); // Clear any persistent hints when switching challenges
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeIdx, challenges]);

  const resetStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = window.setTimeout(() => triggerRef.current('stuck_90s'), 90_000);
  }, []);

  useEffect(() => {
    resetStuckTimer();
    return () => { if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current); };
  }, [resetStuckTimer]);

  const activeCode = editorMode === 'blocks' ? blocksCode : code;

  // Live code broadcast
  useEffect(() => {
    if (codeBroadcastEnabled && activeCode.length > 0) {
      const timer = setTimeout(() => {
        emit('code:broadcast', { code: activeCode });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeCode, codeBroadcastEnabled, emit]);

  useEffect(() => {
    emit('code:broadcast:toggle', { enabled: codeBroadcastEnabled });
  }, [codeBroadcastEnabled, emit]);

  const handleAdvanceChallenge = useCallback(() => {
    if (challengeIdx < challenges.length - 1) {
      const nextIdx = challengeIdx + 1;
      setChallengeIdx(nextIdx);
      emit('challenge:advance', { challengeIndex: nextIdx });
    } else {
      setIsFinished(true);
      emit('challenge:advance', { challengeIndex: challenges.length }); // mark finished
      trigger('success', { points: '0' });
    }
  }, [challengeIdx, trigger, challenges.length, emit]);

  const handleSessionExpire = useCallback(() => {
    if (isExpired) return;
    setIsExpired(true);
    setConsoleOutput("⏰ Session time is up! Great job, Commander!");
    setConsoleStatus('expired');
    triggerRef.current('fail');
    clearLine();
    setTimeout(() => {
      setIsFinished(true);
      emit('challenge:advance', { challengeIndex: challengesRef.current.length });
    }, 3000);
  }, [isExpired, clearLine, emit]);

  const handleRun = () => {
    if (isExpired || !challenge.id) return;
    resetStuckTimer();
    setConsoleStatus('running');
    setConsoleOutput('Compiling in the cloud…');

    const timeTaken = Math.floor((Date.now() - challengeStartTimeRef.current) / 1000);

    // Submit code to backend via socket
    emit('code:submit', {
      challengeId: challenge.id,
      code: activeCode,
      editorMode,
      hintUsed: hintIdx > 0,
      timeTaken
    });
  };

  const handleHintConfirm = () => {
    setShowHintModal(false);
    updateScore(-5);
    const hint = challenge.hints[hintIdx % challenge.hints.length];
    setHintIdx(i => i + 1);
    emit('hint:request');
    trigger('hint');
    useMontyStore.getState().setCockpitLine(hint);
    useMontyStore.getState().setCockpitState('hint');
  };

  const handleLogout = () => {
    emit('student:logout');
    reset();
    navigate('/');
  };

  const isLastChallenge = challenges.length > 0 && challengeIdx >= challenges.length - 1;
  const alreadySolved = challenge.id ? completedSet.has(challenge.id) : false;

  const consoleMeta = {
    idle:    { color: 'text-white/40', label: 'IDLE' },
    running: { color: 'text-accent-gold animate-pulse', label: 'COMPILING…' },
    success: { color: 'text-status-success', label: 'SUCCESS' },
    error:   { color: 'text-status-danger', label: 'ERROR' },
    expired: { color: 'text-status-warning', label: 'TIME UP' },
  };
  const cm = consoleMeta[consoleStatus];

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen bg-premium-gradient flex flex-col items-center justify-center overflow-hidden">
         <h2 className="text-accent-gold font-display text-2xl animate-pulse">Loading Mission Modules...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-premium-gradient flex flex-col overflow-hidden">
      {/* ── TOP NAV ── */}
      <nav className="h-[60px] bg-space-900/90 backdrop-blur-md border-b border-space-700/60
                       flex items-center justify-between px-5 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-gold/30 to-accent-gold-muted/20
                           border border-accent-gold/50 flex items-center justify-center
                           text-sm font-display font-bold text-accent-gold shadow-gold-sm shrink-0">
            {alias?.charAt(0).toUpperCase() || 'H'}
          </span>
          <div className="min-w-0">
            <p className="font-display font-semibold text-white text-sm leading-none truncate">{alias}</p>
            <p className="font-mono text-status-warning font-bold text-xs mt-0.5">
              {myScore} <span className="text-white/30 font-normal">pts</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            {challenges.map((c, i) => (
              <span
                key={c.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  completedSet.has(c.id)    ? 'bg-status-success shadow-gold-sm'
                  : i === challengeIdx      ? 'bg-accent-gold shadow-gold-sm scale-125'
                  : i < challengeIdx        ? 'bg-white/20'
                  : 'bg-space-700'
                }`}
              />
            ))}
          </div>
          {sessionStartedAt && (
            <CountdownTimer key={timerKey} seconds={Math.max(0, totalTimeLimit - Math.floor((Date.now() - sessionStartedAt) / 1000))} onExpire={handleSessionExpire} isPaused={sessionStatus === 'waiting'} />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCodeBroadcastEnabled(!codeBroadcastEnabled)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-space-700/40 bg-space-900/60 hover:bg-space-800 transition-colors shrink-0"
            title="Toggle code broadcast"
          >
            {codeBroadcastEnabled ? <Eye className="w-4 h-4 text-accent-gold" /> : <EyeOff className="w-4 h-4 text-white/40" />}
            <span className={`text-[10px] font-display uppercase tracking-wider hidden sm:inline ${codeBroadcastEnabled ? 'text-accent-gold' : 'text-white/40'}`}>
              Live Cam
            </span>
          </button>

          <NeonButton
            variant="warning"
            icon={<Lightbulb className="w-4 h-4" />}
            onClick={() => setShowHintModal(true)}
            disabled={isExpired}
          >
            HINT
            <span className="text-[10px] opacity-60 ml-1">(-5 pts)</span>
          </NeonButton>

          <NeonButton
            variant="primary"
            icon={<ChevronRight className="w-4 h-4" />}
            onClick={handleAdvanceChallenge}
            disabled={isExpired}
          >
            {isLastChallenge ? 'FINISH' : 'NEXT'}
          </NeonButton>
          
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center ml-2 p-1.5 text-status-danger hover:bg-status-danger/20 rounded transition-colors"
            title="Leave Cockpit"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-y-auto lg:overflow-hidden min-h-0">
        <div className="w-full lg:w-1/3 xl:w-[400px] lg:min-w-[300px] shrink-0 flex flex-col gap-3 lg:overflow-auto">
          <SpaceBasePlot
            student={{
              id: 'me',
              alias: alias || 'Hacker',
              score: myScore,
              piecesUnlocked: myPiecesUnlocked,
              status: 'connected',
              avatarColor: '#3DD8FF',
            }}
            totalChallenges={challenges.length}
          />
          <div className="flex-1">
            <MissionBrief challenge={challenge} />
          </div>
        </div>

        <div className="w-full lg:flex-1 flex flex-col gap-2 min-h-[520px] lg:min-h-0">
          <GlassCard className="!p-2.5 flex items-center justify-between gap-2">
            <ModeToggle lockBlocks={isBeginner} />
            <NeonButton
              variant="success"
              icon={<Play className="w-4 h-4" />}
              onClick={handleRun}
              disabled={isExpired || consoleStatus === 'running'}
            >
              ▶ RUN CODE
            </NeonButton>
          </GlassCard>

          <div className="flex-1 min-h-[300px] lg:min-h-0 rounded-xl overflow-hidden border border-space-700/50 relative">
            {editorMode === 'code' ? (
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(val) => {
                  const newCode = val ?? '';
                  setCode(newCode);
                  if (challenge?.id) {
                    localStorage.setItem(`pcq_code_${pin}_${challenge.id}`, newCode);
                  }
                }}
                options={{
                  fontSize: 14,
                  fontFamily: '"JetBrains Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbersMinChars: 3,
                  padding: { top: 12 },
                  readOnly: isExpired,
                }}
              />
            ) : (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-space-950 text-accent-gold font-display text-sm animate-pulse">
                  Loading Blocks…
                </div>
              }>
                <BlocklyEditor onChange={(val) => {
                  setBlocksCode(val);
                  if (challenge?.id) {
                    localStorage.setItem(`pcq_blocks_${pin}_${challenge.id}`, val);
                  }
                }} />
              </Suspense>
            )}
          </div>

          <div className="h-[35vh] lg:h-[250px] xl:h-[300px] rounded-xl overflow-hidden border border-space-700/50 bg-[#0A0A0F] flex flex-col shrink-0 relative">
            <div className="flex items-center justify-between px-3 py-1.5 bg-space-900/60 border-b border-space-700/40">
              <p className="text-xs font-display font-semibold text-white/40 uppercase tracking-widest">Console</p>
              <span className={`text-[10px] font-mono font-bold ${cm.color}`}>{cm.label}</span>
            </div>
            <div className="p-3 h-full overflow-auto">
              <AnimatePresence mode="wait">
                <motion.pre
                  key={consoleOutput}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`font-mono text-sm whitespace-pre-wrap ${
                    consoleStatus === 'running'  ? 'text-white/50 animate-pulse'
                    : consoleStatus === 'success' ? 'text-status-success'
                    : consoleStatus === 'error'   ? 'text-status-danger'
                    : consoleStatus === 'expired' ? 'text-status-warning'
                    : 'text-white/40'
                  }`}
                >
                  {consoleOutput || '// Output will appear here…'}
                </motion.pre>
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {alreadySolved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-success/10 border border-status-success/30"
              >
                <Trophy className="w-4 h-4 text-status-success" />
                <span className="font-display text-xs text-status-success font-semibold">
                  Mission solved! Hit NEXT to continue.
                </span>
                <Zap className="w-4 h-4 text-status-warning ml-auto" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-30 flex flex-col items-end gap-2 pointer-events-none">
        <MontyBubble 
          text={cockpitLine} 
          onComplete={clearLine}
          duration={cockpitState === 'hint' ? 0 : 4000}
        />
        <MontyAvatar state={cockpitState} size={80} />
      </div>

      <AnimatePresence>
        {isInitializing && (
          <div className="fixed inset-0 bg-space-950 flex flex-col items-center justify-center relative font-mono text-accent-blue/50 z-[200]">
            <div className="flex flex-col items-center gap-4 z-10">
              <img src="/logo.png" alt="Thynkcity" className="h-16 animate-pulse" />
              <p>Initializing Cockpit...</p>
            </div>
          </div>
        )}

        {sessionStatus === 'waiting' && !isInitializing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-space-950/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4 text-center overflow-auto py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 w-24 h-24 rounded-full bg-space-900 border border-accent-gold/30 flex items-center justify-center shadow-gold-sm shrink-0"
            >
              <img src="/logo.png" alt="Thynkcity" className="w-14 object-contain mx-auto" />
            </motion.div>
            <h2 className="font-display font-bold text-3xl text-accent-gold mb-2 shrink-0">Awaiting Mission Start</h2>
            <p className="font-body text-white/50 max-w-md mx-auto mb-8 shrink-0">
              Hang tight, Commander! The Game Master is preparing the environment. Your mission will begin shortly.
            </p>

            <div className="max-w-2xl w-full text-left bg-space-900/60 border border-space-700/50 rounded-2xl p-6 md:p-8">
              <h3 className="font-display font-bold text-xl text-white mb-6 border-b border-space-700/50 pb-4">RULES OF ENGAGEMENT</h3>
              <div className="space-y-5 text-white/70 font-body text-sm">
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center shrink-0 font-bold">1</span>
                  <div>
                    <strong className="text-white block mb-1">The Objective</strong>
                    <p>Solve each mission by writing Python code (or blocks) that prints the exact expected output. Missions are sequential.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-status-success/20 text-status-success flex items-center justify-center shrink-0 font-bold">2</span>
                  <div>
                    <strong className="text-white block mb-1">Scoring</strong>
                    <p>Earn points for every correct answer. You can try as many times as you want until the timer runs out. No penalties for wrong answers!</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-status-warning/20 text-status-warning flex items-center justify-center shrink-0 font-bold">3</span>
                  <div>
                    <strong className="text-white block mb-1">Tie-Breaker</strong>
                    <p>The time you spend coding is tracked. If two commanders end up with the same score, the one with the lowest total time taken wins!</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-status-warning/20 text-status-warning flex items-center justify-center shrink-0 font-bold">4</span>
                  <div>
                    <strong className="text-white block mb-1">Need a Hint?</strong>
                    <p>If you're stuck, you can ask Monty for a hint, but it will cost you 5 points! Use them wisely.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(sessionStatus === 'ended' || isFinished) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-space-950/95 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4 text-center overflow-auto py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 w-24 h-24 rounded-full bg-space-900 border border-accent-gold/30 flex items-center justify-center shadow-gold-sm shrink-0"
            >
              <img src="/logo.png" alt="Thynkcity" className="w-14 object-contain mx-auto" />
            </motion.div>
            <h2 className="font-display font-bold text-3xl text-accent-gold mb-2 shrink-0">
              {sessionStatus === 'ended' ? "Mission Accomplished!" : "All Challenges Complete!"}
            </h2>
            <p className="font-body text-white/50 max-w-md mx-auto mb-8 shrink-0">
              {sessionStatus === 'ended' 
                ? "The Game Master has ended the session. Look at the main screen for the final results!" 
                : "You have successfully completed all missions! Await further instructions from the Game Master or check the audience screen."}
            </p>

            <div className="flex gap-4 items-center justify-center">
              <div className="bg-space-900/60 border border-space-700/50 rounded-2xl p-6 flex flex-col items-center">
                 <p className="text-white/40 font-display text-sm uppercase tracking-widest mb-1">Final Score</p>
                 <p className="text-status-warning font-mono font-bold text-4xl">{myScore}</p>
              </div>
            </div>
            
            <NeonButton variant="primary" className="mt-8" onClick={() => { reset(); navigate('/'); }}>
               Back to Login
            </NeonButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
            onClick={() => setShowHintModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <GlassCard className="!p-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-status-warning/20 border border-status-warning/40
                                   flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-status-warning" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-white">Request a Hint?</h3>
                </div>
                <p className="font-body text-sm text-white/60 mb-6">
                  This will cost <span className="text-status-danger font-semibold">5 points</span> from your score.
                  Are you sure you want a hint?
                </p>
                <div className="flex gap-3">
                  <NeonButton variant="danger" onClick={handleHintConfirm} className="flex-1">
                    Yes, show hint
                  </NeonButton>
                  <NeonButton variant="primary" onClick={() => setShowHintModal(false)} className="flex-1">
                    Cancel
                  </NeonButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
