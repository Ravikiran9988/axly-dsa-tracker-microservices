# Axly DSA Tracker - Microservices Architecture

This repository holds the Phase 1 microservices foundation for Axly DSA Tracker.

## Architecture

- **Frontend**: React + TypeScript + Vite. Communicates *only* with the API Gateway.
- **Gateway**: Node.js + TypeScript API Gateway. Handles routing, security, and rate-limiting.
- **Services**: Coming soon (User Service, Problem Service, etc.).
- **Infrastructure**: Dockerized PostgreSQL, Redis, and RabbitMQ.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### Running Infrastructure
```bash
cd infrastructure
docker-compose up -d
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Gateway
```bash
cd backend/gateway
npm install
npm run dev
```
