import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Real Cognitive Model Integration Endpoint (Chamber 07)', () => {
  it('Health Check Contract: Verifies /api/health responds with active status and node version', async () => {
    const res = await fetch('http://localhost:3000/api/health');
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.geminiKeyConfigured, true);
    assert(data.nodeVersion.startsWith('v'));
  });

  it('Inference Validation: Rejects empty or invalid prompts with HTTP 400', async () => {
    const res = await fetch('http://localhost:3000/api/cognitive/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.code, 'INVALID_PROMPT');
  });

  it('Live Cognitive Inference: Executes real Gemini model inference with verifiable token counts and latency', async () => {
    const prompt = 'Compute: What is the trace of an identity matrix of size 3x3? Give only the integer number.';
    const res = await fetch('http://localhost:3000/api/cognitive/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, temperature: 0.1 }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert(typeof data.text === 'string' && data.text.includes('3'));
    assert(data.latencyMs > 0);
    assert(data.usage.outputTokens > 0);
    assert.equal(data.finishReason, 'STOP');
  });
});
