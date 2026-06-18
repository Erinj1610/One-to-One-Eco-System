import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Layers } from 'lucide-react';

const DOCUMENT_TYPES = {
  DESIGN_FEE_PROPOSAL: {
    id: 'DESIGN_FEE_PROPOSAL',
    name: '💰 Design Fee Proposal',
    description: 'Word (.docx) template containing placeholders for client proposals.',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "PROPOSAL_NUMBER"],
      "Areas & Meterage": ["LIVING_AREA", "LANDSCAPE_AREA", "EXP_LIVING_SQM", "SEC_LIVING_SQM", "NONEXP_LIVING_SQM", "EXP_LAND_SQM", "SEC_LAND_SQM"],
      "Phase Fees": ["CONCEPT_COST", "SCHEMATIC_COST", "FINAL_COST", "DEPOSIT_REQUIRED"],
      "Totals": ["DISCOUNT_AMOUNT", "DESIGN_NET", "GRAND_TOTAL"]
    }
  },
  QUOTATION: {
    id: 'QUOTATION',
    name: '🧾 Quotation / BOQ',
    description: 'Word (.docx) template for hardware quotations and BOQ specifications.',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "DOCUMENT_NUMBER"],
      "Client Info": ["CLIENT_COMPANY", "CLIENT_EMAIL", "CLIENT_PHONE", "DELIVERY_ADDRESS"],
      "Staff Vitals": ["ONEONE_REP", "PM_NAME", "PM_EMAIL"],
      "Financials": ["SUBTOTAL", "DISCOUNT_AMOUNT", "VAT_AMOUNT", "TOTAL_RETAIL"],
      "Table Items (Row Loops)": ["item.index", "item.code", "item.description", "item.qty", "item.brand", "item.retail", "item.totalRetail", "item.floor", "item.area", "item.dimming"]
    }
  },
  INVOICE: {
    id: 'INVOICE',
    name: '💳 Tax Invoice',
    description: 'Word (.docx) template for commercial client billing and tax invoicing.',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "DOCUMENT_NUMBER"],
      "Client Info": ["CLIENT_COMPANY", "CLIENT_EMAIL", "CLIENT_PHONE", "DELIVERY_ADDRESS"],
      "Financials": ["SUBTOTAL", "DISCOUNT_AMOUNT", "VAT_AMOUNT", "TOTAL_RETAIL"],
      "Table Items (Row Loops)": ["item.index", "item.code", "item.description", "item.qty", "item.retail", "item.totalRetail"]
    }
  },
  PACKING_LIST: {
    id: 'PACKING_LIST',
    name: '📦 Packing List',
    description: 'Word (.docx) template containing packed items and box designations.',
    tokens: {
      "Document Info": ["DOCUMENT_NUMBER", "DATE", "PROJECT_NAME", "CLIENT_NAME"],
      "Shipping Info": ["ONEONE_REP", "PM_NAME", "PM_EMAIL", "DELIVERY_ADDRESS"],
      "Table Items (Row Loops)": ["item.index", "item.code", "item.description", "item.qty", "item.brand", "item.floor", "item.area", "item.boxNumber", "item.backOrder", "item.etaBackOrder"]
    }
  },
  DELIVERY_NOTE: {
    id: 'DELIVERY_NOTE',
    name: '🚚 Delivery Note',
    description: 'Word (.docx) template issued upon client receipt of physical fixture boxes.',
    tokens: {
      "Document Info": ["DOCUMENT_NUMBER", "DATE", "PROJECT_NAME", "CLIENT_NAME"],
      "Shipping Info": ["ONEONE_REP", "PM_NAME", "PM_EMAIL", "DELIVERY_ADDRESS"],
      "Table Items (Row Loops)": ["item.index", "item.code", "item.description", "item.qty", "item.brand", "item.floor", "item.area", "item.boxNumber", "item.backOrder", "item.etaBackOrder"]
    }
  }
};

export default function TemplateHub() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState('DESIGN_FEE_PROPOSAL');
  const [config, setConfig] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const activeDoc = DOCUMENT_TYPES[selectedDoc];

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const fetchConfigAndMetadata = async (docType) => {
    setLoading(true);
    try {
      // 1. Fetch visual config
      const resConf = await fetch(`${API_BASE}/admin/configs/${docType}`);
      if (resConf.ok) {
        const dataConf = await resConf.json();
        setConfig(dataConf.config_json || {});
      }
      
      // 2. Fetch docx file metadata
      const resMeta = await fetch(`${API_BASE}/admin/templates/${docType}/metadata`);
      if (resMeta.ok) {
        const dataMeta = await resMeta.json();
        setMetadata(dataMeta);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error loading template attributes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndMetadata(selectedDoc);
    setMessage(null);
  }, [selectedDoc]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Naming convention and credentials updated successfully!' });
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Word template .docx file uploaded successfully!' });
        // Refresh metadata
        const resMeta = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/metadata`);
        if (resMeta.ok) {
          const dataMeta = await resMeta.json();
          setMetadata(dataMeta);
        }
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.detail || 'Upload failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error transmitting template file.' });
    } finally {
      setUploading(false);
    }
  };

  const updateConfigVal = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  if (!isAdmin) return null;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back to Dashboard</button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙ Word (.docx) Template Branding Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Upload, update, and manage your Word templates. The engine converts them natively to high-fidelity PDFs.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Sidebar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Document Types</div>
          {Object.values(DOCUMENT_TYPES).map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className="btn btn-ghost"
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: '6px',
                width: '100%', justifyContent: 'flex-start',
                border: '1px solid',
                borderColor: selectedDoc === doc.id ? 'var(--border-info)' : 'transparent',
                background: selectedDoc === doc.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                color: selectedDoc === doc.id ? 'var(--text-info)' : 'var(--text-secondary)',
                fontWeight: selectedDoc === doc.id ? 600 : 500
              }}
            >
              {doc.name}
            </button>
          ))}
        </div>

        {/* Settings Area */}
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)' }}>
          {loading ? (
             <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading parameters...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{activeDoc.name} Template</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {activeDoc.description}
                </p>
              </div>

              {/* Template Status / Actions Box */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '50%', 
                    background: metadata?.exists ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: metadata?.exists ? 'var(--text-success)' : 'var(--text-danger)'
                  }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {metadata?.exists ? 'Template Active' : 'No Word Template Uploaded'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {metadata?.exists 
                        ? `${(metadata.size / 1024).toFixed(1)} KB — Modified: ${new Date(metadata.last_modified * 1000).toLocaleString()}`
                        : 'Upload a Microsoft Word (.docx) file to get started.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {metadata?.exists && (
                    <a 
                      href={`${API_BASE}/admin/templates/${selectedDoc}/download`}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}
                      download
                    >
                      <Download size={13} /> Download Current
                    </a>
                  )}

                  <label className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                    <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Template'}
                    <input 
                      type="file" 
                      accept=".docx" 
                      onChange={handleFileUpload} 
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {config && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                      File Naming Convention
                      <span style={{ fontSize: '11px', color: 'var(--text-success)', marginLeft: '6px', fontWeight: 'normal' }}> (Customize export PDF filename)</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={config.naming_convention || ''} 
                      onChange={e => updateConfigVal('naming_convention', e.target.value)} 
                      placeholder="e.g. {{PROJECT_NAME}}_Fee_Proposal_{{DATE}}"
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                      Google Service Account JSON Credential (Optional override for print routing)
                    </label>
                    <textarea 
                      rows={4}
                      className="form-control"
                      value={config.google_credentials_json || ''} 
                      onChange={e => updateConfigVal('google_credentials_json', e.target.value)} 
                      placeholder='Paste private service account key (starts with {"type": "service_account"...})'
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '11.5px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}

              {/* Token Toolbox */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔖 Copy-Paste Token Toolbox
                </h4>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Place these placeholders in your Word template. When duplicating rows in tables, include the items prefix (e.g. `{"{{item.code}}"}`). Click any token to copy it instantly.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => (
                    <div key={category}>
                      <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.3px' }}>{category}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {list.map(token => (
                          <code 
                            key={token} 
                            style={{ 
                              padding: '2px 6px', background: 'rgba(59, 130, 246, 0.08)', 
                              border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '4px', 
                              fontSize: '11px', color: 'var(--text-info)', cursor: 'pointer' 
                            }}
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${token}}}`);
                              setMessage({ type: 'success', text: `Copied {{${token}}} to clipboard!` });
                              setTimeout(() => setMessage(null), 2500);
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

              {message && (
                <div style={{ 
                  padding: '10px 14px', borderRadius: '6px', 
                  background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: message.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  color: message.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)',
                  fontSize: '12.5px',
                  textAlign: 'center'
                }}>
                  {message.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveConfig} 
                  disabled={saving}
                  style={{ minWidth: '160px' }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
