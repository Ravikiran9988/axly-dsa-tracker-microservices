import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface ExecutionResult {
  status: string;
  output?: string;
  error?: string;
  executionTime: number;
  passedTests: number;
  totalTests: number;
  results?: any[];
}

const MAX_CODE = 100_000;
const MAX_INPUT = 20_000;
const MAX_OUTPUT = 64 * 1024;
const TIMEOUT = 5_000;
const COMPILE_TIMEOUT = 10_000;

const SAFE_ENV = {
  PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  HOME: os.tmpdir(),
  TMPDIR: os.tmpdir()
};

const LANGUAGE_FILES: Record<string, string> = {
  java: 'Main.java',
  python: 'main.py',
  python3: 'main.py',
  py: 'main.py',
  typescript: 'main.ts',
  ts: 'main.ts',
  javascript: 'main.js',
  js: 'main.js',
  node: 'main.js',
  cpp: 'main.cpp',
  c: 'main.c'
};

function normalizeOutput(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function outputsMatch(actual: string, expected: string): boolean {
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);
  if (normalizedActual === normalizedExpected) return true;
  try {
    const actualValue = JSON.parse(normalizedActual);
    const expectedValue = JSON.parse(normalizedExpected);
    return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  } catch {
    return false;
  }
}

function ensureExecutableDriver(sourceCode: string, language: string): string {
  if (typeof sourceCode !== 'string') return sourceCode;
  const lang = String(language || '').toLowerCase();
  
  if (lang.includes('javascript') || lang.includes('typescript') || lang === 'js' || lang === 'ts' || lang === 'node') {
    if (!sourceCode.includes('console.log') && !sourceCode.includes('process.stdout')) {
      return `${sourceCode}\n\nconst _fs = require('fs');\ntry {\n  const _raw = _fs.readFileSync(0, 'utf-8').trim();\n  if (_raw) {\n    const _tokens = _raw.split(/\\s+/).map((x) => isNaN(Number(x)) ? x : Number(x));\n    const _fn = typeof solve === 'function' ? solve : typeof solution === 'function' ? solution : null;\n    if (_fn) { const _res = _fn(..._tokens); if (_res !== undefined) console.log(_res); }\n  }\n} catch (_) {}\n`;
    }
  } else if (lang.includes('python') || lang === 'py') {
    if (!sourceCode.includes('print(') && !sourceCode.includes('sys.stdout')) {
      return `${sourceCode}\n\nimport sys\ntry:\n    _input = sys.stdin.read().split()\n    if _input:\n        _args = [int(x) if x.lstrip('-').isdigit() else x for x in _input]\n        _fn = globals().get('solve') or globals().get('solution')\n        if _fn:\n            _res = _fn(*_args)\n            if _res is not None: print(_res)\nexcept Exception: pass\n`;
    }
  }
  return sourceCode;
}

function executeProcess(command: string, args: string[], input: string, timeoutMs: number): Promise<any> {
  return new Promise(resolve => {
    let child: any;
    let timer: NodeJS.Timeout;
    let settled = false;
    let stdout = '';
    let stderr = '';
    const started = Date.now();

    const finish = (result: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, execution_time_ms: Date.now() - started });
    };

    try {
      const isWin = process.platform === 'win32';
      const spawnOptions: any = {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: SAFE_ENV,
        windowsHide: true
      };
      if (isWin && (command.endsWith('.cmd') || command.endsWith('.bat') || command === 'cmd')) {
        spawnOptions.shell = true;
      }
      child = spawn(command, args, spawnOptions);
    } catch (e: any) {
      finish({ status: 'RUNTIME_ERROR', stdout: '', stderr: e.message });
      return;
    }

    const killGroup = () => {
      try {
        if (process.platform !== 'win32' && child.pid) {
          process.kill(-child.pid, 'SIGKILL');
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        try { child.kill('SIGKILL'); } catch {}
      }
    };

    timer = setTimeout(() => {
      killGroup();
      finish({ status: 'TIME_LIMIT_EXCEEDED', stdout, stderr });
    }, timeoutMs);

    child.stdout.on('data', (chunk: any) => {
      stdout += chunk.toString();
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) {
        killGroup();
        finish({
          status: 'OUTPUT_LIMIT_EXCEEDED',
          stdout: stdout.slice(0, MAX_OUTPUT),
          stderr: 'Output limit exceeded'
        });
      }
    });

    child.stderr.on('data', (chunk: any) => {
      stderr += chunk.toString();
      if (Buffer.byteLength(stderr) > MAX_OUTPUT) {
        killGroup();
        finish({
          status: 'OUTPUT_LIMIT_EXCEEDED',
          stdout,
          stderr: stderr.slice(0, MAX_OUTPUT)
        });
      }
    });

    child.on('error', (err: any) => finish({ status: 'RUNTIME_ERROR', stdout, stderr: err.message }));
    child.on('close', (code: number) => finish({
      status: code === 0 ? 'PASSED' : 'RUNTIME_ERROR',
      stdout: stdout.slice(0, MAX_OUTPUT),
      stderr: stderr.slice(0, MAX_OUTPUT),
      exitCode: code
    }));

    try {
      child.stdin.end(input || '');
    } catch (err: any) {
      finish({ status: 'RUNTIME_ERROR', stdout, stderr: err.message });
    }
  });
}

export const executeCode = async (
  language: string, 
  code: string, 
  testCases: any[]
): Promise<ExecutionResult> => {
  const lang = String(language || '').toLowerCase();
  
  if (!Object.hasOwn(LANGUAGE_FILES, lang)) throw new Error('Unsupported language');
  if (code.length > MAX_CODE) throw new Error('Source code is too large');
  
  // If no test cases are provided, create a default empty one
  if (!testCases || testCases.length === 0) {
    testCases = [{ input: '', expected_output: '', is_hidden: false }];
  }
  
  if (testCases.some(t => String(t.input || '').length > MAX_INPUT)) {
    throw new Error('Test input is too large');
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'axly-'));
  const file = path.join(dir, LANGUAGE_FILES[lang]);

  try {
    const codeToRun = ensureExecutableDriver(code, lang);
    fs.writeFileSync(file, codeToRun, { mode: 0o600 });

    let command: string;
    let args: string[];
    let executionFile = file;

    const isWin = process.platform === 'win32';
    const shellCmd = isWin ? 'cmd' : 'sh';
    const shellArg = isWin ? '/c' : '-c';

    if (lang === 'typescript' || lang === 'ts') {
      const compiled = await executeProcess(
        isWin ? 'npx.cmd' : 'npx',
        ['tsc', '--target', 'ES2022', '--module', 'commonjs', '--outDir', dir, file],
        '',
        COMPILE_TIMEOUT
      );
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          error: compiled.stderr,
          output: compiled.stdout,
          executionTime: compiled.execution_time_ms,
          passedTests: 0,
          totalTests: testCases.length,
        };
      }
      executionFile = path.join(dir, 'main.js');
      command = 'node';
      args = [executionFile];
    } else if (lang === 'c' || lang === 'cpp') {
      const compiler = lang === 'c' ? 'gcc' : 'g++';
      const out = path.join(dir, isWin ? 'program.exe' : 'program');
      const compiled = await executeProcess(compiler, ['-O2', file, '-o', out], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          error: compiled.stderr,
          output: compiled.stdout,
          executionTime: compiled.execution_time_ms,
          passedTests: 0,
          totalTests: testCases.length,
        };
      }
      command = out;
      args = [];
    } else if (lang === 'java') {
      const compiled = await executeProcess('javac', [file], '', COMPILE_TIMEOUT);
      if (compiled.status !== 'PASSED') {
        return {
          status: 'COMPILATION_ERROR',
          error: compiled.stderr,
          output: compiled.stdout,
          executionTime: compiled.execution_time_ms,
          passedTests: 0,
          totalTests: testCases.length,
        };
      }
      command = 'java';
      args = ['-cp', dir, 'Main'];
    } else {
      command = lang.includes('python') ? (isWin ? 'python' : 'python3') : 'node';
      args = [executionFile];
    }

    const results = [];
    let totalExecution = 0;

    for (const tc of testCases) {
      const result = await executeProcess(command, args, String(tc.input || ''), TIMEOUT);
      totalExecution += result.execution_time_ms;

      const actual = normalizeOutput(result.stdout);
      const expected = normalizeOutput(tc.expected_output || tc.expectedOutput);
      const hidden = Boolean(tc.is_hidden || tc.isHidden);
      const outputMatches = result.status === 'PASSED' && (!expected || outputsMatch(actual, expected));

      results.push({
        is_hidden: hidden,
        input: hidden ? '[Hidden Test Case]' : String(tc.input || ''),
        expected_output: hidden ? '[Hidden Output]' : expected,
        actual_output: hidden ? (outputMatches ? '[Output Passed]' : '[Output Failed]') : actual,
        status: result.status === 'PASSED' && !outputMatches ? 'WRONG_ANSWER' : result.status,
        stderr: hidden ? undefined : result.stderr
      });

      if (!outputMatches) break;
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const failed = results[results.length - 1];
    const status = failed?.status === 'TIME_LIMIT_EXCEEDED'
      ? 'TIME_LIMIT_EXCEEDED'
      : failed?.status === 'OUTPUT_LIMIT_EXCEEDED'
        ? 'OUTPUT_LIMIT_EXCEEDED'
        : failed?.status === 'RUNTIME_ERROR'
          ? 'RUNTIME_ERROR'
          : failed?.status === 'WRONG_ANSWER'
            ? 'WRONG_ANSWER'
            : passedTests === testCases.length
              ? 'success'
              : 'WRONG_ANSWER';

    return {
      status,
      passedTests,
      totalTests: testCases.length,
      executionTime: totalExecution,
      results
    };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
};
