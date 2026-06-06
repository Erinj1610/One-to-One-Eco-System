import React, { useState } from 'react';
import { FileText, X, CheckCircle, AlertCircle, Clock, Tag, User, Calendar } from 'lucide-react';

const TICKETS = [
  {
    id: 'TKT-001',
    title: 'BOQ export not generating PDF',
    raised: 'Dani',
    date: '13 May',
    priority: 'High',
    status: 'Open',
    cat: 'Bug',
    description: 'When clicking "Export PDF" on any BOQ specification page, the browser shows a blank download with 0 bytes. This is blocking project handovers and needs to be resolved before end of month. Affects all users on Chrome and Edge.'
  },
  {
    id: 'TKT-002',
    title: 'Design tracker column order',
    raised: 'Refilwe',
    date: '12 May',
    priority: 'Low',
    status: 'Closed',
    cat: 'Feature',
    description: 'The design tracker columns should be reorderable by drag-and-drop so each PM can customise their view. At minimum, the "Stage" and "Owner" columns should be movable. Already implemented — closing ticket.'
  },
  {
    id: 'TKT-003',
    title: 'Add Molecule to product catalog',
    raised: 'Sipho',
    date: '11 May',
    priority: 'Medium',
    status: 'In progress',
    cat: 'Feature',
    description: 'We need the full Molecule Distributions product range (drivers, track systems, and accessories) added to the product catalog item code lookup in the Sales Tracker spreadsheet. Sipho to provide the supplier CSV file. Estimated 3–5 days to complete.'
  },
  {
    id: 'TKT-004',
    title: 'Invoice email template missing logo',
    raised: 'Liana',
    date: '10 May',
    priority: 'High',
    status: 'Open',
    cat: 'Bug',
    description: 'The invoice email template that gets sent when an invoice is marked "Sent" is missing the One to One company logo. The <img> tag is broken — the CDN path changed. Client-facing issue, needs urgent fix before next batch of invoices go out.'
  },
  {
    id: 'TKT-005',
    title: 'Time tracking export to CSV',
    raised: 'Martin',
    date: '8 May',
    priority: 'Low',
    status: 'Open',
    cat: 'Feature',
    description: 'PMs need to be able to export logged time entries to CSV for payroll and billing reporting. Should include columns: Date, Staff Member, Project, Task, Hours, Billable (Y/N). Nice-to-have: filter by date range before export.'
  },
];

const priorityColor = { High: 'b-danger', Medium: 'b-warning', Low: 'b-default' };
const statusColor = { Open: 'b-warning', 'In progress': 'b-info', Closed: 'b-success' };

export default function SupportPage() {
  const [tickets, setTickets] = useState(TICKETS);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [detailTicket, setDetailTicket] = useState(null);
  const [form, setForm] = useState({ title: '', cat: 'Bug', priority: 'Medium', description: '' });

  const addTicket = () => {
    if (!form.title) return;
    const nextId = `TKT-${String(tickets.length + 1).padStart(3, '0')}`;
    setTickets(prev => [...prev, {
      ...form,
      id: nextId,
      raised: 'You',
      date: 'Today',
      status: 'Open'
    }]);
    setForm({ title: '', cat: 'Bug', priority: 'Medium', description: '' });
    setShowModal(false);
  };

  const closeTicket = (id) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Closed' } : t));
    if (detailTicket?.id === id) setDetailTicket(prev => ({ ...prev, status: 'Closed' }));
  };

  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{tickets.length}</div><div className="stat-label">Total tickets</div></div>
        <div className="stat"><div className="stat-value stat-warning">{tickets.filter(t => t.status === 'Open').length}</div><div className="stat-label">Open</div></div>
        <div className="stat"><div className="stat-value stat-info">{tickets.filter(t => t.status === 'In progress').length}</div><div className="stat-label">In progress</div></div>
        <div className="stat"><div className="stat-value stat-danger">{tickets.filter(t => t.priority === 'High' && t.status !== 'Closed').length}</div><div className="stat-label">High priority</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Open', 'In progress', 'Closed'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New ticket</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Ticket</th><th>Title</th><th>Raised by</th><th>Date</th><th>Category</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr
                key={t.id}
                className="clickable"
                onClick={() => setDetailTicket(t)}
                style={{ cursor: 'pointer' }}
                title="Click to view details"
              >
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{t.id}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.title}</td>
                <td>{t.raised}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{t.date}</td>
                <td><span className="badge b-default">{t.cat}</span></td>
                <td><span className={`badge ${priorityColor[t.priority]}`}>{t.priority}</span></td>
                <td><span className={`badge ${statusColor[t.status]}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NEW TICKET MODAL */}
      {showModal && (
        <div className="modal-bg active" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">New support ticket</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Title *</label>
                <input className="form-control" placeholder="Brief summary of the issue..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="row-2">
                <div className="form-row"><label className="form-label">Category</label>
                  <select className="form-control" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                    <option>Bug</option><option>Feature</option><option>Question</option><option>Other</option>
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Priority</label>
                  <select className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe the issue in detail — include steps to reproduce, affected pages, and any workarounds you've tried..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTicket}>Submit ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAIL MODAL */}
      {detailTicket && (
        <div className="modal-bg active" onClick={() => setDetailTicket(null)}>
          <div className="modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={16} color="var(--text-info)" />
                <div className="modal-title">{detailTicket.id} — {detailTicket.title}</div>
              </div>
              <button className="modal-close" onClick={() => setDetailTicket(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Meta row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="kv">
                  <span className="kv-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={11} /> Raised by</span>
                  <span className="kv-val">{detailTicket.raised}</span>
                </div>
                <div className="kv">
                  <span className="kv-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} /> Date</span>
                  <span className="kv-val">{detailTicket.date}</span>
                </div>
                <div className="kv">
                  <span className="kv-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={11} /> Category</span>
                  <span className="kv-val"><span className="badge b-default">{detailTicket.cat}</span></span>
                </div>
                <div className="kv">
                  <span className="kv-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={11} /> Priority</span>
                  <span className="kv-val"><span className={`badge ${priorityColor[detailTicket.priority]}`}>{detailTicket.priority}</span></span>
                </div>
                <div className="kv" style={{ gridColumn: '1 / -1' }}>
                  <span className="kv-key" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} /> Status</span>
                  <span className="kv-val"><span className={`badge ${statusColor[detailTicket.status]}`}>{detailTicket.status}</span></span>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Description
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {detailTicket.description || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No description provided.</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setDetailTicket(null)}>Close</button>
              {detailTicket.status !== 'Closed' && (
                <button
                  className="btn btn-primary"
                  style={{ background: '#22c55e', borderColor: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => closeTicket(detailTicket.id)}
                >
                  <CheckCircle size={14} /> Mark as Closed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
