import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, 
  CheckCircle, FileText, BarChart2, Plus, ArrowUpRight, ArrowDownRight, Settings 
} from 'lucide-react';

// Categories and Data Structures
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

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState('July');

  // KPI 1: Invoiced July Data
  const invoicedData = {
    'MODUS PROFESSIONAL ( Ryan )': { actual: 9034.98, budget: 1020000.00, ytdActual: 3552618.82, ytdBudget: 6953000.00 },
    'MOOD STORES': { actual: 0.00, budget: 0.00, ytdActual: 0.00, ytdBudget: 0.00 },
    'MODUS PROJECTS ( Dani )': { actual: 0.00, budget: 1200000.00, ytdActual: 1404613.69, ytdBudget: 4560000.00 },
    'PROJECTS (Dani own)': { actual: 0.00, budget: 400000.00, ytdActual: 158413.44, ytdBudget: 2800000.00 },
    'MODUS SIGNATURE ( Thando )': { actual: 0.00, budget: 37500.00, ytdActual: 699659.09, ytdBudget: 682500.00 },
    'MADE ( Jon-Peer)': { actual: 0.00, budget: 120000.00, ytdActual: 837167.34, ytdBudget: 840000.00 },
    'LUXELINE': { actual: 0.00, budget: 120000.00, ytdActual: 0.00, ytdBudget: 400000.00 },
    'INTERNAL - Office': { actual: 0.00, budget: 0.00, ytdActual: -76269.45, ytdBudget: 0.00 }
  };

  // KPI 2: To Be Invoiced (Awaiting Stock) July-October Data
  const awaitingStockData = {
    'MODUS PROFESSIONAL ( Ryan )': { jul: 156092.95, aug: 104420.68, sep: 107901.00, oct: 0.00, target: 3400381.18 },
    'MOOD STORES': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 0.00 },
    'MODUS PROJECTS ( Dani )': { jul: 965820.18, aug: 365568.32, sep: 0.00, oct: 0.00, target: 3155386.31 },
    'PROJECTS (Dani own)': { jul: 47601.47, aug: 26894.90, sep: 0.00, oct: 0.00, target: 2641586.56 },
    'MODUS SIGNATURE ( Thando )': { jul: 282621.28, aug: 161708.00, sep: 732254.10, oct: 0.00, target: 0.00 },
    'MADE ( Jon-Peer)': { jul: 416666.67, aug: 0.00, sep: 0.00, oct: 0.00, target: 2832.66 },
    'LUXELINE': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 400000.00 },
    'INTERNAL - Office': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 76269.45 }
  };

  // KPI 3: Pipeline (PMs aim to secure project)
  const pipelineData = {
    'MODUS PROFESSIONAL ( Ryan )': { jul: 2584463.74, aug: 1916275.62, sep: 0.00, oct: 0.00, target: 3031966.55 },
    'MOOD STORES': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 0.00 },
    'MODUS PROJECTS ( Dani )': { jul: 1419953.11, aug: 1287526.84, sep: 0.00, oct: 23319.44, target: 1823997.81 },
    'PROJECTS (Dani own)': { jul: 18515.00, aug: 339220.92, sep: 0.00, oct: 0.00, target: 2567090.19 },
    'MODUS SIGNATURE ( Thando )': { jul: 857845.49, aug: 120060.00, sep: 0.00, oct: 0.00, target: -1176583.38 },
    'MADE ( Jon-Peer)': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: -413834.01 },
    'LUXELINE': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 400000.00 },
    'INTERNAL - Office': { jul: 0.00, aug: 0.00, sep: 0.00, oct: 0.00, target: 76269.45 }
  };

  // KPI 4: Annual totals combination
  const annualData = {
    'MODUS PROFESSIONAL ( Ryan )': { invoiced: 3561653.80, toInvoice: 368414.63, pipeline: 4500739.36, tbc: 363658.30, budget: 17000000.00 },
    'MOOD STORES': { invoiced: 0.00, toInvoice: 794644.08, pipeline: 0.00, tbc: 0.00, budget: 0.00 },
    'MODUS PROJECTS ( Dani )': { invoiced: 1404613.69, toInvoice: 1331388.50, pipeline: 2730799.39, tbc: 543861.85, budget: 16000000.00 },
    'PROJECTS (Dani own)': { invoiced: 158413.44, toInvoice: 74496.37, pipeline: 357735.92, tbc: 0.00, budget: 4000000.00 },
    'MODUS SIGNATURE ( Thando )': { invoiced: 699659.09, toInvoice: 1176583.38, pipeline: 977905.49, tbc: 102561.60, budget: 2500000.00 },
    'MADE ( Jon-Peer)': { invoiced: 837167.34, toInvoice: 416666.67, pipeline: 0.00, tbc: 0.00, budget: 2000000.00 },
    'LUXELINE': { invoiced: 0.00, toInvoice: 0.00, pipeline: 0.00, tbc: 0.00, budget: 1000000.00 },
    'INTERNAL - Office': { invoiced: -76269.45, toInvoice: 0.00, pipeline: 0.00, tbc: 0.00, budget: 0.00 }
  };

  // Stock Values
  const stockValues = [
    { label: 'Deadstock Value (stock > 120days)', current: 883579.86, target: 600000.00 },
    { label: 'Consignment Value (from 3.4mil)', current: 1269328.48, target: 1000000.00 },
    { label: 'Normal Stock Value (< 120days)', current: 232363.07, target: 500000.00 },
    { label: 'LED Stock Value', current: 875851.74, target: 300000.00 },
    { label: 'Stock Value', current: 3261123.14, target: 2400000.00 }
  ];

  // Helper formats
  const formatZar = (val) => {
    if (val === undefined || val === null) return 'R 0.00';
    return (val < 0 ? '-' : '') + 'R ' + Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getVarianceColor = (val, invert = false) => {
    if (val === 0) return 'var(--text-secondary)';
    const isGood = invert ? val < 0 : val > 0;
    return isGood ? '#10b981' : '#f43f5e';
  };

  // Sum helpers
  const sumFields = (data, field) => {
    return Object.values(data).reduce((acc, row) => acc + (row[field] || 0), 0);
  };

  const sumAwaitingStockTotal = (row) => row.jul + row.aug + row.sep + row.oct;
  const sumPipelineTotal = (row) => row.jul + row.aug + row.sep + row.oct;
  const sumAnnualTotal = (row) => row.invoiced + row.toInvoice + row.pipeline + row.tbc;

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
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            className="form-control" 
            style={{ width: '160px', height: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'inherit', padding: '0 10px', fontSize: '13px' }}
          >
            <option value="July">July (Active Month)</option>
            <option value="August">August</option>
            <option value="September">September</option>
            <option value="October">October</option>
          </select>
        </div>
      </div>

      {/* KPI TOP LEVEL SUMMARY CARDS */}
      <div className="stat-grid stat-grid-4" style={{ marginBottom: '28px' }}>
        <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>
            {formatZar(sumFields(invoicedData, 'actual'))}
          </div>
          <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Invoiced (July)</div>
        </div>
        <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
            {formatZar(Object.values(awaitingStockData).reduce((s, r) => s + r.jul, 0))}
          </div>
          <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Awaiting Stock (July)</div>
        </div>
        <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>
            {formatZar(Object.values(pipelineData).reduce((s, r) => s + r.jul, 0))}
          </div>
          <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Pipeline Target (July)</div>
        </div>
        <div className="stat" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700 }}>
            {formatZar(Object.values(annualData).reduce((s, r) => s + sumAnnualTotal(r), 0))}
          </div>
          <div className="stat-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '4px' }}>Total Projected Annual</div>
        </div>
      </div>

      {/* KPI 1: SALES INVOICED */}
      <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 1: Sales Invoiced (July)</div>
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
              {DIVISIONS.map((div) => {
                const row = invoicedData[div] || { actual: 0, budget: 0, ytdActual: 0, ytdBudget: 0 };
                const variance = row.actual - row.budget;
                const ytdVariance = row.ytdActual - row.ytdBudget;
                return (
                  <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.actual)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.budget)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.ytdActual)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.ytdBudget)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(ytdVariance) }}>{formatZar(ytdVariance)}</td>
                  </tr>
                );
              })}
              {/* TOTAL ROW */}
              <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                <td style={{ padding: '12px 16px' }}>TOTAL</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(invoicedData, 'actual'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(invoicedData, 'budget'))}</td>
                <td style={{ padding: '12px 16px', color: getVarianceColor(sumFields(invoicedData, 'actual') - sumFields(invoicedData, 'budget')) }}>
                  {formatZar(sumFields(invoicedData, 'actual') - sumFields(invoicedData, 'budget'))}
                </td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(invoicedData, 'ytdActual'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(invoicedData, 'ytdBudget'))}</td>
                <td style={{ padding: '12px 16px', color: getVarianceColor(sumFields(invoicedData, 'ytdActual') - sumFields(invoicedData, 'ytdBudget')) }}>
                  {formatZar(sumFields(invoicedData, 'ytdActual') - sumFields(invoicedData, 'ytdBudget'))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI 2: TO BE INVOICED */}
      <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 2: To Be Invoiced (Awaiting Stock)</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                <th style={{ padding: '12px 16px' }}>July</th>
                <th style={{ padding: '12px 16px' }}>August</th>
                <th style={{ padding: '12px 16px' }}>September</th>
                <th style={{ padding: '12px 16px' }}>October</th>
                <th style={{ padding: '12px 16px' }}>Total Pipeline</th>
                <th style={{ padding: '12px 16px' }}>Target</th>
                <th style={{ padding: '12px 16px' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {DIVISIONS.map((div) => {
                const row = awaitingStockData[div] || { jul: 0, aug: 0, sep: 0, oct: 0, target: 0 };
                const total = sumAwaitingStockTotal(row);
                const variance = total - row.target;
                return (
                  <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.jul)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.aug)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.sep)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.oct)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatZar(total)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.target)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                  </tr>
                );
              })}
              {/* TOTAL ROW */}
              <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                <td style={{ padding: '12px 16px' }}>TOTAL</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(awaitingStockData, 'jul'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(awaitingStockData, 'aug'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(awaitingStockData, 'sep'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(awaitingStockData, 'oct'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(awaitingStockData).reduce((s, r) => s + sumAwaitingStockTotal(r), 0))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(awaitingStockData, 'target'))}</td>
                <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(awaitingStockData).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) - sumFields(awaitingStockData, 'target')) }}>
                  {formatZar(Object.values(awaitingStockData).reduce((s, r) => s + sumAwaitingStockTotal(r), 0) - sumFields(awaitingStockData, 'target'))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI 3: PIPELINE */}
      <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KPI 3: Sales Pipeline Projections</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Division / Team Manager</th>
                <th style={{ padding: '12px 16px' }}>July</th>
                <th style={{ padding: '12px 16px' }}>August</th>
                <th style={{ padding: '12px 16px' }}>September</th>
                <th style={{ padding: '12px 16px' }}>October</th>
                <th style={{ padding: '12px 16px' }}>Total Pipeline</th>
                <th style={{ padding: '12px 16px' }}>Target</th>
                <th style={{ padding: '12px 16px' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {DIVISIONS.map((div) => {
                const row = pipelineData[div] || { jul: 0, aug: 0, sep: 0, oct: 0, target: 0 };
                const total = sumPipelineTotal(row);
                const variance = total - row.target;
                return (
                  <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.jul)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.aug)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.sep)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.oct)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{formatZar(total)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.target)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: getVarianceColor(variance) }}>{formatZar(variance)}</td>
                  </tr>
                );
              })}
              {/* TOTAL ROW */}
              <tr style={{ background: 'rgba(0,0,0,0.08)', fontWeight: 700 }}>
                <td style={{ padding: '12px 16px' }}>TOTAL</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(pipelineData, 'jul'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(pipelineData, 'aug'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(pipelineData, 'sep'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(pipelineData, 'oct'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(pipelineData).reduce((s, r) => s + sumPipelineTotal(r), 0))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(pipelineData, 'target'))}</td>
                <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(pipelineData).reduce((s, r) => s + sumPipelineTotal(r), 0) - sumFields(pipelineData, 'target')) }}>
                  {formatZar(Object.values(pipelineData).reduce((s, r) => s + sumPipelineTotal(r), 0) - sumFields(pipelineData, 'target'))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI 4: ANNUAL TOTALS */}
      <div className="card" style={{ marginBottom: '28px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
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
              {DIVISIONS.map((div) => {
                const row = annualData[div] || { invoiced: 0, toInvoice: 0, pipeline: 0, tbc: 0, budget: 0 };
                const total = sumAnnualTotal(row);
                const variance = total - row.budget;
                return (
                  <tr key={div} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{div}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.invoiced)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.toInvoice)}</td>
                    <td style={{ padding: '12px 16px' }}>{formatZar(row.pipeline)}</td>
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
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(annualData, 'invoiced'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(annualData, 'toInvoice'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(annualData, 'pipeline'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(annualData, 'tbc'))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(Object.values(annualData).reduce((s, r) => s + sumAnnualTotal(r), 0))}</td>
                <td style={{ padding: '12px 16px' }}>{formatZar(sumFields(annualData, 'budget'))}</td>
                <td style={{ padding: '12px 16px', color: getVarianceColor(Object.values(annualData).reduce((s, r) => s + sumAnnualTotal(r), 0) - sumFields(annualData, 'budget')) }}>
                  {formatZar(Object.values(annualData).reduce((s, r) => s + sumAnnualTotal(r), 0) - sumFields(annualData, 'budget'))}
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
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
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
                {stockValues.map((stock) => {
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
              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>KPI 4: Client Fault Tickets Status (July)</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#f43f5e' }}>4</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>New Faults</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#eab308' }}>23</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Open Faults (YTD)</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>5</div>
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
    </div>
  );
}
