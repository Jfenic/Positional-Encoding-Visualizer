import React from 'react';

const TheoryView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Header & Paper Link */}
      <div className="bg-slate-800 p-8 rounded-xl border border-indigo-500/30 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">The Transformer Encoder</h2>
          <p className="text-slate-400 max-w-2xl">
            The architecture that changed NLP forever. Understand how "Attention" creates context-aware meaning.
          </p>
        </div>
        <a 
          href="https://arxiv.org/abs/1706.03762" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-shrink-0 bg-white text-slate-900 hover:bg-indigo-50 font-bold py-3 px-6 rounded-lg shadow-md transition-all flex items-center gap-2 group"
        >
          <span>📄 Read the Paper</span>
          <span className="text-xs text-slate-500 block font-normal group-hover:text-indigo-600">"Attention Is All You Need" (2017)</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Deep Dive into Q / K / V */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col h-full">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
             <span className="bg-amber-500 w-1.5 h-6 rounded"></span>
             The "Search Engine" Analogy
           </h3>
           
           <p className="text-slate-400 mb-6 text-sm leading-relaxed">
             To understand Self-Attention, imagine a library or a database. Each word in the sentence acts as an agent trying to find relevant information from other words to understand itself better.
           </p>

           <div className="space-y-4 flex-1">
              
              {/* Query */}
              <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-indigo-500 relative overflow-hidden">
                 <div className="absolute right-2 top-2 text-indigo-900/20 text-4xl font-black pointer-events-none">Q</div>
                 <h4 className="font-bold text-indigo-300 mb-1">Query (Q)</h4>
                 <p className="text-xs text-slate-400 italic mb-2">"What am I looking for?"</p>
                 <p className="text-sm text-slate-300">
                    The token asks a question. For example, the word <strong>"muerde"</strong> (bites) might ask: <em>"Who is the subject doing the biting? Who is the object being bitten?"</em>
                 </p>
              </div>

              {/* Key */}
              <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-emerald-500 relative overflow-hidden">
                 <div className="absolute right-2 top-2 text-emerald-900/20 text-4xl font-black pointer-events-none">K</div>
                 <h4 className="font-bold text-emerald-300 mb-1">Key (K)</h4>
                 <p className="text-xs text-slate-400 italic mb-2">"What defines me?"</p>
                 <p className="text-sm text-slate-300">
                    The tag or metadata exposed to others. The word <strong>"perro"</strong> (dog) might shout: <em>"I am a noun! I am a living being! I can perform actions!"</em>
                 </p>
              </div>

              {/* Value */}
              <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-amber-500 relative overflow-hidden">
                 <div className="absolute right-2 top-2 text-amber-900/20 text-4xl font-black pointer-events-none">V</div>
                 <h4 className="font-bold text-amber-300 mb-1">Value (V)</h4>
                 <p className="text-xs text-slate-400 italic mb-2">"My actual content"</p>
                 <p className="text-sm text-slate-300">
                    The actual semantic meaning. If the Query matches the Key, the model absorbs this Value. It blends the concept of "dog-ness" into "muerde".
                 </p>
              </div>
           </div>
        </div>

        {/* Right: The Math & Architecture */}
        <div className="space-y-8">
            
            {/* The Formula Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-xl border border-slate-600 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <h3 className="text-lg font-mono text-slate-400 mb-4 text-center">Scaled Dot-Product Attention</h3>
                
                <div className="flex justify-center my-6">
                    <div className="bg-black/40 px-6 py-4 rounded-lg border border-slate-600/50 backdrop-blur-md">
                        <code className="text-2xl md:text-3xl text-white font-serif">
                            softmax<span className="text-slate-400">(</span>
                            <span className="fraction inline-block text-center align-middle mx-1">
                                <span className="block border-b border-white/30 pb-1">Q · K<sup>T</sup></span>
                                <span className="block pt-1 text-lg text-emerald-400">√d<sub>k</sub></span>
                            </span>
                            <span className="text-slate-400">)</span> · V
                        </code>
                    </div>
                </div>

                <div className="text-sm text-slate-400 space-y-2">
                    <p><strong>1. Dot Product (Q · K):</strong> Calculates similarity. High dot product = High relevance.</p>
                    <p><strong>2. Scaling (√d):</strong> Prevents the values from exploding, which would kill gradients during training.</p>
                    <p><strong>3. Softmax:</strong> Converts scores into probabilities (0 to 1). The rows sum to 1.</p>
                </div>
            </div>

            {/* Architecture Steps */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
               <h3 className="text-white font-bold mb-4">Pipeline Steps</h3>
               <ul className="space-y-0 relative border-l-2 border-slate-700 ml-3 pl-6 py-2">
                  <li className="mb-6 relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-600 border-2 border-slate-800"></span>
                      <h4 className="text-slate-200 font-bold text-sm">1. Input Embedding</h4>
                      <p className="text-xs text-slate-400">Convert text to vector (384 dim).</p>
                  </li>
                  <li className="mb-6 relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-800"></span>
                      <h4 className="text-emerald-300 font-bold text-sm">2. Positional Encoding</h4>
                      <p className="text-xs text-slate-400">Inject order information (Sinusoidal).</p>
                  </li>
                  <li className="mb-6 relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-800 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></span>
                      <h4 className="text-amber-300 font-bold text-sm">3. Multi-Head Attention</h4>
                      <p className="text-xs text-slate-400">Apply the formula above. Mixes information.</p>
                  </li>
                  <li className="relative">
                      <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-800"></span>
                      <h4 className="text-indigo-300 font-bold text-sm">4. Add & Norm</h4>
                      <p className="text-xs text-slate-400">Add original residual signal + Layer Normalization.</p>
                  </li>
               </ul>
            </div>

        </div>

      </div>
    </div>
  );
};

export default TheoryView;