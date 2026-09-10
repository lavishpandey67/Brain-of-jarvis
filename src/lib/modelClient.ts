/**
 * PROJECT JARVIS: CLIENT-SIDE COGNITIVE MODEL ADAPTER
 * 
 * Directly interfaces with the server-side /api/cognitive/infer endpoint,
 * returning verified model intelligence responses, real latencies, and token metrics.
 */

export interface CognitiveModelRequest {
  prompt: string;
  model?: string;
  systemInstruction?: string;
  temperature?: number;
}

export interface CognitiveModelResponse {
  success: boolean;
  text: string;
  model: string;
  finishReason: string;
  latencyMs: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  timestamp: string;
  error?: string;
}

function getApiUrl(endpoint: string): string {
  if (typeof window !== 'undefined') {
    return endpoint;
  }
  const host = process.env.TEST_HOST || 'http://localhost:3000';
  return `${host}${endpoint}`;
}

export async function executeCognitiveInference(
  request: CognitiveModelRequest
): Promise<CognitiveModelResponse> {
  const t0 = performance.now();
  try {
    const response = await fetch(getApiUrl('/api/cognitive/infer'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        text: data.error || `Server responded with HTTP ${response.status}`,
        model: request.model || 'gemini-3.8-flash',
        finishReason: 'ERROR',
        latencyMs: +(performance.now() - t0).toFixed(2),
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        timestamp: new Date().toISOString(),
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      text: data.text,
      model: data.model,
      finishReason: data.finishReason,
      latencyMs: data.latencyMs,
      usage: data.usage,
      timestamp: data.timestamp,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      text: `Network / Gateway Error: ${errorMsg}`,
      model: request.model || 'gemini-3.8-flash',
      finishReason: 'NETWORK_ERROR',
      latencyMs: +(performance.now() - t0).toFixed(2),
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}

export interface CognitiveEmbedRequest {
  texts: string | string[];
  model?: string;
  outputDimensionality?: number;
}

export interface CognitiveEmbedResponse {
  success: boolean;
  embeddings: number[][];
  dimension: number;
  count: number;
  model: string;
  latencyMs: number;
  timestamp: string;
  error?: string;
}

export async function executeCognitiveEmbedding(
  request: CognitiveEmbedRequest
): Promise<CognitiveEmbedResponse> {
  const t0 = performance.now();
  try {
    const response = await fetch(getApiUrl('/api/cognitive/embed'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        embeddings: [],
        dimension: 0,
        count: 0,
        model: request.model || 'gemini-embedding-2-preview',
        latencyMs: +(performance.now() - t0).toFixed(2),
        timestamp: new Date().toISOString(),
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      embeddings: data.embeddings,
      dimension: data.dimension,
      count: data.count,
      model: data.model,
      latencyMs: data.latencyMs,
      timestamp: data.timestamp,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      embeddings: [],
      dimension: 0,
      count: 0,
      model: request.model || 'gemini-embedding-2-preview',
      latencyMs: +(performance.now() - t0).toFixed(2),
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}

