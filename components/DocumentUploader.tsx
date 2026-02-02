
import React, { useRef, useState } from 'react';
import { analyzeDocument } from '../geminiService';
import { DocumentAnalysis } from '../types';

interface DocumentUploaderProps {
  onAnalysisComplete: (analysis: DocumentAnalysis, rawContent: string, fileBlob?: Blob) => void;
  onLoading: (isLoading: boolean, messages?: string | string[]) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onAnalysisComplete, onLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (Max 10MB).");
        return;
      }
      setSelectedFile(file);
      if (!projectName) {
        setProjectName(file.name.split('.')[0]);
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const createProject = async () => {
    if (!selectedFile) return;

    const finalProjectName = projectName.trim() || selectedFile.name;

    onLoading(true, [
      `Initializing project: ${finalProjectName}`,
      "Reading document bytes...",
      "UniSpace AI is scanning pages...",
      "Extracting study topics...",
      "Preparing your personal learning space..."
    ]);

    try {
      const base64 = await fileToBase64(selectedFile);
      const analysis = await analyzeDocument(finalProjectName, base64, selectedFile.type);
      
      onAnalysisComplete(analysis, analysis.extractedText || "", selectedFile);
    } catch (error: any) {
      console.error("Project Creation Failed:", error);
      alert(`Project Creation Failed: ${error.message || "Please check your document format and try again."}`);
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-4">
      <div className="w-full max-w-lg space-y-8">
        {!selectedFile ? (
          <div 
            className="bg-white dark:bg-gray-900 p-16 rounded-[3rem] border-4 border-dashed border-gray-50 dark:border-gray-800 flex flex-col items-center justify-center text-center space-y-8 hover:border-[#26B11F]/20 dark:hover:border-[#26B11F]/20 hover:bg-[#26B11F]/5 dark:hover:bg-[#26B11F]/5 transition-all duration-500 cursor-pointer group shadow-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.docx,.txt,image/*"
              onChange={handleFileChange}
            />
            <div className="w-24 h-24 bg-green-50 dark:bg-green-950/20 text-[#26B11F] rounded-[2rem] flex items-center justify-center relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Upload Material</h3>
              <p className="text-gray-400 dark:text-gray-500 font-medium mt-3 max-w-[280px] mx-auto leading-relaxed">
                Upload PDFs, Docs, or Images. UniSpace AI will parse them for you.
              </p>
            </div>
            <button className="px-10 py-4 bg-[#26B11F] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-100 dark:shadow-green-950 hover:scale-105 active:scale-95 transition-all">
              Choose File
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-xl space-y-8 animate-fade-in">
            <div className="flex items-center gap-4 p-6 bg-green-50 dark:bg-green-950/10 rounded-2xl">
              <div className="w-12 h-12 bg-[#26B11F] text-white rounded-xl flex items-center justify-center flex-shrink-0">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div className="flex-1 truncate">
                <p className="text-xs font-black text-[#26B11F] uppercase tracking-widest">Selected File</p>
                <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{selectedFile.name}</p>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Project Name</label>
              <input 
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Name your study session..."
                className="w-full px-8 py-5 rounded-2xl border-2 border-gray-50 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 focus:border-[#26B11F] focus:outline-none dark:text-white font-bold transition-all"
              />
            </div>

            <button 
              onClick={createProject}
              className="w-full py-6 bg-[#26B11F] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-green-100 dark:shadow-green-950/20 hover:scale-105 active:scale-95 transition-all"
            >
              Create Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
