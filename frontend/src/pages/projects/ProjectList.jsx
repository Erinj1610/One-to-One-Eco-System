import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Briefcase, Clock, ShieldAlert, Award, TrendingUp, Search, Filter, 
  Plus, Play, AlertTriangle, Users, BarChart3, ChevronRight, UserCheck, CheckCircle,
  FileText, ShoppingBag, FolderGit, Calendar, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import CollapsibleAlertSidebar from '../../components/common/CollapsibleAlertSidebar';


export default function ProjectList() {
  const { projects, addProject, contacts, getModuleName } = useStore();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [pmFilter, setPmFilter] = useState('All PMs');
  const [clientFilter, setClientFilter] = useState('All Clients');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // 'total', 'pending', 'active', 'complete'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_projects') === 'true';
  });

  // Sorting States
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');



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

  const userContact = useMemo(() => {
    if (isAdmin) return null;
    return contacts.find(c => c.email?.toLowerCase() === user?.email?.toLowerCase());
  }, [contacts, user, isAdmin]);

  // Filter projects by Date Range first
  const dateFilteredProjects = useMemo(() => {
    let list = Object.values(projects).filter(p => !p.isDraft && isDateInRange(p.start));
    if (!isAdmin) {
      list = list.filter(p => {
        const matchClient = p.client?.toLowerCase() === userContact?.name?.toLowerCase();
        const hasMyFee = (p.designFees || []).some(f => f.clientEmail?.toLowerCase() === user?.email?.toLowerCase() || f.projectClient?.toLowerCase() === userContact?.name?.toLowerCase());
        const hasMyOrder = (p.orders || []).some(o => o.clientEmail?.toLowerCase() === user?.email?.toLowerCase() || o.clientContact?.toLowerCase() === userContact?.name?.toLowerCase());
        return matchClient || hasMyFee || hasMyOrder;
      });
    }
    return list;
  }, [projects, startDate, endDate, isAdmin, user, userContact]);

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

  // Dynamic list of unique clients for the dropdown filter
  const clientsList = useMemo(() => {
    const cls = Object.values(projects).map(p => p.client).filter(Boolean);
    return ['All Clients', ...Array.from(new Set(cls))].sort();
  }, [projects]);

  // Project List Filter Logic
  const filteredProjects = useMemo(() => {
    return dateFilteredProjects.filter(p => {
      // Search matches
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            (p.client || '').toLowerCase().includes(search.toLowerCase());
      
      // PM matches
      const matchesPm = pmFilter === 'All PMs' || p.pm === pmFilter;

      // Client matches
      const matchesClient = clientFilter === 'All Clients' || p.client === clientFilter;

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

      return matchesSearch && matchesPm && matchesClient && matchesType && matchesStatus && matchesKpi;
    });
  }, [dateFilteredProjects, search, pmFilter, clientFilter, typeFilter, statusFilter, activeKpiFilter]);

  // Sort Logic for All Columns
  const sortedProjects = useMemo(() => {
    if (!sortField) return filteredProjects;
    const stagesList = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Snags', 'Complete'];

    const getVal = (p, field) => {
      switch (field) {
        case 'name':
          return (p.name || '').toLowerCase();
        case 'client':
          return (p.client || '').toLowerCase();
        case 'projectType':
          return (p.projectType || '').toLowerCase();
        case 'designFees':
          return p.designFees?.length || 0;
        case 'orders':
          return p.orders?.length || 0;
        case 'stage': {
          const idx = stagesList.indexOf(p.stage);
          return idx === -1 ? 0 : idx;
        }
        case 'margin': {
          let totalValue = p.feeValue || 0;
          let actualMargin = p.actualMargin || 18;
          if (p.designFees && p.orders) {
            const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
            const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
            totalValue = dfVal + poVal;
            const totalCost = p.designFees.reduce((sum, d) => sum + (d.feeValue * (1 - (d.margin || 18)/100)), 0) +
                              p.orders.reduce((sum, o) => sum + (o.value * 0.8), 0);
            actualMargin = totalValue > 0 ? Math.round(((totalValue - totalCost) / totalValue) * 100) : 18;
          }
          return actualMargin;
        }
        case 'status':
          return (p.status || '').toLowerCase();
        case 'outstanding': {
          let totalValue = p.feeValue || 0;
          let totalOutstanding = Number(p.outstanding?.replace(/[^0-9]/g, '')) || 0;
          if (p.designFees && p.orders) {
            const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
            const dfPaid = p.designFees.reduce((sum, d) => sum + (d.paid || 0), 0);
            const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
            const poPaid = p.orders.reduce((sum, o) => sum + (o.paid || 0), 0);
            totalValue = dfVal + poVal;
            totalOutstanding = Math.max(0, totalValue - (dfPaid + poPaid));
          }
          return totalOutstanding;
        }
        default:
          return '';
      }
    };

    return [...filteredProjects].sort((a, b) => {
      const valA = getVal(a, sortField);
      const valB = getVal(b, sortField);

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />;
  };


  return (
    <div className="animation-fade-in" style={{ display: 'grid', gridTemplateColumns: isSidebarCollapsed ? '1fr 50px' : '1fr 340px', gap: '24px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Main Dashboard */}
      <div>
        {/* Title & Filter Bar Header */}
        <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
          <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="av-md" style={{ background: 'rgba(24, 95, 165, 0.1)', color: 'var(--text-info)' }}>
                <Briefcase size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{getModuleName('projects', 'Projects')} Module</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Track converted projects, manage design sub-fees, product orders, and consolidated project statements.</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
                {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                  <button 
                    key={preset} 
                    className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`} 
                    style={{ border: 'none', background: datePreset === preset ? 'var(--text-info)' : 'none', color: datePreset === preset ? 'white' : 'var(--text-secondary)' }}
                    onClick={() => applyPreset(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                <Calendar size={13} color="var(--text-tertiary)" />
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }}
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setDatePreset('Custom');
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }}
                  value={endDate}
                  onChange={e => {
                    setEndDate(e.target.value);
                    setDatePreset('Custom');
                  }}
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const newKey = addProject({
                    name: '',
                    client: '',
                    projectType: 'Design & Orders',
                    offering: 'Signature',
                    sqm: '',
                    pm: 'Dani',
                    targetMargin: 39,
                    actualMargin: 39,
                    designFees: [],
                    orders: [],
                    isDraft: true,
                    stage: '—',
                    status: 'Draft',
                    start: '—',
                    deadline: '—'
                  });
                  navigate(`/projects/${newKey}`);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '28px', fontSize: '12px' }}
              >
                <Plus size={16} /> New Project
              </button>
            </div>
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

            <select className="t-sel" style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }} value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
              {clientsList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

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
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project {renderSortIcon('name')}</div>
                </th>
                <th onClick={() => handleSort('client')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Client {renderSortIcon('client')}</div>
                </th>
                <th onClick={() => handleSort('projectType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project Type {renderSortIcon('projectType')}</div>
                </th>
                <th onClick={() => handleSort('designFees')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Design Fees {renderSortIcon('designFees')}</div>
                </th>
                <th onClick={() => handleSort('orders')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Orders {renderSortIcon('orders')}</div>
                </th>
                <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Stage & Progress {renderSortIcon('stage')}</div>
                </th>
                <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Margin {renderSortIcon('margin')}</div>
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Status {renderSortIcon('status')}</div>
                </th>
                <th onClick={() => handleSort('outstanding')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Outstanding {renderSortIcon('outstanding')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(p => {
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
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.client}</div>
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
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                    No converted projects matched the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN: Operational Alerts & Prompts */}
      <CollapsibleAlertSidebar 
        module="projects" 
        onNavigate={(path, state) => navigate(path, { state })} 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(prev => !prev)}
      />



    </div>
  );
}
