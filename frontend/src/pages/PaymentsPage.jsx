import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  CreditCard, Search, RefreshCw, AlertTriangle, Check, Layers, ExternalLink, Filter, 
  ArrowLeft, ArrowRight, ShieldCheck, ChevronDown, ChevronRight, X, Sparkles, Box, 
  CheckCircle2, Clock, Trash2, Package, CheckSquare, Square, DollarSign, Receipt, PlusCircle
} from 'lucide-react';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { projects } = useStore();

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Summary State
  const [summary, setSummary] = useState({
    total_payments_count: 0,
    total_amount_synced: 0.0,
    total_amount_allocated: 0.0,
    total_amount_unallocated: 0.0,
    unallocated_payments_count: 0,
    allocated_payments_count: 0,
    last_synced_at: null
  });

  // Data State
  const [payments, setPayments] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mainTab, setMainTab] = useState('PAYMENTS'); // 'PAYMENTS' | 'ALLOCATIONS_AUDIT'
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNALLOCATED' | 'ALLOCATED'
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation Modal State
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [projectsOrders, setProjectsOrders] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [allocatedAmount, setAllocatedAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Deposit Payment');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // Unallocate confirmation modal
  const [unallocConfirmId, setUnallocConfirmId] = useState(null);
  const [isDeletingAlloc, setIsDeletingAlloc] = useState(false);

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (_) {}
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      let statusParam = 'all';
      if (filterTab === 'UNALLOCATED') statusParam = 'unallocated';
      else if (filterTab === 'ALLOCATED') statusParam = 'allocated';

      const params = new URLSearchParams({ status: statusParam });
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/payments/list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/allocations`);
      if (res.ok) {
        const data = await res.json();
        setAllocations(data);
      }
    } catch (err) {
      console.error('Error fetching allocations:', err);
    }
  };

  const fetchProjectsOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/projects-orders`);
      if (res.ok) {
        const data = await res.json();
        setProjectsOrders(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchSummary();
    fetchPayments();
    fetchAllocations();
    fetchProjectsOrders();
  }, [filterTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  // Sync Trigger
  const handleSyncPalladium = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/sync`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        triggerToast(`Synced ${result.payments_synced || 0} payments from Palladium (${result.new_payments || 0} new, ${result.updated_payments || 0} updated) in ${result.duration_seconds || 0}s.`);
        await fetchSummary();
        await fetchPayments();
        await fetchAllocations();
      } else {
        const err = await res.json();
        triggerToast(`Sync Error: ${err.detail || 'Failed to sync payments'}`);
      }
    } catch (err) {
      triggerToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Allocation Modal
  const openAllocationModal = (payment) => {
    setSelectedPayment(payment);
    setSelectedProjectId('');
    setSelectedOrderId('');
    setAllocatedAmount(payment.remaining_amount > 0 ? payment.remaining_amount.toFixed(2) : payment.amount.toFixed(2));
    setPaymentType('Deposit Payment');
    setAllocationNotes(payment.reference ? `Ref: ${payment.reference}` : '');
    setAllocModalOpen(true);
  };

  // Orders available for the selected project
  const availableOrders = useMemo(() => {
    if (!selectedProjectId) return [];
    const proj = projectsOrders.find(p => String(p.project_id) === String(selectedProjectId) || p.project_key === selectedProjectId);
    return proj ? proj.orders : [];
  }, [selectedProjectId, projectsOrders]);

  // When order changes, auto-set default amount if appropriate
  const handleOrderChange = (orderId) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;
    const ord = availableOrders.find(o => String(o.id) === String(orderId) || String(o.po_number) === String(orderId));
    if (ord && selectedPayment) {
      const needed = ord.outstanding > 0 ? ord.outstanding : ord.value;
      const allocAmt = Math.min(selectedPayment.remaining_amount || selectedPayment.amount, needed);
      if (allocAmt > 0) {
        setAllocatedAmount(allocAmt.toFixed(2));
      }
    }
  };

  // Save Allocation
  const handleSaveAllocation = async () => {
    if (!selectedPayment) return;
    if (!selectedOrderId) {
      triggerToast('Please select a target Order to allocate this payment to.');
      return;
    }
    const numAmt = parseFloat(allocatedAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      triggerToast('Please enter a valid allocated amount greater than R 0.00.');
      return;
    }

    setIsSavingAlloc(true);
    try {
      const payload = {
        palladium_payment_id: selectedPayment.palladium_payment_id,
        order_id: selectedOrderId,
        allocated_amount: numAmt,
        payment_type: paymentType,
        notes: allocationNotes,
        user_name: 'Admin'
      };

      const res = await fetch(`${API_BASE}/api/payments/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message || 'Payment allocated successfully!');
        setAllocModalOpen(false);
        await fetchSummary();
        await fetchPayments();
        await fetchAllocations();
      } else {
        const err = await res.json();
        triggerToast(`Allocation Error: ${err.detail || 'Failed to allocate payment.'}`);
      }
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setIsSavingAlloc(false);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async (allocationId) => {
    setIsDeletingAlloc(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/allocations/${allocationId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast('Payment unallocated successfully.');
        setUnallocConfirmId(null);
        await fetchSummary();
        await fetchPayments();
        await fetchAllocations();
      } else {
        const err = await res.json();
        triggerToast(`Unallocate Error: ${err.detail || 'Failed to remove allocation.'}`);
      }
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setIsDeletingAlloc(false);
    }
  };

  // Filtered allocations for audit tab
  const filteredAllocations = useMemo(() => {
    if (!searchQuery.trim()) return allocations;
    const q = searchQuery.toLowerCase();
    return allocations.filter(a => 
      (a.receipt_no && a.receipt_no.toLowerCase().includes(q)) ||
      (a.order_id && a.order_id.toLowerCase().includes(q)) ||
      (a.quote_name && a.quote_name.toLowerCase().includes(q)) ||
      (a.client && a.client.toLowerCase().includes(q)) ||
      (a.project_name && a.project_name.toLowerCase().includes(q)) ||
      (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [allocations, searchQuery]);

  return (
    <div className="page-container" style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--card-bg, #1e293b)',
          color: '#fff',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          borderRadius: '8px',
          padding: '12px 20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <Sparkles size={16} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={26} color="#10b981" />
            Palladium Payments & Allocations
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            100% read-only ERP receipt ingestion with live order balance allocation and Sales Tracker sync.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleSyncPalladium}
            disabled={isSyncing}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontWeight: 600, fontSize: '13px' }}
          >
            <RefreshCw size={15} className={isSyncing ? 'spin' : ''} />
            {isSyncing ? 'Syncing ERP...' : 'Sync from Palladium'}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Total Synced Receipts */}
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Total Synced Receipts
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8' }}>
            R {(summary.total_amount_synced || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.total_payments_count || 0} Total Receipts from Palladium
          </div>
        </div>

        {/* Card 2: Allocated Payments */}
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Allocated to Orders
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981' }}>
            R {(summary.total_amount_allocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.allocated_payments_count || 0} Fully / Partially Matched
          </div>
        </div>

        {/* Card 3: Unallocated Pool */}
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          padding: '18px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Unallocated Pool
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: summary.total_amount_unallocated > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>
            R {(summary.total_amount_unallocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {summary.unallocated_payments_count || 0} Receipts Awaiting Allocation
          </div>
        </div>

        {/* Card 4: ERP Sync Status */}
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              ERP Connection
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>100% Read-Only Live</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Last Synced: {summary.last_synced_at ? new Date(summary.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMainTab('PAYMENTS')}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: mainTab === 'PAYMENTS' ? '#10b981' : 'var(--text-secondary)',
              borderBottom: mainTab === 'PAYMENTS' ? '2px solid #10b981' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Receipt size={15} />
            Customer Payments ({payments.length})
          </button>

          <button
            onClick={() => setMainTab('ALLOCATIONS_AUDIT')}
            style={{
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: mainTab === 'ALLOCATIONS_AUDIT' ? '#10b981' : 'var(--text-secondary)',
              borderBottom: mainTab === 'ALLOCATIONS_AUDIT' ? '2px solid #10b981' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Layers size={15} />
            Allocations Audit Trail ({allocations.length})
          </button>
        </div>

        {/* Search Input & Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {mainTab === 'PAYMENTS' && (
            <div style={{ display: 'flex', background: 'var(--card-bg, rgba(30,41,59,0.5))', borderRadius: '6px', border: '1px solid var(--border-color, rgba(255,255,255,0.08))', padding: '2px' }}>
              <button
                onClick={() => setFilterTab('ALL')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: filterTab === 'ALL' ? 600 : 400,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: filterTab === 'ALL' ? 'var(--primary, #3b82f6)' : 'transparent',
                  color: filterTab === 'ALL' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterTab('UNALLOCATED')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: filterTab === 'UNALLOCATED' ? 600 : 400,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: filterTab === 'UNALLOCATED' ? '#f59e0b' : 'transparent',
                  color: filterTab === 'UNALLOCATED' ? '#000' : 'var(--text-secondary)'
                }}
              >
                Unallocated
              </button>
              <button
                onClick={() => setFilterTab('ALLOCATED')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: filterTab === 'ALLOCATED' ? 600 : 400,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: filterTab === 'ALLOCATED' ? '#10b981' : 'transparent',
                  color: filterTab === 'ALLOCATED' ? '#fff' : 'var(--text-secondary)'
                }}
              >
                Allocated
              </button>
            </div>
          )}

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search receipt, client, ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--card-bg, rgba(30,41,59,0.6))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.08))',
                borderRadius: '6px',
                padding: '6px 12px 6px 30px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                width: '220px'
              }}
            />
          </form>
        </div>
      </div>

      {/* TAB 1: PAYMENTS TABLE */}
      {mainTab === 'PAYMENTS' && (
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto' }} />
              <div>Loading payments from Cloud SQL...</div>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Receipt size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No customer payments found</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Sync from Palladium" above to ingest live customer receipts.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px' }}>Receipt #</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Client / Customer</th>
                    <th style={{ padding: '12px 16px' }}>Comment / Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allocated</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Remaining</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const isFully = p.status === 'Fully Allocated';
                    const isPartial = p.status === 'Partially Allocated';

                    return (
                      <tr 
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))',
                          background: 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>
                          {p.receipt_no}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {p.payment_date || '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.customer_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Code: {p.customer_code || '—'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.reference || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                          R {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: p.allocated_amount > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          R {p.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: p.remaining_amount > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>
                          R {p.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: isFully ? 'rgba(16,185,129,0.15)' : (isPartial ? 'rgba(56,189,248,0.15)' : 'rgba(245,158,11,0.15)'),
                            color: isFully ? '#10b981' : (isPartial ? '#38bdf8' : '#f59e0b'),
                            border: `1px solid ${isFully ? 'rgba(16,185,129,0.3)' : (isPartial ? 'rgba(56,189,248,0.3)' : 'rgba(245,158,11,0.3)')}`
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            onClick={() => openAllocationModal(p)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              background: p.remaining_amount > 0 ? '#10b981' : 'rgba(255,255,255,0.08)',
                              color: p.remaining_amount > 0 ? '#fff' : 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <PlusCircle size={13} />
                            {p.remaining_amount > 0 ? 'Allocate' : 'Allocations'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALLOCATIONS AUDIT TRAIL */}
      {mainTab === 'ALLOCATIONS_AUDIT' && (
        <div style={{
          background: 'var(--card-bg, rgba(30, 41, 59, 0.7))',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          {filteredAllocations.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Layers size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No payment allocations recorded yet</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Allocate incoming customer payments from Tab 1 to track order payments.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 16px' }}>Receipt #</th>
                    <th style={{ padding: '12px 16px' }}>Target Order</th>
                    <th style={{ padding: '12px 16px' }}>Project</th>
                    <th style={{ padding: '12px 16px' }}>Client</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allocated Amount</th>
                    <th style={{ padding: '12px 16px' }}>Allocated Date</th>
                    <th style={{ padding: '12px 16px' }}>Notes</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAllocations.map((a) => (
                    <tr 
                      key={a.id}
                      style={{
                        borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.04))',
                        background: 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#38bdf8' }}>
                        {a.receipt_no}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.quote_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PO/ID: {a.order_id}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                        {a.project_name || a.project_key || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {a.client || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          background: 'rgba(56,189,248,0.1)',
                          color: '#38bdf8'
                        }}>
                          {a.payment_type || 'Deposit Payment'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                        R {a.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {a.allocated_at ? new Date(a.allocated_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.notes || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setUnallocConfirmId(a.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={12} />
                          Unallocate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALLOCATION MODAL */}
      {allocModalOpen && selectedPayment && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Allocate Receipt: {selectedPayment.receipt_no}
                </h3>
              </div>
              <button
                onClick={() => setAllocModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Payment Summary Info Banner */}
              <div style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Client: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPayment.customer_name}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Date: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPayment.payment_date || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Amount: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>R {selectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Available Pool: </span>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>R {selectedPayment.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Step 1: Select Project */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  1. Select Target Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedOrderId('');
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="">-- Choose Project ({projectsOrders.length} Available) --</option>
                  {projectsOrders.map((p) => (
                    <option key={p.project_id || p.project_key} value={p.project_id || p.project_key}>
                      {p.project_name} {p.client ? `(${p.client})` : ''} - {p.orders.length} Order(s)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Order */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  2. Select Order / Quotation
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  disabled={!selectedProjectId}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    opacity: selectedProjectId ? 1 : 0.5
                  }}
                >
                  <option value="">-- Choose Order --</option>
                  {availableOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.quote_name} ({o.po_number}) — Total: R {o.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Outstanding: R {o.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Allocated Amount & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Allocated Amount (Rands)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={allocatedAmount}
                    onChange={(e) => setAllocatedAmount(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="Deposit Payment">Deposit Payment</option>
                    <option value="Balance Payment">Balance Payment</option>
                    <option value="Interim Payment">Interim Payment</option>
                    <option value="Full Settlement">Full Settlement</option>
                  </select>
                </div>
              </div>

              {/* Step 4: Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Allocation Notes / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. 70% Deposit for Living Room tracks"
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={() => setAllocModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAllocation}
                disabled={isSavingAlloc || !selectedOrderId}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: '#10b981',
                  color: '#fff',
                  cursor: (!isSavingAlloc && selectedOrderId) ? 'pointer' : 'not-allowed',
                  opacity: (!isSavingAlloc && selectedOrderId) ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSavingAlloc && <RefreshCw size={13} className="spin" />}
                {isSavingAlloc ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UNALLOCATE CONFIRMATION MODAL */}
      {unallocConfirmId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertTriangle size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Confirm Unallocation
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              Are you sure you want to remove this payment allocation? The allocated amount will be returned to the unallocated pool and the order's paid balance will be adjusted accordingly.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setUnallocConfirmId(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAllocation(unallocConfirmId)}
                disabled={isDeletingAlloc}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: isDeletingAlloc ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeletingAlloc && <RefreshCw size={12} className="spin" />}
                {isDeletingAlloc ? 'Removing...' : 'Yes, Unallocate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
