import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
import { Upload, Download, FileText, CheckCircle, AlertCircle, Layers, Settings, Eye, Code, Save, Trash2, FileCheck, RefreshCw } from 'lucide-react';

const SHARED_ORDER_TOKENS = {
  "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "DOCUMENT_NUMBER", "ORDER_STATUS"],
  "Client Info": ["CLIENT_COMPANY", "CLIENT_CONTACT_PERSON", "CLIENT_EMAIL", "CLIENT_PHONE", "CLIENT_VAT", "DELIVERY_ADDRESS"],
  "Staff & Project Vitals": ["ONEONE_REP", "PM_NAME", "PM_EMAIL", "PM_PHONE", "PM_PPHONE", "PROJECT_PM", "PROJECT_SIZE", "PROJECT_TIER"],
  "Financials": ["SUBTOTAL", "DISCOUNT_AMOUNT", "VAT_AMOUNT", "TOTAL_RETAIL", "TOTAL_COST", "MARGIN_PERCENT", "DEPOSIT", "BALANCE", "TOTAL_PAID", "BALANCE_OUTSTANDING"],
  "Table Items (Row Loops)": ["item.index", "item.code", "item.description", "item.qty", "item.brand", "item.retail", "item.totalRetail", "item.floor", "item.area", "item.dimming", "item.unitCost", "item.stockStatus", "item.eta"],
  "Payments (Row Loops)": ["payment.index", "payment.date", "payment.reference", "payment.amount"]
};

const DOCUMENT_TYPES = {
  DESIGN_FEE_PROPOSAL: {
    id: 'DESIGN_FEE_PROPOSAL',
    name: '💰 Design Fee Proposal',
    description: 'Word (.docx) or Visual HTML template containing placeholders for client proposals.',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "PROPOSAL_NUMBER"],
      "Areas & Meterage": ["LIVING_AREA", "LANDSCAPE_AREA", "EXP_LIVING_SQM", "SEC_LIVING_SQM", "NONEXP_LIVING_SQM", "EXP_LAND_SQM", "SEC_LAND_SQM"],
      "Phase Fees": ["CONCEPT_COST", "SCHEMATIC_COST", "FINAL_COST", "DEPOSIT_REQUIRED"],
      "Extras & Totals": ["ARCH_COST", "SITE_SUPPORT_COST", "COMMISSIONING_COST", "DISCOUNT_AMOUNT", "DESIGN_NET", "GRAND_TOTAL", "GRAND_TOTAL_USD", "USD_RATE"]
    }
  },
  QUOTATION: {
    id: 'QUOTATION',
    name: '🧾 Summarized Quotation',
    description: 'Word (.docx) or Visual HTML template for summarized hardware quotations.',
    tokens: SHARED_ORDER_TOKENS
  },
  BOQ: {
    id: 'BOQ',
    name: '📄 Bill of Quantity (BOQ)',
    description: 'Word (.docx) or Visual HTML template for detailed room/area breakdowns.',
    tokens: SHARED_ORDER_TOKENS
  },
  DEPOSIT_INVOICE: {
    id: 'DEPOSIT_INVOICE',
    name: '💳 Deposit Invoice',
    description: 'Word (.docx) or Visual HTML template for billing client deposit (e.g. 50% deposit payment).',
    tokens: SHARED_ORDER_TOKENS
  },
  BALANCE_INVOICE: {
    id: 'BALANCE_INVOICE',
    name: '💳 Balance Invoice',
    description: 'Word (.docx) or Visual HTML template for billing outstanding remaining balance payments.',
    tokens: SHARED_ORDER_TOKENS
  },
  TAX_INVOICE: {
    id: 'TAX_INVOICE',
    name: '💳 Tax Invoice (Full)',
    description: 'Word (.docx) or Visual HTML template for commercial client billing and full tax invoicing.',
    tokens: SHARED_ORDER_TOKENS
  },
  PROGRESS_STATEMENT: {
    id: 'PROGRESS_STATEMENT',
    name: '📊 Progress Statement',
    description: 'Word (.docx) or Visual HTML template detailing payment status and logistics delivery progress.',
    tokens: SHARED_ORDER_TOKENS
  },
  PACKING_LIST: {
    id: 'PACKING_LIST',
    name: '📦 Packing List',
    description: 'Word (.docx) or Visual HTML template containing packed items and box designations.',
    tokens: SHARED_ORDER_TOKENS
  },
  DELIVERY_NOTE: {
    id: 'DELIVERY_NOTE',
    name: '🚚 Delivery Note',
    description: 'Word (.docx) or Visual HTML template issued upon client receipt of physical fixture boxes.',
    tokens: SHARED_ORDER_TOKENS
  }
};

const STARTER_HTML_TEMPLATES = {
  QUOTATION: `
<!DOCTYPE html>
<html>
<head>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
  }
  body {
    font-family: 'Outfit', 'Inter', sans-serif;
    color: #333333;
    font-size: 11pt;
    line-height: 1.5;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
  }
  .logo-cell {
    font-size: 24pt;
    font-weight: 800;
    color: #111827;
    letter-spacing: -1px;
  }
  .brand-dot {
    color: #10b981;
  }
  .doc-title-cell {
    text-align: right;
    font-size: 16pt;
    font-weight: 700;
    color: #10b981;
    text-transform: uppercase;
  }
  .grid-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
  }
  .grid-table td {
    width: 50%;
    vertical-align: top;
    padding: 8px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  .grid-title {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 5px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  .data-table th {
    background: #111827;
    color: #ffffff;
    font-weight: 700;
    font-size: 9.5pt;
    text-transform: uppercase;
    padding: 10px;
    text-align: left;
    border: 1px solid #111827;
  }
  .data-table td {
    padding: 10px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 10pt;
  }
  .data-table tr:nth-child(even) td {
    background: #f9fafb;
  }
  .summary-table {
    width: 40%;
    margin-left: 60%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  .summary-table td {
    padding: 8px 10px;
    font-size: 10pt;
    border-bottom: 1px solid #e5e7eb;
  }
  .summary-total {
    font-weight: 700;
    font-size: 12pt;
    color: #10b981;
    border-bottom: 2px double #10b981 !important;
  }
  .terms-section {
    background: #f3f4f6;
    border-left: 3px solid #10b981;
    padding: 15px;
    border-radius: 4px;
    font-size: 9pt;
    color: #4b5563;
  }
</style>
</head>
<body>

<table class="header-table">
  <tr>
    <td class="logo-cell">1-to-1 World<span class="brand-dot">.</span></td>
    <td class="doc-title-cell">Quotation</td>
  </tr>
</table>

<table class="grid-table">
  <tr>
    <td>
      <div class="grid-title">Client Details</div>
      <strong>{{CLIENT_COMPANY}}</strong><br>
      Attn: {{CLIENT_CONTACT_PERSON}}<br>
      Email: {{CLIENT_EMAIL}}<br>
      Phone: {{CLIENT_PHONE}}
    </td>
    <td style="border-left: 10px solid white;">
      <div class="grid-title">Document Vitals</div>
      <strong>Quote Number:</strong> {{DOCUMENT_NUMBER}}<br>
      <strong>Date:</strong> {{DATE}}<br>
      <strong>Project Name:</strong> {{PROJECT_NAME}}<br>
      <strong>Status:</strong> {{ORDER_STATUS}}
    </td>
  </tr>
</table>

<h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Itemized Pricing</h3>
<table class="data-table">
  <thead>
    <tr>
      <th style="width: 8%;">#</th>
      <th style="width: 15%;">Code</th>
      <th style="width: 52%;">Description</th>
      <th style="width: 10%; text-align: center;">Qty</th>
      <th style="width: 15%; text-align: right;">Total (ZAR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align: center;">{{item.index}}</td>
      <td><strong>{{item.code}}</strong></td>
      <td>{{item.description}}</td>
      <td style="text-align: center;">{{item.qty}}</td>
      <td style="text-align: right;">{{item.totalRetail}}</td>
    </tr>
  </tbody>
</table>

<table class="summary-table">
  <tr>
    <td>Subtotal:</td>
    <td style="text-align: right;">{{SUBTOTAL}}</td>
  </tr>
  <tr>
    <td>VAT (15%):</td>
    <td style="text-align: right;">{{VAT_AMOUNT}}</td>
  </tr>
  <tr class="summary-total">
    <td><strong>Grand Total:</strong></td>
    <td style="text-align: right;"><strong>{{TOTAL_RETAIL}}</strong></td>
  </tr>
</table>

<div class="terms-section">
  <strong>Terms & Conditions:</strong><br>
  1. Prices exclude delivery and installation unless specified.<br>
  2. A 50% deposit is required to order goods; the balance is due before delivery.<br>
  3. Lead times are approximate and start from receipt of deposit.
</div>

</body>
</html>
`
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
  
  // Visual Template Editor states
  const [activeTab, setActiveTab] = useState('word'); // 'word' or 'visual'
  const [htmlContent, setHtmlContent] = useState('');
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'code'
  
  const editorRef = useRef(null);

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
      
      // 3. Fetch visual HTML content
      const resHtml = await fetch(`${API_BASE}/admin/templates/${docType}/html`);
      if (resHtml.ok) {
        const dataHtml = await resHtml.json();
        setHtmlContent(dataHtml.html || '');
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

  // Sync state to visual editor element
  useEffect(() => {
    if (activeTab === 'visual' && editorMode === 'visual' && editorRef.current) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, [activeTab, editorMode, htmlContent]);

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

  const handleSaveHtmlTemplate = async () => {
    setSaving(true);
    setMessage(null);
    let htmlToSave = htmlContent;
    
    if (editorMode === 'visual' && editorRef.current) {
      htmlToSave = editorRef.current.innerHTML;
      setHtmlContent(htmlToSave);
    }

    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlToSave })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Visual HTML Template saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save visual HTML template.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadStarterTemplate = () => {
    const starter = STARTER_HTML_TEMPLATES[selectedDoc] || STARTER_HTML_TEMPLATES.QUOTATION;
    setHtmlContent(starter);
    if (editorRef.current && editorMode === 'visual') {
      editorRef.current.innerHTML = starter;
    }
    setMessage({ type: 'success', text: 'Loaded starter template. Click Save to activate it!' });
  };

  const handleClearTemplate = async () => {
    if (!window.confirm("Are you sure you want to clear the visual HTML template? The system will revert back to the Word (.docx) template.")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: "" })
      });
      if (res.ok) {
        setHtmlContent('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        setMessage({ type: 'success', text: 'Visual HTML template cleared. Reverted to Word engine.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear HTML template.' });
    } finally {
      setSaving(false);
    }
  };

  const insertToken = (token) => {
    const text = `{{${token}}}`;
    
    if (editorMode === 'code') {
      // In code mode, append to text area
      setHtmlContent(prev => prev + text);
      return;
    }

    // In visual contentEditable mode, insert at cursor
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Move selection cursor after token
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.innerHTML += text;
      }
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  // Run style commands on contentEditable editor
  const runCommand = (command, value = null) => {
    if (editorMode !== 'visual') return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
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

  const handleDownload = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/download`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to download template file.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDoc.toLowerCase()}_template.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setMessage({ type: 'success', text: 'Template download completed!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Error downloading template. Please verify the backend is running.' });
    }
  };

  const updateConfigVal = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  if (!isAdmin) return null;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1450px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back to Dashboard</button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙ Template Customization Suite
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Upload Word templates, or visually design high-performance HTML/CSS layouts that render natively to beautiful PDFs.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Sidebar - Doc Selector */}
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

        {/* Main Settings & Editor Area */}
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tab Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '0px', gap: '15px' }}>
            <button 
              onClick={() => setActiveTab('word')}
              style={{
                background: 'none', border: 'none', 
                borderBottom: activeTab === 'word' ? '2px solid var(--text-info)' : '2px solid transparent',
                color: activeTab === 'word' ? 'var(--text-info)' : 'var(--text-secondary)',
                padding: '10px 16px', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Settings size={15} /> Word (.docx) Engine Settings
            </button>
            <button 
              onClick={() => setActiveTab('visual')}
              style={{
                background: 'none', border: 'none', 
                borderBottom: activeTab === 'visual' ? '2px solid var(--text-info)' : '2px solid transparent',
                color: activeTab === 'visual' ? 'var(--text-info)' : 'var(--text-secondary)',
                padding: '10px 16px', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Layers size={15} /> Visual HTML Template Studio
            </button>
          </div>

          {loading ? (
             <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading parameters...</div>
          ) : activeTab === 'word' ? (
            /* Tab 1: Microsoft Word Engine Settings */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{activeDoc.name} Word Settings</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Use the traditional Microsoft Word templates that upload to the Cloud.
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
                  <button 
                    onClick={handleDownload}
                    className="btn"
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <Download size={13} /> {metadata?.exists ? 'Download Current' : 'Download Starter'}
                  </button>

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
          ) : (
            /* Tab 2: Visual HTML Template Studio */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Visual Document Canvas</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    {htmlContent ? '🟢 Custom Visual Template is ACTIVE (bypassing Word template).' : '⚪ Using default Word template. Click "Load Starter Template" to design visually.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleLoadStarterTemplate}
                    className="btn"
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}
                  >
                    <RefreshCw size={13} /> Load Starter Template
                  </button>
                  {htmlContent && (
                    <button 
                      onClick={handleClearTemplate}
                      className="btn"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', color: 'var(--text-danger)' }}
                    >
                      <Trash2 size={13} /> Clear & Revert to Word
                    </button>
                  )}
                </div>
              </div>

              {/* Editor Workspace Split Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', minHeight: '600px', alignItems: 'stretch' }}>
                
                {/* Left Controls & Tokens Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  
                  {/* Editor Mode Selector */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Editor Mode</div>
                    <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <button 
                        onClick={() => {
                          if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
                          setEditorMode('visual');
                        }}
                        style={{
                          flex: 1, padding: '6px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                          background: editorMode === 'visual' ? 'var(--text-info)' : 'transparent',
                          color: editorMode === 'visual' ? 'white' : 'var(--text-secondary)',
                          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                        }}
                      >
                        <Eye size={12} /> Visual Designer
                      </button>
                      <button 
                        onClick={() => {
                          if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
                          setEditorMode('code');
                        }}
                        style={{
                          flex: 1, padding: '6px', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
                          background: editorMode === 'code' ? 'var(--text-info)' : 'transparent',
                          color: editorMode === 'code' ? 'white' : 'var(--text-secondary)',
                          fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                        }}
                      >
                        <Code size={12} /> Edit HTML Source
                      </button>
                    </div>
                  </div>

                  {/* Token Click to Insert Panel */}
                  <div style={{ flex: 1, overflowY: 'auto', maxHeight: '450px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Click Token to Insert</div>
                    {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => (
                      <div key={category}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>{category}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {list.map(token => (
                            <button
                              key={token}
                              onClick={() => insertToken(token)}
                              className="btn btn-ghost"
                              style={{
                                padding: '2px 6px', background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '4px',
                                fontSize: '10.5px', color: 'var(--text-info)', cursor: 'pointer',
                                height: 'auto', minHeight: 0
                              }}
                            >
                              {`+ {{${token}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Right Interactive Page Editor Canvas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Rich Text Visual Toolbar (Visible only in Visual mode) */}
                  {editorMode === 'visual' && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', alignItems: 'center' }}>
                      <button onClick={() => runCommand('bold')} className="btn btn-sm btn-ghost" style={{ fontWeight: 'bold', minWidth: '30px', padding: '2px' }}>B</button>
                      <button onClick={() => runCommand('italic')} className="btn btn-sm btn-ghost" style={{ fontStyle: 'italic', minWidth: '30px', padding: '2px' }}>I</button>
                      <button onClick={() => runCommand('underline')} className="btn btn-sm btn-ghost" style={{ textDecoration: 'underline', minWidth: '30px', padding: '2px' }}>U</button>
                      
                      <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
                      
                      <button onClick={() => runCommand('justifyLeft')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Align Left</button>
                      <button onClick={() => runCommand('justifyCenter')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Center</button>
                      <button onClick={() => runCommand('justifyRight')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Align Right</button>

                      <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

                      <select 
                        onChange={(e) => runCommand('fontSize', e.target.value)} 
                        className="form-control"
                        style={{ height: '24px', fontSize: '11px', padding: '0 4px', width: '90px' }}
                      >
                        <option value="3">Normal Size</option>
                        <option value="1">Small (8pt)</option>
                        <option value="2">Medium (10pt)</option>
                        <option value="4">Large (14pt)</option>
                        <option value="5">Huge (18pt)</option>
                        <option value="6">Heading (24pt)</option>
                      </select>

                      <select 
                        onChange={(e) => runCommand('fontName', e.target.value)} 
                        className="form-control"
                        style={{ height: '24px', fontSize: '11px', padding: '0 4px', width: '100px' }}
                      >
                        <option value="sans-serif">Clean Sans</option>
                        <option value="Outfit">Outfit</option>
                        <option value="Inter">Inter</option>
                        <option value="Georgia">Georgia Serif</option>
                        <option value="monospace">Monospace</option>
                      </select>
                      
                      <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
                      
                      <input 
                        type="color" 
                        onChange={(e) => runCommand('foreColor', e.target.value)}
                        style={{ width: '22px', height: '22px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }}
                        title="Text Color"
                      />
                    </div>
                  )}

                  {/* HTML Source Code Mode (Code Editor) */}
                  {editorMode === 'code' ? (
                    <textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Paste your custom HTML template code here..."
                      style={{
                        width: '100%', flex: 1, minHeight: '520px', fontFamily: 'monospace', fontSize: '12px',
                        padding: '15px', background: '#1e293b', color: '#e2e8f0', border: '1px solid var(--border)', borderRadius: '8px',
                        resize: 'none', outline: 'none'
                      }}
                    />
                  ) : (
                    /* Visual Mode Canvas Frame (Styled as a scrolling page) */
                    <div style={{ background: '#334155', border: '1px solid var(--border)', borderRadius: '8px', padding: '30px', overflowY: 'auto', display: 'flex', justifyContent: 'center', height: '520px' }}>
                      <div 
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => {
                          if (editorRef.current) setHtmlContent(editorRef.current.innerHTML);
                        }}
                        style={{
                          width: '100%', maxWidth: '750px', minHeight: '800px', background: '#ffffff', color: '#333333',
                          padding: '40px 50px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', borderRadius: '2px',
                          outline: 'none', fontFamily: 'sans-serif'
                        }}
                      />
                    </div>
                  )}
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

              {/* Action Save Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveHtmlTemplate} 
                  disabled={saving}
                  style={{ minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={14} /> {saving ? 'Saving Template...' : 'Save Design Template'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
