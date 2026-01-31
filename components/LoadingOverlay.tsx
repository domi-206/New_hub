
import React, { useState, useEffect } from 'react';
import { Logo } from '../constants';

interface LoadingOverlayProps {
  messages?: string[];
  isLoading: boolean;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ messages = ["Loading..."], isLoading, onCancel }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading, messages]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0a0a0a] z-[100] flex flex-col items-center justify-center animate-fade-in transition-colors duration-300">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-[#26B11F]/10 rounded-[1.5rem] animate-ping scale-150"></div>
        <div className="absolute inset-0 bg-[#26B11F]/5 rounded-[1.5rem] animate-pulse scale-125"></div>
        <div className="relative transform hover:scale-105 transition-transform duration-500">
          <Logo className="h-20" innerClassName="text-4xl" />
        </div>
      </div>
      
      <div className="h-12 flex items-center justify-center px-6">
        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg tracking-tight animate-pulse transition-all duration-500 text-center">
          {messages[msgIndex]}
        </p>
      </div>

      <div className="mt-8 flex gap-1.5">
        {messages.map((_, i) => (
          <div 
            key={i} 
            className={`h-1 rounded-full transition-all duration-500 ${
              i === msgIndex ? 'w-8 bg-[#26B11F]' : 'w-2 bg-gray-100 dark:bg-gray-800'
            }`}
          />
        ))}
      </div>

      {onCancel && (
        <button 
          onClick={onCancel}
          className="mt-16 px-10 py-4 bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 font-black rounded-2xl hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all uppercase tracking-[0.2em] text-[11px] border border-gray-100 dark:border-gray-800"
        >
          Cancel Generation
        </button>
      )}
    </div>
  );
};
