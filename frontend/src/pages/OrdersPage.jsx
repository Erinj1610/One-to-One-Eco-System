import React, { useState } from 'react';

const initialOrders = [
  { id: 'PO-2025-041', project: 'Singita Elela',  supplier: 'Modus Lighting',     items: 12, value: 'R 48,600', date: '2 May 2025',  status: 'Delivered',  eta: '—' },
  { id: 'PO-2025-042', project: 'Upper Primrose',  supplier: 'Molecule Dist.',     items: 6,  value: 'R 21,350', date: '7 May 2025',  status: 'In transit', eta: '16 May' },
  { id: 'PO-2025-043', project: 'Tambor 9',        supplier: 'Philips Advance',    items: 30, value: 'R 14,200', date: '9 May 2025',  status: 'Pending',    eta: '20 May' },
  { id: 'PO-2025-044', project: 'House Sissou',    supplier: 'Made by 1-to-1',    items: 2,  value: 'R 16,800', date: '12 May 2025', status: 'Processing', eta: '28 May' },
  { id: 'PO-2025-045', project: 'Villa Z',         supplier: 'Modus Lighting',     items: 18, value: 'R 36,540', date: '13 May 2025', status: 'Pending',    eta: '22 May' },
];

const statusColor = { Delivered: 'b-success', 'In transit': 'b-info', Pending: 'b-default', Processing: 'b-warning' };

export default function OrdersPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? orders : orders.filter(o => o.status === filter);
  const total = orders.reduce((s, o) => s + parseFloat(o.value.replace(/[^0-9.]/g, '')), 0);

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{orders.length}</div><div className="stat-label">Total orders</div></div>
        <div className="stat"><div className="stat-value stat-info">{orders.filter(o => o.status === 'In transit').length}</div><div className="stat-label">In transit</div></div>
        <div className="stat"><div className="stat-value stat-warning">{orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length}</div><div className="stat-label">Pending</div></div>
        <div className="stat"><div className="stat-value">R {(total/1000).toFixed(0)}k</div><div className="stat-label">Total order value</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All','Pending','Processing','In transit','Delivered'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary">+ New order</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>PO Number</th><th>Project</th><th>Supplier</th><th>Items</th><th>Value</th><th>Date</th><th>ETA</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="clickable">
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-info)', fontWeight: 500 }}>{o.id}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{o.project}</td>
                <td>{o.supplier}</td>
                <td style={{ textAlign: 'center' }}>{o.items}</td>
                <td style={{ fontWeight: 500 }}>{o.value}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{o.date}</td>
                <td>{o.eta}</td>
                <td><span className={`badge ${statusColor[o.status]}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
