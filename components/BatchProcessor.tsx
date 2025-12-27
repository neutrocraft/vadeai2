
import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { processBatchItem } from '../services/geminiService';
import { BatchItem } from '../types';
import { createThumbnail } from '../utils/imageUtils';
import { useAuth } from '../contexts/AuthContext';

export const BatchProcessor: React.FC = () => {
    const [items, setItems] = useState<BatchItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { deductCredit } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newItems: BatchItem[] = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                preview: URL.createObjectURL(file),
                status: 'PENDING'
            }));
            setItems(prev => [...prev, ...newItems]);
        }
    };

    const startBatch = async () => {
        setIsProcessing(true);
        // Process sequentially to avoid heavy rate limiting
        for (let i = 0; i < items.length; i++) {
            if (items[i].status === 'COMPLETED') continue;

            const hasCredit = await deductCredit();
            if (!hasCredit) {
                alert("Out of credits!");
                break;
            }

            setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'PROCESSING' } : item));

            try {
                const result = await processBatchItem({ file: items[i].file, id: items[i].id }, 'REMOVE_BG');
                setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'COMPLETED', result } : item));
            } catch (err) {
                setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'FAILED' } : item));
            }
        }
        setIsProcessing(false);
    };

    const downloadAll = () => {
        items.forEach(item => {
            if (item.result) {
                const link = document.createElement('a');
                link.href = item.result;
                link.download = `processed-${item.file.name}.png`;
                link.click();
            }
        });
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-[#0B0F19] text-white">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Batch Processing</h1>
                        <p className="text-slate-400">Process multiple images automatically. Ideal for e-commerce.</p>
                    </div>
                    <div className="flex gap-3">
                         <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFiles} />
                         <Button onClick={() => fileInputRef.current?.click()} variant="secondary">Add Images</Button>
                         <Button onClick={startBatch} disabled={items.length === 0 || isProcessing} isLoading={isProcessing}>
                            {isProcessing ? 'Processing Queue...' : 'Start Batch'}
                         </Button>
                         {items.some(i => i.status === 'COMPLETED') && (
                             <Button onClick={downloadAll} variant="primary">Download All</Button>
                         )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                        <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex gap-4 items-center relative overflow-hidden">
                            <img src={item.result || item.preview} className="w-20 h-20 object-cover rounded bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate mb-1">{item.file.name}</p>
                                <div className="text-xs">
                                    {item.status === 'PENDING' && <span className="text-slate-500">Queued</span>}
                                    {item.status === 'PROCESSING' && <span className="text-indigo-400 animate-pulse">Processing...</span>}
                                    {item.status === 'COMPLETED' && <span className="text-green-400">Ready</span>}
                                    {item.status === 'FAILED' && <span className="text-red-400">Failed</span>}
                                </div>
                            </div>
                            {item.status === 'PROCESSING' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/30">
                                    <div className="h-full bg-indigo-500 animate-progress"></div>
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="col-span-full h-64 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
                            Upload images to begin batch processing.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
