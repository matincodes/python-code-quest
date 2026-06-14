import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Terminal, Eye, EyeOff } from 'lucide-react';
import NeonButton from '../components/shared/NeonButton';
import GlassCard from '../components/shared/GlassCard';
import { useStudentAuthStore } from '../store/studentAuthStore';

const StudentRegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useStudentAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ username, password, firstName, lastName });
      navigate('/student/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-space-900 bg-premium-gradient flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-purple/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-4xl text-transparent bg-clip-text bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink mb-2">
            Create Identity
          </h1>
          <p className="text-white/60 font-mono text-sm uppercase tracking-widest">
            Join the Practice Server
          </p>
        </div>

        <GlassCard className="!p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-mono"
                  placeholder="Ada"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-mono"
                  placeholder="Lovelace"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-mono"
                  placeholder="hacker_name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-space-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-mono"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-status-danger/10 border border-status-danger/20 rounded-lg">
                <p className="text-status-danger text-sm text-center">{error}</p>
              </div>
            )}

            <NeonButton
              variant="primary"
              className="w-full py-4 text-lg mt-6"
              disabled={loading}
              type="submit"
              icon={<Terminal className="w-5 h-5" />}
            >
              {loading ? 'Processing...' : 'Register'}
            </NeonButton>
            
            <p className="text-center text-white/50 text-sm mt-6">
              Already registered? <Link to="/student/login" className="text-accent-blue hover:text-accent-pink transition-colors">Login here</Link>
            </p>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default StudentRegisterPage;
