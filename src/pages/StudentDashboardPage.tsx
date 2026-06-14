import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, LogOut, Trophy, History } from 'lucide-react';
import GlassCard from '../components/shared/GlassCard';
import NeonButton from '../components/shared/NeonButton';
import { useStudentAuthStore } from '../store/studentAuthStore';
import { api } from '../api/client';

const StudentDashboardPage: React.FC = () => {
  const { user, logout, checkAuth } = useStudentAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
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
    <div className="min-h-screen bg-space-900 bg-premium-gradient p-8 text-white font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-space-800/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
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
            <NeonButton variant="primary" className="px-8 py-3 text-lg" onClick={handleStartPractice}>
              Start New Session
            </NeonButton>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <History className="w-5 h-5 text-accent-purple" />
              <h2 className="font-display font-bold text-xl">Recent Activity</h2>
            </div>
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
              <p>Activity history coming soon...</p>
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboardPage;
