import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { 
  ArrowLeft, Download, Search, RefreshCw, ChevronRight, ChevronDown, 
  Calendar, Layers, Filter, CheckCircle2, Clock, AlertTriangle, 
  FileText, TrendingUp, DollarSign, ExternalLink, ShieldCheck, HelpCircle,
  Receipt, BarChart3
} from 'lucide-react';

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_DIVISIONS = [
  'MODUS PROFESSIONAL ( Ryan )',
  'MOOD STORES',
  'MODUS PROJECTS ( Dani )',
  'PROJECTS (Dani own)',
  'MODUS SIGNATURE ( Thando )',
  'MADE ( Jon-Peer)',
  'LUXELINE',
  'INTERNAL - Office',
  'UNALLOCATED / UNASSIGNED'
];

export default function DebtorsForecastHub() {
  const navigate = useNavigate();
  const { projects = [], invoices = [], refreshProjects } = useStore();

  // Mode: 'FORECAST' (Expected Invoicing / Balance Alerts) | 'BILLED_MONTH' (Invoicing Done This Month)
  const [activeViewMode, setActiveViewMode] = useState('FORECAST');

  // Filters for Forecast Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');
  const [balanceReadinessFilter, setBalanceReadinessFilter] = useState('ALL'); // ALL | READY | UPCOMING | OVERDUE
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

  // Filters for Invoicing Done Mode
  const [selectedPeriodMonth, setSelectedPeriodMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [invoicesSearchQuery, setInvoicesSearchQuery] = useState('');
  const [invoicesDivisionFilter, setInvoicesDivisionFilter] = useState('ALL');

  // Helper: Format Currency (ZAR)
  const formatZar = (val) => {
    return 'R ' + (Number(val) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Helper: parse date into month/year/Date object
  const parseDateString = (rawDate) => {
    if (!rawDate) return null;
    const str = String(rawDate).trim();
    if (['—', '-', 'TBD', 'TBC', 'N/A', 'NONE'].includes(str.toUpperCase())) return null;

    // Format 1: DD/MM/YYYY or D/M/YYYY
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const mIdx = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        if (!isNaN(mIdx) && !isNaN(y) && mIdx >= 0 && mIdx < 12) {
          return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, dateObj: new Date(y, mIdx, d || 1) };
        }
      }
    }

    // Format 2: YYYY-MM or YYYY-MM-DD
    if (/^\d{4}-\d{2}/.test(str)) {
      const parts = str.split('-');
      const y = parseInt(parts[0], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parts[2] ? parseInt(parts[2], 10) : 1;
      if (mIdx >= 0 && mIdx < 12) {
        return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, dateObj: new Date(y, mIdx, d) };
      }
    }

    // Format 3: Month YYYY (e.g. November 2026 or Nov 2026)
    for (let m = 0; m < 12; m++) {
      const fullM = MONTHS_LIST[m];
      const shortM = fullM.slice(0, 3);
      if (str.toLowerCase().includes(fullM.toLowerCase()) || str.toLowerCase().includes(shortM.toLowerCase())) {
        const yMatch = str.match(/\d{4}/);
        const y = yMatch ? parseInt(yMatch[0], 10) : new Date().getFullYear();
        return { monthName: fullM, year: y, monthIdx: m, dateObj: new Date(y, m, 15) };
      }
    }

    // Format 4: Fallback standard Date parsing
    const fallbackD = new Date(str);
    if (!isNaN(fallbackD.getTime())) {
      const mIdx = fallbackD.getMonth();
      const y = fallbackD.getFullYear();
      return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, dateObj: fallbackD };
    }

    return null;
  };

  // 1. Generate 4 rolling months dynamically based on current date
  const rollingMonths = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonthIdx = now.getMonth();
    const months = [];
    for (let i = 0; i < 4; i++) {
      const targetDate = new Date(curYear, curMonthIdx + i, 1);
      const mIdx = targetDate.getMonth();
      const y = targetDate.getFullYear();
      months.push({
        key: `${y}-${String(mIdx + 1).padStart(2, '0')}`,
        label: `${MONTHS_LIST[mIdx].toUpperCase()} ${y}`,
        shortLabel: `${MONTHS_LIST[mIdx].slice(0, 3).toUpperCase()} ${y}`,
        monthIdx: mIdx,
        year: y
      });
    }
    return months;
  }, []);

  // Helper: Map project / order to division
  const resolveDivision = (order, proj) => {
    if (order.division && order.division !== 'Auto-Detect (PM Name)' && order.division !== 'UNALLOCATED / UNASSIGNED') {
      return order.division;
    }
    if (proj.division && proj.division !== 'Auto-Detect (PM Name)' && proj.division !== 'UNALLOCATED / UNASSIGNED') {
      return proj.division;
    }
    const pm = (order.pmName || order.pm || proj.pm || proj.pmName || '').toLowerCase();
    const projName = (proj.name || proj.projectName || order.projectName || '').toLowerCase();

    if (pm.includes('internal') || pm.includes('office') || projName.includes('internal') || projName.includes('office')) return 'INTERNAL - Office';
    if (pm.includes('ryan') || projName.includes('professional')) return 'MODUS PROFESSIONAL ( Ryan )';
    if (pm.includes('thando') || projName.includes('signature')) return 'MODUS SIGNATURE ( Thando )';
    if (pm.includes('peer') || pm.includes('jon') || projName.includes('made')) return 'MADE ( Jon-Peer)';
    if (pm.includes('luxe') || projName.includes('luxe')) return 'LUXELINE';
    if (pm.includes('dani') || pm.includes('daniel')) {
      if (projName.includes('own') || projName.includes('personal')) return 'PROJECTS (Dani own)';
      return 'MODUS PROJECTS ( Dani )';
    }
    if (pm.includes('mood') || projName.includes('store')) return 'MOOD STORES';
    return 'UNALLOCATED / UNASSIGNED';
  };

  // -------------------------------------------------------------
  // 2. DYNAMIC PIVOT TREE: Division -> Project -> Order (Ongoing only, Item-split by ETA)
  // -------------------------------------------------------------
  const treeData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const divMap = {};
    DEFAULT_DIVISIONS.forEach(d => {
      divMap[d] = {
        name: d,
        totalOrderValue: 0,
        invoicedToDate: 0,
        unInvoicedBalance: 0,
        monthBuckets: [0, 0, 0, 0],
        projects: {}
      };
    });

    const projectList = Array.isArray(projects) 
      ? projects 
      : (projects && typeof projects === 'object' ? Object.values(projects) : []);

    projectList.forEach(proj => {
      if (!proj) return;
      const orders = Array.isArray(proj.orders) ? proj.orders : [];
      
      orders.forEach(order => {
        if (!order) return;
        
        // Strict Filter: ONLY 'Ongoing' orders (exclude Draft, Pending, Complete)
        const orderStatus = (order.status || '').trim();
        if (orderStatus !== 'Ongoing') return;

        const division = resolveDivision(order, proj);
        if (!divMap[division]) {
          divMap[division] = {
            name: division,
            totalOrderValue: 0,
            invoicedToDate: 0,
            unInvoicedBalance: 0,
            monthBuckets: [0, 0, 0, 0],
            projects: {}
          };
        }

        const projKey = proj.id || proj.projectName || 'General Project';
        if (!divMap[division].projects[projKey]) {
          divMap[division].projects[projKey] = {
            id: proj.id,
            name: proj.name || proj.projectName || 'Unnamed Project',
            client: proj.client || order.clientName || 'Direct Client',
            totalOrderValue: 0,
            invoicedToDate: 0,
            unInvoicedBalance: 0,
            monthBuckets: [0, 0, 0, 0],
            orders: []
          };
        }

        const itemsList = Array.isArray(order.itemsList) ? order.itemsList : (Array.isArray(order.items) ? order.items : []);
        const orderVal = Number(order.value || order.totalRetail || order.orderValue || 0);
        const orderInvoiced = Number(order.invoiced || order.totalInvoiced || 0);
        const orderDeposit = Number(order.paid || order.depositValue || 0);

        // Find latest ETA across all items on this order (for final stock arrival trigger)
        let latestEtaDate = null;
        let latestEtaStr = null;

        // Item-by-item split calculation (Reports KPI 2 logic)
        const orderMonthBuckets = [0, 0, 0, 0];
        let totalUnInvoicedItems = 0;
        let hasAnyItemWithEta = false;

        itemsList.forEach(item => {
          if (!item) return;
          const qty = Number(item.qty || 1);
          const rate = Number(item.unitRetail || item.rate || item.unitPrice || 0);
          const itemVal = qty * rate;

          // Invoiced value for this item
          let itemInvoicedVal = 0;
          const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
          if (iHist.length > 0) {
            itemInvoicedVal = iHist.reduce((s, h) => s + ((Number(h.qty) || 0) * (Number(h.rate) || Number(h.unitPrice) || rate)), 0);
          } else if (item.invoiceRef && item.invoiceDate) {
            itemInvoicedVal = (Number(item.invoiceQty) || qty) * rate;
          } else {
            itemInvoicedVal = Number(item.invoicedValue || item.invoiceVal || 0);
          }

          const unInvoiced = Math.max(0, itemVal - itemInvoicedVal);
          totalUnInvoicedItems += unInvoiced;

          // Resolve ETA for this item: item PO ETA > item ETA > order general ETA
          const rawEta = item.po_eta || item.eta || order.eta || order.expected_delivery_date;
          if (rawEta) {
            const parsed = parseDateString(rawEta);
            if (parsed) {
              hasAnyItemWithEta = true;
              if (!latestEtaDate || parsed.dateObj > latestEtaDate) {
                latestEtaDate = parsed.dateObj;
                latestEtaStr = rawEta;
              }

              // Only bucket into 4 rolling months if item has an un-invoiced balance
              if (unInvoiced > 0) {
                rollingMonths.forEach((rm, idx) => {
                  if (parsed.year === rm.year && parsed.monthIdx === rm.monthIdx) {
                    orderMonthBuckets[idx] += unInvoiced;
                  }
                });
              }
            }
          }
        });

        const effectiveUnInvoiced = orderVal > 0 ? Math.max(0, orderVal - orderInvoiced) : totalUnInvoicedItems;

        // If no items had ETAs yet, DO NOT include in rolling month forecasting (exclude per User instruction)
        // Order-level latest ETA fallback if no item ETA was found
        if (!latestEtaDate && (order.eta || order.expected_delivery_date)) {
          const pOrder = parseDateString(order.eta || order.expected_delivery_date);
          if (pOrder) {
            latestEtaDate = pOrder.dateObj;
            latestEtaStr = order.eta || order.expected_delivery_date;
            // Also split balance into its month bucket if items had none
            if (effectiveUnInvoiced > 0) {
              rollingMonths.forEach((rm, idx) => {
                if (pOrder.year === rm.year && pOrder.monthIdx === rm.monthIdx) {
                  orderMonthBuckets[idx] += effectiveUnInvoiced;
                }
              });
            }
          }
        }

        // Determine Balance Invoice Readiness
        // Rule: Entire order's final stock arrival ETA is <= 7 days away (no deposit prerequisite)
        let balanceStatus = 'AWAITING_STOCK'; // AWAITING_STOCK | READY_FOR_BALANCE | FULLY_INVOICED | NO_ETA
        let daysToStock = null;

        if (effectiveUnInvoiced <= 0) {
          balanceStatus = 'FULLY_INVOICED';
        } else if (latestEtaDate) {
          const diffMs = latestEtaDate.getTime() - today.getTime();
          daysToStock = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysToStock <= 7) {
            balanceStatus = 'READY_FOR_BALANCE';
          } else {
            balanceStatus = 'IN_TRANSIT';
          }
        } else {
          balanceStatus = 'NO_ETA';
        }

        const orderNode = {
          id: order.id,
          orderName: order.quoteName || order.orderName || `Order #${order.id}`,
          orderNumber: order.orderNumber || order.id,
          orderValue: orderVal,
          invoicedToDate: orderInvoiced,
          unInvoicedBalance: effectiveUnInvoiced,
          depositReceived: orderDeposit,
          latestEta: latestEtaStr || 'Awaiting ETA',
          daysToStock,
          balanceStatus,
          monthBuckets: orderMonthBuckets
        };

        // Accumulate into project
        const pNode = divMap[division].projects[projKey];
        pNode.totalOrderValue += orderVal;
        pNode.invoicedToDate += orderInvoiced;
        pNode.unInvoicedBalance += effectiveUnInvoiced;
        orderMonthBuckets.forEach((v, idx) => pNode.monthBuckets[idx] += v);
        pNode.orders.push(orderNode);

        // Accumulate into division
        divMap[division].totalOrderValue += orderVal;
        divMap[division].invoicedToDate += orderInvoiced;
        divMap[division].unInvoicedBalance += effectiveUnInvoiced;
        orderMonthBuckets.forEach((v, idx) => divMap[division].monthBuckets[idx] += v);
      });
    });

    return Object.values(divMap);
  }, [projects, rollingMonths]);

  // Overall summary KPIs for Forecast Mode
  const summaryKPIs = useMemo(() => {
    let grandOrderVal = 0;
    let grandInvoiced = 0;
    let grandUnInvoiced = 0;
    let grandMonth0 = 0;
    let readyCount = 0;
    let readyValue = 0;
    let noEtaCount = 0;

    treeData.forEach(d => {
      grandOrderVal += d.totalOrderValue;
      grandInvoiced += d.invoicedToDate;
      grandUnInvoiced += d.unInvoicedBalance;
      grandMonth0 += d.monthBuckets[0] || 0;
      Object.values(d.projects).forEach(p => {
        p.orders.forEach(o => {
          if (o.balanceStatus === 'READY_FOR_BALANCE') {
            readyCount++;
            readyValue += o.unInvoicedBalance;
          } else if (o.balanceStatus === 'NO_ETA') {
            noEtaCount++;
          }
        });
      });
    });

    return {
      grandOrderVal,
      grandInvoiced,
      grandUnInvoiced,
      grandMonth0,
      readyCount,
      readyValue,
      noEtaCount
    };
  }, [treeData]);

  // -------------------------------------------------------------
  // 3. DYNAMIC REPORT: INVOICING DONE THIS MONTH
  // -------------------------------------------------------------
  // List of available months from actual invoices data
  const availableInvoiceMonths = useMemo(() => {
    const monthsSet = new Set();
    const invList = Array.isArray(invoices) ? invoices : [];
    invList.forEach(inv => {
      const d = inv.issued || inv.date || inv.invoiceDate;
      if (d && typeof d === 'string' && /^\d{4}-\d{2}/.test(d.trim())) {
        monthsSet.add(d.trim().slice(0, 7));
      }
    });

    // Also include current month and previous 3 months
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    return Array.from(monthsSet).sort().reverse();
  }, [invoices]);

  // Filtered list of invoices for the selected period
  const billedInvoicesForPeriod = useMemo(() => {
    const invList = Array.isArray(invoices) ? invoices : [];
    
    return invList.filter(inv => {
      const d = inv.issued || inv.date || inv.invoiceDate;
      if (!d) return false;
      
      const invMonthKey = String(d).trim().slice(0, 7);
      if (invMonthKey !== selectedPeriodMonth) return false;

      // Division search / filter
      if (invoicesDivisionFilter !== 'ALL') {
        const invDiv = (inv.division || '').trim();
        if (invDiv !== invoicesDivisionFilter) return false;
      }

      // Text search
      if (invoicesSearchQuery.trim()) {
        const q = invoicesSearchQuery.toLowerCase();
        const num = String(inv.id || inv.number || '').toLowerCase();
        const client = String(inv.client || '').toLowerCase();
        const proj = String(inv.project || '').toLowerCase();
        if (!num.includes(q) && !client.includes(q) && !proj.includes(q)) return false;
      }

      return true;
    }).map(inv => {
      // Parse numeric amount
      let numAmount = 0;
      if (typeof inv.amount === 'number') {
        numAmount = inv.amount;
      } else if (typeof inv.amount === 'string') {
        numAmount = parseFloat(inv.amount.replace(/[^0-9.-]+/g, '')) || 0;
      } else if (Array.isArray(inv.items)) {
        numAmount = inv.items.reduce((s, it) => s + ((Number(it.qtyAction) || Number(it.qty) || 0) * (Number(it.rate) || Number(it.unitPrice) || 0)), 0);
      }

      return {
        ...inv,
        numericAmount: numAmount
      };
    });
  }, [invoices, selectedPeriodMonth, invoicesDivisionFilter, invoicesSearchQuery]);

  // Summary KPIs for Invoicing Done Mode
  const billedSummaryKPIs = useMemo(() => {
    let totalBilled = 0;
    let count = billedInvoicesForPeriod.length;
    let paidCount = 0;
    let unpaidCount = 0;

    billedInvoicesForPeriod.forEach(inv => {
      totalBilled += inv.numericAmount;
      if (inv.paid || inv.status === 'Paid') {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });

    return {
      totalBilled,
      count,
      paidCount,
      unpaidCount
    };
  }, [billedInvoicesForPeriod]);

  // Toggle tree expansion
  const toggleDivision = (name) => {
    setExpandedDivisions(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleProject = (key) => {
    setExpandedProjects(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const allDivs = {};
    const allProjs = {};
    treeData.forEach(d => {
      allDivs[d.name] = true;
      Object.keys(d.projects).forEach(pKey => {
        allProjs[pKey] = true;
      });
    });
    setExpandedDivisions(allDivs);
    setExpandedProjects(allProjs);
  };

  const collapseAll = () => {
    setExpandedDivisions({});
    setExpandedProjects({});
  };

  // Export to Excel for Forecast Pivot
  const handleExportForecastExcel = () => {
    const rows = [];
    treeData.forEach(d => {
      rows.push({
        'Hierarchy Level': 'DIVISION',
        'Name': d.name,
        'Client': '',
        'Total Order Value': d.totalOrderValue,
        'Invoiced to Date': d.invoicedToDate,
        'Un-invoiced Balance': d.unInvoicedBalance,
        [rollingMonths[0].label]: d.monthBuckets[0],
        [rollingMonths[1].label]: d.monthBuckets[1],
        [rollingMonths[2].label]: d.monthBuckets[2],
        [rollingMonths[3].label]: d.monthBuckets[3],
        'Latest ETA': '',
        'Readiness': ''
      });
      Object.values(d.projects).forEach(p => {
        rows.push({
          'Hierarchy Level': '  PROJECT',
          'Name': p.name,
          'Client': p.client,
          'Total Order Value': p.totalOrderValue,
          'Invoiced to Date': p.invoicedToDate,
          'Un-invoiced Balance': p.unInvoicedBalance,
          [rollingMonths[0].label]: p.monthBuckets[0],
          [rollingMonths[1].label]: p.monthBuckets[1],
          [rollingMonths[2].label]: p.monthBuckets[2],
          [rollingMonths[3].label]: p.monthBuckets[3],
          'Latest ETA': '',
          'Readiness': ''
        });
        p.orders.forEach(o => {
          rows.push({
            'Hierarchy Level': '    ORDER',
            'Name': o.orderName,
            'Client': p.client,
            'Total Order Value': o.orderValue,
            'Invoiced to Date': o.invoicedToDate,
            'Un-invoiced Balance': o.unInvoicedBalance,
            [rollingMonths[0].label]: o.monthBuckets[0],
            [rollingMonths[1].label]: o.monthBuckets[1],
            [rollingMonths[2].label]: o.monthBuckets[2],
            [rollingMonths[3].label]: o.monthBuckets[3],
            'Latest ETA': o.latestEta,
            'Readiness': o.balanceStatus
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Debtors Forecast');
    XLSX.writeFile(wb, `Debtors_Invoicing_Forecast_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to Excel for Invoicing Done
  const handleExportInvoicesExcel = () => {
    const rows = billedInvoicesForPeriod.map(inv => ({
      'Invoice #': inv.id || inv.number,
      'Issue Date': inv.issued || inv.date,
      'Due Date': inv.due || '',
      'Project': inv.project,
      'Client': inv.client,
      'Amount (ZAR)': inv.numericAmount,
      'Status': inv.status || (inv.paid ? 'Paid' : 'Unpaid'),
      'Type': inv.type || 'Order Invoice',
      'Notes': inv.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Billed_${selectedPeriodMonth}`);
    XLSX.writeFile(wb, `Invoicing_Done_${selectedPeriodMonth}.xlsx`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* TOP HEADER & NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <button 
            onClick={() => navigate('/sales-tracker')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', padding: '4px 8px' }}
          >
            <ArrowLeft size={14} /> Back to Sales Tracker
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Debtors & Billing Forecast Hub
            </h1>

            {/* DYNAMIC VIEW SELECTOR DROPDOWN */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '3px 6px', gap: '4px' }}>
              <button 
                onClick={() => setActiveViewMode('FORECAST')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeViewMode === 'FORECAST' ? '#10b981' : 'transparent',
                  color: activeViewMode === 'FORECAST' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <TrendingUp size={13} /> Forecast & Balance Alerts
              </button>
              <button 
                onClick={() => setActiveViewMode('BILLED_MONTH')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeViewMode === 'BILLED_MONTH' ? '#3b82f6' : 'transparent',
                  color: activeViewMode === 'BILLED_MONTH' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={13} /> Invoicing Done For The Month
              </button>
            </div>
          </div>

          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activeViewMode === 'FORECAST' 
              ? 'Ongoing confirmed orders split by item ETAs across rolling months with 7-day final stock arrival balance alerts.' 
              : `Dynamic ledger of actual invoices generated and posted in ${selectedPeriodMonth}.`}
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeViewMode === 'FORECAST' ? (
            <>
              <button 
                onClick={expandAll}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11.5px', borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                Expand All
              </button>
              <button 
                onClick={collapseAll}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '11.5px', borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
              >
                Collapse All
              </button>
              <button 
                onClick={handleExportForecastExcel}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
              >
                <Download size={14} /> Export Pivot (.xlsx)
              </button>
            </>
          ) : (
            <button 
              onClick={handleExportInvoicesExcel}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
            >
              <Download size={14} /> Export Invoices (.xlsx)
            </button>
          )}

          <button 
            onClick={() => refreshProjects()}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
          >
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: FORECAST & BALANCE INVOICE READY ALERTS           */}
      {/* ========================================================= */}
      {activeViewMode === 'FORECAST' && (
        <>
          {/* KPI METRIC CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Ongoing Active Orders</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {formatZar(summaryKPIs.grandOrderVal)}
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Excludes Draft & Complete</span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Invoiced to Date</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                {formatZar(summaryKPIs.grandInvoiced)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {summaryKPIs.grandOrderVal > 0 ? ((summaryKPIs.grandInvoiced / summaryKPIs.grandOrderVal) * 100).toFixed(1) : 0}% of portfolio billed
              </span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Remaining to Invoice</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {formatZar(summaryKPIs.grandUnInvoiced)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {summaryKPIs.noEtaCount > 0 ? `(${summaryKPIs.noEtaCount} orders awaiting ETA)` : 'Split across item ETAs'}
              </span>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1.5px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 800 }}>Ready for Balance Invoice</span>
                <span style={{ background: '#10b981', color: '#fff', fontSize: '10.5px', fontWeight: 800, padding: '1px 7px', borderRadius: '10px' }}>
                  {summaryKPIs.readyCount} Orders
                </span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {formatZar(summaryKPIs.readyValue)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Final stock arriving in &le; 7 days</span>
            </div>
          </div>

          {/* FILTER BAR */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                placeholder="Search Division, Project or Order name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  fontSize: '12.5px', 
                  color: 'var(--text-primary)' 
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Division:</span>
              <select 
                value={selectedDivisionFilter}
                onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', color: 'var(--text-primary)' }}
              >
                <option value="ALL">All Divisions</option>
                {DEFAULT_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Balance Readiness:</span>
              <select 
                value={balanceReadinessFilter}
                onChange={(e) => setBalanceReadinessFilter(e.target.value)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', color: 'var(--text-primary)' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="READY">🟢 Ready for Balance Invoice (Final Stock &le; 7 Days)</option>
                <option value="IN_TRANSIT">🟡 In Transit / Awaiting Stock</option>
                <option value="NO_ETA">⚪ Awaiting ETA</option>
                <option value="FULLY_INVOICED">✅ Fully Invoiced</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC PIVOT TABLE */}
          <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px', minWidth: '320px' }}>Division / Project / Order Hierarchy</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '120px' }}>Total Order Value</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '120px' }}>Invoiced to Date</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '130px' }}>Un-invoiced Balance</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '115px' }}>{rollingMonths[0].shortLabel}</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '115px' }}>{rollingMonths[1].shortLabel}</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '115px' }}>{rollingMonths[2].shortLabel}</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '115px' }}>{rollingMonths[3].shortLabel}</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '120px' }}>Final Stock ETA</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '180px' }}>Balance Invoice Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {treeData.map(divisionNode => {
                    if (selectedDivisionFilter !== 'ALL' && divisionNode.name !== selectedDivisionFilter) return null;

                    const projectList = Object.values(divisionNode.projects).filter(p => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      if (divisionNode.name.toLowerCase().includes(q)) return true;
                      if (p.name.toLowerCase().includes(q) || (p.client && p.client.toLowerCase().includes(q))) return true;
                      return p.orders.some(o => o.orderName.toLowerCase().includes(q));
                    });

                    if (projectList.length === 0 && searchQuery.trim()) return null;

                    const isDivExpanded = expandedDivisions[divisionNode.name] ?? false;

                    return (
                      <React.Fragment key={divisionNode.name}>
                        {/* LEVEL 1: DIVISION ROW */}
                        <tr 
                          onClick={() => toggleDivision(divisionNode.name)}
                          style={{ 
                            background: 'rgba(0, 0, 0, 0.02)', 
                            borderBottom: '1px solid var(--border)', 
                            fontWeight: 800, 
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight 
                              size={14} 
                              style={{ 
                                transform: isDivExpanded ? 'rotate(90deg)' : 'none', 
                                transition: 'transform 0.15s ease',
                                color: 'var(--text-secondary)'
                              }} 
                            />
                            <span style={{ color: 'var(--text-primary)' }}>{divisionNode.name}</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                              ({projectList.length} ongoing projects)
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.totalOrderValue)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(divisionNode.invoicedToDate)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(divisionNode.unInvoicedBalance)}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.monthBuckets[0])}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.monthBuckets[1])}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.monthBuckets[2])}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.monthBuckets[3])}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {divisionNode.unInvoicedBalance > 0 ? (
                              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Active Ongoing Pipeline</span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                        </tr>

                        {/* LEVEL 2: PROJECTS UNDER DIVISION */}
                        {isDivExpanded && projectList.map(projNode => {
                          const pKey = projNode.id || projNode.name;
                          const isProjExpanded = expandedProjects[pKey] ?? true;

                          const matchingOrders = projNode.orders.filter(o => {
                            if (balanceReadinessFilter === 'READY' && o.balanceStatus !== 'READY_FOR_BALANCE') return false;
                            if (balanceReadinessFilter === 'IN_TRANSIT' && o.balanceStatus !== 'IN_TRANSIT') return false;
                            if (balanceReadinessFilter === 'NO_ETA' && o.balanceStatus !== 'NO_ETA') return false;
                            if (balanceReadinessFilter === 'FULLY_INVOICED' && o.balanceStatus !== 'FULLY_INVOICED') return false;

                            if (searchQuery.trim()) {
                              const q = searchQuery.toLowerCase();
                              return o.orderName.toLowerCase().includes(q) || projNode.name.toLowerCase().includes(q);
                            }
                            return true;
                          });

                          if (matchingOrders.length === 0 && (searchQuery.trim() || balanceReadinessFilter !== 'ALL')) {
                            return null;
                          }

                          return (
                            <React.Fragment key={pKey}>
                              <tr 
                                onClick={() => toggleProject(pKey)}
                                style={{ 
                                  background: 'var(--bg-secondary)', 
                                  borderBottom: '1px solid var(--border)', 
                                  cursor: 'pointer',
                                  userSelect: 'none'
                                }}
                              >
                                <td style={{ padding: '10px 16px 10px 36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <ChevronRight 
                                    size={13} 
                                    style={{ 
                                      transform: isProjExpanded ? 'rotate(90deg)' : 'none', 
                                      transition: 'transform 0.15s ease',
                                      color: 'var(--text-secondary)'
                                    }} 
                                  />
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{projNode.name}</span>
                                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    {projNode.client}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{formatZar(projNode.totalOrderValue)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{formatZar(projNode.invoicedToDate)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatZar(projNode.unInvoicedBalance)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[0])}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[1])}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[2])}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[3])}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {matchingOrders.length} order{matchingOrders.length === 1 ? '' : 's'}
                                  </span>
                                </td>
                              </tr>

                              {/* LEVEL 3: ORDERS UNDER PROJECT */}
                              {isProjExpanded && matchingOrders.map(orderNode => {
                                return (
                                  <tr 
                                    key={orderNode.id}
                                    style={{ 
                                      background: orderNode.balanceStatus === 'READY_FOR_BALANCE' ? 'rgba(16, 185, 129, 0.04)' : 'transparent', 
                                      borderBottom: '1px solid var(--border)' 
                                    }}
                                  >
                                    <td style={{ padding: '9px 16px 9px 58px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={12} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{orderNode.orderName}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatZar(orderNode.orderValue)}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(orderNode.invoicedToDate)}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatZar(orderNode.unInvoicedBalance)}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatZar(orderNode.monthBuckets[0])}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatZar(orderNode.monthBuckets[1])}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatZar(orderNode.monthBuckets[2])}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatZar(orderNode.monthBuckets[3])}</td>
                                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                                      <span style={{ 
                                        fontFamily: 'monospace', 
                                        fontSize: '11px', 
                                        background: orderNode.latestEta === 'Awaiting ETA' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-primary)', 
                                        color: orderNode.latestEta === 'Awaiting ETA' ? '#ef4444' : 'var(--text-primary)',
                                        padding: '2px 6px', 
                                        borderRadius: '4px',
                                        border: '1px solid var(--border)' 
                                      }}>
                                        {orderNode.latestEta}
                                      </span>
                                    </td>
                                    <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                                      {orderNode.balanceStatus === 'READY_FOR_BALANCE' && (
                                        <span style={{ 
                                          background: 'rgba(16, 185, 129, 0.12)', 
                                          color: '#10b981', 
                                          border: '1px solid rgba(16, 185, 129, 0.3)',
                                          padding: '3px 8px', 
                                          borderRadius: '12px', 
                                          fontSize: '10.5px', 
                                          fontWeight: 700,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <CheckCircle2 size={11} /> Ready to Balance Invoice ({orderNode.daysToStock !== null ? `${orderNode.daysToStock}d to stock` : 'Arriving'})
                                        </span>
                                      )}
                                      {orderNode.balanceStatus === 'IN_TRANSIT' && (
                                        <span style={{ 
                                          background: 'rgba(245, 158, 11, 0.12)', 
                                          color: '#f59e0b', 
                                          border: '1px solid rgba(245, 158, 11, 0.3)',
                                          padding: '3px 8px', 
                                          borderRadius: '12px', 
                                          fontSize: '10.5px', 
                                          fontWeight: 600,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          <Clock size={11} /> In Transit ({orderNode.daysToStock}d remaining)
                                        </span>
                                      )}
                                      {orderNode.balanceStatus === 'NO_ETA' && (
                                        <span style={{ 
                                          background: 'rgba(156, 163, 175, 0.1)', 
                                          color: 'var(--text-secondary)', 
                                          border: '1px solid var(--border)',
                                          padding: '3px 8px', 
                                          borderRadius: '12px', 
                                          fontSize: '10.5px', 
                                          fontWeight: 500
                                        }}>
                                          Awaiting ETA
                                        </span>
                                      )}
                                      {orderNode.balanceStatus === 'FULLY_INVOICED' && (
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                          Fully Settled
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* GRAND TOTAL ROW */}
                  <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderTop: '2px solid var(--border)', fontWeight: 800, fontSize: '12.5px' }}>
                    <td style={{ padding: '14px 16px' }}>GRAND TOTAL</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>{formatZar(summaryKPIs.grandOrderVal)}</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(summaryKPIs.grandInvoiced)}</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(summaryKPIs.grandUnInvoiced)}</td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                      {formatZar(treeData.reduce((s, d) => s + (d.monthBuckets[0] || 0), 0))}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                      {formatZar(treeData.reduce((s, d) => s + (d.monthBuckets[1] || 0), 0))}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                      {formatZar(treeData.reduce((s, d) => s + (d.monthBuckets[2] || 0), 0))}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'right' }}>
                      {formatZar(treeData.reduce((s, d) => s + (d.monthBuckets[3] || 0), 0))}
                    </td>
                    <td style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#10b981' }}>
                      {summaryKPIs.readyCount} Ready to Bill
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MODE 2: INVOICING DONE FOR THE MONTH                     */}
      {/* ========================================================= */}
      {activeViewMode === 'BILLED_MONTH' && (
        <>
          {/* BILLED SUMMARY METRICS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Billed in {selectedPeriodMonth}</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                {formatZar(billedSummaryKPIs.totalBilled)}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Across {billedSummaryKPIs.count} posted invoices</span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Paid Invoices</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {billedSummaryKPIs.paidCount}
              </div>
              <span style={{ fontSize: '11px', color: '#10b981' }}>Fully settled by client</span>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Awaiting Payment</span>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {billedSummaryKPIs.unpaidCount}
              </div>
              <span style={{ fontSize: '11px', color: '#f59e0b' }}>Pending client receipt</span>
            </div>
          </div>

          {/* BILLED PERIOD FILTER BAR */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '20px' }}>
            {/* MONTH / PERIOD SELECTOR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>Select Month / Period:</span>
              <select 
                value={selectedPeriodMonth}
                onChange={(e) => setSelectedPeriodMonth(e.target.value)}
                style={{ 
                  background: 'var(--bg-primary)', 
                  border: '1.5px solid #3b82f6', 
                  borderRadius: '6px', 
                  padding: '5px 10px', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: 'var(--text-primary)' 
                }}
              >
                {availableInvoiceMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* TEXT SEARCH */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', flex: 1 }}>
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
              <input 
                type="text"
                placeholder="Search Invoice #, Client or Project..."
                value={invoicesSearchQuery}
                onChange={(e) => setInvoicesSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  fontSize: '12.5px', 
                  color: 'var(--text-primary)' 
                }}
              />
            </div>
          </div>

          {/* BILLED INVOICES TABLE */}
          <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 16px', minWidth: '130px' }}>Invoice #</th>
                    <th style={{ padding: '12px 14px', minWidth: '120px' }}>Issue Date</th>
                    <th style={{ padding: '12px 14px', minWidth: '180px' }}>Project</th>
                    <th style={{ padding: '12px 14px', minWidth: '160px' }}>Client</th>
                    <th style={{ padding: '12px 14px', minWidth: '120px' }}>Type</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '130px' }}>Invoiced Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '120px' }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billedInvoicesForPeriod.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>No invoices recorded for {selectedPeriodMonth}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          Select another period using the month dropdown above.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    billedInvoicesForPeriod.map(inv => {
                      const isPaid = inv.paid || inv.status === 'Paid';
                      return (
                        <tr 
                          key={inv.id || inv.number}
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {inv.id || inv.number}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {inv.issued || inv.date || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {inv.project || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {inv.client || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-tertiary)' }}>
                            {inv.type || 'Order Invoice'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>
                            {formatZar(inv.numericAmount)}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            {isPaid ? (
                              <span style={{ 
                                background: 'rgba(16, 185, 129, 0.12)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <CheckCircle2 size={11} /> Paid
                              </span>
                            ) : (
                              <span style={{ 
                                background: 'rgba(245, 158, 11, 0.12)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={11} /> Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {billedInvoicesForPeriod.length > 0 && (
                    <tr style={{ background: 'rgba(0, 0, 0, 0.04)', borderTop: '2px solid var(--border)', fontWeight: 800, fontSize: '12.5px' }}>
                      <td colSpan={5} style={{ padding: '14px 16px' }}>TOTAL BILLED FOR {selectedPeriodMonth}</td>
                      <td style={{ padding: '14px 14px', textAlign: 'right', color: '#3b82f6' }}>
                        {formatZar(billedSummaryKPIs.totalBilled)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#10b981' }}>
                        {billedSummaryKPIs.paidCount} / {billedSummaryKPIs.count} Settled
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
