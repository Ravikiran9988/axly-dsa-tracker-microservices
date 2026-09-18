import axios from 'axios';

function extractJson(text: string) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('LLM returned invalid JSON');
  return JSON.parse(match[0]);
}

export async function reviewCode({ submission_id }: { submission_id: string }) {
  const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://localhost:5004';
  const QUESTION_SERVICE_URL = process.env.QUESTION_SERVICE_URL || 'http://localhost:5002';

  const subRes = await axios.get(`${SUBMISSION_SERVICE_URL}/internal/submissions/${submission_id}`);
  const submission = subRes.data;
  
  if (!submission) throw new Error('Submission not found');
  if (!submission.code) throw new Error('This submission has no code to review');

  const qRes = await axios.get(`${QUESTION_SERVICE_URL}/${submission.questionId}`);
  const question = qRes.data;

  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('LLM review is not configured. Set LLM_API_KEY.');

  const base = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const prompt = `Review this DSA solution. Return ONLY JSON with keys score (0-100), correctness, time_complexity, space_complexity, code_quality, readability, suggestions. Do not execute code. Problem: ${question.title}\n${question.problemStatement || question.description || ''}\nConstraints: ${question.constraints || ''}\nLanguage: ${submission.language || ''}\nCode:\n${submission.code}`;

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a rigorous DSA code reviewer. Be concise and factual.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) throw new Error(`LLM provider error (${response.status})`);
  const data = await response.json();
  const result = extractJson(data?.choices?.[0]?.message?.content);
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));
  const feedback = JSON.stringify(result);

  await axios.patch(`${SUBMISSION_SERVICE_URL}/internal/submissions/${submission_id}/ai-review`, {
    aiScore: score,
    aiFeedback: feedback
  });

  return { ...submission, aiScore: score, aiFeedback: feedback };
}
