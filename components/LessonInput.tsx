import React, { useState } from 'react';
import { SubTopic } from '../types';
import { analyzeLessonText } from '../services/geminiService';
import { Button } from './Button';
import { Upload, Sparkles } from 'lucide-react';

interface Props {
  onAnalyzeComplete: (topics: SubTopic[]) => void;
}

export const LessonInput: React.FC<Props> = ({ onAnalyzeComplete }) => {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const topics = await analyzeLessonText(text);
      onAnalyzeComplete(topics);
    } catch (error) {
      alert("Failed to analyze lesson. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-display font-black mb-4 bg-gradient-to-br from-white via-white to-blue-500 bg-clip-text text-transparent tracking-tighter">
          Adaptive AI Interview Engine
        </h1>
        <p className="text-slate-400 font-medium max-w-xl mx-auto">
          Transform static content into real-time, interview-grade evaluation experiences.
          <span className="block text-blue-400 mt-2 text-xs font-bold uppercase tracking-widest">Powered by Gemini 2.5 Flash</span>
        </p>
      </div>

      <div className="glass-panel w-full p-1 rounded-3xl">
        <div className="bg-black/40 rounded-[22px] p-6">
          <textarea
            className="w-full h-64 bg-transparent text-lg text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
            placeholder="Paste your lesson content here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="mt-4 flex justify-between items-center border-t border-white/10 pt-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest px-2">
              Neural Assessment Ready
            </span>
            <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={!text.trim()}>
              {isAnalyzing ? "Analyzing" : "Create Lesson"}
              {!isAnalyzing && <Sparkles className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};