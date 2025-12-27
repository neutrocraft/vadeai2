
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { Download, Trash2, Calendar, Image as ImageIcon } from 'lucide-react';

export const Gallery: React.FC = () => {
    const { projects, deleteProject, addNotification } = useAuth();

    const handleDownload = (url: string, name: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        addNotification('INFO', 'Download started.');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this project?')) {
            await deleteProject(id);
        }
    };

    return (
        <div className="flex-1 bg-[#0B0F19] p-8 overflow-y-auto h-full text-slate-200">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
                        <p className="text-slate-400">Manage and download your generated masterpieces.</p>
                    </div>
                    <div className="text-slate-500 text-sm font-medium">
                        {projects.length} Projects
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
                        <div className="p-4 bg-slate-800 rounded-full mb-4 opacity-50">
                            <ImageIcon size={32} />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
                        <p className="text-slate-500 max-w-sm text-center">
                            Start exploring the studio to create your first design. Your saved work will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((project) => (
                            <div key={project.id} className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-600 transition-all hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1">
                                <div className="aspect-square relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-950">
                                    <img 
                                        src={project.thumbnail_url} 
                                        alt={project.name} 
                                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" 
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <button 
                                            onClick={() => handleDownload(project.thumbnail_url, project.name)}
                                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg"
                                            title="Download"
                                        >
                                            <Download size={20} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDelete(e, project.id)}
                                            className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                            title="Delete"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-white truncate mb-1" title={project.name}>{project.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={12} />
                                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
