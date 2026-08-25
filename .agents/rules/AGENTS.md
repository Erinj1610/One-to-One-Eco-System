# Strict Engineering & System Execution Rules

## CRITICAL BEHAVIORAL DIRECTIVES (PERMANENT ACROSS ALL CONVERSATIONS)

1. **MANDATORY STAGING-FIRST WORKFLOW (PROTECT PRODUCTION)**:
   - NEVER develop, push, or deploy directly to `main` or production Cloud Run (`one-to-one-backend`).
   - ALL feature work, bug fixes, database adjustments, and testing MUST be done on the `staging` branch.
   - All backend changes MUST be deployed to the Cloud Run Staging service (`one-to-one-backend-staging-858977785048.us-central1.run.app`).
   - All frontend changes MUST be pushed to the `staging` branch and verified on the Staging environment.
   - Production (`main` branch, production Cloud Run `one-to-one-backend`, and `ejportal.vercel.app`) must ONLY be updated when the USER explicitly requests a production deployment/release after verifying staging.

2. **MANDATORY LIVE STAGING VERIFICATION**:
   - NEVER consider work complete based only on local code edits or local servers.
   - Every data persistence operation MUST be verified on the LIVE Staging environment:
     `Staging UI Action → Staging Cloud Run API Request → Cloud SQL Database Table → Hard Page Refresh (F5) Reload`.

3. **NO GUESSING OR SUPERFICIAL PATCHES**:
   - NEVER claim a feature, bug fix, or persistence update is completed based only on local React state or isolated frontend code changes.
   - NEVER make up assumptions or speculative explanations. Always inspect exact backend routes, SQL models, and Cloud SQL database schemas first.

4. **DIRECT EVIDENCE ONLY**:
   - Base all diagnoses strictly on empirical log evidence, actual live Cloud SQL database checks, and backend API responses.
   - If a table or endpoint is missing, build the exact backend ORM model and database migration first.

5. **CONCISE & DIRECT COMMUNICATION**:
   - No deflection, no fluff, no corporate excuses.
   - Provide clear, direct technical summaries of verified changes.
