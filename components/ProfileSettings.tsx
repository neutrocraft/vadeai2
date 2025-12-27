
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { User, Mail, Shield, Zap, CreditCard, LogOut } from 'lucide-react';

export const ProfileSettings: React.FC = () => {
    const { user, logout, upgradePlan } = useAuth();

    if (!user) return null;

    return (
        <div className="flex-1 bg-[#0B0F19] p-8 overflow-y-auto h-full text-slate-200">
            <div className="max-w-3xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
                    <p className="text-slate-400">Manage your profile and subscription.</p>
                </div>

                {/* Profile Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                                {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{user.full_name || 'Creator'}</h2>
                                <p className="text-slate-400">{user.email}</p>
                                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wide border border-slate-700">
                                    {user.role} Account
                                </span>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={logout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20">
                            <LogOut size={16} className="mr-2" /> Sign Out
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Full Name</label>
                             <div className="flex items-center gap-3 text-slate-300">
                                 <User size={16} /> {user.full_name || '-'}
                             </div>
                         </div>
                         <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                             <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Email Address</label>
                             <div className="flex items-center gap-3 text-slate-300">
                                 <Mail size={16} /> {user.email}
                             </div>
                         </div>
                    </div>
                </div>

                {/* Subscription Card */}
                <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-amber-400" fill="currentColor" /> 
                                Current Plan: <span className="text-indigo-400">{user.plan}</span>
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">
                                {user.plan === 'FREE' ? 'Upgrade to Pro for 4K exports & more credits.' : 'You are enjoying full access.'}
                            </p>
                        </div>
                        {user.plan === 'FREE' && (
                             <Button onClick={() => upgradePlan('PRO')} className="bg-white text-indigo-900 hover:bg-slate-200">
                                 Upgrade to Pro
                             </Button>
                        )}
                    </div>

                    <div className="mt-8 relative z-10">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-300 font-medium">Monthly Credits</span>
                            <span className="text-white font-bold">{user.credits} remaining</span>
                        </div>
                        <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/50">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, (user.credits / (user.plan === 'PRO' ? 500 : 5)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
