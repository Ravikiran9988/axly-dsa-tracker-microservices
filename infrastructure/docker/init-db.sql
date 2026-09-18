#!/bin/bash
set -e

# Create databases for each microservice
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_service_db;
    CREATE DATABASE question_service_db;
    CREATE DATABASE submission_service_db;
    CREATE DATABASE ai_service_db;
    CREATE DATABASE daily_challenge_service_db;
    CREATE DATABASE progress_service_db;
    CREATE DATABASE notification_service_db;
    CREATE DATABASE cohort_service_db;
EOSQL

# Enable pgvector extension for AI service
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "ai_service_db" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL

echo "All databases created successfully!"
