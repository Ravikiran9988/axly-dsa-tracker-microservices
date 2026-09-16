import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface ExecutionResult {
  status: 'SUCCESS' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  output: string;
  error?: string;
  executionTime: number;
}

export const executeJavascript = async (code: string, timeoutMs: number = 3000): Promise<ExecutionResult> => {
  const tmpDir = os.tmpdir();
  const filename = crypto.randomUUID() + '.js';
  const filePath = path.join(tmpDir, filename);

  // Note: For MVP, we run the code directly in Node.js. 
  // In production, this should run inside a restricted container or VM (e.g. isolated-vm, Docker).
  fs.writeFileSync(filePath, code);

  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('node', [filePath], {
      // Disallow network/file access as much as possible using Node flags if available, 
      // but standard Node doesn't isolate well. MVP relies on OS level constraints.
      timeout: timeoutMs, 
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 1024 * 50) { // Limit output to 50KB
        child.kill();
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (codeStatus, signal) => {
      const executionTime = Date.now() - startTime;
      
      // Cleanup
      try { fs.unlinkSync(filePath); } catch(e) {}

      if (signal === 'SIGTERM' || executionTime >= timeoutMs) {
        return resolve({ status: 'TIME_LIMIT_EXCEEDED', output: stdout, executionTime });
      }

      if (codeStatus !== 0) {
        return resolve({ 
          status: 'RUNTIME_ERROR', 
          output: stdout, 
          error: stderr, 
          executionTime 
        });
      }

      resolve({ status: 'SUCCESS', output: stdout, executionTime });
    });
    
    // In case the spawn fails entirely (e.g., node not found)
    child.on('error', (err) => {
      try { fs.unlinkSync(filePath); } catch(e) {}
      resolve({ status: 'RUNTIME_ERROR', output: '', error: err.message, executionTime: 0 });
    });
  });
};
