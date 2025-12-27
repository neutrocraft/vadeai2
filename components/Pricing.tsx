import React from 'react';
import { Button } from './Button';
import { SubscriptionPlan, PlanType } from '../types';
import { useAuth } from '../contexts/AuthContext';

const PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Starter',
    price: '$0',
    description: 'Perfect for hobbyists.',
    buttonText: 'Current Plan',
    features: [
      { name: '5 Credits / Day', included: true },
      { name: 'Standard Quality (1080p)', included: true },
      { name: 'Basic Background Removal', included: true },
      { name: 'Watermarked Results', included: true },
    ]
  },
  {
    id: 'PRO',
    name: 'Pro Studio',
    price: '$29',
    description: 'For creators and businesses.',
    buttonText: 'Upgrade to Pro',
    popular: true,
    features: [
      { name: '500 Credits / Month', included: true },
      { name: 'HD Quality (4K)', included: true },
      { name: 'Advanced Magic Edit', included: true },
      { name: 'No Watermark', included: true },
    ]
  },
];

interface PricingProps {
  onClose: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onClose }) => {
  const { user, upgradePlan } = useAuth();

  const handleUpgrade = (planId: PlanType) => {
    upgradePlan(planId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        
        <div className="p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Upgrade your Workspace</h2>
          <p className="text-slate-400 mb-8">Get professional features and higher limits.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
            {PLANS.map((plan) => {
              const isCurrent = user?.plan === plan.id;
              return (
                <div 
                  key={plan.id} 
                  className={`relative flex flex-col p-6 rounded-2xl border ${
                    plan.popular 
                      ? 'bg-slate-800/50 border-indigo-500 shadow-xl shadow-indigo-900/20' 
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Most Popular</div>}
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{plan.price}</span>
                      <span className="text-slate-500 text-sm">/mo</span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <span className={feature.included ? 'text-indigo-400' : 'text-slate-700'}>✓</span>
                        <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>{feature.name}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant={plan.popular ? 'primary' : 'secondary'} 
                    className="w-full"
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? 'Current Plan' : plan.buttonText}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
