import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import MobileOrderDetailDrawer from './MobileOrderDetailDrawer';

export default function MobileSalesViewer({ orders = [], kpis, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const id = (o.id || o.orderId || '').toLowerCase();
      const name = (o.quote_name || o.projectName || '').toLowerCase();
      const client = (o.clientCompany || o.projectClient || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || id.includes(term) || name.includes(term) || client.includes(term);
      const status = o.status || 'Pending';
      const matchesStatus = statusFilter === 'All' || status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* 4-KPI SUMMARY HEADER BANNER */}
      {kpis && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '14px'
        }}>
          <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Orders Value</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', marginTop: '2px' }}>
              R {Math.round(kpis.totalVal / 1000)}k
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-success)', marginTop: '2px' }}>
              R {Math.round(kpis.totalPaid / 1000)}k
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-warning)', marginTop: '2px' }}>
              R {Math.round((kpis.totalVal - kpis.totalPaid) / 1000)}k
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Average Margin</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {kpis.avgMargin || 42}%
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTER BAR */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search quote, project, client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Complete', 'Ongoing', 'Pending'].map(filter => {
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: active ? 'none' : '1px solid var(--border)'
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* SALES FEED CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No sales records found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or status filter.
            </div>
          </div>
        ) : (
          filtered.map(order => {
            const displayId = order.id || order.orderId || 'Order';
            const displayProject = order.quote_name || order.projectFullName || order.projectName || 'Project';
            const displayClient = order.clientCompany || order.projectClient || 'Client';
            const displayStatus = order.status || 'Pending';

            const retail = Number(order.value || 0);
            const paid = Number(order.paid || 0);
            const balance = Math.max(0, retail - paid);
            const margin = order.margin || (retail > 0 ? Math.round(((retail - Number(order.costValue || 0)) / retail) * 100) : 0);

            return (
              <div
                key={displayId}
                className="mobile-feed-card"
                onClick={() => setSelectedOrder(order)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                    {displayId}
                  </span>
                  <span
                    className={`badge ${displayStatus === 'Complete' ? 'b-success' : displayStatus === 'Ongoing' ? 'b-info' : 'b-warning'}`}
                    style={{ fontSize: '10px', padding: '2px 7px' }}
                  >
                    {displayStatus}
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {displayProject}
                  </h4>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    {displayClient} {order.projectPm ? `• PM: ${order.projectPm}` : ''}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Value (Incl)
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                      R {Math.round(retail).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Paid
                    </span>
                    <strong style={{ color: 'var(--text-success)', fontSize: '12px' }}>
                      R {Math.round(paid).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Margin
                    </span>
                    <strong style={{ color: margin < 39 ? 'var(--text-danger)' : 'var(--text-success)', fontSize: '12px' }}>
                      {margin}%
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px', fontSize: '11px', color: 'var(--text-info)', fontWeight: 600 }}>
                  <span>Outstanding: R {Math.round(balance).toLocaleString()}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    View details <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedOrder && (
        <MobileOrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
