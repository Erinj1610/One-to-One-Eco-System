import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Search, CheckCircle, Clock, AlertTriangle, 
  Layers, ArrowRight, RefreshCw, X, ChevronLeft, ChevronRight, CheckSquare, Square
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function InvoicesPage() {
  const { projects } = useStore();

  // Primary State
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'needs_allocation' | 'partially_allocated' | 'fully_allocated'
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // API Data State
  const [summaryData, setSummaryData] = useState(null);
  const [documentsData, setDocumentsData] = useState({ total_documents: 0, total_pages: 0, documents: [] });
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected Document & Detail Workspace
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState(new Set());

  // Single Item Allocation Modal
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocTargetItem, setAllocTargetItem] = useState(null);
  const [allocQty, setAllocQty] = useState(1);
  const [allocNotes, setAllocNotes] = useState('');
  const [candidateOrders, setCandidateOrders] = useState([]);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState('');
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // Batch Allocation Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProjectId, setBatchProjectId] = useState('');
  const [batchOrderId, setBatchOrderId] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [isSavingBatchAlloc, setIsSavingBatchAlloc] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. Fetch KPI Summary
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (e) {
      console.error("Failed to fetch invoicing summary:", e);
    }
  };

  // 2. Fetch Document List
  const fetchInvoicingDocuments = async (targetPage = 1, tab = activeFilterTab, cust = customerFilter, q = searchQuery) => {
    setIsLoadingDocs(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        page_size: String(pageSize),
        tab: tab,
      });
      if (cust && cust !== 'All') params.append('customer_filter', cust);
      if (q && q.trim()) params.append('search', q.trim());

      const res = await fetch(`${API_BASE}/api/invoicing/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocumentsData(data);
        setPage(data.page || 1);
      }
    } catch (e) {
      console.error("Failed to fetch invoicing documents:", e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // 3. Fetch Single Document Workspace Details
  const fetchSingleDocumentDetails = async (docNo) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/document/${encodeURIComponent(docNo)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocument(data);
        setSelectedLineIds(new Set());
      }
    } catch (e) {
      console.error("Failed to fetch document details:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 4. Trigger Live Read-Only Sync from Palladium
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✅ Invoices Synced: ${data.invoice_lines_synced} lines read in ${data.duration_seconds}s!`);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
      } else {
        alert(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchSummary();
    fetchInvoicingDocuments(1, activeFilterTab, customerFilter, searchQuery);
  }, []);

  // Filter tab change
  const handleTabChange = (tab) => {
    setActiveFilterTab(tab);
    setPage(1);
    fetchInvoicingDocuments(1, tab, customerFilter, searchQuery);
  };

  // Search debounce / submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoicingDocuments(1, activeFilterTab, customerFilter, searchQuery);
  };

  // Jump to page handler
  const handleJumpPage = (e) => {
    e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= (documentsData.total_pages || 1)) {
      setPage(target);
      fetchInvoicingDocuments(target, activeFilterTab, customerFilter, searchQuery);
      setJumpPageInput('');
    }
  };

  // Unique customers list for filtering
  const uniqueCustomers = useMemo(() => {
    const custs = new Set();
    (documentsData.documents || []).forEach(d => {
      if (d.customer_name) custs.add(d.customer_name);
    });
    return Array.from(custs).sort();
  }, [documentsData.documents]);

  // Open Single Allocation Modal
  const handleOpenSingleAllocModal = (item) => {
    const unalloc = Number(item.unallocated_qty || 0);
    setAllocTargetItem(item);
    setAllocQty(unalloc > 0 ? unalloc : 1);
    setAllocNotes('');

    // Find candidate project orders matching this item SKU or Document Reference
    const cleanSku = (item.item_code || '').trim().toUpperCase();
    const docRef = (selectedDocument?.reference || '').trim().toLowerCase();
    const candidates = [];

    Object.values(projects || {}).forEach(p => {
      const isRefMatch = docRef && p.name && (docRef.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(docRef));
      (p.orders || []).forEach(o => {
        (o.itemsList || []).forEach(it => {
          const itemCode = (it.code || '').trim().toUpperCase();
          const oneOneCode = (it.oneOneCode || '').trim().toUpperCase();
          if (itemCode === cleanSku || oneOneCode === cleanSku || (it.description && cleanSku && it.description.toUpperCase().includes(cleanSku)) || isRefMatch) {
            candidates.push({
              project_id: p.id || 1,
              project_name: p.name,
              project_key: p.key,
              order_id: o.id,
              order_po_number: o.id || o.po_number,
              order_item_id: it.id,
              fitting_code: it.code || it.oneOneCode || item.item_code,
              description: it.description || it.name,
              needed_qty: it.qty || it.quantity || 1,
              invoiced_qty: it.invoice_qty || 0,
              is_direct_sku_match: itemCode === cleanSku || oneOneCode === cleanSku
            });
          }
        });
      });
    });

    // Sort direct SKU matches first
    candidates.sort((a, b) => (b.is_direct_sku_match ? 1 : 0) - (a.is_direct_sku_match ? 1 : 0));

    setCandidateOrders(candidates);
    if (candidates.length > 0) {
      setSelectedCandidateKey(String(candidates[0].order_item_id));
      setManualProjectId(candidates[0].project_id || '');
      setManualOrderId(candidates[0].order_id || '');
    } else {
      setSelectedCandidateKey('MANUAL');
      setManualProjectId('');
      setManualOrderId('');
    }

    setAllocModalOpen(true);
  };

  // Submit Single Allocation
  const handleSubmitSingleAllocation = async (e) => {
    e.preventDefault();
    if (!allocTargetItem || !selectedDocument) return;

    let payload = {
      source_doc_no: selectedDocument.document_no,
      doc_date: selectedDocument.transaction_date,
      source_line_id: allocTargetItem.line_id,
      sku: allocTargetItem.item_code,
      allocated_qty: Number(allocQty),
      unit_cost: Number(allocTargetItem.unit_price_excl || 0),
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
      const res = await fetch(`${API_BASE}/api/invoicing/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Invoice allocated successfully!'}`);
        setAllocModalOpen(false);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
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

  // Open Batch Allocation Modal with Intelligent Destination Pre-selection
  const handleOpenBatchModal = () => {
    if (selectedLineIds.size === 0 || !selectedDocument) return;

    const selectedSkus = new Set(
      (selectedDocument.lines || [])
        .filter(l => selectedLineIds.has(l.line_id))
        .map(l => (l.item_code || '').trim().toUpperCase())
    );

    const docRef = (selectedDocument.reference || '').trim().toLowerCase();

    let bestProjId = '';
    let bestMatchCount = -1;

    Object.values(projects || {}).forEach(p => {
      let score = 0;
      if (docRef && p.name && (docRef.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(docRef))) {
        score += 10;
      }
      (p.orders || []).forEach(o => {
        (o.itemsList || []).forEach(it => {
          const code = (it.code || '').trim().toUpperCase();
          const oneOne = (it.oneOneCode || '').trim().toUpperCase();
          if (selectedSkus.has(code) || selectedSkus.has(oneOne)) {
            score += 2;
          }
        });
      });
      if (score > bestMatchCount) {
        bestMatchCount = score;
        bestProjId = p.id || p.key;
      }
    });

    setBatchProjectId(bestProjId || '');
    setBatchOrderId('');
    setBatchNotes('');
    setBatchModalOpen(true);
  };

  // Submit Batch Allocation
  const handleSubmitBatchAllocation = async (e) => {
    e.preventDefault();
    if (!selectedDocument || selectedLineIds.size === 0) return;

    if (!batchProjectId) {
      alert("Please select a destination Project.");
      return;
    }

    const proj = Object.values(projects || {}).find(p => String(p.id) === String(batchProjectId) || p.key === batchProjectId);
    const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.line_id) && (l.unallocated_qty || 0) > 0);

    if (selectedLines.length === 0) {
      alert("None of the selected items have unallocated quantities available.");
      return;
    }

    const payload = {
      source_doc_no: selectedDocument.document_no,
      doc_date: selectedDocument.transaction_date,
      project_id: proj ? (proj.id || 1) : 1,
      project_name: proj ? proj.name : 'Selected Project',
      order_id: batchOrderId ? Number(batchOrderId) : null,
      allocated_by_name: 'Staff',
      notes: batchNotes || `Batch allocated ${selectedLines.length} invoice items`,
      items: selectedLines.map(l => ({
        source_line_id: l.line_id,
        sku: l.item_code,
        allocated_qty: Number(l.unallocated_qty || 1),
        unit_cost: Number(l.unit_price_excl || 0),
        fitting_code: l.item_code
      }))
    };

    setIsSavingBatchAlloc(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/batch-allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Batch allocated successfully!'}`);
        setBatchModalOpen(false);
        setSelectedLineIds(new Set());
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery);
        fetchSingleDocumentDetails(selectedDocument.document_no);
      } else {
        alert(`Batch allocation notice: ${data.detail || 'Could not complete batch allocation.'}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setIsSavingBatchAlloc(false);
    }
  };

  // Unallocate Line Handler
  const handleUnallocate = async (allocationId, docNo) => {
    if (!window.confirm(`Release this invoice allocation from ${docNo}? The quantity will return to Unallocated.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocation_id: allocationId })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Allocation released.'}`);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not release allocation.'}`);
      }
    } catch (e) {
      alert(`Error releasing allocation: ${e.message}`);
    }
  };

  // Multi-Select Toggle Helpers
  const toggleSelectLine = (lineId) => {
    const next = new Set(selectedLineIds);
    if (next.has(lineId)) next.delete(lineId);
    else next.add(lineId);
    setSelectedLineIds(next);
  };

  const toggleSelectAllUnallocated = () => {
    if (!selectedDocument || !selectedDocument.lines) return;
    const unallocatedLines = selectedDocument.lines.filter(l => (l.unallocated_qty || 0) > 0);
    if (selectedLineIds.size >= unallocatedLines.length && unallocatedLines.length > 0) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(unallocatedLines.map(l => l.line_id)));
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-neutral-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            Client Invoicing & Allocations
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            100% Read-Only ERP Sync from Palladium <span className="font-semibold text-neutral-700 dark:text-neutral-300">biSalesAnalysis</span>. Allocate invoices directly to project orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-750 font-medium rounded-xl shadow-sm text-sm transition-all disabled:opacity-50"
            title="Read latest Sales Invoices and Credit Notes from Palladium ERP"
          >
            <RefreshCw className={`w-4 h-4 text-primary-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Reading Palladium...' : 'Sync from Palladium ERP'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Total Invoices</span>
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 block">
            {summaryData?.total_documents ?? '...'}
          </span>
          <span className="text-xs text-neutral-400 mt-0.5 block">{summaryData?.total_lines || 0} line items</span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Needs Allocation</span>
          <span className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1 block">
            {summaryData?.unallocated_count ?? '...'}
          </span>
          <span className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5 block">0% assigned</span>
        </div>

        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-sm">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Partially Allocated</span>
          <span className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1 block">
            {summaryData?.partially_allocated_count ?? '...'}
          </span>
          <span className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5 block">In-progress</span>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Fully Allocated</span>
          <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-1 block">
            {summaryData?.fully_allocated_count ?? '...'}
          </span>
          <span className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5 block">100% assigned</span>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Total Invoiced (Excl)</span>
          <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-1.5 block truncate" title={`R ${Number(summaryData?.total_invoiced_value || 0).toLocaleString()}`}>
            R {Number(summaryData?.total_invoiced_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-neutral-400 mt-0.5 block">ZAR Invoiced</span>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-xl overflow-x-auto text-sm font-medium">
            <button
              onClick={() => handleTabChange('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'all'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              All Invoices
            </button>
            <button
              onClick={() => handleTabChange('needs_allocation')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'needs_allocation'
                  ? 'bg-amber-500 text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-amber-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Allocation</span>
            </button>
            <button
              onClick={() => handleTabChange('partially_allocated')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'partially_allocated'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-blue-600'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Partially Allocated</span>
            </button>
            <button
              onClick={() => handleTabChange('fully_allocated')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeFilterTab === 'fully_allocated'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-emerald-600'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fully Allocated</span>
            </button>
          </div>

          {/* Search & Customer Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
                fetchInvoicingDocuments(1, activeFilterTab, e.target.value, searchQuery);
              }}
              className="text-sm px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="All">All Clients</option>
              {uniqueCustomers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice #, Client, Ref, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-10 pr-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </form>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto border border-neutral-200/80 dark:border-neutral-700/80 rounded-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <th className="py-3 px-4">Document #</th>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Project Reference</th>
                <th className="py-3 px-4 text-right">Items Count</th>
                <th className="py-3 px-4 text-right">Total Excl</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-700/60 bg-white dark:bg-neutral-800">
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading Palladium Invoices...
                  </td>
                </tr>
              ) : (documentsData.documents || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No invoice documents match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                (documentsData.documents || []).map((doc) => {
                  const isCreditNote = doc.doc_type === 'CREDIT_NOTE';
                  return (
                    <tr
                      key={doc.document_no}
                      onClick={() => fetchSingleDocumentDetails(doc.document_no)}
                      className="hover:bg-primary-50/40 dark:hover:bg-primary-950/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span className="group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {doc.document_no}
                        </span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isCreditNote
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}>
                          {isCreditNote ? 'Credit Note' : 'Tax Invoice'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                        {doc.transaction_date ? doc.transaction_date.split('T')[0] : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-800 dark:text-neutral-200 font-medium">
                        {doc.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 max-w-[220px] truncate" title={doc.reference || ''}>
                        {doc.reference || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-neutral-700 dark:text-neutral-300">
                        {doc.lines_count} lines
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                        R {Number(doc.total_value_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          doc.allocation_status === 'Fully Allocated'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : doc.allocation_status === 'Partially Allocated'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {doc.allocation_status === 'Fully Allocated' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {doc.allocation_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchSingleDocumentDetails(doc.document_no);
                          }}
                          className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-500 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-lg transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Jump Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-sm text-neutral-600 dark:text-neutral-400">
          <div>
            Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100">{documentsData.documents?.length || 0}</span> of{' '}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{documentsData.total_documents || 0}</span> documents
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const prev = Math.max(1, page - 1);
                setPage(prev);
                fetchInvoicingDocuments(prev, activeFilterTab, customerFilter, searchQuery);
              }}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-medium px-2">
              Page {page} of {documentsData.total_pages || 1}
            </span>

            <button
              onClick={() => {
                const next = Math.min(documentsData.total_pages || 1, page + 1);
                setPage(next);
                fetchInvoicingDocuments(next, activeFilterTab, customerFilter, searchQuery);
              }}
              disabled={page >= (documentsData.total_pages || 1)}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Jump to page */}
            <form onSubmit={handleJumpPage} className="flex items-center gap-1 ml-3">
              <span className="text-xs">Go to:</span>
              <input
                type="number"
                min="1"
                max={documentsData.total_pages || 1}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder="#"
                className="w-14 px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-xs font-medium rounded-lg"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT WORKSPACE DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white dark:bg-neutral-850 h-full shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-700 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/60 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedDocument.document_no}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
                    {selectedDocument.doc_type === 'CREDIT_NOTE' ? 'Credit Note' : 'Tax Invoice'}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Date: {selectedDocument.transaction_date ? selectedDocument.transaction_date.split('T')[0] : '—'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-200">Client: </span>
                    {selectedDocument.customer_name}
                  </div>
                  {selectedDocument.reference && (
                    <div>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-200">Ref: </span>
                      {selectedDocument.reference}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-200">Total (Excl): </span>
                    R {Number(selectedDocument.total_value_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Action Toolbar */}
            <div className="px-6 py-3 bg-neutral-100/70 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAllUnallocated}
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-primary-600 transition-colors"
                >
                  {selectedLineIds.size > 0 && selectedLineIds.size === (selectedDocument.lines || []).filter(l => (l.unallocated_qty || 0) > 0).length ? (
                    <CheckSquare className="w-4 h-4 text-primary-600" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-400" />
                  )}
                  <span>Select All Unallocated</span>
                </button>
                {selectedLineIds.size > 0 && (
                  <span className="text-xs bg-primary-100 text-primary-800 dark:bg-primary-950/80 dark:text-primary-300 px-2.5 py-0.5 rounded-full font-bold">
                    {selectedLineIds.size} selected
                  </span>
                )}
              </div>

              {selectedLineIds.size > 0 && (
                <button
                  onClick={handleOpenBatchModal}
                  className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Allocate Selected Items ({selectedLineIds.size})</span>
                </button>
              )}
            </div>

            {/* Line Items Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3">SKU / Item Code</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Invoiced Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price (Excl)</th>
                    <th className="py-2.5 px-3 text-right">Line Total (Excl)</th>
                    <th className="py-2.5 px-3 text-center">Allocated</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {(selectedDocument.lines || []).map((line) => {
                    const isSelected = selectedLineIds.has(line.line_id);
                    const canAllocate = (line.unallocated_qty || 0) > 0;
                    return (
                      <tr
                        key={line.line_id}
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                          isSelected ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          {canAllocate ? (
                            <button
                              onClick={() => toggleSelectLine(line.line_id)}
                              className="text-neutral-400 hover:text-primary-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500 opacity-60" />
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-neutral-100">
                          {line.item_code}
                        </td>
                        <td className="py-3 px-3 text-neutral-600 dark:text-neutral-400 max-w-[200px] truncate" title={line.item_description || ''}>
                          {line.item_description || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-neutral-800 dark:text-neutral-200">
                          {line.invoiced_qty} {line.item_unit}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-700 dark:text-neutral-300">
                          R {Number(line.unit_price_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          R {Number(line.line_total_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="text-xs">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{line.allocated_qty}</span>
                            <span className="text-neutral-400"> / {line.invoiced_qty}</span>
                          </div>
                          {/* Active Allocation Pills */}
                          {(line.allocations || []).length > 0 && (
                            <div className="mt-1 space-y-1">
                              {line.allocations.map(a => (
                                <div key={a.id} className="inline-flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-750 text-[11px] px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-600">
                                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[100px]" title={a.project_name}>
                                    {a.project_name} ({a.allocated_qty})
                                  </span>
                                  <button
                                    onClick={() => handleUnallocate(a.id, selectedDocument.document_no)}
                                    className="text-neutral-400 hover:text-rose-600"
                                    title="Unallocate"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            line.status === 'Fully Allocated'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : line.status === 'Partially Allocated'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {line.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {canAllocate && (
                            <button
                              onClick={() => handleOpenSingleAllocModal(line)}
                              className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
                            >
                              Allocate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE ALLOCATION MODAL */}
      {/* ========================================================================= */}
      {allocModalOpen && allocTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-850 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-700 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Allocate Invoice Item
                </h3>
                <p className="text-xs text-neutral-500">
                  From {selectedDocument?.document_no} ({allocTargetItem.item_code})
                </p>
              </div>
              <button onClick={() => setAllocModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSingleAllocation} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                    Allocation Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={allocTargetItem.unallocated_qty || 9999}
                    value={allocQty}
                    onChange={(e) => setAllocQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 font-semibold text-neutral-900 dark:text-neutral-100"
                    required
                  />
                  <span className="text-[11px] text-neutral-400">
                    Max available: {allocTargetItem.unallocated_qty}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                    Unit Price (Excl)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`R ${Number(allocTargetItem.unit_price_excl || 0).toLocaleString()}`}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-500 font-medium"
                  />
                </div>
              </div>

              {/* Destination Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                  Destination Match
                </label>
                {candidateOrders.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {candidateOrders.map(cand => (
                      <label
                        key={cand.order_item_id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedCandidateKey === String(cand.order_item_id)
                            ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="candidate"
                          checked={selectedCandidateKey === String(cand.order_item_id)}
                          onChange={() => {
                            setSelectedCandidateKey(String(cand.order_item_id));
                            setManualProjectId(cand.project_id);
                            setManualOrderId(cand.order_id);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 text-xs">
                          <div className="font-bold text-neutral-900 dark:text-neutral-100">
                            {cand.project_name} — Order #{cand.order_po_number}
                          </div>
                          <div className="text-neutral-500 mt-0.5">
                            Fitting: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{cand.fitting_code}</span> ({cand.description})
                          </div>
                        </div>
                      </label>
                    ))}

                    <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                      selectedCandidateKey === 'MANUAL'
                        ? 'border-primary-500 bg-primary-50/30'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}>
                      <input
                        type="radio"
                        name="candidate"
                        checked={selectedCandidateKey === 'MANUAL'}
                        onChange={() => setSelectedCandidateKey('MANUAL')}
                      />
                      <span>Select different project manually...</span>
                    </label>
                  </div>
                ) : null}

                {/* Manual Project Picker Fallback */}
                {selectedCandidateKey === 'MANUAL' && (
                  <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Target Project</label>
                      <select
                        value={manualProjectId}
                        onChange={(e) => {
                          setManualProjectId(e.target.value);
                          setManualOrderId('');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium"
                        required
                      >
                        <option value="">Select Project...</option>
                        {Object.values(projects || {}).map(p => (
                          <option key={p.id || p.key} value={p.id || p.key}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {manualProjectId && (
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">Target Order</label>
                        <select
                          value={manualOrderId}
                          onChange={(e) => setManualOrderId(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium"
                        >
                          <option value="">Auto-assign or General Order</option>
                          {(() => {
                            const p = Object.values(projects || {}).find(proj => String(proj.id) === String(manualProjectId) || proj.key === manualProjectId);
                            return (p?.orders || []).map(o => (
                              <option key={o.id} value={o.id}>{o.id || o.po_number} ({o.supplier || 'Order'})</option>
                            ));
                          })()}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoiced as per deposit invoice"
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setAllocModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlloc}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSavingAlloc ? 'Allocating...' : 'Confirm Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH ALLOCATION MODAL */}
      {/* ========================================================================= */}
      {batchModalOpen && selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-850 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-700 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3.5">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-600" />
                  Batch Allocate {selectedLineIds.size} Items
                </h3>
                <p className="text-xs text-neutral-500">
                  From {selectedDocument.document_no} ({selectedDocument.customer_name})
                </p>
              </div>
              <button onClick={() => setBatchModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBatchAllocation} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                  Destination Project
                </label>
                <select
                  value={batchProjectId}
                  onChange={(e) => {
                    setBatchProjectId(e.target.value);
                    setBatchOrderId('');
                  }}
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 font-semibold text-neutral-900 dark:text-neutral-100"
                  required
                >
                  <option value="">Select Project...</option>
                  {Object.values(projects || {}).map(p => (
                    <option key={p.id || p.key} value={p.id || p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {batchProjectId && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                    Destination Order (Optional)
                  </label>
                  <select
                    value={batchOrderId}
                    onChange={(e) => setBatchOrderId(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium"
                  >
                    <option value="">Auto-match items or General Spec Order</option>
                    {(() => {
                      const p = Object.values(projects || {}).find(proj => String(proj.id) === String(batchProjectId) || proj.key === batchProjectId);
                      return (p?.orders || []).map(o => (
                        <option key={o.id} value={o.id}>{o.id || o.po_number} ({o.supplier || 'Order'})</option>
                      ));
                    })()}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
                  Staff Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoiced as per final invoice from Palladium"
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 font-medium hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBatchAlloc}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSavingBatchAlloc ? 'Allocating...' : `Allocate ${selectedLineIds.size} Items`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
