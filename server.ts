import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));

// Lazy Google Gen AI Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// ============================================================
// REAL COGNITIVE API ROUTES
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'PROJECT JARVIS BRAIN-001 COGNITIVE RUNTIME',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/cognitive/infer', async (req, res) => {
  const startTime = performance.now();
  const { prompt, model = 'gemini-3.8-flash', systemInstruction, temperature = 0.2 } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'Invalid request: "prompt" field must be a non-empty string.',
      code: 'INVALID_PROMPT',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in the server environment.',
      code: 'MISSING_API_KEY',
    });
  }

  const candidateModels = [
    model,
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: unknown = null;
  for (const targetModel of candidateModels) {
    try {
      const ai = getGenAI();
      const config: Record<string, unknown> = {
        temperature,
      };
      if (systemInstruction && typeof systemInstruction === 'string') {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
        config,
      });

      const latencyMs = +(performance.now() - startTime).toFixed(2);
      const candidate = response.candidates?.[0];
      const text = response.text || '';
      const finishReason = candidate?.finishReason || 'STOP';
      const usage = response.usageMetadata || {
        promptTokenCount: Math.ceil(prompt.length / 4),
        candidatesTokenCount: Math.ceil(text.length / 4),
        totalTokenCount: Math.ceil((prompt.length + text.length) / 4),
      };

      return res.json({
        success: true,
        text,
        model: targetModel,
        finishReason,
        latencyMs,
        usage: {
          inputTokens: usage.promptTokenCount ?? 0,
          outputTokens: usage.candidatesTokenCount ?? 0,
          totalTokens: usage.totalTokenCount ?? 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[Brain Server] Target model ${targetModel} failed, trying next fallback if available. Error:`, err instanceof Error ? err.message : err);
    }
  }

  const latencyMs = +(performance.now() - startTime).toFixed(2);
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  console.error('[Brain Server] Cognitive Inference Exhausted All Models:', errorMessage);

  return res.status(500).json({
    success: false,
    error: errorMessage,
    code: 'INFERENCE_FAILURE',
    latencyMs,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/cognitive/embed', async (req, res) => {
  const startTime = performance.now();
  const { texts, model = 'gemini-embedding-2-preview', outputDimensionality = 768 } = req.body;

  if (!texts || (typeof texts !== 'string' && !Array.isArray(texts))) {
    return res.status(400).json({
      error: 'Invalid request: "texts" must be a non-empty string or array of strings.',
      code: 'INVALID_TEXTS',
    });
  }

  const textArray: string[] = (Array.isArray(texts) ? texts : [texts]).map((t) => (typeof t === 'string' ? t.trim() : ''));
  if (textArray.length === 0 || textArray.some((t) => t.length === 0)) {
    return res.status(400).json({
      error: 'Invalid request: all text entries must be non-empty strings.',
      code: 'INVALID_TEXTS',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in the server environment.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    const ai = getGenAI();
    const promises = textArray.map(async (text) => {
      const resp = await ai.models.embedContent({
        model,
        contents: text,
        config: {
          outputDimensionality: Number(outputDimensionality) || 768,
        },
      });
      return resp.embeddings?.[0]?.values || [];
    });

    const embeddings = await Promise.all(promises);
    const latencyMs = +(performance.now() - startTime).toFixed(2);
    const dimension = embeddings[0]?.length || 0;

    return res.json({
      success: true,
      embeddings,
      dimension,
      count: embeddings.length,
      model,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const latencyMs = +(performance.now() - startTime).toFixed(2);
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Brain Server] Cognitive Embedding Error:', errorMessage);

    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'EMBEDDING_FAILURE',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// INTEGRATED BRAIN RUNTIME PIPELINE ENDPOINT
// USER REQUEST → UNDERSTAND → TOKENIZE → MEMORY RETRIEVAL →
// CONTEXT ASSEMBLY → REAL MODEL REASONING → OBSERVE & EVALUATE →
// LESSON EXTRACTION & RETRIEVAL → RESPONSE
// ============================================================
app.post('/api/brain/cycle', async (req, res) => {
  const { prompt, modality = 'text', topK = 3, minScore = 0.0, alpha = 0.7, model } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "prompt" field must be a non-empty string.',
      code: 'INPUT_INVALID',
    });
  }

  try {
    const { BrainPipeline } = await import('./src/lib/brainPipeline');
    const pipeline = BrainPipeline.getInstance();
    await pipeline.initialize();

    const output = await pipeline.execute({
      userPrompt: prompt,
      modality,
      topK: Number(topK) || 3,
      minScore: Number(minScore) || 0.0,
      alpha: Number(alpha) || 0.7,
      model,
    });

    return res.json({
      success: true,
      cycleId: output.cycleId,
      result: output,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[Brain Server] Brain Pipeline Execution Error:', errorMessage);
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'RUNTIME_FAILURE',
    });
  }
});

// ============================================================
// FIRST-CLASS POLYGLOT EXECUTION ENDPOINT
// TASK → LANGUAGE/RUNTIME SELECTION → ENVIRONMENT → POLICY CHECK →
// EXECUTE → CAPTURE → OBSERVE → VERIFY → RESULT
// ============================================================
app.post('/api/brain/polyglot', async (req, res) => {
  const { language, code, args, timeoutMs = 10000, expectedExitCode, expectedOutputRegex } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: 'Missing required "language" or "code" parameters.',
      code: 'INPUT_INVALID',
    });
  }

  try {
    const { PolyglotEngine } = await import('./src/lib/polyglotEngine');
    const result = await PolyglotEngine.execute({
      taskId: `task_${Date.now()}`,
      language,
      code,
      args,
      timeoutMs,
      expectedExitCode,
      expectedOutputRegex,
    });

    return res.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: 'RUNTIME_FAILURE',
    });
  }
});

// ============================================================
// VITE MIDDLEWARE & STATIC SERVING
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Brain Server] JARVIS Cognitive Engine running on http://${HOST}:${PORT}`);
  });
}

startServer();
