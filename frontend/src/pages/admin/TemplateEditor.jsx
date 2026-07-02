import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
import { Upload, Download, FileText, Settings, Eye, Code, Save, Trash2, RefreshCw, ArrowUp, ArrowDown, LayoutGrid, Image, Border, CheckCircle } from 'lucide-react';

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

const DEFAULT_BLOCKS = {
  QUOTATION: [
    { id: '1', type: 'header', companyName: '1-to-1 World', docTitle: 'Quotation', colorTheme: '#10b981' },
    { 
      id: '2', 
      type: 'grid', 
      col1: '<strong>Client & Customer Details</strong><br>{{CLIENT_COMPANY}}<br>Attn: {{CLIENT_CONTACT_PERSON}}<br>Email: {{CLIENT_EMAIL}}<br>Phone: {{CLIENT_PHONE}}',
      col2: '<strong>Document Vitals</strong><br>Quote Number: {{DOCUMENT_NUMBER}}<br>Date: {{DATE}}<br>Project Name: {{PROJECT_NAME}}<br>Status: {{ORDER_STATUS}}'
    },
    { id: '3', type: 'text', content: '<h3 style="color: #111827; margin-bottom: 5px;">Itemized Pricing</h3>', fontSize: '12pt', color: '#111827' },
    {
      id: '4',
      type: 'table',
      fontSize: '9.5pt',
      headerBg: '#111827',
      outerBorderWidth: 1,
      outerBorderColor: '#cbd5e1',
      outerBorderStyle: 'solid',
      showHorizontalLines: true,
      showVerticalLines: false,
      innerBorderWidth: 1,
      innerBorderColor: '#e5e7eb',
      innerBorderStyle: 'solid',
      columns: [
        { title: '#', value: '{{item.index}}', width: '8%' },
        { title: 'Code', value: '{{item.code}}', width: '22%' },
        { title: 'Description', value: '{{item.description}}', width: '48%' },
        { title: 'Qty', value: '{{item.qty}}', width: '8%' },
        { title: 'Total', value: '{{item.totalRetail}}', width: '14%' }
      ]
    },
    {
      id: '5',
      type: 'summary',
      subtotal: '{{SUBTOTAL}}',
      vat: '{{VAT_AMOUNT}}',
      grandTotal: '{{TOTAL_RETAIL}}',
      colorTheme: '#10b981'
    },
    {
      id: '6',
      type: 'footer',
      content: '<strong>Terms & Conditions:</strong><br>1. Prices exclude delivery and installation unless specified.<br>2. A 50% deposit is required to order goods; the balance is due before delivery.<br>3. Lead times are approximate and start from receipt of deposit.',
      bg: '#f3f4f6',
      borderColor: '#10b981'
    }
  ]
};

// Compiles a list of JSON Blocks into styled, production-ready HTML print layout
function compileBlocksToHtml(blocks) {
  let styleBlock = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
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
  .block-container {
    margin-bottom: 20px;
    width: 100%;
    clear: both;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
  }
  .logo-cell {
    font-size: 24pt;
    font-weight: 800;
    color: #111827;
    letter-spacing: -1px;
  }
  .doc-title-cell {
    text-align: right;
    font-size: 16pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .grid-table {
    width: 100%;
    border-collapse: collapse;
  }
  .grid-table td {
    width: 50%;
    vertical-align: top;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed; /* Enforces absolute column widths */
  }
  .data-table th {
    color: #ffffff;
    font-weight: 700;
    text-transform: uppercase;
    padding: 10px;
    text-align: left;
  }
  .data-table td {
    padding: 10px;
    word-wrap: break-word;
    word-break: break-word; /* Prevents overflow & overlaps */
    overflow-wrap: break-word;
    vertical-align: top;
  }
  .summary-table {
    width: 45%;
    margin-left: 55%;
    border-collapse: collapse;
  }
  .summary-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
  }
  .summary-total {
    font-weight: 700;
    font-size: 12pt;
  }
  .footer-box {
    padding: 15px;
    border-radius: 6px;
    font-size: 9.5pt;
    color: #4b5563;
  }
</style>
  `;

  let bodyContent = "";

  blocks.forEach(block => {
    if (block.type === 'header') {
      const themeColor = block.colorTheme || '#10b981';
      bodyContent += `
<div class="block-container">
  <table class="header-table">
    <tr>
      <td class="logo-cell">${block.companyName}<span style="color: ${themeColor};">.</span></td>
      <td class="doc-title-cell" style="color: ${themeColor};">${block.docTitle}</td>
    </tr>
  </table>
</div>
      `;
    } else if (block.type === 'grid') {
      bodyContent += `
<div class="block-container">
  <table class="grid-table">
    <tr>
      <td>${block.col1}</td>
      <td style="border-left: 10px solid white;">${block.col2}</td>
    </tr>
  </table>
</div>
      `;
    } else if (block.type === 'text') {
      bodyContent += `
<div class="block-container">
  ${block.content}
</div>
      `;
    } else if (block.type === 'image') {
      const align = block.align || 'center';
      const width = block.width || '150px';
      bodyContent += `
<div class="block-container" style="text-align: ${align};">
  <img src="${block.src}" style="width: ${width}; max-width: 100%; height: auto;" />
</div>
      `;
    } else if (block.type === 'table') {
      const headerBg = block.headerBg || '#111827';
      const colGroup = block.columns.map(col => `<col style="width: ${col.width || 'auto'};" />`).join('');
      const headers = block.columns.map(col => `<th>${col.title}</th>`).join('');
      const cells = block.columns.map(col => `<td>${col.value}</td>`).join('');
      
      const tableId = `table-${block.id}`;
      
      // Outer border styling
      const oWidth = block.outerBorderWidth !== undefined ? block.outerBorderWidth : 1;
      const oStyle = block.outerBorderStyle || 'solid';
      const oColor = block.outerBorderColor || '#cbd5e1';
      const outerBorderCss = oWidth > 0 ? `border: ${oWidth}px ${oStyle} ${oColor};` : 'border: none;';
      
      // Inner borders styling
      const iWidth = block.innerBorderWidth !== undefined ? block.innerBorderWidth : 1;
      const iStyle = block.innerBorderStyle || 'solid';
      const iColor = block.innerBorderColor || '#e5e7eb';
      
      const showH = block.showHorizontalLines !== undefined ? block.showHorizontalLines : true;
      const showV = block.showVerticalLines !== undefined ? block.showVerticalLines : false;
      
      const borderBottomCss = showH ? `border-bottom: ${iWidth}px ${iStyle} ${iColor};` : 'border-bottom: none;';
      const borderRightCss = showV ? `border-right: ${iWidth}px ${iStyle} ${iColor};` : 'border-right: none;';
      
      styleBlock += `
        #${tableId} {
          ${outerBorderCss}
        }
        #${tableId} th {
          ${borderRightCss}
          border-bottom: ${iWidth}px ${iStyle} ${iColor};
        }
        #${tableId} td {
          ${borderBottomCss}
          ${borderRightCss}
        }
        #${tableId} tr:last-child td {
          ${showH && oWidth > 0 ? 'border-bottom: none;' : ''}
        }
        #${tableId} td:last-child, #${tableId} th:last-child {
          border-right: none;
        }
      `;
      
      bodyContent += `
<div class="block-container">
  <table id="${tableId}" class="data-table" style="font-size: ${block.fontSize || '9.5pt'};">
    ${colGroup}
    <thead>
      <tr style="background: ${headerBg};">
        ${headers}
      </tr>
    </thead>
    <tbody>
      <tr>
        ${cells}
      </tr>
    </tbody>
  </table>
</div>
      `;
    } else if (block.type === 'summary') {
      const themeColor = block.colorTheme || '#10b981';
      bodyContent += `
<div class="block-container">
  <table class="summary-table">
    <tr>
      <td>Subtotal:</td>
      <td style="text-align: right;">${block.subtotal}</td>
    </tr>
    <tr>
      <td>VAT (15%):</td>
      <td style="text-align: right;">${block.vat}</td>
    </tr>
    <tr class="summary-total" style="border-bottom: 2px double ${themeColor} !important;">
      <td style="color: ${themeColor};"><strong>Grand Total:</strong></td>
      <td style="text-align: right; color: ${themeColor};"><strong>${block.grandTotal}</strong></td>
    </tr>
  </table>
</div>
      `;
    } else if (block.type === 'footer') {
      const bg = block.bg || '#f3f4f6';
      const border = block.borderColor ? `border-left: 4px solid ${block.borderColor};` : '';
      bodyContent += `
<div class="block-container">
  <div class="footer-box" style="background: ${bg}; ${border}">
    ${block.content}
  </div>
</div>
      `;
    }
  });

  return `<!DOCTYPE html><html><head>${styleBlock}</head><body>${bodyContent}</body></html>`;
}

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
  
  // Tab/Editor State
  const [activeTab, setActiveTab] = useState('word'); // 'word' or 'visual'
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  
  const activeDoc = DOCUMENT_TYPES[selectedDoc];

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const fetchConfigAndMetadata = async (docType) => {
    setLoading(true);
    try {
      const resConf = await fetch(`${API_BASE}/admin/configs/${docType}`);
      if (resConf.ok) {
        const dataConf = await resConf.json();
        setConfig(dataConf.config_json || {});
        setBlocks(dataConf.config_json?.layout_blocks || []);
      }
      
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
    setSelectedBlockId(null);
  }, [selectedDoc]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          layout_blocks: blocks
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Word template settings saved successfully!' });
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVisualTemplate = async () => {
    setSaving(true);
    setMessage(null);
    const compiledHtml = compileBlocksToHtml(blocks);

    try {
      const resHtml = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: compiledHtml })
      });
      
      const resConfig = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          layout_blocks: blocks
        })
      });

      if (resHtml.ok && resConfig.ok) {
        setMessage({ type: 'success', text: 'Visual Layout Template compiled and saved live!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to compile and save template.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadStarter = () => {
    const starter = DEFAULT_BLOCKS[selectedDoc] || DEFAULT_BLOCKS.QUOTATION;
    const clonedStarter = JSON.parse(JSON.stringify(starter));
    setBlocks(clonedStarter);
    setSelectedBlockId(clonedStarter[0]?.id || null);
    setMessage({ type: 'success', text: 'Loaded visual starter blocks! Click Save to apply.' });
  };

  const handleClearVisualTemplate = async () => {
    if (!window.confirm("Delete visual HTML layout and revert back to Microsoft Word engine?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: "" })
      });
      if (res.ok) {
        setBlocks([]);
        setSelectedBlockId(null);
        setMessage({ type: 'success', text: 'Visual template cleared. Reverted to Word engine.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revert template engine.' });
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type) => {
    const newId = String(Date.now());
    let newBlock = { id: newId, type };
    
    if (type === 'header') {
      newBlock = { ...newBlock, companyName: '1-to-1 World', docTitle: 'Quotation', colorTheme: '#10b981' };
    } else if (type === 'grid') {
      newBlock = { ...newBlock, col1: 'Click here to edit Client details', col2: 'Click here to edit Document vitals' };
    } else if (type === 'text') {
      newBlock = { ...newBlock, content: 'Type custom layout paragraphs directly on the canvas page.' };
    } else if (type === 'image') {
      newBlock = { ...newBlock, src: 'https://placehold.co/150x50/e2e8f0/64748b?text=Upload+Logo', width: '150px', align: 'center' };
    } else if (type === 'table') {
      newBlock = {
        ...newBlock,
        fontSize: '9.5pt',
        headerBg: '#111827',
        outerBorderWidth: 1,
        outerBorderColor: '#cbd5e1',
        outerBorderStyle: 'solid',
        showHorizontalLines: true,
        showVerticalLines: false,
        innerBorderWidth: 1,
        innerBorderColor: '#e5e7eb',
        innerBorderStyle: 'solid',
        columns: [
          { title: '#', value: '{{item.index}}', width: '10%' },
          { title: 'Description', value: '{{item.description}}', width: '70%' },
          { title: 'Qty', value: '{{item.qty}}', width: '20%' }
        ]
      };
    } else if (type === 'summary') {
      newBlock = { ...newBlock, subtotal: '{{SUBTOTAL}}', vat: '{{VAT_AMOUNT}}', grandTotal: '{{TOTAL_RETAIL}}', colorTheme: '#10b981' };
    } else if (type === 'footer') {
      newBlock = { ...newBlock, content: 'Enter terms, notes, and footer items here.', bg: '#f3f4f6', borderColor: '#10b981' };
    }

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newId);
  };

  const moveBlock = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setBlocks(newBlocks);
  };

  const deleteBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateBlockVal = (id, key, val) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [key]: val } : b));
  };

  const insertToken = (token) => {
    if (!selectedBlockId) return;
    const block = blocks.find(b => b.id === selectedBlockId);
    if (!block) return;
    
    const tokenStr = `{{${token}}}`;
    
    // Auto-inserts token into focus window or clipboard
    setMessage({ type: 'success', text: `Copy-paste token: ${tokenStr}` });
    navigator.clipboard.writeText(tokenStr);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImageLocalSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateBlockVal(selectedBlockId, 'src', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const runCommand = (command, value = null) => {
    document.execCommand(command, false, value);
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
        setMessage({ type: 'success', text: 'Word template file uploaded successfully!' });
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
      setMessage({ type: 'error', text: err.message || 'Error downloading template.' });
    }
  };

  const updateConfigVal = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  if (!isAdmin) return null;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1500px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back to Dashboard</button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚙ Document Layout Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Configure default Microsoft Word file setups or design professional, block-based PDF layouts visually.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Column: Doc Type Selector */}
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

        {/* Main Work Area */}
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Tab Selector */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '15px' }}>
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
              <Settings size={15} /> Microsoft Word Config
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
              <LayoutGrid size={15} /> Visual Drag-and-Drop Studio
            </button>
          </div>

          {loading ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading templates...</div>
          ) : activeTab === 'word' ? (
            
            /* TAB 1: WORD CONFIG */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      {metadata?.exists ? 'Template File Active' : 'No Word Template Uploaded'}
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
                    <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Word Template'}
                    <input type="file" accept=".docx" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                </div>
              </div>

              {config && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>File Naming Convention</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={config.naming_convention || ''} 
                      onChange={e => updateConfigVal('naming_convention', e.target.value)} 
                      placeholder="e.g. {{PROJECT_NAME}}_Fee_Proposal"
                      style={{ width: '100%', height: '36px', fontSize: '13px' }}
                    />
                  </div>
                </div>
              )}

              {/* Word Tokens Grid */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-info)' }}>🔖 Template Token Directory</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => (
                    <div key={category}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>{category}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {list.map(token => (
                          <code 
                            key={token} 
                            style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-info)', cursor: 'pointer' }}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving} style={{ minWidth: '160px' }}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

            </div>
          ) : (
            
            /* TAB 2: VISUAL TEMPLATE STUDIO (DRAG & DROP BLOCK BUILDER) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Visual Layout Builder</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    {blocks.length > 0 ? '🟢 Visual Template layout is ACTIVE (bypassing Word template).' : '⚪ Reverted to Word document rendering. Click "Load Starter" below to start designing.'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleLoadStarter} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Load Starter Template
                  </button>
                  {blocks.length > 0 && (
                    <button onClick={handleClearVisualTemplate} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--text-danger)', cursor: 'pointer' }}>
                      <Trash2 size={12} /> Clear Visual Designer
                    </button>
                  )}
                </div>
              </div>

              {/* DESIGNER SPLIT GRID LAYOUT */}
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', minHeight: '620px', alignItems: 'stretch' }}>
                
                {/* LEFT CONTROL SIDEBAR (Selected Block Details / Token List) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  
                  {/* Block Adder Menu */}
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>Add Layout Block</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      <button onClick={() => addBlock('header')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>Header</button>
                      <button onClick={() => addBlock('grid')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>2-Col Grid</button>
                      <button onClick={() => addBlock('text')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>Text</button>
                      <button onClick={() => addBlock('image')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>Image</button>
                      <button onClick={() => addBlock('table')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>Table</button>
                      <button onClick={() => addBlock('summary')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}>Summary</button>
                      <button onClick={() => addBlock('footer')} className="btn btn-sm" style={{ fontSize: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }} style={{ gridColumn: 'span 3' }}>+ Add Footer / Terms</button>
                    </div>
                  </div>

                  {/* Settings Panel for SELECTED Block */}
                  {selectedBlock ? (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-info)' }}>Edit {selectedBlock.type} settings</span>
                        <button onClick={() => deleteBlock(selectedBlockId)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-danger)', padding: '2px 6px', height: 'auto' }}>Delete</button>
                      </div>

                      {/* Render block-specific input controls */}
                      {selectedBlock.type === 'header' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Brand Name</label>
                            <input type="text" className="form-control" style={{ height: '30px', fontSize: '12px' }} value={selectedBlock.companyName || ''} onChange={e => updateBlockVal(selectedBlockId, 'companyName', e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Document Title</label>
                            <input type="text" className="form-control" style={{ height: '30px', fontSize: '12px' }} value={selectedBlock.docTitle || ''} onChange={e => updateBlockVal(selectedBlockId, 'docTitle', e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color Accent</label>
                            <input type="color" style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.colorTheme || '#10b981'} onChange={e => updateBlockVal(selectedBlockId, 'colorTheme', e.target.value)} />
                          </div>
                        </>
                      )}

                      {selectedBlock.type === 'image' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Upload Image Logo</label>
                            <input type="file" accept="image/*" onChange={handleImageLocalSelect} style={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Width (e.g. 150px)</label>
                              <input type="text" className="form-control" style={{ height: '30px', fontSize: '12px' }} value={selectedBlock.width || '150px'} onChange={e => updateBlockVal(selectedBlockId, 'width', e.target.value)} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Alignment</label>
                              <select className="form-control" style={{ height: '30px', fontSize: '12px' }} value={selectedBlock.align || 'center'} onChange={e => updateBlockVal(selectedBlockId, 'align', e.target.value)}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedBlock.type === 'table' && (
                        <>
                          {/* Advanced Gridlines & Border Settings */}
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Outer Border</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '6px', alignItems: 'center' }}>
                              <input type="color" style={{ width: '100%', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.outerBorderColor || '#cbd5e1'} onChange={e => updateBlockVal(selectedBlockId, 'outerBorderColor', e.target.value)} />
                              <select className="form-control" style={{ height: '26px', fontSize: '11px', padding: '0 4px' }} value={selectedBlock.outerBorderWidth !== undefined ? selectedBlock.outerBorderWidth : 1} onChange={e => updateBlockVal(selectedBlockId, 'outerBorderWidth', Number(e.target.value))}>
                                <option value={0}>None</option>
                                <option value={1}>1px</option>
                                <option value={2}>2px</option>
                                <option value={3}>3px</option>
                              </select>
                              <select className="form-control" style={{ height: '26px', fontSize: '11px', padding: '0 4px' }} value={selectedBlock.outerBorderStyle || 'solid'} onChange={e => updateBlockVal(selectedBlockId, 'outerBorderStyle', e.target.value)}>
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="double">Double</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Inside Gridlines</div>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedBlock.showHorizontalLines !== undefined ? selectedBlock.showHorizontalLines : true} onChange={e => updateBlockVal(selectedBlockId, 'showHorizontalLines', e.target.checked)} /> Horizontal Lines
                              </label>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedBlock.showVerticalLines !== undefined ? selectedBlock.showVerticalLines : false} onChange={e => updateBlockVal(selectedBlockId, 'showVerticalLines', e.target.checked)} /> Vertical Lines
                              </label>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '6px', alignItems: 'center' }}>
                              <input type="color" style={{ width: '100%', height: '24px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.innerBorderColor || '#e5e7eb'} onChange={e => updateBlockVal(selectedBlockId, 'innerBorderColor', e.target.value)} />
                              <select className="form-control" style={{ height: '26px', fontSize: '11px', padding: '0 4px' }} value={selectedBlock.innerBorderWidth !== undefined ? selectedBlock.innerBorderWidth : 1} onChange={e => updateBlockVal(selectedBlockId, 'innerBorderWidth', Number(e.target.value))}>
                                <option value={1}>1px</option>
                                <option value={2}>2px</option>
                                <option value={3}>3px</option>
                              </select>
                              <select className="form-control" style={{ height: '26px', fontSize: '11px', padding: '0 4px' }} value={selectedBlock.innerBorderStyle || 'solid'} onChange={e => updateBlockVal(selectedBlockId, 'innerBorderStyle', e.target.value)}>
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Header Bg Color</label>
                              <input type="color" style={{ width: '100%', height: '26px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.headerBg || '#111827'} onChange={e => updateBlockVal(selectedBlockId, 'headerBg', e.target.value)} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Table Font Size</label>
                              <select className="form-control" style={{ height: '28px', fontSize: '11px' }} value={selectedBlock.fontSize || '9.5pt'} onChange={e => updateBlockVal(selectedBlockId, 'fontSize', e.target.value)}>
                                <option value="8pt">8pt</option>
                                <option value="9.5pt">9.5pt</option>
                                <option value="11pt">11pt</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Configure Columns</label>
                              <button 
                                onClick={() => {
                                  const newCols = [...(selectedBlock.columns || []), { title: 'New', value: '{{item.code}}', width: '20%' }];
                                  updateBlockVal(selectedBlockId, 'columns', newCols);
                                }}
                                className="btn btn-ghost" 
                                style={{ padding: '2px 6px', height: 'auto', fontSize: '10px', color: 'var(--text-info)' }}
                              >
                                + Add Column
                              </button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                              {(selectedBlock.columns || []).map((col, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'var(--bg-primary)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                  <input 
                                    type="text" 
                                    placeholder="Title" 
                                    style={{ width: '25%', height: '24px', fontSize: '11px', padding: '2px' }} 
                                    value={col.title} 
                                    onChange={e => {
                                      const newCols = [...selectedBlock.columns];
                                      newCols[idx].title = e.target.value;
                                      updateBlockVal(selectedBlockId, 'columns', newCols);
                                    }}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Token Value" 
                                    style={{ width: '45%', height: '24px', fontSize: '11px', padding: '2px' }} 
                                    value={col.value} 
                                    onChange={e => {
                                      const newCols = [...selectedBlock.columns];
                                      newCols[idx].value = e.target.value;
                                      updateBlockVal(selectedBlockId, 'columns', newCols);
                                    }}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Width %" 
                                    style={{ width: '18%', height: '24px', fontSize: '11px', padding: '2px' }} 
                                    value={col.width} 
                                    onChange={e => {
                                      const newCols = [...selectedBlock.columns];
                                      newCols[idx].width = e.target.value;
                                      updateBlockVal(selectedBlockId, 'columns', newCols);
                                    }}
                                  />
                                  <button 
                                    onClick={() => {
                                      const newCols = selectedBlock.columns.filter((_, cidx) => cidx !== idx);
                                      updateBlockVal(selectedBlockId, 'columns', newCols);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '2px' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {selectedBlock.type === 'summary' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Accent Color Theme</label>
                            <input type="color" style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.colorTheme || '#10b981'} onChange={e => updateBlockVal(selectedBlockId, 'colorTheme', e.target.value)} />
                          </div>
                        </>
                      )}

                      {selectedBlock.type === 'footer' && (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bg Color</label>
                              <input type="color" style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.bg || '#f3f4f6'} onChange={e => updateBlockVal(selectedBlockId, 'bg', e.target.value)} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Border Color Accent</label>
                              <input type="color" style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.borderColor || '#10b981'} onChange={e => updateBlockVal(selectedBlockId, 'borderColor', e.target.value)} />
                            </div>
                          </div>
                        </>
                      )}

                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        💡 Select text inside a block to color or format specific words separately!
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '12px' }}>
                      Click on a block inside the canvas to edit its design settings here.
                    </div>
                  )}

                  {/* Available Token Click to Copy Panel */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available Template Tokens</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                      {activeDoc.tokens && Object.entries(activeDoc.tokens).flatMap(([_, list]) => list).map(token => (
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
                          title="Click to copy token"
                        >
                          {`+ {{${token}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* CENTER: INTERACTIVE BLOCK CANVAS WORKSPACE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '620px' }}>
                  
                  {/* Visual Formatting Toolbar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', alignItems: 'center' }}>
                    <button onClick={() => runCommand('bold')} className="btn btn-sm btn-ghost" style={{ fontWeight: 'bold', minWidth: '30px', padding: '2px' }}>B</button>
                    <button onClick={() => runCommand('italic')} className="btn btn-sm btn-ghost" style={{ fontStyle: 'italic', minWidth: '30px', padding: '2px' }}>I</button>
                    <button onClick={() => runCommand('underline')} className="btn btn-sm btn-ghost" style={{ textDecoration: 'underline', minWidth: '30px', padding: '2px' }}>U</button>
                    
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
                    
                    <button onClick={() => runCommand('justifyLeft')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Left</button>
                    <button onClick={() => runCommand('justifyCenter')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Center</button>
                    <button onClick={() => runCommand('justifyRight')} className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>Right</button>

                    <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

                    <select 
                      onChange={(e) => runCommand('fontSize', e.target.value)} 
                      className="form-control"
                      style={{ height: '24px', fontSize: '11px', padding: '0 4px', width: '90px' }}
                    >
                      <option value="3">Size Normal</option>
                      <option value="1">Small</option>
                      <option value="4">Large</option>
                      <option value="5">Huge</option>
                      <option value="6">Heading</option>
                    </select>

                    <select 
                      onChange={(e) => runCommand('fontName', e.target.value)} 
                      className="form-control"
                      style={{ height: '24px', fontSize: '11px', padding: '0 4px', width: '100px' }}
                    >
                      <option value="sans-serif">Clean Sans</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Inter">Inter</option>
                      <option value="Georgia">Georgia</option>
                      <option value="monospace">Monospace</option>
                    </select>
                    
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
                    
                    <input 
                      type="color" 
                      onChange={(e) => runCommand('foreColor', e.target.value)}
                      style={{ width: '22px', height: '22px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }}
                      title="Selection Text Color"
                    />
                  </div>

                  {/* Canvas Outer scrolling container */}
                  <div style={{ background: '#334155', border: '1px solid var(--border)', borderRadius: '8px', padding: '30px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* A4 sheet preview */}
                    <div style={{ width: '100%', maxWidth: '750px', minHeight: '850px', background: '#ffffff', color: '#333333', padding: '40px 45px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', borderRadius: '2px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {blocks.length === 0 ? (
                        <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', gap: '12px' }}>
                          <LayoutGrid size={40} />
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>Visual Designer Canvas Empty</div>
                          <button onClick={handleLoadStarter} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12.5px' }}>Load Starter Template</button>
                        </div>
                      ) : (
                        blocks.map((block, idx) => {
                          const isSelected = block.id === selectedBlockId;
                          
                          return (
                            <div 
                              key={block.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBlockId(block.id);
                              }}
                              style={{
                                position: 'relative',
                                border: isSelected ? '2px solid #3b82f6' : '1px dashed #e2e8f0',
                                borderRadius: '4px',
                                padding: '14px 10px',
                                cursor: 'pointer',
                                background: isSelected ? '#f8fafc' : 'transparent',
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              {/* Element Control Handles Overlay (Visible on Hover/Select) */}
                              {isSelected && (
                                <div style={{ position: 'absolute', right: '4px', top: '-12px', display: 'flex', gap: '2px', background: '#3b82f6', padding: '2px', borderRadius: '4px', zIndex: 10 }}>
                                  <button disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }} style={{ background: 'none', border: 'none', color: 'white', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '2px' }} title="Move Up"><ArrowUp size={12} /></button>
                                  <button disabled={idx === blocks.length - 1} onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }} style={{ background: 'none', border: 'none', color: 'white', cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer', padding: '2px' }} title="Move Down"><ArrowDown size={12} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px', marginLeft: '4px' }} title="Delete Block"><Trash2 size={12} /></button>
                                </div>
                              )}

                              {/* BLOCK PREVIEWS */}
                              {block.type === 'header' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>{block.companyName}<span style={{ color: block.colorTheme || '#10b981' }}>.</span></span>
                                  <span style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', color: block.colorTheme || '#10b981' }}>{block.docTitle}</span>
                                </div>
                              )}

                              {block.type === 'grid' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '11px' }}>
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={(e) => updateBlockVal(block.id, 'col1', e.currentTarget.innerHTML)}
                                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', outline: 'none' }} 
                                    dangerouslySetInnerHTML={{ __html: block.col1 }} 
                                  />
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={(e) => updateBlockVal(block.id, 'col2', e.currentTarget.innerHTML)}
                                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', outline: 'none' }} 
                                    dangerouslySetInnerHTML={{ __html: block.col2 }} 
                                  />
                                </div>
                              )}

                              {block.type === 'text' && (
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  onInput={(e) => updateBlockVal(block.id, 'content', e.currentTarget.innerHTML)}
                                  style={{
                                    outline: 'none',
                                    minHeight: '20px'
                                  }} 
                                  dangerouslySetInnerHTML={{ __html: block.content }}
                                />
                              )}

                              {block.type === 'image' && (
                                <div style={{ display: 'flex', justifyContent: block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center' }}>
                                  <img src={block.src} style={{ width: block.width || '150px', height: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }} alt="Visual Logo Block" />
                                </div>
                              )}

                              {block.type === 'table' && (
                                <table style={{ 
                                  width: '100%', 
                                  borderCollapse: 'collapse', 
                                  fontSize: block.fontSize || '9pt', 
                                  tableLayout: 'fixed', 
                                  border: (block.outerBorderWidth || 0) > 0 ? `${block.outerBorderWidth}px ${block.outerBorderStyle || 'solid'} ${block.outerBorderColor || '#cbd5e1'}` : 'none'
                                }}>
                                  <thead>
                                    <tr style={{ background: block.headerBg || '#111827', color: 'white' }}>
                                      {(block.columns || []).map((col, cidx) => (
                                        <th 
                                          key={cidx} 
                                          style={{ 
                                            padding: '8px', 
                                            textAlign: 'left', 
                                            fontSize: '10px', 
                                            textTransform: 'uppercase', 
                                            width: col.width,
                                            borderRight: (block.showVerticalLines) ? `${block.innerBorderWidth || 1}px ${block.innerBorderStyle || 'solid'} ${block.innerBorderColor || '#e5e7eb'}` : 'none',
                                            borderBottom: `${block.innerBorderWidth || 1}px ${block.innerBorderStyle || 'solid'} ${block.innerBorderColor || '#e5e7eb'}`
                                          }}
                                        >
                                          {col.title}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr style={{ background: '#ffffff', color: '#4b5563' }}>
                                      {(block.columns || []).map((col, cidx) => (
                                        <td 
                                          key={cidx} 
                                          style={{ 
                                            padding: '8px', 
                                            wordBreak: 'break-all', 
                                            overflowWrap: 'break-word',
                                            borderRight: (block.showVerticalLines && cidx !== block.columns.length - 1) ? `${block.innerBorderWidth || 1}px ${block.innerBorderStyle || 'solid'} ${block.innerBorderColor || '#e5e7eb'}` : 'none',
                                            borderBottom: (block.showHorizontalLines) ? `${block.innerBorderWidth || 1}px ${block.innerBorderStyle || 'solid'} ${block.innerBorderColor || '#e5e7eb'}` : 'none'
                                          }}
                                        >
                                          {col.value}
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              )}

                              {block.type === 'summary' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px' }}>
                                  <table style={{ width: '45%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                      <tr>
                                        <td style={{ padding: '6px' }}>Subtotal:</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>{block.subtotal}</td>
                                      </tr>
                                      <tr>
                                        <td style={{ padding: '6px' }}>VAT (15%):</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>{block.vat}</td>
                                      </tr>
                                      <tr style={{ fontWeight: 'bold', borderTop: `2px double ${block.colorTheme || '#10b981'}` }}>
                                        <td style={{ padding: '8px 6px', color: block.colorTheme || '#10b981' }}>Grand Total:</td>
                                        <td style={{ padding: '8px 6px', textAlign: 'right', color: block.colorTheme || '#10b981' }}>{block.grandTotal}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {block.type === 'footer' && (
                                <div 
                                  contentEditable
                                  suppressContentEditableWarning
                                  onInput={(e) => updateBlockVal(block.id, 'content', e.currentTarget.innerHTML)}
                                  style={{ 
                                    background: block.bg || '#f3f4f6', 
                                    borderLeft: `4px solid ${block.borderColor || '#10b981'}`, 
                                    padding: '10px', 
                                    borderRadius: '4px', 
                                    fontSize: '10px', 
                                    color: '#4b5563',
                                    outline: 'none'
                                  }} 
                                  dangerouslySetInnerHTML={{ __html: block.content }} 
                                />
                              )}

                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>

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
                  onClick={handleSaveVisualTemplate} 
                  disabled={saving || blocks.length === 0}
                  style={{ minWidth: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={14} /> {saving ? 'Compiling Layout...' : 'Save & Publish Live'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
