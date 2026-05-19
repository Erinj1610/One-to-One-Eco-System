import React from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const REVENUE = [420, 380, 560, 490, 710, 640, 820, 750, 680, 920, 860, 1100];
const MAX_REV = Math.max(...REVENUE);

export default function ReportsPage() {
  const ytd = REVENUE.slice(0, 5).reduce((s, v) => s + v, 0);

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value stat-info">R {(ytd).toLocaleString()}k</div><div className="stat-label">Revenue YTD</div></div>
        <div className="stat"><div className="stat-value stat-success">R 710k</div><div className="stat-label">Best month (May)</div></div>
        <div className="stat"><div className="stat-value">67%</div><div className="stat-label">Collection rate</div></div>
        <div className="stat"><div className="stat-value stat-warning">R 1.68M</div><div className="stat-label">Outstanding fees</div></div>
      </div>

      <div className="section-label">Revenue trend (2025)</div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, paddingBottom: 8, borderBottom: '0.5px solid var(--border)' }}>
            {REVENUE.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: '100%',
                    height: `${(v / MAX_REV) * 150}px`,
                    background: i < 5 ? 'var(--text-info)' : 'var(--bg-tertiary)',
                    borderRadius: '3px 3px 0 0',
                    transition: 'height 0.3s',
                    border: i < 5 ? 'none' : '0.5px dashed var(--border-strong)',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {MONTHS.map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: i < 5 ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: i < 5 ? 500 : 400 }}>{m}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>Values in R thousands · Dashed = forecast</div>
        </div>
      </div>

      <div className="row-2" style={{ gap: 14 }}>
        <div>
          <div className="section-label">Revenue by offering</div>
          <div className="card">
            <div className="card-body">
              {[
                { name: 'Signature', pct: 68, color: 'var(--text-info)' },
                { name: 'Modus',     pct: 22, color: 'var(--text-success)' },
                { name: 'Professional', pct: 10, color: 'var(--text-warning)' },
              ].map(row => (
                <div key={row.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{row.name}</span><span style={{ fontWeight: 500, color: row.color }}>{row.pct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${row.pct}%`, background: row.color }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="section-label">Top projects by fee</div>
          <div className="card">
            <table className="table">
              <thead><tr><th>Project</th><th>Fee</th><th>Paid</th></tr></thead>
              <tbody>
                {[
                  { name: 'Upper Primrose', fee: 'R 1.89M', pct: 55 },
                  { name: 'Singita Elela',  fee: 'R 1.00M', pct: 65 },
                  { name: 'House Sissou',   fee: 'R 618k',  pct: 57 },
                  { name: 'Tambor 9',       fee: 'R 306k',  pct: 60 },
                  { name: 'Villa Z',        fee: 'R 437k',  pct: 100 },
                ].map(p => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td>{p.fee}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${p.pct}%` }} /></div>
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{p.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
