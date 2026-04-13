import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';

const DOCUMENT_TYPES = {
  DESIGN_FEE_PROPOSAL: {
    id: 'DESIGN_FEE_PROPOSAL',
    name: '💰 Design Fee Proposal',
    type: 'NATIVE',
    description: 'Professional client-facing proposal generated natively for 100% fidelity.',
    description: 'Professional client-facing proposal generated natively for 100% fidelity.',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "PROPOSAL_NUMBER"],
      "Areas & Meterage": ["LIVING_AREA", "LANDSCAPE_AREA", "EXP_LIVING_SQM", "SEC_LIVING_SQM", "NONEXP_LIVING_SQM", "EXP_LAND_SQM", "SEC_LAND_SQM"],
      "Phase Fees": ["CONCEPT_COST", "SCHEMATIC_COST", "FINAL_COST", "DEPOSIT_REQUIRED"],
      "Extras & Support": ["ARCH_COST", "SITE_SUPPORT_COST", "COMMISSIONING_COST"],
      "Totals & FX": ["DISCOUNT_AMOUNT", "DESIGN_NET", "GRAND_TOTAL", "GRAND_TOTAL_USD", "USD_RATE"]
    }
  },
  FAULT_REPORT: {
    id: 'FAULT_REPORT',
    name: '⚠️ Fault & Return',
    type: 'LEGACY',
    description: 'Manual report generated from templates.',
  }
};

export default function TemplateHub() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState('DESIGN_FEE_PROPOSAL');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const activeDoc = DOCUMENT_TYPES[selectedDoc];

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const fetchConfig = async (docType) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${docType}`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setConfig(data.config_json);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load document settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig(selectedDoc);
    setMessage(null);
  }, [selectedDoc]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Branding settings updated!' });
      } else {
        throw new Error("Save status failed");
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  if (!isAdmin) return null;

  return (
    <div className="animation-fade-in" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate('/')} className="text-btn" style={{ marginBottom: '1rem' }}>← Home</button>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>⚙ Professional Branding Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configure your professional document templates. These settings are applied to your Native PDFs.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Object.values(DOCUMENT_TYPES).map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              style={{
                textAlign: 'left', padding: '1rem', borderRadius: '10px',
                border: '1px solid',
                borderColor: selectedDoc === doc.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                background: selectedDoc === doc.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                color: selectedDoc === doc.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600 }}>{doc.name}</div>
              <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{doc.type === 'NATIVE' ? 'High-Performance Native' : 'Generic Template'}</span>
            </button>
          ))}
        </div>

        {/* Settings Area */}
        <div className="stat-card" style={{ padding: '2rem' }}>
          {loading ? (
             <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Branding & Proposal Content</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)', paddingBottom: '1rem' }}>
                {activeDoc.description} These settings are injected into the 121 Hubbard Professional PDF Engine.
              </p>

              {config && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Google Doc Template ID 
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6', marginLeft: '0.5rem' }}> (This is your "Visual Designer")</span>
                    </label>
                    <input 
                      type="text" value={config.google_doc_id || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        // Auto-extract ID if URL is pasted
                        const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
                        const id = match ? match[1] : val;
                        updateSetting('google_doc_id', id);
                      }} 
                      placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid #3b82f6', color: 'white' }}
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      Open your template in Google Docs and copy the ID from the URL: <code>docs.google.com/document/d/<strong>[ID_HERE]</strong>/edit</code>
                    </p>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      File Naming Convention
                      <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '0.5rem' }}> (Use tokens in filename)</span>
                    </label>
                    <input 
                      type="text" value={config.naming_convention || ''} 
                      onChange={e => updateSetting('naming_convention', e.target.value)} 
                      placeholder="e.g. {{PROJECT_NAME}}_Fee_Proposal_{{DATE}}"
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', color: 'white' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Google Service Account JSON (Optional - Fixes Printing Hangs)
                      <span style={{ 
                        fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '1rem',
                        background: config.google_credentials_json ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: config.google_credentials_json ? '#10b981' : '#eab308'
                      }}>
                        {config.google_credentials_json ? '● CREDENTIALS LOADED' : '○ PENDING MANUAL SETUP'}
                      </span>
                    </label>
                    <textarea 
                      rows={5}
                      value={config.google_credentials_json || ''} 
                      onChange={e => updateSetting('google_credentials_json', e.target.value)} 
                      placeholder='Paste your Service Account JSON Key here (starts with {"type": "service_account"...})'
                      style={{ 
                        width: '100%', padding: '0.8rem', borderRadius: '8px', 
                        background: 'rgba(59, 130, 246, 0.02)', border: '1px solid var(--panel-border)', 
                        color: 'white', fontFamily: 'monospace', fontSize: '0.75rem' 
                      }}
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      Pasting your JSON key directly bypasses Windows authentication issues and ensures 100% reliable printing.
                    </p>
                  </div>

                  {/* Token Toolbox */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#3b82f6' }}>🔖 Token Toolbox (Copy & Paste to Google Doc)</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Place these placeholders in your Google Doc or Naming Convention. They will be replaced automatically.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => (
                        <div key={category}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.6rem' }}>{category}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {list.map(token => (
                              <code 
                                key={token} 
                                style={{ 
                                  padding: '0.2rem 0.5rem', background: 'rgba(59, 130, 246, 0.1)', 
                                  border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '4px', 
                                  fontSize: '0.7rem', color: '#60a5fa', cursor: 'pointer' 
                                }}
                                onClick={() => {
                                  navigator.clipboard.writeText(`{{${token}}}`);
                                  setMessage({ type: 'success', text: `Copied {{${token}}} to clipboard!` });
                                  setTimeout(() => setMessage(null), 2000);
                                }}
                              >
                                {`{{${token}}}`}
                              </code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {message && (
                <div style={{ 
                  padding: '1rem', borderRadius: '8px', 
                  background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                  color: message.type === 'success' ? '#10b981' : '#f87171',
                  textAlign: 'center'
                }}>
                  {message.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  className="glow-btn" 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ minWidth: '200px' }}
                >
                  {saving ? 'Saving...' : 'Save Brand Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
