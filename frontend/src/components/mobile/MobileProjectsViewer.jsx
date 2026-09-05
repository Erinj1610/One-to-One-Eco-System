import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Briefcase, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';

export default function MobileProjectsViewer({ projects = {}, onRefresh }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');

  const projectList = useMemo(() => {
    return Object.values(projects).filter(p => !p.isDraft);
  }, [projects]);

  const filtered = useMemo(() => {
    return projectList.filter(p => {
      const name = (p.name || p.projectName || '').toLowerCase();
      const key = (p.key || '').toLowerCase();
      const client = (p.client || '').toLowerCase();
      const pm = (p.pm || p.pmName || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || name.includes(term) || key.includes(term) || client.includes(term) || pm.includes(term);

      let matchesStage = true;
      if (stageFilter === 'Active') {
        matchesStage = p.complete !== 'Complete' && p.stage !== 'Stage 1';
      } else if (stageFilter === 'Pending') {
        matchesStage = p.complete !== 'Complete' && (p.stage === 'Stage 1' || p.status === 'Pending');
      } else if (stageFilter === 'Complete') {
        matchesStage = p.complete === 'Complete';
      }

      return matchesSearch && matchesStage;
    });
  }, [projectList, searchTerm, stageFilter]);

  // Financial summary
  const summary = useMemo(() => {
    let totalVal = 0;
    let totalPaid = 0;
    let activeCount = 0;

    projectList.forEach(p => {
      if (p.complete !== 'Complete') activeCount++;
      totalVal += Number(p.feeValue || 0);
      const paid = parseInt(String(p.paid || '0').replace(/[^\d]/g, ''), 10) || 0;
      totalPaid += paid;
    });

    return { totalVal, totalPaid, activeCount };
  }, [projectList]);

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* 3-KPI SUMMARY BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '14px'
      }}>
        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Active</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', marginTop: '2px' }}>
            {summary.activeCount}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Portfolio</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            R {(summary.totalVal / 1000000).toFixed(1)}M
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Collected</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-success)', marginTop: '2px' }}>
            R {(summary.totalPaid / 1000000).toFixed(1)}M
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search projects, clients, PMs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Active', 'Pending', 'Complete'].map(filter => {
            const active = stageFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStageFilter(filter)}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: active ? 'none' : '1px solid var(--border)'
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* PROJECT FEED CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No projects found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or filter.
            </div>
          </div>
        ) : (
          filtered.map(p => {
            const isComplete = p.complete === 'Complete';
            const feeVal = Number(p.feeValue || 0);
            const paidVal = parseInt(String(p.paid || '0').replace(/[^\d]/g, ''), 10) || 0;
            const outstanding = Math.max(0, feeVal - paidVal);

            const stageBadge = isComplete ? 'b-success' : p.stage === 'Stage 1' ? 'b-warning' : 'b-info';

            return (
              <div
                key={p.key}
                className="mobile-feed-card"
                onClick={() => navigate(`/projects/${p.key}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                    {p.key}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className={`badge ${stageBadge}`} style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                      {isComplete ? 'Complete' : p.stage || 'In Progress'}
                    </span>
                    {p.status && p.status !== 'On track' && (
                      <span className="badge b-danger" style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        {p.status}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.name}
                  </h4>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {p.client || 'Direct Client'} {p.pm ? `• PM: ${p.pm}` : ''}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Budget / Fee
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                      R {Math.round(feeVal).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Paid
                    </span>
                    <strong style={{ color: 'var(--text-success)', fontSize: '12px' }}>
                      R {Math.round(paidVal).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Outstanding
                    </span>
                    <strong style={{ color: outstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', fontSize: '12px' }}>
                      R {Math.round(outstanding).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px', fontSize: '11px', color: 'var(--text-info)', fontWeight: 600 }}>
                  <span>{p.orders?.length || 0} order(s) attached</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    Open Project <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
