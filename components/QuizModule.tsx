
import React, { useState, useEffect, useRef } from 'react';
import { Topic, Question, QuizSession, QuizEvaluation } from '../types';
import { generateQuiz, analyzeQuizResults } from '../geminiService';

interface QuizModuleProps {
  topics: Topic[];
  rawContent: string;
  pdfUrl?: string | null;
  onQuizComplete: (topicId: string, score: number) => void;
  onLoading: (isLoading: boolean, messages?: string | string[], onCancel?: () => void) => void;
  onBack: () => void;
}

export const QuizModule: React.FC<QuizModuleProps> = ({ topics, rawContent, pdfUrl, onQuizComplete, onLoading, onBack }) => {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [activeQuiz, setActiveQuiz] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizSession | null>(null);
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let timer: any;
    if (activeQuiz && !quizResults) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNext();
            return timePerQuestion;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeQuiz, quizResults, currentQuestionIndex]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      onLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!selectedTopic) return;
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    onLoading(true, [
      "Preparing your quiz...", 
      "Curating questions...", 
      "Finalizing details..."
    ], handleCancel);

    try {
      const qs = await generateQuiz(selectedTopic, questionCount, rawContent, abortController.signal);
      setActiveQuiz(qs);
      setAnswers(new Array(qs.length).fill(-1));
      setTimeLeft(timePerQuestion);
      setCurrentQuestionIndex(0);
      setQuizResults(null);
      setEvaluation(null);
    } catch (e: any) {
      if (e.message !== "Aborted") alert("Failed to generate quiz. Try a shorter count.");
    } finally {
      onLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < (activeQuiz?.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setTimeLeft(timePerQuestion);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setTimeLeft(timePerQuestion);
    }
  };

  const finishQuiz = async () => {
    if (!activeQuiz) return;
    let scoreCount = 0;
    activeQuiz.forEach((q, i) => {
      if (answers[i] === q.correctIndex) scoreCount++;
    });
    const finalScore = (scoreCount / activeQuiz.length) * 100;
    
    onLoading(true, "UniSpace AI is analyzing your performance...");
    
    try {
      const evalData = await analyzeQuizResults(activeQuiz, answers);
      const session: QuizSession = {
        id: crypto.randomUUID(),
        topicId: selectedTopic?.id || '',
        questions: activeQuiz,
        score: finalScore,
        totalQuestions: activeQuiz.length,
        startTime: Date.now(),
        evaluation: evalData
      };
      setQuizResults(session);
      setEvaluation(evalData);
      onQuizComplete(selectedTopic?.id || '', finalScore);
    } catch (e) {
      console.error(e);
      const session: QuizSession = {
        id: crypto.randomUUID(),
        topicId: selectedTopic?.id || '',
        questions: activeQuiz,
        score: finalScore,
        totalQuestions: activeQuiz.length,
        startTime: Date.now(),
      };
      setQuizResults(session);
    } finally {
      onLoading(false);
    }
  };

  const openInPdf = (page: number) => {
    if (pdfUrl) {
      window.open(`${pdfUrl}#page=${page}`, '_blank');
    } else {
      alert("PDF reference not available. This usually happens if you've reloaded the page.");
    }
  };

  if (activeQuiz && !quizResults) {
    const currentQ = activeQuiz[currentQuestionIndex];
    return (
      <div className="max-w-3xl mx-auto min-h-[60vh] flex flex-col justify-center animate-fade-in py-12 px-4">
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
          <div className="p-10 space-y-8">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-[#26B11F] uppercase tracking-widest">Question {currentQuestionIndex + 1} of {activeQuiz.length}</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-full">
                <div className="w-2 h-2 bg-[#26B11F] rounded-full animate-pulse"></div>
                <span className="text-lg font-mono font-black text-[#26B11F]">{timeLeft}s</span>
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{currentQ.text}</h3>
            
            <div className="grid gap-3">
              {currentQ.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                    answers[currentQuestionIndex] === i 
                    ? 'border-[#26B11F] bg-[#26B11F]/5 dark:bg-[#26B11F]/10 text-[#26B11F] scale-[1.01] shadow-sm' 
                    : 'border-gray-50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-4">
                     <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${answers[currentQuestionIndex] === i ? 'bg-[#26B11F] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                       {String.fromCharCode(65 + i)}
                     </span>
                     <span className="font-semibold">{opt}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex-1 py-5 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-20 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                Prev
              </button>
              <button 
                onClick={handleNext}
                className="flex-[2] py-5 bg-[#26B11F] text-white rounded-2xl font-black text-lg shadow-xl shadow-green-100 dark:shadow-green-950/30 hover:bg-[#20941a] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestionIndex === activeQuiz.length - 1 ? 'Finish' : 'Next'}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quizResults) {
    return (
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in py-12 px-4">
        <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl text-center border border-gray-100 dark:border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gray-50 dark:bg-gray-800">
             <div className="h-full bg-[#26B11F] transition-all duration-1000" style={{ width: `${quizResults.score}%` }}></div>
          </div>
          
          <div className={`mx-auto w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black mb-6 ${
            quizResults.score >= 70 ? 'bg-green-50 dark:bg-green-900/20 text-[#26B11F]' : 'bg-red-50 dark:bg-red-900/20 text-red-500'
          }`}>
            {Math.round(quizResults.score)}%
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">{quizResults.score >= 70 ? 'Incredible Flow!' : 'Keep Moving Forward'}</h2>
          
          {evaluation && (
            <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
              <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-100/50 dark:border-green-800/30">
                <h4 className="text-xs font-black text-[#26B11F] uppercase tracking-[0.2em] mb-4">Strengths</h4>
                <ul className="space-y-2">
                  {evaluation.strengths.map((s, i) => <li key={i} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex gap-2"><span>•</span>{s}</li>)}
                </ul>
              </div>
              <div className="bg-red-50/50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100/50 dark:border-red-800/30">
                <h4 className="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-4">Improvement</h4>
                <ul className="space-y-2">
                  {evaluation.weaknesses.map((s, i) => <li key={i} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex gap-2"><span>•</span>{s}</li>)}
                </ul>
              </div>
              <div className="bg-[#26B11F]/5 p-6 rounded-3xl border border-[#26B11F]/10">
                <h4 className="text-xs font-black text-[#26B11F] uppercase tracking-[0.2em] mb-4">Next Steps</h4>
                <ul className="space-y-2">
                  {evaluation.focusAreas.map((s, i) => <li key={i} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex gap-2"><span>•</span>{s}</li>)}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-12 flex justify-center gap-4">
            <button 
              onClick={onBack}
              className="px-8 py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              Exit
            </button>
            <button 
              onClick={startQuiz}
              className="px-8 py-3 bg-[#26B11F] text-white rounded-2xl font-bold shadow-lg shadow-green-100 dark:shadow-green-950 hover:scale-105 active:scale-95 transition-all"
            >
              Retake Quiz
            </button>
          </div>
        </div>

        <div className="grid gap-6 pb-20">
          <h3 className="text-xl font-black px-4 text-gray-400 dark:text-gray-600 uppercase tracking-widest">Question Review</h3>
          {quizResults.questions.map((q, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-50 dark:border-gray-800 shadow-sm group hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                  answers[i] === q.correctIndex ? 'bg-green-50 dark:bg-green-950/20 text-[#26B11F]' : 'bg-red-50 dark:bg-red-950/20 text-red-500'
                }`}>
                  {answers[i] === q.correctIndex ? 'Correct' : 'Incorrect'}
                </div>
                <button 
                  onClick={() => openInPdf(q.pageReference)}
                  className="group/btn flex items-center gap-2 text-xs font-black text-[#26B11F] uppercase tracking-widest hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  View in PDF (Page {q.pageReference})
                </button>
              </div>
              <p className="text-xl font-bold text-gray-800 dark:text-white leading-snug">{q.text}</p>
              <div className="mt-6 space-y-3">
                 <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-bold text-gray-400 uppercase mb-1">Correct Answer</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{q.options[q.correctIndex]}</p>
                 </div>
                 {answers[i] !== q.correctIndex && (
                   <div className="p-4 bg-red-50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30">
                      <p className="text-sm font-bold text-red-300 uppercase mb-1">Your choice</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">{answers[i] === -1 ? 'No answer' : q.options[answers[i]]}</p>
                   </div>
                 )}
                 <div className="mt-4 p-5 bg-[#26B11F]/5 rounded-2xl border border-[#26B11F]/10">
                    <p className="text-xs font-black text-[#26B11F] uppercase mb-2">Key Reference Explanation</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed italic">"{q.explanation}"</p>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8">Customize Quiz</h2>
        
        <div className="space-y-10">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Topic Selection</label>
            <div className="grid gap-3">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  className={`p-6 text-left rounded-[1.5rem] border-2 transition-all flex justify-between items-center group ${
                    selectedTopic?.id === t.id 
                    ? 'border-[#26B11F] bg-[#26B11F]/5 dark:bg-[#26B11F]/10' 
                    : 'border-gray-50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <span className={`font-bold text-lg block ${selectedTopic?.id === t.id ? 'text-[#26B11F]' : 'text-gray-700 dark:text-gray-300'}`}>{t.title}</span>
                  </div>
                  {t.bestScore && t.bestScore >= 70 && (
                    <div className="bg-[#26B11F] text-white p-1.5 rounded-lg">
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Question Volume</label>
                <div className="bg-green-50 dark:bg-green-950/20 px-4 py-1.5 rounded-full">
                  <span className="text-[#26B11F] font-black text-lg">{questionCount}</span>
                </div>
              </div>
              <div className="relative pt-2">
                <input 
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#26B11F] border border-gray-200 dark:border-gray-700"
                />
                <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  <span>5 Items</span>
                  <span>50 Items</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Focus Level (Time per Q)</label>
              <div className="flex bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl gap-2">
                {[15, 30, 60].map(seconds => (
                  <button
                    key={seconds}
                    onClick={() => setTimePerQuestion(seconds)}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${timePerQuestion === seconds ? 'bg-white dark:bg-gray-700 shadow-sm text-[#26B11F]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              disabled={!selectedTopic}
              onClick={startQuiz}
              className="w-full py-5 bg-[#26B11F] text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-green-100 dark:shadow-green-950 hover:bg-[#20941a] active:scale-[0.98] transition-all disabled:opacity-30"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
