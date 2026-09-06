import React, { useState, useMemo } from 'react';
import { Search, Ticket, AlertTriangle, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import MobileTicketDetailDrawer from './MobileTicketDetailDrawer';

export default function MobileTicketsViewer({ tickets = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const filteredTickets = useMemo(() => {
    return (tickets || []).filter(t => {
      if (!t) return false;
      const id = String(t.id || t.ticket_id || '').toLowerCase();
      const issue = String(t.title || t.issue || t.description || '').toLowerCase();
      const project = String(t.project_name || t.projectName || t.project || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || id.includes(term) || issue.includes(term) || project.includes(term);

      let matchesStatus = true;
      const st = String(t.status || 'open').toLowerCase();
      if (statusFilter === 'Open') {
        matchesStatus = st === 'open';
      } else if (statusFilter === 'In Progress') {
        matchesStatus = st === 'in progress' || st === 'investigating';
      } else if (statusFilter === 'Resolved') {
        matchesStatus = st === 'resolved' || st === 'closed';
      }

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, statusFilter]);

  const severityBadge = (sev) => {
    const s = (sev || 'normal').toLowerCase();
    if (s.includes('urgent') || s.includes('high') || s.includes('critical')) return 'b-danger';
    if (s.includes('med') || s.includes('warn')) return 'b-warning';
    return 'b-info';
  };

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* SEARCH AND STATUS FILTER */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search tickets, snags, projects..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Open', 'In Progress', 'Resolved'].map(f => {
            const active = statusFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
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
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* TICKETS FEED */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No tickets found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              All snags are resolved or adjust your filter.
            </div>
          </div>
        ) : (
          filteredTickets.map((t, idx) => {
            const ticketId = t.id || t.ticket_id || `SNAG-${idx + 1}`;
            const title = t.title || t.issue || 'Site Snag / Issue';
            const project = t.project_name || t.projectName || t.project || 'General';
            const status = t.status || 'Open';
            const severity = t.severity || t.priority || 'Normal';
            const date = t.created_at ? new Date(t.created_at).toLocaleDateString() : '—';

            return (
              <div
                key={ticketId}
                className="mobile-feed-card"
                onClick={() => setSelectedTicket(t)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                    {ticketId}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${severityBadge(severity)}`} style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                      {severity}
                    </span>
                    <span className="badge b-default" style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                      {status}
                    </span>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {title}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Project: <strong style={{ color: 'var(--text-primary)' }}>{project}</strong> • Date: {date}
                  </div>
                </div>

                {t.description && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    lineHeight: '1.4'
                  }}>
                    {t.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* TICKET DETAIL DRAWER */}
      {selectedTicket && (
        <MobileTicketDetailDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
