import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  Inbox, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  RefreshCw, 
  Send, 
  Compass, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  FileText, 
  Truck, 
  Search,
  Filter,
  Sparkles,
  Layers
} from 'lucide-react';
import UniversalWorkflowBar from '../components/workflow/UniversalWorkflowBar';

const ICON_MAP = {
  Compass: Compass,
  TrendingUp: TrendingUp,
  ShoppingCart: ShoppingCart,
  Package: Package,
  FileText: FileText,
  Truck: Truck,
  CheckCircle: CheckCircle,
  Layers: Layers
};

export default function MyWorkspace() {
  const { user } = useAuth();
  const { projects } = useStore();
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewScope, setViewScope] = useState('all'); // default to 'all' so users immediately see active company tasks
  const [selectedTicketForRoute, setSelectedTicketForRoute] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/workflow/my-queue`;
      if (viewScope === 'my') {
        const userParam = user?.name || user?.email ? `?user_email=${encodeURIComponent(user?.email || '')}&user_name=${encodeURIComponent(user?.name || '')}` : '';
        url = `${url}${userParam}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (err) {
      console.error('Failed to fetch user queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [user, viewScope]);

  // Priority and Filtering
  const filteredQueue = queue.filter(item => {
    if (filterRole !== 'All' && item.stage_name !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchProj = (item.project_name || '').toLowerCase().includes(q);
      const matchClient = (item.client_name || '').toLowerCase().includes(q);
      const matchNote = (item.action_note || '').toLowerCase().includes(q);
      const matchStage = (item.stage_name || '').toLowerCase().includes(q);
      if (!matchProj && !matchClient && !matchNote && !matchStage) return false;
    }
    return true;
  });

  const handleLaunchTask = (ticket) => {
    const projKey = ticket.project_key;
    if (ticket.target_module === 'takeoff') {
      navigate(`/projects/${encodeURIComponent(projKey)}`);
    } else if (ticket.target_module === 'orders') {
      navigate('/orders', { state: { projectKey: projKey } });
    } else if (ticket.target_module === 'invoices') {
      navigate('/invoices', { state: { projectKey: projKey } });
    } else {
      // Default: Sales Tracker
      navigate('/sales-tracker', { state: { projectKey: projKey, activeTab: ticket.target_tab || 'purchasing' } });
    }
  };

  const totalWaiting = queue.length;
  const urgentCount = queue.filter(q => q.priority === 'Urgent').length;
  const oldestTicket = queue.length > 0 ? queue[0] : null;

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '16px 20px' }}>
      
      {/* TOP HERO HEADER */}
      <div style={{ background: 'transparent', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                fontSize: '11px', 
                fontWeight: 600, 
                letterSpacing: '0.04em', 
                textTransform: 'uppercase', 
                background: '#f1f5f9', 
                color: '#475569', 
                border: '1px solid #e2e8f0' 
              }}>
                Operational Queue
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 400 }}>
                First-In, First-Out (FIFO) Departmental Workflow & Task Handover Desk
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>My Workspace</span>
              <span 
                style={{ 
                  fontSize: '11.5px', 
                  background: '#f1f5f9', 
                  color: '#475569', 
                  padding: '2px 10px', 
                  borderRadius: '20px', 
                  border: '1px solid #e2e8f0',
                  fontWeight: 600
                }}
              >
                {totalWaiting} Pending
              </span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn btn-sm"
              onClick={fetchQueue}
              disabled={loading}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontWeight: 600,
                fontSize: '12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                borderRadius: '8px',
                padding: '6px 14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '20px' }}>
          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Total Tasks on Desk
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
              {totalWaiting}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Urgent / Snags
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: urgentCount > 0 ? '#dc2626' : '#0f172a', fontFamily: 'monospace' }}>
              {urgentCount}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Oldest Pending Task
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: oldestTicket ? '#0f172a' : '#64748b', marginTop: '6px' }}>
              {oldestTicket ? `${oldestTicket.project_name} (${oldestTicket.age_str})` : 'Queue Clear 🎉'}
            </div>
          </div>
        </div>
      </div>            <div style={{ fontSize: '24px', fontWeight: 700, color: urgentCount > 0 ? '#dc2626' : '#0f172a', fontFamily: 'monospace' }}>
      {/* FILTER & SEARCH STRIP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        {/* SCOPE TOGGLE: MY TASKS VS ALL COMPANY */}
        <div style={{ display: 'inline-flex', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              padding: '6px 14px', 
              borderRadius: '6px',
              border: 'none',
              background: viewScope === 'all' ? '#0f172a' : 'transparent',
              color: viewScope === 'all' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setViewScope('all')}
          >
            All Company Projects ({totalWaiting})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              padding: '6px 14px', 
              borderRadius: '6px',
              border: 'none',
              background: viewScope === 'my' ? '#0f172a' : 'transparent',
              color: viewScope === 'my' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
            onClick={() => setViewScope('my')}
          >
            Assigned to Me
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by project, client, or action required..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', width: '100%', fontSize: '12.5px', height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage:</span>
          <select 
            className="form-control" 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
            style={{ fontSize: '12px', fontWeight: 500, height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a' }}
          >
            <option value="All">All Stages</option>
            <option value="Design & Specification">Design & Specification</option>
            <option value="Sales & Estimating">Sales & Estimating</option>
            <option value="Procurement / Purchasing">Procurement / Purchasing</option>
            <option value="Warehouse & Receiving">Warehouse & Receiving</option>
            <option value="Invoicing / Debtors">Invoicing / Debtors</option>
            <option value="Logistics & Delivery">Logistics & Delivery</option>
          </select>
        </div>
      </div>        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by project, client, or action required..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', width: '100%', fontSize: '12.5px', height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage:</span>
          <select 
            className="form-control" 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
            style={{ fontSize: '12px', fontWeight: 500, height: '34px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a' }}
          >
            <option value="All">All Stages</option>
            <option value="Design & Specification">Design & Specification</option>
            <option value="Sales & Estimating">Sales & Estimating</option>
            <option value="Procurement / Purchasing">Procurement / Purchasing</option>
            <option value="Warehouse & Receiving">Warehouse & Receiving</option>
            <option value="Invoicing / Debtors">Invoicing / Debtors</option>
            <option value="Logistics & Delivery">Logistics & Delivery</option>
          </select>
        </div>
      </div>
      {/* FIFO TASK QUEUES: SPLIT INTO CRITICAL BLOCKERS VS ROUTINE TASKS */}
      {(() => {
        const blockerItems = filteredQueue.filter(t => t.priority === 'Urgent' || (t.action_note && t.action_note.includes('[⚠️ BLOCKED:')));
        const routineItems = filteredQueue.filter(t => !blockerItems.includes(t));

        const renderTableRows = (items, isBlockerSection = false) => {
          if (items.length === 0) {
            return (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: isBlockerSection ? '24px 20px' : '40px 20px', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={24} style={{ color: '#4ade80', margin: '0 auto 6px auto', display: 'block' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isBlockerSection ? 'No Active Blockers or Site Snags!' : 'Routine Task Queue Clear'}
                  </div>
                </td>
              </tr>
            );
          }

          return items.map((ticket) => {
            const isBlocked = ticket.priority === 'Urgent' || (ticket.action_note && ticket.action_note.includes('[⚠️ BLOCKED:'));
            return (
              <tr 
                key={ticket.id} 
                style={{ 
                  borderBottom: '1px solid var(--border)',
                  background: isBlocked ? 'rgba(239, 68, 68, 0.05)' : undefined
                }}
              >
                {/* FIFO AGE */}
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <span 
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '11px',
                      color: isBlocked ? '#ef4444' : ticket.age_seconds > 86400 ? 'var(--text-danger)' : ticket.age_seconds > 14400 ? '#f59e0b' : 'var(--text-secondary)',
                      background: isBlocked ? 'rgba(239, 68, 68, 0.12)' : ticket.age_seconds > 86400 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: isBlocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)'
                    }}
                  >
                    {ticket.age_str}
                  </span>
                </td>

                {/* PROJECT NAME */}
                <td style={{ padding: '12px 10px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                    {ticket.project_name}
                  </div>
                  <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {ticket.project_key}
                  </div>
                </td>

                {/* CLIENT */}
                <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>
                  {ticket.client_name}
                </td>

                {/* STAGE & DESK */}
                <td style={{ padding: '12px 10px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: isBlocked ? '#ef4444' : 'var(--text-info)', marginBottom: '2px' }}>
                    <span>{ticket.stage_name}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Desk: <strong style={{ color: 'var(--text-primary)' }}>{ticket.assigned_to || ticket.assigned_role || 'Unassigned'}</strong>
                  </div>
                </td>

                {/* ACTION REQUIRED / NOTE */}
                <td style={{ padding: '12px 10px' }}>
                  <div style={{ color: isBlocked ? '#dc2626' : 'var(--text-primary)', fontWeight: isBlocked ? 700 : 500, lineHeight: 1.4 }}>
                    {ticket.action_note || 'Review project and progress to next stage.'}
                  </div>
                  {ticket.routed_by && (
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Logged / Handed over by: <em>{ticket.routed_by}</em>
                    </div>
                  )}
                </td>

                {/* PRIORITY / STATUS */}
                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                  <span 
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: isBlocked ? '#ef4444' : 'rgba(100, 116, 139, 0.15)',
                      color: isBlocked ? '#ffffff' : 'var(--text-secondary)',
                      border: isBlocked ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {isBlocked ? '⚠️ BLOCKED' : (ticket.priority || 'Normal')}
                  </span>
                </td>

                {/* DIRECT ACTION BUTTON */}
                <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${isBlocked ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => handleLaunchTask(ticket)}
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      boxShadow: isBlocked ? '0 2px 4px rgba(239, 68, 68, 0.3)' : '0 2px 4px rgba(59, 130, 246, 0.25)'
                    }}
                  >
                    <span>{isBlocked ? 'Resolve Issue' : 'Open'}</span>
                    <ArrowRight size={12} />
                  </button>
                </td>
              </tr>
            );
          });
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. CRITICAL BLOCKERS & SNAGS QUEUE */}
            {blockerItems.length > 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '12px 18px', background: '#fef2f2', borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Blocked Projects & Site Snags ({blockerItems.length})
                    </h3>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#b91c1c', fontWeight: 500 }}>
                    Projects halted until issues below are cleared.
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ width: '100px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Age</th>
                        <th style={{ width: '180px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project</th>
                        <th style={{ width: '140px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</th>
                        <th style={{ width: '170px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage & Desk</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Blocker Details</th>
                        <th style={{ width: '100px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                        <th style={{ width: '130px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRows(blockerItems, true)}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. ROUTINE OPERATIONAL TASKS QUEUE */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={15} style={{ color: '#64748b' }} />
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Standard Workflow Queue (FIFO Tasks) ({routineItems.length})
                  </h3>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Forward-moving project stages awaiting departmental action.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: '100px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FIFO Age</th>
                      <th style={{ width: '180px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project</th>
                      <th style={{ width: '140px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Client</th>
                      <th style={{ width: '170px', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stage & Desk</th>
                      <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Action Required</th>
                      <th style={{ width: '90px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</th>
                      <th style={{ width: '130px', textAlign: 'center', padding: '10px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Direct Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderTableRows(routineItems, false)}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
