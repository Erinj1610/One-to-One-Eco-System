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
  const [selectedTicketForRoute, setSelectedTicketForRoute] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const userParam = user?.name || user?.email ? `?user_email=${encodeURIComponent(user?.email || '')}&user_name=${encodeURIComponent(user?.name || '')}` : '';
      const res = await fetch(`${API_BASE}/api/workflow/my-queue${userParam}`);
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
  }, [user]);

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
      <div 
        style={{ 
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)', 
          border: '1.5px solid var(--border-strong)', 
          borderRadius: '12px', 
          padding: '24px 28px', 
          marginBottom: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.6px' }}>
                Operational Task Queue
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                First-In, First-Out (FIFO) Task Prioritization
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📥 My Workspace</span>
              <span 
                style={{ 
                  fontSize: '13px', 
                  background: 'rgba(59, 130, 246, 0.15)', 
                  color: 'var(--text-info)', 
                  padding: '2px 10px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(59, 130, 246, 0.3)' 
                }}
              >
                {totalWaiting} Pending
              </span>
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchQueue}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '20px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Total Tasks on Desk
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalWaiting}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              High Priority / Urgent
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: urgentCount > 0 ? 'var(--text-danger)' : 'var(--text-success)' }}>
              {urgentCount > 0 ? `🔥 ${urgentCount}` : '0'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
              Oldest Pending Task
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: oldestTicket ? '#f59e0b' : 'var(--text-secondary)', marginTop: '4px' }}>
              {oldestTicket ? `${oldestTicket.project_name} (${oldestTicket.age_str})` : 'Queue Clear 🎉'}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '450px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="input input-sm" 
              placeholder="Search by project, client, or action required..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', width: '100%', fontSize: '12px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Stage Filter:</span>
          <select 
            className="input input-sm" 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
            style={{ fontSize: '12px', fontWeight: 600 }}
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

      {/* FIFO TASK QUEUE TABLE */}
      <div className="card" style={{ border: '1.5px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-strong)' }}>
                <th style={{ width: '100px', textAlign: 'center' }}>FIFO Age</th>
                <th style={{ width: '180px' }}>Project</th>
                <th style={{ width: '140px' }}>Client</th>
                <th style={{ width: '170px' }}>Stage & Desk</th>
                <th>Action Required</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Priority</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((ticket, idx) => {
                const isUrgent = ticket.priority === 'Urgent';
                return (
                  <tr 
                    key={ticket.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: isUrgent ? 'rgba(239, 68, 68, 0.04)' : undefined
                    }}
                  >
                    {/* FIFO AGE */}
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span 
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '11px',
                          color: ticket.age_seconds > 86400 ? 'var(--text-danger)' : ticket.age_seconds > 14400 ? '#f59e0b' : 'var(--text-secondary)',
                          background: ticket.age_seconds > 86400 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)'
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-info)', marginBottom: '2px' }}>
                        <span>{ticket.stage_name}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Desk: <strong style={{ color: 'var(--text-primary)' }}>{ticket.assigned_to || ticket.assigned_role || 'Unassigned'}</strong>
                      </div>
                    </td>

                    {/* ACTION REQUIRED / NOTE */}
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                        {ticket.action_note || 'Review project and progress to next stage.'}
                      </div>
                      {ticket.routed_by && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Handed over by: <em>{ticket.routed_by}</em>
                        </div>
                      )}
                    </td>

                    {/* PRIORITY */}
                    <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                      <span 
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isUrgent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                          color: isUrgent ? 'var(--text-danger)' : 'var(--text-secondary)',
                          border: isUrgent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)'
                        }}
                      >
                        {ticket.priority || 'Normal'}
                      </span>
                    </td>

                    {/* DIRECT ACTION BUTTON */}
                    <td style={{ textAlign: 'center', padding: '12px 10px' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => handleLaunchTask(ticket)}
                        style={{
                          width: '100%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)'
                        }}
                      >
                        <span>Open</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={32} style={{ color: '#4ade80', margin: '0 auto 8px auto', display: 'block' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Your Queue is Clear!</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>There are currently no pending tasks waiting on your desk.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
