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
    You are the GraspIQ Performance Genome Profiler, an advanced cognitive analysis engine.
    Generate a highly accurate, mathematically grounded Candidate Intelligence Report for: "${concept}".
    
    Raw Telemetry to Analyze:
    - Overall Accuracy: ${profile.accuracy}%
    - Questions Attempted: ${profile.totalQuestions}
    - Avg Response Time: ${profile.avgResponseTime}s
    - Hesitation Patterns (ms delay per question): [${profile.hesitationPatterns.map(v => (v * 1000).toFixed(0)).join(', ')}]
    - Reported Confidence (0-100% per question): [${profile.confidenceHistory.join(', ')}]
    - Correctness Streak ending at: ${profile.streak}
    - Identified Misconceptions: ${profile.misconceptionTags.join(', ')}
    - Learning Velocity (v_L): ${profile.learningVelocity}

    Instructions for Synthesizing the Performance Genome (Output strict JSON):
    1. Estimate "Avg Cognitive Load" (0.5 to 3.0 scale). High response times and high misconception tags = high load (> 1.5).
    2. Estimate "Guess Probability" (0.0 to 1.0 scale). Correct answers with high hesitation + low confidence = high guess probability.
    3. Calibration Type: Compare Accuracy vs Avg Confidence. Is the user 'Overconfident', 'Underconfident', 'Well-Calibrated', or 'Erratic'?
    4. Readiness Prediction: Only output 'Interview Ready' if Accuracy > 80%, Guess Probability < 0.35, and Calibration is Well-Calibrated. Output 'Danger: Fragile Knowledge' if Guess Probability > 0.60. Otherwise, 'Needs Practice' or 'Not Ready'.
    5. Dropout Risk Index: 'Low', 'Medium', or 'High' based on streak drops and cognitive load fatigue.
    6. Ensure overallScore (0-100) mathematically reflects actual mastery avoiding generic 80/100 scores.
    7. conceptStrengths: Generate an array of 3-5 sub-concepts related to "${concept}", setting 'conceptName' and 'strength' ('strong', 'moderate', or 'weak').
    8. cognitiveSpeed: Analyze the response time and set strictly to one of: 'Fast', 'Moderate', 'Methodical', or 'Slow'.
    9. trickHandlingAbility: Score from 1 to 10 based on how they handled the trickiness and their guess probability.
    
    Structure the JSON precisely to the schema keys without markdown blocks outside the JSON if requested natively.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelFlash,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            conceptStrengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  conceptName: { type: Type.STRING },
                  strength: { type: Type.STRING }
                },
                required: ['conceptName', 'strength']
              }
            },
            trickHandlingAbility: { type: Type.NUMBER },
            cognitiveSpeed: { type: Type.STRING },
            learningVelocity: { type: Type.NUMBER },
            calibrationType: { type: Type.STRING },
            readinessPrediction: { type: Type.STRING },
            readinessReasoning: { type: Type.STRING },
            avgCognitiveLoad: { type: Type.NUMBER },
            guessProbability: { type: Type.NUMBER },
            dropoutRiskIndex: { type: Type.STRING }
          },
          required: [
            'overallScore', 'conceptStrengths', 'trickHandlingAbility', 'cognitiveSpeed',
            'learningVelocity', 'calibrationType', 'readinessPrediction', 'readinessReasoning',
            'avgCognitiveLoad', 'guessProbability', 'dropoutRiskIndex'
          ]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');

    // Map array back to the Record expected by the UI
    const conceptMap: Record<string, 'strong' | 'moderate' | 'weak'> = {};
    if (data.conceptStrengths && Array.isArray(data.conceptStrengths)) {
      data.conceptStrengths.forEach((item: any) => {
        conceptMap[item.conceptName] = item.strength;
      });
    }

    return {
      ...data,
      conceptStrengthMap: conceptMap
    };
  } catch (err) {
    console.error('[IntelligenceReport] Gemini failed to generate report:', err);
    // Return a safe fallback rather than crashing
    return {
      overallScore: 0,
      conceptStrengthMap: {},
      trickHandlingAbility: 0,
      cognitiveSpeed: 'Unknown' as any,
      learningVelocity: 0,
      calibrationType: 'Erratic',
      readinessPrediction: 'Danger: Fragile Knowledge',
      readinessReasoning: 'Analysis engine failure. Insufficient telemetry.',
      avgCognitiveLoad: 0,
      guessProbability: 1.0,
      dropoutRiskIndex: 'High'
    };
  }
};