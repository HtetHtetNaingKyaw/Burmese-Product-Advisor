-- Run once against the application database as a superuser.
-- The portable setup script (pnpm db:setup) runs this automatically.
CREATE EXTENSION IF NOT EXISTS vector;

SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
