
import React from 'react';
import { Button } from './Button';
import { SubscriptionPlan, PlanType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Zap } from 'lucide-react';

const PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'Essential tools for quick edits.',
    buttonText: 'Start Free',
    features: [
      { name: '5 Credits / Day', included: true },
      { name: 'Standard Quality (1080p)', included: true },
      { name: 'Basic Remove BG', included: true },
      { name: 'Watermarked Results', included: true },
      { name: 'Batch Processing', included: false },
    ]
  },
  {
    id: 'PRO',
    name: 'Pro Studio',
    price: '$29',
    period: 'per month',
    description: 'For creators & professionals.',
    buttonText: 'Upgrade to Pro',
    popular: true,
    features: [
      { name: '500 Credits / Month', included: true },
      { name: 'Ultra HD (4K)', included: true },
      { name: 'Advanced Magic Edit & Eraser', included: true },
      { name: 'No Watermark', included: true },
      { name: 'Batch Processing', included: true },
    ]
  },
];

interface PricingProps {
  onClose: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onClose }) => {
  const { user, upgradePlan } = useAuth();

  const handleUpgrade = async (planId: PlanType) => {
    const btn = document.getElementById(`btn-${planId}`) as HTMLButtonElement;
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;
        
        setTimeout(async () => {
            await upgradePlan(planId);
            onClose();
        }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-[#0B0F19] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors z-20">
            <X size={24} />
        </button>
        
        <div className="p-8 md:p-12 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 mb-4 border border-indigo-500/20">
              <Zap className="text-indigo-400" size={32} />
          </div>
          <h2 className="text-4xl font-bold text-white mb-3">Upgrade your Workspace</h2>
          <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
            Unlock the full potential of Lumina AI with Pro features, higher resolution, and unlimited possibilities.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto">
            {PLANS.map((plan) => {
              const isCurrent = user?.plan === plan.id;
              const isPro = plan.id === 'PRO';
              
              return (
                <div 
                  key={plan.id} 
                  className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                    isPro
                      ? 'bg-gradient-to-b from-slate-900 to-indigo-950/30 border-indigo-500 shadow-2xl shadow-indigo-900/20 transform hover:-translate-y-1' 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                          <Zap size={12} fill="currentColor" /> Most Popular
                      </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white tracking-tight">{plan.price}</span>
                      <span className="text-slate-500 font-medium text-sm">{plan.period}</span>
                    </div>
                    <p className="text-slate-400 text-sm mt-3 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="h-px bg-slate-800/50 mb-6"></div>

                  <ul className="flex-1 space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${feature.included ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                            {feature.included ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                        </div>
                        <span className={feature.included ? 'text-slate-200' : 'text-slate-500 line-through decoration-slate-600'}>{feature.name}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    id={`btn-${plan.id}`}
                    variant={isPro ? 'primary' : 'secondary'} 
                    size="lg"
                    className={`w-full font-bold ${isPro ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? 'Current Plan' : plan.buttonText}
                  </Button>
                </div>
              );
            })}
          </div>
          
          <p className="text-slate-500 text-xs mt-8">
            Secured by Stripe. Cancel anytime. 14-day money-back guarantee.
          </p>
        </div>
      </div>
    </div>
  );
};
