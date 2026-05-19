import React from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

export default function DesignTracker() {
  const { projects, updateProject } = useStore();
  const navigate = useNavigate();

  return (
    <div className="animation-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>Design tracker</div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Edit inline or open a project — changes sync both ways instantly</div>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <select className="tracker-select" style={{ width: 'auto' }}><option>All PMs</option><option>Martin</option><option>Dani</option></select>
          <select className="tracker-select" style={{ width: 'auto' }}><option>All status</option><option>On track</option><option>Off track</option></select>
          <select className="tracker-select" style={{ width: 'auto' }}><option>All offerings</option><option>Signature</option><option>Modus</option><option>Professional</option></select>
        </div>
      </div>
      
      <div className="tracker-wrap">
        <table className="tracker-table">
          <thead>
            <tr>
              <th className="sticky" style={{ minWidth: '140px' }}>Project</th>
              <th>Offering</th>
              <th>SQM</th>
              <th>PM</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Delay reason</th>
              <th>Design start</th>
              <th>Deadline</th>
              <th>Days left</th>
              <th>Fee excl. VAT</th>
              <th>Fee paid</th>
              <th>Outstanding</th>
              <th>Product approved</th>
              <th>Complete/Ongoing</th>
              <th>Stage 1</th>
              <th>Stage 2</th>
              <th>Stage 3</th>
              <th>Stage 4</th>
              <th>Stage 5</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(projects).map(p => (
              <tr key={p.key}>
                <td className="sticky"><span className="t-link" onClick={() => navigate(`/projects/${p.key}`)}>{p.name}</span></td>
                <td>{p.offering}</td>
                <td>{p.sqm}</td>
                <td>{p.pm}</td>
                <td>
                  <select className="tracker-select" value={p.stage} onChange={e => updateProject(p.key, 'stage', e.target.value)}>
                    {['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Snags/Site visit','Ongoing','Complete'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <select className="tracker-select" value={p.status} onChange={e => updateProject(p.key, 'status', e.target.value)}>
                    <option>On track</option><option>Off track</option>
                  </select>
                </td>
                <td>
                  <select className="tracker-select" style={{ maxWidth: '130px' }} value={p.delay} onChange={e => updateProject(p.key, 'delay', e.target.value)}>
                    {['—','Awaiting feedback/approval','Complex design iteration/rework required','Unforeseen technical challenges','Incomplete project requirements','Snags/Site visit','Other'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>{p.start}</td>
                <td>{p.deadline}</td>
                <td style={{ textAlign: 'center', color: p.daysLeft.startsWith('−') ? 'var(--text-danger)' : 'var(--text-primary)' }}>{p.daysLeft}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.feeExcl}</td>
                <td style={{ color: 'var(--text-success)' }}>{p.paid}</td>
                <td style={{ color: 'var(--text-warning)' }}>{p.outstanding}</td>
                <td style={{ textAlign: 'center' }}>
                  <select className="tracker-select" value={p.prodApproved} onChange={e => updateProject(p.key, 'prodApproved', e.target.value)}>
                    <option>Yes</option><option>No</option><option>TBC</option>
                  </select>
                </td>
                <td>
                  <select className="tracker-select" value={p.complete} onChange={e => updateProject(p.key, 'complete', e.target.value)}>
                    <option>Ongoing</option><option>Complete</option>
                  </select>
                </td>
                <td style={{ textAlign: 'center', color: 'var(--text-success)' }}>{p.s1}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-success)' }}>{p.s2}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-success)' }}>{p.s3}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-success)' }}>{p.s4}</td>
                <td style={{ textAlign: 'center', color: 'var(--text-success)' }}>{p.s5}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
