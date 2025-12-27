export enum EditorTool {
  RemoveBg = 'REMOVE_BG',
  ReplaceBg = 'REPLACE_BG', // Magic Eraser
  MagicEdit = 'MAGIC_EDIT', // Generative Fill
}

export type PlanType = 'FREE' | 'PRO' | 'BUSINESS';

export interface UserProfile {
  id: string; // UUID from Supabase
  email: string;
  full_name: string;
  avatar_url: string;
  plan: PlanType;
  credits: number;
}

export interface Project {
  id: string;
  user_id: string;
  thumbnail_url: string; // Base64 or URL
  name: string;
  created_at: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number; // 0 to 100
  statusMessage: string;
}

export interface ImageState {
  original: string | null; // Base64
  processed: string | null; // Base64
  history: string[];
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: string;
  description: string;
  features: { name: string; included: boolean }[];
  buttonText: string;
  popular?: boolean;
}
