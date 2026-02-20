import React, { useState, useEffect } from 'react';
import { LessonInput } from './components/LessonInput';
import { TopicSelector } from './components/TopicSelector';
import { ARSession } from './components/ARSession';
import { AppMode, SubTopic, SceneConfig } from './types';
import { Layout } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.INSTRUCTOR);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<SubTopic | null>(null);

  // Transition to Topic Selection after analysis
  const handleAnalysisComplete = (topics: SubTopic[]) => {
    setSubTopics(topics);
    setMode(AppMode.STUDENT_SELECTION);
  };

  // Transition to AR Session
  const handleTopicSelect = (topic: SubTopic) => {
    setSelectedTopic(topic);
    setMode(AppMode.AR_SESSION);
  };

  const handleBackToTopics = () => {
    setMode(AppMode.STUDENT_SELECTION);
    setSelectedTopic(null);
  };

  const handleBackToInput = () => {
    setMode(AppMode.INSTRUCTOR);
    setSubTopics([]);
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black text-white">
      {/* Background Decor (only visible if not in AR mode with camera) */}
      {mode !== AppMode.AR_SESSION && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-900/20 rounded-full blur-[120px] opacity-60" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-900/20 rounded-full blur-[120px] opacity-60" />
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 h-full w-full">
        {mode === AppMode.INSTRUCTOR && (
          <LessonInput onAnalyzeComplete={handleAnalysisComplete} />
        )}

        {mode === AppMode.STUDENT_SELECTION && (
          <TopicSelector 
            topics={subTopics} 
            onSelect={handleTopicSelect} 
            onBack={handleBackToInput}
          />
        )}

        {mode === AppMode.AR_SESSION && selectedTopic && (
          <ARSession 
            topic={selectedTopic} 
            onExit={handleBackToTopics} 
          />
        )}
      </main>
    </div>
  );
};

export default App;