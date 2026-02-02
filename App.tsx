
import React, { useState, useEffect } from 'react';
import { View, DocumentAnalysis } from './types';
import { Logo, UNISPACE_GREEN } from './constants';
import { LoadingOverlay } from './components/LoadingOverlay';
import { DocumentUploader } from './components/DocumentUploader';
import { QuizModule } from './components/QuizModule';
import { TutorModule } from './components/TutorModule';
import { PodcastModule } from './components/PodcastModule';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });
  
  const [loading, setLoading] = useState<{ isLoading: boolean; messages: string[]; onCancel?: () => void }>({ 
    isLoading: false, 
    messages: ["Loading..."] 
  });
  const [docAnalysis, setDocAnalysis] = useState<DocumentAnalysis | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLoading = (isLoading: boolean, messages?: string | string[], onCancel?: () => void) => {
    let normalizedMessages: string[] = ["Working on it..."];
    if (Array.isArray(messages)) {
      normalizedMessages = messages;
    } else if (typeof messages === 'string' && messages.length > 0) {
      normalizedMessages = [messages];
    }
    setLoading({ isLoading, messages: normalizedMessages, onCancel });
  };

  const onAnalysisComplete = (analysis: DocumentAnalysis, content: string, fileBlob?: Blob) => {
    setDocAnalysis(analysis);
    setRawContent(content);
    if (fileBlob) {
      setPdfUrl(URL.createObjectURL(fileBlob));
    }
    setCurrentView('selection');
  };

  const handleQuizComplete = (topicId: string, score: number) => {
    if (!docAnalysis) return;
    const updatedTopics = docAnalysis.mainTopics.map(t => {
      if (t.id === topicId) {
        return { ...t, bestScore: Math.max(t.bestScore || 0, score), unlocked: true };
      }
      return t;
    });
    setDocAnalysis({ ...docAnalysis, mainTopics: updatedTopics });
  };

  const SelectionView = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-16 animate-fade-in">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">What's next?</h2>
        <p className="text-gray-400 dark:text-gray-500 font-medium text-lg">Select your learning path for <span className="text-[#26B11F]">{docAnalysis?.name}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-4xl px-4">
        <SelectionCard 
          title="Quiz" 
          desc="Test your mastery" 
          icon={<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          onClick={() => setCurrentView('quiz')}
        />
        <SelectionCard 
          title="AI Tutor" 
          desc="Ask anything" 
          icon={<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          onClick={() => setCurrentView('tutor')}
        />
        <SelectionCard 
          title="Podcast" 
          desc="Listen & Learn" 
          icon={<svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
          onClick={() => setCurrentView('podcast')}
        />
      </div>

      <button 
        onClick={() => setCurrentView('upload')}
        className="text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-widest text-xs border-b border-gray-100 dark:border-gray-800 pb-1"
      >
        Upload New Document
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col text-gray-900 dark:text-gray-100 font-['Inter'] transition-colors duration-300">
      <LoadingOverlay isLoading={loading.isLoading} messages={loading.messages} onCancel={loading.onCancel} />

      <div className="fixed top-8 left-8 z-50">
        <button 
          onClick={() => currentView !== 'landing' && setCurrentView(docAnalysis ? 'selection' : 'landing')}
          className="hover:scale-105 transition-transform"
        >
          <Logo className="h-10" innerClassName="text-2xl" />
        </button>
      </div>

      <div className="fixed top-8 right-8 z-50">
        <button 
          onClick={toggleTheme}
          className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-500 hover:scale-110 transition-all shadow-sm"
        >
          {theme === 'light' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          ) : (
            <svg className="w-6 h-6 text-[#26B11F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          )}
        </button>
      </div>

      <main className="flex-1 flex flex-col px-4 py-12">
        {currentView === 'landing' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in space-y-12">
            <div className="space-y-6">
              <h1 className="text-6xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                Study with <span className="text-[#26B11F]">Flow</span>
              </h1>
              <p className="text-xl text-gray-400 dark:text-gray-500 font-medium max-w-xl mx-auto">
                UniSpace transforms your static documents into interactive learning experiences. Calm, focused, and tailored to you.
              </p>
            </div>
            <button 
              onClick={() => setCurrentView('upload')}
              className="px-12 py-5 bg-[#26B11F] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-green-100 dark:shadow-green-950 hover:scale-105 active:scale-95 transition-all"
            >
              Get Started
            </button>
          </div>
        )}

        {currentView === 'upload' && (
          <DocumentUploader onAnalysisComplete={onAnalysisComplete} onLoading={handleLoading} />
        )}

        {currentView === 'selection' && <SelectionView />}

        {currentView === 'quiz' && (
          <QuizModule 
            topics={docAnalysis?.mainTopics || []} 
            rawContent={rawContent} 
            pdfUrl={pdfUrl}
            onQuizComplete={handleQuizComplete}
            onLoading={handleLoading}
            onBack={() => setCurrentView('selection')}
          />
        )}

        {currentView === 'tutor' && (
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col pt-12">
             <TutorModule rawContent={rawContent} onLoading={handleLoading} />
          </div>
        )}

        {currentView === 'podcast' && (
          <div className="max-w-5xl mx-auto w-full pt-12">
             <PodcastModule 
                topics={docAnalysis?.mainTopics || []} 
                rawContent={rawContent} 
                onLoading={handleLoading}
             />
          </div>
        )}
      </main>

      <footer className="py-12 text-center opacity-20 dark:opacity-10 pointer-events-none">
        <p className="text-xs font-black uppercase tracking-[0.3em]">UniSpace StudyHub</p>
      </footer>
    </div>
  );
};

const SelectionCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; onClick: () => void }> = ({ title, desc, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="group bg-white dark:bg-gray-900 p-10 rounded-[3rem] border-2 border-gray-50 dark:border-gray-800 hover:border-[#26B11F] dark:hover:border-[#26B11F] hover:shadow-2xl hover:shadow-green-50 dark:hover:shadow-green-950/20 transition-all duration-500 text-center flex flex-col items-center space-y-6 transform hover:-translate-y-2"
  >
    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 rounded-[2rem] flex items-center justify-center group-hover:bg-[#26B11F] group-hover:text-white transition-all duration-500">
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-gray-400 dark:text-gray-500 font-medium mt-1">{desc}</p>
    </div>
  </button>
);

export default App;
