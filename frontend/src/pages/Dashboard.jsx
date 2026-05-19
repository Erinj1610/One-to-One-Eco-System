import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, DollarSign, TrendingUp, Users, FolderPlus, 
  ArrowRight, Activity, ClipboardList, CheckCircle, Clock, 
  ChevronRight, Award, Flame, AlertCircle, Percent
} from 'lucide-react';

export default function Dashboard() {
  const { projects, contacts, leads } = useStore();
  const navigate = useNavigate();

  // 1. Calculate Core Financials & Metrics
  const metrics = useMemo(() => {
    const projList = Object.values(projects);
    const active = projList.filter(p => p.complete !== 'Complete');
    const offTrack = projList.filter(p => p.status === 'Off track');
    
    // Total portfolio value & billed
    let totalPortfolioVal = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    projList.forEach(p => {
      totalPortfolioVal += p.feeValue || 0;
      
      const paidVal = parseInt(p.paid?.replace(/[^\d]/g, '') || 0);
      const outVal = parseInt(p.outstanding?.replace(/[^\d]/g, '') || 0);
      
      totalPaid += paidVal;
      totalOutstanding += outVal;
    });

    // Opportunities
    const leadList = Object.values(leads).flat();
    const pipelineValue = leadList.reduce((sum, l) => sum + (l.value || 0), 0);

    return {
      activeCount: active.length,
      offTrackCount: offTrack.length,
      totalPortfolioVal,
      totalPaid,
      totalOutstanding,
      pipelineValue,
      leadCount: leadList.length
    };
  }, [projects, leads]);

  // 2. Stage Breakdown
  const stageStats = useMemo(() => {
    const stats = { 'Stage 1': 0, 'Stage 2': 0, 'Stage 3': 0, 'Snags': 0, 'Complete': 0 };
    Object.values(projects).forEach(p => {
      const stage = p.stage;
      if (stats[stage] !== undefined) {
        stats[stage]++;
      } else if (p.complete === 'Complete') {
        stats['Complete']++;
      }
    });
    return stats;
  }, [projects]);

  const activeProjects = Object.values(projects).filter(p => p.complete !== 'Complete');

  return (
    <div className="animation-fade-in">
      {/* 1. Stat Cards Row */}
      <div className="stat-grid stat-grid-4">
        <div className="stat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="av-md" style={{ background: 'var(--bg-info)', color: 'var(--text-info)' }}><Briefcase size={18} /></div>
            <span className="trend trend-up"><TrendingUp size={10} /> +2 New</span>
          </div>
          <div className="stat-label">Active Projects</div>
          <div className="stat-value">{metrics.activeCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Across {contacts.length} core clients</div>
        </div>

        <div className="stat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="av-md" style={{ background: 'var(--bg-success)', color: 'var(--text-success)' }}><DollarSign size={18} /></div>
            <span className="trend trend-up"><TrendingUp size={10} /> 12%</span>
          </div>
          <div className="stat-label">Revenue Target</div>
          <div className="stat-value">R {(metrics.totalPortfolioVal / 1000000).toFixed(2)}M</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>R {(metrics.totalPaid / 1000000).toFixed(2)}M cash collected</div>
        </div>

        <div className="stat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="av-md" style={{ background: 'var(--bg-warning)', color: 'var(--text-warning)' }}><TrendingUp size={18} /></div>
            <span className="trend trend-up"><TrendingUp size={10} /> 8%</span>
          </div>
          <div className="stat-label">Outstanding Invoices</div>
          <div className="stat-value">R {(metrics.totalOutstanding / 1000000).toFixed(2)}M</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Aging average: 18 days</div>
        </div>

        <div className="stat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="av-md" style={{ background: 'var(--bg-danger)', color: 'var(--text-danger)' }}><AlertCircle size={18} /></div>
            {metrics.offTrackCount > 0 ? (
              <span className="trend trend-down" style={{ background: 'rgba(239,83,80,0.1)', color: 'var(--text-danger)' }}><Flame size={10} /> Urgent</span>
            ) : (
              <span className="trend trend-up">All clear</span>
            )}
          </div>
          <div className="stat-label">Off-Track Risk</div>
          <div className="stat-value" style={{ color: metrics.offTrackCount > 0 ? 'var(--text-danger)' : 'var(--text-primary)' }}>
            {metrics.offTrackCount} {metrics.offTrackCount === 1 ? 'Project' : 'Projects'}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Awaiting client decisions</div>
        </div>
      </div>

      {/* 2. Main Double-Column Layout */}
      <div className="crm-grid" style={{ marginTop: '24px' }}>
        {/* Left Side: Projects Portfolio and Lead Opportunities */}
        <div>
          {/* Active Projects Card */}
          <div className="card">
            <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
              <div>
                <div className="card-title">Live Portfolio Tracking</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Real-time execution phases & outstanding billing</div>
              </div>
              <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => navigate('/projects')}>
                View Portfolio <ArrowRight size={12} style={{ marginLeft: '4px' }} />
              </button>
            </div>
            <table className="table">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Offering</th>
                  <th>PM</th>
                  <th>Stage</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map(p => (
                  <tr key={p.key} className="clickable" onClick={() => navigate(`/projects/${p.key}`)}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{p.client}</div>
                      </div>
                    </td>
                    <td>{p.offering}</td>
                    <td><span className="av" style={{ width: '22px', height: '22px', fontSize: '9px' }}>{p.pm}</span></td>
                    <td><span className="badge b-default">{p.stage}</span></td>
                    <td>{p.deadline}</td>
                    <td>
                      <span className={`badge ${p.status === 'On track' ? 'b-success' : 'b-danger'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-warning)' }}>
                      {p.outstanding}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sales Pipeline Opportunity Value */}
          <div className="card" style={{ marginTop: '20px' }}>
            <div className="card-head" style={{ background: 'none', borderBottom: 'none' }}>
              <div>
                <div className="card-title">Opportunities & Estimations</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Active proposals in the high-fidelity Sales Pipeline</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Pipeline Total</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-info)' }}>R {metrics.pipelineValue.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {Object.entries(leads).slice(0, 4).map(([stage, items]) => {
                  const val = items.reduce((s, i) => s + i.value, 0);
                  return (
                    <div key={stage} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', border: '0.5px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>{stage}</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>R {(val/1000).toFixed(0)}k</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>{items.length} opportunities</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Stage Breakdown, Tasks & Updates */}
        <div>
          {/* Visual Progress Breakdown */}
          <div className="crm-sidebar-section">
            <div className="section-label">Portfolio Stages Breakdown</div>
            <div className="card">
              <div className="card-body">
                {Object.entries(stageStats).map(([stage, count]) => {
                  const total = Object.values(projects).length;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={stage} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                        <span>{stage}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${pct}%`, 
                          background: stage === 'Complete' ? 'var(--text-success)' : stage === 'Snags' ? 'var(--text-warning)' : 'var(--text-info)', 
                          borderRadius: '3px' 
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Action Center */}
          <div className="crm-sidebar-section">
            <div className="section-label">Staff Actions Hub</div>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => navigate('/crm')}>
                  <FolderPlus size={14} style={{ marginRight: '8px' }} /> Launch CRM Detail View
                </button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '10px 0', justifyContent: 'center' }} onClick={() => navigate('/sales-pipeline')}>
                    Sales Pipeline
                  </button>
                  <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '10px 0', justifyContent: 'center' }} onClick={() => navigate('/time-tracking')}>
                    Time Tracking
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live System Activity Feed */}
          <div className="crm-sidebar-section">
            <div className="section-label">Recent Activity Feed</div>
            <div className="card">
              <div className="card-body" style={{ padding: '12px' }}>
                {[
                  { desc: 'Dani updated Upper Primrose target to Stage 1', time: '10 mins ago', icon: <Activity size={10} /> },
                  { desc: 'Invoiced Kalahari project snag balance', time: '2 hours ago', icon: <DollarSign size={10} /> },
                  { desc: 'Martin Review requested on Villa Z layout', time: 'Yesterday', icon: <ClipboardList size={10} /> },
                  { desc: 'Nando’s Stellenbosch successfully set to Complete', time: '2 days ago', icon: <CheckCircle size={10} /> }
                ].map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: 'var(--bg-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--text-info)',
                      marginTop: '2px'
                    }}>
                      {a.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)' }}>{a.desc}</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}><Clock size={8} inline /> {a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
