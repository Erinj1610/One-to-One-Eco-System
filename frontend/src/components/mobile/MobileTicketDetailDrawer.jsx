import React from 'react';
import { X, Ticket, AlertTriangle, CheckCircle2, Clock, AlertCircle, Calendar, User, MapPin, DollarSign, Clock3 } from 'lucide-react';

export default function MobileTicketDetailDrawer({ ticket, onClose }) {
  if (!ticket) return null;

  const ticketId = String(ticket.id || ticket.ticket_id || 'SNAG');
  const title = ticket.title || ticket.issue || 'Site Snag / Issue';
  const project = ticket.project_name || ticket.projectName || ticket.project || 'General Project';
  const status = ticket.status || 'Open';
  const severity = ticket.severity || ticket.priority || 'Normal';
  const stage = ticket.stage || ticket.project_stage || 'Installation / Snagging';
  const pm = ticket.assigned_pm || ticket.pm || ticket.assigned_to || 'Project Team';
  const date = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '—';
  const description = ticket.description || 'No additional issue description provided.';
  const costImpact = Number(ticket.cost_impact || 0);
  const delayDays = Number(ticket.schedule_impact_days || ticket.delay_days || 0);

  const severityBadge = (sev) => {
    const s = String(sev || 'normal').toLowerCase();
    if (s.includes('urgent') || s.includes('high') || s.includes('critical')) return 'b-danger';
    if (s.includes('med') || s.includes('warn')) return 'b-warning';
    return 'b-info';
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="mobile-drawer-handle" />

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {ticketId}
              </span>
              <span className={`badge ${severityBadge(severity)}`} style={{ fontSize: '10px' }}>
                {severity}
              </span>
              <span className="badge b-default" style={{ fontSize: '10px' }}>
                {status}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {title}
            </h3>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {project} {stage ? `• ${stage}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingBottom: '20px' }}>
          
          {/* ASSIGNMENT & TIMELINE CARD */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Assignment & Log Timeline
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Assigned PM / Lead</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {pm}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Date Logged</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {date}
                </div>
              </div>
            </div>
          </div>

          {/* IMPACT CARD */}
          {(costImpact > 0 || delayDays > 0) && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Impact Assessment
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Cost Impact</span>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-danger)', marginTop: '1px' }}>
                    {costImpact > 0 ? `R ${Math.round(costImpact).toLocaleString()}` : 'R 0'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Schedule Delay</span>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-warning)', marginTop: '1px' }}>
                    {delayDays > 0 ? `${delayDays} Days` : '0 Days'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FULL DESCRIPTION */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Site Issue Details
            </span>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
              {description}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Close Ticket Details
          </button>
        </div>
      </div>
    </div>
  );
}
