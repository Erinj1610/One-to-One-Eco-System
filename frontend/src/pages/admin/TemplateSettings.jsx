import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Folder, Plus, Trash2, Edit3, Check, RefreshCw, 
  Layers, Sparkles, Save, X, Tag, FileText, ChevronRight, Compass, ShoppingBag, PlusCircle, CheckCircle2,
  FileSpreadsheet, ExternalLink, Code2, Copy, Move, ArrowLeft
} from 'lucide-react';

const SHARED_ORDER_TOKENS = {
  "Project Info": ["PROJECT_NAME", "ORDER_NAME", "QUOTE_NAME", "ORDER_NUMBER", "DOCUMENT_NUMBER", "CLIENT_NAME", "DATE", "ORDER_STATUS"],
  "Client Info": ["CLIENT_COMPANY", "CLIENT_CONTACT_PERSON", "CLIENT_EMAIL", "CLIENT_PHONE", "CLIENT_VAT", "DELIVERY_ADDRESS"],
  "Staff & Project Vitals": ["ONEONE_REP", "PM_NAME", "PM_EMAIL", "PM_PHONE", "PM_PPHONE", "PROJECT_PM", "PROJECT_SIZE", "PROJECT_TIER"],
  "Financials": ["SUBTOTAL", "DISCOUNT_AMOUNT", "VAT_PERCENT", "VAT_RATE", "VAT_AMOUNT", "VAT_VALUE", "TOTAL_RETAIL", "TOTAL_COST", "MARGIN_PERCENT", "DEPOSIT", "DEPOSIT_PERCENT", "BALANCE", "TOTAL_PAID", "BALANCE_OUTSTANDING"],
  "Table Items (Row Loops)": ["item.index", "item.code", "item.oneOneCode", "item.type", "item.description", "item.qty", "item.brand", "item.retail", "item.totalRetail", "item.floor", "item.area", "item.dimming", "item.unitcost", "item.stockstatus", "item.eta"],
  "Payments (Row Loops)": ["payment.index", "payment.date", "payment.reference", "payment.amount"]
};

const DEFAULT_DOC_TYPES = {
  DESIGN_FEE_PROPOSAL: {
    id: 'DESIGN_FEE_PROPOSAL',
    name: 'Design Fee Proposal',
    tokens: {
      "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "PROPOSAL_NUMBER"],
      "Areas & Meterage": ["LIVING_AREA", "LANDSCAPE_AREA", "EXP_LIVING_SQM", "SEC_LIVING_SQM", "NON_EXP_LIVING_SQM"],
      "Phase Fees": ["CONCEPT_COST", "SCHEMATIC_COST", "FINAL_COST", "DEPOSIT_REQUIRED"],
      "Extras & Totals": ["ARCH_COST", "SITE_SUPPORT_COST", "COMMISSIONING_COST", "DISCOUNT_AMOUNT", "SUBTOTAL", "VAT_AMOUNT", "TOTAL_FEE"]
    }
  },
  QUOTATION: {
    id: 'QUOTATION',
    name: 'Summarized Quotation',
    tokens: SHARED_ORDER_TOKENS
  },
  BOQ: {
    id: 'BOQ',
    name: 'Bill of Quantity (BOQ)',
    tokens: SHARED_ORDER_TOKENS
  },
  SUMMARY: {
    id: 'SUMMARY',
    name: 'Summary',
    tokens: SHARED_ORDER_TOKENS
  },
  SCHEDULE: {
    id: 'SCHEDULE',
    name: 'Lighting Schedule',
    tokens: SHARED_ORDER_TOKENS
  },
  PROFORMA: {
    id: 'PROFORMA',
    name: 'Pro-Forma Invoice',
    tokens: SHARED_ORDER_TOKENS
  },
  BALANCE_INVOICE: {
    id: 'BALANCE_INVOICE',
    name: 'Balance Invoice',
    tokens: SHARED_ORDER_TOKENS
  },
  TAX_INVOICE: {
    id: 'TAX_INVOICE',
    name: 'Tax Invoice (Full)',
    tokens: SHARED_ORDER_TOKENS
  },
  PROGRESS_STATEMENT: {
    id: 'PROGRESS_STATEMENT',
    name: 'Progress Statement',
    tokens: SHARED_ORDER_TOKENS
  },
  PACKING_LIST: {
    id: 'PACKING_LIST',
    name: 'Packing List',
    tokens: SHARED_ORDER_TOKENS
  },
  DELIVERY_NOTE: {
    id: 'DELIVERY_NOTE',
    name: 'Delivery Note',
    tokens: SHARED_ORDER_TOKENS
  }
};

export default function TemplateSettings({ onBack }) {
  const [docTypesList, setDocTypesList] = useState(DEFAULT_DOC_TYPES);
  const [selectedDoc, setSelectedDoc] = useState('QUOTATION');
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gsheetUrl, setGsheetUrl] = useState('');
  const [savingGsheet, setSavingGsheet] = useState(false);
  const [newCustomDocName, setNewCustomDocName] = useState('');
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // Fetch Master Order / Doc Types
  useEffect(() => {
    fetch(`${API_BASE}/admin/configs/MASTER_TEMPLATE_ORDER`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.config_json && data.config_json.templates) {
          setDocTypesList(data.config_json.templates);
        }
      })
      .catch(err => console.error("Error loading master template order:", err));
  }, []);

  // Fetch Master Sheet URL
  useEffect(() => {
    fetch(`${API_BASE}/admin/templates/master_google_sheet/url`)
      .then(res => res.json())
      .then(data => { if (data && data.url) setGsheetUrl(data.url); })
      .catch(err => console.error("Error fetching Master Google Sheet URL:", err));
  }, []);

  // Fetch Doc Config on selection change
  useEffect(() => {
    if (!selectedDoc) return;
    setLoading(true);
    fetch(`${API_BASE}/admin/configs/${selectedDoc}`)
      .then(res => res.ok ? res.json() : {})
      .then(data => {
        setConfig(data.config_json || {});
      })
      .catch(err => {
        console.error("Config fetch error:", err);
        setConfig({});
      })
      .finally(() => setLoading(false));
  }, [selectedDoc]);

  const handleSaveDocTabConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          engine_mode: 'excel',
          excel_tab_name: config.excel_tab_name || selectedDoc,
          naming_convention: config.naming_convention || ''
        })
      });
      if (res.ok) {
        if (window.otoToast) {
          window.otoToast(`Saved tab mapping for ${docTypesList[selectedDoc]?.name || selectedDoc}!`, 'success');
        } else {
          alert('Template settings saved successfully!');
        }
      } else {
        throw new Error('Failed to save settings.');
      }
    } catch (e) {
      if (window.otoToast) {
        window.otoToast(e.message, 'error');
      } else {
        alert(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGsheetUrl = async () => {
    setSavingGsheet(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/master_google_sheet/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gsheetUrl })
      });
      if (res.ok) {
        if (window.otoToast) {
          window.otoToast('Master Google Sheet URL saved to database!', 'success');
        } else {
          alert('Master Google Sheet URL saved to database!');
        }
      } else {
        throw new Error('Failed to save Google Sheet URL.');
      }
    } catch (e) {
      if (window.otoToast) {
        window.otoToast(e.message, 'error');
      } else {
        alert(e.message);
      }
    } finally {
      setSavingGsheet(false);
    }
  };

  const saveCustomDocsToDatabase = async (updatedList) => {
    try {
      await fetch(`${API_BASE}/admin/configs/MASTER_TEMPLATE_ORDER`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templates: updatedList,
          order_keys: Object.keys(updatedList)
        })
      });
    } catch (e) {
      console.error("Error saving master template order to DB:", e);
    }
  };

  const copyToken = (token) => {
    const text = `{{${token}}}`;
    navigator.clipboard.writeText(text);
    if (window.otoToast) {
      window.otoToast(`Copied ${text} to clipboard!`, 'info');
    }
  };

  const activeDoc = docTypesList[selectedDoc] || { 
    id: selectedDoc, 
    name: selectedDoc, 
    tokens: SHARED_ORDER_TOKENS 
  };

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
              Workflow & Operations
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
            Document Templates & Google Sheet Engine
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Connect your live Master Google Sheet workbook. Map document types dynamically to worksheet tabs.
          </p>
        </div>

        {gsheetUrl && (
          <a
            href={gsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <FileSpreadsheet size={14} color="#059669" /> Open Live Master Sheet <ExternalLink size={12} color="#64748b" />
          </a>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Document Types
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {Object.keys(docTypesList).length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Configured in system
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Selected Template
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeDoc.name}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Tab: <code>{config?.excel_tab_name || selectedDoc}</code>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Master Google Sheet
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: gsheetUrl ? '#16a34a' : '#ea580c', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: gsheetUrl ? '#16a34a' : '#ea580c' }} />
            {gsheetUrl ? 'Connected & Live' : 'Not Connected'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Auto-compiles PDF & Excel
          </div>
        </div>
      </div>

      {/* Master Google Sheet Workbook URL Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={15} color="#059669" /> Master Google Sheets Workbook URL
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            The central Google Sheets spreadsheet where quotations, BOQs, schedules, and invoices pull cell templates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="url"
            value={gsheetUrl}
            onChange={(e) => setGsheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
            style={{
              flex: 1,
              minWidth: '280px',
              height: '36px',
              padding: '4px 12px',
              fontSize: '12.5px',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleSaveGsheetUrl}
            disabled={savingGsheet}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: savingGsheet ? 'not-allowed' : 'pointer'
            }}
          >
            <Check size={14} /> {savingGsheet ? 'Saving...' : 'Save Workbook URL'}
          </button>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '290px minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Document Types List */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Document Templates</span>
            <span style={{ fontSize: '10.5px', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              {Object.keys(docTypesList).length} types
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {Object.values(docTypesList).map((doc) => {
              const isSelected = selectedDoc === doc.id;
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '2px 6px',
                    borderRadius: '7px',
                    background: isSelected ? '#f1f5f9' : 'transparent',
                    border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc.id)}
                    style={{
                      textAlign: 'left',
                      padding: '6px 4px',
                      flex: 1,
                      fontSize: '12.5px',
                      border: 'none',
                      background: 'transparent',
                      color: isSelected ? '#0f172a' : '#475569',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {doc.name}
                  </button>

                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.otoConfirm) {
                        const confirmed = await window.otoConfirm(
                          `Delete '${doc.name}' template? This will remove it from the document generator.`,
                          { title: 'Delete Document Template', isDanger: true }
                        );
                        if (!confirmed) return;
                      } else {
                        const input = prompt(`Delete '${doc.name}'? Type DELETE to confirm:`);
                        if (!input || input.trim().toUpperCase() !== 'DELETE') return;
                      }

                      const newList = { ...docTypesList };
                      delete newList[doc.id];
                      setDocTypesList(newList);
                      if (selectedDoc === doc.id) {
                        setSelectedDoc(Object.keys(newList)[0] || 'QUOTATION');
                      }
                      await saveCustomDocsToDatabase(newList);
                    }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                    title="Delete template"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAddDocModal(true)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 500,
              background: '#ffffff',
              color: '#334155',
              border: '1px dashed #cbd5e1',
              borderRadius: '7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={13} /> Add Custom Document Type
          </button>
        </div>

        {/* Right Column: Tab Mapping, Naming Convention & Tokens Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Tab Name & Naming Pattern */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>
                Document Settings: {activeDoc.name}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Enter the exact sheet tab name inside your Master Google Sheet for this document and define dynamic file naming.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', maxWidth: '520px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Google Sheet Tab Name
                </label>
                <input
                  type="text"
                  value={config?.excel_tab_name || selectedDoc}
                  onChange={e => setConfig({ ...config, excel_tab_name: e.target.value })}
                  placeholder={`e.g. ${selectedDoc}`}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '4px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Exact case-sensitive tab name in your Master Google Sheet workbook.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  File Naming Convention
                </label>
                <input
                  type="text"
                  value={config?.naming_convention || ''}
                  onChange={e => setConfig({ ...config, naming_convention: e.target.value })}
                  placeholder="e.g. {{PROJECT_NAME}}_Quotation_{{DATE}}"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '4px 12px',
                    fontSize: '13px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Dynamic tokens like <code>&#123;&#123;PROJECT_NAME&#125;&#125;</code> and <code>&#123;&#123;DATE&#125;&#125;</code> will be injected automatically.
                </span>
              </div>

              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleSaveDocTabConfig}
                  disabled={saving}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 18px', 
                    fontSize: '12.5px', 
                    fontWeight: 600,
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Settings Live'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Template Token Directory (Clean Architectural Grid) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '13.5px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={15} color="#64748b" /> Template Token Directory
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Click any variable token to copy it directly into your Google Sheet template formula.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {activeDoc?.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => {
                const safeList = Array.isArray(list) ? list : [];
                return (
                  <div key={category} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                      {category.replace(/_/g, ' ')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {safeList.map(token => (
                        <code
                          key={token}
                          onClick={() => copyToken(token)}
                          style={{
                            padding: '3px 7px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            color: '#334155',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.color = '#0f172a'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                          title="Click to copy token"
                        >
                          <Copy size={9} color="#94a3b8" /> {`{{${token}}}`}
                        </code>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Document Type */}
      {showAddDocModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowAddDocModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ width: '420px', maxWidth: '95vw', background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add Custom Document Type</h3>
              <button 
                type="button" 
                onClick={() => setShowAddDocModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Document Title
              </label>
              <input 
                type="text" 
                placeholder="e.g. Commissioning Certificate"
                value={newCustomDocName}
                onChange={e => setNewCustomDocName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => setShowAddDocModal(false)}
                style={{ padding: '8px 14px', fontSize: '12px', background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={async () => {
                  if (!newCustomDocName.trim()) return;
                  const newId = `CUSTOM_${newCustomDocName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
                  const newDoc = {
                    id: newId,
                    name: newCustomDocName.trim(),
                    excel_tab_name: newCustomDocName.trim(),
                    naming_convention: `{{PROJECT_NAME}}_${newCustomDocName.trim().replace(/\s+/g, '_')}_{{DATE}}`,
                    tokens: SHARED_ORDER_TOKENS
                  };
                  const updated = { ...docTypesList, [newId]: newDoc };
                  setDocTypesList(updated);
                  setSelectedDoc(newId);
                  setNewCustomDocName('');
                  setShowAddDocModal(false);
                  await saveCustomDocsToDatabase(updated);
                  if (window.otoToast) {
                    window.otoToast(`Document type '${newDoc.name}' created!`, 'success');
                  }
                }}
                style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: 600, background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Create Document Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
