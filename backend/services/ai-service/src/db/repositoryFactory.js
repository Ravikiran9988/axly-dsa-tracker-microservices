const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class InterceptingRepository {
  async one(query, params = []) {
    return this.routeQuery(query, params, true);
  }

  async many(query, params = []) {
    return this.routeQuery(query, params, false);
  }

  async execute(query, params = []) {
    return this.routeQuery(query, params, false, true);
  }

  async routeQuery(query, params, isOne, isExecute = false) {
    const q = query.toLowerCase().replace(/\s+/g, ' ');
    
    try {
      // 1. aiReviewService / submissions
      if (q.includes('submissions')) {
        const res = await axios.post('http://localhost:3004/api/internal/raw-query', { query, params, isOne, isExecute });
        return res.data;
      }
      
      // 2. aiQuestionGenerationPipeline / questions
      if (q.includes('from questions') || q.includes('daily_challenge_metadata')) {
        const res = await axios.post('http://localhost:3002/api/internal/raw-query', { query, params, isOne, isExecute });
        return res.data;
      }

      // 3. Fallback (question_embeddings) handled locally via Prisma
      if (isExecute) {
        return await prisma.$executeRawUnsafe(query, ...params);
      } else {
        const rows = await prisma.$queryRawUnsafe(query, ...params);
        return isOne ? rows[0] : rows;
      }
    } catch(err) {
      console.error('[InterceptingRepository] Error:', err.message);
      throw err;
    }
  }
}

let instance = null;

function getRepository() {
  if (!instance) {
    instance = new InterceptingRepository();
  }
  return instance;
}

module.exports = {
  getRepository
};
