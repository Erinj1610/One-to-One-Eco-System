import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
import { auth } from '../../firebase';
import { 
  Upload, Download, FileText, Settings, Eye, Code, Save, Trash2, RefreshCw, 
  ArrowUp, ArrowDown, LayoutGrid, Image as ImageIcon, CheckCircle, Plus, 
  Copy, Layers, Type, Table, AlignLeft, AlignCenter, AlignRight, FilePlus, 
  Move, Bold, Italic, Underline, Palette, Sliders, Hash, RotateCcw, RotateCw, Sparkles
} from 'lucide-react';

const SHARED_ORDER_TOKENS = {
  "Project Info": ["PROJECT_NAME", "CLIENT_NAME", "DATE", "DOCUMENT_NUMBER", "ORDER_STATUS"],
  "Client Info": ["CLIENT_COMPANY", "CLIENT_CONTACT_PERSON", "CLIENT_EMAIL", "CLIENT_PHONE", "CLIENT_VAT", "DELIVERY_ADDRESS"],
  "Staff & Project Vitals": ["ONEONE_REP", "PM_NAME", "PM_EMAIL", "PM_PHONE", "PM_PPHONE", "PROJECT_PM", "PROJECT_SIZE", "PROJECT_TIER"],
  "Financials": ["SUBTOTAL", "DISCOUNT_AMOUNT", "VAT_AMOUNT", "TOTAL_RETAIL", "TOTAL_COST", "MARGIN_PERCENT", "DEPOSIT", "BALANCE", "TOTAL_PAID", "BALANCE_OUTSTANDING"],
  "Table Items (Row Loops)": ["item.index", "item.code", "item.oneOneCode", "item.type", "item.description", "item.qty", "item.brand", "item.retail", "item.totalRetail", "item.floor", "item.area", "item.dimming", "item.unitCost", "item.stockStatus", "item.eta"],
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
  },
  SCHEDULE: {
    id: 'SCHEDULE',
    name: '📋 Lighting Schedule',
    description: 'Word (.docx) or Visual HTML template containing product specifications and technical execution details.',
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
        { title: '#', value: '{{item.index}}', width: '8%', align: 'left' },
        { title: 'Code', value: '{{item.code}}', width: '22%', align: 'left' },
        { title: 'Description', value: '{{item.description}}', width: '48%', align: 'left' },
        { title: 'Qty', value: '{{item.qty}}', width: '8%', align: 'center' },
        { title: 'Total', value: '{{item.totalRetail}}', width: '14%', align: 'right' }
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

function compileBlocksToHtml(blocks, settings = {}) {
  const fontFam = settings.fontFamily || "'Outfit', 'Inter', sans-serif";
  const marginV = settings.marginSize || '20mm';
  const marginH = settings.marginSide || '15mm';

  let styleBlock = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&display=swap');
  @page {
    size: A4;
    margin: ${marginV} ${marginH} ${marginV} ${marginH};
  }
  body {
    font-family: ${fontFam};
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
    vertical-align: top;
    padding: 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .data-table th {
    color: #ffffff;
    font-weight: 700;
    text-transform: uppercase;
    padding: 10px;
  }
  .data-table td {
    padding: 10px;
    word-wrap: break-word;
    word-break: break-word;
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
      const col1Ratio = block.ratio === '60/40' ? '60%' : block.ratio === '70/30' ? '70%' : '50%';
      const col2Ratio = block.ratio === '60/40' ? '40%' : block.ratio === '70/30' ? '30%' : '50%';
      
      bodyContent += `
<div class="block-container">
  <table class="grid-table">
    <tr>
      <td style="width: ${col1Ratio};">${block.col1}</td>
      <td style="border-left: 10px solid white; width: ${col2Ratio};">${block.col2}</td>
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
    } else if (block.type === 'spacer') {
      bodyContent += `<div style="height: ${block.height || '20px'}; clear: both; width: 100%;"></div>`;
    } else if (block.type === 'pagebreak') {
      bodyContent += `<div style="page-break-after: always; height: 1px; margin: 0; padding: 0; clear: both; width: 100%;"></div>`;
    } else if (block.type === 'table') {
      const headerBg = block.headerBg || '#111827';
      const colGroup = block.columns.map(col => `<col style="width: ${col.width || 'auto'};" />`).join('');
      
      const headers = block.columns.map(col => `
        <th style="text-align: ${col.align || 'left'};">${col.title}</th>
      `).join('');
      
      const cells = block.columns.map(col => `
        <td style="text-align: ${col.align || 'left'};">${col.value}</td>
      `).join('');
      
      const tableId = `table-${block.id}`;
      
      const oWidth = block.outerBorderWidth !== undefined ? block.outerBorderWidth : 1;
      const oStyle = block.outerBorderStyle || 'solid';
      const oColor = block.outerBorderColor || '#cbd5e1';
      const outerBorderCss = oWidth > 0 ? `border: ${oWidth}px ${oStyle} ${oColor};` : 'border: none;';
      
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
  const [selectedDoc, setSelectedDoc] = useState('QUOTATION');
  const [config, setConfig] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Tab states
  const [activeTab, setActiveTab] = useState('word'); 
  const [sidebarTab, setSidebarTab] = useState('elements');
  
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  
  // Undo/Redo states
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Notion-style inline token dropdown overlay
  const [suggestMenu, setSuggestMenu] = useState({ visible: false, x: 0, y: 0, query: '', targetBlockId: null, targetKey: 'content' });
  const suggestMenuRef = useRef(null);

  // Global A4 variables
  const [globalSettings, setGlobalSettings] = useState({
    fontFamily: "'Outfit', 'Inter', sans-serif",
    marginSize: '20mm',
    marginSide: '15mm'
  });

  // HTML5 Drag tracking refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const activeDoc = DOCUMENT_TYPES[selectedDoc];

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const updateBlocksState = (newBlocks, pushHistory = true) => {
    setBlocks(newBlocks);
    if (pushHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newBlocks)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setBlocks(JSON.parse(JSON.stringify(history[prevIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setBlocks(JSON.parse(JSON.stringify(history[nextIndex])));
    }
  };

  // Bind Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  const fetchConfigAndMetadata = async (docType) => {
    setLoading(true);
    try {
      let headers = {};
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const resConf = await fetch(`${API_BASE}/admin/configs/${docType}`, {
        headers: headers
      });
      let configObj = {};
      if (resConf.ok) {
        const dataConf = await resConf.json();
        configObj = dataConf.config_json || {};
        const layout = dataConf.config_json?.layout_blocks || [];
        setBlocks(layout);
        setHistory([JSON.parse(JSON.stringify(layout))]);
        setHistoryIndex(0);
        if (dataConf.config_json?.global_settings) {
          setGlobalSettings(dataConf.config_json.global_settings);
        }
      }
      setConfig(configObj);
      
      const resMeta = await fetch(`${API_BASE}/admin/templates/${docType}/metadata`, {
        headers: headers
      });
      if (resMeta.ok) {
        const dataMeta = await resMeta.json();
        setMetadata(dataMeta);
      } else {
        setMetadata({ exists: false });
      }
    } catch (err) {
      console.error(err);
      setConfig({});
      setMetadata({ exists: false });
      setMessage({ type: 'error', text: 'Error loading template settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndMetadata(selectedDoc);
    setMessage(null);
    setSelectedBlockId(null);
  }, [selectedDoc]);

  const handleSaveWordConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/configs/${selectedDoc}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          layout_blocks: blocks,
          global_settings: globalSettings,
          engine_mode: config.engine_mode || 'word'
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Template settings updated successfully!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadXlsxTemplate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      let headers = {};
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/xlsx/upload`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Spreadsheet template file uploaded!' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.detail || 'Error uploading spreadsheet template.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error uploading template file.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadXlsxTemplate = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      let headers = {};
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/xlsx/download`, {
        headers: headers
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDoc.toLowerCase()}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error downloading Excel template.' });
    }
  };


  const handleSaveVisualTemplate = async () => {
    setSaving(true);
    setMessage(null);
    const compiledHtml = compileBlocksToHtml(blocks, globalSettings);

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
          layout_blocks: blocks,
          global_settings: globalSettings
        })
      });

      if (resHtml.ok && resConfig.ok) {
        setMessage({ type: 'success', text: 'Visual builder template published live!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to compile and publish template.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadStarter = () => {
    const starter = DEFAULT_BLOCKS[selectedDoc] || DEFAULT_BLOCKS.QUOTATION;
    const clonedStarter = JSON.parse(JSON.stringify(starter));
    updateBlocksState(clonedStarter);
    setSelectedBlockId(clonedStarter[0]?.id || null);
    setMessage({ type: 'success', text: 'Loaded starter template!' });
  };

  const handleClearVisualTemplate = async () => {
    if (!window.confirm("Bypass visual template and revert back to Microsoft Word engine?")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: "" })
      });
      if (res.ok) {
        updateBlocksState([]);
        setSelectedBlockId(null);
        setMessage({ type: 'success', text: 'Reverted template engine to MS Word.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear layout.' });
    } finally {
      setSaving(false);
    }
  };

  const addBlockAtIndex = (type, index = null) => {
    const newId = String(Date.now());
    let newBlock = { id: newId, type };
    
    if (type === 'header') {
      newBlock = { ...newBlock, companyName: '1-to-1 World', docTitle: 'Quotation', colorTheme: '#10b981' };
    } else if (type === 'grid') {
      newBlock = { ...newBlock, ratio: '50/50', col1: 'Click here to edit Client details', col2: 'Click here to edit Document vitals' };
    } else if (type === 'text') {
      newBlock = { ...newBlock, content: 'Type custom document text content directly inside the canvas page.' };
    } else if (type === 'image') {
      newBlock = { ...newBlock, src: 'https://placehold.co/200x60/e2e8f0/64748b?text=Upload+Logo', width: '150px', align: 'center' };
    } else if (type === 'spacer') {
      newBlock = { ...newBlock, height: '20px' };
    } else if (type === 'pagebreak') {
      newBlock = { ...newBlock };
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
          { title: '#', value: '{{item.index}}', width: '10%', align: 'left' },
          { title: 'Description', value: '{{item.description}}', width: '70%', align: 'left' },
          { title: 'Qty', value: '{{item.qty}}', width: '20%', align: 'center' }
        ]
      };
    } else if (type === 'summary') {
      newBlock = { ...newBlock, subtotal: '{{SUBTOTAL}}', vat: '{{VAT_AMOUNT}}', grandTotal: '{{TOTAL_RETAIL}}', colorTheme: '#10b981' };
    } else if (type === 'footer') {
      newBlock = { ...newBlock, content: 'Enter terms, notes, and footer items here.', bg: '#f3f4f6', borderColor: '#10b981' };
    }

    const copy = [...blocks];
    if (index !== null) {
      copy.splice(index, 0, newBlock);
    } else {
      copy.push(newBlock);
    }
    updateBlocksState(copy);
    setSelectedBlockId(newId);
  };

  // Direct canvas element drag operations
  const handleDragStart = (e, index) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...blocks];
    const itemToMove = copy[dragItem.current];
    copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, itemToMove);
    dragItem.current = null;
    dragOverItem.current = null;
    updateBlocksState(copy);
  };

  const duplicateBlock = (block, idx) => {
    const newId = String(Date.now() + Math.random());
    const cloned = JSON.parse(JSON.stringify(block));
    cloned.id = newId;
    
    const copy = [...blocks];
    copy.splice(idx + 1, 0, cloned);
    updateBlocksState(copy);
    setSelectedBlockId(newId);
  };

  const deleteBlock = (id) => {
    const copy = blocks.filter(b => b.id !== id);
    updateBlocksState(copy);
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const updateBlockVal = (id, key, val, pushHistory = true) => {
    const copy = blocks.map(b => b.id === id ? { ...b, [key]: val } : b);
    updateBlocksState(copy, pushHistory);
  };

  // Cursor-Based direct token insertion
  const insertToken = (token) => {
    const tokenStr = `{{${token}}}`;
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Verify selection cursor is inside our contentEditable canvas
      let container = range.commonAncestorContainer;
      while (container) {
        if (container.nodeType === 1 && container.hasAttribute('contenteditable')) {
          range.deleteContents();
          const node = document.createTextNode(tokenStr);
          range.insertNode(node);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Trigger updates on active block content
          const blockId = container.getAttribute('data-block-id');
          const key = container.getAttribute('data-block-key') || 'content';
          if (blockId) {
            updateBlockVal(blockId, key, container.innerHTML);
          }
          return;
        }
        container = container.parentNode;
      }
    }

    // Fallback: Copy to clipboard if cursor is not active
    navigator.clipboard.writeText(tokenStr);
    setMessage({ type: 'success', text: `Clipboard copy: ${tokenStr}. Click inside text box to insert directly!` });
    setTimeout(() => setMessage(null), 3000);
  };

  // Notion style autocomplete '@' listener
  const handleContentInput = (e, blockId, key) => {
    const text = e.currentTarget.innerText || '';
    const html = e.currentTarget.innerHTML || '';
    
    updateBlockVal(blockId, key, html, false); // Update state silently without pushing to history for every letter typed

    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const cursorOffset = range.startOffset;
    
    // Check if user just typed '@' or '@search_query'
    const textBeforeCursor = range.startContainer.textContent?.slice(0, cursorOffset) || '';
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex >= textBeforeCursor.length - 15) {
      const query = textBeforeCursor.slice(atIndex + 1);
      const rect = range.getBoundingClientRect();
      
      setSuggestMenu({
        visible: true,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 5,
        query,
        targetBlockId: blockId,
        targetKey: key
      });
    } else {
      setSuggestMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleSelectAutocompleteToken = (token) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    
    // Find text node and replace '@query' with token
    const textNode = range.startContainer;
    const cursorOffset = range.startOffset;
    const textContent = textNode.textContent || '';
    const atIndex = textContent.lastIndexOf('@', cursorOffset);
    
    if (atIndex !== -1) {
      const beforeAt = textContent.slice(0, atIndex);
      const afterCursor = textContent.slice(cursorOffset);
      textNode.textContent = beforeAt + `{{${token}}}` + afterCursor;
      
      // Restore range after token
      range.setStart(textNode, atIndex + `{{${token}}}`.length);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Update React State
      let parent = textNode.parentNode;
      while (parent && !parent.hasAttribute('contenteditable')) {
        parent = parent.parentNode;
      }
      if (parent) {
        updateBlockVal(suggestMenu.targetBlockId, suggestMenu.targetKey, parent.innerHTML);
      }
    }
    
    setSuggestMenu(prev => ({ ...prev, visible: false }));
  };

  const handleBlockChangeDone = (e, blockId, key) => {
    // Push final typed block contents to history when they focus away
    updateBlockVal(blockId, key, e.currentTarget.innerHTML, true);
  };

  const handleImageLocalSelectDone = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateBlockVal(selectedBlockId, 'src', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      let headers = {};
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/upload`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'MS Word template file uploaded!' });
        const resMeta = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/metadata`, {
          headers: headers
        });
        if (resMeta.ok) {
          const dataMeta = await resMeta.json();
          setMetadata(dataMeta);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: errorData.detail || 'Error uploading Word template.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error uploading template file.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      let headers = {};
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/download`, {
        headers: headers
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDoc.toLowerCase()}_template.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error downloading template.' });
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Close autocomplete menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (suggestMenuRef.current && !suggestMenuRef.current.contains(e.target)) {
        setSuggestMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter autocomplete tokens
  const allTokensList = activeDoc ? Object.values(activeDoc.tokens).flat() : [];
  const filteredTokens = suggestMenu.visible 
    ? allTokensList.filter(t => t.toLowerCase().includes(suggestMenu.query.toLowerCase()))
    : [];

  if (!isAdmin) return null;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      
      {/* Autocomplete Suggested Tokens Menu (Floating Portal) */}
      {suggestMenu.visible && filteredTokens.length > 0 && (
        <div 
          ref={suggestMenuRef}
          style={{
            position: 'absolute', left: `${suggestMenu.x}px', top: '${suggestMenu.y}px`,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '6px', boxShadow: '0 8px 16px -2px rgba(0,0,0,0.5)',
            maxHeight: '180px', overflowY: 'auto', zIndex: 1000,
            padding: '4px', minWidth: '160px'
          }}
        >
          <div style={{ padding: '4px 8px', fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Suggestions</div>
          {filteredTokens.map(t => (
            <button
              key={t}
              onClick={() => handleSelectAutocompleteToken(t)}
              className="btn btn-ghost"
              style={{
                width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: '11px',
                borderRadius: '4px', display: 'block', height: 'auto', justifyContent: 'flex-start'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Header Studio Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>← Back to Dashboard</button>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎨 Layout Studio <span style={{ fontSize: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: '4px' }}>V2 Editor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Design visual template sheets with inline drag-reordering, Notion-style cursor variables, and custom column selectors.
          </p>
        </div>

        {/* Global actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {activeTab === 'visual' && (
            <>
              {/* Undo / Redo controls */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)', marginRight: '10px' }}>
                <button disabled={historyIndex === 0} onClick={handleUndo} className="btn btn-sm btn-ghost" style={{ padding: '4px 8px', minWidth: '32px' }} title="Undo (Ctrl+Z)"><RotateCcw size={14} /></button>
                <button disabled={historyIndex === history.length - 1} onClick={handleRedo} className="btn btn-sm btn-ghost" style={{ padding: '4px 8px', minWidth: '32px' }} title="Redo (Ctrl+Y)"><RotateCw size={14} /></button>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleSaveVisualTemplate} 
                disabled={saving || blocks.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}
              >
                <Save size={15} /> {saving ? 'Publishing...' : 'Save & Publish Live'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Document Left Selector */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Templates</div>
          {Object.values(DOCUMENT_TYPES).map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className="btn btn-ghost"
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: '6px',
                width: '100%', justifyContent: 'flex-start', fontSize: '12.5px',
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

        {/* Builder Workbench Frame */}
        <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-card)' }}>
          
          {/* Main Top Header Instruction */}
          <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} /> {(config?.engine_mode || 'word') === 'excel' ? 'Microsoft Excel (.xlsx) Engine Settings' : 'Microsoft Word (.docx) Engine Settings'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Configure variables, upload new template files, and establish naming conventions.
            </p>
          </div>

          {loading ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading template details...</div>
          ) : (
            
            /* WORD ENGINE CONFIG */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {config && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Select Active Template Engine Mode</label>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Choose which template engine will compile output PDFs for this module. You can switch between Microsoft Word (.docx) templates and Microsoft Excel (.xlsx) templates instantly.</p>
                  <select 
                    className="form-control"
                    style={{ height: '36px', fontSize: '13px', maxWidth: '300px', marginTop: '4px' }}
                    value={config.engine_mode || 'word'}
                    onChange={e => setConfig({ ...config, engine_mode: e.target.value })}
                  >
                    <option value="word">Microsoft Word (.docx) Template Engine</option>
                    <option value="excel">Microsoft Excel (.xlsx) Template Engine</option>
                  </select>
                </div>
              )}

              {/* Conditional Card depending on engine_mode choice */}
              {(config?.engine_mode || 'word') === 'word' ? (
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
                        {metadata?.exists ? 'MS Word Template File Active' : 'No Word File Uploaded'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {metadata?.exists 
                          ? `${(metadata.size / 1024).toFixed(1)} KB — Last Modified: ${metadata.last_modified ? new Date(metadata.last_modified * 1000).toLocaleString() : 'Just Now'}`
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
                      <Download size={13} /> Download File
                    </button>

                    <label className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                      <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Word Template'}
                      <input type="file" accept=".docx" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '50%', 
                      background: 'rgba(31, 154, 85, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#1f9a55'
                    }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        Spreadsheet Template Hub (.xlsx)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Upload custom spreadsheet templates with placeholders.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      onClick={handleDownloadXlsxTemplate}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <Download size={13} /> Download File
                    </button>

                    <label className="btn btn-success" style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0, background: 'linear-gradient(135deg, #1f9a55 0%, #156b3b 100%)', border: 'none', color: '#fff' }}>
                      <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Excel Template'}
                      <input type="file" accept=".xlsx" onChange={handleUploadXlsxTemplate} style={{ display: 'none' }} disabled={uploading} />
                    </label>
                  </div>
                </div>
              )}


              {config && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>File Naming Convention</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={config.naming_convention || ''} 
                    onChange={e => setConfig({ ...config, naming_convention: e.target.value })} 
                    placeholder="e.g. {{PROJECT_NAME}}_Fee_Proposal"
                    style={{ width: '100%', height: '36px', fontSize: '13px' }}
                  />
                </div>
              )}

              {/* Tokens list */}
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-info)' }}>🔖 Template Token Directory</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => {
                    const safeList = Array.isArray(list) ? list : [];
                    return (
                      <div key={category}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>{category}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {safeList.map(token => (
                            <code 
                              key={token} 
                              style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-info)', cursor: 'pointer' }}
                              onClick={() => {
                                navigator.clipboard.writeText(`{{${token}}}`);
                                setMessage({ type: 'success', text: `Copied {{${token}}}` });
                                setTimeout(() => setMessage(null), 2000);
                              }}
                            >
                              {`{{${token}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleSaveWordConfig} disabled={saving}>
                  Save Settings
                </button>
              </div>

              {message && (
                <div style={{ 
                  padding: '10px 14px', borderRadius: '6px', 
                  background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: message.type === 'success' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  color: message.type === 'success' ? 'var(--text-success)' : 'var(--text-danger)',
                  fontSize: '12.5px', textAlign: 'center'
                }}>
                  {message.text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
