import { GoogleGenAI, Type } from "@google/genai";
import { Todo } from "../types";

// Initialize the API client safely
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const apiKey = process.env.API_KEY;
// Safely instantiate AI client; if key is missing, AI features will be disabled gracefully.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL_NAME = "gemini-3-flash-preview";

export const getCatMotivation = async (): Promise<string> => {
  if (!ai) {
      console.warn("Gemini API Key missing. Returning default motivation.");
      return "Hang in there, kitty!";
  }
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Give me a short, funny, cat-themed motivational quote for someone working on their to-do list. Keep it under 20 words.",
    });
    return response.text?.trim() || "Hang in there, kitty!";
  } catch (error) {
    console.error("Error fetching motivation:", error);
    return "Keep purring along!";
  }
};

export const breakdownTask = async (taskText: string): Promise<string[]> => {
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Break down the following task into 3 smaller, actionable sub-steps. The tone should be helpful but slightly cat-themed (using words like paw, claw, leap, etc where appropriate but keep it subtle). Task: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Error breaking down task:", error);
    return [];
  }
};

export const suggestCatTasks = async (theme?: string): Promise<Todo[]> => {
    if (!ai) return [];
    
    let prompt = "Generate 3 funny to-do list items that a cat might have.";
    if (theme && theme.trim()) {
        prompt = `Generate 3 funny to-do list items that a cat might have, specifically related to the theme: "${theme}". Keep it feline-focused but relevant to the theme.`;
    }
    prompt += " Return as a JSON array of strings.";

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        
        const texts = JSON.parse(response.text || "[]") as string[];
        return texts.map((text, index) => ({
            id: `ai-gen-${Date.now()}-${index}`,
            text,
            completed: false,
            category: "Treats" as any,
            createdAt: Date.now()
        }));

    } catch (error) {
        console.error("Error generating tasks", error);
        return [];
    }
}