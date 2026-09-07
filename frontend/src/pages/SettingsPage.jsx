import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import TemplateEditor from './admin/TemplateEditor';
import { 
  Users, Shield, Key, Plus, Search, Check, AlertTriangle, 
  Trash2, Edit3, RefreshCw, Copy, CheckCircle2, Lock, Unlock,
  Sliders, Grid, List, Layers, ArrowRight, UserPlus, ExternalLink, X,
  Briefcase, CheckSquare, Sparkles
} from 'lucide-react';

const MODULE_GROUPS = [
  {
    name: 'Studio & Creative Design',
    modules: ['Design tracker', 'Design fee', 'Projects']
  },
  {
    name: 'Sales & CRM Pipeline',
    modules: ['Dashboard', 'CRM', 'Pipeline']
  },
  {
    name: 'Procurement & Commerce',
    modules: ['Products', 'BOQ Maker', 'Orders', 'Invoices']
  },
  {
    name: 'Governance & Administration',
    modules: ['Time tracking', 'Documents', 'HR & people', 'Reports', 'Support']
  }
];

const PERMISSION_LEVELS = ['Full access', 'Can edit', 'View only', 'No access'];

const getRoleBadgeStyle = (roleName) => {
  const norm = (roleName || '').toLowerCase();
  if (norm.includes('admin')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
  }
  if (norm.includes('senior')) {
    return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
  }
  if (norm.includes('designer')) {
    return { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' };
  }
  if (norm.includes('coordinator')) {
    return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' };
  }
  if (norm.includes('showroom')) {
    return { bg: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', border: '1px solid rgba(244, 114, 182, 0.3)' };
  }
  return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' };
};

const getPermLevelStyle = (level) => {
  switch (level) {
    case 'Full access':
      return { label: 'Full access', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', dot: '#10b981' };
    case 'Can edit':
      return { label: 'Can edit', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', dot: '#38bdf8' };
    case 'View only':
      return { label: 'View only', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.25)', dot: '#fbbf24' };
    case 'No access':
    default:
      return { label: 'No access', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.08)', border: '1px solid rgba(156, 163, 175, 0.2)', dot: '#6b7280' };
  }
};

const getInitials = (name, email) => {
  if (name && name !== 'Unknown') {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
};

const ROLES = ['Admin', 'Senior Designer', 'Designer', 'Coordinator', 'Showroom'];
const MODULES = ['Dashboard', 'CRM', 'Pipeline', 'Design tracker', 'Projects', 'Design fee', 'Time tracking', 'Products', 'BOQ Maker', 'Orders', 'Invoices', 'Documents', 'HR & people', 'Reports', 'Support'];

const RATES = [
  { zone: 'Experiential living (30%)',     concept: 180, schematic: 144, final: 117,   budget: 1050 },
  { zone: 'Secondary living (60%)',         concept: 105, schematic: 84,  final: 68.25, budget: 750 },
  { zone: 'Non-experiential (10%)',         concept: 30,  schematic: 24,  final: 19.50, budget: 300 },
  { zone: 'Experiential landscape (40%)',   concept: 140, schematic: 112, final: 91,    budget: 825 },
  { zone: 'Secondary landscape (60%)',      concept: 55,  schematic: 44,  final: 35.75, budget: 525 },
];

function DesignFeeCostingsSettings() {
  const DEFAULT_COSTING_MATRIX = {
    currency_rates: { usdConv: 20.00 },
    phase_multipliers: { schematicPercent: 0.80, finalPercent: 0.65, siteSupportPercent: 0.2272, commissioningPercent: 0.1070 },
    area_rates: {
      experiential_living: { archFitting: 1050.00, conceptLighting: 180.00 },
      secondary_living: { archFitting: 750.00, conceptLighting: 105.00 },
      non_experiential_living: { archFitting: 300.00, conceptLighting: 30.00 },
      experiential_landscape: { archFitting: 825.00, conceptLighting: 140.00 },
      secondary_landscape: { archFitting: 525.00, conceptLighting: 55.00 }
    },
    default_discounts: { designDiscountRate: 0.20, archDiscountRate: 0.04 },
    signature_consultant_flat: { siteSupport: 4000.00, commissioning: 4000.00 }
  };

  const [costingRates, setCostingRates] = useState(DEFAULT_COSTING_MATRIX);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/admin/configs/DESIGN_FEE_RATES`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.config_json && Object.keys(data.config_json).length > 0) {
          setCostingRates(data.config_json);
        }
      })
      .catch(err => console.error("Error fetching rate card:", err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/DESIGN_FEE_RATES`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costingRates)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Design Fee Costings Rate Card saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save rate card.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving rate card.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
      <div className="section-label">💰 Design Fee Costings Rate Card Matrix</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Configure backend base rates for Architectural Fittings, Concept Lighting, and phase multipliers used when creating new project fee proposals.
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px', overflowX: 'auto' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-primary)' }}>📐 Meterage & Phase Costing Rates (Excl. VAT)</h4>
        
        <table className="table" style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fef08a', color: '#854d0e', textAlign: 'center', fontWeight: 700 }}>
              <th style={{ padding: '6px', border: '1px solid #fde047', background: 'transparent' }}></th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>0.00%</th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>0.00%</th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>
                <input 
                  type="number" step="1" style={{ width: '60px', textAlign: 'center', background: 'white', border: '1px solid #ca8a04', borderRadius: '3px', fontWeight: 700 }}
                  value={Math.round((costingRates.phase_multipliers?.schematicPercent * 100) || 80)}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    phase_multipliers: { ...costingRates.phase_multipliers, schematicPercent: (parseFloat(e.target.value) || 0) / 100 }
                  })}
                /> %
              </th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>
                <input 
                  type="number" step="1" style={{ width: '60px', textAlign: 'center', background: 'white', border: '1px solid #ca8a04', borderRadius: '3px', fontWeight: 700 }}
                  value={Math.round((costingRates.phase_multipliers?.finalPercent * 100) || 65)}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    phase_multipliers: { ...costingRates.phase_multipliers, finalPercent: (parseFloat(e.target.value) || 0) / 100 }
                  })}
                /> %
              </th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>
                <input 
                  type="number" step="0.01" style={{ width: '65px', textAlign: 'center', background: 'white', border: '1px solid #ca8a04', borderRadius: '3px', fontWeight: 700 }}
                  value={(costingRates.phase_multipliers?.siteSupportPercent * 100) || 22.72}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    phase_multipliers: { ...costingRates.phase_multipliers, siteSupportPercent: (parseFloat(e.target.value) || 0) / 100 }
                  })}
                /> %
              </th>
              <th style={{ padding: '6px', border: '1px solid #fde047' }}>
                <input 
                  type="number" step="0.01" style={{ width: '65px', textAlign: 'center', background: 'white', border: '1px solid #ca8a04', borderRadius: '3px', fontWeight: 700 }}
                  value={(costingRates.phase_multipliers?.commissioningPercent * 100) || 10.70}
                  onChange={e => setCostingRates({
                    ...costingRates,
                    phase_multipliers: { ...costingRates.phase_multipliers, commissioningPercent: (parseFloat(e.target.value) || 0) / 100 }
                  })}
                /> %
              </th>
            </tr>
            <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left', fontWeight: 700 }}>
              <th style={{ padding: '10px 8px' }}>Areas</th>
              <th style={{ padding: '10px 8px' }}>Architectural Fitting (R/m²)</th>
              <th style={{ padding: '10px 8px' }}>Concept Lighting Design (R/m²)</th>
              <th style={{ padding: '10px 8px' }}>Schematic Design Development</th>
              <th style={{ padding: '10px 8px' }}>Final Design</th>
              <th style={{ padding: '10px 8px' }}>Site Support</th>
              <th style={{ padding: '10px 8px' }}>Commissioning</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'experiential_living', label: 'Experiential Living' },
              { key: 'secondary_living', label: 'Secondary Living' },
              { key: 'non_experiential_living', label: 'Non-Experiential Living' },
              { key: 'experiential_landscape', label: 'Experiential Landscape' },
              { key: 'secondary_landscape', label: 'Secondary Landscape' }
            ].map(row => {
              const concept = costingRates.area_rates?.[row.key]?.conceptLighting || 0;
              const schematic = concept * (costingRates.phase_multipliers?.schematicPercent || 0.8);
              const finalD = concept * (costingRates.phase_multipliers?.finalPercent || 0.65);

              return (
                <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 700 }}>{row.label}</td>
                  <td style={{ padding: '8px' }}>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '12px', width: '130px' }}
                      value={costingRates.area_rates?.[row.key]?.archFitting || 0}
                      onChange={e => setCostingRates({
                        ...costingRates,
                        area_rates: {
                          ...(costingRates.area_rates || {}),
                          [row.key]: {
                            ...(costingRates.area_rates?.[row.key] || {}),
                            archFitting: parseFloat(e.target.value) || 0
                          }
                        }
                      })}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ height: '30px', fontSize: '12px', width: '130px' }}
                      value={costingRates.area_rates?.[row.key]?.conceptLighting || 0}
                      onChange={e => setCostingRates({
                        ...costingRates,
                        area_rates: {
                          ...(costingRates.area_rates || {}),
                          [row.key]: {
                            ...(costingRates.area_rates?.[row.key] || {}),
                            conceptLighting: parseFloat(e.target.value) || 0
                          }
                        }
                      })}
                    />
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    R {schematic.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    R {finalD.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                    {((costingRates.phase_multipliers?.siteSupportPercent || 0.2272) * 100).toFixed(2)}% of Subtotal
                  </td>
                  <td style={{ padding: '8px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                    {((costingRates.phase_multipliers?.commissioningPercent || 0.1070) * 100).toFixed(2)}% of Subtotal
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px', maxWidth: '500px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-primary)' }}>💱 Currency & Signature Consultant Fees</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>USD Conversion Rate (ZAR / USD)</label>
            <input 
              type="number" step="0.1" className="form-control" style={{ height: '32px', fontSize: '12px' }}
              value={costingRates.currency_rates?.usdConv || 20.00}
              onChange={e => setCostingRates({
                ...costingRates,
                currency_rates: { ...costingRates.currency_rates, usdConv: parseFloat(e.target.value) || 20.00 }
              })}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Signature Consultant Site Support Flat (R)</label>
            <input 
              type="number" className="form-control" style={{ height: '32px', fontSize: '12px' }}
              value={costingRates.signature_consultant_flat?.siteSupport || 4000}
              onChange={e => setCostingRates({
                ...costingRates,
                signature_consultant_flat: { ...costingRates.signature_consultant_flat, siteSupport: parseFloat(e.target.value) || 0 }
              })}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Signature Consultant Commissioning Flat (R)</label>
            <input 
              type="number" className="form-control" style={{ height: '32px', fontSize: '12px' }}
              value={costingRates.signature_consultant_flat?.commissioning || 4000}
              onChange={e => setCostingRates({
                ...costingRates,
                signature_consultant_flat: { ...costingRates.signature_consultant_flat, commissioning: parseFloat(e.target.value) || 0 }
              })}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Rate Card'}
        </button>
      </div>

      {message && (
        <div style={{ 
          marginTop: '16px', padding: '10px 14px', borderRadius: '6px', 
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: message.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
          color: message.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)',
          fontSize: '12.5px', textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}

function MasterGoogleSheetManager() {
  const [designFeeUrl, setDesignFeeUrl] = useState('');
  const [ordersUrl, setOrdersUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/admin/templates/master_google_sheet/url?key=MASTER_DESIGN_FEE_SHEET`).then(r => r.json()),
      fetch(`${API_BASE}/admin/templates/master_google_sheet/url?key=MASTER_ORDERS_SHEET`).then(r => r.json()),
      fetch(`${API_BASE}/admin/templates/master_google_sheet/url?key=MASTER_GOOGLE_SHEET`).then(r => r.json())
    ]).then(([dfData, ordData, fallbackData]) => {
      setDesignFeeUrl(dfData?.url || fallbackData?.url || '');
      setOrdersUrl(ordData?.url || fallbackData?.url || '');
    }).catch(err => console.error("Error fetching Master Google Sheet URLs:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await Promise.all([
        fetch(`${API_BASE}/admin/templates/master_google_sheet/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'MASTER_DESIGN_FEE_SHEET', url: designFeeUrl })
        }),
        fetch(`${API_BASE}/admin/templates/master_google_sheet/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'MASTER_ORDERS_SHEET', url: ordersUrl })
        })
      ]);
      setMsg({ type: 'success', text: 'Dual Master Google Sheet URLs saved successfully! Design Fees and Orders will render from their dedicated workbooks.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
      <div className="section-label">Master Google Sheet Template Workbooks</div>
      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
        Link separate Master Google Sheet workbooks for <strong>Design Fees</strong> and <strong>Orders / BOQ</strong>. Document previews and Drive vaults generate directly from their dedicated master templates.
      </div>

      <div className="card" style={{ maxWidth: '650px', padding: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            🎨 Design Fee Master Google Sheet Link
          </label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="https://docs.google.com/spreadsheets/d/1.../edit (Design Fee Master)"
            value={designFeeUrl}
            onChange={e => setDesignFeeUrl(e.target.value)}
            style={{ fontSize: '12.5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
            📦 Orders & BOQ Master Google Sheet Link
          </label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="https://docs.google.com/spreadsheets/d/1.../edit (Orders Master)"
            value={ordersUrl}
            onChange={e => setOrdersUrl(e.target.value)}
            style={{ fontSize: '12.5px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'block' }}>
            Ensure your Google Sheet links are set to "Anyone with the link can view" or shared with your Google Service Account.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving Links...' : '💾 Save Dual Master Template Links'}
          </button>
        </div>

        {msg && (
          <div style={{ 
            marginTop: '16px', padding: '10px 14px', borderRadius: '6px', 
            background: msg.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: msg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            color: msg.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)',
            fontSize: '12.5px'
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

function ReleasesDeploymentManager() {
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

  const DEPLOY_BACKEND = 'https://one-to-one-backend-staging-858977785048.us-central1.run.app';

  const fetchDeploymentStatus = async () => {
    setLoading(true);
    try {
      // Query canonical deployment engine first so release audit history is identical across both portals
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
        setActionMsg({ type: 'success', text: `🟢 ${resData.message || 'GitHub Deploy Token successfully verified and connected!'}` });
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
        setActionMsg({ type: 'success', text: resData.message || `🚀 Successfully promoted release '${promoteForm.release_name}' to Live Production!` });
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
    if (!window.confirm(`Are you sure you want to rollback live Production traffic to revision ${rev.version_tag} (${rev.release_name})?`)) return;
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
        setActionMsg({ type: 'success', text: `⏪ Successfully marked Production live traffic to revision ${rev.version_tag}!` });
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

  if (loading) {
    return <div style={{ padding: '30px', color: 'var(--text-secondary)' }}>⏳ Loading live deployment architecture details...</div>;
  }

  const currentProd = data?.current_production;
  const githubInfo = data?.github_integration;

  return (
    <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
      <div className="section-label">🚀 Releases & Deployment Management Dashboard</div>
      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
        Manage Staging vs. Production releases, deploy tested Staging builds directly to the live production portal via automated GitHub merge, log custom release titles, and track historical audit trails.
      </div>

      {actionMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981', fontSize: '13px', fontWeight: 600
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* GITHUB INTEGRATION BANNER */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🐙</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>GitHub Auto-Deploy Integration ({githubInfo?.repository || 'Erinj1610/One-to-One-Eco-System'})</span>
              {githubInfo?.configured ? (
                <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  🟢 Connected ({githubInfo.masked_token})
                </span>
              ) : (
                <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  ⚠️ Token Not Configured
                </span>
              )}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {githubInfo?.configured 
                ? 'When you promote staging, the portal automatically merges the staging branch into main, triggering live Vercel & Cloud Run builds.' 
                : 'Configure a GitHub Personal Access Token (PAT) with repo access to enable 1-click deployments directly from this portal.'}
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowTokenConfig(!showTokenConfig)} 
          className="btn btn-sm btn-ghost"
          style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ⚙️ {githubInfo?.configured ? 'Update GitHub Token' : 'Configure GitHub Token'}
        </button>
      </div>

      {/* GITHUB TOKEN CONFIG MODAL / DRAWER */}
      {showTokenConfig && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '16px 18px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>🔑 Connect GitHub Personal Access Token (PAT)</h4>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Generate a GitHub Personal Access Token (classic with <code>repo</code> scope, or Fine-Grained token with <code>Contents: Read and write</code> permission on <code>{githubInfo?.repository}</code>) and paste it below.
          </div>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '600px' }}>
            <input 
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
              value={githubTokenInput}
              onChange={e => setGithubTokenInput(e.target.value)}
              className="form-control"
              style={{ fontSize: '12px', flex: 1 }}
            />
            <button 
              className="btn btn-primary"
              onClick={handleSaveGithubToken}
              disabled={savingToken || !githubTokenInput.trim()}
              style={{ whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600 }}
            >
              {savingToken ? 'Validating...' : 'Save & Connect Token'}
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE PRODUCTION & STAGING CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* PRODUCTION CARD */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid #10b981', borderRadius: '10px', padding: '18px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              🟢 ACTIVE PRODUCTION LIVE
            </span>
            <a href="https://ejportal.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
              ejportal.vercel.app ↗
            </a>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {currentProd?.version_tag || 'v1.5.0'} — {currentProd?.release_name || 'Live Production'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Deployed by {currentProd?.deployed_by || 'Admin'} on {currentProd?.created_at || 'Recently'}
          </div>
          <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
            🛡️ Production Cloud SQL Database (<code style={{ color: '#60a5fa' }}>One-to-One-Portal-Database</code>) is active and protected.
          </div>
        </div>

        {/* STAGING CARD */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid #3b82f6', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              🧪 STAGING LIVE PLAYGROUND
            </span>
            <a href="https://frontend-git-staging-erinj1610s-projects.vercel.app" target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600, textDecoration: 'none' }}>
              staging.ejportal ↗
            </a>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Live Staging Build Ready
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Backend: <code style={{ color: '#60a5fa' }}>one-to-one-backend-staging</code> (US Central 1).
          </div>
          <button 
            onClick={() => setShowPromoteModal(true)}
            className="glow-btn"
            style={{ width: '100%', padding: '9px', background: '#2563eb', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            🚀 Promote Staging to Live Production
          </button>
        </div>

      </div>

      {/* HISTORICAL DEPLOYMENT AUDIT LOG TABLE */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '18px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📜 Deployment History & Revision Audit Trail
        </h4>
        <table className="modern-table" style={{ width: '100%', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '8px' }}>Version</th>
              <th style={{ padding: '8px' }}>Release Title</th>
              <th style={{ padding: '8px' }}>Deployed By</th>
              <th style={{ padding: '8px' }}>Date & Time</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.history || []).map((rev) => (
              <tr key={rev.id} style={{ opacity: rev.is_active_prod ? 1 : 0.85 }}>
                <td style={{ fontWeight: 800, color: rev.is_active_prod ? '#10b981' : 'var(--text-primary)' }}>
                  {rev.version_tag}
                </td>
                <td style={{ fontWeight: 600 }}>{rev.release_name}</td>
                <td>{rev.deployed_by}</td>
                <td>{rev.created_at}</td>
                <td>
                  {rev.is_active_prod ? (
                    <span style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                      Active Live
                    </span>
                  ) : (
                    <span style={{ padding: '2px 6px', background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)', borderRadius: '4px', fontSize: '11px' }}>
                      Archived
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {!rev.is_active_prod && (
                    <button
                      onClick={() => handleRollback(rev)}
                      disabled={actionLoading}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                    >
                      ⏪ Mark Active
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
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: 'var(--text-primary)' }}>🚀 Promote Staging to Live Production</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              This will merge your tested <strong>staging</strong> branch into <strong>main</strong> on GitHub, automatically triggering live <strong>Vercel</strong> frontend and <strong>Cloud Run</strong> backend deployments.
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Version Tag</label>
              <input 
                type="text" 
                placeholder="e.g. v1.5.1" 
                value={promoteForm.version_tag} 
                onChange={e => setPromoteForm({ ...promoteForm, version_tag: e.target.value })} 
                className="form-control"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Release Title / Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Ticket Logger Redesign & Assigned Staff Users" 
                value={promoteForm.release_name} 
                onChange={e => setPromoteForm({ ...promoteForm, release_name: e.target.value })} 
                className="form-control"
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Release Notes (Optional)</label>
              <textarea 
                rows="3" 
                placeholder="Summary of fixes, new features, or updates included in this release..." 
                value={promoteForm.release_notes} 
                onChange={e => setPromoteForm({ ...promoteForm, release_notes: e.target.value })} 
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPromoteModal(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePromote} disabled={actionLoading}>
                {actionLoading ? '🚀 Merging & Triggering Live Deployments...' : '🚀 Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const { 
    projects, 
    updateProject, 
    alertSettings, 
    setAlertSettings, 
    moduleConfig, 
    setModuleConfig, 
    projectManagers, 
    setProjectManagers, 
    activityLogs 
  } = useStore();


  const hostname = typeof window !== 'undefined' ? (window.location.hostname || '') : '';
  const isStaging = hostname.includes('staging') || hostname.includes('localhost') || hostname.includes('127.0.0.1');

  const availableTabs = isAdmin
    ? (isStaging 
        ? ['General', 'Users', 'Releases & Deployments', 'Activity log', 'Project managers', 'Dropdowns', 'Permissions', 'Rate card', 'Alerts', 'Modules', 'Integrations', 'Templates']
        : ['General', 'Users', 'Activity log', 'Project managers', 'Dropdowns', 'Permissions', 'Rate card', 'Alerts', 'Modules', 'Integrations', 'Templates']
      )
    : ['General', 'Permissions', 'Rate card', 'Alerts', 'Integrations'];

  const [activeTab, setActiveTab] = useState('General');
  const [activeRole, setActiveRole] = useState('Admin');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ module: 'projects', parameter: 'margin', condition: 'less_than', value: '', label: '' });
  const [general, setGeneral] = useState({ 
    companyName: '1-to-1 World', 
    email: 'studio@1-to-1.world', 
    phone: '+27 21 000 0000', 
    address: 'Woodstock, Cape Town', 
    vat: '4880123456', 
    currency: 'ZAR',
    defaultTargetMargin: 39
  });

  useEffect(() => {
    if (alertSettings) {
      setGeneral({
        companyName: alertSettings.general?.companyName || '1-to-1 World',
        email: alertSettings.general?.email || 'studio@1-to-1.world',
        phone: alertSettings.general?.phone || '+27 21 000 0000',
        address: alertSettings.general?.address || 'Woodstock, Cape Town',
        vat: alertSettings.general?.vat || '4880123456',
        currency: alertSettings.general?.currency || 'ZAR',
        defaultTargetMargin: alertSettings.defaultTargetMargin || 39
      });
    }
  }, [alertSettings]);

  // Dynamic Dropdowns Lookup State
  const [lookups, setLookups] = useState([]);
  const [lookupCategories, setLookupCategories] = useState([]);
  const [selectedLookupCategory, setSelectedLookupCategory] = useState('client_type');
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [newLookup, setNewLookup] = useState({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
  const [editingLookup, setEditingLookup] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupSuccess, setLookupSuccess] = useState('');

  // Users Management State
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role_id: 3, department: 'Design' });
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  
  // Edit & Reset Password States
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', role_id: 3, department: 'Design', disabled: false });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [resetPwLink, setResetPwLink] = useState('');

  // Project Managers Settings State
  const [newPmName, setNewPmName] = useState('');
  const [newPmEmail, setNewPmEmail] = useState('');
  const [newPmPhone, setNewPmPhone] = useState('');
  const [editingPmId, setEditingPmId] = useState(null);

  // Roles & Permissions state
  const [dbRoles, setDbRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionsData, setPermissionsData] = useState({ roles: [], modules: [], matrix: {} });
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [hasUnsavedPerms, setHasUnsavedPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSuccessMessage, setPermSuccessMessage] = useState('');
  const [permViewMode, setPermViewMode] = useState('matrix'); // 'matrix' | 'role'
  const [selectedRoleDetailId, setSelectedRoleDetailId] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userDeptFilter, setUserDeptFilter] = useState('All');
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/roles`);
      if (res.ok) {
        const data = await res.json();
        setDbRoles(data);
        if (data.length > 0 && !selectedRoleDetailId) {
          setSelectedRoleDetailId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermissionsData(data);
        setHasUnsavedPerms(false);
        if (data.roles && data.roles.length > 0 && !selectedRoleDetailId) {
          setSelectedRoleDetailId(data.roles[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Users') {
      fetchUsers();
      fetchRoles();
    } else if (activeTab === 'Permissions') {
      fetchPermissions();
      fetchRoles();
    }
  }, [activeTab]);

  const handleInlineRoleChange = async (userId, newRoleId) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    setRoleUpdatingUserId(userId);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userToUpdate.name,
          role_id: parseInt(newRoleId),
          department: userToUpdate.department,
          disabled: userToUpdate.disabled
        })
      });
      if (res.ok) {
        await fetchUsers();
        await fetchRoles();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update user role');
      }
    } catch (err) {
      alert(`Error updating role: ${err.message}`);
    } finally {
      setRoleUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = !user.disabled;
    const confirmMsg = newStatus 
      ? `Disable account access for ${user.name} (${user.email})?`
      : `Re-activate account for ${user.name} (${user.email})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          role_id: user.role_id,
          department: user.department,
          disabled: newStatus
        })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert('Failed to update account status');
      }
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    setPermSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix: permissionsData.matrix })
      });
      if (res.ok) {
        setHasUnsavedPerms(false);
        setPermSuccessMessage('Permissions matrix successfully saved to Cloud SQL database!');
        setTimeout(() => setPermSuccessMessage(''), 4000);
      } else {
        alert('Failed to save permissions to database');
      }
    } catch (err) {
      alert(`Error saving permissions: ${err.message}`);
    } finally {
      setSavingPerms(false);
    }
  };

  const handlePermissionCellChange = (roleId, moduleName, newLevel) => {
    setPermissionsData(prev => {
      const newMatrix = { ...prev.matrix };
      const roleKey = String(roleId);
      newMatrix[roleKey] = {
        ...(newMatrix[roleKey] || {}),
        [moduleName]: newLevel
      };
      return { ...prev, matrix: newMatrix };
    });
    setHasUnsavedPerms(true);
  };

  const handleBulkSetRolePermissions = (roleId, level) => {
    if (!window.confirm(`Set all modules for this role to '${level}'?`)) return;
    setPermissionsData(prev => {
      const newMatrix = { ...prev.matrix };
      const roleKey = String(roleId);
      const rolePerms = { ...(newMatrix[roleKey] || {}) };
      (prev.modules || []).forEach(mod => {
        rolePerms[mod] = level;
      });
      newMatrix[roleKey] = rolePerms;
      return { ...prev, matrix: newMatrix };
    });
    setHasUnsavedPerms(true);
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      if (res.ok) {
        setNewRoleName('');
        setShowNewRoleModal(false);
        await fetchRoles();
        await fetchPermissions();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to create role');
      }
    } catch (err) {
      alert(`Error creating role: ${err.message}`);
    }
  };

  const fetchLookups = async () => {
    setLookupsLoading(true);
    setLookupError('');
    try {
      const res = await fetch(`${API_BASE}/api/lookups/admin/all`);
      if (res.ok) {
        const data = await res.json();
        setLookups(data);
      } else {
        setLookupError('Failed to load lookup configurations.');
      }
    } catch (err) {
      setLookupError('Network error loading lookups.');
    } finally {
      setLookupsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lookups/categories`);
      if (res.ok) {
        const data = await res.json();
        setLookupCategories(data);
      }
    } catch (err) {
      console.error("Error loading lookup categories", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Dropdowns') {
      fetchLookups();
      fetchCategories();
    }
  }, [activeTab]);

  const handleSaveLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupSuccess('');
    try {
      const payload = {
        category: selectedLookupCategory,
        label: newLookup.label,
        value: newLookup.value || newLookup.label,
        is_active: newLookup.is_active,
        sort_order: Number(newLookup.sort_order),
        metadata_json: newLookup.color ? { color: newLookup.color } : null
      };

      let url = `${API_BASE}/api/lookups/admin`;
      let method = 'POST';

      if (editingLookup) {
        url = `${API_BASE}/api/lookups/admin/${editingLookup.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setLookupSuccess(editingLookup ? 'Option updated successfully!' : 'Option added successfully!');
        setNewLookup({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
        setEditingLookup(null);
        fetchLookups();
        fetchCategories();
      } else {
        const errData = await res.json();
        setLookupError(errData.detail || 'Failed to save lookup option.');
      }
    } catch (err) {
      setLookupError('Network error saving option.');
    }
  };

  const handleEditLookupClick = (item) => {
    setEditingLookup(item);
    setNewLookup({
      label: item.label,
      value: item.value,
      sort_order: item.sort_order,
      is_active: item.is_active,
      color: item.metadata_json?.color || 'default'
    });
  };

  const handleDeleteLookup = async (id) => {
    if (!window.confirm('Are you sure you want to delete this option?')) return;
    setLookupError('');
    setLookupSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/lookups/admin/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setLookupSuccess('Option deleted successfully!');
        fetchLookups();
        fetchCategories();
      } else {
        const errData = await res.json();
        setLookupError(errData.detail || 'Failed to delete lookup option.');
      }
    } catch (err) {
      setLookupError('Network error deleting option.');
    }
  };


  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setGeneratedLink('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Successfully invited ${inviteForm.name}!`);
        if (data.reset_link) {
          setGeneratedLink(data.reset_link);
        }
        setInviteForm({ name: '', email: '', role_id: 3, department: 'Design' });
        fetchUsers();
      } else {
        setInviteError(data.detail || 'Failed to invite user');
      }
    } catch (err) {
      setInviteError('Network error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This will also remove them from Firebase Auth.")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete user');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      role_id: u.role_id || 3,
      department: u.department || 'Design',
      disabled: !!u.disabled
    });
    setEditError('');
    setEditSuccess('');
    setResetPwLink('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setEditSuccess(`Successfully updated ${editForm.name}!`);
        fetchUsers();
        setTimeout(() => {
          setEditingUser(null);
        }, 1500);
      } else {
        setEditError(data.detail || 'Failed to update user');
      }
    } catch (err) {
      setEditError('Network error');
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    if (!window.confirm(`Trigger password reset email/link for ${userEmail}?`)) return;
    setResetPwLink('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        alert("Password reset email triggered successfully!");
        if (data.reset_link) {
          setResetPwLink(data.reset_link);
        }
      } else {
        alert(data.detail || 'Failed to trigger password reset');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const [activitySearch, setActivitySearch] = useState('');
  const [activityFilterType, setActivityFilterType] = useState('All');
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');

  const uniqueUsers = useMemo(() => {
    const users = new Set();
    (activityLogs || []).forEach(log => {
      if (log.userEmail) users.add(log.userEmail);
    });
    return Array.from(users);
  }, [activityLogs]);

  const filteredActivityLogs = (activityLogs || []).filter(log => {
    const matchesSearch = 
      (log.userEmail || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(activitySearch.toLowerCase()) ||
      (log.type || '').toLowerCase().includes(activitySearch.toLowerCase());
    const matchesType = activityFilterType === 'All' || log.type === activityFilterType;
    const matchesUser = selectedUserFilter === 'All' || log.userEmail === selectedUserFilter;
    return matchesSearch && matchesType && matchesUser;
  });

  return (
    <div className="animation-fade-in">
      <div className="tabs" style={{ marginBottom: 18 }}>
        {availableTabs.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {activeTab === 'General' && (
        <div>
          <div className="section-label">Company details</div>
          <div className="card" style={{ marginBottom: 14, maxWidth: 560 }}>
            <div className="card-body">
              <div className="row-2">
                <div className="form-row"><label className="form-label">Company name</label><input className="form-control" value={general.companyName} onChange={e => setGeneral(g => ({...g, companyName: e.target.value}))} /></div>
                <div className="form-row"><label className="form-label">Studio email</label><input className="form-control" value={general.email} onChange={e => setGeneral(g => ({...g, email: e.target.value}))} /></div>
              </div>
              <div className="row-2">
                <div className="form-row"><label className="form-label">Phone</label><input className="form-control" value={general.phone} onChange={e => setGeneral(g => ({...g, phone: e.target.value}))} /></div>
                <div className="form-row"><label className="form-label">VAT number</label><input className="form-control" value={general.vat} onChange={e => setGeneral(g => ({...g, vat: e.target.value}))} /></div>
              </div>
              <div className="form-row"><label className="form-label">Address</label><input className="form-control" value={general.address} onChange={e => setGeneral(g => ({...g, address: e.target.value}))} /></div>
              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Currency</label>
                  <select className="form-control" value={general.currency} onChange={e => setGeneral(g => ({...g, currency: e.target.value}))}>
                    <option>ZAR</option><option>USD</option><option>EUR</option><option>GBP</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Default Target Margin (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={general.defaultTargetMargin || 39} 
                    onChange={e => setGeneral(g => ({...g, defaultTargetMargin: parseInt(e.target.value) || 39}))} 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setAlertSettings(prev => ({
                      ...prev,
                      general: {
                        companyName: general.companyName,
                        email: general.email,
                        phone: general.phone,
                        address: general.address,
                        vat: general.vat,
                        currency: general.currency
                      },
                      defaultTargetMargin: Number(general.defaultTargetMargin) || 39
                    }));
                    alert('General settings & target margins saved successfully!');
                  }}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Users' && isAdmin && (
        <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & KPI Summary */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Team & System Access</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Manage team accounts, live database roles, security access levels, and account statuses.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => { fetchUsers(); fetchRoles(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  title="Refresh user list"
                >
                  <RefreshCw size={13} className={usersLoading ? "spin" : ""} /> Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setInviteForm({ name: '', email: '', role_id: (dbRoles[0]?.id || 3), department: 'Design' });
                    setInviteError('');
                    setInviteSuccess('');
                    setGeneratedLink('');
                    setShowInviteModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                >
                  <UserPlus size={14} /> + Invite Team Member
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid #38bdf8' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Members</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{users.length}</div>
                <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>Active in database</div>
              </div>
              <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid #10b981' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Accounts</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {users.filter(u => !u.disabled).length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Operational logins</div>
              </div>
              <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid #a855f7' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Administrators</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
                  {users.filter(u => (u.role || '').toLowerCase() === 'admin').length}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Full root privileges</div>
              </div>
              <div className="card" style={{ padding: '14px 18px', borderLeft: '3px solid #fbbf24' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>System Roles</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                  {dbRoles.length || 5}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Configured access levels</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-body" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search members by name, email, or department..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '100%' }}
                  />
                </div>
                <div style={{ minWidth: '160px' }}>
                  <select
                    className="form-control"
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value)}
                    style={{ height: '36px', fontSize: '12.5px', width: '100%' }}
                  >
                    <option value="All">All Roles ({dbRoles.length})</option>
                    {dbRoles.map(r => (
                      <option key={r.id} value={r.name}>{r.name} ({r.user_count})</option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: '160px' }}>
                  <select
                    className="form-control"
                    value={userDeptFilter}
                    onChange={e => setUserDeptFilter(e.target.value)}
                    style={{ height: '36px', fontSize: '12.5px', width: '100%' }}
                  >
                    <option value="All">All Departments</option>
                    {Array.from(new Set(users.map(u => u.department).filter(d => d && d !== 'None' && d !== 'General'))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-body" style={{ padding: 0 }}>
              {usersLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px auto', display: 'block', color: 'var(--accent)' }} />
                  Loading team members...
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ margin: 0, width: '100%' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member</th>
                        <th style={{ padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</th>
                        <th style={{ padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Role (1-Click Reassign)</th>
                        <th style={{ padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Access Status</th>
                        <th style={{ padding: '12px 18px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => {
                          const q = userSearch.toLowerCase();
                          const matchesSearch = !userSearch || 
                            (u.name || '').toLowerCase().includes(q) ||
                            (u.email || '').toLowerCase().includes(q) ||
                            (u.department || '').toLowerCase().includes(q) ||
                            (u.role || '').toLowerCase().includes(q);
                          const matchesRole = userRoleFilter === 'All' || (u.role || '').toLowerCase() === userRoleFilter.toLowerCase();
                          const matchesDept = userDeptFilter === 'All' || (u.department || '').toLowerCase() === userDeptFilter.toLowerCase();
                          return matchesSearch && matchesRole && matchesDept;
                        })
                        .map(u => {
                          const roleStyle = getRoleBadgeStyle(u.role);
                          const isUpdatingRole = roleUpdatingUserId === u.id;
                          return (
                            <tr 
                              key={u.id} 
                              style={{ 
                                opacity: u.disabled ? 0.6 : 1,
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {/* User Info & Avatar */}
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div 
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      background: roleStyle.bg,
                                      color: roleStyle.color,
                                      border: roleStyle.border,
                                      flexShrink: 0
                                    }}
                                  >
                                    {getInitials(u.name, u.email)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>{u.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Department */}
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11.5px',
                                  fontWeight: 500,
                                  background: 'rgba(255,255,255,0.05)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                  {u.department || 'General'}
                                </span>
                              </td>

                              {/* Interactive Inline Role Switcher */}
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <select
                                    className="form-control"
                                    value={u.role_id || ''}
                                    onChange={e => handleInlineRoleChange(u.id, e.target.value)}
                                    disabled={isUpdatingRole}
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      height: '32px',
                                      borderRadius: '6px',
                                      background: roleStyle.bg,
                                      color: roleStyle.color,
                                      border: roleStyle.border,
                                      cursor: 'pointer',
                                      minWidth: '150px'
                                    }}
                                  >
                                    {dbRoles.map(r => (
                                      <option key={r.id} value={r.id} style={{ background: '#1e293b', color: '#fff' }}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                  {isUpdatingRole && <RefreshCw size={12} className="spin" style={{ color: roleStyle.color }} />}
                                </div>
                              </td>

                              {/* Access Status */}
                              <td style={{ padding: '14px 18px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  title={u.disabled ? "Click to enable account" : "Click to suspend account"}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: u.disabled ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                                    color: u.disabled ? '#ef4444' : '#10b981',
                                    border: u.disabled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.disabled ? '#ef4444' : '#10b981' }} />
                                  {u.disabled ? 'Suspended' : 'Active'}
                                </button>
                              </td>

                              {/* Actions */}
                              <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => handleResetPassword(u.id, u.email)}
                                    title="Trigger password reset link"
                                    style={{ fontSize: '11.5px', color: '#38bdf8', padding: '4px 8px' }}
                                  >
                                    Reset PW
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => { handleEditClick(u); setShowEditModal(true); }}
                                    title="Edit user details"
                                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => handleDeleteUser(u.id)}
                                    title="Delete user"
                                    style={{ fontSize: '11.5px', color: '#ef4444', padding: '4px 8px' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* MODAL: INVITE USER */}
          {showInviteModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 9999, padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={16} color="var(--accent)" /> Invite Team Member
                  </div>
                  <button type="button" onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Jane Doe"
                        value={inviteForm.name}
                        onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        placeholder="e.g. jane@1-to-1.world"
                        value={inviteForm.email}
                        onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div className="row-2">
                      <div className="form-row">
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Initial Role</label>
                        <select
                          className="form-control"
                          value={inviteForm.role_id}
                          onChange={e => setInviteForm(f => ({ ...f, role_id: parseInt(e.target.value) }))}
                        >
                          {dbRoles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Department</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Design, Head Office"
                          value={inviteForm.department}
                          onChange={e => setInviteForm(f => ({ ...f, department: e.target.value }))}
                        />
                      </div>
                    </div>

                    {inviteError && (
                      <div style={{ color: '#f87171', fontSize: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                        {inviteError}
                      </div>
                    )}

                    {inviteSuccess && (
                      <div style={{ color: '#34d399', fontSize: '12px', padding: '8px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '6px' }}>
                        {inviteSuccess}
                      </div>
                    )}

                    {generatedLink && (
                      <div style={{ padding: '12px', background: 'rgba(224, 153, 36, 0.08)', border: '1px solid rgba(224, 153, 36, 0.25)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#e09924', fontWeight: 700, marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Password Setup / Invite Link:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedLink);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }}
                            style={{ background: 'none', border: 'none', color: copiedLink ? '#34d399' : '#e09924', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Copy size={12} /> {copiedLink ? "Copied!" : "Copy Link"}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={generatedLink}
                          onClick={e => e.target.select()}
                          style={{ width: '100%', height: '50px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '6px', resize: 'none' }}
                        />
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          An email has been dispatched automatically. You can also share this direct setup link manually.
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px', fontWeight: 600 }}>
                        Send Invitation
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setShowInviteModal(false)}
                        style={{ height: '38px' }}
                      >
                        {generatedLink ? "Done" : "Cancel"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: EDIT USER */}
          {showEditModal && editingUser && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 9999, padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={16} color="var(--accent)" /> Edit Member Profile
                  </div>
                  <button type="button" onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Editing account for: <strong style={{ color: 'var(--text-primary)' }}>{editingUser.email}</strong>
                    </div>

                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="row-2">
                      <div className="form-row">
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Assigned Role</label>
                        <select
                          className="form-control"
                          value={editForm.role_id}
                          onChange={e => setEditForm(f => ({ ...f, role_id: parseInt(e.target.value) }))}
                        >
                          {dbRoles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Department</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.department}
                          onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <input
                        type="checkbox"
                        id="modal-user-disabled"
                        checked={editForm.disabled}
                        onChange={e => setEditForm(f => ({ ...f, disabled: e.target.checked }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="modal-user-disabled" style={{ fontSize: '12px', color: '#f3f4f6', cursor: 'pointer', fontWeight: 600 }}>
                        Suspend user account (Locks portal login)
                      </label>
                    </div>

                    {editError && (
                      <div style={{ color: '#f87171', fontSize: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                        {editError}
                      </div>
                    )}
                    {editSuccess && (
                      <div style={{ color: '#34d399', fontSize: '12px', padding: '8px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '6px' }}>
                        {editSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px', fontWeight: 600 }}>
                        Save Changes
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setShowEditModal(false)}
                        style={{ height: '38px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Reset Link Direct Modal */}
          {resetPwLink && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 9999, padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Key size={16} /> Password Reset Dispatched
                  </div>
                  <button type="button" onClick={() => setResetPwLink('')} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    The password reset link was generated and dispatched. You can also copy it directly below:
                  </p>
                  <textarea
                    readOnly
                    value={resetPwLink}
                    onClick={e => e.target.select()}
                    style={{ width: '100%', height: '60px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '8px', resize: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(resetPwLink);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Copy size={13} /> {copiedLink ? "Copied Link!" : "Copy Setup Link"}
                    </button>
                    <button type="button" className="btn" onClick={() => setResetPwLink('')}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Activity log' && isAdmin && (
        <div>
          <div className="section-label">User Activity & Audit Logs</div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <input 
                    type="text" 
                    placeholder="Search logs by user, action, details..." 
                    className="form-control"
                    value={activitySearch}
                    onChange={e => setActivitySearch(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '10px', opacity: 0.5 }}>🔍</span>
                </div>
                <div>
                  <select 
                    className="form-control" 
                    value={activityFilterType}
                    onChange={e => setActivityFilterType(e.target.value)}
                    style={{ width: '180px' }}
                  >
                    <option value="All">All Activity Types</option>
                    <option value="login">Logins</option>
                    <option value="logout">Logouts</option>
                    <option value="page_view">Page Views</option>
                    <option value="document_generation">Document Compiles</option>
                    <option value="document_export">Document Exports</option>
                    <option value="invoice_issue">Invoice Issues</option>
                    <option value="waybill_edit">Logistics Edits</option>
                  </select>
                </div>
                <div>
                  <select 
                    className="form-control" 
                    value={selectedUserFilter}
                    onChange={e => setSelectedUserFilter(e.target.value)}
                    style={{ width: '220px' }}
                  >
                    <option value="All">All Users</option>
                    {uniqueUsers.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: '12px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Timestamp</th>
                      <th style={{ width: '220px' }}>User Email</th>
                      <th style={{ width: '150px' }}>Action Type</th>
                      <th>Activity Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivityLogs.map(log => {
                      const badgeColor = {
                        login: 'rgba(74, 222, 128, 0.15)',
                        logout: 'rgba(156, 163, 175, 0.15)',
                        page_view: 'rgba(96, 165, 250, 0.15)',
                        document_generation: 'rgba(251, 146, 60, 0.15)',
                        document_export: 'rgba(139, 92, 246, 0.15)',
                        invoice_issue: 'rgba(245, 158, 11, 0.15)',
                        waybill_edit: 'rgba(239, 68, 68, 0.15)'
                      }[log.type] || 'var(--bg-secondary)';

                      const textColor = {
                        login: '#4ade80',
                        logout: '#9ca3af',
                        page_view: '#60a5fa',
                        document_generation: '#fb923c',
                        document_export: '#a78bfa',
                        invoice_issue: '#f59e0b',
                        waybill_edit: '#ef4444'
                      }[log.type] || 'var(--text-secondary)';

                      return (
                        <tr key={log.id}>
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {new Date(log.timestamp).toLocaleString('en-ZA')}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {log.userEmail}
                          </td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: 700, 
                              textTransform: 'uppercase',
                              background: badgeColor,
                              color: textColor
                            }}>
                              {log.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-primary)' }}>
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredActivityLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                          No activity logs found matching the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Project managers' && isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          <div>
            <div className="section-label">Project Managers List</div>
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                {(!projectManagers || projectManagers.length === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>No project managers configured.</div>
                ) : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectManagers.map(pm => (
                        <tr key={pm.id} style={{ opacity: pm.active === false ? 0.6 : 1 }}>
                          <td style={{ fontWeight: 600 }}>{pm.name}</td>
                          <td>{pm.email || '—'}</td>
                          <td>{pm.phone || '—'}</td>
                          <td>
                            <span className="badge" style={{ 
                              background: pm.active === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                              color: pm.active === false ? '#ef4444' : '#10b981', 
                              border: pm.active === false ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)' 
                            }}>
                              {pm.active === false ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                onClick={() => {
                                  setEditingPmId(pm.id);
                                  setNewPmName(pm.name);
                                  setNewPmEmail(pm.email || '');
                                  setNewPmPhone(pm.phone || '');
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-sm" 
                                style={{
                                  background: pm.active === false ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: pm.active === false ? '#10b981' : '#ef4444',
                                  border: pm.active === false ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                                onClick={() => {
                                  setProjectManagers(prev => prev.map(p => p.id === pm.id ? { ...p, active: p.active === false ? true : false } : p));
                                }}
                              >
                                {pm.active === false ? 'Activate' : 'Deactivate'}
                              </button>
                              <button 
                                className="btn btn-sm btn-ghost" 
                                style={{ color: '#ef4444' }}
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${pm.name}? This will remove them from settings, but existing projects referencing their name will keep the reference.`)) {
                                    setProjectManagers(prev => prev.filter(p => p.id !== pm.id));
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="section-label">{editingPmId ? 'Edit Project Manager' : 'Add Project Manager'}</div>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full Name:</span>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newPmName} 
                    onChange={e => setNewPmName(e.target.value)} 
                    placeholder="e.g. Martin" 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email Address:</span>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={newPmEmail} 
                    onChange={e => setNewPmEmail(e.target.value)} 
                    placeholder="e.g. martin@1-to-1.world" 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Phone Number:</span>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newPmPhone} 
                    onChange={e => setNewPmPhone(e.target.value)} 
                    placeholder="e.g. 082 123 4567" 
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (!newPmName.trim()) {
                        alert('Name is required!');
                        return;
                      }
                      if (editingPmId) {
                        setProjectManagers(prev => prev.map(pm => pm.id === editingPmId ? { ...pm, name: newPmName.trim(), email: newPmEmail.trim(), phone: newPmPhone.trim() } : pm));
                        setEditingPmId(null);
                        alert('Project Manager updated successfully!');
                      } else {
                        const newPM = {
                          id: `pm-${Date.now()}`,
                          name: newPmName.trim(),
                          email: newPmEmail.trim(),
                          phone: newPmPhone.trim(),
                          active: true
                        };
                        setProjectManagers(prev => [...prev, newPM]);
                        alert('Project Manager created successfully!');
                      }
                      setNewPmName('');
                      setNewPmEmail('');
                      setNewPmPhone('');
                    }}
                  >
                    {editingPmId ? 'Update PM' : 'Create PM'}
                  </button>
                  {editingPmId && (
                    <button 
                      type="button" 
                      className="btn" 
                      onClick={() => {
                        setEditingPmId(null);
                        setNewPmName('');
                        setNewPmEmail('');
                        setNewPmPhone('');
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Permissions' && (
        <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header & Controls */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={20} color="var(--accent)" /> Role-Based Access Control (RBAC)
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                  Configure module-level access permissions across system roles. Changes are stored in Cloud SQL.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View Switcher */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setPermViewMode('matrix')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      background: permViewMode === 'matrix' ? 'var(--accent)' : 'transparent',
                      color: permViewMode === 'matrix' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <Grid size={13} /> Matrix Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermViewMode('role')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      background: permViewMode === 'role' ? 'var(--accent)' : 'transparent',
                      color: permViewMode === 'role' ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <List size={13} /> Role Detail
                  </button>
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowNewRoleModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <Plus size={13} /> + New Role
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePermissions}
                  disabled={savingPerms || !hasUnsavedPerms}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                    opacity: hasUnsavedPerms ? 1 : 0.6
                  }}
                >
                  {savingPerms ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                  Save Permissions {hasUnsavedPerms ? "*" : ""}
                </button>
              </div>
            </div>

            {/* Notification / Dirty state banner */}
            {hasUnsavedPerms && (
              <div style={{
                padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
                background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div style={{ fontSize: '12.5px', color: '#fde047', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color="#eab308" />
                  <span>You have unsaved changes to role permissions. Remember to click <strong>Save Permissions</strong> to apply changes to Cloud SQL.</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                >
                  {savingPerms ? "Saving..." : "Save Now"}
                </button>
              </div>
            )}

            {permSuccessMessage && (
              <div style={{
                padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>{permSuccessMessage}</span>
              </div>
            )}

            {/* Privilege Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginRight: '4px' }}>Access Levels:</span>
              {PERMISSION_LEVELS.map(lvl => {
                const s = getPermLevelStyle(lvl);
                return (
                  <span key={lvl} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600,
                    background: s.bg, color: s.color, border: s.border
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
                    {lvl}
                  </span>
                );
              })}
            </div>
          </div>

          {/* VIEW 1: MATRIX GRID VIEW */}
          {permViewMode === 'matrix' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-body" style={{ padding: 0 }}>
                {permissionsLoading ? (
                  <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: 'var(--accent)' }} />
                    Loading permissions matrix from database...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '14px 20px', minWidth: '220px', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            System Feature / Module
                          </th>
                          {(permissionsData.roles || []).map(r => {
                            const rStyle = getRoleBadgeStyle(r.name);
                            return (
                              <th key={r.id} style={{ padding: '14px 16px', minWidth: '170px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  <span style={{
                                    display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                                    fontSize: '12px', fontWeight: 700,
                                    background: rStyle.bg, color: rStyle.color, border: rStyle.border
                                  }}>
                                    {r.name}
                                  </span>
                                  {/* Quick set dropdown for role */}
                                  <select
                                    className="form-control"
                                    defaultValue=""
                                    onChange={e => {
                                      if (e.target.value) {
                                        handleBulkSetRolePermissions(r.id, e.target.value);
                                        e.target.value = "";
                                      }
                                    }}
                                    style={{ height: '24px', fontSize: '10px', padding: '2px 4px', width: '110px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer' }}
                                    title="Bulk set all modules for this role"
                                  >
                                    <option value="" disabled>Set all...</option>
                                    {PERMISSION_LEVELS.map(lvl => (
                                      <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                  </select>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULE_GROUPS.map((group, gIdx) => (
                          <React.Fragment key={group.name}>
                            {/* Group Header Row */}
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: gIdx > 0 ? '2px solid var(--border)' : 'none', borderBottom: '1px solid var(--border)' }}>
                              <td 
                                colSpan={(permissionsData.roles?.length || 0) + 1} 
                                style={{ padding: '10px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.5px' }}
                              >
                                {group.name}
                              </td>
                            </tr>

                            {/* Module Rows */}
                            {group.modules.map(mod => (
                              <tr key={mod} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '12px 20px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
                                    {mod}
                                  </div>
                                </td>

                                {(permissionsData.roles || []).map(r => {
                                  const roleKey = String(r.id);
                                  const currentLevel = (permissionsData.matrix?.[roleKey]?.[mod]) || 'No access';
                                  const lvlStyle = getPermLevelStyle(currentLevel);

                                  return (
                                    <td key={r.id} style={{ padding: '8px 14px', textAlign: 'center' }}>
                                      <select
                                        className="form-control"
                                        value={currentLevel}
                                        onChange={e => handlePermissionCellChange(r.id, mod, e.target.value)}
                                        style={{
                                          width: '100%',
                                          maxWidth: '150px',
                                          height: '32px',
                                          fontSize: '11.5px',
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: '6px',
                                          background: lvlStyle.bg,
                                          color: lvlStyle.color,
                                          border: lvlStyle.border,
                                          cursor: 'pointer',
                                          margin: '0 auto'
                                        }}
                                      >
                                        {PERMISSION_LEVELS.map(lvl => (
                                          <option key={lvl} value={lvl} style={{ background: '#1e293b', color: '#fff' }}>
                                            {lvl}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: ROLE DETAIL INSPECTOR */}
          {permViewMode === 'role' && (
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Role Selection Sidebar */}
              <div className="card" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, padding: '6px 8px', marginBottom: '6px' }}>
                  Select Role
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(permissionsData.roles || []).map(r => {
                    const isSelected = selectedRoleDetailId === r.id;
                    const rStyle = getRoleBadgeStyle(r.name);
                    const userCount = users.filter(u => u.role_id === r.id).length;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoleDetailId(r.id)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 12px', borderRadius: '8px', border: isSelected ? rStyle.border : '1px solid transparent',
                          background: isSelected ? rStyle.bg : 'transparent',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? rStyle.color : 'var(--text-primary)', fontSize: '13px' }}>
                          {r.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '10px' }}>
                          {userCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modules Inspector for Selected Role */}
              <div className="card">
                <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {(() => {
                      const selRole = (permissionsData.roles || []).find(r => r.id === selectedRoleDetailId);
                      const selStyle = getRoleBadgeStyle(selRole?.name);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
                            background: selStyle.bg, color: selStyle.color, border: selStyle.border
                          }}>
                            {selRole?.name || 'Selected Role'}
                          </span>
                          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            Module Permission Breakdown
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-control"
                      defaultValue=""
                      onChange={e => {
                        if (e.target.value && selectedRoleDetailId) {
                          handleBulkSetRolePermissions(selectedRoleDetailId, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      style={{ height: '30px', fontSize: '11.5px', width: '130px' }}
                    >
                      <option value="" disabled>Set all to...</option>
                      {PERMISSION_LEVELS.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(permissionsData.modules || MODULES).map(mod => {
                    const roleKey = String(selectedRoleDetailId);
                    const currentLevel = (permissionsData.matrix?.[roleKey]?.[mod]) || 'No access';
                    const lvlStyle = getPermLevelStyle(currentLevel);

                    return (
                      <div 
                        key={mod} 
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{mod}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {currentLevel === 'Full access' && 'Complete read, write, export, and delete administrative control.'}
                            {currentLevel === 'Can edit' && 'Create and modify records within this module.'}
                            {currentLevel === 'View only' && 'Read-only viewing. Cannot edit or delete records.'}
                            {currentLevel === 'No access' && 'Module is hidden and restricted for this role.'}
                          </div>
                        </div>

                        <select
                          className="form-control"
                          value={currentLevel}
                          onChange={e => handlePermissionCellChange(selectedRoleDetailId, mod, e.target.value)}
                          style={{
                            width: '140px',
                            height: '32px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: lvlStyle.bg,
                            color: lvlStyle.color,
                            border: lvlStyle.border,
                            cursor: 'pointer'
                          }}
                        >
                          {PERMISSION_LEVELS.map(lvl => (
                            <option key={lvl} value={lvl} style={{ background: '#1e293b', color: '#fff' }}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODAL: CREATE CUSTOM ROLE */}
          {showNewRoleModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 9999, padding: '20px'
            }}>
              <div className="card" style={{ width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="var(--accent)" /> Add Custom Role
                  </div>
                  <button type="button" onClick={() => setShowNewRoleModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: '20px' }}>
                  <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Role Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Estimator, Accountant, Site Lead"
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                      />
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      The new role will be created in Cloud SQL and initialized with default View Only permissions across modules, which you can customize in the matrix.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, height: '38px', fontWeight: 600 }}>
                        Create Role
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setShowNewRoleModal(false)}
                        style={{ height: '38px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Rate card' && (
        <DesignFeeCostingsSettings />
      )}

      {activeTab === 'Integrations' && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">Connected Integrations & Bulk Launch Tools</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Manage active integrations or use the **Bulk Document Auto-Generator** below to rapidly initialize past orders with matching Purchase Orders, GRNs, Invoices, and Delivery Notes to launch the system in bulk.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start', marginBottom: '30px' }}>
            {/* BULK GENERATOR CARD */}
            <div className="card">
              <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚀 Fast-Track Order Auto-Fulfillment (Bulk PO, GRN, Invoices & Delivery Notes)
                </div>
              </div>
              <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* SELECT ORDER */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Select Project Order to Fully Auto-Fill</label>
                  <select 
                    className="form-control"
                    id="bulk-order-select"
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  >
                    <option value="">— Select Order Reference —</option>
                    {Object.values(projects).flatMap(proj => 
                      (proj.orders || []).map(o => (
                        <option key={`${proj.key}_${o.id}`} value={`${proj.key}_${o.id}`}>
                          {o.id} - {proj.name} ({o.supplier || 'No Supplier'}) [{o.itemsList?.length || 0} items]
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Custom Document ID Reference Prefix</label>
                    <input 
                      type="text" 
                      id="bulk-doc-prefix"
                      placeholder="e.g. PO01 / INV001" 
                      className="form-control"
                      style={{ height: '32px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Backdated Fulfillment Date</label>
                    <input 
                      type="date" 
                      id="bulk-doc-date"
                      className="form-control"
                      style={{ height: '32px', fontSize: '12.5px', colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const selectVal = document.getElementById('bulk-order-select').value;
                      if (!selectVal) {
                        alert('Please select an order reference first.');
                        return;
                      }
                      const [pKey, oId] = selectVal.split('_');
                      const project = projects[pKey];
                      const order = (project?.orders || []).find(o => o.id === oId);
                      if (!order) return;

                      const customPrefix = document.getElementById('bulk-doc-prefix').value.trim();
                      const dateVal = document.getElementById('bulk-doc-date').value;
                      const finalDateObj = dateVal ? new Date(dateVal) : new Date();
                      const formattedDate = finalDateObj.toISOString().split('T')[0];
                      const dateStr = finalDateObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

                      const prefixPart = customPrefix ? `${customPrefix}-` : '';

                      // Construct IDs
                      const poId = `${prefixPart}PO-${order.id}`;
                      const grnId = `${prefixPart}GRN-${order.id}`;
                      const plId = `${prefixPart}PL-${order.id}`;
                      const dnId = `${prefixPart}DN-${order.id}`;
                      const invId = `${prefixPart}INV-${order.id}`;

                      if (!window.confirm(`This tool will automatically create:\n- PO: ${poId}\n- GRN: ${grnId}\n- Packing List: ${plId}\n- Delivery Note: ${dnId}\n- Client Invoice: ${invId}\n\nFor all items in this order, updating all tracking history logs. Proceed?`)) return;

                      // 1. Generate lists of document items
                      const hardwareItems = (order.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service');
                      const allItems = order.itemsList || [];

                      const poItems = hardwareItems.map(item => ({
                        code: item.code || 'NO-CODE',
                        description: item.description,
                        qtyAction: Number(item.qty) || 0,
                        eta: formattedDate
                      }));

                      const grnItems = hardwareItems.map(item => ({
                        code: item.code || 'NO-CODE',
                        description: item.description,
                        qtyAction: Number(item.qty) || 0
                      }));

                      const plItems = hardwareItems.map(item => ({
                        id: item.id,
                        code: item.code || 'NO-CODE',
                        type: item.type || 'Fittings',
                        description: item.description,
                        qtyDelivered: Number(item.qty) || 0,
                        boxNumber: 'Box 1',
                        redList: 'No',
                        firstFix: 'No'
                      }));

                      const invItems = allItems.map(item => ({
                        code: item.code || 'NO-CODE',
                        description: item.description,
                        qtyAction: Number(item.qty) || 0,
                        rate: Number(item.unitRetail || item.unit_retail || 0)
                      }));

                      // 2. Map and update individual item history states
                      const updatedItemsList = allItems.map(item => {
                        const isService = (item.itemType || item.item_type) === 'Service';
                        const qty = Number(item.qty) || 0;

                        const pHist = isService ? [] : [{
                          id: poId,
                          ref: poId,
                          date: formattedDate,
                          qty: qty,
                          eta: formattedDate,
                          supplier: order.supplier || 'Warehouse Inventory'
                        }];

                        const rHist = isService ? [] : [{
                          qty: qty,
                          ref: grnId,
                          poId: poId,
                          date: formattedDate
                        }];

                        const dHist = isService ? [] : [{
                          qty: qty,
                          ref: dnId,
                          date: formattedDate
                        }];

                        const iHist = [{
                          qty: qty,
                          ref: invId,
                          date: formattedDate,
                          rate: Number(item.unitRetail || item.unit_retail || 0)
                        }];

                        return {
                          ...item,
                          poQtyOrdered: isService ? 0 : qty,
                          receivedQty: isService ? 0 : qty,
                          receivedDate: isService ? '' : formattedDate,
                          deliveryQty: isService ? 0 : qty,
                          deliveryDate: isService ? '' : formattedDate,
                          deliveryStatus: isService ? 'Pending' : 'Delivered',
                          purchaseHistory: pHist,
                          receivingHistory: rHist,
                          deliveryHistory: dHist,
                          invoiceHistory: iHist
                        };
                      });

                      // 3. Construct Document Headers
                      const newPo = { id: poId, date: dateStr, supplier: order.supplier || 'Warehouse Inventory', notes: 'Bulk Uploaded PO', items: poItems };
                      const newGrn = { id: grnId, poId: poId, date: dateStr, notes: 'Bulk Uploaded GRN', items: grnItems };
                      const newPl = { id: plId, date: dateStr, notes: 'Bulk Uploaded PL', items: plItems, deliveryNoteId: dnId };
                      const newDn = { id: dnId, date: dateStr, notes: 'Bulk Uploaded DN', items: plItems };
                      const newInv = { id: invId, date: dateStr, notes: 'Bulk Uploaded Invoice', items: invItems };

                      // 4. Update order list inside project
                      const updatedOrders = project.orders.map(o => {
                        if (o.id === oId) {
                          return {
                            ...o,
                            purchaseOrders: [...(o.purchaseOrders || []), newPo],
                            goodsReceivedNotes: [...(o.goodsReceivedNotes || []), newGrn],
                            packingLists: [...(o.packingLists || []), newPl],
                            deliveryNotes: [...(o.deliveryNotes || []), newDn],
                            clientInvoices: [...(o.clientInvoices || []), newInv],
                            itemsList: updatedItemsList
                          };
                        }
                        return o;
                      });

                      // 5. Commit changes to Backend Database
                      updateProject(pKey, 'orders', updatedOrders);
                      alert(`Successfully fully auto-filled order ${order.id}! All documents have been issued.`);
                    }}
                  >
                    ⚡ Fully Auto-Fill All Quantities & Issue Documents
                  </button>
                </div>
              </div>
            </div>

            {/* INTEGRATIONS DIRECTORY CARD */}
            <div>
              {[
                { name: 'Xero',    desc: 'Sync invoices and payments to accounting',       status: 'Connected',    color: 'b-success' },
                { name: 'SAGE',    desc: 'Alternative accounting integration',              status: 'Disconnected', color: 'b-default' },
                { name: 'Resend',  desc: 'Transactional email delivery',                   status: 'Connected',    color: 'b-success' },
                { name: 'Firebase',desc: 'Authentication & real-time database',            status: 'Connected',    color: 'b-success' },
                { name: 'Palladium',desc: 'Read-only Kerridge CS cloud sync (BOQ/quotes)', status: 'Connected',    color: 'b-success' },
              ].map(int => (
                <div key={int.name} className="card" style={{ marginBottom: 10 }}>
                  <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px' }}>
                    <div style={{ width: 34, height: 34, background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-info)', fontWeight: 600, fontSize: 13 }}>{int.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '12.5px', marginBottom: 2 }}>{int.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{int.desc}</div>
                    </div>
                    <span className={`badge ${int.color}`} style={{ fontSize: '9px' }}>{int.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {activeTab === 'Templates' && isAdmin && (
        <div className="animation-fade-in">
          <TemplateEditor />
        </div>
      )}
      {activeTab === 'Alerts' && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">Manage Operational Alerts & Toggles</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configure which events generate alerts in the collapsible sidebar for each module. These settings apply globally.
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* CRM MODULE ALERTS */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>CRM Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.lostClients} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, lostClients: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Lost Clients Warnings</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Prompt to review post-mortem / check inactive client re-engagement.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.inactiveClients} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, inactiveClients: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>At-Risk / Inactive Warnings</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when clients have Red health or haven't placed projects for long periods.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.crm?.npsReview} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        crm: { ...prev.crm, npsReview: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>NPS Detractor Alerts</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag feedback scores below 6/10 for immediate follow-up.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* DESIGN MODULE ALERTS */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Design Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.design?.outstandingFees} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        design: { ...prev.design, outstandingFees: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Outstanding Design Fees</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when design fee payments have unpaid outstanding balances.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.design?.upcomingDeadlines} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        design: { ...prev.design, upcomingDeadlines: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Delayed Design Phases</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when active concept design phases are past project timeline deadlines.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* PROJECTS MODULE ALERTS */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Projects Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.overdueDeadlines} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, overdueDeadlines: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Overdue Deadlines</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects that are behind schedule based on deadline.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.lowMargins} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, lowMargins: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Low Margins</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects whose dynamic margins fall below target margin threshold.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.outstandingDesignFees} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, outstandingDesignFees: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Outstanding Design Fee Balance</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Flag projects with unpaid design fees in the project dashboard.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.orderLogisticsAlerts} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, orderLogisticsAlerts: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Order Logistics Alerts</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when any order is delayed, in Customs hold, or backordered.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.projects?.productApprovalAlerts} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        projects: { ...prev.projects, productApprovalAlerts: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Product Approvals</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when client approvals or initial deposits are missing.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* ORDERS MODULE ALERTS */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Orders Module Alerts</div>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.logisticsHolds} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, logisticsHolds: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Logistics Customs Holds</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when imported hardware orders are flagged on Customs hold status.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.backorderedIssues} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, backorderedIssues: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Pending Deposit Clearances</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when initiated hardware orders are pending deposit confirmation.</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={alertSettings?.orders?.lowMarginOrders} 
                    onChange={e => {
                      setAlertSettings(prev => ({
                        ...prev,
                        orders: { ...prev.orders, lowMarginOrders: e.target.checked }
                      }));
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)' }}>Low Order Margins</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alert when specific hardware order profit margin drops below the standard 39% target.</span>
                  </div>
                </label>
              </div>
            </div>

          </div>

          {/* CUSTOM ALERTS RULE BUILDER SECTION */}
          <div style={{ marginTop: '24px' }}>
            <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Custom Alert Rules Builder</span>
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => setShowRuleModal(true)}
              >
                + Add Custom Rule
              </button>
            </div>
            
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Module</th>
                      <th>Parameter</th>
                      <th>Condition</th>
                      <th>Threshold Value</th>
                      <th>Alert Label Description</th>
                      <th style={{ textAlign: 'right', width: '80px', paddingRight: '14px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(alertSettings?.customRules || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                          No custom alert rules configured. Click "+ Add Custom Rule" to build one.
                        </td>
                      </tr>
                    ) : (
                      (alertSettings.customRules).map(rule => (
                        <tr key={rule.id}>
                          <td style={{ textTransform: 'uppercase', fontWeight: 600, padding: '10px 14px' }}>{rule.module}</td>
                          <td><code>{rule.parameter.replace('_',' ')}</code></td>
                          <td style={{ color: 'var(--text-info)' }}>{rule.condition.replace('_',' ')}</td>
                          <td style={{ fontWeight: 600 }}>{rule.value}</td>
                          <td>{rule.label}</td>
                          <td style={{ textAlign: 'right', paddingRight: '14px' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              style={{ color: 'var(--text-danger)', border: 'none', padding: '2px 8px' }}
                              onClick={() => {
                                setAlertSettings(prev => ({
                                  ...prev,
                                  customRules: prev.customRules.filter(r => r.id !== rule.id)
                                }));
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'Modules' && isAdmin && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">Modules Layout & Custom Naming</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configure visibility, custom names, section grouping, and navigation ordering for all modules. These changes propagate dynamically across the sidebar, page titles, and page headers.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
            {/* SECTIONS MANAGER */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Navigation Sections / Categories</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    id="new-section-input" 
                    placeholder="New section name..." 
                    className="form-control" 
                    style={{ width: '180px', padding: '4px 8px', fontSize: '12px', height: 'auto' }} 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newName = e.target.value.trim();
                        const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        if (moduleConfig.sections.some(s => s.id === newId)) {
                          alert('Section ID already exists');
                          return;
                        }
                        const newSections = [
                          ...moduleConfig.sections,
                          { id: newId, label: newName, order: moduleConfig.sections.length }
                        ];
                        setModuleConfig(prev => ({ ...prev, sections: newSections }));
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      const input = document.getElementById('new-section-input');
                      if (input && input.value.trim()) {
                        const newName = input.value.trim();
                        const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                        if (moduleConfig.sections.some(s => s.id === newId)) {
                          alert('Section ID already exists');
                          return;
                        }
                        const newSections = [
                          ...moduleConfig.sections,
                          { id: newId, label: newName, order: moduleConfig.sections.length }
                        ];
                        setModuleConfig(prev => ({ ...prev, sections: newSections }));
                        input.value = '';
                      }
                    }}
                  >
                    Add Section
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <table className="table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>Section ID</th>
                      <th>Label / Name</th>
                      <th>Sort Order</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...moduleConfig.sections].sort((a, b) => a.order - b.order).map((sec, index, sortedArr) => (
                      <tr key={sec.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{sec.id}</td>
                        <td>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '180px' }}
                            value={sec.label}
                            onChange={e => {
                              const updatedSections = moduleConfig.sections.map(s => 
                                s.id === sec.id ? { ...s, label: e.target.value } : s
                              );
                              setModuleConfig(prev => ({ ...prev, sections: updatedSections }));
                            }}
                          />
                        </td>
                        <td>{sec.order}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button 
                              className="btn btn-xs"
                              disabled={index === 0}
                              onClick={() => {
                                const newSecs = [...moduleConfig.sections];
                                const current = newSecs.find(s => s.id === sec.id);
                                const prevSec = newSecs.find(s => s.id === sortedArr[index - 1].id);
                                if (current && prevSec) {
                                  const temp = current.order;
                                  current.order = prevSec.order;
                                  prevSec.order = temp;
                                  setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                                }
                              }}
                            >
                              ▲
                            </button>
                            <button 
                              className="btn btn-xs"
                              disabled={index === sortedArr.length - 1}
                              onClick={() => {
                                const newSecs = [...moduleConfig.sections];
                                const current = newSecs.find(s => s.id === sec.id);
                                const nextSec = newSecs.find(s => s.id === sortedArr[index + 1].id);
                                if (current && nextSec) {
                                  const temp = current.order;
                                  current.order = nextSec.order;
                                  nextSec.order = temp;
                                  setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                                }
                              }}
                            >
                              ▼
                            </button>
                            <button 
                              className="btn btn-xs btn-danger-outline"
                              disabled={['general', 'clients_sales', 'projects_sec', 'other_modules'].includes(sec.id)}
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete the section "${sec.label}"? Any modules in this section will be reassigned to General.`)) {
                                  const updatedSections = moduleConfig.sections.filter(s => s.id !== sec.id);
                                  const updatedModules = moduleConfig.modules.map(m => 
                                    m.sectionId === sec.id ? { ...m, sectionId: 'general' } : m
                                  );
                                  setModuleConfig({ sections: updatedSections, modules: updatedModules });
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MODULES CONFIGURATION */}
            <div className="card">
              <div className="card-head" style={{ borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Modules Layout & Renaming</div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <table className="table" style={{ fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Show</th>
                      <th>Module ID</th>
                      <th>Display Name</th>
                      <th>Section</th>
                      <th>Sort Order</th>
                      <th style={{ textAlign: 'right' }}>Order Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...moduleConfig.modules].sort((a, b) => a.order - b.order).map((mod, index, sortedArr) => (
                      <tr key={mod.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={mod.visible}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, visible: e.target.checked } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          />
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{mod.id}</td>
                        <td>
                          <input 
                            type="text"
                            className="form-control"
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '180px' }}
                            value={mod.label}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, label: e.target.value } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="form-control"
                            style={{ padding: '2px 6px', fontSize: '12px', height: 'auto', width: '150px' }}
                            value={mod.sectionId}
                            onChange={e => {
                              const updatedModules = moduleConfig.modules.map(m => 
                                m.id === mod.id ? { ...m, sectionId: e.target.value } : m
                              );
                              setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                            }}
                          >
                            {moduleConfig.sections.map(s => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>{mod.order}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button 
                              className="btn btn-xs"
                              disabled={index === 0}
                              onClick={() => {
                                const newMods = [...moduleConfig.modules];
                                const current = newMods.find(m => m.id === mod.id);
                                const prevMod = newMods.find(m => m.id === sortedArr[index - 1].id);
                                if (current && prevMod) {
                                  const temp = current.order;
                                  current.order = prevMod.order;
                                  prevMod.order = temp;
                                  setModuleConfig(prev => ({ ...prev, modules: newMods }));
                                }
                              }}
                            >
                              ▲
                            </button>
                            <button 
                              className="btn btn-xs"
                              disabled={index === sortedArr.length - 1}
                              onClick={() => {
                                const newMods = [...moduleConfig.modules];
                                const current = newMods.find(m => m.id === mod.id);
                                const nextMod = newMods.find(m => m.id === sortedArr[index + 1].id);
                                if (current && nextMod) {
                                  const temp = current.order;
                                  current.order = nextMod.order;
                                  nextMod.order = temp;
                                  setModuleConfig(prev => ({ ...prev, modules: newMods }));
                                }
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Dropdowns' && isAdmin && (
        <div className="animation-fade-in" style={{ paddingBottom: '30px' }}>
          <div className="section-label">System Dropdowns & Lookup Lists</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configure and manage dynamic values for all dropdown lists and status fields in the portal. Any changes will immediately reflect in the respective modules.
          </div>

          {lookupError && (
            <div className="alert alert-danger" style={{ marginBottom: '15px', padding: '10px 15px', borderRadius: '4px', fontSize: '12.5px' }}>
              {lookupError}
            </div>
          )}
          {lookupSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '15px', padding: '10px 15px', borderRadius: '4px', fontSize: '12.5px' }}>
              {lookupSuccess}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
            {/* Category selection list */}
            <div>
              <div className="card" style={{ marginBottom: '15px' }}>
                <div className="card-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', fontWeight: 600 }}>Select Lookup List</div>
                </div>
                <div className="card-body" style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {lookupCategories.map(cat => {
                      const displayNames = {
                        client_type: 'Client Types',
                        loss_reason: 'Loss Reasons',
                        project_status: 'Project Statuses',
                        delay_reason: 'Delay Reasons'
                      };
                      const isSelected = selectedLookupCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedLookupCategory(cat);
                            setEditingLookup(null);
                            setNewLookup({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            background: isSelected ? 'var(--bg-active)' : 'transparent',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12.5px',
                            fontWeight: isSelected ? 600 : 500
                          }}
                        >
                          {displayNames[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Create new category */}
              <div className="card">
                <div className="card-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13px', fontWeight: 600 }}>New Dropdown List</div>
                </div>
                <div className="card-body" style={{ padding: '12px' }}>
                  <input
                    type="text"
                    placeholder="e.g. lead_source..."
                    className="form-control"
                    style={{ fontSize: '12px', marginBottom: '8px' }}
                    id="new-category-input"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const newCat = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
                        if (lookupCategories.includes(newCat)) {
                          alert('Lookup category already exists');
                          return;
                        }
                        setLookupCategories(prev => [...prev, newCat].sort());
                        setSelectedLookupCategory(newCat);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Type key name (lowercase, no spaces) and press Enter to initialize a new dropdown.
                  </div>
                </div>
              </div>
            </div>

            {/* List and form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Form card */}
              <div className="card">
                <div className="card-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>
                    {editingLookup ? 'Edit Option' : 'Add New Option'} to list: <strong style={{ color: 'var(--text-primary)' }}>{selectedLookupCategory}</strong>
                  </div>
                  {editingLookup && (
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        setEditingLookup(null);
                        setNewLookup({ label: '', value: '', sort_order: 1, is_active: true, color: 'default' });
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="card-body" style={{ padding: '16px' }}>
                  <form onSubmit={handleSaveLookup} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Display Label</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Consultant"
                        value={newLookup.label}
                        onChange={e => setNewLookup(prev => ({ ...prev, label: e.target.value, value: prev.value ? prev.value : e.target.value }))}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>System Value</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        placeholder="e.g. Consultant"
                        value={newLookup.value}
                        onChange={e => setNewLookup(prev => ({ ...prev, value: e.target.value }))}
                      />
                    </div>
                    <div className="form-row" style={{ maxWidth: '100px' }}>
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Sort Order</label>
                      <input
                        type="number"
                        required
                        className="form-control"
                        value={newLookup.sort_order}
                        onChange={e => setNewLookup(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Color Badge (Optional)</label>
                      <select
                        className="form-control"
                        value={newLookup.color}
                        onChange={e => setNewLookup(prev => ({ ...prev, color: e.target.value }))}
                      >
                        <option value="default">Default (Gray)</option>
                        <option value="primary">Primary (Blue)</option>
                        <option value="success">Success (Green)</option>
                        <option value="info">Info (Cyan)</option>
                        <option value="warning">Warning (Orange/Yellow)</option>
                        <option value="danger">Danger (Red)</option>
                      </select>
                    </div>
                    <div className="form-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', height: 'var(--form-control-height)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newLookup.is_active}
                          onChange={e => setNewLookup(prev => ({ ...prev, is_active: e.target.checked }))}
                        />
                        Active
                      </label>
                    </div>
                    <div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        {editingLookup ? 'Update Option' : 'Add Option'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Data Table */}
              <div className="card">
                <div className="card-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Active options in selected list</div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {lookupsLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading dropdown items...</div>
                  ) : (
                    <table className="table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>Sort</th>
                          <th>Display Label</th>
                          <th>Value</th>
                          <th>Color Badge</th>
                          <th>Status</th>
                          <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookups
                          .filter(item => item.category === selectedLookupCategory)
                          .map(item => (
                            <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                              <td style={{ fontWeight: 600 }}>{item.sort_order}</td>
                              <td style={{ fontWeight: 600 }}>{item.label}</td>
                              <td><code>{item.value}</code></td>
                              <td>
                                {item.metadata_json?.color && (
                                  <span className={`badge b-${item.metadata_json.color}`}>
                                    {item.metadata_json.color}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`} style={{
                                  background: item.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: item.is_active ? '#10b981' : '#ef4444',
                                  border: item.is_active ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                  {item.is_active ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => handleEditLookupClick(item)}
                                  style={{ background: 'transparent', border: 'none', color: '#e09924', cursor: 'pointer', fontSize: '11px', padding: '4px 6px', marginRight: '4px' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteLookup(item.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11px', padding: '4px 6px' }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        {lookups.filter(item => item.category === selectedLookupCategory).length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              No options configured for this category yet. Add one above!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Templates' && isAdmin && (
        <MasterGoogleSheetManager />
      )}

      {activeTab === 'Releases & Deployments' && isAdmin && (
        <ReleasesDeploymentManager />
      )}


      {/* ADD CUSTOM ALERT RULE MODAL */}
      {showRuleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Add Custom Alert Rule</div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }} onClick={() => setShowRuleModal(false)}>✕</button>
            </div>
            <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Target Module</label>
                <select 
                  className="form-control" 
                  value={ruleForm.module} 
                  onChange={e => {
                    const mod = e.target.value;
                    let param = 'margin';
                    if (mod === 'crm') param = 'nps';
                    if (mod === 'design') param = 'outstanding';
                    setRuleForm(prev => ({ ...prev, module: mod, parameter: param }));
                  }}
                >
                  <option value="crm">CRM Module</option>
                  <option value="design">Design tracker Module</option>
                  <option value="projects">Projects Module</option>
                  <option value="orders">Orders Module</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Condition Parameter</label>
                <select 
                  className="form-control" 
                  value={ruleForm.parameter}
                  onChange={e => setRuleForm(prev => ({ ...prev, parameter: e.target.value }))}
                >
                  {ruleForm.module === 'crm' && (
                    <>
                      <option value="nps">Client NPS Score</option>
                      <option value="days_dormant">Days since last project</option>
                      <option value="days_since_contact">Days since last contact</option>
                    </>
                  )}
                  {ruleForm.module === 'design' && (
                    <>
                      <option value="outstanding">Outstanding design fee balance (R)</option>
                      <option value="overdue_days">Drawing phase overdue days</option>
                    </>
                  )}
                  {ruleForm.module === 'projects' && (
                    <>
                      <option value="margin">Dynamic Project margin (%)</option>
                      <option value="overdue_days">Project overdue days</option>
                      <option value="outstanding">Outstanding design fee balance (R)</option>
                    </>
                  )}
                  {ruleForm.module === 'orders' && (
                    <>
                      <option value="margin">Order margin (%)</option>
                      <option value="value">Order retail value (R)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label" style={{ color: 'var(--text-primary)' }}>Condition</label>
                  <select 
                    className="form-control" 
                    value={ruleForm.condition}
                    onChange={e => setRuleForm(prev => ({ ...prev, condition: e.target.value }))}
                  >
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="equals">Equals (=)</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ color: 'var(--text-primary)' }}>Threshold Value</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 18 or 5000" 
                    value={ruleForm.value}
                    onChange={e => setRuleForm(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <label className="form-label" style={{ color: 'var(--text-primary)' }}>Alert Label Description</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Margin is below 18%" 
                  value={ruleForm.label}
                  onChange={e => setRuleForm(prev => ({ ...prev, label: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (!ruleForm.value || !ruleForm.label) return;
                    const newRule = {
                      id: `rule-${Date.now()}`,
                      ...ruleForm,
                      value: Number(ruleForm.value)
                    };
                    setAlertSettings(prev => ({
                      ...prev,
                      customRules: [...(prev.customRules || []), newRule]
                    }));
                    setShowRuleModal(false);
                    setRuleForm({ module: 'projects', parameter: 'margin', condition: 'less_than', value: '', label: '' });
                  }}
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
