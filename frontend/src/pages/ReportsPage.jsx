import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, 
  CheckCircle, FileText, BarChart2, Plus, ArrowUpRight, ArrowDownRight, Settings,
  ChevronDown, ChevronUp, X
} from 'lucide-react';

const DIVISIONS = [
  'MODUS PROFESSIONAL ( Ryan )',
  'MOOD STORES',
  'MODUS PROJECTS ( Dani )',
  'PROJECTS (Dani own)',
  'MODUS SIGNATURE ( Thando )',
  'MADE ( Jon-Peer)',
  'LUXELINE',
  'INTERNAL - Office'
];

const BUDGETS_KPI1 = {
  'MODUS PROFESSIONAL ( Ryan )': { monthly: 1020000.00, ytd: 6953000.00 },
  'MOOD STORES': { monthly: 0.00, ytd: 0.00 },
  'MODUS PROJECTS ( Dani )': { monthly: 1200000.00, ytd: 4560000.00 },
  'PROJECTS (Dani own)': { monthly: 400000.00, ytd: 2800000.00 },
  'MODUS SIGNATURE ( Thando )': { monthly: 37500.00, ytd: 682500.00 },
  'MADE ( Jon-Peer)': { monthly: 120000.00, ytd: 840000.00 },
  'LUXELINE': { monthly: 120000.00, ytd: 400000.00 },
  'INTERNAL - Office': { monthly: 0.00, ytd: 0.00 }
};

const TARGETS_KPI2 = {
  'MODUS PROFESSIONAL ( Ryan )': 3400381.18,
  'MOOD STORES': 0.00,
  'MODUS PROJECTS ( Dani )': 3155386.31,
  'PROJECTS (Dani own)': 2641586.56,
  'MODUS SIGNATURE ( Thando )': 0.00,
  'MADE ( Jon-Peer)': 2832.66,
  'LUXELINE': 400000.00,
  'INTERNAL - Office': 76269.45
};

const TARGETS_KPI3 = {
  'MODUS PROFESSIONAL ( Ryan )': 3031966.55,
  'MOOD STORES': 0.00,
  'MODUS PROJECTS ( Dani )': 1823997.81,
  'PROJECTS (Dani own)': 2567090.19,
  'MODUS SIGNATURE ( Thando )': -1176583.38,
  'MADE ( Jon-Peer)': -413834.01,
  'LUXELINE': 400000.00,
  'INTERNAL - Office': 76269.45
};

const BUDGETS_KPI4 = {
  'MODUS PROFESSIONAL ( Ryan )': 17000000.00,
  'MOOD STORES': 0.00,
  'MODUS PROJECTS ( Dani )': 16000000.00,
  'PROJECTS (Dani own)': 4000000.00,
  'MODUS SIGNATURE ( Thando )': 2500000.00,
  'MADE ( Jon-Peer)': 2000000.00,
  'LUXELINE': 1000000.00,
  'INTERNAL - Office': 0.00
};

const MONTHS_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsPage() {
  const { projects, supportTickets } = useStore();
  
  // Year & Month Selector
  const [selectedPeriodKey, setSelectedPeriodKey] = useState('6_2026'); // (default: July 2026)

  const [selectedMonthIdx, selectedYear] = selectedPeriodKey.split('_').map(Number);
  const selectedMonthName = MONTHS_LIST[selectedMonthIdx];

  // Collapsible tables states
  const [collapsedTables, setCollapsedTables] = useState({
    kpi1: false,
    kpi2: false,
    kpi3: false,
    kpi4: false,
    stock: false
  });

  const toggleCollapse = (tableKey) => {
    setCollapsedTables(prev => ({ ...prev, [tableKey]: !prev[tableKey] }));
  };

  // Drilldown modal state
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    title: '',
    items: []
  });

  // Dynamic rolling 4 months based on selector
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

  // PM to Division helper
  const mapPmToDivision = (pmName, projName = '') => {
    if (!pmName) return 'INTERNAL - Office';
    const name = pmName.toLowerCase();
    const proj = projName.toLowerCase();
    
    if (name.includes('ryan')) return 'MODUS PROFESSIONAL ( Ryan )';
    if (name.includes('thando')) return 'MODUS SIGNATURE ( Thando )';
    if (name.includes('peer') || name.includes('jon')) return 'MADE ( Jon-Peer)';
    if (name.includes('luxe')) return 'LUXELINE';
    if (name.includes('dani')) {
      if (proj.includes('own') || proj.includes('personal')) {
        return 'PROJECTS (Dani own)';
      }
      return 'MODUS PROJECTS ( Dani )';
    }
    return 'INTERNAL - Office';
  };

  const getOrderDivision = (order, proj) => {
    return order.division || proj.division || mapPmToDivision(order.pmName || proj.pm, proj.name);
  };

  const getOrderMonthAndYear = (order) => {
    if (!order.orderDate) return { monthName: 'July', year: 2026, monthIdx: 6 };
    const dateParts = order.orderDate.split('/');
    if (dateParts.length === 3) {
      const monthIndex = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      return { monthName: MONTHS_LIST[monthIndex] || 'July', year: year || 2026, monthIdx: monthIndex };
    }
    return { monthName: 'July', year: 2026, monthIdx: 6 };
  };

  // Initialize summary variables
  const dynamicInvoiced = {};
  const dynamicAwaiting = {};
  const dynamicPipeline = {};
  const dynamicAnnual = {};

  DIVISIONS.forEach(div => {
    dynamicInvoiced[div] = { actual: 0, budget: BUDGETS_KPI1[div].monthly, ytdActual: 0, ytdBudget: BUDGETS_KPI1[div].ytd };
    dynamicAwaiting[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: TARGETS_KPI2[div] };
    dynamicPipeline[div] = { col0: 0, col1: 0, col2: 0, col3: 0, target: TARGETS_KPI3[div] };
    dynamicAnnual[div] = { invoiced: 0, toInvoice: 0, pipeline: 0, tbc: 0, budget: BUDGETS_KPI4[div] };
  });

  // Process dynamic aggregations from Store projects
  Object.values(projects || {}).forEach(proj => {
    const orders = proj.orders || [];
    orders.forEach(order => {
      const div = getOrderDivision(order, proj);
      if (!dynamicInvoiced[div]) return;

      const orderValue = order.value || (order.itemsList || []).reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0);
      const { monthName: orderMonth, year: orderYear } = getOrderMonthAndYear(order);

      // KPI 1 & Annual Invoiced
      if (order.status === 'Delivered' || order.status === 'Processing') {
        if (orderMonth === selectedMonthName && orderYear === selectedYear) {
          dynamicInvoiced[div].actual += orderValue;
        }
        if (orderYear === selectedYear) {
          dynamicInvoiced[div].ytdActual += orderValue;
        }
        dynamicAnnual[div].invoiced += orderValue;
      }

      const rollingIdx = rollingMonths.findIndex(rm => rm.monthName === orderMonth && rm.year === orderYear);

      // KPI 2 & Annual Awaiting Stock
      if (order.status === 'Pending') {
        if (rollingIdx !== -1) {
          dynamicAwaiting[div][`col${rollingIdx}`] += orderValue;
        }
        dynamicAnnual[div].toInvoice += orderValue;
      }

      // KPI 3 & Annual Pipeline
      if (order.status === 'Draft' || !order.status) {
        if (rollingIdx !== -1) {
          dynamicPipeline[div][`col${rollingIdx}`] += orderValue;
        }
        dynamicAnnual[div].pipeline += orderValue;
      }
    });
  });

  // Drilldown modal filter logic
  const triggerDrilldown = (title, division, type, extraFilter = null) => {
    const list = [];
    Object.values(projects || {}).forEach(proj => {
      const orders = proj.orders || [];
      orders.forEach(order => {
        const div = getOrderDivision(order, proj);
        if (div !== division) return;

        const orderValue = order.value || (order.itemsList || []).reduce((s, item) => s + ((item.qty || 0) * (item.unitRetail || 0)), 0);
        const { monthName: orderMonth, year: orderYear } = getOrderMonthAndYear(order);

        // Sales Invoiced
        if (type === 'invoiced') {
          if (order.status === 'Delivered' || order.status === 'Processing') {
            if (extraFilter === 'ytd') {
              if (orderYear === selectedYear) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            } else {
              if (orderMonth === selectedMonthName && orderYear === selectedYear) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            }
          }
        }

        // To Be Invoiced
        if (type === 'awaiting') {
          if (order.status === 'Pending') {
            if (extraFilter !== null) {
              const targetMonth = rollingMonths[extraFilter];
              if (orderMonth === targetMonth.monthName && orderYear === targetMonth.year) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            } else {
              const inRolling = rollingMonths.some(rm => rm.monthName === orderMonth && rm.year === orderYear);
              if (inRolling) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            }
          }
        }

        // Pipeline Projections
        if (type === 'pipeline') {
          if (order.status === 'Draft' || !order.status) {
            if (extraFilter !== null) {
              const targetMonth = rollingMonths[extraFilter];
              if (orderMonth === targetMonth.monthName && orderYear === targetMonth.year) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            } else {
              const inRolling = rollingMonths.some(rm => rm.monthName === orderMonth && rm.year === orderYear);
              if (inRolling) {
                list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
              }
            }
          }
        }

        // Annual consolidated totals
        if (type === 'annual') {
          if (extraFilter === 'invoiced' && (order.status === 'Delivered' || order.status === 'Processing')) {
            list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
          } else if (extraFilter === 'toInvoice' && order.status === 'Pending') {
            list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
          } else if (extraFilter === 'pipeline' && (order.status === 'Draft' || !order.status)) {
            list.push({ projectName: proj.name, orderId: order.orderId || 'N/A', status: order.status, date: order.orderDate || 'N/A', value: orderValue });
          }
        }
      });
    });

    setDrilldownModal({
      isOpen: true,
      title: `${title} (${division})`,
      items: list
    });
  };

  // Generate selector period options
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

  // Stock values
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

  return (
    <div className="animation-fade-in" style={{ padding: '24px', background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-title)' }}>Sales & KPI Ledger Engine</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Corporate financial tracking, pipeline projections, and stock valuation sheet.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={selectedPeriodKey} 
            onChange={(e) => setSelectedPeriodKey(e.target.value)} 
            className="form-control" 
            style={{ width: '220px', height: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'inherit', padding: '0 10px', fontSize: '13px' }}
          >
            {selectorPeriods.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

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
          <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Projected Annual</div>
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
          <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>Active Period</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                <th style={{ padding: '12px 16px' }}>Actual Invoiced</th>
                <th style={{ padding: '12px 16px' }}>Budget</th>
                <th style={{ padding: '12px 16px' }}>Variance</th>
                <th style={{ padding: '12px 16px' }}>YTD Actual</th>
                <th style={{ padding: '12px 16px' }}>YTD Budget</th>
                <th style={{ padding: '12px 16px' }}>YTD Variance</th>
              </tr>
            </thead>
            <tbody>
              {!collapsedTables.kpi1 && DIVISIONS.map((div) => {
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
              {!collapsedTables.kpi2 && DIVISIONS.map((div) => {
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
              {!collapsedTables.kpi3 && DIVISIONS.map((div) => {
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
              {!collapsedTables.kpi4 && DIVISIONS.map((div) => {
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

      {/* TWO COLUMN ROW FOR STOCK & OPERATIONAL METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* STOCK VALUES TABLE */}
        <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div 
            onClick={() => toggleCollapse('stock')}
            style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
          >
            {collapsedTables.stock ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inventory & Stock Values (KPI 2)</div>
          </div>
          <div style={{ padding: '16px' }}>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ paddingBottom: '8px' }}>Stock Classification</th>
                  <th style={{ paddingBottom: '8px' }}>Current</th>
                  <th style={{ paddingBottom: '8px' }}>Target</th>
                  <th style={{ paddingBottom: '8px' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {!collapsedTables.stock && stockValues.map((stock) => {
                  const variance = stock.current - stock.target;
                  const isNormal = stock.label.includes('Normal');
                  const varianceColor = getVarianceColor(variance, !isNormal);
                  return (
                    <tr key={stock.label} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 600 }}>{stock.label}</td>
                      <td>{formatZar(stock.current)}</td>
                      <td>{formatZar(stock.target)}</td>
                      <td style={{ fontWeight: 600, color: varianceColor }}>{formatZar(variance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* OPERATIONS, FAULTS & TICKET HEALTH */}
        <div className="card" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operational KPIs (Faults & Enquiries)</div>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* FAULTS KPI */}
            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>KPI 4: Client Fault Tickets Status ({selectedMonthName})</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>{newFaultsCount || 4}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>New / Open Faults</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#eab308' }}>23</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Total Logged (YTD)</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{closedFaultsCount || 5}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Closed (YTD)</div>
                </div>
              </div>
            </div>

            {/* ENQUIRIES KPI */}
            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>KPI 3: Enquiries & Site Audit Metrics</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>1.87</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Avg Enquiries (Target 1.0)</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>7.27</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Avg Faults (Target 5.0)</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>1.33</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Site Visits (Target 2.0)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DRILLDOWN POPUP MODAL */}
      {drilldownModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '100%', maxWidth: '700px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-title)' }}>
                {drilldownModal.title}
              </h3>
              <button 
                onClick={() => setDrilldownModal({ isOpen: false, title: '', items: [] })}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '400px' }}>
              {drilldownModal.items.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '20px' }}>
                  No projects or orders found making up this value.
                </div>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
                      <th style={{ padding: '8px 12px' }}>Project Name</th>
                      <th style={{ padding: '8px 12px' }}>Order ID</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownModal.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{item.projectName}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{item.orderId}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                            background: item.status === 'Delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            color: item.status === 'Delivered' ? '#10b981' : '#3b82f6'
                          }}>
                            {item.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{item.date}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatZar(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.02)',
              borderRadius: '0 0 12px 12px'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDrilldownModal({ isOpen: false, title: '', items: [] })}
                style={{ fontSize: '12px', padding: '6px 16px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
