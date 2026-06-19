import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
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
  Delivered: 'b-success', 
  'In transit': 'b-info', 
  Pending: 'b-default', 
  Processing: 'b-warning' 
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
  if (resolved.poRef === undefined) {
    if (item.id === 'I-1') resolved.poRef = 'PO-01675';
    else if (item.id === 'I-2') resolved.poRef = 'PO-01679';
    else if (item.id === 'I-3') resolved.poRef = 'PO-01676';
    else resolved.poRef = 'PO-01675';
  }
  if (resolved.poSupplier === undefined) {
    resolved.poSupplier = item.supplier || 'Molecule Dist.';
  }
  if (resolved.poDate === undefined) {
    resolved.poDate = '2026-01-20';
  }
  if (resolved.poQtyOrdered === undefined) {
    resolved.poQtyOrdered = item.qty || 0;
  }
  if (resolved.poEta === undefined) {
    if (item.id === 'I-1') resolved.poEta = '2026-02-12';
    else if (item.id === 'I-2') resolved.poEta = '2026-02-28';
    else if (item.id === 'I-3') resolved.poEta = '2026-01-20';
    else resolved.poEta = '2026-02-12';
  }
  
  // Phase 2: Receiving Phase
  if (resolved.receivedQty === undefined) {
    if (item.id === 'I-1') resolved.receivedQty = 3;
    else if (item.id === 'I-2') resolved.receivedQty = 20;
    else if (item.id === 'I-3') resolved.receivedQty = 50;
    else resolved.receivedQty = item.qty || 0;
  }
  if (resolved.receivedDate === undefined) {
    if (item.id === 'I-1') resolved.receivedDate = '2026-02-17';
    else if (item.id === 'I-2') resolved.receivedDate = '2026-04-21';
    else if (item.id === 'I-3') resolved.receivedDate = '2026-01-21';
    else resolved.receivedDate = '2026-02-17';
  }
  
  // Phase 3: Invoicing Phase
  if (resolved.invoiceQty === undefined) {
    if (item.id === 'I-1') resolved.invoiceQty = 3;
    else if (item.id === 'I-2') resolved.invoiceQty = 20;
    else if (item.id === 'I-3') resolved.invoiceQty = 50;
    else resolved.invoiceQty = item.qty || 0;
  }
  if (resolved.invoiceRef === undefined) {
    if (item.id === 'I-1') resolved.invoiceRef = 'INV01599';
    else if (item.id === 'I-2') resolved.invoiceRef = 'INV-000102';
    else if (item.id === 'I-3') resolved.invoiceRef = 'INV01510';
    else resolved.invoiceRef = 'INV01599';
  }
  if (resolved.invoiceDate === undefined) {
    if (item.id === 'I-1') resolved.invoiceDate = '2026-02-18';
    else if (item.id === 'I-2') resolved.invoiceDate = '2026-04-21';
    else if (item.id === 'I-3') resolved.invoiceDate = '2026-01-22';
    else resolved.invoiceDate = '2026-02-18';
  }
  if (resolved.invoiceValue === undefined) {
    resolved.invoiceValue = resolved.invoiceQty * (item.unitRetail || 0);
  }
  
  // Phase 4: Delivery Phase
  if (resolved.deliveryQty === undefined) {
    if (item.id === 'I-1') resolved.deliveryQty = 3;
    else if (item.id === 'I-2') resolved.deliveryQty = 20;
    else if (item.id === 'I-3') resolved.deliveryQty = 50;
    else resolved.deliveryQty = item.qty || 0;
  }
  if (resolved.deliveryDate === undefined) {
    resolved.deliveryDate = '2026-03-09';
  }
  if (resolved.deliveryStatus === undefined) {
    resolved.deliveryStatus = 'Delivered';
  }
  if (resolved.deliveryNotes === undefined) {
    if (item.id === 'I-1') resolved.deliveryNotes = 'x3 collected 09/03/2026 by Triton Zaza waybill 16644339, CPT 767862';
    else if (item.id === 'I-2') resolved.deliveryNotes = 'Using x20 05-E014-J6-CL from Singita (The Hub Zone 1). Only receiving on system when we receive x107 from LEDS C4. P.O. number T.B.C. x20 collected 09/03/2026 by Triton Zaza waybill 16644339, CPT 767862';
    else if (item.id === 'I-3') resolved.deliveryNotes = 'x56 collected 09/03/2026 by Triton Zaza waybill 16644339, CPT 767862';
    else resolved.deliveryNotes = `x${resolved.qty} delivered by Darren - Received by Ismail 10/03/2026`;
  }
  
  return resolved;
};

export default function SalesTracker() {
  const { projects, updateProject, contacts } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Temporary state for the active order items in the spreadsheet workspace
  const [activeOrderItems, setActiveOrderItems] = useState([]);

  const [activeTab, setActiveTab] = useState('order'); // 'order' | 'purchasing' | 'invoicing' | 'delivery'
  const [showHeaderDetails, setShowHeaderDetails] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);

  const groupedItems = useMemo(() => {
    const groups = {};
    activeOrderItems.forEach(item => {
      const codeKey = item.code || ('CUSTOM_' + item.id);
      if (!groups[codeKey]) {
        groups[codeKey] = {
          code: item.code,
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
          itemIds: [],
          poRefs: new Set(),
          poSuppliers: new Set(),
          poDates: new Set(),
          poEtas: new Set(),
          receivedDates: new Set(),
          invoiceRefs: new Set(),
          invoiceDates: new Set(),
          invoiceValues: 0,
          deliveryDates: new Set(),
          deliveryStatuses: new Set(),
          deliveryNotesList: [],
          areasSet: new Set()
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

      const receivedDateVal = item.receivedDate !== undefined ? item.receivedDate : defaults.receivedDate;
      const receivedQtyVal = item.receivedQty !== undefined ? item.receivedQty : defaults.receivedQty;

      const invoiceQtyVal = item.invoiceQty !== undefined ? item.invoiceQty : defaults.invoiceQty;
      const invoiceRefVal = item.invoiceRef !== undefined ? item.invoiceRef : defaults.invoiceRef;
      const invoiceDateVal = item.invoiceDate !== undefined ? item.invoiceDate : defaults.invoiceDate;
      const invoiceValueVal = item.invoiceValue !== undefined ? item.invoiceValue : defaults.invoiceValue;

      const deliveryQtyVal = item.deliveryQty !== undefined ? item.deliveryQty : defaults.deliveryQty;
      const deliveryDateVal = item.deliveryDate !== undefined ? item.deliveryDate : defaults.deliveryDate;
      const deliveryStatusVal = item.deliveryStatus !== undefined ? item.deliveryStatus : defaults.deliveryStatus;
      const deliveryNotesVal = item.deliveryNotes !== undefined ? item.deliveryNotes : defaults.deliveryNotes;

      g.poQtyOrdered += Number(poQtyOrderedVal) || 0;
      g.receivedQty += Number(receivedQtyVal) || 0;
      g.invoiceQty += Number(invoiceQtyVal) || 0;
      g.invoiceValues += Number(invoiceValueVal) || 0;
      g.deliveryQty += Number(deliveryQtyVal) || 0;

      if (poRefVal) g.poRefs.add(poRefVal);
      if (poSupplierVal) g.poSuppliers.add(poSupplierVal);
      if (poDateVal) g.poDates.add(poDateVal);
      if (poEtaVal) g.poEtas.add(poEtaVal);
      if (receivedDateVal) g.receivedDates.add(receivedDateVal);
      if (invoiceRefVal) g.invoiceRefs.add(invoiceRefVal);
      if (invoiceDateVal) g.invoiceDates.add(invoiceDateVal);
      if (deliveryDateVal) g.deliveryDates.add(deliveryDateVal);
      if (deliveryStatusVal) g.deliveryStatuses.add(deliveryStatusVal);
      if (deliveryNotesVal) g.deliveryNotesList.push(deliveryNotesVal);
      if (item.area) g.areasSet.add(`${item.area} (${item.floor || 'Ground'})`);
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
        poDate: g.poDates.size > 0 ? Array.from(g.poDates)[0] : '',
        poQtyOrdered: g.poQtyOrdered,
        poEta: g.poEtas.size > 0 ? Array.from(g.poEtas)[0] : '',
        receivedQty: g.receivedQty,
        receivedDate: g.receivedDates.size > 0 ? Array.from(g.receivedDates)[0] : '',
        invoiceQty: g.invoiceQty,
        invoiceRef: g.invoiceRefs.size > 0 ? Array.from(g.invoiceRefs).join(', ') : '',
        invoiceDate: g.invoiceDates.size > 0 ? Array.from(g.invoiceDates)[0] : '',
        invoiceValue: g.invoiceValues,
        deliveryQty: g.deliveryQty,
        deliveryDate: g.deliveryDates.size > 0 ? Array.from(g.deliveryDates)[0] : '',
        deliveryStatus: g.deliveryStatuses.size > 0 ? Array.from(g.deliveryStatuses)[0] : 'Pending',
        deliveryNotes: g.deliveryNotesList.length > 0 ? g.deliveryNotesList.filter(Boolean).join('; ') : '',
        area: g.areasSet.size > 0 ? Array.from(g.areasSet).join(', ') : '—'
      };
    });
  }, [activeOrderItems]);

  const getVisibleCols = () => {
    if (activeTab === 'purchasing') {
      return ['poRef', 'poSupplier', 'poDate', 'poQtyOrdered', 'poEta', 'receivedQty', 'receivedDate'];
    }
    if (activeTab === 'invoicing') {
      return ['invoiceQty', 'invoiceRef', 'invoiceDate', 'invoiceValue'];
    }
    if (activeTab === 'delivery') {
      return ['deliveryQty', 'deliveryDate', 'deliveryStatus', 'deliveryNotes'];
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
                newItems[idx] = {
                  ...newItems[idx],
                  [targetCol]: allocated
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
  const [orderStatus, setOrderStatus] = useState('');
  const [orderEta, setOrderEta] = useState('');
  const [orderPaidAmount, setOrderPaidAmount] = useState(0);
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

  // DOCUMENT SCRATCHPAD & LIVING LEDGER HISTORIC CONTAINER STATE
  const [actionQuantities, setActionQuantities] = useState({}); // { itemId: number }
  const [priceOverrides, setPriceOverrides] = useState({});     // { itemId: number }
  const [orderDocumentsHistory, setOrderDocumentsHistory] = useState([]); // List of saved sub-documents
  const [selectedViewingDocument, setSelectedViewingDocument] = useState(null); // Currently selected historical document to display
  const [expandedItemId, setExpandedItemId] = useState(null); // Which item is expanded for the pipeline tracking details
  const [showCosts, setShowCosts] = useState(false); // Controls whether cost columns are visible in the ledger
  const [bulkField, setBulkField] = useState('poRef');
  const [bulkValue, setBulkValue] = useState('');



  // Search & Filter state for the ledger list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');

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
          list.push({
            ...o,
            projectKey: p.key,
            projectName: p.name,
            projectClient: p.client,
            projectStart: p.start
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
      // Find the specific quotation
      const targetOrder = allOrders.find(o => o.id === location.state.openOrderId);
      if (targetOrder) {
        handleOpenWorkspace(targetOrder);
      }
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
    const pendingGroup = dateFilteredOrders.filter(o => o.status === 'Pending' || o.status === 'Processing');
    const activeGroup = dateFilteredOrders.filter(o => o.status === 'In transit' || (o.status === 'Delivered' && (o.outstanding || 0) > 0));
    const completeGroup = dateFilteredOrders.filter(o => o.status === 'Delivered' && (o.outstanding || 0) <= 0);

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
      const matchesSearch = 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchesProject = projectFilterKey === 'All' || o.projectKey === projectFilterKey;
      
      // KPI interactive filter matching
      let matchesKpi = true;
      if (activeKpiFilter === 'all') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = o.status === 'Pending' || o.status === 'Processing';
      } else if (activeKpiFilter === 'active') {
        matchesKpi = o.status === 'In transit' || (o.status === 'Delivered' && (o.outstanding || 0) > 0);
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = o.status === 'Delivered' && (o.outstanding || 0) <= 0;
      }

      return matchesSearch && matchesStatus && matchesProject && matchesKpi;
    });
  }, [dateFilteredOrders, searchQuery, filterStatus, projectFilterKey, activeKpiFilter]);

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
    setActiveOrderItems(order.itemsList || []);
    setOrderDiscount(order.discount || 0);
    setSupplier(order.supplier);
    setOrderStatus(order.status);
    setOrderEta(order.eta || '—');
    setOrderPaidAmount(order.paid || 0);
    setWorkspaceSubTab('boq');

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

    setOneOneRep(order.oneOneRep || 'Merlyn');
    setPmName(order.pmName || proj.pm || 'Modus Special F');
    setPmPhone(order.pmPhone || '083 570 7795');
    setPmEmail(order.pmEmail || (proj.pm ? `${proj.pm.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world` : 'merlyn.mittins@1-to-1.world'));
    
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

    setDeliveryAddress(order.deliveryAddress || '7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941');
    setBillingDetails(order.billingDetails || 'TEST TSTETESSETSETEESTSETEST\nTEST TSTETESSETSETEESTSETEST');
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
            const maxForItem = item.qty || 0;
            const allocated = Math.min(maxForItem, remaining);
            remaining -= allocated;
            return {
              ...item,
              [field]: allocated
            };
          }
          return item;
        });
      });
    } else {
      // Set all items with itemIds to the same value
      setActiveOrderItems(prev => prev.map(item => {
        if (itemIds.includes(item.id)) {
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
    const balanceOutstanding = Math.max(0, discountedValue - Number(orderPaidAmount));

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
          depositValue,
          balanceValue,
          depositPercent: (discountedValue * (1 + (Number(orderVatRate) / 100))) > 0 ? (depositValue / (discountedValue * (1 + (Number(orderVatRate) / 100)))) * 100 : 70,
          balancePercent: (discountedValue * (1 + (Number(orderVatRate) / 100))) > 0 ? (balanceValue / (discountedValue * (1 + (Number(orderVatRate) / 100)))) * 100 : 30,
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
                  📈 Sales Tracker Dashboard
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

          {/* EMPTY STATE WORKSPACE PANEL — shown while no order is selected */}
          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: '16px',
            padding: '36px 24px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(24,95,165,0.03) 0%, rgba(139,92,246,0.02) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(24,95,165,0.12) 0%, rgba(139,92,246,0.08) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid rgba(24,95,165,0.2)',
              marginBottom: '4px'
            }}>
              <FileSpreadsheet size={26} color="var(--text-info)" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Sales Workspace Inactive
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.6' }}>
                Select any order from the ledger below to open the full specification spreadsheet workspace — including BOQ builder, procurement tracker, and invoicing.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['📋 BOQ Specification', '🚚 Procurement Tracker', '📄 Invoicing', '📊 Area-by-Area Breakdown'].map(label => (
                <span key={label} style={{
                  fontSize: '11px', padding: '4px 10px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: '20px', color: 'var(--text-secondary)', fontWeight: 500
                }}>{label}</span>
              ))}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight size={13} color="var(--text-info)" />
              Click any row in the table below to activate the workspace
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
                      placeholder="Search by quotation ref, client, or supplier..."
                      className="form-control"
                      style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="In transit">In transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '200px', height: '34px', fontSize: '13px' }}
                    value={projectFilterKey}
                    onChange={e => setProjectFilterKey(e.target.value)}
                  >
                    <option value="All">All Linked Projects</option>
                    {Object.values(projects).map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredOrders.length}</strong> active sales records
                </div>
              </div>

              {/* ORDERS LEDGER LIST */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>Quote Reference</th>
                      <th>Order Name</th>
                      <th>Project Name</th>
                      <th>Client Name</th>
                      <th>Retail Value Ex Vat</th>
                      <th>Amount Paid</th>
                      <th>Amount Outstanding</th>
                      <th>Margin</th>
                      <th>Order Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => {
                      const cost = o.costValue || 0;
                      const retail = o.value || 0;
                      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                      const isLowMargin = margin < 39;

                      return (
                        <tr key={o.id} className="clickable" onClick={() => handleOpenWorkspace(o)}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{o.id}</td>
                          <td style={{ fontWeight: 600 }}>{o.supplier}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${o.projectKey}`); }}>{o.projectFullName || o.projectName}</td>
                          <td style={{ color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate('/crm', { state: { selectedClientName: (o.clientContact || o.projectClient) } }); }}>{(o.clientCompany || o.projectClient) || '—'}</td>
                          <td style={{ fontWeight: 600 }}>R {retail.toLocaleString()}</td>
                          <td style={{ color: 'var(--text-success)' }}>R {(o.paid || 0).toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: (o.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                            R {(o.outstanding || 0).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {margin}% {isLowMargin && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: '3px' }} />}
                          </td>
                          <td>
                            <span className={`badge ${statusColor[o.status] || 'b-default'}`}>{o.status}</span>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
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
                  {orderSupplier} Sales Specification — <span style={{ color: 'var(--text-info)' }}>{selectedOrderId}</span>
                </h2>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '10px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Status:</span>
                  <select 
                    className="form-control"
                    style={{ width: '110px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value)}
                  >
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>In transit</option>
                    <option>Delivered</option>
                  </select>
                  
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginLeft: '6px' }}>Paid:</span>
                  <input 
                    type="number"
                    className="form-control"
                    style={{ width: '100px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                    value={orderPaidAmount}
                    onChange={e => setOrderPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>

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

            /* SALES TRACKER MIRROR VIEW */
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
                        <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '10px' }}><strong>Rep:</strong> {oneOneRep}</span>
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
                    {showHeaderDetails ? 'Collapse Details ▲' : 'Edit Details ▼'}
                  </button>
                </div>
                
                {showHeaderDetails && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 15px', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {/* Company */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Company</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={clientCompany} 
                        onChange={e => setClientCompany(e.target.value)}
                      />
                    </div>

                    {/* Project */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Project Details</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={projectFullName} 
                        onChange={e => setProjectFullName(e.target.value)}
                      />
                    </div>

                    {/* Delivery Address */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Delivery Address</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={deliveryAddress} 
                        onChange={e => setDeliveryAddress(e.target.value)}
                      />
                    </div>

                    {/* Sale Rep Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Sale Rep Name</label>
                      <select 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={oneOneRep} 
                        onChange={e => setOneOneRep(e.target.value)}
                      >
                        <option>Merlyn</option>
                        <option>Martin Döller</option>
                        <option>Modus Special F</option>
                      </select>
                    </div>

                    {/* Sale Rep (or PM) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Sale Rep (or PM)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={pmName} 
                        onChange={e => setPmName(e.target.value)}
                      />
                    </div>

                    {/* Date Created */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Date Created</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={orderDate} 
                        onChange={e => setOrderDate(e.target.value)}
                      />
                    </div>

                    {/* Quotation Sent */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Quotation Sent</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={quotationSentDate} 
                        onChange={e => setQuotationSentDate(e.target.value)}
                      />
                    </div>

                    {/* Class */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Class</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={projectClass} 
                        onChange={e => setProjectClass(e.target.value)}
                      />
                    </div>

                    {/* Tier */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Tier</label>
                      <select 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={projectTier} 
                        onChange={e => setProjectTier(e.target.value)}
                      >
                        <option>Portfolio</option>
                        <option>Signature</option>
                        <option>Premium</option>
                      </select>
                    </div>

                    {/* File Source */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>File Source</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        value={fileSource} 
                        onChange={e => setFileSource(e.target.value)}
                      />
                    </div>

                    {/* PF Number & Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>PF Number & Date</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input 
                          type="text" 
                          placeholder="PF Number" 
                          className="form-control" 
                          style={{ height: '26px', fontSize: '11px', flex: 1, padding: '2px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                          value={pfNumber} 
                          onChange={e => setPfNumber(e.target.value)}
                        />
                        <input 
                          type="date" 
                          className="form-control" 
                          style={{ height: '26px', fontSize: '11px', width: '90px', padding: '2px 4px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                          value={toInputDate(pfDate)} 
                          onChange={e => setPfDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
                
                {/* TOP SUMMARY STRIP */}
                {(() => {
                  const totalMasterQty = activeOrderItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                  const totalMasterCost = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
                  const totalMasterRetail = activeOrderItems.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                  const masterDiscounted = Math.max(0, totalMasterRetail * (1 - (Number(orderDiscount) || 0) / 100));

                  // Delivery metrics calculated from items directly
                  const totalDeliveredQty = activeOrderItems.reduce((sum, item) => {
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

                  return (
                    <>
                      {/* ITEM-BY-ITEM TRACKING SHEET */}
                      <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📋 Hardware Item Ledger & Fulfillment
                          </h4>
                          
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
                        
                        <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                          <table className="table" style={{ margin: 0, fontSize: '12px', verticalAlign: 'middle', borderCollapse: 'separate', borderSpacing: '0', minWidth: activeTab === 'purchasing' ? '1350px' : activeTab === 'order' ? '1100px' : activeTab === 'invoicing' ? '1100px' : '1200px' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th colSpan={6} style={{ background: 'rgba(0,0,0,0.1)', textAlign: 'center', borderRight: '1px solid var(--border-strong)', fontWeight: 700, fontSize: '11px' }}>CORE FITTING DETAILS</th>
                                
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
                                    colSpan={8} 
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
                                    colSpan={4} 
                                    style={{ background: 'rgba(236, 72, 153, 0.1)', textAlign: 'center', fontWeight: 700, fontSize: '11px', color: 'var(--text-danger)' }}
                                  >
                                    PHASE 3: DELIVERY LOGISTICS
                                  </th>
                                )}
                              </tr>
                              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-strong)' }}>
                                <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '80px' }}>Type Code</th>
                                <th style={{ width: '130px' }}>Item Code</th>
                                <th style={{ width: '250px' }}>Description</th>
                                <th style={{ width: '90px', textAlign: 'right' }}>Unit Retail</th>
                                <th style={{ width: '100px', textAlign: 'right', borderRight: '1px solid var(--border-strong)' }}>Total Retail</th>
                                
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
                                    <th style={{ width: '100px' }}>PO Reference</th>
                                    <th style={{ width: '120px' }}>Supplier</th>
                                    <th style={{ width: '100px' }}>Date Ordered</th>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Ord</th>
                                    <th style={{ width: '100px', borderRight: '1px solid var(--border-strong)' }}>Delivery ETA</th>
                                    <th style={{ width: '70px', textAlign: 'center' }}>Qty Rec</th>
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
                                    <th>Delivery Notes / Waybill Log</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody onKeyDown={handleSpreadsheetKeyDown} onPaste={handleSpreadsheetPaste}>
                              {groupedItems.map((item, rowIndex) => {
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
                                    <td style={{ fontFamily: 'monospace' }}>{item.type || '—'}</td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{item.code || 'CUSTOM'}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.description}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.unitRetail || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, borderRight: '1px solid var(--border-strong)' }}>R {Math.round(item.qty * (item.unitRetail || 0)).toLocaleString()}</td>

                                    {activeTab === 'order' && (
                                      <>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.unitCost || 0).toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>R {Math.round(item.qty * (item.unitCost || 0)).toLocaleString()}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>{Math.round(lineMargin)}%</td>
                                        <td>{item.brand || '—'}</td>
                                        <td>{item.supplier || '—'}</td>
                                        <td style={{ borderRight: '1px solid var(--border-strong)', verticalAlign: 'middle', padding: '4px 8px' }}>
                                          <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                                            {item.area || 'LED'}
                                          </span>
                                        </td>
                                      </>
                                    )}

                                    {activeTab === 'purchasing' && (
                                      <>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="text" 
                                            className="gs-cell-input" 
                                            value={poRefVal}
                                            data-row={rowIndex}
                                            data-col="poRef"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'poRef', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="text" 
                                            className="gs-cell-input" 
                                            value={poSupplierVal}
                                            data-row={rowIndex}
                                            data-col="poSupplier"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'poSupplier', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="date" 
                                            className="gs-cell-input" 
                                            style={{ colorScheme: 'dark' }}
                                            value={toInputDate(poDateVal)}
                                            data-row={rowIndex}
                                            data-col="poDate"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'poDate', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0, textAlign: 'center' }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            value={poQtyOrderedVal}
                                            data-row={rowIndex}
                                            data-col="poQtyOrdered"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'poQtyOrdered', Math.max(0, parseInt(e.target.value) || 0))}
                                          />
                                        </td>
                                        <td style={{ padding: 0, borderRight: '1px solid var(--border-strong)' }}>
                                          <input 
                                            type="text" 
                                            className="gs-cell-input" 
                                            value={poEtaVal}
                                            data-row={rowIndex}
                                            data-col="poEta"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'poEta', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0, textAlign: 'center' }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            value={receivedQtyVal}
                                            data-row={rowIndex}
                                            data-col="receivedQty"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'receivedQty', Math.max(0, parseInt(e.target.value) || 0))}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="date" 
                                            className="gs-cell-input" 
                                            style={{ colorScheme: 'dark' }}
                                            value={toInputDate(receivedDateVal)}
                                            data-row={rowIndex}
                                            data-col="receivedDate"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'receivedDate', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, borderRight: '1px solid var(--border-strong)', color: 'var(--text-success)', paddingRight: '10px' }}>
                                          R {Math.round(calculatedValueReceived).toLocaleString()}
                                        </td>
                                      </>
                                    )}

                                    {activeTab === 'invoicing' && (
                                      <>
                                        <td style={{ padding: 0, textAlign: 'center' }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            value={invoiceQtyVal}
                                            data-row={rowIndex}
                                            data-col="invoiceQty"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'invoiceQty', Math.max(0, parseInt(e.target.value) || 0))}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="text" 
                                            className="gs-cell-input" 
                                            value={invoiceRefVal}
                                            data-row={rowIndex}
                                            data-col="invoiceRef"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'invoiceRef', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <input 
                                            type="date" 
                                            className="gs-cell-input" 
                                            style={{ colorScheme: 'dark' }}
                                            value={toInputDate(invoiceDateVal)}
                                            data-row={rowIndex}
                                            data-col="invoiceDate"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'invoiceDate', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0, textAlign: 'right' }}>
                                          <input 
                                            type="number" 
                                            className="gs-cell-input" 
                                            value={invoiceValueVal}
                                            data-row={rowIndex}
                                            data-col="invoiceValue"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'invoiceValue', Math.max(0, parseFloat(e.target.value) || 0))}
                                          />
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
                                            value={deliveryQtyVal}
                                            data-row={rowIndex}
                                            data-col="deliveryQty"
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
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryDate', e.target.value)}
                                          />
                                        </td>
                                        <td style={{ padding: 0 }}>
                                          <select 
                                            className="gs-cell-select" 
                                            value={deliveryStatusVal}
                                            data-row={rowIndex}
                                            data-col="deliveryStatus"
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
                                            placeholder="e.g. waybills, collectors..."
                                            value={deliveryNotesVal}
                                            data-row={rowIndex}
                                            data-col="deliveryNotes"
                                            onChange={(e) => handleUpdateSpreadsheetCell(item.itemIds, 'deliveryNotes', e.target.value)}
                                          />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* BOTTOM MILESTONES & FINANCIAL CALCULATIONS BLOCK */}
                      <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginTop: '20px' }}>
                        
                        {(() => {
                          const subTotal = totalMasterRetail;
                          const discountVal = totalMasterRetail * (Number(orderDiscount) || 0) / 100;
                          const priceExVat = masterDiscounted;
                          const calculatedVat = priceExVat * (Number(orderVatRate) / 100);
                          const totalPriceInclVat = priceExVat + calculatedVat;
                          const depositInclVat = Number(depositValue);
                          const balancePaymentInclVat = Number(balanceValue);
                          const outstandingBalance = totalPriceInclVat - Number(orderPaidAmount);

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
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                  
                                  {/* LEFT SIDE: MILESTONES */}
                                  <div>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Payment Milestones & Administration
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px 15px', alignItems: 'center' }}>
                                      
                                      {/* Deposit Invoice Sent */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Deposit Invoice Sent?</div>
                                      <div>
                                        <select 
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={depositInvoiceSent}
                                          onChange={e => setDepositInvoiceSent(e.target.value)}
                                        >
                                          <option value="No">No</option>
                                          <option value="Yes">Yes</option>
                                        </select>
                                      </div>

                                      {/* PF Invoice Sent */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>PF Invoice Sent Date</div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(pfInvoiceSentDate)}
                                          onChange={e => setPfInvoiceSentDate(e.target.value)}
                                        />
                                      </div>

                                      {/* Commission */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Commission Value</div>
                                      <div>
                                        <div style={{ position: 'relative' }}>
                                          <span style={{ position: 'absolute', left: '8px', top: '5px', fontSize: '11px', color: 'var(--text-tertiary)' }}>R</span>
                                          <input 
                                            type="number"
                                            className="form-control"
                                            style={{ height: '28px', fontSize: '12px', padding: '2px 8px 2px 20px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                            value={commissionValue}
                                            onChange={e => setCommissionValue(Math.max(0, parseFloat(e.target.value) || 0))}
                                          />
                                        </div>
                                      </div>

                                      {/* Deposit Paid Date */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        {totalPriceInclVat > 0 ? Math.round((depositValue / totalPriceInclVat) * 100) : 70}% Deposit Paid Date
                                      </div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(depositPaymentDate)}
                                          onChange={e => setDepositPaymentDate(e.target.value)}
                                        />
                                      </div>

                                      {/* Balance Paid Date */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        {totalPriceInclVat > 0 ? Math.round((balanceValue / totalPriceInclVat) * 100) : 30}% Balance Paid Date
                                      </div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(balancePaymentDate)}
                                          onChange={e => setBalancePaymentDate(e.target.value)}
                                        />
                                      </div>

                                      {/* Ongoing Time */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ongoing Time</div>
                                      <div>
                                        <input 
                                          type="text"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          placeholder="Ongoing Time Status"
                                          value={ongoingTime}
                                          onChange={e => setOngoingTime(e.target.value)}
                                        />
                                      </div>

                                      {/* Latest Statement Sent Date */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Latest Statement Sent Date</div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(latestStatementSentDate)}
                                          onChange={e => setLatestStatementSentDate(e.target.value)}
                                        />
                                      </div>

                                      {/* Progress Payment Date Sent */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Progress Payment Date Sent</div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(progressPaymentDateSent)}
                                          onChange={e => setProgressPaymentDateSent(e.target.value)}
                                        />
                                      </div>

                                      {/* Date Completed */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Date Completed</div>
                                      <div>
                                        <input 
                                          type="date"
                                          className="form-control"
                                          style={{ height: '28px', fontSize: '12px', padding: '2px 8px', colorScheme: 'dark', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          value={toInputDate(dateCompleted)}
                                          onChange={e => setDateCompleted(e.target.value)}
                                        />
                                      </div>

                                      {/* Response regarding payment */}
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Response regarding payment</div>
                                      <div>
                                        <textarea 
                                          className="form-control"
                                          rows={2}
                                          style={{ fontSize: '12px', padding: '6px 8px', resize: 'none', height: '46px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                          placeholder="MD to sign off before any orders can be placed..."
                                          value={paymentResponse}
                                          onChange={e => setPaymentResponse(e.target.value)}
                                        />
                                      </div>

                                    </div>
                                  </div>

                                  {/* RIGHT SIDE: FINANCIAL SUMMARY */}
                                  <div style={{ borderLeft: '1.5px solid var(--border)', paddingLeft: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Financial Calculations & Summaries
                                    </h4>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                                      
                                      {/* Sub Total */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>SUB TOTAL</span>
                                        <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(subTotal).toLocaleString()}</strong>
                                      </div>

                                      {/* Discount */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>DISCOUNT (%)</span>
                                          <input 
                                            type="number"
                                            className="form-control"
                                            style={{ width: '55px', height: '22px', fontSize: '11px', padding: '1px 4px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                            value={orderDiscount}
                                            onChange={e => setOrderDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                          />
                                        </div>
                                        <span style={{ fontFamily: 'monospace', color: discountVal > 0 ? 'var(--text-warning)' : 'var(--text-secondary)' }}>
                                          R {Math.round(discountVal).toLocaleString()}
                                        </span>
                                      </div>

                                      {/* Price Excl VAT */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>PRICE EXCL. VAT</span>
                                        <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(priceExVat).toLocaleString()}</strong>
                                      </div>

                                      {/* VAT */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>VAT (%)</span>
                                          <input 
                                            type="number"
                                            className="form-control"
                                            style={{ width: '55px', height: '22px', fontSize: '11px', padding: '1px 4px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                            value={orderVatRate}
                                            onChange={e => setOrderVatRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                          />
                                        </div>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>R {Math.round(calculatedVat).toLocaleString()}</span>
                                      </div>

                                      {/* Total Price Incl VAT */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '2px solid var(--border-strong)' }}>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>TOTAL PRICE INCL. VAT</span>
                                        <strong style={{ fontSize: '14px', color: 'var(--text-info)', fontFamily: 'monospace' }}>
                                          R {Math.round(totalPriceInclVat).toLocaleString()}
                                        </strong>
                                      </div>

                                      {/* Deposit Incl VAT */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', paddingTop: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>Deposit (R)</span>
                                          <input 
                                            type="number"
                                            className="form-control"
                                            style={{ width: '90px', height: '22px', fontSize: '11px', padding: '1px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                            value={depositValue}
                                            onChange={e => setDepositValue(Math.max(0, parseFloat(e.target.value) || 0))}
                                          />
                                          <span style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>
                                            ({totalPriceInclVat > 0 ? Math.round((depositValue / totalPriceInclVat) * 100) : 0}%)
                                          </span>
                                        </div>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(depositValue).toLocaleString()}</span>
                                      </div>

                                      {/* Balance Payment */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: 'var(--text-secondary)' }}>Balance Payment (R)</span>
                                          <input 
                                            type="number"
                                            className="form-control"
                                            style={{ width: '90px', height: '22px', fontSize: '11px', padding: '1px 4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                                            value={balanceValue}
                                            onChange={e => setBalanceValue(Math.max(0, parseFloat(e.target.value) || 0))}
                                          />
                                          <span style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>
                                            ({totalPriceInclVat > 0 ? Math.round((balanceValue / totalPriceInclVat) * 100) : 0}%)
                                          </span>
                                        </div>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>R {Math.round(balanceValue).toLocaleString()}</span>
                                      </div>

                                      {/* Balance */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Outstanding Balance</span>
                                        <strong style={{ fontSize: '14px', color: outstandingBalance > 0 ? 'var(--text-warning)' : 'var(--text-success)', fontFamily: 'monospace' }}>
                                          R {Math.round(outstandingBalance).toLocaleString()}
                                        </strong>
                                      </div>

                                    </div>
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
                      <option>Pending</option>
                      <option>Processing</option>
                      <option>In transit</option>
                      <option>Delivered</option>
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

    </div>
  );
}