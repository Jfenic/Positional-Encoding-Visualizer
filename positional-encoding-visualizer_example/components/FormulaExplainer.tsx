import React from 'react';

const FormulaExplainer: React.FC = () => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-slate-300 space-y-4">
      <h3 className="text-lg font-bold text-white border-b border-slate-600 pb-2">Architecture: Single-Head Self-Attention</h3>
      
      <p className="text-sm">
        We are running a real simplified Transformer Encoder Layer in the browser. 
        The weights (<span className="font-mono text-pink-400">Wq, Wk, Wv</span>) are initialized using He Initialization to simulate a trained model.
      </p>

      <div className="bg-slate-900 p-4 rounded-lg font-mono text-xs md:text-sm overflow-x-auto border border-slate-700 shadow-inner space-y-3">
        <div>
          <p className="text-slate-500 mb-1">// 1. Embed + Position</p>
          <p className="text-indigo-400">X = Embedding(Token) + SinusoidalPE(Pos)</p>
        </div>

        <div>
           <p className="text-slate-500 mb-1">// 2. Projections</p>
           <p className="text-blue-300">Q = X · Wq,  K = X · Wk,  V = X · Wv</p>
        </div>
        
        <div>
          <p className="text-slate-500 mb-1">// 3. Scaled Dot-Product Attention</p>
          <p className="text-amber-400">Attn = Softmax( (Q · K^T) / √dk ) · V</p>
        </div>

        <div>
          <p className="text-slate-500 mb-1">// 4. Output (Residual + Norm)</p>
          <p className="text-emerald-400 font-bold">Output = LayerNorm(X + Attn)</p>
        </div>
      </div>

      <p className="text-sm">
        <strong className="text-white">The Chart:</strong>
        <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><span className="text-slate-400">Grey Dot:</span> Pure Word Meaning.</li>
            <li><span className="text-indigo-400">Blue/Green Arrow:</span> Positional Encoding added.</li>
            <li><span className="text-amber-400">Gold Arrow:</span> <span className="font-bold">Self-Attention!</span> This shows how the model moves the word vector based on the <em>context</em> of the other words.</li>
        </ul>
      </p>
    </div>
  );
};

export default FormulaExplainer;