import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  ClipboardList, Search, RefreshCw, AlertTriangle, Check, Layers, ExternalLink, Filter, 
  ArrowLeft, ArrowRight, ShieldCheck, ChevronDown, ChevronRight, X, Sparkles, Box, 
  CheckCircle2, Clock, Trash2, FileText, Package, CheckSquare, Square,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

export default function PurchasingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, getModuleName } = useStore();

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // -------------------------------------------------------------
  // PALLADIUM PROCUREMENT STATE
  // -------------------------------------------------------------
  const [procurementSummary, setProcurementSummary] = useState({
    unallocated_count: 0,
    partially_allocated_count: 0,
    fully_allocated_count: 0,
    total_documents: 0,
    total_lines: 0,
    total_unallocated_units: 0
  });

  // Selected Document for Deep Workspace View (null = show all documents list)
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoadingDocumentDetails, setIsLoadingDocumentDetails] = useState(false);

  // Multi-selection checkboxes in Document Workspace
  const [selectedLineIds, setSelectedLineIds] = useState(new Set());

  const [procurementDocs, setProcurementDocs] = useState([]);
  const [isLoadingProcurement, setIsLoadingProcurement] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('NEEDS_ALLOCATION'); // 'NEEDS_ALLOCATION' | 'PARTIAL' | 'FULLY_ALLOCATED' | 'PO' | 'GRN' | 'ALL'
  const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
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
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState(null); // 'orderItemId' or 'MANUAL'
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualOrderId, setManualOrderId] = useState('');
  const [allocQty, setAllocQty] = useState(1);
  const [allocEta, setAllocEta] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  // Batch Allocation Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProjectId, setBatchProjectId] = useState('');
  const [batchOrderId, setBatchOrderId] = useState('');
  const [batchEta, setBatchEta] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [isSavingBatchAlloc, setIsSavingBatchAlloc] = useState(false);

  // Smart Bulk PO Allocation Wizard State
  const [isBulkWizardOpen, setIsBulkWizardOpen] = useState(false);
  const [isLoadingWizard, setIsLoadingWizard] = useState(false);
  const [wizardData, setWizardData] = useState([]);
  const [wizardAvailableProjects, setWizardAvailableProjects] = useState([]);
  const [wizardFilterTab, setWizardFilterTab] = useState('ALL'); // 'ALL' | 'READY' | 'REVIEW'
  const [wizardSearchQuery, setWizardSearchQuery] = useState('');
  const [wizardSelectedDocNos, setWizardSelectedDocNos] = useState(new Set());
  const [wizardRowOverrides, setWizardRowOverrides] = useState({});
  const [wizardExpandedDocNos, setWizardExpandedDocNos] = useState(new Set());
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false);
  const [wizardSubmitProgress, setWizardSubmitProgress] = useState(null);
  const [wizardSortField, setWizardSortField] = useState('document_no');
  const [wizardSortDirection, setWizardSortDirection] = useState('asc');

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
      const res = await fetch(`${API_BASE}/api/procurement/summary`);
      if (res.ok) {
        setProcurementSummary(await res.json());
      }
    } catch (_) {}
  };

  const fetchProcurementDocuments = async (
    newPage = page, 
    newTab = activeFilterTab, 
    newSupplier = supplierFilter, 
    newQ = searchQuery,
    newLimit = limit
  ) => {
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
      } else if (newTab === 'ISSUES') {
        statusParam = 'ISSUES';
      }

      const params = new URLSearchParams({
        doc_type: docTypeParam,
        status: statusParam,
        page: newPage.toString(),
        limit: newLimit.toString(),
        view_level: 'document'
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
        setProcurementDocs(data.items || []);
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

  // Fetch full details of an individual document when opened
  const fetchSingleDocumentDetails = async (docType, docNo) => {
    setIsLoadingDocumentDetails(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/document-details?doc_type=${encodeURIComponent(docType)}&document_no=${encodeURIComponent(docNo)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDocument(data);
        setSelectedLineIds(new Set()); // Reset selection
      }
    } catch (e) {
      console.error('Failed to fetch document details:', e);
    } finally {
      setIsLoadingDocumentDetails(false);
    }
  };

  // Helper for generating smart pagination pages
  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
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
      if (selectedDocument) {
        await fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
      }
      setIsSyncingPalladium(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchProcurementDocuments(1, activeFilterTab, supplierFilter, searchQuery);
  }, []);

  // Handle direct deep-link opening from OrdersPage or other tabs
  useEffect(() => {
    if (location.state?.openDocId) {
      const rawId = String(location.state.openDocId).trim();
      const docNo = rawId.replace(/^(PO_|GRN_)/, '');
      const docType = rawId.startsWith('GRN') || docNo.startsWith('PI-') ? 'GRN' : 'PO';
      fetchSingleDocumentDetails(docType, docNo);
    }
  }, [location.state]);

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
    procurementDocs.forEach(item => {
      if (item.vendor_name && item.vendor_name.trim()) set.add(item.vendor_name.trim());
    });
    return Array.from(set).sort();
  }, [procurementDocs]);

  // -------------------------------------------------------------
  // MULTI-SELECTION HANDLERS
  // -------------------------------------------------------------
  const handleToggleSelectLine = (lineId) => {
    const newSet = new Set(selectedLineIds);
    if (newSet.has(lineId)) {
      newSet.delete(lineId);
    } else {
      newSet.add(lineId);
    }
    setSelectedLineIds(newSet);
  };

  const handleToggleSelectAll = () => {
    if (!selectedDocument || !selectedDocument.lines) return;
    if (selectedLineIds.size === selectedDocument.lines.length) {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(selectedDocument.lines.map(l => l.id)));
    }
  };

  const handleSelectAllUnallocated = () => {
    if (!selectedDocument || !selectedDocument.lines) return;
    const unallocated = selectedDocument.lines.filter(l => (l.unallocated_qty || 0) > 0);
    if (selectedLineIds.size >= unallocated.length && unallocated.length > 0) {
      setSelectedLineIds(new Set()); // Deselect all
    } else {
      const newSet = new Set(unallocated.map(l => l.id));
      setSelectedLineIds(newSet);
    }
  };

  // -------------------------------------------------------------
  // ALLOCATION ACTIONS (SINGLE & BATCH)
  // -------------------------------------------------------------
  const handleOpenAllocModal = async (item) => {
    setAllocTargetItem(item);
    setAllocQty(Math.max(1, Math.min(item.unallocated_qty || 1, item.total_qty || 1)));
    const defaultEta = (item?.order_required_date || selectedDocument?.order_required_date || '').split('T')[0];
    setAllocEta(defaultEta);
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
          const firstCand = data.candidates[0];
          setSelectedCandidateKey(firstCand.order_item_id);
          const needed = firstCand.remaining_needed || 1;
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

  const handleSubmitSingleAllocation = async (e) => {
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
      vendor_name: allocTargetItem.vendor_name,
      doc_date: allocTargetItem.transaction_date,
      eta: allocEta,
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
      const proj = Object.values(projects || {}).find(p => (p.key && p.key === manualProjectId) || (p.id && String(p.id) === String(manualProjectId)) || p.name === manualProjectId);
      payload.project_id = proj?.id || null;
      payload.project_key = proj?.key || manualProjectId;
      payload.project_name = proj ? proj.name : manualProjectId;
      payload.order_id = manualOrderId || null;
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
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
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
        .filter(l => selectedLineIds.has(l.id))
        .map(l => (l.item_code || '').trim().toUpperCase())
    );

    const docRef = (selectedDocument.reference || '').trim().toLowerCase();
    const vendor = (selectedDocument.vendor_name || '').trim().toLowerCase();
    let bestProjId = '';
    let bestMatchScore = 0;

    Object.values(projects || {}).forEach(p => {
      let score = 0;
      const pName = (p.name || '').toLowerCase();
      const pClient = (p.client || '').toLowerCase();
      const pIdStr = p.id ? String(p.id) : (p.key || '');

      // 1. Direct Reference match
      if (docRef && pName && (docRef.includes(pName) || pName.includes(docRef))) {
        score += 60;
      }
      // 2. Keyword token matching
      const refTokens = docRef.split(/[\s,()-_]+/).filter(w => w.length >= 3);
      refTokens.forEach(t => {
        if (pName.includes(t)) score += 25;
        if (pClient.includes(t)) score += 15;
      });

      // 3. SKU overlap in project order items
      (p.orders || []).forEach(o => {
        (o.itemsList || []).forEach(it => {
          const code = (it.code || '').trim().toUpperCase();
          const oneOne = (it.oneOneCode || '').trim().toUpperCase();
          if (selectedSkus.has(code) || selectedSkus.has(oneOne)) {
            score += 15;
          }
        });
      });

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestProjId = pIdStr;
      }
    });

    let bestOrderId = '';
    if (bestProjId) {
      const matchedProj = Object.values(projects || {}).find(p => String(p.id) === String(bestProjId) || p.key === bestProjId || p.name === bestProjId);
      if (matchedProj?.orders?.length === 1) {
        bestOrderId = matchedProj.orders[0].id || matchedProj.orders[0].dbId || '';
      }
    }

    setBatchProjectId(bestProjId || '');
    setBatchOrderId(bestOrderId ? String(bestOrderId) : '');
    const defaultEta = (selectedDocument?.order_required_date || '').split('T')[0];
    setBatchEta(defaultEta);
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
    const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.id) && (l.unallocated_qty || 0) > 0);

    if (selectedLines.length === 0) {
      alert("None of the selected items have unallocated quantities available.");
      return;
    }

    const payload = {
      allocation_type: selectedDocument.doc_type,
      source_doc_no: selectedDocument.document_no,
      vendor_name: selectedDocument.vendor_name,
      doc_date: selectedDocument.transaction_date,
      eta: batchEta,
      project_id: proj?.id || null,
      project_key: proj?.key || batchProjectId,
      project_name: proj ? proj.name : batchProjectId,
      order_id: batchOrderId || null,
      allocated_by_name: 'Staff',
      notes: batchNotes || `Batch allocated ${selectedLines.length} items`,
      items: selectedLines.map(l => ({
        source_line_id: l.line_id,
        sku: l.item_code,
        allocated_qty: Number(l.unallocated_qty || 1),
        unit_cost: Number(l.unit_cost || 0),
        fitting_code: l.item_code
      }))
    };

    setIsSavingBatchAlloc(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/batch-allocate`, {
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
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
        fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
      } else {
        alert(`Batch allocation notice: ${data.detail || 'Could not complete batch allocation.'}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setIsSavingBatchAlloc(false);
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
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
        }
      } else {
        alert(`Notice: ${data.detail || 'Failed to unallocate.'}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
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

      const res = await fetch(`${API_BASE}/api/procurement/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Item unallocated.'}`);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
        }
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

    const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.id));
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

      const res = await fetch(`${API_BASE}/api/procurement/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Selected items unallocated.'}`);
        setSelectedLineIds(new Set());
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
        fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
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
    if (!window.confirm(`Are you sure you want to unallocate ALL items from ${docNo}? Every item in this document will return to unallocated.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/procurement/batch-unallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_no: docNo })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`🔄 ${data.message || 'Entire document unallocated.'}`);
        setSelectedLineIds(new Set());
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.doc_type, docNo);
        }
      } else {
        alert(`Unallocate notice: ${data.detail || 'Could not unallocate document.'}`);
      }
    } catch (e) {
      alert(`Error in bulk unallocation: ${e.message}`);
    }
  };

  // -------------------------------------------------------------
  // SMART BULK PO ALLOCATION WIZARD HANDLERS
  // -------------------------------------------------------------
  const handleOpenBulkWizard = async () => {
    setIsBulkWizardOpen(true);
    setIsLoadingWizard(true);
    try {
      const res = await fetch(`${API_BASE}/api/procurement/auto-match-preview`);
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        setWizardData(docs);
        setWizardAvailableProjects(data.available_projects || []);

        // Pre-select HIGH & MEDIUM confidence matches
        const initialSelected = new Set();
        const initialOverrides = {};

        docs.forEach(d => {
          if (d.match_confidence === 'HIGH' || d.match_confidence === 'MEDIUM') {
            initialSelected.add(d.document_no);
          }
          initialOverrides[d.document_no] = {
            project_id: d.detected_project_id ? String(d.detected_project_id) : '',
            order_id: d.suggested_order_id ? String(d.suggested_order_id) : '',
            eta: d.default_eta || ''
          };
        });

        setWizardSelectedDocNos(initialSelected);
        setWizardRowOverrides(initialOverrides);
      } else {
        alert("Failed to load auto-match preview from server.");
      }
    } catch (e) {
      alert(`Error loading bulk wizard: ${e.message}`);
    } finally {
      setIsLoadingWizard(false);
    }
  };

  const handleWizardRowChange = (docNo, field, val) => {
    setWizardRowOverrides(prev => {
      const cur = prev[docNo] || {};
      const updated = { ...cur, [field]: val };

      // If project changed, auto-select first order if available
      if (field === 'project_id') {
        const proj = wizardAvailableProjects.find(p => String(p.id) === String(val));
        if (proj && proj.orders && proj.orders.length > 0) {
          updated.order_id = String(proj.orders[0].id);
        } else {
          updated.order_id = '';
        }
      }

      return { ...prev, [docNo]: updated };
    });
  };

  const handleToggleWizardSelect = (docNo) => {
    setWizardSelectedDocNos(prev => {
      const next = new Set(prev);
      if (next.has(docNo)) next.delete(docNo);
      else next.add(docNo);
      return next;
    });
  };

  const handleWizardSort = (field) => {
    if (wizardSortField === field) {
      setWizardSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setWizardSortField(field);
      setWizardSortDirection('asc');
    }
  };

  const renderWizardSortIcon = (field) => {
    if (wizardSortField !== field) {
      return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.35, verticalAlign: 'middle' }} />;
    }
    return wizardSortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: '#6366f1', verticalAlign: 'middle' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: '#6366f1', verticalAlign: 'middle' }} />;
  };

  const handleExecuteBulkWizard = async () => {
    if (wizardSelectedDocNos.size === 0) {
      alert("Please select at least one PO to allocate.");
      return;
    }

    const selectedDocs = wizardData.filter(d => wizardSelectedDocNos.has(d.document_no));

    // Check if any selected PO is missing a project
    const missingProject = selectedDocs.find(d => {
      const row = wizardRowOverrides[d.document_no] || {};
      return !row.project_id && !d.detected_project_id;
    });

    if (missingProject) {
      alert(`PO ${missingProject.document_no} does not have a destination Project assigned. Please select a project or uncheck it.`);
      return;
    }

    if (!window.confirm(`Allocate ${selectedDocs.length} Purchase Orders to their selected projects and update ETAs?`)) {
      return;
    }

    setIsSubmittingWizard(true);
    setWizardSubmitProgress(`Allocating ${selectedDocs.length} purchase orders...`);

    try {
      const approvedPayload = selectedDocs.map(d => {
        const override = wizardRowOverrides[d.document_no] || {};
        return {
          document_no: d.document_no,
          project_id: override.project_id || d.detected_project_id,
          order_id: override.order_id || d.suggested_order_id || null,
          eta: override.eta || d.default_eta || null,
          notes: "Smart Wizard Bulk PO Allocation"
        };
      });

      const res = await fetch(`${API_BASE}/api/procurement/bulk-allocate-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_allocations: approvedPayload,
          allocated_by_name: 'Staff'
        })
      });

      const data = await res.json();
      if (res.ok) {
        triggerToast(`🎉 ${data.message || 'Successfully allocated POs!'}`);
        setIsBulkWizardOpen(false);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery);
        if (selectedDocument) {
          fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
        }
      } else {
        alert(`Bulk allocation notice: ${data.detail || 'Failed to complete allocations.'}`);
      }
    } catch (e) {
      alert(`Error executing bulk allocation: ${e.message}`);
    } finally {
      setIsSubmittingWizard(false);
      setWizardSubmitProgress(null);
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
      const moduleType = (issueTargetItem.document_type || issueTargetItem.doc_type || (issueTargetItem.document_no?.startsWith('GRN') ? 'GRN' : 'PO')).toUpperCase();
      const res = await fetch(`${API_BASE}/api/procurement/flag-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: moduleType,
          document_no: issueTargetItem.document_no,
          line_id: issueTargetItem.line_id !== undefined ? issueTargetItem.line_id : (typeof issueTargetItem.id === 'number' ? issueTargetItem.id : null),
          sku: issueTargetItem.item_code || issueTargetItem.sku || null,
          reason: issueReason,
          notes: issueNotes,
          flagged_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`⚠️ ${issueTargetItem.document_no} flagged as "${issueReason}"`);
        setIssueModalOpen(false);
        if (allocModalOpen) setAllocModalOpen(false);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery, limit);
        if (selectedDocument) fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
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
      const moduleType = (docOrLine.document_type || docOrLine.doc_type || (docOrLine.document_no?.startsWith('GRN') ? 'GRN' : 'PO')).toUpperCase();
      const res = await fetch(`${API_BASE}/api/procurement/resolve-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: moduleType,
          document_no: docOrLine.document_no,
          resolved_by: 'Staff'
        })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`✅ Issue on ${docOrLine.document_no} resolved!`);
        fetchSummary();
        fetchProcurementDocuments(page, activeFilterTab, supplierFilter, searchQuery, limit);
        if (selectedDocument) fetchSingleDocumentDetails(selectedDocument.doc_type, selectedDocument.document_no);
      } else {
        alert(data.detail || 'Could not resolve issue.');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
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
              {getModuleName('purchasing', 'Purchasing & Receiving')} Suite
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Read-Only Feed from Palladium ERP</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardList size={22} style={{ color: '#3b82f6' }} />
            {selectedDocument ? (
              <span>
                Document Workspace: <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{selectedDocument.document_no}</span>
              </span>
            ) : (
              'Procurement & Order Allocation Hub'
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

          {!selectedDocument && (
            <button
              onClick={handleOpenBulkWizard}
              className="btn btn-sm"
              title="Auto-match and bulk allocate unallocated POs to projects with review"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                height: '32px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                padding: '0 12px',
                borderRadius: '8px'
              }}
            >
              <Sparkles size={14} /> Smart Bulk Allocate POs
            </button>
          )}

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
              {procurementSummary.unallocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Documents with unallocated items ({procurementSummary.total_unallocated_units.toLocaleString()} units)
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
              {procurementSummary.partially_allocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Documents with split or in-progress items
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
              {procurementSummary.fully_allocated_count.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 500 }}>docs</span>
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
                📦 Total ERP Documents
              </span>
              <Box size={14} color="var(--text-tertiary)" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.1 }}>
              {procurementSummary.total_documents.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Containing {procurementSummary.total_lines.toLocaleString()} total line items
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
                    background: selectedDocument.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: selectedDocument.doc_type === 'PO' ? '#3b82f6' : '#10b981',
                    border: `1px solid ${selectedDocument.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {selectedDocument.doc_type === 'PO' ? 'Purchase Order' : 'Goods Received Note'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {selectedDocument.document_no}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <div>Supplier: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.vendor_name}</strong></div>
                  <div>Date: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.transaction_date ? new Date(selectedDocument.transaction_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</strong></div>
                  {selectedDocument.customer_name && (
                    <div>Client Ref: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.customer_name}</strong></div>
                  )}
                  <div>Total Value: <strong style={{ color: 'var(--text-primary)' }}>R {selectedDocument.total_value?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong></div>
                </div>
              </div>

              {/* Document Allocation Progress & Batch Action */}
              <div style={{ textAlign: 'right', minWidth: '240px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Allocation Progress:</span>
                  <strong style={{ color: selectedDocument.allocation_status === 'FULLY_ALLOCATED' ? '#10b981' : (selectedDocument.allocation_status === 'PARTIAL' ? '#3b82f6' : '#f59e0b') }}>
                    {selectedDocument.allocated_lines_count} / {selectedDocument.total_lines} items allocated
                  </strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${selectedDocument.total_lines > 0 ? (selectedDocument.allocated_lines_count / selectedDocument.total_lines) * 100 : 0}%`,
                    background: selectedDocument.allocation_status === 'FULLY_ALLOCATED' ? '#10b981' : '#3b82f6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {selectedDocument.allocated_lines_count > 0 && (
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
            const selectedLines = (selectedDocument.lines || []).filter(l => selectedLineIds.has(l.id));
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
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                  Line Items in {selectedDocument.document_no} ({selectedDocument.lines?.length || 0} items)
                </span>
                {unallocatedLinesInDoc.length > 0 && (
                  <button
                    onClick={handleSelectAllUnallocated}
                    className="btn btn-xs btn-ghost"
                    style={{ border: '1px solid var(--border)', fontSize: '10.5px', padding: '2px 8px' }}
                  >
                    {selectedLineIds.size === unallocatedLinesInDoc.length ? 'Deselect All' : `Select All Unallocated (${unallocatedLinesInDoc.length})`}
                  </button>
                )}
              </div>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Tip: Select multiple items to allocate them together, or allocate individually
              </span>
            </div>

            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={(selectedDocument.lines || []).length > 0 && selectedLineIds.size === (selectedDocument.lines || []).length}
                        onChange={handleToggleSelectAll}
                        title="Select/Deselect All Items"
                      />
                    </th>
                    <th style={{ width: '30px' }}></th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Item Code / Description</th>
                    <th style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>Unit Cost</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Ordered Qty</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Allocated</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Unallocated</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDocument.lines || []).map((line) => {
                    const isExpanded = expandedLineId === line.id;
                    const hasAllocations = line.allocations && line.allocations.length > 0;
                    const isSelected = selectedLineIds.has(line.id);
                    const isUnallocated = (line.unallocated_qty || 0) > 0;

                    return (
                      <React.Fragment key={line.id}>
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
                              onChange={() => handleToggleSelectLine(line.id)}
                            />
                          </td>

                          {/* Expand/Collapse Chevron */}
                          <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                            {hasAllocations && (
                              <button
                                onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}
                                title="View allocated projects & orders"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>

                          {/* Item Code & Description */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>
                              {line.item_code}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {line.item_description || 'No description'}
                            </div>
                          </td>

                          {/* Unit Cost */}
                          <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>
                            R {line.unit_cost?.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) || '0.00'}
                          </td>

                          {/* Ordered Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                            {line.total_qty} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{line.item_unit}</span>
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
                            {line.allocation_status === 'NEEDS_ALLOCATION' && (
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
                            {line.allocation_status === 'PARTIAL' && (
                              <span style={{ 
                                background: 'rgba(59, 130, 246, 0.12)', 
                                color: '#3b82f6', 
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={10} /> Partial ({line.allocated_qty}/{line.total_qty})
                              </span>
                            )}
                            {line.allocation_status === 'FULLY_ALLOCATED' && (
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
                                    padding: '5px 12px',
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
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Unallocate this line item"
                                >
                                  <Trash2 size={11} /> Unallocate
                                </button>
                              )}

                              {hasAllocations && (
                                <button
                                  onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                                  className="btn btn-xs btn-ghost"
                                  style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '4px 6px' }}
                                  title="Toggle allocation details"
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
                            <td colSpan={9} style={{ padding: '10px 20px 14px 44px' }}>
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
                                          Allocated by {alloc.allocated_by_name || 'Staff'} {alloc.allocated_at ? `on ${new Date(alloc.allocated_at).toLocaleDateString('en-ZA')}` : ''}
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
        /* VIEW B: PRIMARY DOCUMENT LIST (One row per PO / GRN Document)*/
        /* ============================================================ */
        <>
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
                  ⏳ Partially Allocated ({procurementSummary.partially_allocated_count})
                </button>
                <button
                  onClick={() => setActiveFilterTab('FULLY_ALLOCATED')}
                  className={`btn btn-xs ${activeFilterTab === 'FULLY_ALLOCATED' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '11.5px', fontWeight: 600 }}
                >
                  ✅ Fully Allocated ({procurementSummary.fully_allocated_count})
                </button>
                <button
                  onClick={() => setActiveFilterTab('ISSUES')}
                  className={`btn btn-xs ${activeFilterTab === 'ISSUES' ? 'btn-error' : 'btn-ghost'}`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: activeFilterTab === 'ISSUES' ? '#ef4444' : 'transparent',
                    color: activeFilterTab === 'ISSUES' ? '#fff' : '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  ⚠️ Issues / Not Found ({procurementSummary.issues_count || 0})
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
                  All Documents
                </button>
              </div>

              {/* Search & Supplier Filter */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search Doc #, Supplier, SKU..."
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

          {/* DOCUMENTS LIST TABLE */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Document #</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>Items / Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Total Value</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Allocation Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingProcurement ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#3b82f6' }} />
                        Loading live ERP documents...
                      </td>
                    </tr>
                  ) : procurementDocs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✨</div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>No documents found</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>All documents in this view may already be fully allocated or match no search query.</div>
                      </td>
                    </tr>
                  ) : (
                    procurementDocs.map((doc) => {
                      return (
                        <tr 
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          className="hover-row"
                        >
                          {/* Document # & Client Ref */}
                          <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={14} color="#3b82f6" />
                              <span style={{ fontSize: '12.5px' }}>{doc.document_no}</span>
                            </div>
                            {doc.customer_name && (
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400, marginTop: '2px' }}>
                                Ref: {doc.customer_name}
                              </div>
                            )}
                          </td>

                          {/* Type Badge */}
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              fontWeight: 700,
                              background: doc.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: doc.doc_type === 'PO' ? '#3b82f6' : '#10b981',
                              border: `1px solid ${doc.doc_type === 'PO' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                            }}>
                              {doc.doc_type}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: '10px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {doc.transaction_date ? new Date(doc.transaction_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </td>

                          {/* Supplier */}
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {doc.vendor_name}
                          </td>

                          {/* Total Lines & Qty */}
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {doc.total_lines} {doc.total_lines === 1 ? 'item' : 'items'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              {doc.total_qty} total units
                            </div>
                          </td>

                          {/* Total Value */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                            R {doc.total_value ? doc.total_value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </td>

                          {/* Allocation Status Badge */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {doc.is_flagged_issue ? (
                              <span style={{ 
                                background: 'rgba(239, 68, 68, 0.12)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }} title={doc.issue_notes ? `${doc.issue_reason}: ${doc.issue_notes}` : doc.issue_reason}>
                                ⚠️ {doc.issue_reason || 'Issue / Not Found'}
                              </span>
                            ) : doc.allocation_status === 'NEEDS_ALLOCATION' ? (
                              <span style={{ 
                                background: 'rgba(245, 158, 11, 0.12)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <AlertTriangle size={10} /> Needs Allocation ({doc.unallocated_lines_count} items)
                              </span>
                            ) : doc.allocation_status === 'PARTIAL' ? (
                              <span style={{ 
                                background: 'rgba(59, 130, 246, 0.12)', 
                                color: '#3b82f6', 
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700 
                              }}>
                                ⏳ Partial ({doc.allocated_lines_count}/{doc.total_lines} allocated)
                              </span>
                            ) : (
                              <span style={{ 
                                background: 'rgba(16, 185, 129, 0.12)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '3px 8px', 
                                borderRadius: '12px', 
                                fontSize: '10px', 
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Check size={10} /> 100% Allocated
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocument(doc);
                                }}
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
                                <Sparkles size={11} /> Open & Allocate
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

            {/* PAGINATION FOOTER */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 18px', 
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Left Side: Summary & Rows Per Page Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{totalCount === 0 ? 0 : (page - 1) * limit + 1}</strong> - <strong style={{ color: 'var(--text-primary)' }}>{Math.min(page * limit, totalCount)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalCount.toLocaleString()}</strong> documents
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Rows per page:</label>
                  <select
                    className="form-control"
                    style={{ height: '28px', fontSize: '11.5px', padding: '2px 8px', width: '80px', fontWeight: 700 }}
                    value={limit}
                    onChange={(e) => {
                      const newLim = Number(e.target.value);
                      setLimit(newLim);
                      setPage(1);
                      fetchProcurementDocuments(1, activeFilterTab, supplierFilter, searchQuery, newLim);
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </div>

              {/* Right Side: Fast Page Navigation, Pills, and Jump Input */}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setPage(1);
                    fetchProcurementDocuments(1, activeFilterTab, supplierFilter, searchQuery, limit);
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
                    fetchProcurementDocuments(prev, activeFilterTab, supplierFilter, searchQuery, limit);
                  }}
                  disabled={page <= 1}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px', fontWeight: 600, fontSize: '11px' }}
                >
                  ◀ Prev
                </button>

                {getPaginationPages().map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                        •••
                      </span>
                    );
                  }
                  const isCur = page === p;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setPage(p);
                        fetchProcurementDocuments(p, activeFilterTab, supplierFilter, searchQuery, limit);
                      }}
                      className={`btn btn-xs ${isCur ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        minWidth: '28px',
                        height: '28px',
                        padding: '0 6px',
                        fontSize: '11px',
                        fontWeight: isCur ? 700 : 500,
                        border: isCur ? 'none' : '1px solid var(--border)',
                        background: isCur ? '#3b82f6' : 'transparent',
                        color: isCur ? '#fff' : 'var(--text-primary)'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    fetchProcurementDocuments(next, activeFilterTab, supplierFilter, searchQuery, limit);
                  }}
                  disabled={page >= totalPages}
                  className="btn btn-xs btn-ghost"
                  style={{ border: '1px solid var(--border)', padding: '4px 8px', fontWeight: 600, fontSize: '11px' }}
                >
                  Next ▶
                </button>

                <button
                  onClick={() => {
                    setPage(totalPages);
                    fetchProcurementDocuments(totalPages, activeFilterTab, supplierFilter, searchQuery, limit);
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
                      fetchProcurementDocuments(targetPage, activeFilterTab, supplierFilter, searchQuery, limit);
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
      {/* BATCH ALLOCATION MODAL (Multiple Items at Once)              */}
      {/* ============================================================ */}
      {batchModalOpen && selectedDocument && createPortal(
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
            maxWidth: '700px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'var(--bg-primary, #ffffff)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  Batch Allocate {selectedLineIds.size} Items from {selectedDocument.document_no}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Supplier: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.vendor_name}</strong> • Document: <strong style={{ color: 'var(--text-primary)' }}>{selectedDocument.document_no}</strong>
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setBatchModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitBatchAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg-primary)' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Target Project & Order Selectors */}
                <div style={{ background: 'var(--bg-secondary)', border: '1.5px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                    🎯 Destination Project & Order
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>Target Project *</label>
                      <select
                        className="form-control"
                        style={{ height: '34px', fontSize: '12px', fontWeight: 600, background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        value={batchProjectId}
                        onChange={(e) => {
                          setBatchProjectId(e.target.value);
                          setBatchOrderId('');
                        }}
                        required
                      >
                        <option value="">-- Select Destination Project --</option>
                        {Object.values(projects || {}).map(p => (
                          <option key={p.key || p.id} value={p.id ? String(p.id) : (p.key || '')}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>Target Order (Optional)</label>
                      <select
                        className="form-control"
                        style={{ height: '34px', fontSize: '12px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        value={batchOrderId}
                        onChange={(e) => setBatchOrderId(e.target.value)}
                        disabled={!batchProjectId}
                      >
                        <option value="">-- General Project Allocation --</option>
                        {(() => {
                          const proj = Object.values(projects || {}).find(p => String(p.id) === String(batchProjectId) || p.key === batchProjectId || p.name === batchProjectId);
                          return (proj?.orders || []).map(o => (
                            <option key={o.id || o.dbId} value={o.id || o.dbId}>{o.quoteName || o.quote_name || `Order #${o.id || o.dbId}`}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Being Allocated List */}
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Items to be Allocated ({selectedLineIds.size}):
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card, #ffffff)' }}>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>SKU</th>
                          <th style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>Description</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-primary)' }}>Qty</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedDocument.lines || []).filter(l => selectedLineIds.has(l.id)).map(l => (
                          <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{l.item_code}</td>
                            <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.item_description}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{l.unallocated_qty}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-primary)' }}>R {l.unit_cost?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ETA & Notes Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>
                      ETA / Delivery Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ height: '34px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      value={batchEta}
                      onChange={(e) => setBatchEta(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>
                      Internal Allocation Note (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Master Bedroom track & drivers, Phase 1 installation..."
                      className="form-control"
                      style={{ height: '34px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      value={batchNotes}
                      onChange={(e) => setBatchNotes(e.target.value)}
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
                  Confirm Batch Allocation ({selectedLineIds.size} items)
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* SINGLE ITEM ALLOCATION MODAL                                 */}
      {/* ============================================================ */}
      {allocModalOpen && allocTargetItem && createPortal(
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
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'var(--bg-primary, #ffffff)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border)', 
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#3b82f6" />
                  Allocate {allocTargetItem.doc_type} Line to Project Order
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Document: <strong style={{ color: 'var(--text-primary)' }}>{allocTargetItem.document_no}</strong> • Vendor: <strong style={{ color: 'var(--text-primary)' }}>{allocTargetItem.vendor_name}</strong>
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setAllocModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitSingleAllocation} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg-primary)' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* SKU Info Card */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Selected SKU</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {allocTargetItem.item_code}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {allocTargetItem.item_description || 'No description'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Available to Allocate</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b' }}>
                        {allocTargetItem.unallocated_qty} <span style={{ fontSize: '10px' }}>{allocTargetItem.item_unit}</span>
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                        Total: {allocTargetItem.total_qty}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Unit Cost (ERP)</div>
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
                              background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
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
                                Fitting Code: <strong style={{ color: 'var(--text-primary)' }}>{cand.fitting_code}</strong> {cand.area ? `• Area: ${cand.area}` : ''}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: cand.remaining_needed > 0 ? '#f59e0b' : '#10b981' }}>
                                {cand.remaining_needed > 0 ? `Needs: ${cand.remaining_needed} units` : 'Already Fulfilled'}
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
                        fontWeight: 700, 
                        color: selectedCandidateKey === 'MANUAL' ? '#3b82f6' : 'var(--text-primary)',
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-primary)', marginBottom: '3px', fontWeight: 700 }}>Project</label>
                          <select
                            className="form-control"
                            style={{ height: '32px', fontSize: '11.5px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            value={manualProjectId}
                            onChange={(e) => {
                              setManualProjectId(e.target.value);
                              setManualOrderId('');
                            }}
                          >
                            <option value="">-- Select Target Project --</option>
                            {Object.values(projects || {}).map(p => (
                              <option key={p.key || p.id} value={p.id ? String(p.id) : (p.key || '')}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-primary)', marginBottom: '3px', fontWeight: 700 }}>Order (Optional)</label>
                          <select
                            className="form-control"
                            style={{ height: '32px', fontSize: '11.5px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            value={manualOrderId}
                            onChange={(e) => setManualOrderId(e.target.value)}
                            disabled={!manualProjectId}
                          >
                            <option value="">-- General Project Allocation --</option>
                            {(() => {
                              const proj = Object.values(projects || {}).find(p => String(p.id) === String(manualProjectId) || p.key === manualProjectId || p.name === manualProjectId);
                              return (proj?.orders || []).map(o => (
                                <option key={o.id || o.dbId} value={o.id || o.dbId}>{o.quoteName || o.quote_name || `Order #${o.id || o.dbId}`}</option>
                              ));
                            })()}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity, ETA & Notes Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '130px 160px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>
                      Quantity to Allocate
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        max={allocTargetItem.unallocated_qty || 1}
                        step="any"
                        className="form-control"
                        style={{ height: '34px', fontSize: '13px', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
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
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>
                      ETA / Delivery Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ height: '34px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      value={allocEta}
                      onChange={(e) => setAllocEta(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 700 }}>
                      Internal Notes / Ref (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Phase 1 delivery..."
                      className="form-control"
                      style={{ height: '34px', fontSize: '11.5px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      value={allocNotes}
                      onChange={(e) => setAllocNotes(e.target.value)}
                    />
                  </div>
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
                    className="btn btn-sm btn-primary" 
                    disabled={isSavingAlloc}
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
                    Doc: <strong style={{ color: 'var(--text-primary)' }}>{issueTargetItem.document_no}</strong> {issueTargetItem.item_code ? `(SKU: ${issueTargetItem.item_code})` : ''}
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
                  <option value="Quantity / Spec Discrepancy">Quantity / Spec Discrepancy</option>
                  <option value="Requires PM Review">Requires PM / Estimator Review</option>
                  <option value="Duplicate Order Item">Duplicate Order Item</option>
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
                  placeholder="Describe why this document / item cannot be matched or what information is needed..."
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

      {/* ============================================================ */}
      {/* SMART BULK PO ALLOCATION WIZARD MODAL (OPTION A)              */}
      {/* ============================================================ */}
      {isBulkWizardOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div className="card" style={{
            width: '96vw',
            maxWidth: '1280px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'var(--bg-primary, #ffffff)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                    color: '#fff', 
                    padding: '4px 10px', 
                    borderRadius: '8px',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <Sparkles size={14} /> Smart Wizard
                  </span>
                  Bulk Purchase Order Auto-Allocation
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Pre-matches POs to projects using Palladium references and sets default ETAs. Review, cross-check, or edit any project assignment and delivery ETA before committing.
                </p>
              </div>

              <button 
                className="btn btn-ghost" 
                style={{ padding: '6px' }} 
                onClick={() => !isSubmittingWizard && setIsBulkWizardOpen(false)}
                disabled={isSubmittingWizard}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter & Toolbar */}
            <div style={{
              padding: '12px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setWizardFilterTab('ALL')}
                  className="btn btn-xs"
                  style={{
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontWeight: wizardFilterTab === 'ALL' ? 700 : 500,
                    background: wizardFilterTab === 'ALL' ? 'var(--text-primary)' : 'var(--bg-secondary)',
                    color: wizardFilterTab === 'ALL' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  All Unallocated ({wizardData.length})
                </button>

                <button
                  onClick={() => setWizardFilterTab('READY')}
                  className="btn btn-xs"
                  style={{
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontWeight: wizardFilterTab === 'READY' ? 700 : 500,
                    background: wizardFilterTab === 'READY' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                    color: wizardFilterTab === 'READY' ? '#10b981' : 'var(--text-secondary)',
                    border: wizardFilterTab === 'READY' ? '1px solid #10b981' : '1px solid var(--border)'
                  }}
                >
                  Auto-Matched Ready ({wizardData.filter(d => d.match_confidence === 'HIGH' || d.match_confidence === 'MEDIUM').length})
                </button>

                <button
                  onClick={() => setWizardFilterTab('REVIEW')}
                  className="btn btn-xs"
                  style={{
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontWeight: wizardFilterTab === 'REVIEW' ? 700 : 500,
                    background: wizardFilterTab === 'REVIEW' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                    color: wizardFilterTab === 'REVIEW' ? '#f59e0b' : 'var(--text-secondary)',
                    border: wizardFilterTab === 'REVIEW' ? '1px solid #f59e0b' : '1px solid var(--border)'
                  }}
                >
                  Needs Project Review ({wizardData.filter(d => d.match_confidence === 'UNMATCHED').length})
                </button>
              </div>

              {/* Search & Bulk Selection Controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    value={wizardSearchQuery}
                    onChange={(e) => setWizardSearchQuery(e.target.value)}
                    placeholder="Search PO #, supplier, ref..."
                    className="input"
                    style={{ paddingLeft: '30px', height: '32px', fontSize: '12px', width: '100%', borderRadius: '8px' }}
                  />
                </div>

                <button
                  onClick={() => {
                    const filtered = wizardData.filter(d => {
                      if (wizardFilterTab === 'READY' && d.match_confidence !== 'HIGH' && d.match_confidence !== 'MEDIUM') return false;
                      if (wizardFilterTab === 'REVIEW' && d.match_confidence !== 'UNMATCHED') return false;
                      if (wizardSearchQuery.trim()) {
                        const q = wizardSearchQuery.toLowerCase();
                        const docNo = (d.document_no || '').toLowerCase();
                        const sup = (d.vendor_name || '').toLowerCase();
                        const ref = (d.po_reference || '').toLowerCase();
                        const proj = (d.detected_project_name || '').toLowerCase();
                        if (!docNo.includes(q) && !sup.includes(q) && !ref.includes(q) && !proj.includes(q)) return false;
                      }
                      return true;
                    });
                    const next = new Set(wizardSelectedDocNos);
                    filtered.forEach(d => next.add(d.document_no));
                    setWizardSelectedDocNos(next);
                  }}
                  className="btn btn-xs"
                  style={{ height: '32px', padding: '0 10px', fontSize: '11px', border: '1px solid var(--border)' }}
                >
                  Select All Filtered
                </button>

                <button
                  onClick={() => {
                    const filtered = wizardData.filter(d => {
                      if (wizardFilterTab === 'READY' && d.match_confidence !== 'HIGH' && d.match_confidence !== 'MEDIUM') return false;
                      if (wizardFilterTab === 'REVIEW' && d.match_confidence !== 'UNMATCHED') return false;
                      if (wizardSearchQuery.trim()) {
                        const q = wizardSearchQuery.toLowerCase();
                        const docNo = (d.document_no || '').toLowerCase();
                        const sup = (d.vendor_name || '').toLowerCase();
                        const ref = (d.po_reference || '').toLowerCase();
                        const proj = (d.detected_project_name || '').toLowerCase();
                        if (!docNo.includes(q) && !sup.includes(q) && !ref.includes(q) && !proj.includes(q)) return false;
                      }
                      return true;
                    });
                    const next = new Set(wizardSelectedDocNos);
                    filtered.forEach(d => next.delete(d.document_no));
                    setWizardSelectedDocNos(next);
                  }}
                  className="btn btn-xs btn-ghost"
                  style={{ height: '32px', padding: '0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Main Table Area */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
              {isLoadingWizard ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <RefreshCw size={24} className="animate-spin" color="#6366f1" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Scanning unallocated purchase orders and matching to projects...</span>
                </div>
              ) : (() => {
                const filteredDocs = wizardData.filter(d => {
                  if (wizardFilterTab === 'READY' && d.match_confidence !== 'HIGH' && d.match_confidence !== 'MEDIUM') return false;
                  if (wizardFilterTab === 'REVIEW' && d.match_confidence !== 'UNMATCHED') return false;
                  if (wizardSearchQuery.trim()) {
                    const q = wizardSearchQuery.toLowerCase();
                    const docNo = (d.document_no || '').toLowerCase();
                    const sup = (d.vendor_name || '').toLowerCase();
                    const ref = (d.po_reference || '').toLowerCase();
                    const proj = (d.detected_project_name || '').toLowerCase();
                    if (!docNo.includes(q) && !sup.includes(q) && !ref.includes(q) && !proj.includes(q)) return false;
                  }
                  return true;
                });

                if (filteredDocs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '10px' }} />
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>No purchase orders match this filter.</div>
                    </div>
                  );
                }

                // Sort filtered documents
                const sortedDocs = [...filteredDocs].sort((a, b) => {
                  if (!wizardSortField) return 0;
                  let valA = '';
                  let valB = '';

                  if (wizardSortField === 'document_no') {
                    valA = a.document_no || '';
                    valB = b.document_no || '';
                  } else if (wizardSortField === 'vendor_name') {
                    valA = (a.vendor_name || '').toLowerCase();
                    valB = (b.vendor_name || '').toLowerCase();
                  } else if (wizardSortField === 'po_reference') {
                    valA = (a.po_reference || '').toLowerCase();
                    valB = (b.po_reference || '').toLowerCase();
                  } else if (wizardSortField === 'project') {
                    const overrideA = wizardRowOverrides[a.document_no]?.project_id;
                    const projA = overrideA ? wizardAvailableProjects.find(p => String(p.id) === String(overrideA)) : null;
                    valA = (projA?.name || a.detected_project_name || '').toLowerCase();

                    const overrideB = wizardRowOverrides[b.document_no]?.project_id;
                    const projB = overrideB ? wizardAvailableProjects.find(p => String(p.id) === String(overrideB)) : null;
                    valB = (projB?.name || b.detected_project_name || '').toLowerCase();
                  } else if (wizardSortField === 'order') {
                    const overrideA = wizardRowOverrides[a.document_no]?.order_id;
                    let titleA = a.suggested_order_title || '';
                    if (overrideA) {
                      for (const p of wizardAvailableProjects) {
                        const o = p.orders?.find(ord => String(ord.id) === String(overrideA));
                        if (o) { titleA = o.title || o.po_number || `Order #${o.id}`; break; }
                      }
                    }
                    valA = titleA.toLowerCase();

                    const overrideB = wizardRowOverrides[b.document_no]?.order_id;
                    let titleB = b.suggested_order_title || '';
                    if (overrideB) {
                      for (const p of wizardAvailableProjects) {
                        const o = p.orders?.find(ord => String(ord.id) === String(overrideB));
                        if (o) { titleB = o.title || o.po_number || `Order #${o.id}`; break; }
                      }
                    }
                    valB = titleB.toLowerCase();
                  } else if (wizardSortField === 'eta') {
                    valA = wizardRowOverrides[a.document_no]?.eta || a.default_eta || '';
                    valB = wizardRowOverrides[b.document_no]?.eta || b.default_eta || '';
                  } else if (wizardSortField === 'status') {
                    const rank = { HIGH: 1, MEDIUM: 2, UNMATCHED: 3 };
                    valA = rank[a.match_confidence] || 4;
                    valB = rank[b.match_confidence] || 4;
                  }

                  if (valA < valB) return wizardSortDirection === 'asc' ? -1 : 1;
                  if (valA > valB) return wizardSortDirection === 'asc' ? 1 : -1;
                  return 0;
                });

                return (
                  <table className="table" style={{ width: '100%', margin: 0, fontSize: '12px', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center', padding: '10px 4px' }}>
                          <input
                            type="checkbox"
                            checked={sortedDocs.length > 0 && sortedDocs.every(d => wizardSelectedDocNos.has(d.document_no))}
                            onChange={() => {
                              const allSelected = sortedDocs.every(d => wizardSelectedDocNos.has(d.document_no));
                              const next = new Set(wizardSelectedDocNos);
                              sortedDocs.forEach(d => {
                                if (allSelected) next.delete(d.document_no);
                                else next.add(d.document_no);
                              });
                              setWizardSelectedDocNos(next);
                            }}
                            title="Select/Deselect All Filtered"
                          />
                        </th>
                        <th 
                          onClick={() => handleWizardSort('document_no')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '130px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by PO Document #"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            PO Document {renderWizardSortIcon('document_no')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('vendor_name')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '160px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by Supplier"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Supplier {renderWizardSortIcon('vendor_name')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('po_reference')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '220px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by PO Reference"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            PO Reference (Palladium) {renderWizardSortIcon('po_reference')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('project')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, minWidth: '220px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by Destination Project"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Destination Project {renderWizardSortIcon('project')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('order')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '160px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by Destination Order"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Destination Order {renderWizardSortIcon('order')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('eta')}
                          style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, width: '140px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by Delivery ETA"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Delivery ETA {renderWizardSortIcon('eta')}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleWizardSort('status')}
                          style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, width: '130px', cursor: 'pointer', userSelect: 'none' }}
                          title="Click to sort by Match Status"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                            Match Status {renderWizardSortIcon('status')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDocs.map((d) => {
                        const isSelected = wizardSelectedDocNos.has(d.document_no);
                        const isExpanded = wizardExpandedDocNos.has(d.document_no);
                        const override = wizardRowOverrides[d.document_no] || {};
                        const activeProjId = override.project_id !== undefined ? override.project_id : (d.detected_project_id ? String(d.detected_project_id) : '');
                        const activeOrderId = override.order_id !== undefined ? override.order_id : (d.suggested_order_id ? String(d.suggested_order_id) : '');
                        const activeEta = override.eta !== undefined ? override.eta : (d.default_eta || '');

                        const selectedProj = wizardAvailableProjects.find(p => String(p.id) === String(activeProjId));
                        const projectOrders = selectedProj?.orders || [];

                        return (
                          <React.Fragment key={d.document_no}>
                            <tr style={{
                              borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.05)' : (isExpanded ? 'rgba(99, 102, 241, 0.02)' : 'transparent'),
                              transition: 'background 0.15s ease'
                            }}>
                              {/* Checkbox */}
                              <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleWizardSelect(d.document_no)}
                                />
                              </td>

                              {/* PO Document & Date */}
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                  {d.document_no}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  {d.transaction_date || '—'}
                                </div>
                              </td>

                              {/* Supplier & Value */}
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                  {d.vendor_name}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                  R {d.total_value?.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                </div>
                              </td>

                              {/* PO Reference */}
                              <td style={{ padding: '8px 12px' }}>
                                {d.po_reference ? (
                                  <div style={{
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    lineHeight: 1.3
                                  }} title={d.po_reference}>
                                    {d.po_reference}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '11px' }}>None</span>
                                )}
                              </td>

                              {/* Destination Project Dropdown */}
                              <td style={{ padding: '8px 12px' }}>
                                <select
                                  value={activeProjId}
                                  onChange={(e) => handleWizardRowChange(d.document_no, 'project_id', e.target.value)}
                                  className="select"
                                  style={{
                                    width: '100%',
                                    fontSize: '11.5px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: activeProjId ? (d.match_confidence === 'HIGH' ? '1px solid #10b981' : '1px solid #3b82f6') : '1.5px solid #f59e0b',
                                    background: activeProjId ? 'transparent' : 'rgba(245, 158, 11, 0.08)',
                                    fontWeight: activeProjId ? 600 : 400
                                  }}
                                >
                                  <option value="">-- Select Destination Project --</option>
                                  {wizardAvailableProjects.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.project_key ? `(${p.project_key})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Destination Order Dropdown */}
                              <td style={{ padding: '8px 12px' }}>
                                <select
                                  value={activeOrderId}
                                  onChange={(e) => handleWizardRowChange(d.document_no, 'order_id', e.target.value)}
                                  className="select"
                                  disabled={!activeProjId || projectOrders.length === 0}
                                  style={{
                                    width: '100%',
                                    fontSize: '11.5px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                  }}
                                >
                                  {projectOrders.length === 0 ? (
                                    <option value="">{activeProjId ? 'Primary Project Order' : 'Select project first'}</option>
                                  ) : (
                                    projectOrders.map(o => (
                                      <option key={o.id} value={o.id}>
                                        {o.title || o.po_number || `Order #${o.id}`}
                                      </option>
                                    ))
                                  )}
                                </select>
                              </td>

                              {/* Delivery ETA Input */}
                              <td style={{ padding: '8px 12px' }}>
                                <input
                                  type="date"
                                  value={activeEta}
                                  onChange={(e) => handleWizardRowChange(d.document_no, 'eta', e.target.value)}
                                  className="input"
                                  style={{
                                    fontSize: '11.5px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    padding: '0 8px',
                                    width: '135px',
                                    border: '1px solid var(--border)'
                                  }}
                                  title="Delivery ETA (defaults to Palladium Date Required)"
                                />
                              </td>

                              {/* Match Status & Items Toggle */}
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    background: d.match_confidence === 'HIGH' ? 'rgba(16, 185, 129, 0.15)' : (d.match_confidence === 'MEDIUM' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                    color: d.match_confidence === 'HIGH' ? '#10b981' : (d.match_confidence === 'MEDIUM' ? '#3b82f6' : '#f59e0b'),
                                    border: `1px solid ${d.match_confidence === 'HIGH' ? 'rgba(16, 185, 129, 0.3)' : (d.match_confidence === 'MEDIUM' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {d.match_confidence === 'HIGH' ? '✓ Ready' : (d.match_confidence === 'MEDIUM' ? '⚡ Med' : '⚠ Review')}
                                  </span>

                                  <button
                                    onClick={() => {
                                      const next = new Set(wizardExpandedDocNos);
                                      if (next.has(d.document_no)) next.delete(d.document_no);
                                      else next.add(d.document_no);
                                      setWizardExpandedDocNos(next);
                                    }}
                                    className="btn btn-ghost"
                                    style={{ padding: '3px 5px', fontSize: '10.5px', color: 'var(--text-secondary)' }}
                                    title="Toggle line items"
                                  >
                                    {d.lines?.length || 0} items {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Sub-row with Line Items Preview */}
                            {isExpanded && (
                              <tr style={{ background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--border)' }}>
                                <td colSpan={8} style={{ padding: '8px 20px 12px 48px' }}>
                                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                      Line Items in {d.document_no} ({d.lines?.length || 0} items, {d.unallocated_lines_count} unallocated):
                                    </div>
                                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                      <thead>
                                        <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                          <th style={{ padding: '4px 8px' }}>Item Code</th>
                                          <th style={{ padding: '4px 8px' }}>Description</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'center' }}>Unallocated Qty</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Unit Cost</th>
                                          <th style={{ padding: '4px 8px', textAlign: 'right' }}>Line Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(d.lines || []).map((l, lIdx) => (
                                          <tr key={lIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{l.item_code}</td>
                                            <td style={{ padding: '4px 8px', color: 'var(--text-secondary)' }}>{l.item_description}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{l.unallocated_qty}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>R {l.unit_cost?.toFixed(2)}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>R {l.total_value?.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ 
                  background: 'var(--text-primary)', 
                  color: 'var(--bg-primary)', 
                  fontWeight: 800, 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  {wizardSelectedDocNos.size} POs selected
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {isSubmittingWizard ? wizardSubmitProgress : 'Cross-check detected projects and ETAs above, then approve to allocate.'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => setIsBulkWizardOpen(false)}
                  disabled={isSubmittingWizard}
                  className="btn btn-sm btn-ghost"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecuteBulkWizard}
                  disabled={isSubmittingWizard || wizardSelectedDocNos.size === 0}
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    padding: '7px 18px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                    cursor: (isSubmittingWizard || wizardSelectedDocNos.size === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isSubmittingWizard || wizardSelectedDocNos.size === 0) ? 0.6 : 1
                  }}
                >
                  {isSubmittingWizard ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Allocating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Approve & Bulk Allocate ({wizardSelectedDocNos.size} POs)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
