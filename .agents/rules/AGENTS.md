# Strict Engineering & System Execution Rules

## CRITICAL BEHAVIORAL DIRECTIVES (PERMANENT ACROSS ALL CONVERSATIONS)

1. **MANDATORY LIVE PRODUCTION DEPLOYMENT & VERIFICATION**:
   - EVERYTHING MUST BE LIVE. NEVER consider a feature, bug fix, or persistence update complete based only on local code edits or local servers.
   - All backend changes MUST be deployed to Google Cloud Run (`one-to-one-backend-858977785048.us-central1.run.app`) and database migrations executed on Cloud SQL.
   - All frontend changes MUST be deployed to Vercel (`https://ejportal.vercel.app/`).
   - Every data persistence operation MUST be verified on the LIVE site:
     `Live UI Action → Cloud Run API Request → Cloud SQL Database Table → Hard Page Refresh (F5) Reload`.

2. **NO GUESSING OR SUPERFICIAL PATCHES**:
   - NEVER claim a feature, bug fix, or persistence update is completed based only on local React state or isolated frontend code changes.
   - NEVER make up assumptions or speculative explanations. Always inspect exact backend routes, SQL models, and Cloud SQL database schemas first.

3. **DIRECT EVIDENCE ONLY**:
   - Base all diagnoses strictly on empirical log evidence, actual live Cloud SQL database checks, and backend API responses.
   - If a table or endpoint is missing, build the exact backend ORM model and database migration first.

4. **CONCISE & DIRECT COMMUNICATION**:
   - No deflection, no fluff, no corporate excuses.
   - Provide clear, direct technical summaries of verified changes.
