import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Uploader } from './components/Uploader';
import { EditorCanvas } from './components/EditorCanvas';
import { ComparisonSlider } from './components/ComparisonSlider';
import { Button } from './components/Button';
import { Pricing } from './components/Pricing';
import { Dashboard } from './components/Dashboard';
import { EditorTool, ImageState, ProcessingState } from './types';
import { processImageWithGemini, removeBackground } from './services/geminiService';
import { autoCenterImage, generateMaskFromCanvas, applyWatermark, createThumbnail } from './utils/imageUtils';

const TOOLS = [
  { id: EditorTool.RemoveBg, label: 'Remove BG', icon: '✂️', desc: 'Auto-remove & Center' },
  { id: EditorTool.ReplaceBg, label: 'Eraser', icon: '🧼', desc: 'Remove Object' }, 
  { id: EditorTool.MagicEdit, label: 'Magic Edit', icon: '✨', desc: 'Generative Fill' },
];

const EditorLayout = ({ 
  user, 
  onLogout,
  onShowPricing 
}: { 
  user: any, 
  onLogout: () => void,
  onShowPricing: () => void
}) => {
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    processed: null,
    history: []
  });

  const [activeTool, setActiveTool] = useState<EditorTool>(EditorTool.RemoveBg);
  const [viewMode, setViewMode] = useState<'EDIT' | 'COMPARE'>('EDIT');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    statusMessage: ''
  });
  
  const [maskPaths, setMaskPaths] = useState<{ x: number, y: number }[][]>([]);
  const [imageDims, setImageDims] = useState<{ width: number, height: number } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { deductCredit, saveProject } = useAuth();

  useEffect(() => {
    setMaskPaths([]);
    setPrompt('');
    setError(null);
  }, [activeTool]);

  const handleImageSelect = (base64: string) => {
    setImageState({ original: base64, processed: null, history: [base64] });
    setError(null);
    setViewMode('EDIT');
    setActiveTool(EditorTool.RemoveBg);
  };

  const handleProcess = async () => {
    if (!imageState.original) return;
    setError(null);
    
    // Auth & Credit Check
    const hasCredit = await deductCredit();
    if (!hasCredit) {
        onShowPricing();
        return;
    }

    if (!process.env.API_KEY) {
      setError("System Config Error: API Key missing.");
      return;
    }

    setProcessing({ isProcessing: true, progress: 10, statusMessage: 'Initializing AI...' });

    try {
      let result = '';
      let actionName = '';

      if (activeTool === EditorTool.RemoveBg) {
        actionName = 'Remove BG';
        setProcessing({ isProcessing: true, progress: 30, statusMessage: 'Detecting subject...' });
        const rawResult = await removeBackground(imageState.original);
        setProcessing({ isProcessing: true, progress: 70, statusMessage: 'Auto-centering...' });
        result = await autoCenterImage(rawResult);
      } 
      else if (activeTool === EditorTool.ReplaceBg) {
        actionName = 'Eraser';
        if (maskPaths.length === 0) throw new Error("Select an object to erase first.");
        if (!imageDims) throw new Error("Canvas not ready.");

        setProcessing({ isProcessing: true, progress: 30, statusMessage: 'Processing mask...' });
        const maskBase64 = generateMaskFromCanvas(imageDims.width, imageDims.height, maskPaths);
        
        setProcessing({ isProcessing: true, progress: 60, statusMessage: 'Inpainting...' });
        result = await processImageWithGemini(
            imageState.original, 
            "", 
            maskBase64, 
            'ERASER'
        );
      }
      else if (activeTool === EditorTool.MagicEdit) {
        actionName = 'Magic Edit';
        if (!prompt) throw new Error("Enter a prompt describing the change.");
        
        let maskBase64 = undefined;
        let mode: 'EDIT' = 'EDIT';

        if (maskPaths.length > 0 && imageDims) {
           setProcessing({ isProcessing: true, progress: 30, statusMessage: 'Analyzing selection...' });
           maskBase64 = generateMaskFromCanvas(imageDims.width, imageDims.height, maskPaths);
        }
        
        setProcessing({ isProcessing: true, progress: 50, statusMessage: 'Generating...' });
        result = await processImageWithGemini(
            imageState.original, 
            prompt, 
            maskBase64, 
            mode
        );
      } 

      setImageState(prev => ({
        ...prev,
        processed: result,
        history: [...prev.history, result]
      }));
      
      const thumbnail = await createThumbnail(result);
      await saveProject(thumbnail, `${actionName} Project`);

      setViewMode('COMPARE');
      setProcessing({ isProcessing: false, progress: 100, statusMessage: 'Complete' });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Processing failed.");
      setProcessing({ isProcessing: false, progress: 0, statusMessage: '' });
    }
  };

  const handleDownload = async () => {
      const targetImage = imageState.processed || imageState.original!;
      let finalUrl = targetImage;
      if (user.plan === 'FREE') {
          finalUrl = await applyWatermark(targetImage);
      }
      const link = document.createElement('a');
      link.href = finalUrl;
      link.download = `lumina-export-${Date.now()}.png`;
      link.click();
  };

  if (!imageState.original) {
    return (
        <div className="h-screen flex flex-col items-center justify-center p-8 bg-[#0B0F19]">
            <h2 className="text-2xl font-bold text-white mb-8">Start a New Project</h2>
            <div className="w-full max-w-2xl h-[400px]">
                <Uploader onImageSelect={handleImageSelect} />
            </div>
            <Button variant="ghost" className="mt-8" onClick={onLogout}>← Back to Dashboard</Button>
        </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F19] text-slate-200 overflow-hidden font-inter">
      <header className="h-16 border-b border-slate-800/60 bg-[#0B0F19] flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setImageState({ original: null, processed: null, history: [] })}>
             ← Projects
          </Button>
          <div className="h-6 w-px bg-slate-800 mx-2 hidden sm:block"></div>
          <span className="text-sm font-semibold text-slate-200">Untitled Project</span>
        </div>
        <div className="bg-slate-900/50 p-1 rounded-lg border border-slate-800 flex gap-1">
          <button 
            onClick={() => setViewMode('EDIT')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'EDIT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Editor
          </button>
          <button 
            onClick={() => setViewMode('COMPARE')}
            disabled={!imageState.processed}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'COMPARE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}
          >
            Compare
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 mr-2">
            <span className={user.credits <= 0 ? 'text-red-400 font-bold' : 'text-indigo-400'}>{user.credits} credits</span>
          </div>
          <Button size="sm" onClick={handleDownload} className="bg-white text-slate-950 hover:bg-slate-200 font-semibold">
            Download {user.plan === 'FREE' ? '(Watermarked)' : 'HD'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-20 bg-[#0F1420] border-r border-slate-800/60 flex flex-col items-center py-6 gap-4 z-20 shrink-0">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setPrompt(''); setViewMode('EDIT'); }}
              className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                activeTool === tool.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-xl">{tool.icon}</span>
              <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-slate-700 font-medium ml-2 shadow-xl">
                {tool.label}
              </div>
            </button>
          ))}
        </aside>

        <section className="flex-1 relative bg-[#0B0F19] flex flex-col">
          {processing.isProcessing && (
             <div className="absolute inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md flex flex-col items-center justify-center">
               <div className="w-64 bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
                 <div className="bg-indigo-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${processing.progress}%` }}></div>
               </div>
               <p className="text-white font-medium animate-pulse text-lg tracking-wide">{processing.statusMessage}</p>
             </div>
          )}

          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-[#0F1420]">
            <div className="relative shadow-2xl shadow-black border border-slate-800/50 rounded-lg overflow-hidden w-full h-full max-w-6xl flex items-center justify-center">
              {viewMode === 'COMPARE' && imageState.processed ? (
                <ComparisonSlider beforeImage={imageState.original!} afterImage={imageState.processed} />
              ) : (
                <EditorCanvas 
                  imageSrc={imageState.original!} 
                  mode={(activeTool === EditorTool.ReplaceBg || activeTool === EditorTool.MagicEdit) ? 'BRUSH' : 'VIEW'} 
                  onMaskChange={setMaskPaths}
                  onDimensionsCalculated={(dims) => setImageDims({ width: dims.width, height: dims.height })}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="w-80 bg-[#0F1420] border-l border-slate-800/60 p-6 flex flex-col shrink-0 z-20">
          <div className="mb-6 border-b border-slate-800/60 pb-6">
            <h2 className="text-white font-semibold text-lg mb-1">
              {TOOLS.find(t => t.id === activeTool)?.label}
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              {TOOLS.find(t => t.id === activeTool)?.desc}
            </p>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto">
             {activeTool === EditorTool.RemoveBg && (
                <div className="text-sm text-slate-300 bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20">
                    Auto-remove is ready.
                </div>
             )}
             
             {activeTool === EditorTool.ReplaceBg && (
                 <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <p className="text-xs text-slate-400">Brush over the object to remove. No prompt needed.</p>
                 </div>
             )}

             {activeTool === EditorTool.MagicEdit && (
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Prompt</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the change..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white h-24"
                    />
                 </div>
             )}

             {error && <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded">{error}</div>}
          </div>

          <Button 
            onClick={handleProcess} 
            size="lg" 
            isLoading={processing.isProcessing}
            disabled={(activeTool === EditorTool.ReplaceBg && maskPaths.length === 0)}
            className="w-full"
          >
            {activeTool === EditorTool.RemoveBg ? 'Remove Background' : 'Generate'} (1 Credit)
          </Button>
        </aside>
      </div>
    </div>
  );
};

// --- MAIN APP SHELL ---
const AppContent = () => {
  const { user, loginWithGoogle, isLoading } = useAuth();
  const [view, setView] = useState<'DASHBOARD' | 'EDITOR'>('DASHBOARD');
  const [showPricing, setShowPricing] = useState(false);
  
  // Safe env access
  const env = (import.meta.env || {}) as any;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (isLoading) {
    const hasHash = window.location.hash.includes('access_token');
    return (
      <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white font-inter">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-400 animate-pulse font-medium tracking-wide">
            {hasHash ? "Authenticating securely..." : "Loading Workspace..."}
        </p>
      </div>
    );
  }

  // Unauthenticated State
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-center p-4">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
            <span className="text-3xl text-white font-bold">V</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Vade AI Studio</h1>
        <p className="text-slate-400 text-xl max-w-lg mb-8">Professional image editing. Real AI. No gimmicks.</p>
        
        {!anonKey && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200 text-sm max-w-md mx-auto">
                <strong>Config Warning:</strong> Supabase Anon Key is missing. 
                <br/>Please set VITE_SUPABASE_ANON_KEY in your .env file.
            </div>
        )}

        <Button size="lg" onClick={loginWithGoogle} className="px-8 py-4 text-lg shadow-indigo-500/40">
           Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <>
      {showPricing && <Pricing onClose={() => setShowPricing(false)} />}
      {view === 'DASHBOARD' ? (
        <Dashboard onNewProject={() => setView('EDITOR')} />
      ) : (
        <EditorLayout 
          user={user} 
          onLogout={() => setView('DASHBOARD')} 
          onShowPricing={() => setShowPricing(true)}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}