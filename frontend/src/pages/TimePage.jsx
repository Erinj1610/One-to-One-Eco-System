import React, { useState } from 'react';

const WEEK = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16'];
const STAFF = ['Martin', 'Dani', 'Refilwe', 'Sipho', 'Liana'];
const PROJECTS = ['Upper Primrose', 'Villa Z', 'Tambor 9', 'Singita Elela', 'House Sissou', 'Admin', 'Leave'];

const initialEntries = [
  { id: 1, staff: 'Martin',   day: 'Mon 12', project: 'Villa Z',        hours: 4 },
  { id: 2, staff: 'Martin',   day: 'Mon 12', project: 'Tambor 9',       hours: 3 },
  { id: 3, staff: 'Dani',     day: 'Mon 12', project: 'Singita Elela',  hours: 7 },
  { id: 4, staff: 'Martin',   day: 'Tue 13', project: 'Upper Primrose', hours: 6 },
  { id: 5, staff: 'Dani',     day: 'Tue 13', project: 'House Sissou',   hours: 5 },
  { id: 6, staff: 'Refilwe',  day: 'Wed 14', project: 'Admin',          hours: 2 },
  { id: 7, staff: 'Sipho',    day: 'Thu 15', project: 'Tambor 9',       hours: 8 },
  { id: 8, staff: 'Liana',    day: 'Fri 16', project: 'Leave',          hours: 7.5 },
];

export default function TimePage() {
  const [entries, setEntries] = useState(initialEntries);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff: 'Martin', day: WEEK[0], project: PROJECTS[0], hours: '' });

  const addEntry = () => {
    if (!form.hours) return;
    setEntries(prev => [...prev, { ...form, id: Date.now(), hours: parseFloat(form.hours) }]);
    setForm({ staff: 'Martin', day: WEEK[0], project: PROJECTS[0], hours: '' });
    setShowModal(false);
  };

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billable = entries.filter(e => e.project !== 'Admin' && e.project !== 'Leave').reduce((s, e) => s + e.hours, 0);

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{totalHours}h</div><div className="stat-label">Total this week</div></div>
        <div className="stat"><div className="stat-value stat-success">{billable}h</div><div className="stat-label">Billable hours</div></div>
        <div className="stat"><div className="stat-value stat-warning">{(totalHours - billable)}h</div><div className="stat-label">Non-billable</div></div>
        <div className="stat"><div className="stat-value stat-info">{STAFF.length}</div><div className="stat-label">Staff tracked</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="section-label" style={{ margin: 0 }}>Week of 12 – 16 May 2025</div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Log time</button>
      </div>

      {STAFF.map(staff => {
        const staffEntries = entries.filter(e => e.staff === staff);
        if (!staffEntries.length) return null;
        const staffHours = staffEntries.reduce((s, e) => s + e.hours, 0);
        return (
          <div className="card" key={staff} style={{ marginBottom: 10 }}>
            <div className="card-head">
              <div className="card-title">
                <div className="av" style={{ width: 26, height: 26, fontSize: 10 }}>{staff[0]}</div>
                {staff}
              </div>
              <span className="badge b-info">{staffHours}h</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead><tr><th>Day</th><th>Project</th><th>Hours</th><th>Type</th></tr></thead>
                <tbody>
                  {staffEntries.map(e => (
                    <tr key={e.id}>
                      <td>{e.day}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.project}</td>
                      <td>{e.hours}h</td>
                      <td><span className={`badge ${e.project === 'Admin' || e.project === 'Leave' ? 'b-default' : 'b-success'}`}>{e.project === 'Admin' || e.project === 'Leave' ? e.project : 'Billable'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {showModal && (
        <div className="modal-bg active" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><div className="modal-title">Log time</div><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="row-2">
                <div className="form-row"><label className="form-label">Staff member</label>
                  <select className="form-control" value={form.staff} onChange={e => setForm(f => ({...f, staff: e.target.value}))}>
                    {STAFF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Day</label>
                  <select className="form-control" value={form.day} onChange={e => setForm(f => ({...f, day: e.target.value}))}>
                    {WEEK.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="row-2">
                <div className="form-row"><label className="form-label">Project</label>
                  <select className="form-control" value={form.project} onChange={e => setForm(f => ({...f, project: e.target.value}))}>
                    {PROJECTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="form-label">Hours *</label>
                  <input className="form-control" type="number" step="0.5" min="0.5" max="12" value={form.hours} onChange={e => setForm(f => ({...f, hours: e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addEntry}>Log entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
