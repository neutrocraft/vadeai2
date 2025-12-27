import { GoogleGenAI } from "@google/genai";

// Helper to get client safely. 
// We do NOT initialize at the top level to prevent app crash if ENV is missing.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your .env file or configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (base64Str: string): string => {
  return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

/**
 * Main Image Editing Function
 */
export const processImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string,
  mode: 'ERASER' | 'EDIT' = 'EDIT'
): Promise<string> => {
  try {
    const ai = getAiClient(); // Initialize here, safely
    const cleanImage = cleanBase64(imageBase64);
    // Use the latest flash image model for speed and quality in editing tasks
    const model = 'gemini-2.5-flash-image'; 
    
    const parts: any[] = [
       {
        inlineData: {
          mimeType: 'image/png',
          data: cleanImage
        }
      }
    ];

    let finalPrompt = prompt;

    // --- LOGIC BRANCHING ---

    if (mode === 'ERASER' && maskBase64) {
       // 1. ERASER MODE (Strict Inpainting)
       const cleanMask = cleanBase64(maskBase64);
       parts.push({
         inlineData: {
           mimeType: 'image/png',
           data: cleanMask
         }
       });

       // SYSTEM PROMPT FOR ERASER
       finalPrompt = `
       TASK: Texture Synthesis / Inpainting.
       
       INPUTS:
       1. Source Image.
       2. Mask (White = Target area, Black = Protected area).

       INSTRUCTION:
       Fill the white masked area with texture and lighting that perfectly matches the surrounding black protected area.
       Effectively "erase" whatever object was in the white area by overwriting it with background.
       
       CONSTRAINTS:
       - DO NOT generate new objects.
       - DO NOT change pixels in the black area.
       - Output must be seamless.
       `;
    } 
    else if (mode === 'EDIT' && maskBase64) {
       // 2. SELECTION EDIT MODE
       const cleanMask = cleanBase64(maskBase64);
       parts.push({
         inlineData: {
           mimeType: 'image/png',
           data: cleanMask
         }
       });

       finalPrompt = `
       TASK: Localized Editing.
       
       INSTRUCTION:
       ${prompt}
       
       CONSTRAINTS:
       - Apply this change ONLY inside the white masked area.
       - Keep the perspective and lighting consistent with the rest of the image.
       - Do not alter the unmasked (black) regions.
       `;
    } 
    else {
       // 3. GLOBAL EDIT MODE (No Mask)
       finalPrompt = `
       TASK: Global Image Transformation.
       
       INSTRUCTION:
       ${prompt}
       
       CONSTRAINTS:
       - Return a high-quality image.
       - Maintain the original aspect ratio.
       `;
    }

    parts.push({ text: finalPrompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        // Lower temperature for Eraser to be more deterministic
        temperature: mode === 'ERASER' ? 0.3 : 0.7, 
      }
    });

    const respParts = response.candidates?.[0]?.content?.parts;
    
    if (respParts) {
      for (const part of respParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Gemini returned no image data.");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const removeBackground = async (imageBase64: string): Promise<string> => {
  // Uses Gemini's understanding to isolate the subject
  const result = await processImageWithGemini(imageBase64, "Remove the background. Return only the main subject on a transparent background.", undefined, 'EDIT');
  return result;
};