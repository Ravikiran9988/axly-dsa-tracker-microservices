# Database Ownership Map

This document defines the strict bounded context boundaries for the Axly DSA Tracker microservices architecture. It maps the monolithic Supabase PostgreSQL tables to their target microservice owners.

## Rules of Engagement
- **Canonical Ownership**: A table is owned by exactly one service.
- **Foreign Keys**: Services cannot enforce strict cross-database foreign keys. They must store the referenced ID (e.g., `user_id` in Submission Service) and trust the owning service for referential integrity or use eventual consistency/event-driven verification.
- **Canonical Questions**: `questions` and its closely coupled metadata (`test_cases`) are owned entirely by `question-service`. Other services must NEVER duplicate canonical question data.

---

## 1. Auth Service
Responsible for user identity, roles, and authentication.
- `users` (id, email, name, role)
- `roles`
- `audit_logs` (admin actions, auth events)

## 2. Question Service
The absolute source of truth for DSA content.
- `topics`
- `patterns`
- `questions` (CANONICAL SOURCE)
- `test_cases`
- `question_metadata`
- `question_generation_metadata`
- `question_prerequisites`

## 3. Submission Service
Responsible for student submissions and the results of execution runs.
- `submissions` (id, user_id, question_id, source_code, language, status, execution_time, score)
- `submission_results` (test case outcomes)

## 4. Execution Service
Stateless runner engine.
- *No persistent canonical data.* (May use Redis or transient tables for sandbox state).

## 5. Daily Challenge Service
Responsible for daily challenge lifecycles.
- `daily_challenges` (id, question_id, date, status)
- `legacy_daily_questions` (TRANSITIONAL ONLY - to be deprecated in favor of `daily_challenges`)

## 6. Progress Service
Responsible for analytics, streaks, and leaderboards based on event streams (e.g. `submission.completed`).
- `user_progress` (user_id, question_id, solved_at)
- `streaks` (user_id, current_streak, max_streak)
- `leaderboard` (derived view or materialized table of scores)

## 7. AI Service
Responsible for embedding indices, RAG context, and provider caching.
- `question_embeddings` (vector store integration or pgvector)
- `ai_generation_logs`
