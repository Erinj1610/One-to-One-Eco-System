import React, { useState } from 'react';

const STAFF = [
  { id: 1, name: 'Martin Döller',  role: 'Founder / Design Director', dept: 'Modus',     email: 'martin@1-to-1.world',  startDate: '1 Jan 2010', status: 'Active', leave: 18, avatar: 'MD' },
  { id: 2, name: 'Dani Ferreira',  role: 'Senior Lighting Designer',  dept: 'Modus',     email: 'dani@1-to-1.world',    startDate: '3 Mar 2018', status: 'Active', leave: 14, avatar: 'DF' },
  { id: 3, name: 'Refilwe Sithole',role: 'Project Coordinator',       dept: 'Modus',     email: 'refilwe@1-to-1.world', startDate: '15 Jun 2021',status: 'Active', leave: 12, avatar: 'RS' },
  { id: 4, name: 'Sipho Khumalo',  role: 'Technical Designer',        dept: 'Molecule',  email: 'sipho@1-to-1.world',   startDate: '2 Aug 2022', status: 'Active', leave: 10, avatar: 'SK' },
  { id: 5, name: 'Liana van Wyk',  role: 'Studio Manager',            dept: 'Admin',     email: 'liana@1-to-1.world',   startDate: '1 Feb 2019', status: 'Active', leave: 20, avatar: 'LW' },
  { id: 6, name: 'James Okafor',   role: 'Showroom Consultant',       dept: 'Mood',      email: 'james@1-to-1.world',   startDate: '7 Nov 2023', status: 'Active', leave: 10, avatar: 'JO' },
];

const deptColor = { Modus: 'b-info', Molecule: 'b-success', Admin: 'b-default', Mood: 'b-warning' };
const avatarBg = { MD: '#e6f1fb', DF: '#eaf3de', RS: '#faeeda', SK: '#fcebeb', LW: '#e6f1fb', JO: '#eaf3de' };
const avatarFg = { MD: 'var(--text-info)', DF: 'var(--text-success)', RS: 'var(--text-warning)', SK: 'var(--text-danger)', LW: 'var(--text-info)', JO: 'var(--text-success)' };

const LEAVE_REQUESTS = [
  { id: 1, staff: 'Dani Ferreira',   type: 'Annual',  from: '26 May', to: '30 May', days: 5, status: 'Pending' },
  { id: 2, staff: 'Sipho Khumalo',   type: 'Sick',    from: '13 May', to: '13 May', days: 1, status: 'Approved' },
  { id: 3, staff: 'Refilwe Sithole', type: 'Annual',  from: '16 Jun', to: '20 Jun', days: 5, status: 'Pending' },
];

export default function HrPage() {
  const [selected, setSelected] = useState(null);
  const [leaves, setLeaves] = useState(LEAVE_REQUESTS);

  const approve = (id) => setLeaves(prev => prev.map(l => l.id === id ? {...l, status: 'Approved'} : l));
  const reject  = (id) => setLeaves(prev => prev.map(l => l.id === id ? {...l, status: 'Rejected'} : l));

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{STAFF.length}</div><div className="stat-label">Staff members</div></div>
        <div className="stat"><div className="stat-value stat-info">{STAFF.filter(s => s.dept === 'Modus').length}</div><div className="stat-label">Modus team</div></div>
        <div className="stat"><div className="stat-value stat-warning">{leaves.filter(l => l.status === 'Pending').length}</div><div className="stat-label">Leave requests</div></div>
        <div className="stat"><div className="stat-value stat-success">{STAFF.filter(s => s.status === 'Active').length}</div><div className="stat-label">Active today</div></div>
      </div>

      <div className="section-label">Team directory</div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: 0 }}>
          {STAFF.map(s => (
            <div key={s.id} className="hr-row clickable" style={{ padding: '10px 15px' }} onClick={() => setSelected(s === selected ? null : s)}>
              <div className="av-md" style={{ background: avatarBg[s.avatar], color: avatarFg[s.avatar] }}>{s.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.role}</div>
              </div>
              <span className={`badge ${deptColor[s.dept]}`} style={{ marginRight: 12 }}>{s.dept}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.leave}d leave</span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="card" style={{ marginBottom: 18, border: '1.5px solid var(--border-info)' }}>
          <div className="card-head">
            <div className="card-title">{selected.name}</div>
            <button className="btn btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
          </div>
          <div className="card-body">
            <div className="row-2">
              <div className="kv-list">
                <div className="kv"><span className="kv-key">Role</span><span className="kv-val">{selected.role}</span></div>
                <div className="kv"><span className="kv-key">Department</span><span className="kv-val">{selected.dept}</span></div>
                <div className="kv"><span className="kv-key">Email</span><span className="kv-val" style={{ color: 'var(--text-info)' }}>{selected.email}</span></div>
              </div>
              <div className="kv-list">
                <div className="kv"><span className="kv-key">Start date</span><span className="kv-val">{selected.startDate}</span></div>
                <div className="kv"><span className="kv-key">Leave balance</span><span className="kv-val">{selected.leave} days</span></div>
                <div className="kv"><span className="kv-key">Status</span><span className="kv-val"><span className="badge b-success">{selected.status}</span></span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section-label">Leave requests</div>
      <div className="card">
        <table className="table">
          <thead><tr><th>Staff</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {leaves.map(l => (
              <tr key={l.id}>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{l.staff}</td>
                <td>{l.type}</td>
                <td>{l.from}</td>
                <td>{l.to}</td>
                <td style={{ textAlign: 'center' }}>{l.days}</td>
                <td><span className={`badge ${l.status === 'Approved' ? 'b-success' : l.status === 'Rejected' ? 'b-danger' : 'b-warning'}`}>{l.status}</span></td>
                <td>
                  {l.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-sm" style={{ color: 'var(--text-success)', borderColor: 'var(--border-success)' }} onClick={() => approve(l.id)}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => reject(l.id)}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
