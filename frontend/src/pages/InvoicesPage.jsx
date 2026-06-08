import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

const statusColor = { Paid: 'b-success', Unpaid: 'b-warning', Overdue: 'b-danger', Draft: 'b-default' };

export default function InvoicesPage() {
  const { invoices, setInvoices } = useStore();
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? invoices : invoices.filter(i => i.status === filter);
  const outstanding = invoices.filter(i => !i.paid).reduce((s, i) => s + parseFloat(i.amount.replace(/[^0-9.]/g, '')), 0);
  const paid = invoices.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount.replace(/[^0-9.]/g, '')), 0);

  const markPaid = (id) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'Paid', paid: true } : i));
  };

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{invoices.length}</div><div className="stat-label">Total invoices</div></div>
        <div className="stat"><div className="stat-value stat-danger">{invoices.filter(i => i.status === 'Overdue').length}</div><div className="stat-label">Overdue</div></div>
        <div className="stat"><div className="stat-value stat-warning">R {(outstanding/1000).toFixed(0)}k</div><div className="stat-label">Outstanding</div></div>
        <div className="stat"><div className="stat-value stat-success">R {(paid/1000).toFixed(0)}k</div><div className="stat-label">Paid YTD</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All','Draft','Unpaid','Overdue','Paid'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : ''}`} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn-primary">+ New invoice</button>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Invoice #</th><th>Project</th><th>Client</th><th>Amount</th><th>Issued</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="clickable">
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-info)', fontWeight: 500 }}>{inv.id}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{inv.project}</td>
                <td>{inv.client}</td>
                <td style={{ fontWeight: 500 }}>{inv.amount}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{inv.issued}</td>
                <td style={{ color: inv.status === 'Overdue' ? 'var(--text-danger)' : 'var(--text-secondary)' }}>{inv.due}</td>
                <td><span className={`badge ${statusColor[inv.status]}`}>{inv.status}</span></td>
                <td>{!inv.paid && inv.status !== 'Draft' && (
                  <button className="btn btn-sm" onClick={() => markPaid(inv.id)}>Mark paid</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
