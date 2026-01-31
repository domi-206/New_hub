
import React, { useState, useRef } from 'react';
import { Topic, Podcast } from '../types';
import { generatePodcastScript, generateSpeechBase64, decode, decodeAudioData } from '../geminiService';
import { ACCENTS, TONES, VOICE_MAP } from '../constants';

interface PodcastModuleProps {
  topics: Topic[];
  rawContent: string;
  onPodcastComplete: (p: Podcast) => void;
  onLoading: (isLoading: boolean, messages?: string | string[], onCancel?: () => void) => void;
}

export const PodcastModule: React.FC<PodcastModuleProps> = ({ topics, rawContent, onPodcastComplete, onLoading }) => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [numHosts, setNumHosts] = useState(2);
  const [duration, setDuration] = useState(2);
  const [hosts, setHosts] = useState([
    { name: 'Host A', accent: 'UK', tone: 'Friendly' },
    { name: 'Host B', accent: 'Nigerian', tone: 'Professional' }
  ]);
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const offsetRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      onLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTopic) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    onLoading(true, [
      "Scripting production...", 
      "Engaging AI hosts...", 
      "Finalizing audio..."
    ], handleCancel);
    
    try {
      const script = await generatePodcastScript(selectedTopic, hosts.slice(0, numHosts), rawContent, abortController.signal);
      const cleanTranscript = script.replace(/[*_~`]/g, '').trim();
      const voiceName = VOICE_MAP[hosts[0].accent] || 'Kore';
      
      const base64 = await generateSpeechBase64(`Welcome to UniSpace. ${cleanTranscript.substring(0, 500)}`, voiceName);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      audioBufferRef.current = await decodeAudioData(decode(base64), audioContextRef.current, 24000, 1);

      const podcast: Podcast = {
        id: crypto.randomUUID(),
        topicId: selectedTopic.id,
        title: `${selectedTopic.title} Session`,
        hosts: hosts.slice(0, numHosts),
        audioUrl: '',
        transcript: cleanTranscript,
        createdAt: Date.now()
      };

      setActivePodcast(podcast);
    } catch (e: any) {
      if (e.message !== "Aborted") alert("Failed to create podcast.");
    } finally {
      onLoading(false);
      abortControllerRef.current = null;
    }
  };

  const togglePlay = () => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    if (isPlaying) {
      audioSourceRef.current?.stop();
      offsetRef.current += audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.onended = () => { if (isPlaying) setIsPlaying(false); };
      source.start(0, offsetRef.current % audioBufferRef.current.duration);
      audioSourceRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime;
      setIsPlaying(true);
    }
  };

  if (activePodcast) {
    return (
      <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-10 animate-fade-in py-12 px-4">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <div className="w-48 h-48 bg-[#26B11F]/10 rounded-full flex items-center justify-center mb-8">
               <svg className="w-20 h-20 text-[#26B11F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{activePodcast.title}</h2>
            <div className="mt-8">
              <button 
                onClick={togglePlay}
                className="w-24 h-24 bg-[#26B11F] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-10 h-10 ml-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </button>
            </div>
          </div>
          <button onClick={() => setActivePodcast(null)} className="w-full py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">
            Start New Production
          </button>
        </div>
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 shadow-xl border border-gray-100 dark:border-gray-800 h-full overflow-y-auto max-h-[70vh]">
          <h3 className="font-black mb-6 dark:text-white uppercase tracking-widest text-xs opacity-50">Transcript</h3>
          <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{activePodcast.transcript}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-10">Podcast Setup</h2>
        <div className="space-y-12">
          <div>
            <label className="block text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-6">Topic</label>
            <div className="grid grid-cols-2 gap-3">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  className={`p-6 text-left rounded-[2rem] border-2 transition-all ${
                    selectedTopic?.id === t.id ? 'border-[#26B11F] bg-[#26B11F]/5' : 'border-gray-50 dark:border-gray-800'
                  }`}
                >
                  <p className={`font-bold ${selectedTopic?.id === t.id ? 'text-[#26B11F]' : 'text-gray-700 dark:text-gray-300'}`}>{t.title}</p>
                </button>
              ))}
            </div>
          </div>
          <button 
            disabled={!selectedTopic}
            onClick={handleCreate}
            className="w-full py-6 bg-[#26B11F] text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-[#20941a] transition-all disabled:opacity-30"
          >
            Generate Podcast
          </button>
        </div>
      </div>
    </div>
  );
};
