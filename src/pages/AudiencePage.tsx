/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useMontyStore } from '../store/montyStore';
import { useMonty } from '../hooks/useMonty';
import { api } from '../api/client';
import { useSocket } from '../hooks/useSocket';
import SpaceBasePlot from '../components/audience/SpaceBasePlot';
import LeaderboardPin from '../components/audience/LeaderboardPin';
import ScrollingTicker from '../components/audience/ScrollingTicker';
import SpotlightPanel from '../components/audience/SpotlightPanel';
import LiveCodeCam from '../components/audience/LiveCodeCam';
import MontyAvatar from '../components/monty/MontyAvatar';
import MontyBubble from '../components/monty/MontyBubble';
import GlassCard from '../components/shared/GlassCard';

export default function AudiencePage() {
  const { students, setStudents, currentChallenge, setChallenge, updateStudent, recordLatestSolve, setLiveCodeFeed, pushScoreSnapshot } = useGameStore();
  const { cockpitState, narratorLine, setNarratorLine } = useMontyStore();
  const { trigger } = useMonty();
  const { connected, emit, on } = useSocket();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(null);
  const [totalChallenges, setTotalChallenges] = useState(1);

  const [fullscreenPanel, setFullscreenPanel] = useState<'spotlight' | 'liveCam' | null>(null);

  useEffect(() => {
    // Fetch available sessions for the audience to watch
    api.sessions.getAll().then(setSessions).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedPin) {
      // Load initial state
      api.sessions.getByPin(selectedPin).then(async (session) => {
        const chs = await api.challenges.getBySession(selectedPin);
        setTotalChallenges(chs.length);
        if (session.activeChallengeId) {
          const active = chs.find((c: any) => c.id === session.activeChallengeId);
          if (active) setChallenge(active);
        } else if (chs.length > 0) {
          setChallenge(chs[0]);
        }
        const sts = await api.students.getBySession(selectedPin);
        setStudents(sts);
      });

      if (connected) {
        emit('join:audience', { pin: selectedPin });
      }
    }
  }, [selectedPin, connected]);

  // Socket listeners for live updates
  on('student:joined', (student) => {
    setStudents([...useGameStore.getState().students.filter(s => s.id !== student.id), student]);
    pushScoreSnapshot(student.id, student.score);
  });
  
  on('student:left', (studentId) => {
    updateStudent(studentId, { status: 'disconnected' });
  });

  on('student:updated', (student) => {
    updateStudent(student.id, student);
    pushScoreSnapshot(student.id, student.score);
  });

  on('session:state', async (session) => {
    if (session.activeChallengeId && selectedPin) {
      const chs = await api.challenges.getBySession(selectedPin);
      const active = chs.find((c: any) => c.id === session.activeChallengeId);
      if (active) setChallenge(active);
    }
  });

  on('challenge:pushed', async ({ challengeId }) => {
    if (selectedPin) {
      const chs = await api.challenges.getBySession(selectedPin);
      const active = chs.find((c: any) => c.id === challengeId);
      if (active) setChallenge(active);
    }
  });

  on('solve:latest', (data) => {
    recordLatestSolve(data);
    trigger('narrator_solved', {
      alias: data.alias,
      challenge: data.missionTitle,
      points: String(data.points),
    });
    // Leader-change check could go here if needed
  });

  on('code:live', (data) => {
    setLiveCodeFeed({
      studentId: data.studentId ?? '',
      alias: data.alias,
      code: data.code,
      mission: currentChallenge?.title ?? 'Space Navigation',
      cursorLine: data.code.split('\n').length - 1
    });
  });

  on('monty:narrator', ({ message }) => {
    setNarratorLine(message);
    trigger('hype'); // assuming hype maps to celebrating
  });

  on('game:reset', () => {
    const sts = useGameStore.getState().students.map(s => ({ ...s, score: 0, piecesUnlocked: 0 }));
    setStudents(sts);
    sts.forEach(s => pushScoreSnapshot(s.id, 0));
  });

  const toggleFullscreen = (panel: 'spotlight' | 'liveCam') => {
    setFullscreenPanel(prev => prev === panel ? null : panel);
  };

  if (!selectedPin) {
    return (
      <div className="min-h-screen bg-premium-gradient p-8">
        <h1 className="font-display font-bold text-2xl text-accent-gold mb-8">Audience View - Select Session</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.filter(s => s.status !== 'ended').map(s => (
            <GlassCard key={s.id} className="!p-6 flex flex-col gap-4 cursor-pointer hover:border-accent-gold transition-colors" onClick={() => { setSelectedPin(s.pin); setSelectedSessionName(s.name); }}>
              <div className="flex justify-between items-start">
                <h3 className="font-display font-bold text-lg text-white">{s.name}</h3>
                <span className="bg-space-800 text-white/60 text-xs px-2 py-1 rounded font-mono">PIN: {s.pin}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-status-success animate-pulse' : 'bg-space-600'}`} />
                <span className="text-xs text-white/40 font-mono uppercase">{s.status}</span>
                <span className="text-sm text-white/50 ml-auto">{s._count?.students || 0} hackers</span>
              </div>
            </GlassCard>
          ))}
          {sessions.filter(s => s.status !== 'ended').length === 0 && (
            <p className="text-white/50">No active sessions found.</p>
          )}
        </div>
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) => b.score - a.score);
  const leaderId = sortedStudents[0]?.id;
  const count = students.length;

  const tickerSegments = [
    currentChallenge
      ? `🚀 CURRENT MISSION: ${currentChallenge.title} — ${currentChallenge.description.split('\n')[0]} | WORTH ${currentChallenge.points} PTS`
      : '🚀 PYTHON CODE QUEST — Live competition in progress!',
    `📊 TOTAL HACKERS: ${count} connected`,
    `🏆 LEADER: ${sortedStudents[0]?.alias ?? '—'} with ${sortedStudents[0]?.score ?? 0} pts`,
    `⚡ TOP 3: ${sortedStudents.slice(0, 3).map((s, i) => `#${i + 1} ${s.alias} (${s.score})`).join(' · ')}`,
  ];

  return (
    <div className="w-full min-h-screen lg:h-screen bg-premium-gradient flex flex-col lg:overflow-hidden relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-2.5 bg-space-900/60 border-b border-space-700/30 shrink-0 gap-2 sm:gap-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <img src="/logo.png" alt="Thynkcity" className="h-6 object-contain" />
          <span className="font-display font-bold text-base sm:text-lg text-accent-gold whitespace-nowrap ml-2">CODE QUEST</span>
          <span className="text-white/20 text-sm hidden sm:inline">·</span>
          <span className="font-body text-sm text-white/50">Live Broadcast — {selectedSessionName ?? selectedPin}</span>
          <span className="font-mono text-xs text-white/30 sm:ml-2">{count} hackers</span>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span className="font-body text-xs text-status-success font-semibold">LIVE</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0 relative z-0">
        <div className="w-full flex-1 p-3 lg:overflow-y-auto shrink-0 lg:shrink custom-scrollbar">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))` }}
          >
            {students.map((student) => (
              <SpaceBasePlot
                key={student.id}
                student={student}
                isLeader={student.id === leaderId}
                totalChallenges={totalChallenges}
              />
            ))}
          </div>
        </div>

        <div className="w-full lg:w-1/3 xl:w-[450px] lg:min-w-[300px] flex flex-col gap-3 p-3 shrink-0 lg:shrink lg:overflow-y-auto custom-scrollbar border-l-0 lg:border-l border-space-700/30 bg-space-900/20">
          <div className="shrink-0">
            <LeaderboardPin students={students} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <SpotlightPanel totalChallenges={totalChallenges} onToggleFullscreen={() => toggleFullscreen('spotlight')} />
          </div>
          <div className="flex-1 min-h-[220px]">
            <LiveCodeCam onToggleFullscreen={() => toggleFullscreen('liveCam')} />
          </div>
          <div className="flex flex-col items-start gap-2 shrink-0">
            <MontyBubble text={narratorLine} onComplete={() => setNarratorLine(null)} duration={5000} wide />
            <MontyAvatar state={cockpitState} size={72} />
          </div>
        </div>

        {fullscreenPanel && (
          <div className="absolute inset-0 bg-space-950/95 z-50 p-6 flex flex-col backdrop-blur-sm">
            {fullscreenPanel === 'spotlight' && (
              <SpotlightPanel isFullscreen totalChallenges={totalChallenges} onToggleFullscreen={() => toggleFullscreen('spotlight')} />
            )}
            {fullscreenPanel === 'liveCam' && (
              <LiveCodeCam isFullscreen onToggleFullscreen={() => toggleFullscreen('liveCam')} />
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 z-10">
        <ScrollingTicker text={tickerSegments.join('   🔸   ')} />
      </div>
    </div>
  );
}
