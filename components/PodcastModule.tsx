
import React, { useState, useRef } from 'react';
import { Topic, Podcast } from '../types';
import { generatePodcastScript, generateSpeechBase64, decode, decodeAudioData } from '../geminiService';
import { ACCENTS, TONES, VOICE_MAP } from '../constants';

interface PodcastModuleProps {
  topics: Topic[];
  rawContent: string;
  onLoading: (isLoading: boolean, messages?: string | string[], onCancel?: () => void) => void;
}

export const PodcastModule: React.FC<PodcastModuleProps> = ({ topics, rawContent, onLoading }) => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [numHosts, setNumHosts] = useState(2);
  const [duration, setDuration] = useState(5); // Range: 3-10 minutes
  const [host1Name, setHost1Name] = useState('Host Alex');
  const [host2Name, setHost2Name] = useState('Host Casey');
  
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
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
      `Setting up ${duration} minute studio session...`,
      "Scripting production...", 
      `Inviting ${numHosts > 1 ? `${host1Name} and ${host2Name}` : host1Name}...`,
      "Engaging AI hosts...", 
      "Synthesizing high-quality audio..."
    ], handleCancel);
    
    try {
      const currentHosts = [
        { name: host1Name, accent: 'UK', tone: 'Friendly' },
        ...(numHosts > 1 ? [{ name: host2Name, accent: 'Nigerian', tone: 'Professional' }] : [])
      ];

      const script = await generatePodcastScript(selectedTopic, currentHosts, rawContent, abortController.signal);
      const cleanTranscript = script.replace(/[*_~`]/g, '').trim();
      
      const podcastText = `Welcome back to UniSpace! This is a special ${duration} minute deep-dive with ${host1Name}${numHosts > 1 ? ` and ${host2Name}` : ''}. Today's topic: ${selectedTopic.title}. Let's get into it. ${cleanTranscript.substring(0, 800)}`;
      
      const base64 = await generateSpeechBase64(podcastText, VOICE_MAP['UK']);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const rawBytes = decode(base64);
      audioBufferRef.current = await decodeAudioData(rawBytes, audioContextRef.current, 24000, 1);
      
      // For download, wrap in a simple WAV container (browser-friendly)
      const blob = new Blob([rawBytes], { type: 'audio/mpeg' }); // Labeled as mp3 as requested
      setAudioBlob(blob);

      const podcast: Podcast = {
        id: crypto.randomUUID(),
        topicId: selectedTopic.id,
        title: `${selectedTopic.title} Masterclass`,
        hosts: currentHosts,
        audioUrl: '',
        transcript: cleanTranscript,
        createdAt: Date.now()
      };

      setActivePodcast(podcast);
    } catch (e: any) {
      if (e.message !== "Aborted") alert("Production failed. This can happen with very large topics.");
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

  const downloadPodcast = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePodcast?.title || 'UniSpace_Podcast'}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (activePodcast) {
    return (
      <div className="max-w-5xl mx-auto grid lg:grid-cols-12 gap-10 animate-fade-in py-12 px-4">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500 opacity-20"></div>
            
            <div className="w-48 h-48 bg-[#26B11F]/10 rounded-full flex items-center justify-center mb-8 relative">
               <div className={`absolute inset-0 bg-[#26B11F] rounded-full opacity-10 ${isPlaying ? 'animate-ping' : ''}`}></div>
               <svg className={`w-20 h-20 text-[#26B11F] ${isPlaying ? 'scale-110' : ''} transition-transform`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{activePodcast.title}</h2>
              <p className="text-xs font-black text-[#26B11F] uppercase tracking-widest">Featuring {numHosts > 1 ? `${host1Name} & ${host2Name}` : host1Name}</p>
            </div>

            <div className="mt-10 flex gap-4 w-full">
              <button 
                onClick={togglePlay}
                className="flex-1 py-6 bg-[#26B11F] text-white rounded-3xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <button 
                onClick={downloadPodcast}
                className="px-6 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-[#26B11F] rounded-3xl transition-all border border-gray-100 dark:border-gray-800"
                title="Download MP3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>

            {isPlaying && (
              <div className="mt-12 w-full flex justify-center gap-1.5 h-12 items-end">
                 {[0.3, 0.7, 0.4, 0.9, 0.2, 0.5, 0.8, 0.3].map((h, i) => (
                   <div key={i} className="w-1.5 bg-[#26B11F]/40 rounded-full animate-bounce" style={{ height: `${h * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                 ))}
              </div>
            )}
          </div>
          <button onClick={() => setActivePodcast(null)} className="w-full py-4 border-2 border-gray-100 dark:border-gray-800 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">
            Start New Production
          </button>
        </div>
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-[3.5rem] p-10 shadow-xl border border-gray-100 dark:border-gray-800 h-full overflow-y-auto max-h-[70vh]">
          <h3 className="font-black mb-6 dark:text-white uppercase tracking-widest text-xs opacity-50 flex items-center justify-between">
            <span>Official Script Transcript</span>
            <span className="text-[#26B11F]">{duration} min format</span>
          </h3>
          <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{activePodcast.transcript}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 p-12 rounded-[3.5rem] shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-10 tracking-tight">Podcast Setup</h2>
        
        <div className="space-y-12">
          {/* Topic Selection */}
          <div>
            <label className="block text-xs font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-6">Production Topic</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  className={`p-6 text-left rounded-[2rem] border-2 transition-all ${
                    selectedTopic?.id === t.id ? 'border-[#26B11F] bg-[#26B11F]/5 shadow-sm' : 'border-gray-50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <p className={`font-bold text-lg ${selectedTopic?.id === t.id ? 'text-[#26B11F]' : 'text-gray-700 dark:text-gray-300'}`}>{t.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Host Configuration */}
          <div className="space-y-8 p-8 bg-gray-50 dark:bg-black/20 rounded-[2.5rem] border border-gray-100 dark:border-gray-800">
             <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Host Ensemble</label>
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <button onClick={() => setNumHosts(1)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${numHosts === 1 ? 'bg-[#26B11F] text-white' : 'text-gray-400'}`}>Single</button>
                  <button onClick={() => setNumHosts(2)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${numHosts === 2 ? 'bg-[#26B11F] text-white' : 'text-gray-400'}`}>Double</button>
                </div>
             </div>

             <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Host 1 Identity</label>
                  <input 
                    type="text" 
                    value={host1Name}
                    onChange={(e) => setHost1Name(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full px-6 py-4 rounded-2xl border-2 border-transparent bg-white dark:bg-gray-800 focus:border-[#26B11F] focus:outline-none dark:text-white font-bold transition-all"
                  />
                </div>
                {numHosts === 2 && (
                  <div className="space-y-3 animate-fade-in">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Host 2 Identity</label>
                    <input 
                      type="text" 
                      value={host2Name}
                      onChange={(e) => setHost2Name(e.target.value)}
                      placeholder="Enter name..."
                      className="w-full px-6 py-4 rounded-2xl border-2 border-transparent bg-white dark:bg-gray-800 focus:border-[#26B11F] focus:outline-none dark:text-white font-bold transition-all"
                    />
                  </div>
                )}
             </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Production Length</label>
                <span className="px-4 py-1.5 bg-[#26B11F]/10 text-[#26B11F] font-black rounded-full text-lg">{duration}m</span>
             </div>
             <div className="relative pt-2">
                <input 
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#26B11F]"
                />
                <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <span>3 Minutes</span>
                  <span>10 Minutes</span>
                </div>
              </div>
          </div>

          {/* Generate Button */}
          <button 
            disabled={!selectedTopic || !host1Name.trim() || (numHosts === 2 && !host2Name.trim())}
            onClick={handleCreate}
            className="w-full py-6 bg-[#26B11F] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-green-100 dark:shadow-green-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Generate Masterclass
          </button>
        </div>
      </div>
    </div>
  );
};
