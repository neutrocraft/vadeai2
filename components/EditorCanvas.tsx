import React, { useRef, useEffect, useState } from 'react';

interface EditorCanvasProps {
  imageSrc: string;
  mode: 'VIEW' | 'BRUSH';
  brushSize?: number;
  onMaskChange?: (paths: { x: number, y: number }[][]) => void;
  onDimensionsCalculated?: (dims: { width: number, height: number, scale: number, offsetX: number, offsetY: number }) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ 
  imageSrc, 
  mode, 
  brushSize = 40,
  onMaskChange,
  onDimensionsCalculated
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // These store the drawing paths in "Image Coordinates" (not screen coordinates)
  const [paths, setPaths] = useState<{ x: number, y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
  
  // Store layout metrics to map mouse events to image pixels
  const [layout, setLayout] = useState({ scale: 1, offsetX: 0, offsetY: 0, drawWidth: 0, drawHeight: 0 });

  // 1. Initial Render & Resize Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Container dimensions
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      // Calculate "contain" fit
      const scale = Math.min(cw / img.width, ch / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      
      // Center the image
      const offsetX = (cw - drawWidth) / 2;
      const offsetY = (ch - drawHeight) / 2;

      // Update canvas resolution to match container (crisp rendering)
      canvas.width = cw;
      canvas.height = ch;

      const newLayout = { scale, offsetX, offsetY, drawWidth, drawHeight };
      setLayout(newLayout);
      if (onDimensionsCalculated) {
          onDimensionsCalculated({ width: img.width, height: img.height, ...newLayout });
      }

      // Draw immediately
      renderCanvas(canvas, img, newLayout, paths, currentPath);
    };
  }, [imageSrc, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);

  // 2. Render Loop (updates on path changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.scale === 0) return;

    const img = new Image();
    img.src = imageSrc;
    // We assume image is loaded since we calculated layout from it, 
    // but in a real app might need to cache the image object to avoid reload flicker.
    // For this implementation, browser cache usually handles it fast enough.
    img.onload = () => renderCanvas(canvas, img, layout, paths, currentPath);
    if (img.complete) renderCanvas(canvas, img, layout, paths, currentPath);

  }, [paths, currentPath, layout, imageSrc]);

  const renderCanvas = (
    canvas: HTMLCanvasElement, 
    img: HTMLImageElement, 
    layout: any, 
    savedPaths: any[], 
    activePath: any[]
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Image (Centered & Scaled)
    ctx.drawImage(img, layout.offsetX, layout.offsetY, layout.drawWidth, layout.drawHeight);

    // Draw Mask
    // CRITICAL: We need to scale the brush strokes visually to match the image scale
    if (savedPaths.length > 0 || activePath.length > 0) {
        ctx.save();
        ctx.beginPath();
        // Clip to image area so we don't draw on the background
        ctx.rect(layout.offsetX, layout.offsetY, layout.drawWidth, layout.drawHeight);
        ctx.clip();

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize * layout.scale; // Scale brush size visually
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)'; // Red mask

        [...savedPaths, activePath].forEach(path => {
            if (path.length < 1) return;
            ctx.beginPath();
            // Transform Image Coordinates -> Screen Coordinates
            const startX = (path[0].x * layout.scale) + layout.offsetX;
            const startY = (path[0].y * layout.scale) + layout.offsetY;
            ctx.moveTo(startX, startY);

            for (let i = 1; i < path.length; i++) {
                const px = (path[i].x * layout.scale) + layout.offsetX;
                const py = (path[i].y * layout.scale) + layout.offsetY;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        });
        ctx.restore();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Screen Coords relative to Canvas
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Map to Image Coords
    // (ScreenX - OffsetX) / Scale = ImageX
    const imageX = (screenX - layout.offsetX) / layout.scale;
    const imageY = (screenY - layout.offsetY) / layout.scale;

    return { x: imageX, y: imageY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'BRUSH') return;
    setIsDrawing(true);
    const coords = getCoordinates(e);
    if(coords) setCurrentPath([coords]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'BRUSH') return;
    const coords = getCoordinates(e);
    if(coords) setCurrentPath(prev => [...prev, coords]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const newPaths = [...paths, currentPath];
    setPaths(newPaths);
    setCurrentPath([]);
    if (onMaskChange) onMaskChange(newPaths);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900 rounded-lg">
       <canvas 
         ref={canvasRef}
         onMouseDown={startDrawing}
         onMouseMove={draw}
         onMouseUp={stopDrawing}
         onMouseLeave={stopDrawing}
         onTouchStart={startDrawing}
         onTouchMove={draw}
         onTouchEnd={stopDrawing}
         className={`block touch-none ${mode === 'BRUSH' ? 'cursor-crosshair' : 'cursor-default'}`}
       />
       {mode === 'BRUSH' && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium border border-white/10 pointer-events-none select-none">
           🖌️ Paint Mask
         </div>
       )}
    </div>
  );
};