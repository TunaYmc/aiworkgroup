-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'pgvector and uuid-ossp extensions initialized successfully.';
END $$;
