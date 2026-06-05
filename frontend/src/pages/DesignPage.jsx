import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Save, TrendingUp, AlertCircle, Plus, Search, ArrowLeft, 
  Edit3, Filter, CheckCircle, FileSpreadsheet, AlertTriangle, 
  Printer, FileText, DollarSign, Layers, ChevronRight, Sparkles, ClipboardList,
  Calendar, Clock, Play
} from 'lucide-react';

const PHI_ADVISORIES = {
  design: {
    author: "Aristotle (Nicomachean Ethics)",
    quote: "Beauty in art and architecture is found in the right proportions—neither too much nor too little.",
    advice: "Proportional Scope Costing. Ensure your design sub-project calculator balances Experiential Living rates (R180/m²) against non-experiential layout buffers. Under-scoping design capacity represents the principal bottleneck to project quality."
  }
};

const statusColor = { 
  Approved: 'b-success', 
  Draft: 'b-default', 
  'In Review': 'b-warning' 
};

// Rate card configuration from spec
const RATE_CARD = {
  ExperientialLiving: { concept: 180, schematic: 144, final: 117 },
  SecondaryLiving: { concept: 105, schematic: 84, final: 68.25 },
  NonExperiential: { concept: 30, schematic: 24, final: 19.50 },
  ExperientialLandscape: { concept: 140, schematic: 112, final: 91 },
  SecondaryLandscape: { concept: 55, schematic: 44, final: 35.75 }
};

export default function DesignPage() {
  const { projects, updateProject, contacts } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Workspace active values
  const [activeFeeName, setActiveFeeName] = useState('');
  const [activeFeeSqm, setActiveFeeSqm] = useState(1000);
  const [feeStatus, setFeeStatus] = useState('Draft');
  const [feePaidAmount, setFeePaidAmount] = useState(0);

  // Form registration details
  const [clientCompany, setClientCompany] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [projectFullName, setProjectFullName] = useState('');
  const [projectTier, setProjectTier] = useState('Signature');
  const [targetMargin, setTargetMargin] = useState(18);
  const [actualMargin, setActualMargin] = useState(18);
  const [oneOneRep, setOneOneRep] = useState('Martin Döller');
  const [pmName, setPmName] = useState('Dani');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null | 'all' | 'pending' | 'active' | 'complete'

  // Workspace View State (BOQ Spreadsheet vs Document Generator)
  const [workspaceSubTab, setWorkspaceSubTab] = useState('calculator'); // 'calculator' | 'files'
  const [showCalculatorBuilder, setShowCalculatorBuilder] = useState(false);
  const [showRegForm, setShowRegForm] = useState(true);

  // Stages breakdown settings
  const [includeConcept, setIncludeConcept] = useState(true);
  const [includeSchematic, setIncludeSchematic] = useState(true);
  const [includeFinal, setIncludeFinal] = useState(true);

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

  // Aggregate all design fees from projects
  const allFees = useMemo(() => {
    const list = [];
    Object.values(projects).forEach(p => {
      if (p.designFees) {
        p.designFees.forEach(f => {
          list.push({
            ...f,
            projectKey: p.key,
            projectName: p.name,
            projectClient: p.client,
            pmName: p.pm,
            projectStart: p.start
          });
        });
      }
    });
    return list;
  }, [projects]);

  // Sync state from project context or direct navigation
  useEffect(() => {
    if (location.state?.projectKey) {
      setProjectFilterKey(location.state.projectKey);
    }
    if (location.state?.openFeeId) {
      const targetFee = allFees.find(f => f.id === location.state.openFeeId);
      if (targetFee) {
        handleOpenWorkspace(targetFee);
      }
    }
  }, [location.state, allFees]);

  // Filter design fees by Date Preset/Range
  const dateFilteredFees = useMemo(() => {
    return allFees.filter(f => isDateInRange(f.date || f.projectStart));
  }, [allFees, startDate, endDate]);

  // Dynamic KPI Metrics calculations (All, Pending, Active, Complete)
  const kpis = useMemo(() => {
    const getGroupMetrics = (groupList) => {
      const value = groupList.reduce((sum, f) => sum + (f.feeValue || 0), 0);
      const paid = groupList.reduce((sum, f) => sum + (f.paid || 0), 0);
      const outstanding = Math.max(0, value - paid);
      return {
        qty: groupList.length,
        value,
        paid,
        outstanding
      };
    };

    const allGroup = dateFilteredFees;
    const pendingGroup = dateFilteredFees.filter(f => f.status === 'Draft' || f.status === 'In Review');
    const activeGroup = dateFilteredFees.filter(f => f.status === 'Approved' && (f.outstanding || 0) > 0);
    const completeGroup = dateFilteredFees.filter(f => f.status === 'Approved' && (f.outstanding || 0) <= 0);

    return {
      all: getGroupMetrics(allGroup),
      pending: getGroupMetrics(pendingGroup),
      active: getGroupMetrics(activeGroup),
      complete: getGroupMetrics(completeGroup)
    };
  }, [dateFilteredFees]);

  const filteredFees = useMemo(() => {
    return dateFilteredFees.filter(f => {
      const matchesSearch = 
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = filterStatus === 'All' || f.status === filterStatus;
      const matchesProject = projectFilterKey === 'All' || f.projectKey === projectFilterKey;
      
      // KPI interactive filter matching
      let matchesKpi = true;
      if (activeKpiFilter === 'all') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = f.status === 'Draft' || f.status === 'In Review';
      } else if (activeKpiFilter === 'active') {
        matchesKpi = f.status === 'Approved' && (f.outstanding || 0) > 0;
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = f.status === 'Approved' && (f.outstanding || 0) <= 0;
      }

      return matchesSearch && matchesStatus && matchesProject && matchesKpi;
    });
  }, [dateFilteredFees, searchQuery, filterStatus, projectFilterKey, activeKpiFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalCount = allFees.length;
    const totalValue = allFees.reduce((sum, f) => sum + (f.feeValue || 0), 0);
    const totalPaid = allFees.reduce((sum, f) => sum + (f.paid || 0), 0);
    const totalOutstanding = totalValue - totalPaid;
    const avgMargin = totalCount > 0 
      ? Math.round(allFees.reduce((sum, f) => sum + (f.margin || 18), 0) / totalCount)
      : 18;

    return {
      totalCount,
      totalValue,
      totalPaid,
      totalOutstanding,
      avgMargin
    };
  }, [allFees]);

  const handleOpenWorkspace = (fee) => {
    setSelectedFeeId(fee.id);
    setSelectedProjectKey(fee.projectKey);
    setActiveFeeName(fee.name || 'Main Residence Design Fee');
    setActiveFeeSqm(fee.sqm || 1000);
    setFeeStatus(fee.status || 'Draft');
    setFeePaidAmount(fee.paid || 0);

    const proj = projects[fee.projectKey] || {};
    setClientCompany(proj.client || '');
    setClientContact(proj.client || '');
    setProjectFullName(proj.name || '');
    setProjectTier(proj.offering || 'Signature');
    setTargetMargin(proj.targetMargin || 18);
    setActualMargin(fee.margin || 18);
    setPmName(proj.pm || 'Dani');
    setWorkspaceSubTab('calculator');
    setShowCalculatorBuilder(false);
  };

  // Dynamic calculation block for the fee statement builder
  const calculatorBreakdown = useMemo(() => {
    const sqm = Number(activeFeeSqm) || 0;
    
    // Living areas zoning metric breakdown
    const expLiving = Math.round(sqm * 0.3);
    const secLiving = Math.round(sqm * 0.6);
    const nonExp = Math.round(sqm * 0.1);

    // Concept stage
    const conceptSum = includeConcept ? (
      (expLiving * RATE_CARD.ExperientialLiving.concept) +
      (secLiving * RATE_CARD.SecondaryLiving.concept) +
      (nonExp * RATE_CARD.NonExperiential.concept)
    ) : 0;

    // Schematic stage
    const schematicSum = includeSchematic ? (
      (expLiving * RATE_CARD.ExperientialLiving.schematic) +
      (secLiving * RATE_CARD.SecondaryLiving.schematic) +
      (nonExp * RATE_CARD.NonExperiential.schematic)
    ) : 0;

    // Final design stage
    const finalSum = includeFinal ? (
      (expLiving * RATE_CARD.ExperientialLiving.final) +
      (secLiving * RATE_CARD.SecondaryLiving.final) +
      (nonExp * RATE_CARD.NonExperiential.final)
    ) : 0;

    const subTotal = conceptSum + schematicSum + finalSum;

    return {
      expLiving,
      secLiving,
      nonExp,
      conceptSum,
      schematicSum,
      finalSum,
      subTotal
    };
  }, [activeFeeSqm, includeConcept, includeSchematic, includeFinal]);

  const handleSaveFeeWorkspace = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    const newCalculatedValue = calculatorBreakdown.subTotal;
    const balanceOutstanding = Math.max(0, newCalculatedValue - feePaidAmount);

    const updatedFees = (proj.designFees || []).map(f => {
      if (f.id === selectedFeeId) {
        return {
          ...f,
          name: activeFeeName,
          sqm: activeFeeSqm,
          feeValue: newCalculatedValue,
          paid: feePaidAmount,
          outstanding: balanceOutstanding,
          margin: actualMargin,
          status: feeStatus
        };
      }
      return f;
    });

    updateProject(selectedProjectKey, 'designFees', updatedFees);

    // Trigger blended margin update
    const designTotal = updatedFees.reduce((s, f) => s + (f.feeValue || 0), 0);
    const orderTotal = (proj.orders || []).reduce((s, o) => s + (o.value || 0), 0);
    const contractTotal = designTotal + orderTotal;
    
    const designMarginValue = updatedFees.reduce((s, f) => s + ((f.feeValue || 0) * ((f.margin || 20) / 100)), 0);
    const orderMarginValue = (proj.orders || []).reduce((s, o) => s + ((o.value || 0) - (o.costValue || 0)), 0);
    const totalProfit = designMarginValue + orderMarginValue;
    const blendedMargin = contractTotal > 0 ? Math.round((totalProfit / contractTotal) * 100) : 18;

    updateProject(selectedProjectKey, 'actualMargin', blendedMargin);

    alert(`Design Fee Workspace Synced!\n- Adjusted Design Value: R ${newCalculatedValue.toLocaleString()}\n- Paid Amount: R ${feePaidAmount.toLocaleString()}\n- Project blended margin recalculated to ${blendedMargin}%.`);
    setSelectedFeeId(null);
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* HEADER BANNER */}
      {selectedFeeId === null ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Design Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Central Design Fee Calculator & Deliverables Workspace</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Standalone Design Fees & CAD Module
                </h1>
              </div>
            </div>
          </div>

          {/* Date range filter banner */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Calendar size={15} color="var(--text-info)" />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Filter Design Fees by Date:</span>
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
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>All Design Fees</span>
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
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Design</span>
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
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Design</span>
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
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Complete Design</span>
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

          {/* LEDGER OVERVIEW LIST */}
          <div className="card" style={{ border: '1.5px solid var(--border)' }}>
            <div className="card-body" style={{ padding: '20px' }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text"
                      placeholder="Search by fee ref, project name, or sub-fee title..."
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
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
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
              </div>

              {/* TABLE */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>DF#</th>
                      <th>Design Fee Name</th>
                      <th>Project Name</th>
                      <th>Client Name</th>
                      <th>Design Value Ex. Vat</th>
                      <th>Amount Paid</th>
                      <th>Amount Outstanding</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map(f => (
                      <tr key={f.id} className="clickable" onClick={() => handleOpenWorkspace(f)}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{f.id}</td>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td style={{ fontWeight: 500 }}>{f.projectName}</td>
                        <td>{f.projectClient}</td>
                        <td style={{ fontWeight: 600, color: 'white' }}>
                          R {f.feeValue?.toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-success)' }}>
                          R {(f.paid || 0).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: (f.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                          R {(f.outstanding || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${statusColor[f.status] || 'b-default'}`}>{f.status}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredFees.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No active design sub-fees found within range.
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
        
        /* DESIGN FEE CALCULATOR & FILES WORKSPACE */
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: COSTING SUMMARY & OPTIONAL BUILDER */}
          <div className="card" style={{ border: '1.5px solid var(--border)', padding: '24px' }}>
            {/* WORKSPACE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '4px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}
                  onClick={() => setSelectedFeeId(null)}
                >
                  <ArrowLeft size={12} /> Back to Ledger
                </button>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                  {activeFeeName} — <span style={{ color: 'var(--text-info)' }}>{selectedFeeId}</span>
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px' }}>Status:</span>
                <select 
                  className="form-control"
                  style={{ width: '120px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                  value={feeStatus}
                  onChange={e => setFeeStatus(e.target.value)}
                >
                  <option>Draft</option>
                  <option>In Review</option>
                  <option>Approved</option>
                </select>

                <span style={{ fontSize: '12px' }}>Paid:</span>
                <input 
                  type="number"
                  className="form-control"
                  style={{ width: '100px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                  value={feePaidAmount}
                  onChange={e => setFeePaidAmount(Math.max(0, Number(e.target.value) || 0))}
                />

                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedFeeId(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveFeeWorkspace}>
                  <Save size={14} /> Save & Sync Fee
                </button>
              </div>
            </div>

            {/* DESIGN FEE COSTING SUMMARY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Summary Statement */}
              <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Proposal Statement</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Concept Lighting Stage:</span>
                    <strong>R {calculatorBreakdown.conceptSum.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Schematic Layout Stage:</span>
                    <strong>R {calculatorBreakdown.schematicSum.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Final Design Spec Stage:</span>
                    <strong>R {calculatorBreakdown.finalSum.toLocaleString()}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border-strong)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: 'var(--text-info)' }}>
                    <span>Design Proposal Total:</span>
                    <span>R {calculatorBreakdown.subTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Zoning Area Splits */}
              <div className="card" style={{ padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zoning Scope & Area Splits</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Scope Area:</span>
                    <strong>{activeFeeSqm} m²</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Experiential Area (30%):</span>
                    <strong>{calculatorBreakdown.expLiving} m²</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Secondary Area (60%):</span>
                    <strong>{calculatorBreakdown.secLiving} m²</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Non-Experiential Area (10%):</span>
                    <strong>{calculatorBreakdown.nonExp} m²</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE CALCULATOR BUILDER CONTAINER */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', cursor: 'pointer' }}
                onClick={() => setShowCalculatorBuilder(!showCalculatorBuilder)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={16} color="var(--text-info)" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Interactive Costing & Zoning Area Builder</span>
                </div>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ height: 'auto', padding: '4px 8px', fontSize: '11px', border: '1px solid var(--border)' }}
                  onClick={e => { e.stopPropagation(); setShowCalculatorBuilder(!showCalculatorBuilder); }}
                >
                  {showCalculatorBuilder ? 'Hide Calculator' : '✏️ Edit Calculator & Zoning Details'}
                </button>
              </div>

              {showCalculatorBuilder && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                  {/* Registration form */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Sub-fee Title</label>
                      <input 
                        type="text"
                        className="form-control"
                        style={{ height: '30px', fontSize: '12px' }}
                        value={activeFeeName}
                        onChange={e => setActiveFeeName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Zoning Scope Area (m²)</label>
                      <input 
                        type="number"
                        className="form-control"
                        style={{ height: '30px', fontSize: '12px' }}
                        value={activeFeeSqm}
                        onChange={e => setActiveFeeSqm(Math.max(0, Number(e.target.value) || 0))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Actual Profit Margin (%)</label>
                      <input 
                        type="number"
                        className="form-control"
                        style={{ height: '30px', fontSize: '12px' }}
                        value={actualMargin}
                        onChange={e => setActualMargin(Number(e.target.value) || 18)}
                      />
                    </div>
                  </div>

                  {/* Stage switches */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Included Design Stages:</div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={includeConcept} onChange={e => setIncludeConcept(e.target.checked)} /> Concept Design Stage
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={includeSchematic} onChange={e => setIncludeSchematic(e.target.checked)} /> Schematic Design Stage
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={includeFinal} onChange={e => setIncludeFinal(e.target.checked)} /> Final Spec Layout Stage
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT PANEL: DESIGN FILES DRAWER (DESIGN FOLDERS) */}
          <div className="card" style={{ border: '1.5px solid var(--border)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📎 Design Folder Deliverables
              </div>
              <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}><Plus size={11} /> Upload Drawing</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ConceptLayout_v1.dwg</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>CAD Drawing • 14.8 MB • 5 May 2026</div>
                </div>
                <span className="badge b-success" style={{ fontSize: '9px' }}>Approved</span>
              </div>

              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>DFP-UPPER-MAIN-2026.pdf</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Proposal PDF • 2.4 MB • 2 May 2026</div>
                </div>
                <span className="badge b-success" style={{ fontSize: '9px' }}>Approved</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
