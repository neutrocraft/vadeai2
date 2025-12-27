
import React from 'react';
import { Button } from './Button';
import { 
  Palette, 
  Code2, 
  Settings, 
  LayoutDashboard, 
  Image, 
  LogOut, 
  Crown,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types';

type NavItem = 'EDITOR' | 'API' | 'PROFILE' | 'GALLERY' | 'ADMIN';

interface SidebarProps {
  currentView: NavItem;
  onChangeView: (view: NavItem) => void;
  onLogout: () => void;
  userEmail?: string;
  planType?: string;
  userRole?: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onLogout, userEmail, planType, userRole }) => {
  
  const navItems = [
    { id: 'EDITOR', label: 'Studio Editor', icon: <Palette size={20} /> },
    { id: 'GALLERY', label: 'My Projects', icon: <Image size={20} /> },
    { id: 'API', label: 'Developers', icon: <Code2 size={20} /> },
    { id: 'PROFILE', label: 'Settings', icon: <Settings size={20} /> },
  ];

  // Add Admin Item if role is ADMIN
  if (userRole === 'ADMIN') {
      navItems.push({ id: 'ADMIN', label: 'Admin Panel', icon: <ShieldCheck size={20} /> });
  }

  return (
    <aside className="w-64 bg-[#0F1420] border-r border-slate-800/60 flex flex-col h-full shrink-0 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="text-white" size={20} />
        </div>
        <div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">Lumina</span>
            <span className="text-[10px] block text-indigo-400 font-medium tracking-wider">AI STUDIO</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id as NavItem)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className={`transition-colors ${currentView === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-white'}`}>
                {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800/60 bg-[#0B0F19]">
        <div className="flex items-center gap-3 mb-4 p-2.5 rounded-xl bg-slate-900 border border-slate-800 group hover:border-slate-700 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-xs text-white font-bold shadow-inner shrink-0">
                {userEmail?.substring(0,2).toUpperCase()}
            </div>
            <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate" title={userEmail}>{userEmail}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {planType === 'PRO' && <Crown size={10} className="text-amber-400 fill-amber-400" />}
                    <p className={`text-[10px] font-semibold ${planType === 'PRO' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {planType} MEMBER
                    </p>
                </div>
            </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onLogout} className="w-full text-xs justify-center gap-2 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 group">
          <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};
