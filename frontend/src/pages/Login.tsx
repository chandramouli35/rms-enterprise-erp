import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_RMS_BACKEND_URL || 'http://localhost:3000';

export const Login: React.FC = () => {
 const [plants, setPlants] = useState<any[]>([]);
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [plantId, setPlantId] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);
 const [showPassword, setShowPassword] = useState(false); 
 
 const setAuth = useAuthStore((state) => state.setAuth);
 const setActivePlant = usePlantStore((state) => state.setActivePlant);
 const navigate = useNavigate();

 useEffect(() => {
 const fetchPlants = async () => {
 try {
 const res = await axios.get(`${API_URL}/plants`);
 setPlants(res.data);
 } catch (err) {
 console.error('Failed to fetch plants', err);
 }
 };
 fetchPlants();
 }, []);

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setLoading(true);

 try {
 const res = await axios.post(`${API_URL}/auth/login`, { username, password, plantId });
 const { user, accessToken } = res.data;
 
 setAuth(user, accessToken);
 
 if (plantId) {
 const selected = plants.find(p => p.id === plantId);
 if (selected) setActivePlant(selected);
 }
 navigate('/dashboard');
 
 } catch (err: any) {
 setError(err.response?.data?.message || err.message || 'Login failed');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex h-screen bg-[var(--bg-base)] text-[var(--text-main)] overflow-hidden">
 {/* Left side: Background Image & Marketing */}
 <div 
 className="hidden lg:flex lg:w-2/3 relative flex-col justify-between p-12 bg-cover bg-center"
 style={{ backgroundImage: `url('/login-bg.png')` }}
 >
 <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
 
 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-16">
 <img src="/logo.png" alt="RMS Logo" className="w-12 h-12 rounded-full border border-amber-500/30" />
 <span className="text-xl font-bold tracking-widest text-amber-500">RICE MILL <span className="text-[var(--text-main)] font-light text-sm block tracking-widest">MANAGEMENT SYSTEM</span></span>
 </div>

 <div className="max-w-xl">
 <p className="text-amber-500 text-lg mb-2 font-medium">Welcome Back!</p>
 <h1 className="text-5xl font-bold leading-tight mb-6 text-[var(--text-main)] font-serif">
 Manage Smarter.<br/>Produce Better.
 </h1>
 <p className="text-[var(--text-muted)] text-lg leading-relaxed">
 A complete solution to manage procurement, milling, inventory, dispatch and all operations across your rice mills.
 </p>
 </div>
 </div>

 {/* Feature blocks at the bottom */}
 <div className="relative z-10 grid grid-cols-3 gap-6 bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-[var(--border-subtle)] max-w-3xl">
 <div className="text-center">
 <div className="w-10 h-10 mx-auto bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
 <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
 </div>
 <h3 className="font-semibold text-sm">Secure & Reliable</h3>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Enterprise grade security to protect your data</p>
 </div>
 <div className="text-center">
 <div className="w-10 h-10 mx-auto bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
 <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
 </div>
 <h3 className="font-semibold text-sm">Online / Offline Sync</h3>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Work seamlessly in both modes across all plants</p>
 </div>
 <div className="text-center">
 <div className="w-10 h-10 mx-auto bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
 <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
 </div>
 <h3 className="font-semibold text-sm">Real-time Insights</h3>
 <p className="text-xs text-[var(--text-muted-alt)] mt-1">Get instant insights and make better decisions</p>
 </div>
 </div>
 </div>

 {/* Right side: Login Form */}
 <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 relative">
 <div className="absolute top-6 right-6">
 <button className="flex items-center gap-2 text-sm text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors bg-[var(--glass-bg)] px-4 py-2 rounded-full border border-[var(--border-subtle)]">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
 English
 </button>
 </div>

 <div className="w-full max-w-md mx-auto">
 <div className="text-center mb-4">
 <img src="/logo.png" alt="Logo" className="w-14 h-14 mx-auto rounded-full border border-amber-500/30 mb-3 shadow-xl shadow-amber-500/10" />
 <h2 className="text-2xl font-semibold mb-1">Login to Your Account</h2>
 <p className="text-[var(--text-muted-alt)] text-sm">Please enter your credentials to continue</p>
 </div>

 <form onSubmit={handleLogin} className="space-y-3">
 {error && (
 <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-2 rounded-lg text-sm text-center">
 {error}
 </div>
 )}

 <div>
 <label className="block text-amber-500 text-sm font-medium mb-1">Select Plant</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <svg className="h-5 w-5 text-[var(--text-muted-alt)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
 </div>
 <select
 className="w-full pl-11 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] appearance-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
 value={plantId}
 onChange={(e) => setPlantId(e.target.value)}
 >
 <option value="">Select Plant (Optional for Super Admin)</option>
 {Array.isArray(plants) && plants.map(p => (
 <option key={p.id} value={p.id}>{p.name}</option>
 ))}
 </select>
 <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
 <svg className="h-4 w-4 text-[var(--text-muted-alt)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-amber-500 text-sm font-medium mb-1">Username</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <svg className="h-5 w-5 text-[var(--text-muted-alt)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
 </div>
 <input
 type="text"
 placeholder="Enter your username"
 className="w-full pl-11 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 required
 />
 </div>
 </div>

 <div>
 <label className="block text-amber-500 text-sm font-medium mb-1">Password</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
 <svg className="h-5 w-5 text-[var(--text-muted-alt)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
 </div>
 <input
 // 2. Changed type assignment dynamically based on state
 type={showPassword ? 'text' : 'password'} 
 placeholder="Enter your password"
 className="w-full pl-11 pr-12 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 />
 <button 
 type="button" 
 // 3. Appended visibility click handler toggle
 onClick={() => setShowPassword(!showPassword)} 
 className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors"
 >
 {/* 4. Dynamically switch eye icon path based on visibility state */}
 {showPassword ? (
 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
 </svg>
 ) : (
 <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
 </svg>
 )}
 </button>
 </div>
 </div>

 <div className="flex items-center justify-between pt-1">
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" className="rounded bg-[var(--bg-panel)] border-[var(--border-subtle)] text-amber-500 focus:ring-amber-500 w-4 h-4" />
 <span className="text-sm text-[var(--text-muted-alt)]">Remember Me</span>
 </label>
 <a href="#" className="text-sm text-amber-500 hover:text-amber-400 transition-colors">Forgot Password?</a>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2"
 >
 {loading ? 'Logging in...' : 'LOGIN'}
 {!loading && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
 </button>
 
 <div className="relative flex items-center justify-center py-1.5">
 <span className="absolute bg-[var(--bg-base)] px-3 text-xs text-[var(--text-muted-alt)] uppercase">or</span>
 <div className="w-full border-t border-[var(--border-subtle)]"></div>
 </div>
 
 <button
 type="button"
 className="w-full py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-[var(--text-main)] font-medium rounded-lg transition-all flex items-center justify-center gap-3"
 >
 <svg className="w-5 h-5 text-[#00a4ef]" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0v11.408h11.408V0H0zm12.592 0v11.408H24V0H12.592zM0 12.592V24h11.408V12.592H0zm12.592 0V24H24V12.592H12.592z"/></svg>
 Login with Windows
 </button>
 </form>

 <p className="text-center text-[var(--text-muted-alt)] text-xs mt-4 flex items-center justify-center gap-1.5">
 <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
 Your data is 100% safe and encrypted
 </p>
 </div>
 </div>
 </div>
 );
};