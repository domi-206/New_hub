
import React from 'react';

export const UNISPACE_GREEN = '#26B11F';

export const Logo: React.FC<{ className?: string; innerClassName?: string }> = ({ className = "h-12", innerClassName = "text-3xl" }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <div className="w-16 h-16 bg-[#26B11F] rounded-[1.2rem] flex items-center justify-center shadow-sm">
      <span className={`text-white font-bold leading-none ${innerClassName}`} style={{ fontFamily: 'Inter, sans-serif' }}>U</span>
    </div>
  </div>
);

export const ACCENTS = ['Nigerian', 'UK', 'US'];
export const TONES = ['Professional', 'Teacher', 'Friendly', 'Funny', 'Serious'];
export const VOICE_MAP: Record<string, string> = {
  'UK': 'Kore',
  'US': 'Puck',
  'Nigerian': 'Fenrir'
};
