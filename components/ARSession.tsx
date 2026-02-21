import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SubTopic, SceneConfig, AdaptiveMCQ, UserSkillProfile, IntelligenceReport } from '../types';
import { generateSceneConfig, generateIntelligenceReport } from '../services/geminiService';
import {
  X, Brain, Zap, Target, BarChart3, ChevronRight, Award,
  CheckCircle2, AlertTriangle, Timer, TrendingUp, Activity,
  Cpu, Flame, Eye, ArrowUpRight
} from 'lucide-react';

interface Props {
  topic: SubTopic;
  onExit: () => void;
}

// ─── Lightweight in-memory analytics ──────────────────────────────────────
interface SessionAnalytics {
  questionLog: { q: number; correct: boolean; responseMs: number; confidence: number; trickiness: number }[];
  learningVelocitySlope: number;
  guessProbability: number;
  consecutiveWrong: number;
}

// ─── Transcript segment ────────────────────────────────────────────────────
interface CaptionSegment {
  text: string;
  isTech: boolean;
  id: number;
}

export const ARSession: React.FC<Props> = ({ topic, onExit }) => {
  const [config, setConfig] = useState<SceneConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);

  // ── Adaptive engine ──────────────────────────────────────────────────────
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveMCQ | null>(null);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<UserSkillProfile>({
    accuracy: 0, avgResponseTime: 0, streak: 0, totalQuestions: 0,
    misconceptionTags: [], learningVelocity: 0, confidenceHistory: [], hesitationPatterns: []
  });
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    questionLog: [], learningVelocitySlope: 0, guessProbability: 0, consecutiveWrong: 0
  });
  const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'medium' | 'hard'>('medium');

  // ── Transcription ────────────────────────────────────────────────────────
  const [captionSegments, setCaptionSegments] = useState<CaptionSegment[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const captionsEndRef = useRef<HTMLDivElement>(null);
  const segmentId = useRef(0);

  // ── Question interaction ─────────────────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string; insight?: string } | null>(null);
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false);
  const [confidenceValue, setConfidenceValue] = useState(50);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Micro-explanation ────────────────────────────────────────────────────
  const [microExplanation, setMicroExplanation] = useState<string | null>(null);

  // ── Report ───────────────────────────────────────────────────────────────
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  // ── Camera / AR ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ── Guards ───────────────────────────────────────────────────────────────
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const explanationDoneRef = useRef(false);

  // ════════════════════════════════════════════════════════════════════════
  // CAMERA — mount immediately so videoRef is always ready
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        let stream: MediaStream;
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
        catch { stream = await navigator.mediaDevices.getUserMedia({ video: true }); }
        if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true); }
      } catch { setCameraActive(false); }
    })();
    return () => {
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // MAIN INIT
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    (async () => {
      try {
        setAiThinking(true);
        const cfg = await generateSceneConfig(topic);
        setConfig(cfg);
        setAiThinking(false);
        setLoading(false);
        startExplanation(cfg);
      } catch (e) {
        console.error('Init failed', e);
        onExit();
      }
    })();
    return () => { window.speechSynthesis.cancel(); clearInterval(timerRef.current!); };
  }, [topic]);

  // ════════════════════════════════════════════════════════════════════════
  // AUTO-SCROLL captions
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captionSegments]);

  // ════════════════════════════════════════════════════════════════════════
  // EXPLANATION SPEECH + REAL-TIME TRANSCRIPTION
  // ════════════════════════════════════════════════════════════════════════
  const startExplanation = (cfg: SceneConfig) => {
    explanationDoneRef.current = false;

    const utterance = new SpeechSynthesisUtterance(cfg.introScript);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;

    utterance.onstart = () => setIsSpeaking(true);

    // Word-by-word streaming into segments
    utterance.onboundary = (event) => {
      if (event.name !== 'word') return;
      const word = cfg.introScript.substring(event.charIndex, event.charIndex + event.charLength);
      const isTech = cfg.technicalKeywords?.some(k => word.toLowerCase().includes(k.toLowerCase())) ?? false;
      setCaptionSegments(prev => {
        // Start a new segment every ~8 words or at sentence boundaries
        const lastSeg = prev[prev.length - 1];
        const wordCount = lastSeg?.text.split(' ').length ?? 0;
        if (!lastSeg || wordCount >= 8 || word.endsWith('.') || word.endsWith(',')) {
          return [...prev.slice(-3), { text: word, isTech, id: segmentId.current++ }];
        }
        return [...prev.slice(0, -1), { ...lastSeg, text: lastSeg.text + ' ' + word, isTech: lastSeg.isTech || isTech }];
      });
    };

    const onDone = () => {
      if (explanationDoneRef.current) return;
      explanationDoneRef.current = true;
      setIsSpeaking(false);
      setTimeout(() => {
        setCaptionSegments([]);
        beginQuestions(cfg, 0);
      }, 1200);
    };

    utterance.onend = onDone;
    utterance.onerror = onDone;

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    // Failsafe timer
    const words = cfg.introScript.split(' ').length;
    setTimeout(() => { if (!explanationDoneRef.current) onDone(); }, (words / 2.1) * 1000 + 2500);
  };

  // ════════════════════════════════════════════════════════════════════════
  // ADAPTIVE QUESTION ENGINE
  // ════════════════════════════════════════════════════════════════════════
  const beginQuestions = useCallback((cfg: SceneConfig, idx: number) => {
    if (idx >= cfg.adaptiveQuestions.length) { finalizeSession(); return; }

    const q = cfg.adaptiveQuestions[idx];
    setCurrentQuestion({ ...q, id: String(idx) });
    setIsQuestionActive(true);
    setQuestionIndex(idx);
    setStartTime(Date.now());
    setSelectedIdx(null);
    setFeedback(null);
    setMicroExplanation(null);

    // Countdown timer
    const solveSec = q.expectedSolveTime || 30;
    setTimeLeft(solveSec);
    setTimerActive(true);
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          // Time's up — treat as wrong with maximum hesitation
          handleAnswerSubmit(-1, idx, cfg, solveSec * 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleAnswerSelect = (idx: number) => {
    if (feedback || selectedIdx !== null || !currentQuestion || !config) return;
    clearInterval(timerRef.current!);
    setTimerActive(false);
    setSelectedIdx(idx);
    const elapsed = Date.now() - startTime;
    handleAnswerSubmit(idx, questionIndex, config, elapsed);
  };

  const handleAnswerSubmit = (
    chosenIdx: number,
    qIdx: number,
    cfg: SceneConfig,
    elapsedMs: number
  ) => {
    if (!cfg.adaptiveQuestions[qIdx]) return;
    const q = cfg.adaptiveQuestions[qIdx];
    const isCorrect = chosenIdx === q.correctIndex;
    const elapsedSec = elapsedMs / 1000;

    setFeedback({ isCorrect, text: isCorrect ? `✓ ${q.explanation}` : `✗ ${q.explanation}` });
    setShowConfidencePrompt(true);

    // ── Update profile ────────────────────────────────────────────────────
    setUserProfile(prev => {
      const newTotal = prev.totalQuestions + 1;
      const newAcc = ((prev.accuracy * prev.totalQuestions) + (isCorrect ? 100 : 0)) / newTotal;
      const newAvgRT = ((prev.avgResponseTime * prev.totalQuestions) + elapsedSec) / newTotal;
      return {
        ...prev,
        totalQuestions: newTotal,
        accuracy: Math.round(newAcc),
        streak: isCorrect ? prev.streak + 1 : 0,
        avgResponseTime: Math.round(newAvgRT * 10) / 10,
        hesitationPatterns: [...prev.hesitationPatterns, elapsedSec],
      };
    });

    // ── Update analytics ──────────────────────────────────────────────────
    setAnalytics(prev => {
      const newLog = [...prev.questionLog, { q: qIdx, correct: isCorrect, responseMs: elapsedMs, confidence: confidenceValue, trickiness: q.trickiness }];
      const wrong = isCorrect ? 0 : prev.consecutiveWrong + 1;
      // Learning velocity: slope of correct answers over time
      const correctArr = newLog.map((l, i) => l.correct ? i + 1 : 0).filter(Boolean);
      const slope = correctArr.length > 1 ? (correctArr[correctArr.length - 1] - correctArr[0]) / correctArr.length : 0;
      return { ...prev, questionLog: newLog, consecutiveWrong: wrong, learningVelocitySlope: Math.round(slope * 10) / 10 };
    });

    // ── Adapt difficulty ──────────────────────────────────────────────────
    setUserProfile(prev => {
      if (prev.streak >= 3) setDifficultyLevel('hard');
      else if (prev.streak === 0 && prev.totalQuestions > 2) setDifficultyLevel('easy');
      else setDifficultyLevel('medium');
      return prev;
    });

    // ── Consecutive failure → micro-explanation ───────────────────────────
    if (!isCorrect) {
      setAnalytics(prev => {
        if (prev.consecutiveWrong >= 2) {
          const misconception = q.misconceptionType || 'a common conceptual trap';
          setMicroExplanation(`💡 Quick insight: This tests understanding of "${q.conceptTag}". Watch out for ${misconception}.`);
        }
        return prev;
      });
    }
  };

  const handleConfidenceSubmit = () => {
    if (!currentQuestion || !config) return;
    const isCorrect = selectedIdx === currentQuestion.correctIndex;
    const conf = confidenceValue;

    // Confidence intelligence insight
    let insight = '';
    if (isCorrect && conf < 40) insight = '🔍 Correct but uncertain — trust your instincts more.';
    if (!isCorrect && conf > 70) insight = '⚠️ Overconfidence detected — review this concept.';
    if (isCorrect && conf > 80) insight = '🎯 High confidence + correct — strong mastery!';
    if (insight) setFeedback(prev => prev ? { ...prev, insight } : prev);

    setUserProfile(prev => ({
      ...prev,
      confidenceHistory: [...prev.confidenceHistory, conf],
    }));
    setAnalytics(prev => {
      const last = prev.questionLog[prev.questionLog.length - 1];
      if (last) last.confidence = conf;
      const guesses = prev.questionLog.filter(l => !l.correct && l.confidence > 60).length;
      return { ...prev, guessProbability: Math.round((guesses / Math.max(prev.questionLog.length, 1)) * 100) };
    });

    setTimeout(() => {
      setShowConfidencePrompt(false);
      setIsQuestionActive(false);
      setFeedback(null);
      setSelectedIdx(null);
      setMicroExplanation(null);
      setConfidenceValue(50);
      const nextIdx = Number(currentQuestion.id) + 1;
      beginQuestions(config, nextIdx);
    }, 2200);
  };

  const finalizeSession = async () => {
    setLoading(true);
    setAiThinking(true);
    const r = await generateIntelligenceReport(userProfile, topic.title);
    setReport(r);
    setShowReport(true);
    setAiThinking(false);
    setLoading(false);
  };

  // ════════════════════════════════════════════════════════════════════════
  // CAMERA ELEMENT (always mounted)
  // ════════════════════════════════════════════════════════════════════════
  const CameraLayer = (
    <video
      ref={videoRef} autoPlay playsInline muted
      className="absolute inset-0 w-full h-full object-cover z-0"
      style={{ display: cameraActive ? 'block' : 'none' }}
    />
  );

  // ════════════════════════════════════════════════════════════════════════
  // LOADING SCREEN
  // ════════════════════════════════════════════════════════════════════════
  if (loading && !config) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full bg-[#020617] text-white font-sans overflow-hidden">
        {CameraLayer}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-blue-500/30 blur-xl animate-pulse" />
            {/* Orbit ring */}
            <div className="absolute inset-[-12px] rounded-full border border-blue-500/20 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-2 h-2 bg-blue-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-blue-400/70 uppercase tracking-[0.4em] font-bold mb-2">
              {aiThinking ? 'Building Concept Model' : 'Initializing'}
            </p>
            <div className="flex gap-1 justify-center">
              {['Analyzing', 'Structuring', 'Generating'].map((s, i) => (
                <span key={s} className="text-xs text-slate-500 px-2 py-0.5 bg-white/5 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}>{s}</span>
              ))}
            </div>
          </div>
          {/* Shimmer bar */}
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════
  const timerPct = currentQuestion ? (timeLeft / (currentQuestion.expectedSolveTime || 30)) * 100 : 100;
  const timerColor = timerPct > 50 ? 'bg-emerald-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`relative h-full w-full overflow-hidden text-slate-100 font-sans ${cameraActive ? 'bg-black' : 'bg-[#020617]'}`}>

      {/* ── Layer 0: Camera AR background ──────────────────────────────── */}
      {CameraLayer}
      {!cameraActive && <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#020617] via-[#0a0f2e] to-[#020617]" />}

      {/* ── Layer 1: 3D Model (transparent over camera) ─────────────────── */}
      <div className="absolute inset-0 z-10">
        {config?.sketchfabId && (
          <iframe
            className="w-full h-full pointer-events-auto"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            frameBorder="0"
            allowTransparency={true}
            src={`https://sketchfab.com/models/${config.sketchfabId}/embed?autostart=1&transparent=1&ui_controls=1&ui_infos=0&ui_watermark=0&ui_animations=0`}
          />
        )}
      </div>

      {/* ── Layer 2: Analytics HUD (top-right) ──────────────────────────── */}
      <div className="absolute top-4 right-4 z-30 flex gap-2 pointer-events-none">
        {[
          { icon: <Target className="w-3 h-3" />, label: 'Accuracy', value: `${userProfile.accuracy}%`, color: 'text-emerald-400' },
          { icon: <Flame className="w-3 h-3" />, label: 'Streak', value: String(userProfile.streak), color: 'text-amber-400' },
          { icon: <Activity className="w-3 h-3" />, label: 'Velocity', value: `${analytics.learningVelocitySlope}x`, color: 'text-blue-400' },
          { icon: <Eye className="w-3 h-3" />, label: 'Difficulty', value: difficultyLevel.toUpperCase(), color: difficultyLevel === 'hard' ? 'text-red-400' : difficultyLevel === 'easy' ? 'text-emerald-400' : 'text-amber-400' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="px-3 py-2 flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl">
            <span className={color}>{icon}</span>
            <div>
              <p className="text-[8px] uppercase tracking-wider text-slate-500 font-bold leading-none">{label}</p>
              <p className={`text-xs font-black ${color} leading-tight`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Layer 3: Main UI (pointer-events-none passthrough) ──────────── */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 pointer-events-none">

        {/* Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Cpu className="w-2.5 h-2.5 text-blue-400" />
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Adaptive AI Engine</span>
              </div>
              {aiThinking && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                  <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" />
                  <span className="text-[8px] text-purple-400 font-bold uppercase">AI Analyzing…</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex gap-0.5 items-end h-3">
                  {[1, 2, 1.5, 2, 1].map((h, i) => (
                    <div key={i} className="w-0.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ height: `${h * 6}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-lg">{topic.title}</h1>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {config?.conceptModel.subtopics.slice(0, 4).map((s, i) => (
                <span key={i} className="text-[9px] text-slate-400 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/5">{s}</span>
              ))}
            </div>
          </div>
          <button onClick={onExit} className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 rounded-full transition-all group pointer-events-auto">
            <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </button>
        </div>

        {/* ── REAL-TIME CAPTIONS ───────────────────────────────────────── */}
        {isSpeaking && captionSegments.length > 0 && (
          <div className="max-w-xl mx-auto w-full mb-6 pointer-events-none">
            <div className="space-y-1 max-h-[80px] overflow-hidden">
              {captionSegments.map((seg, i) => (
                <div
                  key={seg.id}
                  className={`text-sm leading-relaxed font-medium transition-all duration-300 ${i === captionSegments.length - 1 ? 'opacity-100' : 'opacity-40'
                    }`}
                >
                  {seg.text.split(' ').map((word, wi) => {
                    const isTech = config?.technicalKeywords?.some(k => word.toLowerCase().includes(k.toLowerCase()));
                    return (
                      <span key={wi} className={`mx-0.5 ${isTech ? 'text-blue-400 font-bold' : 'text-white/80'}`}>
                        {word}
                      </span>
                    );
                  })}
                </div>
              ))}
              <div ref={captionsEndRef} />
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div />
      </div>

      {/* ── Layer 4: Floating MCQ Panel (left side, spring slide) ────────── */}
      <div
        className={`fixed left-0 top-1/2 -translate-y-1/2 w-[420px] z-40 pointer-events-auto
          transition-all duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isQuestionActive ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}
        style={{ filter: isQuestionActive ? 'drop-shadow(0 0 30px rgba(99,102,241,0.3))' : 'none' }}
      >
        {currentQuestion && (
          <div className="m-3 rounded-[2rem] bg-slate-900/95 backdrop-blur-3xl border border-white/10 overflow-hidden">
            {/* Timer bar */}
            <div className="h-1 w-full bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ${timerColor}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>

            <div className="p-6">
              {/* Meta row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black
                    ${difficultyLevel === 'hard' ? 'bg-red-500/20 text-red-400' :
                      difficultyLevel === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-amber-500/20 text-amber-400'}`}>
                    {currentQuestion.difficulty}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{currentQuestion.conceptTag}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3 h-3 text-slate-500" />
                  <span className={`text-xs font-black tabular-nums ${timerPct < 30 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                    {timeLeft}s
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ml-1 ${currentQuestion.trickiness >= 8 ? 'bg-red-500 animate-pulse' :
                    currentQuestion.trickiness >= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    title={`Trickiness: ${currentQuestion.trickiness}/10`}
                  />
                </div>
              </div>

              {/* Question */}
              <h2 className="text-base font-bold text-white mb-5 leading-snug">{currentQuestion.question}</h2>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedIdx === idx;
                  const isCorrectOpt = idx === currentQuestion.correctIndex;
                  let cls = 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-indigo-500/40 hover:text-white';
                  if (feedback) {
                    if (isCorrectOpt) cls = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100';
                    else if (isSelected && !isCorrectOpt) cls = 'bg-red-500/15 border-red-500/40 text-red-200';
                    else cls = 'opacity-25 border-white/5 text-slate-400';
                  } else if (isSelected) {
                    cls = 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={!!feedback}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between text-sm font-medium group ${cls}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {opt}
                      </span>
                      {feedback && isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {feedback && isSelected && !isCorrectOpt && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                      {!feedback && <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 shrink-0 transition-transform group-hover:translate-x-0.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback + micro-explanation */}
              {feedback && (
                <div className={`mt-4 px-4 py-3 rounded-xl text-xs font-medium leading-relaxed border
                  ${feedback.isCorrect
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
                  {feedback.text}
                  {feedback.insight && <p className="mt-1 text-blue-300 italic">{feedback.insight}</p>}
                </div>
              )}
              {microExplanation && (
                <div className="mt-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-200">
                  {microExplanation}
                </div>
              )}

              {/* Confidence slider */}
              {feedback && showConfidencePrompt && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence in answer</p>
                    <span className="text-sm font-black text-white">{confidenceValue}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={confidenceValue}
                    onChange={e => setConfidenceValue(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-slate-700"
                  />
                  <div className="flex justify-between text-[8px] text-slate-600 mt-1">
                    <span>Guessing</span><span>Uncertain</span><span>Confident</span>
                  </div>
                  <button
                    onClick={handleConfidenceSubmit}
                    className="w-full mt-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Submit & Continue →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Layer 5: Final Intelligence Report ──────────────────────────── */}
      {showReport && report && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-2xl">
          <div className="w-full max-w-4xl bg-[#080d1a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="overflow-y-auto max-h-[90vh] p-10">

              {/* Title row */}
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] text-blue-400 uppercase tracking-[0.3em] font-bold mb-1">Session Complete</p>
                    <h2 className="text-3xl font-black text-white tracking-tight">Performance Genome</h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Grasping Power</p>
                  <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-400 leading-none">
                    {report.overallScore}
                  </p>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-2 ml-auto overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${report.overallScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Stat cards (Now 6 metrics) */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: 'Accuracy', value: `${userProfile.accuracy}%`, sub: `${userProfile.totalQuestions} questions`, color: 'border-emerald-500/20', icon: <Target className="w-4 h-4 text-emerald-400" /> },
                  { label: 'Guess Prob', value: `${((report.guessProbability || 0) * 100).toFixed(0)}%`, sub: 'fragile pass risk', color: (report.guessProbability > 0.6) ? 'border-red-500/40 bg-red-500/10' : 'border-blue-500/20', icon: <Activity className={`w-4 h-4 ${report.guessProbability > 0.6 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} /> },
                  { label: 'Fatigue / Load', value: `${(report.avgCognitiveLoad || 1.0).toFixed(2)}x`, sub: 'deviation from norm', color: 'border-purple-500/20', icon: <Brain className="w-4 h-4 text-purple-400" /> },
                  { label: 'Calibration', value: report.calibrationType, sub: 'confidence type', color: 'border-indigo-500/20', icon: <Eye className="w-4 h-4 text-indigo-400" /> },
                  { label: 'Velocity', value: `${report.learningVelocity?.toFixed(1) ?? '0.0'}x`, sub: 'learning rate', color: 'border-amber-500/20', icon: <TrendingUp className="w-4 h-4 text-amber-400" /> },
                  { label: 'Dropout Risk', value: report.dropoutRiskIndex || 'Unknown', sub: 'frustration index', color: report.dropoutRiskIndex === 'High' ? 'border-red-500/40 bg-red-500/10' : 'border-slate-500/20', icon: <AlertTriangle className={`w-4 h-4 ${report.dropoutRiskIndex === 'High' ? 'text-red-500' : 'text-slate-400'}`} /> },
                ].map(({ label, value, sub, color, icon }) => (
                  <div key={label} className={`p-4 rounded-2xl bg-white/5 border ${color} relative overflow-hidden`}>
                    <div className="flex items-center gap-2 mb-2 relative z-10">{icon}<p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{label}</p></div>
                    <p className={`text-xl font-black relative z-10 ${label === 'Danger: Fragile Knowledge' ? 'text-red-400' : 'text-white'}`}>{value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 relative z-10">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Readiness + Mastery grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Readiness Prediction */}
                <div className={`p-6 rounded-2xl border ${report.readinessPrediction === 'Interview Ready' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]' :
                  report.readinessPrediction.includes('Danger') ? 'bg-red-950/40 border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]' :
                    'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {report.readinessPrediction.includes('Danger') ? <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" /> : <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Readiness Prediction</p>
                  </div>
                  <p className={`text-2xl font-black mb-2 ${report.readinessPrediction.includes('Danger') ? 'text-red-400' : 'text-white'}`}>{report.readinessPrediction}</p>
                  <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-white/20 pl-3">"{report.readinessReasoning}"</p>
                </div>

                {/* Concept strength map */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-4">Concept Mastery Map</p>
                  <div className="space-y-2">
                    {Object.entries(report.conceptStrengthMap || {}).length > 0 ? (
                      Object.entries(report.conceptStrengthMap).slice(0, 5).map(([concept, strength]) => (
                        <div key={concept} className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 truncate flex-1 mr-2">{concept}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${strength === 'strong' ? 'w-full bg-emerald-500' : strength === 'moderate' ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-red-500'}`} />
                            </div>
                            <span className={`text-[8px] font-black uppercase w-12 ${strength === 'strong' ? 'text-emerald-400' : strength === 'moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                              {strength === 'strong' ? '🟢' : strength === 'moderate' ? '🟡' : '🔴'} {strength}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-black/20">
                        <AlertTriangle className="w-4 h-4 text-slate-500 mb-2" />
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Insufficient Data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cognitive speed */}
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#0b1224] border border-blue-500/20 mb-8 shadow-inner">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Kinematic processing signature</p>
                  <p className="text-base font-black text-white flex items-center gap-2">
                    {report.cognitiveSpeed || 'Unknown'} Thinker
                    <span className="text-xs font-medium text-slate-400 border border-white/10 px-2 py-0.5 rounded-md bg-white/5">
                      Trick Handling: {report.trickHandlingAbility || '0'}/10
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={onExit}
                className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl text-sm"
              >
                Exit Session →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ambient glow (behind model) ──────────────────────────────────── */}
      {!cameraActive && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
      )}
    </div>
  );
};