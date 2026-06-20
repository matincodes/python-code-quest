/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, RotateCcw, X, Play, LogOut,
  Plus, Pencil, Trash2, Save, LayoutDashboard, BookOpen, Users, List, Lock, Eye, EyeOff
} from 'lucide-react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import StatusDot from '../components/shared/StatusDot';
import { useUserStore } from '../store/userStore';
import { useMonty } from '../hooks/useMonty';
import { api } from '../api/client';
import { useSocket } from '../hooks/useSocket';

type Tab = 'control' | 'questions' | 'students' | 'rules';

const BLANK = {
  title: '', description: '', expectedOutput: '',
  points: 10, difficulty: 1, timeLimit: 120, hints: [''], starterCode: '', sortOrder: 1
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setAuthenticated, setRole, setAlias } = useUserStore();
  const { trigger, speak } = useMonty();
  const { connected, emit, on } = useSocket();

  // Auth State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Session State
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionPin, setNewSessionPin] = useState('');
  const [newSessionTime, setNewSessionTime] = useState(10); // minutes

  // Global State (for question bank and practice records)
  const [practiceChallenges, setPracticeChallenges] = useState<any[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<any[]>([]);

  // Game State (for selected session)
  const [challenges, setChallenges] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  
  const [globalTab, setGlobalTab] = useState<'sessions' | 'question_bank' | 'practice_records'>('sessions');
  const [tab, setTab] = useState<Tab>('control');
  const [log, setLog] = useState<string[]>(['Admin console ready.']);
  const appendLog = (msg: string) => setLog((l) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...l.slice(0, 29)]);

  // Question Editor
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(BLANK);
  const [showQModal, setShowQModal] = useState(false);

  const fetchSessions = async () => {
    try {
      const data = await api.sessions.getAll();
      setSessions(data);

      const pcData = await api.practiceChallenges.getAll();
      setPracticeChallenges(pcData.challenges || []);

      const psData = await api.practiceSessions.getAll();
      setPracticeSessions(psData.sessions || []);
    } catch (e) {
      appendLog('Failed to fetch sessions or global records');
    }
  };

  const fetchSessionData = async () => {
    if (!selectedPin) return;
    try {
      const session = await api.sessions.getByPin(selectedPin);
      const chs = await api.challenges.getBySession(selectedPin);
      const sts = await api.students.getBySession(selectedPin);
      setChallenges(chs);
      setStudents(sts);
      setSessionStatus(session.status);
    } catch (e) {
      appendLog('Failed to fetch session data');
    }
  };

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    }
  }, [isAuthenticated]);

  // Handle selected session updates
  useEffect(() => {
    if (selectedPin) {
      fetchSessionData();
      if (connected) {
        emit('join:admin', { pin: selectedPin });
      }
    }
  }, [selectedPin, connected]);

  // Socket listeners for live updates
  on('student:joined', (student) => {
    appendLog(`Student joined: ${student.alias}`);
    setStudents((prev) => [...prev.filter((s) => s.id !== student.id), student]);
  });
  on('student:left', (studentId) => {
    setStudents((prev) => prev.map((s) => s.id === studentId ? { ...s, status: 'disconnected' } : s));
  });
  on('student:updated', (student) => {
    setStudents((prev) => prev.map((s) => s.id === student.id ? { ...s, ...student } : s));
  });
  on('solve:latest', (data) => {
    appendLog(`${data.alias} solved a mission! (+${data.points} pts)`);
  });



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.login({ username, password });
      setAuthenticated(true);
      setRole('admin');
      setAlias('Admin');
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || 'Login failed');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const session = await api.sessions.create({ name: newSessionName, pin: newSessionPin, totalTimeLimit: newSessionTime * 60 });
      appendLog(`Created session ${session.name} (${newSessionTime} min)`);
      setNewSessionName('');
      setNewSessionPin('');
      setNewSessionTime(10);
      fetchSessions();
    } catch (err: any) {
      if (!err.message?.includes('Session expired')) {
        alert(err.message || 'Failed to create session');
      }
    }
  };

  const handleDeleteSession = async (pin: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the session "${name}"? This action cannot be undone.`)) return;
    try {
      await api.sessions.delete(pin);
      appendLog(`Deleted session ${name}`);
      fetchSessions();
    } catch (err: any) {
      if (!err.message?.includes('Session expired')) {
        alert(err.message || 'Failed to delete session');
      }
    }
  };

  const handleRemoveStudent = async (studentId: string, alias: string) => {
    if (!window.confirm(`Are you sure you want to remove ${alias}?`)) return;
    try {
      await api.students.remove(studentId);
      appendLog(`Removed student: ${alias}`);
      fetchSessionData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove student');
    }
  };

  const handleReset = async () => {
    if (!selectedPin) return;
    try {
      await api.admin.resetScores(selectedPin);
      appendLog('Scores reset.');
      fetchSessionData();
    } catch (e) {
      appendLog('Failed to reset scores');
    }
  };

  const handleStartGame = async () => {
    if (!selectedPin) return;
    try {
      await api.admin.startGame(selectedPin);
      appendLog('Game started.');
      fetchSessionData();
    } catch (e) {
      appendLog('Failed to start game');
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      console.error("Logout failed", e);
    }
    setAuthenticated(false);
    setRole('student');
    setAlias('');
    navigate('/admin');
  };

  const handleEndGame = async () => {
    if (!selectedPin) return;
    try {
      await api.admin.endGame(selectedPin);
      trigger('narrator_game_end');
      appendLog('Game ended.');
      setSelectedPin(null);
    } catch (e) {
      appendLog('Failed to end game');
    }
  };

  const handleHype = async () => {
    if (!selectedPin) return;
    try {
      await api.admin.broadcastHype(selectedPin, '🔥 The hackers are CRUSHING it!');
      speak('🔥 The hackers are CRUSHING it!', 'celebrating');
      appendLog('Monty hype deployed!');
    } catch (e) {
      appendLog('Failed to deploy hype');
    }
  };

  const [isGlobalEdit, setIsGlobalEdit] = useState(false);

  const handleSaveQ = async () => {
    if (!form.title.trim()) return;
    try {
      if (isGlobalEdit) {
        if (editing) {
          await api.practiceChallenges.update(editing.id, form);
          appendLog(`Updated Global: ${form.title}`);
        } else {
          await api.practiceChallenges.create(form);
          appendLog(`Created Global: ${form.title}`);
        }
        setShowQModal(false);
        fetchSessions(); // Refresh global data
      } else {
        if (!selectedPin) return;
        if (editing) {
          await api.challenges.update(editing.id, form);
          appendLog(`Updated: ${form.title}`);
        } else {
          await api.challenges.create(selectedPin, form);
          appendLog(`Created: ${form.title}`);
        }
        setShowQModal(false);
        fetchSessionData();
      }
    } catch (e) {
      appendLog('Failed to save question');
    }
  };

  const handleDeleteQ = async (id: string, global = false) => {
    try {
      if (global) {
        await api.practiceChallenges.delete(id);
        appendLog(`Deleted global challenge`);
        fetchSessions();
      } else {
        await api.challenges.delete(id);
        appendLog(`Deleted challenge`);
        fetchSessionData();
      }
    } catch (e) {
      appendLog('Failed to delete question');
    }
  };

  const resetChallenges = async () => {
    if (!selectedPin) return;
    try {
      await api.challenges.reset(selectedPin);
      appendLog('Reset challenges to default');
      fetchSessionData();
    } catch (e) {
      appendLog('Failed to reset challenges');
    }
  };


  const diffColor = { 1: 'text-status-success', 2: 'text-accent-gold', 3: 'text-status-danger' } as const;
  const inp = 'w-full px-3 py-2 rounded-xl bg-space-950 border border-space-700 text-white font-body text-sm focus:outline-none focus:border-accent-gold';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-premium-gradient flex items-center justify-center p-4">
        <GlassCard className="max-w-sm w-full !p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-status-danger/10 border border-status-danger/30 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-status-danger" />
            </div>
            <h1 className="font-display font-bold text-2xl text-white">Admin Access</h1>
            <p className="text-white/50 text-sm mt-1">Authenticate to access control panel</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className={inp} />
            </div>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className={inp} />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-status-danger text-sm">{authError}</p>}
            <NeonButton variant="danger" type="submit" className="w-full mt-2">LOGIN</NeonButton>
          </form>
        </GlassCard>
      </div>
    );
  }

  if (!selectedPin) {
    return (
      <div className="min-h-screen bg-premium-gradient flex flex-col">
        <div className="bg-space-900/80 border-b border-space-700/50 px-8 py-4 flex items-center gap-6 shrink-0">
          <h1 className="font-display font-bold text-2xl text-accent-gold">Admin Portal</h1>
          
          <div className="flex gap-4 ml-8">
            <button
              onClick={() => setGlobalTab('sessions')}
              className={`font-display font-bold text-sm uppercase tracking-wider pb-1 border-b-2 transition-colors ${globalTab === 'sessions' ? 'border-accent-gold text-accent-gold' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              Live Sessions
            </button>
            <button
              onClick={() => setGlobalTab('question_bank')}
              className={`font-display font-bold text-sm uppercase tracking-wider pb-1 border-b-2 transition-colors ${globalTab === 'question_bank' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              Question Bank
            </button>
            <button
              onClick={() => setGlobalTab('practice_records')}
              className={`font-display font-bold text-sm uppercase tracking-wider pb-1 border-b-2 transition-colors ${globalTab === 'practice_records' ? 'border-accent-purple text-accent-purple' : 'border-transparent text-white/50 hover:text-white'}`}
            >
              Practice Records
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-status-danger border border-status-danger/40 hover:bg-status-danger/10 rounded transition-colors text-sm font-display ml-auto"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
        
        <div className="flex-1 p-8 overflow-auto">
          {globalTab === 'sessions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GlassCard className="!p-6 flex flex-col gap-4 border-dashed border-2 border-space-700 hover:border-accent-gold transition-colors">
                <h3 className="font-display font-bold text-lg text-white">Create New Session</h3>
                <form onSubmit={handleCreateSession} className="flex flex-col gap-3">
                  <input type="text" value={newSessionName} onChange={e => setNewSessionName(e.target.value)} placeholder="Session Name (e.g. Class A)" className={inp} required />
                  <input type="text" value={newSessionPin} onChange={e => setNewSessionPin(e.target.value)} placeholder="4-Digit PIN" maxLength={4} minLength={4} className={inp} required />
                  <div>
                    <label className="block text-xs font-body text-white/60 mb-1">Session Duration (minutes)</label>
                    <input type="number" value={newSessionTime} onChange={e => setNewSessionTime(Number(e.target.value))} className={inp} min={1} max={120} required />
                  </div>
                  <NeonButton variant="success" type="submit" className="w-full">Create</NeonButton>
                </form>
              </GlassCard>

              {sessions.map(s => (
                <GlassCard key={s.id} className="!p-6 flex flex-col gap-4 cursor-pointer hover:border-accent-gold transition-colors" onClick={() => setSelectedPin(s.pin)}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-display font-bold text-lg text-white">{s.name}</h3>
                    <span className="bg-space-800 text-white/60 text-xs px-2 py-1 rounded font-mono">PIN: {s.pin}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Users className="w-4 h-4" /> {s._count?.students || 0} students
                  </div>
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <button 
                      onClick={(e) => handleDeleteSession(s.pin, s.name, e)}
                      className="p-1.5 text-white/30 hover:text-status-danger hover:bg-status-danger/10 rounded transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <NeonButton variant="primary" className="text-xs">Manage</NeonButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {globalTab === 'question_bank' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-space-800/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                <div>
                  <h2 className="font-display font-bold text-2xl text-accent-blue">Global Question Bank</h2>
                  <p className="text-white/50 text-sm">Create and manage standalone practice challenges.</p>
                </div>
                <NeonButton variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
                  setEditing(null);
                  setForm(BLANK);
                  setIsGlobalEdit(true);
                  setShowQModal(true);
                }}>
                  Add Practice Challenge
                </NeonButton>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {practiceChallenges.map(q => (
                  <GlassCard key={q.id} className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-space-800 text-white text-xs px-2 py-1 rounded font-mono font-bold">
                          {q.points} PTS
                        </span>
                        <h4 className="font-display font-bold text-lg text-white">{q.title}</h4>
                      </div>
                      <p className="text-sm text-white/50 line-clamp-2">{q.description}</p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0">
                      <button 
                        onClick={() => {
                          setEditing(q);
                          setForm({
                            title: q.title, description: q.description, expectedOutput: q.expectedOutput,
                            points: q.points, difficulty: q.difficulty, timeLimit: q.timeLimit,
                            hints: q.hints as string[], starterCode: q.starterCode, sortOrder: q.sortOrder || 1
                          });
                          setIsGlobalEdit(true);
                          setShowQModal(true);
                        }}
                        className="p-2 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteQ(q.id, true)}
                        className="p-2 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))}
                {practiceChallenges.length === 0 && (
                  <div className="text-center p-8 text-white/40 font-mono text-sm border border-dashed border-white/10 rounded-xl">
                    No global practice challenges exist.
                  </div>
                )}
              </div>
            </div>
          )}

          {globalTab === 'practice_records' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-space-800/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                <div>
                  <h2 className="font-display font-bold text-2xl text-accent-purple">Practice Records</h2>
                  <p className="text-white/50 text-sm">Monitor student practice sessions and scores.</p>
                </div>
              </div>

              <GlassCard className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-xs font-mono text-white/50 uppercase">Student</th>
                      <th className="p-3 text-xs font-mono text-white/50 uppercase">Started</th>
                      <th className="p-3 text-xs font-mono text-white/50 uppercase">Status</th>
                      <th className="p-3 text-xs font-mono text-white/50 uppercase">Score</th>
                      <th className="p-3 text-xs font-mono text-white/50 uppercase">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practiceSessions.map(ps => (
                      <tr key={ps.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{ps.user?.username}</div>
                          <div className="text-xs text-white/50">{ps.user?.firstName} {ps.user?.lastName}</div>
                        </td>
                        <td className="p-3 text-sm text-white/70">
                          {new Date(ps.startedAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${ps.status === 'active' ? 'bg-status-success/20 text-status-success' : 'bg-white/10 text-white/50'}`}>
                            {ps.status}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-accent-gold">{ps.score} pts</td>
                        <td className="p-3 text-sm text-white/70">{ps.totalTimeTaken}s</td>
                      </tr>
                    ))}
                    {practiceSessions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-white/40 text-sm font-mono border-none">
                          No practice sessions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showQModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowQModal(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-lg max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()}>
                <GlassCard className="flex flex-col gap-4">
                  <h3 className="font-display font-bold text-lg text-white">{editing ? 'Edit Question' : 'New Question'}</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Title *</label>
                      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="THE GREETING VAULT" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Description *</label>
                      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inp} resize-none`} rows={3} placeholder="Describe the challenge…" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Expected Output *</label>
                      <input value={form.expectedOutput} onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))} className={inp} placeholder="Hello, Commander!" />
                    </div>
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Starter Code</label>
                      <textarea value={form.starterCode} onChange={e => setForm(f => ({ ...f, starterCode: e.target.value }))} className={`${inp} resize-none font-mono text-xs`} rows={2} placeholder="# Type your code here" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-body text-white/60 mb-1">Points</label>
                        <select value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} className={inp}>
                          <option value={10}>10</option><option value={20}>20</option><option value={30}>30</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-body text-white/60 mb-1">Difficulty</label>
                        <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: Number(e.target.value) }))} className={inp}>
                          <option value={1}>1 – Easy</option><option value={2}>2 – Medium</option><option value={3}>3 – Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-body text-white/60 mb-1">Time (s)</label>
                        <input type="number" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: Number(e.target.value) }))} className={inp} min={30} max={600} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <NeonButton variant="success" icon={<Save className="w-4 h-4" />} onClick={handleSaveQ} disabled={!form.title.trim()} className="flex-1">Save</NeonButton>
                    <NeonButton variant="primary" onClick={() => setShowQModal(false)} className="flex-1">Cancel</NeonButton>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'control',   label: 'Live',        icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'questions', label: 'Questions',   icon: <BookOpen className="w-4 h-4" /> },
    { id: 'students',  label: 'Students',    icon: <Users className="w-4 h-4" /> },
    { id: 'rules',     label: 'Rules',       icon: <List className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-premium-gradient flex flex-col">
      <div className="bg-space-900/80 border-b border-space-700/50 px-4 py-3 flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="Thynkcity" className="h-5 object-contain" />
        <span className="font-display font-bold text-accent-gold text-base sm:text-lg">GAME MASTER</span>
        <span className="font-body text-xs text-status-danger border border-status-danger/40 px-2 py-0.5 rounded-full">ADMIN</span>
        <span className="font-mono text-xs text-white/50 ml-2">Session PIN: {selectedPin}</span>
        <div className="ml-auto flex gap-2">
          <NeonButton variant="primary" onClick={() => setSelectedPin(null)} className="text-xs py-1.5 px-3">
            Switch Session
          </NeonButton>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center p-1.5 text-status-danger hover:bg-status-danger/20 rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-space-700/50 bg-space-900/60 shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-display font-semibold whitespace-nowrap transition-colors border-b-2
              ${tab === t.id ? 'border-accent-gold text-accent-gold' : 'border-transparent text-white/40 hover:text-white/70'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <AnimatePresence mode="wait">
          {tab === 'control' && (
            <motion.div key="control" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
              <div className="lg:col-span-3">
                <GlassCard className="py-3 px-4">
                  <p className="text-white/40 text-sm font-body">Session controls and real-time logs.</p>
                </GlassCard>
              </div>
              <GlassCard className="flex flex-col gap-3">
                <h2 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">Controls</h2>
                {sessionStatus === 'waiting' ? (
                  <NeonButton variant="success" icon={<Play className="w-4 h-4" />} onClick={handleStartGame} className="w-full py-2.5 animate-pulse">Start Game</NeonButton>
                ) : (
                  <NeonButton variant="success" icon={<Play className="w-4 h-4" />} onClick={handleStartGame} className="w-full py-2.5 opacity-70">Restart Game</NeonButton>
                )}
                <NeonButton variant="warning" icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset} className="w-full py-2.5">Reset Round Scores</NeonButton>
                <NeonButton variant="primary" icon={<Zap className="w-4 h-4" />} onClick={handleHype} className="w-full py-2.5">Monty Hype</NeonButton>
                <NeonButton variant="danger" icon={<X className="w-4 h-4" />} onClick={handleEndGame} className="w-full py-2.5">End Game</NeonButton>
              </GlassCard>
              <GlassCard className="flex flex-col gap-2 overflow-hidden lg:col-span-2">
                <h2 className="font-display font-bold text-xs text-white/40 uppercase tracking-widest shrink-0">Event Log</h2>
                <div className="flex-1 overflow-auto space-y-1 min-h-[120px]">
                  {log.map((e, i) => <p key={i} className="font-mono text-xs text-white/50 leading-relaxed">{e}</p>)}
                </div>
              </GlassCard>
            </motion.div>
          )}



          {tab === 'questions' && (
            <motion.div key="questions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">Question Editor</h2>
                  <div className="flex gap-2">
                    <NeonButton variant="warning" onClick={resetChallenges} className="text-xs py-1.5 px-3">
                      <RotateCcw className="w-3 h-3" /> Reset Defaults
                    </NeonButton>
                    <NeonButton variant="success" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); setForm(BLANK); setShowQModal(true); }} className="text-xs py-1.5 px-3">
                      Add Question
                    </NeonButton>
                  </div>
                </div>

                <div className="space-y-3">
                  {challenges.map((c, i) => (
                    <div key={c.id} className="flex flex-wrap sm:flex-nowrap items-start gap-3 p-4 rounded-xl border border-space-700/40 bg-space-950/40">
                      <span className="w-7 h-7 rounded-lg bg-space-800 flex items-center justify-center font-display font-bold text-xs text-white/40 shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-sm text-white">{c.title}</p>
                        <p className="font-body text-xs text-white/50 mt-0.5 truncate">{c.description.split('\n')[0]}</p>
                        <div className="flex gap-3 mt-1">
                          <span className={`text-xs font-mono ${diffColor[c.difficulty as 1|2|3] || 'text-white'}`}>D{c.difficulty}</span>
                          <span className="text-xs font-mono text-status-warning">{c.points} pts</span>
                          <span className="text-xs font-mono text-white/30">{c.timeLimit}s</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setEditing(c); setForm(c); setShowQModal(true); }} className="p-2 rounded-lg bg-space-800 hover:bg-accent-gold/20 text-white/50 hover:text-accent-gold transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteQ(c.id)} className="p-2 rounded-lg bg-space-800 hover:bg-status-danger/20 text-white/50 hover:text-status-danger transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {tab === 'students' && (
            <motion.div key="students" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-sm text-white/60 uppercase tracking-widest">Connections</h2>
                  <span className="font-mono text-xs bg-accent-gold/10 border border-accent-gold/30 text-accent-gold px-2 py-0.5 rounded-full">
                    {students.filter(s => s.status !== 'disconnected' && s.status !== 'logged_out').length} / {students.filter(s => s.status !== 'logged_out').length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.filter(s => s.status !== 'logged_out').map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-3 px-4 bg-space-950/50 rounded-xl border border-space-700/30">
                      <StatusDot status={s.status} />
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-space-950 shrink-0" style={{ backgroundColor: s.avatarColor }}>
                        {s.alias.charAt(0)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-white truncate">{s.alias}</p>
                        <div className="flex gap-2 items-center">
                          <p className="font-mono text-xs text-status-warning font-bold">{s.score} pts</p>
                          <p className="font-mono text-xs text-white/40">{s.totalTimeTaken || 0}s</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveStudent(s.id, s.alias)}
                        className="p-1.5 text-space-500 hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {students.filter(s => s.status !== 'logged_out').length === 0 && <p className="col-span-full text-white/30 text-sm font-body text-center py-8">No students connected</p>}
                </div>
              </GlassCard>
            </motion.div>
          )}

          {tab === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="flex flex-col gap-4">
                <h2 className="font-display font-bold text-lg text-white">Thynkcity Code Quest Rules</h2>
                <div className="space-y-4 text-white/70 font-body text-sm">
                  <div className="p-4 bg-space-950/50 rounded-xl border border-space-700/30">
                    <h3 className="text-accent-gold font-bold mb-2">1. The Objective</h3>
                    <p>Solve each mission by writing Python code (or blocks) that prints the exact expected output. All challenges must be completed sequentially.</p>
                  </div>
                  <div className="p-4 bg-space-950/50 rounded-xl border border-space-700/30">
                    <h3 className="text-status-success font-bold mb-2">2. Scoring</h3>
                    <p>Earn points for every correct answer. You can try as many times as you want until the timer runs out, there are no penalties for wrong answers.</p>
                  </div>
                  <div className="p-4 bg-space-950/50 rounded-xl border border-space-700/30">
                    <h3 className="text-status-warning font-bold mb-2">3. Tie-Breaker</h3>
                    <p>The time you spend coding is tracked. If two commanders end up with the same score, the one with the lowest total time taken wins!</p>
                  </div>
                  <div className="p-4 bg-space-950/50 rounded-xl border border-space-700/30">
                    <h3 className="text-status-warning font-bold mb-2">4. Need a Hint?</h3>
                    <p>If you're stuck, you can ask Monty for a hint, but it will cost you 5 points! Use them wisely.</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showQModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowQModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full max-w-lg max-h-[90vh] overflow-auto"
              onClick={e => e.stopPropagation()}>
              <GlassCard className="flex flex-col gap-4">
                <h3 className="font-display font-bold text-lg text-white">{editing ? 'Edit Question' : 'New Question'}</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-body text-white/60 mb-1">Title *</label>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="THE GREETING VAULT" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-white/60 mb-1">Description *</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${inp} resize-none`} rows={3} placeholder="Describe the challenge…" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-white/60 mb-1">Expected Output *</label>
                    <input value={form.expectedOutput} onChange={e => setForm(f => ({ ...f, expectedOutput: e.target.value }))} className={inp} placeholder="Hello, Commander!" />
                  </div>
                  <div>
                    <label className="block text-xs font-body text-white/60 mb-1">Starter Code</label>
                    <textarea value={form.starterCode} onChange={e => setForm(f => ({ ...f, starterCode: e.target.value }))} className={`${inp} resize-none font-mono text-xs`} rows={2} placeholder="# Type your code here" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Points</label>
                      <select value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} className={inp}>
                        <option value={10}>10</option><option value={20}>20</option><option value={30}>30</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Difficulty</label>
                      <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: Number(e.target.value) }))} className={inp}>
                        <option value={1}>1 – Easy</option><option value={2}>2 – Medium</option><option value={3}>3 – Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-body text-white/60 mb-1">Time (s)</label>
                      <input type="number" value={form.timeLimit} onChange={e => setForm(f => ({ ...f, timeLimit: Number(e.target.value) }))} className={inp} min={30} max={600} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <NeonButton variant="success" icon={<Save className="w-4 h-4" />} onClick={handleSaveQ} disabled={!form.title.trim()} className="flex-1">Save</NeonButton>
                  <NeonButton variant="primary" onClick={() => setShowQModal(false)} className="flex-1">Cancel</NeonButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
