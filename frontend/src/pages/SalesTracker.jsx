import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';


import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Save, 
  TrendingUp, 
  AlertCircle, 
  Trash2, 
  Copy, 
  Plus, 
  Search, 
  ArrowLeft, 
  HelpCircle, 
  Edit3, 
  Filter, 
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  BadgeAlert,
  Printer,
  FileText,
  DollarSign,
  Truck,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ClipboardList,
  Calendar,
  Clock,
  Play
} from 'lucide-react';

const PHI_ADVISORIES = {
  orders: {
    author: "Eliyahu M. Goldratt (The Goal)",
    quote: "An hour lost at a bottleneck is an hour lost for the entire system. An hour saved at a non-bottleneck is a mirage.",
    advice: "Constraint-Driven Buffering. Ensure your specification spreadsheet highlights custom selections (green) vs off-the-shelf stock items (blue). Prioritize expediting custom selections, as their procurement lead time represents the primary critical path bottleneck."
  }
};

const statusColor = { 
  Complete: 'b-success', 
  Ongoing: 'b-info', 
  Pending: 'b-warning', 
  Draft: 'b-default',
  Cancelled: 'b-danger'
};

const toInputDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return dateStr;
};

const getFittingType = (item) => {
  const code = (item.code || '').toUpperCase();
  const desc = (item.description || '').toUpperCase();
  
  // 1. Direct Catalog Match
  if (code.includes('28402 9240') || code.includes('TA8') || code.includes('MOD-LED')) return 'Downlight';
  if (code.includes('LA_128598')) return 'Lamp';
  if (code.includes('MOD-STR')) return 'Strip';
  if (code.includes('SIG-PND')) return 'Pendant';
  if (code.includes('MOL-DRV')) return 'Driver';
  if (code.includes('MOD-WAL')) return 'Wall Washer';
  if (code.includes('SIG-FLR')) return 'Uplight';
  if (code.includes('MOL-TRK')) return 'Track';
  
  // 2. Keyword check on Description
  if (desc.includes('DOWNLIGHT')) return 'Downlight';
  if (desc.includes('FOOTLIGHT')) return 'Footlight';
  if (desc.includes('UPLIGHT')) return 'Uplight';
  if (desc.includes('SPOTLIGHT')) return 'Spotlight';
  if (desc.includes('TRACK')) return 'Track';
  if (desc.includes('PENDANT') || desc.includes('CHANDELIER')) return 'Pendant';
  if (desc.includes('LAMP') || desc.includes('BULB')) return 'Lamp';
  if (desc.includes('STRIP') || desc.includes('FLEX')) return 'Strip';
  if (desc.includes('PROFILE') || desc.includes('CHANNEL')) return 'Profile';
  if (desc.includes('DRIVER') || desc.includes('POWER SUPPLY') || desc.includes('TRANSFORMER')) return 'Driver';
  if (desc.includes('END CAP') || desc.includes(' EC ') || desc.includes('CONNECTOR') || desc.includes('ACCESSORY')) return 'Accessories';
  
  // 3. Fallback check on Code
  if (code.includes('DRV') || code.includes('DRIVE') || code.includes('PSU')) return 'Driver';
  if (code.includes('STRIP') || code.includes('STRP')) return 'Strip';
  if (code.includes('PROF') || code.includes('PRFL')) return 'Profile';
  if (code.includes('EC') || code.includes('END')) return 'Accessories';
  if (code.includes('LAMP')) return 'Lamp';
  
  // Default fallback
  return 'Fitting';
};

// Global Product Catalog for Item Code selection
const PRODUCT_CATALOG = [
  { code: '28402 9240 W', description: 'Downlight - Entero RD-S 14W 2700K 30° White', brand: 'Delta Light', dimming: 'Non-dim', unitCost: 2238.63, unitRetail: 2995.00 },
  { code: 'TA8-WWW', description: 'Downlight - Club Series TA8 GU10 White', brand: 'NEKO', dimming: 'Phase', unitCost: 450.00, unitRetail: 690.00 },
  { code: 'LA_12859898', description: 'Lamp - Classic LED GU10 5.5W 2700K 36°', brand: 'Spazio', dimming: 'Non-dim', unitCost: 65.00, unitRetail: 110.00 },
  { code: 'MOD-LED-001', description: 'Recessed LED Downlight 10W', brand: 'Modus', dimming: 'Non-dim', unitCost: 590.00, unitRetail: 890.00 },
  { code: 'MOD-STR-003', description: 'Surface Strip 2700K 1200mm', brand: 'Modus', dimming: 'Phase', unitCost: 820.00, unitRetail: 1240.00 },
  { code: 'SIG-PND-007', description: 'Bespoke Pendant Cluster', brand: 'Signature', dimming: 'DALI', unitCost: 5400.00, unitRetail: 8400.00 },
  { code: 'MOL-DRV-012', description: 'DALI Driver 100W', brand: 'Molecule', dimming: 'DALI', unitCost: 1400.00, unitRetail: 2100.00 },
  { code: 'MOD-WAL-002', description: 'Wall Washer Exterior 20W', brand: 'Modus', dimming: 'Non-dim', unitCost: 1100.00, unitRetail: 1650.00 },
  { code: 'SIG-FLR-019', description: 'Architectural Floor Uplight', brand: 'Signature', dimming: 'Non-dim', unitCost: 2100.00, unitRetail: 3200.00 },
  { code: 'MOL-TRK-005', description: '3-Phase Track System 2m', brand: 'Molecule', dimming: 'Non-dim', unitCost: 520.00, unitRetail: 780.00 },
];

const getItemDefaults = (item) => {
  const resolved = { ...item };
  
  // Phase 1: Order Phase (Procurement)
  const pHistory = Array.isArray(resolved.purchaseHistory) ? resolved.purchaseHistory : [];
  if (pHistory.length > 0) {
    resolved.poQtyOrdered = pHistory.reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    resolved.poRef = Array.from(new Set(pHistory.map(h => h.ref).filter(Boolean))).join('; ');
    resolved.poSupplier = Array.from(new Set(pHistory.map(h => h.supplier).filter(Boolean))).join('; ') || item.supplier || '';
    resolved.poDate = pHistory.map(h => h.date).filter(Boolean).reduce((latest, curr) => curr > latest ? curr : latest, '');
    resolved.poEta = pHistory.map(h => h.eta).filter(Boolean).reduce((latest, curr) => curr > latest ? curr : latest, '');
  } else {
    resolved.poRef = '';
    resolved.poSupplier = '';
    resolved.poDate = '';
    resolved.poQtyOrdered = 0;
    resolved.poEta = '';
  }
  
  // Phase 2: Receiving Phase
  const rHistory = Array.isArray(resolved.receivingHistory) ? resolved.receivingHistory : [];
  if (rHistory.length > 0) {
    resolved.receivedQty = rHistory.reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    resolved.receivedRef = Array.from(new Set(rHistory.map(h => h.ref).filter(Boolean))).join('; ');
    resolved.receivedDate = rHistory.map(h => h.date).filter(Boolean).reduce((latest, curr) => curr > latest ? curr : latest, '');
  } else {
    resolved.receivedQty = 0;
    resolved.receivedRef = '';
    resolved.receivedDate = '';
  }
  
  // Phase 3: Invoicing Phase
  const iHistory = Array.isArray(resolved.invoiceHistory) ? resolved.invoiceHistory : [];
  if (iHistory.length > 0) {
    resolved.invoiceQty = iHistory.reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    resolved.invoiceRef = Array.from(new Set(iHistory.map(h => h.ref).filter(Boolean))).join('; ');
    resolved.invoiceDate = iHistory.map(h => h.date).filter(Boolean).reduce((latest, curr) => curr > latest ? curr : latest, '');
    resolved.invoiceValue = iHistory.reduce((sum, h) => sum + ((Number(h.qty) || 0) * (Number(h.rate) || Number(resolved.unitRetail) || 0)), 0);
  } else {
    resolved.invoiceQty = Number(resolved.invoiceQty) || 0;
    resolved.invoiceRef = resolved.invoiceRef || '';
    resolved.invoiceDate = resolved.invoiceDate || '';
    resolved.invoiceValue = resolved.invoiceQty * (Number(resolved.unitRetail) || 0);
  }
  
  // Process delivery history if exists to sync with warehouse documents
  const history = Array.isArray(resolved.deliveryHistory) ? resolved.deliveryHistory : [];
  if (history.length > 0) {
    resolved.deliveryQty = history.reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    // Find the latest delivery date
    resolved.deliveryDate = history
      .map(h => h.date)
      .filter(Boolean)
      .reduce((latest, curr) => curr > latest ? curr : latest, '');
    
    resolved.deliveryStatus = resolved.deliveryQty >= (resolved.qty || 0) ? 'Delivered' : 'Partial';
    
    // Aggregate waybill references
    resolved.deliveryNotes = Array.from(new Set(history.map(h => h.ref).filter(Boolean))).join('; ');
  } else {
    resolved.deliveryQty = 0;
    resolved.deliveryDate = '';
    resolved.deliveryStatus = 'Pending';
    resolved.deliveryNotes = '';
  }
  
  if (resolved.deliveryComments === undefined) {
    resolved.deliveryComments = '';
  }
  if (resolved.deliveryHistory === undefined) {
    resolved.deliveryHistory = [];
  }
  if (resolved.stockStatus === undefined) {
    resolved.stockStatus = '';
  }
  if (resolved.stockOnHand === undefined) {
    resolved.stockOnHand = 0;
  }
  
  return resolved;
};

export default function SalesTracker() {
  const { projects, updateProject, contacts, getModuleName, projectManagers, setProjectManagers, setInvoices } = useStore();
  const location = useLocation();

  const navigate = useNavigate();

  const handleNavigateToDoc = (page, docId, projectKey) => {
    navigate(page, { state: { openDocId: docId, projectKey } });
  };

  const renderDocLinks = (refStr, page, projectKey) => {
    if (!refStr) return '—';
    const tokens = refStr.split(/[;,]+/).map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return '—';
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {tokens.map((tok, idx) => (
          <button
            key={idx}
            className="btn btn-xs btn-ghost"
            style={{
              padding: '2px 4px',
              fontSize: '10.5px',
              fontFamily: 'monospace',
              color: 'var(--text-info)',
              textDecoration: 'underline',
              cursor: 'pointer',
              height: 'auto',
              minHeight: 0
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateToDoc(page, tok, projectKey);
            }}
          >
            {tok}
          </button>
        ))}
      </div>
    );
  };

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Audit comparison modal state
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditSheetUrl, setAuditSheetUrl] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditProgress, setAuditProgress] = useState({ percent: 0, stage: '' });
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  const [orderPayments, setOrderPayments] = useState([]);
  
   // Temporary state for the active order items in the spreadsheet workspace
  const [activeOrderItems, setActiveOrderItems] = useState([]);

  // Reconciliation Import UI state
  const [reconcileSummary, setReconcileSummary] = useState(null); // { totalRows, totalOrders, projectsList: [{ key, name, ordersCount }] }
  const [importProgress, setImportProgress] = useState(null); // { statusText, percent, total, current }
  const [pendingImportData, setPendingImportData] = useState(null); // stores parsed groupings to run upon confirmation


  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'purchasing' | 'invoicing' | 'delivery'
  const [salesTrackerCreditsOpen, setSalesTrackerCreditsOpen] = useState(true);
  const [showHeaderDetails, setShowHeaderDetails] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showMonthlyGrid, setShowMonthlyGrid] = useState(false);
  const [gridFinYearStart, setGridFinYearStart] = useState(2025);
  const [gridSubTab, setGridSubTab] = useState('receiving');

  const groupedItems = useMemo(() => {
    const groups = {};
    activeOrderItems.forEach(item => {
      const codeKey = item.code || ('CUSTOM_' + item.id);
      if (!groups[codeKey]) {
        groups[codeKey] = {
          code: item.code,
          oneOneCode: item.oneOneCode || item.one_one_code || '',
          description: item.description,
          type: item.type,
          unitRetail: item.unitRetail || 0,
          unitCost: item.unitCost || 0,
          brand: item.brand,
          supplier: item.supplier,
          qty: 0,
          poQtyOrdered: 0,
          receivedQty: 0,
          invoiceQty: 0,
          deliveryQty: 0,
          stockOnHand: 0,
          itemIds: [],
          poRefs: new Set(),
          poSuppliers: new Set(),
          poDates: new Set(),
          poEtas: new Set(),
          receivedRefs: new Set(),
          receivedDates: new Set(),
          invoiceRefs: new Set(),
          invoiceDates: new Set(),
          invoiceValues: 0,
          deliveryDates: new Set(),
          deliveryStatuses: new Set(),
          deliveryNotesRefs: new Set(),
          areasSet: new Set(),
          stockStatuses: new Set(),
          deliveryCommentsList: [],
          deliveryHistories: [],
          is_credit: item.is_credit || item.isCredit || false,
          itemType: item.itemType || item.item_type || 'Hardware'
        };
      }

      
      const g = groups[codeKey];
      g.qty += item.qty || 0;
      g.itemIds.push(item.id);
      
      const defaults = getItemDefaults(item);
      const poRefVal = item.poRef !== undefined ? item.poRef : defaults.poRef;
      const poSupplierVal = item.poSupplier !== undefined ? item.poSupplier : defaults.poSupplier;
      const poDateVal = item.poDate !== undefined ? item.poDate : defaults.poDate;
      const poQtyOrderedVal = item.poQtyOrdered !== undefined ? item.poQtyOrdered : defaults.poQtyOrdered;
      const poEtaVal = item.poEta !== undefined ? item.poEta : defaults.poEta;

      const receivedRefVal = item.receivedRef !== undefined ? item.receivedRef : defaults.receivedRef;
      const receivedDateVal = item.receivedDate !== undefined ? item.receivedDate : defaults.receivedDate;
      const receivedQtyVal = item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty;
      const stockStatusVal = item.stockStatus !== undefined ? item.stockStatus : defaults.stockStatus;
      const deliveryCommentsVal = item.deliveryComments !== undefined ? item.deliveryComments : defaults.deliveryComments;
      const deliveryHistoryVal = item.deliveryHistory !== undefined ? item.deliveryHistory : defaults.deliveryHistory;

      const invoiceQtyVal = item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty;
      const invoiceRefVal = item.invoiceRef !== undefined ? item.invoiceRef : defaults.invoiceRef;
      const invoiceDateVal = item.invoiceDate !== undefined ? item.invoiceDate : defaults.invoiceDate;
      const invoiceValueVal = item.invoiceValue !== undefined ? item.invoiceValue : defaults.invoiceValue;

      const deliveryQtyVal = item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty;
      const deliveryDateVal = item.deliveryDate !== undefined ? item.deliveryDate : defaults.deliveryDate;
      const deliveryStatusVal = item.deliveryStatus !== undefined ? item.deliveryStatus : defaults.deliveryStatus;
      const deliveryNotesVal = item.deliveryNotes !== undefined ? item.deliveryNotes : defaults.deliveryNotes;

      const stockOnHandVal = item.stockOnHand !== undefined ? item.stockOnHand : defaults.stockOnHand;

      g.poQtyOrdered += Number(poQtyOrderedVal) || 0;
      g.receivedQty += Number(receivedQtyVal) || 0;
      g.invoiceQty += Number(invoiceQtyVal) || 0;
      g.invoiceValues += Number(invoiceValueVal) || 0;
      g.deliveryQty += Number(deliveryQtyVal) || 0;
      g.stockOnHand += Number(stockOnHandVal) || 0;

      if (poRefVal) {
        poRefVal.split(/[,;]/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) g.poRefs.add(trimmed);
        });
      }
      if (poSupplierVal) g.poSuppliers.add(poSupplierVal);
      if (poDateVal) g.poDates.add(poDateVal);
      if (poEtaVal) g.poEtas.add(poEtaVal);
      if (receivedRefVal) {
        receivedRefVal.split(/[,;]/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) g.receivedRefs.add(trimmed);
        });
      }
      if (receivedDateVal) g.receivedDates.add(receivedDateVal);
      if (invoiceRefVal) {
        invoiceRefVal.split(/[,;]/).forEach(s => {
          const trimmed = s.trim();
          if (trimmed) g.invoiceRefs.add(trimmed);
        });
      }
      if (invoiceDateVal) g.invoiceDates.add(invoiceDateVal);
      if (deliveryDateVal) g.deliveryDates.add(deliveryDateVal);
      if (deliveryStatusVal) g.deliveryStatuses.add(deliveryStatusVal);
      if (deliveryNotesVal) {
        deliveryNotesVal.split(';').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) g.deliveryNotesRefs.add(trimmed);
        });
      }
      if (item.area) g.areasSet.add(`${item.area} (${item.floor || 'Ground'})`);
      if (stockStatusVal) g.stockStatuses.add(stockStatusVal);
      if (deliveryCommentsVal) g.deliveryCommentsList.push(deliveryCommentsVal);
      if (deliveryHistoryVal && Array.isArray(deliveryHistoryVal)) g.deliveryHistories.push(...deliveryHistoryVal);
    });

    return Object.values(groups).map(g => {
      return {
        id: g.itemIds[0],
        code: g.code || 'CUSTOM',
        description: g.description,
        type: g.type,
        unitRetail: g.unitRetail,
        unitCost: g.unitCost,
        brand: g.brand,
        supplier: g.supplier,
        qty: g.qty,
        itemIds: g.itemIds,
        poRef: g.poRefs.size > 0 ? Array.from(g.poRefs).join(', ') : '',
        poSupplier: g.poSuppliers.size > 0 ? Array.from(g.poSuppliers)[0] : g.supplier || '',
        stockStatus: g.stockStatuses.size > 0 ? Array.from(g.stockStatuses)[0] : '',
        stockOnHand: g.stockOnHand,
        poDate: g.poDates.size > 0 ? Array.from(g.poDates)[0] : '',
        poQtyOrdered: g.poQtyOrdered,
        poEta: g.poEtas.size > 0 ? Array.from(g.poEtas)[0] : '',
        receivedQty: g.receivedQty,
        receivedRef: g.receivedRefs.size > 0 ? Array.from(g.receivedRefs).join(', ') : '',
        receivedDate: g.receivedDates.size > 0 ? Array.from(g.receivedDates)[0] : '',
        invoiceQty: g.invoiceQty,
        invoiceRef: g.invoiceRefs.size > 0 ? Array.from(g.invoiceRefs).join(', ') : '',
        invoiceDate: g.invoiceDates.size > 0 ? Array.from(g.invoiceDates)[0] : '',
        invoiceValue: g.invoiceValues,
        deliveryQty: g.deliveryQty,
        deliveryDate: g.deliveryDates.size > 0 ? Array.from(g.deliveryDates)[0] : '',
        deliveryStatus: g.deliveryStatuses.size > 0 ? Array.from(g.deliveryStatuses)[0] : 'Pending',
        deliveryNotes: g.deliveryNotesRefs.size > 0 ? Array.from(g.deliveryNotesRefs).join('; ') : '',
        deliveryComments: g.deliveryCommentsList.length > 0 ? g.deliveryCommentsList.filter(Boolean).join('; ') : '',
        deliveryHistory: (() => {
          const historyMap = {};
          g.deliveryHistories.forEach(dh => {
            if (!dh || !dh.ref) return;
            const key = `${dh.ref}_${dh.date}`;
            if (!historyMap[key]) {
              historyMap[key] = { qty: 0, ref: dh.ref, date: dh.date };
            }
            historyMap[key].qty += (dh.qty || 0);
          });
          return Object.values(historyMap);
        })(),
        area: g.areasSet.size > 0 ? Array.from(g.areasSet).join(', ') : '—',
        is_credit: g.is_credit,
        itemType: g.itemType
      };
    }).sort((a, b) => {
      if (a.is_credit && !b.is_credit) return 1;
      if (!a.is_credit && b.is_credit) return -1;
      return 0;
    });
  }, [activeOrderItems]);


  const getVisibleCols = () => {
    if (activeTab === 'purchasing') {
      return ['stockStatus', 'stockOnHand', 'poRef', 'poSupplier', 'poDate', 'poQtyOrdered', 'poEta', 'receivedQty', 'receivedDate'];
    }
    if (activeTab === 'invoicing') {
      return ['invoiceQty', 'invoiceRef', 'invoiceDate'];
    }
    if (activeTab === 'delivery') {
      return ['deliveryQty', 'deliveryDate', 'deliveryStatus', 'deliveryComments'];
    }
    return [];
  };

  const handleSpreadsheetKeyDown = (e) => {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'TEXTAREA') return;

    const rowStr = target.getAttribute('data-row');
    const col = target.getAttribute('data-col');
    if (rowStr === null || !col) return;

    const row = parseInt(rowStr);
    const visibleCols = getVisibleCols();
    const colIndex = visibleCols.indexOf(col);
    if (colIndex === -1) return;

    let nextRow = row;
    let nextColIndex = colIndex;

    // Intercept keyboard copy (Ctrl+C / Cmd+C) to copy cell value, particularly useful for date inputs
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      const currentItem = groupedItems[row];
      const val = currentItem[col];
      navigator.clipboard.writeText(val !== undefined && val !== null ? String(val) : '');
      // Don't preventDefault to allow natural text copy selection where possible
    }

    // Intercept keyboard fill down (Ctrl+D / Cmd+D) to duplicate the cell value above
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (row > 0) {
        const prevRowItem = groupedItems[row - 1];
        const valToCopy = prevRowItem[col];
        const currentItem = groupedItems[row];
        
        if (col === 'stockStatus') {
          handleStockStatusChange(currentItem.itemIds, valToCopy);
        } else {
          handleUpdateSpreadsheetCell(currentItem.itemIds, col, valToCopy);
        }
        
        // Auto-advance focus to the next row (if there is one) for quick sequential fills
        const nextTargetRow = Math.min(groupedItems.length - 1, row + 1);
        setTimeout(() => {
          const selector = `[data-row="${nextTargetRow}"][data-col="${col}"]`;
          const nextElement = document.querySelector(selector);
          if (nextElement) {
            nextElement.focus();
            if (nextElement.select) nextElement.select();
          }
        }, 10);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(groupedItems.length - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      if (target.tagName === 'SELECT' || target.selectionStart === 0 || target.type === 'number') {
        e.preventDefault();
        nextColIndex = Math.max(0, colIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      if (target.tagName === 'SELECT' || target.selectionStart === target.value.length || target.type === 'number') {
        e.preventDefault();
        nextColIndex = Math.min(visibleCols.length - 1, colIndex + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(groupedItems.length - 1, row + 1);
    } else {
      return;
    }

    const nextCol = visibleCols[nextColIndex];
    const selector = `[data-row="${nextRow}"][data-col="${nextCol}"]`;
    const nextElement = document.querySelector(selector);
    if (nextElement) {
      nextElement.focus();
      if (nextElement.select) {
        nextElement.select();
      }
    }
  };

  const handleSpreadsheetPaste = (e) => {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT' && target.tagName !== 'TEXTAREA') return;

    const rowStr = target.getAttribute('data-row');
    const col = target.getAttribute('data-col');
    if (rowStr === null || !col) return;

    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');

    const rows = pastedData.split(/\r?\n/).filter(line => line.length > 0);
    const parsedGrid = rows.map(r => r.split('\t'));

    const startRow = parseInt(rowStr);
    const visibleCols = getVisibleCols();
    const startColIndex = visibleCols.indexOf(col);
    if (startColIndex === -1) return;

    setActiveOrderItems(prevItems => {
      const newItems = [...prevItems];
      
      parsedGrid.forEach((gridRow, rOffset) => {
        const targetGroupedRowIndex = startRow + rOffset;
        if (targetGroupedRowIndex >= groupedItems.length) return;

        const targetGroupedItem = groupedItems[targetGroupedRowIndex];
        const targetItemIds = targetGroupedItem.itemIds;

        gridRow.forEach((cellValue, cOffset) => {
          const targetColIndex = startColIndex + cOffset;
          if (targetColIndex >= visibleCols.length) return;

          const targetCol = visibleCols[targetColIndex];
          
          const qtyFields = ['poQtyOrdered', 'receivedQty', 'invoiceQty', 'deliveryQty'];
          if (qtyFields.includes(targetCol)) {
            const totalQty = Math.max(0, parseInt(cellValue) || 0);
            let remaining = totalQty;
            newItems.forEach((item, idx) => {
              if (targetItemIds.includes(item.id)) {
                const maxForItem = item.qty || 0;
                const allocated = Math.min(maxForItem, remaining);
                remaining -= allocated;
                const extraFields = {};
                if (targetCol === 'invoiceQty') {
                  extraFields.invoiceValue = allocated * (item.unitRetail || 0);
                }
                newItems[idx] = {
                  ...newItems[idx],
                  [targetCol]: allocated,
                  ...extraFields
                };
              }
            });
          } else {
            newItems.forEach((item, idx) => {
              if (targetItemIds.includes(item.id)) {
                let parsedVal = cellValue;
                if (targetCol === 'qty') parsedVal = Math.max(0, parseInt(cellValue) || 0);
                if (targetCol === 'unitCost') parsedVal = Math.max(0, parseFloat(cellValue) || 0);
                if (targetCol === 'unitTrade') parsedVal = Math.max(0, parseFloat(cellValue) || 0);
                if (targetCol === 'unitRetail') parsedVal = Math.max(0, parseFloat(cellValue) || 0);
                if (targetCol === 'invoiceValue') parsedVal = Math.max(0, parseFloat(cellValue) || 0);
                newItems[idx] = {
                  ...newItems[idx],
                  [targetCol]: parsedVal
                };
              }
            });
          }
        });
      });
      return newItems;
    });
  };

  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderSupplier, setSupplier] = useState('');
  const [quoteName, setQuoteName] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderEta, setOrderEta] = useState('');
  const orderPaidAmount = useMemo(() => {
    return (orderPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }, [orderPayments]);
  const [orderVatRate, setOrderVatRate] = useState(15);
  const [depositValue, setDepositValue] = useState(0);
  const [balanceValue, setBalanceValue] = useState(0);

  // Editable Client & Project Registration details on the order
  const [clientCompany, setClientCompany] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [projectFullName, setProjectFullName] = useState('');
  const [projectTier, setProjectTier] = useState('');
  const [projectSize, setProjectSize] = useState('');
  const [electrician, setElectrician] = useState('');
  const [electricianPhone, setElectricianPhone] = useState('');
  const [contractor, setContractor] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [interiorDesigner, setInteriorDesigner] = useState('');
  const [interiorDesignerPhone, setInteriorDesignerPhone] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [billingDetails, setBillingDetails] = useState('');

  const [oneOneRep, setOneOneRep] = useState('Martin Döller');
  const [pmName, setPmName] = useState('Merlyn Mittins');
  const [pmPhone, setPmPhone] = useState('083 570 7795');
  const [pmEmail, setPmEmail] = useState('merlyn.mittins@1-to-1.world');
  const [orderDate, setOrderDate] = useState('');

  const [quotationSentDate, setQuotationSentDate] = useState('2025-12-09');
  const [projectClass, setProjectClass] = useState('Singita');
  const [fileSource, setFileSource] = useState('Singita - 02 Bed Guest Unit');
  const [pfNumber, setPfNumber] = useState('PF-00931 - SO000025');
  const [pfDate, setPfDate] = useState('2026-01-16');

  // BOTTOM MILESTONE FIELDS
  const [depositInvoiceSent, setDepositInvoiceSent] = useState('No');
  const [pfInvoiceSentDate, setPfInvoiceSentDate] = useState('');
  const [commissionValue, setCommissionValue] = useState(0);
  const [depositPaymentDate, setDepositPaymentDate] = useState('');
  const [balancePaymentDate, setBalancePaymentDate] = useState('');
  const [ongoingTime, setOngoingTime] = useState('');
  const [latestStatementSentDate, setLatestStatementSentDate] = useState('');
  const [progressPaymentDateSent, setProgressPaymentDateSent] = useState('');
  const [dateCompleted, setDateCompleted] = useState('');
  const [paymentResponse, setPaymentResponse] = useState('');

  const { procPct, invPct, delPct } = useMemo(() => {
    let totalQtyForProc = 0;
    let totalProcQty = 0;
    
    let totalQtyForInv = 0;
    let totalInvQty = 0;
    
    let totalQtyForDel = 0;
    let totalDelQty = 0;

    activeOrderItems.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
      const q = Number(item.qty) || 0;
      const isService = (item.itemType || item.item_type) === 'Service';
      
      const defaults = getItemDefaults(item);
      const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty || 0;

      if (isService) {
        // Services only impact invoicing
        totalQtyForInv += q;
        totalInvQty += Number(invoiced) || 0;
        return;
      }

      // Hardware impacts all three
      totalQtyForProc += q;
      totalQtyForInv += q;
      totalQtyForDel += q;

      const received = item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty || 0;
      const delivered = item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty || 0;
      const stockStatus = item.stockStatus !== undefined ? item.stockStatus : defaults.stockStatus || '';

      totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
      totalInvQty += Number(invoiced) || 0;
      totalDelQty += Number(delivered) || 0;
    });

    const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
    const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
    const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

    return { procPct, invPct, delPct };
  }, [activeOrderItems]);


  // DOCUMENT SCRATCHPAD & LIVING LEDGER HISTORIC CONTAINER STATE
  const [actionQuantities, setActionQuantities] = useState({}); // { itemId: number }
  const [priceOverrides, setPriceOverrides] = useState({});     // { itemId: number }
  const [orderDocumentsHistory, setOrderDocumentsHistory] = useState([]); // List of saved sub-documents
  const [selectedViewingDocument, setSelectedViewingDocument] = useState(null); // Currently selected historical document to display
  const [expandedItemId, setExpandedItemId] = useState(null); // Which item is expanded for the pipeline tracking details
  const [showCosts, setShowCosts] = useState(false); // Controls whether cost columns are visible in the ledger
  const [bulkField, setBulkField] = useState('poRef');
  const [bulkValue, setBulkValue] = useState('');
  
  // States for Document-Centric Logger Modal
  const [waybillHistoryModalItem, setWaybillHistoryModalItem] = useState(null);
  const [showPaymentViewer, setShowPaymentViewer] = useState(false);



  // Search & Filter state for the ledger list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [pmFilter, setPmFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Sorting States
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null | 'all' | 'pending' | 'active' | 'complete'

  // Workspace View State (BOQ Spreadsheet vs Document Generator)
  const [workspaceSubTab, setWorkspaceSubTab] = useState('boq'); // 'boq' | 'docs'
  const [showRegForm, setShowRegForm] = useState(true);
  const [activeDocType, setActiveDocType] = useState('quote'); // 'quote' | 'invoice' | 'schedule' | 'delivery' | 'statement'
  const [customTerms, setCustomTerms] = useState('Payment: 50% deposit to initiate order, 40% on delivery, 10% post-installation sign-off. Validity: 30 days from date of issue.');

  // Checkbox state for Bulk Excel Operations
  const [selectedOrders, setSelectedOrders] = useState([]); // Array of strings: "projectKey_orderId"


  // Pricing consistency assistant modal state
  const [pendingPriceEdit, setPendingPriceEdit] = useState(null); // { itemId, field, value, code }

  // Modal creation state
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [newPoForm, setNewPoForm] = useState({
    projectKey: 'upper',
    supplier: 'Molecule Dist.',
    status: 'Pending',
    eta: 'TBD'
  });

  // Date parser helper
  const parseProjectDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date range checking logic
  const isDateInRange = (dateStr) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const pDate = parseProjectDate(dateStr);
    if (!pDate) return false;
    
    if (startDate) {
      const start = new Date(startDate);
      if (pDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (pDate > end) return false;
    }
    return true;
  };

  // Preset Date Applier
  const applyPreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Last Week') {
      setStartDate('2026-05-11');
      setEndDate('2026-05-18');
    } else if (preset === 'Last 30 Days') {
      setStartDate('2026-04-18');
      setEndDate('2026-05-18');
    } else if (preset === 'Financial Year') {
      setStartDate('2026-03-01');
      setEndDate('2027-02-28');
    }
  };

  // Aggregate all orders/quotations from all projects in the store
  const allOrders = useMemo(() => {
    const list = [];
    Object.values(projects).forEach(p => {
      if (p.orders) {
        p.orders.forEach(o => {
          // Compute progress percentages dynamically for the main ledger view
          let totalQtyForProc = 0;
          let totalProcQty = 0;
          let totalQtyForInv = 0;
          let totalInvQty = 0;
          let totalQtyForDel = 0;
          let totalDelQty = 0;

          const itemsList = o.itemsList || [];
          itemsList.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
            const q = Number(item.qty) || 0;
            const isService = (item.itemType || item.item_type) === 'Service';
            
            const defaults = getItemDefaults(item);
            const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty || 0;

            if (isService) {
              totalQtyForInv += q;
              totalInvQty += Number(invoiced) || 0;
              return;
            }

            totalQtyForProc += q;
            totalQtyForInv += q;
            totalQtyForDel += q;

            const received = item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty || 0;
            const delivered = item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty || 0;
            const stockStatus = item.stockStatus !== undefined ? item.stockStatus : defaults.stockStatus || '';

            totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
            totalInvQty += Number(invoiced) || 0;
            totalDelQty += Number(delivered) || 0;
          });

          const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
          const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
          const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

          // Standalone Payment Status calculation
          const totalPaidVal = Number(o.paid) || 0;
          const totalRetailVal = Number(o.value) || 0;
          const isVatEnabled = true; // Assume standard 15% VAT on outstanding calculations
          const valueInclVat = totalRetailVal * 1.15;
          let paymentStatus = 'Unpaid';
          if (totalPaidVal > 0) {
            if (totalPaidVal >= valueInclVat - 1) { // 1 ZAR tolerance for rounding
              paymentStatus = 'Fully Paid';
            } else {
              paymentStatus = 'Partially Paid';
            }
          }

          // Dynamic Overhanging Order Status computation
          let computedStatus = o.status; 
          // If it is in DB, it is saved. Reevaluate if saved status was not draft (in workspace we handle Draft/Saved)
          if (o.status !== 'Draft') {
            const isFullyPaid = paymentStatus === 'Fully Paid';
            if (totalPaidVal === 0 && procPct === 0 && delPct === 0) {
              computedStatus = 'Pending';
            } else if (procPct === 100 && invPct === 100 && delPct === 100 && isFullyPaid) {
              computedStatus = 'Complete';
            } else {
              computedStatus = 'Ongoing';
            }
          }

          list.push({
            ...o,
            projectKey: p.key,
            projectName: p.name,
            projectClient: p.client,
            projectPm: p.pm || p.pmName || '',
            projectStart: p.start,
            procPct,
            invPct,
            delPct,
            paymentStatus,
            status: computedStatus
          });
        });
      }
    });
    return list;
  }, [projects]);


  // Check router state from location for automatic redirection/filtering
  useEffect(() => {
    if (location.state?.projectKey) {
      setProjectFilterKey(location.state.projectKey);
    }
    if (location.state?.openOrderId) {
      const targetOrder = allOrders.find(o => o.id === location.state.openOrderId);
      if (targetOrder) {
        handleOpenWorkspace(targetOrder);
      }
    }
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state, allOrders]);

  // Filter orders by Date Preset/Range
  const dateFilteredOrders = useMemo(() => {
    return allOrders.filter(o => isDateInRange(o.orderDate || o.projectStart));
  }, [allOrders, startDate, endDate]);

  // Dynamic KPI Metrics calculations (All, Pending, Active, Complete)
  const kpis = useMemo(() => {
    const getGroupMetrics = (groupList) => {
      const value = groupList.reduce((sum, o) => sum + (o.value || 0), 0);
      const paid = groupList.reduce((sum, o) => sum + (o.paid || 0), 0);
      const outstanding = Math.max(0, value - paid);
      return {
        qty: groupList.length,
        value,
        paid,
        outstanding
      };
    };

    const allGroup = dateFilteredOrders;
    const pendingGroup = dateFilteredOrders.filter(o => o.status === 'Pending' || o.status === 'Draft');
    const activeGroup = dateFilteredOrders.filter(o => o.status === 'Ongoing');
    const completeGroup = dateFilteredOrders.filter(o => o.status === 'Complete');

    return {
      all: getGroupMetrics(allGroup),
      pending: getGroupMetrics(pendingGroup),
      active: getGroupMetrics(activeGroup),
      complete: getGroupMetrics(completeGroup)
    };
  }, [dateFilteredOrders]);

  // Filtered orders list for the ledger overview
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (o.id || '').toLowerCase().includes(query) ||
        (o.quote_name || '').toLowerCase().includes(query) ||
        (o.projectName || '').toLowerCase().includes(query) ||
        (o.projectClient || '').toLowerCase().includes(query) ||
        (o.projectPm || '').toLowerCase().includes(query);
        
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchesProject = projectFilterKey === 'All' || o.projectKey === projectFilterKey;
      const matchesClient = clientFilter === 'All' || o.projectClient === clientFilter;
      const matchesPm = pmFilter === 'All' || o.projectPm === pmFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'All' || o.paymentStatus === paymentStatusFilter;
      
      // KPI interactive filter matching
      let matchesKpi = true;
      if (activeKpiFilter === 'all') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = o.status === 'Pending' || o.status === 'Draft';
      } else if (activeKpiFilter === 'active') {
        matchesKpi = o.status === 'Ongoing';
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = o.status === 'Complete';
      }

      return matchesSearch && matchesStatus && matchesProject && matchesClient && matchesPm && matchesPaymentStatus && matchesKpi;
    });
  }, [dateFilteredOrders, searchQuery, filterStatus, projectFilterKey, clientFilter, pmFilter, paymentStatusFilter, activeKpiFilter]);

  // Sort Logic for All Columns in Sales Tracker Module
  const sortedOrders = useMemo(() => {
    if (!sortField) return filteredOrders;

    const getVal = (o, field) => {
      const cost = o.costValue || 0;
      const retail = o.value || 0;
      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
      const outstandingVal = o.outstanding || 0;

      switch (field) {
        case 'id':
          return (o.id || '').toLowerCase();
        case 'quote_name':
          return (o.quote_name || '').toLowerCase();
        case 'project':
          return (o.projectFullName || o.projectName || '').toLowerCase();
        case 'client':
          return ((o.clientCompany || o.projectClient) || '').toLowerCase();
        case 'pm':
          return (o.projectPm || '').toLowerCase();
        case 'supplier':
          return (o.supplier || '').toLowerCase();
        case 'value':
          return retail;
        case 'paid':
          return o.paid || 0;
        case 'outstanding':
          return outstandingVal;
        case 'margin':
          return margin;
        case 'status':
          return (o.status || '').toLowerCase();
        case 'paymentStatus':
          return (o.paymentStatus || '').toLowerCase();
        case 'procPct':
          return o.procPct || 0;
        case 'invPct':
          return o.invPct || 0;
        case 'delPct':
          return o.delPct || 0;
        default:
          return '';
      }
    };

    return [...filteredOrders].sort((a, b) => {
      const valA = getVal(a, sortField);
      const valB = getVal(b, sortField);

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />;
  };

  // Dynamic statistics
  const totalCostCompany = allOrders.reduce((sum, o) => sum + (o.costValue || 0), 0);
  const totalValueCompany = allOrders.reduce((sum, o) => sum + (o.value || 0), 0);
  const blendedMarginCompany = totalValueCompany > 0 ? Math.round(((totalValueCompany - totalCostCompany) / totalValueCompany) * 100) : 0;
  const lowMarginPoCount = allOrders.filter(o => {
    const cost = o.costValue || 0;
    const retail = o.value || 0;
    if (retail === 0) return false;
    return ((retail - cost) / retail) * 100 < 39;
  }).length;

  // Open the spreadsheet workspace
  const handleOpenWorkspace = (order) => {
    setSelectedOrderId(order.id);
    setSelectedProjectKey(order.projectKey);
    // Dynamically calculate delivery properties from deliveryHistory on load to prevent overwrite
    const loadedItems = (order.itemsList || []).map(item => getItemDefaults(item));
    setActiveOrderItems(loadedItems);
    setOrderDiscount(order.discount || 0);
    setSupplier(order.supplier);
    setQuoteName(order.quote_name || 'General Spec');
    setOrderStatus(order.status);
    setOrderEta(order.eta || '—');
    setWorkspaceSubTab('boq');

    const orderDateStr = order.orderDate || new Date().toISOString().split('T')[0];
    const orderDateObj = new Date(orderDateStr);
    const startYr = (!isNaN(orderDateObj.getTime()) && orderDateObj.getMonth() >= 2) ? orderDateObj.getFullYear() : (orderDateObj.getFullYear() - 1);
    setGridFinYearStart(startYr);
    setGridSubTab('receiving');

    // Load living ledger historical documents list
    setOrderDocumentsHistory(order.documents || []);
    setSelectedViewingDocument(null);

    // Initialize Active Scratchpad Action Quantities and price overrides map
    const initialQtys = {};
    const initialPriceOverrides = {};
    (order.itemsList || []).forEach(item => {
      // Calculate already delivered count to default action quantity to remaining
      const deliveredCount = (order.documents || [])
        .filter(d => d.type === 'delivery')
        .reduce((sum, doc) => {
          const docItem = (doc.items || []).find(di => di.id === item.id);
          return sum + (docItem ? (Number(docItem.qtyAction) || 0) : 0);
        }, 0);
      initialQtys[item.id] = Math.max(0, (Number(item.qty) || 0) - deliveredCount);
      initialPriceOverrides[item.id] = Number(item.unitRetail) || 0;
    });
    setActionQuantities(initialQtys);
    setPriceOverrides(initialPriceOverrides);

    // Retrieve linked project & contact info for automatic defaults
    const proj = projects[order.projectKey] || {};
    const contact = (contacts || []).find(c => c.name === proj.client || c.company === proj.client) || {};

    // Auto-populate or read existing order-adjusted properties
    setClientCompany(order.clientCompany !== undefined ? order.clientCompany : (contact.company || proj.client || ''));
    setClientContact(order.clientContact !== undefined ? order.clientContact : (contact.name || proj.client || ''));
    setClientPhone(order.clientPhone !== undefined ? order.clientPhone : (contact.phone || ''));
    setClientEmail(order.clientEmail !== undefined ? order.clientEmail : (contact.email || ''));

    setProjectFullName(order.projectFullName !== undefined ? order.projectFullName : (proj.name || ''));
    setProjectTier(order.projectTier !== undefined ? order.projectTier : (proj.offering || 'Signature'));
    setProjectSize(order.projectSize !== undefined ? order.projectSize : (proj.sqm || '—'));
    
    setElectrician(order.electrician || 'TBD Electrician');
    setElectricianPhone(order.electricianPhone || '—');
    setContractor(order.contractor || 'TBD Contractor');
    setContractorPhone(order.contractorPhone || '—');
    setInteriorDesigner(order.interiorDesigner || 'TBD Designer');
    setInteriorDesignerPhone(order.interiorDesignerPhone || '—');

    setOneOneRep(order.oneOneRep || order.salesRep || order.sales_rep || order.sales_rep_name || proj.pm || 'Martin Döller');
    
    // Resolve PM Name, matching partial names like "Ryan" or "Dani" to full names in projectManagers list
    let rawPm = order.pmName || order.pm_name || order.salesRep || order.sales_rep || order.sales_rep_name || order.pm || proj.pm || '';
    if (rawPm && typeof rawPm === 'string') {
      const lowerRaw = rawPm.trim().toLowerCase();
      const matchedPmObj = (projectManagers || []).find(pm => {
        if (!pm || !pm.name || typeof pm.name !== 'string') return false;
        const pmLower = pm.name.toLowerCase();
        const firstName = pmLower.split(' ')[0] || '';
        return pmLower === lowerRaw || pmLower.includes(lowerRaw) || (firstName && lowerRaw.includes(firstName));
      });
      if (matchedPmObj && matchedPmObj.name) {
        rawPm = matchedPmObj.name;
      }
    }
    const resolvedPm = rawPm;
    setPmName(resolvedPm);

    const matchedPmInfo = (projectManagers || []).find(pm => pm && pm.name === resolvedPm);
    setPmPhone(order.pmPhone || (matchedPmInfo ? matchedPmInfo.phone : '083 570 7795'));
    setPmEmail(order.pmEmail || (matchedPmInfo ? matchedPmInfo.email : (resolvedPm && typeof resolvedPm === 'string' ? `${resolvedPm.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world` : 'merlyn.mittins@1-to-1.world')));
    
    // Auto-resolve Division based on PM Name or Project if unassigned
    let resolvedDiv = order.division || proj.division || '';
    if (!resolvedDiv || resolvedDiv === 'INTERNAL - Office') {
      const name = resolvedPm.toLowerCase();
      if (name.includes('ryan')) resolvedDiv = 'MODUS PROFESSIONAL ( Ryan )';
      else if (name.includes('thando')) resolvedDiv = 'MODUS SIGNATURE ( Thando )';
      else if (name.includes('peer') || name.includes('jon') || name.includes('made')) resolvedDiv = 'MADE ( Jon-Peer)';
      else if (name.includes('luxe')) resolvedDiv = 'LUXELINE';
      else if (name.includes('dani') || name.includes('daniel')) resolvedDiv = 'MODUS PROJECTS ( Dani )';
    }
    setDivision(resolvedDiv);

    const formattedToday = new Date().toISOString().split('T')[0]; // "yyyy-mm-dd"
    setOrderDate(toInputDate(order.orderDate || formattedToday));

    setQuotationSentDate(toInputDate(order.quotationSentDate || order.orderDate || formattedToday));
    setProjectClass(order.projectClass || proj.name || 'Singita');
    setFileSource(order.fileSource || (proj.name ? `${proj.name} - Spec` : 'Singita - 02 Bed Guest Unit'));
    setPfNumber(order.pfNumber || `PF-00${proj.key === 'upper' ? '931' : '542'} - SO0000${order.id.slice(-2)}`);
    setPfDate(toInputDate(order.pfDate || order.orderDate || formattedToday));

    setDepositInvoiceSent(order.depositInvoiceSent || 'No');
    setPfInvoiceSentDate(toInputDate(order.pfInvoiceSentDate || ''));
    setCommissionValue(order.commissionValue || 0);
    setDepositPaymentDate(toInputDate(order.depositPaymentDate || ''));
    setBalancePaymentDate(toInputDate(order.balancePaymentDate || ''));
    setOngoingTime(order.ongoingTime || '');
    setLatestStatementSentDate(toInputDate(order.latestStatementSentDate || ''));
    setProgressPaymentDateSent(toInputDate(order.progressPaymentDateSent || ''));
    setDateCompleted(toInputDate(order.dateCompleted || ''));
    setPaymentResponse(order.paymentResponse || '');
    setOrderPayments(order.payments || []);
    setOrderVatRate(order.vatRate !== undefined ? order.vatRate : 15);
    const tempActiveItems = order.itemsList || [];
    const tempDiscount = order.discount || 0;
    const tempVatRate = order.vatRate !== undefined ? order.vatRate : 15;
    const tempTotalRetail = tempActiveItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
    const tempDiscountedRetail = Math.max(0, tempTotalRetail * (1 - (Number(tempDiscount) || 0) / 100));
    const tempCalculatedVat = tempDiscountedRetail * (Number(tempVatRate) / 100);
    const tempTotalPriceInclVat = tempDiscountedRetail + tempCalculatedVat;

    setDepositValue(order.depositValue !== undefined ? order.depositValue : (tempTotalPriceInclVat * 0.7));
    setBalanceValue(order.balanceValue !== undefined ? order.balanceValue : (tempTotalPriceInclVat * 0.3));

    setDeliveryAddress(order.deliveryAddress || proj.deliveryAddress || '7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941');
    setBillingDetails(order.billingDetails || proj.billingDetails || 'TEST TSTETESSETSETEESTSETEST\nTEST TSTETESSETSETEESTSETEST');
  };

  const handleApplyBulkValue = () => {
    if (!bulkField) return;
    setActiveOrderItems(prev => prev.map(item => {
      let val = bulkValue;
      if (bulkField === 'poQtyOrdered' || bulkField === 'receivedQty' || bulkField === 'invoiceQty' || bulkField === 'deliveryQty') {
        val = Math.max(0, parseInt(bulkValue) || 0);
      } else if (bulkField === 'invoiceValue') {
        val = Math.max(0, parseFloat(bulkValue) || 0);
      }
      return {
        ...item,
        [bulkField]: val
      };
    }));
    alert(`Bulk Applied: Set all items' "${bulkField}" field to "${bulkValue}".`);
  };

  const handleCopyFirstRowBulk = () => {
    if (!bulkField || activeOrderItems.length === 0) return;
    const firstItem = activeOrderItems[0];
    const defaults = getItemDefaults(firstItem);
    let val = firstItem[bulkField];
    if (val === undefined) {
      val = defaults[bulkField];
    }
    setActiveOrderItems(prev => prev.map((item, idx) => {
      if (idx === 0) return item;
      return {
        ...item,
        [bulkField]: val
      };
    }));
    alert(`Fill Down: Duplicated first row's "${bulkField}" value to all other rows.`);
  };

  // Cell modification in the spreadsheet workspace
  const handleUpdateSpreadsheetCell = (itemOrItemIds, field, val) => {
    const itemIds = Array.isArray(itemOrItemIds) ? itemOrItemIds : [itemOrItemIds];
    const qtyFields = ['poQtyOrdered', 'receivedQty', 'invoiceQty', 'deliveryQty'];
    
    if (qtyFields.includes(field)) {
      // Distribute sequentially!
      const totalQty = Math.max(0, parseInt(val) || 0);
      setActiveOrderItems(prev => {
        let remaining = totalQty;
        return prev.map(item => {
          if (itemIds.includes(item.id)) {
            // Locking rule: All Stock on Hand -> poQtyOrdered & receivedQty must be 0
            if (item.stockStatus === 'All Stock on Hand' && (field === 'poQtyOrdered' || field === 'receivedQty')) {
              return {
                ...item,
                [field]: 0
              };
            }

            let maxForItem = item.qty || 0;
            // Clamping rule: Partial Stock on Hand -> receivedQty cannot exceed poQtyOrdered
            if (item.stockStatus === 'Partial Stock on Hand' && field === 'receivedQty') {
              maxForItem = item.poQtyOrdered || 0;
            }

            const allocated = Math.min(maxForItem, remaining);
            remaining -= allocated;
            
            const extraFields = {};
            if (field === 'invoiceQty') {
              extraFields.invoiceValue = allocated * (item.unitRetail || 0);
            }

            // Clamping rule: Partial Stock on Hand -> if we reduce poQtyOrdered below receivedQty, receivedQty must clamp down
            if (item.stockStatus === 'Partial Stock on Hand' && field === 'poQtyOrdered') {
              if ((item.receivedQty || 0) > allocated) {
                extraFields.receivedQty = allocated;
              }
            }

            return {
              ...item,
              [field]: allocated,
              ...extraFields
            };
          }
          return item;
        });
      });
    } else {
      // Set all items with itemIds to the same value
      setActiveOrderItems(prev => prev.map(item => {
        if (itemIds.includes(item.id)) {
          // Locking rule: All Stock on Hand -> no date ordered, ETA, received date
          if (item.stockStatus === 'All Stock on Hand' && (field === 'poDate' || field === 'poEta' || field === 'receivedDate')) {
            return item; // Do not update
          }

          const updated = { ...item };
          let parsedVal = val;
          if (field === 'qty') parsedVal = Math.max(0, parseInt(val) || 0);
          if (field === 'unitCost') parsedVal = Math.max(0, parseFloat(val) || 0);
          if (field === 'unitTrade') parsedVal = Math.max(0, parseFloat(val) || 0);
          if (field === 'unitRetail') parsedVal = Math.max(0, parseFloat(val) || 0);
          updated[field] = parsedVal;
          return updated;
        }
        return item;
      }));
    }
  };


  // Handle stock status selection and enforce lock clearing rules
  const handleStockStatusChange = (itemOrItemIds, statusVal) => {
    const itemIds = Array.isArray(itemOrItemIds) ? itemOrItemIds : [itemOrItemIds];
    setActiveOrderItems(prev => prev.map(item => {
      if (itemIds.includes(item.id)) {
        const updated = {
          ...item,
          stockStatus: statusVal
        };

        if (statusVal === 'All Stock on Hand') {
          // Locked and cleared values
          updated.poDate = '';
          updated.poQtyOrdered = 0;
          updated.poEta = '';
          updated.receivedQty = 0;
          updated.receivedDate = '';
          updated.poRef = 'Stock on Hand';
          updated.poSupplier = 'Warehouse Inventory';
          updated.stockOnHand = item.qty || 0;
        } else if (statusVal === 'Partial Stock on Hand') {
          // Ensure receivedQty does not exceed poQtyOrdered on transition
          if ((updated.receivedQty || 0) > (updated.poQtyOrdered || 0)) {
            updated.receivedQty = updated.poQtyOrdered || 0;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteWaybill = (groupedItem, waybillRef, waybillDate) => {
    if (!window.confirm(`Are you sure you want to remove waybill "${waybillRef}"?`)) return;
    
    setActiveOrderItems(prev => {
      return prev.map(item => {
        if (groupedItem.itemIds.includes(item.id)) {
          const history = Array.isArray(item.deliveryHistory) ? item.deliveryHistory : [];
          const updatedHistory = history.filter(dh => !(dh.ref === waybillRef && dh.date === waybillDate));
          const newDeliveryQty = updatedHistory.reduce((sum, dh) => sum + (dh.qty || 0), 0);
          const latestDate = updatedHistory.map(dh => dh.date).filter(Boolean).reduce((latest, current) => current > latest ? current : latest, '');
          
          return {
            ...item,
            deliveryHistory: updatedHistory,
            deliveryQty: newDeliveryQty,
            deliveryDate: latestDate,
            deliveryStatus: newDeliveryQty >= item.qty ? 'Delivered' : newDeliveryQty > 0 ? 'Partial' : 'Pending'
          };
        }
        return item;
      });
    });
    
    setWaybillHistoryModalItem(prev => {
      if (!prev) return null;
      const updatedHistory = prev.deliveryHistory.filter(dh => !(dh.ref === waybillRef && dh.date === waybillDate));
      const newDeliveryQty = updatedHistory.reduce((sum, dh) => sum + (dh.qty || 0), 0);
      const latestDate = updatedHistory.map(dh => dh.date).filter(Boolean).reduce((latest, current) => current > latest ? current : latest, '');
      return {
        ...prev,
        deliveryHistory: updatedHistory,
        deliveryQty: newDeliveryQty,
        deliveryDate: latestDate,
        deliveryStatus: newDeliveryQty >= prev.qty ? 'Delivered' : newDeliveryQty > 0 ? 'Partial' : 'Pending'
      };
    });
  };


  // Populate row fields based on selected product from catalog
  const handleItemCodeChange = (itemId, newCode) => {
    const catalogItem = PRODUCT_CATALOG.find(p => p.code === newCode);
    if (catalogItem) {
      setActiveOrderItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            code: catalogItem.code,
            description: catalogItem.description,
            brand: catalogItem.brand,
            dimming: catalogItem.dimming,
            unitCost: catalogItem.unitCost,
            unitRetail: catalogItem.unitRetail
          };
        }
        return item;
      }));
    }
  };

  // Intercept unit cost/retail edits to check if item is used multiple times
  const handlePriceEdit = (itemId, field, val, itemCode) => {
    const parsedVal = Math.max(0, parseFloat(val) || 0);
    
    // Count how many times this item code is used
    const count = activeOrderItems.filter(item => item.code && item.code === itemCode).length;
    
    if (itemCode && itemCode !== 'CUSTOM' && count > 1) {
      // Trigger prompt modal
      setPendingPriceEdit({ itemId, field, value: parsedVal, code: itemCode });
    } else {
      // Apply single update directly
      handleUpdateSpreadsheetCell(itemId, field, parsedVal);
    }
  };

  // Add a new row to the active spreadsheet
  const handleAddSpreadsheetRow = () => {
    const newId = 'I-' + Date.now();
    const newRow = {
      id: newId,
      qty: 1,
      type: 'NEW',
      code: '',
      description: 'New custom fixture description',
      floor: 'Ground',
      area: 'TBD Area',
      dimming: 'Non-dim',
      brand: 'Delta Light',
      supplier: orderSupplier,
      unitCost: 100,
      unitTrade: 130,
      unitRetail: 150,
      selection: 'Selection',
      stockStatus: 'Ordered'
    };
    setActiveOrderItems(prev => [...prev, newRow]);
  };

  // Duplicate an existing row
  const handleDuplicateSpreadsheetRow = (item) => {
    const newId = 'I-' + Date.now();
    const duplicated = {
      ...item,
      id: newId,
      qty: 1
    };
    setActiveOrderItems(prev => [...prev, duplicated]);
  };

  // Delete a row
  const handleDeleteSpreadsheetRow = (itemId) => {
    setActiveOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Save the spreadsheet and update the global store context
  const handleSaveOrderSpreadsheet = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    // Calculate aggregated order totals from items list
    const totalCostTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
    const totalRetailTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
    const discountedValue = Math.max(0, totalRetailTotal * (1 - (Number(orderDiscount) || 0) / 100));
    const itemsCount = activeOrderItems.reduce((s, item) => s + (Number(item.qty) || 0), 0);
    const totalPriceInclVat = discountedValue * (1 + (Number(orderVatRate) / 100));
    const balanceOutstanding = Math.max(0, totalPriceInclVat - Number(orderPaidAmount));
    const depVal = totalPriceInclVat * 0.7;
    const balVal = totalPriceInclVat * 0.3;

    const updatedOrders = (proj.orders || []).map(o => {
      if (o.id === selectedOrderId) {
        return {
          ...o,
          supplier: orderSupplier,
          status: orderStatus,
          eta: orderEta,
          items: itemsCount,
          value: Math.round(discountedValue),
          costValue: Math.round(totalCostTotal),
          discount: Number(orderDiscount) || 0,
          paid: Number(orderPaidAmount) || 0,
          outstanding: Math.round(balanceOutstanding),
          itemsList: activeOrderItems,
          // Save order-specific adjusted metadata fields
          clientCompany,
          clientContact,
          clientPhone,
          clientEmail,
          projectFullName,
          projectTier,
          projectSize,
          electrician,
          electricianPhone,
          contractor,
          contractorPhone,
          interiorDesigner,
          interiorDesignerPhone,
          oneOneRep,
          pmName,
          pmPhone,
          pmEmail,
          deliveryAddress,
          billingDetails,
          orderDate,
          quotationSentDate,
          projectClass,
          fileSource,
          pfNumber,
          pfDate,
          depositInvoiceSent,
          pfInvoiceSentDate,
          commissionValue,
          depositPaymentDate,
          balancePaymentDate,
          ongoingTime,
          latestStatementSentDate,
          progressPaymentDateSent,
          dateCompleted,
          paymentResponse,
          vatRate: orderVatRate,
          depositValue: depVal,
          balanceValue: balVal,
          depositPercent: 70,
          balancePercent: 30,
          payments: orderPayments,
          documents: orderDocumentsHistory
        };
      }
      return o;
    });


    // Save back to dynamic project state
    updateProject(selectedProjectKey, 'orders', updatedOrders);

    // Calculate global margins for the project
    const designTotal = (proj.designFees || []).reduce((s, f) => s + (f.feeValue || 0), 0);
    const orderTotal = updatedOrders.reduce((s, o) => s + (o.value || 0), 0);
    const contractTotal = designTotal + orderTotal;
    
    const designMarginValue = (proj.designFees || []).reduce((s, f) => s + ((f.feeValue || 0) * ((f.margin || 20) / 100)), 0);
    const orderMarginValue = updatedOrders.reduce((s, o) => s + ((o.value || 0) - (o.costValue || 0)), 0);
    const totalProfit = designMarginValue + orderMarginValue;
    const blendedMargin = contractTotal > 0 ? Math.round((totalProfit / contractTotal) * 100) : 18;

    updateProject(selectedProjectKey, 'actualMargin', blendedMargin);

    alert(`Quotation Workspace Brain Synced!\n- Billed Value: R ${Math.round(discountedValue).toLocaleString()}\n- Total Cost: R ${Math.round(totalCostTotal).toLocaleString()}\n- Recalculated dynamic project blended margins to ${blendedMargin}%.`);
    setSelectedOrderId(null);
  };

  const handleBulkExcelExport = () => {
    if (selectedOrders.length === 0) {
      alert("Please select at least one order to export.");
      return;
    }

    const rows = [];
    selectedOrders.forEach(key => {
      const [projKey, orderId] = key.split('_');
      const proj = projects[projKey];
      if (!proj) return;
      const order = (proj.orders || []).find(o => o.id === orderId);
      if (!order) return;

      const items = order.itemsList || [];
      items.forEach(item => {
        const defaults = item.purchaseHistory?.length ? {
          purchaseHistory: item.purchaseHistory,
          receivingHistory: item.receivingHistory || [],
          deliveryHistory: item.deliveryHistory || [],
          invoiceHistory: item.invoiceHistory || []
        } : {};

        const pHist = item.purchaseHistory || defaults.purchaseHistory || [];
        const rHist = item.receivingHistory || defaults.receivingHistory || [];
        const dHist = item.deliveryHistory || defaults.deliveryHistory || [];
        const iHist = item.invoiceHistory || defaults.invoiceHistory || [];

        rows.push({
          "Order ID": order.id,
          "Quote Name": order.quote_name || "—",
          "Retail Value Ex VAT": Number(order.value) || 0,
          "Qty (Ordered)": item.qty || 0,
          "Item ID": item.id,

          "Item Code": item.code || "—",
          "Description": item.description || "—",
          "Stock Status": item.stockStatus !== undefined ? item.stockStatus : (item.stock_status || "—"),
          "Stock on Hand": item.stockOnHand !== undefined ? item.stockOnHand : (item.stock_on_hand || 0),
          "PO Reference": pHist.map(h => h.ref).join(', ') || "",
          "Supplier": pHist.map(h => h.supplier || item.supplier).join(', ') || item.supplier || "",
          "Date Ordered": pHist.map(h => h.date).join(', ') || "",
          "Qty Ordered (PO)": pHist.reduce((s, h) => s + (Number(h.qty) || 0), 0) || 0,
          "Delivery ETA": pHist.map(h => h.eta).join(', ') || "",
          "Qty REC": rHist.reduce((s, h) => s + (Number(h.qty) || 0), 0) || 0,
          "GRN Reference": rHist.map(h => h.ref).join(', ') || "",
          "Date REC": rHist.map(h => h.date).join(', ') || "",
          "Qty INV": iHist.reduce((s, h) => s + (Number(h.qty) || 0), 0) || 0,
          "Invoice Reference": iHist.map(h => h.ref).join(', ') || "",
          "Date INV": iHist.map(h => h.date).join(', ') || "",
          "Qty DEL": dHist.reduce((s, h) => s + (Number(h.qty) || 0), 0) || 0,
          "Date DEL": dHist.map(h => h.date).join(', ') || "",
          "Delivery Comments": item.deliveryComments || ""
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Ledger Items");
    
    // Auto-fit column widths
    const maxCols = rows.length > 0 ? Object.keys(rows[0]).length : 10;
    const wscols = [];
    for (let i = 0; i < maxCols; i++) {
      wscols.push({ wch: 18 });
    }
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Bulk_Ledger_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleGenerateReconciliationTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parseExcelDate = (val) => {
      if (!val) return "";
      if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
      }
      if (!isNaN(val)) {
        const valStr = String(val).trim();
        if (valStr.length === 8 && /^\d{8}$/.test(valStr)) {
          const d = valStr.substring(0, 2);
          const m = valStr.substring(2, 4);
          const y = valStr.substring(4, 8);
          return `${y}-${m}-${d}`;
        }
        const dateNum = Number(val);
        const dateObj = new Date((dateNum - 25569) * 86400 * 1000);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const parts = str.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        } else {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        }
      }
      const parsed = new Date(str);
      return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : str;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        let foundTemplate = false;
        const targetSheets = [];
        workbook.SheetNames.forEach(name => {
          if (name.trim().toLowerCase() === 'template') {
            foundTemplate = true;
            return;
          }
          if (foundTemplate) {
            targetSheets.push(name);
          }
        });

        if (targetSheets.length === 0) {
          alert("No order/project tabs found after the 'Template' sheet.");
          return;
        }

        const flatRows = [];

        targetSheets.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return;

          // Extract single header metadata values
          const getVal = (cellRef) => (sheet[cellRef] ? String(sheet[cellRef].v || '').trim() : '');
          
          const clientCompany = getVal('D2');
          const orderName = getVal('D3') || sheetName;
          const projectF5 = getVal('F5') || 'General Project';
          const deliveryAddress = getVal('D6');
          const salesRep = getVal('F1');
          const orderStatusG98 = getVal('G98');
          
          // Generate an Order Reference code
          const safeOrderRef = orderName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

          // We will parse rows 9 to 89
          for (let r = 9; r <= 89; r++) {
            const getRowVal = (col) => {
              const cell = sheet[`${col}${r}`];
              return cell ? cell.v : undefined;
            };

            const qty = Number(getRowVal('B'));
            if (isNaN(qty) || qty === 0) continue; // skip empty rows

            const oneOneCode = String(getRowVal('C') || '').trim();
            const itemCode = String(getRowVal('D') || '').trim();

            const description = String(getRowVal('E') || '').trim();
            const unitRetail = Number(getRowVal('F')) || 0;
            const unitCost = Number(getRowVal('I')) || 0;
            const brand = String(getRowVal('L') || '').trim();
            const supplier = String(getRowVal('M') || '').trim();
            const productType = String(getRowVal('N') || '').trim() || "Hardware";

            // Transactional columns
            const poRefFromSheet = String(getRowVal('Q') || '').trim(); 
            const poSupplier = String(getRowVal('R') || supplier || 'Warehouse Inventory').trim();
            const dateOrderedRaw = getRowVal('S');
            const dateOrdered = dateOrderedRaw ? parseExcelDate(dateOrderedRaw) : '';
            const etaRaw = getRowVal('T');
            const eta = etaRaw ? parseExcelDate(etaRaw) : '';

            const dateRecRaw = getRowVal('U');
            const dateRec = dateRecRaw ? parseExcelDate(dateRecRaw) : '';
            const qtyRec = Number(getRowVal('V')) || 0;

            const qtyInv = Number(getRowVal('Y')) || 0;
            const invoiceRef = String(getRowVal('Z') || '').trim();
            const dateInvRaw = getRowVal('AA');
            const dateInv = dateInvRaw ? parseExcelDate(dateInvRaw) : '';

            const deliveryComments = String(getRowVal('AC') || '').trim();

            // PO Reference from Column Q, fallback to generated if missing but ordered date present
            let poRef = poRefFromSheet;
            if (!poRef && dateOrdered) {
              const cleanDate = dateOrdered.replace(/[^0-9]/g, '');
              const cleanSupp = poSupplier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase();
              poRef = `PO-${safeOrderRef}-${cleanSupp}-${cleanDate}`;
            }

            // Auto-generate GRN Reference if received date and quantity exist
            let grnRef = '';
            if (dateRec && qtyRec > 0) {
              const cleanDate = dateRec.replace(/[^0-9]/g, '');
              grnRef = `GRN-${safeOrderRef}-${cleanDate}`;
            }

            // Auto-generate dynamic invoice reference if missing but invoice details exist
            let invRefValue = invoiceRef;
            if (!invRefValue && dateInv && qtyInv > 0) {
              const cleanDate = dateInv.replace(/[^0-9]/g, '');
              invRefValue = `INV-${safeOrderRef}-${cleanDate}`;
            }

            // Delivery reference auto-generated if comments present
            const deliveryRef = deliveryComments ? `DEL-${safeOrderRef}` : '';

            // Temporary unique ID
            const tempItemId = `ITEM-${safeOrderRef}-${oneOneCode || itemCode || 'FITTING'}-${r}`;

            // Extract deposit and payment values from sheet cells
            const depositInvoiceSent = getVal('D90') || 'No';
            const depositPaymentDate = getVal('D95') ? parseExcelDate(getVal('D95')) : '';
            const balancePaymentDate = getVal('D96') ? parseExcelDate(getVal('D96')) : '';
            const depositValue = Number(getVal('G95')) || 0;
            const balanceValue = Number(getVal('G96')) || 0;
            
            // Calculate a default amount paid
            let amountPaid = 0;
            if (depositPaymentDate) amountPaid += depositValue;
            if (balancePaymentDate) amountPaid += balanceValue;

            flatRows.push({
              "Project Key": projectF5.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
              "Project Name": projectF5,
              "Client Company": clientCompany,
              "Order ID": safeOrderRef,
              "Quote Name": orderName,
              "Sales Rep": salesRep,
              "Delivery Address": deliveryAddress,
              "Item ID": tempItemId,
              "Qty": qty,
              "1:1 Code": oneOneCode,
              "Item Code": itemCode,
              "Description": description,
              "Unit Cost Ex VAT": unitCost,
              "Unit Retail Price Ex VAT": unitRetail,
              "Brand": brand,
              "Supplier": supplier,
              "Item Type": productType,
              "Stock Status": "",
              "Stock on Hand": "",
              "Qty Ordered (PO)": "",
              "PO Supplier": poSupplier,
              "Date Ordered": dateOrdered,
              "PO Reference": poRef,
              "Delivery ETA": eta,

              "Qty REC": qtyRec > 0 ? qtyRec : "",
              "Date REC": dateRec,
              "GRN Reference": grnRef,
              "Qty INV": qtyInv > 0 ? qtyInv : "",
              "Invoice Reference": invRefValue,
              "Date INV": dateInv,
              "Qty DEL": "",
              "Date DEL": "",
              "Delivery Reference": deliveryRef,
              "Delivery Comments": deliveryComments,
              "Sheet Order Status": orderStatusG98,
              
              "Deposit Value": depositValue,
              "Deposit Invoice Sent": depositInvoiceSent,
              "Deposit Payment Date": depositPaymentDate,
              "Balance Value": balanceValue,
              "Balance Payment Date": balancePaymentDate,
              "Amount Paid": amountPaid
            });


          }
        });

        // Export the reconciliation flat sheet
        const worksheet = XLSX.utils.json_to_sheet(flatRows);
        const workbookOut = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbookOut, worksheet, "Reconciliation_Master");
        
        // Auto-fit column widths
        const wscols = [];
        if (flatRows.length > 0) {
          Object.keys(flatRows[0]).forEach(() => {
            wscols.push({ wch: 22 });
          });
          worksheet['!cols'] = wscols;
        }

        XLSX.writeFile(workbookOut, `Reconciliation_Master_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
        alert("Reconciliation spreadsheet successfully generated! Please fill in the Delivery quantities, project mappings, and upload back to the portal to overwrite.");
      } catch (err) {
        console.error("EXCEL EXTRACTION ERROR DETECTED:", err);
        alert(`Failed to extract template: ${err.message}. Please verify the Excel tabs match the expected layout.`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAuditExcelUpload = (file) => {
    if (!file) return;
    setAuditLoading(true);
    setAuditResult(null);
    setAuditProgress({ percent: 20, stage: 'Reading Master Excel workbook in browser...' });

    const parseExcelDate = (val) => {
      if (!val) return '';
      if (val instanceof Date) return !isNaN(val.getTime()) ? val.toISOString().split('T')[0] : '';
      const str = String(val).trim();
      if (!str) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        }
      }
      const parsed = new Date(str);
      return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : str;
    };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        let foundTemplate = false;
        const targetSheets = [];
        workbook.SheetNames.forEach(name => {
          if (name.trim().toLowerCase() === 'template') {
            foundTemplate = true;
            return;
          }
          if (foundTemplate) {
            targetSheets.push(name);
          }
        });

        if (targetSheets.length === 0) {
          const skipNames = new Set(['template', 'control', 'summary', 'instructions', 'readme', 'master']);
          workbook.SheetNames.forEach(name => {
            if (!skipNames.has(name.trim().toLowerCase())) {
              targetSheets.push(name);
            }
          });
        }

        if (targetSheets.length === 0) {
          alert("No order/project tabs found in the Excel workbook.");
          setAuditLoading(false);
          return;
        }

        setAuditProgress({ percent: 45, stage: `Extracting ${targetSheets.length} project tabs...` });

        const flatRows = [];

        targetSheets.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return;

          const getVal = (cellRef) => (sheet[cellRef] ? String(sheet[cellRef].v || '').trim() : '');
          
          const clientCompany = getVal('D2');
          const orderName = getVal('D3') || sheetName;
          const projectF5 = getVal('F5') || 'General Project';
          const deliveryAddress = getVal('D6');
          const salesRep = getVal('F1');
          const orderStatusG98 = getVal('G98') || 'Processing';
          
          const safeOrderRef = orderName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

          const depositInvoiceSent = getVal('D90') || 'No';
          const depositPaymentDate = parseExcelDate(sheet['D95'] ? sheet['D95'].v : undefined);
          const balancePaymentDate = parseExcelDate(sheet['D96'] ? sheet['D96'].v : undefined);
          const depositValue = Number(sheet['G95'] ? sheet['G95'].v : 0) || 0;
          const balanceValue = Number(sheet['G96'] ? sheet['G96'].v : 0) || 0;
          let amountPaid = 0;
          if (depositPaymentDate || depositValue > 0) amountPaid += depositValue;
          if (balancePaymentDate || balanceValue > 0) amountPaid += balanceValue;

          for (let r = 9; r <= 89; r++) {
            const getRowVal = (col) => {
              const cell = sheet[`${col}${r}`];
              return cell ? cell.v : undefined;
            };

            const qty = Number(getRowVal('B'));
            if (isNaN(qty) || qty === 0) continue;

            const oneOneCode = String(getRowVal('C') || '').trim();
            const itemCode = String(getRowVal('D') || '').trim();
            const description = String(getRowVal('E') || '').trim();
            const unitRetail = Number(getRowVal('F')) || 0;
            const unitCost = Number(getRowVal('I')) || 0;
            const brand = String(getRowVal('L') || '').trim();
            const supplier = String(getRowVal('M') || '').trim();
            const productType = String(getRowVal('N') || '').trim() || 'Hardware';

            const poRefFromSheet = String(getRowVal('Q') || '').trim(); 
            const poSupplier = String(getRowVal('R') || supplier || 'Warehouse Inventory').trim();
            const dateOrderedRaw = getRowVal('S');
            const dateOrdered = dateOrderedRaw ? parseExcelDate(dateOrderedRaw) : '';
            const etaRaw = getRowVal('T');
            const eta = etaRaw ? parseExcelDate(etaRaw) : '';

            const dateRecRaw = getRowVal('U');
            const dateRec = dateRecRaw ? parseExcelDate(dateRecRaw) : '';
            const qtyRec = Number(getRowVal('V')) || 0;

            const qtyInv = Number(getRowVal('Y')) || 0;
            const invoiceRef = String(getRowVal('Z') || '').trim();
            const dateInvRaw = getRowVal('AA');
            const dateInv = dateInvRaw ? parseExcelDate(dateInvRaw) : '';

            const deliveryComments = String(getRowVal('AC') || '').trim();

            let poRef = poRefFromSheet;
            if (!poRef && dateOrdered) {
              const cleanDate = dateOrdered.replace(/[^0-9]/g, '');
              const cleanSupp = poSupplier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toLowerCase();
              poRef = `PO-${safeOrderRef}-${cleanSupp}-${cleanDate}`;
            }

            let grnRef = '';
            if (dateRec && qtyRec > 0) {
              const cleanDate = dateRec.replace(/[^0-9]/g, '');
              grnRef = `GRN-${safeOrderRef}-${cleanDate}`;
            }

            let invRefValue = invoiceRef;
            if (!invRefValue && dateInv && qtyInv > 0) {
              const cleanDate = dateInv.replace(/[^0-9]/g, '');
              invRefValue = `INV-${safeOrderRef}-${cleanDate}`;
            }

            const deliveryRef = deliveryComments ? `DEL-${safeOrderRef}` : '';
            const tempItemId = `ITEM-${safeOrderRef}-${oneOneCode || itemCode || 'FITTING'}-${r}`;

            flatRows.push({
              "Project Key": projectF5.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase(),
              "Project Name": projectF5,
              "Client Company": clientCompany,
              "Order ID": safeOrderRef,
              "Quote Name": orderName,
              "Sales Rep": salesRep,
              "Delivery Address": deliveryAddress,
              "Item ID": tempItemId,
              "Qty": qty,
              "1:1 Code": oneOneCode,
              "Item Code": itemCode,
              "Description": description,
              "Unit Cost Ex VAT": unitCost,
              "Unit Retail Price Ex VAT": unitRetail,
              "Brand": brand,
              "Supplier": supplier,
              "Item Type": productType,
              "Stock Status": "",
              "Stock on Hand": "",
              "Qty Ordered (PO)": "",
              "PO Supplier": poSupplier,
              "Date Ordered": dateOrdered,
              "PO Reference": poRef,
              "Delivery ETA": eta,
              "Qty REC": qtyRec > 0 ? qtyRec : "",
              "Date REC": dateRec,
              "GRN Reference": grnRef,
              "Qty INV": qtyInv > 0 ? qtyInv : "",
              "Invoice Reference": invRefValue,
              "Date INV": dateInv,
              "Qty DEL": "",
              "Date DEL": "",
              "Delivery Reference": deliveryRef,
              "Delivery Comments": deliveryComments,
              "Sheet Order Status": orderStatusG98,
              "Deposit Value": depositValue,
              "Deposit Invoice Sent": depositInvoiceSent,
              "Deposit Payment Date": depositPaymentDate,
              "Balance Value": balanceValue,
              "Balance Payment Date": balancePaymentDate,
              "Amount Paid": amountPaid
            });
          }
        });

        setAuditProgress({ percent: 75, stage: `Cross-referencing Cloud SQL database & generating 3-tab heatmap (${flatRows.length} items)...` });

        const res = await fetch(`${API_BASE}/api/admin/audit-comparison/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            legacy_rows: flatRows,
            user_email: 'erin.jones@1-to-1.world'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Finalization failed');
        }

        const finalData = await res.json();
        setAuditProgress({ percent: 100, stage: 'Complete!' });
        setAuditResult(finalData);

      } catch (err) {
        console.error("Audit error:", err);
        alert(`Audit comparison failed: ${err.message}`);
      } finally {
        setAuditLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkExcelImport = (e) => {
    const file = e.target.files?.[0];

    const parseExcelDate = (val) => {
      if (!val) return "";
      if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
      }
      if (!isNaN(val)) {
        const valStr = String(val).trim();
        if (valStr.length === 8 && /^\d{8}$/.test(valStr)) {
          const d = valStr.substring(0, 2);
          const m = valStr.substring(2, 4);
          const y = valStr.substring(4, 8);
          return `${y}-${m}-${d}`;
        }
        const dateNum = Number(val);
        const dateObj = new Date((dateNum - 25569) * 86400 * 1000);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString().split('T')[0];
        }
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const parts = str.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        } else {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        }
      }
      const parsed = new Date(str);
      return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : str;
    };

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        
        let rows = [];
        workbook.SheetNames.forEach(sheetName => {
          // Skip known non-project metadata worksheets if any
          if (["Template", "Control", "Summary", "Instructions"].includes(sheetName)) return;
          const sheet = workbook.Sheets[sheetName];
          const sheetRows = XLSX.utils.sheet_to_json(sheet);
          if (sheetRows && sheetRows.length > 0) {
            rows = rows.concat(sheetRows);
          }
        });

        if (rows.length === 0) {
          alert("Imported sheet contains no data rows.");
          return;
        }

        // We will perform a complete wipe of the selected orders to start clean
        const projectUpdatesMap = {};
        const globalInvoicesList = [];

        // 1. Group records by unique Order ID
        rows.forEach(row => {

          const orderId = String(row["Order ID"] || "").trim();
          const projKey = String(row["Project Key"] || "general-spec").trim();
          const projName = String(row["Project Name"] || "General Project").trim();
          const clientCompany = String(row["Client Company"] || "—").trim();
          const quoteName = String(row["Quote Name"] || "General Spec").trim();
          const salesRep = String(row["Sales Rep"] || "—").trim();
          const deliveryAddress = String(row["Delivery Address"] || "").trim();
          
          if (!orderId) return;

          if (!projectUpdatesMap[projKey]) {
            projectUpdatesMap[projKey] = {
              projName,
              clientCompany,
              orders: {}
            };
          }

          if (!projectUpdatesMap[projKey].orders[orderId]) {
            projectUpdatesMap[projKey].orders[orderId] = {
              id: orderId,
              quote_name: quoteName,
              supplier: "Multiple Suppliers",
              pm: salesRep,
              pmName: salesRep !== '—' ? salesRep : '',
              salesRep: salesRep !== '—' ? salesRep : '',
              clientCompany: clientCompany !== '—' ? clientCompany : '',
              clientContact: clientCompany !== '—' ? clientCompany : '',
              deliveryAddress,
              value: 0,
              paid: 0,
              outstanding: 0,
              status: "Processing",
              orderDate: parseExcelDate(row["Date Ordered"]) || new Date().toISOString().split('T')[0],
              quotationSentDate: parseExcelDate(row["Quotation Sent Date"]) || parseExcelDate(row["Date Ordered"]),
              pfDate: parseExcelDate(row["PF Date"]) || parseExcelDate(row["Date Ordered"]),
              
              depositValue: Number(row["Deposit Value"]) || 0,
              depositInvoiceSent: String(row["Deposit Invoice Sent"] || "No").trim(),
              depositPaymentDate: parseExcelDate(row["Deposit Payment Date"]) || "",
              balanceValue: Number(row["Balance Value"]) || 0,
              balancePaymentDate: parseExcelDate(row["Balance Payment Date"]) || "",
              payments: [],

              itemsList: [],
              purchaseOrders: [],
              goodsReceivedNotes: [],
              clientInvoices: [],
              packingLists: [],
              deliveryNotes: []
            };
          }

          const targetOrder = projectUpdatesMap[projKey].orders[orderId];

          // Parse and populate dynamic payments list
          const depVal = Number(row["Deposit Value"]) || 0;
          const depDate = parseExcelDate(row["Deposit Payment Date"]) || "";
          const balVal = Number(row["Balance Value"]) || 0;
          const balDate = parseExcelDate(row["Balance Payment Date"]) || "";
          const amtPaid = Number(row["Amount Paid"]) || 0;

          targetOrder.depositValue = depVal;
          targetOrder.depositInvoiceSent = String(row["Deposit Invoice Sent"] || "No").trim();
          targetOrder.depositPaymentDate = depDate;
          targetOrder.balanceValue = balVal;
          targetOrder.balancePaymentDate = balDate;
          targetOrder.paid = amtPaid;

          const pList = [];
          if (depDate && depVal > 0) {
            pList.push({
              date: depDate,
              amount: depVal,
              type: "Deposit Payment",
              reference: "Imported Deposit"
            });
          }
          if (balDate && balVal > 0) {
            pList.push({
              date: balDate,
              amount: balVal,
              type: "Balance Payment",
              reference: "Imported Balance"
            });
          }
          // If amount paid is manually set but doesn't match dates, add fallback payment
          if (amtPaid > 0 && pList.length === 0) {
            pList.push({
              date: targetOrder.orderDate || new Date().toISOString().split('T')[0],
              amount: amtPaid,
              type: "Deposit Payment",
              reference: "Imported Pre-payment"
            });
          }
          targetOrder.payments = pList;

          // If a subsequent row has valid dates, make sure we backport them to targetOrder
          const rowDateOrdered = parseExcelDate(row["Date Ordered"]);
          if (rowDateOrdered) {
            targetOrder.orderDate = rowDateOrdered;
          }
          const rowQuotationSent = parseExcelDate(row["Quotation Sent Date"]);
          if (rowQuotationSent) {
            targetOrder.quotationSentDate = rowQuotationSent;
          }
          const rowPfDate = parseExcelDate(row["PF Date"]);
          if (rowPfDate) {
            targetOrder.pfDate = rowPfDate;
          }
          const rowInvRef = String(row["Invoice Reference"] || "").trim();
          if (rowInvRef) {
            targetOrder.invoiceRef = rowInvRef;
          }
          const rowDateInv = parseExcelDate(row["Date INV"]);
          if (rowDateInv) {
            targetOrder.invoiceDate = rowDateInv;
          }

          const qty = Number(row["Qty"]) || 0;
          const unitCost = Number(row["Unit Cost Ex VAT"]) || 0;
          const unitRetail = Number(row["Unit Retail Price Ex VAT"]) || 0;
          const itemCode = String(row["Item Code"] || "").trim();
          const description = String(row["Description"] || "").trim();
          const oneOneCode = String(row["1:1 Code"] || "").trim();
          const brand = String(row["Brand"] || "").trim();
          const supplier = String(row["Supplier"] || "").trim();
          const itemType = String(row["Item Type"] || "Hardware").trim();
          const isCredit = qty < 0;

          // Rebuild histories
          const poRef = String(row["PO Reference"] || "").trim();
          const dateOrdered = parseExcelDate(row["Date Ordered"]);
          const poQty = Number(row["Qty Ordered (PO)"]) || 0;
          const poSupplier = String(row["PO Supplier"] || supplier).trim();
          const poEta = parseExcelDate(row["Delivery ETA"]) || "TBD";

          const purchaseHistory = [];
          if (poRef && dateOrdered && poQty !== 0) {
            purchaseHistory.push({
              id: poRef,
              ref: poRef,
              date: dateOrdered,
              qty: poQty,
              eta: poEta,
              supplier: poSupplier
            });
          }

          const grnRef = String(row["GRN Reference"] || "").trim();
          const dateRec = parseExcelDate(row["Date REC"]);
          const qtyRec = Number(row["Qty REC"]) || 0;

          const receivingHistory = [];
          if (grnRef && dateRec && qtyRec !== 0) {
            receivingHistory.push({
              qty: qtyRec,
              ref: grnRef,
              poId: poRef || `PO-${orderId}`,
              date: dateRec
            });
          }

          const invRef = String(row["Invoice Reference"] || "").trim();
          const dateInv = parseExcelDate(row["Date INV"]);
          let qtyInv = Number(row["Qty INV"]) || 0;
          if (invRef && dateInv && qtyInv === 0 && qty !== 0) {
            qtyInv = Math.abs(qty);
          }

          const invoiceHistory = [];
          if (invRef && dateInv) {
            invoiceHistory.push({
              qty: qtyInv,
              ref: invRef,
              date: dateInv,
              rate: unitRetail
            });
          }

          let delRef = String(row["Delivery Reference"] || "").trim();
          let dateDel = parseExcelDate(row["Date DEL"]);
          const qtyDel = Number(row["Qty DEL"]) || 0;
          const delComments = String(row["Delivery Comments"] || "").trim();

          if (qtyDel > 0) {
            if (!delRef) {
              delRef = `DN-${orderId}-auto`;
            }
            if (!dateDel) {
              dateDel = dateRec || new Date().toISOString().split('T')[0];
            }
          }

          const deliveryHistory = [];
          if (delRef && dateDel && qtyDel !== 0) {
            deliveryHistory.push({
              qty: qtyDel,
              ref: delRef,
              date: dateDel
            });
          }

          const targetItem = {
            id: String(row["Item ID"] || `ITEM-${orderId}-${itemCode}-${Date.now()}`),
            qty: Math.abs(qty),
            code: itemCode,
            oneOneCode: oneOneCode,
            description,
            unitCost,
            unitRetail,
            brand,
            supplier,
            itemType,
            isCredit,
            is_credit: isCredit,
            stockStatus: String(row["Stock Status"] || "").trim(),
            stockOnHand: Number(row["Stock on Hand"]) || 0,
            poQtyOrdered: isCredit ? 0 : poQty,
            receivedQty: isCredit ? 0 : qtyRec,
            invoiceQty: qtyInv,
            deliveryQty: isCredit ? 0 : qtyDel,
            receivedDate: isCredit ? "" : dateRec,
            invoiceDate: dateInv,
            deliveryDate: isCredit ? "" : dateDel,
            invoiceRef: invRef,
            deliveryStatus: isCredit ? "Complete" : (qtyDel >= Math.abs(qty) ? "Delivered" : "Pending"),
            deliveryComments: delComments,
            purchaseHistory,

            receivingHistory,
            invoiceHistory,
            deliveryHistory
          };


          targetOrder.itemsList.push(targetItem);
          if (!isCredit) {
            targetOrder.value += (Math.abs(qty) * unitRetail);
          }
        });

        // 2. Perform Grouping for headers and write back to portal
        Object.entries(projectUpdatesMap).forEach(([projKey, projObj]) => {
          let project = projects[projKey];
          
          // Auto-create project if missing
          if (!project) {
            project = {
              key: projKey,
              name: projObj.projName,
              client: projObj.clientCompany,
              orders: []
            };
            projects[projKey] = project;
          }

          let currentOrdersList = [...(project.orders || [])];
 
          Object.values(projObj.orders).forEach(newOrder => {
            newOrder.outstanding = Math.max(0, newOrder.value - newOrder.paid);
            const hardwareItems = newOrder.itemsList.filter(item => !item.isCredit && item.itemType !== 'Service');
            const allItems = newOrder.itemsList;
 
            // Generate Grouped Document Headers
            const poGroups = {};
            hardwareItems.forEach(item => {
              const pHist = item.purchaseHistory?.[0];
              if (!pHist) return;
              const key = `${pHist.ref}_${pHist.date}_${pHist.supplier}`;
              if (!poGroups[key]) poGroups[key] = [];
              poGroups[key].push({
                code: item.code || 'NO-CODE',
                description: item.description,
                qtyAction: pHist.qty,
                eta: pHist.eta
              });
            });
 
            Object.entries(poGroups).forEach(([key, items]) => {
              const [ref, date, supplier] = key.split('_');
              newOrder.purchaseOrders.push({
                id: ref,
                date: date,
                supplier,
                notes: 'Reconciled Bulk PO',
                items
              });
            });
 
            const grnGroups = {};
            hardwareItems.forEach(item => {
              const rHist = item.receivingHistory?.[0];
              if (!rHist) return;
              const key = `${rHist.ref}_${rHist.date}_${rHist.poId}`;
              if (!grnGroups[key]) grnGroups[key] = [];
              grnGroups[key].push({
                code: item.code || 'NO-CODE',
                description: item.description,
                qtyAction: rHist.qty
              });
            });
 
            Object.entries(grnGroups).forEach(([key, items]) => {
              const [ref, date, poId] = key.split('_');
              newOrder.goodsReceivedNotes.push({
                id: ref,
                poId,
                date: date,
                notes: 'Reconciled Bulk GRN',
                items
              });
            });
 
            const invGroups = {};
            allItems.forEach(item => {
              const iHist = item.invoiceHistory?.[0];
              if (!iHist) return;
              const key = `${iHist.ref}_${iHist.date}`;
              if (!invGroups[key]) invGroups[key] = [];
              invGroups[key].push({
                code: item.code || 'NO-CODE',
                description: item.description,
                qtyAction: iHist.qty,
                rate: iHist.rate
              });
            });
 
            Object.entries(invGroups).forEach(([key, items]) => {
              const [ref, date] = key.split('_');
              newOrder.clientInvoices.push({
                id: ref,
                date: date,
                notes: 'Reconciled Bulk Invoice',
                items
              });
 
              const totalValue = items.reduce((s, it) => s + ((Number(it.qtyAction) || 0) * (Number(it.rate) || 0)), 0);
              
              globalInvoicesList.push({
                id: ref,
                project: newOrder.projectName || projObj.projName,
                client: newOrder.clientCompany || projObj.clientCompany || '—',
                amount: `R ${Math.round(totalValue).toLocaleString()}`,
                issued: date,
                due: date,
                status: 'Unpaid',
                paid: false,
                type: 'order_invoice',
                projectKey: projKey,
                orderId: newOrder.id,
                items: items,
                notes: 'Reconciled Bulk Invoice'
              });
            });
 
            // Rebuild Packing Lists and Delivery Notes
            const delGroups = {};
            hardwareItems.forEach(item => {
              const dHist = item.deliveryHistory?.[0];
              if (!dHist) return;
              const key = `${dHist.ref}_${dHist.date}`;
              if (!delGroups[key]) delGroups[key] = [];
              delGroups[key].push({
                id: item.id,
                code: item.code || 'NO-CODE',
                type: item.itemType || 'Fittings',
                description: item.description,
                qtyDelivered: dHist.qty,
                boxNumber: 'Box 1',
                redList: 'No',
                firstFix: 'No'
              });
            });
 
            Object.entries(delGroups).forEach(([key, items]) => {
              const [ref, date] = key.split('_');
              newOrder.packingLists.push({
                id: `PL-${ref}`,
                date: date,
                notes: 'Reconciled Bulk PL',
                items,
                deliveryNoteId: ref
              });
 
              newOrder.deliveryNotes.push({
                id: ref,
                date: date,
                notes: 'Reconciled Bulk DN',
                items
              });
            });
 
             // Remove existing matched order first to perform a clean overwrite in the database
            currentOrdersList = currentOrdersList.filter(o => o.id !== newOrder.id);
            currentOrdersList.push(newOrder);
          });
          projectUpdatesMap[projKey].finalOrdersList = currentOrdersList;
        });

        // 3. Compute in-memory summary of changes for user review
        const summaryProjectsList = Object.entries(projectUpdatesMap).map(([projKey, projObj]) => {
          return {
            key: projKey,
            name: projObj.projName,
            ordersCount: Object.keys(projObj.orders).length
          };
        });

        const totalOrdersCount = Object.values(projectUpdatesMap).reduce((acc, current) => {
          return acc + Object.keys(current.orders).length;
        }, 0);

        setPendingImportData({
          projectUpdatesMap,
          globalInvoicesList
        });

        setReconcileSummary({
          totalRows: rows.length,
          totalOrders: totalOrdersCount,
          projectsList: summaryProjectsList
        });

      } catch (err) {
        console.error("IMPORT ERROR DETECTED:", err);
        alert(`Failed to parse reconciliation sheet: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 4. Executed when user clicks "Confirm Import" inside summary modal
  const executeBulkImportSync = async () => {
    if (!pendingImportData) return;
    const { projectUpdatesMap, globalInvoicesList } = pendingImportData;
    
    setReconcileSummary(null); // Close summary screen
    
    const entries = Object.entries(projectUpdatesMap);
    setImportProgress({
      statusText: "Initializing batch updates...",
      percent: 0,
      total: entries.length,
      current: 0
    });

    let isCancelled = false;
    window.currentImportAbortController = () => {
      isCancelled = true;
    };

    try {
      for (let index = 0; index < entries.length; index++) {
        if (isCancelled) {
          alert("Import cancelled by user. Note: Projects synced up to this point have been successfully saved.");
          setImportProgress(null);
          window.location.reload();
          return;
        }

        const [projKey, projObj] = entries[index];
        setImportProgress({
          statusText: `Project: "${projObj.projName}" (Project ${index + 1} of ${entries.length} projects)`,
          percent: Math.round((index / entries.length) * 100),
          total: entries.length,
          current: index
        });

        // Trigger updates sequentially via fast single project transaction
        const response = await fetch(`${API_BASE}/api/projects/reconcile-project-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_key: projKey,
            proj_name: projObj.projName,
            client_company: projObj.clientCompany || '—',
            orders: projObj.orders
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || `Server failed to process project "${projObj.projName}"`);
        }
      }

      setImportProgress({
        statusText: "Registering global invoices...",
        percent: 95,
        total: entries.length,
        current: entries.length
      });

      // Sync global invoices
      if (globalInvoicesList.length > 0) {
        setInvoices(prev => {
          const nextInvs = prev.filter(x => !globalInvoicesList.some(n => n.id === x.id));
          globalInvoicesList.forEach(newInv => {
            nextInvs.unshift(newInv);
          });
          return nextInvs;
        });
      }

      // Auto-register new Project Managers into projectManagers state list
      const extractedPms = new Set();
      entries.forEach(([_, projObj]) => {
        const firstOrd = Object.values(projObj.orders || {})[0];
        if (firstOrd) {
          const rep = firstOrd.pmName || firstOrd.salesRep || firstOrd.pm;
          if (rep && rep !== '—' && rep !== 'Select Project Manager...') {
            extractedPms.add(rep.trim());
          }
        }
      });
      if (extractedPms.size > 0) {
        setProjectManagers(prev => {
          const updated = [...prev];
          extractedPms.forEach(pmNameStr => {
            const exists = updated.some(p => p && p.name && (p.name.toLowerCase() === pmNameStr.toLowerCase() || p.name.toLowerCase().includes(pmNameStr.toLowerCase())));
            if (!exists) {
              updated.push({
                id: `pm-imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: pmNameStr,
                email: `${pmNameStr.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world`,
                phone: '083 570 7795',
                active: true
              });
            }
          });
          return updated;
        });
      }

      setImportProgress({
        statusText: "Completing write operations...",
        percent: 100,
        total: entries.length,
        current: entries.length
      });
 
      alert("Success! Reconciled overwrite import completed successfully. Re-loading the workspace...");
      window.location.reload();
    } catch (error) {
      console.error("IMPORT UPDATE EXCEPTION:", error);
      alert(`Import failed: ${error.message}`);
      setImportProgress(null);
    }
  };



  // SAVE NEW DOCUMENT RUN TO HISTORY
  const handleSaveDocumentToHistory = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    const docItems = activeOrderItems.map(item => ({
      id: item.id,
      code: item.code,
      description: item.description,
      brand: item.brand,
      type: item.type,
      area: item.area,
      floor: item.floor,
      dimming: item.dimming,
      qtyAction: Number(actionQuantities[item.id]) !== undefined ? Number(actionQuantities[item.id]) : Number(item.qty),
      unitRetailAction: Number(priceOverrides[item.id]) !== undefined ? Number(priceOverrides[item.id]) : Number(item.unitRetail)
    }));

    const newDocId = activeDocType.toUpperCase().substring(0, 3) + '-' + selectedOrderId + '-' + (orderDocumentsHistory.length + 1);
    const newDoc = {
      id: newDocId,
      type: activeDocType,
      dateCreated: new Date().toLocaleDateString('en-GB'),
      customTerms,
      items: docItems
    };

    const updatedHistory = [...orderDocumentsHistory, newDoc];
    setOrderDocumentsHistory(updatedHistory);

    // Auto-save to parent order container in global state
    const updatedOrders = (proj.orders || []).map(o => {
      if (o.id === selectedOrderId) {
        return {
          ...o,
          documents: updatedHistory
        };
      }
      return o;
    });
    updateProject(selectedProjectKey, 'orders', updatedOrders);

    alert(`Successfully saved ${activeDocType.toUpperCase()} document (${newDocId}) to order history!`);
  };

  // Create a brand-new Purchase Order / Quotation
  const handleCreatePo = (e) => {
    e.preventDefault();
    const proj = projects[newPoForm.projectKey];
    if (!proj) return;

    const newPoId = 'Q-2026-0' + (allOrders.length + 42);
    const newOrder = {
      id: newPoId,
      supplier: newPoForm.supplier,
      items: 1,
      value: 1500,
      paid: 0,
      outstanding: 1500,
      status: newPoForm.status,
      eta: newPoForm.eta,
      costValue: 900,
      discount: 0,
      itemsList: [
        {
          id: 'I-' + Date.now(),
          qty: 1,
          type: 'DL-01',
          code: '28402 9240 W',
          description: 'Default Downlight Spec fixture',
          floor: 'Ground',
          area: 'Lobby',
          dimming: 'Non-dim',
          brand: 'Delta Light',
          supplier: newPoForm.supplier,
          unitCost: 900,
          unitTrade: 1200,
          unitRetail: 1500,
          selection: 'Selection',
          stockStatus: 'Ordered'
        }
      ]
    };

    const updatedOrders = [...(proj.orders || []), newOrder];
    updateProject(newPoForm.projectKey, 'orders', updatedOrders);
    
    setShowCreatePoModal(false);
    handleOpenWorkspace({
      ...newOrder,
      projectKey: newPoForm.projectKey,
      projectName: proj.name,
      projectClient: proj.client
    });
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTION FOR PREMIUM CLEAN DOCUMENT PRINTING & GS-CELLS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-document-canvas, #print-document-canvas * {
            visibility: visible !important;
          }
          #print-document-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: #0f172a !important;
          }
        }
        .gs-cell-input {
          width: 100% !important;
          height: 100% !important;
          min-height: 32px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          padding: 6px 8px !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          font-family: inherit !important;
          outline: none !important;
          text-align: inherit !important;
          transition: box-shadow 0.1s ease, background-color 0.1s ease !important;
        }
        .gs-cell-input:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
        .gs-cell-select {
          width: 100% !important;
          height: 100% !important;
          min-height: 32px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          padding: 4px 8px !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          font-family: inherit !important;
          outline: none !important;
          transition: box-shadow 0.1s ease, background-color 0.1s ease !important;
        }
        .gs-cell-select:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
      `}</style>

      {/* HEADER BANNER */}
      {selectedOrderId === null ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Sales Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Central Quotations & Area-by-Area BOQ Builder</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Sales Tracker Mirror View Dashboard
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {projectFilterKey !== 'All' && (
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setProjectFilterKey('All')}
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}
                  >
                    Clear Project Filter ×
                  </button>
                )}
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowCreatePoModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Create Sales Order
                </button>
              </div>
            </div>
          </div>

          {/* Date range filter banner */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Calendar size={15} color="var(--text-info)" />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Filter Orders by Date:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', height: 'auto', fontSize: '11.5px', borderRadius: '6px' }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom Range:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11.5px' }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11.5px' }}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
              />
            </div>
          </div>

          {/* KPI STATS GRID */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all')}
              style={{ border: activeKpiFilter === 'all' ? '2.5px solid var(--text-info)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Orders</span>
                <Layers size={14} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.all.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-info)', marginTop: '4px' }}>
                R {kpis.all.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.all.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.all.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'pending' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'pending' ? null : 'pending')}
              style={{ border: activeKpiFilter === 'pending' ? '2.5px solid var(--text-warning)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Orders</span>
                <Clock size={14} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.pending.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-warning)', marginTop: '4px' }}>
                R {kpis.pending.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.pending.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.pending.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'active' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')}
              style={{ border: activeKpiFilter === 'active' ? '2.5px solid var(--text-success)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Orders</span>
                <Play size={14} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.active.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-success)', marginTop: '4px' }}>
                R {kpis.active.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.active.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.active.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'complete' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'complete' ? null : 'complete')}
              style={{ border: activeKpiFilter === 'complete' ? '2.5px solid var(--text-muted)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Complete Orders</span>
                <CheckCircle size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.complete.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px' }}>
                R {kpis.complete.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.complete.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.complete.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>



          {/* SEARCH, FILTER & LEDGER GRID */}
          <div className="card" style={{ border: '1.5px solid var(--border)' }}>
            <div className="card-body" style={{ padding: '20px' }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text"
                      placeholder="Search Order ID, Order name, Linked Project, Client or PM..."
                      className="form-control"
                      style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="form-control"
                    style={{ width: '130px', height: '34px', fontSize: '13px' }}
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={projectFilterKey}
                    onChange={e => setProjectFilterKey(e.target.value)}
                  >
                    <option value="All">All Projects</option>
                    {Array.from(new Set(allOrders.map(o => o.projectName).filter(Boolean))).sort().map(projName => {
                      const foundObj = allOrders.find(o => o.projectName === projName);
                      return (
                        <option key={foundObj.projectKey} value={foundObj.projectKey}>{projName}</option>
                      );
                    })}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                  >
                    <option value="All">All Clients</option>
                    {Array.from(new Set(allOrders.map(o => o.projectClient).filter(Boolean))).sort().map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={pmFilter}
                    onChange={e => setPmFilter(e.target.value)}
                  >
                    <option value="All">All PMs</option>
                    {Array.from(new Set(allOrders.map(o => o.projectPm).filter(Boolean))).sort().map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={paymentStatusFilter}
                    onChange={e => setPaymentStatusFilter(e.target.value)}
                  >
                    <option value="All">All Payments</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredOrders.length}</strong> active sales records
                </div>
              </div>

              {/* BULK OPERATIONS CONTROL BAR */}
              <div 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-strong)', 
                  borderRadius: '8px', 
                  padding: '12px 16px', 
                  marginBottom: '15px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '12px' 
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ⚙️ Bulk Document Operations ({selectedOrders.length} orders selected)
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline" 
                    onClick={handleBulkExcelExport}
                    disabled={selectedOrders.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '30px', fontSize: '12px' }}
                  >
                    📥 Export Selected to Excel
                  </button>

                  <span style={{ borderLeft: '1px solid var(--border)', height: '20px', margin: '0 4px' }}></span>

                  <label 
                    className="btn btn-sm btn-secondary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '30px', margin: 0, fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    🔍 1. Extract Reconciliation Template
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleGenerateReconciliationTemplate} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  <label 
                    className="btn btn-sm btn-primary" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', height: '30px', margin: 0, fontSize: '12px' }}
                  >
                    📤 2. Upload Reconciled Overwrite Sheet
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      onChange={handleBulkExcelImport} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setShowAuditModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '30px', margin: 0, fontSize: '12px', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: '4px', fontWeight: 700 }}
                  >
                    🔍 3. Live Read-Only Audit Heatmap
                  </button>
                </div>

              </div>

              {/* ORDERS LEDGER LIST */}
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', position: 'relative' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={sortedOrders.length > 0 && selectedOrders.length === sortedOrders.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedOrders(sortedOrders.map(o => `${o.projectKey}_${o.id}`));
                            } else {
                              setSelectedOrders([]);
                            }
                          }}
                        />
                      </th>
                      <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order ID {renderSortIcon('id')}</div>
                      </th>
                      <th onClick={() => handleSort('quote_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Name {renderSortIcon('quote_name')}</div>
                      </th>
                      <th onClick={() => handleSort('project')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Linked Project {renderSortIcon('project')}</div>
                      </th>
                      <th onClick={() => handleSort('client')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Client {renderSortIcon('client')}</div>
                      </th>
                      <th onClick={() => handleSort('pm')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project Manager {renderSortIcon('pm')}</div>
                      </th>
                      <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Margin {renderSortIcon('margin')}</div>
                      </th>
                      <th onClick={() => handleSort('value')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Value {renderSortIcon('value')}</div>
                      </th>
                      <th onClick={() => handleSort('paid')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Amount Paid {renderSortIcon('paid')}</div>
                      </th>
                      <th onClick={() => handleSort('outstanding')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Balance Outstanding {renderSortIcon('outstanding')}</div>
                      </th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Status {renderSortIcon('status')}</div>
                      </th>
                      <th onClick={() => handleSort('paymentStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Payment Status {renderSortIcon('paymentStatus')}</div>
                      </th>
                      <th onClick={() => handleSort('procPct')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Procurement % {renderSortIcon('procPct')}</div>
                      </th>
                      <th onClick={() => handleSort('invPct')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Invoiced % {renderSortIcon('invPct')}</div>
                      </th>
                      <th onClick={() => handleSort('delPct')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Delivered % {renderSortIcon('delPct')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map(o => {
                      const cost = o.costValue || 0;
                      const retail = o.value || 0;
                      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                      const isLowMargin = margin < 39;
                      const isSelected = selectedOrders.includes(`${o.projectKey}_${o.id}`);

                      return (
                        <tr 
                          key={o.id} 
                          className="clickable" 
                          onClick={() => handleOpenWorkspace(o)}
                          style={{ background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={e => {
                                const key = `${o.projectKey}_${o.id}`;
                                if (e.target.checked) {
                                  setSelectedOrders(prev => [...prev, key]);
                                } else {
                                  setSelectedOrders(prev => prev.filter(k => k !== key));
                                }
                              }}
                            />
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.quote_name || 'General Spec'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${o.projectKey}`); }}>{o.projectFullName || o.projectName}</td>
                          <td style={{ color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate('/crm', { state: { selectedClientName: (o.clientContact || o.projectClient) } }); }}>{(o.clientCompany || o.projectClient) || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{o.projectPm || '—'}</td>
                          <td style={{ fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {margin}% {isLowMargin && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: '3px' }} />}
                          </td>
                          <td style={{ fontWeight: 600 }}>R {retail.toLocaleString()}</td>
                          <td style={{ color: 'var(--text-success)' }}>R {(o.paid || 0).toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: (o.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                            R {(o.outstanding || 0).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${statusColor[o.status] || 'b-default'}`}>{o.status}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                                o.paymentStatus === 'Fully Paid' ? 'b-success' : o.paymentStatus === 'Partially Paid' ? 'b-warning' : 'b-danger'
                              }`}>{o.paymentStatus}</span>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80' }}>
                              Proc: {o.procPct || 0}%
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
                              Inv: {o.invPct || 0}%
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(96, 165, 250, 0.08)', color: '#60a5fa' }}>
                              Del: {o.delPct || 0}%
                            </div>
                          </td>
                        </tr>

                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={14} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No active quotations or Bills of Quantity found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </>

      ) : (
        
        /* THE STANDALONE SPECIFICATION SPREADSHEET ENGINE WORKSPACE */
        <div className="card" style={{ border: '1.5px solid var(--border)' }}>
          <div className="card-body" style={{ padding: '24px' }}>
            
            {/* WORKSPACE TOP NAV HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: '4px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      if (confirm('Exit Workspace? Ensure you have saved your revisions.')) setSelectedOrderId(null);
                    }}
                  >
                    <ArrowLeft size={12} /> Back to Ledger
                  </button>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', background: 'rgba(59,130,246,0.15)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Sales Tracker Workspace Engine
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {quoteName} — <span style={{ color: 'var(--text-info)' }}>{selectedOrderId}</span>
                </h2>
              </div>
              
              {/* Vitals Grid and Actions Container */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {(() => {
                  const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
                  const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
                  const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  const overallMargin = discountedRetail > 0 ? Math.round(((discountedRetail - totalCost) / discountedRetail) * 100) : 0;
                  
                  // Calculate dynamic status and percentages
                  let totalQtyForProc = 0;
                  let totalProcQty = 0;
                  let totalQtyForInv = 0;
                  let totalInvQty = 0;
                  let totalQtyForDel = 0;
                  let totalDelQty = 0;

                  activeOrderItems.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
                    const q = Number(item.qty) || 0;
                    const isService = (item.itemType || item.item_type) === 'Service';
                    const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : 0;

                    if (isService) {
                      totalQtyForInv += q;
                      totalInvQty += Number(invoiced) || 0;
                      return;
                    }

                    totalQtyForProc += q;
                    totalQtyForInv += q;
                    totalQtyForDel += q;

                    const received = item.receivedQty !== undefined ? item.receivedQty : 0;
                    const delivered = item.deliveryQty !== undefined ? item.deliveryQty : 0;
                    const stockStatus = item.stockStatus !== undefined ? item.stockStatus : '';

                    totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
                    totalInvQty += Number(invoiced) || 0;
                    totalDelQty += Number(delivered) || 0;
                  });

                  const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
                  const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
                  const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

                  const valueInclVat = discountedRetail * 1.15;
                  let paymentStatus = 'Unpaid';
                  if (orderPaidAmount > 0) {
                    if (orderPaidAmount >= valueInclVat - 1) {
                      paymentStatus = 'Fully Paid';
                    } else {
                      paymentStatus = 'Partially Paid';
                    }
                  }

                  let computedStatus = orderStatus || 'Pending';
                  if (computedStatus !== 'Draft' && computedStatus !== 'Cancelled') {
                    const isFullyPaid = paymentStatus === 'Fully Paid';
                    if (orderPaidAmount === 0 && procPct === 0 && delPct === 0) {
                      computedStatus = 'Pending';
                    } else if (procPct === 100 && invPct === 100 && delPct === 100 && isFullyPaid) {
                      computedStatus = 'Complete';
                    } else {
                      computedStatus = 'Ongoing';
                    }
                  }

                  let progressPct = 0;
                  if (computedStatus === 'Complete') {
                    progressPct = 100;
                  } else if (computedStatus === 'Ongoing') {
                    progressPct = 50;
                  }

                  const balanceOutstanding = Math.max(0, valueInclVat - Number(orderPaidAmount));

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.2fr 1.2fr 1.2fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.6)', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minWidth: '700px' }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Order Status</span>
                          <span className={`badge ${computedStatus === 'Complete' ? 'b-success' : computedStatus === 'Ongoing' ? 'b-info' : computedStatus === 'Pending' ? 'b-warning' : 'b-default'}`} style={{ fontSize: '10.5px', display: 'inline-block', marginTop: '2px' }}>{computedStatus}</span>
                        </div>
                        <div style={{ borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80' }}>
                            <span>Proc:</span> <span style={{ color: 'var(--text-primary)' }}>{procPct}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
                            <span>Inv:</span> <span style={{ color: 'var(--text-primary)' }}>{invPct}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(96, 165, 250, 0.08)', color: '#60a5fa' }}>
                            <span>Del:</span> <span style={{ color: 'var(--text-primary)' }}>{delPct}%</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Order Value</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>R {Math.round(valueInclVat).toLocaleString()}</span>
                        </div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Value Paid</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-success)', display: 'block', marginTop: '2px' }}>R {Math.round(orderPaidAmount).toLocaleString()}</span>
                        </div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Outstanding</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: balanceOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>R {Math.round(balanceOutstanding).toLocaleString()}</span>
                        </div>
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Margin</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>{overallMargin}%</span>
                        </div>
                      </div>
                    </>
                  );
                })()}


                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => {
                    if (confirm('Discard edits and close workspace?')) setSelectedOrderId(null);
                  }}
                >
                  Cancel
                </button>
                
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleSaveOrderSpreadsheet}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} /> Save & Sync Sales Record
                </button>
              </div>
            </div>


            {/* SALES TRACKER MIRROR VIEW TITLE */}
            <div style={{ padding: '0 4px', fontSize: '12px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📈 Sales Tracker Mirror View
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* COMPACT ORDER DETAILS HEADER */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📋 Order Registration Details
                    </span>
                    {!showHeaderDetails && (
                      <>
                        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}><strong>Company:</strong> {clientCompany || '—'}</span>
                        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}><strong>Project:</strong> {projectFullName || '—'}</span>
                        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}><strong>PM Name:</strong> {pmName || '—'}</span>
                        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}><strong>PF:</strong> {pfNumber || '—'}</span>
                      </>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-ghost" 
                    onClick={() => setShowHeaderDetails(!showHeaderDetails)}
                    style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid var(--border)', height: '28px', borderRadius: '6px' }}
                  >
                    {showHeaderDetails ? 'Collapse Details ▲' : 'View Details ▼'}
                  </button>
                </div>
                
                {showHeaderDetails && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 18px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {/* Company */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Company</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>{clientCompany || '—'}</span>
                    </div>

                    {/* Project */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Project Details</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>{projectFullName || '—'}</span>
                    </div>

                    {/* Delivery Address */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Delivery Address</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{deliveryAddress || '—'}</span>
                    </div>

                    {/* PM Name */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>PM Name</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>{pmName || '—'}</span>
                    </div>

                    {/* Date Created */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Date Created</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{orderDate || '—'}</span>
                    </div>

                    {/* Quotation Sent */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Quotation Sent</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{quotationSentDate || '—'}</span>
                    </div>

                    {/* Class */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Class</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{projectClass || '—'}</span>
                    </div>

                    {/* Tier */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Tier</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{projectTier || '—'}</span>
                    </div>

                    {/* File Source */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>File Source</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{fileSource || '—'}</span>
                    </div>

                    {/* PF Number & Date */}
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>PF Number & Date</span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {pfNumber ? `${pfNumber} (${pfDate || '—'})` : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
                
                {/* TOP SUMMARY STRIP */}
                {(() => {
                  const nonCreditItems = activeOrderItems.filter(item => !item.is_credit && !item.isCredit);
                  const totalMasterQty = nonCreditItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                  const totalMasterCost = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
                  const totalMasterRetail = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                  const masterDiscounted = Math.max(0, totalMasterRetail * (1 - (Number(orderDiscount) || 0) / 100));

                  // Delivery metrics calculated from items directly
                  const totalDeliveredQty = nonCreditItems.reduce((sum, item) => {
                    const defaults = getItemDefaults(item);
                    const val = item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty;
                    return sum + (Number(val) || 0);
                  }, 0);
                  
                  // Financial invoice metrics calculated from items directly
                  const totalInvoicedRetail = activeOrderItems.reduce((sum, item) => {
                    const defaults = getItemDefaults(item);
                    const val = item.invoiceValue !== undefined ? item.invoiceValue : defaults.invoiceValue;
                    return sum + (Number(val) || 0);
                  }, 0);
                  const invoicedDiscounted = Math.max(0, totalInvoicedRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  
                  const remainingToInvoice = Math.max(0, masterDiscounted - invoicedDiscounted);
                  const backOrderQty = Math.max(0, totalMasterQty - totalDeliveredQty);
                  const totalStockOnHand = nonCreditItems.reduce((sum, item) => {
                    const defaults = getItemDefaults(item);
                    const val = item.stockStatus === 'All Stock on Hand' ? item.qty : (item.stockOnHand !== undefined ? item.stockOnHand : defaults.stockOnHand || 0);
                    return sum + (Number(val) || 0);
                  }, 0);

                  return (
                    <>
                      {/* ITEM-BY-ITEM TRACKING SHEET */}
                      <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📋 Hardware Item Ledger & Fulfillment
                            {activeTab === 'purchasing' && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--text-info)' }}>
                                Stock on Hand: {totalStockOnHand} / {totalMasterQty} total
                              </span>
                            )}
                          </h4>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {activeTab !== 'order' && (
                              <button
                                className="btn btn-sm"
                                onClick={() => {
                                  if (activeTab === 'purchasing') {
                                    navigate('/purchasing', { state: { filterOrderId: selectedOrderId } });
                                  } else if (activeTab === 'invoicing') {
                                    navigate('/invoices');
                                  } else if (activeTab === 'delivery') {
                                    navigate('/logistics', { state: { filterOrderId: selectedOrderId } });
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-info)',
                                  height: '32px'
                                }}
                              >
                                {activeTab === 'purchasing' ? '⚙️ Open Purchasing Ledger' : 
                                 activeTab === 'invoicing' ? '💵 Open Invoices Ledger' : '🚚 Open Logistics Ledger'}
                              </button>
                            )}

                            {/* Phase tabs */}
                            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {[
                              { id: 'order', label: 'Order Spec', color: 'var(--text-primary)', bg: 'rgba(255, 255, 255, 0.05)' },
                              { id: 'purchasing', label: 'Purchasing & Receiving', color: 'var(--text-info)', bg: 'rgba(59, 130, 246, 0.15)' },
                              { id: 'invoicing', label: 'Invoicing', color: 'var(--text-warning)', bg: 'rgba(245, 158, 11, 0.15)' },
                              { id: 'delivery', label: 'Delivery Logistics', color: 'var(--text-danger)', bg: 'rgba(236, 72, 153, 0.15)' }
                            ].map(tab => {
                              const isActive = activeTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setActiveTab(tab.id)}
                                  className="btn btn-sm"
                                  style={{
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: isActive ? tab.bg : 'transparent',
                                    color: isActive ? tab.color : 'var(--text-secondary)',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                  }}
                                >
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>
                          </div>
                        </div>
                        
                        <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                          <table className="table" style={{ margin: 0, fontSize: '12px', verticalAlign: 'middle', borderCollapse: 'separate', borderSpacing: '0', minWidth: activeTab === 'purchasing' ? '1350px' : activeTab === 'order' ? '1100px' : activeTab === 'invoicing' ? '1100px' : '1200px' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th colSpan={8} style={{ background: 'rgba(0,0,0,0.1)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px' }}>CORE FITTING DETAILS</th>
                                
                                {activeTab === 'order' && (
                                  <th 
                                    colSpan={6} 
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px' }}
                                  >
                                    COSTS & SPEC DETAILS
                                  </th>
                                )}

                                {activeTab === 'purchasing' && (
                                  <th 
                                    colSpan={10} 
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-info)' }}
                                  >
                                    PHASE 1: PROCUREMENT & RECEIVING
                                  </th>
                                )}

                                {activeTab === 'invoicing' && (
                                  <th 
                                    colSpan={5} 
                                    style={{ background: 'rgba(245, 158, 11, 0.1)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-warning)' }}
                                  >
                                    PHASE 2: INVOICING
                                  </th>
                                )}

                                {activeTab === 'delivery' && (
                                  <th 
                                    colSpan={5} 
                                    style={{ background: 'rgba(236, 72, 153, 0.1)', textAlign: 'center', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}
                                  >
                                    PHASE 3: DELIVERY LOGISTICS
                                  </th>
                                )}
                              </tr>
                              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-strong)' }}>
                                <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '100px' }}>1:1 Code</th>
                                <th style={{ width: '80px' }}>Type Code</th>
                                <th style={{ width: '130px' }}>Item Code</th>
                                <th style={{ width: '250px' }}>Description</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Unit Retail</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Total Retail</th>
                                <th style={{ width: '150px', textAlign: 'center', borderRight: '1px solid var(--border-strong)' }}>Fulfillment</th>
                                
                                {activeTab === 'order' && (
                                  <>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Cost</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>Total Cost</th>
                                    <th style={{ width: '65px', textAlign: 'center' }}>Margin</th>
                                    <th style={{ width: '90px' }}>Brand</th>
                                    <th style={{ width: '100px' }}>Supplier</th>
                                    <th style={{ width: '120px', borderRight: '1px solid var(--border-strong)' }}>Fitting Type</th>
                                  </>
                                )}

                                {activeTab === 'purchasing' && (
                                  <>
                                    <th style={{ width: '155px' }}>Stock Status</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Stock on Hand</th>
                                    <th style={{ width: '100px' }}>PO Reference</th>
                                    <th style={{ width: '120px' }}>Supplier</th>
                                    <th style={{ width: '100px' }}>Date Ordered</th>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Ord</th>
                                    <th style={{ width: '100px', borderRight: '1px solid var(--border-strong)' }}>Delivery ETA</th>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Rec</th>
                                    <th style={{ width: '110px' }}>GRN Reference</th>
                                    <th style={{ width: '100px' }}>Date Rec</th>
                                    <th style={{ width: '100px', textAlign: 'right', borderRight: '1px solid var(--border-strong)' }}>Rec Value</th>
                                  </>
                                )}

                                {activeTab === 'invoicing' && (
                                  <>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Inv</th>
                                    <th style={{ width: '100px' }}>Invoice Ref</th>
                                    <th style={{ width: '100px' }}>Date Inv</th>
                                    <th style={{ width: '100px', textAlign: 'right' }}>Inv Value</th>
                                    <th style={{ width: '100px', textAlign: 'right', borderRight: '1px solid var(--border-strong)' }}>Outstanding</th>
                                  </>
                                )}

                                {activeTab === 'delivery' && (
                                  <>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Del</th>
                                    <th style={{ width: '100px' }}>Date Del</th>
                                    <th style={{ width: '100px' }}>Status</th>
                                    <th style={{ width: '200px' }}>User Comments</th>
                                    <th>Waybill Log</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody onKeyDown={handleSpreadsheetKeyDown} onPaste={handleSpreadsheetPaste}>
                              {groupedItems.filter(item => !(item.is_credit || item.isCredit)).map((item, rowIndex) => {
                                const lineMargin = item.unitRetail > 0 ? ((item.unitRetail - item.unitCost) / item.unitRetail) * 100 : 0;
                                const isLowMargin = lineMargin < 39;

                                const poRefVal = item.poRef;
                                const poSupplierVal = item.poSupplier;
                                const poDateVal = item.poDate;
                                const poQtyOrderedVal = item.poQtyOrdered;
                                const poEtaVal = item.poEta;

                                const receivedDateVal = item.receivedDate;
                                const receivedQtyVal = item.receivedQty;

                                const invoiceQtyVal = item.invoiceQty;
                                const invoiceRefVal = item.invoiceRef;
                                const invoiceDateVal = item.invoiceDate;
                                const invoiceValueVal = item.invoiceValue;

                                const deliveryQtyVal = item.deliveryQty;
                                const deliveryDateVal = item.deliveryDate;
                                const deliveryStatusVal = item.deliveryStatus;
                                const deliveryNotesVal = item.deliveryNotes;

                                const calculatedValueReceived = Number(receivedQtyVal) * (item.unitCost || 0);
                                const totalRetailPrice = item.qty * (item.unitRetail || 0);
                                const calculatedOutstandingInvoiceValue = Math.max(0, totalRetailPrice - Number(invoiceValueVal));

                                return (
                                  <tr 
                                    key={item.id} 
                                    style={{ borderBottom: '1px solid var(--border)' }}
                                  >
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{item.oneOneCode || '—'}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{item.type || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{item.code || 'CUSTOM'}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.description}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.unitRetail || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>R {Math.round(item.qty * (item.unitRetail || 0)).toLocaleString()}</td>
                                    <td style={{ borderRight: '1px solid var(--border-strong)', padding: '4px 6px', verticalAlign: 'middle' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
                                        {/* Procured Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(74, 222, 128, 0.08)', padding: '2px 4px', borderRadius: '4px' }}>
                                          <span style={{ color: '#4ade80', fontWeight: 600 }}>Proc:</span>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {item.is_credit ? '—' : ((item.itemType || item.item_type) === 'Service' ? '100%' : (item.stockStatus === 'All Stock on Hand' ? '100%' : `${Math.round(((item.receivedQty || 0) / (item.qty || 1)) * 100)}%`))}
                                          </span>
                                        </div>
                                        {/* Invoiced Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 4px', borderRadius: '4px' }}>
                                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Inv:</span>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {item.is_credit ? '—' : `${Math.round(((item.invoiceQty || 0) / (item.qty || 1)) * 100)}%`}
                                          </span>
                                        </div>
                                        {/* Delivered Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(96, 165, 250, 0.08)', padding: '2px 4px', borderRadius: '4px' }}>
                                          <span style={{ color: '#60a5fa', fontWeight: 600 }}>Del:</span>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {item.is_credit ? '—' : ((item.itemType || item.item_type) === 'Service' ? '100%' : `${Math.round(((item.deliveryQty || 0) / (item.qty || 1)) * 100)}%`)}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {activeTab === 'order' && (
                                      <>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.unitCost || 0).toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.qty * (item.unitCost || 0)).toLocaleString()}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>{Math.round(lineMargin)}%</td>
                                        <td>{item.brand || '—'}</td>
                                        <td>{item.supplier || '—'}</td>
                                        <td style={{ borderRight: '1px solid var(--border-strong)', verticalAlign: 'middle', padding: '4px 8px' }}>
                                          <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {getFittingType(item)}
                                          </span>
                                        </td>
                                      </>
                                    )}

                                    {activeTab === 'purchasing' && (
                                      <>
                                        <td style={{ padding: 0 }}>
                                          <select 
                                            className="gs-cell-select" 
                                            value={item.stockStatus || ''}
                                            data-row={rowIndex}
                                            data-col="stockStatus"
                                            onChange={(e) => handleStockStatusChange(item.itemIds, e.target.value)}
                                            style={{
                                              fontWeight: '600',
                                              padding: '4px',
                                              color: (item.stockStatus === 'All Stock on Hand') ? '#4ade80' : 
                                                     (item.stockStatus === 'Partial Stock on Hand') ? '#60a5fa' : 'var(--text-primary)',
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              outline: 'none',
                                              width: '100%',
                                              height: '100%'
                                            }}
                                          >
                                            <option value="">—</option>
                                            <option value="All Stock on Hand">All Stock on Hand</option>
                                            <option value="Partial Stock on Hand">Partial Stock on Hand</option>
                                            <option value="To Be Ordered">To Be Ordered</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            style={{ textAlign: 'center', fontWeight: 'bold', opacity: item.stockStatus === 'All Stock on Hand' ? 0.5 : 1 }}
                                            value={item.stockStatus === 'All Stock on Hand' ? item.qty : (item.stockOnHand !== undefined ? item.stockOnHand : 0)}
                                            disabled={item.stockStatus === 'All Stock on Hand'}
                                            data-row={rowIndex}
                                            data-col="stockOnHand"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'stockOnHand', Math.max(0, parseInt(e.target.value) || 0))}
                                          />
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-info)', fontWeight: 500 }}>
                                          {renderDocLinks(poRefVal, '/purchasing', selectedProjectKey)}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                          {poSupplierVal || '—'}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                          {poDateVal || '—'}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                          {poQtyOrderedVal || 0}
                                        </td>
                                        <td style={{ padding: '8px', borderRight: '1px solid var(--border-strong)', color: 'var(--text-info)', fontWeight: 500 }}>
                                          {poEtaVal || '—'}
                                        </td>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                          {receivedQtyVal || 0}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-info)', fontWeight: 500 }}>
                                          {renderDocLinks(item.receivedRef, '/purchasing', selectedProjectKey)}
                                        </td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                          {receivedDateVal || '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, borderRight: '1px solid var(--border-strong)', color: 'var(--text-success)', paddingRight: '10px' }}>
                                          R {Math.round(calculatedValueReceived).toLocaleString()}
                                        </td>
                                      </>
                                    )}

                                    {activeTab === 'invoicing' && (
                                      <>
                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                          {invoiceQtyVal || 0}
                                        </td>
                                        <td style={{ padding: '8px', fontSize: '11.5px', fontFamily: 'monospace', color: 'var(--text-info)', fontWeight: 500 }}>
                                          {renderDocLinks(invoiceRefVal, '/invoices', selectedProjectKey)}
                                        </td>
                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                          {invoiceDateVal || '—'}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, paddingRight: '10px' }}>
                                          R {Math.round(invoiceValueVal).toLocaleString()}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, borderRight: '1px solid var(--border-strong)', color: calculatedOutstandingInvoiceValue > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', paddingRight: '10px' }}>
                                          R {Math.round(calculatedOutstandingInvoiceValue).toLocaleString()}
                                        </td>
                                      </>
                                    )}

                                    {activeTab === 'delivery' && (
                                      <>
                                        <td style={{ padding: 0, textAlign: 'center' }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            style={{
                                              border: (deliveryQtyVal > (item.stockStatus === 'All Stock on Hand' ? item.qty : receivedQtyVal + (item.stockStatus === 'Partial Stock on Hand' ? (item.qty - poQtyOrderedVal) : 0))) ? '1.5px dashed #ef4444' : ''
                                            }}
                                            value={deliveryQtyVal}
                                            data-row={rowIndex}
                                            data-col="deliveryQty"
                                            disabled={true}
                                            title={(deliveryQtyVal > (item.stockStatus === 'All Stock on Hand' ? item.qty : receivedQtyVal + (item.stockStatus === 'Partial Stock on Hand' ? (item.qty - poQtyOrderedVal) : 0))) ? "Warning: Qty Delivered exceeds Qty Received/In-stock" : ""}
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryQty', Math.max(0, parseInt(e.target.value) || 0))}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="date" 
                                            className="gs-cell-input" 
                                            style={{ colorScheme: 'dark' }}
                                            value={toInputDate(deliveryDateVal)}
                                            data-row={rowIndex}
                                            data-col="deliveryDate"
                                            disabled={true}
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryDate', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <select 
                                            className="gs-cell-select" 
                                            value={deliveryStatusVal}
                                            data-row={rowIndex}
                                            data-col="deliveryStatus"
                                            disabled={true}
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryStatus', e.target.value)}
                                          >
                                            <option>Pending</option>
                                            <option>Partial</option>
                                            <option>Delivered</option>
                                          </select>
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="text" 
                                            className="gs-cell-input" 
                                            placeholder="e.g. comments..."
                                            value={item.deliveryComments || ''}
                                            data-row={rowIndex}
                                            data-col="deliveryComments"
                                            disabled={true}
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryComments', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: '4px 8px', fontSize: '11px', verticalAlign: 'middle', background: 'rgba(0,0,0,0.03)' }}>
                                          {item.deliveryHistory && item.deliveryHistory.length > 0 ? (
                                            <button
                                              type="button"
                                              className="btn btn-xs btn-outline"
                                              style={{ textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                              onClick={() => setWaybillHistoryModalItem(item)}
                                            >
                                              📦 {item.deliveryHistory.length} Waybill{item.deliveryHistory.length > 1 ? 's' : ''} ({item.deliveryQty} units)
                                            </button>
                                          ) : (
                                            <span style={{ color: 'var(--text-tertiary)' }}>{item.deliveryNotes || '—'}</span>
                                          )}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* COLLAPSIBLE CREDITS SECTION AT THE BOTTOM OF THE LEDGER */}
                        {groupedItems.some(item => item.is_credit || item.isCredit) && (
                          <div style={{ marginTop: '20px', borderTop: '2px solid var(--border-danger)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                🔴 Credited Items & Returns (Managed in Credits tab)
                              </h4>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-ghost" 
                                style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-danger)', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                                onClick={() => setSalesTrackerCreditsOpen(!salesTrackerCreditsOpen)}
                              >
                                {salesTrackerCreditsOpen ? 'Collapse ˄' : 'Expand ˅'}
                              </button>
                            </div>
                            {salesTrackerCreditsOpen && (
                              <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                <table className="table" style={{ margin: 0, fontSize: '12px', verticalAlign: 'middle', borderCollapse: 'separate', borderSpacing: '0', minWidth: activeTab === 'purchasing' ? '1350px' : activeTab === 'order' ? '1100px' : activeTab === 'invoicing' ? '1100px' : '1200px' }}>
                                  <thead>
                                    <tr style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                                      <th colSpan={8} style={{ background: 'rgba(239, 68, 68, 0.1)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}>CORE FITTING DETAILS</th>
                                      {activeTab === 'order' && (
                                        <th colSpan={6} style={{ background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}>COSTS & SPEC DETAILS</th>
                                      )}
                                      {activeTab === 'purchasing' && (
                                        <th colSpan={10} style={{ background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}>PHASE 1: PROCUREMENT & RECEIVING</th>
                                      )}
                                      {activeTab === 'invoicing' && (
                                        <th colSpan={5} style={{ background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}>PHASE 2: INVOICING</th>
                                      )}
                                      {activeTab === 'delivery' && (
                                        <th colSpan={5} style={{ background: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}>PHASE 3: DELIVERY LOGISTICS</th>
                                      )}
                                    </tr>
                                    <tr style={{ background: 'rgba(239, 68, 68, 0.05)', borderBottom: '2px solid var(--border-strong)' }}>
                                      <th style={{ width: '50px', textAlign: 'center', color: 'var(--text-danger)' }}>Qty</th>
                                      <th style={{ width: '100px', color: 'var(--text-danger)' }}>1:1 Code</th>
                                      <th style={{ width: '80px', color: 'var(--text-danger)' }}>Type Code</th>
                                      <th style={{ width: '130px', color: 'var(--text-danger)' }}>Item Code</th>
                                      <th style={{ width: '250px', color: 'var(--text-danger)' }}>Description</th>
                                      <th style={{ width: '90px', textAlign: 'right', color: 'var(--text-danger)' }}>Unit Retail</th>
                                      <th style={{ width: '100px', textAlign: 'right', color: 'var(--text-danger)' }}>Total Retail</th>
                                      <th style={{ width: '150px', textAlign: 'center', borderRight: '1px solid var(--border-strong)', color: 'var(--text-danger)' }}>Fulfillment</th>
                                      
                                      {activeTab === 'order' && (
                                        <>
                                          <th style={{ width: '90px', textAlign: 'right', color: 'var(--text-danger)' }}>Cost</th>
                                          <th style={{ width: '90px', textAlign: 'right', color: 'var(--text-danger)' }}>Total Cost</th>
                                          <th style={{ width: '65px', textAlign: 'center', color: 'var(--text-danger)' }}>Margin</th>
                                          <th style={{ width: '90px', color: 'var(--text-danger)' }}>Brand</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Supplier</th>
                                          <th style={{ width: '120px', borderRight: '1px solid var(--border-strong)', color: 'var(--text-danger)' }}>Fitting Type</th>
                                        </>
                                      )}

                                      {activeTab === 'purchasing' && (
                                        <>
                                          <th style={{ width: '155px', color: 'var(--text-danger)' }}>Stock Status</th>
                                          <th style={{ width: '90px', textAlign: 'center', color: 'var(--text-danger)' }}>Stock on Hand</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>PO Reference</th>
                                          <th style={{ width: '120px', color: 'var(--text-danger)' }}>Supplier</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Date Ordered</th>
                                          <th style={{ width: '70px', textAlign: 'center', color: 'var(--text-danger)' }}>Qty Ord</th>
                                          <th style={{ width: '100px', borderRight: '1px solid var(--border-strong)', color: 'var(--text-danger)' }}>Delivery ETA</th>
                                          <th style={{ width: '70px', textAlign: 'center', color: 'var(--text-danger)' }}>Qty Rec</th>
                                          <th style={{ width: '110px', color: 'var(--text-danger)' }}>GRN Reference</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Date Rec</th>
                                          <th style={{ width: '100px', textAlign: 'right', borderRight: '1px solid var(--border-strong)', color: 'var(--text-danger)' }}>Rec Value</th>
                                        </>
                                      )}

                                      {activeTab === 'invoicing' && (
                                        <>
                                          <th style={{ width: '70px', textAlign: 'center', color: 'var(--text-danger)' }}>Qty Inv</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Invoice Ref</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Date Inv</th>
                                          <th style={{ width: '100px', textAlign: 'right', color: 'var(--text-danger)' }}>Inv Value</th>
                                          <th style={{ width: '100px', textAlign: 'right', borderRight: '1px solid var(--border-strong)', color: 'var(--text-danger)' }}>Outstanding</th>
                                        </>
                                      )}

                                      {activeTab === 'delivery' && (
                                        <>
                                          <th style={{ width: '70px', textAlign: 'center', color: 'var(--text-danger)' }}>Qty Del</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Date Del</th>
                                          <th style={{ width: '100px', color: 'var(--text-danger)' }}>Status</th>
                                          <th style={{ width: '200px', color: 'var(--text-danger)' }}>User Comments</th>
                                          <th style={{ color: 'var(--text-danger)' }}>Waybill Log</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupedItems.filter(item => item.is_credit || item.isCredit).map((item, index) => {
                                      const lineMargin = item.unitRetail > 0 ? ((item.unitRetail - item.unitCost) / item.unitRetail) * 100 : 0;

                                      return (
                                        <tr key={item.id} style={{ background: 'rgba(239, 68, 68, 0.04)', borderBottom: '1px solid var(--border)' }}>
                                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-danger)', padding: '6px 8px' }}>{item.qty}</td>
                                          <td style={{ padding: '6px 8px' }}>{item.oneOneCode || '—'}</td>
                                          <td style={{ padding: '6px 8px' }}>{item.type || '—'}</td>
                                          <td style={{ padding: '6px 8px', fontWeight: 600, color: 'var(--text-danger)' }}>{item.code}</td>
                                          <td style={{ padding: '6px 8px' }}>{item.description}</td>
                                          <td style={{ textAlign: 'right', padding: '6px 8px' }}>R {item.unitRetail?.toLocaleString() || 0}</td>
                                          <td style={{ textAlign: 'right', color: 'var(--text-danger)', fontWeight: 'bold', padding: '6px 8px' }}>R {(item.qty * item.unitRetail)?.toLocaleString() || 0}</td>
                                          <td style={{ textAlign: 'center', borderRight: '1px solid var(--border-strong)', padding: '6px 8px', color: 'var(--text-muted)' }}>—</td>

                                          {activeTab === 'order' && (
                                            <>
                                              <td style={{ textAlign: 'right', padding: '6px 8px' }}>R {item.unitCost?.toLocaleString() || 0}</td>
                                              <td style={{ textAlign: 'right', color: 'var(--text-danger)', fontWeight: 'bold', padding: '6px 8px' }}>R {(item.qty * item.unitCost)?.toLocaleString() || 0}</td>
                                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: lineMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)', padding: '6px 8px' }}>{Math.round(lineMargin)}%</td>
                                              <td style={{ padding: '6px 8px' }}>{item.brand || '—'}</td>
                                              <td style={{ padding: '6px 8px' }}>{item.supplier || '—'}</td>
                                              <td style={{ borderRight: '1px solid var(--border-strong)', padding: '6px 8px' }}>Credit Item</td>
                                            </>
                                          )}

                                          {activeTab === 'purchasing' && (
                                            <>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'center', padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'center', padding: '6px 8px' }}>—</td>
                                              <td style={{ borderRight: '1px solid var(--border-strong)', padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'center', padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'right', borderRight: '1px solid var(--border-strong)', padding: '6px 8px' }}>—</td>
                                            </>
                                          )}

                                          {activeTab === 'invoicing' && (
                                            <>
                                              <td style={{ textAlign: 'center', padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'right', padding: '6px 8px' }}>—</td>
                                              <td style={{ textAlign: 'right', borderRight: '1px solid var(--border-strong)', padding: '6px 8px' }}>—</td>
                                            </>
                                          )}

                                          {activeTab === 'delivery' && (
                                            <>
                                              <td style={{ textAlign: 'center', padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                              <td style={{ padding: '6px 8px' }}>—</td>
                                            </>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginTop: '20px' }}>
                        
                        {(() => {
                          const subTotal = totalMasterRetail;
                          const discountVal = totalMasterRetail * (Number(orderDiscount) || 0) / 100;
                          const priceExVat = masterDiscounted;
                          const calculatedVat = priceExVat * (Number(orderVatRate) / 100);
                          const totalPriceInclVat = priceExVat + calculatedVat;
                          const depositPaidVal = (orderPayments || []).filter(p => p.type === 'Deposit Payment').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                          const balancePaidVal = (orderPayments || []).filter(p => p.type === 'Balance Payment').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                          const interimPaidVal = (orderPayments || []).filter(p => p.type === 'Interim Payment').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                          const outstandingBalance = totalPriceInclVat - Number(orderPaidAmount);

                          // 1. Spec & Cost Totals
                          const specCost = totalMasterCost;
                          const specRetail = totalMasterRetail;
                          const specMargin = specRetail > 0 ? Math.round(((specRetail - specCost) / specRetail) * 100) : 0;

                          // 2. Purchasing & Receiving Totals
                          let lastReceivedDate = '—';
                          let lastExpectedEta = '—';
                          let allReceived = true;
                          let valueReceived = 0;
                          let valueOutstandingRec = 0;

                          activeOrderItems.forEach(item => {
                            const defaults = getItemDefaults(item);
                            const qty = Number(item.qty) || 0;
                            const retail = Number(item.unitRetail) || 0;
                            const isService = (item.itemType || item.item_type) === 'Service';

                            // Service items are always fully received
                            if (isService) {
                              valueReceived += qty * retail;
                              return;
                            }

                            const receivedQty = Number(item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty) || 0;
                            const stockStatus = item.stockStatus !== undefined ? item.stockStatus : defaults.stockStatus || '';

                            if (stockStatus !== 'All Stock on Hand' && receivedQty < qty) {
                              allReceived = false;
                            }
                            
                            valueReceived += (stockStatus === 'All Stock on Hand' ? qty : receivedQty) * retail;
                            valueOutstandingRec += (stockStatus === 'All Stock on Hand' ? 0 : Math.max(0, qty - receivedQty)) * retail;

                            const rDate = item.receivedDate || defaults.receivedDate;
                            if (rDate && rDate !== '—') {
                              if (lastReceivedDate === '—' || new Date(rDate) > new Date(lastReceivedDate)) {
                                lastReceivedDate = rDate;
                              }
                            }

                            const etaDate = item.poEta || defaults.poEta;
                            if (etaDate && etaDate !== '—') {
                              if (lastExpectedEta === '—' || new Date(etaDate) > new Date(lastExpectedEta)) {
                                lastExpectedEta = etaDate;
                              }
                            }
                          });

                          if (allReceived) {
                            lastExpectedEta = 'None (All Received)';
                          }

                          // 3. Invoicing Totals
                          let valueInvoiced = 0;
                          let valueStillToInvoice = 0;
                          activeOrderItems.forEach(item => {
                            const defaults = getItemDefaults(item);
                            const invoiceQty = Number(item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty) || 0;
                            const qty = Number(item.qty) || 0;
                            const retail = Number(item.unitRetail) || 0;
                            valueInvoiced += invoiceQty * retail;
                            valueStillToInvoice += Math.max(0, qty - invoiceQty) * retail;
                          });

                          // 4. Delivery Totals
                          let valueDelivered = 0;
                          let valueStillToDeliver = 0;
                          activeOrderItems.forEach(item => {
                            const defaults = getItemDefaults(item);
                            const deliveryQty = Number(item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty) || 0;
                            const qty = Number(item.qty) || 0;
                            const retail = Number(item.unitRetail) || 0;
                            valueDelivered += deliveryQty * retail;
                            valueStillToDeliver += Math.max(0, qty - deliveryQty) * retail;
                          });

                          return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    🚩 Milestones & Financials Summary
                                  </span>
                                  {!showMilestones && (
                                    <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)' }}>
                                      <span><strong>Sub Total:</strong> R {Math.round(subTotal).toLocaleString()}</span>
                                      <span><strong>Excl. VAT:</strong> R {Math.round(priceExVat).toLocaleString()}</span>
                                      <span><strong>Total Incl. VAT:</strong> <strong style={{ color: 'var(--text-info)' }}>R {Math.round(totalPriceInclVat).toLocaleString()}</strong></span>
                                      <span><strong>Outstanding Balance:</strong> <strong style={{ color: outstandingBalance > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>R {Math.round(outstandingBalance).toLocaleString()}</strong></span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  onClick={() => setShowMilestones(!showMilestones)}
                                  style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid var(--border)', height: '28px', borderRadius: '6px' }}
                                >
                                  {showMilestones ? 'Collapse Milestones ▲' : 'Show Milestones & Details ▼'}
                                </button>
                              </div>

                              {showMilestones && (
                                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 2.2fr', gap: '30px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                  
                                  {/* LEFT SIDE: PROJECT STATUS & PAYMENTS */}
                                  <div>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Project Status & Payments
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', alignItems: 'center' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Project Status</label>
                                        <select 
                                          className="form-control"
                                          style={{ height: '32px', fontSize: '12.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', width: '100%', padding: '4px 8px' }}
                                          value={orderStatus}
                                          onChange={e => setOrderStatus(e.target.value)}
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Delayed">Delayed</option>
                                          <option value="Ongoing">Ongoing</option>
                                          <option value="Complete">Complete</option>
                                          <option value="Cancelled">Cancelled</option>
                                        </select>
                                      </div>

                                      {/* Payment Viewer / Action */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          💳 Order Payments
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline"
                                          style={{ width: '100%', height: '32px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-info)' }}
                                          onClick={() => setShowPaymentViewer(true)}
                                        >
                                          🔍 View Payments (R {Math.round(orderPaidAmount).toLocaleString()} Paid)
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* RIGHT SIDE: FINANCIAL SUMMARY & MONTHLY REALIZATION GRID */}
                                  <div style={{ borderLeft: '1.5px solid var(--border)', paddingLeft: '30px', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Financial Calculations & Summaries
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                                      
                                      {/* Left Column: Traditional Financial Calculations */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                        {/* Sub Total */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>SUB TOTAL</span>
                                          <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(subTotal).toLocaleString()}</strong>
                                        </div>

                                        {/* Discount */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>DISCOUNT (%)</span>
                                            <input 
                                              type="number"
                                              className="form-control"
                                              style={{ width: '50px', height: '20px', fontSize: '11px', padding: '1px 4px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                              value={orderDiscount}
                                              onChange={e => setOrderDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                            />
                                          </div>
                                          <span style={{ fontFamily: 'monospace', color: discountVal > 0 ? 'var(--text-warning)' : 'var(--text-secondary)' }}>
                                            R {Math.round(discountVal).toLocaleString()}
                                          </span>
                                        </div>

                                        {/* Price Excl VAT */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>PRICE EXCL. VAT</span>
                                          <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(priceExVat).toLocaleString()}</strong>
                                        </div>

                                        {/* VAT */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>VAT (%)</span>
                                            <input 
                                              type="number"
                                              className="form-control"
                                              style={{ width: '50px', height: '20px', fontSize: '11px', padding: '1px 4px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                              value={orderVatRate}
                                              onChange={e => setOrderVatRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                            />
                                          </div>
                                          <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>R {Math.round(calculatedVat).toLocaleString()}</span>
                                        </div>

                                        {/* Total Price Incl VAT */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '2px solid var(--border-strong)' }}>
                                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>TOTAL PRICE INCL. VAT</span>
                                          <strong style={{ fontSize: '13px', color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                            R {Math.round(totalPriceInclVat).toLocaleString()}
                                          </strong>
                                        </div>

                                        {/* Deposit Incl VAT */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Deposit Paid (70% Target: R {Math.round(totalPriceInclVat * 0.7).toLocaleString()})</span>
                                          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>R {Math.round(depositPaidVal).toLocaleString()}</span>
                                        </div>

                                        {/* Balance Payment */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Balance Paid (30% Target: R {Math.round(totalPriceInclVat * 0.3).toLocaleString()})</span>
                                          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>R {Math.round(balancePaidVal).toLocaleString()}</span>
                                        </div>

                                        {/* Interim Payment */}
                                        {interimPaidVal > 0 && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Interim Payment Paid</span>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>R {Math.round(interimPaidVal).toLocaleString()}</span>
                                          </div>
                                        )}

                                        {/* Outstanding Balance */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Outstanding Balance</span>
                                          <strong style={{ fontSize: '13px', color: outstandingBalance > 0 ? 'var(--text-warning)' : 'var(--text-success)', fontFamily: 'monospace' }}>
                                            R {Math.round(outstandingBalance).toLocaleString()}
                                          </strong>
                                        </div>
                                      </div>

                                      {/* Right Column: Active Tab specific phase totals next to it */}
                                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'stretch' }}>
                                        {activeTab === 'order' && (
                                          <div style={{ 
                                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', 
                                            border: '1.5px solid var(--border)', 
                                            borderRadius: '8px', 
                                            padding: '20px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                          }}>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-info)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Cost & Spec Details</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Total Cost:</span>
                                                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(specCost).toLocaleString()}</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Total Retail:</span>
                                                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(specRetail).toLocaleString()}</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Blended Margin:</span>
                                                <strong style={{ color: 'var(--text-success)', fontWeight: 700 }}>{specMargin}%</strong>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {activeTab === 'purchasing' && (
                                          <div style={{ 
                                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', 
                                            border: '1.5px solid var(--border)', 
                                            borderRadius: '8px', 
                                            padding: '20px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                          }}>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-info)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Purchasing & Receiving</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Last Rec Date:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lastReceivedDate}</span>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Last ETA:</span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lastExpectedEta}</span>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Received Value:</span>
                                                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(valueReceived).toLocaleString()}</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Outstanding:</span>
                                                <strong style={{ fontFamily: 'monospace', color: valueOutstandingRec > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>R {Math.round(valueOutstandingRec).toLocaleString()}</strong>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {activeTab === 'invoicing' && (
                                          <div style={{ 
                                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', 
                                            border: '1.5px solid var(--border)', 
                                            borderRadius: '8px', 
                                            padding: '20px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                          }}>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-info)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Invoicing Totals</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Invoiced Value:</span>
                                                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(valueInvoiced).toLocaleString()}</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Still to Invoice:</span>
                                                <strong style={{ fontFamily: 'monospace', color: valueStillToInvoice > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>R {Math.round(valueStillToInvoice).toLocaleString()}</strong>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {activeTab === 'delivery' && (
                                          <div style={{ 
                                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', 
                                            border: '1.5px solid var(--border)', 
                                            borderRadius: '8px', 
                                            padding: '20px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center'
                                          }}>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-info)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Delivery Logistics</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Delivered Value:</span>
                                                <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(valueDelivered).toLocaleString()}</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Still to Deliver:</span>
                                                <strong style={{ fontFamily: 'monospace', color: valueStillToDeliver > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>R {Math.round(valueStillToDeliver).toLocaleString()}</strong>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                    </div>

                                    {/* Monthly Realization Grid with collapse toggle */}
                                    {(() => {
                                      const parseDate = (str) => {
                                        if (!str || str === '—' || str === 'TBD') return null;
                                        let d = new Date(str);
                                        if (!isNaN(d.getTime())) return d;
                                        const parts = str.split(/[-/]/);
                                        if (parts.length === 3) {
                                          if (parts[2].length === 4) {
                                            const dd = parseInt(parts[0], 10);
                                            const mm = parseInt(parts[1], 10) - 1;
                                            const yyyy = parseInt(parts[2], 10);
                                            d = new Date(yyyy, mm, dd);
                                            if (!isNaN(d.getTime())) return d;
                                          } else if (parts[0].length === 4) {
                                            const yyyy = parseInt(parts[0], 10);
                                            const mm = parseInt(parts[1], 10) - 1;
                                            const dd = parseInt(parts[2], 10);
                                            d = new Date(yyyy, mm, dd);
                                            if (!isNaN(d.getTime())) return d;
                                          }
                                        }
                                        return null;
                                      };

                                      const intervals = [];
                                      const today = new Date();
                                      let earliestDate = new Date(today.getFullYear(), today.getMonth(), 1);

                                      activeOrderItems.forEach(item => {
                                        const defaults = getItemDefaults(item);
                                        const poEta = item.poEta !== undefined ? item.poEta : defaults.poEta;
                                        const receivedDate = item.receivedDate !== undefined ? item.receivedDate : defaults.receivedDate;
                                        const invoiceDate = item.invoiceDate !== undefined ? item.invoiceDate : defaults.invoiceDate;
                                        
                                        const d1 = parseDate(poEta);
                                        const d2 = parseDate(receivedDate);
                                        const d3 = parseDate(invoiceDate);
                                        
                                        if (d1 && d1 < earliestDate) earliestDate = d1;
                                        if (d2 && d2 < earliestDate) earliestDate = d2;
                                        if (d3 && d3 < earliestDate) earliestDate = d3;
                                        
                                        const history = item.deliveryHistory || defaults.deliveryHistory || [];
                                        history.forEach(h => {
                                          const d4 = parseDate(h.date);
                                          if (d4 && d4 < earliestDate) earliestDate = d4;
                                        });
                                      });

                                      const startYear = gridFinYearStart;
                                      const startMonth = 2; // March (0-indexed is 2)

                                      for (let i = 0; i < 12; i++) {
                                        const sDate = new Date(startYear, startMonth + i, 1);
                                        const eDate = new Date(startYear, startMonth + i + 1, 0);
                                        
                                        const pad = (n) => String(n).padStart(2, '0');
                                        const startStr = `${pad(sDate.getDate())}/${pad(sDate.getMonth() + 1)}/${sDate.getFullYear()}`;
                                        const endStr = `${pad(eDate.getDate())}/${pad(eDate.getMonth() + 1)}/${eDate.getFullYear()}`;
                                        
                                        intervals.push({
                                          startYear: sDate.getFullYear(),
                                          startMonth: sDate.getMonth(),
                                          startStr,
                                          endStr,
                                          expectedRec: 0,
                                          received: 0,
                                          expectedInv: 0,
                                          invoiced: 0,
                                          expectedDel: 0,
                                          delivered: 0
                                        });
                                      }

                                      activeOrderItems.forEach(item => {
                                        const defaults = getItemDefaults(item);
                                        const qty = Number(item.qty) || 0;
                                        const retail = Number(item.unitRetail) || 0;
                                        const isService = (item.itemType || item.item_type) === 'Service';
                                        const stockStatus = item.stockStatus !== undefined ? item.stockStatus : defaults.stockStatus || '';
                                        
                                        // Service items count as fully received
                                        const recQty = isService ? qty : (stockStatus === 'All Stock on Hand' ? qty : (Number(item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty) || 0));
                                        const recVal = recQty * retail;
                                        const outRecVal = isService ? 0 : (stockStatus === 'All Stock on Hand' ? 0 : Math.max(0, qty - recQty)) * retail;
                                        
                                        const rDate = parseDate(item.receivedDate || defaults.receivedDate) || new Date();
                                        const etaDate = parseDate(item.poEta || defaults.poEta) || new Date();
                                        
                                        if (recVal > 0) {
                                          const match = intervals.find(inv => inv.startYear === rDate.getFullYear() && inv.startMonth === rDate.getMonth());
                                          if (match) match.received += recVal;
                                          else if (rDate < new Date(startYear, startMonth, 1)) intervals[0].received += recVal;
                                          else intervals[11].received += recVal;
                                        }
                                        if (outRecVal > 0) {
                                          const match = intervals.find(inv => inv.startYear === etaDate.getFullYear() && inv.startMonth === etaDate.getMonth());
                                          if (match) match.expectedRec += outRecVal;
                                          else if (etaDate < new Date(startYear, startMonth, 1)) intervals[0].expectedRec += outRecVal;
                                          else intervals[11].expectedRec += outRecVal;
                                        }
                                        
                                        const invQty = Number(item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty) || 0;
                                        const invVal = invQty * retail;
                                        const outInvVal = Math.max(0, qty - invQty) * retail;
                                        const iDate = parseDate(item.invoiceDate || defaults.invoiceDate) || new Date();
                                        
                                        if (invVal > 0) {
                                          const match = intervals.find(inv => inv.startYear === iDate.getFullYear() && inv.startMonth === iDate.getMonth());
                                          if (match) match.invoiced += invVal;
                                          else if (iDate < new Date(startYear, startMonth, 1)) intervals[0].invoiced += invVal;
                                          else intervals[11].invoiced += invVal;
                                        }
                                        if (outInvVal > 0) {
                                          const match = intervals.find(inv => inv.startYear === etaDate.getFullYear() && inv.startMonth === etaDate.getMonth());
                                          if (match) match.expectedInv += outInvVal;
                                          else if (etaDate < new Date(startYear, startMonth, 1)) intervals[0].expectedInv += outInvVal;
                                          else intervals[11].expectedInv += outInvVal;
                                        }
                                        
                                        const delQty = Number(item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty) || 0;
                                        const outDelVal = Math.max(0, qty - delQty) * retail;
                                        const history = item.deliveryHistory || defaults.deliveryHistory || [];
                                        
                                        history.forEach(h => {
                                          const dVal = (Number(h.qty) || 0) * retail;
                                          if (dVal > 0) {
                                            const dDate = parseDate(h.date) || new Date();
                                            const match = intervals.find(inv => inv.startYear === dDate.getFullYear() && inv.startMonth === dDate.getMonth());
                                            if (match) match.delivered += dVal;
                                            else if (dDate < new Date(startYear, startMonth, 1)) intervals[0].delivered += dVal;
                                            else intervals[11].delivered += dVal;
                                          }
                                        });
                                        if (outDelVal > 0) {
                                          const match = intervals.find(inv => inv.startYear === etaDate.getFullYear() && inv.startMonth === etaDate.getMonth());
                                          if (match) match.expectedDel += outDelVal;
                                          else if (etaDate < new Date(startYear, startMonth, 1)) intervals[0].expectedDel += outDelVal;
                                          else intervals[11].expectedDel += outDelVal;
                                        }
                                      });

                                      // Get starting year of the order for reference
                                      const currentOrderObj = allOrders.find(o => o.id === selectedOrderId) || {};
                                      const orderDateStr = currentOrderObj.orderDate || new Date().toISOString().split('T')[0];
                                      const orderDateObj = new Date(orderDateStr);
                                      const orderFinYearStart = (!isNaN(orderDateObj.getTime()) && orderDateObj.getMonth() >= 2) 
                                        ? orderDateObj.getFullYear() 
                                        : (orderDateObj.getFullYear() - 1);

                                      return (
                                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <h5 style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Monthly Financial Projections & Ledger
                                              </h5>
                                              {showMonthlyGrid && (
                                                <select
                                                  value={gridFinYearStart}
                                                  onChange={(e) => setGridFinYearStart(Number(e.target.value))}
                                                  style={{
                                                    fontSize: '11px',
                                                    padding: '2px 8px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none'
                                                  }}
                                                >
                                                  <option value={orderFinYearStart - 1}>Previous FY ({orderFinYearStart - 1}/{String(orderFinYearStart).slice(2)})</option>
                                                  <option value={orderFinYearStart}>Order FY ({orderFinYearStart}/{String(orderFinYearStart + 1).slice(2)})</option>
                                                  <option value={orderFinYearStart + 1}>Next FY ({orderFinYearStart + 1}/{String(orderFinYearStart + 2).slice(2)})</option>
                                                </select>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              className="btn btn-xs btn-ghost"
                                              onClick={() => setShowMonthlyGrid(!showMonthlyGrid)}
                                              style={{ fontSize: '10px', height: '24px', padding: '2px 10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)' }}
                                            >
                                              {showMonthlyGrid ? 'Hide Table ▲' : 'Show Table ▼'}
                                            </button>
                                          </div>
                                          
                                          {showMonthlyGrid && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                              {/* Sub-tab selection bar for distinct module grid */}
                                              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px', width: 'fit-content', border: '1px solid var(--border)' }}>
                                                {[
                                                  { key: 'receiving', label: 'Procurement & Receiving' },
                                                  { key: 'invoicing', label: 'Invoicing Progress' },
                                                  { key: 'delivery', label: 'Delivery Logistics' }
                                                ].map(tab => (
                                                  <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setGridSubTab(tab.key)}
                                                    style={{
                                                      fontSize: '10.5px',
                                                      padding: '4px 12px',
                                                      borderRadius: '4px',
                                                      border: 'none',
                                                      cursor: 'pointer',
                                                      fontWeight: gridSubTab === tab.key ? 600 : 400,
                                                      background: gridSubTab === tab.key ? 'var(--bg-secondary)' : 'transparent',
                                                      color: gridSubTab === tab.key ? 'var(--text-info)' : 'var(--text-secondary)',
                                                      transition: 'all 0.15s ease'
                                                    }}
                                                  >
                                                    {tab.label}
                                                  </button>
                                                ))}
                                              </div>

                                              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                                                  <thead>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                      <th style={{ padding: '8px 12px' }}>Start Date</th>
                                                      <th style={{ padding: '8px 12px' }}>End Date</th>
                                                      {gridSubTab === 'receiving' && (
                                                        <>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected to Receive</th>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Realized (Received)</th>
                                                        </>
                                                      )}
                                                      {gridSubTab === 'invoicing' && (
                                                        <>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected to Invoice</th>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Realized (Invoiced)</th>
                                                        </>
                                                      )}
                                                      {gridSubTab === 'delivery' && (
                                                        <>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Expected to Deliver</th>
                                                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Realized (Delivered)</th>
                                                        </>
                                                      )}
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {intervals.map((inv, idx) => (
                                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                        <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{inv.startStr}</td>
                                                        <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{inv.endStr}</td>
                                                        {gridSubTab === 'receiving' && (
                                                          <>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.expectedRec > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.expectedRec).toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.received > 0 ? 'var(--text-success)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.received).toLocaleString()}
                                                            </td>
                                                          </>
                                                        )}
                                                        {gridSubTab === 'invoicing' && (
                                                          <>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.expectedInv > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.expectedInv).toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.invoiced > 0 ? 'var(--text-success)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.invoiced).toLocaleString()}
                                                            </td>
                                                          </>
                                                        )}
                                                        {gridSubTab === 'delivery' && (
                                                          <>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.expectedDel > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.expectedDel).toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '8px 12px', textAlign: 'right', color: inv.delivered > 0 ? 'var(--text-success)' : 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                              R {Math.round(inv.delivered).toLocaleString()}
                                                            </td>
                                                          </>
                                                        )}
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                    </>
                  );
                })()}
              </div>

          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreatePoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Setup Spec Quotation BOQ</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreatePoModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreatePo}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Project</label>
                  <select 
                    className="form-control" 
                    value={newPoForm.projectKey} 
                    onChange={e => setNewPoForm({...newPoForm, projectKey: e.target.value})}
                  >
                    {Object.values(projects).map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hardware Supplier</label>
                  <select 
                    className="form-control" 
                    value={newPoForm.supplier} 
                    onChange={e => setNewPoForm({...newPoForm, supplier: e.target.value})}
                  >
                    <option>Molecule Dist.</option>
                    <option>Modus Lighting</option>
                    <option>Philips Advance</option>
                    <option>Made by 1-to-1</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Status</label>
                    <select 
                      className="form-control" 
                      value={newPoForm.status} 
                      onChange={e => setNewPoForm({...newPoForm, status: e.target.value})}
                    >
                      <option>Draft</option>
                      <option>Pending</option>
                      <option>Ongoing</option>
                      <option>Complete</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery ETA</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 28 May"
                      value={newPoForm.eta} 
                      onChange={e => setNewPoForm({...newPoForm, eta: e.target.value})}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowCreatePoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Initialize Sales Order & Open Spec 📈</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICING CONSISTENCY ASSISTANT MODAL */}
      {pendingPriceEdit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', border: '1px solid var(--border-info)', background: 'var(--bg-secondary)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-info)', padding: '12px 16px' }}>
              <div className="card-title" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
                <AlertCircle size={16} color="var(--text-info)" /> Pricing Consistency Assistant
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px', color: 'white' }} onClick={() => setPendingPriceEdit(null)}>✕</button>
            </div>
            
            <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                The product code <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{pendingPriceEdit.code}</strong> is used in multiple areas across this BOQ specification.
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.5' }}>
                Would you like to update the {pendingPriceEdit.field === 'unitCost' ? 'cost price' : 'retail price'} to <strong style={{ color: 'var(--text-success)' }}>R {pendingPriceEdit.value}</strong> for all rows matching this item code, or apply it to this specific row only?
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', fontSize: '12.5px', padding: '8px' }}
                onClick={() => {
                  // Apply to all
                  const { field, value, code } = pendingPriceEdit;
                  setActiveOrderItems(prev => prev.map(item => {
                    if (item.code === code) {
                      return { ...item, [field]: value };
                    }
                    return item;
                  }));
                  setPendingPriceEdit(null);
                }}
              >
                Update All Matching Rows ({activeOrderItems.filter(item => item.code === pendingPriceEdit.code).length} items)
              </button>
              <button 
                type="button"
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', border: '1px solid var(--border)', fontSize: '12.5px', padding: '8px' }}
                onClick={() => {
                  // Apply to this line only
                  const { itemId, field, value } = pendingPriceEdit;
                  handleUpdateSpreadsheetCell(itemId, field, value);
                  setPendingPriceEdit(null);
                }}
              >
                Update This Single Row Only
              </button>
              <button 
                type="button"
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', color: 'var(--text-danger)', fontSize: '12.5px', padding: '6px' }}
                onClick={() => setPendingPriceEdit(null)}
              >
                Cancel Change
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PO Reference Datalist Options */}
      <datalist id="po-ref-options">
        <option value="Stock in Hand" />
        <option value="Client Supplied" />
      </datalist>


      {/* WAYBILL HISTORY MODAL */}
      {waybillHistoryModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '5vh', overflowY: 'auto',
          zIndex: 1200, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                📦 Waybill Delivery Log - {waybillHistoryModalItem.code}
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setWaybillHistoryModalItem(null)}>✕</button>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                {waybillHistoryModalItem.description}
              </p>
              
              <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Waybill / Delivery Note</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '80px' }}>Qty Del</th>
                    <th style={{ textAlign: 'right', padding: '8px', width: '100px' }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '8px', width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {waybillHistoryModalItem.deliveryHistory.map((dh, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}><code>{dh.ref}</code></td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-danger)' }}>{dh.qty}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>{dh.date}</td>
                      <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button 
                          type="button" 
                          className="btn btn-xs btn-ghost text-error" 
                          style={{ minHeight: 'unset', height: '24px', padding: '0 6px', color: 'var(--text-danger)' }}
                          onClick={() => handleDeleteWaybill(waybillHistoryModalItem, dh.ref, dh.date)}
                          title="Delete Waybill Log"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setWaybillHistoryModalItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS VIEWER MODAL */}
      {showPaymentViewer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: '5vh', overflowY: 'auto',
          zIndex: 1200, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💳 Payments Log Viewer - Quotation {selectedOrderId}
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowPaymentViewer(false)}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <table className="table" style={{ width: '100%', fontSize: '12.5px', marginBottom: '15px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Payment Type</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Reference / Notes</th>
                    <th style={{ textAlign: 'right', padding: '8px', width: '110px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {orderPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No payments have been logged yet for this order.
                      </td>
                    </tr>
                  ) : (
                    orderPayments.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>{p.date}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(96, 165, 250, 0.15)', color: 'var(--text-info)' }}>
                            {p.type || 'Deposit Payment'}
                          </span>
                        </td>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{p.reference || '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-success)', fontFamily: 'monospace' }}>
                          R {Math.round(p.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              <div style={{ background: 'var(--bg-primary)', borderRadius: '6px', padding: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span>Total Paid Summary:</span>
                <span style={{ color: 'var(--text-success)', fontFamily: 'monospace' }}>R {Math.round(orderPaidAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-sm btn-primary"
                onClick={() => {
                  setShowPaymentViewer(false);
                  navigate('/orders', {
                    state: {
                      openOrderId: selectedOrderId,
                      initialSubTab: 'payments',
                      projectKey: selectedProjectKey
                    }
                  });
                }}
              >
                ➕ Add / Edit Payments
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setShowPaymentViewer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY AUDIT COMPARISON HEATMAP MODAL (INSTANT EXCEL UPLOAD) */}
      {showAuditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250
        }}>
          <div style={{ width: '100%', maxWidth: '580px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 3. Read-Only Audit Heatmap (Instant Excel Upload)
              </h3>
              <button onClick={() => { setShowAuditModal(false); setAuditResult(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Compare your <b>Master System Excel file (.xlsx)</b> directly against the Portal database in real-time. Discrepancies turn <span style={{ color: '#ef4444', fontWeight: 700 }}>red</span>.
              <br/><br/>
              <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '11px', display: 'inline-block' }}>
                🛡️ 100% READ-ONLY: Your Portal database will NEVER be updated, modified, or overwritten.
              </span>
            </div>

            {/* UPLOAD FILE ZONE */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                📁 Select or Drop your Master Excel File (.xlsx)
              </label>
              <div
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('audit-excel-file-input').click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleAuditExcelUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Click to browse or drag & drop Master Excel (.xlsx)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Parses all project tabs locally in 2 seconds without any Google timeouts or size limits.
                </div>
                <input
                  id="audit-excel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAuditExcelUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {auditLoading && (
              <div style={{ padding: '14px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', marginBottom: '16px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#60a5fa' }}>{auditProgress.stage || 'Analyzing Live Data...'}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{auditProgress.percent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${auditProgress.percent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>
            )}

            {auditResult && !auditLoading && (
              <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', marginBottom: '16px', fontSize: '12.5px' }}>
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '13.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✅ Audit Comparison Complete!</span>
                </div>

                {auditResult.stats && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{auditResult.stats.total_orders_audited}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Total Orders</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{auditResult.stats.matches_count}</div>
                      <div style={{ fontSize: '10.5px', color: '#10b981' }}>🟢 Matching</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{auditResult.stats.mismatches_count}</div>
                      <div style={{ fontSize: '10.5px', color: '#ef4444' }}>🔴 Mismatches</div>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{auditResult.stats.missing_in_portal_count}</div>
                      <div style={{ fontSize: '10.5px', color: '#f59e0b' }}>🛑 Missing in Portal</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {auditResult.spreadsheet_url && (
                    <a
                      href={auditResult.spreadsheet_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563eb', color: '#ffffff', padding: '7px 14px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '12px' }}
                    >
                      📊 Open Live Heatmap in Google Sheets ↗
                    </a>
                  )}

                  {auditResult.heatmap_rows && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        const wb = XLSX.utils.book_new();
                        
                        // Tab 1: Audit Heatmap
                        const ws1 = XLSX.utils.aoa_to_sheet(auditResult.heatmap_rows);
                        XLSX.utils.book_append_sheet(wb, ws1, "🚨 AUDIT & DISCREPANCY HEATMAP");

                        // Tab 2: Current Live System Data
                        if (auditResult.legacy_rows && auditResult.legacy_rows.length > 0) {
                          const ws2 = XLSX.utils.aoa_to_sheet(auditResult.legacy_rows);
                          XLSX.utils.book_append_sheet(wb, ws2, "Current Live System Data");
                        }

                        // Tab 3: Portal Cloud SQL Database
                        if (auditResult.portal_rows && auditResult.portal_rows.length > 0) {
                          const ws3 = XLSX.utils.aoa_to_sheet(auditResult.portal_rows);
                          XLSX.utils.book_append_sheet(wb, ws3, "Portal Cloud SQL Database");
                        }

                        XLSX.writeFile(wb, `1-to-1_World_Live_System_Audit_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      📥 Download Audit Excel (.xlsx)
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowAuditModal(false); setAuditResult(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION SUMMARY APPROVAL MODAL */}
      {reconcileSummary && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1300, animation: 'fadeIn 0.2s ease', padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>📋</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Reconciliation Import Summary Preview</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Review parsed contents before committing overwrite to the database</p>
              </div>
            </div>
            
            <div style={{ padding: '24px', maxHeight: '55vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-info)' }}>{reconcileSummary.totalRows}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Ledger Rows Parsed</div>
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-success)' }}>{reconcileSummary.totalOrders}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Total Orders To Overwrite</div>
                </div>
              </div>

              <div style={{ marginBottom: '10px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Target Project Breakdown:
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table className="table" style={{ margin: 0, width: '100%', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Project Name</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', width: '150px' }}>Orders Overwritten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconcileSummary.projectsList.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{p.ordersCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-danger)', lineHeight: 1.4 }}>
                  <strong>Important Note:</strong> This operation will perform a clean, transactional overwrite on all matching Order IDs listed above. This matches your spreadsheet data and cannot be undone.
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => {
                  setReconcileSummary(null);
                  setPendingImportData(null);
                }}
              >
                Cancel Import
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={executeBulkImportSync}
              >
                Confirm & Overwrite Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYNCHRONOUS IMPORT PROGRESS TRACKER OVERLAY */}
      {importProgress && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1400
        }}>
          <div style={{ width: '100%', maxWidth: '450px', padding: '30px', textAlign: 'center', color: '#fff' }}>
            <span style={{ fontSize: '40px', display: 'block', animation: 'spin 4s linear infinite', marginBottom: '20px' }}>⏳</span>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 10px 0' }}>Syncing Database Records</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '0 0 20px 0' }}>
              {importProgress.statusText}
            </p>

            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${importProgress.percent}%`, 
                  background: 'var(--primary-color, #3b82f6)', 
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
              <span>Please do not close this browser tab</span>
              <span>{importProgress.percent}% Complete</span>
            </div>

            <button
              type="button"
              className="btn btn-sm"
              style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--text-danger)', padding: '6px 16px', fontSize: '12px' }}
              onClick={() => {
                if (window.currentImportAbortController) {
                  window.currentImportAbortController();
                }
              }}
            >
              🛑 Stop / Cancel Import
            </button>
          </div>
        </div>
      )}

    </div>
  );
}