# Architecture: API Gateway Pattern

## Overview
Axly DSA Tracker uses an API Gateway pattern to mediate communication between the React frontend and the backend microservices.

## The Rule of Isolation
1. **Frontend Isolation**: The frontend must NEVER call microservices directly. It communicates exclusively via the Gateway URL (e.g., `http://localhost:4000/api/users`).
2. **Gateway Responsibility**: The Gateway is responsible for cross-cutting concerns ONLY:
   - Security headers (Helmet)
   - CORS configuration
   - Rate limiting
   - Logging (Morgan)
   - Authentication (JWT validation placeholder)
   - Request proxying
3. **Gateway Restrictions**:
   - NO business logic.
   - NO direct database connections.
   - NO importing of source code or entities from the `services/` directory.

## Current Setup (Phase 1)
- The Gateway uses `http-proxy-middleware` to forward requests based on environment variables (`USER_SERVICE_URL`, `PROBLEM_SERVICE_URL`).
- JWT middleware validates tokens and attaches user context before proxying requests to downstream services.
