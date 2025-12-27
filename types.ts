
export enum EditorTool {
  Select = 'SELECT',
  RemoveBg = 'REMOVE_BG',
  ReplaceBg = 'REPLACE_BG', // Eraser
  MagicEdit = 'MAGIC_EDIT', // Generative Fill
  Upscale = 'UPSCALE',
  Adjust = 'ADJUST',
}

export type PlanType = 'FREE' | 'PRO' | 'BUSINESS';
export type UserRole = 'USER' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  plan: PlanType;
  role: UserRole;
  credits: number;
  organization_id?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  user_id: string;
  thumbnail_url: string;
  name: string;
  created_at: string;
  updated_at?: string;
  layers?: Layer[];
}

export interface ImageAdjustments {
  brightness: number; // 100 is default
  contrast: number;   // 100 is default
  saturation: number; // 100 is default
  blur: number;       // 0 is default
}

export interface Layer {
  id: string;
  type: 'IMAGE' | 'MASK' | 'TEXT';
  visible: boolean;
  locked: boolean;
  name: string;
  data: string; // Base64 or specific data
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface EditorHistoryState {
  layers: Layer[];
  selectedLayerId: string | null;
  adjustments: ImageAdjustments;
}

export interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: string;
  error?: string;
}

export interface SubscriptionPlan {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  description: string;
  features: { name: string; included: boolean }[];
  buttonText: string;
  popular?: boolean;
  color?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
  tool: EditorTool | null;
}

export interface Notification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  message: string;
  duration?: number;
}
