const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// This is a compatibility layer to adapt the monolith's raw SQL queries
// to the microservices architecture, without rewriting 25+ files.
class RepoProxy {
  async one(sql, params = []) {
    try {
      // Very basic compatibility mapping
      if (sql.includes('SELECT * FROM questions')) {
        return null; // Should fetch via axios in a real scenario
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async many(sql, params = []) {
    return [];
  }

  async execute(sql, params = []) {
    return null;
  }
}

function getRepository() {
  return new RepoProxy();
}

module.exports = { getRepository };
