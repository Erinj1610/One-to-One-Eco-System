import React, { useState } from 'react';
import { 
  X, CheckCircle2, Clock, AlertTriangle, Truck, DollarSign, 
  FileText, CreditCard, ChevronRight, Package, Layers, ShieldCheck, Box
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function MobileOrderDetailDrawer({ order, onClose }) {
  const { projects = {}, invoices: allInvoices = [] } = useStore();
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'billing' | 'financials'

  if (!order) return null;

  const displayId = order.orderId || order.order_id || order.id || 'Order';
  
  // Find full order in store if available
  let fullOrder = order;
  for (const p of Object.values(projects || {})) {
    const found = (p.orders || []).find(o => (o.orderId || o.order_id || o.id) === displayId);
    if (found) {
      fullOrder = { ...order, ...found };
      break;
    }
  }

  const {
    name,
    clientCompany,
    client_name,
    projectFullName,
    project_name,
    orderStatus,
    status,
    orderPaidAmount = 0,
    paid_amount = 0,
    orderDiscount = 0,
    pmName,
    depositValue = 0,
    depositPaymentDate,
    balanceValue = 0,
    balancePaymentDate,
    clientInvoices = [],
    payments = [],
    deliveryNotes = [],
    goodsReceivedNotes = []
  } = fullOrder;

  const displayClient = clientCompany || client_name || 'Client';
  const displayProject = projectFullName || project_name || 'Project';
  const displayStatus = orderStatus || status || 'Pending';

  const orderItems = Array.isArray(fullOrder.activeOrderItems) && fullOrder.activeOrderItems.length > 0
    ? fullOrder.activeOrderItems
    : Array.isArray(fullOrder.items)
    ? fullOrder.items
    : Array.isArray(fullOrder.itemsList)
    ? fullOrder.itemsList
    : [];

  // Calculate financials
  const totalCost = orderItems.length > 0
    ? orderItems.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitCost || i.unit_cost || i.cost) || 0)), 0)
    : Number(fullOrder.costValue || fullOrder.cost || 0);

  const totalRetail = orderItems.length > 0
    ? orderItems.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitRetail || i.unit_retail || i.price) || 0)), 0)
    : Number(fullOrder.value || fullOrder.total || 0);

  const discountedRetail = Number(fullOrder.value || 0) > 0 && orderItems.length === 0
    ? Number(fullOrder.value)
    : Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));

  const valueInclVat = fullOrder.valueInclVat || (discountedRetail * 1.15);
  const paidVal = Number(orderPaidAmount || paid_amount || fullOrder.paid || 0);
  const outstanding = Math.max(0, valueInclVat - paidVal);
  const grossProfit = Math.max(0, discountedRetail - totalCost);
  const marginPct = discountedRetail > 0 ? Math.round((grossProfit / discountedRetail) * 100) : 0;

  // Matching invoices
  const matchedInvoices = Array.isArray(clientInvoices) && clientInvoices.length > 0
    ? clientInvoices
    : allInvoices.filter(inv => {
        const invOrder = inv.order_id || inv.orderId || inv.matched_order_id;
        return invOrder && String(invOrder).toLowerCase() === String(displayId).toLowerCase();
      });

  // Progress metrics
  let totalQty = 0;
  let totalProc = 0;
  let totalInv = 0;
  let totalDel = 0;

  orderItems.forEach(i => {
    const q = Number(i.qty) || 0;
    totalQty += q;
    totalProc += Number(i.receivedQty || i.received_qty || i.procuredQty || 0);
    totalInv += Number(i.invoiceQty || i.invoiced_qty || 0);
    totalDel += Number(i.deliveryQty || i.delivery_qty || i.deliveredQty || 0);
  });

  const procPct = totalQty > 0 ? Math.min(100, Math.round((totalProc / totalQty) * 100)) : 0;
  const invPct = totalQty > 0 ? Math.min(100, Math.round((totalInv / totalQty) * 100)) : 0;
  const delPct = totalQty > 0 ? Math.min(100, Math.round((totalDel / totalQty) * 100)) : 0;

  const getStatusBadge = () => {
    if (displayStatus === 'Complete') {
      return <span className="badge b-success" style={{ fontSize: '10px', padding: '3px 8px' }}>✓ Complete</span>;
    }
    if (displayStatus === 'Ongoing') {
      return <span className="badge b-info" style={{ fontSize: '10px', padding: '3px 8px' }}>● Ongoing</span>;
    }
    return <span className="badge b-warning" style={{ fontSize: '10px', padding: '3px 8px' }}>⏳ Pending</span>;
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
        <div className="mobile-drawer-handle" />

        {/* DRAWER TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {displayId}
              </span>
              {getStatusBadge()}
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
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
            style={{ padding: '6px', borderRadius: '50%', background: 'var(--bg-secondary)', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 3 NAVIGATION TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '14px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            style={{
              flex: 1,
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'items' ? '2.5px solid var(--text-info)' : '2.5px solid transparent',
              color: activeTab === 'items' ? 'var(--text-info)' : 'var(--text-secondary)'
            }}
          >
            Items & Progress ({orderItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            style={{
              flex: 1,
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'billing' ? '2.5px solid var(--text-info)' : '2.5px solid transparent',
              color: activeTab === 'billing' ? 'var(--text-info)' : 'var(--text-secondary)'
            }}
          >
            Invoices & Payments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            style={{
              flex: 1,
              padding: '8px 4px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'financials' ? '2.5px solid var(--text-info)' : '2.5px solid transparent',
              color: activeTab === 'financials' ? 'var(--text-info)' : 'var(--text-secondary)'
            }}
          >
            Financials
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '20px' }}>
          
          {/* TAB 1: ITEMS & PROGRESS */}
          {activeTab === 'items' && (
            <>
              {/* PROGRESS BARS */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Fulfillment Status Breakdown
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Procured / Received</span>
                      <strong>{totalProc} / {totalQty} ({procPct}%)</strong>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${procPct}%`, background: '#10b981', borderRadius: '3px' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Invoiced</span>
                      <strong>{totalInv} / {totalQty} ({invPct}%)</strong>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${invPct}%`, background: '#f59e0b', borderRadius: '3px' }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Delivered to Site</span>
                      <strong>{totalDel} / {totalQty} ({delPct}%)</strong>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${delPct}%`, background: '#3b82f6', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* DETAILED LINE ITEMS */}
              <div>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Line Items Specification ({orderItems.length})
                </span>
                {orderItems.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    No line items registered on this order.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {orderItems.map((item, idx) => {
                      const code = item.itemCode || item.code || item.item_code || `Item ${idx + 1}`;
                      const desc = item.description || item.name || '';
                      const qty = Number(item.qty) || 0;
                      const retail = Number(item.unitRetail || item.unit_retail || item.price) || 0;
                      const lineTotal = qty * retail;
                      const rec = Number(item.receivedQty || item.received_qty || item.procuredQty || 0);
                      const del = Number(item.deliveryQty || item.delivery_qty || item.deliveredQty || 0);
                      const inv = Number(item.invoiceQty || item.invoiced_qty || 0);

                      return (
                        <div key={item.id || idx} style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace', fontSize: '12.5px' }}>
                                {code}
                              </span>
                              {desc && <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{desc}</div>}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                                R {Math.round(lineTotal).toLocaleString()}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                                {qty} × R {Math.round(retail).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* PER-ITEM PROGRESS STATUS */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '10.5px' }}>
                            <span style={{ color: rec >= qty && qty > 0 ? 'var(--text-success)' : 'var(--text-secondary)' }}>
                              Procured: <strong>{rec}/{qty}</strong>
                            </span>
                            <span style={{ color: inv >= qty && qty > 0 ? 'var(--text-warning)' : 'var(--text-secondary)' }}>
                              Invoiced: <strong>{inv}/{qty}</strong>
                            </span>
                            <span style={{ color: del >= qty && qty > 0 ? 'var(--text-info)' : 'var(--text-secondary)' }}>
                              Delivered: <strong>{del}/{qty}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: INVOICES & PAYMENTS */}
          {activeTab === 'billing' && (
            <>
              {/* PAYMENTS RECEIVED */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>
                    Payments & Receipts ({payments.length > 0 ? payments.length : (paidVal > 0 ? 1 : 0)})
                  </span>
                  <strong style={{ fontSize: '12px', color: 'var(--text-success)' }}>
                    Total: R {Math.round(paidVal).toLocaleString()}
                  </strong>
                </div>

                {payments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {payments.map((p, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>{p.receipt_no || p.ref || `REC-${idx + 1}`}</span>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{p.date || '—'} {p.type ? `• ${p.type}` : ''}</div>
                        </div>
                        <strong style={{ color: 'var(--text-success)', fontSize: '12.5px' }}>
                          R {Math.round(Number(p.amount || 0)).toLocaleString()}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : paidVal > 0 ? (
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Deposit & Direct Ingest</span>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Allocated to Order</div>
                    </div>
                    <strong style={{ color: 'var(--text-success)', fontSize: '12.5px' }}>
                      R {Math.round(paidVal).toLocaleString()}
                    </strong>
                  </div>
                ) : (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 0' }}>
                    No payments allocated yet.
                  </div>
                )}
              </div>

              {/* CLIENT INVOICES */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Client Invoices & Claims ({matchedInvoices.length})
                </span>

                {matchedInvoices.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {matchedInvoices.map((inv, idx) => {
                      const docNo = inv.document_no || inv.doc_no || inv.invoice_no || `INV-${idx + 1}`;
                      const invAmt = Number(inv.total_amount || inv.amount || 0);
                      const invDate = inv.document_date || inv.date || '—';

                      return (
                        <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <div>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>{docNo}</span>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{invDate}</div>
                          </div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>
                            R {Math.round(invAmt).toLocaleString()}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 0' }}>
                    No invoices generated yet.
                  </div>
                )}
              </div>

              {/* DELIVERY & DISPATCH NOTES */}
              {deliveryNotes.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                    Delivery Notes ({deliveryNotes.length})
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {deliveryNotes.map((dn, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{dn.doc_no || dn.dn_number || `DN-${idx+1}`}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{dn.date || 'Dispatched'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 3: FINANCIALS */}
          {activeTab === 'financials' && (
            <>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
                  Total Contract Value (Incl VAT)
                </span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                  R {Math.round(valueInclVat).toLocaleString()}
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Financial Breakdown
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Subtotal Ex VAT</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      R {Math.round(discountedRetail).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>15% VAT</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                      R {Math.round(valueInclVat - discountedRetail).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Total Paid to Date</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-success)', marginTop: '1px' }}>
                      R {Math.round(paidVal).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Balance Outstanding</span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: outstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', marginTop: '1px' }}>
                      R {Math.round(outstanding).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Cost of Goods</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '1px' }}>
                      R {Math.round(totalCost).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Gross Profit & Margin</span>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: marginPct < 39 ? 'var(--text-danger)' : 'var(--text-success)', marginTop: '1px' }}>
                      R {Math.round(grossProfit).toLocaleString()} ({marginPct}%)
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Close Order Details
          </button>
        </div>
      </div>
    </div>
  );
}
