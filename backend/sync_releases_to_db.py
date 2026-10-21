import os
import sys
import subprocess
import re
from datetime import datetime

sys.path.insert(0, os.path.abspath('backend'))
from database.cloud_sql import SessionLocal
from routes.deployments import DeploymentRevision

def sync_releases():
    cmd = ['git', 'log', 'origin/main', '--grep=Production Release', '--format=%H|%s|%an|%ad', '--date=format:%Y-%m-%d %H:%M:%S']
    res = subprocess.run(cmd, capture_output=True, text=True)
    lines = [l.strip() for l in res.stdout.strip().split('\n') if l.strip()]

    db = SessionLocal()
    existing_shas = {r[0] for r in db.query(DeploymentRevision.commit_hash).all() if r[0]}
    print(f"Existing commit hashes in DB: {len(existing_shas)}")

    # Reverse so oldest are inserted first, preserving natural id order
    lines.reverse()

    inserted = 0
    for l in lines:
        parts = l.split('|')
        if len(parts) >= 4:
            sha, subject, author, dt = parts[0], parts[1], parts[2], parts[3]
            m = re.search(r'Production Release\s+([\w\.\-]+):\s*(.*)', subject)
            if m:
                v_tag = m.group(1).strip()
                r_name = m.group(2).strip()
                short_sha = sha[:8]
                if short_sha in existing_shas:
                    continue
                
                try:
                    created_dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
                except Exception:
                    created_dt = datetime.now()

                rev_tag_clean = v_tag.replace('.', '')
                rev = DeploymentRevision(
                    version_tag=v_tag,
                    release_name=r_name,
                    release_notes='',
                    environment='production',
                    commit_hash=short_sha,
                    cloud_run_revision=f'one-to-one-backend-{rev_tag_clean}',
                    deployed_by=author if author else 'Admin',
                    created_at=created_dt,
                    is_active_prod=False
                )
                db.add(rev)
                existing_shas.add(short_sha)
                inserted += 1

    db.commit()

    # Set the most recent release as is_active_prod = True
    db.query(DeploymentRevision).update({'is_active_prod': False})
    latest = db.query(DeploymentRevision).order_by(DeploymentRevision.created_at.desc(), DeploymentRevision.id.desc()).first()
    if latest:
        latest.is_active_prod = True
        db.commit()
        print(f"Set latest active prod: {latest.version_tag} - {latest.release_name} ({latest.commit_hash}) at {latest.created_at}")

    total = db.query(DeploymentRevision).count()
    print(f"Inserted {inserted} new releases. Total in DB now: {total}")
    db.close()

if __name__ == '__main__':
    sync_releases()
