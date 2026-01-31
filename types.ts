
export interface DocumentAnalysis {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
  mainTopics: Topic[];
  contentSummary: string;
  extractedText?: string; // Added to store text for secondary modules
}

export interface Topic {
  id: string;
  title: string;
  subtopics: string[];
  pageReferences: number[];
  unlocked: boolean;
  bestScore?: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  pageReference: number;
}

export interface QuizEvaluation {
  strengths: string[];
  weaknesses: string[];
  focusAreas: string[];
  summary: string;
}

export interface QuizSession {
  id: string;
  topicId: string;
  questions: Question[];
  score: number;
  totalQuestions: number;
  startTime: number;
  evaluation?: QuizEvaluation;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: number[];
  timestamp: number;
  feedback?: 'up' | 'down';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface Podcast {
  id: string;
  topicId: string;
  title: string;
  hosts: { name: string; accent: string; tone: string }[];
  audioUrl?: string;
  transcript: string;
  createdAt: number;
}

export type View = 'landing' | 'upload' | 'selection' | 'quiz' | 'tutor' | 'podcast';
