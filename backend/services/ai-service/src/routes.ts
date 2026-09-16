import express from 'express';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { difficulty, topic, pattern } = req.body;
  
  // Dummy AI generation for MVP (in production this would call OpenAI/Gemini)
  const generatedQuestion = {
    title: `AI Generated ${topic || 'Array'} Problem - ${Date.now()}`,
    slug: `ai-gen-${Date.now()}`,
    description: `This is an AI generated problem about ${topic || 'Arrays'} and ${pattern || 'Two Pointers'}.`,
    difficulty: difficulty || 'MEDIUM',
    constraints: ['1 <= nums.length <= 10^4'],
    starterCode: {
      javascript: 'function solve(nums) {\n  // your code here\n}',
      python: 'def solve(nums):\n    # your code here'
    }
  };

  res.status(200).json(generatedQuestion);
});

export default router;
