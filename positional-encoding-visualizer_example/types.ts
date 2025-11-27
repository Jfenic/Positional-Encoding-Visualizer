export interface VectorData {
  token: string;
  position: number;
  vector: number[];
  type: 'base' | 'positional' | 'attention'; // 'positional' is Embed + PE, 'attention' is Output of Encoder
  coords2D: [number, number];
  sourceId: 'A' | 'B';
}

export interface AnalysisResult {
  tokensA: string[];
  tokensB: string[];
  finalVectorsA: number[][];
  finalVectorsB: number[][];
  attentionMatrixA: number[][]; // New: NxN matrix of weights
  attentionMatrixB: number[][]; // New: NxN matrix of weights
  sentenceSimilarity: number;
  pcaData: VectorData[];
}

export interface CosineComparison {
    tokenA: string;
    posA: number;
    tokenB: string;
    posB: number;
    similarity: number;
    sourceA: 'A' | 'B';
    sourceB: 'A' | 'B';
}