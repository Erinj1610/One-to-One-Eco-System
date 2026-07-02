import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../api_config';
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
  const [activeTab, setActiveTab] = useState('visual'); 
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
      const resConf = await fetch(`${API_BASE}/admin/configs/${docType}`);
      if (resConf.ok) {
        const dataConf = await resConf.json();
        setConfig(dataConf.config_json || {});
        const layout = dataConf.config_json?.layout_blocks || [];
        setBlocks(layout);
        setHistory([JSON.parse(JSON.stringify(layout))]);
        setHistoryIndex(0);
        if (dataConf.config_json?.global_settings) {
          setGlobalSettings(dataConf.config_json.global_settings);
        }
      }
      
      const resMeta = await fetch(`${API_BASE}/admin/templates/${docType}/metadata`);
      if (resMeta.ok) {
        const dataMeta = await resMeta.json();
        setMetadata(dataMeta);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error loading template.' });
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
          global_settings: globalSettings
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'MS Word configuration updated!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
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
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'MS Word template file uploaded!' });
        const resMeta = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/metadata`);
        if (resMeta.ok) {
          const dataMeta = await resMeta.json();
          setMetadata(dataMeta);
        }
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
      const res = await fetch(`${API_BASE}/admin/templates/${selectedDoc}/download`);
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
          
          {/* Main Top Tab Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '15px' }}>
            <button 
              onClick={() => setActiveTab('visual')}
              style={{
                background: 'none', border: 'none', 
                borderBottom: activeTab === 'visual' ? '3px solid var(--text-info)' : '3px solid transparent',
                color: activeTab === 'visual' ? 'var(--text-info)' : 'var(--text-secondary)',
                padding: '12px 18px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Sparkles size={15} /> Visual Drag-and-Drop Editor
            </button>
            <button 
              onClick={() => setActiveTab('word')}
              style={{
                background: 'none', border: 'none', 
                borderBottom: activeTab === 'word' ? '3px solid var(--text-info)' : '3px solid transparent',
                color: activeTab === 'word' ? 'var(--text-info)' : 'var(--text-secondary)',
                padding: '12px 18px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Settings size={15} /> MS Word Config Fallback
            </button>
          </div>

          {loading ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Loading template details...</div>
          ) : activeTab === 'word' ? (
            
            /* WORD ENGINE CONFIG */
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
                      {metadata?.exists ? 'MS Word Template File Active' : 'No Word File Uploaded'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {metadata?.exists 
                        ? `${(metadata.size / 1024).toFixed(1)} KB — Last Modified: ${new Date(metadata.last_modified * 1000).toLocaleString()}`
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
                  {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([category, list]) => (
                    <div key={category}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>{category}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {list.map(token => (
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
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button className="btn btn-primary" onClick={handleSaveWordConfig} disabled={saving}>
                  Save Settings
                </button>
              </div>

            </div>
          ) : (
            
            /* VISUAL DESIGNER BENCH */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Visual Layout Builder</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {blocks.length > 0 ? '🟢 Visual Template layout is active.' : '⚪ Word layout active. Load a starter layout below.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleLoadStarter} className="btn btn-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Load Starter Template
                  </button>
                  {blocks.length > 0 && (
                    <button onClick={handleClearVisualTemplate} className="btn btn-sm btn-ghost" style={{ color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <Trash2 size={12} /> Revert to Word
                    </button>
                  )}
                </div>
              </div>

              {/* THREE-COLUMN WORK BENCH */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '20px', minHeight: '750px', alignItems: 'stretch' }}>
                
                {/* 1. LEFT PANEL (Add Elements, Outline, Token directory, Settings) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px' }}>
                    <button onClick={() => setSidebarTab('elements')} title="Add Elements" style={{ padding: '8px 2px', background: sidebarTab === 'elements' ? 'var(--bg-card)' : 'transparent', border: 'none', borderRadius: '4px', color: sidebarTab === 'elements' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <FilePlus size={14} />
                      <span style={{ fontSize: '9px' }}>Elements</span>
                    </button>
                    <button onClick={() => setSidebarTab('outline')} title="Document Outline" style={{ padding: '8px 2px', background: sidebarTab === 'outline' ? 'var(--bg-card)' : 'transparent', border: 'none', borderRadius: '4px', color: sidebarTab === 'outline' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <Layers size={14} />
                      <span style={{ fontSize: '9px' }}>Outline</span>
                    </button>
                    <button onClick={() => setSidebarTab('tokens')} title="Variable Tokens" style={{ padding: '8px 2px', background: sidebarTab === 'tokens' ? 'var(--bg-card)' : 'transparent', border: 'none', borderRadius: '4px', color: sidebarTab === 'tokens' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <Hash size={14} />
                      <span style={{ fontSize: '9px' }}>Tokens</span>
                    </button>
                    <button onClick={() => setSidebarTab('settings')} title="Global Settings" style={{ padding: '8px 2px', background: sidebarTab === 'settings' ? 'var(--bg-card)' : 'transparent', border: 'none', borderRadius: '4px', color: sidebarTab === 'settings' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <Palette size={14} />
                      <span style={{ fontSize: '9px' }}>Page</span>
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    
                    {/* TAB: ELEMENTS */}
                    {sidebarTab === 'elements' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Add Blocks to Layout</div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button onClick={() => addBlockAtIndex('header')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <FileText size={16} style={{ color: 'var(--text-info)' }} />
                            <span>Logo Header</span>
                          </button>
                          
                          <button onClick={() => addBlockAtIndex('grid')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <LayoutGrid size={16} style={{ color: 'var(--text-success)' }} />
                            <span>2-Col Grid</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('text')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <Type size={16} style={{ color: 'var(--text-warning)' }} />
                            <span>Paragraph Text</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('image')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <ImageIcon size={16} style={{ color: 'var(--text-danger)' }} />
                            <span>Image Block</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('table')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <Table size={16} style={{ color: '#8b5cf6' }} />
                            <span>Dynamic Table</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('summary')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <Hash size={16} style={{ color: '#ec4899' }} />
                            <span>Pricing Summary</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('spacer')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <Sliders size={16} style={{ color: '#f59e0b' }} />
                            <span>Spacer Box</span>
                          </button>

                          <button onClick={() => addBlockAtIndex('pagebreak')} className="btn btn-sm btn-ghost" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', fontSize: '11px', cursor: 'pointer' }}>
                            <ArrowDown size={16} style={{ color: '#10b981' }} />
                            <span>Page Break</span>
                          </button>
                        </div>
                        
                        <button onClick={() => addBlockAtIndex('footer')} className="btn btn-primary btn-sm" style={{ padding: '8px', fontSize: '11px', width: '100%' }}>
                          + Add Terms & Footer Block
                        </button>
                      </div>
                    )}

                    {/* TAB: OUTLINE */}
                    {sidebarTab === 'outline' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Document Outline</div>
                        {blocks.length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No blocks in document yet.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {blocks.map((block, idx) => (
                              <div
                                key={block.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragEnter={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => setSelectedBlockId(block.id)}
                                style={{
                                  display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '8px 10px', background: selectedBlockId === block.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)',
                                  border: selectedBlockId === block.id ? '1px solid var(--text-info)' : '1px solid var(--border)',
                                  borderRadius: '6px', cursor: 'grab', fontSize: '12px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Move size={12} style={{ color: 'var(--text-secondary)' }} />
                                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{block.type}</span>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: 0 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: VARIABLE TOKENS */}
                    {sidebarTab === 'tokens' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Available Dynamic Tokens</div>
                        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>Click any variable below to insert it directly at your blinking cursor on the A4 page.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
                          {activeDoc.tokens && Object.entries(activeDoc.tokens).map(([cat, list]) => (
                            <div key={cat} style={{ background: 'var(--bg-primary)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>{cat}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {list.map(t => (
                                  <button
                                    key={t}
                                    onClick={() => insertToken(t)}
                                    style={{
                                      padding: '3px 6px', background: 'rgba(59, 130, 246, 0.05)',
                                      border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '3px',
                                      fontSize: '10px', color: 'var(--text-info)', cursor: 'pointer'
                                    }}
                                  >
                                    {`+ {{${t}}}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB: PAGE SETTINGS */}
                    {sidebarTab === 'settings' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>A4 Page Settings</div>
                        
                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Font Family</label>
                          <select className="form-control" style={{ height: '30px', fontSize: '12px' }} value={globalSettings.fontFamily} onChange={e => setGlobalSettings({ ...globalSettings, fontFamily: e.target.value })}>
                            <option value="'Outfit', 'Inter', sans-serif">Outfit & Inter (Modern)</option>
                            <option value="'Inter', sans-serif">Inter (Clean)</option>
                            <option value="'Playfair Display', serif">Playfair Display (Premium Serif)</option>
                            <option value="'Roboto', sans-serif">Roboto (Corporate)</option>
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Margin Vertical</label>
                            <select className="form-control" style={{ height: '30px', fontSize: '12px' }} value={globalSettings.marginSize} onChange={e => setGlobalSettings({ ...globalSettings, marginSize: e.target.value })}>
                              <option value="10mm">10mm (Narrow)</option>
                              <option value="20mm">20mm (Normal)</option>
                              <option value="30mm">30mm (Wide)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Margin Side</label>
                            <select className="form-control" style={{ height: '30px', fontSize: '12px' }} value={globalSettings.marginSide} onChange={e => setGlobalSettings({ ...globalSettings, marginSide: e.target.value })}>
                              <option value="10mm">10mm</option>
                              <option value="15mm">15mm (Normal)</option>
                              <option value="20mm">20mm</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>

                {/* 2. CENTER: SIMULATED A4 CANVAS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                  
                  {/* Text Formatting Bar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', alignItems: 'center' }}>
                    <button onClick={() => runCommand('bold')} className="btn btn-sm btn-ghost" style={{ fontWeight: 'bold', padding: '2px 6px', fontSize: '12px' }}><Bold size={13} /></button>
                    <button onClick={() => runCommand('italic')} className="btn btn-sm btn-ghost" style={{ fontStyle: 'italic', padding: '2px 6px', fontSize: '12px' }}><Italic size={13} /></button>
                    <button onClick={() => runCommand('underline')} className="btn btn-sm btn-ghost" style={{ textDecoration: 'underline', padding: '2px 6px', fontSize: '12px' }}><Underline size={13} /></button>
                    
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
                    
                    <button onClick={() => runCommand('justifyLeft')} className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', fontSize: '11px' }}><AlignLeft size={13} /></button>
                    <button onClick={() => runCommand('justifyCenter')} className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', fontSize: '11px' }}><AlignCenter size={13} /></button>
                    <button onClick={() => runCommand('justifyRight')} className="btn btn-sm btn-ghost" style={{ padding: '2px 6px', fontSize: '11px' }}><AlignRight size={13} /></button>

                    <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

                    <select onChange={(e) => runCommand('fontSize', e.target.value)} className="form-control" style={{ height: '24px', fontSize: '11px', padding: '0 4px', width: '90px' }}>
                      <option value="3">Size Regular</option>
                      <option value="1">Small</option>
                      <option value="4">Large</option>
                      <option value="5">Extra Large</option>
                      <option value="6">Heading</option>
                    </select>

                    <input 
                      type="color" 
                      onChange={(e) => runCommand('foreColor', e.target.value)}
                      style={{ width: '22px', height: '22px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }}
                      title="Selection Color"
                    />
                    
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 'auto', fontStyle: 'italic' }}>
                      💡 Type @ inside any box to search and insert values inline!
                    </div>
                  </div>

                  {/* A4 Slate Board */}
                  <div style={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', overflowY: 'auto', flex: 1 }}>
                    
                    <div style={{ 
                      width: '100%', maxWidth: '720px', minHeight: '900px', 
                      background: '#ffffff', color: '#333333', 
                      padding: `${globalSettings.marginSize || '20mm'} ${globalSettings.marginSide || '15mm'}`, 
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)', borderRadius: '2px', 
                      margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px' 
                    }}>
                      
                      {blocks.length === 0 ? (
                        <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '6px', color: '#94a3b8', gap: '12px' }}>
                          <LayoutGrid size={32} />
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>Visual Builder empty</div>
                          <button onClick={handleLoadStarter} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>Load Starter layout</button>
                        </div>
                      ) : (
                        blocks.map((block, idx) => {
                          const isSelected = block.id === selectedBlockId;
                          
                          return (
                            <div 
                              key={block.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, idx)}
                              onDragOver={(e) => handleDragOver(e, idx)}
                              onDragEnd={handleDragEnd}
                              style={{ position: 'relative' }}
                            >
                              
                              {/* Hover & Drop Insert Line (+) */}
                              <div 
                                className="hover-plus-line"
                                style={{
                                  height: '4px', transition: 'all 0.2s', margin: '-6px 0', zIndex: 5, position: 'relative',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                              >
                                <div style={{ width: '100%', height: '1px', background: '#3b82f6' }} />
                                <button
                                  onClick={() => addBlockAtIndex('text', idx)}
                                  style={{
                                    position: 'absolute', background: '#3b82f6', color: 'white', border: 'none',
                                    borderRadius: '50%', width: '18px', height: '18px', display: 'flex',
                                    alignItems: 'center', justifySelf: 'center', justifyContent: 'center', cursor: 'pointer'
                                  }}
                                  title="Insert block here"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>

                              {/* Canvas Block Render Frame */}
                              <div
                                onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                                style={{
                                  position: 'relative',
                                  border: isSelected ? '2px solid #3b82f6' : '1px dashed transparent',
                                  borderRadius: '4px',
                                  padding: '8px',
                                  cursor: 'pointer',
                                  background: isSelected ? '#f8fafc' : 'transparent',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.border = '1px dashed #3b82f6'; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.border = '1px dashed transparent'; }}
                              >
                                {/* Draggable Grab Indicator handle (Left-side bar) */}
                                <div 
                                  style={{ 
                                    position: 'absolute', left: '-18px', top: 'calc(50% - 10px)', 
                                    opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s', 
                                    cursor: 'grab', color: '#94a3b8' 
                                  }}
                                  title="Drag block to reorder on page"
                                >
                                  <Move size={14} />
                                </div>

                                {/* Floating control handles */}
                                {isSelected && (
                                  <div style={{ position: 'absolute', right: '4px', top: '-14px', display: 'flex', gap: '3px', background: '#3b82f6', padding: '2px', borderRadius: '4px', zIndex: 10 }}>
                                    <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block, idx); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }} title="Duplicate"><Copy size={11} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }} title="Delete"><Trash2 size={11} /></button>
                                  </div>
                                )}

                                {/* BLOCK RENDERERS */}
                                {block.type === 'header' && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 800 }}>{block.companyName}<span style={{ color: block.colorTheme || '#10b981' }}>.</span></span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: block.colorTheme || '#10b981' }}>{block.docTitle}</span>
                                  </div>
                                )}

                                {block.type === 'grid' && (
                                  <div style={{ display: 'grid', gridTemplateColumns: block.ratio === '60/40' ? '6fr 4fr' : block.ratio === '70/30' ? '7fr 3fr' : '1fr 1fr', gap: '15px', fontSize: '11px' }}>
                                    <div 
                                      contentEditable
                                      suppressContentEditableWarning
                                      data-block-id={block.id}
                                      data-block-key="col1"
                                      onInput={(e) => handleContentInput(e, block.id, 'col1')}
                                      onBlur={(e) => handleBlockChangeDone(e, block.id, 'col1')}
                                      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', outline: 'none' }} 
                                      dangerouslySetInnerHTML={{ __html: block.col1 }} 
                                    />
                                    <div 
                                      contentEditable
                                      suppressContentEditableWarning
                                      data-block-id={block.id}
                                      data-block-key="col2"
                                      onInput={(e) => handleContentInput(e, block.id, 'col2')}
                                      onBlur={(e) => handleBlockChangeDone(e, block.id, 'col2')}
                                      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', outline: 'none' }} 
                                      dangerouslySetInnerHTML={{ __html: block.col2 }} 
                                    />
                                  </div>
                                )}

                                {block.type === 'text' && (
                                  <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    data-block-id={block.id}
                                    data-block-key="content"
                                    onInput={(e) => handleContentInput(e, block.id, 'content')}
                                    onBlur={(e) => handleBlockChangeDone(e, block.id, 'content')}
                                    style={{ outline: 'none', minHeight: '20px' }} 
                                    dangerouslySetInnerHTML={{ __html: block.content }}
                                  />
                                )}

                                {block.type === 'image' && (
                                  <div style={{ display: 'flex', justifyContent: block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center' }}>
                                    <img src={block.src} style={{ width: block.width || '150px', height: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }} alt="Visual Logo Block" />
                                  </div>
                                )}

                                {block.type === 'spacer' && (
                                  <div style={{ height: block.height || '20px', borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '10px' }}>
                                    Spacer Layout Box ({block.height || '20px'})
                                  </div>
                                )}

                                {block.type === 'pagebreak' && (
                                  <div style={{ borderTop: '2px dashed #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '9px', fontWeight: 600, padding: '4px 0' }}>
                                    --- PRINT PAGE BREAK ---
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
                                              textAlign: col.align || 'left', 
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
                                              textAlign: col.align || 'left',
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
                                    data-block-id={block.id}
                                    data-block-key="content"
                                    onInput={(e) => handleContentInput(e, block.id, 'content')}
                                    onBlur={(e) => handleBlockChangeDone(e, block.id, 'content')}
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

                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>

                </div>

                {/* 3. RIGHT PANEL (Dynamic Block Settings Editor) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>Element Properties</div>
                  
                  {selectedBlock ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-info)', textTransform: 'uppercase' }}>{selectedBlock.type} Settings</span>
                        <button onClick={() => deleteBlock(selectedBlockId)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-danger)', height: 'auto', padding: '2px 6px' }}>Delete</button>
                      </div>

                      {/* Header block settings */}
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

                      {/* 2-Col Grid Split ratios */}
                      {selectedBlock.type === 'grid' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Column Split Ratio</label>
                            <select className="form-control" style={{ height: '30px', fontSize: '12px' }} value={selectedBlock.ratio || '50/50'} onChange={e => updateBlockVal(selectedBlockId, 'ratio', e.target.value)}>
                              <option value="50/50">Equal Split (50/50)</option>
                              <option value="60/40">60% / 40% Width</option>
                              <option value="70/30">70% / 30% Width</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* Spacer height */}
                      {selectedBlock.type === 'spacer' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                              <span>Spacer Height</span>
                              <span>{selectedBlock.height || '20px'}</span>
                            </label>
                            <input 
                              type="range" 
                              min="5" 
                              max="150" 
                              step="5"
                              value={parseInt(selectedBlock.height || '20')} 
                              onChange={e => updateBlockVal(selectedBlockId, 'height', `${e.target.value}px`)}
                              style={{ width: '100%', marginTop: '6px' }}
                            />
                          </div>
                        </>
                      )}

                      {/* Image Logo blocks */}
                      {selectedBlock.type === 'image' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Upload Image Logo</label>
                            <input type="file" accept="image/*" onChange={handleImageLocalSelectDone} style={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
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

                      {/* Table Column Mapping and Styles */}
                      {selectedBlock.type === 'table' && (
                        <>
                          <div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Outer Border</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '4px', alignItems: 'center' }}>
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
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Inside Gridlines</div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedBlock.showHorizontalLines !== undefined ? selectedBlock.showHorizontalLines : true} onChange={e => updateBlockVal(selectedBlockId, 'showHorizontalLines', e.target.checked)} /> Horizontal
                              </label>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedBlock.showVerticalLines !== undefined ? selectedBlock.showVerticalLines : false} onChange={e => updateBlockVal(selectedBlockId, 'showVerticalLines', e.target.checked)} /> Vertical
                              </label>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '4px', alignItems: 'center' }}>
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

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Header Bg</label>
                              <input type="color" style={{ width: '100%', height: '26px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.headerBg || '#111827'} onChange={e => updateBlockVal(selectedBlockId, 'headerBg', e.target.value)} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Font Size</label>
                              <select className="form-control" style={{ height: '28px', fontSize: '11px' }} value={selectedBlock.fontSize || '9.5pt'} onChange={e => updateBlockVal(selectedBlockId, 'fontSize', e.target.value)}>
                                <option value="8pt">8pt</option>
                                <option value="9.5pt">9.5pt</option>
                                <option value="11pt">11pt</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Table Columns</label>
                              <button 
                                onClick={() => {
                                  const newCols = [...(selectedBlock.columns || []), { title: 'Code', value: '{{item.code}}', width: '20%', align: 'left' }];
                                  updateBlockVal(selectedBlockId, 'columns', newCols);
                                }}
                                className="btn btn-ghost" 
                                style={{ padding: '2px 4px', height: 'auto', fontSize: '10px', color: 'var(--text-info)' }}
                              >
                                + Add Column
                              </button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                              {(selectedBlock.columns || []).map((col, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-primary)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                    <input 
                                      type="text" 
                                      placeholder="Title" 
                                      style={{ width: '40%', height: '22px', fontSize: '11px', padding: '2px' }} 
                                      value={col.title} 
                                      onChange={e => {
                                        const newCols = [...selectedBlock.columns];
                                        newCols[idx].title = e.target.value;
                                        updateBlockVal(selectedBlockId, 'columns', newCols);
                                      }}
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Width %" 
                                      style={{ width: '25%', height: '22px', fontSize: '11px', padding: '2px' }} 
                                      value={col.width} 
                                      onChange={e => {
                                        const newCols = [...selectedBlock.columns];
                                        newCols[idx].width = e.target.value;
                                        updateBlockVal(selectedBlockId, 'columns', newCols);
                                      }}
                                    />
                                    <select
                                      style={{ width: '35%', height: '22px', fontSize: '11px', padding: '0 2px' }}
                                      value={col.align || 'left'}
                                      onChange={e => {
                                        const newCols = [...selectedBlock.columns];
                                        newCols[idx].align = e.target.value;
                                        updateBlockVal(selectedBlockId, 'columns', newCols);
                                      }}
                                    >
                                      <option value="left">Align L</option>
                                      <option value="center">Align C</option>
                                      <option value="right">Align R</option>
                                    </select>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {/* USABILITY: Token Dropdown Selector */}
                                    <select
                                      style={{ flex: 1, height: '22px', fontSize: '11px', padding: '0 2px' }}
                                      value={col.value.startsWith('{{') && col.value.endsWith('}}') ? col.value : 'custom'}
                                      onChange={e => {
                                        const val = e.target.value;
                                        const newCols = [...selectedBlock.columns];
                                        if (val !== 'custom') {
                                          newCols[idx].value = val;
                                        }
                                        updateBlockVal(selectedBlockId, 'columns', newCols);
                                      }}
                                    >
                                      <option value="{{item.index}}"># Index</option>
                                      <option value="{{item.code}}">Item Code</option>
                                      <option value="{{item.description}}">Description</option>
                                      <option value="{{item.qty}}">Quantity</option>
                                      <option value="{{item.brand}}">Brand</option>
                                      <option value="{{item.totalRetail}}">Total Retail</option>
                                      <option value="{{item.unitCost}}">Unit Cost</option>
                                      <option value="{{item.stockStatus}}">Stock Status</option>
                                      <option value="{{item.eta}}">ETA</option>
                                      <option value="custom">Custom Text...</option>
                                    </select>

                                    {/* Show text input only if 'custom' is selected */}
                                    {(!col.value.startsWith('{{') || !col.value.endsWith('}}')) && (
                                      <input 
                                        type="text" 
                                        placeholder="Value" 
                                        style={{ width: '45%', height: '22px', fontSize: '11px', padding: '2px' }} 
                                        value={col.value} 
                                        onChange={e => {
                                          const newCols = [...selectedBlock.columns];
                                          newCols[idx].value = e.target.value;
                                          updateBlockVal(selectedBlockId, 'columns', newCols);
                                        }}
                                      />
                                    )}

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
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Pricing summary */}
                      {selectedBlock.type === 'summary' && (
                        <>
                          <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Accent Color Theme</label>
                            <input type="color" style={{ width: '100%', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'none' }} value={selectedBlock.colorTheme || '#10b981'} onChange={e => updateBlockVal(selectedBlockId, 'colorTheme', e.target.value)} />
                          </div>
                        </>
                      )}

                      {/* Footer terms */}
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

                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }}>
                      Click on any canvas block or layout line to customize its properties.
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
