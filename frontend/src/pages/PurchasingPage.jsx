import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  ClipboardList, Plus, FileText, Printer, ArrowLeft, Search, CheckCircle, Trash2, Eye,
  RefreshCw, AlertTriangle, Check, Layers, ExternalLink, Filter, ArrowRight, ShieldCheck,
  ChevronDown, ChevronRight, X, Sparkles, Box, ArrowUpRight, CheckCircle2, Clock
} from 'lucide-react';

export default function PurchasingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, getModuleName } = useStore();

  // Primary View Mode: 'palladium' (Allocation Engine) | 'legacy' (Manual Document Creator)
  const [viewMode, setViewMode] = useState('palladium');
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // -------------------------------------------------------------
  // PALLADIUM PROCUREMENT & ALLOCATION ENGINE STATE
  // -------------------------------------------------------------
  const [procurementSummary, setProcurementSummary] = useState({
    unallocated_count: 0,
    partially_allocated_count: 0,
    fully_allocated_count: 0,
    total_documents: 0,
    total_lines: 0,
    total_unallocated_units: 0
  });

  const [procurementItems, setProcurementItems] = useState([]);
  const [isLoadingProcurement, setIsLoadingProcurement] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('NEEDS_ALLOCATION'); // 'NEEDS_ALLOCATION' | 'PARTIAL' | 'FULLY_ALLOCATED' | 'PO' | 'GRN' | 'ALL'
  const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLineId, setExpandedLineId] = useState(null);
  const [isSyncingPalladium, setIsSyncingPalladium] = useState(false);

  // Allocation Modal State
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocTargetItem, setAllocTargetItem] = useState(null);
  const [candidateOrders, setCandidateOrders] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(null); // 'orderItemId' or 'MANUAL'
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [allocQty, setAllocQty] = useState(1);
  const [allocNotes, setAllocNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // -------------------------------------------------------------
  // FETCH PROCUREMENT DATA
  // -------------------------------------------------------------
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/procurement/summary`);
      if (res.ok) {
        setProcurementSummary(await res.json());
      }
    } catch (_) {}
  };

  const fetchProcurementDocuments = async (newPage = page, newTab = activeFilterTab, newSupplier = supplierFilter, newQ = searchQuery) => {
    setIsLoadingProcurement(true);
    try {
      let docTypeParam = 'ALL';
      let statusParam = 'ALL';

      if (newTab === 'PO') {
        docTypeParam = 'PO';
      } else if (newTab === 'GRN') {
        docTypeParam = 'GRN';
      } else if (newTab === 'NEEDS_ALLOCATION') {
        statusParam = 'NEEDS_ALLOCATION';
      } else if (newTab === 'PARTIAL') {
        statusParam = 'PARTIAL';
      } else if (newTab === 'FULLY_ALLOCATED') {
        statusParam = 'FULLY_ALLOCATED';
      }

      const params = new URLSearchParams({
        doc_type: docTypeParam,
        status: statusParam,
        page: newPage.toString(),
        limit: limit.toString()
      });

      if (newSupplier && newSupplier !== 'All Suppliers') {
        params.append('supplier', newSupplier);
      }
      if (newQ && newQ.trim()) {
        params.append('q', newQ.trim());
      }

      const res = await fetch(`${API_BASE}/api/procurement/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProcurementItems(data.items || []);
        setTotalCount(data.total_count || 0);
        setTotalPages(data.total_pages || 1);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error('Failed to fetch procurement documents:', err);
    } finally {
      setIsLoadingProcurement(false);
    }
  };

  // Trigger master sync from top button
  const handleTriggerMasterSync = async () => {
    setIsSyncingPalladium(true);
    triggerToast("⚡ Initiating unified master sync (Palladium ERP + Google Sheets)...");
    try {
      const res = await fetch(`${API_BASE}/api/palladium/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Master sync completed successfully!'}`);
      } else {
        triggerToast(`⚠️ Sync notice: ${data.detail || 'Sync in progress'}`);
      }
    } catch (e) {
      triggerToast(`⚠️ Sync connection error: ${e.message}`);
    } finally {
      await fetchSummary();
      await fetchProcurementDocuments(1);
      setIsSyncingPalladium(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchProcurementDocuments(1, activeFilterTab, supplierFilter, searchQuery);
  }, []);

  // Debounced Search & Tab Change Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProcurementDocuments(1, activeFilterTab, supplierFilter, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeFilterTab, supplierFilter, searchQuery]);

  // Extract unique suppliers for filter
  const uniqueSuppliers = useMemo(() => {
    const set = new Set();
    procurementItems.forEach(item => {
      if (item.vendor_name && item.vendor_name.trim()) set.add(item.vendor_name.trim());
    });
    return Array.from(set).sort();
  }, [procurementItems]);

  // -------------------------------------------------------------
  // ALLOCATION ACTIONS
  // -------------------------------------------------------------
  const handleOpenAllocModal = async (item) => {
    setAllocTargetItem(item);
    setAllocQty(Math.max(1, Math.min(item.unallocated_qty || 1, item.total_qty || 1)));
    setAllocNotes('');
    setSelectedCandidateKey(null);
    setManualProjectId('');
    setManualOrderId('');
    setAllocModalOpen(true);

    setIsLoadingCandidates(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/candidate-orders?sku=${encodeURIComponent(item.item_code)}`);
      if (res.ok) {
        const data = await res.json();
        setCandidateOrders(data.candidates || []);
        if (data.candidates && data.candidates.length > 0) {
          setSelectedCandidateKey(data.candidates[0].order_item_id);
          // Set suggested quantity to remaining needed or remaining unallocated
          const needed = data.candidates[0].remaining_needed || 1;
          setAllocQty(Math.min(needed, item.unallocated_qty || needed));
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

  const handleSelectCandidate = (cand) => {
    setSelectedCandidateKey(cand.order_item_id);
    const needed = cand.remaining_needed || 1;
    const available = allocTargetItem?.unallocated_qty || 1;
    setAllocQty(Math.min(needed, available));
  };

  const handleSubmitAllocation = async (e) => {
    e.preventDefault();
    if (!allocTargetItem) return;

    if (allocQty <= 0) {
      alert("Please specify an allocation quantity greater than 0.");
      return;
    }
    if (allocQty > (allocTargetItem.unallocated_qty || 0)) {
      alert(`Allocation quantity (${allocQty}) exceeds unallocated balance (${allocTargetItem.unallocated_qty}).`);
      return;
    }

    let payload = {
      allocation_type: allocTargetItem.doc_type,
      source_doc_no: allocTargetItem.document_no,
      source_line_id: allocTargetItem.line_id,
      sku: allocTargetItem.item_code,
      allocated_qty: Number(allocQty),
      unit_cost: Number(allocTargetItem.unit_cost || 0),
      notes: allocNotes,
      allocated_by_name: 'Staff'
    };

    if (selectedCandidateKey && selectedCandidateKey !== 'MANUAL') {
      const cand = candidateOrders.find(c => String(c.order_item_id) === String(selectedCandidateKey));
      if (cand) {
        payload.project_id = cand.project_id;
        payload.project_name = cand.project_name;
        payload.order_id = cand.order_id;
        payload.order_item_id = cand.order_item_id;
        payload.fitting_code = cand.fitting_code;
      }
    } else {
      if (!manualProjectId) {
        alert("Please select a target Project to allocate to.");
        return;
      }
      const proj = Object.values(projects || {}).find(p => String(p.id) === String(manualProjectId) || p.key === manualProjectId);
      payload.project_id = proj ? (proj.id || 1) : 1;
      payload.project_name = proj ? proj.name : 'Selected Project';
      payload.order_id = manualOrderId ? Number(manualOrderId) : null;
      payload.fitting_code = allocTargetItem.item_code;
    }

    setIsSavingAlloc(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Allocated successfully!'}`);
        setAllocModalOpen(false);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
      } else {
        alert(`Allocation notice: ${data.detail || 'Could not complete allocation.'}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setIsSavingAlloc(false);
    }
  };

  const handleUnallocate = async (allocationId, docNo) => {
    if (!window.confirm(`Release this allocation from ${docNo}? The quantity will return to Unallocated.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/procurement/unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocation_id: allocationId })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Released allocation: ${data.message}`);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
      } else {
        alert(`Notice: ${data.detail || 'Failed to unallocate.'}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  // -------------------------------------------------------------
  // LEGACY MANUAL DOCUMENT BUILDER (Kept for historical documents)
  // -------------------------------------------------------------
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  const [groupingMode, setGroupingMode] = useState('none');
  const [filterPm, setFilterPm] = useState('All');
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [showPoModal, setShowPoModal] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [poOrderSearchQuery, setPoOrderSearchQuery] = useState('');
  const [poOrderDropdownOpen, setPoOrderDropdownOpen] = useState(false);
  const [poOrderKey, setPoOrderKey] = useState('');
  const [poSupplier, setPoSupplier] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poCustomId, setPoCustomId] = useState('');
  const [poCustomDate, setPoCustomDate] = useState('');
  const [poItemInputs, setPoItemInputs] = useState({});
  const [grnPoId, setGrnPoId] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [grnCustomId, setGrnCustomId] = useState('');
  const [grnCustomDate, setGrnCustomDate] = useState('');
  const [grnItemInputs, setGrnItemInputs] = useState({});
  const [showEditPoModal, setShowEditPoModal] = useState(false);
  const [editPoDoc, setEditPoDoc] = useState(null);
  const [editPoNotes, setEditPoNotes] = useState('');
  const [editPoItemEtas, setEditPoItemEtas] = useState({});

  const allOrders = useMemo(() => {
    return Object.values(projects || {}).flatMap(p => 
      (p.orders || []).map(o => ({
        ...o,
        projectKey: p.key,
        projectName: p.name,
        projectClient: p.client,
        projectPm: p.pm || o.pmName || '',
      }))
    );
  }, [projects]);

  const allDocs = useMemo(() => {
    const docs = [];
    allOrders.forEach(order => {
      (order.purchaseOrders || []).forEach(po => {
        docs.push({
          ...po,
          type: 'purchase_order',
          orderId: order.id,
          projectKey: order.projectKey,
          projectName: order.projectName,
          projectClient: order.projectClient,
          supplier: po.supplier || order.supplier,
          projectPm: order.projectPm,
          orderObj: order
        });
      });
      (order.goodsReceivedNotes || []).forEach(grn => {
        docs.push({
          ...grn,
          type: 'goods_received_note',
          orderId: order.id,
          projectKey: order.projectKey,
          projectName: order.projectName,
          projectClient: order.projectClient,
          supplier: order.supplier,
          projectPm: order.projectPm,
          orderObj: order
        });
      });
    });
    docs.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    return docs;
  }, [allOrders]);

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
              {getModuleName('purchasing', 'Purchasing')} & Receiving Suite
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Read-Only Feed from Palladium ERP</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={22} style={{ color: '#3b82f6' }} />
            Procurement & Order Allocation Hub
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* View Mode Toggle */}
          <div style={{ background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setViewMode('palladium')}
              className={`btn btn-xs ${viewMode === 'palladium' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              ⚡ Palladium ERP Allocations
            </button>
            <button
              onClick={() => setViewMode('legacy')}
              className={`btn btn-xs ${viewMode === 'legacy' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              📑 Manual PO/GRN Ledger
            </button>
          </div>

          <button
            onClick={handleTriggerMasterSync}
            disabled={isSyncingPalladium}
            className="btn btn-sm"
            title="Unified Sync from Palladium ERP and Master Google Sheet"
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

      {viewMode === 'palladium' ? (
        <>
          {/* TOP 4 KPI CARDS */}
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
                {procurementSummary.unallocated_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Lines with 0% assigned to orders ({procurementSummary.total_unallocated_units.toLocaleString()} units)
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
                {procurementSummary.partially_allocated_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Lines with split or remaining stock
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
                {procurementSummary.fully_allocated_count.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                100% matched to project orders
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
                  📦 Total ERP Volume
                </span>
                <Box size={14} color="var(--text-tertiary)" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.1 }}>
                {procurementSummary.total_lines.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Across {procurementSummary.total_documents.toLocaleString()} PO & GRN documents
              </div>
            </div>
          </div>

          {/* FILTER TABS & SEARCH BAR */}
          <div className="card" style={{ padding: '12px 16px', marginBottom: '14px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              
              {/* Tab Filters */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveFilterTab('NEEDS_ALLOCATION')}
                  className={`btn btn-xs ${activeFilterTab === 'NEEDS_ALLOCATION' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: activeFilterTab === 'NEEDS_ALLOCATION' ? '#f59e0b' : 'transparent',
                    color: activeFilterTab === 'NEEDS_ALLOCATION' ? '#000' : 'var(--text-primary)',
                    border: '1px solid rgba(245, 158, 11, 0.4)'
                  }}
                >
                  🚨 Needs Allocation ({procurementSummary.unallocated_count})
                </button>
                <button
                  onClick={() => setActiveFilterTab('PARTIAL')}
                  className={`btn btn-xs ${activeFilterTab === 'PARTIAL' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  ⏳ Partially Allocated
                </button>
                <button
                  onClick={() => setActiveFilterTab('FULLY_ALLOCATED')}
                  className={`btn btn-xs ${activeFilterTab === 'FULLY_ALLOCATED' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  ✅ Fully Allocated
                </button>
                <button
                  onClick={() => setActiveFilterTab('PO')}
                  className={`btn btn-xs ${activeFilterTab === 'PO' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  📄 Purchase Orders (POs)
                </button>
                <button
                  onClick={() => setActiveFilterTab('GRN')}
                  className={`btn btn-xs ${activeFilterTab === 'GRN' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  📥 Goods Received (GRNs)
                </button>
                <button
                  onClick={() => setActiveFilterTab('ALL')}
                  className={`btn btn-xs ${activeFilterTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  All Items
                </button>
              </div>

              {/* Search & Supplier Filter */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search SKU, Doc #, Customer..."
                    className="form-control"
                    style={{ paddingLeft: '28px', height: '30px', fontSize: '11.5px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '6px', top: '6px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  className="form-control"
                  style={{ height: '30px', fontSize: '11.5px', padding: '2px 8px', maxWidth: '160px' }}
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                >
                  <option value="All Suppliers">All Suppliers</option>
                  {uniqueSuppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* PROCUREMENT DATA TABLE */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: '30px' }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Document #</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Item Code / Description</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Total Qty</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Allocated</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Unallocated</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Allocation Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingProcurement ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#3b82f6' }} />
                        Loading live procurement records...
                      </td>
                    </tr>
                  ) : procurementItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>No procurement items found</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>All items in this view may already be fully allocated or match no search query.</div>
                      </td>
                    </tr>
                  ) : (
                    procurementItems.map((item) => {
                      const isExpanded = expandedLineId === item.id;
                      const hasAllocations = item.allocations && item.allocations.length > 0;

                      return (
                        <React.Fragment key={item.id}>
                          <tr style={{ 
                            borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                            background: isExpanded ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}>
                            {/* Expand/Collapse Chevron */}
                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                              {hasAllocations && (
                                <button
                                  onClick={() => setExpandedLineId(isExpanded ? null : item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                                  title="View allocated projects & orders"
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              )}
                            </td>

                            {/* Document # */}
                            <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                              {item.document_no}
                              {item.customer_name && (
                                <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                  Ref: {item.customer_name}
                                </div>
                              )}
                            </td>

                            {/* Doc Type Badge */}
                            <td style={{ padding: '8px 8px' }}>
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '10px', 
                                fontWeight: 700,
                                background: item.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                color: item.doc_type === 'PO' ? '#3b82f6' : '#10b981',
                                border: `1px solid ${item.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                              }}>
                                {item.doc_type}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {item.transaction_date ? new Date(item.transaction_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                            </td>

                            {/* Supplier */}
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.vendor_name}
                            </td>

                            {/* SKU & Description */}
                            <td style={{ padding: '8px 12px', maxWidth: '300px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {item.item_code}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.item_description || 'No description'}
                              </div>
                            </td>

                            {/* Unit Cost */}
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                              R {item.unit_cost ? item.unit_cost.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </td>

                            {/* Total Qty */}
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600 }}>
                              {item.total_qty} <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{item.item_unit}</span>
                            </td>

                            {/* Allocated Qty */}
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: item.allocated_qty > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                              {item.allocated_qty}
                            </td>

                            {/* Remaining Unallocated Qty */}
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: item.unallocated_qty > 0 ? '#f59e0b' : '#10b981' }}>
                              {item.unallocated_qty}
                            </td>

                            {/* Allocation Status Badge */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {item.allocation_status === 'NEEDS_ALLOCATION' && (
                                <span style={{ 
                                  background: 'rgba(245, 158, 11, 0.12)', 
                                  color: '#f59e0b', 
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '10px', 
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <AlertTriangle size={10} /> Needs Allocation
                                </span>
                              )}
                              {item.allocation_status === 'PARTIAL' && (
                                <span style={{ 
                                  background: 'rgba(59, 130, 246, 0.12)', 
                                  color: '#3b82f6', 
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '10px', 
                                  fontWeight: 700 
                                }}>
                                  ⏳ Partial ({item.allocated_qty}/{item.total_qty})
                                </span>
                              )}
                              {item.allocation_status === 'FULLY_ALLOCATED' && (
                                <span style={{ 
                                  background: 'rgba(16, 185, 129, 0.12)', 
                                  color: '#10b981', 
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  fontSize: '10px', 
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Check size={10} /> Fully Allocated
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td style={{ padding: '8px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {item.unallocated_qty > 0 ? (
                                <button
                                  onClick={() => handleOpenAllocModal(item)}
                                  className="btn btn-xs"
                                  style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                  }}
                                >
                                  <Sparkles size={11} /> Allocate
                                </button>
                              ) : (
                                <button
                                  onClick={() => setExpandedLineId(isExpanded ? null : item.id)}
                                  className="btn btn-xs btn-ghost"
                                  style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}
                                >
                                  View ({item.allocations?.length || 0})
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* EXPANDED ALLOCATION BREAKDOWN */}
                          {isExpanded && hasAllocations && (
                            <tr style={{ background: 'rgba(59, 130, 246, 0.02)', borderBottom: '1px solid var(--border)' }}>
                              <td colSpan={12} style={{ padding: '10px 20px 14px 44px' }}>
                                <div style={{ 
                                  background: 'var(--bg-primary)', 
                                  border: '1px solid var(--border)', 
                                  borderRadius: '8px', 
                                  padding: '10px 14px' 
                                }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={12} color="#3b82f6" />
                                    Active Order Allocations for {item.document_no} ({item.item_code}):
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {item.allocations.map((alloc) => (
                                      <div 
                                        key={alloc.id} 
                                        style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center', 
                                          background: 'var(--bg-secondary)', 
                                          padding: '6px 12px', 
                                          borderRadius: '6px',
                                          fontSize: '11px' 
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                                            {alloc.allocated_qty} {item.item_unit}
                                          </span>
                                          <span>→</span>
                                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {alloc.project_name || `Project #${alloc.project_id}`}
                                          </span>
                                          {alloc.order_id && (
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                              (Order #{alloc.order_id}{alloc.fitting_code ? ` • Fitting: ${alloc.fitting_code}` : ''})
                                            </span>
                                          )}
                                          {alloc.notes && (
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                              "{alloc.notes}"
                                            </span>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                            Allocated by {alloc.allocated_by_name || 'Staff'} {alloc.allocated_at ? `on ${new Date(alloc.allocated_at).toLocaleDateString('en-ZA')}` : ''}
                                          </span>
                                          <button
                                            onClick={() => handleUnallocate(alloc.id, item.document_no)}
                                            className="btn btn-xs"
                                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 6px', fontSize: '10px' }}
                                            title="Release allocation back to unallocated pool"
                                          >
                                            <Trash2 size={10} style={{ marginRight: '3px' }} /> Unallocate
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 16px', 
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              fontSize: '11.5px',
              color: 'var(--text-secondary)'
            }}>
              <div>
                Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} lines
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    fetchProcurementDocuments(prev, activeFilterTab, supplierFilter, searchQuery);
                  }}
                  disabled={page <= 1}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)' }}
                >
                  Previous
                </button>
                <span style={{ fontWeight: 600, padding: '0 6px' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    fetchProcurementDocuments(next, activeFilterTab, supplierFilter, searchQuery);
                  }}
                  disabled={page >= totalPages}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================ */
        /* LEGACY MANUAL DOCUMENT BUILDER (Preserved for compatibility) */
        /* ============================================================ */
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>Manual PO / GRN Document Archive</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-xs btn-primary" onClick={() => setShowPoModal(true)}>
                  <Plus size={12} /> New Manual PO
                </button>
                <button className="btn btn-xs btn-success" onClick={() => setShowGrnModal(true)}>
                  <Plus size={12} /> New Manual GRN
                </button>
              </div>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {allDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No manual documents created yet.</div>
              ) : (
                allDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{doc.id}</span> • {doc.projectName} ({doc.supplier})
                    </div>
                    <span className="badge b-info">{doc.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INTERACTIVE ALLOCATION MODAL                                 */}
      {/* ============================================================ */}
      {allocModalOpen && allocTargetItem && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(37,99,235,0.02) 100%)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  Allocate {allocTargetItem.doc_type} Line to Project Order
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Document: <strong>{allocTargetItem.document_no}</strong> • Supplier: <strong>{allocTargetItem.vendor_name}</strong>
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setAllocModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* SKU Info Card */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Selected SKU</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {allocTargetItem.item_code}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {allocTargetItem.item_description || 'No description'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Available to Allocate</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>
                        {allocTargetItem.unallocated_qty} <span style={{ fontSize: '10px' }}>{allocTargetItem.item_unit}</span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        Total: {allocTargetItem.total_qty}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Unit Cost (ERP)</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        R {allocTargetItem.unit_cost?.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) || '0.00'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Orders Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      🎯 Select Target Project Order:
                    </label>
                    {isLoadingCandidates && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={10} className="animate-spin" /> Finding matching orders...
                      </span>
                    )}
                  </div>

                  {candidateOrders.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {candidateOrders.map(cand => {
                        const isSelected = selectedCandidateKey === cand.order_item_id;
                        return (
                          <div
                            key={cand.order_item_id}
                            onClick={() => handleSelectCandidate(cand)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border)',
                              background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                                {cand.project_name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({cand.order_title})</span>
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                Fitting Code: <strong>{cand.fitting_code}</strong> • Area: {cand.area}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
                                Needs: {cand.remaining_needed} units
                              </div>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                Requested: {cand.requested_qty} • Ordered: {cand.po_qty_ordered}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '14px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: '8px', 
                      textAlign: 'center', 
                      fontSize: '11.5px', 
                      color: 'var(--text-secondary)' 
                    }}>
                      No exact active orders found requesting SKU <strong>{allocTargetItem.item_code}</strong>. You can manually assign it to any project below.
                    </div>
                  )}

                  {/* Manual Project Assignment Option */}
                  <div style={{ marginTop: '10px' }}>
                    <div 
                      onClick={() => setSelectedCandidateKey('MANUAL')}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '11.5px', 
                        fontWeight: 600, 
                        color: selectedCandidateKey === 'MANUAL' ? '#3b82f6' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        marginBottom: '6px'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="alloc_target" 
                        checked={selectedCandidateKey === 'MANUAL'} 
                        onChange={() => setSelectedCandidateKey('MANUAL')} 
                      />
                      <span>Or manually select any Project & Order</span>
                    </div>

                    {selectedCandidateKey === 'MANUAL' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: 600 }}>Project</label>
                          <select
                            className="form-control"
                            style={{ height: '32px', fontSize: '11.5px' }}
                            value={manualProjectId}
                            onChange={(e) => {
                              setManualProjectId(e.target.value);
                              setManualOrderId('');
                            }}
                          >
                            <option value="">-- Select Target Project --</option>
                            {Object.values(projects || {}).map(p => (
                              <option key={p.key || p.id} value={p.id || p.key}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-secondary)', marginBottom: '3px', fontWeight: 600 }}>Order (Optional)</label>
                          <select
                            className="form-control"
                            style={{ height: '32px', fontSize: '11.5px' }}
                            value={manualOrderId}
                            onChange={(e) => setManualOrderId(e.target.value)}
                            disabled={!manualProjectId}
                          >
                            <option value="">-- General Project Allocation --</option>
                            {(() => {
                              const proj = Object.values(projects || {}).find(p => String(p.id) === String(manualProjectId) || p.key === manualProjectId);
                              return (proj?.orders || []).map(o => (
                                <option key={o.id} value={o.id}>{o.quoteName || o.quote_name || `Order #${o.id}`}</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity & Notes Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 700 }}>
                      Quantity to Allocate
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        max={allocTargetItem.unallocated_qty || 1}
                        step="any"
                        className="form-control"
                        style={{ height: '34px', fontSize: '13px', fontWeight: 700 }}
                        value={allocQty}
                        onChange={(e) => setAllocQty(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        style={{ border: '1px solid var(--border)', fontSize: '10px', height: '34px' }}
                        onClick={() => setAllocQty(allocTargetItem.unallocated_qty || 1)}
                        title="Fill all remaining unallocated units"
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                      Internal Notes / Fitting Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Master Bedroom downlights, Phase 1 delivery..."
                      className="form-control"
                      style={{ height: '34px', fontSize: '11.5px' }}
                      value={allocNotes}
                      onChange={(e) => setAllocNotes(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '10px', 
                padding: '14px 20px', 
                borderTop: '1px solid var(--border)', 
                background: 'var(--bg-secondary)', 
                flexShrink: 0 
              }}>
                <button 
                  type="button" 
                  className="btn btn-sm btn-ghost" 
                  onClick={() => setAllocModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm btn-primary" 
                  disabled={isSavingAlloc}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  {isSavingAlloc ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
