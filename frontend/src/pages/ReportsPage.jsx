import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, 
  CheckCircle, FileText, BarChart2, Plus, ArrowUpRight, ArrowDownRight, Settings,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, FolderOpen, Calendar, ShieldCheck, Save, Users, Edit3, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown, Download, FileSpreadsheet, Layers
} from 'lucide-react';

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Baseline fallback config if database settings are empty
const DEFAULT_BUDGETS_CONFIG = {
  "2026-2027": {
    divisions: [
      'MODUS PROFESSIONAL ( Ryan )',
      'MOOD STORES',
      'MODUS PROJECTS ( Dani )',
      'PROJECTS (Dani own)',
      'MODUS SIGNATURE ( Thando )',
      'MADE ( Jon-Peer)',
      'LUXELINE',
      'INTERNAL - Office',
      'UNALLOCATED / UNASSIGNED'
    ],
    budgetsKPI1: {
      'MODUS PROFESSIONAL ( Ryan )': [1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000, 1020000],
      'MOOD STORES': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'MODUS PROJECTS ( Dani )': [1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000],
      'PROJECTS (Dani own)': [400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000, 400000],
      'MODUS SIGNATURE ( Thando )': [37500, 37500, 37500, 37500, 37500, 37500, 37500, 37500, 37500, 37500, 37500, 37500],
      'MADE ( Jon-Peer)': [120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000],
      'LUXELINE': [120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000],
      'INTERNAL - Office': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'UNALLOCATED / UNASSIGNED': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    targetsKPI2: {
      'MODUS PROFESSIONAL ( Ryan )': 3400381.18,
      'MOOD STORES': 0.00,
      'MODUS PROJECTS ( Dani )': 3155386.31,
      'PROJECTS (Dani own)': 2641586.56,
      'MODUS SIGNATURE ( Thando )': 0.00,
      'MADE ( Jon-Peer)': 2832.66,
      'LUXELINE': 400000.00,
      'INTERNAL - Office': 76269.45
    },
    targetsKPI3: {
      'MODUS PROFESSIONAL ( Ryan )': 3031966.55,
      'MOOD STORES': 0.00,
      'MODUS PROJECTS ( Dani )': 1823997.81,
      'PROJECTS (Dani own)': 2567090.19,
      'MODUS SIGNATURE ( Thando )': -1176583.38,
      'MADE ( Jon-Peer)': -413834.01,
      'LUXELINE': 400000.00,
      'INTERNAL - Office': 76269.45
    },
    budgetsKPI4: {
      'MODUS PROFESSIONAL ( Ryan )': 17000000.00,
      'MOOD STORES': 0.00,
      'MODUS PROJECTS ( Dani )': 16000000.00,
      'PROJECTS (Dani own)': 4000000.00,
      'MODUS SIGNATURE ( Thando )': 2500000.00,
      'MADE ( Jon-Peer)': 2000000.00,
      'LUXELINE': 1000000.00,
      'INTERNAL - Office': 0.00
    },
    targetsKPI5: {
      'MODUS PROFESSIONAL ( Ryan )': 7769000.00,
      'MOOD STORES': 0.00,
      'MODUS PROJECTS ( Dani )': 6480000.00,
      'PROJECTS (Dani own)': 3160000.00,
      'MODUS SIGNATURE ( Thando )': 0.00,
      'MADE ( Jon-Peer)': 0.00,
      'LUXELINE': 0.00,
      'INTERNAL - Office': 0.00
    },
    targetsKPI6: {
      deadstock: 500000.00,
      consignment: 1000000.00,
      normal: 500000.00,
      led: 500000.00
    },
    targetsKPI7: {
      enquiries: 1.00,
      faults: 5.00,
      siteVisits: 2.00
    }
  }
};

// Helper: Safely resolve 12-month budget array for a division (with backward-compatibility)
const getMonthlyBudgets = (fyConfig, div) => {
  if (!fyConfig || !fyConfig.budgetsKPI1) return Array(12).fill(0);
  const raw = fyConfig.budgetsKPI1[div];
  if (Array.isArray(raw)) {
    const res = Array(12).fill(0);
    for (let i = 0; i < Math.min(raw.length, 12); i++) {
      res[i] = Number(raw[i]) || 0;
    }
    return res;
  }
  if (raw && typeof raw === 'object' && 'monthly' in raw) {
    return Array(12).fill(Number(raw.monthly) || 0);
  }
  if (typeof raw === 'number') {
    return Array(12).fill(raw);
  }
  return Array(12).fill(0);
};

// Helper: Get FY month labels and metadata (March to February)
const getFyMonthLabels = (fyStr = '2026-2027') => {
  const parts = String(fyStr || '2026-2027').split('-');
  const y1 = parseInt(parts[0]) || 2026;
  const y2 = parseInt(parts[1]) || (y1 + 1);
  return [
    { idx: 0, name: 'March', short: 'Mar', year: y1, label: `Mar '${String(y1).slice(2)}` },
    { idx: 1, name: 'April', short: 'Apr', year: y1, label: `Apr '${String(y1).slice(2)}` },
    { idx: 2, name: 'May', short: 'May', year: y1, label: `May '${String(y1).slice(2)}` },
    { idx: 3, name: 'June', short: 'Jun', year: y1, label: `Jun '${String(y1).slice(2)}` },
    { idx: 4, name: 'July', short: 'Jul', year: y1, label: `Jul '${String(y1).slice(2)}` },
    { idx: 5, name: 'August', short: 'Aug', year: y1, label: `Aug '${String(y1).slice(2)}` },
    { idx: 6, name: 'September', short: 'Sep', year: y1, label: `Sep '${String(y1).slice(2)}` },
    { idx: 7, name: 'October', short: 'Oct', year: y1, label: `Oct '${String(y1).slice(2)}` },
    { idx: 8, name: 'November', short: 'Nov', year: y1, label: `Nov '${String(y1).slice(2)}` },
    { idx: 9, name: 'December', short: 'Dec', year: y1, label: `Dec '${String(y1).slice(2)}` },
    { idx: 10, name: 'January', short: 'Jan', year: y2, label: `Jan '${String(y2).slice(2)}` },
    { idx: 11, name: 'February', short: 'Feb', year: y2, label: `Feb '${String(y2).slice(2)}` }
  ];
};

export default function ReportsPage() {
  const { projects } = useStore();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Selection States
  const [activeReport, setActiveReport] = useState('sales_kpi'); // 'sales_kpi', 'budget_manager', 'operational_kpis', 'stock_valuation'
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('6_2026'); // July 2026
  const [collapsedTables, setCollapsedTables] = useState({ kpi1: false, kpi2: false, kpi3: false, kpi4: false, stock: false });
  const [drilldownModal, setDrilldownModal] = useState({ isOpen: false, title: '', subtitle: '', items: [] });

  // Persistent budget settings loading
  const [budgetsConfig, setBudgetsConfig] = useState(null);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);

  // Budget Manager Active Editing States
  const [mgmtFy, setMgmtFy] = useState('2026-2027');
  const [newDivisionName, setNewDivisionName] = useState('');
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const toggleDivisionExpand = (div) => setExpandedDivisions(prev => ({ ...prev, [div]: !prev[div] }));

  // Drilldown Modal Sort State
  const [drilldownSortField, setDrilldownSortField] = useState(null);
  const [drilldownSortDirection, setDrilldownSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleDrilldownSort = (field) => {
    if (drilldownSortField === field) {
      setDrilldownSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setDrilldownSortField(field);
      setDrilldownSortDirection('asc');
    }
  };

  const renderDrilldownSortIcon = (field) => {
    if (drilldownSortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />;
    return drilldownSortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: '#3b82f6' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: '#3b82f6' }} />;
  };

  const sortedDrilldownItems = React.useMemo(() => {
    const items = drilldownModal.items || [];
    if (!drilldownSortField) return items;

    return [...items].sort((a, b) => {
      let valA = a[drilldownSortField] ?? '';
      let valB = b[drilldownSortField] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return drilldownSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return drilldownSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [drilldownModal.items, drilldownSortField, drilldownSortDirection]);

  const handleExportDrilldownToExcel = () => {
    if (!sortedDrilldownItems || sortedDrilldownItems.length === 0) return;

    const rows = sortedDrilldownItems.map(item => {
      const isCred = item.isCredit || item.value < 0;
      let formattedDate = item.date || 'N/A';
      if (formattedDate && formattedDate.includes('T')) {
        formattedDate = formattedDate.split('T')[0];
      }

      // Extract clean invoice / credit note number if present
      let invNum = item.invoiceNo || '';
      if (!invNum && item.orderId) {
        const match = item.orderId.match(/\((IN-[0-9]+|CN-[0-9]+|CR-[0-9]+)\)/i);
        if (match) {
          invNum = match[1];
        } else if (item.orderId.startsWith('IN-') || item.orderId.startsWith('CN-') || item.orderId.startsWith('CR-')) {
          invNum = item.orderId;
        }
      }

      // Clean order ID
      let cleanOrderId = item.orderId || '';
      if (cleanOrderId.includes('(')) {
        cleanOrderId = cleanOrderId.replace(/\s*\([^)]*\)/g, '').trim();
      }

      return {
        "Invoice / CN #": invNum || '—',
        "Project Name": item.projectName || '',
        "Division": item.division || 'Unassigned',
        "Quote / Order ID": cleanOrderId,
        "Quote / Order Name": item.quote_name || 'General Spec',
        "Date": formattedDate,
        "Document Type": isCred ? 'Credit Note' : (invNum.startsWith('IN-') ? 'Tax Invoice' : (item.docType || 'Order Allocation')),
        "Value (ZAR)": Number(Number(item.value || 0).toFixed(2))
      };
    });

    const totalVal = sortedDrilldownItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
    rows.push({
      "Invoice / CN #": "",
      "Project Name": "TOTAL NET VALUE",
      "Division": "",
      "Quote / Order ID": "",
      "Quote / Order Name": "",
      "Date": "",
      "Document Type": "",
      "Value (ZAR)": Number(totalVal.toFixed(2))
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 18 }, // Invoice / CN # (Dedicated first column for easy matching)
      { wch: 28 }, // Project Name
      { wch: 28 }, // Division
      { wch: 32 }, // Quote / Order ID
      { wch: 36 }, // Quote Name
      { wch: 15 }, // Date
      { wch: 18 }, // Document Type
      { wch: 20 }  // Value (ZAR)
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Drilldown_Extract");

    const cleanTitle = (drilldownModal.title || 'Drilldown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanSub = (drilldownModal.subtitle || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const todayStr = new Date().toISOString().split('T')[0];
    const fileName = `${cleanTitle}_${cleanSub}_${todayStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // Load budgets config from db and delivery notes for KPI 5
  const [deliveryNotes, setDeliveryNotes] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/budgetsConfig`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value) {
          setBudgetsConfig(data.value);
        } else {
          setBudgetsConfig(DEFAULT_BUDGETS_CONFIG);
        }
        setIsLoadingBudgets(false);
      })
      .catch(() => {
        setBudgetsConfig(DEFAULT_BUDGETS_CONFIG);
        setIsLoadingBudgets(false);
      });

    fetch(`${API_BASE}/api/logistics/delivery-notes`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setDeliveryNotes(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error fetching delivery notes for KPI 5:", err));
  }, []);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (drilldownModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [drilldownModal.isOpen]);

  const saveBudgetsConfig = (newConfig) => {
    setBudgetsConfig(newConfig);
    fetch(`${API_BASE}/api/settings/budgetsConfig`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newConfig })
    }).catch(err => console.error('Error saving budgetsConfig:', err));
  };

  const toggleCollapse = (tableKey) => {
    setCollapsedTables(prev => ({ ...prev, [tableKey]: !prev[tableKey] }));
  };

  const [selectedMonthIdx, selectedYear] = selectedPeriodKey.split('_').map(Number);
  const selectedMonthName = MONTHS_LIST[selectedMonthIdx];

  // Financial Year Selector (March - February logic)
  const getFinancialYearForPeriod = (mIdx, yr) => {
    return mIdx >= 2 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;
  };

  const currentFinancialYear = getFinancialYearForPeriod(selectedMonthIdx, selectedYear);

  // Financial Year chronological month sequence (March = 0, ..., February = 11)
  const getFyMonthSequenceVal = (mIdx) => {
    return mIdx >= 2 ? mIdx - 2 : mIdx + 10;
  };

  const selectedSeqIndex = getFyMonthSequenceVal(selectedMonthIdx);

  // Generate dynamic rolling 4 months based on selected month & year
  const getRolling4Months = (startMonthIdx, startYear) => {
    const list = [];
    for (let i = 0; i < 4; i++) {
      const totalMonths = startMonthIdx + i;
      const idx = totalMonths % 12;
      const yearOffset = Math.floor(totalMonths / 12);
      list.push({
        label: `${MONTHS_LIST[idx]} ${startYear + yearOffset}`,
        monthName: MONTHS_LIST[idx],
        monthIdx: idx,
        year: startYear + yearOffset
      });
    }
    return list;
  };

  const rollingMonths = getRolling4Months(selectedMonthIdx, selectedYear);

  // Retrieve Active Financial Year Config from db settings, fallback to baseline
  const activeFyConfig = budgetsConfig && budgetsConfig[currentFinancialYear] 
    ? budgetsConfig[currentFinancialYear] 
    : (DEFAULT_BUDGETS_CONFIG[currentFinancialYear] || {
        divisions: DEFAULT_BUDGETS_CONFIG["2026-2027"].divisions,
        budgetsKPI1: {},
        targetsKPI2: {},
        targetsKPI3: {},
        budgetsKPI4: {}
      });

  const activeDivisionsList = activeFyConfig.divisions || [];

  // PM Name to Division auto-mapper helper
  const mapPmToDivision = (pmName = '', projName = '', oneOneRep = '', salesRep = '') => {
    const name = `${pmName} ${oneOneRep} ${salesRep}`.trim().toLowerCase();
    const proj = (projName || '').trim().toLowerCase();

    // Check for internal / office
    if (name.includes('internal') || name.includes('office') || proj.includes('internal') || proj.includes('office') || proj.includes('decorex') || proj.includes('head office')) {
      return 'INTERNAL - Office';
    }
    
    if (name.includes('ryan')) return 'MODUS PROFESSIONAL ( Ryan )';
    if (name.includes('thando')) return 'MODUS SIGNATURE ( Thando )';
    if (name.includes('peer') || name.includes('jon') || name.includes('made')) return 'MADE ( Jon-Peer)';
    if (name.includes('luxe')) return 'LUXELINE';
    if (name.includes('dani') || name.includes('daniel')) {
      if (proj.includes('own') || proj.includes('personal')) {
        return 'PROJECTS (Dani own)';
      }
      return 'MODUS PROJECTS ( Dani )';
    }
    if (name.includes('mood') || proj.includes('store')) return 'MOOD STORES';

    // Match keywords in project name or offering type if PM is generic
    if (proj.includes('professional')) return 'MODUS PROFESSIONAL ( Ryan )';
    if (proj.includes('signature')) return 'MODUS SIGNATURE ( Thando )';
    if (proj.includes('made')) return 'MADE ( Jon-Peer)';
    if (proj.includes('luxe')) return 'LUXELINE';
    if (proj.includes('mood') || proj.includes('store')) return 'MOOD STORES';

    // Unallocated fallback row so unassigned orders are clearly visible
    return 'UNALLOCATED / UNASSIGNED';
  };

  const getOrderDivision = (order, proj) => {
    if (order.division && order.division !== 'Auto-Detect (PM Name)' && order.division !== 'UNALLOCATED / UNASSIGNED') {
      return order.division;
    }
    if (proj.division && proj.division !== 'Auto-Detect (PM Name)' && proj.division !== 'UNALLOCATED / UNASSIGNED') {
      return proj.division;
    }
    
    const pm = order.pmName || order.pm_name || order.pm || order['PM NAME'] || order['PM'] || order.salesRep || order.sales_rep || order['Sales Rep'] || order['SALES REP'] || proj.pm || proj.pmName || '';
    const rep = order.oneOneRep || order.one_to_one_rep || order['One One Rep'] || '';
    const pName = proj.name || proj.projectName || order.projectFullName || order.projectName || '';
    
    return mapPmToDivision(pm, pName, rep, order.salesRep || order.sales_rep || order['Sales Rep'] || '');
  };

  const parseDateString = (rawDate) => {
    if (!rawDate) return null;

    // Format 1: DD/MM/YYYY or D/M/YYYY
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const dateParts = rawDate.split('/');
      if (dateParts.length === 3) {
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        if (!isNaN(monthIndex) && !isNaN(year) && monthIndex >= 0 && monthIndex < 12) {
          return { monthName: MONTHS_LIST[monthIndex], year: year || 2026, monthIdx: monthIndex };
        }
      }
    }

    // Format 2: YYYY-MM-DD or ISO string
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      return { monthName: MONTHS_LIST[monthIdx], year, monthIdx };
    }

    return null;
  };

  const getOrderMonthAndYear = (order, targetField = 'invoice') => {
    // If checking invoice date, search for Date INV first
    if (targetField === 'invoice') {
      let invDate = order.invoiceDate || order.dateInv || order.date_inv;
      
      // Check line items if order-level invoice date is missing
      if (!invDate && order.itemsList) {
        const itemWithInv = order.itemsList.find(it => it.invoiceDate || it.invoiceRef || (it.invoiceHistory && it.invoiceHistory[0]));
        if (itemWithInv) {
          const hist = itemWithInv.invoiceHistory && itemWithInv.invoiceHistory[0];
          invDate = itemWithInv.invoiceDate || (hist ? hist.date : null);
        }
      }

      if (!invDate && order.clientInvoices && order.clientInvoices.length > 0) {
        invDate = order.clientInvoices[0].date;
      }

      const parsedInv = parseDateString(invDate);
      if (parsedInv) return parsedInv;
    }

    // Fallback to order date
    const rawOrderDate = order.orderDate || order.order_date || order.date || order.created_at;
    const parsedOrder = parseDateString(rawOrderDate);
    if (parsedOrder) return parsedOrder;

    return { monthName: 'July', year: 2026, monthIdx: 6 };
  };

  // Helper to check if an order/item has a valid invoice reference and date
  const hasValidInvoiceRefAndDate = (order) => {
    // Order level invoice ref
    if (order.invoiceRef || order.invoice_ref || (order.clientInvoices && order.clientInvoices.length > 0)) {
      return true;
    }
    // Item level invoice ref
    if (order.itemsList && order.itemsList.some(it => (it.invoiceRef && it.invoiceRef.trim() !== '') || (it.invoiceHistory && it.invoiceHistory.length > 0 && it.invoiceHistory[0].ref))) {
      return true;
    }
    return false;
  };

  const formatZar = (val) => {
    if (val === undefined || val === null) return 'R 0.00';
    return (val < 0 ? '-' : '') + 'R ' + Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVarianceColor = (val, invert = false) => {
    if (val === 0) return 'var(--text-secondary)';
    const isGood = invert ? val < 0 : val > 0;
    return isGood ? '#10b981' : '#f43f5e';
  };

  const sumAwaitingStockTotal = (row) => ((row && row.col0) || 0) + ((row && row.col1) || 0) + ((row && row.col2) || 0) + ((row && row.col3) || 0);
  const sumPipelineTotal = (row) => ((row && row.col0) || 0) + ((row && row.col1) || 0) + ((row && row.col2) || 0) + ((row && row.col3) || 0);
  const sumAnnualTotal = (row) => ((row && row.invoiced) || 0) + ((row && row.toInvoice) || 0) + ((row && row.pipeline) || 0) + ((row && row.tbc) || 0);

  // Initialize Aggregated KPI Models
  const dynamicInvoiced = {};
  const dynamicAwaiting = {};
  const dynamicPipeline = {};
  const dynamicAnnual = {};
  const dynamicDelivered = {};

  const prevMonthIdx = selectedMonthIdx === 0 ? 11 : selectedMonthIdx - 1;
  const prevMonthYear = selectedMonthIdx === 0 ? selectedYear - 1 : selectedYear;
  const prevMonthName = MONTHS_LIST[prevMonthIdx];

  activeDivisionsList.forEach(div => {
    const monthlyBudgets = getMonthlyBudgets(activeFyConfig, div);
    const currentMonthBudget = monthlyBudgets[selectedSeqIndex] || 0;
    const computedYtdBudget = monthlyBudgets.slice(0, selectedSeqIndex + 1).reduce((s, b) => s + (Number(b) || 0), 0);
    const fullYearAnnualBudget = monthlyBudgets.reduce((s, b) => s + (Number(b) || 0), 0);
    const baselineKPI5 = (activeFyConfig.targetsKPI5 && activeFyConfig.targetsKPI5[div]) || 0;

    dynamicInvoiced[div] = { actual: 0, budget: currentMonthBudget, ytdActual: 0, ytdBudget: computedYtdBudget };
    dynamicAwaiting[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: 0 };
    dynamicPipeline[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: 0 };
    dynamicAnnual[div] = { invoiced: 0, toInvoice: 0, pipeline: 0, tbc: 0, budget: fullYearAnnualBudget };
    dynamicDelivered[div] = { 
      prevQty: 0, prevValue: 0, 
      selectedQty: 0, selectedValue: 0, 
      ytdQty: 0, ytdValue: 0, 
      target: baselineKPI5, 
      ordersPrevSet: new Set(),
      ordersSelectedSet: new Set(),
      ordersYtdSet: new Set()
    };
  });

  // Calculate Order Aggregations
  Object.values(projects || {}).forEach(proj => {
    const orders = proj.orders || [];
    orders.forEach(order => {
      const div = getOrderDivision(order, proj);
      if (!dynamicInvoiced[div]) return;

      const orderValue = order.value || (order.itemsList || []).reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0);
      
      // Process item-level and clientInvoices-level invoice entries
      const itemsList = order.itemsList || [];
      const clientInvoices = (order.clientInvoices || []).filter(cinv => !cinv.is_credit && !String(cinv.id).toUpperCase().startsWith('CN-') && !String(cinv.id).toUpperCase().startsWith('CR-'));
      
      let processedInvoicedTotal = 0;

      // 1. If authentic clientInvoices exist on the order, calculate from clientInvoices
      if (clientInvoices.length > 0) {
        clientInvoices.forEach(cinv => {
          const cRef = cinv.id || cinv.ref || order.invoiceRef;
          const cDate = cinv.date || order.invoiceDate;
          const cVal = Number(cinv.totalValue ?? cinv.value ?? cinv.amount ?? ((cinv.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitPrice) || Number(it.unitRetail) || Number(it.unitCost) || 0)), 0))) || 0;
          if (cRef && cDate && cVal > 0) {
            const parsedDate = parseDateString(cDate);
            if (parsedDate) {
              processedInvoicedTotal += cVal;
              const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
              const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);

              if (invMonth === selectedMonthName && invYear === selectedYear) {
                dynamicInvoiced[div].actual += cVal;
              }
              if (invFy === currentFinancialYear) {
                const invSeqVal = getFyMonthSequenceVal(invMonthIdx);
                if (invSeqVal <= selectedSeqIndex) {
                  dynamicInvoiced[div].ytdActual += cVal;
                }
                dynamicAnnual[div].invoiced += cVal;
              }
            }
          }
        });
      } else {
        // 2. Iterate over line items and their invoiceHistory
        itemsList.forEach(item => {
          const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory.filter(h => !String(h.id || h.ref).toUpperCase().startsWith('CN-') && !String(h.id || h.ref).toUpperCase().startsWith('CR-')) : [];
          if (iHist.length > 0) {
            iHist.forEach(h => {
              const hRef = h.ref || item.invoiceRef;
              const hDate = h.date || item.invoiceDate;
              const hVal = Number(h.total ?? ((Number(h.qty) || 0) * (Number(h.rate) || Number(h.unitPrice) || Number(item.unitRetail) || 0))) || 0;
              if (hRef && hDate && hVal > 0) {
                const parsedDate = parseDateString(hDate);
                if (parsedDate) {
                  processedInvoicedTotal += hVal;
                  const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                  const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);

                  if (invMonth === selectedMonthName && invYear === selectedYear) {
                    dynamicInvoiced[div].actual += hVal;
                  }
                  if (invFy === currentFinancialYear) {
                    const invSeqVal = getFyMonthSequenceVal(invMonthIdx);
                    if (invSeqVal <= selectedSeqIndex) {
                      dynamicInvoiced[div].ytdActual += hVal;
                    }
                    dynamicAnnual[div].invoiced += hVal;
                  }
                }
              }
            });
          } else if (item.invoiceRef && item.invoiceDate && Number(item.invoiceQty) > 0) {
            const itemVal = (Number(item.invoiceQty) || 0) * (Number(item.unitRetail) || 0);
            if (itemVal > 0) {
              const parsedDate = parseDateString(item.invoiceDate);
              if (parsedDate) {
                processedInvoicedTotal += itemVal;
                const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);

                if (invMonth === selectedMonthName && invYear === selectedYear) {
                  dynamicInvoiced[div].actual += itemVal;
                }
                if (invFy === currentFinancialYear) {
                  const invSeqVal = getFyMonthSequenceVal(invMonthIdx);
                  if (invSeqVal <= selectedSeqIndex) {
                    dynamicInvoiced[div].ytdActual += itemVal;
                  }
                  dynamicAnnual[div].invoiced += itemVal;
                }
              }
            }
          }
        });

        // 3. Fallback to order-level invoiceRef if no item or clientInvoices found
        if (processedInvoicedTotal === 0 && order.invoiceRef && order.invoiceDate) {
          const parsedDate = parseDateString(order.invoiceDate);
          if (parsedDate) {
            processedInvoicedTotal += orderValue;
            const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
            const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);

            if (invMonth === selectedMonthName && invYear === selectedYear) {
              dynamicInvoiced[div].actual += orderValue;
            }
            if (invFy === currentFinancialYear) {
              const invSeqVal = getFyMonthSequenceVal(invMonthIdx);
              if (invSeqVal <= selectedSeqIndex) {
                dynamicInvoiced[div].ytdActual += orderValue;
              }
              dynamicAnnual[div].invoiced += orderValue;
            }
          }
        }
      }

      // 4. Process allocated Credit Notes and deduct from invoiced revenue
      const creditNotes = (order.creditNotes && order.creditNotes.length > 0)
        ? order.creditNotes
        : (order.clientInvoices || []).filter(cinv => cinv.is_credit || String(cinv.id).toUpperCase().startsWith('CN-') || String(cinv.id).toUpperCase().startsWith('CR-'));

      creditNotes.forEach(cn => {
        const cnRef = cn.id || cn.ref;
        const cnDate = cn.date || order.invoiceDate;
        const cnVal = Math.abs(Number(cn.totalValue ?? cn.value ?? cn.amount ?? ((cn.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitPrice) || Number(it.unitRetail) || Number(it.unitCost) || 0)), 0))) || 0);
        if (cnRef && cnDate && cnVal > 0) {
          const parsedDate = parseDateString(cnDate);
          if (parsedDate) {
            const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
            const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);

            if (invMonth === selectedMonthName && invYear === selectedYear) {
              dynamicInvoiced[div].actual -= cnVal;
            }
            if (invFy === currentFinancialYear) {
              const invSeqVal = getFyMonthSequenceVal(invMonthIdx);
              if (invSeqVal <= selectedSeqIndex) {
                dynamicInvoiced[div].ytdActual -= cnVal;
              }
              dynamicAnnual[div].invoiced -= cnVal;
            }
          }
        }
      });

      const isEligibleForInvoiced = processedInvoicedTotal > 0;

      const orderDateParsed = getOrderMonthAndYear(order, 'order');
      const { monthName: orderMonth, year: orderYear, monthIdx: orderMonthIdx } = orderDateParsed;
      const orderFy = getFinancialYearForPeriod(orderMonthIdx, orderYear);
      const rollingIdx = rollingMonths.findIndex(rm => rm.monthName === orderMonth && rm.year === orderYear);

      // KPI 2 (Awaiting Stock / Expected Invoices based on Item ETA):
      // Sum outstanding (un-invoiced) retail values of items in their expected delivery month.
      // KPI 3 (Pipeline): Draft/unapproved order value.
      
      // Calculate outstanding amount for each item and place it in the item's ETA month
      if (order.status !== 'Draft' && order.status) {
        itemsList.forEach(item => {
          // Total retail value for this item
          const retailVal = (Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
          
          // Value already invoiced
          let itemInvoicedVal = 0;
          const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
          if (iHist.length > 0) {
            itemInvoicedVal = iHist.reduce((s, h) => s + ((Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0)), 0);
          } else if (item.invoiceRef && item.invoiceDate) {
            itemInvoicedVal = (Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
          }

          const outstandingVal = Math.max(0, retailVal - itemInvoicedVal);

          if (outstandingVal > 0) {
            // Prefer item-level PO ETA first, then general item ETA, then order-level eta, then expected_delivery_date, then order PO date
            const expectedDate = item.po_eta || item.eta || order.eta || order.expected_delivery_date || item.po_date || order.po_date;
            const parsedExpected = parseDateString(expectedDate);

            if (parsedExpected) {
              const { monthName: expMonth, year: expYear, monthIdx: expMonthIdx } = parsedExpected;
              const expFy = getFinancialYearForPeriod(expMonthIdx, expYear);
              
              const expRollingIdx = rollingMonths.findIndex(rm => rm.monthName === expMonth && rm.year === expYear);
              if (expRollingIdx !== -1) {
                dynamicAwaiting[div][`col${expRollingIdx}`] += outstandingVal;
              }
              if (expFy === currentFinancialYear) {
                dynamicAnnual[div].toInvoice += outstandingVal;
              }
            } else {
              // Fallback to order date month if no valid expected date is found (avoid defaulting to July if order is in another month)
              const fallbackDate = order.orderDate || order.order_date || order.date || order.created_at || `${selectedMonthIdx + 1}/01/${selectedYear}`;
              const parsedFallback = parseDateString(fallbackDate) || { monthName: selectedMonthName, year: selectedYear, monthIdx: selectedMonthIdx };
              const { monthName: ordMonth, year: ordYear, monthIdx: ordMonthIdx } = parsedFallback;
              const ordFy = getFinancialYearForPeriod(ordMonthIdx, ordYear);
              const ordRollingIdx = rollingMonths.findIndex(rm => rm.monthName === ordMonth && rm.year === ordYear);
              if (ordRollingIdx !== -1) {
                dynamicAwaiting[div][`col${ordRollingIdx}`] += outstandingVal;
              }
              if (ordFy === currentFinancialYear) {
                dynamicAnnual[div].toInvoice += outstandingVal;
              }
            }
          }
        });
      }

      // KPI 3 & Annual Pipeline: Unapproved / Draft orders
      if (order.status === 'Draft' || !order.status || order.status === 'Pending') {
        const isEligibleForPipeline = (order.status === 'Draft' || !order.status || (order.status === 'Pending' && !isEligibleForInvoiced));
        if (isEligibleForPipeline) {
          if (rollingIdx !== -1) {
            dynamicPipeline[div][`col${rollingIdx}`] += orderValue;
          }
          if (orderFy === currentFinancialYear) {
            dynamicAnnual[div].pipeline += orderValue;
          }
        }
      }
    });
  });

  // Calculate KPI 5: Orders Delivered (from Logistics Delivery Notes)
  (deliveryNotes || []).forEach(dn => {
    if (!dn) return;
    const rawDate = dn.created_at || dn.date || dn.delivery_date;
    const parsedDate = parseDateString(rawDate);
    if (!parsedDate) return;

    const { monthName: dnMonth, year: dnYear, monthIdx: dnMonthIdx } = parsedDate;
    const dnFy = getFinancialYearForPeriod(dnMonthIdx, dnYear);
    const dnSeqVal = getFyMonthSequenceVal(dnMonthIdx);

    // Find parent order across projects to get order division & value
    let parentOrder = null;
    let parentProj = null;
    const targetOrderId = String(dn.order_id || dn.orderId || '').trim();

    Object.values(projects || {}).forEach(proj => {
      (proj.orders || []).forEach(ord => {
        if (targetOrderId && (String(ord.id) === targetOrderId || String(ord.order_number || '') === targetOrderId || String(ord.pf_number || '') === targetOrderId)) {
          parentOrder = ord;
          parentProj = proj;
        }
      });
    });

    const div = parentOrder && parentProj ? getOrderDivision(parentOrder, parentProj) : 'UNALLOCATED / UNASSIGNED';
    if (!dynamicDelivered[div]) return;

    const orderValExclVat = parentOrder 
      ? (parentOrder.value || (parentOrder.itemsList || []).reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0))
      : (Number(dn.total_value) || Number(dn.value) || 0);

    const orderKey = targetOrderId || dn.id || `dn_${div}_${dnMonth}_${dnYear}`;

    // Previous Month Delivered
    if (dnMonth === prevMonthName && dnYear === prevMonthYear) {
      if (!dynamicDelivered[div].ordersPrevSet.has(orderKey)) {
        dynamicDelivered[div].ordersPrevSet.add(orderKey);
        dynamicDelivered[div].prevQty += 1;
        dynamicDelivered[div].prevValue += orderValExclVat;
      }
    }

    // Selected Month Delivered
    if (dnMonth === selectedMonthName && dnYear === selectedYear) {
      if (!dynamicDelivered[div].ordersSelectedSet.has(orderKey)) {
        dynamicDelivered[div].ordersSelectedSet.add(orderKey);
        dynamicDelivered[div].selectedQty += 1;
        dynamicDelivered[div].selectedValue += orderValExclVat;
      }
    }

    // YTD Delivered
    if (dnFy === currentFinancialYear && dnSeqVal <= selectedSeqIndex) {
      if (!dynamicDelivered[div].ordersYtdSet.has(orderKey)) {
        dynamicDelivered[div].ordersYtdSet.add(orderKey);
        dynamicDelivered[div].ytdQty += 1;
        dynamicDelivered[div].ytdValue += orderValExclVat;
      }
    }
  });

  // -------------------------------------------------------------
  // CASCADING SHORTFALL TARGETS CALCULATION
  // KPI 1 Deficit -> KPI 2 Target -> KPI 3 Target
  // -------------------------------------------------------------
  Object.keys(dynamicInvoiced).forEach(div => {
    // 1. KPI 1 YTD Variance
    const kpi1Row = dynamicInvoiced[div];
    const kpi1YtdVariance = (kpi1Row?.ytdActual || 0) - (kpi1Row?.ytdBudget || 0);

    // 2. KPI 2 Target: If KPI 1 is behind budget (negative variance), Target is the deficit amount; if on track/ahead, Target is 0
    const kpi2Target = kpi1YtdVariance < 0 ? Math.abs(kpi1YtdVariance) : 0;
    if (dynamicAwaiting[div]) {
      dynamicAwaiting[div].target = kpi2Target;
    }

    // 3. KPI 2 Variance: Total Awaiting Stock minus KPI 2 Target
    const kpi2TotalAwaiting = sumAwaitingStockTotal(dynamicAwaiting[div] || { col0: 0, col1: 0, col2: 0, col3: 0 });
    const kpi2Variance = kpi2TotalAwaiting - kpi2Target;

    // 4. KPI 3 Target: If KPI 2 has a remaining shortfall (negative variance), Target is the remaining deficit amount; if covered, Target is 0
    const kpi3Target = kpi2Variance < 0 ? Math.abs(kpi2Variance) : 0;
    if (dynamicPipeline[div]) {
      dynamicPipeline[div].target = kpi3Target;
    }
  });

  // Trigger drilldown popup details handler
  const triggerDrilldown = (title, division, type, extraFilter = null) => {
    const isAllDivisions = !division || division === 'ALL' || division === 'ALL_DIVISIONS' || division === 'All Divisions' || division === 'Total' || division === 'TOTAL';
    const list = [];
    Object.values(projects || {}).forEach(proj => {
      const orders = proj.orders || [];
      orders.forEach(order => {
        const div = getOrderDivision(order, proj);
        if (!isAllDivisions && div !== division) return;

        const itemsList = order.itemsList || [];
        const orderValue = order.value || itemsList.reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0);
        
        // Compute precise actual invoiced value from line items / invoice history
        const invoicedValue = itemsList.reduce((s, item) => {
          const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
          if (iHist.length > 0) {
            return s + iHist.reduce((hSum, h) => hSum + ((Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0)), 0);
          }
          if (item.invoiceRef && item.invoiceDate) {
            return s + ((Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0));
          }
          return s;
        }, 0) || (order.invoiceRef && order.invoiceDate ? orderValue : 0);

        const orderDateParsed = getOrderMonthAndYear(order, 'order');
        const orderFy = orderDateParsed ? getFinancialYearForPeriod(orderDateParsed.monthIdx, orderDateParsed.year) : null;
        const isEligibleForInvoiced = hasValidInvoiceRefAndDate(order) && invoicedValue > 0;

        // Sales Invoiced (Invoices - Credit Notes)
        if (type === 'invoiced') {
          const clientInvoices = (order.clientInvoices || []).filter(cinv => !cinv.is_credit && !String(cinv.id).toUpperCase().startsWith('CN-') && !String(cinv.id).toUpperCase().startsWith('CR-'));
          const creditNotes = (order.creditNotes && order.creditNotes.length > 0)
            ? order.creditNotes
            : (order.clientInvoices || []).filter(cinv => cinv.is_credit || String(cinv.id).toUpperCase().startsWith('CN-') || String(cinv.id).toUpperCase().startsWith('CR-'));
          const invoiceGroupsMap = {};

          if (clientInvoices.length > 0) {
            clientInvoices.forEach(cinv => {
              const cRef = cinv.id || cinv.ref || order.invoiceRef;
              const cDate = cinv.date || order.invoiceDate;
              const cVal = Number(cinv.totalValue ?? cinv.value ?? cinv.amount ?? ((cinv.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitPrice) || Number(it.unitRetail) || Number(it.unitCost) || 0)), 0))) || 0;
              if (cRef && cDate && cVal > 0) {
                const parsedDate = parseDateString(cDate);
                if (parsedDate) {
                  const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                  const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);
                  let match = false;
                  if (extraFilter === 'ytd') {
                    if (invFy === currentFinancialYear && getFyMonthSequenceVal(invMonthIdx) <= selectedSeqIndex) match = true;
                  } else {
                    if (invMonth === selectedMonthName && invYear === selectedYear) match = true;
                  }
                  if (match) {
                    list.push({ projectName: proj.name, division: div, invoiceNo: cRef, orderId: order.po_number || order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: cDate, value: cVal, isCredit: false, docType: 'Tax Invoice' });
                  }
                }
              }
            });
          } else {
            itemsList.forEach(item => {
              const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory.filter(h => !String(h.id || h.ref).toUpperCase().startsWith('CN-') && !String(h.id || h.ref).toUpperCase().startsWith('CR-')) : [];
              if (iHist.length > 0) {
                iHist.forEach(h => {
                  const hRef = h.ref || item.invoiceRef;
                  const hDate = h.date || item.invoiceDate;
                  const hVal = Number(h.total ?? ((Number(h.qty) || 0) * (Number(h.rate) || Number(h.unitPrice) || Number(item.unitRetail) || 0))) || 0;
                  if (hRef && hDate && hVal > 0) {
                    const parsedDate = parseDateString(hDate);
                    if (parsedDate) {
                      const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                      const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);
                      let match = false;
                      if (extraFilter === 'ytd') {
                        if (invFy === currentFinancialYear && getFyMonthSequenceVal(invMonthIdx) <= selectedSeqIndex) match = true;
                      } else {
                        if (invMonth === selectedMonthName && invYear === selectedYear) match = true;
                      }
                      if (match) {
                        const groupKey = `${order.id || 'N/A'}_${hRef}_${hDate}`;
                        if (!invoiceGroupsMap[groupKey]) {
                          invoiceGroupsMap[groupKey] = {
                            projectName: proj.name,
                            division: div,
                            invoiceNo: hRef,
                            orderId: order.po_number || order.id || 'N/A',
                            quote_name: order.quote_name || 'General Spec',
                            date: hDate,
                            value: 0,
                            isCredit: false,
                            docType: 'Tax Invoice'
                          };
                        }
                        invoiceGroupsMap[groupKey].value += hVal;
                      }
                    }
                  }
                });
              } else if (item.invoiceRef && item.invoiceDate && Number(item.invoiceQty) > 0) {
                const itemVal = (Number(item.invoiceQty) || 0) * (Number(item.unitRetail) || 0);
                if (itemVal > 0) {
                  const parsedDate = parseDateString(item.invoiceDate);
                  if (parsedDate) {
                    const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                    const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);
                    let match = false;
                    if (extraFilter === 'ytd') {
                      if (invFy === currentFinancialYear && getFyMonthSequenceVal(invMonthIdx) <= selectedSeqIndex) match = true;
                    } else {
                      if (invMonth === selectedMonthName && invYear === selectedYear) match = true;
                    }
                    if (match) {
                      const groupKey = `${order.id || 'N/A'}_${item.invoiceRef}_${item.invoiceDate}`;
                      if (!invoiceGroupsMap[groupKey]) {
                        invoiceGroupsMap[groupKey] = {
                          projectName: proj.name,
                          division: div,
                          invoiceNo: item.invoiceRef,
                          orderId: order.po_number || order.id || 'N/A',
                          quote_name: order.quote_name || 'General Spec',
                          date: item.invoiceDate,
                          value: 0,
                          isCredit: false,
                          docType: 'Tax Invoice'
                        };
                      }
                      invoiceGroupsMap[groupKey].value += itemVal;
                    }
                  }
                }
              }
            });

            if (Object.keys(invoiceGroupsMap).length > 0) {
              Object.values(invoiceGroupsMap).forEach(g => list.push(g));
            } else if (order.invoiceRef && order.invoiceDate) {
              const parsedDate = parseDateString(order.invoiceDate);
              if (parsedDate) {
                const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);
                let match = false;
                if (extraFilter === 'ytd') {
                  if (invFy === currentFinancialYear && getFyMonthSequenceVal(invMonthIdx) <= selectedSeqIndex) match = true;
                } else {
                  if (invMonth === selectedMonthName && invYear === selectedYear) match = true;
                }
                if (match) {
                  list.push({ projectName: proj.name, division: div, invoiceNo: order.invoiceRef, orderId: order.po_number || order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.invoiceDate, value: orderValue, isCredit: false, docType: 'Tax Invoice' });
                }
              }
            }
          }

          // Process and include Credit Notes in drilldown
          creditNotes.forEach(cn => {
            const cnRef = cn.id || cn.ref;
            const cnDate = cn.date || order.invoiceDate;
            const cnVal = Math.abs(Number(cn.totalValue ?? cn.value ?? cn.amount ?? ((cn.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitPrice) || Number(it.unitRetail) || Number(it.unitCost) || 0)), 0))) || 0);
            if (cnRef && cnDate && cnVal > 0) {
              const parsedDate = parseDateString(cnDate);
              if (parsedDate) {
                const { monthName: invMonth, year: invYear, monthIdx: invMonthIdx } = parsedDate;
                const invFy = getFinancialYearForPeriod(invMonthIdx, invYear);
                let match = false;
                if (extraFilter === 'ytd') {
                  if (invFy === currentFinancialYear && getFyMonthSequenceVal(invMonthIdx) <= selectedSeqIndex) match = true;
                } else {
                  if (invMonth === selectedMonthName && invYear === selectedYear) match = true;
                }
                if (match) {
                  list.push({ projectName: proj.name, division: div, invoiceNo: cnRef, orderId: order.po_number || order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: cnDate, value: -cnVal, isCredit: true, docType: 'Credit Note' });
                }
              }
            }
          });
        }

        // To Be Invoiced (Awaiting Stock)
        if (type === 'awaiting') {
          if (order.status !== 'Draft' && order.status) {
            itemsList.forEach(item => {
              const retailVal = (Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
              let itemInvoicedVal = 0;
              const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
              if (iHist.length > 0) {
                itemInvoicedVal = iHist.reduce((s, h) => s + ((Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0)), 0);
              } else if (item.invoiceRef && item.invoiceDate) {
                itemInvoicedVal = (Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
              }
              const outstandingVal = Math.max(0, retailVal - itemInvoicedVal);

              if (outstandingVal > 0) {
                const expectedDate = item.po_eta || item.eta || order.eta || order.expected_delivery_date || item.po_date || order.po_date;
                const parsedExpected = parseDateString(expectedDate) || orderDateParsed;
                if (parsedExpected) {
                  const { monthName: expMonth, year: expYear } = parsedExpected;
                  if (extraFilter !== null) {
                    const targetMonth = rollingMonths[extraFilter];
                    if (expMonth === targetMonth.monthName && expYear === targetMonth.year) {
                      list.push({ projectName: proj.name, division: div, orderId: `${order.id || 'N/A'} (Item: ${item.code || 'Hardware'})`, quote_name: order.quote_name || 'General Spec', date: expectedDate || order.orderDate || 'N/A', value: outstandingVal, docType: 'Awaiting Stock' });
                    }
                  } else {
                    const inRolling = rollingMonths.some(rm => rm.monthName === expMonth && rm.year === expYear);
                    if (inRolling) {
                      list.push({ projectName: proj.name, division: div, orderId: `${order.id || 'N/A'} (Item: ${item.code || 'Hardware'})`, quote_name: order.quote_name || 'General Spec', date: expectedDate || order.orderDate || 'N/A', value: outstandingVal, docType: 'Awaiting Stock' });
                    }
                  }
                }
              }
            });
          }
        }

        // Pipeline Projections (Draft & Pending orders)
        if (type === 'pipeline') {
          if (order.status === 'Draft' || !order.status || order.status === 'Pending') {
            const isEligibleForPipeline = (order.status === 'Draft' || !order.status || (order.status === 'Pending' && !isEligibleForInvoiced));
            if (isEligibleForPipeline) {
              const { monthName: orderMonth, year: orderYear } = orderDateParsed;
              if (extraFilter !== null) {
                const targetMonth = rollingMonths[extraFilter];
                if (orderMonth === targetMonth.monthName && orderYear === targetMonth.year) {
                  list.push({ projectName: proj.name, division: div, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue, docType: 'Pipeline Spec' });
                }
              } else {
                const inRolling = rollingMonths.some(rm => rm.monthName === orderMonth && rm.year === orderYear);
                if (inRolling) {
                  list.push({ projectName: proj.name, division: div, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue, docType: 'Pipeline Spec' });
                }
              }
            }
          }
        }

        // Annual consolidated totals
        if (type === 'annual') {
          if (orderFy === currentFinancialYear) {
            if (extraFilter === 'invoiced') {
              // Handled by invoiced sum logic or we show actual value here if needed
              if (isEligibleForInvoiced) {
                list.push({ projectName: proj.name, division: div, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: invoicedValue, docType: 'Annual Billed' });
              }
            } else if (extraFilter === 'toInvoice' && order.status !== 'Draft' && order.status) {
              let orderOutstandingTotal = 0;
              itemsList.forEach(item => {
                const retailVal = (Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
                let itemInvoicedVal = 0;
                const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
                if (iHist.length > 0) {
                  itemInvoicedVal = iHist.reduce((s, h) => s + ((Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0)), 0);
                } else if (item.invoiceRef && item.invoiceDate) {
                  itemInvoicedVal = (Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
                }
                const outstandingVal = Math.max(0, retailVal - itemInvoicedVal);
                orderOutstandingTotal += outstandingVal;
              });
              if (orderOutstandingTotal > 0) {
                list.push({ projectName: proj.name, division: div, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderOutstandingTotal, docType: 'Annual Awaiting' });
              }
            } else if (extraFilter === 'pipeline' && (order.status === 'Draft' || !order.status || (order.status === 'Pending' && !isEligibleForInvoiced))) {
              list.push({ projectName: proj.name, division: div, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue, docType: 'Annual Pipeline' });
            }
          }
        }
      });
    });

    setDrilldownModal({
      isOpen: true,
      title: `${title}`,
      subtitle: isAllDivisions ? 'All Divisions Combined (Company Total)' : `Division: ${division}`,
      items: list
    });
  };

  // Generate Selector options (Jan 2024 to Dec 2028)
  const selectorPeriods = [];
  const years = [2024, 2025, 2026, 2027, 2028];
  years.forEach(y => {
    MONTHS_LIST.forEach((m, idx) => {
      selectorPeriods.push({
        key: `${idx}_${y}`,
        label: `${m} ${y}`
      });
    });
  });

  const currentPeriodIdx = selectorPeriods.findIndex(p => p.key === selectedPeriodKey);
  const handlePrevMonth = () => {
    if (currentPeriodIdx > 0) {
      setSelectedPeriodKey(selectorPeriods[currentPeriodIdx - 1].key);
    }
  };
  const handleNextMonth = () => {
    if (currentPeriodIdx < selectorPeriods.length - 1) {
      setSelectedPeriodKey(selectorPeriods[currentPeriodIdx + 1].key);
    }
  };
  const handleCurrentMonth = () => {
    const now = new Date();
    const nowKey = `${now.getMonth()}_${now.getFullYear()}`;
    if (selectorPeriods.some(p => p.key === nowKey)) {
      setSelectedPeriodKey(nowKey);
    }
  };

  // Budget Manager: Edit specific month budget (0..11) for a division
  const handleMonthlyBudgetChange = (division, monthIdx, val) => {
    const num = parseFloat(val) || 0;
    const configCopy = { ...budgetsConfig };
    if (!configCopy[mgmtFy]) {
      configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {} };
    }
    const fyConf = configCopy[mgmtFy];
    if (!fyConf.budgetsKPI1) fyConf.budgetsKPI1 = {};

    const currentArr = getMonthlyBudgets(fyConf, division);
    const updatedArr = [...currentArr];
    updatedArr[monthIdx] = num;
    fyConf.budgetsKPI1[division] = updatedArr;

    setBudgetsConfig(configCopy);
  };

  // Budget Manager: Quick apply flat monthly amount across all 12 months
  const handleApplyFlatMonthly = (division, monthlyVal) => {
    const num = parseFloat(monthlyVal) || 0;
    const configCopy = { ...budgetsConfig };
    if (!configCopy[mgmtFy]) {
      configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {} };
    }
    const fyConf = configCopy[mgmtFy];
    if (!fyConf.budgetsKPI1) fyConf.budgetsKPI1 = {};
    fyConf.budgetsKPI1[division] = Array(12).fill(num);
    setBudgetsConfig(configCopy);
  };

  // Budget Manager: Quick distribute annual total evenly across 12 months (÷12)
  const handleDistributeAnnual = (division, annualVal) => {
    const num = parseFloat(annualVal) || 0;
    const monthly = Math.round((num / 12) * 100) / 100;
    handleApplyFlatMonthly(division, monthly);
  };

  // Budget Manager: Add Team Division
  const addTeamDivision = () => {
    if (!newDivisionName.trim()) return;
    const configCopy = { ...budgetsConfig };
    if (!configCopy[mgmtFy]) {
      configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {} };
    }
    const fyConf = configCopy[mgmtFy];
    if (!fyConf.divisions) fyConf.divisions = [];
    if (fyConf.divisions.includes(newDivisionName.trim())) return;

    const trimmedName = newDivisionName.trim();
    fyConf.divisions.push(trimmedName);
    if (!fyConf.budgetsKPI1) fyConf.budgetsKPI1 = {};
    fyConf.budgetsKPI1[trimmedName] = Array(12).fill(0);

    saveBudgetsConfig(configCopy);
    setNewDivisionName('');
    setExpandedDivisions(prev => ({ ...prev, [trimmedName]: true }));
  };

  // Budget Manager: Delete Division
  const deleteTeamDivision = (division) => {
    const configCopy = { ...budgetsConfig };
    const fyConf = configCopy[mgmtFy];
    if (!fyConf) return;

    fyConf.divisions = (fyConf.divisions || []).filter(d => d !== division);
    if (fyConf.budgetsKPI1) delete fyConf.budgetsKPI1[division];
    if (fyConf.targetsKPI2) delete fyConf.targetsKPI2[division];
    if (fyConf.targetsKPI3) delete fyConf.targetsKPI3[division];
    if (fyConf.budgetsKPI4) delete fyConf.budgetsKPI4[division];

    saveBudgetsConfig(configCopy);
  };

  // Stock Metrics baseline
  const stockValues = [
    { label: 'Deadstock Value (stock > 120days)', current: 883579.86, target: 600000.00 },
    { label: 'Consignment Value (from 3.4mil)', current: 1269328.48, target: 1000000.00 },
    { label: 'Normal Stock Value (< 120days)', current: 232363.07, target: 500000.00 },
    { label: 'LED Stock Value', current: 875851.74, target: 300000.00 },
    { label: 'Stock Value', current: 3261123.14, target: 2400000.00 }
  ];

  if (isLoadingBudgets) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Loading reports and dynamic budget configurations...</p>
      </div>
    );
  }

  // Active view of editing config
  const mgmtFyConfig = budgetsConfig[mgmtFy] || { divisions: [], budgetsKPI1: {}, targetsKPI2: {}, targetsKPI3: {}, budgetsKPI4: {} };

  return (
    <div className="animation-fade-in" style={{ padding: isMobile ? '12px 14px 40px' : '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      
      {/* HEADER CONTROLS (Report view selector dropdown) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        flexDirection: isMobile ? 'column' : 'row',
        marginBottom: '20px', 
        gap: '12px' 
      }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={22} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <select 
              value={activeReport} 
              onChange={(e) => setActiveReport(e.target.value)} 
              style={{ 
                fontSize: isMobile ? '16px' : '20px', 
                fontWeight: 800, 
                color: 'var(--text-title)', 
                background: 'transparent', 
                border: 'none', 
                cursor: 'pointer', 
                outline: 'none', 
                padding: 0,
                width: '100%'
              }}
            >
              <option value="sales_kpi">Sales & KPI Ledger Engine</option>
              <option value="budget_manager">Budget & Target Manager</option>
              <option value="operational_kpis">Operational KPIs Dashboard</option>
              <option value="stock_valuation">Inventory & Stock Valuation</option>
            </select>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activeReport === 'sales_kpi' && `Financial year: ${currentFinancialYear} (March to February alignment).`}
            {activeReport === 'budget_manager' && 'Manage team divisions, annual limits, and YTD baseline budgets per financial year.'}
            {activeReport === 'operational_kpis' && 'Client faults, site visit reports, and response times tracking.'}
            {activeReport === 'stock_valuation' && 'Deadstock, consignment values, and warehouse performance matrix.'}
          </p>
        </div>

        {activeReport === 'sales_kpi' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Period:</span>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <button 
                onClick={handlePrevMonth} 
                disabled={currentPeriodIdx <= 0}
                className="btn btn-xs btn-ghost"
                style={{ 
                  height: '32px', 
                  width: '32px', 
                  padding: 0, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: '6px',
                  cursor: currentPeriodIdx <= 0 ? 'not-allowed' : 'pointer',
                  opacity: currentPeriodIdx <= 0 ? 0.3 : 1
                }}
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>

              <select 
                value={selectedPeriodKey} 
                onChange={(e) => setSelectedPeriodKey(e.target.value)} 
                style={{ 
                  minWidth: '150px', 
                  height: '32px', 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-primary)', 
                  padding: '0 8px', 
                  fontSize: '13px',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {selectorPeriods.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>

              <button 
                onClick={handleNextMonth} 
                disabled={currentPeriodIdx >= selectorPeriods.length - 1}
                className="btn btn-xs btn-ghost"
                style={{ 
                  height: '32px', 
                  width: '32px', 
                  padding: 0, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: '6px',
                  cursor: currentPeriodIdx >= selectorPeriods.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPeriodIdx >= selectorPeriods.length - 1 ? 0.3 : 1
                }}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleCurrentMonth}
              className="btn btn-xs"
              style={{
                height: '36px',
                padding: '0 12px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Jump to Current Month"
            >
              <Calendar size={13} style={{ color: '#3b82f6' }} /> Today
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: SALES & KPI LEDGER ENGINE */}
      {activeReport === 'sales_kpi' && (
        <>
          {/* KPI TOP LEVEL SUMMARY CARDS */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '28px' }}>
            <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>
                {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0))}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Invoiced ({selectedMonthName} {selectedYear})</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0))}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Awaiting Stock ({rollingMonths[0].label})</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>
                {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0))}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Pipeline Target ({rollingMonths[0].label})</div>
            </div>
            <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700 }}>
                {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0))}
              </div>
              <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Projected YTD</div>
            </div>
          </div>

          {/* KPI 1: SALES INVOICED */}
          <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div 
              onClick={() => toggleCollapse('kpi1')}
              style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {collapsedTables.kpi1 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 1: Sales Invoiced ({selectedMonthName} {selectedYear})</div>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>FY: {currentFinancialYear}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                    <th style={{ padding: '12px 16px' }}>Actual Invoiced</th>
                    <th style={{ padding: '12px 16px' }}>Budget</th>
                    <th style={{ padding: '12px 16px' }}>Variance</th>
                    <th style={{ padding: '12px 16px' }}>YTD Actual (from March)</th>
                    <th style={{ padding: '12px 16px' }}>YTD Budget ({selectedSeqIndex + 1} mos)</th>
                    <th style={{ padding: '12px 16px' }}>YTD Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {!collapsedTables.kpi1 && activeDivisionsList.map((div) => {
                    const row = dynamicInvoiced[div] || { actual: 0, budget: 0, ytdActual: 0, ytdBudget: 0 };
                    const variance = row.actual - row.budget;
                    const ytdVariance = row.ytdActual - row.ytdBudget;
                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                        <td 
                          onClick={() => row.actual > 0 && triggerDrilldown('Actual Invoiced', div, 'invoiced')}
                          style={{ padding: '12px 16px', cursor: row.actual > 0 ? 'pointer' : 'default', textDecoration: row.actual > 0 ? 'underline' : 'none', color: row.actual > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.actual)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.budget)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                        <td 
                          onClick={() => row.ytdActual > 0 && triggerDrilldown('YTD Actual Invoiced', div, 'invoiced', 'ytd')}
                          style={{ padding: '12px 16px', cursor: row.ytdActual > 0 ? 'pointer' : 'default', textDecoration: row.ytdActual > 0 ? 'underline' : 'none', color: row.ytdActual > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.ytdActual)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.ytdBudget)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(ytdVariance) }}>{formatZar(ytdVariance)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                    <td style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0);
                        if (tot !== 0) triggerDrilldown('Actual Invoiced (Total)', 'ALL', 'invoiced');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) !== 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) !== 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) !== 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0)) }}>
                      {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0);
                        if (tot !== 0) triggerDrilldown('YTD Actual Invoiced (Total)', 'ALL', 'invoiced', 'ytd');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0) !== 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0) !== 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0) !== 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdBudget, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdBudget, 0)) }}>
                      {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdBudget, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 2: TO BE INVOICED */}
          <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div 
              onClick={() => toggleCollapse('kpi2')}
              style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
            >
              {collapsedTables.kpi2 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 2: To Be Invoiced (Awaiting Stock)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[0].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[1].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[2].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[3].label}</th>
                    <th style={{ padding: '12px 16px' }}>Total Pipeline</th>
                    <th style={{ padding: '12px 16px' }}>Target</th>
                    <th style={{ padding: '12px 16px' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {!collapsedTables.kpi2 && activeDivisionsList.map((div) => {
                    const row = dynamicAwaiting[div] || { col0: 0, col1: 0, col2: 0, col3: 0, target: 0 };
                    const total = sumAwaitingStockTotal(row);
                    const variance = total - row.target;
                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                        <td 
                          onClick={() => row.col0 > 0 && triggerDrilldown(rollingMonths[0].label, div, 'awaiting', 0)}
                          style={{ padding: '12px 16px', cursor: row.col0 > 0 ? 'pointer' : 'default', textDecoration: row.col0 > 0 ? 'underline' : 'none', color: row.col0 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col0)}
                        </td>
                        <td 
                          onClick={() => row.col1 > 0 && triggerDrilldown(rollingMonths[1].label, div, 'awaiting', 1)}
                          style={{ padding: '12px 16px', cursor: row.col1 > 0 ? 'pointer' : 'default', textDecoration: row.col1 > 0 ? 'underline' : 'none', color: row.col1 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col1)}
                        </td>
                        <td 
                          onClick={() => row.col2 > 0 && triggerDrilldown(rollingMonths[2].label, div, 'awaiting', 2)}
                          style={{ padding: '12px 16px', cursor: row.col2 > 0 ? 'pointer' : 'default', textDecoration: row.col2 > 0 ? 'underline' : 'none', color: row.col2 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col2)}
                        </td>
                        <td 
                          onClick={() => row.col3 > 0 && triggerDrilldown(rollingMonths[3].label, div, 'awaiting', 3)}
                          style={{ padding: '12px 16px', cursor: row.col3 > 0 ? 'pointer' : 'default', textDecoration: row.col3 > 0 ? 'underline' : 'none', color: row.col3 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col3)}
                        </td>
                        <td 
                          onClick={() => total > 0 && triggerDrilldown('Total Awaiting Stock', div, 'awaiting')}
                          style={{ padding: '12px 16px', fontWeight: 600, cursor: total > 0 ? 'pointer' : 'default', textDecoration: total > 0 ? 'underline' : 'none', color: total > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(total)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.target)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                    <td style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[0].label} Awaiting Stock (Total)`, 'ALL', 'awaiting', 0);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[1].label} Awaiting Stock (Total)`, 'ALL', 'awaiting', 1);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[2].label} Awaiting Stock (Total)`, 'ALL', 'awaiting', 2);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[3].label} Awaiting Stock (Total)`, 'ALL', 'awaiting', 3);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0);
                        if (tot > 0) triggerDrilldown('Total Awaiting Stock (All Divisions)', 'ALL', 'awaiting');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        fontWeight: 600,
                        cursor: Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.target, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) - Object.values(dynamicAwaiting).reduce((s, r) => s + r.target, 0)) }}>
                      {formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) - Object.values(dynamicAwaiting).reduce((s, r) => s + r.target, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 3: PIPELINE */}
          <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div 
              onClick={() => toggleCollapse('kpi3')}
              style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
            >
              {collapsedTables.kpi3 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 3: Sales Pipeline Projections</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[0].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[1].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[2].label}</th>
                    <th style={{ padding: '12px 16px' }}>{rollingMonths[3].label}</th>
                    <th style={{ padding: '12px 16px' }}>Total Pipeline</th>
                    <th style={{ padding: '12px 16px' }}>Target</th>
                    <th style={{ padding: '12px 16px' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {!collapsedTables.kpi3 && activeDivisionsList.map((div) => {
                    const row = dynamicPipeline[div] || { col0: 0, col1: 0, col2: 0, col3: 0, target: 0 };
                    const total = sumPipelineTotal(row);
                    const variance = total - row.target;
                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                        <td 
                          onClick={() => row.col0 > 0 && triggerDrilldown(rollingMonths[0].label, div, 'pipeline', 0)}
                          style={{ padding: '12px 16px', cursor: row.col0 > 0 ? 'pointer' : 'default', textDecoration: row.col0 > 0 ? 'underline' : 'none', color: row.col0 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col0)}
                        </td>
                        <td 
                          onClick={() => row.col1 > 0 && triggerDrilldown(rollingMonths[1].label, div, 'pipeline', 1)}
                          style={{ padding: '12px 16px', cursor: row.col1 > 0 ? 'pointer' : 'default', textDecoration: row.col1 > 0 ? 'underline' : 'none', color: row.col1 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col1)}
                        </td>
                        <td 
                          onClick={() => row.col2 > 0 && triggerDrilldown(rollingMonths[2].label, div, 'pipeline', 2)}
                          style={{ padding: '12px 16px', cursor: row.col2 > 0 ? 'pointer' : 'default', textDecoration: row.col2 > 0 ? 'underline' : 'none', color: row.col2 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col2)}
                        </td>
                        <td 
                          onClick={() => row.col3 > 0 && triggerDrilldown(rollingMonths[3].label, div, 'pipeline', 3)}
                          style={{ padding: '12px 16px', cursor: row.col3 > 0 ? 'pointer' : 'default', textDecoration: row.col3 > 0 ? 'underline' : 'none', color: row.col3 > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.col3)}
                        </td>
                        <td 
                          onClick={() => total > 0 && triggerDrilldown('Total Pipeline Projections', div, 'pipeline')}
                          style={{ padding: '12px 16px', fontWeight: 600, cursor: total > 0 ? 'pointer' : 'default', textDecoration: total > 0 ? 'underline' : 'none', color: total > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(total)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.target)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                    <td style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[0].label} Pipeline (Total)`, 'ALL', 'pipeline', 0);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[1].label} Pipeline (Total)`, 'ALL', 'pipeline', 1);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[2].label} Pipeline (Total)`, 'ALL', 'pipeline', 2);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0);
                        if (tot > 0) triggerDrilldown(`${rollingMonths[3].label} Pipeline (Total)`, 'ALL', 'pipeline', 3);
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0);
                        if (tot > 0) triggerDrilldown('Total Pipeline Projections (All Divisions)', 'ALL', 'pipeline');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        fontWeight: 600,
                        cursor: Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.target, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0) - Object.values(dynamicPipeline).reduce((s, r) => s + r.target, 0)) }}>
                      {formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0) - Object.values(dynamicPipeline).reduce((s, r) => s + r.target, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 4: ANNUAL TOTALS */}
          <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div 
              onClick={() => toggleCollapse('kpi4')}
              style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
            >
              {collapsedTables.kpi4 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 4: Annual Totals Combination (YTD)</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                    <th style={{ padding: '12px 16px' }}>Invoiced (YTD)</th>
                    <th style={{ padding: '12px 16px' }}>To Be Invoiced</th>
                    <th style={{ padding: '12px 16px' }}>Pipeline</th>
                    <th style={{ padding: '12px 16px' }}>Blank / TBC</th>
                    <th style={{ padding: '12px 16px' }}>Total Projected</th>
                    <th style={{ padding: '12px 16px' }}>Budget Limit</th>
                    <th style={{ padding: '12px 16px' }}>Annual Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {!collapsedTables.kpi4 && activeDivisionsList.map((div) => {
                    const row = dynamicAnnual[div] || { invoiced: 0, toInvoice: 0, pipeline: 0, tbc: 0, budget: 0 };
                    const total = sumAnnualTotal(row);
                    const variance = total - row.budget;
                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                        <td 
                          onClick={() => row.invoiced > 0 && triggerDrilldown('Annual Billed Actual', div, 'annual', 'invoiced')}
                          style={{ padding: '12px 16px', cursor: row.invoiced > 0 ? 'pointer' : 'default', textDecoration: row.invoiced > 0 ? 'underline' : 'none', color: row.invoiced > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.invoiced)}
                        </td>
                        <td 
                          onClick={() => row.toInvoice > 0 && triggerDrilldown('Annual Awaiting Invoice', div, 'annual', 'toInvoice')}
                          style={{ padding: '12px 16px', cursor: row.toInvoice > 0 ? 'pointer' : 'default', textDecoration: row.toInvoice > 0 ? 'underline' : 'none', color: row.toInvoice > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.toInvoice)}
                        </td>
                        <td 
                          onClick={() => row.pipeline > 0 && triggerDrilldown('Annual Pipeline Target', div, 'annual', 'pipeline')}
                          style={{ padding: '12px 16px', cursor: row.pipeline > 0 ? 'pointer' : 'default', textDecoration: row.pipeline > 0 ? 'underline' : 'none', color: row.pipeline > 0 ? '#3b82f6' : 'inherit' }}
                        >
                          {formatZar(row.pipeline)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.tbc)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatZar(total)}</td>
                        <td style={{ padding: '12px 16px' }}>{formatZar(row.budget)}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                    <td style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0);
                        if (tot > 0) triggerDrilldown('Annual Billed Actual (Total)', 'ALL', 'annual', 'invoiced');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0);
                        if (tot > 0) triggerDrilldown('Annual Awaiting Invoice (Total)', 'ALL', 'annual', 'toInvoice');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0))}
                    </td>
                    <td 
                      onClick={() => {
                        const tot = Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0);
                        if (tot > 0) triggerDrilldown('Annual Pipeline Target (Total)', 'ALL', 'annual', 'pipeline');
                      }}
                      style={{ 
                        padding: '12px 16px', 
                        cursor: Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0) > 0 ? 'pointer' : 'default', 
                        textDecoration: Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0) > 0 ? 'underline' : 'none', 
                        color: Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0) > 0 ? '#3b82f6' : 'inherit' 
                      }}
                    >
                      {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.tbc, 0))}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0) - Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0)) }}>
                      {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0) - Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 5: ORDERS DELIVERED */}
          <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div 
              onClick={() => toggleCollapse('kpi5')}
              style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
            >
              {collapsedTables.kpi5 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 5: Orders Delivered</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#334155', color: '#ffffff', textAlign: 'center' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderRight: '1px solid #475569' }}>KPI 1</th>
                    <th colSpan={2} style={{ padding: '10px 16px', borderRight: '1px solid #475569' }}>{prevMonthName}</th>
                    <th colSpan={2} style={{ padding: '10px 16px', borderRight: '1px solid #475569' }}>{selectedMonthName}</th>
                    <th colSpan={4} style={{ padding: '10px 16px' }}>Year to date</th>
                  </tr>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>Orders Delivered</th>
                    <th style={{ padding: '10px 16px' }}>Order Qty</th>
                    <th style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>Order Value</th>
                    <th style={{ padding: '10px 16px' }}>Order Qty</th>
                    <th style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>Order Value</th>
                    <th style={{ padding: '10px 16px' }}>Order Qty</th>
                    <th style={{ padding: '10px 16px' }}>Order Value</th>
                    <th style={{ padding: '10px 16px' }}>Target Value</th>
                    <th style={{ padding: '10px 16px' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {!collapsedTables.kpi5 && activeDivisionsList.map((div) => {
                    const row = dynamicDelivered[div] || { prevQty: 0, prevValue: 0, selectedQty: 0, selectedValue: 0, ytdQty: 0, ytdValue: 0, target: 0 };
                    const variance = row.ytdValue - row.target;
                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.prevQty.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid var(--border)' }}>{formatZar(row.prevValue)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.selectedQty.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid var(--border)' }}>{formatZar(row.selectedValue)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{row.ytdQty.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{formatZar(row.ytdValue)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatZar(row.target)}</td>
                        <td style={{ 
                          padding: '12px 16px', textAlign: 'right', fontWeight: 700, 
                          color: variance < 0 ? '#ef4444' : '#10b981',
                          background: variance < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                        }}>
                          {formatZar(variance)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* TOTAL ROW */}
                  <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                    <td style={{ padding: '12px 16px' }}>TOTAL</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Object.values(dynamicDelivered).reduce((s, r) => s + r.prevQty, 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid var(--border)' }}>{formatZar(Object.values(dynamicDelivered).reduce((s, r) => s + r.prevValue, 0))}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Object.values(dynamicDelivered).reduce((s, r) => s + r.selectedQty, 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', borderRight: '1px solid var(--border)' }}>{formatZar(Object.values(dynamicDelivered).reduce((s, r) => s + r.selectedValue, 0))}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{Object.values(dynamicDelivered).reduce((s, r) => s + r.ytdQty, 0).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatZar(Object.values(dynamicDelivered).reduce((s, r) => s + r.ytdValue, 0))}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatZar(Object.values(dynamicDelivered).reduce((s, r) => s + r.target, 0))}</td>
                    <td style={{ 
                      padding: '12px 16px', textAlign: 'right',
                      color: (Object.values(dynamicDelivered).reduce((s, r) => s + r.ytdValue, 0) - Object.values(dynamicDelivered).reduce((s, r) => s + r.target, 0)) < 0 ? '#ef4444' : '#10b981',
                      background: (Object.values(dynamicDelivered).reduce((s, r) => s + r.ytdValue, 0) - Object.values(dynamicDelivered).reduce((s, r) => s + r.target, 0)) < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                    }}>
                      {formatZar(Object.values(dynamicDelivered).reduce((s, r) => s + r.ytdValue, 0) - Object.values(dynamicDelivered).reduce((s, r) => s + r.target, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: BUDGET & TARGET MANAGER (12-MONTH SCHEDULE & CASCADING SHORTFALL ENGINE) */}
      {activeReport === 'budget_manager' && (
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          {/* TOP BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users style={{ color: '#3b82f6' }} />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure Budgets & Team Divisions</h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Set 12-month budget schedules per division with automatic cascading shortfall recovery</div>
              </div>
              <select 
                value={mgmtFy} 
                onChange={(e) => setMgmtFy(e.target.value)} 
                className="form-control" 
                style={{ width: '130px', height: '36px', padding: '0 8px', fontSize: '13px', background: 'var(--bg-primary)', color: 'inherit', border: '1px solid var(--border)', borderRadius: '6px', marginLeft: '8px' }}
              >
                <option value="2024-2025">FY 2024-2025</option>
                <option value="2025-2026">FY 2025-2026</option>
                <option value="2026-2027">FY 2026-2027</option>
                <option value="2027-2028">FY 2027-2028</option>
                <option value="2028-2029">FY 2028-2029</option>
              </select>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={() => saveBudgetsConfig(budgetsConfig)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 18px', borderRadius: '6px' }}
            >
              <Save size={15} /> Save All Budget Configs
            </button>
          </div>

          {/* CASCADING ARCHITECTURE INFO CALLOUT */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px', fontSize: '12px', lineHeight: '1.6' }}>
            <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} /> Cascading Shortfall & Dynamic Budget Architecture
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginTop: '8px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>KPI 1 (Sales Invoiced):</strong> Sets the monthly budget per month. YTD budget dynamically sums elapsed months from March.
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>KPI 2 (To Be Invoiced):</strong> Target = Shortfall of KPI 1 YTD (<code>max(0, -KPI1 YTD Variance)</code>). If on track/ahead, Target is R 0.
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>KPI 3 (Sales Pipeline):</strong> Target = Remaining deficit from KPI 2 (<code>max(0, -KPI2 Variance)</code>). If covered, Target is R 0.
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>KPI 4 (Annual Limit):</strong> Automatically calculated as the full 12-month sum of KPI 1 monthly budgets.
              </div>
            </div>
          </div>

          {/* ADD DIVISION FORM */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <input 
              type="text" 
              placeholder="Add New Division Name (e.g. MODUS SIGNATURE ( Thando ))" 
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeamDivision()}
              className="form-control"
              style={{ flex: 1, height: '38px', padding: '0 12px', fontSize: '13px', background: 'var(--bg-card)', color: 'inherit', border: '1px solid var(--border)', borderRadius: '6px' }}
            />
            <button 
              className="btn btn-secondary"
              onClick={addTeamDivision}
              style={{ height: '38px', fontSize: '13px', padding: '0 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Team / Division
            </button>
          </div>

          {/* DIVISION CARDS WITH 12-MONTH ACCORDIONS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mgmtFyConfig.divisions.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                No divisions defined for this Financial Year yet. Add one above!
              </div>
            ) : (
              mgmtFyConfig.divisions.map(div => {
                const monthlyArr = getMonthlyBudgets(mgmtFyConfig, div);
                const annualSum = monthlyArr.reduce((s, b) => s + (Number(b) || 0), 0);
                const monthlyAvg = annualSum / 12;
                const isExpanded = !!expandedDivisions[div];
                const fyLabels = getFyMonthLabels(mgmtFy);
                const kpi5Target = (mgmtFyConfig.targetsKPI5 && mgmtFyConfig.targetsKPI5[div]) || 0;

                return (
                  <div key={div} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    {/* DIVISION HEADER BAR */}
                    <div 
                      style={{ 
                        padding: '14px 18px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: '12px',
                        background: isExpanded ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-card)',
                        borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleDivisionExpand(div)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: isExpanded ? '#3b82f6' : 'var(--text-secondary)' }}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: isExpanded ? '#3b82f6' : 'inherit' }}>{div}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {isExpanded ? 'Click header to collapse 12-month schedule' : 'Click header to edit 12 monthly budgets'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        {/* ANNUAL BUDGET BADGE */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Annual KPI 1 Total</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{formatZar(annualSum)}</div>
                        </div>

                        {/* MONTHLY AVERAGE BADGE */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Monthly Average</div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>{formatZar(monthlyAvg)} / mo</div>
                        </div>

                        {/* TOGGLE BUTTON */}
                        <button
                          onClick={() => toggleDivisionExpand(div)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {isExpanded ? 'Collapse' : 'Edit Schedule'}
                        </button>

                        {/* DELETE BUTTON */}
                        <button 
                          onClick={() => deleteTeamDivision(div)}
                          title={`Delete ${div}`}
                          style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '6px', borderRadius: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED 12-MONTH SCHEDULE PANEL */}
                    {isExpanded && (
                      <div style={{ padding: '20px', background: 'var(--bg-card)' }}>
                        {/* QUICK SPREAD TOOLBAR */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Distribution Tools:</span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              placeholder="Monthly Amount"
                              id={`quick_m_${div}`}
                              style={{ width: '130px', height: '30px', padding: '0 8px', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                            />
                            <button
                              className="btn btn-secondary"
                              style={{ height: '30px', fontSize: '11px', padding: '0 10px', borderRadius: '4px' }}
                              onClick={() => {
                                const el = document.getElementById(`quick_m_${div}`);
                                if (el && el.value) handleApplyFlatMonthly(div, el.value);
                              }}
                            >
                              Apply to All 12 Mos
                            </button>
                          </div>

                          <div style={{ height: '16px', width: '1px', background: 'var(--border)' }} />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              placeholder="Annual Total Amount"
                              id={`quick_a_${div}`}
                              style={{ width: '140px', height: '30px', padding: '0 8px', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                            />
                            <button
                              className="btn btn-secondary"
                              style={{ height: '30px', fontSize: '11px', padding: '0 10px', borderRadius: '4px' }}
                              onClick={() => {
                                const el = document.getElementById(`quick_a_${div}`);
                                if (el && el.value) handleDistributeAnnual(div, el.value);
                              }}
                            >
                              Distribute Evenly (÷12)
                            </button>
                          </div>

                          <button
                            className="btn btn-secondary"
                            style={{ height: '30px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', marginLeft: 'auto', color: '#f43f5e' }}
                            onClick={() => handleApplyFlatMonthly(div, 0)}
                          >
                            Clear All Months
                          </button>
                        </div>

                        {/* 12-MONTH INPUTS GRID (March to February) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                          {fyLabels.map(m => {
                            const val = monthlyArr[m.idx] || 0;
                            const pct = annualSum > 0 ? ((val / annualSum) * 100).toFixed(1) : '0.0';
                            return (
                              <div 
                                key={m.idx} 
                                style={{ 
                                  background: 'var(--bg-primary)', 
                                  border: '1px solid var(--border)', 
                                  borderRadius: '6px', 
                                  padding: '10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, fontSize: '12px' }}>{m.label}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{pct}%</span>
                                </div>
                                <input
                                  type="number"
                                  value={val}
                                  onChange={(e) => handleMonthlyBudgetChange(div, m.idx, e.target.value)}
                                  style={{ 
                                    width: '100%', 
                                    padding: '6px 8px', 
                                    fontSize: '12px', 
                                    background: 'var(--bg-card)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '4px', 
                                    color: 'inherit',
                                    fontWeight: 600,
                                    boxSizing: 'border-box'
                                  }}
                                />
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                  {formatZar(val)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* KPI 5 TARGET ROW */}
                        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ fontSize: '12px' }}>
                            <strong>KPI 5: Delivered Orders Target [ZAR]</strong> (Optional baseline)
                          </div>
                          <input
                            type="number"
                            value={kpi5Target}
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0;
                              const configCopy = { ...budgetsConfig };
                              if (!configCopy[mgmtFy]) configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {} };
                              if (!configCopy[mgmtFy].targetsKPI5) configCopy[mgmtFy].targetsKPI5 = {};
                              configCopy[mgmtFy].targetsKPI5[div] = num;
                              setBudgetsConfig(configCopy);
                            }}
                            style={{ width: '180px', padding: '6px 8px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* TOTAL COMPANY SUMMARY CARD */}
          {mgmtFyConfig.divisions.length > 0 && (
            <div style={{ marginTop: '24px', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Total Company Budget (All {mgmtFyConfig.divisions.length} Divisions)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Full Financial Year {mgmtFy} Annual Target</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>
                  {formatZar(
                    mgmtFyConfig.divisions.reduce((tot, div) => {
                      const mArr = getMonthlyBudgets(mgmtFyConfig, div);
                      return tot + mArr.reduce((s, b) => s + (Number(b) || 0), 0);
                    }, 0)
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Average {formatZar(
                    mgmtFyConfig.divisions.reduce((tot, div) => {
                      const mArr = getMonthlyBudgets(mgmtFyConfig, div);
                      return tot + mArr.reduce((s, b) => s + (Number(b) || 0), 0);
                    }, 0) / 12
                  )} / month
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: OPERATIONAL KPIS (KPI 7 & KPI 8) */}
      {activeReport === 'operational_kpis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* KPI 7: ENQUIRIES & AVERAGES */}
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <CheckCircle style={{ color: '#10b981' }} /> KPI 7: Enquiries & Operational Averages
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#334155', color: '#ffffff', textAlign: 'center' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderRight: '1px solid #475569' }}>KPI 3</th>
                    <th colSpan={3} style={{ padding: '10px 16px', borderRight: '1px solid #475569' }}>Enquiries</th>
                    <th colSpan={3} style={{ padding: '10px 16px', borderRight: '1px solid #475569' }}>Faults</th>
                    <th colSpan={3} style={{ padding: '10px 16px' }}>Site Visits</th>
                  </tr>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>Enquiries Metric</th>
                    <th style={{ padding: '10px 16px' }}>Average Enquiries</th>
                    <th style={{ padding: '10px 16px' }}>Target</th>
                    <th style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>Variance</th>
                    <th style={{ padding: '10px 16px' }}>Average Faults</th>
                    <th style={{ padding: '10px 16px' }}>Target</th>
                    <th style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>Variance</th>
                    <th style={{ padding: '10px 16px' }}>Average Site Visits</th>
                    <th style={{ padding: '10px 16px' }}>Target</th>
                    <th style={{ padding: '10px 16px' }}>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                    <td style={{ padding: '14px 16px' }}>TOTAL</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>1.89</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>1.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', borderRight: '1px solid var(--border)' }}>-0.89</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>6.79</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>5.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', borderRight: '1px solid var(--border)' }}>-1.79</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>1.37</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>2.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}>0.63</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* KPI 8: FAULTS TRACKER */}
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
              <AlertCircle style={{ color: '#f43f5e' }} /> KPI 8: Client Faults Tracker
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#334155', color: '#ffffff', textAlign: 'center' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', borderRight: '1px solid #475569' }}>KPI 4</th>
                    <th colSpan={3} style={{ padding: '10px 16px', borderRight: '1px solid #475569' }}>{selectedMonthName}</th>
                    <th colSpan={3} style={{ padding: '10px 16px' }}>Year to Date</th>
                  </tr>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'right', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left' }}>Fault Status Summary</th>
                    <th style={{ padding: '10px 16px' }}>New Faults</th>
                    <th style={{ padding: '10px 16px' }}>Open Faults</th>
                    <th style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>Closed</th>
                    <th style={{ padding: '10px 16px' }}>Total Faults</th>
                    <th style={{ padding: '10px 16px' }}>Open</th>
                    <th style={{ padding: '10px 16px' }}>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
                    <td style={{ padding: '14px 16px' }}>TOTAL</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>7.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f59e0b' }}>7.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981', borderRight: '1px solid var(--border)' }}>0.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>36.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#f59e0b' }}>19.00</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981' }}>17.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 4: STOCK VALUATION */}
      {activeReport === 'stock_valuation' && (
        <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package style={{ color: '#eab308' }} /> Warehouse Stock Valuation Matrix
          </h2>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Stock Classification Group</th>
                <th style={{ padding: '12px' }}>Current Asset Value</th>
                <th style={{ padding: '12px' }}>Limit/Target Baseline</th>
                <th style={{ padding: '12px' }}>Variance</th>
                <th style={{ padding: '12px' }}>Risk Assessment</th>
              </tr>
            </thead>
            <tbody>
              {stockValues.map(stock => {
                const variance = stock.current - stock.target;
                const isNormal = stock.label.includes('Normal');
                const varianceColor = getVarianceColor(variance, !isNormal);
                const hasRisk = !isNormal && variance > 0;
                return (
                  <tr key={stock.label} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 600 }}>{stock.label}</td>
                    <td>{formatZar(stock.current)}</td>
                    <td>{formatZar(stock.target)}</td>
                    <td style={{ fontWeight: 700, color: varianceColor }}>{formatZar(variance)}</td>
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        background: hasRisk ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: hasRisk ? '#ef4444' : '#10b981'
                      }}>
                        {hasRisk ? 'OVER LIMIT' : 'HEALTHY'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DRILLDOWN POPUP MODAL (CENTERED VIEWPORT FIXED BACKDROP WITH SOLID CONTRAST BACKGROUND) */}
      {drilldownModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '24px', boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff', // Solid high-contrast white background
            border: '2px solid #e2e8f0',
            borderRadius: '16px', width: '100%', maxWidth: '750px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', display: 'flex', 
            flexDirection: 'column', overflow: 'hidden', animation: 'modalEntry 0.2s ease-out',
            maxHeight: '85vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc' // Solid light gray header background
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <ShieldCheck size={14} /> KPI Metric Source Drill-down
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {drilldownModal.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', fontWeight: 600 }}>
                  Team Division: {drilldownModal.subtitle}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {sortedDrilldownItems.length > 0 && (
                  <button
                    onClick={handleExportDrilldownToExcel}
                    style={{
                      background: '#059669',
                      border: '1px solid #047857',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#047857'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#059669'; }}
                    title="Export to Excel (.xlsx)"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                )}
                <button 
                  onClick={() => setDrilldownModal({ isOpen: false, title: '', subtitle: '', items: [] })}
                  style={{ 
                    background: '#ffffff', border: '1px solid #e2e8f0', 
                    color: '#475569', cursor: 'pointer', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', 
                    borderRadius: '50%', transition: 'all 0.2s' 
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
              {drilldownModal.items.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '40px 20px' }}>
                  <FolderOpen size={36} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
                  No database project orders found contributing to this calculation.
                </div>
              ) : (                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569', background: '#f1f5f9' }}>
                      <th 
                        onClick={() => handleDrilldownSort('projectName')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          PROJECT NAME {renderDrilldownSortIcon('projectName')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('division')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          DIVISION {renderDrilldownSortIcon('division')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('invoiceNo')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          INVOICE / CN # {renderDrilldownSortIcon('invoiceNo')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('orderId')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          QUOTE ID {renderDrilldownSortIcon('orderId')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('quote_name')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          QUOTE NAME {renderDrilldownSortIcon('quote_name')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('date')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          DATE {renderDrilldownSortIcon('date')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleDrilldownSort('value')}
                        style={{ padding: '12px', fontWeight: 700, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                          VALUE {renderDrilldownSortIcon('value')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDrilldownItems.map((item, idx) => {
                      const isCred = item.isCredit || item.value < 0;
                      const invCode = item.invoiceNo || (item.orderId && item.orderId.match(/\((IN-[0-9]+|CN-[0-9]+|CR-[0-9]+)\)/i)?.[1]) || '';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s', background: isCred ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }} onMouseOver={(e) => e.currentTarget.style.background = isCred ? 'rgba(239, 68, 68, 0.08)' : '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = isCred ? 'rgba(239, 68, 68, 0.03)' : 'transparent'}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{item.projectName}</td>
                          <td style={{ padding: '12px', color: '#475569', fontWeight: 600, fontSize: '11.5px' }}>{item.division || 'Unassigned'}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: isCred ? '#dc2626' : '#1e40af', fontWeight: 700 }}>
                            {invCode ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                {invCode}
                                {isCred && (
                                  <span style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#dc2626',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '9.5px',
                                    fontWeight: 800
                                  }}>
                                    CREDIT
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#475569', fontSize: '11.5px' }}>
                            {item.orderId}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{item.quote_name || 'General Spec'}</td>
                          <td style={{ padding: '12px', color: '#475569', fontWeight: 500 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={12} style={{ color: '#64748b' }} /> {item.date ? String(item.date).split('T')[0] : '—'}
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: isCred ? '#dc2626' : '#059669' }}>
                            {isCred ? `- ${formatZar(Math.abs(item.value))}` : formatZar(item.value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                      <td colSpan={6} style={{ padding: '12px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>
                        TOTAL NET VALUE:
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '14px', color: (sortedDrilldownItems.reduce((s, it) => s + (Number(it.value) || 0), 0)) < 0 ? '#dc2626' : '#059669' }}>
                        {formatZar(sortedDrilldownItems.reduce((s, it) => s + (Number(it.value) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>

              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc'
            }}>
              <div>
                {sortedDrilldownItems.length > 0 && (
                  <button 
                    onClick={handleExportDrilldownToExcel}
                    style={{
                      background: '#10b981',
                      border: '1px solid #059669',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#10b981'; }}
                  >
                    <Download size={15} /> Export to Excel (.xlsx)
                  </button>
                )}
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDrilldownModal({ isOpen: false, title: '', subtitle: '', items: [] })}
                style={{ fontSize: '13px', padding: '8px 20px', cursor: 'pointer', borderRadius: '8px', fontWeight: 700, background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dynamic Keyframes injection for entry animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalEntry {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  );
}
