import React from 'react';
import { X, CheckCircle2, Clock, AlertTriangle, Truck, DollarSign, FileText, ChevronDown } from 'lucide-react';

export default function MobileOrderDetailDrawer({ order, onClose }) {
  if (!order) return null;

  const {
    id,
    orderId,
    order_id,
    name,
    clientCompany,
    client_name,
    projectFullName,
    project_name,
    orderStatus,
    status,
    orderPaidAmount = 0,
    paid_amount = 0,
    activeOrderItems = [],
    items = [],
    orderDiscount = 0,
    pmName,
    pfNumber
  } = order;

  const displayId = orderId || order_id || id || 'Order';
  const displayClient = clientCompany || client_name || 'Client';
  const displayProject = projectFullName || project_name || 'Project';
  const displayStatus = orderStatus || status || 'Pending';

  const orderItems = Array.isArray(activeOrderItems) && activeOrderItems.length > 0
    ? activeOrderItems
    : Array.isArray(items)
    ? items
    : Array.isArray(order.itemsList)
    ? order.itemsList
    : [];

  // Calculate financials
  const totalCost = orderItems.length > 0
    ? orderItems.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitCost || i.unit_cost || i.cost) || 0)), 0)
    : Number(order.costValue || order.cost || 0);

  const totalRetail = orderItems.length > 0
    ? orderItems.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitRetail || i.unit_retail || i.price) || 0)), 0)
    : Number(order.value || order.total || 0);

  const discountedRetail = Number(order.value || 0) > 0 && orderItems.length === 0
    ? Number(order.value)
    : Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));

  const valueInclVat = order.valueInclVat || (discountedRetail * 1.15);
  const paidVal = Number(orderPaidAmount || paid_amount || order.paid || 0);
  const outstanding = Math.max(0, valueInclVat - paidVal);
  const marginPct = discountedRetail > 0 ? Math.round(((discountedRetail - totalCost) / discountedRetail) * 100) : 0;

  // Progress metrics
  let totalQty = 0;
  let totalProc = 0;
  let totalInv = 0;
  let totalDel = 0;

  orderItems.forEach(i => {
    const q = Number(i.qty) || 0;
    totalQty += q;
    totalProc += Number(i.receivedQty || i.received_qty || 0);
    totalInv += Number(i.invoiceQty || i.invoiced_qty || 0);
    totalDel += Number(i.deliveryQty || i.delivery_qty || 0);
  });

  const procPct = totalQty > 0 ? Math.min(100, Math.round((totalProc / totalQty) * 100)) : 0;
  const invPct = totalQty > 0 ? Math.min(100, Math.round((totalInv / totalQty) * 100)) : 0;
  const delPct = totalQty > 0 ? Math.min(100, Math.round((totalDel / totalQty) * 100)) : 0;

  const getStatusBadge = () => {
    if (displayStatus === 'Complete') {
      return <span className="badge b-success" style={{ fontSize: '11px', padding: '3px 8px' }}>✓ Complete</span>;
    }
    if (displayStatus === 'Ongoing') {
      return <span className="badge b-info" style={{ fontSize: '11px', padding: '3px 8px' }}>● Ongoing</span>;
    }
    return <span className="badge b-warning" style={{ fontSize: '11px', padding: '3px 8px' }}>⏳ Pending</span>;
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()}>
        <div className="mobile-drawer-handle" />

        {/* DRAWER TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {displayId}
              </span>
              {getStatusBadge()}
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {name || displayProject}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {displayClient} {pmName ? `• PM: ${pmName}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* FINANCIAL SUMMARY TILES */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          border: '1px solid var(--border)'
        }}>
          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Total Incl VAT
            </span>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              R {Math.round(valueInclVat).toLocaleString()}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Amount Paid
            </span>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-success)', marginTop: '2px' }}>
              R {Math.round(paidVal).toLocaleString()}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Balance Due
            </span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: outstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginTop: '2px' }}>
              R {Math.round(outstanding).toLocaleString()}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Margin
            </span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: marginPct < 39 ? 'var(--text-danger)' : 'var(--text-success)', marginTop: '2px' }}>
              {marginPct}%
            </div>
          </div>
        </div>

        {/* PROGRESS METRICS */}
        <div style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Fulfillment Status
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                <span>Procurement (Received)</span>
                <span>{procPct}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procPct}%`, background: '#4ade80', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                <span>Invoiced</span>
                <span>{invPct}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${invPct}%`, background: '#f59e0b', borderRadius: '3px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                <span>Delivered to Site</span>
                <span>{delPct}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${delPct}%`, background: '#60a5fa', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* LINE ITEMS SPECIFICATION SUMMARY */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
              Specification Items ({orderItems.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
            {orderItems.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No line items registered on this order.
              </div>
            ) : (
              orderItems.map((item, idx) => {
                const code = item.itemCode || item.code || item.item_code || `Item ${idx + 1}`;
                const desc = item.description || item.name || '';
                const qty = Number(item.qty) || 0;
                const retail = Number(item.unitRetail || item.unit_retail) || 0;
                const lineTotal = qty * retail;

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                        {code}
                      </div>
                      {desc && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {desc}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-info)' }}>
                        {qty} × R {Math.round(retail).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        R {Math.round(lineTotal).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CLOSE BUTTON */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '13px', fontWeight: 600 }}
          onClick={onClose}
        >
          Close Detail View
        </button>
      </div>
    </div>
  );
}
