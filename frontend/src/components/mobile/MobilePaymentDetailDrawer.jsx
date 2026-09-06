import React from 'react';
import { X, CreditCard, CheckCircle2, Clock, AlertCircle, DollarSign, Calendar, User, Hash, FileText } from 'lucide-react';

export default function MobilePaymentDetailDrawer({ payment, onClose }) {
  if (!payment) return null;

  const recNo = payment.receipt_no || payment.doc_no || payment.payment_no || 'RECEIPT';
  const customer = payment.customer_name || payment.client || 'Client';
  const amount = Number(payment.total_amount || payment.amount || 0);
  const date = payment.receipt_date || payment.date || '—';
  const status = payment.allocation_status || payment.status || 'Unallocated';
  const isAllocated = status.toLowerCase().includes('fully') || status.toLowerCase().includes('allocated');
  const orderId = payment.order_id || payment.orderId || payment.matched_order_id;
  const project = payment.project_name || payment.projectName || payment.project;
  const paymentType = payment.payment_type || payment.type || 'Direct Deposit / EFT';
  const notes = payment.notes || payment.description || payment.comment;
  const allocatedAmount = Number(payment.allocated_amount || (isAllocated ? amount : 0));
  const unallocatedAmount = Math.max(0, amount - allocatedAmount);

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="mobile-drawer-handle" />

        {/* TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {recNo}
              </span>
              <span className={`badge ${isAllocated ? 'b-success' : 'b-warning'}`} style={{ fontSize: '10px' }}>
                {isAllocated ? '✓ Allocated' : '⏳ Unallocated'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {customer}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Date: {date} • Type: {paymentType}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingBottom: '20px' }}>
          
          {/* FINANCIAL AMOUNT CARD */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Receipt Amount Ingested
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-success)', marginTop: '4px' }}>
              R {Math.round(amount).toLocaleString()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Allocated: </span>
                <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(allocatedAmount).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Unallocated: </span>
                <strong style={{ color: unallocatedAmount > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>
                  R {Math.round(unallocatedAmount).toLocaleString()}
                </strong>
              </div>
            </div>
          </div>

          {/* LINKED PROJECT / ORDER CARD */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Order Allocation Target
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Allocated Order</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-info)', fontFamily: 'monospace', marginTop: '1px' }}>
                  {orderId || 'Unallocated'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Project</span>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                  {project || 'General Ledger'}
                </div>
              </div>
            </div>
          </div>

          {/* NOTES & AUDIT DETAILS */}
          {notes && (
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                Receipt Notes & Reference
              </span>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                {notes}
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Close Receipt Details
          </button>
        </div>
      </div>
    </div>
  );
}
