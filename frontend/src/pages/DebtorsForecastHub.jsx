import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { 
  ArrowLeft, Download, Search, RefreshCw, ChevronRight, ChevronDown, 
  Calendar, Layers, Filter, CheckCircle2, Clock, AlertTriangle, 
  FileText, TrendingUp, DollarSign, ExternalLink, ShieldCheck, HelpCircle
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
  const { projects = [], refreshProjects } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');
  const [balanceReadinessFilter, setBalanceReadinessFilter] = useState('ALL'); // ALL | READY | UPCOMING | OVERDUE
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

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

  // Helper: parse date into month/year
  const parseDateString = (rawDate) => {
    if (!rawDate) return null;
    if (typeof rawDate === 'string' && rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(mIdx) && !isNaN(y) && mIdx >= 0 && mIdx < 12) {
          return { monthName: MONTHS_LIST[mIdx], year: y || 2026, monthIdx: mIdx };
        }
      }
    }
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}/.test(rawDate.trim())) {
      const parts = rawDate.trim().split('-');
      const y = parseInt(parts[0], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return { monthName: MONTHS_LIST[mIdx], year: y, monthIdx: mIdx };
      }
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

  // 2. Compute the full hierarchical tree: Division -> Project -> Order
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

    projects.forEach(proj => {
      const orders = Array.isArray(proj.orders) ? proj.orders : [];
      orders.forEach(order => {
        if (order.status === 'Draft' || !order.status) return;

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

        const itemsList = Array.isArray(order.items) ? order.items : [];
        const orderVal = Number(order.value || order.totalRetail || order.orderValue || 0);
        const orderInvoiced = Number(order.invoiced || order.totalInvoiced || 0);
        const orderDeposit = Number(order.paid || order.depositValue || 0);

        // Find latest ETA across all items
        let latestEtaDate = null;
        let latestEtaStr = null;

        const orderMonthBuckets = [0, 0, 0, 0];
        let totalUnInvoicedItems = 0;

        itemsList.forEach(item => {
          const qty = Number(item.qty || 1);
          const rate = Number(item.unitRetail || item.unitPrice || 0);
          const itemVal = qty * rate;
          const invVal = Number(item.invoicedValue || item.invoiceVal || 0);
          const unInvoiced = Math.max(0, itemVal - invVal);

          const rawEta = item.po_eta || item.eta || order.eta || order.expected_delivery_date;
          if (rawEta) {
            const p = parseDateString(rawEta);
            if (p) {
              const d = new Date(p.year, p.monthIdx, 15);
              if (!latestEtaDate || d > latestEtaDate) {
                latestEtaDate = d;
                latestEtaStr = rawEta;
              }
              // Bucket into 4 rolling months
              rollingMonths.forEach((rm, idx) => {
                if (p.year === rm.year && p.monthIdx === rm.monthIdx) {
                  orderMonthBuckets[idx] += unInvoiced;
                }
              });
            }
          }
          totalUnInvoicedItems += unInvoiced;
        });

        const effectiveUnInvoiced = orderVal > 0 ? Math.max(0, orderVal - orderInvoiced) : totalUnInvoicedItems;

        // If items had no ETAs, place un-invoiced balance into order's general ETA or month 0
        const bucketSum = orderMonthBuckets.reduce((a, b) => a + b, 0);
        if (bucketSum === 0 && effectiveUnInvoiced > 0) {
          orderMonthBuckets[0] = effectiveUnInvoiced;
        }

        // Determine Balance Invoice Readiness
        // Rule: Deposit is paid AND latest ETA is within 7 days (or overdue)
        let balanceStatus = 'AWAITING_STOCK'; // AWAITING_STOCK | READY_FOR_BALANCE | FULLY_INVOICED | NO_DEPOSIT
        let daysToStock = null;

        if (effectiveUnInvoiced <= 0) {
          balanceStatus = 'FULLY_INVOICED';
        } else if (orderDeposit <= 0) {
          balanceStatus = 'AWAITING_DEPOSIT';
        } else if (latestEtaDate) {
          const diffMs = latestEtaDate.getTime() - today.getTime();
          daysToStock = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysToStock <= 7) {
            balanceStatus = 'READY_FOR_BALANCE';
          } else {
            balanceStatus = 'IN_TRANSIT';
          }
        }

        const orderNode = {
          id: order.id,
          orderName: order.quoteName || order.orderName || `Order #${order.id}`,
          orderNumber: order.orderNumber || order.id,
          orderValue: orderVal,
          invoicedToDate: orderInvoiced,
          unInvoicedBalance: effectiveUnInvoiced,
          depositReceived: orderDeposit,
          latestEta: latestEtaStr || order.eta || 'TBD',
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

  // Overall totals
  const summaryKPIs = useMemo(() => {
    let grandOrderVal = 0;
    let grandInvoiced = 0;
    let grandUnInvoiced = 0;
    let grandMonth0 = 0;
    let readyCount = 0;
    let readyValue = 0;

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
      readyValue
    };
  }, [treeData]);

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

  // Export to Excel
  const handleExportExcel = () => {
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

  const formatZar = (val) => {
    return 'R ' + (Number(val) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Debtors & Billing Forecast Hub
            </h1>
            <span style={{ 
              background: 'rgba(16, 185, 129, 0.12)', 
              color: '#10b981', 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '3px 10px', 
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              Live Dynamic Pivot Engine
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time billing pipeline, expected invoice months, and 7-day balance invoice readiness based on Palladium stock ETAs.
          </p>
        </div>

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
            <Download size={14} /> Export Pivot (.xlsx)
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Order Portfolio</span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {formatZar(summaryKPIs.grandOrderVal)}
          </div>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Confirmed active orders</span>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Invoiced to Date</span>
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
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pending stock arrival & balance billing</span>
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
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Stock arriving $\le$ 7 days & deposit paid</span>
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
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Billing Readiness:</span>
          <select 
            value={balanceReadinessFilter} 
            onChange={(e) => setBalanceReadinessFilter(e.target.value)}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', color: 'var(--text-primary)' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">🟢 Ready for Balance Invoice (Stock in 7 Days)</option>
            <option value="IN_TRANSIT">🟡 In Transit / Awaiting Stock</option>
            <option value="NO_DEPOSIT">🔴 Awaiting Deposit</option>
            <option value="FULLY_INVOICED">✅ Fully Invoiced</option>
          </select>
        </div>
      </div>

      {/* DYNAMIC PIVOT TABLE */}
      <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.03)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px', minWidth: '320px' }}>Division / Project / Order</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Order Value</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Invoiced to Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Un-invoiced Balance</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', background: 'rgba(59, 130, 246, 0.03)' }}>{rollingMonths[0].shortLabel}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', background: 'rgba(59, 130, 246, 0.03)' }}>{rollingMonths[1].shortLabel}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', background: 'rgba(59, 130, 246, 0.03)' }}>{rollingMonths[2].shortLabel}</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', background: 'rgba(59, 130, 246, 0.03)' }}>{rollingMonths[3].shortLabel}</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Stock ETA</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Debtors Action / Readiness</th>
              </tr>
            </thead>
            <tbody>
              {treeData.map(divisionNode => {
                if (selectedDivisionFilter !== 'ALL' && divisionNode.name !== selectedDivisionFilter) return null;

                const isDivExpanded = expandedDivisions[divisionNode.name] || searchQuery !== '';
                const projectList = Object.values(divisionNode.projects);

                if (divisionNode.totalOrderValue === 0 && searchQuery === '') return null;

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
                          ({projectList.length} projects)
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatZar(divisionNode.totalOrderValue)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(divisionNode.invoicedToDate)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(divisionNode.unInvoicedBalance)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>{formatZar(divisionNode.monthBuckets[0])}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>{formatZar(divisionNode.monthBuckets[1])}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>{formatZar(divisionNode.monthBuckets[2])}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>{formatZar(divisionNode.monthBuckets[3])}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Division Rollup</span>
                      </td>
                    </tr>

                    {/* LEVEL 2: PROJECTS UNDER DIVISION */}
                    {isDivExpanded && projectList.map(projNode => {
                      const isProjExpanded = expandedProjects[projNode.id || projNode.name] || searchQuery !== '';
                      const matchesSearch = !searchQuery || 
                        projNode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        projNode.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        projNode.orders.some(o => o.orderName.toLowerCase().includes(searchQuery.toLowerCase()));

                      if (!matchesSearch) return null;

                      return (
                        <React.Fragment key={projNode.id || projNode.name}>
                          <tr 
                            onClick={() => toggleProject(projNode.id || projNode.name)}
                            style={{ 
                              background: 'transparent', 
                              borderBottom: '1px solid var(--border)', 
                              cursor: 'pointer',
                              fontWeight: 600,
                              userSelect: 'none'
                            }}
                          >
                            <td style={{ padding: '10px 16px 10px 36px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ChevronRight 
                                size={12} 
                                style={{ 
                                  transform: isProjExpanded ? 'rotate(90deg)' : 'none', 
                                  transition: 'transform 0.15s ease',
                                  color: 'var(--text-tertiary)'
                                }} 
                              />
                              <span style={{ color: 'var(--text-primary)' }}>{projNode.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                • {projNode.client}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.totalOrderValue)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(projNode.invoicedToDate)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#f59e0b' }}>{formatZar(projNode.unInvoicedBalance)}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[0])}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[1])}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[2])}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatZar(projNode.monthBuckets[3])}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-tertiary)' }}>—</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{projNode.orders.length} sub-orders</span>
                            </td>
                          </tr>

                          {/* LEVEL 3: ORDERS UNDER PROJECT */}
                          {isProjExpanded && projNode.orders.map(orderNode => {
                            if (balanceReadinessFilter === 'READY' && orderNode.balanceStatus !== 'READY_FOR_BALANCE') return null;
                            if (balanceReadinessFilter === 'IN_TRANSIT' && orderNode.balanceStatus !== 'IN_TRANSIT') return null;
                            if (balanceReadinessFilter === 'NO_DEPOSIT' && orderNode.balanceStatus !== 'AWAITING_DEPOSIT') return null;
                            if (balanceReadinessFilter === 'FULLY_INVOICED' && orderNode.balanceStatus !== 'FULLY_INVOICED') return null;

                            return (
                              <tr 
                                key={orderNode.id}
                                style={{ 
                                  background: 'rgba(59, 130, 246, 0.015)', 
                                  borderBottom: '1px solid var(--border)',
                                  fontSize: '11.5px'
                                }}
                              >
                                <td style={{ padding: '8px 16px 8px 60px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--text-info)', fontWeight: 600 }}>
                                      {orderNode.orderNumber}
                                    </span>
                                    <span>{orderNode.orderName}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right' }}>{formatZar(orderNode.orderValue)}</td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', color: '#3b82f6' }}>{formatZar(orderNode.invoicedToDate)}</td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                                  {formatZar(orderNode.unInvoicedBalance)}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', color: orderNode.monthBuckets[0] > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                  {formatZar(orderNode.monthBuckets[0])}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', color: orderNode.monthBuckets[1] > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                  {formatZar(orderNode.monthBuckets[1])}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', color: orderNode.monthBuckets[2] > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                  {formatZar(orderNode.monthBuckets[2])}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'right', color: orderNode.monthBuckets[3] > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                  {formatZar(orderNode.monthBuckets[3])}
                                </td>
                                <td style={{ padding: '8px 14px', textAlign: 'center', fontFamily: 'monospace' }}>
                                  {orderNode.latestEta}
                                </td>
                                <td style={{ padding: '8px 16px', textAlign: 'center' }}>
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
                                  {orderNode.balanceStatus === 'AWAITING_DEPOSIT' && (
                                    <span style={{ 
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      color: '#ef4444', 
                                      border: '1px solid rgba(239, 68, 68, 0.25)',
                                      padding: '3px 8px', 
                                      borderRadius: '12px', 
                                      fontSize: '10.5px', 
                                      fontWeight: 600
                                    }}>
                                      Deposit Unpaid
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
    </div>
  );
}
