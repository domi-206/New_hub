
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DocumentAnalysis, Question, Topic, QuizEvaluation } from "./types";

/**
 * Robust JSON parser that handles markdown blocks and accidental AI chatter.
 */
const safeJsonParse = (text: string) => {
  if (!text) throw new Error("Empty response from UniSpace AI.");
  
  try {
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = markdownMatch ? markdownMatch[1] : text;

    const firstBrace = candidate.indexOf('{');
    const firstBracket = candidate.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    
    const lastBrace = candidate.lastIndexOf('}');
    const lastBracket = candidate.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (start === -1 || end === -1) throw new Error("No JSON structure detected.");
    
    const jsonString = candidate.substring(start, end + 1).trim();
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("AI Response Parsing Failed:", { error: e, raw: text });
    throw new Error("UniSpace AI returned an unreadable format. Please try again.");
  }
};

/**
 * Analyzes the document natively using Gemini's multimodal capabilities.
 */
export const analyzeDocument = async (projectName: string, base64Data: string, mimeType: string): Promise<DocumentAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType
    }
  };

  const textPart = {
    text: `Analyze this study document for a project named "${projectName}".
    Tasks:
    1. Identify 3-5 major study topics with subtopics.
    2. Provide a 2-sentence summary.
    3. Extract a representative 2000-word block of text from the core content to use for tutoring (labeled as 'cleanText').`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [filePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                pageReferences: { type: Type.ARRAY, items: { type: Type.INTEGER } }
              },
              required: ["title", "subtopics", "pageReferences"]
            }
          },
          summary: { type: Type.STRING },
          cleanText: { type: Type.STRING }
        },
        required: ["mainTopics", "summary", "cleanText"]
      }
    }
  });

  const data = safeJsonParse(response.text);
  return {
    id: crypto.randomUUID(),
    name: projectName,
    size: 0,
    uploadedAt: Date.now(),
    mainTopics: data.mainTopics?.map((t: any) => ({ 
      ...t, 
      id: crypto.randomUUID(), 
      unlocked: true,
      bestScore: undefined 
    })) || [],
    contentSummary: data.summary || "",
    extractedText: data.cleanText || ""
  };
};

export const generateQuiz = async (topic: Topic, count: number, docContent: string, signal?: AbortSignal): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const safeCount = Math.min(count, 50); 

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this text: "${docContent.substring(0, 10000)}", create a ${safeCount} question quiz for: "${topic.title}". 
    CRITICAL: For each question, provide an accurate pageReference based on the document source.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING },
            pageReference: { type: Type.INTEGER }
          },
          required: ["text", "options", "correctIndex", "explanation", "pageReference"]
        }
      }
    }
  });

  if (signal?.aborted) throw new Error("Aborted");
  return safeJsonParse(response.text).map((q: any) => ({ ...q, id: crypto.randomUUID() }));
};

export const getTutorResponse = async (query: string, history: any[], docContent: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `DOCUMENT CONTEXT: ${docContent.substring(0, 15000)}\n\nQUESTION: ${query}` }] }],
    config: {
      systemInstruction: "You are the UniSpace AI Tutor. Answer based ONLY on the provided document context. Be concise and helpful."
    }
  });
  return response.text || "I'm sorry, I couldn't process that.";
};

export const analyzeQuizResults = async (questions: Question[], answers: number[]): Promise<QuizEvaluation> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const log = questions.map((q, i) => ({ q: q.text, correct: q.correctIndex === answers[i] }));
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Feedback for: ${JSON.stringify(log)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          focusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["strengths", "weaknesses", "focusAreas", "summary"]
      }
    }
  });
  return safeJsonParse(response.text);
};

export const generateSpeechBase64 = async (text: string, voiceName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text.substring(0, 800) }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
      }
    }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generatePodcastScript = async (topic: Topic, hosts: any[], docContent: string, signal?: AbortSignal) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const hostIntro = hosts.map(h => `${h.name} (Tone: ${h.tone})`).join(' and ');
  const prompt = `Write a ${hosts.length > 1 ? 'conversational' : 'solo'} podcast script featuring ${hostIntro}. 
  The script should focus on "${topic.title}" and be based on this context: ${docContent.substring(0, 6000)}.
  FORMAT: Start each line with the host name followed by a colon. Make it engaging and easy to understand.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });
  if (signal?.aborted) throw new Error("Aborted");
  return response.text || "";
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
