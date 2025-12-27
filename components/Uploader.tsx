import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';

interface UploaderProps {
  onImageSelect: (base64: string) => void;
  className?: string;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect, className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        // Small delay to show the preview state before passing it up (simulation of "processing/preparing")
        setTimeout(() => {
            onImageSelect(result);
        }, 800);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Reset preview if component unmounts or parent clears it (optional logic)
  useEffect(() => {
    return () => setPreview(null);
  }, []);

  if (preview) {
     return (
        <div className="w-full h-80 rounded-2xl border-2 border-indigo-500/50 bg-slate-900/50 relative overflow-hidden flex flex-col items-center justify-center p-4">
             <div className="absolute inset-0 z-0">
                 <img src={preview} alt="Preview" className="w-full h-full object-contain opacity-50 blur-xl scale-110" />
             </div>
             <img src={preview} alt="Preview" className="relative z-10 max-h-48 rounded-lg shadow-2xl mb-4" />
             <div className="relative z-10 flex items-center gap-2">
                 <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                 <span className="text-white font-medium text-sm">Analyzing image...</span>
             </div>
        </div>
     );
  }

  return (
    <div 
      className={`group relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
        isDragging 
          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' 
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800/80'
      } ${className}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="mx-auto w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-700 group-hover:scale-110 transition-transform duration-300">
        <svg className={`w-10 h-10 ${isDragging ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <h3 className="text-2xl font-semibold mb-2 text-white">Upload an image</h3>
      <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm sm:text-base">
        Drag & drop anywhere or click to browse. <br/>
        <span className="text-slate-500 text-xs mt-2 block">Supports PNG, JPG, WebP up to 10MB</span>
      </p>
      
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        className="hidden" 
        accept="image/*" 
      />
      
      <Button 
        onClick={() => inputRef.current?.click()} 
        size="lg"
        className="shadow-indigo-500/20 relative z-10"
      >
        Select Photo
      </Button>
    </div>
  );
};