# GraspIQ: Adaptive Learning Architecture & Performance Genome

## 1. System Overview
Traditional learning platforms treat students as uniform receivers of information, relying on static quizzes and basic accuracy metrics to model "knowledge". **GraspIQ** fundamentally shifts this paradigm by building a real-time, multidimensional mathematical model of the student's cognition—the **Performance Genome**. 

The GraspIQ engine acts as a continuous **Cognitive Signal Processor**. During an immersive AR session, it actively probes student understanding, measuring not just *if* an answer is right or wrong, but the kinematic and metacognitive path taken to arrive at the answer. It combines **Response Kinematics** (hesitation, time-to-answer vs expected baseline) with **Metacognitive Calibration** (reported confidence vs actual accuracy) and dynamic **Trickiness Weighting**. 

By processing these signals through a real-time decision engine, GraspIQ detects knowledge decay, calculates exact guess probabilities, predicts dropout risk, and forecasts true interview/exam readiness.

---

## 2. Core Innovation
**The Delta vs. Duolingo, Coursera, and LeetCode**
- **Coursera/Duolingo**: Rely on static Mastery Trees (Item Response Theory/ELO). "You scored 80%. Move to module 2."
- **LeetCode**: Relies on static difficulty tiers (Easy/Medium/Hard) and binary acceptance. 
- **GraspIQ Innovation**: We implement **Metacognitive & Kinematic Trace Analysis**. We do not just measure what a student knows; we measure *how deeply they know it*. 
  - If a student answers correctly but exhibits a 6.4-second hesitation combined with 40% confidence on a "trick" option, the system calculates an 82% Guess Probability. It flags the "knowledge" as fragile and immediately adapts by lowering the cognitive load of the next question while injecting an AR micro-intervention.
  - **For Judges**: The innovation lies in predicting fragile knowledge *before* the student fails an actual exam, utilizing the precise multi-modal inputs uniquely afforded by interactive spatial computing (AR).

---

## 3. Architecture Diagram 
```text
[ Client AR Interface (Spatial Computing Layer) ]
      │
      ├─► Telemetry: { Correctness, ResponseTime (ms), Confidence (0-100) }
      │
[ Kinematic & Cognitive Processor (Edge / Real-Time) ]
      │
      ├─► Calculates: GuessProbability, CognitiveLoad
      ├─► Struggle Detector ──(Trigger)──> [ AR Micro-Intervention Generator ]
      ├─► Difficulty Governor (Adaptive Step up/down)
      │
[ AI Intelligence Layer (Google Gemini 2.5) ]
      │
      ├─► Concept Dependency Graph Generator
      ├─► Fallacy & Misconception Engine (Generates distractors)
      └─► Genome Synthesizer (Analyzes Profile → Interview Readiness Prediction)
      │
[ Backend Data Pipeline & Knowledge Tracer ]
      │
      ├─► Postgres Database (Supabase)
      ├─► Retention Scheduler (Bayesian Knowledge Tracing)
      └─► Dropout Risk Indexer
```

---

## 4. Analytics Engine Design

The core Analytics Engine computes the following real-time signals during the session:

**1. Cognitive Load Estimation**
Quantifies real-time mental effort based on deviation from expected normative performance.
$$CL = \left( \frac{t_{\text{response}}}{t_{\text{expected}}} \right) + (S_{\text{error}} \cdot \gamma)$$
Where $S_{\text{error}}$ is the consecutive error streak and $\gamma$ is the frustration penalty coefficient.

**2. Guess Probability ($P(G)$)**
A heuristic model detecting correct but unmastered answers.
$$P(G) = \sigma \Big(\alpha (\text{Trickiness}) - \beta (\text{Confidence}) + \delta (\text{HesitationRatio}) \Big)$$
*If $P(G) > 0.70$, the answer is treated as a "Fragile Pass" rather than a Mastered concept.*

**3. Mastery Scoring Formula**
Updates the student's mastery vector per concept tag $c$.
$$M_c(new) = M_c(old) + \eta \left( A_c - P(G) \right) \cdot \text{Difficulty}$$
Where $\eta$ is learning rate and $A_c$ is boolean accuracy (1 or 0). 

**4. Learning Velocity ($v_L$)**
The derivative of Mastery across $n$ questions. Identifies quick learners vs. plateauing concepts.
$$v_L = \frac{dM}{dq} \approx \frac{M_{q} - M_{q-k}}{k}$$

**5. Retention Decay Predictor (Ebbinghaus Integration)**
Models forgetting curves. Memory strength $R$ at time $t$ relative to initial Mastery $M$:
$$R(t) = M \cdot e^{-\frac{t}{S}}$$
Where $S$ is relative stability (increases with consecutive reinforced passes).

---

## 5. Adaptation Algorithm (Pseudocode)

```python
def process_answer(telemetry: CandidateTelemetry, question: AdaptiveQuestion, profile: GenomeProfile):
    
    # 1. Base Kinematics
    is_correct = (telemetry.selected == question.correct_index)
    time_ratio = telemetry.response_time_ms / question.expected_solve_ms
    
    # 2. Cognitive Load & Struggle Detection
    cog_load = time_ratio + (1.5 if not is_correct else 0.0)
    profile.update_cognitive_average(cog_load)
    
    # 3. Guessing Engine (Metacognitive check)
    if is_correct:
        guess_prob = calculate_guess_probability(telemetry.confidence, question.trickiness, time_ratio)
        if guess_prob > 0.75:
            profile.fragile_knowledge_tags.append(question.concept_tag)
    
    # 4. Learning Velocity & Mastery Update
    delta_mastery = learning_rate * (1 if is_correct else -1) * question.difficulty * (1 - guess_prob if is_correct else 1)
    profile.mastery[question.concept_tag] += delta_mastery
    
    # 5. Real-Time Adaptation Engine
    if not is_correct and profile.streak <= -2:
        # High Dropout Risk: Initiate Intervention
        trigger_ar_micro_intervention(question.concept_tag, question.misconception_type)
        return calculate_next_difficulty(target="lower", confidence_boost=True)
        
    if is_correct and profile.streak >= 3 and guess_prob < 0.3:
        # Flow State Detected: Accelerate
        return calculate_next_difficulty(target="higher", introduce_trick=True)
        
    return calculate_next_difficulty(target="maintain")
```

---

## 6. Database Schema (Postgres / Supabase)

Robust schema supporting spaced repetition and deep telemetry.

```sql
-- Core User & Session tables
CREATE TABLE users (
    id UUID PRIMARY KEY,
    global_mastery_index FLOAT,
    cognitive_speed_baseline TEXT -- 'Fast', 'Moderate', 'Methodical'
);

-- Concept Dependency Graph
CREATE TABLE concept_graph (
    concept_id VARCHAR PRIMARY KEY,
    name TEXT,
    parent_concept_id VARCHAR REFERENCES concept_graph,
    avg_learning_velocity FLOAT -- global baseline
);

-- Student Knowledge Tracing Matrix
CREATE TABLE student_knowledge_state (
    user_id UUID REFERENCES users,
    concept_id VARCHAR REFERENCES concept_graph,
    mastery_level FLOAT, -- 0.0 to 1.0
    stability_index FLOAT, -- S in the decay formula
    last_reviewed_at TIMESTAMP,
    next_review_due TIMESTAMP,
    PRIMARY KEY(user_id, concept_id)
);

-- High-Resolution Telemetry
CREATE TABLE interaction_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users,
    session_id UUID,
    concept_id VARCHAR,
    difficulty INT,
    trickiness INT,
    is_correct BOOLEAN,
    response_time_ms INT,
    reported_confidence INT,
    calc_guess_probability FLOAT,
    calc_cognitive_load FLOAT,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 7. ML Extensions (The "Learning Genome" Profiler)
While core analytics run mathematically, Google Gemini acts as the ultimate **Genome Profiler**. At the session's end, Gemini ingests the aggregated telemetry (Accuracy, Hesitation Matrix, Confidence Matrix, Streak Patterns). 

It outputs a synthesized **Prediction Vector**:
- **Calibration Type**: e.g., "Overconfident" (high confidence on wrong answers), "Underconfident" (low confidence on right answers), or "Well-Calibrated".
- **Risk Index (Dropout/Failure)**: Analyzes cognitive load fatigue sequences.
- **Interview Readiness Verdict**: Categorizes into `Not Ready / Needs Practice / Interview Ready` with explainable, data-backed reasoning.

---

## 8. Demo Strategy for Judges
To maximize impact during a Hackathon or pitch, execute the following script:

1. **The Overconfident Trap (Showcase Metacognition)**: 
   - *Action*: During the AR session, answer a question incorrectly, but slide the "Confidence" slider up to 90%. 
   - *System Reaction*: The HUD instantly flags "Overconfidence Detected". The Engine lowers difficulty but retains the same underlying *concept* to force true understanding.
2. **The Fragile Pass (Showcase Kinematics)**: 
   - *Action*: Wait until the timer almost runs out, then select the right answer with 20% confidence. 
   - *System Reaction*: The system flags a "High Guess Probability". Judges see that the platform didn't just give the user a "+1 Score" like a dumb quiz, but recognized they don't actually know it.
3. **The Final Genome Printout**: 
   - *Action*: End the session and reveal the final Genome Dashboard. 
   - *Impact*: Point out that despite getting a 60% raw accuracy, the user's "Interview Readiness" is flagged as **Danger: Fragile Knowledge** because the LLM identified high hesitancy and high guess probability across core concepts.

---

## 9. Future Scalability
- **Bayesian Knowledge Tracing (BKT)**: Transitioning from heuristic mastery scoring to probabilistic Hidden Markov Models to estimate the latent probability of student knowledge state.
- **Biometric Integration**: Tying webcam eye-tracking via MediaPipe Tasks Vision to measure exact saccades or screen-focus drifting as a true proxy for measuring Cognitive Load, removing the reliance purely on response time. 
- **Graph-Based Personalized Learning Paths**: Utilizing Neo4j or Postgres recursive CTEs to traverse the `concept_graph` and dynamically generate daily revision playlists based strictly on the $R(t)$ Retention Decay formula.
