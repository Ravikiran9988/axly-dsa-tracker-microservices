#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE question_db;
    CREATE DATABASE submission_db;
    CREATE DATABASE challenge_db;
    CREATE DATABASE progress_db;
EOSQL
