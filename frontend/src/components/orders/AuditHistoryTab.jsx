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
  ArrowRight,
  Search,
  Download,
  DollarSign,
  Truck,
  ShieldCheck,
  Layers,
  X,
  ExternalLink,
  MapPin,
  Quote,
  Clock
} from 'lucide-react';
import { API_BASE } from '../../api_config';
import ClientVariationDocument from './ClientVariationDocument';

export default function AuditHistoryTab({
  poNumber,
  order,
  onOpenVariationDocument
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL'); // ALL, VARIATIONS, SUB_ORDERS, NOTES, PAYMENTS, LOGISTICS
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('ALL');

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteReason, setNewNoteReason] = useState('');
  const [newNoteRoom, setNewNoteRoom] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [showVariationDocModal, setShowVariationDocModal] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  const handleRevertSwap = async (minusItemId) => {
    if (!poNumber || !minusItemId) return;
    const confirmed = window.otoConfirm
      ? await window.otoConfirm('Revert this swap and remove the Minus & Plus variation rows? (Only allowed if no PO, GRN, DN, or Invoice has been allocated to the replacement item.)')
      : window.confirm('Revert this swap?');
    if (!confirmed) return;

    setRevertingId(minusItemId);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(poNumber)}/swaps/${encodeURIComponent(minusItemId)}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Swap reverted from Audit Ledger', performed_by: 'User' })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to revert swap (${res.status})`);
      }
      await fetchLogs();
    } catch (err) {
      if (window.otoAlert) {
        window.otoAlert(err.message || 'Cannot revert swap');
      } else {
        alert(err.message || 'Cannot revert swap');
      }
    } finally {
      setRevertingId(null);
    }
  };

  const fetchLogs = async () => {
    if (!poNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(poNumber)}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : (data.logs || []));
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

  // Extract unique rooms for filtering
  const uniqueRooms = useMemo(() => {
    const rooms = new Set();
    logs.forEach(l => {
      if (l.room && l.room.trim() && l.room !== '—') {
        rooms.add(l.room.trim());
      }
    });
    return Array.from(rooms).sort();
  }, [logs]);

  // Executive KPI calculations
  const kpis = useMemo(() => {
    const variations = logs.filter(l => 
      l.action === 'ITEM_SWAPPED' || l.action === 'ITEM_CREDITED' || l.action === 'ITEM_ADDED'
    );
    const netVariance = variations.reduce((sum, l) => sum + (Number(l.delta_value) || 0), 0);

    const subOrders = logs.filter(l => l.action === 'SUB_ORDER_CREATED');
    const subOrdersVal = subOrders.reduce((sum, l) => sum + (Number(l.delta_value) || 0), 0);

    const notes = logs.filter(l => l.action === 'NOTE_ADDED');
    const payments = logs.filter(l => l.action === 'PAYMENT_RECORDED' || l.action === 'PAYMENT_REMOVED');
    const logistics = logs.filter(l => l.action === 'DELIVERY_NOTE_CREATED' || l.action === 'DELIVERY_NOTE_VOIDED');

    const lastEvent = logs.length > 0 ? logs[0].created_at : null;

    return {
      totalEvents: logs.length,
      variationsCount: variations.length,
      netVariance,
      subOrdersCount: subOrders.length,
      subOrdersVal,
      notesCount: notes.length,
      paymentsCount: payments.length,
      logisticsCount: logistics.length,
      lastEvent
    };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Category / Action Filter
      if (filterType === 'VARIATIONS') {
        if (!['ITEM_SWAPPED', 'ITEM_CREDITED', 'ITEM_ADDED'].includes(log.action)) return false;
      } else if (filterType === 'SUB_ORDERS') {
        if (log.action !== 'SUB_ORDER_CREATED') return false;
      } else if (filterType === 'NOTES') {
        if (log.action !== 'NOTE_ADDED') return false;
      } else if (filterType === 'PAYMENTS') {
        if (!['PAYMENT_RECORDED', 'PAYMENT_REMOVED', 'PAYMENT_ALLOCATED'].includes(log.action)) return false;
      } else if (filterType === 'LOGISTICS') {
        if (!['DELIVERY_NOTE_CREATED', 'DELIVERY_NOTE_VOIDED'].includes(log.action)) return false;
      }

      // 2. Room Filter
      if (selectedRoom !== 'ALL') {
        if ((log.room || '').trim() !== selectedRoom) return false;
      }

      // 3. Keyword Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (log.item_code || '').toLowerCase();
        const desc = (log.item_description || '').toLowerCase();
        const reason = (log.reason || '').toLowerCase();
        const room = (log.room || '').toLowerCase();
        const user = (log.performed_by || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const po = (log.order_po || '').toLowerCase();

        return code.includes(q) || desc.includes(q) || reason.includes(q) || room.includes(q) || user.includes(q) || action.includes(q) || po.includes(q);
      }

      return true;
    });
  }, [logs, filterType, selectedRoom, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      'Timestamp',
      'Action',
      'Order PO',
      'Room / Area',
      'Fitting Code',
      'Description',
      'Previous Qty',
      'New Qty',
      'Delta Value (Ex VAT)',
      'Reason / Instruction',
      'Performed By'
    ];

    const rows = logs.map(l => [
      l.created_at ? new Date(l.created_at).toISOString() : '',
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.order_po || '').replace(/"/g, '""')}"`,
      `"${(l.room || '').replace(/"/g, '""')}"`,
      `"${(l.item_code || '').replace(/"/g, '""')}"`,
      `"${(l.item_description || '').replace(/"/g, '""')}"`,
      l.previous_qty !== null && l.previous_qty !== undefined ? l.previous_qty : '',
      l.new_qty !== null && l.new_qty !== undefined ? l.new_qty : '',
      l.delta_value !== null && l.delta_value !== undefined ? l.delta_value : '',
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${(l.performed_by || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Audit_Trail_${poNumber}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteReason.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(poNumber)}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'NOTE_ADDED',
          reason: newNoteReason.trim(),
          room: newNoteRoom.trim() || undefined,
          performed_by: 'Staff'
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
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      
      {/* 1. EXECUTIVE 4-METRIC AUDIT RIBBON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
        
        {/* KPI 1: NET FINANCIAL VARIANCE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Net Financial Variance
            </span>
            <DollarSign size={15} color={kpis.netVariance > 0 ? '#f59e0b' : kpis.netVariance < 0 ? '#10b981' : '#64748b'} />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: kpis.netVariance > 0 ? '#d97706' : kpis.netVariance < 0 ? '#059669' : '#0f172a' }}>
            {kpis.netVariance > 0 ? `+R ${Math.round(kpis.netVariance).toLocaleString()}` : kpis.netVariance < 0 ? `-R ${Math.abs(Math.round(kpis.netVariance)).toLocaleString()}` : 'R 0.00'}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>Ex VAT</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            {kpis.netVariance > 0 ? 'Cost adjustment to client contract' : kpis.netVariance < 0 ? 'Deduction / credit balance' : 'Even variations balance'}
          </div>
        </div>

        {/* KPI 2: FITTING VARIATIONS COUNT */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Fitting Variations
            </span>
            <RotateCcw size={15} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
            {kpis.variationsCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Swaps / Variations</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            Documented on-site fixture substitutions
          </div>
        </div>

        {/* KPI 3: SUB-ORDERS & PHASES */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Phases & Sub-Orders
            </span>
            <GitBranch size={15} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
            {kpis.subOrdersCount} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>Phases Spawned</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            Allocated value: <strong>R {Math.round(kpis.subOrdersVal).toLocaleString()}</strong>
          </div>
        </div>

        {/* KPI 4: AUDIT COMPLIANCE */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>
              Audit Compliance
            </span>
            <ShieldCheck size={16} color="#10b981" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              100% TRACEABLE ✓
            </span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
            {kpis.totalEvents} events logged across project lifecycle
          </div>
        </div>

      </div>

      {/* 2. TOP ACTION & NAVIGATION HEADER */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a'
          }}>
            <History size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Project Revisions & Variation Audit Ledger
            </h3>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Order <strong>{poNumber}</strong> {order?.isSubOrder ? `(Sub-Order of ${order.parentPoNumber})` : ''} &bull; Immutable event history
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={fetchLogs}
            disabled={loading}
            style={{
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              borderRadius: '6px',
              padding: '5px 12px'
            }}
            title="Refresh Audit History"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button 
            type="button"
            className="btn btn-sm"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            style={{
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#475569',
              borderRadius: '6px',
              padding: '5px 12px'
            }}
            title="Export full chronological audit ledger to CSV"
          >
            <Download size={12} />
            Export CSV
          </button>

          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setShowAddNoteModal(true)}
            style={{
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              borderRadius: '6px',
              padding: '5px 12px',
              fontWeight: 600
            }}
          >
            <MessageSquare size={12} />
            + Add Site Note
          </button>

          <button 
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowVariationDocModal(true)}
            style={{
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '6px',
              padding: '5px 14px',
              fontWeight: 600
            }}
          >
            <FileText size={12} />
            Official Client Variation Document 📄
          </button>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* FILTER PILLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Events', count: kpis.totalEvents },
            { id: 'VARIATIONS', label: 'Variations & Swaps', count: kpis.variationsCount },
            { id: 'SUB_ORDERS', label: 'Sub-Orders', count: kpis.subOrdersCount },
            { id: 'NOTES', label: 'Site Instructions', count: kpis.notesCount },
            { id: 'PAYMENTS', label: 'Payments', count: kpis.paymentsCount },
            { id: 'LOGISTICS', label: 'Logistics', count: kpis.logisticsCount }
          ].map(tab => {
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className="btn btn-xs"
                style={{
                  background: isActive ? '#0f172a' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setFilterType(tab.id)}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & ROOM FILTER CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* ROOM SELECTOR */}
          {uniqueRooms.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} color="#94a3b8" />
              <select
                className="form-control"
                style={{ height: '30px', fontSize: '11.5px', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                value={selectedRoom}
                onChange={e => setSelectedRoom(e.target.value)}
              >
                <option value="ALL">All Rooms ({uniqueRooms.length})</option>
                {uniqueRooms.map(rm => (
                  <option key={rm} value={rm}>{rm}</option>
                ))}
              </select>
            </div>
          )}

          {/* SEARCH INPUT */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '9px', color: '#94a3b8' }} />
            <input 
              type="text"
              className="form-control"
              style={{ height: '30px', fontSize: '11.5px', paddingLeft: '26px', paddingRight: '22px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              placeholder="Search by SKU, room, keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X 
                size={12} 
                style={{ position: 'absolute', right: '6px', top: '9px', color: '#94a3b8', cursor: 'pointer' }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
        </div>
      </div>

      {/* 4. TIMELINE EVENT CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '13px' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#3b82f6' }} />
          Loading audit trail and variation history...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: '#ffffff',
          border: '1px dashed #cbd5e1',
          borderRadius: '10px',
          color: '#64748b'
        }}>
          <History size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto', display: 'block' }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            No Matching Audit Events
          </h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            {searchQuery || selectedRoom !== 'ALL' || filterType !== 'ALL' 
              ? 'Try adjusting your search terms or filter selections.' 
              : 'Swapped fittings, sub-order creations, payments, and site instructions will automatically record here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLogs.map(log => {
            const isSwap = log.action === 'ITEM_SWAPPED';
            const isSub = log.action === 'SUB_ORDER_CREATED';
            const isCredit = log.action === 'ITEM_CREDITED';
            const isNote = log.action === 'NOTE_ADDED';
            const isPayment = log.action === 'PAYMENT_RECORDED' || log.action === 'PAYMENT_REMOVED' || log.action === 'PAYMENT_ALLOCATED';
            const isLogistics = log.action === 'DELIVERY_NOTE_CREATED' || log.action === 'DELIVERY_NOTE_VOIDED';
            const isStatus = log.action === 'STATUS_CHANGE';

            const formattedDate = log.created_at ? new Date(log.created_at).toLocaleString('en-ZA', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '—';

            const meta = log.metadata || {};

            return (
              <div 
                key={log.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* TIMELINE ITEM HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                        background: isSwap ? '#fef3c7' : isSub ? '#ede9fe' : isCredit ? '#fee2e2' : isPayment ? '#dcfce7' : isLogistics ? '#e0f2fe' : '#f1f5f9',
                        color: isSwap ? '#b45309' : isSub ? '#6d28d9' : isCredit ? '#b91c1c' : isPayment ? '#15803d' : isLogistics ? '#0369a1' : '#475569',
                        border: '1px solid',
                        borderColor: isSwap ? '#fde68a' : isSub ? '#ddd6fe' : isCredit ? '#fecaca' : isPayment ? '#bbf7d0' : isLogistics ? '#bae6fd' : '#e2e8f0'
                      }}
                    >
                      {isSwap ? '🔄 Fitting Variation / Swap' : isSub ? '🌿 Sub-Order Spawned' : isCredit ? '🔴 Credit Note' : isPayment ? '💳 Payment Allocation' : isLogistics ? '📦 Logistics & Dispatch' : isStatus ? '⚡ Status Change' : '📝 Site Instruction'}
                    </span>

                    {log.room && (
                      <span style={{ fontSize: '11px', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={11} color="#64748b" /> {log.room}
                      </span>
                    )}

                    {isSwap && meta.is_manual_price && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '2px 7px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                        Manual / Price Override
                      </span>
                    )}

                    {isSwap && meta.minus_item_id && (
                      <button
                        type="button"
                        onClick={() => handleRevertSwap(meta.minus_item_id)}
                        disabled={revertingId === meta.minus_item_id}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: '#dc2626',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          cursor: revertingId === meta.minus_item_id ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Undo swap (blocked if PO/GRN/DN/Invoice already allocated)"
                      >
                        {revertingId === meta.minus_item_id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                        Undo Swap
                      </button>
                    )}

                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
                      Order {log.order_po}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} color="#94a3b8" /> {formattedDate}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} color="#94a3b8" /> {log.performed_by || 'Staff'}
                    </span>
                  </div>
                </div>

                {/* SPECIALIZED BODY FOR ITEM VARIATIONS (SIDE-BY-SIDE BEFORE ➔ AFTER) */}
                {isSwap && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '12px',
                    alignItems: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px 16px'
                  }}>
                    {/* ORIGINAL FITTING (CREDITED / BEFORE) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Original Fitting (Credited)
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#b91c1c' }}>
                          Qty: {meta.original_qty || log.previous_qty || 1}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {meta.original_code || (log.item_code ? log.item_code.split('➔')[0].trim() : '—')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>
                        {meta.original_unit_retail 
                          ? `R ${Number(meta.original_unit_retail).toLocaleString(undefined, { minimumFractionDigits: 2 })} ea` 
                          : log.item_description || 'Original fixture specification'}
                      </div>
                      {log.previous_value && (
                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600, marginTop: '4px' }}>
                          Total Deducted: -R {Math.abs(Number(log.previous_value)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>

                    {/* CENTER VARIANCE BADGE */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b'
                      }}>
                        <ArrowRight size={14} />
                      </div>
                      {log.delta_value !== null && log.delta_value !== undefined && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          whiteSpace: 'nowrap',
                          background: log.delta_value > 0 ? '#fef3c7' : log.delta_value < 0 ? '#dcfce7' : '#f1f5f9',
                          color: log.delta_value > 0 ? '#b45309' : log.delta_value < 0 ? '#15803d' : '#475569',
                          border: '1px solid',
                          borderColor: log.delta_value > 0 ? '#fde68a' : log.delta_value < 0 ? '#bbf7d0' : '#e2e8f0'
                        }}>
                          {log.delta_value > 0 ? `+R ${Math.round(log.delta_value).toLocaleString()}` : log.delta_value < 0 ? `-R ${Math.abs(Math.round(log.delta_value)).toLocaleString()}` : 'R 0.00'}
                        </span>
                      )}
                    </div>

                    {/* REPLACEMENT FITTING (ADDED / AFTER) */}
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Replacement Fitting (Added)
                        </span>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#15803d' }}>
                          Qty: {meta.replacement_qty || log.new_qty || 1}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {meta.replacement_code || (log.item_code ? log.item_code.split('➔')[1]?.trim() : '—')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>
                        {meta.replacement_unit_retail 
                          ? `R ${Number(meta.replacement_unit_retail).toLocaleString(undefined, { minimumFractionDigits: 2 })} ea` 
                          : 'Replacement fixture specification'}
                      </div>
                      {log.new_value && (
                        <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                          Total Added: +R {Math.abs(Number(log.new_value)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SPECIALIZED BODY FOR SUB-ORDERS */}
                {isSub && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#581c87' }}>
                        {meta.phase_name || log.reason || 'New Sub-Order Phase'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#7e22ce', marginTop: '2px' }}>
                        Sub-Order Reference: <strong style={{ fontFamily: 'monospace' }}>{meta.sub_po_number || 'Sub-Order'}</strong> &bull; {meta.items_count || log.new_qty || 0} fixtures allocated
                      </div>
                    </div>
                    {meta.sub_order_value && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10.5px', color: '#6b21a8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Allocated Contract Value</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#581c87' }}>
                          R {Math.round(Number(meta.sub_order_value)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* SPECIALIZED BODY FOR PAYMENTS */}
                {isPayment && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d' }}>
                        {meta.receipt_no ? `Receipt ${meta.receipt_no}` : log.reason}
                      </div>
                      <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                        {meta.payment_type || 'Customer Payment'} &bull; {meta.notes || 'Allocated to order ledger'}
                      </div>
                    </div>
                    {log.delta_value && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
                          +R {Math.abs(Number(log.delta_value)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* MANDATORY CLIENT / SITE REASON IN HIGHLIGHT BOX */}
                {log.reason && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <Quote size={13} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontStyle: 'italic', lineHeight: 1.45 }}>
                      &ldquo;{log.reason}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. ADD AUDIT NOTE MODAL */}
      {showAddNoteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="#3b82f6" /> Add Site Instruction / Audit Note
              </h3>
              <button 
                type="button" 
                className="btn btn-ghost btn-xs" 
                onClick={() => setShowAddNoteModal(false)}
                style={{ padding: '2px', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Room / Area Space (Optional)
                </label>
                <input 
                  type="text"
                  className="form-control"
                  style={{ height: '34px', fontSize: '12px' }}
                  placeholder="e.g. Ground Floor Kitchen, Master Bedroom"
                  value={newNoteRoom}
                  onChange={e => setNewNoteRoom(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Site Instruction / Client Note <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea 
                  className="form-control"
                  rows={4}
                  style={{ fontSize: '12px' }}
                  placeholder="Describe the architect instruction, site snag verification, or variation justification..."
                  value={newNoteReason}
                  onChange={e => setNewNoteReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost" 
                  onClick={() => setShowAddNoteModal(false)}
                  disabled={submittingNote}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm btn-primary"
                  disabled={submittingNote || !newNoteReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {submittingNote ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Save to Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INLINE OFFICIAL VARIATION DOCUMENT MODAL */}
      {showVariationDocModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '92vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #cbd5e1',
            padding: '24px 28px'
          }}>
            {/* MODAL HEADER CONTROLS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Official Client Variation & Addendum Document
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onOpenVariationDocument && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setShowVariationDocModal(false);
                      onOpenVariationDocument();
                    }}
                  >
                    Open in Docs Studio <ExternalLink size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowVariationDocModal(false)}
                  style={{ padding: '4px 8px', color: '#64748b' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* EMBEDDED DOCUMENT CANVAS */}
            <ClientVariationDocument
              poNumber={poNumber}
              order={order}
              onBackToWorkspace={() => setShowVariationDocModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}