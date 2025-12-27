
import { GoogleGenAI } from "@google/genai";
import { optimizeImageForAi } from "../utils/imageUtils";

// Helper to get client safely. 
const getAiClient = () => {
  // Safe access to process.env to prevent "process is not defined" error in browser
  const envApiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
  
  const apiKey = envApiKey || (import.meta.env as any).VITE_API_KEY || (import.meta.env as any).VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing. Please set VITE_API_KEY in your environment.");
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64Str: string): string => {
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced retry logic with smarter backoff
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 4, baseDelay = 3000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error.status;
      const message = error.message?.toLowerCase() || '';
      
      // Check for Rate Limit (429) or Service Unavailable (503)
      const isTransient = status === 429 || status === 503 || message.includes('429') || message.includes('quota') || message.includes('busy') || message.includes('resource exhausted');

      if (isTransient) {
        if (attempt > maxRetries) throw error;
        
        // Exponential Backoff with jitter: 3s, 6s, 12s, 24s...
        const delay = baseDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000);
        console.warn(`♻️ Gemini API Busy (Attempt ${attempt}/${maxRetries}). Waiting ${(delay/1000).toFixed(1)}s...`);
        await wait(delay);
        continue;
      }
      throw error; 
    }
  }
}

export const processImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string,
  mode: 'ERASER' | 'EDIT' | 'UPSCALE' = 'EDIT'
): Promise<string> => {
  const ai = getAiClient();
  
  // OPTIMIZATION: Resize image before sending to avoid hitting throughput limits
  const optimizedImage = await optimizeImageForAi(imageBase64, 1024);
  const cleanImage = cleanBase64(optimizedImage);

  // FALLBACK STRATEGY: Try primary model, if rate limited, try secondary
  const modelsToTry = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp'];
  
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
        console.log(`🤖 Processing with ${model} in ${mode} mode...`);
        
        const parts: any[] = [{ inlineData: { mimeType: 'image/jpeg', data: cleanImage } }];
        let finalPrompt = prompt;

        if (mode === 'ERASER' && maskBase64) {
           const cleanMask = cleanBase64(maskBase64);
           parts.push({ inlineData: { mimeType: 'image/png', data: cleanMask } });
           finalPrompt = `TASK: Inpainting / Object Removal. 
           INSTRUCTION: Strictly fill the white masked area to match the surrounding background texture and lighting. 
           Do NOT generate new objects. The result must look like the object never existed.`;
        } 
        else if (mode === 'EDIT' && maskBase64) {
           const cleanMask = cleanBase64(maskBase64);
           parts.push({ inlineData: { mimeType: 'image/png', data: cleanMask } });
           finalPrompt = `TASK: Localized Generative Edit. 
           INSTRUCTION: ${prompt}. 
           Apply this change ONLY within the provided white mask area. Maintain global lighting and perspective.`;
        } 
        else if (mode === 'UPSCALE') {
            finalPrompt = `TASK: Image Enhancement.
            INSTRUCTION: Enhance clarity, sharpness, and texture details. 
            Reduce noise. Output high-quality photorealistic image.`;
        }

        parts.push({ text: finalPrompt });

        const response = await retryWithBackoff(() => ai.models.generateContent({
          model: model,
          contents: { parts },
          config: { 
              temperature: mode === 'ERASER' ? 0.3 : 0.5,
          }
        }), 3, 2000); // 3 retries per model

        const respParts = response.candidates?.[0]?.content?.parts;
        if (respParts) {
          for (const part of respParts) {
            if (part.inlineData && part.inlineData.data) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
        throw new Error(`Model ${model} returned no image.`);

    } catch (error: any) {
        console.error(`Error with ${model}:`, error);
        lastError = error;
        
        // If it's NOT a rate limit error (e.g. Invalid Argument), don't try next model, just fail.
        // If it IS a rate limit, loop continues to next model.
        const status = error.status;
        const msg = error.message?.toLowerCase() || '';
        const isQuota = status === 429 || status === 503 || msg.includes('quota') || msg.includes('exhausted');
        
        if (!isQuota) {
            break; // Fatal error, stop trying
        }
    }
  }

  // If we get here, all models failed
  if (lastError?.status === 429 || lastError?.message?.includes('quota')) {
      throw new Error("Server is extremely busy (Rate Limit Reached). Please wait 1 minute and try again.");
  }
  throw new Error("AI Processing Failed: " + (lastError?.message || "Unknown error"));
};

export const removeBackground = async (imageBase64: string): Promise<string> => {
  return await processImageWithGemini(imageBase64, "Remove the background completely. Return the subject on a pure transparent background. Ensure edges are clean.", undefined, 'EDIT');
};

export const upscaleImage = async (imageBase64: string): Promise<string> => {
    return await processImageWithGemini(imageBase64, "", undefined, 'UPSCALE');
}

export const processBatchItem = async (
    item: { file: File, id: string }, 
    tool: 'REMOVE_BG' | 'UPSCALE'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;
                let result = '';
                if (tool === 'REMOVE_BG') {
                    result = await removeBackground(base64);
                } else {
                    result = await upscaleImage(base64);
                }
                resolve(result);
            } catch (e) {
                reject(e);
            }
        };
        reader.readAsDataURL(item.file);
    });
};
