import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  CreditCard, Search, RefreshCw, AlertTriangle, Check, Layers, ExternalLink, Filter, 
  ArrowLeft, ArrowRight, ShieldCheck, ChevronDown, ChevronRight, X, Sparkles, Box, 
  CheckCircle2, Clock, Trash2, FileText, Package, CheckSquare, Square, DollarSign, Receipt, PlusCircle
} from 'lucide-react';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, getModuleName, refreshProjects } = useStore();

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // -------------------------------------------------------------
  // PALLADIUM PAYMENTS STATE
  // -------------------------------------------------------------
  const [paymentsSummary, setPaymentsSummary] = useState({
    unallocated_count: 0,
    partially_allocated_count: 0,
    fully_allocated_count: 0,
    total_documents: 0,
    total_payments_count: 0,
    total_amount_synced: 0.0,
    total_amount_allocated: 0.0,
    total_amount_unallocated: 0.0,
    last_synced_at: null
  });

  // Selected Document for Deep Workspace View (null = show all documents list)
  const [selectedDocument, setSelectedDocument] = useState(null);

  const [paymentsDocs, setPaymentsDocs] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('NEEDS_ALLOCATION'); // 'NEEDS_ALLOCATION' | 'PARTIAL' | 'FULLY_ALLOCATED' | 'AUDIT' | 'ALL'
  const [customerFilter, setCustomerFilter] = useState('All Clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingPalladium, setIsSyncingPalladium] = useState(false);

  // Single Allocation Modal State
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocTargetItem, setAllocTargetItem] = useState(null);
  const [candidateOrders, setCandidateOrders] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(null); // 'orderId' or 'MANUAL'
  const [projectsOrders, setProjectsOrders] = useState([]);
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocPaymentType, setAllocPaymentType] = useState('Deposit Payment');
  const [allocNotes, setAllocNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // Unallocate confirmation
  const [unallocConfirmId, setUnallocConfirmId] = useState(null);
  const [isDeletingAlloc, setIsDeletingAlloc] = useState(false);

  // Issue Flagging State
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueTargetItem, setIssueTargetItem] = useState(null);
  const [issueReason, setIssueReason] = useState('Order Not Found');
  const [issueNotes, setIssueNotes] = useState('');
  const [isSavingIssue, setIsSavingIssue] = useState(false);

  // -------------------------------------------------------------
  // FETCH SUMMARY & DOCUMENTS
  // -------------------------------------------------------------
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/summary`);
      if (res.ok) {
        setPaymentsSummary(await res.json());
      }
    } catch (_) {}
  };

  const fetchPaymentsDocuments = async (
    newTab = activeFilterTab, 
    newCustomer = customerFilter, 
    newQ = searchQuery
  ) => {
    setIsLoadingPayments(true);
    try {
      let statusParam = 'all';
      if (newTab === 'NEEDS_ALLOCATION') statusParam = 'unallocated';
      else if (newTab === 'PARTIAL') statusParam = 'unallocated';
      else if (newTab === 'FULLY_ALLOCATED') statusParam = 'allocated';
      else if (newTab === 'ISSUES') statusParam = 'issues';

      const params = new URLSearchParams({ status: statusParam });
      if (newQ && newQ.trim()) params.append('search', newQ.trim());

      const res = await fetch(`${API_BASE}/api/payments/list?${params.toString()}`);
      if (res.ok) {
        let items = await res.json();
        if (newTab === 'PARTIAL') {
          items = items.filter(p => p.status === 'Partially Allocated');
        } else if (newTab === 'NEEDS_ALLOCATION') {
          items = items.filter(p => (p.status === 'Unallocated' || p.status === 'Partially Allocated') && !p.is_flagged_issue);
        } else if (newTab === 'ISSUES') {
          items = items.filter(p => p.is_flagged_issue);
        }
        if (newCustomer && newCustomer !== 'All Clients') {
          items = items.filter(p => p.customer_name === newCustomer || p.customer_code === newCustomer);
        }
        setPaymentsDocs(items || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/allocations`);
      if (res.ok) {
        setAllocations(await res.json());
      }
    } catch (_) {}
  };

  const fetchProjectsOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/projects-orders`);
      if (res.ok) {
        setProjectsOrders(await res.json());
      }
    } catch (_) {}
  };

  // Master Sync Trigger
  const handleTriggerMasterSync = async () => {
    setIsSyncingPalladium(true);
    triggerToast("⚡ Ingesting live customer payments from Palladium ERP...");
    try {
      const res = await fetch(`${API_BASE}/api/payments/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        triggerToast(`🎉 Synced ${data.payments_synced || 0} customer payments from Palladium!`);
      } else {
        triggerToast(`⚠️ Sync notice: ${data.detail || data.error || 'Sync could not complete'}`);
      }
    } catch (e) {
      triggerToast(`⚠️ Sync connection error: ${e.message}`);
    } finally {
      await fetchSummary();
      await fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
      await fetchAllocations();
      setIsSyncingPalladium(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
    fetchAllocations();
    fetchProjectsOrders();
  }, []);

  // Debounced Search & Tab Change Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeFilterTab !== 'AUDIT') {
        fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeFilterTab, customerFilter, searchQuery]);

  // Extract unique customers for dropdown filter
  const uniqueCustomers = useMemo(() => {
    const set = new Set();
    paymentsDocs.forEach(item => {
      if (item.customer_name && item.customer_name.trim()) set.add(item.customer_name.trim());
    });
    return Array.from(set).sort();
  }, [paymentsDocs]);

  // -------------------------------------------------------------
  // ALLOCATION ACTIONS
  // -------------------------------------------------------------
  const handleOpenAllocModal = async (payment) => {
    setAllocTargetItem(payment);
    const avail = payment.remaining_amount > 0 ? payment.remaining_amount : payment.amount;
    setAllocAmount(avail.toFixed(2));
    setAllocPaymentType('Deposit Payment');
    setAllocNotes(payment.reference ? `Ref: ${payment.reference}` : '');
    setSelectedCandidateKey(null);
    setManualProjectId('');
    setManualOrderId('');
    setAllocModalOpen(true);

    setIsLoadingCandidates(true);
    try {
      const params = new URLSearchParams();
      if (payment.customer_name) params.append('customer_name', payment.customer_name);
      if (payment.customer_code) params.append('customer_code', payment.customer_code);
      if (payment.reference) params.append('reference', payment.reference);
      if (avail) params.append('payment_amount', avail);

      const res = await fetch(`${API_BASE}/api/payments/candidate-orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidateOrders(data.candidates || []);
        if (data.candidates && data.candidates.length > 0) {
          const firstCand = data.candidates[0];
          setSelectedCandidateKey(firstCand.order_id);
          const needed = firstCand.outstanding > 0 ? firstCand.outstanding : firstCand.total_value;
          setAllocAmount(Math.min(needed, avail).toFixed(2));
        } else {
          setSelectedCandidateKey('MANUAL');
        }
      }
    } catch (e) {
      console.error('Failed to load candidate orders:', e);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  const handleOpenIssueModal = (payment) => {
    setIssueTargetItem(payment);
    setIssueReason(payment.issue_reason || 'Order Not Found');
    setIssueNotes(payment.issue_notes || '');
    setIssueModalOpen(true);
  };

  const handleSubmitIssue = async (e) => {
    if (e) e.preventDefault();
    if (!issueTargetItem) return;

    setIsSavingIssue(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/flag-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_no: issueTargetItem.receipt_no,
          reason: issueReason,
          notes: issueNotes,
          flagged_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`⚠️ ${issueTargetItem.receipt_no} flagged as "${issueReason}"`);
        setIssueModalOpen(false);
        if (allocModalOpen) setAllocModalOpen(false);
        await fetchSummary();
        await fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
      } else {
        alert(data.detail || 'Could not flag issue.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handleResolveIssue = async (payment) => {
    if (!payment) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/resolve-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_no: payment.receipt_no,
          resolved_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✅ Issue on ${payment.receipt_no} resolved!`);
        await fetchSummary();
        await fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
      } else {
        alert(data.detail || 'Could not resolve issue.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSelectCandidate = (cand) => {
    setSelectedCandidateKey(cand.order_id);
    const needed = cand.outstanding > 0 ? cand.outstanding : cand.total_value;
    const available = allocTargetItem?.remaining_amount || allocTargetItem?.amount || 0;
    setAllocAmount(Math.min(needed, available).toFixed(2));
  };

  // Orders available for the manually selected project
  const availableManualOrders = useMemo(() => {
    if (!manualProjectId) return [];
    const proj = projectsOrders.find(p => String(p.project_id) === String(manualProjectId) || p.project_key === manualProjectId);
    return proj ? proj.orders : [];
  }, [manualProjectId, projectsOrders]);

  const handleSubmitAllocation = async (e) => {
    if (e) e.preventDefault();
    if (!allocTargetItem) return;

    const numAmt = parseFloat(allocAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      alert("Please enter a valid allocated amount greater than R 0.00.");
      return;
    }

    let targetOrderId = '';
    let targetProjectKey = '';

    if (selectedCandidateKey && selectedCandidateKey !== 'MANUAL') {
      const cand = candidateOrders.find(c => String(c.order_id) === String(selectedCandidateKey));
      if (cand) {
        targetOrderId = cand.order_id;
        targetProjectKey = cand.project_key;
      }
    } else {
      if (!manualOrderId) {
        alert("Please select a target Order to allocate this payment to.");
        return;
      }
      targetOrderId = manualOrderId;
      targetProjectKey = manualProjectId;
    }

    setIsSavingAlloc(true);
    try {
      const payload = {
        palladium_payment_id: allocTargetItem.palladium_payment_id,
        order_id: targetOrderId,
        project_key: targetProjectKey,
        allocated_amount: numAmt,
        payment_type: allocPaymentType,
        notes: allocNotes,
        user_name: 'Admin'
      };

      const res = await fetch(`${API_BASE}/api/payments/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Payment allocated successfully!'}`);
        setAllocModalOpen(false);
        await fetchSummary();
        await fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
        await fetchAllocations();
        if (refreshProjects) await refreshProjects();
        if (selectedDocument) {
          setSelectedDocument(null);
        }
      } else {
        alert(`Allocation notice: ${data.detail || 'Could not complete allocation.'}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setIsSavingAlloc(false);
    }
  };

  const handleUnallocate = async (allocationId, receiptNo) => {
    setIsDeletingAlloc(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/allocations/${allocationId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Released allocation from ${receiptNo}`);
        setUnallocConfirmId(null);
        await fetchSummary();
        await fetchPaymentsDocuments(activeFilterTab, customerFilter, searchQuery);
        await fetchAllocations();
        if (refreshProjects) await refreshProjects();
      } else {
        alert(`Notice: ${data.detail || 'Failed to unallocate.'}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
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
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 85px)', padding: '0 4px' }}>
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#f8fafc',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px', 
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.5px' }}>
              {getModuleName('payments', 'Customer Payments')} Suite
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Read-Only Feed from Palladium ERP</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={22} style={{ color: '#3b82f6' }} />
            {selectedDocument ? (
              <span>
                Receipt Workspace: <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{selectedDocument.receipt_no}</span>
              </span>
            ) : (
              'Customer Payments & Order Allocation Hub'
            )}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedDocument && (
            <button
              onClick={() => setSelectedDocument(null)}
              className="btn btn-sm btn-ghost"
              style={{ border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '32px', fontWeight: 600 }}
            >
              <ArrowLeft size={14} /> Back to All Receipts
            </button>
          )}

          <button
            onClick={handleTriggerMasterSync}
            disabled={isSyncingPalladium}
            className="btn btn-sm"
            title="Ingest live customer receipts from Palladium ERP (tblCustPay)"
            style={{ 
              border: '1px solid #10b981', 
              color: '#10b981', 
              background: 'rgba(16, 185, 129, 0.08)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              height: '32px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={13} className={isSyncingPalladium ? 'animate-spin' : ''} />
            {isSyncingPalladium ? 'Syncing...' : 'Sync Palladium'}
          </button>
        </div>
      </div>

      {/* TOP 4 KPI CARDS (Matching Purchasing/Receiving) */}
      {!selectedDocument && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', 
          gap: '12px', 
          marginBottom: '16px' 
        }}>
          {/* CARD 1: NEEDS ALLOCATION (AMBER ALERT) */}
          <div 
            onClick={() => setActiveFilterTab('NEEDS_ALLOCATION')}
            className="card" 
            style={{ 
              padding: '14px 18px', 
              borderRadius: '12px',
              border: activeFilterTab === 'NEEDS_ALLOCATION' ? '1.5px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.25)',
              background: activeFilterTab === 'NEEDS_ALLOCATION' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚨 Needs Allocation
              </span>
              <span style={{ background: '#f59e0b', color: '#000', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px' }}>
                ACTION
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', lineHeight: 1.1 }}>
              {(paymentsSummary.unallocated_count || 0).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Receipts with unallocated balance (R {(paymentsSummary.total_amount_unallocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </div>
          </div>

          {/* CARD 2: PARTIALLY ALLOCATED */}
          <div 
            onClick={() => setActiveFilterTab('PARTIAL')}
            className="card" 
            style={{ 
              padding: '14px 18px', 
              borderRadius: '12px',
              border: activeFilterTab === 'PARTIAL' ? '1.5px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.25)',
              background: activeFilterTab === 'PARTIAL' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏳ Partially Allocated
              </span>
              <Clock size={14} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', lineHeight: 1.1 }}>
              {(paymentsSummary.partially_allocated_count || 0).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Receipts partially split across project orders
            </div>
          </div>

          {/* CARD 3: FULLY ALLOCATED */}
          <div 
            onClick={() => setActiveFilterTab('FULLY_ALLOCATED')}
            className="card" 
            style={{ 
              padding: '14px 18px', 
              borderRadius: '12px',
              border: activeFilterTab === 'FULLY_ALLOCATED' ? '1.5px solid #10b981' : '1px solid rgba(16, 185, 129, 0.25)',
              background: activeFilterTab === 'FULLY_ALLOCATED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.04)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ✅ Fully Allocated
              </span>
              <CheckCircle2 size={14} color="#10b981" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#10b981', marginTop: '4px', lineHeight: 1.1 }}>
              {(paymentsSummary.fully_allocated_count || 0).toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              100% matched to project orders (R {(paymentsSummary.total_amount_allocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </div>
          </div>

          {/* CARD 4: TOTAL VOLUME */}
          <div 
            onClick={() => setActiveFilterTab('ALL')}
            className="card" 
            style={{ 
              padding: '14px 18px', 
              borderRadius: '12px',
              border: activeFilterTab === 'ALL' ? '1.5px solid var(--text-tertiary)' : '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 Total ERP Receipts
              </span>
              <Box size={14} color="var(--text-tertiary)" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.1 }}>
              {(paymentsSummary.total_payments_count || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Totaling R {(paymentsSummary.total_amount_synced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW A: INDIVIDUAL RECEIPT WORKSPACE (When Opened)           */}
      {/* ============================================================ */}
      {selectedDocument ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          
          {/* Receipt Header Card */}
          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    Customer Receipt
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {selectedDocument.receipt_no}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <div>Client: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.customer_name} ({selectedDocument.customer_code})</strong></div>
                  <div>Date: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.payment_date || '—'}</strong></div>
                  <div>Method: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.payment_method || 'EFT'}</strong></div>
                  {selectedDocument.reference && (
                    <div>Ref/Comment: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.reference}</strong></div>
                  )}
                </div>
              </div>

              {/* Status Badge & Value Summary */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  R {selectedDocument.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Allocated: <strong style={{ color: '#10b981' }}>R {selectedDocument.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> | Remaining: <strong style={{ color: '#f59e0b' }}>R {selectedDocument.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Allocations on this Receipt */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#3b82f6" />
              Active Allocations for this Receipt ({selectedDocument.allocations?.length || 0})
            </h3>

            {(!selectedDocument.allocations || selectedDocument.allocations.length === 0) ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <Receipt size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>This receipt is not yet allocated to any project order.</div>
                <button
                  onClick={() => handleOpenAllocModal(selectedDocument)}
                  className="btn btn-sm btn-primary"
                  style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusCircle size={14} /> Allocate to an Order Now
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Order / Quotation</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Project</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Allocated Amount</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>Notes</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDocument.allocations.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {a.quote_name} ({a.order_id})
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {a.project_name || a.project_key || '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className="badge b-info">{a.payment_type || 'Deposit Payment'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          R {a.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {a.allocated_at ? new Date(a.allocated_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {a.notes || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => setUnallocConfirmId(a.id)}
                            className="btn btn-sm btn-ghost"
                            style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 8px', fontSize: '11px' }}
                          >
                            <Trash2 size={12} /> Unallocate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedDocument.remaining_amount > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleOpenAllocModal(selectedDocument)}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <PlusCircle size={14} /> Allocate Remaining R {selectedDocument.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </button>
              </div>
            )}
          </div>

        </div>
      ) : (

        /* ============================================================ */
        /* VIEW B: MAIN RECEIPTS & ALLOCATIONS HUB (Matching Image 2)   */
        /* ============================================================ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          
          {/* FILTER PILLS & SEARCH BAR (Matching Image 2 exactly) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '10px' 
          }}>
            {/* Left side: Filter Tab Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveFilterTab('NEEDS_ALLOCATION')}
                className={`btn btn-sm ${activeFilterTab === 'NEEDS_ALLOCATION' ? 'btn-warning' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🚨 Needs Allocation ({paymentsSummary.unallocated_count || 0})
              </button>

              <button
                onClick={() => setActiveFilterTab('PARTIAL')}
                className={`btn btn-sm ${activeFilterTab === 'PARTIAL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⏳ Partially Allocated ({paymentsSummary.partially_allocated_count || 0})
              </button>

              <button
                onClick={() => setActiveFilterTab('FULLY_ALLOCATED')}
                className={`btn btn-sm ${activeFilterTab === 'FULLY_ALLOCATED' ? 'btn-success' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ✅ Fully Allocated ({paymentsSummary.fully_allocated_count || 0})
              </button>

              <button
                onClick={() => setActiveFilterTab('ISSUES')}
                className={`btn btn-sm ${activeFilterTab === 'ISSUES' ? 'btn-error' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#ef4444',
                  color: activeFilterTab === 'ISSUES' ? '#ffffff' : '#ef4444',
                  background: activeFilterTab === 'ISSUES' ? '#ef4444' : 'transparent'
                }}
              >
                ⚠️ Issues / Not Found ({paymentsSummary.issues_count || 0})
              </button>

              <button
                onClick={() => setActiveFilterTab('ALL')}
                className={`btn btn-sm ${activeFilterTab === 'ALL' ? 'btn-secondary' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600
                }}
              >
                All Receipts
              </button>

              <button
                onClick={() => setActiveFilterTab('AUDIT')}
                className={`btn btn-sm ${activeFilterTab === 'AUDIT' ? 'btn-info' : 'btn-outline'}`}
                style={{ 
                  borderRadius: '20px', 
                  fontSize: '11.5px', 
                  padding: '5px 14px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📋 Allocations Audit Log ({allocations.length})
              </button>
            </div>

            {/* Right side: Search Box + Customer Filter */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Doc #, Client, Ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input input-sm"
                  style={{ paddingLeft: '28px', fontSize: '11.5px', height: '32px', width: '100%', borderRadius: '6px' }}
                />
              </div>

              {activeFilterTab !== 'AUDIT' && (
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="input input-sm"
                  style={{ height: '32px', fontSize: '11.5px', borderRadius: '6px', maxWidth: '170px' }}
                >
                  <option value="All Clients">All Clients</option>
                  {uniqueCustomers.map(cust => (
                    <option key={cust} value={cust}>{cust}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* MAIN TABLE (Matching Image 2 Layout exactly) */}
          <div className="card" style={{ borderRadius: '12px', overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
            
            {activeFilterTab === 'AUDIT' ? (
              /* AUDIT TRAIL TABLE */
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Document #</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Target Order</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Project</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Client</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Allocated Amount</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Allocated Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Notes</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No payment allocations recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredAllocations.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>
                            {a.receipt_no}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {a.quote_name} ({a.order_id})
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                            {a.project_name || a.project_key || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                            {a.client || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="badge b-info" style={{ fontSize: '10.5px' }}>{a.payment_type || 'Deposit Payment'}</span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            R {a.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                              className="btn btn-sm btn-ghost"
                              style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '3px 8px', fontSize: '11px' }}
                            >
                              <Trash2 size={12} /> Unallocate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* STANDARD RECEIPTS TABLE (Matching Image 2) */
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>DOCUMENT #</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>TYPE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>DATE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>CLIENT / CUSTOMER</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>METHOD / REF</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>TOTAL VALUE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>ALLOCATION STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingPayments ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                          <div>Loading customer receipts...</div>
                        </td>
                      </tr>
                    ) : paymentsDocs.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <Receipt size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>No customer receipts found</div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Sync Palladium" above to pull latest ERP payments.</div>
                        </td>
                      </tr>
                    ) : (
                      paymentsDocs.map((p) => {
                        const isFully = p.status === 'Fully Allocated';
                        const isPartial = p.status === 'Partially Allocated';

                        return (
                          <tr 
                            key={p.id} 
                            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                            onClick={() => setSelectedDocument(p)}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={14} style={{ color: '#3b82f6' }} />
                                <div>
                                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                    {p.receipt_no}
                                  </span>
                                  {p.reference && (
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      Ref: {p.reference}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ 
                                padding: '2px 7px', 
                                borderRadius: '4px', 
                                fontSize: '10.5px', 
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}>
                                RECEIPT
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                              {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.customer_name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Code: {p.customer_code || '—'}</div>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.payment_method || 'EFT'}</span>
                              {p.captured_by && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>by {p.captured_by}</div>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>
                              R {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              {p.is_flagged_issue ? (
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)'
                                }} title={p.issue_notes ? `${p.issue_reason}: ${p.issue_notes}` : p.issue_reason}>
                                  ⚠️ {p.issue_reason || 'Issue / Not Found'}
                                </span>
                              ) : (
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  background: isFully ? 'rgba(16,185,129,0.12)' : (isPartial ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)'),
                                  color: isFully ? '#10b981' : (isPartial ? '#3b82f6' : '#f59e0b'),
                                  border: `1px solid ${isFully ? 'rgba(16,185,129,0.3)' : (isPartial ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)')}`
                                }}>
                                  {isFully ? (
                                    <>✅ Fully Allocated</>
                                  ) : isPartial ? (
                                    <>⏳ Partially (R {p.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} left)</>
                                  ) : (
                                    <>🚨 Needs Allocation</>
                                  )}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenAllocModal(p)}
                                className="btn btn-sm btn-primary"
                                style={{
                                  background: '#3b82f6',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  padding: '5px 12px',
                                  borderRadius: '6px'
                                }}
                              >
                                <ExternalLink size={13} />
                                Allocate
                              </button>

                              <button
                                onClick={() => p.is_flagged_issue ? handleResolveIssue(p) : handleOpenIssueModal(p)}
                                className="btn btn-sm btn-ghost"
                                style={{
                                  color: p.is_flagged_issue ? '#10b981' : '#f59e0b',
                                  border: '1px solid var(--border)',
                                  fontSize: '11px',
                                  padding: '5px 8px',
                                  borderRadius: '6px'
                                }}
                                title={p.is_flagged_issue ? 'Click to resolve issue' : 'Flag as Issue / Not Found'}
                              >
                                {p.is_flagged_issue ? 'Resolve' : 'Flag Issue'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* ALLOCATION MODAL (Single / Candidate Order Allocation)       */}
      {/* ============================================================ */}
      {allocModalOpen && allocTargetItem && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '620px',
            borderRadius: '14px',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card, #ffffff)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#3b82f6" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Allocate Receipt: <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{allocTargetItem.receipt_no}</span>
                </h3>
              </div>
              <button
                onClick={() => setAllocModalOpen(false)}
                className="btn btn-sm btn-ghost"
                style={{ padding: '4px', borderRadius: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitAllocation} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Receipt Summary Info Banner */}
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Client:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{allocTargetItem.customer_name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Date:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{allocTargetItem.payment_date || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Value:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>R {allocTargetItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Available Pool:</span>{' '}
                  <strong style={{ color: '#f59e0b' }}>R {(allocTargetItem.remaining_amount || allocTargetItem.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* CANDIDATE ORDERS SUGGESTIONS (Automatic Intelligent Matching) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  🎯 Candidate Project Orders (Intelligent ERP Matching)
                </label>

                {isLoadingCandidates ? (
                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                    <RefreshCw size={14} className="animate-spin" style={{ display: 'inline', marginRight: '6px' }} /> Searching project orders...
                  </div>
                ) : candidateOrders.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {candidateOrders.map((cand) => {
                      const isSelected = selectedCandidateKey === cand.order_id;
                      return (
                        <div
                          key={cand.order_id}
                          onClick={() => handleSelectCandidate(cand)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                              {cand.quote_name} ({cand.order_id})
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Project: <strong style={{ color: 'var(--text-primary)' }}>{cand.project_name}</strong> | Client: {cand.client}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: cand.outstanding > 0 ? '#f59e0b' : '#10b981' }}>
                              Outstanding: R {cand.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                              Total: R {cand.total_value.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Incl. VAT)
                            </div>
                            <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '2px', fontWeight: 600 }}>
                              70%: R {(cand.deposit_70 || (cand.total_value * 0.7)).toLocaleString(undefined, { minimumFractionDigits: 2 })} | 30%: R {(cand.balance_30 || (cand.total_value * 0.3)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', fontSize: '11.5px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    No automatic client name matches found. Use the manual project & order selector below.
                  </div>
                )}
              </div>

              {/* MANUAL PROJECT & ORDER SELECTOR */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div 
                  onClick={() => setSelectedCandidateKey('MANUAL')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px' }}
                >
                  <input
                    type="radio"
                    name="allocChoice"
                    checked={selectedCandidateKey === 'MANUAL'}
                    onChange={() => setSelectedCandidateKey('MANUAL')}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Or select destination Project & Order manually
                  </span>
                </div>

                {selectedCandidateKey === 'MANUAL' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Project
                      </label>
                      <select
                        value={manualProjectId}
                        onChange={(e) => {
                          setManualProjectId(e.target.value);
                          setManualOrderId('');
                        }}
                        className="input input-sm"
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        <option value="">-- Choose Project --</option>
                        {projectsOrders.map(p => (
                          <option key={p.project_id || p.project_key} value={p.project_id || p.project_key}>
                            {p.project_name} ({p.orders.length} orders)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Order / Quotation
                      </label>
                      <select
                        value={manualOrderId}
                        onChange={(e) => setManualOrderId(e.target.value)}
                        disabled={!manualProjectId}
                        className="input input-sm"
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        <option value="">-- Choose Order --</option>
                        {availableManualOrders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.quote_name} ({o.po_number}) — Outstanding: R {o.outstanding.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* ALLOCATION AMOUNT & TYPE */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Allocated Amount (Rands)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={allocAmount}
                      onChange={(e) => setAllocAmount(e.target.value)}
                      className="input input-sm"
                      style={{ width: '100%', fontSize: '13px', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Payment Type
                    </label>
                    <select
                      value={allocPaymentType}
                      onChange={(e) => setAllocPaymentType(e.target.value)}
                      className="input input-sm"
                      style={{ width: '100%', fontSize: '12px' }}
                    >
                      <option value="Deposit Payment">Deposit Payment (70%)</option>
                      <option value="Balance Payment">Balance Payment (30%)</option>
                      <option value="Interim Payment">Interim Payment</option>
                      <option value="Full Settlement">Full Settlement (100%)</option>
                    </select>
                  </div>
                </div>

                {/* Quick-Fill Calculation Shortcuts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {(() => {
                    const activeCand = candidateOrders.find(c => String(c.order_id) === String(selectedCandidateKey));
                    if (!activeCand) return null;
                    const dep70 = activeCand.deposit_70 || (activeCand.total_value * 0.7);
                    const bal30 = activeCand.balance_30 || (activeCand.total_value * 0.3);
                    const outVal = activeCand.outstanding > 0 ? activeCand.outstanding : activeCand.total_value;
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => { setAllocAmount(dep70.toFixed(2)); setAllocPaymentType('Deposit Payment'); }}
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: '10px', padding: '2px 8px', borderColor: '#6366f1', color: '#6366f1' }}
                        >
                          70% Deposit (R {dep70.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAllocAmount(bal30.toFixed(2)); setAllocPaymentType('Balance Payment'); }}
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: '10px', padding: '2px 8px', borderColor: '#8b5cf6', color: '#8b5cf6' }}
                        >
                          30% Balance (R {bal30.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllocAmount(outVal.toFixed(2))}
                          className="btn btn-xs btn-outline"
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                        >
                          Full Outstanding (R {outVal.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                        </button>
                      </>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setAllocAmount((allocTargetItem?.remaining_amount > 0 ? allocTargetItem.remaining_amount : allocTargetItem?.amount || 0).toFixed(2))}
                    className="btn btn-xs btn-outline"
                    style={{ fontSize: '10px', padding: '2px 8px' }}
                  >
                    Max Available (R {(allocTargetItem?.remaining_amount > 0 ? allocTargetItem.remaining_amount : allocTargetItem?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </button>
                </div>
              </div>

              {/* ALLOCATION NOTES */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Allocation Notes / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. 70% Deposit for Living Room tracks"
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  className="input input-sm"
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const it = allocTargetItem;
                    setAllocModalOpen(false);
                    handleOpenIssueModal(it);
                  }}
                  className="btn btn-sm btn-ghost"
                  style={{
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px'
                  }}
                >
                  <AlertTriangle size={13} />
                  Flag as Issue / Not Found
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setAllocModalOpen(false)}
                    className="btn btn-sm btn-ghost"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingAlloc || (!selectedCandidateKey && !manualOrderId)}
                    className="btn btn-sm btn-primary"
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '6px 18px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSavingAlloc && <RefreshCw size={13} className="animate-spin" />}
                    {isSavingAlloc ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* UNALLOCATE CONFIRMATION MODAL */}
      {unallocConfirmId && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '420px',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card, #ffffff)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertTriangle size={22} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Confirm Unallocation
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to remove this payment allocation? The allocated amount will be returned to the unallocated pool.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setUnallocConfirmId(null)}
                className="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUnallocate(unallocConfirmId)}
                className="btn btn-sm"
                style={{ background: '#ef4444', color: '#fff', border: 'none', fontWeight: 700 }}
              >
                Yes, Unallocate
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* FLAG / MANAGE ISSUE MODAL */}
      {issueModalOpen && issueTargetItem && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'var(--bg-card, #ffffff)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex' }}>
                  <AlertTriangle size={20} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Flag Issue / Not Found
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Receipt: <strong style={{ color: 'var(--text-primary)' }}>{issueTargetItem.receipt_no}</strong> (R {Number(issueTargetItem.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIssueModalOpen(false)}
                className="btn btn-xs btn-ghost"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Reason Category
                </label>
                <select
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="input input-sm"
                  style={{ width: '100%', fontSize: '12.5px' }}
                >
                  <option value="Order Not Found">Order Not Found in System</option>
                  <option value="Price / Amount Mismatch">Price / Amount Mismatch</option>
                  <option value="Client Name Mismatch">Client Name / Code Mismatch</option>
                  <option value="Requires PM Review">Requires PM / Sales Rep Review</option>
                  <option value="Duplicate Payment">Duplicate Payment</option>
                  <option value="Other">Other / Investigation Needed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Issue Notes & Explanation
                </label>
                <textarea
                  rows={3}
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Describe why this payment cannot be matched or what information is needed..."
                  className="textarea input-sm"
                  style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {issueTargetItem.is_flagged_issue ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIssueModalOpen(false);
                      handleResolveIssue(issueTargetItem);
                    }}
                    className="btn btn-sm btn-ghost"
                    style={{ color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11.5px' }}
                  >
                    <Check size={13} /> Mark Resolved
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIssueModalOpen(false)}
                    className="btn btn-sm btn-ghost"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingIssue}
                    className="btn btn-sm"
                    style={{
                      background: '#f59e0b',
                      color: '#000',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSavingIssue && <RefreshCw size={13} className="animate-spin" />}
                    {isSavingIssue ? 'Saving...' : 'Save Issue Flag'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
