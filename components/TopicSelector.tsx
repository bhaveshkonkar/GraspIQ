import React from 'react';
import { SubTopic } from '../types';
import { Button } from './Button';
import { ArrowLeft, Box, ChevronRight } from 'lucide-react';

interface Props {
  topics: SubTopic[];
  onSelect: (topic: SubTopic) => void;
  onBack: () => void;
}

export const TopicSelector: React.FC<Props> = ({ topics, onSelect, onBack }) => {
  return (
    <div className="h-full p-6 md:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center gap-6 mb-12">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-white">Select Module</h2>
            <p className="text-sm text-gray-400">Choose a topic to begin the AR session</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic, index) => (
            <div 
              key={topic.id}
              onClick={() => onSelect(topic)}
              className="glass-panel p-6 rounded-3xl cursor-pointer hover:bg-white/5 transition-all duration-300 group flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Box className="text-gray-600 group-hover:text-blue-400 transition-colors w-6 h-6" />
                </div>
                
                <h3 className="font-medium text-xl text-white mb-3 group-hover:text-blue-100 transition-colors">
                  {topic.title}
                </h3>
                
                <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                  {topic.description}
                </p>
              </div>

              <div className="mt-6 flex items-center text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
                Start Session <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};