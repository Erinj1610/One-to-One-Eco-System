import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, Clock, ShieldAlert, Award, TrendingUp, Search, Filter, 
  Plus, Play, AlertTriangle, Users, BarChart3, ChevronRight, UserCheck, CheckCircle,
  FileText, ShoppingBag, FolderGit, Calendar
} from 'lucide-react';

// Philosophy Hooks configuration for the Coaching Sidebar
const PHILOSOPHIES = [
  {
    id: 'stoic',
    author: 'Marcus Aurelius',
    source: 'Meditations',
    quote: '"The impediment to action advances action. What stands in the way becomes the way."',
    theme: 'Stoicism & Obstacle Transformation'
  },
  {
    id: 'behavioral',
    author: 'Daniel Kahneman',
    source: 'Thinking, Fast and Slow',
    quote: '"The planning fallacy: plans are unrealistically close to best-case scenarios and could be improved by consulting the statistics of similar cases."',
    theme: 'Optimism Bias & Planning Fallacy'
  },
  {
    id: 'toc',
    author: 'Eliyahu Goldratt',
    source: 'Critical Chain Project Management',
    quote: '"An hour lost at the bottleneck is an hour lost for the entire system."',
    theme: 'Theory of Constraints & Throughput'
  },
  {
    id: 'realism',
    author: 'Sun Tzu',
    source: 'The Art of War',
    quote: '"Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat."',
    theme: 'Strategic Realism & Workload Safety'
  }
];

export default function ProjectList() {
  const { projects, addProject } = useStore();
  const navigate = useNavigate();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [pmFilter, setPmFilter] = useState('All PMs');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // 'total', 'pending', 'active', 'complete'

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    projectType: 'Design & Orders',
    offering: 'Signature',
    sqm: '1,500',
    pm: 'Dani',
    targetMargin: 18,
    actualMargin: 18
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

  // Filter projects by Date Range first
  const dateFilteredProjects = useMemo(() => {
    return Object.values(projects).filter(p => isDateInRange(p.start));
  }, [projects, startDate, endDate]);

  // Dynamic Portfolio KPI Calculations grouped by Total, Pending, Active, Complete
  const kpis = useMemo(() => {
    const list = dateFilteredProjects;
    
    const totalList = list;
    const pendingList = list.filter(p => p.complete !== 'Complete' && (p.stage === 'Stage 1' || p.status === 'Pending' || p.status === 'Awaiting deposit'));
    const activeList = list.filter(p => p.complete !== 'Complete' && p.stage !== 'Stage 1' && p.status !== 'Pending');
    const completeList = list.filter(p => p.complete === 'Complete');

    const getGroupMetrics = (groupList) => {
      let designVal = 0;
      let productVal = 0;
      groupList.forEach(p => {
        if (p.designFees && p.designFees.length > 0) {
          designVal += p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
        } else if (p.projectType !== 'Orders-Only' && p.feeValue) {
          designVal += p.feeValue;
        }
        
        if (p.orders && p.orders.length > 0) {
          productVal += p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
        } else if (p.projectType === 'Orders-Only' && p.feeValue) {
          productVal += p.feeValue;
        }
      });
      return {
        qty: groupList.length,
        designVal,
        productVal,
        totalVal: designVal + productVal
      };
    };

    return {
      total: getGroupMetrics(totalList),
      pending: getGroupMetrics(pendingList),
      active: getGroupMetrics(activeList),
      complete: getGroupMetrics(completeList)
    };
  }, [dateFilteredProjects]);

  // Project List Filter Logic
  const filteredProjects = useMemo(() => {
    return dateFilteredProjects.filter(p => {
      // Search matches
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.client.toLowerCase().includes(search.toLowerCase());
      
      // PM matches
      const matchesPm = pmFilter === 'All PMs' || p.pm === pmFilter;

      // Project Type matches
      const matchesType = typeFilter === 'All Types' || p.projectType === typeFilter;

      // Status matches
      const matchesStatus = statusFilter === 'All Statuses' || p.status === statusFilter;

      // KPI interactive filter matches
      let matchesKpi = true;
      if (activeKpiFilter === 'total') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = p.complete !== 'Complete' && (p.stage === 'Stage 1' || p.status === 'Pending' || p.status === 'Awaiting deposit');
      } else if (activeKpiFilter === 'active') {
        matchesKpi = p.complete !== 'Complete' && p.stage !== 'Stage 1' && p.status !== 'Pending';
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = p.complete === 'Complete';
      }

      return matchesSearch && matchesPm && matchesType && matchesStatus && matchesKpi;
    });
  }, [dateFilteredProjects, search, pmFilter, typeFilter, statusFilter, activeKpiFilter]);

  // Handle Project Creation
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProject.name || !newProject.client) {
      alert("Please fill in the project and client names!");
      return;
    }
    
    // Setup initial arrays based on type
    const projectPayload = {
      ...newProject,
      designFees: newProject.projectType !== 'Orders-Only' ? [
        { id: `DF-${newProject.name.substring(0,3).toUpperCase()}-01`, name: 'Initial Design Fee Proposal', sqm: Number(newProject.sqm) || 1000, feeValue: 0, paid: 0, outstanding: 0, margin: newProject.actualMargin || 18, status: 'Draft' }
      ] : [],
      orders: []
    };

    addProject(projectPayload);
    setShowCreateModal(false);
    
    // Reset form
    setNewProject({
      name: '',
      client: '',
      projectType: 'Design & Orders',
      offering: 'Signature',
      sqm: '1,500',
      pm: 'Dani',
      targetMargin: 18,
      actualMargin: 18
    });
  };

  // Dynamic PM Coaching Nudges based on actual project parameters
  const coachNudges = useMemo(() => {
    const list = Object.values(projects);
    const nudges = [];

    // 1. Stoic Challenge / Obstacle Transformed
    const worstDelayed = list.find(p => p.status === 'Off track' && p.complete !== 'Complete');
    if (worstDelayed) {
      nudges.push({
        philosophy: PHILOSOPHIES[0], // Marcus Aurelius
        title: `Harness Obstacles on ${worstDelayed.name}`,
        desc: `${worstDelayed.name} is Off Track: "${worstDelayed.delay}". As Marcus advises, don't resist the delay—treat this technical rework as an opportunity to host a focused workshop with the client.`,
        action: `Coordinate collaborative workshop`
      });
    }

    // 2. Planning Fallacy Warning
    const highRiskPlanning = list.find(p => p.complete !== 'Complete' && p.stage === 'Stage 1' && p.daysLeft && Number(p.daysLeft) < 0);
    if (highRiskPlanning) {
      nudges.push({
        philosophy: PHILOSOPHIES[1], // Daniel Kahneman
        title: `De-Bias the Timeline on ${highRiskPlanning.name}`,
        desc: `This project is stuck in Stage 1 but is already overdue by ${Math.abs(Number(highRiskPlanning.daysLeft))} days. Kahneman's Planning Fallacy proves we anchored on the best-case deadline. Revise the timeline using statistical realities.`,
        action: `Re-baseline Stage 1 targets`
      });
    }

    // 3. Goldratt's Bottleneck Nudge
    const pmWorkload = {};
    list.forEach(p => {
      if (p.complete !== 'Complete') {
        pmWorkload[p.pm] = (pmWorkload[p.pm] || 0) + 1;
      }
    });
    const overloadedPm = Object.entries(pmWorkload).find(([pm, count]) => count >= 3);
    if (overloadedPm) {
      nudges.push({
        philosophy: PHILOSOPHIES[2], // Theory of Constraints
        title: `Bottleneck Alert: ${overloadedPm[0]}'s Pipeline`,
        desc: `${overloadedPm[0]} is carrying ${overloadedPm[1]} active delivery chains. In Goldratt's Theory of Constraints, this overload acts as a project throughput blocker.`,
        action: `Review team capacity & time allocation`
      });
    }

    return nudges;
  }, [projects]);

  return (
    <div className="animation-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Main Dashboard */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Projects Module</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Track converted projects, manage design sub-fees, product orders, and consolidated project statements.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> New Converted Project
          </button>
        </div>

        {/* Date presets & Custom inputs bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date Range:</span>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
              {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                <button 
                  key={preset} 
                  className="btn btn-sm" 
                  style={{ border: 'none', background: datePreset === preset ? 'var(--text-info)' : 'none', color: datePreset === preset ? 'white' : 'var(--text-secondary)', padding: '3px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => applyPreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }} 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>to</span>
            <input 
              type="date" 
              className="form-control" 
              style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }} 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
            />
          </div>
        </div>

        {/* 4-COLUMN HIGH-FIDELITY KPI METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          
          <div 
            className={`stat-card clickable hover-scale ${activeKpiFilter === 'total' ? 'active-filter' : ''}`}
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'total' ? null : 'total')}
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'total' ? '2px solid var(--text-info)' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL PROJECTS</span>
              <Briefcase size={16} color="var(--text-info)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {kpis.total.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-info)', marginTop: '4px' }}>
              R {Math.round(kpis.total.totalVal / 1000)}k <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Total</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Design: <strong>R {Math.round(kpis.total.designVal / 1000)}k</strong></span>
              <span>Product: <strong>R {Math.round(kpis.total.productVal / 1000)}k</strong></span>
            </div>
          </div>

          <div 
            className={`stat-card clickable hover-scale ${activeKpiFilter === 'pending' ? 'active-filter' : ''}`}
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'pending' ? null : 'pending')}
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'pending' ? '2px solid var(--text-warning)' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>PENDING PROJECTS</span>
              <Clock size={16} color="var(--text-warning)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {kpis.pending.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-warning)', marginTop: '4px' }}>
              R {Math.round(kpis.pending.totalVal / 1000)}k <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Total</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Design: <strong>R {Math.round(kpis.pending.designVal / 1000)}k</strong></span>
              <span>Product: <strong>R {Math.round(kpis.pending.productVal / 1000)}k</strong></span>
            </div>
          </div>

          <div 
            className={`stat-card clickable hover-scale ${activeKpiFilter === 'active' ? 'active-filter' : ''}`}
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')}
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'active' ? '2px solid var(--text-success)' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIVE PROJECTS</span>
              <Play size={16} color="var(--text-success)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {kpis.active.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-success)', marginTop: '4px' }}>
              R {Math.round(kpis.active.totalVal / 1000)}k <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Total</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Design: <strong>R {Math.round(kpis.active.designVal / 1000)}k</strong></span>
              <span>Product: <strong>R {Math.round(kpis.active.productVal / 1000)}k</strong></span>
            </div>
          </div>

          <div 
            className={`stat-card clickable hover-scale ${activeKpiFilter === 'complete' ? 'active-filter' : ''}`}
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'complete' ? null : 'complete')}
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'complete' ? '2px solid var(--text-muted)' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>COMPLETE PROJECTS</span>
              <CheckCircle size={16} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {kpis.complete.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px' }}>
              R {Math.round(kpis.complete.totalVal / 1000)}k <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Total</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Design: <strong>R {Math.round(kpis.complete.designVal / 1000)}k</strong></span>
              <span>Product: <strong>R {Math.round(kpis.complete.productVal / 1000)}k</strong></span>
            </div>
          </div>

        </div>

        {/* FILTER & CONTROL LEDGER BAR */}
        <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="var(--text-tertiary)" />
            <input 
              type="text" 
              placeholder="Search projects or clients..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeKpiFilter && (
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={() => setActiveKpiFilter(null)}
                style={{ fontSize: '11px', color: 'var(--text-danger)' }}
              >
                Clear Metric Filter ({activeKpiFilter})
              </button>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} color="var(--text-tertiary)" />
              <select className="t-sel" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }} value={pmFilter} onChange={e => setPmFilter(e.target.value)}>
                <option>All PMs</option>
                <option>Dani</option>
                <option>Martin</option>
              </select>
            </div>

            <select className="t-sel" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option>All Types</option>
              <option>Design & Orders</option>
              <option>Design-Only</option>
              <option>Orders-Only</option>
            </select>

            <select className="t-sel" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All Statuses</option>
              <option>On track</option>
              <option>Off track</option>
            </select>
          </div>
        </div>

        {/* PRIMARY PROJECTS LEDGER TABLE */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table" style={{ margin: 0 }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Project & Client</th>
                <th>Project Type</th>
                <th>Design Fees</th>
                <th>Orders</th>
                <th>Stage & Progress</th>
                <th>Margin</th>
                <th>Status</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(p => {
                // Calculate percentage of progress based on stage
                const stagesList = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Snags', 'Complete'];
                const currentStageIdx = stagesList.indexOf(p.stage);
                const progressPct = currentStageIdx === -1 ? 0 : Math.round(((currentStageIdx + 1) / stagesList.length) * 100);
                
                // Upgraded calculation blocks
                let totalValue = p.feeValue || 0;
                let totalOutstanding = Number(p.outstanding?.replace(/[^0-9]/g, '')) || 0;
                let actualMargin = p.actualMargin || 18;

                if (p.designFees && p.orders) {
                  const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
                  const dfPaid = p.designFees.reduce((sum, d) => sum + (d.paid || 0), 0);
                  
                  const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
                  const poPaid = p.orders.reduce((sum, o) => sum + (o.paid || 0), 0);

                  totalValue = dfVal + poVal;
                  totalOutstanding = Math.max(0, totalValue - (dfPaid + poPaid));

                  const totalCost = p.designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 18)/100)), 0) +
                                    p.orders.reduce((sum, o) => sum + (o.value * 0.8), 0);
                  actualMargin = totalValue > 0 ? Math.round(((totalValue - totalCost) / totalValue) * 100) : 18;
                }

                // Margin Health Indicator
                const isUnderTarget = actualMargin < (p.targetMargin || 18);

                // Type badge coloring helper
                const typeColors = {
                  'Design & Orders': 'b-info',
                  'Design-Only': 'b-warning',
                  'Orders-Only': 'b-success'
                };

                return (
                  <tr 
                    key={p.key} 
                    className="clickable hover-row" 
                    onClick={() => navigate(`/projects/${p.key}`)}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-info)' }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.client}</div>
                    </td>
                    <td>
                      <span className={`badge ${typeColors[p.projectType || 'Design & Orders']}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {p.projectType === 'Orders-Only' ? <ShoppingBag size={10} /> : p.projectType === 'Design-Only' ? <FolderGit size={10} /> : <Briefcase size={10} />}
                        {p.projectType || 'Design & Orders'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {p.designFees?.length || 0} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>fees</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {p.orders?.length || 0} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>POs</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500 }}>
                          <span>{p.stage}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{progressPct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${progressPct}%`, 
                              height: '100%', 
                              background: p.status === 'On track' ? 'var(--text-success)' : 'var(--text-danger)',
                              borderRadius: '2px',
                              transition: 'width 0.4s ease'
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: isUnderTarget ? 'var(--text-danger)' : 'var(--text-success)' }}>
                          {actualMargin}%
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Target: {p.targetMargin || 18}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'On track' ? 'b-success' : 'b-danger'}`} style={{ fontSize: '11px' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color: totalOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                      R {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                    No converted projects matched the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN: Philosophies & PM Coaching Engine */}
      <div style={{ position: 'sticky', top: '20px' }}>
        
        {/* Coaching Advisories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1px solid rgba(24,95,165,0.2)' }}>
            <div className="card-head" style={{ borderBottom: '1px solid rgba(24,95,165,0.1)' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <Award size={15} color="var(--text-info)" />
                <span>Stoic Project Advisor</span>
              </div>
            </div>
            <div className="card-body" style={{ fontSize: '12px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
              <em>"We are what we repeatedly do. Excellence, then, is not an act, but a habit."</em> 
              <div style={{ textAlign: 'right', fontWeight: 600, marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>— Aristotle</div>
            </div>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', tracking: '0.05em', marginTop: '8px' }}>
            Actions & Notifications ({coachNudges.length})
          </div>

          {coachNudges.map((nudge, idx) => (
            <div 
              key={idx} 
              className="card" 
              style={{ 
                borderLeft: `4px solid ${nudge.philosophy.id === 'stoic' ? 'var(--text-danger)' : nudge.philosophy.id === 'behavioral' ? 'var(--text-warning)' : nudge.philosophy.id === 'toc' ? 'var(--text-info)' : 'var(--text-success)'}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div className="card-body" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {nudge.philosophy.theme}
                  </span>
                  <span style={{ fontSize: '10px', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                    {nudge.philosophy.author}
                  </span>
                </div>
                
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {nudge.title}
                </h4>
                
                <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {nudge.desc}
                </p>

                <button 
                  className="btn btn-sm btn-ghost" 
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    fontSize: '11px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-info)'
                  }}
                  onClick={() => {
                    const matchedProj = Object.values(projects).find(p => nudge.title.includes(p.name));
                    if (matchedProj) navigate(`/projects/${matchedProj.key}`);
                  }}
                >
                  <Play size={10} style={{ marginRight: '4px' }} /> {nudge.action}
                </button>
              </div>
            </div>
          ))}

          {coachNudges.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
              <CheckCircle size={18} color="var(--text-success)" style={{ margin: '0 auto 8px auto' }} />
              All parameters on track! Aristotle's Virtue is actively realized in your delivery chain.
            </div>
          )}

        </div>

      </div>

      {/* CREATE NEW CONVERTED PROJECT MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Spin Up Converted Project</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateProject}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Upper Primrose, House Sissou"
                    value={newProject.name} 
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Client Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sarah Venter, Marco Esteves"
                    value={newProject.client} 
                    onChange={e => setNewProject({...newProject, client: e.target.value})}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Type</label>
                    <select 
                      className="t-sel" 
                      value={newProject.projectType} 
                      onChange={e => setNewProject({...newProject, projectType: e.target.value})}
                      style={{ fontSize: '13px' }}
                    >
                      <option>Design & Orders</option>
                      <option>Design-Only</option>
                      <option>Orders-Only</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project Manager</label>
                    <select 
                      className="t-sel" 
                      value={newProject.pm} 
                      onChange={e => setNewProject({...newProject, pm: e.target.value})}
                      style={{ fontSize: '13px' }}
                    >
                      <option>Dani</option>
                      <option>Martin</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Project SQM (m²)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 1,500"
                      value={newProject.sqm} 
                      onChange={e => setNewProject({...newProject, sqm: e.target.value})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Offering Package</label>
                    <select 
                      className="t-sel" 
                      value={newProject.offering} 
                      onChange={e => setNewProject({...newProject, offering: e.target.value})}
                      style={{ fontSize: '13px' }}
                    >
                      <option>Signature</option>
                      <option>Modus</option>
                      <option>Essential</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Target Margin (%)</label>
                    <input 
                      type="number" 
                      value={newProject.targetMargin} 
                      onChange={e => setNewProject({...newProject, targetMargin: Number(e.target.value)})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Actual Margin (%)</label>
                    <input 
                      type="number" 
                      value={newProject.actualMargin} 
                      onChange={e => setNewProject({...newProject, actualMargin: Number(e.target.value)})}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '13px' }}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Convert & Deploy</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
