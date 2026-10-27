import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import {
  Truck, ClipboardList, FileText, Plus, Printer,
  ArrowLeft, Search, CheckCircle2, AlertCircle, Eye, Trash2,
  Package, Layers, Filter, Check, Clock, Box, Sparkles, X, ChevronDown, ChevronRight,
  Tag, Settings, Link2, Split, MoreVertical, Upload, FileCheck, Ban, Edit3, MapPin, Phone, User
} from 'lucide-react';
import LabelTemplateModal from '../components/logistics/LabelTemplateModal';
import PackingListLabelPrinterModal from '../components/logistics/PackingListLabelPrinterModal';
import AttachAccessoryModal from '../components/logistics/AttachAccessoryModal';
import { DEFAULT_LABEL_TEMPLATES } from '../utils/labelGenerator';
import { API_BASE } from '../api_config';

const LABEL_TEMPLATES_STORAGE_KEY = 'oto_custom_label_templates';

export default function LogisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, refreshProjects, getModuleName } = useStore();

  // Search & ledger navigation state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);

  // Grouping and Filtering states
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'PL' | 'DN' | 'PENDING'
  const [groupingMode, setGroupingMode] = useState('none'); // 'none' | 'project'
  const [filterPm, setFilterPm] = useState('All');
  const [collapsedProjects, setCollapsedProjects] = useState({});

  // Modal display states
  const [showPlModal, setShowPlModal] = useState(false);
  const [editingPlDoc, setEditingPlDoc] = useState(null);
  const [showDnModal, setShowDnModal] = useState(false);
  const [plOrderSearchQuery, setPlOrderSearchQuery] = useState('');
  const [plOrderDropdownOpen, setPlOrderDropdownOpen] = useState(false);
  const [dnOrderSearchQuery, setDnOrderSearchQuery] = useState('');
  const [dnOrderDropdownOpen, setDnOrderDropdownOpen] = useState(false);
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);

  // Label Printing Engine States
  const [showLabelPrinterModal, setShowLabelPrinterModal] = useState(false);
  const [showLabelTemplateModal, setShowLabelTemplateModal] = useState(false);
  const [labelTargetDoc, setLabelTargetDoc] = useState(null);
  const [labelTemplates, setLabelTemplates] = useState(() => {
    try {
      const cached = localStorage.getItem(LABEL_TEMPLATES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(t => Array.isArray(t.fields) && t.fields.length > 0)) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_LABEL_TEMPLATES;
  });

  // Load custom label templates from Cloud SQL on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/logistics/label-templates`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && Array.isArray(data.templates) && data.templates.length > 0) {
          const valid = data.templates.filter(t => Array.isArray(t.fields || t.elements) && (t.fields || t.elements).length > 0).map(t => ({
            ...t,
            fields: t.fields || t.elements || [],
          }));
          if (valid.length > 0) {
            setLabelTemplates(valid);
            try {
              localStorage.setItem(LABEL_TEMPLATES_STORAGE_KEY, JSON.stringify(valid));
            } catch (e) {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveTemplates = (newTemplates) => {
    setLabelTemplates(newTemplates);
    try {
      localStorage.setItem(LABEL_TEMPLATES_STORAGE_KEY, JSON.stringify(newTemplates));
    } catch (e) {}
    fetch(`${API_BASE}/api/logistics/label-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: newTemplates }),
    }).catch(err => console.error('Failed to save label templates to Cloud SQL:', err));
  };

  const handleOpenLabelPrinter = (doc) => {
    if (!doc) return;
    setLabelTargetDoc(doc);
    setShowLabelPrinterModal(true);
  };

  // 250ms search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Gather all orders with clean, human-readable Project Names and Clients
  const allOrders = useMemo(() => {
    return Object.entries(projects || {}).flatMap(([pKey, p]) => {
      const rawName = (p?.name || '').trim();
      const client = (p?.client || p?.client_name || p?.clientCompany || '').trim();
      let cleanProjName = rawName;
      if (!rawName || /^\d+$/.test(rawName)) {
        cleanProjName = client ? `${client} (Project #${rawName || pKey})` : `Project #${rawName || pKey}`;
      }
      return ((p && p.orders) || []).map(o => ({
        ...o,
        projectKey: p.key || p.project_key || pKey,
        projectName: cleanProjName,
        projectClient: client,
        projectPm: p.pm || p.pm_name || o.pmName || '',
        projectLocation: p.location || p.deliveryAddress || '',
        projectPhone: p.phone || p.clientPhone || '',
      }));
    });
  }, [projects]);

  // Read filter routing parameter state on mount (including quick create actions from OrdersPage)
  useEffect(() => {
    if (location.state?.filterOrderId) {
      setSearchQuery(location.state.filterOrderId);
    }
    if (location.state?.openDocId) {
      setSelectedDocId(location.state.openDocId);
      if (location.state?.projectKey) {
        setSelectedProjectKey(location.state.projectKey);
      }
    }
    if (location.state?.createPlForOrder && location.state?.projectKey) {
      const key = `${location.state.projectKey}:::${location.state.createPlForOrder}`;
      handleOpenPlModal(key);
    } else if (location.state?.createDnForOrder && location.state?.projectKey) {
      const key = `${location.state.projectKey}:::${location.state.createDnForOrder}`;
      handleOpenDnModal(key);
    }
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Gather all issued documents (Packing Lists and Delivery Notes) across all orders
  const allDocs = useMemo(() => {
    const docs = [];
    allOrders.forEach(order => {
      (order.packingLists || []).forEach(pl => {
        const linkedDn = pl.delivery_note_number || pl.deliveryNoteId || '';
        const normalizedItems = (pl.items || []).map(it => ({
          ...it,
          one_one_code: it.one_one_code || '',
          code: it.code || it.one_one_code || '',
          plan_code: it.plan_code || it.type || '',
          supplier_code: it.supplier_code || it.code || '',
          material_colour: it.material_colour || it.materialColour || it.brand || '—',
          first_fix: it.first_fix || it.firstFix || 'No',
          red_list: it.red_list || it.redList || 'No',
          box_number: it.box_number || it.box || it.boxNumber || 'Box 1',
          boxNumber: it.box_number || it.box || it.boxNumber || 'Box 1',
          qty_packed: Number(it.qty_packed ?? it.qtyDelivered ?? it.qty ?? 0),
          qtyDelivered: Number(it.qty_packed ?? it.qtyDelivered ?? it.qty ?? 0),
          qty_ordered: Number(it.qty_ordered ?? it.qtyOrdered ?? 0),
          qty_backorder: Number(it.qty_backorder ?? Math.max(0, Number(it.qty_ordered ?? it.qtyOrdered ?? 0) - Number(it.qty_packed ?? it.qtyDelivered ?? 0))),
        }));
        docs.push({
          ...pl,
          id: pl.id || pl.document_number,
          type: 'packing_list',
          deliveryNoteId: linkedDn,
          status: pl.status || (linkedDn ? 'Dispatched' : 'Pending Dispatch'),
          orderId: order.id,
          projectKey: order.projectKey,
          projectName: order.projectName,
          projectClient: order.projectClient,
          supplier: order.supplier,
          projectPm: order.projectPm,
          orderObj: order,
          items: normalizedItems,
        });
      });

      (order.deliveryNotes || []).forEach(dn => {
        const normalizedItems = (dn.items || []).map(it => ({
          ...it,
          one_one_code: it.one_one_code || '',
          code: it.code || it.one_one_code || '',
          plan_code: it.plan_code || it.type || '',
          supplier_code: it.supplier_code || it.code || '',
          material_colour: it.material_colour || it.materialColour || it.brand || '—',
          first_fix: it.first_fix || it.firstFix || 'No',
          red_list: it.red_list || it.redList || 'No',
          box_number: it.box_number || it.box || it.boxNumber || 'Box 1',
          boxNumber: it.box_number || it.box || it.boxNumber || 'Box 1',
          qty_delivered: Number(it.qty_delivered ?? it.qtyDelivered ?? it.qty ?? 0),
          qtyDelivered: Number(it.qty_delivered ?? it.qtyDelivered ?? it.qty ?? 0),
          qty_ordered: Number(it.qty_ordered ?? it.qtyOrdered ?? 0),
          qty_remaining: Number(it.qty_remaining ?? 0),
          backorder_eta: it.backorder_eta || it.etaBackOrder || '',
        }));
        docs.push({
          ...dn,
          id: dn.id || dn.document_number,
          type: 'delivery_note',
          status: dn.status || 'Dispatched',
          packingListIds: dn.source_packing_lists || dn.packingListIds || [],
          orderId: order.id,
          projectKey: order.projectKey,
          projectName: order.projectName,
          projectClient: order.projectClient,
          supplier: order.supplier,
          projectPm: order.projectPm,
          orderObj: order,
          items: normalizedItems,
        });
      });
    });
    docs.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    return docs;
  }, [allOrders]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const plDocs = allDocs.filter(d => d.type === 'packing_list' && d.status !== 'Cancelled');
    const dnDocs = allDocs.filter(d => d.type === 'delivery_note' && d.status !== 'Cancelled');
    const pendingPls = plDocs.filter(d => !d.deliveryNoteId && d.status === 'Pending Dispatch');

    let totalDispatchedUnits = 0;
    dnDocs.forEach(dn => {
      (dn.items || []).forEach(it => {
        totalDispatchedUnits += Number(it.qtyDelivered) || 0;
      });
    });

    const activeProjectKeys = new Set(allDocs.map(d => d.projectKey).filter(Boolean));

    return {
      totalPlCount: plDocs.length,
      totalDnCount: dnDocs.length,
      pendingPlCount: pendingPls.length,
      totalDispatchedUnits,
      activeProjectsCount: activeProjectKeys.size,
    };
  }, [allDocs]);

  // Unique PMs
  const uniquePms = useMemo(() => {
    const set = new Set();
    Object.values(projects || {}).forEach(p => {
      if (p.pm && p.pm.trim()) set.add(p.pm.trim());
    });
    allOrders.forEach(o => {
      if (o.pmName && o.pmName.trim()) set.add(o.pmName.trim());
    });
    return Array.from(set).sort();
  }, [projects, allOrders]);

  // Filtered documents for ledger
  const filteredDocs = useMemo(() => {
    return allDocs.filter(doc => {
      if (activeFilterTab === 'PL' && doc.type !== 'packing_list') return false;
      if (activeFilterTab === 'DN' && doc.type !== 'delivery_note') return false;
      if (activeFilterTab === 'PENDING' && (doc.type !== 'packing_list' || doc.deliveryNoteId || doc.status === 'Cancelled')) return false;

      if (filterPm !== 'All' && (!doc.projectPm || doc.projectPm.trim().toLowerCase() !== filterPm.trim().toLowerCase())) {
        return false;
      }

      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return true;

      const searchTokens = q.split(/\s+/);
      return searchTokens.every(token => {
        const idMatch = (doc.id || '').toLowerCase().includes(token);
        const projectMatch = (doc.projectName || '').toLowerCase().includes(token);
        const orderMatch = (doc.orderId || '').toLowerCase().includes(token);
        const clientMatch = (doc.projectClient || '').toLowerCase().includes(token);
        const itemMatch = (doc.items || []).some(
          item =>
            (item.code || '').toLowerCase().includes(token) ||
            (item.plan_code || '').toLowerCase().includes(token) ||
            (item.supplier_code || '').toLowerCase().includes(token) ||
            (item.description || '').toLowerCase().includes(token)
        );
        return idMatch || projectMatch || orderMatch || clientMatch || itemMatch;
      });
    });
  }, [allDocs, activeFilterTab, filterPm, debouncedSearch]);

  const activeDoc = useMemo(() => {
    return allDocs.find(d => d.id === selectedDocId) || null;
  }, [allDocs, selectedDocId]);

  // ─── PACKING LIST CREATION / EDITING STATE & HANDLERS ──────────────────────

  const [plOrderKey, setPlOrderKey] = useState(''); // "projectKey:::orderId"
  const [plNotes, setPlNotes] = useState('');
  const [plRows, setPlRows] = useState([]); // Flat list of packing rows (supports box splits & attached accessories)
  const [isLoadingPlItems, setIsLoadingPlItems] = useState(false);
  const [plFilterFloor, setPlFilterFloor] = useState('ALL');
  const [plFilterArea, setPlFilterArea] = useState('ALL');
  const [plAvailableBoxes, setPlAvailableBoxes] = useState(['Box 1', 'Box 2', 'Box 3']);
  const [plActiveBox, setPlActiveBox] = useState('Box 1');
  const [plSelectedRowKeys, setPlSelectedRowKeys] = useState({});
  const [attachModalTargetRow, setAttachModalTargetRow] = useState(null);
  const [activeOptionsRowKey, setActiveOptionsRowKey] = useState(null);

  const loadOrderItemsForPl = async (compositeKey, existingPlDoc = null) => {
    setPlOrderKey(compositeKey);
    setPlOrderDropdownOpen(false);
    setPlFilterFloor('ALL');
    setPlFilterArea('ALL');
    setPlSelectedRowKeys({});

    if (!compositeKey) {
      setPlRows([]);
      return;
    }

    const [pKey, oId] = compositeKey.split(':::');

    // 1. If editing an existing PL, immediately load its saved rows
    if (existingPlDoc && Array.isArray(existingPlDoc.items) && existingPlDoc.items.length > 0) {
      const boxesSet = new Set(['Box 1', 'Box 2', 'Box 3']);
      const itemIdCounts = {};
      const editRows = existingPlDoc.items.map((it, idx) => {
        const b = it.box_number || it.boxNumber || 'Box 1';
        boxesSet.add(b);
        const oiId = String(it.order_item_id || `item_${idx}`);
        itemIdCounts[oiId] = (itemIdCounts[oiId] || 0) + 1;
        const isSplit = !it.is_accessory && !it.parent_item_id && itemIdCounts[oiId] > 1;
        return {
          rowKey: `row_${oiId}_${idx}`,
          order_item_id: oiId,
          parent_item_id: it.parent_item_id ? String(it.parent_item_id) : null,
          parent_fitting_code: it.parent_fitting_code || null,
          one_one_code: it.one_one_code || '',
          plan_code: it.plan_code || '',
          supplier_code: it.supplier_code || it.code || '',
          description: it.description || '',
          floor: it.floor || '',
          area: it.area || '',
          material_colour: it.material_colour || '',
          first_fix: it.first_fix || 'No',
          red_list: it.red_list || 'No',
          qty_ordered: Number(it.qty_ordered || 0),
          qty_already_packed: 0,
          remaining_to_pack: Number(it.qty_ordered || it.qty_packed || 0),
          qty_packed: Number(it.qty_packed ?? it.qtyDelivered ?? 0),
          box_number: b,
          is_accessory: !!(it.is_accessory || it.parent_item_id),
          is_split_child: isSplit,
          is_hidden_by_attachment: false,
        };
      });
      setPlAvailableBoxes(Array.from(boxesSet));
      setPlRows(editRows);
      return;
    }

    // 2. Immediately populate from local store order items (0ms instant render so table is never blank)
    const order = allOrders.find(o => (o.projectKey === pKey && o.id === oId) || o.id === oId);
    const localItemsRaw = order ? (order.itemsList || order.items || []) : [];
    const instantRows = localItemsRaw
      .filter(it => (it.itemType || it.item_type) !== 'Service' && !it.is_credit && (it.plan_code || it.type) !== 'SPACER' && (it.description || '').trim() !== '')
      .map((it, idx) => {
        const ordered = Number(it.qty ?? it.quantity ?? 1);
        const oiId = String(it.id || it.order_item_id || `local_${idx}`);
        return {
          rowKey: `row_${oiId}_${idx}`,
          order_item_id: oiId,
          parent_item_id: null,
          parent_fitting_code: null,
          one_one_code: it.oneOneCode || it.one_one_code || '',
          plan_code: it.type || it.plan_code || '',
          supplier_code: it.code || it.supplier_code || it.oneOneCode || '',
          description: it.description || it.name || '',
          floor: it.floor || '',
          area: it.area || '',
          material_colour: it.selection || it.brand || '—',
          first_fix: 'No',
          red_list: 'No',
          qty_ordered: ordered,
          qty_already_packed: 0,
          remaining_to_pack: ordered,
          qty_packed: ordered,
          box_number: 'Box 1',
          is_accessory: false,
          is_split_child: false,
          is_hidden_by_attachment: false,
        };
      });

    if (instantRows.length > 0) {
      setPlRows(instantRows);
    }

    // 3. Fetch enriched catalog metadata (Material/Colour, First Fix, Red List, Remaining Qty) from backend
    setIsLoadingPlItems(true);
    try {
      const excludeParam = existingPlDoc?.db_id ? `&exclude_pl_id=${existingPlDoc.db_id}` : '';
      const res = await fetch(
        `${API_BASE}/api/logistics/order-items/${encodeURIComponent(oId)}?project_key=${encodeURIComponent(pKey)}${excludeParam}`
      );
      if (res.ok) {
        const data = await res.json();
        const apiItems = (data.items || []).filter(it => (it.plan_code || '').trim() !== 'SPACER' && ((it.description || '').trim() !== '' || it.one_one_code || it.supplier_code));
        if (apiItems.length > 0) {
          const allRemainingZero = apiItems.every(it => Number(it.remaining_to_pack || 0) <= 0);
          const builtRows = apiItems.map((it, idx) => {
            const oiId = String(it.order_item_id || `item_${idx}`);
            const ordered = Number(it.qty_ordered || 0);
            const rem = Number(it.remaining_to_pack ?? ordered);
            const defaultPackQty = allRemainingZero ? ordered : rem;
            return {
              rowKey: `row_${oiId}_${idx}`,
              order_item_id: oiId,
              parent_item_id: null,
              parent_fitting_code: null,
              one_one_code: it.one_one_code || '',
              plan_code: it.plan_code || '',
              supplier_code: it.supplier_code || '',
              description: it.description || '',
              floor: it.floor || '',
              area: it.area || '',
              material_colour: it.material_colour || '—',
              first_fix: it.first_fix || 'No',
              red_list: it.red_list || 'No',
              qty_ordered: ordered,
              qty_already_packed: Number(it.qty_already_packed || 0),
              remaining_to_pack: defaultPackQty,
              qty_packed: defaultPackQty,
              box_number: 'Box 1',
              is_accessory: false,
              is_accessory_candidate: !!it.is_accessory_candidate,
              is_split_child: false,
              is_hidden_by_attachment: false,
            };
          });
          setPlRows(builtRows);
        }
      }
    } catch (err) {
      console.warn('Fallback to local store order items for PL:', err);
    } finally {
      setIsLoadingPlItems(false);
    }
  };

  const handleOpenPlModal = (preselectedKey = '', docToEdit = null) => {
    setEditingPlDoc(docToEdit || null);
    setPlNotes(docToEdit?.notes || '');
    setPlOrderSearchQuery('');
    setPlAvailableBoxes(['Box 1', 'Box 2', 'Box 3']);
    setPlActiveBox('Box 1');
    setShowPlModal(true);

    if (docToEdit) {
      const composite = `${docToEdit.projectKey}:::${docToEdit.orderId}`;
      loadOrderItemsForPl(composite, docToEdit);
    } else if (preselectedKey) {
      loadOrderItemsForPl(preselectedKey, null);
    } else {
      setPlOrderKey('');
      setPlRows([]);
    }
  };

  // Dynamic Floor & Area options inside PL Modal
  const plUniqueFloors = useMemo(() => {
    const s = new Set();
    plRows.forEach(r => {
      if (r.floor && r.floor.trim()) s.add(r.floor.trim());
    });
    return Array.from(s).sort();
  }, [plRows]);

  const plUniqueAreas = useMemo(() => {
    const s = new Set();
    plRows.forEach(r => {
      const a = (r.area || '').trim();
      if (a) s.add(a);
    });
    return Array.from(s).sort();
  }, [plRows]);

  // Quick statistics per area for pill badges
  const plAreaItemCounts = useMemo(() => {
    const counts = {};
    plRows.forEach(r => {
      if (r.parent_item_id || r.is_hidden_by_attachment) return;
      const a = (r.area || '').trim() || 'General / Unspecified';
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [plRows]);

  // Filtered PL rows keeping attached accessories directly underneath their parent fitting
  const visiblePlRows = useMemo(() => {
    const mainRows = plRows.filter(r => !r.parent_item_id && !r.is_hidden_by_attachment);
    const attachedRows = plRows.filter(r => !!r.parent_item_id);

    const filteredMains = mainRows.filter(r => {
      if (plFilterFloor !== 'ALL' && (r.floor || '').trim() !== plFilterFloor) return false;
      if (plFilterArea !== 'ALL') {
        const rowArea = (r.area || '').trim() || 'General / Unspecified';
        if (rowArea !== plFilterArea) return false;
      }
      return true;
    });

    const orderedResult = [];
    filteredMains.forEach(main => {
      orderedResult.push(main);
      if (!main.is_split_child) {
        attachedRows
          .filter(att => String(att.parent_item_id) === String(main.order_item_id))
          .forEach(att => orderedResult.push(att));
      }
    });
    return orderedResult;
  }, [plRows, plFilterFloor, plFilterArea]);

  // Add a new Box to the Active Box selector
  const handleAddBoxOption = () => {
    const nextNum = plAvailableBoxes.length + 1;
    const newBoxName = `Box ${nextNum}`;
    if (!plAvailableBoxes.includes(newBoxName)) {
      setPlAvailableBoxes(prev => [...prev, newBoxName]);
    }
    setPlActiveBox(newBoxName);
  };

  // Batch assign checked rows to Active Box
  const handleAssignSelectedToActiveBox = () => {
    const selectedKeys = Object.keys(plSelectedRowKeys).filter(k => plSelectedRowKeys[k]);
    if (selectedKeys.length === 0) {
      alert('Check one or more line items first to assign them to the active box.');
      return;
    }
    setPlRows(prev =>
      prev.map(r => (plSelectedRowKeys[r.rowKey] ? { ...r, box_number: plActiveBox } : r))
    );
    setPlSelectedRowKeys({});
  };

  // Split this item across another box cleanly without errors
  const handleSplitRowAcrossBoxes = (targetRow) => {
    let currentQty = Number(targetRow.qty_packed) || 0;
    
    // Determine split allocation
    let splitQty = 0;
    let remainingQty = currentQty;
    if (currentQty >= 2) {
      splitQty = Math.floor(currentQty / 2);
      remainingQty = currentQty - splitQty;
    } else {
      // For qty 1 or 0, create the split row with 0 packed so packer can set box & qty freely
      splitQty = 0;
      remainingQty = currentQty;
    }

    // Pick or create next box
    const currentBoxNum = parseInt((targetRow.box_number || 'Box 1').replace(/\D/g, ''), 10) || 1;
    const nextBox = `Box ${currentBoxNum + 1}`;
    if (!plAvailableBoxes.includes(nextBox)) {
      setPlAvailableBoxes(prev => [...prev, nextBox]);
    }

    const newSplitRow = {
      ...targetRow,
      rowKey: `split_${targetRow.order_item_id || 'item'}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      qty_packed: splitQty,
      box_number: nextBox,
      is_split_child: true,
      is_hidden_by_attachment: false,
    };

    setPlRows(prev => {
      const idx = prev.findIndex(r => r.rowKey === targetRow.rowKey);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty_packed: remainingQty };
      copy.splice(idx + 1, 0, newSplitRow);
      return copy;
    });
  };

  // Remove a split child row or attached accessory row and restore its quantity back to the main row
  const handleRemoveSubRow = (rowKey) => {
    setPlRows(prev => {
      const target = prev.find(r => r.rowKey === rowKey);
      if (!target) return prev;
      const restoredQty = Number(target.qty_packed) || 0;
      const remaining = prev.filter(r => r.rowKey !== rowKey);

      return remaining.map(r => {
        if (!r.is_accessory && !r.is_split_child && String(r.order_item_id) === String(target.order_item_id)) {
          return {
            ...r,
            qty_packed: (Number(r.qty_packed) || 0) + restoredQty,
            is_hidden_by_attachment: false,
          };
        }
        return r;
      });
    });
  };

  // Confirm accessory attachment from AttachAccessoryModal
  const handleConfirmAccessoryAttachments = (accessoryOrderItemId, builtAttachments, unallocatedRemainder) => {
    setPlRows(prev => {
      // Remove any previous attachments from this same accessory order_item_id
      const withoutOld = prev.filter(
        r => !(r.is_accessory && String(r.order_item_id) === String(accessoryOrderItemId))
      );
      // Update the standalone accessory row's packed qty to whatever remains unattached,
      // and hide the standalone row if 100% of its units are now attached underneath parent fittings
      const remQty = Math.max(0, Number(unallocatedRemainder) || 0);
      const updatedMains = withoutOld.map(r => {
        if (!r.is_accessory && String(r.order_item_id) === String(accessoryOrderItemId)) {
          return {
            ...r,
            qty_packed: remQty,
            is_hidden_by_attachment: remQty === 0 && builtAttachments.length > 0,
          };
        }
        return r;
      });
      return [...updatedMains, ...builtAttachments];
    });
  };

  const handleSavePackingList = async (e) => {
    e.preventDefault();
    if (!plOrderKey) return;
    const [pKey, oId] = plOrderKey.split(':::');

    const activeItems = plRows
      .filter(r => Number(r.qty_packed) > 0)
      .map(r => ({
        order_item_id: r.order_item_id ? String(r.order_item_id) : null,
        parent_item_id: r.parent_item_id ? String(r.parent_item_id) : null,
        parent_fitting_code: r.parent_fitting_code || null,
        one_one_code: r.one_one_code || '',
        plan_code: r.plan_code || '',
        supplier_code: r.supplier_code || '',
        description: r.description || '',
        floor: r.floor || '',
        area: r.area || '',
        material_colour: r.material_colour || '',
        first_fix: r.first_fix || 'No',
        red_list: r.red_list || 'No',
        qty_ordered: Number(r.qty_ordered || 0),
        qty_packed: Number(r.qty_packed || 0),
        qty_backorder: Math.max(0, Number(r.qty_ordered || 0) - Number(r.qty_packed || 0)),
        box_number: r.box_number || 'Box 1',
        is_accessory: !!r.is_accessory,
      }));

    if (activeItems.length === 0) {
      alert('Please specify a Packed Qty greater than 0 for at least one line item.');
      return;
    }

    setIsSavingLogistics(true);
    try {
      const url = editingPlDoc
        ? `${API_BASE}/api/logistics/packing-list/${encodeURIComponent(editingPlDoc.id)}`
        : `${API_BASE}/api/logistics/packing-list`;
      const method = editingPlDoc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: pKey,
          order_id: oId,
          notes: plNotes,
          items: activeItems,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to save Packing List');
      }

      const data = await res.json();
      await refreshProjects();
      setShowPlModal(false);
      setEditingPlDoc(null);
      if (data.packing_list?.id) {
        setSelectedDocId(data.packing_list.id);
        setSelectedProjectKey(pKey);
      }
    } catch (err) {
      alert(`Error saving Packing List: ${err.message}`);
    } finally {
      setIsSavingLogistics(false);
    }
  };

  // ─── DELIVERY NOTE CREATION, POD UPLOAD & VOID HANDLERS ──────────────────

  const [dnOrderKey, setDnOrderKey] = useState(''); // "projectKey:::orderId"
  const [dnMode, setDnMode] = useState('from_pl'); // 'from_pl' (95% standard) | 'quick_direct' (5% emergency)
  const [dnSelectedPlIds, setDnSelectedPlIds] = useState({});
  const [dnDirectItems, setDnDirectItems] = useState([]);
  const [dnItemEtas, setDnItemEtas] = useState({});
  const [dnDispatchMethod, setDnDispatchMethod] = useState('Internal Driver');
  const [dnCarrierDriver, setDnCarrierDriver] = useState('');
  const [dnVehicleReg, setDnVehicleReg] = useState('');
  const [dnTrackingNumber, setDnTrackingNumber] = useState('');
  const [dnDeliveryAddress, setDnDeliveryAddress] = useState('');
  const [dnSiteContactName, setDnSiteContactName] = useState('');
  const [dnSiteContactPhone, setDnSiteContactPhone] = useState('');
  const [dnSiteInstructions, setDnSiteInstructions] = useState('');
  const [dnNotes, setDnNotes] = useState('');

  // POD Upload modal state
  const [showPodModal, setShowPodModal] = useState(false);
  const [podTargetDoc, setPodTargetDoc] = useState(null);
  const [podReceivedBy, setPodReceivedBy] = useState('');
  const [podFileUrl, setPodFileUrl] = useState('');
  const [podFileName, setPodFileName] = useState('');

  const handleDnOrderChange = async (compositeKey) => {
    setDnOrderKey(compositeKey);
    setDnOrderDropdownOpen(false);
    setDnSelectedPlIds({});
    setDnItemEtas({});
    setDnDirectItems([]);

    if (!compositeKey) return;
    const [pKey, oId] = compositeKey.split(':::');
    const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);

    // Pre-fill site contact & address from order/project
    if (order) {
      setDnDeliveryAddress(order.deliveryAddress || order.projectLocation || '');
      setDnSiteContactName(order.clientContact || order.projectClient || '');
      setDnSiteContactPhone(order.clientPhone || order.projectPhone || '');
      // Auto-select all pending Packing Lists for convenience
      const pendingPls = (order.packingLists || []).filter(
        pl => !pl.delivery_note_number && !pl.deliveryNoteId && pl.status !== 'Cancelled'
      );
      const autoCheck = {};
      pendingPls.forEach(pl => {
        autoCheck[pl.id || pl.document_number] = true;
      });
      setDnSelectedPlIds(autoCheck);
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/logistics/order-items/${encodeURIComponent(oId)}?project_key=${encodeURIComponent(pKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.site_address) setDnDeliveryAddress(prev => prev || data.site_address);
        if (data.site_contact_name) setDnSiteContactName(prev => prev || data.site_contact_name);
        if (data.site_contact_phone) setDnSiteContactPhone(prev => prev || data.site_contact_phone);
        setDnDirectItems(
          (data.items || []).map(it => ({
            ...it,
            qty_to_deliver: Number(it.remaining_to_deliver || 0),
            box_number: 'Direct Dispatch',
          }))
        );
      }
    } catch (e) {}
  };

  const handleOpenDnModal = (preselectedKey = '') => {
    setDnMode('from_pl');
    setDnNotes('');
    setDnDispatchMethod('Internal Driver');
    setDnCarrierDriver('');
    setDnVehicleReg('');
    setDnTrackingNumber('');
    setDnDeliveryAddress('');
    setDnSiteContactName('');
    setDnSiteContactPhone('');
    setDnSiteInstructions('');
    setDnOrderSearchQuery('');
    setShowDnModal(true);

    if (preselectedKey) {
      handleDnOrderChange(preselectedKey);
    } else {
      setDnOrderKey('');
      setDnSelectedPlIds({});
      setDnDirectItems([]);
    }
  };

  const getAvailablePls = () => {
    if (!dnOrderKey) return [];
    const [pKey, oId] = dnOrderKey.split(':::');
    const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);
    if (!order) return [];
    return (order.packingLists || []).filter(
      pl => !pl.deliveryNoteId && !pl.delivery_note_number && pl.status !== 'Cancelled'
    );
  };

  const getAggregatedDnItems = () => {
    const availablePls = getAvailablePls();
    const list = [];
    availablePls.forEach(pl => {
      const plId = pl.id || pl.document_number;
      if (dnSelectedPlIds[plId]) {
        (pl.items || []).forEach(pi => {
          list.push({
            ...pi,
            packing_list_number: plId,
            one_one_code: pi.one_one_code || pi.code || '',
            plan_code: pi.plan_code || pi.type || '',
            supplier_code: pi.supplier_code || pi.code || '',
            qtyDelivered: Number(pi.qty_packed ?? pi.qtyDelivered ?? 0),
            boxNumber: pi.box_number || pi.boxNumber || 'Box 1',
          });
        });
      }
    });
    return list;
  };

  const handleSaveDeliveryNote = async (e) => {
    e.preventDefault();
    if (!dnOrderKey) return;
    const [pKey, oId] = dnOrderKey.split(':::');

    const selectedPlNumbers = Object.keys(dnSelectedPlIds).filter(k => dnSelectedPlIds[k]);
    if (dnMode === 'from_pl' && selectedPlNumbers.length === 0) {
      alert('Please select at least one Packing List to generate the Delivery Note.');
      return;
    }

    let directPayloadItems = null;
    if (dnMode === 'quick_direct') {
      const activeDirect = dnDirectItems.filter(it => Number(it.qty_to_deliver) > 0);
      if (activeDirect.length === 0) {
        alert('Please enter a quantity > 0 for at least one item in Quick Direct Delivery mode.');
        return;
      }
      directPayloadItems = activeDirect.map(it => ({
        order_item_id: it.order_item_id,
        one_one_code: it.one_one_code,
        plan_code: it.plan_code,
        supplier_code: it.supplier_code,
        description: it.description,
        floor: it.floor,
        area: it.area,
        material_colour: it.material_colour,
        first_fix: it.first_fix,
        red_list: it.red_list,
        box_number: it.box_number || 'Direct Dispatch',
        qty_ordered: Number(it.qty_ordered || 0),
        qty_delivered: Number(it.qty_to_deliver || 0),
        qty_remaining: Math.max(0, Number(it.remaining_to_deliver || 0) - Number(it.qty_to_deliver || 0)),
        backorder_eta: dnItemEtas[it.order_item_id] || it.eta || '',
      }));
    }

    setIsSavingLogistics(true);
    try {
      const res = await fetch(`${API_BASE}/api/logistics/delivery-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: pKey,
          order_id: oId,
          source_packing_lists: dnMode === 'from_pl' ? selectedPlNumbers : [],
          dispatch_method: dnDispatchMethod,
          carrier_driver: dnCarrierDriver,
          vehicle_reg: dnVehicleReg,
          tracking_number: dnTrackingNumber,
          delivery_address: dnDeliveryAddress,
          site_contact_name: dnSiteContactName,
          site_contact_phone: dnSiteContactPhone,
          site_instructions: dnSiteInstructions,
          notes: dnNotes,
          backorder_etas: dnItemEtas,
          items: directPayloadItems,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate Delivery Note');
      }

      const data = await res.json();
      await refreshProjects();
      setShowDnModal(false);
      if (data.delivery_note?.id) {
        setSelectedDocId(data.delivery_note.id);
        setSelectedProjectKey(pKey);
      }
    } catch (err) {
      alert(`Error creating Delivery Note: ${err.message}`);
    } finally {
      setIsSavingLogistics(false);
    }
  };

  // Void / Cancel a Delivery Note or Delete a Pending Packing List
  const handleVoidOrDeleteDoc = async (doc) => {
    if (!doc) return;

    if (doc.type === 'packing_list') {
      if (doc.deliveryNoteId && doc.status !== 'Pending Dispatch') {
        alert(`Packing List ${doc.id} is linked to Delivery Note ${doc.deliveryNoteId}. Void the Delivery Note first to release this Packing List.`);
        return;
      }
      if (!window.confirm(`Delete Packing List ${doc.id}?`)) return;
      try {
        const res = await fetch(`${API_BASE}/api/logistics/packing-list/${encodeURIComponent(doc.id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Delete failed');
        }
        await refreshProjects();
        if (selectedDocId === doc.id) setSelectedDocId(null);
      } catch (err) {
        alert(err.message);
      }
    } else {
      // Delivery Note -> Full Reversal Void
      const reason = window.prompt(
        `VOID / CANCEL DELIVERY NOTE ${doc.id}\n\nThis will:\n1. Mark ${doc.id} as Cancelled\n2. Release linked Packing Lists (${(doc.packingListIds || []).join(', ') || 'if any'}) back to Pending Dispatch\n3. Reverse delivered quantities on the Order & recalculate Sales Tracker metrics.\n\nEnter reason for voiding:`,
        'Dispatch cancelled / reversed'
      );
      if (reason === null) return;
      try {
        const res = await fetch(`${API_BASE}/api/logistics/delivery-note/${encodeURIComponent(doc.id)}/void`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ void_reason: reason }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Void failed');
        }
        await refreshProjects();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Upload Signed POD handler
  const handleOpenPodModal = (doc) => {
    setPodTargetDoc(doc);
    setPodReceivedBy(doc.received_by || doc.site_contact_name || '');
    setPodFileUrl(doc.pod_file_url || '');
    setPodFileName(doc.pod_file_name || '');
    setShowPodModal(true);
  };

  const handlePodFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPodFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPodFileUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPod = async (e) => {
    e.preventDefault();
    if (!podTargetDoc) return;
    if (!podFileUrl) {
      alert('Please select a scanned image or PDF of the signed Delivery Note.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/logistics/delivery-note/${encodeURIComponent(podTargetDoc.id)}/pod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pod_file_url: podFileUrl,
          pod_file_name: podFileName || 'Signed_POD',
          received_by: podReceivedBy,
          mark_delivered: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to save POD');
      await refreshProjects();
      setShowPodModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1680px', margin: '0 auto', padding: '0 8px 40px 8px' }}>
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-shipment-canvas, #print-shipment-canvas * {
            visibility: visible !important;
          }
          #print-shipment-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            color: black !important;
            background: white !important;
          }
        }
      `}</style>

      {/* TOP HEADER STATUS ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={24} style={{ color: 'var(--text-info)' }} />
            {getModuleName('logistics', 'Logistics')} & Warehousing Workspace
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Manage Packing Lists (PL), Argox O4-250 Thermal Labels, Official Delivery Notes (DN), Dispatch Transport & Signed PODs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            onClick={() => setShowLabelTemplateModal(true)}
          >
            <Tag size={15} style={{ color: 'var(--text-info)' }} /> Label Templates & Designer
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            onClick={() => handleOpenPlModal()}
          >
            <Plus size={15} /> New Packing List
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            onClick={() => handleOpenDnModal()}
          >
            <Plus size={15} /> New Delivery Note
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Packing Lists (PL)
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalPlCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Clock size={11} /> {kpiStats.pendingPlCount} ready for dispatch
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-info)' }}>
            <ClipboardList size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Delivery Notes (DN)
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalDnCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <CheckCircle2 size={11} /> Active Dispatches
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-success)' }}>
            <Truck size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Total Units Dispatched
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalDispatchedUnits.toLocaleString()}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              Synced to Sales Tracker & Orders
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
            <Package size={20} />
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Active Projects
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.activeProjectsCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              With logistics documents
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* FILTER TABS & CONTROL BAR */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveFilterTab('ALL')}
              className={`btn btn-sm ${activeFilterTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}
            >
              All Documents ({allDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('PL')}
              className={`btn btn-sm ${activeFilterTab === 'PL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}
            >
              📦 Packing Lists ({kpiStats.totalPlCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('DN')}
              className={`btn btn-sm ${activeFilterTab === 'DN' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px' }}
            >
              🚚 Delivery Notes ({kpiStats.totalDnCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('PENDING')}
              className={`btn btn-sm ${activeFilterTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '12px', fontWeight: 600, borderRadius: '6px', color: activeFilterTab === 'PENDING' ? '#fff' : 'var(--text-warning)' }}
            >
              ⏳ Ready for Dispatch ({kpiStats.pendingPlCount})
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by Document # (e.g. PL-2026-0001, DN-2026-0001), Project, Order, Client, or SKU..."
              className="form-control"
              style={{ paddingLeft: '32px', height: '32px', fontSize: '12.5px', background: 'var(--bg-primary)', width: '100%' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Group:</span>
            <select
              className="form-control"
              style={{ height: '32px', padding: '2px 8px', fontSize: '12px', background: 'var(--bg-primary)' }}
              value={groupingMode}
              onChange={e => setGroupingMode(e.target.value)}
            >
              <option value="none">Flat Document List</option>
              <option value="project">Group Per Project</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>PM:</span>
            <select
              className="form-control"
              style={{ height: '32px', padding: '2px 8px', fontSize: '12px', background: 'var(--bg-primary)' }}
              value={filterPm}
              onChange={e => setFilterPm(e.target.value)}
            >
              <option value="All">All Project Managers</option>
              {uniquePms.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN DOCUMENT LEDGER */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} style={{ color: 'var(--text-info)' }} />
            Logistics Documents Ledger ({filteredDocs.length})
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Click any document to inspect, print thermal labels, upload signed POD, or download PDF
          </span>
        </div>

        {filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            <Package size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <div>No issued packing lists or delivery notes found.</div>
            <span style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>Click "New Packing List" or "New Delivery Note" above to issue one.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                  <th style={{ padding: '10px 14px' }}>Document ID</th>
                  <th style={{ padding: '10px 14px' }}>Type</th>
                  <th style={{ padding: '10px 14px' }}>Project & Order</th>
                  <th style={{ padding: '10px 14px' }}>Client / Method</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Items & Units</th>
                  <th style={{ padding: '10px 14px' }}>Status & POD</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => {
                  const isSelected = doc.id === selectedDocId;
                  const isPL = doc.type === 'packing_list';
                  const isVoided = (doc.status || '').toLowerCase() === 'cancelled';
                  const totalQty = (doc.items || []).reduce((s, i) => s + (Number(i.qtyDelivered) || 0), 0);

                  return (
                    <tr
                      key={`${doc.type}_${doc.id}`}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setSelectedProjectKey(doc.projectKey);
                      }}
                      className="hover-row"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.10)' : 'transparent',
                        cursor: 'pointer',
                        opacity: isVoided ? 0.55 : 1,
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: isVoided ? 'var(--text-tertiary)' : 'var(--text-info)', textDecoration: isVoided ? 'line-through' : 'none' }}>
                        {doc.id}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          background: isPL ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                          color: isPL ? 'var(--text-info)' : 'var(--text-success)',
                        }}>
                          {isPL ? '📦 Packing List' : `🚚 DN (${doc.delivery_type || 'Full'})`}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.projectName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{doc.orderId}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                        <div>{doc.projectClient || '—'}</div>
                        {!isPL && doc.dispatch_method && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            {doc.dispatch_method} {doc.carrier_driver ? `• ${doc.carrier_driver}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {doc.date}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.items?.length || 0} lines</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>({totalQty} pcs)</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isVoided ? (
                          <span style={{ color: 'var(--text-danger)', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Ban size={12} /> Cancelled / Voided
                          </span>
                        ) : isPL ? (
                          doc.deliveryNoteId ? (
                            <span style={{ color: 'var(--text-success)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> Dispatched ({doc.deliveryNoteId})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-warning)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Pending Dispatch
                            </span>
                          )
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-success)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Truck size={12} /> {doc.status || 'Dispatched'}
                            </span>
                            {doc.pod_received && (
                              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                POD ✓
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Print Thermal Labels (Argox O4-250)"
                            style={{ color: 'var(--text-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                            onClick={() => handleOpenLabelPrinter(doc)}
                          >
                            <Tag size={13} />
                          </button>
                          {isPL && !doc.deliveryNoteId && !isVoided && (
                            <button
                              className="btn btn-ghost btn-xs"
                              title="Edit Packing List"
                              style={{ color: 'var(--text-primary)' }}
                              onClick={() => handleOpenPlModal('', doc)}
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          {!isPL && !isVoided && (
                            <button
                              className="btn btn-ghost btn-xs"
                              title="Upload / View Signed Proof of Delivery (POD)"
                              style={{ color: doc.pod_received ? '#10b981' : 'var(--text-warning)' }}
                              onClick={() => handleOpenPodModal(doc)}
                            >
                              <FileCheck size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-xs"
                            title="Inspect & Print PDF"
                            style={{ color: 'var(--text-info)' }}
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setSelectedProjectKey(doc.projectKey);
                            }}
                          >
                            <Eye size={13} />
                          </button>
                          {!isVoided && (
                            <button
                              className="btn btn-ghost btn-xs"
                              title={isPL ? 'Delete Packing List' : 'Void / Cancel Delivery Note & Reverse Quantities'}
                              style={{ color: 'var(--text-danger)' }}
                              onClick={() => handleVoidOrDeleteDoc(doc)}
                            >
                              {isPL ? <Trash2 size={13} /> : <Ban size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CENTERED MODAL: HIGH-FIDELITY PRINTABLE DOCUMENT PREVIEW ────────── */}
      {activeDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '24px 16px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setSelectedDocId(null);
              setSelectedProjectKey(null);
            }
          }}
        >
          <div
            style={{
              margin: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '1020px',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top Workspace Action Bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  background: activeDoc.type === 'packing_list' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: activeDoc.type === 'packing_list' ? 'var(--text-info)' : 'var(--text-success)',
                }}>
                  {activeDoc.type === 'packing_list' ? 'Packing List' : `Delivery Note (${activeDoc.delivery_type || 'Full'})`}
                </span>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'monospace' }}>
                  {activeDoc.id}
                </h3>
                {activeDoc.status === 'Cancelled' && (
                  <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--text-danger)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    VOIDED / CANCELLED
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', color: 'var(--text-info)' }}
                  onClick={() => handleOpenLabelPrinter(activeDoc)}
                >
                  <Tag size={14} /> Print Thermal Labels (Argox)
                </button>
                {activeDoc.type === 'delivery_note' && activeDoc.status !== 'Cancelled' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', color: activeDoc.pod_received ? '#10b981' : 'var(--text-warning)' }}
                    onClick={() => handleOpenPodModal(activeDoc)}
                  >
                    <Upload size={14} /> {activeDoc.pod_received ? 'View / Replace Signed POD' : 'Upload Signed POD'}
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                {activeDoc.status !== 'Cancelled' && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--text-danger)', border: '1px solid var(--border)', fontSize: '12px' }}
                    onClick={() => handleVoidOrDeleteDoc(activeDoc)}
                  >
                    {activeDoc.type === 'packing_list' ? <><Trash2 size={13} /> Delete</> : <><Ban size={13} /> Void / Cancel DN</>}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: '1px solid var(--border)', fontSize: '12px' }}
                  onClick={() => {
                    setSelectedDocId(null);
                    setSelectedProjectKey(null);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* LIVE DOCUMENT SHEET */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', justifyContent: 'center', background: 'var(--bg-primary)' }}>
              <div
                id="print-shipment-canvas"
                style={{
                  width: '100%',
                  maxWidth: '900px',
                  background: 'white',
                  color: '#0f172a',
                  padding: '36px 44px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {/* Letterhead Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                      ONE TO ONE LIGHTING DESIGN
                    </h2>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      VAT Reg No: 4590312965 • Reg No: 2022/863083/07
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                      Cape Town, South Africa • info@1-to-1.world
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}>
                      {activeDoc.type === 'packing_list' ? 'Logistical Packing List' : `Official Delivery Note (${activeDoc.delivery_type || 'Full'})`}
                    </span>
                    <h3 style={{ margin: '6px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {activeDoc.id}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Date: {activeDoc.date}</span>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontStyle: 'italic' }}>Order Ref: {activeDoc.orderId}</span>
                  </div>
                </div>

                {/* Recipient, Site Delivery & Transport Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: activeDoc.type === 'delivery_note' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '14px', fontSize: '11.5px', color: '#334155', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Client & Contact</span>
                    <strong style={{ fontSize: '12px' }}>{activeDoc.orderObj?.clientCompany || activeDoc.projectClient || '—'}</strong>
                    <span style={{ display: 'block', marginTop: '2px' }}>Site Contact: {activeDoc.site_contact_name || activeDoc.orderObj?.clientContact || '—'}</span>
                    <span style={{ display: 'block' }}>Phone: {activeDoc.site_contact_phone || activeDoc.orderObj?.clientPhone || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Project & Site Address</span>
                    <strong style={{ fontSize: '12px' }}>{activeDoc.projectName}</strong>
                    <span style={{ display: 'block', whiteSpace: 'pre-line', marginTop: '2px' }}>
                      {activeDoc.delivery_address || activeDoc.orderObj?.deliveryAddress || 'Site Delivery Address on file'}
                    </span>
                    {activeDoc.site_instructions && (
                      <span style={{ display: 'block', marginTop: '3px', fontSize: '10.5px', color: '#475569' }}>
                        <strong>Gate/Site Note:</strong> {activeDoc.site_instructions}
                      </span>
                    )}
                  </div>
                  {activeDoc.type === 'delivery_note' && (
                    <div>
                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Transport & Dispatch</span>
                      <strong style={{ fontSize: '12px' }}>{activeDoc.dispatch_method || 'Internal Driver'}</strong>
                      {activeDoc.carrier_driver && <span style={{ display: 'block', marginTop: '2px' }}>Driver / Courier: {activeDoc.carrier_driver}</span>}
                      {activeDoc.vehicle_reg && <span style={{ display: 'block' }}>Vehicle Reg: {activeDoc.vehicle_reg}</span>}
                      {activeDoc.tracking_number && <span style={{ display: 'block' }}>Waybill / Tracking: {activeDoc.tracking_number}</span>}
                    </div>
                  )}
                </div>

                {activeDoc.type === 'packing_list' ? (
                  /* PACKING LIST TABLE */
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '7px 8px', width: '85px' }}>1-TO-1 Code</th>
                          <th style={{ padding: '7px 8px', width: '70px' }}>Plan Code</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Supplier Code</th>
                          <th style={{ padding: '7px 8px' }}>Description</th>
                          <th style={{ padding: '7px 8px', width: '65px' }}>Floor</th>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Area</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Material/Col</th>
                          <th style={{ padding: '7px 8px', width: '48px', textAlign: 'center' }}>1st Fix</th>
                          <th style={{ padding: '7px 8px', width: '48px', textAlign: 'center' }}>Red List</th>
                          <th style={{ padding: '7px 8px', width: '50px', textAlign: 'center' }}>Packed</th>
                          <th style={{ padding: '7px 8px', width: '50px', textAlign: 'center' }}>B/Ord</th>
                          <th style={{ padding: '7px 8px', width: '65px', textAlign: 'center' }}>Box #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeDoc.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: item.is_accessory ? '#faf5ff' : (idx % 2 === 0 ? 'white' : '#f8fafc') }}>
                            <td style={{ padding: '7px 8px', fontWeight: 700, fontFamily: 'monospace', paddingLeft: item.is_accessory ? '18px' : '8px' }}>
                              {item.is_accessory ? `↳ ${item.one_one_code}` : item.one_one_code || '—'}
                            </td>
                            <td style={{ padding: '7px 8px', fontWeight: 700, fontFamily: 'monospace', color: '#334155' }}>{item.plan_code || '—'}</td>
                            <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#64748b' }}>{item.supplier_code || '—'}</td>
                            <td style={{ padding: '7px 8px' }}>
                              {item.description}
                              {item.parent_fitting_code && (
                                <div style={{ fontSize: '9.5px', color: '#7e22ce', fontWeight: 600 }}>Attached to: {item.parent_fitting_code}</div>
                              )}
                            </td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.floor || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.area || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.material_colour || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: item.first_fix === 'Yes' ? 700 : 400, color: item.first_fix === 'Yes' ? '#2563eb' : '#94a3b8' }}>{item.first_fix || 'No'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: item.red_list === 'Yes' ? 700 : 400, color: item.red_list === 'Yes' ? '#dc2626' : '#94a3b8' }}>{item.red_list || 'No'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{item.qtyDelivered}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: item.qty_backorder > 0 ? '#d97706' : '#94a3b8' }}>{item.qty_backorder || 0}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9', borderRadius: '3px' }}>{item.boxNumber || 'Box 1'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* TWO-TIER DELIVERY NOTE DOCUMENT */
                  <div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '8px 12px', marginBottom: '12px', fontSize: '11px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>SECTION 1 — GOODS DISPATCHED ON THIS VEHICLE:</strong> Please verify box count and item quantities upon offloading.
                      </span>
                      {activeDoc.packingListIds?.length > 0 && (
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          Packing Lists: {activeDoc.packingListIds.join(', ')}
                        </span>
                      )}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '22px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '7px 8px', width: '90px' }}>1-TO-1 Code</th>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Plan Code</th>
                          <th style={{ padding: '7px 8px' }}>Description</th>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Floor</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Area</th>
                          <th style={{ padding: '7px 8px', width: '80px', textAlign: 'center' }}>Box #</th>
                          <th style={{ padding: '7px 8px', width: '65px', textAlign: 'center' }}>Ord Qty</th>
                          <th style={{ padding: '7px 8px', width: '75px', textAlign: 'center' }}>Delivered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeDoc.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '7px 8px', fontWeight: 700, fontFamily: 'monospace' }}>
                              {item.is_accessory ? `↳ ${item.one_one_code}` : item.one_one_code || '—'}
                            </td>
                            <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>{item.plan_code || '—'}</td>
                            <td style={{ padding: '7px 8px' }}>{item.description}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.floor || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.area || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9' }}>{item.boxNumber || 'Box 1'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b' }}>{item.qty_ordered || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#15803d', fontSize: '12px' }}>{item.qtyDelivered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* SECTION 2: OUTSTANDING / BACKORDERED ITEMS */}
                    {Array.isArray(activeDoc.outstanding_snapshot) && activeDoc.outstanding_snapshot.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '4px', padding: '7px 12px', marginBottom: '8px', fontSize: '11px', color: '#92400e', fontWeight: 700 }}>
                          SECTION 2 — OUTSTANDING / BACKORDERED ITEMS (TO FOLLOW ON SUBSEQUENT DELIVERY)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                          <thead>
                            <tr style={{ background: '#334155', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                              <th style={{ padding: '6px 8px', width: '90px' }}>1-TO-1 Code</th>
                              <th style={{ padding: '6px 8px', width: '75px' }}>Plan Code</th>
                              <th style={{ padding: '6px 8px' }}>Description</th>
                              <th style={{ padding: '6px 8px', width: '110px' }}>Floor / Area</th>
                              <th style={{ padding: '6px 8px', width: '65px', textAlign: 'center' }}>Ordered</th>
                              <th style={{ padding: '6px 8px', width: '75px', textAlign: 'center' }}>Remaining</th>
                              <th style={{ padding: '6px 8px', width: '95px', textAlign: 'center' }}>Backorder ETA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDoc.outstanding_snapshot.map((bo, bIdx) => (
                              <tr key={bIdx} style={{ borderBottom: '1px solid #e2e8f0', background: bIdx % 2 === 0 ? '#fffbeb' : 'white' }}>
                                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700 }}>{bo.one_one_code || bo.code}</td>
                                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{bo.plan_code || '—'}</td>
                                <td style={{ padding: '6px 8px' }}>{bo.description}</td>
                                <td style={{ padding: '6px 8px', color: '#64748b' }}>{[bo.floor, bo.area].filter(Boolean).join(' / ') || '—'}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{bo.qty_ordered}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800, color: '#b45309' }}>{bo.qty_remaining}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>{bo.backorder_eta || 'TBA'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeDoc.notes && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px', fontSize: '11px', color: '#334155', marginBottom: '24px' }}>
                    <strong>Logistics & Handling Notes:</strong>
                    <div style={{ marginTop: '2px', whiteSpace: 'pre-line' }}>{activeDoc.notes}</div>
                  </div>
                )}

                {/* SIGNATURE HANDOVER SECTION */}
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', fontSize: '11px', color: '#334155' }}>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '20px' }}>
                      Dispatched By ({activeDoc.carrier_driver || 'One to One Warehouse'})
                    </span>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>Driver / Warehouse Signature</span>
                      <span>Date: {activeDoc.date}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '20px' }}>
                      Received In Good Order (Site Representative: {activeDoc.received_by || '____________________'})
                    </span>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>Recipient Signature & Full Name</span>
                      <span>Date: _____ / _____ / 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CREATE / EDIT PACKING LIST (WITH FILTERS, BOX SPLITTING & ACCESSORY LINKER) ─── */}
      {showPlModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '20px 12px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowPlModal(false);
          }}
        >
          <div
            style={{
              margin: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '1360px',
              maxHeight: 'calc(100vh - 40px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} style={{ color: 'var(--text-info)' }} />
                  {editingPlDoc ? `Edit Packing List ${editingPlDoc.id}` : 'Create Logistical Packing List (PL)'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Auto-populated from Order & Product Specs • Filter by Floor/Area, Split across Boxes, or Attach Accessories to Main Fittings
                </span>
              </div>
              <button onClick={() => setShowPlModal(false)} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePackingList} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {/* Order Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                    Destination Project & Quotation Order <span style={{ color: 'var(--text-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => !editingPlDoc && setPlOrderDropdownOpen(!plOrderDropdownOpen)}
                      className="form-control"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: editingPlDoc ? 'default' : 'pointer', height: '36px', background: 'var(--bg-primary)' }}
                    >
                      <span style={{ fontSize: '12.5px', color: plOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: plOrderKey ? 700 : 400 }}>
                        {plOrderKey
                          ? (() => {
                              const [pKey, oId] = plOrderKey.split(':::');
                              const ord = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                              return ord
                                ? `${ord.quote_name ? `${ord.quote_name} (${ord.id})` : ord.id} • ${ord.projectName}`
                                : `${oId} • ${pKey}`;
                            })()
                          : 'Select Order...' }
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {plOrderDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 15px 35px rgba(0,0,0,0.55)', marginTop: '4px', minHeight: '260px', maxHeight: '460px', overflowY: 'auto' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-primary)' }}>
                          <input
                            type="text"
                            placeholder="Type to filter projects / orders..."
                            className="form-control"
                            style={{ height: '30px', fontSize: '12px' }}
                            value={plOrderSearchQuery}
                            onChange={e => setPlOrderSearchQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        {allOrders
                          .filter(o => {
                            const q = plOrderSearchQuery.toLowerCase();
                            return !q || (o.projectName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q) || (o.projectClient || '').toLowerCase().includes(q);
                          })
                          .map(o => (
                            <div
                              key={`${o.projectKey}:::${o.id}`}
                              onClick={() => loadOrderItemsForPl(`${o.projectKey}:::${o.id}`)}
                              className="hover-row"
                              style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: 750, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {o.quote_name ? o.quote_name : o.id}
                                </span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '11px', fontWeight: 600 }}>
                                  {o.id}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{o.projectName}</span>
                                {o.projectClient && <span style={{ color: 'var(--text-tertiary)' }}>{o.projectClient}</span>}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Warehouse Packing Controls Toolbar */}
                {plOrderKey && (
                  <>
                    {/* AREA & ROOM SELECTOR TOOLBAR (Clean, compact dropdown) */}
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                          <Filter size={13} style={{ color: 'var(--text-info)' }} /> Pack Per Area / Room:
                        </span>
                        <select
                          className="form-control"
                          style={{ height: '32px', fontSize: '12.5px', fontWeight: 650, flex: 1, maxWidth: '380px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          value={plFilterArea}
                          onChange={e => setPlFilterArea(e.target.value)}
                        >
                          <option value="ALL">All Areas / Rooms ({plRows.filter(r => !r.parent_item_id && !r.is_hidden_by_attachment).length} line items)</option>
                          {plUniqueAreas.map(areaName => (
                            <option key={areaName} value={areaName}>
                              {areaName} ({plAreaItemCounts[areaName] || 0} items)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {plFilterArea !== 'ALL' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 12px' }}
                              onClick={() => {
                                setPlRows(prev =>
                                  prev.map(r => {
                                    const a = (r.area || '').trim() || 'General / Unspecified';
                                    if (a === plFilterArea && !r.is_split_child && !r.is_accessory) {
                                      return { ...r, qty_packed: Number(r.remaining_to_pack || r.qty_ordered || 0), is_hidden_by_attachment: false };
                                    }
                                    return r;
                                  })
                                );
                              }}
                            >
                              ✓ Pack Only {plFilterArea}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ border: '1px solid var(--border)', fontSize: '11.5px', padding: '4px 10px', color: 'var(--text-secondary)' }}
                              onClick={() => setPlFilterArea('ALL')}
                            >
                              Show All Areas
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Secondary Action Toolbar: Box Assignment + Global Pack */}
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      {/* Left: Active Box Selector */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <Box size={14} style={{ color: 'var(--text-info)' }} />
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Box:</span>
                        <select
                          className="form-control"
                          style={{ height: '26px', fontSize: '12px', fontWeight: 700, width: '100px', padding: '2px 6px' }}
                          value={plActiveBox}
                          onChange={e => setPlActiveBox(e.target.value)}
                        >
                          {plAvailableBoxes.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                          onClick={handleAddBoxOption}
                        >
                          + Box
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          style={{ fontSize: '11px', fontWeight: 700 }}
                          onClick={handleAssignSelectedToActiveBox}
                        >
                          Assign Checked to {plActiveBox}
                        </button>
                      </div>

                      {/* Right: Quick Batch Actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                          onClick={() =>
                            setPlRows(prev =>
                              prev
                                .filter(r => !r.is_split_child && !r.is_accessory)
                                .map(r => ({
                                  ...r,
                                  qty_packed: Number(r.remaining_to_pack || r.qty_ordered || 0),
                                  is_hidden_by_attachment: false,
                                }))
                            )
                          }
                        >
                          <Sparkles size={12} style={{ color: 'var(--text-info)' }} /> Pack All Remaining
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                          onClick={() => setPlRows(prev => prev.map(r => ({ ...r, qty_packed: 0 })))}
                        >
                          Zero All
                        </button>
                      </div>
                    </div>

                    {/* Packing List Items Table (One to One Code, Plan Code, Supplier/SKU Code) */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '430px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 650 }}>
                            <th style={{ padding: '9px 8px', width: '32px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                onChange={e => {
                                  const checked = e.target.checked;
                                  const next = {};
                                  visiblePlRows.forEach(r => {
                                    next[r.rowKey] = checked;
                                  });
                                  setPlSelectedRowKeys(next);
                                }}
                              />
                            </th>
                            <th style={{ padding: '9px 10px', minWidth: '105px' }}>One to One Code</th>
                            <th style={{ padding: '9px 8px', width: '70px', textAlign: 'center' }}>Plan Code</th>
                            <th style={{ padding: '9px 10px', minWidth: '95px' }}>Supplier / SKU</th>
                            <th style={{ padding: '9px 10px' }}>Description & Spec</th>
                            <th style={{ padding: '9px 10px', minWidth: '120px' }}>Area / Room</th>
                            <th style={{ padding: '9px 8px', textAlign: 'center', width: '45px' }}>Ord</th>
                            <th style={{ padding: '9px 8px', width: '80px', textAlign: 'center' }}>Packed</th>
                            <th style={{ padding: '9px 8px', textAlign: 'center', width: '45px' }}>B/O</th>
                            <th style={{ padding: '9px 10px', width: '95px' }}>Box #</th>
                            <th style={{ padding: '9px 8px', textAlign: 'right', width: '115px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visiblePlRows.length === 0 ? (
                            <tr>
                              <td colSpan={11} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                {isLoadingPlItems ? 'Loading order items & product specifications...' : `No items found for area "${plFilterArea}".`}
                              </td>
                            </tr>
                          ) : (
                            visiblePlRows.map((row, idx) => {
                              const totalPackedForItem = plRows
                                .filter(r => String(r.order_item_id) === String(row.order_item_id))
                                .reduce((s, r) => s + (Number(r.qty_packed) || 0), 0);
                              const backorder = Math.max(0, Number(row.qty_ordered || 0) - totalPackedForItem);
                              const isChecked = !!plSelectedRowKeys[row.rowKey];
                              const isSubRow = !!(row.is_split_child || row.is_accessory);
                              const showAttachBtn = !!(row.is_accessory || row.is_accessory_candidate || !row.area);

                              return (
                                <tr
                                  key={row.rowKey}
                                  style={{
                                    borderBottom: '1px solid var(--border)',
                                    background: row.is_accessory
                                      ? 'rgba(168, 85, 247, 0.08)'
                                      : row.is_split_child
                                      ? 'rgba(59, 130, 246, 0.06)'
                                      : idx % 2 === 0
                                      ? 'var(--bg-primary)'
                                      : 'transparent',
                                  }}
                                >
                                  {/* Checkbox */}
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setPlSelectedRowKeys(prev => ({
                                          ...prev,
                                          [row.rowKey]: !prev[row.rowKey],
                                        }))
                                      }
                                    />
                                  </td>

                                  {/* 1. One to One Code */}
                                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', paddingLeft: row.is_accessory ? '20px' : '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      {row.is_accessory && <span style={{ color: '#a855f7' }}>↳</span>}
                                      {row.is_split_child && (
                                        <span style={{ fontSize: '9.5px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--text-info)', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
                                          SPLIT
                                        </span>
                                      )}
                                      <span>{row.one_one_code || '—'}</span>
                                    </div>
                                  </td>

                                  {/* 2. Plan Code */}
                                  <td style={{ padding: '8px', textAlign: 'center' }}>
                                    {row.plan_code ? (
                                      <span style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        color: 'var(--text-info)',
                                        fontFamily: 'monospace'
                                      }}>
                                        {row.plan_code}
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                                    )}
                                  </td>

                                  {/* 3. SKU / Supplier Code */}
                                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {row.supplier_code || '—'}
                                  </td>

                                  {/* Description & Spec Flags */}
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ fontWeight: 550, color: 'var(--text-primary)', lineHeight: '1.3' }}>{row.description}</div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                      {row.material_colour && row.material_colour !== '—' && <span>Col: <strong>{row.material_colour}</strong></span>}
                                      {row.first_fix === 'Yes' && <span style={{ color: 'var(--text-info)', fontWeight: 700 }}>1st Fix</span>}
                                      {row.red_list === 'Yes' && <span style={{ color: 'var(--text-danger)', fontWeight: 700 }}>Red List</span>}
                                      {row.parent_fitting_code && (
                                        <span style={{ color: '#a855f7', fontWeight: 700 }}>
                                          Attached to: {row.parent_fitting_code}
                                        </span>
                                      )}
                                      {row.is_split_child && (
                                        <span style={{ color: 'var(--text-info)', fontWeight: 700 }}>
                                          Split Line (Total: {row.qty_ordered})
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Area / Room */}
                                  <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontSize: '11.5px' }}>
                                    <div style={{ fontWeight: 650 }}>{row.area || 'General / Unspecified'}</div>
                                    {row.floor && <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{row.floor}</div>}
                                  </td>

                                  {/* Ord Qty */}
                                  <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: isSubRow ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                                    {isSubRow ? `(${row.qty_ordered})` : row.qty_ordered}
                                  </td>

                                  {/* Packed Qty Input */}
                                  <td style={{ padding: '8px' }}>
                                    <input
                                      type="number"
                                      min="0"
                                      className="form-control"
                                      style={{ height: '28px', padding: '2px 6px', fontSize: '12.5px', textAlign: 'center', fontWeight: 800, background: 'var(--bg-secondary)', width: '100%' }}
                                      value={row.qty_packed}
                                      onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                        setPlRows(prev =>
                                          prev.map(r => (r.rowKey === row.rowKey ? { ...r, qty_packed: val } : r))
                                        );
                                      }}
                                    />
                                  </td>

                                  {/* Backorder Qty */}
                                  <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'monospace', color: !isSubRow && backorder > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontWeight: 700 }}>
                                    {isSubRow ? '—' : backorder}
                                  </td>

                                  {/* Box # Dropdown */}
                                  <td style={{ padding: '8px 10px', minWidth: '120px' }}>
                                    <select
                                      className="form-control"
                                      style={{ height: '28px', padding: '2px 6px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '100%', cursor: 'pointer' }}
                                      value={plAvailableBoxes.includes(row.box_number) ? row.box_number : (row.box_number || 'Box 1')}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (val === '__ADD_NEW__') {
                                          const nextNum = plAvailableBoxes.length + 1;
                                          const customName = prompt('Enter new Box Name / Identifier:', `Box ${nextNum}`);
                                          if (customName && customName.trim()) {
                                            const trimmed = customName.trim();
                                            if (!plAvailableBoxes.includes(trimmed)) {
                                              setPlAvailableBoxes(prev => [...prev, trimmed]);
                                            }
                                            setPlRows(prev =>
                                              prev.map(r => (r.rowKey === row.rowKey ? { ...r, box_number: trimmed } : r))
                                            );
                                          }
                                        } else {
                                          setPlRows(prev =>
                                            prev.map(r => (r.rowKey === row.rowKey ? { ...r, box_number: val } : r))
                                          );
                                        }
                                      }}
                                    >
                                      {plAvailableBoxes.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                      ))}
                                      {row.box_number && !plAvailableBoxes.includes(row.box_number) && (
                                        <option value={row.box_number}>{row.box_number}</option>
                                      )}
                                      <option value="__ADD_NEW__">+ New Box...</option>
                                    </select>
                                  </td>

                                  {/* Simplified Actions Column */}
                                  <td style={{ padding: '8px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                      {!row.is_accessory && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs"
                                          style={{ border: '1px solid var(--border)', fontSize: '10.5px', padding: '2px 6px', color: 'var(--text-info)' }}
                                          title="Split quantity across another box"
                                          onClick={() => handleSplitRowAcrossBoxes(row)}
                                        >
                                          <Split size={11} /> Split
                                        </button>
                                      )}

                                      {showAttachBtn && !row.is_split_child && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs"
                                          style={{ border: '1px solid rgba(168, 85, 247, 0.4)', fontSize: '10.5px', padding: '2px 6px', color: '#a855f7' }}
                                          title="Attach accessory to parent fitting"
                                          onClick={() => setAttachModalTargetRow(row)}
                                        >
                                          <Link2 size={11} /> {row.is_accessory ? 'Re-Attach' : 'Attach'}
                                        </button>
                                      )}

                                      {isSubRow && (
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs"
                                          style={{ color: 'var(--text-danger)', padding: '2px 5px' }}
                                          onClick={() => handleRemoveSubRow(row.rowKey)}
                                          title="Remove split line and restore quantity"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Packing Notes & Box Handling Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter special packing instructions, fragile handling notes, or pallet markings..."
                    className="form-control"
                    style={{ fontSize: '12px', background: 'var(--bg-primary)' }}
                    value={plNotes}
                    onChange={e => setPlNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPlModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={!plOrderKey || isSavingLogistics} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  {isSavingLogistics ? 'Saving...' : editingPlDoc ? 'Save Packing List Changes' : 'Generate Packing List 📦'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CREATE OFFICIAL DELIVERY NOTE (DN) WITH DISPATCH METADATA ─── */}
      {showDnModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '20px 12px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowDnModal(false);
          }}
        >
          <div
            style={{
              margin: 'auto',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '1040px',
              maxHeight: 'calc(100vh - 40px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} style={{ color: 'var(--text-success)' }} />
                  Generate Official Delivery Note (DN)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Dispatch existing Packing Lists (or emergency Quick Direct DN) and automatically update Order & Sales Tracker delivery metrics
                </span>
              </div>
              <button onClick={() => setShowDnModal(false)} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDeliveryNote} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {/* Order Selector & Mode Toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>
                      Select Project & Quotation Order <span style={{ color: 'var(--text-danger)' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => setDnOrderDropdownOpen(!dnOrderDropdownOpen)}
                        className="form-control"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', height: '36px', background: 'var(--bg-primary)' }}
                      >
                        <span style={{ fontSize: '12.5px', color: dnOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: dnOrderKey ? 700 : 400 }}>
                          {dnOrderKey
                            ? (() => {
                                const [pKey, oId] = dnOrderKey.split(':::');
                                const ord = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                                return ord
                                  ? `${ord.projectName} ➔ ${ord.quote_name ? `${ord.quote_name} (${ord.id})` : ord.id}`
                                  : `${pKey} ➔ ${oId}`;
                              })()
                            : 'Select Project Order...'}
                        </span>
                        <ChevronDown size={14} />
                      </div>

                      {dnOrderDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.45)', marginTop: '4px', maxHeight: '260px', overflowY: 'auto' }}>
                          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-primary)' }}>
                            <input
                              type="text"
                              placeholder="Type to filter projects / orders..."
                              className="form-control"
                              style={{ height: '30px', fontSize: '12px' }}
                              value={dnOrderSearchQuery}
                              onChange={e => setDnOrderSearchQuery(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          {allOrders
                            .filter(o => {
                              const q = dnOrderSearchQuery.toLowerCase();
                              return !q || (o.projectName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q) || (o.projectClient || '').toLowerCase().includes(q);
                            })
                            .map(o => (
                              <div
                                key={`${o.projectKey}:::${o.id}`}
                                onClick={() => handleDnOrderChange(`${o.projectKey}:::${o.id}`)}
                                className="hover-row"
                                style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px' }}
                              >
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{o.projectName}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Order: {o.quote_name ? `${o.quote_name} (${o.id})` : o.id}</span>
                                  <span>Client: {o.projectClient || '—'}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '3px' }}>
                    <button
                      type="button"
                      onClick={() => setDnMode('from_pl')}
                      style={{
                        border: 'none',
                        background: dnMode === 'from_pl' ? 'var(--text-success)' : 'transparent',
                        color: dnMode === 'from_pl' ? '#fff' : 'var(--text-secondary)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📦 From Packing List (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDnMode('quick_direct')}
                      style={{
                        border: 'none',
                        background: dnMode === 'quick_direct' ? 'var(--text-warning)' : 'transparent',
                        color: dnMode === 'quick_direct' ? '#fff' : 'var(--text-secondary)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Quick Direct DN (Emergency)
                    </button>
                  </div>
                </div>

                {/* DISPATCH & TRANSPORT METADATA SECTION */}
                {dnOrderKey && (
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Site Contact & Transport Dispatch Metadata
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Dispatch Method</label>
                        <select
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          value={dnDispatchMethod}
                          onChange={e => setDnDispatchMethod(e.target.value)}
                        >
                          <option value="Internal Driver">Internal Driver</option>
                          <option value="Third-Party Courier">Third-Party Courier</option>
                          <option value="Client Collection">Client Collection</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Driver / Courier Name</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="e.g. Sipho / DHL Express"
                          value={dnCarrierDriver}
                          onChange={e => setDnCarrierDriver(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Vehicle Registration</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="e.g. CAA 458-921"
                          value={dnVehicleReg}
                          onChange={e => setDnVehicleReg(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Waybill / Tracking #</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="Optional tracking ref"
                          value={dnTrackingNumber}
                          onChange={e => setDnTrackingNumber(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Site Contact Person</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="Site Manager / Foreman"
                          value={dnSiteContactName}
                          onChange={e => setDnSiteContactName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Site Contact Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="e.g. 082 555 1234"
                          value={dnSiteContactPhone}
                          onChange={e => setDnSiteContactPhone(e.target.value)}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Site Delivery Address</label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ height: '32px', fontSize: '12px', marginTop: '3px' }}
                          placeholder="Full street address for delivery"
                          value={dnDeliveryAddress}
                          onChange={e => setDnDeliveryAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE A: SELECT EXISTING PACKING LISTS */}
                {dnOrderKey && dnMode === 'from_pl' && (() => {
                  const availablePls = getAvailablePls();
                  const dnItems = getAggregatedDnItems();

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Available Packing Lists Ready for Dispatch ({availablePls.length})
                      </span>

                      {availablePls.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                          No pending Packing Lists found for this order. Create a Packing List first, or switch to "Quick Direct DN" mode above.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
                          {availablePls.map(pl => {
                            const plId = pl.id || pl.document_number;
                            const isChecked = !!dnSelectedPlIds[plId];
                            const totalUnits = (pl.items || []).reduce((s, i) => s + (Number(i.qty_packed ?? i.qtyDelivered) || 0), 0);

                            return (
                              <div
                                key={plId}
                                onClick={() => setDnSelectedPlIds(prev => ({ ...prev, [plId]: !prev[plId] }))}
                                style={{
                                  border: isChecked ? '1.5px solid var(--text-success)' : '1px solid var(--border)',
                                  background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-primary)',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input type="checkbox" checked={isChecked} onChange={() => {}} />
                                  <div>
                                    <div style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '13px' }}>{plId}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Issued: {pl.date}</div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {pl.items?.length || 0} lines ({totalUnits} pcs)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {dnItems.length > 0 && (
                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)' }}>
                              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '6px 10px' }}>PL #</th>
                                <th style={{ padding: '6px 10px' }}>1-TO-1 Code</th>
                                <th style={{ padding: '6px 10px' }}>Plan Code</th>
                                <th style={{ padding: '6px 10px' }}>Description</th>
                                <th style={{ padding: '6px 10px' }}>Box #</th>
                                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Dispatch Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dnItems.map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{it.packing_list_number}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700 }}>{it.one_one_code}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{it.plan_code || '—'}</td>
                                  <td style={{ padding: '6px 10px' }}>{it.description}</td>
                                  <td style={{ padding: '6px 10px', fontWeight: 700 }}>{it.boxNumber}</td>
                                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--text-success)' }}>{it.qtyDelivered}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* MODE B: QUICK DIRECT DELIVERY NOTE */}
                {dnOrderKey && dnMode === 'quick_direct' && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '7px 10px' }}>1-TO-1 Code</th>
                          <th style={{ padding: '7px 10px' }}>Plan Code</th>
                          <th style={{ padding: '7px 10px' }}>Description</th>
                          <th style={{ padding: '7px 10px', textAlign: 'center' }}>Ordered</th>
                          <th style={{ padding: '7px 10px', textAlign: 'center' }}>Remaining</th>
                          <th style={{ padding: '7px 10px', width: '100px', textAlign: 'center' }}>Deliver Now</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dnDirectItems.map((it, idx) => (
                          <tr key={it.order_item_id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700 }}>{it.one_one_code}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{it.plan_code || '—'}</td>
                            <td style={{ padding: '6px 10px' }}>{it.description}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>{it.qty_ordered}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{it.remaining_to_deliver}</td>
                            <td style={{ padding: '6px 10px' }}>
                              <input
                                type="number"
                                min="0"
                                className="form-control"
                                style={{ height: '26px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}
                                value={it.qty_to_deliver}
                                onChange={e => {
                                  const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setDnDirectItems(prev =>
                                    prev.map((row, rIdx) => (rIdx === idx ? { ...row, qty_to_deliver: v } : row))
                                  );
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Special Site / Gate Access Instructions
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '12px', height: '34px', background: 'var(--bg-primary)' }}
                      placeholder="Gate code, estate security rules, crane/offloading notes..."
                      value={dnSiteInstructions}
                      onChange={e => setDnSiteInstructions(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      General Delivery Remarks
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '12px', height: '34px', background: 'var(--bg-primary)' }}
                      placeholder="Optional delivery note remarks..."
                      value={dnNotes}
                      onChange={e => setDnNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDnModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={!dnOrderKey || isSavingLogistics} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  {isSavingLogistics ? 'Dispatching...' : 'Generate Official Delivery Note 🚚'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: UPLOAD / VIEW SIGNED PROOF OF DELIVERY (POD) ─────────── */}
      {showPodModal && podTargetDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setShowPodModal(false);
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '560px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck size={17} style={{ color: '#10b981' }} />
                Signed Proof of Delivery (POD) — {podTargetDoc.id}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPodModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitPod} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Signed / Received By (Site Representative Name)
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{ height: '34px', fontSize: '12.5px' }}
                  placeholder="Enter full name of person who signed on site..."
                  value={podReceivedBy}
                  onChange={e => setPodReceivedBy(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Upload Scanned Signed DN (Image or PDF)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handlePodFileSelect}
                  className="form-control"
                  style={{ padding: '6px', fontSize: '12px' }}
                />
              </div>

              {podFileUrl && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', background: 'var(--bg-primary)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                    Attached File: {podFileName || 'Signed_POD'}
                  </div>
                  {podFileUrl.startsWith('data:image') ? (
                    <img src={podFileUrl} alt="Signed POD" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '4px' }} />
                  ) : (
                    <a href={podFileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs" style={{ color: 'var(--text-info)' }}>
                      Open Attached POD Document
                    </a>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPodModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Save POD & Mark Delivered ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTACH ACCESSORY MODAL */}
      <AttachAccessoryModal
        isOpen={!!attachModalTargetRow}
        onClose={() => setAttachModalTargetRow(null)}
        accessoryRow={attachModalTargetRow}
        availableBoxes={plAvailableBoxes}
        candidateParentRows={plRows.filter(
          r => !r.is_accessory && !r.is_split_child && String(r.order_item_id) !== String(attachModalTargetRow?.order_item_id)
        )}
        existingAttachments={plRows.filter(
          r => r.is_accessory && String(r.order_item_id) === String(attachModalTargetRow?.order_item_id)
        )}
        onConfirmAttachments={handleConfirmAccessoryAttachments}
      />

      {/* THERMAL LABEL TEMPLATE DESIGNER MODAL */}
      <LabelTemplateModal
        isOpen={showLabelTemplateModal}
        onClose={() => setShowLabelTemplateModal(false)}
        templates={labelTemplates}
        onSaveTemplates={handleSaveTemplates}
      />

      {/* PACKING LIST THERMAL LABEL PRINTER MODAL */}
      {showLabelPrinterModal && labelTargetDoc && (
        <PackingListLabelPrinterModal
          isOpen={showLabelPrinterModal}
          onClose={() => {
            setShowLabelPrinterModal(false);
            setLabelTargetDoc(null);
          }}
          packingList={labelTargetDoc}
          project={projects[labelTargetDoc.projectKey] || { name: labelTargetDoc.projectName, client: labelTargetDoc.projectClient }}
          order={labelTargetDoc.orderObj || { id: labelTargetDoc.orderId }}
          templates={labelTemplates}
          onOpenTemplateManager={() => setShowLabelTemplateModal(true)}
        />
      )}
    </div>
  );
}
