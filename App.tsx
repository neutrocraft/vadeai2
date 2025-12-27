
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Uploader } from './components/Uploader';
import { EditorCanvas } from './components/EditorCanvas';
import { Button } from './components/Button';
import { Pricing } from './components/Pricing';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { Gallery } from './components/Gallery';
import { ProfileSettings } from './components/ProfileSettings';
import { DeveloperApi } from './components/DeveloperApi';
import { useHistory } from './hooks/useHistory';
import { EditorTool, ProcessingState, ImageAdjustments, Layer } from './types';
import { processImageWithGemini, removeBackground, upscaleImage } from './services/geminiService';
import { autoCenterImage, generateMaskFromCanvas, applyWatermark, createThumbnail } from './utils/imageUtils';
import { supabase } from './lib/supabase';
import { 
    Scissors, Eraser, Wand2, Zap, Sliders, Download, 
    RotateCcw, RotateCw, Undo2, Redo2, ChevronLeft, 
    X, CheckCircle2, AlertCircle, Info, LayoutDashboard,
    Layers, Eye, EyeOff, Lock, Unlock, MousePointer2,
    Crop, ImagePlus, History, Settings2, Share2, Activity
} from 'lucide-react';

// --- HELPER COMPONENTS ---

const ToastNotification = () => {
    const { notifications, removeNotification } = useAuth();
    return (
        <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-right-10 fade-in duration-300 pointer-events-auto min-w-[300px] ${
                    n.type === 'SUCCESS' ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200' :
                    n.type === 'ERROR' ? 'bg-red-950/80 border-red-500/30 text-red-200' :
                    'bg-slate-800/90 border-slate-700 text-slate-200'
                }`}>
                    {n.type === 'SUCCESS' && <CheckCircle2 size={18} className="text-emerald-400" />}
                    {n.type === 'ERROR' && <AlertCircle size={18} className="text-red-400" />}
                    {n.type === 'INFO' && <Info size={18} className="text-blue-400" />}
                    <span className="text-sm font-medium flex-1">{n.message}</span>
                    <button onClick={() => removeNotification(n.id)} className="hover:bg-white/10 p-1 rounded-md transition-colors"><X size={14} /></button>
                </div>
            ))}
        </div>
    );
};

const LayerPanel = ({ layers, activeId, onToggleVisible, onSelect }: { layers: Layer[], activeId: string | null, onToggleVisible: (id: string) => void, onSelect: (id: string) => void }) => {
    return (
        <div className="w-72 bg-[#0F1420] border-l border-slate-800 flex flex-col z-20 shrink-0 relative shadow-[-10px_0_20px_rgba(0,0,0,0.2)]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0F1420]">
                <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2"><Layers size={16}/> Layers</h3>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">{layers.length} Active</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {[...layers].reverse().map(layer => (
                    <div 
                        key={layer.id}
                        onClick={() => onSelect(layer.id)}
                        className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            activeId === layer.id 
                            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm' 
                            : 'bg-transparent border-transparent hover:bg-slate-800/50'
                        }`}
                    >
                        <div className="w-10 h-10 rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {layer.type === 'IMAGE' ? (
                                <img src={layer.data} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] text-slate-500">MASK</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${activeId === layer.id ? 'text-indigo-300' : 'text-slate-400'}`}>{layer.name}</p>
                            <p className="text-[10px] text-slate-600 uppercase font-bold">{layer.type}</p>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id); }}
                            className="text-slate-600 hover:text-slate-300 p-1.5 rounded-md hover:bg-slate-700/50"
                        >
                            {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                    </div>
                ))}
                {layers.length === 0 && <div className="text-center py-8 text-slate-600 text-xs">No layers found</div>}
            </div>
        </div>
    );
};

// --- EDITOR LOGIC ---

const EditorLayout = ({ user, onShowPricing }: { user: any, onShowPricing: () => void }) => {
  // Complex State using History
  const { state: layers, set: setLayers, undo, redo, canUndo, canRedo } = useHistory<Layer[]>([]);
  
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>(EditorTool.Select);
  
  // Processing & UI State
  const [processing, setProcessing] = useState<ProcessingState>({ isProcessing: false, progress: 0, statusMessage: '', tool: null });
  const [maskPaths, setMaskPaths] = useState<{ x: number, y: number }[][]>([]);
  const [prompt, setPrompt] = useState('');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ brightness: 100, contrast: 100, saturation: 100, blur: 0 });
  const [brushSize, setBrushSize] = useState(40);
  
  const { deductCredit, saveProject, addNotification } = useAuth();

  // Reset tool-specific states when tool changes
  useEffect(() => {
    setMaskPaths([]);
    setPrompt('');
  }, [activeTool]);

  // Load Initial Image as Layer
  const handleImageLoad = (base64: string) => {
      const newLayer: Layer = {
          id: 'bg-layer',
          type: 'IMAGE',
          name: 'Original Image',
          data: base64,
          visible: true,
          locked: true,
          opacity: 1,
          blendMode: 'normal'
      };
      setLayers([newLayer]);
      setActiveLayerId(newLayer.id);
  };

  const activeLayer = useMemo(() => layers.find(l => l.id === activeLayerId), [layers, activeLayerId]);

  const handleProcess = async () => {
    if (!activeLayer || activeLayer.type !== 'IMAGE') {
        addNotification('ERROR', 'Please select an image layer first.');
        return;
    }

    const hasCredit = await deductCredit();
    if (!hasCredit) { onShowPricing(); return; }

    setProcessing({ isProcessing: true, progress: 10, statusMessage: 'Analyzing...', tool: activeTool });

    try {
      let result = '';
      
      // 1. Background Removal
      if (activeTool === EditorTool.RemoveBg) {
        setProcessing({ isProcessing: true, progress: 40, statusMessage: 'Removing background...', tool: activeTool });
        const raw = await removeBackground(activeLayer.data);
        result = await autoCenterImage(raw); // "Smart Align"
      } 
      
      // 2. Generative Fill / Eraser
      else if (activeTool === EditorTool.ReplaceBg || activeTool === EditorTool.MagicEdit) {
        if (maskPaths.length === 0) throw new Error("Please paint over the area you want to modify.");
        
        // We assume 1024x1024 for simplified calculation in this demo, 
        // normally we'd get real dims from canvas ref
        const mask = generateMaskFromCanvas(1024, 1024, maskPaths);
        
        setProcessing({ isProcessing: true, progress: 60, statusMessage: 'Generating pixels...', tool: activeTool });
        result = await processImageWithGemini(activeLayer.data, prompt, mask, activeTool === EditorTool.ReplaceBg ? 'ERASER' : 'EDIT');
      }
      
      // 3. Upscale
      else if (activeTool === EditorTool.Upscale) {
          setProcessing({ isProcessing: true, progress: 50, statusMessage: 'Enhancing details...', tool: activeTool });
          result = await upscaleImage(activeLayer.data);
      }

      // Add Result as New Layer
      const newLayer: Layer = {
          id: `layer-${Date.now()}`,
          type: 'IMAGE',
          name: `${activeTool === EditorTool.RemoveBg ? 'No Background' : activeTool} Result`,
          data: result,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal'
      };
      
      // Update History
      const newLayers = [...layers];
      // Hide original if BG removal to show transparency
      if (activeTool === EditorTool.RemoveBg) {
          const idx = newLayers.findIndex(l => l.id === activeLayerId);
          if (idx !== -1) newLayers[idx] = { ...newLayers[idx], visible: false };
      }
      newLayers.push(newLayer);
      
      setLayers(newLayers);
      setActiveLayerId(newLayer.id);
      
      // Auto-save
      const thumb = await createThumbnail(result);
      await saveProject(thumb, `Project ${new Date().toLocaleTimeString()}`);
      
      addNotification('SUCCESS', 'Processing complete!');
      setProcessing({ isProcessing: false, progress: 100, statusMessage: 'Done', tool: null });
      setMaskPaths([]); // Clear mask

    } catch (err: any) {
      addNotification('ERROR', err.message);
      setProcessing({ isProcessing: false, progress: 0, statusMessage: '', tool: null });
    }
  };

  const toggleLayerVisibility = (id: string) => {
      const newLayers = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
      setLayers(newLayers);
  };

  const handleDownload = async () => {
    const targetLayer = layers.find(l => l.visible && l.type === 'IMAGE'); // Naive export: topmost visible image
    if (!targetLayer) return;

    let url = targetLayer.data;
    if (user.plan === 'FREE') {
        url = await applyWatermark(url);
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina-export-${Date.now()}.png`;
    link.click();
    addNotification('INFO', 'Download started.');
  };

  if (layers.length === 0) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0F19] relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19] to-[#0B0F19]"></div>
              <div className="max-w-xl w-full text-center relative z-10 p-4">
                  <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-800/50 mb-6 border border-slate-700">
                    <ImagePlus size={32} className="text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">Create New Project</h2>
                  <p className="text-slate-400 mb-8">Start by uploading an image. Supports drag & drop.</p>
                  <Uploader onImageSelect={handleImageLoad} />
              </div>
          </div>
      );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F19] relative">
      
      {/* Top Toolbar */}
      <header className="h-14 bg-[#0F1420] border-b border-slate-800 flex items-center justify-between px-4 z-40 shrink-0 relative shadow-md">
         <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" onClick={() => setLayers([])} className="text-slate-400 hover:text-white px-2">
                 <ChevronLeft size={16} /> <span className="hidden sm:inline ml-1">Projects</span>
             </Button>
             
             <div className="h-5 w-px bg-slate-800"></div>

             <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} icon={<Undo2 size={16}/>} className="text-slate-400 px-2"/>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} icon={<Redo2 size={16}/>} className="text-slate-400 px-2"/>
             </div>

             <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>
             
             <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium ml-2">{layers.length} Layers</span>
                <span className="text-xs text-slate-500 font-medium">•</span>
                <span className="text-xs text-slate-500 font-medium">{activeLayer ? `${1024} x ${1024}px` : 'No Selection'}</span>
             </div>
         </div>

         <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
                 <button className="p-1.5 rounded text-indigo-400 bg-slate-700 shadow-sm"><MousePointer2 size={14}/></button>
                 <button className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50"><Crop size={14}/></button>
             </div>
             <Button size="sm" onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium">
                 <Download size={14}/> Export
             </Button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Toolbar - Updated: Removed overflow-y-auto so absolute tooltips can fly out */}
        <div className="w-16 bg-[#0F1420] border-r border-slate-800 flex flex-col items-center py-4 gap-3 z-50 shrink-0 relative shadow-[10px_0_20px_rgba(0,0,0,0.1)] overflow-visible">
           {[
             { id: EditorTool.Select, icon: <MousePointer2 size={20} />, label: 'Move' },
             { id: EditorTool.RemoveBg, icon: <Scissors size={20} />, label: 'Remove BG' },
             { id: EditorTool.ReplaceBg, icon: <Eraser size={20} />, label: 'Magic Eraser' },
             { id: EditorTool.MagicEdit, icon: <Wand2 size={20} />, label: 'Magic Edit' },
             { id: EditorTool.Upscale, icon: <Zap size={20} />, label: 'Upscale' },
             { id: EditorTool.Adjust, icon: <Sliders size={20} />, label: 'Adjust' },
           ].map(t => (
             <button
                key={t.id}
                onClick={() => setActiveTool(t.id as EditorTool)}
                className={`group relative p-3 rounded-xl transition-all duration-200 ${
                    activeTool === t.id 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
             >
                {t.icon}
                {/* TOOLTIP: Higher Z-Index and positioned to pop out */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[999] w-max">
                    <div className="bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-700 shadow-xl flex items-center gap-2">
                        {t.label}
                        {/* Triangle arrow */}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45"></div>
                    </div>
                </div>
             </button>
           ))}
        </div>

        {/* Main Canvas Area - Z-0 ensures it stays behind tooltips */}
        <div className="flex-1 relative bg-[#18181b] flex items-center justify-center overflow-hidden z-0">
            
            {/* Context Header (Dynamic) */}
            {(activeTool === EditorTool.MagicEdit || activeTool === EditorTool.ReplaceBg) && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
                    <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-wider">
                        {activeTool === EditorTool.MagicEdit ? 'Generative Fill' : 'Magic Eraser'}
                    </span>
                    <div className="h-4 w-px bg-slate-700"></div>
                    {activeTool === EditorTool.MagicEdit && (
                        <input 
                            type="text" 
                            className="bg-black/50 border border-slate-600 rounded-lg px-3 py-1.5 text-sm w-64 text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                            placeholder="Describe what to add/change..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    )}
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] text-slate-500">Brush</span>
                        <input 
                            type="range" 
                            min="10" max="100" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <Button size="sm" onClick={handleProcess} isLoading={processing.isProcessing}>
                        Generate
                    </Button>
                </div>
            )}
            
            {/* Simple Process Button for One-Click Tools */}
            {(activeTool === EditorTool.RemoveBg || activeTool === EditorTool.Upscale) && (
                 <div className="absolute bottom-8 z-40">
                     <Button size="lg" className="rounded-full px-8 shadow-xl shadow-indigo-500/20" onClick={handleProcess} isLoading={processing.isProcessing}>
                         {processing.isProcessing ? processing.statusMessage : `Run ${activeTool === EditorTool.RemoveBg ? 'Remove BG' : 'Upscale'}`}
                     </Button>
                 </div>
            )}

            <EditorCanvas 
                layers={layers}
                activeLayerId={activeLayerId}
                tool={activeTool}
                brushSize={brushSize}
                adjustments={adjustments}
                onMaskChange={setMaskPaths}
                maskPaths={maskPaths}
            />
            
            {/* Loading Overlay */}
            {processing.isProcessing && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                            <Zap className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={24}/>
                        </div>
                        <div className="text-center">
                            <h3 className="text-white font-bold text-lg mb-1">{processing.statusMessage}</h3>
                            <p className="text-slate-400 text-sm">AI is working its magic...</p>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${processing.progress}%` }}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Right Sidebar (Layers & Adjustments) */}
        <LayerPanel 
            layers={layers} 
            activeId={activeLayerId} 
            onToggleVisible={toggleLayerVisibility} 
            onSelect={setActiveLayerId}
        />
        
      </div>
    </div>
  );
};

// --- MAIN APP ENTRY ---

const AppContent = () => {
  const { user, loginWithGoogle, logout, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'EDITOR' | 'API' | 'PROFILE' | 'ADMIN' | 'GALLERY'>('EDITOR');
  const [showPricing, setShowPricing] = useState(false);
  const [globalCount, setGlobalCount] = useState<number | null>(null);

  useEffect(() => {
    // FETCH REAL STATS: Get total count of all projects from the database
    // This provides a "Real" number of images processed by users.
    const fetchGlobalStats = async () => {
        try {
            const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
            if (count !== null) {
                setGlobalCount(count);
            } else {
                setGlobalCount(0);
            }
        } catch (e) {
            console.error("Failed to fetch global stats:", e);
        }
    };
    fetchGlobalStats();
  }, []);

  if (isLoading) return <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div><span className="text-slate-400 text-sm tracking-wider">CONNECTING TO STUDIO...</span></div>;

  if (!user) {
    return (
      <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center relative overflow-hidden font-inter selection:bg-indigo-500/30">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
          <div className="w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] absolute -top-40 -left-20 animate-pulse"></div>
          
          <div className="z-10 text-center space-y-8 p-6 relative max-w-3xl">
              <div className="inline-flex items-center gap-2 p-2 px-4 rounded-full bg-slate-800/50 border border-slate-700 mb-4 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-medium text-slate-300">Lumina Studio v2.0 Live</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                Create like a <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Pro Artist</span>
              </h1>
              
              <p className="text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
                The all-in-one AI creative suite. Remove backgrounds, magic erase, upscale, and design in seconds.
              </p>
              
              <div className="flex items-center justify-center gap-4 pt-4">
                  <Button size="lg" onClick={loginWithGoogle} className="h-14 px-8 text-lg bg-white text-black hover:bg-slate-200 font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                      Start Creating for Free
                  </Button>
              </div>
              
              <div className="mt-12 grid grid-cols-3 gap-8 text-center border-t border-slate-800/50 pt-8">
                  {/* REAL TIME DB STATS */}
                  <div>
                      <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                          {globalCount !== null ? globalCount.toLocaleString() : '-'} 
                          {globalCount !== null && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live"></span>}
                      </h3>
                      <p className="text-sm text-slate-500">Total Images Processed</p>
                  </div>
                  <div><h3 className="text-2xl font-bold text-white">0.5s</h3><p className="text-sm text-slate-500">Avg. Response Time</p></div>
                  <div><h3 className="text-2xl font-bold text-white">4.9/5</h3><p className="text-sm text-slate-500">User Rating</p></div>
              </div>
          </div>
      </div>
    );
  }

  const handleViewChange = (view: any) => {
      // Simulate Admin Access for demo purposes if the role isn't officially set
      if (view === 'ADMIN' && user.role !== 'ADMIN') {
           if(window.confirm("Simulate Admin Access for Demo?")) {
               setCurrentView(view);
               return;
           }
           alert("Access Denied: You need Admin privileges.");
           return;
      }
      setCurrentView(view);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] font-inter text-slate-200">
      <ToastNotification />
      {showPricing && <Pricing onClose={() => setShowPricing(false)} />}
      
      {/* Sidebar with higher z-index to sit above canvas if needed */}
      <div className="z-50 shrink-0 h-full relative">
        <Sidebar 
          currentView={currentView} 
          onChangeView={handleViewChange} 
          onLogout={logout} 
          userEmail={user.email} 
          planType={user.plan}
          userRole={user.role}
        />
      </div>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        {currentView === 'EDITOR' && <EditorLayout user={user} onShowPricing={() => setShowPricing(true)} />}
        {currentView === 'ADMIN' && <AdminDashboard />}
        {currentView === 'GALLERY' && <Gallery />}
        {currentView === 'PROFILE' && <ProfileSettings />}
        {currentView === 'API' && <DeveloperApi />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
