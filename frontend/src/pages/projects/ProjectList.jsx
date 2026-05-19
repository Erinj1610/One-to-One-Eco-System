import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';

export default function ProjectList() {
  const { projects } = useStore();
  const navigate = useNavigate();

  return (
    <div className="animation-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div className="section-label" style={{ margin: 0 }}>All projects</div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <select className="t-sel" style={{ width: 'auto', padding: '4px 8px' }}>
            <option>All PMs</option>
            <option>Martin</option>
            <option>Dani</option>
          </select>
        </div>
      </div>
      <table className="table">
        <colgroup>
          <col style={{ width: '22%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '24%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Project</th>
            <th>Offering</th>
            <th>PM</th>
            <th>Stage</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(projects).map(p => (
            <tr key={p.key} className="clickable" onClick={() => navigate(`/projects/${p.key}`)}>
              <td className="link">{p.name}</td>
              <td>{p.offering}</td>
              <td>{p.pm}</td>
              <td>{p.stage}</td>
              <td>{p.deadline}</td>
              <td><span className={`badge ${p.status === 'On track' ? 'b-success' : 'b-danger'}`}>{p.status}</span></td>
              <td style={{ color: 'var(--text-warning)', fontWeight: 500 }}>{p.outstanding}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
