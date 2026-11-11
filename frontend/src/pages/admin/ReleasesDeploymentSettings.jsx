import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
import { Sparkles, ExternalLink, RefreshCw, Key, Check, ArrowLeft, Shield, AlertTriangle, Database } from 'lucide-react';

export default function ReleasesDeploymentSettings({ onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ version_tag: '', release_name: '', release_notes: '' });
  const [actionMsg, setActionMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [cloningDb, setCloningDb] = useState(false);

  const DEPLOY_BACKEND = 'https://one-to-one-backend-staging-858977785048.us-central1.run.app';

  const fetchDeploymentStatus = async () => {
    setLoading(true);
    try {
      let res = await fetch(`${DEPLOY_BACKEND}/api/admin/deployments`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${API_BASE}/api/admin/deployments`).catch(() => null);
      }
      if (res && res.ok) {
        const statusData = await res.json();
        setData(statusData);
      }
    } catch (err) {
      console.error("Error fetching deployments status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeploymentStatus();
  }, []);

  const handleSaveGithubToken = async () => {
    if (!githubTokenInput.trim()) {
      alert("Please enter a valid GitHub Personal Access Token.");
      return;
    }
    setSavingToken(true);
    try {
      const payload = JSON.stringify({ token: githubTokenInput.trim() });
      let res = await fetch(`${API_BASE}/api/admin/deployments/github-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${DEPLOY_BACKEND}/api/admin/deployments/github-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      const resData = res ? await res.json().catch(() => ({})) : {};
      if (res && res.ok) {
        setActionMsg({ type: 'success', text: `GitHub Deploy Token successfully linked to cloud engine!` });
        setGithubTokenInput('');
        setShowTokenConfig(false);
        fetchDeploymentStatus();
      } else {
        alert(`Failed to save GitHub token: ${resData.detail || 'Invalid token'}`);
      }
    } catch (err) {
      alert(`Error saving GitHub token: ${err.message}`);
    } finally {
      setSavingToken(false);
    }
  };

  const handleCloneProdToStaging = async () => {
    const confirmed = window.otoConfirm 
      ? await window.otoConfirm("Are you sure you want to clone the live Production database into Staging? This will overwrite existing Staging test records with fresh Production data.", { title: 'Clone Production Database', isDanger: true })
      : confirm("Are you sure you want to clone the live Production database into Staging?");
    if (!confirmed) return;

    setCloningDb(true);
    setActionMsg(null);
    try {
      let res = await fetch(`${API_BASE}/admin/database/clone-prod-to-staging`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${DEPLOY_BACKEND}/admin/database/clone-prod-to-staging`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => null);
      }

      const resData = res ? await res.json().catch(() => ({})) : {};
      if (res && res.ok) {
        setActionMsg({ type: 'success', text: resData.message || 'Successfully cloned Production database to Staging playground!' });
      } else {
        alert(`Database clone failed: ${resData.detail || 'Error replicating database'}`);
      }
    } catch (err) {
      alert(`Error replicating database: ${err.message}`);
    } finally {
      setCloningDb(false);
    }
  };

  const handlePromote = async () => {
    if (!promoteForm.release_name.trim()) {
      alert("Please enter a custom release name.");
      return;
    }
    setActionLoading(true);
    try {
      const payload = JSON.stringify({
        version_tag: promoteForm.version_tag || `v1.${Date.now().toString().slice(-4)}`,
        release_name: promoteForm.release_name,
        release_notes: promoteForm.release_notes,
        admin_email: user?.email || 'admin@1-to-1.world'
      });

      let res = await fetch(`${API_BASE}/api/admin/deployments/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${DEPLOY_BACKEND}/api/admin/deployments/promote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      const resData = res ? await res.json().catch(() => ({})) : {};
      if (res && res.ok) {
        setActionMsg({ type: 'success', text: resData.message || `Successfully promoted release '${promoteForm.release_name}' to Live Production!` });
        setShowPromoteModal(false);
        setPromoteForm({ version_tag: '', release_name: '', release_notes: '' });
        fetchDeploymentStatus();
      } else {
        alert(`Error promoting release: ${resData.detail || 'Failed'}`);
      }
    } catch (err) {
      alert(`Error promoting release: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async (rev) => {
    const confirmed = window.otoConfirm
      ? await window.otoConfirm(`Are you sure you want to mark release ${rev.version_tag} as active live production?`, { title: 'Change Active Production Version', isDanger: true })
      : confirm(`Are you sure you want to rollback live Production traffic to revision ${rev.version_tag}?`);
    if (!confirmed) return;

    setActionLoading(true);
    try {
      let res = await fetch(`${API_BASE}/api/admin/deployments/rollback/${rev.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${DEPLOY_BACKEND}/api/admin/deployments/rollback/${rev.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(() => null);
      }

      if (res && res.ok) {
        setActionMsg({ type: 'success', text: `Successfully marked Production live traffic to revision ${rev.version_tag}!` });
        fetchDeploymentStatus();
      } else {
        alert("Rollback failed.");
      }
    } catch (err) {
      alert(`Rollback error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const currentProd = data?.current_production;
  const githubInfo = data?.github_integration;

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginRight: '6px'
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
              System & Releases
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
            Releases & Deployment Management Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Manage Staging vs. Production releases, deploy tested Staging builds directly to the live production portal via automated GitHub merge.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDeploymentStatus}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#334155',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Status
        </button>
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
          color: '#16a34a', fontSize: '13px', fontWeight: 600
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* GITHUB INTEGRATION BANNER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <Key size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
              <span>GitHub Auto-Deploy Integration ({githubInfo?.repository || 'Erinj1610/One-to-One-Eco-System'})</span>
              {githubInfo?.configured ? (
                <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                  Connected ({githubInfo.masked_token})
                </span>
              ) : (
                <span style={{ fontSize: '11px', background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fecaca', fontWeight: 600 }}>
                  Token Not Configured
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {githubInfo?.configured 
                ? 'When you promote staging, the portal automatically merges the staging branch into main, triggering live Vercel & Cloud Run builds.'
                : 'Configure a GitHub Personal Access Token (PAT) with repo access to enable 1-click staging-to-production promotion.'
              }
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setShowTokenConfig(!showTokenConfig)} 
          style={{
            fontSize: '12px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          {githubInfo?.configured ? 'Update GitHub Token' : 'Configure GitHub Token'}
        </button>
      </div>

      {/* GITHUB TOKEN CONFIG DRAWER */}
      {showTokenConfig && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px'
        }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
            Connect GitHub Personal Access Token
          </h4>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
            Generate a GitHub Personal Access Token (classic with <code>repo</code> scope, or Fine-Grained with Read & Write Contents permission).
          </div>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
            <input 
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
              value={githubTokenInput}
              onChange={e => setGithubTokenInput(e.target.value)}
              style={{
                flex: 1,
                height: '34px',
                padding: '4px 10px',
                fontSize: '12px',
                color: '#0f172a',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
            <button 
              type="button"
              onClick={handleSaveGithubToken}
              disabled={savingToken || !githubTokenInput.trim()}
              style={{
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: 600,
                padding: '0 16px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: savingToken ? 'not-allowed' : 'pointer'
              }}
            >
              {savingToken ? 'Validating...' : 'Save & Connect Token'}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE PRODUCTION & STAGING CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        
        {/* PRODUCTION CARD */}
        <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
              ACTIVE PRODUCTION LIVE
            </span>
            <a href="https://ejportal.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              ejportal.vercel.app <ExternalLink size={11} />
            </a>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {currentProd?.version_tag || 'v1.5.0'} — {currentProd?.release_name || 'Live Production'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Deployed by {currentProd?.deployed_by || 'Admin'} on {currentProd?.created_at || 'Recent'}
          </div>
          <div style={{ fontSize: '11.5px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '6px', color: '#334155', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} color="#059669" /> Production Cloud SQL Database (<code>One-to-One-Portal-Database</code>) is active and protected.
          </div>
        </div>

        {/* STAGING CARD */}
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
              STAGING LIVE PLAYGROUND
            </span>
            <a href="https://frontend-git-staging-erinj1610s-projects.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              staging.ejportal <ExternalLink size={11} />
            </a>
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Live Staging Build Ready
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Backend: <code>one-to-one-backend-staging</code> (US Central 1).
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <button 
              type="button"
              onClick={() => setShowPromoteModal(true)}
              style={{
                width: '100%',
                padding: '9px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} /> Promote Staging to Live Production
            </button>

            <button 
              type="button"
              onClick={handleCloneProdToStaging}
              disabled={cloningDb}
              style={{
                width: '100%',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 500,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                color: '#334155',
                cursor: cloningDb ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Database size={13} color="#64748b" />
              {cloningDb ? 'Replicating Prod Database to Staging...' : 'Sync Prod Database to Staging (Test Errors)'}
            </button>
          </div>
        </div>

      </div>

      {/* HISTORICAL DEPLOYMENT AUDIT LOG TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
              Deployment History & Revision Audit Trail
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Historical log of verified staging promotions and live production releases.
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {(data?.history || []).length} recorded revisions
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', margin: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Version</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Release Title</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deployed By</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date & Time</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.history || []).map((rev) => (
              <tr key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: rev.is_active_prod ? 1 : 0.85 }}>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: rev.is_active_prod ? '#16a34a' : '#0f172a' }}>
                  {rev.version_tag}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{rev.release_name}</td>
                <td style={{ padding: '10px 14px', color: '#64748b' }}>{rev.deployed_by}</td>
                <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '11.5px' }}>{rev.created_at}</td>
                <td style={{ padding: '10px 14px' }}>
                  {rev.is_active_prod ? (
                    <span style={{ padding: '2px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      Active Live
                    </span>
                  ) : (
                    <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                      Archived
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right', padding: '10px 14px' }}>
                  {!rev.is_active_prod && (
                    <button
                      type="button"
                      onClick={() => handleRollback(rev)}
                      disabled={actionLoading}
                      style={{
                        padding: '4px 10px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#0f172a',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: actionLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Mark Active
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PROMOTE STAGING TO PRODUCTION MODAL */}
      {showPromoteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '12px', padding: '22px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Promote Staging to Live Production
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              This will merge your tested <strong>staging</strong> branch into <strong>main</strong>, automatically triggering live Cloud Run and Vercel builds.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Version Tag
              </label>
              <input 
                type="text" 
                placeholder="e.g. v2.12" 
                value={promoteForm.version_tag} 
                onChange={e => setPromoteForm({ ...promoteForm, version_tag: e.target.value })}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '4px 10px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Release Title / Name
              </label>
              <input 
                type="text" 
                placeholder="e.g. Modern Luxury Settings & Template Engine" 
                value={promoteForm.release_name} 
                onChange={e => setPromoteForm({ ...promoteForm, release_name: e.target.value })}
                style={{
                  width: '100%',
                  height: '34px',
                  padding: '4px 10px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Release Notes / Changelog
              </label>
              <textarea 
                rows="3" 
                placeholder="Summary of fixes, modernizations, or new features included in this release..." 
                value={promoteForm.release_notes} 
                onChange={e => setPromoteForm({ ...promoteForm, release_notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => setShowPromoteModal(false)}
                style={{ padding: '8px 14px', fontSize: '12px', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handlePromote} 
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Triggering Live Deployments...' : 'Confirm & Deploy Live'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
