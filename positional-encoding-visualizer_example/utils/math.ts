import { pipeline, env } from '@xenova/transformers';

// Skip local check for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

// Update to match MiniLM dimension
export const D_MODEL = 384; 

// --- HUGGING FACE INTEGRATION ---

class HFService {
  static instance: any = null;
  static modelName = 'Xenova/all-MiniLM-L6-v2';

  static async getInstance() {
    if (!this.instance) {
      console.log(`Loading model ${this.modelName}...`);
      this.instance = await pipeline('feature-extraction', this.modelName, {
        quantized: true,
      });
    }
    return this.instance;
  }

  // Get real embeddings for a list of tokens
  // Note: We use the model to get the 'static' meaning (Layer 0 or uncontextualized if possible, 
  // but for simplicity here we extract features individually to simulate "Word Embeddings" before context)
  static async getEmbeddings(text: string): Promise<number[][]> {
    const extractor = await this.getInstance();
    
    // We treat the input as a sentence to get the tokenization, 
    // but to simulate "Base Embedding" (before Attention context of the full sentence),
    // we technically should run them individually or take the raw embedding layer.
    // However, the feature-extraction pipeline gives us the output of the model.
    // To strictly simulate "Base Word Vectors" for our educational pipeline:
    // We will extract features for the sentence, but we use the output as our "High Quality Input"
    // for our *manual* educational attention layer.
    
    // Run inference
    const output = await extractor(text, { pooling: 'none', normalize: true });
    
    // Output is a Tensor [1, seq_len, 384]. We convert to JS array.
    const rawData = output.data; 
    const dims = output.dims; // [1, seq_len, 384]
    const seqLen = dims[1];
    const hiddenSize = dims[2]; // Should be 384

    const vectors: number[][] = [];
    
    // The pipeline returns [CLS] ... tokens ... [SEP]. We usually want to strip CLS/SEP for pure word viz
    // but for simplicity we will keep what the tokenizer gives us or filter roughly.
    // Let's just return all vectors.
    for (let i = 0; i < seqLen; i++) {
        const start = i * hiddenSize;
        const end = start + hiddenSize;
        // Float32Array to number[]
        const vec = Array.from(rawData.slice(start, end)) as number[];
        vectors.push(vec);
    }

    return vectors;
  }
}

export const getRealEmbeddings = async (text: string): Promise<number[][]> => {
    try {
        return await HFService.getEmbeddings(text);
    } catch (e) {
        console.error("HF Error", e);
        // Fallback to random if model fails
        return [];
    }
};

// --- LEGACY / MANUAL MATH HELPERS ---

// 1. Deterministic Random Number Generator (Seeded) - Used for Weight Initialization
class PseudoRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Simple LCG
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// 2. Positional Encoding
export const getPositionalEncoding = (pos: number, dim: number = D_MODEL): number[] => {
  const pe = new Array(dim).fill(0);
  for (let i = 0; i < dim / 2; i++) {
    const denominator = Math.pow(10000, (2 * i) / dim);
    const argument = pos / denominator;
    pe[2 * i] = Math.sin(argument);
    pe[2 * i + 1] = Math.cos(argument);
  }
  return pe;
};

// --- MATRIX MATH FOR "REAL" ENCODER ---

type Matrix = number[][];

// Generate a random matrix using He Initialization (good for deep learning weights)
const createWeightMatrix = (rows: number, cols: number, seed: number): Matrix => {
  const rng = new PseudoRandom(seed);
  const matrix: Matrix = [];
  // Adjusted: We slightly increase variance to encourage more distinct attention scores in our simulation
  const stdDev = Math.sqrt(2 / rows) * 1.2; 
  
  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      // Box-Muller transform
      const u = rng.next();
      const v = rng.next();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      row.push(z * stdDev);
    }
    matrix.push(row);
  }
  return matrix;
};

// Fixed Weights for consistency (Simulating a Pre-trained Model layer on top of the Embeddings)
// Note: We create these ONCE. If D_MODEL changes, these re-calc on reload.
const W_Q = createWeightMatrix(D_MODEL, D_MODEL, 1234);
const W_K = createWeightMatrix(D_MODEL, D_MODEL, 5678);
const W_V = createWeightMatrix(D_MODEL, D_MODEL, 9012);
const W_O = createWeightMatrix(D_MODEL, D_MODEL, 3456);

export const matMulVector = (vec: number[], mat: Matrix): number[] => {
  const result: number[] = new Array(mat[0].length).fill(0);
  for (let j = 0; j < mat[0].length; j++) {
    for (let i = 0; i < vec.length; i++) {
      result[j] += vec[i] * mat[i][j];
    }
  }
  return result;
};

const dotProductSimple = (v1: number[], v2: number[]): number => {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) sum += v1[i] * v2[i];
  return sum;
};

const softmax = (arr: number[]): number[] => {
  const max = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - max)); // Stability shift
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
};

// 4. SELF-ATTENTION LAYER
// Inputs: Array of vectors (Batch Size = Sequence Length, Dim = 384)
// Returns: { vectors: TransformedVectors, attentionWeights: NxN Matrix }
export const runSelfAttentionBlock = (inputs: number[][]): { vectors: number[][], attentionWeights: number[][] } => {
  const seqLen = inputs.length;
  if (seqLen === 0) return { vectors: [], attentionWeights: [] };

  // A. Linear Projections (Q, K, V)
  const Q = inputs.map(x => matMulVector(x, W_Q));
  const K = inputs.map(x => matMulVector(x, W_K));
  const V = inputs.map(x => matMulVector(x, W_V));

  const outputVectors: number[][] = [];
  const attentionMatrix: number[][] = [];

  // B. Scaled Dot-Product Attention
  // Standard Transformer scaling factor to stabilize gradients
  const scalingFactor = Math.sqrt(D_MODEL); 

  for (let i = 0; i < seqLen; i++) {
    // 1. Calculate Scores: Q[i] dot K[all]^T
    const scores: number[] = [];
    for (let j = 0; j < seqLen; j++) {
      const dot = dotProductSimple(Q[i], K[j]);
      // Divide by sqrt(d_model) is the standard formula
      scores.push(dot / scalingFactor);
    }

    // 2. Softmax (Attention Weights)
    const weights = softmax(scores);
    attentionMatrix.push(weights); // Store weights for visualization

    // 3. Weighted Sum of V
    const contextVec = new Array(D_MODEL).fill(0);
    for (let j = 0; j < seqLen; j++) {
      for (let d = 0; d < D_MODEL; d++) {
        contextVec[d] += weights[j] * V[j][d];
      }
    }
    outputVectors.push(contextVec);
  }

  // C. Output Projection + Residual Connection + Layer Norm
  const finalVectors = outputVectors.map((attnVec, i) => {
    const projected = matMulVector(attnVec, W_O);
    // Residual Connection: Input + Attention
    const residual = addVectors(inputs[i], projected);
    // Layer Norm
    return layerNorm(residual);
  });

  return { vectors: finalVectors, attentionWeights: attentionMatrix };
};

const layerNorm = (v: number[]): number[] => {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const variance = v.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / v.length;
  const std = Math.sqrt(variance + 1e-6);
  return v.map(val => (val - mean) / std);
};

// --- STANDARD VECTOR UTILS ---

export const addVectors = (v1: number[], v2: number[]): number[] => {
  // Guard against length mismatch if model changes
  const len = Math.min(v1.length, v2.length); 
  const res = [];
  for(let i=0; i<len; i++) res.push(v1[i] + v2[i]);
  return res;
};

export const scaleVector = (v: number[], factor: number): number[] => {
    return v.map(x => x * factor);
};

export const normalize = (v: number[]): number[] => {
  const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return v;
  return v.map(val => val / magnitude);
};

export const cosineSimilarity = (v1: number[], v2: number[]): number => {
  const dot = dotProductSimple(v1, v2);
  const mag1 = Math.sqrt(dotProductSimple(v1, v1));
  const mag2 = Math.sqrt(dotProductSimple(v2, v2));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
};

export const getMeanVector = (vectors: number[][]): number[] => {
  if (vectors.length === 0) return new Array(D_MODEL).fill(0);
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  
  vectors.forEach(vec => {
    vec.forEach((val, i) => sum[i] += val);
  });
  return normalize(sum.map(val => val / vectors.length));
};

// PCA (Simplified)
export const computePCA = (vectors: number[][]): [number, number][] => {
  const n = vectors.length;
  if (n === 0) return [];
  const d = vectors[0].length;

  // Center data
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) mean[j] += vectors[i][j];
  for (let j = 0; j < d; j++) mean[j] /= n;
  const centered = vectors.map(v => v.map((val, j) => val - mean[j]));

  // Helper
  const getPrincipalComponent = (data: number[][], excludeDir?: number[]): number[] => {
    let direction = new Array(d).fill(0).map(() => Math.random() - 0.5);
    direction = normalize(direction);

    if (excludeDir) {
       const proj = dotProductSimple(direction, excludeDir);
       direction = direction.map((val, i) => val - proj * excludeDir[i]);
       direction = normalize(direction);
    }

    // Power Iteration
    // With 384 dims, convergence might take a few more steps
    for (let iter = 0; iter < 15; iter++) { 
      const newDir = new Array(d).fill(0);
      
      // Matrix-Vector Multiplication implicitly via rows
      const scores = data.map(row => dotProductSimple(row, direction));
      
      for (let i = 0; i < n; i++) {
        const score = scores[i];
        for (let j = 0; j < d; j++) {
            newDir[j] += data[i][j] * score;
        }
      }

      direction = normalize(newDir);
      
      if (excludeDir) {
        const proj = dotProductSimple(direction, excludeDir);
        direction = direction.map((val, i) => val - proj * excludeDir[i]);
        direction = normalize(direction);
      }
    }
    return direction;
  };

  const pc1 = getPrincipalComponent(centered);
  const pc2 = getPrincipalComponent(centered, pc1);

  return centered.map(v => [dotProductSimple(v, pc1), dotProductSimple(v, pc2)]);
};