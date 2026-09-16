import express from 'express';
import axios from 'axios';
import prisma from './db';
import { RabbitMQClient } from 'shared';

const router = express.Router();
const EXECUTION_SERVICE_URL = process.env.EXECUTION_SERVICE_URL || 'http://localhost:5004';
const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002'; // To fetch test cases

// Execute code without submission
router.post('/run', async (req, res) => {
  const { question_id, language, source_code, custom_input } = req.body;
  if (!question_id || !language || !source_code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let testCasesToRun = [];
    if (custom_input !== undefined && custom_input !== null && custom_input.trim() !== '') {
      testCasesToRun = [{ id: 'custom', input: custom_input, expected_output: '', is_hidden: false }];
    } else {
      // In microservices, we need to fetch test cases from the Question Service
      try {
        const qRes = await axios.get(`${QUESTION_SERVICE_URL}/internal/${question_id}/testcases`);
        testCasesToRun = qRes.data || [];
      } catch (err) {
        console.error("Failed to fetch test cases", err);
      }
      
      if (testCasesToRun.length === 0) {
        testCasesToRun = [{ id: 'sample', input: '', expected_output: '', is_hidden: false }];
      }
    }

    const executionResponse = await axios.post(EXECUTION_SERVICE_URL, {
      language,
      code: source_code,
      testCases: testCasesToRun
    });

    return res.status(200).json({
      data: {
        question_id,
        language,
        status: executionResponse.data.status,
        passed_tests: executionResponse.data.passedTests,
        total_tests: executionResponse.data.totalTests,
        execution_time_ms: executionResponse.data.executionTime,
        results: executionResponse.data.results
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Execution failed', details: error.message });
  }
});

// Submit code
router.post('/submit', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const correlationId = req.headers['x-correlation-id'] as string || 'system';
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { question_id, language, source_code } = req.body;
  if (!question_id || !language || !source_code) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch ALL test cases from Question Service
    let allTestCases = [];
    try {
      const qRes = await axios.get(`${QUESTION_SERVICE_URL}/internal/${question_id}/all-testcases`);
      allTestCases = qRes.data || [];
    } catch (err) {
      console.error("Failed to fetch test cases", err);
    }
    if (allTestCases.length === 0) {
      allTestCases = [{ id: 'sample', input: '', expected_output: '', is_hidden: false }];
    }

    // 2. Execute Code
    const executionResponse = await axios.post(EXECUTION_SERVICE_URL, {
      language,
      code: source_code,
      testCases: allTestCases
    });
    const execResult = executionResponse.data;
    const isAllPassed = execResult.status === 'success' && execResult.passedTests === allTestCases.length;
    const finalStatus = isAllPassed ? 'solved' : 'attempted';

    // 3. Save Log
    const log = await prisma.codeSubmissionLog.create({
      data: {
        userId,
        questionId: question_id,
        code: source_code,
        language,
        status: execResult.status,
        passedTests: execResult.passedTests || 0,
        totalTests: allTestCases.length,
        executionTimeMs: execResult.executionTime || 0
      }
    });

    // 4. Update Submission
    const submission = await prisma.submission.upsert({
      where: { userId_questionId: { userId, questionId: question_id } },
      update: {
        status: finalStatus,
        attemptCount: { increment: 1 },
        attemptedAt: new Date(),
        solvedAt: isAllPassed ? new Date() : undefined,
      },
      create: {
        userId,
        questionId: question_id,
        status: finalStatus,
        attemptCount: 1,
        startedAt: new Date(),
        attemptedAt: new Date(),
        solvedAt: isAllPassed ? new Date() : null,
      }
    });

    // 5. Emit Event
    const mq = RabbitMQClient.getInstance();
    await mq.publish('events', 'submission.completed', {
      submissionId: submission.id,
      userId: submission.userId,
      questionId: submission.questionId,
      status: submission.status,
      logId: log.id
    }, correlationId);

    return res.status(200).json({
      data: {
        submission_id: log.id,
        question_id,
        language,
        status: execResult.status,
        passed_tests: execResult.passedTests,
        total_tests: allTestCases.length,
        execution_time_ms: execResult.executionTime,
        submission_status: finalStatus,
        results: execResult.results,
        // The gamification values will be returned asynchronously in the progress service,
        // but for MVP we return 0. The frontend typically polls or relies on the updated progress payload.
        points_awarded: 0,
        scoring: {
          test_score: 0,
          points_awarded: 0
        },
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Submission failed', details: error.message });
  }
});

// History
router.get('/submissions/:questionId', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const history = await prisma.codeSubmissionLog.findMany({
      where: { userId, questionId: req.params.questionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        questionId: true,
        language: true,
        code: true,
        status: true,
        passedTests: true,
        totalTests: true,
        executionTimeMs: true,
        createdAt: true
      }
    });
    // Map to frontend expected shape
    const mapped = history.map(h => ({
      id: h.id,
      question_id: h.questionId,
      language: h.language,
      source_code: h.code,
      status: h.status,
      passed_tests: h.passedTests,
      total_tests: h.totalTests,
      execution_time_ms: h.executionTimeMs,
      created_at: h.createdAt
    }));
    res.status(200).json({ data: mapped });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
