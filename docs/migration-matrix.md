# Migration Matrix

| SOURCE FILE | SOURCE FUNCTIONALITY | TARGET SERVICE | TARGET FILE | DATABASE TABLE | API | EVENT | DEPENDENCIES | TESTS | STATUS | GAPS |
|-------------|----------------------|----------------|-------------|----------------|-----|-------|--------------|-------|--------|------|
| backend/src/app.js | src | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/config/runtimeDatabase.js | config | execution-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/aiQuestionController.js | controller | question-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/analyticsController.js | controller | progress-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/auditController.js | controller | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/authController.js | controller | auth-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/codeExecutionController.js | controller | execution-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/dailyChallengeController.js | controller | ai-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/dsaAiController.js | controller | ai-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/notificationController.js | controller | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/practiceController.js | controller | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/progressController.js | controller | progress-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/questionController.js | controller | question-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/recommendationController.js | controller | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/submissionController.js | controller | submission-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/controllers/userController.js | controller | auth-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/authUserRepository.js | db | auth-service | TBD | YES |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/db.js | db | TBD | TBD | YES |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/postgres.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/postgresRepository.js | db | TBD | TBD | YES |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/postgresSchema.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/postgresSeed.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/practiceSchema.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/practiceSeed.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/questionRepository.js | db | question-service | TBD | YES |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/questionVersioning.js | db | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/repository.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/repositoryContract.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/repositoryFactory.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/seed.js | db | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/db/sqliteRepository.js | db | TBD | TBD | YES |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/middleware/auth.js | middleware | auth-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/middleware/errorHandler.js | middleware | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/middleware/rateLimiter.js | middleware | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/middleware/rbac.js | middleware | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/middleware/validator.js | middleware | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/aiQuestionRoutes.js | route | question-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/analyticsRoutes.js | route | progress-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/assignmentRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/auditRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/authRoutes.js | route | auth-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/codeExecutionRoutes.js | route | execution-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/cohortRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/dailyChallengeRoutes.js | route | ai-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/dsaAiRoutes.js | route | ai-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/notificationRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/practiceRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/progressRoutes.js | route | progress-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/questionRoutes.js | route | question-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/recommendationRoutes.js | route | TBD | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/submissionRoutes.js | route | submission-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/routes/userRoutes.js | route | auth-service | TBD |  | YES | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/server.js | src | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiDailyChallengeAuthoringService.js | service | auth-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiDailyChallengeService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiQuestionGenerationPipeline.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiQuestionService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiReviewService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/aiSharedGenerationService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/analyticsService.js | service | progress-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/auditService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/automationRunLease.js | service | execution-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dailyChallengeAutomationService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dailyChallengeService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaAiCacheService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaAiCoachService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaAiObservabilityService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaAiService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaIntentDetectorService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaKnowledgeGraphService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/dsaProblemMatcherService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/emailService.js | service | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/embeddingService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/executionService.js | service | execution-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/fallbackTemplates.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/gamificationService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/githubSubmissionService.js | service | submission-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/leaderboardService.js | service | progress-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/baseProvider.js | llm | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/geminiProvider.js | llm | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/groqProvider.js | llm | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/llmRouter.js | llm | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/mockProvider.js | llm | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/llm/openAICompatibleProvider.js | llm | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/notificationService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/practiceService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/progressService.js | service | progress-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionBankAutomationService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionEmbeddingService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionLifecycleService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionNoveltyService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/questionSimilarityService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/recommendationService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/scoringService.js | service | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/streakService.js | service | progress-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/submissionService.js | service | submission-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/topicService.js | service | question-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/services/__tests__/dailyChallengeSchedule.test.js | __tests__ | ai-service | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/utils/dateUtils.js | util | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
| backend/src/validation/schemas.js | validation | TBD | TBD |  |  | TBD | TBD | TBD | Pending | Need to migrate |
