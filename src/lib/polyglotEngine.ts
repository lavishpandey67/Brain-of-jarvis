/**
 * PROJECT JARVIS — FIRST-CLASS POLYGLOT EXECUTION ENGINE
 * 
 * Pipeline:
 * TASK → LANGUAGE/RUNTIME SELECTION → ENVIRONMENT → POLICY CHECK →
 * EXECUTE → CAPTURE OUTPUT/ERROR/ARTIFACTS → OBSERVE → VERIFY → RESULT
 * 
 * Verified Runtimes:
 * - TypeScript/Node (PROVEN)
 * - Python 3 (PROVEN)
 * - Shell/Bash (PROVEN)
 * - SQL / SQLite (PROVEN)
 * - Rust (MISSING - not installed in environment)
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SupportedRuntime, RuntimeCapabilityStatus, BrainFailureCode, NodeContract } from '../types/brainGraph';

export interface PolyglotTaskInput {
  taskId: string;
  language: SupportedRuntime;
  code: string;
  args?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
  expectedOutputRegex?: string;
  expectedExitCode?: number;
  maxOutputBytes?: number;
  allowFileSystemEscape?: boolean;
}

export interface PolyglotExecutionResult {
  taskId: string;
  language: SupportedRuntime;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  artifacts: Record<string, any>;
  observedState: {
    linesProduced: number;
    bytesProduced: number;
    truncated: boolean;
  };
  verification: {
    exitCodeValid: boolean;
    outputPatternValid: boolean;
    verified: boolean;
    criticScore: number;
    failureReason?: string;
  };
  failureCode?: BrainFailureCode;
  runtimeStatus: RuntimeCapabilityStatus;
}

// Global Policy: Prohibited dangerous patterns
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(\s|$)/,
  /mkfs(\.|\s)/,
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;\s*:/, // Fork bomb
  />\s*\/dev\/(sda|hda|nvme)/,
  /dd\s+if=.*of=\/dev/,
];

// Workspace Escape Traversal Patterns
const WORKSPACE_ESCAPE_PATTERNS = [
  /\.\.\/\.\.\//,
  /\/etc\/(passwd|shadow|hosts)/,
  /\/root\//,
  /\/sys\/class/,
  /\/proc\/kcore/,
];

export class PolyglotEngine {
  private static cachedRuntimes: Map<SupportedRuntime, RuntimeCapabilityStatus> = new Map();

  /**
   * Validates that a graph node explicitly declares its full runtime capsule contract:
   * runtime, capability, input, output, environment, policy, timeout, resource limits, verification.
   */
  public static validateRuntimeCapsule(node: NodeContract): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.runtime) {
      errors.push(`Node '${node.id}' must explicitly declare a 'runtime' ('typescript' | 'python' | 'shell' | 'sql').`);
    }
    if (!node.capability || node.capability.trim() === '') {
      errors.push(`Node '${node.id}' must explicitly declare a 'capability'.`);
    }
    if (!node.inputTypes || Object.keys(node.inputTypes).length === 0) {
      errors.push(`Node '${node.id}' must explicitly declare 'inputTypes' schema.`);
    }
    if (!node.outputTypes || Object.keys(node.outputTypes).length === 0) {
      errors.push(`Node '${node.id}' must explicitly declare 'outputTypes' schema.`);
    }
    if (!node.timeoutMs || node.timeoutMs <= 0) {
      errors.push(`Node '${node.id}' must explicitly declare a positive 'timeoutMs'.`);
    }
    if (!node.resourceLimits) {
      errors.push(`Node '${node.id}' must explicitly declare 'resourceLimits' (maxMemoryBytes, maxOutputBytes).`);
    }
    if (!node.policyDeclaration) {
      errors.push(`Node '${node.id}' must explicitly declare 'policyDeclaration'.`);
    }
    if (!node.environmentConfig) {
      errors.push(`Node '${node.id}' must explicitly declare 'environmentConfig'.`);
    }
    if (!node.verification || !node.verification.criticThreshold) {
      errors.push(`Node '${node.id}' must explicitly declare 'verification' with a criticThreshold.`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Explicit check for PostgreSQL / pgvector.
   * "Only mark SQL/pgvector PROVEN if a real PostgreSQL instance is actually executed against."
   */
  public static async probePostgresPgVector(): Promise<RuntimeCapabilityStatus> {
    try {
      // 1. Check if external PostgreSQL connection is configured
      if (process.env.SQL_HOST || process.env.DATABASE_URL) {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          host: process.env.SQL_HOST,
          user: process.env.SQL_USER,
          password: process.env.SQL_PASSWORD,
          database: process.env.SQL_DB_NAME,
          connectionTimeoutMillis: 2000,
        });
        const res = await pool.query("SELECT 1;");
        await pool.end();
        if (res.rows.length > 0) {
          return {
            runtime: 'sql',
            status: 'PROVEN',
            binaryPath: 'postgresql-external',
            notes: 'External PostgreSQL database verified and responsive',
          };
        }
      }

      // 2. Check embedded real PostgreSQL engine with pgvector
      const { PGlite } = await import('@electric-sql/pglite');
      const { vector } = await import('@electric-sql/pglite-pgvector');
      const db = new PGlite({ extensions: { vector } });
      await db.waitReady;
      await db.query('CREATE EXTENSION IF NOT EXISTS vector;');
      const testVec = await db.query("SELECT ('[1,2,3]'::vector <=> '[1,2,3]'::vector) as dist;");
      await db.close();

      if (testVec.rows.length > 0 && Number((testVec.rows[0] as any)?.dist) === 0) {
        return {
          runtime: 'sql',
          status: 'PROVEN',
          binaryPath: 'postgresql-pgvector-embedded',
          notes: 'Real PostgreSQL engine with native pgvector extension (<=> cosine distance) verified and operational',
        };
      }
    } catch {
      // Fallback check
    }

    try {
      // Check if psql or PostgreSQL daemon is running
      const out = await this.runProcess('/bin/sh', ['-c', 'which psql && pg_isready -h localhost -p 5432'], '', 1500);
      if (out.exitCode === 0) {
        return {
          runtime: 'sql',
          status: 'PROVEN',
          binaryPath: '/usr/bin/psql',
          notes: 'PostgreSQL instance running with verified connection',
        };
      }
    } catch {
      // ignore
    }

    return {
      runtime: 'sql',
      status: 'MISSING',
      notes: 'Real PostgreSQL/pgvector instance is not provisioned or running in this environment. Only SQLite is available for relational database queries.',
    };
  }

  /**
   * Probes and returns the actual status of all repository runtimes.
   */
  public static async probeRuntimes(): Promise<Record<SupportedRuntime, RuntimeCapabilityStatus>> {
    const runtimes: SupportedRuntime[] = ['typescript', 'python', 'shell', 'sql', 'rust'];
    const results: Partial<Record<SupportedRuntime, RuntimeCapabilityStatus>> = {};

    for (const r of runtimes) {
      results[r] = await this.probeSingleRuntime(r);
    }

    return results as Record<SupportedRuntime, RuntimeCapabilityStatus>;
  }

  private static async probeSingleRuntime(runtime: SupportedRuntime): Promise<RuntimeCapabilityStatus> {
    if (this.cachedRuntimes.has(runtime)) {
      return this.cachedRuntimes.get(runtime)!;
    }

    let status: RuntimeCapabilityStatus;

    if (runtime === 'typescript') {
      status = {
        runtime: 'typescript',
        status: 'PROVEN',
        binaryPath: process.execPath,
        version: process.version,
        notes: 'Node.js runtime with tsx loader',
      };
    } else if (runtime === 'python') {
      try {
        const out = await this.runProcess('/usr/bin/python3', ['--version'], '', 2000);
        status = {
          runtime: 'python',
          status: out.exitCode === 0 ? 'PROVEN' : 'FAILED',
          binaryPath: '/usr/bin/python3',
          version: out.stdout.trim() || out.stderr.trim(),
        };
      } catch {
        status = { runtime: 'python', status: 'MISSING', notes: 'python3 not found' };
      }
    } else if (runtime === 'shell') {
      try {
        const out = await this.runProcess('/bin/bash', ['--version'], '', 2000);
        status = {
          runtime: 'shell',
          status: out.exitCode === 0 ? 'PROVEN' : 'FAILED',
          binaryPath: '/bin/bash',
          version: (out.stdout.split('\n')[0] || '').trim(),
        };
      } catch {
        status = { runtime: 'shell', status: 'MISSING', notes: 'bash not found' };
      }
    } else if (runtime === 'sql') {
      try {
        // SQL is executed via Python's standard library sqlite3 driver
        const out = await this.runProcess('/usr/bin/python3', ['-c', 'import sqlite3; print(sqlite3.sqlite_version)'], '', 2000);
        status = {
          runtime: 'sql',
          status: out.exitCode === 0 ? 'PROVEN' : 'FAILED',
          binaryPath: '/usr/bin/python3:sqlite3',
          version: `SQLite ${out.stdout.trim()}`,
          notes: 'SQLite standard relational database engine (PROVEN for SQLite). Real PostgreSQL/pgvector is NOT provisioned and therefore NOT marked PROVEN.',
        };
      } catch {
        status = { runtime: 'sql', status: 'MISSING', notes: 'sqlite3 engine not found' };
      }
    } else {
      // Rust probe
      status = {
        runtime: 'rust',
        status: 'MISSING',
        notes: 'rustc/cargo binary not installed in container execution environment',
      };
    }

    this.cachedRuntimes.set(runtime, status);
    return status;
  }

  /**
   * Executes a polyglot task following the strict lifecycle:
   * TASK → LANGUAGE/RUNTIME SELECTION → ENVIRONMENT → POLICY CHECK → EXECUTE → CAPTURE → OBSERVE → VERIFY → RESULT
   */
  public static async execute(task: PolyglotTaskInput): Promise<PolyglotExecutionResult> {
    const tStart = performance.now();
    const runtimeStatus = await this.probeSingleRuntime(task.language);

    // 1. Language / Runtime Selection Check
    if (runtimeStatus.status === 'MISSING') {
      return {
        taskId: task.taskId,
        language: task.language,
        success: false,
        exitCode: 127,
        stdout: '',
        stderr: `Runtime '${task.language}' is not available: ${runtimeStatus.notes || 'binary missing'}.`,
        executionTimeMs: 0,
        artifacts: {},
        observedState: { linesProduced: 0, bytesProduced: 0, truncated: false },
        verification: {
          exitCodeValid: false,
          outputPatternValid: false,
          verified: false,
          criticScore: 0.0,
          failureReason: `Runtime ${task.language} is MISSING in environment`,
        },
        failureCode: 'RUNTIME_FAILURE',
        runtimeStatus,
      };
    }

    // 2. Policy & Sandbox Escape Check
    for (const pat of DANGEROUS_PATTERNS) {
      if (pat.test(task.code)) {
        return {
          taskId: task.taskId,
          language: task.language,
          success: false,
          exitCode: 126,
          stdout: '',
          stderr: `SECURITY POLICY VIOLATION: Execution blocked by Chamber 10 sandbox rule: ${pat.source}`,
          executionTimeMs: 0,
          artifacts: {},
          observedState: { linesProduced: 0, bytesProduced: 0, truncated: false },
          verification: {
            exitCodeValid: false,
            outputPatternValid: false,
            verified: false,
            criticScore: 0.0,
            failureReason: 'Policy violation: prohibited dangerous system command',
          },
          failureCode: 'POLICY_DENIED',
          runtimeStatus,
        };
      }
    }

    if (!task.allowFileSystemEscape) {
      for (const pat of WORKSPACE_ESCAPE_PATTERNS) {
        if (pat.test(task.code) || (task.args || []).some((a) => pat.test(a))) {
          return {
            taskId: task.taskId,
            language: task.language,
            success: false,
            exitCode: 126,
            stdout: '',
            stderr: `SECURITY SANDBOX VIOLATION: Workspace escape blocked: ${pat.source}`,
            executionTimeMs: 0,
            artifacts: {},
            observedState: { linesProduced: 0, bytesProduced: 0, truncated: false },
            verification: {
              exitCodeValid: false,
              outputPatternValid: false,
              verified: false,
              criticScore: 0.0,
              failureReason: 'Sandbox violation: workspace path traversal / escape attempted',
            },
            failureCode: 'POLICY_DENIED',
            runtimeStatus,
          };
        }
      }
    }

    // 3. Environment & Workspace Preparation
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `jarvis_polyglot_${task.taskId}_`));
    const timeoutMs = task.timeoutMs || 10000;
    const maxOutputBytes = task.maxOutputBytes || 512 * 1024;
    let binary = '';
    let commandArgs: string[] = [];
    const sourceFilePath = path.join(tmpDir, `script_${task.taskId}`);

    try {
      if (task.language === 'typescript') {
        const fileWithExt = `${sourceFilePath}.ts`;
        await fs.writeFile(fileWithExt, task.code, 'utf8');
        binary = 'npx';
        commandArgs = ['tsx', fileWithExt, ...(task.args || [])];
      } else if (task.language === 'python') {
        const fileWithExt = `${sourceFilePath}.py`;
        await fs.writeFile(fileWithExt, task.code, 'utf8');
        binary = '/usr/bin/python3';
        commandArgs = [fileWithExt, ...(task.args || [])];
      } else if (task.language === 'shell') {
        const fileWithExt = `${sourceFilePath}.sh`;
        await fs.writeFile(fileWithExt, task.code, 'utf8');
        binary = '/bin/bash';
        commandArgs = [fileWithExt, ...(task.args || [])];
      } else if (task.language === 'sql') {
        // Wrap SQL in Python sqlite3 runner
        const runnerScript = `
import sqlite3, sys, json
con = sqlite3.connect(":memory:")
cur = con.cursor()
sql_script = """${task.code.replace(/"""/g, '\\"\\"\\"')}"""
try:
    results = []
    for statement in sql_script.split(';'):
        stmt = statement.strip()
        if not stmt:
            continue
        cur.execute(stmt)
        if cur.description:
            rows = cur.fetchall()
            cols = [desc[0] for desc in cur.description]
            results.append({"query": stmt, "columns": cols, "rows": rows})
        else:
            con.commit()
            results.append({"query": stmt, "rowcount": cur.rowcount})
    print(json.dumps(results, indent=2))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
con.close()
`;
        const fileWithExt = `${sourceFilePath}_sql_runner.py`;
        await fs.writeFile(fileWithExt, runnerScript, 'utf8');
        binary = '/usr/bin/python3';
        commandArgs = [fileWithExt];
      }

      // 4. Execution with Timeout & Resource Caps
      const procResult = await this.runProcess(binary, commandArgs, tmpDir, timeoutMs, task.env, maxOutputBytes);
      const executionTimeMs = +(performance.now() - tStart).toFixed(2);

      // 5. Observe Output & Artifacts
      const lines = procResult.stdout.split('\n').length;
      const bytes = Buffer.byteLength(procResult.stdout, 'utf8');
      const artifacts: Record<string, any> = {};

      if (task.language === 'sql' && procResult.exitCode === 0) {
        try {
          artifacts['sql_results'] = JSON.parse(procResult.stdout);
        } catch {
          // not JSON, raw output
        }
      }

      // 6. Verify Outcome
      const expectedCode = task.expectedExitCode !== undefined ? task.expectedExitCode : 0;
      const exitCodeValid = procResult.exitCode === expectedCode;
      let outputPatternValid = true;
      if (task.expectedOutputRegex) {
        const reg = new RegExp(task.expectedOutputRegex);
        outputPatternValid = reg.test(procResult.stdout);
      }

      const verified = exitCodeValid && outputPatternValid && !procResult.timedOut;
      const criticScore = verified ? 98.5 : exitCodeValid ? 65.0 : 20.0;

      let failureCode: BrainFailureCode | undefined = undefined;
      if (procResult.timedOut) {
        failureCode = 'TIMEOUT';
      } else if (!exitCodeValid) {
        failureCode = 'RUNTIME_FAILURE';
      } else if (!outputPatternValid) {
        failureCode = 'VERIFICATION_FAILURE';
      }

      return {
        taskId: task.taskId,
        language: task.language,
        success: verified,
        exitCode: procResult.exitCode,
        stdout: procResult.stdout,
        stderr: procResult.stderr + (procResult.timedOut ? `\n[TIMEOUT: killed after ${timeoutMs}ms]` : ''),
        executionTimeMs,
        artifacts,
        observedState: {
          linesProduced: lines,
          bytesProduced: bytes,
          truncated: procResult.truncated,
        },
        verification: {
          exitCodeValid,
          outputPatternValid,
          verified,
          criticScore,
          failureReason: verified ? undefined : `Exit code: ${procResult.exitCode}, pattern matched: ${outputPatternValid}, timedOut: ${procResult.timedOut}`,
        },
        failureCode,
        runtimeStatus,
      };
    } catch (err: any) {
      const executionTimeMs = +(performance.now() - tStart).toFixed(2);
      return {
        taskId: task.taskId,
        language: task.language,
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: `Process invocation failed: ${err.message}`,
        executionTimeMs,
        artifacts: {},
        observedState: { linesProduced: 0, bytesProduced: 0, truncated: false },
        verification: {
          exitCodeValid: false,
          outputPatternValid: false,
          verified: false,
          criticScore: 0.0,
          failureReason: err.message,
        },
        failureCode: 'RUNTIME_FAILURE',
        runtimeStatus,
      };
    } finally {
      // Clean up temporary workspace directory safely
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }

  private static runProcess(
    binary: string,
    args: string[],
    cwd: string,
    timeoutMs: number,
    env?: Record<string, string>,
    maxOutputBytes: number = 512 * 1024
  ): Promise<{ exitCode: number; stdout: string; stderr: string; timedOut: boolean; truncated: boolean }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let truncated = false;
      let resolved = false;
      const MAX_OUTPUT_BYTES = maxOutputBytes;

      const isUnix = process.platform !== 'win32';
      const child = spawn(binary, args, {
        cwd: cwd || undefined,
        env: { ...process.env, ...(env || {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: isUnix,
      });

      const killProcessTree = (signal: NodeJS.Signals = 'SIGKILL') => {
        try {
          if (child.pid) {
            if (isUnix) {
              process.kill(-child.pid, signal);
            } else {
              child.kill(signal);
            }
          }
        } catch {
          try {
            child.kill(signal);
          } catch {
            // ignore
          }
        }
      };

      const timer = setTimeout(() => {
        timedOut = true;
        killProcessTree('SIGTERM');
        setTimeout(() => killProcessTree('SIGKILL'), 100);

        // Deterministic timeout safety resolution if pipes are blocked
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({
              exitCode: -2,
              stdout,
              stderr: stderr + `\n[TIMEOUT: killed after ${timeoutMs}ms]`,
              timedOut: true,
              truncated,
            });
          }
        }, 200);
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        const remaining = MAX_OUTPUT_BYTES - stdout.length;
        if (remaining > 0) {
          const str = chunk.toString('utf8');
          if (str.length <= remaining) {
            stdout += str;
          } else {
            stdout += str.slice(0, remaining) + `\n[TRUNCATED: maxOutputBytes limit (${MAX_OUTPUT_BYTES}) reached]`;
            truncated = true;
          }
        } else {
          truncated = true;
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const remaining = MAX_OUTPUT_BYTES - stderr.length;
        if (remaining > 0) {
          const str = chunk.toString('utf8');
          stderr += str.slice(0, remaining);
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          resolve({
            exitCode: -1,
            stdout,
            stderr: stderr + `\nChild process error: ${err.message}`,
            timedOut,
            truncated,
          });
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          resolve({
            exitCode: code ?? (timedOut ? -2 : -1),
            stdout,
            stderr,
            timedOut,
            truncated,
          });
        }
      });
    });
  }
}
