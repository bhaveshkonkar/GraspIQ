import React from 'react';
import { Sparkles, Brain, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
    onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-900/20 rounded-full blur-[150px] opacity-70 animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-900/20 rounded-full blur-[150px] opacity-70 animate-pulse" style={{ animationDuration: '6s' }} />
            </div>

            <div className="z-10 text-center max-w-5xl px-6 flex flex-col items-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 mb-8 backdrop-blur-sm">
                    <Sparkles size={16} />
                    <span className="text-sm font-medium tracking-wide">Next-Generation Interview Engine</span>
                </div>

                {/* Hero Headline */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                    Master Any Topic with <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        Real-Time Intelligence
                    </span>
                </h1>

                {/* Sub-headline */}
                <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
                    Experience learning that actively responds to you. Answer adaptive questions, identify misconceptions instantly, and build your confidence for high-stakes interviews.
                </p>

                {/* Call to Action */}
                <button
                    onClick={onStart}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-semibold text-lg transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] hover:bg-gray-100"
                >
                    <span>Start Engine</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                </button>

                {/* Features Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-24 text-left">
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                        <Brain className="text-blue-400 mb-5" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Adaptive Difficulty</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Questions dynamically adjust to your understanding level, targeting weak points directly.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                        <Zap className="text-indigo-400 mb-5" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Instant Feedback</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Pinpoint exact misconceptions the second you answer, with personalized explanations.</p>
                    </div>
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors">
                        <ShieldCheck className="text-purple-400 mb-5" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Confidence Tracking</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">Our intelligence measures not just accuracy, but your hesitation patterns and conviction.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
