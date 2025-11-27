
import React from 'react';

interface Props {
  tokens: string[];
  matrix: number[][];
  sourceId: 'A' | 'B';
}

const AttentionMatrixView: React.FC<Props> = ({ tokens, matrix, sourceId }) => {
  if (!matrix || matrix.length === 0) return null;

  // Color logic
  const getColor = (value: number) => {
    // Attention weights are usually between 0 and 1 (softmax)
    const baseColor = sourceId === 'A' ? '99, 102, 241' : '16, 185, 129'; // Indigo-500 or Emerald-500
    // Alpha logic: standard softmax mapping
    // We ensure at least a tiny bit of color for non-zero, but scale mostly linearly
    const alpha = Math.max(0.05, value); 
    return `rgba(${baseColor}, ${alpha})`;
  };

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h4 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${sourceId === 'A' ? 'text-indigo-400' : 'text-emerald-400'}`}>
            {sourceId === 'A' ? 'Phrase A Attention' : 'Phrase B Attention'}
        </h4>
        <div className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            Row <span className="text-slate-200">looks at</span> Col
        </div>
      </div>

      <div className="relative overflow-auto flex-1 pb-2">
         <table className="border-collapse w-full">
            <thead>
                <tr>
                    {/* Top-Left Legend for Axes */}
                    <th className="p-0 w-24 sticky left-0 z-10 bg-slate-900/90 backdrop-blur border-b border-r border-slate-800">
                        <div className="relative w-full h-full min-h-[40px]">
                            <span className="absolute bottom-1 left-2 text-[9px] text-slate-500">Query ↓</span>
                            <span className="absolute top-1 right-2 text-[9px] text-slate-500">Key →</span>
                        </div>
                    </th>
                    
                    {/* Column Headers (Keys) */}
                    {tokens.map((token, i) => (
                        <th key={i} className="p-1 min-w-[40px] relative h-24 align-bottom">
                            <div 
                                className="absolute bottom-2 left-1/2 w-max -rotate-45 origin-bottom-left text-xs text-slate-400 whitespace-nowrap border-b border-slate-700/0 hover:border-slate-500 transition-colors cursor-default"
                                style={{ transform: 'translateX(-50%) rotate(-45deg)' }}
                            >
                                {token}
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {matrix.map((row, r) => (
                    <tr key={r}>
                        {/* Row Header (Query) */}
                        <td className="w-24 text-right pr-3 py-1 text-xs font-bold text-slate-300 sticky left-0 z-10 bg-slate-900/90 backdrop-blur whitespace-nowrap border-r border-slate-800">
                            {tokens[r]}
                        </td>
                        
                        {/* Cells */}
                        {row.map((val, c) => (
                            <td key={c} className="p-0.5">
                                <div
                                    className="w-10 h-10 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-all border border-slate-700/30 hover:border-white hover:scale-110 hover:z-20 cursor-crosshair shadow-sm"
                                    style={{ 
                                        backgroundColor: getColor(val),
                                        color: val > 0.4 ? '#fff' : 'rgba(255,255,255,0.7)',
                                        textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
                                    }}
                                    title={`[${tokens[r]}] attends to [${tokens[c]}]: ${(val * 100).toFixed(1)}%`}
                                >
                                    {val.toFixed(2).replace('0.', '.')}
                                </div>
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
         </table>
      </div>
      
      <div className="mt-4 text-xs text-slate-500 flex items-center justify-between px-2 pt-2 border-t border-slate-700/50">
          <span>Values = Attention Weight (Sum of row = 1.0)</span>
          <div className="flex items-center gap-2">
              <span className="opacity-50">0</span>
              <div className={`w-24 h-1.5 bg-gradient-to-r from-slate-800 ${sourceId === 'A' ? 'to-indigo-500' : 'to-emerald-500'} rounded`}></div>
              <span className="opacity-50">1</span>
          </div>
      </div>
    </div>
  );
};

export default AttentionMatrixView;
