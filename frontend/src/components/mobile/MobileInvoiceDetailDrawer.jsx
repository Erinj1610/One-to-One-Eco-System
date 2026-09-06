import React from 'react';
import { X, FileText, CheckCircle2, Clock, AlertCircle, DollarSign, Calendar, User, Hash, Layers } from 'lucide-react';

export default function MobileInvoiceDetailDrawer({ invoice, onClose }) {
  if (!invoice) return null;

  const docNo = invoice.document_no || invoice.doc_no || invoice.invoice_no || 'INVOICE';
  const customer = invoice.customer_name || invoice.client || 'Client';
  const amount = Number(invoice.total_amount || invoice.amount || invoice.total || 0);
  const date = invoice.document_date || invoice.date || '—';
  const dueDate = invoice.due_date || invoice.dueDate || '—';
  const status = invoice.allocation_status || invoice.status || 'Unallocated';
  const isAllocated = status.toLowerCase().includes('fully') || status.toLowerCase().includes('allocated');
  const orderId = invoice.order_id || invoice.orderId || invoice.order_number || invoice.matched_order_id;
  const project = invoice.project_name || invoice.projectName || invoice.project;
  const lines = Array.isArray(invoice.lines) ? invoice.lines : (Array.isArray(invoice.items) ? invoice.items : []);

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="mobile-drawer-handle" />

        {/* TOP HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                {docNo}
              </span>
              <span className={`badge ${isAllocated ? 'b-success' : 'b-warning'}`} style={{ fontSize: '10px' }}>
                {isAllocated ? '✓ Allocated' : '⏳ Needs Allocation'}
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {customer}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Date: {date} {dueDate !== '—' ? `• Due: ${dueDate}` : ''}
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
          
          {/* FINANCIAL TOTAL CARD */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '14px',
            border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>
              Invoice Total Amount
            </span>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              R {Math.round(amount).toLocaleString()}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Net Ex VAT: </span>
                <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(amount / 1.15).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>15% VAT: </span>
                <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(amount - (amount / 1.15)).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* LINKED PROJECT / ORDER CARD */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Allocation & Tracking
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Linked Order</span>
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

          {/* INVOICE LINE ITEMS */}
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Document Lines ({lines.length})
            </span>
            {lines.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '8px 0', fontStyle: 'italic' }}>
                Summary invoice header recorded from ERP ledger.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lines.map((line, idx) => {
                  const sku = line.item_code || line.sku || line.code || `Line ${idx + 1}`;
                  const desc = line.description || line.desc || '';
                  const qty = Number(line.quantity || line.qty || 1);
                  const price = Number(line.unit_price || line.price || line.rate || 0);
                  const lineTotal = line.total_amount || (qty * price);

                  return (
                    <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>{sku}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>R {Math.round(lineTotal).toLocaleString()}</strong>
                      </div>
                      {desc && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{desc}</div>}
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {qty} unit(s) @ R {price.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 600 }}
            onClick={onClose}
          >
            Close Invoice Details
          </button>
        </div>
      </div>
    </div>
  );
}
