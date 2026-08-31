import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  FileText, Search, RefreshCw, AlertTriangle, Check, Layers, ExternalLink, Filter, 
  ArrowLeft, ArrowRight, ShieldCheck, ChevronDown, ChevronRight, X, Sparkles, Box, 
  CheckCircle2, Clock, Trash2, Package, CheckSquare, Square, DollarSign, Receipt
} from 'lucide-react';

export default function InvoicesPage() {
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
  // PALLADIUM INVOICING STATE
  // -------------------------------------------------------------
  const [invoicingSummary, setInvoicingSummary] = useState({
    unallocated_count: 0,
    partially_allocated_count: 0,
    fully_allocated_count: 0,
    total_documents: 0,
    total_lines: 0,
    total_invoiced_value: 0.0
  });

  // Selected Document for Deep Workspace View (null = show all documents list)
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoadingDocumentDetails, setIsLoadingDocumentDetails] = useState(false);

  // Multi-selection checkboxes in Document Workspace
  const [selectedLineIds, setSelectedLineIds] = useState(new Set());

  const [invoicingDocs, setInvoicingDocs] = useState([]);
  const [isLoadingInvoicing, setIsLoadingInvoicing] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('NEEDS_ALLOCATION'); // 'NEEDS_ALLOCATION' | 'PARTIAL' | 'FULLY_ALLOCATED' | 'IN' | 'CN' | 'ALL'
  const [customerFilter, setCustomerFilter] = useState('All Clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [expandedLineId, setExpandedLineId] = useState(null);
  const [isSyncingPalladium, setIsSyncingPalladium] = useState(false);

  // Single Allocation Modal State
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocTargetItem, setAllocTargetItem] = useState(null);
  const [candidateOrders, setCandidateOrders] = useState([]);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(null);
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [allocQty, setAllocQty] = useState(1);
  const [allocNotes, setAllocNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // Batch Allocation Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProjectId, setBatchProjectId] = useState('');
  const [batchOrderId, setBatchOrderId] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [isSavingBatchAlloc, setIsSavingBatchAlloc] = useState(false);

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
      const res = await fetch(`${API_BASE}/api/invoicing/summary`);
      if (res.ok) {
        const data = await res.json();
        setInvoicingSummary(data);
      }
    } catch (_) {}
  };

  const fetchInvoicingDocuments = async (
    newPage = page, 
    newTab = activeFilterTab, 
    newCustomer = customerFilter, 
    newQ = searchQuery,
    newLimit = limit
  ) => {
    setIsLoadingInvoicing(true);
    try {
      let tabParam = 'all';
      if (newTab === 'NEEDS_ALLOCATION') tabParam = 'needs_allocation';
      else if (newTab === 'PARTIAL') tabParam = 'partially_allocated';
      else if (newTab === 'FULLY_ALLOCATED') tabParam = 'fully_allocated';
      else if (newTab === 'ISSUES') tabParam = 'issues';

      const params = new URLSearchParams({
        tab: tabParam,
        page: newPage.toString(),
        page_size: newLimit.toString()
      });

      if (newCustomer && newCustomer !== 'All Clients') {
        params.append('customer_filter', newCustomer);
      }
      if (newQ && newQ.trim()) {
        params.append('search', newQ.trim());
      }

      const res = await fetch(`${API_BASE}/api/invoicing/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let items = data.documents || [];
        if (newTab === 'IN') {
          items = items.filter(d => d.doc_type === 'INVOICE');
        } else if (newTab === 'CN') {
          items = items.filter(d => d.doc_type === 'CREDIT_NOTE');
        }
        setInvoicingDocs(items);
        setTotalCount(data.total_documents || 0);
        setTotalPages(data.total_pages || 1);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error('Failed to fetch invoicing documents:', err);
    } finally {
      setIsLoadingInvoicing(false);
    }
  };

  // Fetch full details of an individual document when opened
  const fetchSingleDocumentDetails = async (docNo) => {
    setIsLoadingDocumentDetails(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/document/${encodeURIComponent(docNo)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocument(data);
        setSelectedLineIds(new Set());
      }
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
    } finally {
      setIsLoadingDocumentDetails(false);
    }
  };

  // -------------------------------------------------------------
  // SYNC FROM PALLADIUM
  // -------------------------------------------------------------
  const handleTriggerSync = async () => {
    setIsSyncingPalladium(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/sync`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        triggerToast(`🎉 Sync complete: ${data.invoice_lines_synced} invoice lines read in ${data.duration_seconds}s!`);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
      } else {
        alert('Sync notice: Could not complete synchronization.');
      }
    } catch (e) {
      alert(`Sync error: ${e.message}`);
    } finally {
      setIsSyncingPalladium(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Debounced Search & Tab Change Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoicingDocuments(1, activeFilterTab, customerFilter, searchQuery, limit);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeFilterTab, customerFilter, searchQuery]);

  // Filter change handlers
  const handleTabChange = (newTab) => {
    setActiveFilterTab(newTab);
    setPage(1);
  };

  const handleCustomerChange = (newCust) => {
    setCustomerFilter(newCust);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoicingDocuments(1, activeFilterTab, customerFilter, searchQuery, limit);
  };

  // Distinct clients list for filtering
  const uniqueCustomers = useMemo(() => {
    const custs = new Set();
    invoicingDocs.forEach(d => {
      if (d.customer_name) custs.add(d.customer_name);
    });
    return Array.from(custs).sort();
  }, [invoicingDocs]);

  // -------------------------------------------------------------
  // ALLOCATION ACTIONS
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // ALLOCATION ACTIONS
  // -------------------------------------------------------------
  const handleOpenAllocModal = async (line) => {
    const unalloc = Number(line.unallocated_qty || 0);
    setAllocTargetItem(line);
    setAllocQty(unalloc > 0 ? unalloc : 1);
    setAllocNotes('');

    const cleanSku = (line.item_code || '').trim().toUpperCase();
    const docRef = (selectedDocument?.reference || '').trim().toLowerCase();
    const custName = (selectedDocument?.customer_name || '').trim().toLowerCase();

    // 1. First try fetching live candidates from backend API
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/candidate-orders?sku=${encodeURIComponent(line.item_code)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.candidates && data.candidates.length > 0) {
          const backendCandidates = data.candidates.map(cand => ({
            ...cand,
            is_direct_sku_match: cand.is_direct_sku_match !== false
          }));
          setCandidateOrders(backendCandidates);
          setSelectedCandidateKey(String(backendCandidates[0].order_item_id));
          setManualProjectId(backendCandidates[0].project_key || backendCandidates[0].project_id || '');
          setManualOrderId(backendCandidates[0].order_id || '');
          setAllocModalOpen(true);
          return;
        }
      }
    } catch (_) {}

    // 2. Fallback: Client-side candidate matcher
    const candidates = [];
    Object.values(projects || {}).forEach(p => {
      const pName = (p.name || '').toLowerCase();
      const pKey = (p.key || '').toLowerCase();
      let projMatchScore = 0;
      if (docRef && (pName.includes(docRef) || docRef.includes(pName) || pKey.includes(docRef) || docRef.includes(pKey))) {
        projMatchScore += 50;
      }
      if (custName && (pName.includes(custName) || custName.includes(pName))) {
        projMatchScore += 30;
      }

      (p.orders || []).forEach(o => {
        (o.itemsList || []).forEach(it => {
          const itemCode = (it.code || '').trim().toUpperCase();
          const oneOneCode = (it.oneOneCode || '').trim().toUpperCase();
          const isDirectSkuMatch = itemCode === cleanSku || oneOneCode === cleanSku;
          const isDescMatch = it.description && cleanSku && it.description.toUpperCase().includes(cleanSku);

          if (isDirectSkuMatch || isDescMatch || projMatchScore > 0) {
            let itemScore = projMatchScore;
            if (isDirectSkuMatch) itemScore += 100;
            else if (isDescMatch) itemScore += 20;

            candidates.push({
              project_id: p.id || null,
              project_name: p.name,
              project_key: p.key || pKey,
              order_id: o.dbId || o.id,
              order_po_number: o.poNumber || o.id,
              order_item_id: it.id,
              fitting_code: it.code || it.oneOneCode || line.item_code,
              description: it.description || it.name,
              needed_qty: it.qty || it.quantity || 1,
              invoiced_qty: it.invoice_qty || 0,
              is_direct_sku_match: isDirectSkuMatch,
              match_score: itemScore
            });
          }
        });
      });
    });

    candidates.sort((a, b) => b.match_score - a.match_score);
    setCandidateOrders(candidates);

    if (candidates.length > 0) {
      setSelectedCandidateKey(String(candidates[0].order_item_id));
      setManualProjectId(candidates[0].project_key || candidates[0].project_id || '');
      setManualOrderId(candidates[0].order_id || '');
    } else {
      setSelectedCandidateKey('MANUAL');
      setManualProjectId('');
      setManualOrderId('');
    }

    setAllocModalOpen(true);
  };

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
        payload.project_id = cand.project_id || null;
        payload.project_key = cand.project_key || null;
        payload.project_name = cand.project_name;
        payload.order_id = cand.order_id || null;
        payload.order_item_id = cand.order_item_id;
        payload.fitting_code = cand.fitting_code;
      }
    } else {
      if (!manualProjectId) {
        alert("Please select a target Project to allocate to.");
        return;
      }
      const proj = Object.values(projects || {}).find(p => (p.key && p.key === manualProjectId) || (p.id && String(p.id) === String(manualProjectId)) || p.name === manualProjectId);
      payload.project_id = proj?.id || null;
      payload.project_key = proj?.key || manualProjectId;
      payload.project_name = proj?.name || manualProjectId;
      payload.order_id = manualOrderId || null;
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
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
        if (refreshProjects) refreshProjects();
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
        bestProjId = p.key || p.id;
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

    const proj = Object.values(projects || {}).find(p => (p.key && p.key === batchProjectId) || (p.id && String(p.id) === String(batchProjectId)) || p.name === batchProjectId);
    const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.line_id) && (l.unallocated_qty || 0) > 0);

    if (selectedLines.length === 0) {
      alert("None of the selected items have unallocated quantities available.");
      return;
    }

    const payload = {
      source_doc_no: selectedDocument.document_no,
      doc_date: selectedDocument.transaction_date,
      project_id: proj?.id || null,
      project_key: proj?.key || batchProjectId,
      project_name: proj?.name || batchProjectId,
      order_id: batchOrderId || null,
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
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        fetchSingleDocumentDetails(selectedDocument.document_no);
        if (refreshProjects) refreshProjects();
      } else {
        alert(`Batch allocation notice: ${data.detail || 'Could not complete batch allocation.'}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setIsSavingBatchAlloc(false);
    }
  };

  // Unallocate Single Allocation Handler
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
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
        if (refreshProjects) refreshProjects();
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not release allocation.'}`);
      }
    } catch (e) {
      alert(`Error releasing allocation: ${e.message}`);
    }
  };

  // Unallocate Entire Line (All allocations for a specific line item)
  const handleUnallocateLine = async (line, docNo) => {
    const allocIds = (line.allocations || []).map(a => a.id).filter(Boolean);
    if (!window.confirm(`Unallocate ${line.item_code} from ${docNo}? All allocated quantities for this item will return to unallocated.`)) {
      return;
    }
    try {
      const payload = allocIds.length > 0
        ? { allocation_ids: allocIds }
        : { document_no: docNo, skus: [line.item_code] };

      const res = await fetch(`${API_BASE}/api/invoicing/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Item unallocated.'}`);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.document_no);
        }
        if (refreshProjects) refreshProjects();
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not unallocate line.'}`);
      }
    } catch (e) {
      alert(`Error releasing allocation: ${e.message}`);
    }
  };

  // Bulk Unallocate Multiple Selected Lines
  const handleBulkUnallocateSelected = async () => {
    if (!selectedDocument || selectedLineIds.size === 0) return;

    const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.line_id));
    const allocIdsToCancel = [];
    const skusToCancel = [];

    selectedLines.forEach(l => {
      if (l.allocations && l.allocations.length > 0) {
        l.allocations.forEach(a => {
          if (a.id) allocIdsToCancel.push(a.id);
        });
      } else if (l.allocated_qty > 0) {
        skusToCancel.push(l.item_code);
      }
    });

    if (allocIdsToCancel.length === 0 && skusToCancel.length === 0) {
      alert("None of the selected items have active allocations to release.");
      return;
    }

    if (!window.confirm(`Are you sure you want to unallocate all active allocations for the ${selectedLines.length} selected item(s)?`)) {
      return;
    }

    try {
      const payload = allocIdsToCancel.length > 0
        ? { allocation_ids: allocIdsToCancel }
        : { document_no: selectedDocument.document_no, skus: skusToCancel };

      const res = await fetch(`${API_BASE}/api/invoicing/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Selected items unallocated.'}`);
        setSelectedLineIds(new Set());
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        fetchSingleDocumentDetails(selectedDocument.document_no);
        if (refreshProjects) refreshProjects();
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not unallocate items.'}`);
      }
    } catch (e) {
      alert(`Error releasing allocations: ${e.message}`);
    }
  };

  // Bulk Unallocate Entire Document
  const handleUnallocateEntireDocument = async (docNo) => {
    if (!docNo) return;
    if (!window.confirm(`Are you sure you want to unallocate ALL items from invoice ${docNo}? Every item in this document will return to unallocated.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_no: docNo })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Entire document unallocated.'}`);
        setSelectedLineIds(new Set());
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        fetchSingleDocumentDetails(docNo);
        if (refreshProjects) refreshProjects();
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not unallocate document.'}`);
      }
    } catch (e) {
      alert(`Error in bulk unallocation: ${e.message}`);
    }
  };

  const handleOpenIssueModal = (docOrLine) => {
    setIssueTargetItem(docOrLine);
    setIssueReason(docOrLine.issue_reason || 'Order Not Found');
    setIssueNotes(docOrLine.issue_notes || '');
    setIssueModalOpen(true);
  };

  const handleSubmitIssue = async (e) => {
    if (e) e.preventDefault();
    if (!issueTargetItem) return;

    setIsSavingIssue(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/flag-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_no: issueTargetItem.document_no,
          line_id: issueTargetItem.line_id || null,
          sku: issueTargetItem.item_code || issueTargetItem.sku || null,
          reason: issueReason,
          notes: issueNotes,
          flagged_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`⚠️ Invoice ${issueTargetItem.document_no} flagged as "${issueReason}"`);
        setIssueModalOpen(false);
        if (allocModalOpen) setAllocModalOpen(false);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) fetchSingleDocumentDetails(selectedDocument.document_no);
      } else {
        alert(data.detail || 'Could not flag issue.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSavingIssue(false);
    }
  };

  const handleResolveIssue = async (docOrLine) => {
    if (!docOrLine) return;
    try {
      const res = await fetch(`${API_BASE}/api/invoicing/resolve-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_no: docOrLine.document_no,
          resolved_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✅ Issue on invoice ${docOrLine.document_no} resolved!`);
        fetchSummary();
        fetchInvoicingDocuments(page, activeFilterTab, customerFilter, searchQuery, limit);
        if (selectedDocument) fetchSingleDocumentDetails(selectedDocument.document_no);
      } else {
        alert(data.detail || 'Could not resolve issue.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Multi-select helpers
  const handleToggleSelectLine = (lineId) => {
    const next = new Set(selectedLineIds);
    if (next.has(lineId)) next.delete(lineId);
    else next.add(lineId);
    setSelectedLineIds(next);
  };

  const handleSelectAllLines = () => {
    if (!selectedDocument || !selectedDocument.lines) return;
    if (selectedLineIds.size === selectedDocument.lines.length) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(selectedDocument.lines.map(l => l.line_id)));
    }
  };

  const handleSelectAllUnallocated = () => {
    if (!selectedDocument || !selectedDocument.lines) return;
    const unallocated = selectedDocument.lines.filter(l => (l.unallocated_qty || 0) > 0);
    if (selectedLineIds.size >= unallocated.length && unallocated.length > 0) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(unallocated.map(l => l.line_id)));
    }
  };

  const unallocatedLinesInDoc = useMemo(() => {
    if (!selectedDocument || !selectedDocument.lines) return [];
    return selectedDocument.lines.filter(l => (l.unallocated_qty || 0) > 0);
  }, [selectedDocument]);

  const allocatedLinesInDoc = useMemo(() => {
    if (!selectedDocument || !selectedDocument.lines) return [];
    return selectedDocument.lines.filter(l => (l.allocated_qty || 0) > 0);
  }, [selectedDocument]);

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
              {getModuleName('invoicing', 'Client Invoicing & Allocations')} Suite
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Read-Only Feed from Palladium ERP</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={22} style={{ color: '#3b82f6' }} />
            {selectedDocument ? (
              <span>
                Document Workspace: <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{selectedDocument.document_no}</span>
              </span>
            ) : (
              'Client Invoicing & Order Allocation Hub'
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
              <ArrowLeft size={14} /> Back to All Documents
            </button>
          )}

          <button
            onClick={handleTriggerSync}
            disabled={isSyncingPalladium}
            className="btn btn-sm"
            title="Read live Sales Invoices & Credit Notes from Palladium ERP"
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

      {/* TOP 4 KPI CARDS (Always visible on Document list) */}
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
              {invoicingSummary.unallocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Invoices awaiting project order matching
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
              {invoicingSummary.partially_allocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Invoices with split or in-progress line items
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
              {invoicingSummary.fully_allocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
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
                📄 Total ERP Invoices
              </span>
              <FileText size={14} color="var(--text-tertiary)" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.1 }}>
              {invoicingSummary.total_documents.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Totaling R {Number(invoicingSummary.total_invoiced_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW A: INDIVIDUAL DOCUMENT WORKSPACE (Opened Document View) */}
      {/* ============================================================ */}
      {selectedDocument ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          
          {/* Document Header Card */}
          <div className="card" style={{ padding: '16px 20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ 
                    padding: '3px 8px', 
                    borderRadius: '6px', 
                    fontSize: '11px', 
                    fontWeight: 700,
                    background: selectedDocument.doc_type === 'CREDIT_NOTE' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                    color: selectedDocument.doc_type === 'CREDIT_NOTE' ? '#ef4444' : '#3b82f6',
                    border: `1px solid ${selectedDocument.doc_type === 'CREDIT_NOTE' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}>
                    {selectedDocument.doc_type === 'CREDIT_NOTE' ? 'Credit Note' : 'Tax Invoice'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {selectedDocument.document_no}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <div>Client: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.customer_name}</strong></div>
                  <div>Date: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.transaction_date ? new Date(selectedDocument.transaction_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong></div>
                  {selectedDocument.reference && (
                    <div>Project Ref: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.reference}</strong></div>
                  )}
                  <div>Total (Excl): <strong style={{ color: 'var(--text-primary)' }}>R {Number(selectedDocument.total_value_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                </div>
              </div>

              {/* Document Allocation Progress */}
              <div style={{ textAlign: 'right', minWidth: '240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Allocation Progress:</span>
                  <strong style={{ color: selectedDocument.unallocated_qty === 0 ? '#10b981' : (selectedDocument.allocated_qty > 0 ? '#3b82f6' : '#f59e0b') }}>
                    {selectedDocument.allocated_qty} / {selectedDocument.total_qty} units allocated
                  </strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${selectedDocument.total_qty > 0 ? (selectedDocument.allocated_qty / selectedDocument.total_qty) * 100 : 0}%`,
                    background: selectedDocument.unallocated_qty === 0 ? '#10b981' : '#3b82f6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {selectedDocument.allocated_qty > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => handleUnallocateEntireDocument(selectedDocument.document_no)}
                      className="btn btn-xs"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '3px 9px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Release all allocations in this document back to unallocated pool"
                    >
                      <Trash2 size={11} /> Unallocate Entire Document
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BATCH ALLOCATION & UNALLOCATION ACTION BAR (When items are selected) */}
          {selectedLineIds.size > 0 && (() => {
            const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.line_id));
            const unallocCount = selectedLines.filter(l => (l.unallocated_qty || 0) > 0).length;
            const allocCount = selectedLines.filter(l => (l.allocated_qty || 0) > 0).length;

            return (
              <div style={{ 
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                border: '1.5px solid #3b82f6', 
                borderRadius: '10px', 
                padding: '12px 18px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                color: '#fff',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#3b82f6', color: '#fff', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                    {selectedLineIds.size} items selected
                  </span>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    {unallocCount > 0 && allocCount > 0 
                      ? `${unallocCount} unallocated, ${allocCount} allocated items`
                      : (unallocCount > 0 ? `${unallocCount} unallocated item(s) ready to assign` : `${allocCount} allocated item(s) ready to release`)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedLineIds(new Set())}
                    className="btn btn-xs btn-ghost"
                    style={{ color: '#94a3b8', fontSize: '11.5px' }}
                  >
                    Clear Selection
                  </button>

                  {allocCount > 0 && (
                    <button
                      onClick={handleBulkUnallocateSelected}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Unallocate all active allocations for the selected items"
                    >
                      <Trash2 size={13} /> Bulk Unallocate Selected ({allocCount})
                    </button>
                  )}

                  {unallocCount > 0 && (
                    <button
                      onClick={handleOpenBatchModal}
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)'
                      }}
                    >
                      <Sparkles size={14} /> Allocate Selected ({unallocCount})
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Document Line Items Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  Line Items in {selectedDocument.document_no} ({selectedDocument.lines?.length || 0} items)
                </span>
                
                <button
                  onClick={handleSelectAllLines}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', fontSize: '10.5px', padding: '2px 8px' }}
                >
                  {selectedLineIds.size === (selectedDocument.lines?.length || 0) ? 'Deselect All' : `Select All (${selectedDocument.lines?.length || 0})`}
                </button>

                {unallocatedLinesInDoc.length > 0 && (
                  <button
                    onClick={handleSelectAllUnallocated}
                    className="btn btn-xs btn-ghost"
                    style={{ border: '1px solid rgba(245, 158, 11, 0.4)', color: '#f59e0b', fontSize: '10.5px', padding: '2px 8px' }}
                  >
                    Select Unallocated ({unallocatedLinesInDoc.length})
                  </button>
                )}

                {allocatedLinesInDoc.length > 0 && (
                  <button
                    onClick={() => setSelectedLineIds(new Set(allocatedLinesInDoc.map(l => l.line_id)))}
                    className="btn btn-xs btn-ghost"
                    style={{ border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', fontSize: '10.5px', padding: '2px 8px' }}
                  >
                    Select Allocated ({allocatedLinesInDoc.length})
                  </button>
                )}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Tip: Use checkboxes to bulk allocate or bulk unallocate multiple lines
              </span>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={(selectedDocument.lines?.length || 0) > 0 && selectedLineIds.size === selectedDocument.lines.length}
                        onChange={handleSelectAllLines}
                        title="Select/Deselect All Items"
                      />
                    </th>
                    <th style={{ width: '30px' }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>SKU / Item Code</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>Unit Price (Excl)</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Invoiced Qty</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Allocated</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Unallocated</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDocument.lines || []).map((line) => {
                    const isExpanded = expandedLineId === line.line_id;
                    const hasAllocations = line.allocations && line.allocations.length > 0;
                    const isSelected = selectedLineIds.has(line.line_id);
                    const isUnallocated = (line.unallocated_qty || 0) > 0;

                    return (
                      <React.Fragment key={line.line_id}>
                        <tr style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.08)' : (isExpanded ? 'rgba(59, 130, 246, 0.03)' : 'transparent'),
                          transition: 'background 0.15s ease'
                        }}>
                          {/* Multi-select Checkbox */}
                          <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleToggleSelectLine(line.line_id)}
                            />
                          </td>

                          {/* Expand/Collapse Chevron */}
                          <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                            {hasAllocations && (
                              <button
                                onClick={() => setExpandedLineId(isExpanded ? null : line.line_id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                                title="View allocated projects & orders"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>

                          {/* Item Code */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                              {line.item_code}
                            </div>
                          </td>

                          {/* Description */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={line.item_description}>
                              {line.item_description || 'No description'}
                            </div>
                          </td>

                          {/* Unit Price Excl */}
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                            R {Number(line.unit_price_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          {/* Invoiced Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                            {line.invoiced_qty} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{line.item_unit}</span>
                          </td>

                          {/* Allocated Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: line.allocated_qty > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                            {line.allocated_qty}
                          </td>

                          {/* Unallocated Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: line.unallocated_qty > 0 ? '#f59e0b' : '#10b981' }}>
                            {line.unallocated_qty}
                          </td>

                          {/* Allocation Status Badge */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {line.status === 'Unallocated' && (
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
                            {line.status === 'Partially Allocated' && (
                              <span style={{ 
                                background: 'rgba(59, 130, 246, 0.12)', 
                                color: '#3b82f6', 
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700 
                              }}>
                                ⏳ Partial ({line.allocated_qty}/{line.invoiced_qty})
                              </span>
                            )}
                            {line.status === 'Fully Allocated' && (
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
                          <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                              {line.unallocated_qty > 0 && (
                                <button
                                  onClick={() => handleOpenAllocModal(line)}
                                  className="btn btn-xs"
                                  style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                  }}
                                >
                                  <Sparkles size={11} /> Allocate
                                </button>
                              )}

                              {line.allocated_qty > 0 && (
                                <button
                                  onClick={() => handleUnallocateLine(line, selectedDocument.document_no)}
                                  className="btn btn-xs"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '5px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Release all allocations for this item"
                                >
                                  <Trash2 size={11} /> Unallocate
                                </button>
                              )}

                              {hasAllocations && (
                                <button
                                  onClick={() => setExpandedLineId(isExpanded ? null : line.line_id)}
                                  className="btn btn-xs btn-ghost"
                                  style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '5px 6px' }}
                                  title="View allocated projects & orders"
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED ALLOCATION BREAKDOWN */}
                        {isExpanded && hasAllocations && (
                          <tr style={{ background: 'rgba(59, 130, 246, 0.02)', borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={10} style={{ padding: '10px 20px 14px 44px' }}>
                              <div style={{ 
                                background: 'var(--bg-primary)', 
                                border: '1px solid var(--border)', 
                                borderRadius: '8px', 
                                padding: '10px 14px' 
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Layers size={12} color="#3b82f6" />
                                  Active Allocations for {line.item_code}:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {line.allocations.map((alloc) => (
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
                                          {alloc.allocated_qty} {line.item_unit}
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
                                          Allocated by {alloc.allocated_by || 'Staff'} {alloc.allocated_at ? `on ${new Date(alloc.allocated_at).toLocaleDateString('en-ZA')}` : ''}
                                        </span>
                                        <button
                                          onClick={() => handleUnallocate(alloc.id, selectedDocument.document_no)}
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* VIEW B: PRIMARY DOCUMENT LIST (One row per Invoice Document) */
        /* ============================================================ */
        <>
          {/* FILTER TABS & SEARCH BAR */}
          <div className="card" style={{ padding: '12px 16px', marginBottom: '14px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              
              {/* Tab Filters */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTabChange('NEEDS_ALLOCATION')}
                  className={`btn btn-xs ${activeFilterTab === 'NEEDS_ALLOCATION' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: activeFilterTab === 'NEEDS_ALLOCATION' ? '#f59e0b' : 'transparent',
                    color: activeFilterTab === 'NEEDS_ALLOCATION' ? '#000' : 'var(--text-primary)',
                    border: '1px solid rgba(245, 158, 11, 0.4)'
                  }}
                >
                  🚨 Needs Allocation ({invoicingSummary.unallocated_count})
                </button>
                <button
                  onClick={() => handleTabChange('PARTIAL')}
                  className={`btn btn-xs ${activeFilterTab === 'PARTIAL' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  ⏳ Partially Allocated ({invoicingSummary.partially_allocated_count})
                </button>
                <button
                  onClick={() => handleTabChange('FULLY_ALLOCATED')}
                  className={`btn btn-xs ${activeFilterTab === 'FULLY_ALLOCATED' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  ✅ Fully Allocated ({invoicingSummary.fully_allocated_count})
                </button>
                <button
                  onClick={() => handleTabChange('ISSUES')}
                  className={`btn btn-xs ${activeFilterTab === 'ISSUES' ? 'btn-error' : 'btn-ghost'}`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: activeFilterTab === 'ISSUES' ? '#ef4444' : 'transparent',
                    color: activeFilterTab === 'ISSUES' ? '#fff' : '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  ⚠️ Issues / Not Found ({invoicingSummary.issues_count || 0})
                </button>
                <button
                  onClick={() => handleTabChange('IN')}
                  className={`btn btn-xs ${activeFilterTab === 'IN' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  📄 Tax Invoices (IN)
                </button>
                <button
                  onClick={() => handleTabChange('CN')}
                  className={`btn btn-xs ${activeFilterTab === 'CN' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  💳 Credit Notes (CN)
                </button>
                <button
                  onClick={() => handleTabChange('ALL')}
                  className={`btn btn-xs ${activeFilterTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  All Invoices
                </button>
              </div>

              {/* Search & Customer Filter */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search Doc #, Client, Ref, SKU..."
                    className="form-control"
                    style={{ paddingLeft: '28px', height: '30px', fontSize: '11.5px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        fetchInvoicingDocuments(1, activeFilterTab, customerFilter, '', limit);
                      }}
                      style={{ position: 'absolute', right: '6px', top: '6px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  className="form-control"
                  style={{ height: '30px', fontSize: '11.5px', padding: '2px 8px', maxWidth: '160px' }}
                  value={customerFilter}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="All Clients">All Clients</option>
                  {uniqueCustomers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* DOCUMENTS LIST TABLE */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Document #</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Client Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Project Reference</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Items / Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total Value (Excl)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Allocation Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingInvoicing ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#3b82f6' }} />
                        Loading live Palladium Invoices...
                      </td>
                    </tr>
                  ) : invoicingDocs.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>No invoice documents found</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>All documents in this view may already be fully allocated or match no search query.</div>
                      </td>
                    </tr>
                  ) : (
                    invoicingDocs.map((doc) => {
                      const isCreditNote = doc.doc_type === 'CREDIT_NOTE';
                      return (
                        <tr 
                          key={doc.document_no}
                          onClick={() => fetchSingleDocumentDetails(doc.document_no)}
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          className="hover-row"
                        >
                          {/* Document # */}
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Receipt size={14} color="#3b82f6" />
                              <span style={{ fontSize: '12.5px' }}>{doc.document_no}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: 700,
                              background: isCreditNote ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              color: isCreditNote ? '#ef4444' : '#3b82f6',
                              border: `1px solid ${isCreditNote ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                            }}>
                              {isCreditNote ? 'CN' : 'INV'}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {doc.transaction_date ? new Date(doc.transaction_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </td>

                          {/* Client Name */}
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {doc.customer_name}
                          </td>

                          {/* Project Reference */}
                          <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.reference}>
                            {doc.reference || '—'}
                          </td>

                          {/* Items / Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {doc.lines_count} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>items</span> • {doc.total_qty} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>units</span>
                          </td>

                          {/* Total Value */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            R {Number(doc.total_value_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Allocation Status */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {doc.is_flagged_issue ? (
                              <span style={{ 
                                background: 'rgba(239, 68, 68, 0.12)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }} title={doc.issue_notes ? `${doc.issue_reason}: ${doc.issue_notes}` : doc.issue_reason}>
                                ⚠️ {doc.issue_reason || 'Issue / Not Found'}
                              </span>
                            ) : doc.allocation_status === 'Needs Allocation' ? (
                              <span style={{ 
                                background: 'rgba(245, 158, 11, 0.12)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <AlertTriangle size={11} /> Needs Allocation
                              </span>
                            ) : doc.allocation_status === 'Partially Allocated' ? (
                              <span style={{ 
                                background: 'rgba(59, 130, 246, 0.12)', 
                                color: '#3b82f6', 
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 700 
                              }}>
                                ⏳ Partial ({doc.allocated_qty}/{doc.total_qty})
                              </span>
                            ) : (
                              <span style={{ 
                                background: 'rgba(16, 185, 129, 0.12)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10.5px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Check size={11} /> Fully Allocated
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fetchSingleDocumentDetails(doc.document_no);
                                }}
                                className="btn btn-xs"
                                style={{
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-primary)',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  padding: '4px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                Open Workspace <ArrowRight size={11} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  doc.is_flagged_issue ? handleResolveIssue(doc) : handleOpenIssueModal(doc);
                                }}
                                className="btn btn-xs btn-ghost"
                                style={{
                                  color: doc.is_flagged_issue ? '#10b981' : '#f59e0b',
                                  border: '1px solid var(--border)',
                                  fontSize: '10.5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px'
                                }}
                                title={doc.is_flagged_issue ? 'Click to resolve issue' : 'Flag as Issue / Not Found'}
                              >
                                {doc.is_flagged_issue ? 'Resolve' : 'Flag'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ 
              padding: '10px 16px', 
              borderTop: '1px solid var(--border)', 
              background: 'var(--bg-secondary)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Showing <strong>{invoicingDocs.length}</strong> of <strong>{totalCount}</strong> documents
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => {
                    setPage(1);
                    fetchInvoicingDocuments(1, activeFilterTab, customerFilter, searchQuery, limit);
                  }}
                  disabled={page <= 1}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px', fontWeight: 600, fontSize: '11px' }}
                  title="Jump to First Page"
                >
                  ⏮ First
                </button>

                <button
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    fetchInvoicingDocuments(prev, activeFilterTab, customerFilter, searchQuery, limit);
                  }}
                  disabled={page <= 1}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px' }}
                >
                  ◀ Prev
                </button>

                <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '0 8px', color: 'var(--text-primary)' }}>
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    fetchInvoicingDocuments(next, activeFilterTab, customerFilter, searchQuery, limit);
                  }}
                  disabled={page >= totalPages}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px' }}
                >
                  Next ▶
                </button>

                <button
                  onClick={() => {
                    setPage(totalPages);
                    fetchInvoicingDocuments(totalPages, activeFilterTab, customerFilter, searchQuery, limit);
                  }}
                  disabled={page >= totalPages}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px', fontWeight: 600, fontSize: '11px' }}
                  title="Jump to Last Page"
                >
                  Last ⏭
                </button>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const targetPage = Number(jumpPageInput);
                    if (targetPage >= 1 && targetPage <= totalPages) {
                      setPage(targetPage);
                      fetchInvoicingDocuments(targetPage, activeFilterTab, customerFilter, searchQuery, limit);
                      setJumpPageInput('');
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    placeholder={page}
                    className="form-control"
                    style={{ width: '50px', height: '28px', fontSize: '11px', padding: '2px 4px', textAlign: 'center', fontWeight: 600 }}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-xs btn-ghost"
                    style={{ border: '1px solid var(--border)', height: '28px', fontSize: '10.5px', padding: '2px 8px', fontWeight: 700 }}
                  >
                    Go
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* BATCH ALLOCATION MODAL (Multiple items to 1 Project Order)   */}
      {/* ============================================================ */}
      {batchModalOpen && selectedDocument && createPortal(
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
          <div className="modal-content" style={{ width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.04) 100%)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  Batch Allocate {selectedLineIds.size} Invoice Lines from {selectedDocument.document_no}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Client: <strong>{selectedDocument.customer_name}</strong> • Reference: <strong>{selectedDocument.reference || 'General'}</strong>
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setBatchModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBatchAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Target Project & Order Selectors */}
                <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    🎯 Destination Project & Order
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Target Project *</label>
                      <select
                        className="form-control"
                        style={{ height: '34px', fontSize: '12px', fontWeight: 600 }}
                        value={batchProjectId}
                        onChange={(e) => {
                          setBatchProjectId(e.target.value);
                          setBatchOrderId('');
                        }}
                        required
                      >
                        <option value="">-- Select Destination Project --</option>
                        {Object.values(projects || {}).map(p => (
                          <option key={p.key || p.id} value={p.id || p.key}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Target Order (Optional)</label>
                      <select
                        className="form-control"
                        style={{ height: '34px', fontSize: '12px' }}
                        value={batchOrderId}
                        onChange={(e) => setBatchOrderId(e.target.value)}
                        disabled={!batchProjectId}
                      >
                        <option value="">-- General Project Allocation --</option>
                        {(() => {
                          const proj = Object.values(projects || {}).find(p => String(p.id) === String(batchProjectId) || p.key === batchProjectId);
                          return (proj?.orders || []).map(o => (
                            <option key={o.id} value={o.id}>{o.quoteName || o.quote_name || `Order #${o.id}`}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Being Allocated List */}
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Lines to be Allocated ({selectedLineIds.size}):
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '6px 10px' }}>SKU</th>
                          <th style={{ padding: '6px 10px' }}>Description</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Unit Excl</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Excl</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedDocument.lines || []).filter(l => selectedLineIds.has(l.line_id)).map(l => (
                          <tr key={l.line_id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'monospace' }}>{l.item_code}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.item_description}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{l.unallocated_qty}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>R {Number(l.unit_price_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>R {Number((l.unallocated_qty || 0) * (l.unit_price_excl || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Internal Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Internal Allocation Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Invoiced deposit for Living Room joinery..."
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                  />
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
                  onClick={() => setBatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm btn-primary" 
                  disabled={isSavingBatchAlloc || !batchProjectId}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  {isSavingBatchAlloc ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm Batch Allocation ({selectedLineIds.size} lines)
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* SINGLE ALLOCATION MODAL (1 Item to 1 Order)                  */}
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
          <div className="modal-content" style={{ width: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(37,99,235,0.04) 100%)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  Allocate {allocTargetItem.item_code}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  From Invoice: <strong>{selectedDocument?.document_no}</strong> • Client: <strong>{selectedDocument?.customer_name}</strong>
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setAllocModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitSingleAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Quantity & Unit Price */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 700 }}>
                      Quantity to Allocate *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={allocTargetItem.unallocated_qty || 9999}
                      className="form-control"
                      style={{ height: '34px', fontSize: '13px', fontWeight: 700 }}
                      value={allocQty}
                      onChange={(e) => setAllocQty(Number(e.target.value))}
                      required
                    />
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Available: <strong>{allocTargetItem.unallocated_qty} units</strong>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                      Line Unit Price (Excl VAT)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ height: '34px', fontSize: '12px', background: 'var(--bg-secondary)', fontWeight: 600 }}
                      value={`R ${Number(allocTargetItem.unit_price_excl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      disabled
                    />
                  </div>
                </div>

                {/* Candidate Orders (Intelligent ERP Matching) */}
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={13} color="#3b82f6" />
                    Intelligent Candidate Order Matches:
                  </div>

                  {candidateOrders.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {candidateOrders.map(cand => {
                        const isSelected = selectedCandidateKey === cand.candidate_key;
                        return (
                          <div 
                            key={cand.candidate_key}
                            onClick={() => handleSelectCandidate(cand)}
                            style={{
                              border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--border)',
                              background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                                {cand.project_name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>•</span> {cand.order_title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Client: <strong style={{ color: 'var(--text-primary)' }}>{cand.client}</strong> • Match: <span style={{ color: '#3b82f6', fontWeight: 600 }}>{cand.match_type}</span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ 
                                background: isSelected ? '#3b82f6' : 'var(--bg-secondary)', 
                                color: isSelected ? '#fff' : 'var(--text-primary)', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontSize: '11px', 
                                fontWeight: 700 
                              }}>
                                {isSelected ? 'Selected' : 'Select'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      No direct project / item matches found. You can select any project below.
                    </div>
                  )}
                </div>

                {/* Manual Project Selection Override */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Or Select Destination Project Manually:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Project</label>
                      <select
                        className="form-control"
                        style={{ height: '32px', fontSize: '11.5px' }}
                        value={manualProjectId}
                        onChange={(e) => {
                          setManualProjectId(e.target.value);
                          setManualOrderId('');
                          setSelectedCandidateKey(null);
                        }}
                      >
                        <option value="">-- Choose Project --</option>
                        {Object.values(projects || {}).map(p => (
                          <option key={p.key || p.id} value={p.id || p.key}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Order (Optional)</label>
                      <select
                        className="form-control"
                        style={{ height: '32px', fontSize: '11.5px' }}
                        value={manualOrderId}
                        onChange={(e) => setManualOrderId(e.target.value)}
                        disabled={!manualProjectId}
                      >
                        <option value="">-- General Project Order --</option>
                        {(() => {
                          const proj = Object.values(projects || {}).find(p => (p.key && p.key === manualProjectId) || (p.id && String(p.id) === String(manualProjectId)) || p.name === manualProjectId);
                          return (proj?.orders || []).map(o => (
                            <option key={o.dbId || o.id} value={o.dbId || o.id}>{o.quote_name || o.quoteName || o.poNumber || `Order #${o.id}`}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
                    Internal Allocation Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deposit invoice allocation, Progress invoice..."
                    className="form-control"
                    style={{ height: '34px', fontSize: '12px' }}
                    value={allocNotes}
                    onChange={(e) => setAllocNotes(e.target.value)}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                gap: '10px', 
                padding: '14px 20px', 
                borderTop: '1px solid var(--border)', 
                background: 'var(--bg-secondary)', 
                flexShrink: 0 
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const item = allocTargetItem;
                    setAllocModalOpen(false);
                    handleOpenIssueModal(item);
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
                    className="btn btn-sm btn-ghost" 
                    onClick={() => setAllocModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSavingAlloc}
                    className="btn btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      padding: '8px 18px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSavingAlloc ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    {isSavingAlloc ? 'Allocating...' : 'Confirm Allocation'}
                  </button>
                </div>
              </div>
            </form>

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
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid rgba(245, 158, 11, 0.3)'
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
                    Invoice: <strong style={{ color: 'var(--text-primary)' }}>{issueTargetItem.document_no}</strong> {issueTargetItem.item_code ? `(SKU: ${issueTargetItem.item_code})` : ''}
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
                  <option value="SKU Mismatch">SKU / Item Code Mismatch</option>
                  <option value="Client Name Mismatch">Client Name / Code Mismatch</option>
                  <option value="Price Discrepancy">Price / Invoiced Value Discrepancy</option>
                  <option value="Requires PM Review">Requires PM / Sales Rep Review</option>
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
                  placeholder="Describe why this invoice cannot be matched or what information is needed..."
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
