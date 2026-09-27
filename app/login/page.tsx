"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import Cookies from 'js-cookie';
import { API_BASE_URL } from '../../utils/apiConfig';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('adminToken');
        if (token) {
            router.push('/dashboard');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email,
                password
            });

            // Store in cookies
            Cookies.set('adminToken', res.data.token, { expires: 1 }); // 1 day
            Cookies.set('adminUser', JSON.stringify(res.data.admin), { expires: 1 });

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50 overflow-hidden"
                >
                    <div className="bg-indigo-600 p-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-indigo-200">Sign in to Shadamon Admin</p>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black ml-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-black group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-black"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-black group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-black"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-rose-50 border border-rose-100 text-rose-600 text-sm p-3 rounded-xl flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <LogIn className="w-4 h-4" /></>}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
