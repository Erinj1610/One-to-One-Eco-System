import React, { useState, useMemo } from 'react';
import { Search, FileText, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react';

export default function MobileInvoicesViewer({ docs = [], summary = {}, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredDocs = useMemo(() => {
    return (docs || []).filter(doc => {
      if (!doc) return false;
      const no = (doc.document_no || doc.doc_no || doc.invoice_no || '').toLowerCase();
      const client = (doc.customer_name || doc.client || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || no.includes(term) || client.includes(term);

      let matchesFilter = true;
      const status = (doc.allocation_status || doc.status || '').toLowerCase();
      if (filter === 'Needs Allocation') {
        matchesFilter = status.includes('unallocated') || status.includes('partial') || status.includes('needs');
      } else if (filter === 'Allocated') {
        matchesFilter = status.includes('fully') || status.includes('allocated');
      }

      return matchesSearch && matchesFilter;
    });
  }, [docs, searchTerm, filter]);

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* 3-KPI SUMMARY BANNER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: '14px'
      }}>
        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Invoiced</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            R {summary.total_invoiced_value ? (summary.total_invoiced_value / 1000000).toFixed(1) + 'M' : '—'}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Unallocated</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-warning)', marginTop: '2px' }}>
            {summary.unallocated_count || 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>Allocated</span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-success)', marginTop: '2px' }}>
            {summary.fully_allocated_count || 0}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search invoice #, customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'Needs Allocation', 'Allocated'].map(f => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
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
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* INVOICE CARDS FEED */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No invoices found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or filter.
            </div>
          </div>
        ) : (
          filteredDocs.map((doc, idx) => {
            const docNo = doc.document_no || doc.doc_no || `INV-${idx + 1}`;
            const customer = doc.customer_name || doc.client || 'Client';
            const amount = Number(doc.total_amount || doc.amount || doc.total || 0);
            const date = doc.document_date || doc.date || '—';
            const status = doc.allocation_status || 'Unallocated';
            const isAllocated = status.toLowerCase().includes('fully') || status.toLowerCase().includes('allocated');

            return (
              <div key={docNo} className="mobile-feed-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                    {docNo}
                  </span>
                  <span
                    className={`badge ${isAllocated ? 'b-success' : 'b-warning'}`}
                    style={{ fontSize: '9.5px', padding: '2px 7px' }}
                  >
                    {isAllocated ? '✓ Allocated' : '⏳ Needs Allocation'}
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {customer}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    Date: {date}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  marginTop: '2px'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Invoice Value</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                    R {Math.round(amount).toLocaleString()}
                  </strong>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
