
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, Move, Hand } from 'lucide-react';
import { ImageAdjustments, Layer } from '../types';

interface EditorCanvasProps {
  layers: Layer[];
  activeLayerId: string | null;
  tool: string;
  brushSize?: number;
  adjustments: ImageAdjustments;
  onMaskChange: (paths: { x: number, y: number }[][]) => void;
  maskPaths: { x: number, y: number }[][];
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ 
  layers, 
  activeLayerId,
  tool, 
  brushSize = 40,
  adjustments,
  onMaskChange,
  maskPaths
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Transform State
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 }); // k=zoom, x/y=pan
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);

  // Initialize View (Fit to Screen)
  useEffect(() => {
    const bgLayer = layers.find(l => l.type === 'IMAGE');
    if (bgLayer && containerRef.current && transform.k === 1 && transform.x === 0) {
      const img = new Image();
      img.src = bgLayer.data;
      img.onload = () => {
        if (!containerRef.current) return;
        const { clientWidth: cw, clientHeight: ch } = containerRef.current;
        const scale = Math.min((cw - 100) / img.width, (ch - 100) / img.height);
        const x = (cw - img.width * scale) / 2;
        const y = (ch - img.height * scale) / 2;
        setTransform({ k: scale, x, y });
      };
    }
  }, [layers]); // Run when layers change, but check if transform is default

  // Rendering Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !containerRef.current) return;

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Resize logic
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Checkerboard Background
    drawCheckerboard(ctx, rect.width, rect.height);

    // Apply Transformation (Zoom/Pan)
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw Layers
    [...layers].reverse().forEach(layer => {
        if (!layer.visible) return;

        if (layer.type === 'IMAGE') {
            const img = new Image();
            img.src = layer.data;
            if (img.complete) {
                ctx.save();
                ctx.globalAlpha = layer.opacity;
                // Apply Image Adjustments globally (simplified for demo)
                // In a real app, adjustments might be layer-specific filters
                if (layer.id === activeLayerId) {
                   ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`;
                }
                ctx.drawImage(img, 0, 0);
                ctx.restore();
            }
        }
    });

    // Draw Mask Overlay
    if (maskPaths.length > 0 || currentPath.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Calculate dynamic line width based on zoom to keep brush constant relative to image
        ctx.lineWidth = brushSize; 
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Red semi-transparent
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';

        [...maskPaths, currentPath].forEach(path => {
            if (path.length < 1) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
        ctx.restore();
    }
  }, [layers, transform, maskPaths, currentPath, adjustments, activeLayerId, brushSize]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      render();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [render]);

  // Utils
  const drawCheckerboard = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const size = 20;
    ctx.fillStyle = '#1e293b'; // Slate 800
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a'; // Slate 900
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if ((x / size + y / size) % 2 === 0) ctx.fillRect(x, y, size, size);
      }
    }
  };

  const getImgCoordinates = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - transform.x) / transform.k;
    const y = (clientY - rect.top - transform.y) / transform.k;
    return { x, y };
  };

  // Event Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const newZoom = Math.max(0.1, Math.min(5, transform.k - e.deltaY * zoomSensitivity));
        
        // Zoom towards mouse pointer logic could go here, staying simple for now
        setTransform(prev => ({ ...prev, k: newZoom }));
    } else {
        // Pan
        setTransform(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click or Space+Click (simulated by tool)
    if (e.button === 1 || tool === 'SELECT') {
        setIsPanning(true);
        setLastPos({ x: e.clientX, y: e.clientY });
        return;
    }
    
    if (tool === 'MAGIC_EDIT' || tool === 'REPLACE_BG') {
        setIsDrawing(true);
        const coords = getImgCoordinates(e.clientX, e.clientY);
        setCurrentPath([coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastPos({ x: e.clientX, y: e.clientY });
        return;
    }

    if (isDrawing) {
        const coords = getImgCoordinates(e.clientX, e.clientY);
        setCurrentPath(prev => [...prev, coords]);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (isDrawing) {
        setIsDrawing(false);
        if (currentPath.length > 0) {
            onMaskChange([...maskPaths, currentPath]);
        }
        setCurrentPath([]);
    }
  };

  return (
    <div 
        ref={containerRef} 
        className={`w-full h-full relative overflow-hidden bg-slate-950 select-none ${tool === 'SELECT' ? 'cursor-grab' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block" />
      
      {/* HUD Info */}
      <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none">
          {Math.round(transform.k * 100)}% Zoom
      </div>
      
      {/* Quick Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
         <button onClick={() => setTransform({k: 1, x: 0, y: 0})} className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-lg border border-slate-700">
             <Maximize size={16} />
         </button>
      </div>
    </div>
  );
};
