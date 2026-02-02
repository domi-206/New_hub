
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, ChatMessage } from '../types';
import { getTutorResponse, generateSpeechBase64, decode, decodeAudioData } from '../geminiService';
// Added Logo to the imports from constants
import { Logo, ACCENTS, TONES, VOICE_MAP } from '../constants';

interface TutorModuleProps {
  rawContent: string;
  onLoading: (isLoading: boolean, messages?: string | string[]) => void;
}

export const TutorModule: React.FC<TutorModuleProps> = ({ rawContent, onLoading }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [accent, setAccent] = useState('UK');
  const [tone, setTone] = useState('Professional');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Session ' + (sessions.length + 1),
      messages: [],
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const deleteChat = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeSessionId) return;

    const currentInput = input;
    setInput('');

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentInput,
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() } : s
    ));

    onLoading(true, "AI is responding...");
    try {
      const response = await getTutorResponse(currentInput, activeSession?.messages || [], rawContent);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s
      ));
    } catch (e) {
      alert("Failed to get response. Try a shorter query.");
    } finally {
      onLoading(false);
    }
  };

  const playResponse = async (text: string) => {
    // Only triggers loading when playback is actually requested
    onLoading(true, "Synthesizing voice...");
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const voiceName = VOICE_MAP[accent] || 'Kore';
      const base64 = await generateSpeechBase64(`${tone} tone: ${text}`, voiceName);
      const audioBuffer = await decodeAudioData(decode(base64), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (e) {
      alert("Voice failed.");
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-fade-in">
      <div className="w-72 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-black/20">
        <div className="p-6">
          <button 
            onClick={createNewChat}
            className="w-full py-4 bg-[#26B11F] text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#20941a] transition-all shadow-lg shadow-green-100 dark:shadow-green-950/20 active:scale-95"
          >
            New Session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="group relative">
              <button 
                onClick={() => setActiveSessionId(s.id)}
                className={`w-full text-left px-4 py-4 rounded-2xl text-sm transition-all pr-10 truncate ${
                  activeSessionId === s.id 
                  ? 'bg-white dark:bg-gray-800 text-[#26B11F] font-black shadow-sm' 
                  : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 font-bold'
                }`}
              >
                {s.title}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteChat(s.id); }}
                className="absolute right-3 top-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-white dark:bg-gray-900">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div className="flex gap-4">
            {/* Immediate selection without loading screen */}
            <select 
              value={accent} 
              onChange={(e) => setAccent(e.target.value)}
              className="text-xs font-black bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-[#26B11F] dark:text-gray-300 cursor-pointer"
            >
              {ACCENTS.map(a => <option key={a} value={a}>{a} Accent</option>)}
            </select>
            <select 
              value={tone} 
              onChange={(e) => setTone(e.target.value)}
              className="text-xs font-black bg-gray-50 dark:bg-gray-800 px-4 py-2.5 rounded-xl border-none focus:ring-2 focus:ring-[#26B11F] dark:text-gray-300 cursor-pointer"
            >
              {TONES.map(t => <option key={t} value={t}>{t} Tone</option>)}
            </select>
          </div>
          {activeSessionId && (
             <span className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-widest">Connected</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {!activeSessionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 grayscale">
              {/* Logo component is now correctly imported */}
              <Logo className="h-16 opacity-10" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">Start a new session</p>
            </div>
          ) : activeSession.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-30">
               <p className="text-lg font-black dark:text-white">What would you like to know?</p>
            </div>
          ) : (
            activeSession.messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] p-6 rounded-[2rem] ${
                  m.role === 'user' 
                  ? 'bg-[#26B11F] text-white shadow-xl shadow-green-100 dark:shadow-green-950/20' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 dark:text-gray-200'
                }`}>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  {m.role === 'assistant' && (
                    <div className="mt-4 flex gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <button onClick={() => playResponse(m.content)} className="p-2 text-gray-400 hover:text-[#26B11F] transition-colors" title="Read Aloud">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      </button>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(m.content); alert("Copied!"); }}
                        className="p-2 text-gray-400 hover:text-[#26B11F] transition-colors" 
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="relative max-w-4xl mx-auto flex items-center gap-3">
            <input 
              disabled={!activeSessionId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeSessionId ? "Type your question..." : "Select session first..."}
              className="flex-1 pl-8 pr-4 py-5 rounded-[2rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-[#26B11F]/10 dark:text-white disabled:opacity-50"
            />
            <button 
              disabled={!activeSessionId || !input.trim()}
              onClick={handleSend}
              className="p-5 bg-[#26B11F] text-white rounded-[1.5rem] shadow-xl shadow-green-100 dark:shadow-green-950/20 hover:bg-[#20941a] transition-all disabled:opacity-50 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
