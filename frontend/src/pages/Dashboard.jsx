import React from 'react';
import { 
  Briefcase, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Flame, 
  Folder, 
  ArrowRight, 
  Clock, 
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { contacts, projects } = useStore();
  const navigate = useNavigate();

  // Compute live portfolio metrics
  const computeMetrics = () => {
    let totalPortfolioVal = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let activeCount = 0;
    let offTrackCount = 0;

    const projectList = Object.values(projects || {});

    projectList.forEach(p => {
      const orders = Array.isArray(p.orders) ? p.orders : Object.values(p.orders || {});
      const pVal = orders.reduce((sum, o) => sum + (Number(o.total_price || o.totalValue || o.value || 0)), 0);
      const pPaid = orders.reduce((sum, o) => sum + (Number(o.paid_amount || o.paidAmount || 0)), 0);
      
      totalPortfolioVal += pVal;
      totalPaid += pPaid;
      totalOutstanding += Math.max(0, pVal - pPaid);

      if (p.stage !== 'Completed' && p.stage !== 'Archived') {
        activeCount++;
      }
      if (p.health === 'At Risk' || p.health === 'Critical' || p.status === 'Blocked') {
        offTrackCount++;
      }
    });

    return {
      totalPortfolioVal,
      totalPaid,
      totalOutstanding,
      activeCount,
      offTrackCount,
      projectList
    };
  };

  const metrics = computeMetrics();

  return (
    <div className="animation-fade-in" style={{ padding: '0 4px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. STUDIO HERO HEADER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: '#f1f5f9',
              color: '#475569',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0'
            }}>
              EXECUTIVE INTELLIGENCE
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>Live Portfolio & Billing Vitals</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Operations & Performance Dashboard
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/projects')}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Folder size={13} /> View Projects
          </button>
          <button
            onClick={() => navigate('/sales-tracker')}
            className="btn btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0f172a',
              border: '1px solid #0f172a',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <TrendingUp size={13} /> Sales Tracker
          </button>
        </div>
      </div>

      {/* 2. STAT CARDS ROW (ARCHITECTURAL STUDIO DESIGN) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {/* Card 1: Active Projects */}
        <div style={{
          background: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
              ACTIVE PROJECTS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={14} color="#0f172a" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
            {metrics.activeCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>Sites</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Across {contacts?.length || 0} registered client accounts
          </div>
        </div>

        {/* Card 2: Portfolio Revenue */}
        <div style={{
          background: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
              PORTFOLIO VALUE
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
            R {(metrics.totalPortfolioVal / 1000000).toFixed(2)}M
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            R {(metrics.totalPaid / 1000000).toFixed(2)}M cash receipts collected
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div style={{
          background: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
              OUTSTANDING BALANCE
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={14} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
            R {(metrics.totalOutstanding / 1000000).toFixed(2)}M
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Awaiting invoice & payment settlement
          </div>
        </div>

        {/* Card 4: Off-Track Risk */}
        <div style={{
          background: '#ffffff',
          padding: '16px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
              SITE RISK STATUS
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={14} color={metrics.offTrackCount > 0 ? '#ef4444' : '#16a34a'} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: metrics.offTrackCount > 0 ? '#ef4444' : '#0f172a', fontFamily: 'monospace' }}>
            {metrics.offTrackCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>Flagged</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            {metrics.offTrackCount > 0 ? 'Requires site PM intervention' : 'All live projects on track'}
          </div>
        </div>
      </div>

      {/* 3. MAIN PORTFOLIO & RECENT SITES TABLE */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Live Projects Portfolio</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Active architectural specifications and execution stages</div>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: '11.5px',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600
            }}
          >
            Explore all <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>Project Name</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>Client Account</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>Stage</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>Health</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Portfolio Value</th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {metrics.projectList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No active projects found in ecosystem.
                  </td>
                </tr>
              ) : (
                metrics.projectList.slice(0, 8).map(p => {
                  const orders = Array.isArray(p.orders) ? p.orders : Object.values(p.orders || {});
                  const pVal = orders.reduce((sum, o) => sum + (Number(o.total_price || o.totalValue || o.value || 0)), 0);
                  return (
                    <tr 
                      key={p.key || p.id} 
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {p.client || 'Client Direct'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-default" style={{ fontSize: '10.5px' }}>
                          {p.stage || 'Design'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${p.health === 'Critical' || p.status === 'Blocked' ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '10.5px' }}>
                          {p.health || 'On Track'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        R {Math.round(pVal).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => navigate(`/projects/${p.key || p.id}`)}
                          className="btn btn-xs"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0f172a',
                            cursor: 'pointer'
                          }}
                        >
                          Workspace →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
