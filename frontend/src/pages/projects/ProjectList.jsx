import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Briefcase, Clock, ShieldAlert, Award, TrendingUp, Search, Filter, 
  Plus, Play, AlertTriangle, Users, BarChart3, ChevronRight, UserCheck, CheckCircle,
  FileText, ShoppingBag, FolderGit, Calendar, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import CollapsibleAlertSidebar from '../../components/common/CollapsibleAlertSidebar';
import MobileProjectsViewer from '../../components/mobile/MobileProjectsViewer';


export function getOrderDynamicStatus(o) {
  const totalPaidVal = Number(o.paid) || 0;
  const totalRetailVal = Number(o.value) || 0;
  const valueInclVat = totalRetailVal * 1.15;
  let paymentStatus = 'Unpaid';
  if (totalPaidVal > 0) {
    if (totalPaidVal >= valueInclVat - 1) {
      paymentStatus = 'Fully Paid';
    } else {
      paymentStatus = 'Partially Paid';
    }
  }

  // Calculate progress percentages dynamically
  let totalQtyForProc = 0;
  let totalProcQty = 0;
  let totalQtyForInv = 0;
  let totalInvQty = 0;
  let totalQtyForDel = 0;
  let totalDelQty = 0;

  const itemsList = o.itemsList || [];
  itemsList.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
    const q = Number(item.qty) || 0;
    const isService = (item.itemType || item.item_type) === 'Service';
    const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : 0;

    if (isService) {
      totalQtyForInv += q;
      totalInvQty += Number(invoiced) || 0;
      return;
    }

    totalQtyForProc += q;
    totalQtyForInv += q;
    totalQtyForDel += q;

    const received = item.receivedQty !== undefined ? item.receivedQty : 0;
    const delivered = item.deliveryQty !== undefined ? item.deliveryQty : 0;
    const stockStatus = item.stockStatus !== undefined ? item.stockStatus : '';

    totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
    totalInvQty += Number(invoiced) || 0;
    totalDelQty += Number(delivered) || 0;
  });

  const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
  const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
  const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

  let computedStatus = o.status || 'Pending'; 
  if (computedStatus !== 'Draft' && computedStatus !== 'Cancelled') {
    const isFullyPaid = paymentStatus === 'Fully Paid';
    if (totalPaidVal === 0 && procPct === 0 && delPct === 0) {
      computedStatus = 'Pending';
    } else if (procPct === 100 && invPct === 100 && delPct === 100 && isFullyPaid) {
      computedStatus = 'Complete';
    } else {
      computedStatus = 'Ongoing';
    }
  }
  return computedStatus;
}

export function calculateProjectStageAndProgress(p) {
  const orders = p.orders || [];
  
  if (orders.length === 0) {
    return { stage: '0%', progressPct: 0 };
  }

  let orderSum = 0;
  orders.forEach(o => {
    const status = getOrderDynamicStatus(o).toLowerCase();
    if (status === 'complete') {
      orderSum += 100;
    } else if (status === 'ongoing') {
      orderSum += 50;
    } else {
      orderSum += 0;
    }
  });

  const progressPct = Math.round(orderSum / orders.length);
  return { stage: `${progressPct}%`, progressPct };
}

export default function ProjectList() {
  const { projects, addProject, contacts, getModuleName, bulkDeleteProjects, refreshProjects } = useStore();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bulk Selection States
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const toggleSelectKey = (key, e) => {
    e.stopPropagation();
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = (filteredProjects) => {
    setSelectedKeys(prev => {
      const allSelected = filteredProjects.every(p => prev.has(p.key));
      const next = new Set(prev);
      if (allSelected) {
        filteredProjects.forEach(p => next.delete(p.key));
      } else {
        filteredProjects.forEach(p => next.add(p.key));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedKeys.size} selected projects and all their associated orders, items, and files? This cannot be undone.`)) {
      await bulkDeleteProjects(Array.from(selectedKeys));
      setSelectedKeys(new Set());
    }
  };

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 180);
    return () => clearTimeout(timer);
  }, [search]);

  const [pmFilter, setPmFilter] = useState('All PMs');
  const [clientFilter, setClientFilter] = useState('All Clients');
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
    let list = Object.values(projects).filter(p => {
      if (p.isDraft) return false;
      const projectDateMatch = isDateInRange(p.start);
      const orderDateMatch = (p.orders || []).some(o => isDateInRange(o.orderDate));
      return projectDateMatch || orderDateMatch;
    });
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

  // Dynamic list of unique project managers for the dropdown filter
  const pmList = useMemo(() => {
    const pms = Object.values(projects).map(p => p.pm).filter(Boolean);
    return ['All PMs', ...Array.from(new Set(pms))].sort();
  }, [projects]);

  // Dynamic list of unique clients for the dropdown filter
  const clientsList = useMemo(() => {
    const cls = Object.values(projects).map(p => p.client).filter(Boolean);
    return ['All Clients', ...Array.from(new Set(cls))].sort();
  }, [projects]);

  // Dynamic list of unique statuses computed across all projects
  const statusesList = useMemo(() => {
    const statuses = Object.values(projects).map(p => {
      if (p.isDraft) return null;
      if (p.orders && p.orders.length > 0) {
        const oStatuses = p.orders.map(o => getOrderDynamicStatus(o).toLowerCase());
        if (oStatuses.every(s => s === 'cancelled')) return 'Cancelled';
        if (oStatuses.every(s => s === 'complete')) return 'Complete';
        if (oStatuses.some(s => s === 'ongoing' || s === 'complete')) return 'Ongoing';
        return 'Pending';
      }
      return 'Pending';
    }).filter(Boolean);
    return ['All Statuses', ...Array.from(new Set(statuses))].sort();
  }, [projects]);

  // Project List Filter Logic
  const filteredProjects = useMemo(() => {
    return dateFilteredProjects.filter(p => {
      // Calculate dynamic computed status for matching search & filter
      let computedStatus = 'Pending';
      if (p.orders && p.orders.length > 0) {
        const statuses = p.orders.map(o => getOrderDynamicStatus(o).toLowerCase());
        if (statuses.every(s => s === 'cancelled')) {
          computedStatus = 'Cancelled';
        } else if (statuses.every(s => s === 'complete')) {
          computedStatus = 'Complete';
        } else if (statuses.some(s => s === 'ongoing' || s === 'complete')) {
          computedStatus = 'Ongoing';
        } else {
          computedStatus = 'Pending';
        }
      }

      // Search matches (Project name, Client, or PM)
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch = !q ||
                            (p.name || '').toLowerCase().includes(q) || 
                            (p.client || '').toLowerCase().includes(q) ||
                            (p.pm || '').toLowerCase().includes(q);
      
      // PM matches
      const matchesPm = pmFilter === 'All PMs' || p.pm === pmFilter;

      // Client matches
      const matchesClient = clientFilter === 'All Clients' || p.client === clientFilter;

      // Status matches
      const matchesStatus = statusFilter === 'All Statuses' || computedStatus === statusFilter;

      // KPI interactive filter matches
      let matchesKpi = true;
      if (activeKpiFilter === 'total') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = p.complete !== 'Complete' && (p.stage === 'Stage 1' || computedStatus === 'Pending' || p.status === 'Awaiting deposit');
      } else if (activeKpiFilter === 'active') {
        matchesKpi = p.complete !== 'Complete' && p.stage !== 'Stage 1' && computedStatus !== 'Pending';
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = p.complete === 'Complete' || computedStatus === 'Complete';
      }

      return matchesSearch && matchesPm && matchesClient && matchesStatus && matchesKpi;
    });
  }, [dateFilteredProjects, search, pmFilter, clientFilter, statusFilter, activeKpiFilter]);

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
          const { progressPct } = calculateProjectStageAndProgress(p);
          return progressPct;
        }
        case 'margin': {
          let actualMargin = p.actualMargin || 18;
          if (p.orders && p.orders.length > 0) {
            const totalOrderVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
            if (totalOrderVal > 0) {
              const orderCost = p.orders.reduce((sum, o) => {
                return sum + (o.costValue !== undefined ? o.costValue : (o.value * 0.8));
              }, 0);
              actualMargin = Math.round(((totalOrderVal - orderCost) / totalOrderVal) * 100);
            }
          } else {
            actualMargin = p.targetMargin || 18;
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


  if (isMobile) {
    return (
      <div className="animation-fade-in" style={{ width: '100%', maxWidth: '100%' }}>
        <MobileProjectsViewer projects={projects} onRefresh={refreshProjects} />
      </div>
    );
  }

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
                onClick={async () => {
                  const newKey = await addProject({
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
                  if (newKey) {
                    navigate(`/projects/${newKey}`);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '28px', fontSize: '12px' }}
              >
                <Plus size={16} /> New Project
              </button>
            </div>
          </div>
        </div>

        {/* 4-COLUMN HIGH-FIDELITY KPI METRICS GRID (FLUID PROPORTIONAL) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px', marginBottom: '20px' }}>
          
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search Project name, Client, or PM..." 
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>

            {activeKpiFilter && (
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={() => setActiveKpiFilter(null)}
                style={{ fontSize: '11px', color: 'var(--text-danger)', height: '34px' }}
              >
                Clear Filter ({activeKpiFilter})
              </button>
            )}

            <select 
              className="form-control" 
              style={{ width: '130px', height: '34px', fontSize: '13px' }} 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
            >
              {statusesList.map(st => (
                <option key={st} value={st === 'All Statuses' ? 'All Statuses' : st}>{st}</option>
              ))}
            </select>

            <select 
              className="form-control" 
              style={{ width: '150px', height: '34px', fontSize: '13px' }} 
              value={clientFilter} 
              onChange={e => setClientFilter(e.target.value)}
            >
              {clientsList.map(c => (
                <option key={c} value={c === 'All Clients' ? 'All Clients' : c}>{c === 'All Clients' ? 'All Clients' : c}</option>
              ))}
            </select>

            <select 
              className="form-control" 
              style={{ width: '150px', height: '34px', fontSize: '13px' }} 
              value={pmFilter} 
              onChange={e => setPmFilter(e.target.value)}
            >
              {pmList.map(pm => (
                <option key={pm} value={pm === 'All PMs' ? 'All PMs' : pm}>{pm === 'All PMs' ? 'All PMs' : pm}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredProjects.length}</strong> active projects
          </div>
        </div>

        {/* BULK ACTIONS TOOLBAR */}
        {selectedKeys.size > 0 && (
          <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--text-danger)', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              {selectedKeys.size} projects selected
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-sm btn-ghost" 
                onClick={() => setSelectedKeys(new Set())}
                style={{ fontSize: '12px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-sm btn-danger" 
                onClick={handleBulkDelete}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <AlertTriangle size={12} />
                Delete Selected ({selectedKeys.size})
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', position: 'relative' }}>
            <table className="table" style={{ margin: 0 }}>
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: '3%', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={sortedProjects.length > 0 && sortedProjects.every(p => selectedKeys.has(p.key))}
                    onChange={() => toggleSelectAll(sortedProjects)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project {renderSortIcon('name')}</div>
                </th>
                <th onClick={() => handleSort('client')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Client {renderSortIcon('client')}</div>
                </th>
                <th onClick={() => handleSort('pm')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project Manager {renderSortIcon('pm')}</div>
                </th>
                <th onClick={() => handleSort('designFees')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Design Fees {renderSortIcon('designFees')}</div>
                </th>
                <th onClick={() => handleSort('orders')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Orders {renderSortIcon('orders')}</div>
                </th>
                <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Margin {renderSortIcon('margin')}</div>
                </th>
                <th onClick={() => handleSort('value')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Value {renderSortIcon('value')}</div>
                </th>
                <th onClick={() => handleSort('paid')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Paid {renderSortIcon('paid')}</div>
                </th>
                <th onClick={() => handleSort('outstanding')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Outstanding {renderSortIcon('outstanding')}</div>
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Status {renderSortIcon('status')}</div>
                </th>
                <th onClick={() => handleSort('stage')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Stage {renderSortIcon('stage')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(p => {
                const { progressPct } = calculateProjectStageAndProgress(p);
                
                // Calculate dynamic summarized project status based on orders
                let computedStatus = 'Pending';
                if (p.orders && p.orders.length > 0) {
                  const statuses = p.orders.map(o => getOrderDynamicStatus(o).toLowerCase());
                  const allCancelled = statuses.every(s => s === 'cancelled');
                  const allComplete = statuses.every(s => s === 'complete');
                  const hasOngoing = statuses.some(s => s === 'ongoing');

                  if (allCancelled) {
                    computedStatus = 'Cancelled';
                  } else if (allComplete) {
                    computedStatus = 'Complete';
                  } else if (hasOngoing) {
                    computedStatus = 'Ongoing';
                  } else {
                    computedStatus = 'Pending';
                  }
                }

                // Upgraded calculation blocks
                let totalValue = p.feeValue || 0;
                let totalOutstanding = Number(p.outstanding?.replace(/[^0-9]/g, '')) || 0;
                let actualMargin = p.actualMargin || 18;

                if (p.orders && p.orders.length > 0) {
                   const totalOrderVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
                   if (totalOrderVal > 0) {
                     const orderCost = p.orders.reduce((sum, o) => {
                       return sum + (o.costValue !== undefined ? o.costValue : (o.value * 0.8));
                     }, 0);
                     actualMargin = Math.round(((totalOrderVal - orderCost) / totalOrderVal) * 100);
                   } else {
                     actualMargin = p.targetMargin || 18;
                   }
                 } else {
                   actualMargin = p.targetMargin || 18;
                 }

                 let totalPaid = 0;
                 if (p.designFees && p.orders) {
                   const dfVal = p.designFees.reduce((sum, d) => sum + (d.feeValue || 0), 0);
                   const dfPaid = p.designFees.reduce((sum, d) => sum + (d.paid || 0), 0);
                   const poVal = p.orders.reduce((sum, o) => sum + (o.value || 0), 0);
                   const poPaid = p.orders.reduce((sum, o) => sum + (o.paid || 0), 0);
                   totalValue = dfVal + poVal;
                   totalPaid = dfPaid + poPaid;
                   totalOutstanding = Math.max(0, totalValue - (dfPaid + poPaid));
                 }

                // Margin Health Indicator
                const isUnderTarget = actualMargin < (p.targetMargin || 18);

                return (
                  <tr 
                    key={p.key} 
                    className="clickable hover-row" 
                    onClick={() => navigate(`/projects/${p.key}`)}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedKeys.has(p.key)}
                        onChange={(e) => toggleSelectKey(p.key, e)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-info)' }}>{p.name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.client}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{p.pm || '—'}</div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {p.designFees?.length || 0} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>fees</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {p.orders?.length || 0} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>POs</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: isUnderTarget ? 'var(--text-danger)' : 'var(--text-success)' }}>
                          {actualMargin}%
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Target: {p.targetMargin || 18}%</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      R {totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-success)' }}>
                      R {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ color: totalOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                      R {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td>
                      <span className={`badge ${computedStatus === 'Complete' ? 'b-success' : computedStatus === 'Ongoing' ? 'b-info' : computedStatus === 'Pending' ? 'b-warning' : 'b-default'}`} style={{ fontSize: '11px' }}>
                        {computedStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 500 }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{progressPct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${progressPct}%`, 
                              height: '100%', 
                              background: computedStatus === 'Complete' ? 'var(--text-success)' : computedStatus === 'Ongoing' ? 'var(--text-info)' : computedStatus === 'Pending' ? 'var(--text-warning)' : 'var(--text-muted)',
                              borderRadius: '2px',
                              transition: 'width 0.4s ease'
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)' }}>
                    No converted projects matched the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
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
