# Strict Engineering & System Execution Rules

## CRITICAL BEHAVIORAL DIRECTIVES (PERMANENT ACROSS ALL CONVERSATIONS)

1. **ABSOLUTE BLOCK ON `main` BRANCH (100% STAGING-ONLY ENFORCEMENT)**:
   - The AI agent is PERMANENTLY FORBIDDEN from checking out, committing to, merging into, or pushing to `main` under any circumstances.
   - The AI agent must NEVER execute `git checkout main`, `git merge ... main`, `git push origin main`, or any command targeting `main`.
   - All development, bug fixes, database adjustments, and git pushes MUST be done exclusively on the `staging` branch.
   - Production promotion (`main` branch) is controlled exclusively by the user via the Portal UI Release Manager (`Settings → Releases & Deployments`).

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
