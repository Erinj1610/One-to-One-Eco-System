import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  Calendar, Clock, Play, CheckCircle, Search, Plus, Layers, TrendingDown
} from 'lucide-react';

export default function DesignTracker() {
  const navigate = useNavigate();
  const { projects, updateProject, contacts, setContacts, logAttrition } = useStore();

  // Cancel Modal states
  const [cancelModalItem, setCancelModalItem] = useState(null); // { projectKey, clientName }
  const [lossReason, setLossReason] = useState('Price');
  const [lossNotes, setLossNotes] = useState('');

  // Modal create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeProject, setNewFeeProject] = useState('');
  const [newFeeDesigner, setNewFeeDesigner] = useState('Merlyn');
  const [newFeeType, setNewFeeType] = useState('Fixed Phase');
  const [newFeeTerms, setNewFeeTerms] = useState('30 days');
  const [newFeeSqm, setNewFeeSqm] = useState(1000);
  const [newFeeMargin, setNewFeeMargin] = useState(18);

  // Dashboard Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [pmFilter, setPmFilter] = useState('All PMs');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [offeringFilter, setOfferingFilter] = useState('All Offerings');
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null | 'all' | 'pending' | 'active' | 'collected'

  // Helper to update specific design fee field
  const updateDesignFeeField = (projectKey, feeId, fieldName, value) => {
    const project = projects[projectKey];
    if (!project) return;
    const updatedFees = (project.designFees || []).map(f => {
      if (f.id === feeId) {
        return { ...f, [fieldName]: value };
      }
      return f;
    });
    updateProject(projectKey, 'designFees', updatedFees);
  };

  // Aggregate design fee data for the tracker ledger (one row per design fee structure)
  const designRows = useMemo(() => {
    const rows = [];
    Object.values(projects).forEach(p => {
      const pDesignFees = p.designFees || [];
      pDesignFees.forEach(f => {
        const designFeeExcl = f.feeValue || 0;
        const designFeeIncl = Math.round(designFeeExcl * 1.15);
        const designFeePaid = f.paid || 0;
        const refundVal = p.refundAmount || 0;
        const designFeeOutstanding = Math.max(0, designFeeExcl - designFeePaid - refundVal);

        const productTotalExcl = p.productTotalExcl !== undefined ? p.productTotalExcl : (p.orders ? p.orders.reduce((sum, o) => sum + (o.costValue || 0), 0) : 0);
        const productTotalOutstanding = p.orders ? p.orders.reduce((sum, o) => sum + (o.outstanding || 0), 0) : 0;

        const feeSentDate = f.designFeeSentDate || f.feeTermsDate || p.designFeeSentDate || '—';
        const completedDateVal = p.completedDate || '—';
        const completionDaysVal = p.completionDays || '—';
        const isPaidInFull = p.paidInFull || ((designFeeOutstanding === 0 && productTotalOutstanding === 0) ? 'Yes' : 'No');
        const stillToReceiveVal = p.stillToReceive !== undefined ? p.stillToReceive : `R ${productTotalOutstanding.toLocaleString()}`;
        const prodApprovedVal = p.prodApproved || (p.orders && p.orders.length > 0 ? 'Yes' : 'No');

        rows.push({
          ...p,
          projectKey: p.key,
          projectName: p.name,
          projectClientName: p.client,
          // Design Specific Overrides
          feeId: f.id,
          feeName: f.name,
          leadDesigner: f.leadDesigner,
          feeType: f.feeType,
          feeTerms: f.feeTerms,
          feeStatus: f.feeStatus,
          phases: f.phases,

          // Columns Data
          designFeeExcl,
          designFeeIncl,
          designFeePaid,
          designFeeOutstanding,
          productTotalExcl,
          feeSentDate,
          completedDateVal,
          completionDaysVal,
          refundVal,
          isPaidInFull,
          stillToReceiveVal,
          prodApprovedVal
        });
      });
    });
    return rows;
  }, [projects]);

  // Parse date string helper
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date range checker
  const isRowInDateRange = (row) => {
    if (!startDate && !endDate) return true;
    const dateStr = row.start;
    if (!dateStr) return false;
    const pDate = parseDate(dateStr);
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

  // Apply Date Preset Range
  const applyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Last Week') {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(lastWeek));
      setEndDate(formatDate(today));
    } else if (preset === 'Last 30 Days') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(lastMonth));
      setEndDate(formatDate(today));
    } else if (preset === 'Financial Year') {
      const currentYear = today.getFullYear();
      setStartDate(`${currentYear}-03-01`);
      setEndDate(`${currentYear + 1}-02-28`);
    }
  };

  // Filter project rows based on inputs
  const filteredRows = useMemo(() => {
    return designRows.filter(row => {
      // Date Check
      if (!isRowInDateRange(row)) return false;

      // PM Filter
      if (pmFilter !== 'All PMs' && row.pm !== pmFilter) return false;

      // Status Filter
      if (statusFilter !== 'All Statuses') {
        if (row.status !== statusFilter) return false;
      }

      // Offering Filter
      if (offeringFilter !== 'All Offerings' && row.offering !== offeringFilter) return false;

      // KPI interactive filter matching
      if (activeKpiFilter) {
        if (activeKpiFilter === 'pending' && row.status !== 'Off track' && row.delay === '—') return false;
        if (activeKpiFilter === 'active' && row.complete === 'Complete') return false;
        if (activeKpiFilter === 'collected' && row.isPaidInFull !== 'Yes') return false;
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = 
          row.projectName.toLowerCase().includes(q) ||
          row.projectClientName.toLowerCase().includes(q) ||
          row.pm.toLowerCase().includes(q) ||
          row.offering.toLowerCase().includes(q) ||
          (row.feeName && row.feeName.toLowerCase().includes(q)) ||
          (row.feeId && row.feeId.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [designRows, pmFilter, statusFilter, offeringFilter, activeKpiFilter, searchQuery, startDate, endDate]);

  // Compute KPI summaries dynamically
  const kpiData = useMemo(() => {
    let totalExVAT = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalCount = 0;

    let pendingCount = 0;
    let pendingVal = 0;
    let pendingPaid = 0;
    let pendingOutstanding = 0;

    let activeCount = 0;
    let activeVal = 0;
    let activePaid = 0;
    let activeOutstanding = 0;

    let collectedCount = 0;
    let collectedVal = 0;

    designRows.forEach(row => {
      if (!isRowInDateRange(row)) return;

      const val = row.designFeeExcl || 0;
      const paid = row.designFeePaid || 0;
      const out = row.designFeeOutstanding || 0;

      totalCount++;
      totalExVAT += val;
      totalPaid += paid;
      totalOutstanding += out;

      // Pending (if project is off track or awaiting approval)
      if (row.status === 'Off track' || row.delay !== '—') {
        pendingCount++;
        pendingVal += val;
        pendingPaid += paid;
        pendingOutstanding += out;
      }

      // Active (Ongoing projects)
      if (row.complete !== 'Complete') {
        activeCount++;
        activeVal += val;
        activePaid += paid;
        activeOutstanding += out;
      }

      // Collected (Completed and Paid in Full)
      if (row.isPaidInFull === 'Yes' || row.complete === 'Complete') {
        collectedCount++;
        collectedVal += paid;
      }
    });

    return {
      total: { qty: totalCount, val: totalExVAT, paid: totalPaid, out: totalOutstanding },
      pending: { qty: pendingCount, val: pendingVal, paid: pendingPaid, out: pendingOutstanding },
      active: { qty: activeCount, val: activeVal, paid: activePaid, out: activeOutstanding },
      collected: { qty: collectedCount, val: collectedVal }
    };
  }, [designRows, startDate, endDate]);

  // Handle open workspace row click -> navigate to design tab in project
  const handleRowClick = (row) => {
    navigate(`/projects/${row.projectKey}`, {
      state: {
        activeTab: 'design',
        selectedDesignFeeId: row.feeId
      }
    });
  };

  // Create new structure action
  const handleCreateNewFeeStructure = () => {
    if (!newFeeName || !newFeeProject) {
      alert("Please enter a name and select a linked project.");
      return;
    }

    const selectedProj = projects[newFeeProject];
    if (!selectedProj) return;

    const baseNum = designRows.length + 1;
    const newId = `DF-2025-00${baseNum}`;

    const newFeeObj = {
      id: newId,
      name: newFeeName,
      company: selectedProj.client || 'Venter Architects',
      projectName: selectedProj.name || 'Upper Primrose',
      leadDesigner: newFeeDesigner,
      feeType: newFeeType,
      feeTerms: newFeeTerms,
      sqm: Number(newFeeSqm) || 1000,
      feeValue: 45000,
      amountInvoiced: 27000,
      paid: 0,
      outstanding: 27000,
      margin: Number(newFeeMargin) || 18,
      status: 'WIP',
      feeStatus: 'Concept Phase',
      files: [],
      phases: [
        {
          phase: 'PHASE 1 CONCEPT',
          serviceCode: 'DS-001A',
          description: 'Moodboards & Space Planning Layout',
          estHours: 15,
          hourlyRate: 1800,
          phaseFee: 27000,
          actHours: 10,
          totalValue: 18000,
          billedFee: 27000,
          unbilledFee: 0,
          progress: 100,
          nextMilestone: 'Concept Design'
        }
      ]
    };

    const existingFees = selectedProj.designFees || [];
    const updatedFees = [...existingFees, newFeeObj];
    updateProject(newFeeProject, 'designFees', updatedFees);

    setShowCreateModal(false);
    setNewFeeName('');
    setNewFeeProject('');
    
    setTimeout(() => {
      handleRowClick({
        projectKey: newFeeProject,
        feeId: newFeeObj.id
      });
    }, 100);
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTIONS FOR STICKY FIRST COLUMN AND SPREADSHEET INPUTS */}
      <style>{`
        .gs-cell-input {
          width: 100% !important;
          height: 100% !important;
          min-height: 34px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          padding: 6px 8px !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          font-family: inherit !important;
          outline: none !important;
          transition: box-shadow 0.1s ease, background-color 0.1s ease !important;
        }
        .gs-cell-input:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
        .gs-cell-select {
          width: 100% !important;
          height: 100% !important;
          min-height: 34px !important;
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
          cursor: pointer;
        }
        .gs-cell-select:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
        .active-kpi-card {
          border: 2px solid var(--text-info) !important;
          box-shadow: 0 4px 12px rgba(24,95,165,0.08) !important;
        }
        .tracker-table th.sticky-project,
        .tracker-table td.sticky-project {
          position: sticky;
          left: 0;
          background: var(--bg-primary);
          z-index: 10;
          border-right: 1.5px solid var(--border) !important;
          box-shadow: 2px 0 5px rgba(0,0,0,0.04);
        }
        .tracker-table th.sticky-project {
          background: var(--bg-secondary) !important;
          z-index: 11;
        }
        .tracker-table tr:hover td.sticky-project {
          background: var(--bg-secondary) !important;
        }
        .sticky-project.clickable:hover div:first-child {
          color: var(--text-info) !important;
          text-decoration: underline !important;
        }
        .gs-cell-select option {
          background-color: var(--bg-primary);
          color: var(--text-primary);
        }
      `}</style>

      {/* DASHBOARD VIEW */}
      {/* HEADER BANNER */}
      <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Design Suite</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Professional Service Fee Management</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              📐 Design Fee Tracker Dashboard
            </h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Create Fee Structure
          </button>
        </div>
      </div>

      {/* DATE RANGE FILTER ROW */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Calendar size={15} color="var(--text-info)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter Fees by Date:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', height: 'auto', fontSize: '11px', borderRadius: '6px' }}
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
            style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
          <input
            type="date"
            className="form-control"
            style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
          />
        </div>
      </div>

      {/* 4-KPI STATS GRID */}
      <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
        {/* KPI 1: TOTAL DESIGN FEES */}
        <div 
          className={`stat clickable ${activeKpiFilter === 'all' ? 'active-kpi-card' : ''}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all')}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Design Fees</span>
            <Layers size={15} color="var(--text-info)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpiData.total.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-info)', marginTop: '2px' }}>
            R {kpiData.total.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Paid: <strong>R {kpiData.total.paid.toLocaleString()}</strong></span>
            <span>Outstanding: <strong>R {kpiData.total.out.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* KPI 2: PENDING INVOICES */}
        <div 
          className={`stat clickable ${activeKpiFilter === 'pending' ? 'active-kpi-card' : ''}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'pending' ? null : 'pending')}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Invoices</span>
            <Clock size={15} color="var(--text-warning)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpiData.pending.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-warning)', marginTop: '2px' }}>
            R {kpiData.pending.out.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Paid: <strong>R {kpiData.pending.paid.toLocaleString()}</strong></span>
            <span>Outstanding: <strong>R {kpiData.pending.out.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* KPI 3: ACTIVE PROJECT FEES */}
        <div 
          className={`stat clickable ${activeKpiFilter === 'active' ? 'active-kpi-card' : ''}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Active Project Fees</span>
            <Play size={15} color="var(--text-success)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpiData.active.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-success)', marginTop: '2px' }}>
            R {kpiData.active.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Paid: <strong>R {kpiData.active.paid.toLocaleString()}</strong></span>
            <span>Outstanding: <strong>R {kpiData.active.out.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* KPI 4: COLLECTED FEES */}
        <div 
          className={`stat clickable ${activeKpiFilter === 'collected' ? 'active-kpi-card' : ''}`}
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'collected' ? null : 'collected')}
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Collected Fees</span>
            <CheckCircle size={15} color="var(--text-success)" style={{ stroke: 'var(--text-success)' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {kpiData.collected.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
            R {kpiData.collected.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
          </div>
          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Paid: <strong>R {kpiData.collected.val.toLocaleString()}</strong></span>
            <span>Outstanding: <strong>R 0</strong></span>
          </div>
        </div>
      </div>

      {/* FILTER AND CONTROL BAR */}
      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text"
                placeholder="Search by project name, client, or PM..."
                className="form-control"
                style={{ paddingLeft: '34px', height: '34px', fontSize: '12.5px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-control"
              style={{ width: '130px', height: '34px', fontSize: '12.5px' }}
              value={pmFilter}
              onChange={e => setPmFilter(e.target.value)}
            >
              <option>All PMs</option>
              <option>Dani</option>
              <option>Martin</option>
              <option>Alex</option>
              <option>Sarah</option>
            </select>

            <select
              className="form-control"
              style={{ width: '140px', height: '34px', fontSize: '12.5px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option>All Statuses</option>
              <option>On track</option>
              <option>Off track</option>
            </select>

            <select
              className="form-control"
              style={{ width: '160px', height: '34px', fontSize: '12.5px' }}
              value={offeringFilter}
              onChange={e => setOfferingFilter(e.target.value)}
            >
              <option>All Offerings</option>
              <option>Signature</option>
              <option>Modus</option>
              <option>Professional</option>
            </select>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Showing <strong>{filteredRows.length}</strong> active project records
          </div>
        </div>

        {/* LEDGER TABLE */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <table className="table tracker-table" style={{ margin: 0, fontSize: '11.5px', borderCollapse: 'collapse', width: '100%', minWidth: '2400px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-strong)' }}>
                <th className="sticky-project" style={{ padding: '10px 12px', width: '180px' }}>Project</th>
                <th style={{ width: '110px' }}>Offering</th>
                <th style={{ textAlign: 'right', width: '80px' }}>SQM</th>
                <th style={{ width: '90px' }}>PM</th>
                <th style={{ width: '110px' }}>Stage</th>
                <th style={{ width: '140px' }}>Design Fee Sent Date</th>
                <th style={{ textAlign: 'right', width: '150px' }}>Design Fee Total EXCL. VAT</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Design Fee Total INCL. VAT</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Design Fee Paid</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Refund Amount EXCL. VAT</th>
                <th style={{ textAlign: 'right', width: '140px' }}>Design Fee Outstanding</th>
                <th style={{ textAlign: 'right', width: '150px' }}>Estimated Product Total EXCL. VAT</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Product Approved</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Project Paid in Full</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Still to receive</th>
                <th style={{ width: '110px' }}>Design Start</th>
                <th style={{ width: '110px' }}>Deadline</th>
                <th style={{ width: '110px' }}>Actual Date Completed</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Days left to deadline</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Completion Days</th>
                <th style={{ textAlign: 'center', width: '95px' }}>Status</th>
                <th style={{ width: '180px' }}>Delay Reason</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Complete/Ongoing</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                return (
                  <tr key={row.feeId}>
                    {/* 1. Project - CLICKABLE LINK */}
                    <td 
                      className="sticky-project clickable" 
                      style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-info)', cursor: 'pointer' }}
                      onClick={() => handleRowClick(row)}
                    >
                      <div style={{ textDecoration: 'underline', textDecorationColor: 'rgba(24,95,165,0.3)' }}>{row.projectName}</div>
                      <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {row.feeName} ({row.feeId})
                      </div>
                    </td>

                    {/* 2. Offering */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        value={row.offering || ''}
                        onChange={e => updateProject(row.projectKey, 'offering', e.target.value)}
                      >
                        <option value="Signature">Signature</option>
                        <option value="Modus">Modus</option>
                        <option value="Professional">Professional</option>
                      </select>
                    </td>

                    {/* 3. SQM */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="number"
                        className="gs-cell-input"
                        style={{ textAlign: 'right' }}
                        value={row.sqm || 0}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          updateProject(row.projectKey, 'sqm', val);
                          updateDesignFeeField(row.projectKey, row.feeId, 'sqm', val);
                        }}
                      />
                    </td>

                    {/* 4. PM */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        value={row.pm || ''}
                        onChange={e => updateProject(row.projectKey, 'pm', e.target.value)}
                      >
                        <option value="Dani">Dani</option>
                        <option value="Martin">Martin</option>
                        <option value="Alex">Alex</option>
                        <option value="Sarah">Sarah</option>
                      </select>
                    </td>

                    {/* 5. Stage */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        value={row.stage || ''}
                        onChange={e => updateProject(row.projectKey, 'stage', e.target.value)}
                      >
                        {['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Snags/Site visit','Ongoing','Complete'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* 6. Design Fee Sent Date */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        value={row.feeSentDate === '—' ? '' : row.feeSentDate}
                        placeholder="—"
                        onChange={e => {
                          updateDesignFeeField(row.projectKey, row.feeId, 'designFeeSentDate', e.target.value);
                        }}
                      />
                    </td>

                    {/* 7. Design Fee Total EXCL. VAT */}
                    <td style={{ padding: 0 }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                        <input
                          type="number"
                          className="gs-cell-input"
                          style={{ textAlign: 'right', paddingLeft: '18px', fontWeight: 600 }}
                          value={row.designFeeExcl || 0}
                          onChange={e => {
                            updateDesignFeeField(row.projectKey, row.feeId, 'feeValue', Number(e.target.value) || 0);
                          }}
                        />
                      </div>
                    </td>

                    {/* 8. Design Fee Total INCL. VAT (Calculated) */}
                    <td style={{ textAlign: 'right', padding: '6px 12px', color: 'var(--text-secondary)' }}>
                      R {row.designFeeIncl.toLocaleString()}
                    </td>

                    {/* 9. Design Fee Paid */}
                    <td style={{ padding: 0 }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                        <input
                          type="number"
                          className="gs-cell-input"
                          style={{ textAlign: 'right', paddingLeft: '18px', color: 'var(--text-success)' }}
                          value={row.designFeePaid || 0}
                          onChange={e => {
                            updateDesignFeeField(row.projectKey, row.feeId, 'paid', Number(e.target.value) || 0);
                          }}
                        />
                      </div>
                    </td>

                    {/* 10. Refund Amount EXCL. VAT */}
                    <td style={{ padding: 0 }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                        <input
                          type="number"
                          className="gs-cell-input"
                          style={{ textAlign: 'right', paddingLeft: '18px', color: row.refundVal > 0 ? 'var(--text-danger)' : 'var(--text-primary)' }}
                          value={row.refundVal || 0}
                          onChange={e => {
                            updateProject(row.projectKey, 'refundAmount', Number(e.target.value) || 0);
                          }}
                        />
                      </div>
                    </td>

                    {/* 11. Design Fee Outstanding (Calculated) */}
                    <td style={{ textAlign: 'right', padding: '6px 12px', color: row.designFeeOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      R {row.designFeeOutstanding.toLocaleString()}
                    </td>

                    {/* 12. Estimated Product Total EXCL. VAT */}
                    <td style={{ padding: 0 }}>
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '8px', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                        <input
                          type="number"
                          className="gs-cell-input"
                          style={{ textAlign: 'right', paddingLeft: '18px' }}
                          value={row.productTotalExcl || 0}
                          onChange={e => {
                            updateProject(row.projectKey, 'productTotalExcl', Number(e.target.value) || 0);
                          }}
                        />
                      </div>
                    </td>

                    {/* 13. Product Approved */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        style={{ textAlign: 'center' }}
                        value={row.prodApprovedVal || ''}
                        onChange={e => updateProject(row.projectKey, 'prodApproved', e.target.value)}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="TBC">TBC</option>
                      </select>
                    </td>

                    {/* 14. Project Paid in Full */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        style={{ textAlign: 'center', fontWeight: 600, color: row.isPaidInFull === 'Yes' ? 'var(--text-success)' : 'var(--text-warning)' }}
                        value={row.isPaidInFull || ''}
                        onChange={e => updateProject(row.projectKey, 'paidInFull', e.target.value)}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>

                    {/* 15. Still to receive */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        style={{ textAlign: 'right' }}
                        value={row.stillToReceiveVal}
                        onChange={e => {
                          updateProject(row.projectKey, 'stillToReceive', e.target.value);
                        }}
                      />
                    </td>

                    {/* 16. Design Start */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        value={row.start === '—' ? '' : row.start}
                        placeholder="—"
                        onChange={e => {
                          updateProject(row.projectKey, 'start', e.target.value);
                        }}
                      />
                    </td>

                    {/* 17. Deadline */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        value={row.deadline === '—' ? '' : row.deadline}
                        placeholder="—"
                        onChange={e => {
                          updateProject(row.projectKey, 'deadline', e.target.value);
                        }}
                      />
                    </td>

                    {/* 18. Actual Date Completed */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        value={row.completedDateVal === '—' ? '' : row.completedDateVal}
                        placeholder="—"
                        onChange={e => {
                          updateProject(row.projectKey, 'completedDate', e.target.value);
                        }}
                      />
                    </td>

                    {/* 19. Days left to deadline */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        style={{ 
                          textAlign: 'center', 
                          fontWeight: 500, 
                          color: (row.daysLeft || '—').startsWith('−') || (row.daysLeft || '—').startsWith('-') ? 'var(--text-danger)' : 'var(--text-primary)' 
                        }}
                        value={row.daysLeft === '—' ? '' : row.daysLeft}
                        placeholder="—"
                        onChange={e => {
                          updateProject(row.projectKey, 'daysLeft', e.target.value);
                        }}
                      />
                    </td>

                    {/* 20. Completion Days */}
                    <td style={{ padding: 0 }}>
                      <input
                        type="text"
                        className="gs-cell-input"
                        style={{ textAlign: 'right' }}
                        value={row.completionDaysVal === '—' ? '' : row.completionDaysVal}
                        placeholder="—"
                        onChange={e => {
                          updateProject(row.projectKey, 'completionDays', e.target.value);
                        }}
                      />
                    </td>

                    {/* 21. Status */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        style={{ textAlign: 'center', fontWeight: 600, color: row.status === 'On track' ? 'var(--text-success)' : row.status === 'Cancelled' ? 'var(--text-secondary)' : 'var(--text-danger)' }}
                        value={row.status || ''}
                        onChange={e => {
                          if (e.target.value === 'Cancelled') {
                            setCancelModalItem({
                              projectKey: row.projectKey,
                              clientName: row.projectClientName
                            });
                          } else {
                            updateProject(row.projectKey, 'status', e.target.value);
                          }
                        }}
                      >
                        <option value="On track">On track</option>
                        <option value="Off track">Off track</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* 22. Delay Reason */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        value={row.delay || ''}
                        onChange={e => updateProject(row.projectKey, 'delay', e.target.value)}
                      >
                        {['—','Awaiting feedback/approval','Complex design iteration/rework required','Unforeseen technical challenges','Incomplete project requirements','Snags/Site visit','Other'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* 23. Complete/Ongoing */}
                    <td style={{ padding: 0 }}>
                      <select
                        className="gs-cell-select"
                        style={{ textAlign: 'center' }}
                        value={row.complete || ''}
                        onChange={e => updateProject(row.projectKey, 'complete', e.target.value)}
                      >
                        <option value="Ongoing">Ongoing</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </td>

                    {/* 24. Actions */}
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      {row.status !== 'Cancelled' && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '2px 6px',
                            fontSize: '11px',
                            color: 'var(--text-danger)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'rgba(239,68,68,0.02)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => {
                            setCancelModalItem({
                              projectKey: row.projectKey,
                              clientName: row.projectClientName
                            });
                          }}
                        >
                          <TrendingDown size={11} /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={24} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                    No projects found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW STRUCTURE MODAL */}
      {showCreateModal && (
        <div className="modal-bg active" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '520px', padding: '20px' }}>
            <div className="modal-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📋 Create New Design Fee Structure</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <div className="form-row">
                <label className="form-label">Fee Structure Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Master Residence Design Fee" 
                  className="form-control"
                  value={newFeeName}
                  onChange={e => setNewFeeName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label className="form-label">Linked Project</label>
                <select 
                  className="form-control"
                  value={newFeeProject}
                  onChange={e => setNewFeeProject(e.target.value)}
                >
                  <option value="">Select a project...</option>
                  {Object.values(projects).map(p => (
                    <option key={p.key} value={p.key}>{p.name} ({p.client})</option>
                  ))}
                </select>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Lead Designer</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={newFeeDesigner}
                    onChange={e => setNewFeeDesigner(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Fee Type</label>
                  <select 
                    className="form-control"
                    value={newFeeType}
                    onChange={e => setNewFeeType(e.target.value)}
                  >
                    <option>Fixed Phase</option>
                    <option>Fixed-Fee (by Phase)</option>
                    <option>Hourly WIP</option>
                    <option>Percentage of BOQ</option>
                  </select>
                </div>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Fee Terms</label>
                  <select 
                    className="form-control"
                    value={newFeeTerms}
                    onChange={e => setNewFeeTerms(e.target.value)}
                  >
                    <option>30 days</option>
                    <option>15 days</option>
                    <option>COD</option>
                    <option>Immediate</option>
                  </select>
                </div>
                <div className="row-2" style={{ gap: '6px' }}>
                  <div>
                    <label className="form-label">SQM</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={newFeeSqm}
                      onChange={e => setNewFeeSqm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Margin %</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={newFeeMargin}
                      onChange={e => setNewFeeMargin(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateNewFeeStructure}>Create Structure</button>
            </div>
          </div>
        </div>
      )}

      {cancelModalItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', borderRadius: '12px', width: '450px', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Project/Design Attrition</h3>
              <button className="modal-close" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }} onClick={() => setCancelModalItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                <strong>Post-Mortem Policy:</strong> Before marking this design project as Cancelled, you must log the exact friction reason. This data feeds directly into our Attrition Analytics to help leadership retain key partnerships.
              </div>
              
              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Client Name</label>
                <input className="form-control" readOnly style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} value={cancelModalItem.clientName || ''} />
              </div>

              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Attrition Primary Reason</label>
                <select className="form-control" style={{ width: '100%' }} value={lossReason} onChange={e => setLossReason(e.target.value)}>
                  <option value="Price">Price Resistance / Budget caps</option>
                  <option value="PM friction">Project Manager friction / Handoff delays</option>
                  <option value="Competitor">Competitor (cheaper/local packaging)</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Detailed Post-Mortem Notes</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  required
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="Log detail: Why are we losing them? What could we have done differently?"
                  value={lossNotes}
                  onChange={e => setLossNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setCancelModalItem(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={!lossNotes.trim()}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444', borderColor: '#ef4444', color: 'white', cursor: 'pointer' }}
                onClick={() => {
                  const { projectKey, clientName } = cancelModalItem;
                  
                  // 1. Set project status to Cancelled
                  updateProject(projectKey, 'status', 'Cancelled');
                  
                  // 2. Resolve or log attrition
                  const contact = contacts.find(c => c.name === clientName);
                  const clientId = contact ? contact.id : Date.now();
                  logAttrition(clientId, clientName, lossReason, lossNotes);

                  // 3. Mark client contact as Inactive (Lost)
                  setContacts(prev => prev.map(c => {
                    if (c.name === clientName) {
                      return { 
                        ...c, 
                        status: 'Inactive', 
                        lastContactDate: '2026-05-19', 
                        lastContactSummary: `Post-Mortem: Project cancelled due to ${lossReason}` 
                      };
                    }
                    return c;
                  }));
                  
                  setCancelModalItem(null);
                  setLossNotes('');
                }}
              >
                Log Post-Mortem & Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
