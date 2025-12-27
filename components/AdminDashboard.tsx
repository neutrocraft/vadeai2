
import React, { useEffect, useState } from 'react';
import { Users, CreditCard, Activity, TrendingUp, AlertTriangle, Download, Search, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

// Simple Chart Component
const MiniChart = ({ color, data }: { color: string, data: number[] }) => (
    <div className="flex items-end gap-1 h-12 mt-2">
        {data.map((h, i) => (
            <div key={i} className={`flex-1 rounded-t-sm opacity-60 hover:opacity-100 transition-opacity ${color}`} style={{ height: `${h}%` }}></div>
        ))}
    </div>
);

export const AdminDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        mrr: 0,
        activeUsers: 0,
        totalProjects: 0,
        churnRate: 2.4 // Hard to calc without history
    });
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Get Total Users & Calculate MRR
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('plan, created_at')
                .order('created_at', { ascending: false });

            if (profiles) {
                const userCount = profiles.length;
                
                // Calculate Mock MRR based on plans
                let mrr = 0;
                profiles.forEach(p => {
                    if (p.plan === 'PRO') mrr += 29;
                    if (p.plan === 'BUSINESS') mrr += 99;
                });

                // 2. Get Recent Users (First 5 of the fetched profiles)
                // We need full details for the table, so let's just fetch the top 5 full rows to be clean
                const { data: recent } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setRecentUsers((recent as UserProfile[]) || []);

                // 3. Get Total Projects (API Usage Proxy)
                const { count: projectCount } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    mrr,
                    activeUsers: userCount,
                    totalProjects: projectCount || 0,
                    churnRate: 2.4
                });
            }
        } catch (error) {
            console.error("Admin Fetch Error", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const statCards = [
        { label: 'Total MRR', value: `$${stats.mrr.toLocaleString()}`, change: '+18.2%', icon: <CreditCard size={18} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', chart: [40, 35, 50, 60, 75, 65, 80] },
        { label: 'Total Users', value: stats.activeUsers.toLocaleString(), change: '+12%', icon: <Users size={18} />, color: 'text-blue-400', bg: 'bg-blue-500/10', chart: [20, 30, 45, 40, 55, 70, 85] },
        { label: 'Images Processed', value: stats.totalProjects.toLocaleString(), change: '+24%', icon: <Activity size={18} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10', chart: [30, 40, 35, 50, 60, 80, 95] },
        { label: 'Churn Rate', value: `${stats.churnRate}%`, change: '-0.5%', icon: <AlertTriangle size={18} />, color: 'text-orange-400', bg: 'bg-orange-500/10', chart: [50, 45, 40, 35, 30, 25, 20] },
    ];

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-[#0B0F19] text-white custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            Admin Dashboard
                            {loading && <RefreshCw size={20} className="animate-spin text-slate-500"/>}
                        </h1>
                        <p className="text-slate-400 mt-1">Live platform overview and management.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" icon={<Download size={16}/>}>Export Report</Button>
                        <Button variant="primary" size="sm" onClick={fetchData} className="bg-indigo-600">Refresh Data</Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, idx) => (
                        <div key={idx} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-2xl font-bold">{stat.value}</h3>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                            </div>
                            <MiniChart color={stat.color.replace('text-', 'bg-')} data={stat.chart} />
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Users Table */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="font-bold text-lg">Recent Signups</h2>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" placeholder="Search users..." className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 w-48 transition-all" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6">User</th>
                                        <th className="p-4">Plan</th>
                                        <th className="p-4">Credits</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-right pr-6">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-sm">
                                    {recentUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {user.email ? user.email[0].toUpperCase() : 'U'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium group-hover:text-white transition-colors">{user.full_name}</span>
                                                        <span className="text-xs text-slate-500">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border tracking-wide ${
                                                    user.plan === 'PRO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                                    user.plan === 'BUSINESS' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    'bg-slate-800 text-slate-400 border-slate-700'
                                                }`}>
                                                    {user.plan}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (user.credits / 500) * 100)}%` }}></div>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{user.credits}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs text-slate-400 uppercase">{user.role}</span>
                                            </td>
                                            <td className="p-4 text-right pr-6 text-slate-500 text-xs">
                                                {new Date(user.created_at || Date.now()).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {recentUsers.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="space-y-6">
                         <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                             <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={16} className="text-indigo-400"/> API Latency</h3>
                             <div className="space-y-4">
                                 <div>
                                     <div className="flex justify-between text-xs mb-1">
                                         <span className="text-slate-400">Gemini 2.5 Flash</span>
                                         <span className="text-emerald-400">120ms</span>
                                     </div>
                                     <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-emerald-500 w-[80%]"></div>
                                     </div>
                                 </div>
                                 <div>
                                     <div className="flex justify-between text-xs mb-1">
                                         <span className="text-slate-400">Supabase DB</span>
                                         <span className="text-emerald-400">45ms</span>
                                     </div>
                                     <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-emerald-500 w-[95%]"></div>
                                     </div>
                                 </div>
                             </div>
                         </div>

                         <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-6">
                             <h3 className="font-bold mb-2">Pro Tips</h3>
                             <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                 Your Gemini 2.5 model is performing well. To reduce costs on background removal, consider deploying RMBG-1.4 on a dedicated GPU instance.
                             </p>
                             <Button size="sm" variant="secondary" className="w-full">View Infrastructure</Button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
