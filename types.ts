export enum AppMode {
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT_SELECTION = 'STUDENT_SELECTION',
  AR_SESSION = 'AR_SESSION'
}

export interface SubTopic {
  id: number;
  title: string;
  description: string;
  sketchfabId?: string;
}

export interface Label {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  z: number; // simulated depth
}

export interface AdaptiveMCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: number; // 1-10
  trickiness: number; // 1-10
  conceptTag: string;
  expectedSolveTime: number; // in seconds
  explanation: string;
  misconceptionType?: string;
}

export interface ConceptModel {
  mainConcept: string;
  subtopics: string[];
  difficultyLevel: number;
  conceptDensity: number;
  cognitiveLoad: number;
  potentialMisconceptions: string[];
}

export interface SceneConfig {
  modelType: string;
  sketchfabId: string;
  introScript: string;
  labels: Label[];
  conceptModel: ConceptModel;
  adaptiveQuestions: AdaptiveMCQ[];
  technicalKeywords: string[];
}

export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  shouldRetry: boolean;
}

export interface UserSkillProfile {
  accuracy: number;
  avgResponseTime: number;
  streak: number;
  totalQuestions: number;
  misconceptionTags: string[];
  learningVelocity: number;
  confidenceHistory: number[];
  hesitationPatterns: number[]; // ms delay before answering
}

export interface IntelligenceReport {
  overallScore: number; // 0-100
  conceptStrengthMap: Record<string, 'strong' | 'moderate' | 'weak'>;
  trickHandlingAbility: number;
  cognitiveSpeed: 'Fast' | 'Moderate' | 'Slow';
  learningVelocity: number;
  calibrationType: 'Overconfident' | 'Underconfident' | 'Well-Calibrated';
  readinessPrediction: 'Not Ready' | 'Needs Practice' | 'Interview Ready';
  readinessReasoning: string;
}