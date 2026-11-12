import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  RotateCcw, 
  GitBranch, 
  FileText, 
  MessageSquare, 
  Plus, 
  RefreshCw, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function AuditHistoryTab({
  poNumber,
  order,
  onOpenVariationDocument
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // ALL, VARIATIONS, SUB_ORDERS, NOTES
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteReason, setNewNoteReason] = useState('');
  const [newNoteRoom, setNewNoteRoom] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchLogs = async () => {
    if (!poNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${poNumber}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [poNumber]);

  const filteredLogs = useMemo(() => {
    if (filterType === 'VARIATIONS') {
      return logs.filter(l => l.action === 'ITEM_SWAPPED' || l.action === 'ITEM_CREDITED' || l.action === 'ITEM_ADDED');
    }
    if (filterType === 'SUB_ORDERS') {
      return logs.filter(l => l.action === 'SUB_ORDER_CREATED');
    }
    if (filterType === 'NOTES') {
      return logs.filter(l => l.action === 'NOTE_ADDED' || l.action === 'STATUS_CHANGE');
    }
    return logs;
  }, [logs, filterType]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteReason.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${poNumber}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NOTE_ADDED',
          reason: newNoteReason.trim(),
          room: newNoteRoom.trim() || undefined,
          performed_by: 'User'
        })
      });

      if (res.ok) {
        setNewNoteReason('');
        setNewNoteRoom('');
        setShowAddNoteModal(false);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to add audit note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* TOP BANNER & ACTION BAR (ARCHITECTURAL STUDIO STYLING) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              LIVE AUDIT TRAIL
            </span>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Order: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{poNumber}</strong> {order?.isSubOrder ? `(Sub-Order of ${order.parentPoNumber})` : ''}
            </span>
          </div>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#0f172a" /> Revision & Variation Audit Trail
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchLogs}
            disabled={loading}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)' }}
            title="Refresh Audit History"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddNoteModal(true)}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={13} /> Add Site / Audit Note
          </button>

          <button 
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenVariationDocument}
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff' }}
          >
            <FileText size={13} /> Official Client Variation Document 📄
          </button>
        </div>
      </div>

      {/* FILTER BUTTONS (STUDIO PILL CONTROL) */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Filter Trail:</span>
        <div style={{ display: 'inline-flex', gap: '3px', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className="btn btn-xs"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: filterType === 'ALL' ? 600 : 500,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'ALL' ? '#0f172a' : 'transparent',
              color: filterType === 'ALL' ? '#ffffff' : '#64748b'
            }}
          >
            All Events ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('VARIATIONS')}
            className="btn btn-xs"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: filterType === 'VARIATIONS' ? 600 : 500,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'VARIATIONS' ? '#0f172a' : 'transparent',
              color: filterType === 'VARIATIONS' ? '#ffffff' : '#64748b'
            }}
          >
            Item Variations & Swaps ({logs.filter(l => l.action === 'ITEM_SWAPPED' || l.action === 'ITEM_CREDITED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('SUB_ORDERS')}
            className="btn btn-xs"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: filterType === 'SUB_ORDERS' ? 600 : 500,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'SUB_ORDERS' ? '#0f172a' : 'transparent',
              color: filterType === 'SUB_ORDERS' ? '#ffffff' : '#64748b'
            }}
          >
            Sub-Orders ({logs.filter(l => l.action === 'SUB_ORDER_CREATED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('NOTES')}
            className="btn btn-xs"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              fontWeight: filterType === 'NOTES' ? 600 : 500,
              borderRadius: '6px',
              border: 'none',
              background: filterType === 'NOTES' ? '#0f172a' : 'transparent',
              color: filterType === 'NOTES' ? '#ffffff' : '#64748b'
            }}
          >
            Notes & Approvals ({logs.filter(l => l.action === 'NOTE_ADDED').length})
          </button>
        </div>
      </div>

      {/* TIMELINE LIST */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
          Loading audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: 'var(--bg-primary)',
          border: '1px dashed var(--border)',
          borderRadius: '8px',
          color: 'var(--text-secondary)'
        }}>
          <History size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 8px auto', display: 'block' }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No Audit Events Recorded Yet
          </h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            Swapped fittings, sub-order creations, and manual notes will automatically appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLogs.map(log => {
            const isSwap = log.action === 'ITEM_SWAPPED';
            const isSub = log.action === 'SUB_ORDER_CREATED';
            const isCredit = log.action === 'ITEM_CREDITED';
            const isNote = log.action === 'NOTE_ADDED';

            const formattedDate = log.created_at ? new Date(log.created_at).toLocaleString('en-ZA', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '—';

            return (
              <div 
                key={log.id}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${isSwap ? '#f59e0b' : isSub ? '#8b5cf6' : isCredit ? '#ef4444' : '#10b981'}`,
                  borderRadius: '6px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* TIMELINE ITEM HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      className="badge"
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: isSwap ? 'rgba(245, 158, 11, 0.15)' : isSub ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isSwap ? '#f59e0b' : isSub ? '#8b5cf6' : '#10b981'
                      }}
                    >
                      {isSwap ? 'Fitting Variation' : isSub ? 'Sub-Order Created' : isCredit ? 'Credit Note' : 'Audit Note'}
                    </span>

                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.item_code || log.order_po}
                    </span>

                    {log.room && (
                      <span className="badge b-ghost" style={{ fontSize: '10px' }}>
                        📍 {log.room}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {formattedDate}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {log.performed_by || 'Staff'}
                    </span>
                  </div>
                </div>

                {/* DESCRIPTION / CHANGE SUMMARY */}
                {log.item_description && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {log.item_description}
                  </div>
                )}

                {/* FINANCIAL & QTY VARIANCE */}
                {log.delta_value !== null && log.delta_value !== undefined && log.delta_value !== 0 && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Variance Delta: <strong style={{ color: log.delta_value > 0 ? 'var(--text-success)' : 'var(--text-danger)' }}>
                        {log.delta_value > 0 ? `+R ${Math.round(log.delta_value).toLocaleString()}` : `-R ${Math.abs(Math.round(log.delta_value)).toLocaleString()}`}
                      </strong>
                    </span>
                    {log.previous_qty !== null && log.new_qty !== null && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Quantity: <strong>{log.previous_qty} &rarr; {log.new_qty}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* MANDATORY CLIENT / SITE REASON IN HIGHLIGHT BOX */}
                {log.reason && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    fontStyle: 'italic',
                    marginTop: '2px'
                  }}>
                    &ldquo;{log.reason}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD AUDIT NOTE MODAL */}
      {showAddNoteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--text-info)" /> Add Site / Audit Instruction Note
            </h3>
            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Room / Area Space (Optional)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ height: '32px', fontSize: '12px' }}
                  placeholder="e.g. Ground Floor Kitchen, Master Bedroom"
                  value={newNoteRoom}
                  onChange={e => setNewNoteRoom(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Audit Instruction / Client Note <span style={{ color: 'var(--text-danger)' }}>*</span>
                </label>
                <textarea 
                  className="form-control"
                  rows={4}
                  style={{ fontSize: '12px' }}
                  placeholder="Describe the instruction, client change request, or site snag verification..."
                  value={newNoteReason}
                  onChange={e => setNewNoteReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setShowAddNoteModal(false)}
                  disabled={submittingNote}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={submittingNote || !newNoteReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {submittingNote ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Save Note to Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
