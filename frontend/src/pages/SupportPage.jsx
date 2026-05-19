import React, { useState } from 'react';

const TICKETS = [
  { id: 'TKT-001', title: 'BOQ export not generating PDF',       raised: 'Dani',    date: '13 May', priority: 'High',   status: 'Open',        cat: 'Bug' },
  { id: 'TKT-002', title: 'Design tracker column order',         raised: 'Refilwe', date: '12 May', priority: 'Low',    status: 'Closed',      cat: 'Feature' },
  { id: 'TKT-003', title: 'Add Molecule to product catalog',     raised: 'Sipho',   date: '11 May', priority: 'Medium', status: 'In progress', cat: 'Feature' },
  { id: 'TKT-004', title: 'Invoice email template missing logo', raised: 'Liana',   date: '10 May', priority: 'High',   status: 'Open',        cat: 'Bug' },
  { id: 'TKT-005', title: 'Time tracking export to CSV',         raised: 'Martin',  date: '8 May',  priority: 'Low',    status: 'Open',        cat: 'Feature' },
];

const priorityColor = { High: 'b-danger', Medium: 'b-warning', Low: 'b-default' };
const statusColor = { Open: 'b-warning', 'In progress': 'b-info', Closed: 'b-success' };

export default function SupportPage() {
  const [tickets, setTickets] = useState(TICKETS);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', cat: 'Bug', priority: 'Medium' });

  const addTicket = () => {
    if (!form.title) return;
    setTickets(prev => [...prev, { ...form, id: `TKT-00${prev.length + 1}`, raised: 'You', date: 'Today', status: 'Open' }]);
    setForm({ title: '', cat: 'Bug', priority: 'Medium' });
    setShowModal(false);
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
          {['All','Open','In progress','Closed'].map(s => (
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
              <tr key={t.id} className="clickable">
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

      {showModal && (
        <div className="modal-bg active" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><div className="modal-title">New support ticket</div><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Title *</label><input className="form-control" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} /></div>
              <div className="row-2">
                <div className="form-row"><label className="form-label">Category</label>
                  <select className="form-control" value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
                    <option>Bug</option><option>Feature</option><option>Question</option><option>Other</option>
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Priority</label>
                  <select className="form-control" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                    <option>Low</option><option>Medium</option><option>High</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addTicket}>Submit ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
