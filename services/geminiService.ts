import { GoogleGenAI, Type } from "@google/genai";
import { SubTopic, SceneConfig, AdaptiveMCQ, ConceptModel, UserSkillProfile, IntelligenceReport } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "AIzaSyA2Q8Tw_vk4DA0PPurNcBAavWa3hKj8QW4" });

const modelFlash = 'gemini-2.5-flash';
const modelTTS = 'gemini-2.5-flash-preview-tts';

const VERIFIED_MODELS: Record<string, string> = {
  'brain': '36870e0970f044a8957b0af3a180a7eb',
  'neuron': '36870e0970f044a8957b0af3a180a7eb',
  'female reproductive': '6d9b33568caa4eebbd6c875b51e6a488',
  'uterus': '6d9b33568caa4eebbd6c875b51e6a488',
  'male reproductive': 'd66a297de2fd4400a6833417e7185fcf',
  'reproductive': 'd66a297de2fd4400a6833417e7185fcf',
  'liver': 'a20686a3e4a54792bfede17ad32f4b1a',
  'kidney': '0dea52d6f6a848ab8f2cdc3f5b3ba212',
  'renal': '0dea52d6f6a848ab8f2cdc3f5b3ba212',
  'stomach': '883a3c7db5df448bb88981e69ba9b7a1',
  'digestive': '883a3c7db5df448bb88981e69ba9b7a1',
  'lung': '50c877863fe64d11a55044afb79f5664',
  'respiratory': '50c877863fe64d11a55044afb79f5664',
  'cell': 'fabbdeaf2f07493eaf90d6d5eacb26dc',
  'membrane': 'fabbdeaf2f07493eaf90d6d5eacb26dc',
  'atom': '6a283d5b19c34e2b8fcfc6907b231aea',
  'molecule': '6a283d5b19c34e2b8fcfc6907b231aea',
  'seed': 'ba5ad0540c7e4d8991f4450b93c27d2e',
  'germination': 'ba5ad0540c7e4d8991f4450b93c27d2e',
  'flower': 'ec27cb8304964ad4b68ce877e2fd505a',
  'petal': 'ec27cb8304964ad4b68ce877e2fd505a',
  'gear': '7ea57b02a5bc40c2adaeffcf795b4202',
  'motor': 'c79f5fcf8a0043b5baf2d75750349b5f',
  'circuit': 'c79f5fcf8a0043b5baf2d75750349b5f',
  'ktm': '36d3caaa7a564221bf09e888c4bd8d76',
  'motorcycle': '36d3caaa7a564221bf09e888c4bd8d76',
  '390': '36d3caaa7a564221bf09e888c4bd8d76',
  'v8': 'eea9d9252ab14298b50699a471dc2cee',
  'engine': 'eea9d9252ab14298b50699a471dc2cee',
  'taj mahal': '7b43e635cbfb47719d5a124302b78579',
  'monument': '7b43e635cbfb47719d5a124302b78579'
};

export const analyzeLessonText = async (text: string): Promise<SubTopic[]> => {
  const breakdownPrompt = `
    You are an AI Interview & Concept Mastery Engine. 
    Analyze the following text and break it into high-impact educational sub-topics for a 3D assessment.
    Return a JSON array of sub-topics with 'id', 'title', and 'description'.
    Text: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelFlash,
      contents: breakdownPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ['id', 'title', 'description']
          }
        }
      }
    });
    let topics = JSON.parse(response.text || '[]');

    // Local Lookup (Priority to specific phrases)
    const sortedKeys = Object.keys(VERIFIED_MODELS).sort((a, b) => b.length - a.length);
    topics = topics.map((t: any) => {
      const searchStr = (t.title + " " + t.description).toLowerCase();
      const matchedKey = sortedKeys.find(k => searchStr.includes(k));
      return matchedKey ? { ...t, sketchfabId: VERIFIED_MODELS[matchedKey] } : t;
    });

    return topics;
  } catch (e) {
    console.error("Analysis failed", e);
    return [];
  }
};

export const generateSceneConfig = async (topic: SubTopic): Promise<SceneConfig> => {
  // IMPORTANT: Never ask AI to generate a sketchfabId — it will hallucinate.
  // Always use the ID already matched from VERIFIED_MODELS in analyzeLessonText.
  const verifiedId = topic.sketchfabId || 'eea9d9252ab14298b50699a471dc2cee'; // fallback: V8 engine

  const prompt = `
    Analyze the topic: "${topic.title} - ${topic.description}"
    1. Create a "Concept Understanding Model" (mainConcept, subtopics, difficulty, density, cognitiveLoad, potentialMisconceptions).
    2. Write an "Explanation Script" (max 150 words) that is deep and interview-grade.
    3. Generate 3-5 fallback labels for a 3D model of this topic.
    4. Generate 5 Adaptive MCQs:
       - Must include 4 options, 1 correct index.
       - Include trickiness score (1-10) and conceptTag.
       - Prioritize conceptual traps and interview-style edge cases.
    5. List 5-8 technical keywords present in the explanation.
    
    Return JSON. Do NOT include any sketchfabId field.
  `;

  const response = await ai.models.generateContent({
    model: modelFlash,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          modelType: { type: Type.STRING },
          introScript: { type: Type.STRING },
          conceptModel: {
            type: Type.OBJECT,
            properties: {
              mainConcept: { type: Type.STRING },
              subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
              difficultyLevel: { type: Type.NUMBER },
              conceptDensity: { type: Type.NUMBER },
              cognitiveLoad: { type: Type.NUMBER },
              potentialMisconceptions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['mainConcept', 'subtopics', 'difficultyLevel', 'conceptDensity', 'cognitiveLoad', 'potentialMisconceptions']
          },
          labels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                z: { type: Type.NUMBER }
              },
              required: ['id', 'name', 'x', 'y', 'z']
            }
          },
          adaptiveQuestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER },
                difficulty: { type: Type.NUMBER },
                trickiness: { type: Type.NUMBER },
                conceptTag: { type: Type.STRING },
                expectedSolveTime: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                misconceptionType: { type: Type.STRING }
              },
              required: ['id', 'question', 'options', 'correctIndex', 'difficulty', 'trickiness', 'conceptTag', 'expectedSolveTime', 'explanation']
            }
          },
          technicalKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['modelType', 'introScript', 'conceptModel', 'labels', 'adaptiveQuestions', 'technicalKeywords']
      }
    }
  });

  const config = JSON.parse(response.text || '{}');
  // Always override with our verified ID — never trust AI-generated IDs
  config.sketchfabId = verifiedId;
  config.modelType = config.modelType || topic.title;
  return config;
};

export const generateIntelligenceReport = async (profile: UserSkillProfile, concept: string): Promise<IntelligenceReport> => {
  const prompt = `
    Generate a Final Candidate Intelligence Report for concept: "${concept}".
    User Performance Data:
    - Accuracy: ${profile.accuracy}%
    - Avg Response Time: ${profile.avgResponseTime}s
    - Streak: ${profile.streak}
    - Total Questions: ${profile.totalQuestions}
    - Misconception Tags: ${profile.misconceptionTags.join(', ')}
    - Learning Velocity: ${profile.learningVelocity}
    
    Predict interview readiness and provide a concept strength map.
    Return JSON.
  `;

  const response = await ai.models.generateContent({
    model: modelFlash,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER },
          conceptStrengthMap: { type: Type.OBJECT },
          trickHandlingAbility: { type: Type.NUMBER },
          cognitiveSpeed: { type: Type.STRING },
          learningVelocity: { type: Type.NUMBER },
          calibrationType: { type: Type.STRING },
          readinessPrediction: { type: Type.STRING },
          readinessReasoning: { type: Type.STRING }
        },
        required: ['overallScore', 'conceptStrengthMap', 'trickHandlingAbility', 'cognitiveSpeed', 'learningVelocity', 'calibrationType', 'readinessPrediction', 'readinessReasoning']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};