import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import MobileOrderDetailDrawer from './MobileOrderDetailDrawer';

export default function MobileOrdersViewer({ orders = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const id = (order.orderId || order.order_id || order.id || '').toLowerCase();
      const client = (order.clientCompany || order.client_name || '').toLowerCase();
      const proj = (order.projectFullName || order.project_name || order.name || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || id.includes(term) || client.includes(term) || proj.includes(term);

      const status = order.orderStatus || order.status || 'Pending';
      const matchesStatus = statusFilter === 'All' || status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* SEARCH AND FILTER BAR */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search order #, client, project..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        {/* STATUS FILTER PILLS */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Ongoing', 'Pending', 'Complete'].map(filter => {
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

      {/* ORDERS FEED CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No orders found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or filter.
            </div>
          </div>
        ) : (
          filteredOrders.map(order => {
            const displayId = order.orderId || order.order_id || order.id || 'Order';
            const displayClient = order.clientCompany || order.client_name || 'Client';
            const displayProject = order.projectFullName || order.project_name || order.name || 'Project';
            const displayStatus = order.orderStatus || order.status || 'Pending';

            const items = order.activeOrderItems || order.items || [];
            const totalRetail = items.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitRetail || i.unit_retail) || 0)), 0);
            const discountedRetail = Math.max(0, totalRetail * (1 - (Number(order.orderDiscount) || 0) / 100));
            const valueInclVat = discountedRetail * 1.15;
            const paid = Number(order.orderPaidAmount || order.paid_amount || 0);
            const balance = Math.max(0, valueInclVat - paid);

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
                    {displayClient}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px'
                }}>
                  <div>
                    <span style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>
                      Total Value
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                      R {Math.round(valueInclVat).toLocaleString()}
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
                      Balance
                    </span>
                    <strong style={{ color: balance > 0 ? 'var(--text-warning)' : 'var(--text-success)', fontSize: '12px' }}>
                      R {Math.round(balance).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px', fontSize: '11px', color: 'var(--text-info)', fontWeight: 600 }}>
                  <span>{items.length} items specified</span>
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
