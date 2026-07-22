import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, 
  CheckCircle, FileText, BarChart2, Plus, ArrowUpRight, ArrowDownRight, Settings,
  ChevronDown, ChevronUp, X, FolderOpen, Calendar, ShieldCheck, Save, Users, Edit3, Trash2,
  ArrowUpDown, ArrowUp, ArrowDown
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
      'MODUS PROFESSIONAL ( Ryan )': { monthly: 1020000.00, ytd: 6953000.00 },
      'MOOD STORES': { monthly: 0.00, ytd: 0.00 },
      'MODUS PROJECTS ( Dani )': { monthly: 1200000.00, ytd: 4560000.00 },
      'PROJECTS (Dani own)': { monthly: 400000.00, ytd: 2800000.00 },
      'MODUS SIGNATURE ( Thando )': { monthly: 37500.00, ytd: 682500.00 },
      'MADE ( Jon-Peer)': { monthly: 120000.00, ytd: 840000.00 },
      'LUXELINE': { monthly: 120000.00, ytd: 400000.00 },
      'INTERNAL - Office': { monthly: 0.00, ytd: 0.00 }
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
    }
  }
};

export default function ReportsPage() {
  const { projects, supportTickets } = useStore();
  
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

  // Load budgets config from db
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

    // Ignore generic/placeholder names
    const isGenericName = !name || name === 'martin döller' || name === 'merlyn mittins' || name === 'select project manager...' || name === 'tbd';
    
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

    // Unallocated fallback row so unassigned orders are clearly visible
    return 'UNALLOCATED / UNASSIGNED';
  };

  const getOrderDivision = (order, proj) => {
    if (order.division && order.division !== 'INTERNAL - Office' && order.division !== 'Auto-Detect (PM Name)' && order.division !== 'UNALLOCATED / UNASSIGNED') {
      return order.division;
    }
    if (proj.division && proj.division !== 'INTERNAL - Office') return proj.division;
    
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
        const day = parseInt(dateParts[0], 10);
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

  // Initialize Aggregated KPI Models
  const dynamicInvoiced = {};
  const dynamicAwaiting = {};
  const dynamicPipeline = {};
  const dynamicAnnual = {};

  activeDivisionsList.forEach(div => {
    const baselineKPI1 = (activeFyConfig.budgetsKPI1 && activeFyConfig.budgetsKPI1[div]) || { monthly: 0, ytd: 0 };
    const baselineKPI2 = (activeFyConfig.targetsKPI2 && activeFyConfig.targetsKPI2[div]) || 0;
    const baselineKPI3 = (activeFyConfig.targetsKPI3 && activeFyConfig.targetsKPI3[div]) || 0;
    const baselineKPI4 = (activeFyConfig.budgetsKPI4 && activeFyConfig.budgetsKPI4[div]) || 0;

    // YTD Budget logic: monthly_budget * number of elapsed months in FY sequence (selectedSeqIndex + 1)
    const computedYtdBudget = baselineKPI1.monthly * (selectedSeqIndex + 1);

    dynamicInvoiced[div] = { actual: 0, budget: baselineKPI1.monthly, ytdActual: 0, ytdBudget: computedYtdBudget };
    dynamicAwaiting[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: baselineKPI2 };
    dynamicPipeline[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: baselineKPI3 };
    dynamicAnnual[div] = { invoiced: 0, toInvoice: 0, pipeline: 0, tbc: 0, budget: baselineKPI4 };
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
      const clientInvoices = order.clientInvoices || [];
      
      let processedInvoicedTotal = 0;

      // 1. Iterate over line items and their invoiceHistory
      itemsList.forEach(item => {
        const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
        if (iHist.length > 0) {
          iHist.forEach(h => {
            const hRef = h.ref || item.invoiceRef;
            const hDate = h.date || item.invoiceDate;
            const hVal = (Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0);
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
        } else if (item.invoiceRef && item.invoiceDate) {
          const itemVal = (Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
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

      // 2. If no item-level invoices were processed, check order-level clientInvoices or order.invoiceRef
      if (processedInvoicedTotal === 0) {
        if (clientInvoices.length > 0) {
          clientInvoices.forEach(cinv => {
            const cRef = cinv.id || cinv.ref || order.invoiceRef;
            const cDate = cinv.date || order.invoiceDate;
            const cVal = (cinv.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitRetail) || 0)), 0) || orderValue;
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
        } else if (order.invoiceRef && order.invoiceDate) {
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
            // Find appropriate expected date: item.eta -> item.po_eta -> order.eta -> order.expected_delivery_date
            const expectedDate = item.eta || item.po_eta || order.eta || order.expected_delivery_date;
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
              // Fallback to order month if no ETA
              const { monthName: ordMonth, year: ordYear, monthIdx: ordMonthIdx } = orderDateParsed;
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

  // Trigger drilldown popup details handler
  const triggerDrilldown = (title, division, type, extraFilter = null) => {
    const list = [];
    Object.values(projects || {}).forEach(proj => {
      const orders = proj.orders || [];
      orders.forEach(order => {
        const div = getOrderDivision(order, proj);
        if (div !== division) return;

        const orderValue = order.value || (order.itemsList || []).reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0);
        
        // Compute precise actual invoiced value from line items / invoice history
        const invoicedValue = (order.itemsList || []).reduce((s, item) => {
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
        const invoiceDateParsed = getOrderMonthAndYear(order, 'invoice');
        const isEligibleForInvoiced = hasValidInvoiceRefAndDate(order) && invoicedValue > 0;

        // Sales Invoiced
        if (type === 'invoiced') {
          const itemsList = order.itemsList || [];
          const clientInvoices = order.clientInvoices || [];
          const invoiceGroupsMap = {};

          itemsList.forEach(item => {
            const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
            if (iHist.length > 0) {
              iHist.forEach(h => {
                const hRef = h.ref || item.invoiceRef;
                const hDate = h.date || item.invoiceDate;
                const hVal = (Number(h.qty) || 0) * (Number(h.rate) || Number(item.unitRetail) || 0);
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
                          orderId: `${order.id || 'N/A'} (${hRef})`,
                          quote_name: order.quote_name || 'General Spec',
                          date: hDate,
                          value: 0
                        };
                      }
                      invoiceGroupsMap[groupKey].value += hVal;
                    }
                  }
                }
              });
            } else if (item.invoiceRef && item.invoiceDate) {
              const itemVal = (Number(item.invoiceQty) || Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
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
                        orderId: `${order.id || 'N/A'} (${item.invoiceRef})`,
                        quote_name: order.quote_name || 'General Spec',
                        date: item.invoiceDate,
                        value: 0
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
          } else {
            if (clientInvoices.length > 0) {
              clientInvoices.forEach(cinv => {
                const cRef = cinv.id || cinv.ref || order.invoiceRef;
                const cDate = cinv.date || order.invoiceDate;
                const cVal = (cinv.items || []).reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitRetail) || 0)), 0) || orderValue;
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
                      list.push({ projectName: proj.name, orderId: `${order.id || 'N/A'} (${cRef})`, quote_name: order.quote_name || 'General Spec', date: cDate, value: cVal });
                    }
                  }
                }
              });
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
                  list.push({ projectName: proj.name, orderId: `${order.id || 'N/A'} (${order.invoiceRef})`, quote_name: order.quote_name || 'General Spec', date: order.invoiceDate, value: orderValue });
                }
              }
            }
          }
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
                const expectedDate = item.eta || item.po_eta || order.eta || order.expected_delivery_date;
                const parsedExpected = parseDateString(expectedDate) || orderDateParsed;
                if (parsedExpected) {
                  const { monthName: expMonth, year: expYear } = parsedExpected;
                  if (extraFilter !== null) {
                    const targetMonth = rollingMonths[extraFilter];
                    if (expMonth === targetMonth.monthName && expYear === targetMonth.year) {
                      list.push({ projectName: proj.name, orderId: `${order.id || 'N/A'} (Item: ${item.code || 'Hardware'})`, quote_name: order.quote_name || 'General Spec', date: expectedDate || order.orderDate || 'N/A', value: outstandingVal });
                    }
                  } else {
                    const inRolling = rollingMonths.some(rm => rm.monthName === expMonth && rm.year === expYear);
                    if (inRolling) {
                      list.push({ projectName: proj.name, orderId: `${order.id || 'N/A'} (Item: ${item.code || 'Hardware'})`, quote_name: order.quote_name || 'General Spec', date: expectedDate || order.orderDate || 'N/A', value: outstandingVal });
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
                  list.push({ projectName: proj.name, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue });
                }
              } else {
                const inRolling = rollingMonths.some(rm => rm.monthName === orderMonth && rm.year === orderYear);
                if (inRolling) {
                  list.push({ projectName: proj.name, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue });
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
                list.push({ projectName: proj.name, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: processedInvoicedTotal });
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
                list.push({ projectName: proj.name, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderOutstandingTotal });
              }
            } else if (extraFilter === 'pipeline' && (order.status === 'Draft' || !order.status || (order.status === 'Pending' && !isEligibleForInvoiced))) {
              list.push({ projectName: proj.name, orderId: order.id || 'N/A', quote_name: order.quote_name || 'General Spec', date: order.orderDate || 'N/A', value: orderValue });
            }
          }
        }
      });
    });

    setDrilldownModal({
      isOpen: true,
      title: `${title}`,
      subtitle: division,
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

  // Budget Manager: Edit cell changes in state config
  const handleBudgetValueChange = (division, field, subfield, val) => {
    const num = parseFloat(val) || 0;
    const configCopy = { ...budgetsConfig };
    if (!configCopy[mgmtFy]) {
      configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {}, targetsKPI2: {}, targetsKPI3: {}, budgetsKPI4: {} };
    }
    const fyConf = configCopy[mgmtFy];

    if (field === 'budgetsKPI1') {
      if (!fyConf.budgetsKPI1[division]) fyConf.budgetsKPI1[division] = { monthly: 0, ytd: 0 };
      fyConf.budgetsKPI1[division][subfield] = num;
    } else if (field === 'targetsKPI2') {
      fyConf.targetsKPI2[division] = num;
    } else if (field === 'targetsKPI3') {
      fyConf.targetsKPI3[division] = num;
    } else if (field === 'budgetsKPI4') {
      fyConf.budgetsKPI4[division] = num;
    }
    setBudgetsConfig(configCopy);
  };

  // Budget Manager: Add Team Division
  const addTeamDivision = () => {
    if (!newDivisionName.trim()) return;
    const configCopy = { ...budgetsConfig };
    if (!configCopy[mgmtFy]) {
      configCopy[mgmtFy] = { divisions: [], budgetsKPI1: {}, targetsKPI2: {}, targetsKPI3: {}, budgetsKPI4: {} };
    }
    const fyConf = configCopy[mgmtFy];
    if (!fyConf.divisions) fyConf.divisions = [];
    if (fyConf.divisions.includes(newDivisionName)) return;

    fyConf.divisions.push(newDivisionName);
    fyConf.budgetsKPI1[newDivisionName] = { monthly: 0, ytd: 0 };
    fyConf.targetsKPI2[newDivisionName] = 0;
    fyConf.targetsKPI3[newDivisionName] = 0;
    fyConf.budgetsKPI4[newDivisionName] = 0;

    saveBudgetsConfig(configCopy);
    setNewDivisionName('');
  };

  // Budget Manager: Delete Division
  const deleteTeamDivision = (division) => {
    const configCopy = { ...budgetsConfig };
    const fyConf = configCopy[mgmtFy];
    if (!fyConf) return;

    fyConf.divisions = (fyConf.divisions || []).filter(d => d !== division);
    delete fyConf.budgetsKPI1[division];
    delete fyConf.targetsKPI2[division];
    delete fyConf.targetsKPI3[division];
    delete fyConf.budgetsKPI4[division];

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

  const formatZar = (val) => {
    if (val === undefined || val === null) return 'R 0.00';
    return (val < 0 ? '-' : '') + 'R ' + Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVarianceColor = (val, invert = false) => {
    if (val === 0) return 'var(--text-secondary)';
    const isGood = invert ? val < 0 : val > 0;
    return isGood ? '#10b981' : '#f43f5e';
  };

  const sumAwaitingStockTotal = (row) => row.col0 + row.col1 + row.col2 + row.col3;
  const sumPipelineTotal = (row) => row.col0 + row.col1 + row.col2 + row.col3;
  const sumAnnualTotal = (row) => (row.invoiced || 0) + (row.toInvoice || 0) + (row.pipeline || 0) + (row.tbc || 0);

  const newFaultsCount = (supportTickets || []).filter(t => t.status === 'New' || t.status === 'Open').length;
  const closedFaultsCount = (supportTickets || []).filter(t => t.status === 'Closed' || t.status === 'Resolved').length;

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
    <div className="animation-fade-in" style={{ padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      
      {/* HEADER CONTROLS (Report view selector dropdown) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart2 size={24} style={{ color: '#3b82f6' }} />
            <select 
              value={activeReport} 
              onChange={(e) => setActiveReport(e.target.value)} 
              style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-title)', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', padding: 0 }}
            >
              <option value="sales_kpi">Sales & KPI Ledger Engine</option>
              <option value="budget_manager">Budget & Target Manager (Historical & YTD)</option>
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Period:</span>
            <select 
              value={selectedPeriodKey} 
              onChange={(e) => setSelectedPeriodKey(e.target.value)} 
              className="form-control" 
              style={{ width: '180px', height: '38px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'inherit', padding: '0 10px', fontSize: '13px' }}
            >
              {selectorPeriods.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
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
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0)) }}>
                      {formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.actual, 0) - Object.values(dynamicInvoiced).reduce((s, r) => s + r.budget, 0))}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicInvoiced).reduce((s, r) => s + r.ytdActual, 0))}</td>
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
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col0, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col1, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col2, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + r.col3, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAwaiting).reduce((s, r) => s + sumAwaitingStockTotal(r), 0))}</td>
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
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col0, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col1, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col2, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + r.col3, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicPipeline).reduce((s, r) => s + sumPipelineTotal(r), 0))}</td>
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
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.invoiced, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.toInvoice, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.pipeline, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.tbc, 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0))}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0))}</td>
                    <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0) - Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0)) }}>
                      {formatZar(Object.values(dynamicAnnual).reduce((s, r) => s + sumAnnualTotal(r), 0) - Object.values(dynamicAnnual).reduce((s, r) => s + r.budget, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: BUDGET & TARGET MANAGER (HISTORICAL EDITOR) */}
      {activeReport === 'budget_manager' && (
        <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users style={{ color: '#3b82f6' }} />
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure Budgets & Team Divisions</h2>
              <select 
                value={mgmtFy} 
                onChange={(e) => setMgmtFy(e.target.value)} 
                className="form-control" 
                style={{ width: '130px', height: '36px', padding: '0 8px', fontSize: '13px', background: 'var(--bg-primary)', color: 'inherit', border: '1px solid var(--border)', borderRadius: '6px' }}
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

          {/* ADD DIVISION FORM */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <input 
              type="text" 
              placeholder="e.g. MODUS SIGNATURE ( Thando )" 
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
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

          {/* EDITABLE VALUES TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Team Division Name</th>
                  <th style={{ padding: '12px' }}>KPI 1: Monthly Budget (ZAR)</th>
                  <th style={{ padding: '12px' }}>KPI 2: Awaiting Stock Target</th>
                  <th style={{ padding: '12px' }}>KPI 3: Pipeline Target</th>
                  <th style={{ padding: '12px' }}>KPI 4: Annual Limit Budget</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {mgmtFyConfig.divisions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No divisions defined for this Financial Year yet. Add one above!
                    </td>
                  </tr>
                ) : (
                  mgmtFyConfig.divisions.map(div => {
                    const kpi1 = (mgmtFyConfig.budgetsKPI1 && mgmtFyConfig.budgetsKPI1[div]) || { monthly: 0, ytd: 0 };
                    const kpi2 = (mgmtFyConfig.targetsKPI2 && mgmtFyConfig.targetsKPI2[div]) || 0;
                    const kpi3 = (mgmtFyConfig.targetsKPI3 && mgmtFyConfig.targetsKPI3[div]) || 0;
                    const kpi4 = (mgmtFyConfig.budgetsKPI4 && mgmtFyConfig.budgetsKPI4[div]) || 0;

                    return (
                      <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{div}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="number" 
                            value={kpi1.monthly}
                            onChange={(e) => handleBudgetValueChange(div, 'budgetsKPI1', 'monthly', e.target.value)}
                            style={{ width: '130px', padding: '6px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="number" 
                            value={kpi2}
                            onChange={(e) => handleBudgetValueChange(div, 'targetsKPI2', null, e.target.value)}
                            style={{ width: '130px', padding: '6px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="number" 
                            value={kpi3}
                            onChange={(e) => handleBudgetValueChange(div, 'targetsKPI3', null, e.target.value)}
                            style={{ width: '130px', padding: '6px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input 
                            type="number" 
                            value={kpi4}
                            onChange={(e) => handleBudgetValueChange(div, 'budgetsKPI4', null, e.target.value)}
                            style={{ width: '130px', padding: '6px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'inherit' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button 
                            onClick={() => deleteTeamDivision(div)}
                            style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: OPERATIONAL KPIS */}
      {activeReport === 'operational_kpis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* FAULTS CARD */}
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle style={{ color: '#f43f5e' }} /> KPI 4: Client Fault Tickets Status
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f43f5e' }}>{newFaultsCount || 4}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active Open Faults</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#eab308' }}>23</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Logged YTD</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>{closedFaultsCount || 5}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Resolved Faults</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                All fault tickets are synced with the support module. Ensuring resolved times stay under 7 business days preserves our customer satisfaction index.
              </p>
            </div>
          </div>

          {/* AUDITS CARD */}
          <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle style={{ color: '#10b981' }} /> KPI 3: Site Visits & Audit Metrics
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>1.87</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Enquiries (Target: 1.0)</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f43f5e' }}>7.27</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avg Faults (Target: 5.0)</div>
                </div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800 }}>1.33</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Site Visits (Target: 2.0)</div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Tracking actual site visits ensures that project managers align with onsite schedules and clear up snags before logistics handovers.
              </p>
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
                        onClick={() => handleDrilldownSort('orderId')}
                        style={{ padding: '12px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          QUOTE ID / INV {renderDrilldownSortIcon('orderId')}
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
                    {sortedDrilldownItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{item.projectName}</td>
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#334155', fontWeight: 600 }}>{item.orderId}</td>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{item.quote_name || 'General Spec'}</td>
                        <td style={{ padding: '12px', color: '#475569', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={12} style={{ color: '#64748b' }} /> {item.date}
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: '#059669' }}>{formatZar(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', background: '#f8fafc'
            }}>
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
