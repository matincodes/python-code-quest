import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, LogOut, Trophy, History } from 'lucide-react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import { useUserStore } from '../store/userStore';
import { useStudentAuthStore } from '../store/studentAuthStore';
import { api } from '../api/client';

const StudentDashboardPage: React.FC = () => {
  const { user, logout, checkAuth } = useStudentAuthStore();
  const { isBeginner, setIsBeginner } = useUserStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
    api.practiceSessions.getHistory().then(res => {
      setHistory(res.sessions || []);
    }).catch(console.error);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-space-900 flex items-center justify-center text-accent-blue font-mono">Loading...</div>;
  }

  if (!user) {
    navigate('/student/login');
    return null;
  }

  const handleStartPractice = async () => {
    try {
      if (isBeginner !== null) {
        setIsBeginner(isBeginner);
      }
      const res = await api.practiceSessions.start();
      navigate(`/student/practice/${res.session.id}`);
    } catch (e) {
      console.error("Failed to start session", e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-space-900 bg-premium-gradient p-4 sm:p-8 text-white font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-space-800/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div>
            <h1 className="font-display font-bold text-3xl text-accent-blue">Welcome, {user.username}</h1>
            <p className="text-white/50 text-sm mt-1">{user.firstName} {user.lastName}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-space-900/50 px-4 py-2 rounded-full border border-accent-gold/20">
              <Trophy className="w-5 h-5 text-accent-gold" />
              <span className="font-bold text-accent-gold text-lg">{user.score} pts</span>
            </div>
            <button onClick={handleLogout} className="text-status-danger hover:text-status-danger/80 transition-colors flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Action Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <GlassCard className="flex flex-col items-center justify-center text-center p-12 gap-6 hover:border-accent-blue/50 transition-colors">
            <div className="w-20 h-20 bg-accent-blue/20 rounded-full flex items-center justify-center">
              <Play className="w-10 h-10 text-accent-blue ml-2" />
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl mb-2">Practice Arena</h2>
              <p className="text-white/50 text-sm">Jump into the global question bank and hone your skills. No time pressure, just pure coding.</p>
            </div>
            <div className="w-full max-w-sm text-left space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/35 font-semibold">Choose your starting mode</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{ label: 'Total Beginner', value: true }, { label: 'Know some Python', value: false }].map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setIsBeginner(value)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      isBeginner === value
                        ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                        : 'border-space-700 text-white/55 hover:border-space-600 hover:text-white/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/35">Total Beginner starts you in blocks mode.</p>
            </div>
            <NeonButton variant="primary" className="px-8 py-3 text-lg" onClick={handleStartPractice}>
              Start New Session
            </NeonButton>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <History className="w-5 h-5 text-accent-purple" />
              <h2 className="font-display font-bold text-xl">Recent Activity</h2>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-white/30 text-sm h-full">
                  <p>No activity history yet.</p>
                </div>
              ) : (
                history.map((session, i) => (
                  <div key={session.id || i} className="bg-space-800/50 p-3 rounded-lg border border-space-700/50 flex justify-between items-center text-sm">
                    <div>
                      <p className="text-white/80 font-bold">Practice Session</p>
                      <p className="text-white/40 text-xs">{new Date(session.startedAt).toLocaleDateString()} at {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div className="text-status-success font-bold text-xs">{session.submissions?.filter((s:any)=>s.isCorrect).length || 0} solved</div>
                      <div className="text-accent-gold font-bold">+{session.score || 0} pts</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboardPage;
