import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useLocation } from 'react-router-dom';
import PipelinePage from './PipelinePage';
import { 
  User, Building2, Briefcase, TrendingUp, ArrowLeft, Mail, Phone, 
  ExternalLink, FileText, CheckCircle, Clock, Search, Bell, 
  MoreVertical, Calendar, DollarSign, MessageSquare, Send, ChevronRight,
  TrendingDown, Star, Filter, Plus, AlertTriangle, ShieldAlert, Heart, Target,
  X, HelpCircle, Activity, Award, Edit3, Users, ClipboardList,
  ArrowUpDown, ArrowUp, ArrowDown, FolderGit, ShoppingBag
} from 'lucide-react';
import CollapsibleAlertSidebar from '../components/common/CollapsibleAlertSidebar';

const typeColors = { Architect: 'b-info', Developer: 'b-success', Interior: 'b-warning', Private: 'b-default' };

// Date anchor and comparison helpers
const today = new Date('2026-05-19');

const getDaysDiff = (dateStr) => {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  return (today - d) / (1000 * 60 * 60 * 24);
};

export default function CrmPage() {
  const { 
    contacts, 
    setContacts, 
    projects, 
    attritionLogs, 
    logAttrition,
    addProject,
    getModuleName
  } = useStore();

  const navigate = useNavigate();
  const location = useLocation();

  // Page States
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    if (location.state?.selectedClientId) {
      const target = contacts.find(c => c.id === location.state.selectedClientId);
      if (target) setSelectedClient(target);
    } else if (location.state?.selectedClientName) {
      const target = contacts.find(c => c.name === location.state.selectedClientName);
      if (target) setSelectedClient(target);
    }
  }, [location.state, contacts]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_crm') === 'true';
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [showAi, setShowAi] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [form, setForm] = useState({ name: '', company: '', type: 'Architect', email: '', phone: '' });

  // Edit Client Profile States
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientData, setEditClientData] = useState(null);

  // Client Projects table sort states
  const [projSortField, setProjSortField] = useState('name');
  const [projSortDirection, setProjSortDirection] = useState('asc');

  const handleProjSort = (field) => {
    if (projSortField === field) {
      setProjSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setProjSortField(field);
      setProjSortDirection('asc');
    }
  };

  const renderProjSortIcon = (field) => {
    if (projSortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />;
    return projSortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />;
  };

  // Activity Log States
  const [newActivityText, setNewActivityText] = useState('');
  const [clientActivities, setClientActivities] = useState([]);

  useEffect(() => {
    if (selectedClient) {
      setEditClientData({
        name: selectedClient.name || '',
        company: selectedClient.company || '',
        type: selectedClient.type || 'Private',
        email: selectedClient.email || '',
        phone: selectedClient.phone || '',
        statedGoal: selectedClient.statedGoal || '',
        nps: selectedClient.nps || 8,
        totalValue: selectedClient.totalValue || 0,
        annualRevenue: selectedClient.annualRevenue || 0
      });
      // Load activities from contact record
      setClientActivities(selectedClient.activities || []);
      setNewActivityText('');
    }
  }, [selectedClient]);

  const handleSaveClient = () => {
    if (!editClientData.name.trim()) {
      showToast("Client name is required!");
      return;
    }
    setContacts(prev => prev.map(c => {
      if (c.id === selectedClient.id) {
        const updated = {
          ...c,
          name: editClientData.name,
          company: editClientData.company,
          type: editClientData.type,
          email: editClientData.email,
          phone: editClientData.phone,
          statedGoal: editClientData.statedGoal,
          nps: Number(editClientData.nps),
          totalValue: Number(editClientData.totalValue),
          annualRevenue: Number(editClientData.annualRevenue)
        };
        setSelectedClient(updated);
        return updated;
      }
      return c;
    }));
    setIsEditingClient(false);
    showToast("Client profile updated successfully!");
  };

  // Global Date Filters (Pipeline Aligned)
  const [datePreset, setDatePreset] = useState('All Time'); // 'All Time', 'Last Week', 'Last 30 Days', 'Financial Year', 'Custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Pagination / Full List Toggle State
  const [showAllClients, setShowAllClients] = useState(false);

  // Clickable KPI Modals
  const [kpiModal, setKpiModal] = useState(null); // { title: string, clientIds: number[] }
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null, 'total', 'active', 'vip', 'inactive', 'lost'
  const [finDatePreset, setFinDatePreset] = useState('All');
  const [finStartDate, setFinStartDate] = useState('');
  const [finEndDate, setFinEndDate] = useState('');

  // Custom Interactive States for Behavioral Prompts and Post-Mortems
  const [toasts, setToasts] = useState([]);
  const [resolvedAlerts, setResolvedAlerts] = useState([]);
  const [activeNudge, setActiveNudge] = useState(null); // { type: 'reciprocity' | 'consistency', client }
  const [nudgeSubject, setNudgeSubject] = useState('');
  const [nudgeBody, setNudgeBody] = useState('');
  const [postMortemClient, setPostMortemClient] = useState(null); // client metadata for pop-up gate
  const [lossReason, setLossReason] = useState('Price');
  const [lossNotes, setLossNotes] = useState('');

  // Toast Helper
  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Date filter range calculation
  const dateFilterRange = useMemo(() => {
    let start = null;
    let end = null;
    if (datePreset === 'Last Week') {
      start = new Date(today);
      start.setDate(today.getDate() - 7);
      end = today;
    } else if (datePreset === 'Last 30 Days') {
      start = new Date(today);
      start.setDate(today.getDate() - 30);
      end = today;
    } else if (datePreset === 'Financial Year') {
      start = new Date('2026-03-01');
      end = new Date('2027-02-28');
    } else if (datePreset === 'Custom') {
      start = customStart ? new Date(customStart) : null;
      end = customEnd ? new Date(customEnd) : null;
    }
    return { start, end };
  }, [datePreset, customStart, customEnd]);

  // Dynamic Contact Enrichment & YoY Spend calculations
  const clientData = useMemo(() => {
    return contacts.map(c => {
      // Find all projects from the store
      const clientProjectsList = Object.values(projects).filter(p => p.client === c.name);
      
      // Calculate active projects and details
      const activeProjectObj = clientProjectsList.find(p => p.complete !== 'Complete');
      const activeProjectName = activeProjectObj ? activeProjectObj.name : '—';
      
      // Find completed projects
      const completedProjectsList = clientProjectsList
        .filter(p => p.complete === 'Complete')
        .sort((a, b) => new Date(b.completedDate || b.start) - new Date(a.completedDate || a.start));
      
      const lastCompletedProjectObj = completedProjectsList[0];
      const lastCompletedProjectName = lastCompletedProjectObj ? lastCompletedProjectObj.name : '—';
      const lastCompletedProjectDate = lastCompletedProjectObj ? lastCompletedProjectObj.completedDate || lastCompletedProjectObj.deadline : '—';

      // Spend Calculations
      const calculatedLtv = clientProjectsList.reduce((sum, p) => sum + (p.feeValue || 0), 0) || c.lifetimeRevenue || 0;
      const calculatedYtd = c.annualRevenue || 0;

      // Filter by Date Range if active
      let passDateFilter = true;
      const { start, end } = dateFilterRange;
      if (start || end) {
        const contactActiveDate = new Date(c.lastContactDate || c.lastProjectDate);
        if (start && contactActiveDate < start) passDateFilter = false;
        if (end && contactActiveDate > end) passDateFilter = false;
      }

      // HEALTH SCORE TRAFFIC LIGHT LOGIC
      // Green: VIP Core or Growth (Projects active/buying recently < 6 months ago)
      // Yellow: Loyal, But Dormant (projects > 3 and last project was > 6 months ago)
      // Red: Churned / At-Risk (status is Inactive OR > 12 months since last project/contact)
      let health = 'Green';
      const lastProjDiff = getDaysDiff(c.lastProjectDate);
      const lastContactDiff = getDaysDiff(c.lastContactDate);

      if (c.status === 'Inactive' || lastProjDiff > 365 || lastContactDiff > 365) {
        health = 'Red';
      } else if (c.projects > 3 && lastProjDiff >= 180) {
        health = 'Yellow';
      } else {
        health = 'Green';
      }

      return {
        ...c,
        projects: clientProjectsList.length,
        lifetimeRevenue: calculatedLtv,
        totalValue: calculatedLtv,
        annualRevenue: calculatedYtd,
        health,
        activeProjectName,
        lastCompletedProjectName,
        lastCompletedProjectDate,
        lastProjDiff,
        lastContactDiff,
        passDateFilter,
        projectsList: clientProjectsList
      };
    }).sort((a, b) => b.totalValue - a.totalValue);
  }, [contacts, projects, dateFilterRange]);

  // Apply filters for Search, Category, and Dates
  const filteredClients = useMemo(() => {
    return clientData.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'All' || c.type === filterType;
      return matchSearch && matchType && c.passDateFilter;
    });
  }, [clientData, search, filterType]);

  // Segmented calculations for Top KPI Cards (Clickable)
  const funnels = useMemo(() => {
    const totalCount = filteredClients.length;
    const activeClients = filteredClients.filter(c => c.status !== 'Inactive' && c.projectsList.some(p => p.complete !== 'Complete'));
    const vipClients = filteredClients.filter(c => c.projects > 3 && c.health === 'Green');
    const inactiveClients = filteredClients.filter(c => c.status !== 'Inactive' && !c.projectsList.some(p => p.complete !== 'Complete'));
    const lostClients = filteredClients.filter(c => c.status === 'Inactive');
    const topRevenueClients = [...filteredClients].sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

    return {
      totalCount,
      activeClients,
      vipClients,
      inactiveClients,
      lostClients,
      topRevenueClients
    };
  }, [filteredClients]);

  // ATTRITION ANALYTICS COMPUTATION
  const attritionStats = useMemo(() => {
    const total = attritionLogs.length;
    if (total === 0) return { total: 0, price: 0, friction: 0, competitor: 0, other: 0 };
    
    const price = attritionLogs.filter(l => l.reason === 'Price').length;
    const friction = attritionLogs.filter(l => l.reason === 'PM friction').length;
    const competitor = attritionLogs.filter(l => l.reason === 'Competitor').length;
    const other = attritionLogs.filter(l => l.reason === 'Other').length;

    return {
      total,
      price: Math.round((price / total) * 100),
      friction: Math.round((friction / total) * 100),
      competitor: Math.round((competitor / total) * 100),
      other: Math.round((other / total) * 100)
    };
  }, [attritionLogs]);

  // Filter by active KPI card
  const kpiFilteredClients = useMemo(() => {
    if (!activeKpiFilter || activeKpiFilter === 'total') return filteredClients;
    if (activeKpiFilter === 'active') {
      return filteredClients.filter(c => c.status !== 'Inactive' && c.projectsList.some(p => p.complete !== 'Complete'));
    }
    if (activeKpiFilter === 'vip') {
      return filteredClients.filter(c => c.projects > 3 && c.health === 'Green');
    }
    if (activeKpiFilter === 'inactive') {
      return filteredClients.filter(c => c.status !== 'Inactive' && !c.projectsList.some(p => p.complete !== 'Complete'));
    }
    if (activeKpiFilter === 'lost') {
      return filteredClients.filter(c => c.status === 'Inactive');
    }
    return filteredClients;
  }, [filteredClients, activeKpiFilter]);

  // Directory Pagination
  const pageSize = 4;
  const directoryDisplayList = useMemo(() => {
    if (showAllClients) return kpiFilteredClients;
    return kpiFilteredClients.slice(0, pageSize);
  }, [kpiFilteredClients, showAllClients]);

  // Interactive Action Nudge and Churn Resolvers
  const handleResolveAlert = (clientId, touchpointText) => {
    setContacts(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          lastContactDate: '2026-05-19',
          lastContactSummary: touchpointText,
          status: 'Active'
        };
      }
      return c;
    }));
    setResolvedAlerts(prev => [...prev, clientId]);
  };

  const openReciprocityNudge = (client) => {
    setNudgeSubject(`Exclusive 2026 Eco-Build Design Research Packet for ${client.name}`);
    setNudgeBody(`Hi ${client.name.split(' ')[0]},\n\nI hope you are doing well!\n\nAs one of our most valued architectural partners, we wanted to share our brand-new 2026 Eco-Build Design Research Packet with you for free.\n\nInside, you will find research on new sustainable lighting technologies, thermal insulation standards, and energy efficient retail specifications. Let me know if you would like to schedule a 10-minute briefing call to discuss how this applies to your upcoming works!\n\nBest regards,\nAlex\nOne to One Lighting Design`);
    setActiveNudge({ type: 'reciprocity', client });
  };

  const openConsistencyNudge = (client) => {
    setNudgeSubject(`Check-in: ${client.company} 2027 Expansion Plans`);
    setNudgeBody(`Hi ${client.name.split(' ')[0]},\n\nI hope everything is going well on your end.\n\nDuring our strategy alignment, you mentioned that your stated milestone is to open 3 new retail stores by 2027. We noticed there are currently no active pipeline drafts or specification files loaded for these projects.\n\nWe want to ensure we secure planning resources for you ahead of time. Is the 2027 store timeline still accurate so we can align our design capacity?\n\nBest regards,\nAlex\nOne to One Lighting Design`);
    setActiveNudge({ type: 'consistency', client });
  };

  const handleSendNudge = () => {
    if (!activeNudge) return;
    const { client, type } = activeNudge;
    const logText = type === 'reciprocity' 
      ? 'Emailed 2026 Eco-Build Design Research Packet (Reciprocity Nudge)'
      : `Consistency check-in regarding stated goal: "${client.statedGoal}"`;

    handleResolveAlert(client.id, logText);
    setActiveNudge(null);
    showToast(`Retention email successfully sent to ${client.name}!`);
  };

  const handleConfirmLoss = () => {
    if (!postMortemClient) return;
    logAttrition(postMortemClient.id, postMortemClient.name, lossReason, lossNotes);
    setContacts(prev => prev.map(c => {
      if (c.id === postMortemClient.id) {
        return { ...c, status: 'Inactive', lastContactDate: '2026-05-19', lastContactSummary: `Post-Mortem: Marked inactive due to ${lossReason}` };
      }
      return c;
    }));
    showToast(`Post-Mortem logged successfully. ${postMortemClient.name} is now marked Inactive.`);
    setPostMortemClient(null);
    setLossNotes('');
  };

  const addContact = () => {
    if (!form.name) return;
    setContacts(prev => [...prev, { 
      ...form, 
      id: Date.now(), 
      projects: 0, 
      status: 'Active',
      lastProjectDate: '2026-05-19',
      lastContactDate: '2026-05-19',
      lastContactSummary: 'Added new account profile to CRM',
      statedGoal: '',
      annualRevenue: 0,
      lifetimeRevenue: 0,
      orderGapMonths: 8,
      nps: 8,
      dateStarted: '2026-05-19',
      avgPaymentDelayDays: 5
    }]);
    setForm({ name: '', company: '', type: 'Architect', email: '', phone: '' });
    setShowModal(false);
    showToast('New client successfully created!');
  };

  // Render health color badge helper
  const renderHealthBadge = (health) => {
    const config = {
      Green: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: 'Active' },
      Yellow: { bg: 'rgba(234,179,8,0.1)', color: '#eab308', text: 'Dormant' },
      Red: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', text: 'Inactive' }
    };
    const c = config[health] || config.Green;
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '4px 8px', 
        borderRadius: '12px', 
        fontSize: '11px', 
        fontWeight: 600, 
        background: c.bg, 
        color: c.color 
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }}></span>
        {c.text}
      </span>
    );
  };

  const clientProjects = useMemo(() => {
    if (!selectedClient) return [];
    const rawList = Object.values(projects).filter(p => p.client === selectedClient?.name);
    if (!projSortField) return rawList;
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

    return [...rawList].sort((a, b) => {
      const valA = getVal(a, projSortField);
      const valB = getVal(b, projSortField);

      if (valA < valB) return projSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return projSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, selectedClient?.name, projSortField, projSortDirection]);

  // GLOBAL VIEW
  if (!selectedClient) {
    return (
      <div className="animation-fade-in" style={{ display: 'grid', gridTemplateColumns: isSidebarCollapsed ? '1fr 50px' : '1fr 340px', gap: '24px', alignItems: 'start' }}>
        <div style={{ minWidth: 0, position: 'relative' }}>
        {/* Success Toasts container */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} className="animation-fade-in" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="var(--text-success)" />
              {t.message}
            </div>
          ))}
        </div>

        {/* Title & Filter Bar Header */}
        <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
          <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="av-md" style={{ background: 'rgba(24, 95, 165, 0.1)', color: 'var(--text-info)' }}>
                <Users size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Global {getModuleName('crm', 'CRM')} Dashboard</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Client directory, retention analytics, and behavioral triggers.</div>
              </div>
            </div>

            {/* Date presets & Toggle buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Date Filters */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
                {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                  <button 
                    key={preset} 
                    className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`} 
                    style={{ border: 'none', background: datePreset === preset ? 'var(--text-info)' : 'none', color: datePreset === preset ? 'white' : 'var(--text-secondary)' }}
                    onClick={() => setDatePreset(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                <Calendar size={13} color="var(--text-tertiary)" />
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }} 
                  value={customStart} 
                  onChange={e => { setCustomStart(e.target.value); setDatePreset('Custom'); }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                <input 
                  type="date" 
                  className="form-control" 
                  style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }} 
                  value={customEnd} 
                  onChange={e => { setCustomEnd(e.target.value); setDatePreset('Custom'); }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clickable Intelligent KPI Funnel Cards - MATCHING PIPELINE HEIGHT AND STRUCTURE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
          
          <div 
            className={`clickable hover-scale ${activeKpiFilter === 'total' ? 'active-filter' : ''}`} 
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
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Clients</span>
              <Users size={16} color="var(--text-info)" />
            </div>
            <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {funnels.totalCount} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Clients</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>Active: <strong>{funnels.activeClients.length}</strong></span>
              <span>Inactive: <strong>{funnels.inactiveClients.length}</strong></span>
              <span>Lost: <strong>{funnels.lostClients.length}</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={11} /> All-Time directory
            </div>
          </div>

          <div 
            className={`clickable hover-scale ${activeKpiFilter === 'active' ? 'active-filter' : ''}`} 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')} 
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'active' ? '2px solid #22c55e' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Clients</span>
              <Activity size={16} color="#22c55e" />
            </div>
            <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e' }}>
              {funnels.activeClients.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Engaged</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>All Time: <strong>R {(funnels.activeClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Year to Date: <strong>R {(funnels.activeClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} /> Active in pipeline
            </div>
          </div>

          <div 
            className={`clickable hover-scale ${activeKpiFilter === 'vip' ? 'active-filter' : ''}`} 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'vip' ? null : 'vip')} 
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'vip' ? '2px solid #eab308' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VIP Clients</span>
              <Star size={16} color="#eab308" />
            </div>
            <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>
              {funnels.vipClients.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Core</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>All Time: <strong>R {(funnels.vipClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Year to Date: <strong>R {(funnels.vipClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={11} /> &gt;3 projects, Active
            </div>
          </div>

          <div 
            className={`clickable hover-scale ${activeKpiFilter === 'inactive' ? 'active-filter' : ''}`} 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'inactive' ? null : 'inactive')} 
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'inactive' ? '2px solid #64748b' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive Clients</span>
              <User size={16} color="#64748b" />
            </div>
            <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#64748b' }}>
              {funnels.inactiveClients.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Dormant</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>All Time: <strong>R {(funnels.inactiveClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Year to Date: <strong>R {(funnels.inactiveClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={11} /> No active project currently
            </div>
          </div>

          <div 
            className={`clickable hover-scale ${activeKpiFilter === 'lost' ? 'active-filter' : ''}`} 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'lost' ? null : 'lost')} 
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: activeKpiFilter === 'lost' ? '2px solid #ef4444' : '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lost Clients</span>
              <TrendingDown size={16} color="#ef4444" />
            </div>
            <div className="stat-value" style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>
              {funnels.lostClients.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Churned</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>All Time Lost: <strong>R {(funnels.lostClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Year to Date: <strong>R {(funnels.lostClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingDown size={11} /> Quoted but lost sales
            </div>
          </div>
        </div>

        <div className="crm-grid" style={{ marginTop: '20px' }}>
          {/* Main List */}
          <div>
            <div className="card">
              <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
                <div className="card-title">Client directory database</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {activeKpiFilter && (
                    <button 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => setActiveKpiFilter(null)}
                      style={{ fontSize: '11px', color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      Clear Metric Filter ({activeKpiFilter})
                    </button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="form-control" style={{ width: '200px', paddingLeft: '32px' }} placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Contact</button>
                </div>
              </div>
              <table className="table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Projects (Lifetime)</th>
                    <th>Lifetime Revenue</th>
                    <th>Status</th>
                    <th>Current Project</th>
                    <th>Last Completed Project</th>
                    <th>Last Completed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryDisplayList.map(c => (
                    <tr key={c.id} className="clickable hover-row" onClick={() => setSelectedClient(c)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="av" style={{ background: c.health === 'Green' ? 'var(--bg-success)' : c.health === 'Yellow' ? 'var(--bg-warning)' : 'var(--bg-danger)', color: c.health === 'Green' ? '#22c55e' : c.health === 'Yellow' ? '#eab308' : '#ef4444', fontWeight: 700 }}>
                            {c.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.company} • <span className={`badge ${typeColors[c.type] || 'b-default'}`} style={{ padding: '0px 4px', fontSize: '9px' }}>{c.type}</span></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{c.projects}</td>
                      <td style={{ fontWeight: 600 }}>R {c.lifetimeRevenue?.toLocaleString()}</td>
                      <td>{renderHealthBadge(c.health)}</td>
                      <td 
                        style={{ 
                          fontWeight: 500, 
                          color: c.activeProjectName !== '—' ? 'var(--text-info)' : 'var(--text-secondary)',
                          cursor: c.activeProjectName !== '—' ? 'pointer' : 'default'
                        }}
                        onClick={(e) => {
                          if (c.activeProjectName !== '—') {
                            e.stopPropagation();
                            const proj = Object.values(projects).find(pr => pr.name === c.activeProjectName);
                            if (proj) navigate(`/projects/${proj.key || proj.id || proj.name.toLowerCase().replace(/\s+/g, '-')}`);
                          }
                        }}
                      >
                        {c.activeProjectName}
                      </td>
                      <td
                        style={{
                          fontWeight: 500,
                          color: c.lastCompletedProjectName !== '—' ? 'var(--text-info)' : 'var(--text-secondary)',
                          cursor: c.lastCompletedProjectName !== '—' ? 'pointer' : 'default'
                        }}
                        onClick={(e) => {
                          if (c.lastCompletedProjectName !== '—') {
                            e.stopPropagation();
                            const proj = Object.values(projects).find(pr => pr.name === c.lastCompletedProjectName);
                            if (proj) navigate(`/projects/${proj.key}`);
                          }
                        }}
                      >
                        {c.lastCompletedProjectName}
                      </td>
                      <td>{c.lastCompletedProjectDate !== '—' ? new Date(c.lastCompletedProjectDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* View All / Full List toggle */}
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  Showing {directoryDisplayList.length} of {kpiFilteredClients.length} clients
                </span>
                <button 
                  className="btn" 
                  style={{ padding: '4px 12px', fontSize: '11px' }}
                  onClick={() => setShowAllClients(!showAllClients)}
                >
                  {showAllClients ? 'View Less (Paginated)' : 'View All / Full List'}
                </button>
              </div>
            </div>

            {/* Upgraded CRM Coach Insights feed */}
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={16} color="var(--text-info)" />
                  <span>CRM Coach & Predictive Insights Engine</span>
                </div>
                <span className="badge b-info" style={{ fontSize: '10px' }}>Active Coaching Prompts</span>
              </div>
              <div className="card-body" style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* A. Dynamic Lost Clients / Projects Feed */}
                <div className="kanban-card alert-decay-box" style={{ borderLeft: '4px solid var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>Attrition & Loss Feed</span>
                    <span>Recent Loss</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Lost Opportunity: Sandton office (James Motloung)
                  </div>
                  <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                    Reason: Price too high (Deal value R 320,000 lost to cheaper competitor)
                  </div>
                </div>

                {/* B. Dynamic Churn Velocity Alerts */}
                {clientData.map(c => {
                  if (c.projects > 3 && c.lastProjDiff > (c.orderGapMonths * 30.5) && !resolvedAlerts.includes(c.id)) {
                    const monthsSince = Math.round(c.lastProjDiff / 30.5);
                    return (
                      <div key={c.id} className="kanban-card alert-decay-box animate-pulse" style={{ borderLeft: '4px solid #ef4444', background: 'rgba(239,68,68,0.02)', padding: '16px', marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={12} /> Churn Velocity Warning (Olo data frequency)
                          </span>
                          <span className="badge b-danger" style={{ fontSize: '9px' }}>Dormant Churn</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 500 }}>
                          <strong>{c.name}</strong> usually commissions a project every {c.orderGapMonths} months. It has been {monthsSince} months since last project. Suggest reaching out immediately.
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '4px 12px', fontSize: '11px', background: '#ef4444', borderColor: '#ef4444' }}
                            onClick={() => {
                              handleResolveAlert(c.id, `Scheduled churn winback meeting with ${c.name.split(' ')[0]}.`);
                              showToast(`Review call scheduled with ${c.name}!`);
                            }}
                          >
                            Schedule Review Call
                          </button>
                          <button className="btn" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => setResolvedAlerts(prev => [...prev, c.id])}>Dismiss</button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                {/* C. Reciprocity Nudge (Nina Stroebel) */}
                {!resolvedAlerts.includes(6) && (
                  <div className="kanban-card alert-decay-box" style={{ borderLeft: '4px solid #eab308', background: 'rgba(234,179,8,0.02)', padding: '16px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#eab308', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={12} /> Reciprocity Nudge (Cialdini's Principle #1)
                      </span>
                      <span className="badge b-warning" style={{ fontSize: '9px' }}>Dormant VIP</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 500 }}>
                      Nina Stroebel is dormant. Trigger Reciprocity: Send her the new 2026 Eco-Build Design Research Packet for free to obligate value return.
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 12px', fontSize: '11px', background: '#eab308', borderColor: '#eab308', color: '#000' }}
                        onClick={() => {
                          const client = contacts.find(c => c.id === 6);
                          if (client) openReciprocityNudge(client);
                        }}
                      >
                        Draft Email with Attachment
                      </button>
                      <button className="btn" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => setResolvedAlerts(prev => [...prev, 6])}>Dismiss</button>
                    </div>
                  </div>
                )}

                {/* D. Consistency Checker (Thabo Khumalo) */}
                {!resolvedAlerts.includes(5) && (
                  <div className="kanban-card alert-decay-box" style={{ borderLeft: '4px solid var(--text-info)', background: 'rgba(24,95,165,0.02)', padding: '16px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-info)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} /> Commitment & Consistency (Munger's Misjudgment #5)
                      </span>
                      <span className="badge b-info" style={{ fontSize: '9px' }}>Goal Checker</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 500 }}>
                      Thabo Khumalo stated a goal of: "Client wants to open 3 new retail stores by 2027", but has no active pipeline leads. Push for Consistency: Ask Thabo if the 2027 expansion timeline is still accurate.
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 12px', fontSize: '11px' }}
                        onClick={() => {
                          const client = contacts.find(c => c.id === 5);
                          if (client) openConsistencyNudge(client);
                        }}
                      >
                        Push for Consistency
                      </button>
                      <button className="btn" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => setResolvedAlerts(prev => [...prev, 5])}>Dismiss</button>
                    </div>
                  </div>
                )}

                {/* E. Trend Flags (YoY shift) */}
                <div className="kanban-card alert-decay-box" style={{ borderLeft: '4px solid #a855f7', background: 'rgba(168,85,247,0.02)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>Financial Trend Flags</span>
                    <span>YoY Revenue Alerts</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                    <div>• <strong>Marco Esteves</strong>: YTD spend is down 100% (R 0 vs R 436,727 last year).</div>
                    <div>• <strong>James Motloung</strong>: YTD spend is down 100% (R 0 vs R 1,002,268 last year).</div>
                  </div>
                </div>

                {/* F. Sentiment / happiness checker (NPS) */}
                <div className="kanban-card alert-decay-box" style={{ borderLeft: '4px solid #f97316', background: 'rgba(249,115,22,0.02)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#f97316', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
                    <span>Customer Happiness NPS Flags</span>
                    <span>Satisfaction Alerts</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Marco Esteves registered a CSAT rating of 4/10.
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Flagged: High attrition risk. Low rating was attributed to PM Friction on Villa Z revisions.
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="crm-sidebar-section">
              <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Attrition Analytics Center</span>
                <span className="badge b-danger" style={{ fontSize: '9px', fontWeight: 600 }}>Leadership IQ</span>
              </div>
              <div className="card">
                <div className="card-body" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>LOSS REASON DISTRIBUTION ({attritionStats.total} TOTAL)</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                        <span>Price Resistance</span>
                        <span>{attritionStats.price}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${attritionStats.price}%`, background: '#ef4444', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                        <span>PM Hand-off Friction</span>
                        <span>{attritionStats.friction}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${attritionStats.friction}%`, background: '#eab308', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                        <span>Competitor Offers</span>
                        <span>{attritionStats.competitor}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${attritionStats.competitor}%`, background: 'var(--text-info)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>
                        <span>Other Reasons</span>
                        <span>{attritionStats.other}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${attritionStats.other}%`, background: 'var(--text-secondary)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '16px', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '8px' }}>RECENT LOSS POST-MORTEMS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {attritionLogs.slice(0, 3).map(l => (
                        <div key={l.id} style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '2px' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{l.clientName}</span>
                            <span className="badge b-danger" style={{ fontSize: '8px', padding: '0px 4px' }}>{l.reason}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '10px' }}>"{l.notes}"</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="crm-sidebar-section">
              <div className="section-label">Top Clients by Revenue</div>
              <div className="card">
                <div className="card-body" style={{ padding: '8px 0' }}>
                  {clientData.slice(0, 3).map((c, i) => (
                    <div key={c.id} className="hr-row clickable" style={{ padding: '12px 16px' }} onClick={() => setSelectedClient(c)}>
                      <div className="av" style={{ background: i === 0 ? 'var(--bg-warning)' : 'var(--bg-secondary)', color: i === 0 ? 'var(--text-warning)' : 'var(--text-primary)' }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>{c.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.projects} projects ever</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>R {(c.totalValue / 1000).toFixed(0)}k</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

        {/* Nudge Email Composer Modal */}
        {activeNudge && (
          <div className="modal-bg active" onClick={() => setActiveNudge(null)}>
            <div className="modal" style={{ width: '550px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} />
                  <span>Drafting Nudge: {activeNudge.type === 'reciprocity' ? 'Reciprocity Packet' : 'Consistency Push'}</span>
                </div>
                <button className="modal-close" onClick={() => setActiveNudge(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '16px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Recipient</label>
                  <input className="form-control" readOnly value={`${activeNudge.client.name} <${activeNudge.client.email}>`} />
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Subject</label>
                  <input className="form-control" value={nudgeSubject} onChange={e => setNudgeSubject(e.target.value)} />
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Email Body</label>
                  <textarea 
                    className="form-control" 
                    rows={8} 
                    style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
                    value={nudgeBody}
                    onChange={e => setNudgeBody(e.target.value)}
                  />
                </div>
                
                {activeNudge.type === 'reciprocity' && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border)' }}>
                    <FileText size={16} color="#eab308" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Attachment Included</div>
                      <div style={{ color: 'var(--text-secondary)' }}>2026_Eco_Build_Design_Research_Packet.pdf (2.4 MB)</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setActiveNudge(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  style={{ background: activeNudge.type === 'reciprocity' ? '#eab308' : 'var(--text-info)', borderColor: activeNudge.type === 'reciprocity' ? '#eab308' : 'var(--text-info)', color: activeNudge.type === 'reciprocity' ? '#000' : '#fff' }}
                  onClick={handleSendNudge}
                >
                  <Send size={12} style={{ marginRight: '6px' }} />
                  {activeNudge.type === 'reciprocity' ? 'Send Research Attachment' : 'Send Goal Check-in'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Loss Post-Mortem Gate Modal */}
        {postMortemClient && (
          <div className="modal-bg active" onClick={() => setPostMortemClient(null)}>
            <div className="modal" style={{ width: '480px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-head" style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                  <ShieldAlert size={16} />
                  <span>Mandatory Loss Post-Mortem</span>
                </div>
                <button className="modal-close" onClick={() => setPostMortemClient(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '16px' }}>
                <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', lineHeight: 1.4 }}>
                  <strong>Post-Mortem Policy:</strong> Before marking a client profile as Inactive/Churned, you must log the exact friction reason. This data feeds directly into our Attrition Analytics to help leadership retain key partnerships.
                </div>
                
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Client Name</label>
                  <input className="form-control" readOnly value={postMortemClient.name} />
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Attrition Primary Reason</label>
                  <select className="form-control" value={lossReason} onChange={e => setLossReason(e.target.value)}>
                    <option value="Price">Price Resistance / Budget caps</option>
                    <option value="PM friction">Project Manager friction / Handoff delays</option>
                    <option value="Competitor">Competitor (cheaper/local packaging)</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Detailed Post-Mortem Notes</label>
                  <textarea 
                    className="form-control" 
                    rows={4} 
                    required
                    placeholder="Log detail: Why are we losing them? What could we have done differently?"
                    value={lossNotes}
                    onChange={e => setLossNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setPostMortemClient(null)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  disabled={!lossNotes.trim()}
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                  onClick={handleConfirmLoss}
                >
                  Log Post-Mortem & Churn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Overlay */}
        <div className="ai-assistant">
          <button className="ai-toggle" onClick={() => setShowAi(!showAi)}>
            {showAi ? '✕' : <MessageSquare size={24} />}
          </button>
          {showAi && (
            <div className="ai-panel">
              <div className="ai-panel-head">
                <div style={{ fontSize: '14px', fontWeight: 600 }}>CRM Assistant</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Powered by Gemini 1.5</div>
              </div>
              <div className="ai-panel-body">
                <div className="ai-msg ai-msg-bot">Hello! I'm your AI assistant. I can help you analyze your client data, draft emails, or forecast your sales pipeline. What's on your mind today?</div>
                <div className="ai-msg ai-msg-user">Can you summarize my top 3 clients?</div>
                <div className="ai-msg ai-msg-bot">Certainly! Your top 3 clients by revenue are:
                  1. **Sarah Venter** (R 2M) - 2 active projects
                  2. **James Motloung** (R 1M) - 1 active project
                  3. **Liezel du Toit** (R 618k) - 1 active project
                  Would you like a detailed breakdown for any of them?</div>
              </div>
              <div className="ai-panel-footer">
                <div className="ai-input-wrap">
                  <input className="ai-input" placeholder="Type a message..." value={aiMsg} onChange={e => setAiMsg(e.target.value)} />
                  <button className="ai-send" onClick={() => setAiMsg('')}><Send size={14} /></button>
                </div>
              </div>
            </div>
          )}

        {/* New Client Modal */}
        {showModal && (
          <div className="modal-bg active" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-head"><div className="modal-title">New contact</div><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
              <div className="modal-body">
                <div className="row-2">
                  <div className="form-row"><label className="form-label">Full name *</label><input className="form-control" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
                  <div className="form-row"><label className="form-label">Company</label><input className="form-control" value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} /></div>
                </div>
                <div className="form-row"><label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                    <option>Architect</option><option>Developer</option><option>Interior</option><option>Private</option>
                  </select>
                </div>
                <div className="row-2">
                  <div className="form-row"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
                  <div className="form-row"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addContact}>Add contact</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <CollapsibleAlertSidebar 
        module="crm" 
        onNavigate={(path, state) => {
          if (path === '/crm' && state?.selectedClientId) {
            const target = contacts.find(c => c.id === state.selectedClientId);
            if (target) setSelectedClient(target);
          } else {
            navigate(path, { state });
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(prev => !prev)}
      />
    </div>
    );
  }

  // INDIVIDUAL DRILL-DOWN CLIENT PROFILE


  // Spend calculations for selectedClient
  const currentContact = clientData.find(c => c.id === selectedClient.id) || selectedClient;
  const clientLtv = currentContact.totalValue || 0;
  const clientYtd = currentContact.annualRevenue || 0;
  const client2025Spend = clientLtv - clientYtd;

  return (
    <>
      <div className="animation-fade-in" style={{ position: 'relative' }}>
      {/* Dynamic Nudges Toast panel */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="var(--text-success)" />
            {t.message}
          </div>
        ))}
      </div>

      <button className="back-btn" onClick={() => setSelectedClient(null)}>
        <ArrowLeft size={14} /> Back to CRM
      </button>

      <div className="detail-header" style={{ marginBottom: '20px' }}>
        <div className="av-lg" style={{ width: '80px', height: '80px', fontSize: '32px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>{currentContact.name.substring(0,2).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{currentContact.name}</h1>
            <span className={`badge ${typeColors[currentContact.type]}`} style={{ padding: '4px 12px' }}>{currentContact.type}</span>
            
            <button 
              className="btn btn-secondary" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '4px 10px', 
                fontSize: '11px', 
                height: '24px', 
                cursor: 'pointer' 
              }}
              onClick={() => setIsEditingClient(true)}
            >
              <Edit3 size={11} /> Edit Profile
            </button>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={16} color="var(--text-tertiary)" /> {currentContact.company}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} color="var(--text-tertiary)" /> {currentContact.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} color="var(--text-tertiary)" /> {currentContact.phone}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Lifetime Value</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>R {clientLtv.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="tabs" style={{ borderBottom: 'none', padding: '0 8px' }}>
          {['overview', 'projects', 'activity', 'financials'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'activity' ? 'Activity Log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="animation-fade-in">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="crm-grid">
            <div>
              {/* YoY Comparative Spend visual Chart */}
              <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-head"><div className="card-title">Year-over-Year Comparative Spend</div></div>
                <div className="card-body" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                        <span>2025 Calendar Spend (Historical)</span>
                        <span>R {client2025Spend.toLocaleString()}</span>
                      </div>
                      <div style={{ height: '24px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.max(10, (client2025Spend / clientLtv) * 100))}%`, background: 'linear-gradient(90deg, var(--text-info) 0%, rgba(24,95,165,0.7) 100%)', borderRadius: '6px', transition: 'width 0.8s ease' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                        <span>2026 YTD Spend (Active)</span>
                        <span>R {clientYtd.toLocaleString()}</span>
                      </div>
                      <div style={{ height: '24px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.max(10, (clientYtd / clientLtv) * 100))}%`, background: 'linear-gradient(90deg, #22c55e 0%, rgba(34,197,94,0.7) 100%)', borderRadius: '6px', transition: 'width 0.8s ease' }}></div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '16px', textAlign: 'center', fontStyle: 'italic' }}>
                    Comparison graph calculated based on enriched lifetime database metrics.
                  </div>
                </div>
              </div>

              {/* Client Details block */}
              <div className="card">
                <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-title">Client Profile Details</div>
                  <button className="btn btn-sm btn-ghost" onClick={() => setIsEditingClient(true)} style={{ color: 'var(--text-info)' }}>
                    <Edit3 size={12} style={{ marginRight: '4px' }} /> Edit
                  </button>
                </div>
                <div className="card-body">
                  <div className="kv"><span className="kv-key">Full Name</span><span className="kv-val">{selectedClient.name}</span></div>
                  <div className="kv"><span className="kv-key">Company</span><span className="kv-val">{selectedClient.company}</span></div>
                  <div className="kv"><span className="kv-key">Client Category</span><span className="kv-val">{selectedClient.type}</span></div>
                  <div className="kv"><span className="kv-key">Key Business Areas</span><span className="kv-val">Interior Design, Luxury Eco-Builds</span></div>
                  <div className="kv"><span className="kv-key">Date Started as Client</span><span className="kv-val">{selectedClient.dateStarted ? new Date(selectedClient.dateStarted).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Jan 2024'}</span></div>
                  <div className="kv"><span className="kv-key">Client Satisfaction (NPS)</span><span className="kv-val" style={{ fontWeight: 700, color: selectedClient.nps >= 8 ? '#22c55e' : selectedClient.nps >= 6 ? '#eab308' : '#ef4444' }}>{selectedClient.nps || 8}/10 CSAT</span></div>
                </div>
              </div>
            </div>

            <div>
              {/* Performance Block */}
              <div className="crm-sidebar-section">
                <div className="section-label">Performance Indicators</div>
                <div className="card">
                  <div className="card-body" style={{ padding: '16px' }}>
                    <div className="kv"><span className="kv-key">YTD Spend</span><span className="kv-val" style={{ fontWeight: 700, color: '#22c55e' }}>R {clientYtd.toLocaleString()}</span></div>
                    <div className="kv"><span className="kv-key">All-Time Spend</span><span className="kv-val" style={{ fontWeight: 700 }}>R {clientLtv.toLocaleString()}</span></div>
                    <div className="kv"><span className="kv-key">Velocity Rhythm</span><span className="kv-val">Averages every {selectedClient.orderGapMonths || 8} months</span></div>
                    <div className="kv">
                      <span className="kv-key">Last Completed Project</span>
                      <span 
                        className="kv-val" 
                        onClick={() => {
                          const proj = Object.values(projects).find(pr => pr.name === selectedClient.lastCompletedProjectName);
                          if (proj) navigate(`/projects/${proj.key || proj.id || proj.name.toLowerCase().replace(/\s+/g, '-')}`);
                        }}
                        style={{ 
                          fontWeight: 600, 
                          color: Object.values(projects).some(pr => pr.name === selectedClient.lastCompletedProjectName) ? 'var(--text-info)' : 'inherit',
                          cursor: Object.values(projects).some(pr => pr.name === selectedClient.lastCompletedProjectName) ? 'pointer' : 'default'
                        }}
                      >
                        {selectedClient.lastCompletedProjectName}
                      </span>
                    </div>
                    <div className="kv"><span className="kv-key">Relationship Status</span><span>{renderHealthBadge(selectedClient.health)}</span></div>
                  </div>
                </div>
              </div>

              {/* Milestones & Activity */}
              <div className="crm-sidebar-section" style={{ marginTop: '20px' }}>
                <div className="section-label">Upcoming Milestones & Activities</div>
                <div className="card">
                  <div className="card-body" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Clock size={16} color="var(--text-info)" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12px' }}>Stated Long-Term Objective</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>"{selectedClient.statedGoal || 'No goal registered'}"</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', borderTop: '0.5px solid var(--border)', paddingTop: '8px' }}>
                        <Target size={16} color="#eab308" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12px' }}>Expected Milestone Approval</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Design Phase 2 alignment sign-off</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', borderTop: '0.5px solid var(--border)', paddingTop: '8px' }}>
                        <Activity size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '12px' }}>Last Human Contact touchpoint</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedClient.lastContactDate} - {selectedClient.lastContactSummary}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="card">
            <div className="card-head" style={{ background: 'none', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">ALL Portfolio Projects for {selectedClient.name}</div>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  const newKey = addProject({
                    name: '',
                    client: selectedClient.name,
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
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> New Project
              </button>
            </div>
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
                   <th onClick={() => handleProjSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project {renderProjSortIcon('name')}</div>
                   </th>
                   <th onClick={() => handleProjSort('client')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Client {renderProjSortIcon('client')}</div>
                   </th>
                   <th onClick={() => handleProjSort('projectType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project Type {renderProjSortIcon('projectType')}</div>
                   </th>
                   <th onClick={() => handleProjSort('designFees')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Design Fees {renderProjSortIcon('designFees')}</div>
                   </th>
                   <th onClick={() => handleProjSort('orders')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Orders {renderProjSortIcon('orders')}</div>
                   </th>
                   <th onClick={() => handleProjSort('stage')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Stage & Progress {renderProjSortIcon('stage')}</div>
                   </th>
                   <th onClick={() => handleProjSort('margin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Margin {renderProjSortIcon('margin')}</div>
                   </th>
                   <th onClick={() => handleProjSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Status {renderProjSortIcon('status')}</div>
                   </th>
                   <th onClick={() => handleProjSort('outstanding')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Outstanding {renderProjSortIcon('outstanding')}</div>
                   </th>
                 </tr>
               </thead>
               <tbody>
                 {clientProjects.map(p => {
                   const stagesList = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5', 'Snags', 'Complete'];
                   const currentStageIdx = stagesList.indexOf(p.stage);
                   const progressPct = currentStageIdx === -1 ? 0 : Math.round(((currentStageIdx + 1) / stagesList.length) * 100);
                   
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
 
                   const isUnderTarget = actualMargin < (p.targetMargin || 18);
 
                   const typeColors = {
                     'Design & Orders': 'b-info',
                     'Design-Only': 'b-warning',
                     'Orders-Only': 'b-success'
                   };
 
                   return (
                     <tr 
                       key={p.key || p.id || p.name} 
                       className="clickable hover-row" 
                       onClick={() => navigate(`/projects/${p.key || p.id || p.name.toLowerCase().replace(/\s+/g, '-')}`)}
                       style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
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
                 {clientProjects.length === 0 && (
                   <tr>
                     <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                       No projects linked to this client.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}



        {/* TAB 4: ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div className="animation-fade-in">
            {/* Log a new activity */}
            <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--border-info)' }}>
              <div className="card-head">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={16} color="var(--text-info)" /> Log Interaction
                </div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Describe the interaction (e.g. 'Call with Sarah — confirmed Phase 2 brief')..."
                    value={newActivityText}
                    onChange={e => setNewActivityText(e.target.value)}
                    style={{ flex: 1, resize: 'vertical', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ height: '52px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                    onClick={() => {
                      if (!newActivityText.trim()) return;
                      const now = new Date();
                      const timestamp = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) +
                        ' ' + now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
                      const newEntry = {
                        id: Date.now(),
                        text: newActivityText.trim(),
                        date: timestamp,
                        staff: 'You'
                      };
                      const updated = [...clientActivities, newEntry];
                      setClientActivities(updated);
                      setNewActivityText('');
                      // Persist to contacts store
                      setContacts(prev => prev.map(c =>
                        c.id === selectedClient.id ? { ...c, activities: updated } : c
                      ));
                    }}
                  >
                    <Send size={14} /> Log Activity
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="card">
              <div className="card-head">
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="var(--text-secondary)" /> Interaction History for {selectedClient.name}
                </div>
              </div>
              <div className="card-body" style={{ padding: '16px' }}>
                {clientActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    <Activity size={28} style={{ marginBottom: '10px', opacity: 0.4 }} />
                    <div>No interactions logged yet.</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>Use the form above to record calls, meetings, emails, and follow-ups.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[...clientActivities].reverse().map((entry, idx, arr) => (
                      <div key={entry.id} style={{ display: 'flex', gap: '14px', paddingBottom: idx < arr.length - 1 ? '16px' : 0 }}>
                        {/* Timeline dot + line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: idx === 0 ? 'var(--text-info)' : 'var(--border)',
                            border: idx === 0 ? '2px solid var(--text-info)' : '2px solid var(--text-tertiary)',
                            marginTop: '3px', flexShrink: 0
                          }} />
                          {idx < arr.length - 1 && (
                            <div style={{ width: '2px', flex: 1, background: 'var(--border)', marginTop: '4px' }} />
                          )}
                        </div>
                        {/* Entry content */}
                        <div style={{ flex: 1, paddingBottom: idx < arr.length - 1 ? '4px' : 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            {entry.text}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                            <span>{entry.date}</span>
                            {entry.staff && <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>— {entry.staff}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FINANCIALS */}
        {activeTab === 'financials' && (() => {
          // Helper to sum up financials
          const getFinSummary = (projectsList) => {
            let designVal = 0;
            let designPaid = 0;
            let designOut = 0;
            let orderVal = 0;
            let orderPaid = 0;
            let orderOut = 0;

            projectsList.forEach(p => {
              if (p.designFees) {
                p.designFees.forEach(df => {
                  designVal += df.feeValue || 0;
                  designPaid += df.paid || 0;
                  designOut += df.outstanding || 0;
                });
              }
              if (p.orders) {
                p.orders.forEach(ord => {
                  orderVal += ord.value || 0;
                  orderPaid += ord.paid || 0;
                  orderOut += ord.outstanding || 0;
                });
              }
            });

            return {
              designVal,
              designPaid,
              designOut,
              orderVal,
              orderPaid,
              orderOut,
              totalVal: designVal + orderVal,
              totalPaid: designPaid + orderPaid,
              totalOut: designOut + orderOut
            };
          };

          const allTimeSummary = getFinSummary(clientProjects);
          const ytdSummary = getFinSummary(clientProjects.filter(p => {
            const d = new Date(p.start);
            return d >= new Date('2026-03-01') && d <= new Date('2027-02-28');
          }));

          const finFilteredProjects = clientProjects.filter(p => {
            if (finDatePreset === 'All') return true;
            const pDate = new Date(p.start);
            if (isNaN(pDate.getTime())) return true;
            const todayDate = new Date('2026-05-19'); // anchor date
            if (finDatePreset === '30') {
              const diffTime = Math.abs(todayDate - pDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 30;
            }
            if (finDatePreset === '90') {
              const diffTime = Math.abs(todayDate - pDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 90;
            }
            if (finDatePreset === '365') {
              const diffTime = Math.abs(todayDate - pDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 365;
            }
            if (finDatePreset === 'custom') {
              if (finStartDate && pDate < new Date(finStartDate)) return false;
              if (finEndDate && pDate > new Date(finEndDate)) return false;
              return true;
            }
            return true;
          });

          const filteredSummary = getFinSummary(finFilteredProjects);

          return (
            <div className="animation-fade-in">
              {/* Controls bar */}
              <div className="card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Filter Financial Ledger
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="btn-group" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    {[
                      { key: 'All', label: 'All Time' },
                      { key: '30', label: 'Last 30 Days' },
                      { key: '90', label: 'Last 90 Days' },
                      { key: '365', label: 'Last Year' },
                      { key: 'custom', label: 'Custom Range' }
                    ].map(p => (
                      <button 
                        key={p.key}
                        onClick={() => setFinDatePreset(p.key)}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '11px', 
                          background: finDatePreset === p.key ? 'var(--text-info)' : 'transparent',
                          color: finDatePreset === p.key ? '#fff' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: finDatePreset === p.key ? 600 : 400
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {finDatePreset === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ width: '120px', padding: '3px 8px', fontSize: '11px' }} 
                        value={finStartDate} 
                        onChange={e => setFinStartDate(e.target.value)} 
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                      <input 
                        type="date" 
                        className="form-control" 
                        style={{ width: '120px', padding: '3px 8px', fontSize: '11px' }} 
                        value={finEndDate} 
                        onChange={e => setFinEndDate(e.target.value)} 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: finDatePreset !== 'All' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {/* Card 1: ALL TIME */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-primary)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>ALL TIME SUMMARY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                      <span><strong>Design Fees:</strong></span>
                      <span>R {allTimeSummary.designVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {allTimeSummary.designPaid.toLocaleString()})</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                      <span><strong>Product Orders:</strong></span>
                      <span>R {allTimeSummary.orderVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {allTimeSummary.orderPaid.toLocaleString()})</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-info)', fontSize: '13px', paddingTop: '4px' }}>
                      <span>Total Value:</span>
                      <span>R {allTimeSummary.totalVal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>Total Paid: <strong>R {allTimeSummary.totalPaid.toLocaleString()}</strong></span>
                      <span>Outstanding: <strong style={{color:'var(--text-danger)'}}>R {allTimeSummary.totalOut.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card 2: YEAR TO DATE */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-primary)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-success)', textTransform: 'uppercase', marginBottom: '8px' }}>YEAR TO DATE (YTD)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                      <span><strong>Design Fees:</strong></span>
                      <span>R {ytdSummary.designVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {ytdSummary.designPaid.toLocaleString()})</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                      <span><strong>Product Orders:</strong></span>
                      <span>R {ytdSummary.orderVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {ytdSummary.orderPaid.toLocaleString()})</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-success)', fontSize: '13px', paddingTop: '4px' }}>
                      <span>Total Value:</span>
                      <span>R {ytdSummary.totalVal.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>Total Paid: <strong>R {ytdSummary.totalPaid.toLocaleString()}</strong></span>
                      <span>Outstanding: <strong style={{color:'var(--text-danger)'}}>R {ytdSummary.totalOut.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card 3: FILTERED PERIOD */}
                {finDatePreset !== 'All' && (
                  <div className="card" style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-primary)', border: '1px dashed var(--text-info)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-info)', textTransform: 'uppercase', marginBottom: '8px' }}>FILTERED PERIOD</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                        <span><strong>Design Fees:</strong></span>
                        <span>R {filteredSummary.designVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {filteredSummary.designPaid.toLocaleString()})</span></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '4px' }}>
                        <span><strong>Product Orders:</strong></span>
                        <span>R {filteredSummary.orderVal.toLocaleString()} <span style={{color:'var(--text-tertiary)'}}>(Paid: R {filteredSummary.orderPaid.toLocaleString()})</span></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-info)', fontSize: '13px', paddingTop: '4px' }}>
                        <span>Total Value:</span>
                        <span>R {filteredSummary.totalVal.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span>Total Paid: <strong>R {filteredSummary.totalPaid.toLocaleString()}</strong></span>
                        <span>Outstanding: <strong style={{color:'var(--text-danger)'}}>R {filteredSummary.totalOut.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Project table */}
              <div className="card">
                <div className="card-head" style={{ background: 'none' }}>
                  <div className="card-title">Project-by-Project Financial Breakdown ({finFilteredProjects.length})</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '12px', minWidth: '850px' }}>
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Date Started</th>
                        <th style={{ textAlign: 'right' }}>Design Value</th>
                        <th style={{ textAlign: 'right' }}>Design Paid</th>
                        <th style={{ textAlign: 'right' }}>Design Out</th>
                        <th style={{ textAlign: 'right' }}>Order Value</th>
                        <th style={{ textAlign: 'right' }}>Order Paid</th>
                        <th style={{ textAlign: 'right' }}>Order Out</th>
                        <th style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finFilteredProjects.map(p => {
                        const sums = getFinSummary([p]);
                        return (
                          <tr key={p.key} className="hover-row">
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td>{p.start || '—'}</td>
                            <td style={{ textAlign: 'right' }}>R {sums.designVal.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text-success)' }}>R {sums.designPaid.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: sums.designOut > 0 ? 'var(--text-danger)' : 'var(--text-secondary)' }}>R {sums.designOut.toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>R {sums.orderVal.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text-success)' }}>R {sums.orderPaid.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: sums.orderOut > 0 ? 'var(--text-danger)' : 'var(--text-secondary)' }}>R {sums.orderOut.toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: sums.totalOut > 0 ? 'var(--text-danger)' : 'var(--text-success)' }}>R {sums.totalOut.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      {finFilteredProjects.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                            No projects found matching the filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>

    {isEditingClient && editClientData && (
      <div className="modal-bg active" style={{ zIndex: 1100 }}>
        <div className="modal" style={{ width: '550px' }} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={16} />
              <span>Edit Client Profile</span>
            </div>
            <button className="modal-close" onClick={() => setIsEditingClient(false)}>✕</button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px' }}>
            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600 }}>Client Name *</label>
              <input 
                className="form-control" 
                value={editClientData.name} 
                onChange={e => setEditClientData(d => ({ ...d, name: e.target.value }))} 
              />
            </div>
            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600 }}>Company</label>
              <input 
                className="form-control" 
                value={editClientData.company} 
                onChange={e => setEditClientData(d => ({ ...d, company: e.target.value }))} 
              />
            </div>
            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600 }}>Category / Type</label>
              <select 
                className="form-control" 
                value={editClientData.type} 
                onChange={e => setEditClientData(d => ({ ...d, type: e.target.value }))}
              >
                <option value="Architect">Architect</option>
                <option value="Developer">Developer</option>
                <option value="Interior">Interior</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <div className="row-2">
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600 }}>Email</label>
                <input 
                  className="form-control" 
                  value={editClientData.email} 
                  onChange={e => setEditClientData(d => ({ ...d, email: e.target.value }))} 
                />
              </div>
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600 }}>Phone</label>
                <input 
                  className="form-control" 
                  value={editClientData.phone} 
                  onChange={e => setEditClientData(d => ({ ...d, phone: e.target.value }))} 
                />
              </div>
            </div>
            <div className="form-row">
              <label className="form-label" style={{ fontWeight: 600 }}>Stated Long-Term Objective / Goal</label>
              <input 
                className="form-control" 
                value={editClientData.statedGoal} 
                onChange={e => setEditClientData(d => ({ ...d, statedGoal: e.target.value }))} 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>NPS (1-10)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  className="form-control" 
                  value={editClientData.nps} 
                  onChange={e => setEditClientData(d => ({ ...d, nps: Number(e.target.value) }))} 
                />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Lifetime Spend (R)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={editClientData.totalValue} 
                  onChange={e => setEditClientData(d => ({ ...d, totalValue: Number(e.target.value) }))} 
                />
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>YTD Spend (R)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={editClientData.annualRevenue} 
                  onChange={e => setEditClientData(d => ({ ...d, annualRevenue: Number(e.target.value) }))} 
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn" onClick={() => setIsEditingClient(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveClient}>Save Changes</button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
