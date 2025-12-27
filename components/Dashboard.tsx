import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';

interface DashboardProps {
  onNewProject: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNewProject }) => {
  const { user, projects } = useAuth();

  const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8 font-inter">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-12 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.full_name}</h1>
            <p className="text-slate-400">You have <span className="text-indigo-400 font-bold">{user?.credits} credits</span> remaining this month.</p>
          </div>
          <Button onClick={onNewProject} size="lg" icon={<span>+</span>}>
            New Project
          </Button>
        </div>

        {/* Recent Projects */}
        <h2 className="text-xl font-semibold mb-6 border-b border-slate-800 pb-4">Recent Projects</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Create New Card */}
          <div 
            onClick={onNewProject}
            className="aspect-[4/3] bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group order-first"
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </div>
            <span className="text-sm font-medium text-slate-400 group-hover:text-white">Start from scratch</span>
          </div>

          {/* Project List */}
          {projects.length > 0 ? (
            projects.map((project) => (
              <div key={project.id} className="aspect-[4/3] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group hover:border-slate-600 transition-colors">
                {/* Thumbnail */}
                <div className="absolute inset-0 bg-slate-800">
                    <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                {/* Overlay Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                  <p className="text-sm font-medium text-white truncate">{project.name}</p>
                  <p className="text-xs text-slate-400">{formatDate(new Date(project.created_at))}</p>
                </div>
              </div>
            ))
          ) : (
             <div className="col-span-1 md:col-span-2 flex items-center justify-center text-slate-500 text-sm border border-slate-800 rounded-xl bg-slate-900/20">
                 No projects yet. Create one to get started.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};