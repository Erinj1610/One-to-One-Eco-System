import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { 
  ArrowLeft, Download, Search, RefreshCw, ChevronRight, ChevronDown, 
  Calendar, Layers, Filter, CheckCircle2, Clock, AlertTriangle, 
  FileText, TrendingUp, DollarSign, ExternalLink, ShieldCheck, HelpCircle,
  Receipt, BarChart3, CreditCard
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

// Helper: Financial Year month labels (March - February)
const getFyMonthLabels = (fyStr = '2026-2027') => {
  const parts = String(fyStr || '2026-2027').split('-');
  const y1 = parseInt(parts[0], 10) || 2026;
  const y2 = parseInt(parts[1], 10) || (y1 + 1);
  return [
    { idx: 2, name: 'March', short: 'Mar', year: y1, label: `Mar '${String(y1).slice(2)}`, key: `${y1}-03` },
    { idx: 3, name: 'April', short: 'Apr', year: y1, label: `Apr '${String(y1).slice(2)}`, key: `${y1}-04` },
    { idx: 4, name: 'May', short: 'May', year: y1, label: `May '${String(y1).slice(2)}`, key: `${y1}-05` },
    { idx: 5, name: 'June', short: 'Jun', year: y1, label: `Jun '${String(y1).slice(2)}`, key: `${y1}-06` },
    { idx: 6, name: 'July', short: 'Jul', year: y1, label: `Jul '${String(y1).slice(2)}`, key: `${y1}-07` },
    { idx: 7, name: 'August', short: 'Aug', year: y1, label: `Aug '${String(y1).slice(2)}`, key: `${y1}-08` },
    { idx: 8, name: 'September', short: 'Sep', year: y1, label: `Sep '${String(y1).slice(2)}`, key: `${y1}-09` },
    { idx: 9, name: 'October', short: 'Oct', year: y1, label: `Oct '${String(y1).slice(2)}`, key: `${y1}-10` },
    { idx: 10, name: 'November', short: 'Nov', year: y1, label: `Nov '${String(y1).slice(2)}`, key: `${y1}-11` },
    { idx: 11, name: 'December', short: 'Dec', year: y1, label: `Dec '${String(y1).slice(2)}`, key: `${y1}-12` },
    { idx: 0, name: 'January', short: 'Jan', year: y2, label: `Jan '${String(y2).slice(2)}`, key: `${y2}-01` },
    { idx: 1, name: 'February', short: 'Feb', year: y2, label: `Feb '${String(y2).slice(2)}`, key: `${y2}-02` }
  ];
};

export default function DebtorsForecastHub() {
  const navigate = useNavigate();
  const { projects = [], invoices = [], refreshProjects } = useStore();

  // Active View Mode:
  // 'TO_BE_INVOICED' : Report 1: Expected Invoicing (Item-by-item ETA split, Reports KPI 2 parity)
  // 'BALANCE_PAYMENTS' : Report 2: Balance Payment / Cashflow Forecast (Outstanding balance in order's final stock ETA month)
  // 'INVOICED_DONE' : Report 3: Invoicing Done (Actual closed/posted revenue in each month)
  const [activeReportMode, setActiveReportMode] = useState('TO_BE_INVOICED');

  // Selected Financial Year
  const [selectedFY, setSelectedFY] = useState('2026-2027');

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');
  const [balanceReadinessFilter, setBalanceReadinessFilter] = useState('ALL');
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

  // 12 FY Month Columns (March to February)
  const fyMonths = useMemo(() => {
    return getFyMonthLabels(selectedFY);
  }, [selectedFY]);

  // Helper: Format ZAR
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
          return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, key: `${y}-${String(mIdx + 1).padStart(2, '0')}`, dateObj: new Date(y, mIdx, d || 1) };
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
        return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, key: `${y}-${String(mIdx + 1).padStart(2, '0')}`, dateObj: new Date(y, mIdx, d) };
      }
    }

    // Format 3: Month YYYY (e.g. October 2026 or Oct 2026)
    for (let m = 0; m < 12; m++) {
      const fullM = MONTHS_LIST[m];
      const shortM = fullM.slice(0, 3);
      if (str.toLowerCase().includes(fullM.toLowerCase()) || str.toLowerCase().includes(shortM.toLowerCase())) {
        const yMatch = str.match(/\d{4}/);
        const y = yMatch ? parseInt(yMatch[0], 10) : 2026;
        return { monthName: fullM, year: y, monthIdx: m, key: `${y}-${String(m + 1).padStart(2, '0')}`, dateObj: new Date(y, m, 15) };
      }
    }

    // Format 4: Fallback standard Date parsing
    const fallbackD = new Date(str);
    if (!isNaN(fallbackD.getTime())) {
      const mIdx = fallbackD.getMonth();
      const y = fallbackD.getFullYear();
      return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx, key: `${y}-${String(mIdx + 1).padStart(2, '0')}`, dateObj: fallbackD };
    }

    return null;
  };

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

  // -------------------------------------------------------------------------------------------------
  // PIVOT TABLE DATA COMPUTATION (12 Months FY: March to February)
  // Supports:
  // 1) TO_BE_INVOICED: Line-item split into their ETA months (KPI 2 parity)
  // 2) BALANCE_PAYMENTS: Order's total outstanding balance rolling into the month of its final stock arrival ETA
  // 3) INVOICED_DONE: Actual invoiced revenue allocated to the invoice issue month
  // -------------------------------------------------------------------------------------------------
  const pivotTreeData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const divMap = {};
    DEFAULT_DIVISIONS.forEach(d => {
      divMap[d] = {
        name: d,
        totalOrderValue: 0,
        invoicedToDate: 0,
        toBeInvoiced: 0,
        outstandingBalance: 0,
        monthBuckets: Array(12).fill(0),
        projects: {}
      };
    });

    const projectList = Array.isArray(projects) 
      ? projects 
      : (projects && typeof projects === 'object' ? Object.values(projects) : []);

    // Build invoice lookup map by orderId and projectKey for Report 3
    const invoicesByOrder = {};
    const invoicesByProject = {};
    if (Array.isArray(invoices)) {
      invoices.forEach(inv => {
        const oId = inv.orderId || inv.order_id;
        const pKey = inv.projectKey || inv.project_key;
        if (oId) {
          if (!invoicesByOrder[oId]) invoicesByOrder[oId] = [];
          invoicesByOrder[oId].push(inv);
        }
        if (pKey) {
          if (!invoicesByProject[pKey]) invoicesByProject[pKey] = [];
          invoicesByProject[pKey].push(inv);
        }
      });
    }

    projectList.forEach(proj => {
      if (!proj) return;
      const orders = Array.isArray(proj.orders) ? proj.orders : [];

      orders.forEach(order => {
        if (!order) return;

        // Status check:
        // Exclude Draft and Complete (user requirement: only ongoing active orders)
        const rawStatus = (order.status || '').trim();
        const isDraftOrComplete = rawStatus === 'Draft' || rawStatus === 'Complete';
        if (isDraftOrComplete) return;

        const division = resolveDivision(order, proj);
        if (!divMap[division]) {
          divMap[division] = {
            name: division,
            totalOrderValue: 0,
            invoicedToDate: 0,
            toBeInvoiced: 0,
            outstandingBalance: 0,
            monthBuckets: Array(12).fill(0),
            projects: {}
          };
        }

        const projKey = proj.id || proj.projectKey || proj.projectName || 'General Project';
        if (!divMap[division].projects[projKey]) {
          divMap[division].projects[projKey] = {
            id: proj.id,
            name: proj.name || proj.projectName || 'Unnamed Project',
            client: proj.client || order.clientName || 'Direct Client',
            totalOrderValue: 0,
            invoicedToDate: 0,
            toBeInvoiced: 0,
            outstandingBalance: 0,
            monthBuckets: Array(12).fill(0),
            orders: []
          };
        }

        const itemsList = Array.isArray(order.itemsList) ? order.itemsList : (Array.isArray(order.items) ? order.items : []);
        const orderVal = Number(order.value || order.totalRetail || order.orderValue || 0);
        const orderInvoiced = Number(order.invoiced || order.totalInvoiced || 0);
        const orderDeposit = Number(order.paid || order.depositValue || 0);
        
        // Exact User Definitions:
        // 1. To Be Invoiced: Remaining value to be billed (Invoiced + To Be Invoiced = Order Value)
        const toBeInvoicedVal = Math.max(0, orderVal - orderInvoiced);
        
        // 2. Balance: Outstanding cash balance that must still be paid by the client
        const outstandingBal = order.outstanding !== undefined && order.outstanding !== null
          ? Number(order.outstanding)
          : Math.max(0, orderVal - orderDeposit);

        // Track final stock ETA across all items on this order
        let latestEtaDate = null;
        let latestEtaStr = null;

        // 12-Month buckets for this order
        const orderMonthBuckets = Array(12).fill(0);

        // =========================================================================
        // REPORT 1: TO BE INVOICED (ITEM-BY-ITEM SPLIT ACROSS ETA MONTHS)
        // =========================================================================
        if (activeReportMode === 'TO_BE_INVOICED') {
          let itemsUnInvoicedTotal = 0;

          itemsList.forEach(item => {
            if (!item) return;
            const qty = Number(item.qty || 1);
            const rate = Number(item.unitRetail || item.rate || item.unitPrice || 0);
            const itemVal = qty * rate;

            // Invoiced on this item
            let itemInvoicedVal = 0;
            const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
            if (iHist.length > 0) {
              itemInvoicedVal = iHist.reduce((s, h) => s + ((Number(h.qty) || 0) * (Number(h.rate) || Number(h.unitPrice) || rate)), 0);
            } else if (item.invoiceRef && item.invoiceDate) {
              itemInvoicedVal = (Number(item.invoiceQty) || qty) * rate;
            } else {
              itemInvoicedVal = Number(item.invoicedValue || item.invoiceVal || 0);
            }

            const itemUnInvoiced = Math.max(0, itemVal - itemInvoicedVal);
            itemsUnInvoicedTotal += itemUnInvoiced;

            // Resolve ETA: poEta > po_eta > eta > order.eta
            const rawEta = item.poEta || item.po_eta || item.eta || order.eta || order.expected_delivery_date;
            if (rawEta) {
              const parsed = parseDateString(rawEta);
              if (parsed) {
                if (!latestEtaDate || parsed.dateObj > latestEtaDate) {
                  latestEtaDate = parsed.dateObj;
                  latestEtaStr = rawEta;
                }

                // Split item un-invoiced balance into matching FY month
                if (itemUnInvoiced > 0) {
                  const colIdx = fyMonths.findIndex(fm => fm.key === parsed.key);
                  if (colIdx !== -1) {
                    orderMonthBuckets[colIdx] += itemUnInvoiced;
                  }
                }
              }
            }
          });

          // Fallback if order has general ETA
          if (!latestEtaDate && (order.eta || order.expected_delivery_date)) {
            const pOrder = parseDateString(order.eta || order.expected_delivery_date);
            if (pOrder) {
              latestEtaDate = pOrder.dateObj;
              latestEtaStr = order.eta || order.expected_delivery_date;
              if (toBeInvoicedVal > 0) {
                const colIdx = fyMonths.findIndex(fm => fm.key === pOrder.key);
                if (colIdx !== -1) {
                  orderMonthBuckets[colIdx] += toBeInvoicedVal;
                }
              }
            }
          }
        }

        // =========================================================================
        // REPORT 2: BALANCE PAYMENTS / OUTSTANDING CASHFLOW (FINAL STOCK ETA MONTH)
        // User rule: Show the outstanding balance of the order rolling into the month
        // of the LAST stock arrival ETA, so she knows expected balance cashflow.
        // =========================================================================
        else if (activeReportMode === 'BALANCE_PAYMENTS') {
          // Find the latest/last ETA across all items
          itemsList.forEach(item => {
            if (!item) return;
            const rawEta = item.poEta || item.po_eta || item.eta || order.eta || order.expected_delivery_date;
            if (rawEta) {
              const parsed = parseDateString(rawEta);
              if (parsed && (!latestEtaDate || parsed.dateObj > latestEtaDate)) {
                latestEtaDate = parsed.dateObj;
                latestEtaStr = rawEta;
              }
            }
          });

          if (!latestEtaDate && (order.eta || order.expected_delivery_date)) {
            const pOrder = parseDateString(order.eta || order.expected_delivery_date);
            if (pOrder) {
              latestEtaDate = pOrder.dateObj;
              latestEtaStr = order.eta || order.expected_delivery_date;
            }
          }

          // Place the order's outstanding cash balance into the month of final stock arrival
          if (latestEtaDate && outstandingBal > 0) {
            const parsedFinal = parseDateString(latestEtaStr);
            if (parsedFinal) {
              const colIdx = fyMonths.findIndex(fm => fm.key === parsedFinal.key);
              if (colIdx !== -1) {
                orderMonthBuckets[colIdx] += outstandingBal;
              }
            }
          }
        }

        // =========================================================================
        // REPORT 3: INVOICING DONE (ACTUAL BILLED REVENUE BY ISSUE MONTH)
        // User rule: Dynamic pivot table showing all actual invoicing done per month.
        // =========================================================================
        else if (activeReportMode === 'INVOICED_DONE') {
          // 1. Line items invoiceHistory
          itemsList.forEach(item => {
            const iHist = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
            iHist.forEach(h => {
              const hDate = h.date || item.invoiceDate;
              const hVal = Number(h.total ?? ((Number(h.qty) || 0) * (Number(h.rate) || Number(h.unitPrice) || Number(item.unitRetail) || 0))) || 0;
              if (hDate && hVal > 0) {
                const parsed = parseDateString(hDate);
                if (parsed) {
                  const colIdx = fyMonths.findIndex(fm => fm.key === parsed.key);
                  if (colIdx !== -1) {
                    orderMonthBuckets[colIdx] += hVal;
                  }
                }
              }
            });
          });

          // 2. Client invoices allocated to this order
          const cInvs = invoicesByOrder[order.id] || [];
          cInvs.forEach(cinv => {
            const d = cinv.issued || cinv.date;
            let val = 0;
            if (typeof cinv.amount === 'number') val = cinv.amount;
            else if (typeof cinv.amount === 'string') val = parseFloat(cinv.amount.replace(/[^0-9.-]+/g, '')) || 0;
            
            if (d && val > 0) {
              const parsed = parseDateString(d);
              if (parsed) {
                const colIdx = fyMonths.findIndex(fm => fm.key === parsed.key);
                if (colIdx !== -1) {
                  // Only add if not already captured by line items
                  const existingBucketSum = orderMonthBuckets.reduce((a, b) => a + b, 0);
                  if (existingBucketSum === 0) {
                    orderMonthBuckets[colIdx] += val;
                  }
                }
              }
            }
          });

          // Fallback if order has general invoiceDate and invoiced value
          const totalInvoicedInBuckets = orderMonthBuckets.reduce((a, b) => a + b, 0);
          if (totalInvoicedInBuckets === 0 && orderInvoiced > 0 && order.invoiceDate) {
            const parsed = parseDateString(order.invoiceDate);
            if (parsed) {
              const colIdx = fyMonths.findIndex(fm => fm.key === parsed.key);
              if (colIdx !== -1) {
                orderMonthBuckets[colIdx] += orderInvoiced;
              }
            }
          }
        }

        // Determine 7-Day Balance Readiness
        let balanceStatus = 'AWAITING_STOCK';
        let daysToStock = null;

        if (outstandingBal <= 0) {
          balanceStatus = 'FULLY_SETTLED';
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
          toBeInvoiced: toBeInvoicedVal,
          outstandingBalance: outstandingBal,
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
        pNode.toBeInvoiced += toBeInvoicedVal;
        pNode.outstandingBalance += outstandingBal;
        orderMonthBuckets.forEach((v, idx) => pNode.monthBuckets[idx] += v);
        pNode.orders.push(orderNode);

        // Accumulate into division
        divMap[division].totalOrderValue += orderVal;
        divMap[division].invoicedToDate += orderInvoiced;
        divMap[division].toBeInvoiced += toBeInvoicedVal;
        divMap[division].outstandingBalance += outstandingBal;
        orderMonthBuckets.forEach((v, idx) => divMap[division].monthBuckets[idx] += v);
      });
    });

    return Object.values(divMap);
  }, [projects, invoices, activeReportMode, selectedFY, fyMonths]);

  // Overall summary KPIs
  const summaryKPIs = useMemo(() => {
    let grandOrderVal = 0;
    let grandInvoiced = 0;
    let grandToBeInvoiced = 0;
    let grandOutstandingBal = 0;
    let readyCount = 0;
    let readyValue = 0;
    let fyTotalProjected = 0;

    pivotTreeData.forEach(d => {
      grandOrderVal += d.totalOrderValue;
      grandInvoiced += d.invoicedToDate;
      grandToBeInvoiced += d.toBeInvoiced;
      grandOutstandingBal += d.outstandingBalance;
      fyTotalProjected += d.monthBuckets.reduce((a, b) => a + b, 0);

      Object.values(d.projects).forEach(p => {
        p.orders.forEach(o => {
          if (o.balanceStatus === 'READY_FOR_BALANCE') {
            readyCount++;
            readyValue += o.outstandingBalance;
          }
        });
      });
    });

    return {
      grandOrderVal,
      grandInvoiced,
      grandToBeInvoiced,
      grandOutstandingBal,
      readyCount,
      readyValue,
      fyTotalProjected
    };
  }, [pivotTreeData]);

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
    pivotTreeData.forEach(d => {
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

  // Export 12-Month Pivot to Excel
  const handleExportExcel = () => {
    const rows = [];
    const reportTitle = activeReportMode === 'TO_BE_INVOICED'
      ? 'To_Be_Invoiced_Forecast'
      : activeReportMode === 'BALANCE_PAYMENTS'
      ? 'Balance_Payments_Cashflow'
      : 'Invoicing_Done';

    pivotTreeData.forEach(d => {
      const divRow = {
        'Hierarchy Level': 'DIVISION',
        'Name': d.name,
        'Client': '',
        'Order Value': d.totalOrderValue,
        'Invoiced': d.invoicedToDate,
        'To Be Invoiced': d.toBeInvoiced,
        'Balance (Outstanding)': d.outstandingBalance
      };
      fyMonths.forEach((fm, idx) => {
        divRow[fm.label] = d.monthBuckets[idx];
      });
      divRow['FY Total'] = d.monthBuckets.reduce((a, b) => a + b, 0);
      rows.push(divRow);

      Object.values(d.projects).forEach(p => {
        const projRow = {
          'Hierarchy Level': '  PROJECT',
          'Name': p.name,
          'Client': p.client,
          'Order Value': p.totalOrderValue,
          'Invoiced': p.invoicedToDate,
          'To Be Invoiced': p.toBeInvoiced,
          'Balance (Outstanding)': p.outstandingBalance
        };
        fyMonths.forEach((fm, idx) => {
          projRow[fm.label] = p.monthBuckets[idx];
        });
        projRow['FY Total'] = p.monthBuckets.reduce((a, b) => a + b, 0);
        rows.push(projRow);

        p.orders.forEach(o => {
          const ordRow = {
            'Hierarchy Level': '    ORDER',
            'Name': o.orderName,
            'Client': p.client,
            'Order Value': o.orderValue,
            'Invoiced': o.invoicedToDate,
            'To Be Invoiced': o.toBeInvoiced,
            'Balance (Outstanding)': o.outstandingBalance
          };
          fyMonths.forEach((fm, idx) => {
            ordRow[fm.label] = o.monthBuckets[idx];
          });
          ordRow['FY Total'] = o.monthBuckets.reduce((a, b) => a + b, 0);
          ordRow['Final Stock ETA'] = o.latestEta;
          ordRow['Readiness'] = o.balanceStatus;
          rows.push(ordRow);
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportTitle}_${selectedFY}`);
    XLSX.writeFile(wb, `Debtors_${reportTitle}_${selectedFY}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1850px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* TOP HEADER & NAVIGATION (ARCHITECTURAL STUDIO DESIGN) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <button 
            onClick={() => navigate('/sales-tracker')}
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '8px', padding: '4px 10px' }}
          >
            <ArrowLeft size={13} /> Back to Sales Tracker
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  FINANCIAL FORECASTING
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>ETA Item Splits & Balance Cashflow</span>
              </div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Debtors & Billing Forecast Hub
              </h1>
            </div>

            {/* DYNAMIC REPORT DROPDOWN SELECTOR (STUDIO PILL CONTROL) */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '4px', gap: '4px' }}>
              <button 
                onClick={() => setActiveReportMode('TO_BE_INVOICED')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: activeReportMode === 'TO_BE_INVOICED' ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeReportMode === 'TO_BE_INVOICED' ? '#0f172a' : 'transparent',
                  color: activeReportMode === 'TO_BE_INVOICED' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <TrendingUp size={13} /> 1. To Be Invoiced (ETA Item Split)
              </button>

              <button 
                onClick={() => setActiveReportMode('BALANCE_PAYMENTS')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: activeReportMode === 'BALANCE_PAYMENTS' ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeReportMode === 'BALANCE_PAYMENTS' ? '#0f172a' : 'transparent',
                  color: activeReportMode === 'BALANCE_PAYMENTS' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <CreditCard size={13} /> 2. Balance Payments (Final Stock ETA)
              </button>

              <button 
                onClick={() => setActiveReportMode('INVOICED_DONE')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: activeReportMode === 'INVOICED_DONE' ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeReportMode === 'INVOICED_DONE' ? '#0f172a' : 'transparent',
                  color: activeReportMode === 'INVOICED_DONE' ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <Receipt size={13} /> 3. Invoicing Done (Actual Revenue)
              </button>
            </div>

            {/* FINANCIAL YEAR SELECTOR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>FY:</span>
              <select 
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1.5px solid var(--border)', 
                  borderRadius: '8px', 
                  padding: '5px 10px', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: 'var(--text-primary)' 
                }}
              >
                <option value="2025-2026">2025 - 2026</option>
                <option value="2026-2027">2026 - 2027</option>
                <option value="2027-2028">2027 - 2028</option>
              </select>
            </div>
          </div>

          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activeReportMode === 'TO_BE_INVOICED' && 'Full Financial Year (12-Month) Pivot of un-invoiced values rolling into each month based on item ETAs.'}
            {activeReportMode === 'BALANCE_PAYMENTS' && 'Full Financial Year (12-Month) Pivot showing full outstanding balance in the month of the final stock arrival ETA.'}
            {activeReportMode === 'INVOICED_DONE' && 'Full Financial Year (12-Month) Pivot showing actual invoiced revenue recognized across each month.'}
          </p>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            onClick={handleExportExcel}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
          >
            <Download size={14} /> Export 12-Month Pivot (.xlsx)
          </button>
          <button 
            onClick={() => refreshProjects()}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
          >
            <RefreshCw size={13} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Order Value</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {formatZar(summaryKPIs.grandOrderVal)}
          </div>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Active production orders</span>
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
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>To Be Invoiced</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {formatZar(summaryKPIs.grandToBeInvoiced)}
          </div>
          <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Invoiced + To Be Invoiced = Order Value</span>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Balance (Outstanding)</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ec4899', marginTop: '4px' }}>
            {formatZar(summaryKPIs.grandOutstandingBal)}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Outstanding client payment balance</span>
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
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Final stock arriving &le; 7 days</span>
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
            <option value="READY">🟢 Ready for Balance Invoice (&le; 7 Days)</option>
            <option value="IN_TRANSIT">🟡 In Transit / Awaiting Stock</option>
            <option value="NO_ETA">⚪ Awaiting ETA</option>
            <option value="FULLY_SETTLED">✅ Fully Settled</option>
          </select>
        </div>
      </div>

      {/* FULL FINANCIAL YEAR (12-MONTH) DYNAMIC PIVOT TABLE */}
      <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', minWidth: '300px' }}>Division / Project / Order Hierarchy</th>
                <th style={{ padding: '12px 11px', textAlign: 'right', minWidth: '105px' }}>Order Value</th>
                <th style={{ padding: '12px 11px', textAlign: 'right', minWidth: '105px' }}>Invoiced</th>
                <th style={{ padding: '12px 11px', textAlign: 'right', minWidth: '110px', color: '#f59e0b' }}>To Be Invoiced</th>
                <th style={{ padding: '12px 11px', textAlign: 'right', minWidth: '115px', color: '#ec4899' }}>Balance</th>
                
                {/* 12 FY MONTH HEADERS */}
                {fyMonths.map(fm => (
                  <th key={fm.key} style={{ padding: '12px 9px', textAlign: 'right', minWidth: '92px' }}>
                    {fm.label}
                  </th>
                ))}

                <th style={{ padding: '12px 11px', textAlign: 'right', minWidth: '110px', color: 'var(--text-primary)' }}>FY Total</th>
                <th style={{ padding: '12px 11px', textAlign: 'center', minWidth: '110px' }}>Final ETA</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', minWidth: '170px' }}>Readiness Alert</th>
              </tr>
            </thead>
            <tbody>
              {pivotTreeData.map(divisionNode => {
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
                const divFyTotal = divisionNode.monthBuckets.reduce((a, b) => a + b, 0);

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
                      <td style={{ padding: '12px 11px', textAlign: 'right' }}>{formatZar(divisionNode.totalOrderValue)}</td>
                      <td style={{ padding: '12px 11px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(divisionNode.invoicedToDate)}</td>
                      <td style={{ padding: '12px 11px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(divisionNode.toBeInvoiced)}</td>
                      <td style={{ padding: '12px 11px', textAlign: 'right', color: '#ec4899' }}>{formatZar(divisionNode.outstandingBalance)}</td>
                      
                      {/* 12 FY MONTH VALUES */}
                      {divisionNode.monthBuckets.map((v, mIdx) => (
                        <td key={mIdx} style={{ padding: '12px 9px', textAlign: 'right', color: v > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          {v > 0 ? formatZar(v) : '—'}
                        </td>
                      ))}

                      <td style={{ padding: '12px 11px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        {formatZar(divFyTotal)}
                      </td>
                      <td style={{ padding: '12px 11px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {divisionNode.toBeInvoiced > 0 ? (
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
                        if (balanceReadinessFilter === 'FULLY_SETTLED' && o.balanceStatus !== 'FULLY_SETTLED') return false;

                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          return o.orderName.toLowerCase().includes(q) || projNode.name.toLowerCase().includes(q);
                        }
                        return true;
                      });

                      if (matchingOrders.length === 0 && (searchQuery.trim() || balanceReadinessFilter !== 'ALL')) {
                        return null;
                      }

                      const projFyTotal = projNode.monthBuckets.reduce((a, b) => a + b, 0);

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
                            <td style={{ padding: '10px 11px', textAlign: 'right', fontWeight: 600 }}>{formatZar(projNode.totalOrderValue)}</td>
                            <td style={{ padding: '10px 11px', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>{formatZar(projNode.invoicedToDate)}</td>
                            <td style={{ padding: '10px 11px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatZar(projNode.toBeInvoiced)}</td>
                            <td style={{ padding: '10px 11px', textAlign: 'right', color: '#ec4899', fontWeight: 600 }}>{formatZar(projNode.outstandingBalance)}</td>
                            
                            {/* 12 FY MONTHS FOR PROJECT */}
                            {projNode.monthBuckets.map((v, mIdx) => (
                              <td key={mIdx} style={{ padding: '10px 9px', textAlign: 'right', color: v > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                {v > 0 ? formatZar(v) : '—'}
                              </td>
                            ))}

                            <td style={{ padding: '10px 11px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                              {formatZar(projFyTotal)}
                            </td>
                            <td style={{ padding: '10px 11px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {matchingOrders.length} order{matchingOrders.length === 1 ? '' : 's'}
                              </span>
                            </td>
                          </tr>

                          {/* LEVEL 3: ORDERS UNDER PROJECT */}
                          {isProjExpanded && matchingOrders.map(orderNode => {
                            const orderFyTotal = orderNode.monthBuckets.reduce((a, b) => a + b, 0);

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
                                <td style={{ padding: '9px 11px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatZar(orderNode.orderValue)}</td>
                                <td style={{ padding: '9px 11px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(orderNode.invoicedToDate)}</td>
                                <td style={{ padding: '9px 11px', textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{formatZar(orderNode.toBeInvoiced)}</td>
                                <td style={{ padding: '9px 11px', textAlign: 'right', color: '#ec4899', fontWeight: 600 }}>{formatZar(orderNode.outstandingBalance)}</td>
                                
                                {/* 12 FY MONTHS FOR ORDER */}
                                {orderNode.monthBuckets.map((v, mIdx) => (
                                  <td key={mIdx} style={{ padding: '9px 9px', textAlign: 'right', color: v > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: v > 0 ? 600 : 400 }}>
                                    {v > 0 ? formatZar(v) : '—'}
                                  </td>
                                ))}

                                <td style={{ padding: '9px 11px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                                  {formatZar(orderFyTotal)}
                                </td>

                                <td style={{ padding: '9px 11px', textAlign: 'center' }}>
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
                                  {orderNode.balanceStatus === 'FULLY_SETTLED' && (
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
                <td style={{ padding: '14px 11px', textAlign: 'right' }}>{formatZar(summaryKPIs.grandOrderVal)}</td>
                <td style={{ padding: '14px 11px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(summaryKPIs.grandInvoiced)}</td>
                <td style={{ padding: '14px 11px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(summaryKPIs.grandToBeInvoiced)}</td>
                <td style={{ padding: '14px 11px', textAlign: 'right', color: '#ec4899' }}>{formatZar(summaryKPIs.grandOutstandingBal)}</td>
                
                {fyMonths.map((fm, mIdx) => {
                  const mSum = pivotTreeData.reduce((s, d) => s + (d.monthBuckets[mIdx] || 0), 0);
                  return (
                    <td key={fm.key} style={{ padding: '14px 9px', textAlign: 'right', fontWeight: 700 }}>
                      {mSum > 0 ? formatZar(mSum) : '—'}
                    </td>
                  );
                })}

                <td style={{ padding: '14px 11px', textAlign: 'right', color: '#10b981', fontWeight: 800 }}>
                  {formatZar(summaryKPIs.fyTotalProjected)}
                </td>
                <td style={{ padding: '14px 11px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#10b981' }}>
                  {summaryKPIs.readyCount} Ready to Bill
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
