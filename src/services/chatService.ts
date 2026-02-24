import { GoogleGenAI } from "@google/genai";
import { Message } from "../types/database";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const chatService = {
  async generateResponse(history: Message[], userMessage: string) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: "You are a helpful AI assistant. Provide concise and accurate answers.",
      }
    });

    const response = await model;
    return response.text || "I'm sorry, I couldn't generate a response.";
  },

  async generateTitle(userMessage: string, assistantResponse: string) {
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [{ text: `Based on this exchange, generate a very short (max 4 words) descriptive title for the conversation.
          
          User: ${userMessage}
          Assistant: ${assistantResponse}
          
          Title:` }]
        }
      ],
      config: {
        systemInstruction: "You are a helpful assistant that generates concise conversation titles. Return ONLY the title text, no quotes or punctuation.",
      }
    });

    const response = await model;
    return response.text?.trim() || "New Chat";
  }
};
