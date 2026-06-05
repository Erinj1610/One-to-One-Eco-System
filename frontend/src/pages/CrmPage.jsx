import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import PipelinePage from './PipelinePage';
import { 
  User, Building2, Briefcase, TrendingUp, ArrowLeft, Mail, Phone, 
  ExternalLink, FileText, CheckCircle, Clock, Search, Bell, 
  MoreVertical, Calendar, DollarSign, MessageSquare, Send, ChevronRight,
  TrendingDown, Star, Filter, Plus, AlertTriangle, ShieldAlert, Heart, Target,
  X, HelpCircle, Activity, Award, Edit3, Users
} from 'lucide-react';

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
    logAttrition
  } = useStore();

  const navigate = useNavigate();

  // Page States
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAi, setShowAi] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [form, setForm] = useState({ name: '', company: '', type: 'Architect', email: '', phone: '' });

  // Edit Client Profile States
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientData, setEditClientData] = useState(null);

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
    const activeClients = filteredClients.filter(c => c.status === 'Active');
    const vipClients = filteredClients.filter(c => c.projects > 3 && c.health === 'Green');
    const importantClients = filteredClients.filter(c => c.projects > 3 && c.health === 'Yellow');
    const inactiveClients = filteredClients.filter(c => c.health === 'Red');
    const topRevenueClients = [...filteredClients].sort((a, b) => b.totalValue - a.totalValue).slice(0, 3);

    return {
      totalCount,
      activeClients,
      vipClients,
      importantClients,
      inactiveClients,
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

  // Directory Pagination
  const pageSize = 4;
  const directoryDisplayList = useMemo(() => {
    if (showAllClients) return filteredClients;
    return filteredClients.slice(0, pageSize);
  }, [filteredClients, showAllClients]);

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

  // GLOBAL VIEW
  if (!selectedClient) {
    return (
      <>
        <div className="animation-fade-in" style={{ position: 'relative' }}>
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
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Global CRM Dashboard</h2>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '18px' }}>
          
          <div className="stat clickable hover-scale" onClick={() => setKpiModal({ title: 'Total Clients', clientIds: funnels.vipClients.concat(funnels.importantClients, funnels.inactiveClients, funnels.activeClients).map(c => c.id) })} style={{ borderLeft: '3.5px solid var(--text-secondary)', background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Clients</span>
              <Users size={14} color="var(--text-secondary)" />
            </div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{funnels.totalCount} Clients</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>Active: <strong>{funnels.activeClients.length}</strong></span>
              <span>Inactive: <strong>{funnels.inactiveClients.length}</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={11} /> All-Time directory
            </div>
          </div>

          <div className="stat clickable hover-scale" onClick={() => setKpiModal({ title: 'Active Clients', clientIds: funnels.activeClients.map(c => c.id) })} style={{ borderLeft: '3.5px solid #22c55e', background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Clients</span>
              <Activity size={14} color="#22c55e" />
            </div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{funnels.activeClients.length} Engaged</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>LTV: <strong>R {(funnels.activeClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>YTD: <strong>R {(funnels.activeClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={11} /> Active in pipeline
            </div>
          </div>

          <div className="stat clickable hover-scale" onClick={() => setKpiModal({ title: 'VIP Clients', clientIds: funnels.vipClients.map(c => c.id) })} style={{ borderLeft: '3.5px solid #eab308', background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VIP Clients</span>
              <Star size={14} color="#eab308" />
            </div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#eab308' }}>{funnels.vipClients.length} Core</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>LTV: <strong>R {(funnels.vipClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>YTD: <strong>R {(funnels.vipClients.reduce((a,c)=>a+(c.annualRevenue||0),0)/1000).toFixed(0)}k</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={11} /> &gt;3 projects, Active
            </div>
          </div>

          <div className="stat clickable hover-scale" onClick={() => setKpiModal({ title: 'Important Clients', clientIds: funnels.importantClients.map(c => c.id) })} style={{ borderLeft: '3.5px solid #ef4444', background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Important Clients</span>
              <Heart size={14} color="#ef4444" />
            </div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>{funnels.importantClients.length} Dormant</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>LTV: <strong>R {(funnels.importantClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Status: <strong>Yellow (Aging)</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Heart size={11} /> Needs urgent outreach
            </div>
          </div>

          <div className="stat clickable hover-scale" onClick={() => setKpiModal({ title: 'Inactive Clients', clientIds: funnels.inactiveClients.map(c => c.id) })} style={{ borderLeft: '3.5px solid #64748b', background: 'var(--bg-primary)', borderTop: '0.5px solid var(--border)', borderRight: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inactive Clients</span>
              <User size={14} color="#64748b" />
            </div>
            <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{funnels.inactiveClients.length} Churned</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
              <span>LTV Lost: <strong>R {(funnels.inactiveClients.reduce((a,c)=>a+(c.totalValue||0),0)/1000).toFixed(0)}k</strong></span>
              <span>Status: <strong>Red (Churn)</strong></span>
            </div>
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={11} /> &gt;12 months inactive
            </div>
          </div>


        </div>

        <div className="crm-grid" style={{ marginTop: '20px' }}>
          {/* Main List */}
          <div>
            <div className="card">
              <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
                <div className="card-title">Client directory database</div>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                  Showing {directoryDisplayList.length} of {filteredClients.length} clients
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

      {/* Dynamic KPI summary modal list */}
        {kpiModal && (
          <div className="modal-bg active" onClick={() => setKpiModal(null)}>
            <div className="modal" style={{ width: '550px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={16} />
                  <span>{kpiModal.title}</span>
                </div>
                <button className="modal-close" onClick={() => setKpiModal(null)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '0', overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: '13px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: '16px' }}>Client Name</th>
                      <th>Total Revenue</th>
                      <th>Lead Owner</th>
                      <th style={{ paddingRight: '16px' }}>Last Contact Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpiModal.clientIds.map(id => {
                      const c = contacts.find(con => con.id === id);
                      if (!c) return null;
                      return (
                        <tr key={c.id} className="hover-row">
                          <td style={{ paddingLeft: '16px' }}>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.company} • {c.type}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>R {c.lifetimeRevenue?.toLocaleString()}</td>
                          <td>{c.leadOwner || 'Unassigned'}</td>
                          <td style={{ paddingRight: '16px' }}>{c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(c);
                                setKpiModal(null);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {kpiModal.clientIds.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '20px' }}>
                          No clients found in this segment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setKpiModal(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

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
        </div>

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
      </>
    );
  }

  // INDIVIDUAL DRILL-DOWN CLIENT PROFILE
  const clientProjects = Object.values(projects).filter(p => p.client === selectedClient.name);


  // Spend calculations for selectedClient
  const clientLtv = selectedClient.totalValue || 0;
  const clientYtd = selectedClient.annualRevenue || 0;
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
        <div className="av-lg" style={{ width: '80px', height: '80px', fontSize: '32px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>{selectedClient.name.substring(0,2).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>{selectedClient.name}</h1>
            <span className={`badge ${typeColors[selectedClient.type]}`} style={{ padding: '4px 12px' }}>{selectedClient.type}</span>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={16} color="var(--text-tertiary)" /> {selectedClient.company}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} color="var(--text-tertiary)" /> {selectedClient.email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} color="var(--text-tertiary)" /> {selectedClient.phone}</span>
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
          {['overview', 'projects', 'pipeline', 'financials'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
            <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
              <div className="card-title">ALL Portfolio Projects for {selectedClient.name}</div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Offering Type</th>
                  <th>Current Stage</th>
                  <th>Status</th>
                  <th>Target Margin</th>
                  <th>Actual Margin</th>
                  <th>Budget (R)</th>
                </tr>
              </thead>
              <tbody>
                {clientProjects.map(p => (
                  <tr 
                    key={p.key || p.id || p.name} 
                    className="clickable hover-row" 
                    onClick={() => navigate(`/projects/${p.key || p.id || p.name.toLowerCase().replace(/\s+/g, '-')}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-info)' }}>{p.name}</td>
                    <td>{p.offering}</td>
                    <td>{p.stage}</td>
                    <td>
                      <span className={`badge ${p.complete === 'Complete' ? 'b-success' : 'b-warning'}`}>
                        {p.complete}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.targetMargin || 18}%</td>
                    <td style={{ fontWeight: 600, color: (p.actualMargin || 18) >= (p.targetMargin || 18) ? '#22c55e' : '#ef4444' }}>
                      {p.actualMargin || 18}%
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.feeExcl}</td>
                  </tr>
                ))}
                {clientProjects.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                      No projects linked to this client.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PIPELINE (Bi-Directional Synced Opportunities Kanban) */}
        {activeTab === 'pipeline' && (
          <div style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '-16px' }}>
            <PipelinePage clientFilter={selectedClient.name} />
          </div>
        )}

        {/* TAB 4: FINANCIALS & INTELLIGENT LEARNINGS */}
        {activeTab === 'financials' && (
          <div className="animation-fade-in">
            {/* Contextual intelligent learnings banner */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.08) 0%, rgba(24,95,165,0.01) 100%)', border: '1px solid rgba(24,95,165,0.2)', marginBottom: '20px', padding: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <ShieldAlert size={20} color="var(--text-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>Intelligent CRM Coach learnings banner</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '12px' }}>
                    
                    {/* A. Spend trend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={14} color="#22c55e" />
                      <span>Spend Trend: <strong>Revenue from {selectedClient.name} is UP 15%</strong> compared to previous financial year.</span>
                    </div>

                    {/* B. Margin health (Villa Z Marco Esteves is 12% vs 18% target) */}
                    {clientProjects.some(p => p.actualMargin < p.targetMargin) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 600 }}>
                        <TrendingDown size={14} color="#ef4444" />
                        <span>Margin Health Alert: Average margin for this client is dropping below target (18% to 12%). Review fee structures.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={14} color="#22c55e" />
                        <span>Margin Health: Margin is strong at average 19%, exceeding the 18% target threshold.</span>
                      </div>
                    )}

                    {/* C. Payment delay */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#eab308" />
                      <span>Payment Behavior: Client pays invoices on average <strong>{selectedClient.avgPaymentDelayDays} days late</strong>.</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            <div className="stat-grid stat-grid-3">
              <div className="fin-card">
                <div className="fin-label">Lifetime Value (Detailed)</div>
                <div className="fin-val">R {clientLtv.toLocaleString()}</div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <div className="kv"><span className="kv-key">Project Fees</span><span className="kv-val">R {(clientLtv * 0.9).toLocaleString()}</span></div>
                  <div className="kv"><span className="kv-key">Consulting</span><span className="kv-val">R {(clientLtv * 0.08).toLocaleString()}</span></div>
                  <div className="kv"><span className="kv-key">Disbursals</span><span className="kv-val">R {(clientLtv * 0.02).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="fin-card">
                <div className="fin-label">Account Balance</div>
                <div className="fin-val" style={{ color: 'var(--text-danger)' }}>R {(clientLtv - (selectedClient.invoiced || clientLtv * 0.65)).toLocaleString()}</div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <div className="kv"><span className="kv-key">Total Paid</span><span className="kv-val">R {(selectedClient.invoiced || clientLtv * 0.65).toLocaleString()}</span></div>
                  <div className="kv"><span className="kv-key">Outstanding</span><span className="kv-val">R {(clientLtv - (selectedClient.invoiced || clientLtv * 0.65)).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="fin-card">
                <div className="fin-label">Overall Margin Performance</div>
                <div className="fin-val" style={{ color: clientProjects.some(p => p.actualMargin < p.targetMargin) ? '#ef4444' : '#22c55e' }}>
                  {clientProjects.some(p => p.actualMargin < p.targetMargin) ? '12.0%' : '19.2%'}
                </div>
                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Calculated against baseline targets.</div>
                </div>
              </div>
            </div>

            <div className="crm-grid" style={{ marginTop: '20px' }}>
              <div>
                <div className="card">
                  <div className="card-head" style={{ background: 'none' }}><div className="card-title">Recent Invoices</div></div>
                  <table className="table">
                    <thead><tr><th>Date</th><th>Invoice #</th><th>Project</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr><td>10 May 2026</td><td>#2034</td><td>Kalahari</td><td>R 151,725</td><td><span className="badge b-success">Paid</span></td></tr>
                      <tr><td>01 May 2026</td><td>#2033</td><td>Upper Primrose</td><td>R 150,000</td><td><span className="badge b-warning">Pending</span></td></tr>
                      <tr><td>15 Apr 2026</td><td>#2032</td><td>Kalahari</td><td>R 150,000</td><td><span className="badge b-danger">Overdue</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <div className="card">
                  <div className="card-head" style={{ background: 'none' }}><div className="card-title">Project Margins comparison</div></div>
                  <div className="card-body">
                    {clientProjects.map(p => (
                      <div key={p.key} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                        <div className="kv" style={{ border: 'none', padding: '2px 0' }}><span className="kv-key">Target Margin Baseline</span><span className="kv-val">{p.targetMargin || 18}%</span></div>
                        <div className="kv" style={{ border: 'none', padding: '2px 0' }}><span className="kv-key">Actual Project Margin</span><span className="kv-val" style={{ fontWeight: 700, color: p.actualMargin >= p.targetMargin ? '#22c55e' : '#ef4444' }}>{p.actualMargin || 18}%</span></div>
                      </div>
                    ))}
                    {clientProjects.length === 0 && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No projects available.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
