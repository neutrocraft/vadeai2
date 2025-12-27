
import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff, Terminal } from 'lucide-react';
import { Button } from './Button';

export const DeveloperApi: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const [showKey, setShowKey] = useState(false);
    
    // Mock API Key
    const apiKey = "lum_live_98a7s8d76f5g4h3j2k1l0mnbvcxz";

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex-1 bg-[#0B0F19] p-8 overflow-y-auto h-full text-slate-200">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Developer API</h1>
                    <p className="text-slate-400">Integrate Lumina AI directly into your applications.</p>
                </div>

                {/* API Key Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4">Your API Keys</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg h-12 flex items-center px-4 font-mono text-sm text-slate-300 relative group">
                            {showKey ? apiKey : 'lum_live_••••••••••••••••••••••••'}
                            <div className="absolute right-2 flex gap-2">
                                <button onClick={() => setShowKey(!showKey)} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">
                                    {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                                <button onClick={handleCopy} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white">
                                    {copied ? <Check size={16} className="text-emerald-400"/> : <Copy size={16}/>}
                                </button>
                            </div>
                        </div>
                        <Button>Roll Key</Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
                        <ShieldIcon /> Never share your secret key with client-side code.
                    </p>
                </div>

                {/* Documentation / Snippets */}
                <div className="space-y-4">
                    <h3 className="font-bold text-white">Quick Start</h3>
                    <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-800">
                        <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-black/20">
                            <div className="flex gap-1.5 mr-4">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">example.py</span>
                        </div>
                        <div className="p-4 font-mono text-sm overflow-x-auto text-blue-100">
<pre>{`import requests

url = "https://api.lumina.ai/v1/remove-bg"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
data = {
    "image_url": "https://example.com/photo.jpg"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())`}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ShieldIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
);
