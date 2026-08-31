import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  Truck, ClipboardList, FileText, Plus, Printer, 
  ArrowLeft, Search, CheckCircle2, AlertCircle, Eye, Trash2, 
  Package, Layers, Filter, Check, Clock, Box, Sparkles, X, ChevronDown, ChevronRight
} from 'lucide-react';

export default function LogisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, getModuleName } = useStore();
  
  // Search & ledger navigation state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Grouping and Filtering states
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'PL' | 'DN' | 'PENDING'
  const [groupingMode, setGroupingMode] = useState('none'); // 'none' | 'project'
  const [filterPm, setFilterPm] = useState('All');
  const [collapsedProjects, setCollapsedProjects] = useState({}); // { projectKey: boolean }

  // 250ms search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Read filter routing parameter state on mount
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
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal display states
  const [showPlModal, setShowPlModal] = useState(false);
  const [showDnModal, setShowDnModal] = useState(false);
  const [plOrderSearchQuery, setPlOrderSearchQuery] = useState('');
  const [plOrderDropdownOpen, setPlOrderDropdownOpen] = useState(false);
  const [dnOrderSearchQuery, setDnOrderSearchQuery] = useState('');
  const [dnOrderDropdownOpen, setDnOrderDropdownOpen] = useState(false);

  // Form states for creating a Packing List
  const [plOrderKey, setPlOrderKey] = useState(''); // "projectKey_orderId"
  const [plNotes, setPlNotes] = useState('');
  const [plItemInputs, setPlItemInputs] = useState({}); // { itemId: { qty, boxNumber, materialColour, redList, firstFix } }

  // Form states for creating a Delivery Note
  const [dnOrderKey, setDnOrderKey] = useState(''); // "projectKey_orderId"
  const [dnNotes, setDnNotes] = useState('');
  const [dnSelectedPlIds, setDnSelectedPlIds] = useState({}); // { plId: boolean }
  const [dnItemEtas, setDnItemEtas] = useState({}); // { itemId: etaText }

  // Gather all orders
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

  // Gather all issued documents (Packing Lists and Delivery Notes) across all orders
  const allDocs = useMemo(() => {
    const docs = [];
    allOrders.forEach(order => {
      // Collect Packing Lists
      (order.packingLists || []).forEach(pl => {
        docs.push({
          ...pl,
          type: 'packing_list',
          orderId: order.id,
          projectKey: order.projectKey,
          projectName: order.projectName,
          projectClient: order.projectClient,
          supplier: order.supplier,
          projectPm: order.projectPm,
          orderObj: order
        });
      });
      // Collect Delivery Notes
      (order.deliveryNotes || []).forEach(dn => {
        docs.push({
          ...dn,
          type: 'delivery_note',
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

  // KPI calculations
  const kpiStats = useMemo(() => {
    const plDocs = allDocs.filter(d => d.type === 'packing_list');
    const dnDocs = allDocs.filter(d => d.type === 'delivery_note');
    const pendingPls = plDocs.filter(d => !d.deliveryNoteId);
    
    let totalDispatchedUnits = 0;
    dnDocs.forEach(dn => {
      (dn.items || []).forEach(it => {
        totalDispatchedUnits += (Number(it.qtyDelivered) || 0);
      });
    });

    const activeProjectKeys = new Set(allDocs.map(d => d.projectKey).filter(Boolean));

    return {
      totalPlCount: plDocs.length,
      totalDnCount: dnDocs.length,
      pendingPlCount: pendingPls.length,
      totalDispatchedUnits,
      activeProjectsCount: activeProjectKeys.size
    };
  }, [allDocs]);

  // Extract unique PMs list for filter dropdown
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
      // Tab filter
      if (activeFilterTab === 'PL' && doc.type !== 'packing_list') return false;
      if (activeFilterTab === 'DN' && doc.type !== 'delivery_note') return false;
      if (activeFilterTab === 'PENDING' && (doc.type !== 'packing_list' || doc.deliveryNoteId)) return false;

      // PM filter
      if (filterPm !== 'All' && (!doc.projectPm || doc.projectPm.trim().toLowerCase() !== filterPm.trim().toLowerCase())) {
        return false;
      }

      // Search query filter
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return true;

      const searchTokens = q.split(/\s+/);
      return searchTokens.every(token => {
        const idMatch = (doc.id || '').toLowerCase().includes(token);
        const projectMatch = (doc.projectName || '').toLowerCase().includes(token);
        const orderMatch = (doc.orderId || '').toLowerCase().includes(token);
        const supplierMatch = (doc.supplier || '').toLowerCase().includes(token);
        const clientMatch = (doc.projectClient || '').toLowerCase().includes(token);
        
        const itemMatch = (doc.items || []).some(item => 
          (item.code || '').toLowerCase().includes(token) ||
          (item.type || '').toLowerCase().includes(token) ||
          (item.description || '').toLowerCase().includes(token)
        );

        return idMatch || projectMatch || orderMatch || supplierMatch || clientMatch || itemMatch;
      });
    });
  }, [allDocs, activeFilterTab, filterPm, debouncedSearch]);

  // Selected document to preview
  const activeDoc = useMemo(() => {
    return allDocs.find(d => d.id === selectedDocId) || null;
  }, [allDocs, selectedDocId]);

  // Helper: Count total documents created globally to generate serial numbers
  const getTotalDocCount = (type) => {
    return allDocs.filter(d => d.type === type).length;
  };

  // Helper: Calculate previously packed quantities for an order
  const getOrderPackedQtys = (order, excludePlId = null) => {
    const map = {};
    (order?.itemsList || []).forEach(item => {
      map[item.id] = 0;
    });
    (order?.packingLists || []).forEach(pl => {
      if (excludePlId && pl.id === excludePlId) return;
      (pl.items || []).forEach(pi => {
        if (map[pi.id] !== undefined) {
          map[pi.id] += Number(pi.qtyDelivered) || 0;
        }
      });
    });
    return map;
  };

  // Initialize Packing List Form
  const handleOpenPlModal = () => {
    setPlOrderKey('');
    setPlNotes('');
    setPlItemInputs({});
    setPlOrderSearchQuery('');
    setShowPlModal(true);
  };

  // Triggered when an order is selected in the PL creator
  const handlePlOrderChange = (orderKey) => {
    setPlOrderKey(orderKey);
    setPlOrderDropdownOpen(false);
    if (!orderKey) {
      setPlItemInputs({});
      return;
    }
    const [pKey, oId] = orderKey.split('_');
    const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);
    if (!order) return;

    const packedMap = getOrderPackedQtys(order);
    const initialInputs = {};
    (order.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service').forEach(item => {
      const ordered = Number(item.qty || item.quantity) || 0;
      const packed = packedMap[item.id] || 0;
      const outstanding = Math.max(0, ordered - packed);
      
      initialInputs[item.id] = {
        qty: outstanding,
        boxNumber: 'Box 1',
        materialColour: item.brand || '—',
        redList: false,
        firstFix: false
      };
    });
    setPlItemInputs(initialInputs);
  };

  // Quick helper: Pack All Remaining or Reset All
  const handlePackAllRemaining = (order) => {
    if (!order) return;
    const packedMap = getOrderPackedQtys(order);
    const updated = { ...plItemInputs };
    (order.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service').forEach(item => {
      const ordered = Number(item.qty || item.quantity) || 0;
      const packed = packedMap[item.id] || 0;
      const outstanding = Math.max(0, ordered - packed);
      updated[item.id] = {
        ...(updated[item.id] || { boxNumber: 'Box 1', materialColour: item.brand || '—', redList: false, firstFix: false }),
        qty: outstanding
      };
    });
    setPlItemInputs(updated);
  };

  const handleResetPackingQtys = (order) => {
    if (!order) return;
    const updated = { ...plItemInputs };
    (order.itemsList || []).forEach(item => {
      if (updated[item.id]) {
        updated[item.id] = { ...updated[item.id], qty: 0 };
      }
    });
    setPlItemInputs(updated);
  };

  // Save Packing List
  const handleSavePackingList = (e) => {
    e.preventDefault();
    if (!plOrderKey) return;
    const [pKey, oId] = plOrderKey.split('_');
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    const packedMap = getOrderPackedQtys(order);
    const plItems = [];
    let hasItems = false;

    (order.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service').forEach(item => {
      const ordered = Number(item.qty || item.quantity) || 0;
      const packed = packedMap[item.id] || 0;
      const outstanding = Math.max(0, ordered - packed);
      
      const inputs = plItemInputs[item.id] || {};
      const qtyToPack = Math.min(outstanding, Math.max(0, Number(inputs.qty) || 0));

      if (qtyToPack > 0) {
        hasItems = true;
        plItems.push({
          id: item.id,
          type: item.type || item.item_type,
          code: item.code || item.oneOneCode || 'NA',
          description: item.description || item.name,
          brand: item.brand,
          floor: item.floor,
          area: item.area,
          qtyDelivered: qtyToPack,
          qtyOrdered: ordered,
          boxNumber: inputs.boxNumber || '—',
          materialColour: inputs.materialColour || '—',
          redList: inputs.redList ? 'Yes' : 'No',
          firstFix: inputs.firstFix ? 'Yes' : 'No'
        });
      }
    });

    if (!hasItems) {
      alert('Please specify a packing quantity greater than 0 for at least one item.');
      return;
    }

    const docIndex = getTotalDocCount('packing_list') + 1;
    const dateStr = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const newPl = {
      id: `PL-2026-${String(docIndex).padStart(3, '0')}`,
      date: dateStr,
      notes: plNotes,
      items: plItems,
      deliveryNoteId: ''
    };

    const updatedOrders = (project.orders || []).map(o => {
      if (o.id === oId) {
        return {
          ...o,
          packingLists: [...(o.packingLists || []), newPl]
        };
      }
      return o;
    });

    updateProject(pKey, 'orders', updatedOrders);
    setShowPlModal(false);
    setSelectedDocId(newPl.id);
    setSelectedProjectKey(pKey);
  };

  // Initialize Delivery Note Form
  const handleOpenDnModal = () => {
    setDnOrderKey('');
    setDnNotes('');
    setDnSelectedPlIds({});
    setDnItemEtas({});
    setDnOrderSearchQuery('');
    setShowDnModal(true);
  };

  // Triggered when an order is selected in the DN creator
  const handleDnOrderChange = (orderKey) => {
    setDnOrderKey(orderKey);
    setDnOrderDropdownOpen(false);
    setDnSelectedPlIds({});
    setDnItemEtas({});
  };

  // Get un-delivered packing lists for selected order
  const getAvailablePls = () => {
    if (!dnOrderKey) return [];
    const [pKey, oId] = dnOrderKey.split('_');
    const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);
    if (!order) return [];
    return (order.packingLists || []).filter(pl => !pl.deliveryNoteId);
  };

  // Aggregated items from checked Packing Lists
  const getAggregatedDnItems = () => {
    const itemsMap = {};
    const availablePls = getAvailablePls();
    
    availablePls.forEach(pl => {
      if (dnSelectedPlIds[pl.id]) {
        (pl.items || []).forEach(pi => {
          if (!itemsMap[pi.id]) {
            itemsMap[pi.id] = {
              id: pi.id,
              type: pi.type,
              code: pi.code,
              description: pi.description,
              brand: pi.brand,
              floor: pi.floor,
              area: pi.area,
              qtyDelivered: 0,
              qtyOrdered: pi.qtyOrdered,
              boxNumbers: [],
              redList: pi.redList,
              firstFix: pi.firstFix
            };
          }
          itemsMap[pi.id].qtyDelivered += Number(pi.qtyDelivered) || 0;
          if (pi.boxNumber && !itemsMap[pi.id].boxNumbers.includes(pi.boxNumber)) {
            itemsMap[pi.id].boxNumbers.push(pi.boxNumber);
          }
          if (pi.redList === 'Yes') itemsMap[pi.id].redList = 'Yes';
          if (pi.firstFix === 'Yes') itemsMap[pi.id].firstFix = 'Yes';
        });
      }
    });

    return Object.values(itemsMap);
  };

  // Save Delivery Note
  const handleSaveDeliveryNote = (e) => {
    e.preventDefault();
    if (!dnOrderKey) return;
    const [pKey, oId] = dnOrderKey.split('_');
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    const dnItems = getAggregatedDnItems();
    if (dnItems.length === 0) {
      alert('Please check at least one Packing List to generate the Delivery Note.');
      return;
    }

    const docIndex = getTotalDocCount('delivery_note') + 1;
    const dateStr = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const newDnId = `DN-2026-${String(docIndex).padStart(3, '0')}`;

    const finalDnItems = dnItems.map(item => ({
      ...item,
      boxNumber: item.boxNumbers.join(', '),
      etaBackOrder: dnItemEtas[item.id] || 'TBD'
    }));

    const newDn = {
      id: newDnId,
      date: dateStr,
      notes: dnNotes,
      packingListIds: Object.keys(dnSelectedPlIds).filter(id => dnSelectedPlIds[id]),
      items: finalDnItems
    };

    const formattedDate = new Date().toISOString().split('T')[0];
    const updatedOrders = (project.orders || []).map(o => {
      if (o.id === oId) {
        const linkedPls = (o.packingLists || []).map(pl => {
          if (dnSelectedPlIds[pl.id]) {
            return { ...pl, deliveryNoteId: newDnId };
          }
          return pl;
        });

        // Sync with Sales Tracker deliveryHistory for items
        const updatedItemsList = (o.itemsList || []).map(item => {
          const dnItem = finalDnItems.find(di => di.id === item.id);
          if (dnItem) {
            const history = Array.isArray(item.deliveryHistory) ? item.deliveryHistory : [];
            const syncTransaction = {
              qty: dnItem.qtyDelivered,
              ref: newDnId,
              date: formattedDate
            };
            return {
              ...item,
              deliveryQty: (Number(item.deliveryQty) || 0) + dnItem.qtyDelivered,
              deliveryHistory: [...history, syncTransaction]
            };
          }
          return item;
        });

        return {
          ...o,
          packingLists: linkedPls,
          deliveryNotes: [...(o.deliveryNotes || []), newDn],
          itemsList: updatedItemsList
        };
      }
      return o;
    });

    updateProject(pKey, 'orders', updatedOrders);
    setShowDnModal(false);
    setSelectedDocId(newDn.id);
    setSelectedProjectKey(pKey);
  };

  // Delete document
  const handleDeleteDoc = (doc) => {
    if (!window.confirm(`Are you sure you want to delete ${doc.id}? This will reverse its quantities.`)) return;
    const project = projects[doc.projectKey];
    if (!project) return;

    const updatedOrders = (project.orders || []).map(o => {
      if (o.id === doc.orderId) {
        if (doc.type === 'packing_list') {
          if (doc.deliveryNoteId) {
            alert(`This Packing List is already delivered on ${doc.deliveryNoteId}. Please delete that Delivery Note first.`);
            return o;
          }
          return {
            ...o,
            packingLists: (o.packingLists || []).filter(pl => pl.id !== doc.id)
          };
        } else {
          // It's a Delivery Note. Unlink corresponding Packing Lists.
          const unlinkedPls = (o.packingLists || []).map(pl => {
            if (pl.deliveryNoteId === doc.id) {
              return { ...pl, deliveryNoteId: '' };
            }
            return pl;
          });

          // Reverse Sales Tracker deliveryHistory quantities for items
          const updatedItemsList = (o.itemsList || []).map(item => {
            const dnItem = (doc.items || []).find(di => di.id === item.id);
            if (dnItem) {
              const history = Array.isArray(item.deliveryHistory) ? item.deliveryHistory : [];
              const cleanedHistory = history.filter(h => h.ref !== doc.id);
              return {
                ...item,
                deliveryQty: Math.max(0, (Number(item.deliveryQty) || 0) - dnItem.qtyDelivered),
                deliveryHistory: cleanedHistory
              };
            }
            return item;
          });

          return {
            ...o,
            packingLists: unlinkedPls,
            deliveryNotes: (o.deliveryNotes || []).filter(dn => dn.id !== doc.id),
            itemsList: updatedItemsList
          };
        }
      }
      return o;
    });

    updateProject(doc.projectKey, 'orders', updatedOrders);
    if (selectedDocId === doc.id) {
      setSelectedDocId(null);
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
            Track Packing Lists (PL) & Delivery Notes (DN) issued for client quotation orders
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            onClick={handleOpenPlModal}
          >
            <Plus size={15} /> New Packing List
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
            onClick={handleOpenDnModal}
          >
            <Plus size={15} /> New Delivery Note
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        {/* Card 1: Total Packing Lists */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Packing Lists (PL)
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalPlCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Clock size={11} /> {kpiStats.pendingPlCount} pending delivery
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-info)' }}>
            <ClipboardList size={20} />
          </div>
        </div>

        {/* Card 2: Total Delivery Notes */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Delivery Notes (DN)
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalDnCount}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <CheckCircle2 size={11} /> Official Dispatches
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-success)' }}>
            <Truck size={20} />
          </div>
        </div>

        {/* Card 3: Total Dispatched Units */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Total Units Dispatched
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {kpiStats.totalDispatchedUnits.toLocaleString()}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
              Across all client orders
            </span>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
            <Package size={20} />
          </div>
        </div>

        {/* Card 4: Active Projects */}
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
        
        {/* Top Filter Tabs */}
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
              ⏳ Undelivered Lists ({kpiStats.pendingPlCount})
            </button>

          </div>

          {selectedDocId && (
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSelectedDocId(null);
                setSelectedProjectKey(null);
              }}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={13} /> Return to Full Ledger View
            </button>
          )}
        </div>

        {/* Search & Filter Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center' }}>
          
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search by Document # (e.g. DN-2026-001), Project, Order PO, Client, or SKU..." 
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

      {/* MAIN DOCUMENT WORKSPACE (Full Width Ledger Table) */}
      <div style={{ width: '100%' }}>
        
        {/* ISSUED DOCUMENTS LEDGER */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} style={{ color: 'var(--text-info)' }} />
              Logistics Documents Ledger ({filteredDocs.length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Click any document to inspect, print or download PDF
            </span>
          </div>

          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
              <Package size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <div>No issued packing lists or delivery notes found.</div>
              <span style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>Click "New Packing List" or "New Delivery Note" above to issue one.</span>
            </div>
          ) : groupingMode === 'project' ? (
            // Grouped By Project View
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '780px', overflowY: 'auto' }}>
              {(() => {
                const groups = {};
                filteredDocs.forEach(doc => {
                  const key = doc.projectKey || 'unassigned';
                  if (!groups[key]) {
                    groups[key] = {
                      projectName: doc.projectName || 'Direct Client / Other',
                      projectClient: doc.projectClient || '',
                      docs: []
                    };
                  }
                  groups[key].docs.push(doc);
                });

                return Object.entries(groups).map(([projKey, group]) => {
                  const isCollapsed = collapsedProjects[projKey] ?? false;
                  return (
                    <div key={projKey} style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                      <div 
                        style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'var(--bg-tertiary)' }}
                        onClick={() => {
                          setCollapsedProjects(prev => ({
                            ...prev,
                            [projKey]: !prev[projKey]
                          }));
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {group.projectName} {group.projectClient && <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>({group.projectClient})</span>}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          {group.docs.length} docs
                        </span>
                      </div>
                      
                      {!isCollapsed && (
                        <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' }}>
                          {group.docs.map(doc => {
                            const isSelected = doc.id === selectedDocId;
                            const isPL = doc.type === 'packing_list';
                            const totalQty = (doc.items || []).reduce((s, i) => s + (Number(i.qtyDelivered) || 0), 0);
                            return (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  setSelectedProjectKey(doc.projectKey);
                                }}
                                className="hover-row"
                                style={{
                                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                                  border: isSelected ? '1.5px solid var(--text-info)' : '1px solid var(--border)',
                                  borderRadius: '8px',
                                  padding: '12px 14px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)', fontSize: '13px' }}>{doc.id}</span>
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    background: isPL ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                    color: isPL ? 'var(--text-info)' : 'var(--text-success)'
                                  }}>
                                    {isPL ? 'Packing List' : 'Delivery Note'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '6px', fontSize: '11.5px' }}>
                                  <span>Order: {doc.orderId}</span>
                                  <span>{doc.items?.length || 0} items ({totalQty} units)</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                  <span>Issued: {doc.date}</span>
                                  {isPL && (
                                    <span style={{ color: doc.deliveryNoteId ? 'var(--text-success)' : 'var(--text-warning)', fontWeight: 600 }}>
                                      {doc.deliveryNoteId ? `Delivered (${doc.deliveryNoteId})` : 'Packed (Ready)'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            // Full Flat Table Ledger
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                    <th style={{ padding: '10px 14px' }}>Document ID</th>
                    <th style={{ padding: '10px 14px' }}>Type</th>
                    <th style={{ padding: '10px 14px' }}>Project & Order</th>
                    <th style={{ padding: '10px 14px' }}>Client</th>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Items & Units</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc, idx) => {
                    const isSelected = doc.id === selectedDocId;
                    const isPL = doc.type === 'packing_list';
                    const totalQty = (doc.items || []).reduce((s, i) => s + (Number(i.qtyDelivered) || 0), 0);

                    return (
                      <tr 
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setSelectedProjectKey(doc.projectKey);
                        }}
                        className="hover-row"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isSelected ? 'rgba(59, 130, 246, 0.10)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-info)' }}>
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
                            color: isPL ? 'var(--text-info)' : 'var(--text-success)'
                          }}>
                            {isPL ? '📦 PL' : '🚚 DN'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.projectName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{doc.orderId}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {doc.projectClient || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {doc.date}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.items?.length || 0} lines</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>({totalQty} pcs)</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isPL ? (
                            doc.deliveryNoteId ? (
                              <span style={{ color: 'var(--text-success)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> {doc.deliveryNoteId}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-warning)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> Packed (Ready)
                              </span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-success)', fontWeight: 600, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Truck size={12} /> Dispatched
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-xs"
                              title="Inspect & Print"
                              style={{ color: 'var(--text-info)' }}
                              onClick={() => {
                                setSelectedDocId(doc.id);
                                setSelectedProjectKey(doc.projectKey);
                              }}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs"
                              title="Delete Document"
                              style={{ color: 'var(--text-danger)' }}
                              onClick={() => handleDeleteDoc(doc)}
                            >
                              <Trash2 size={13} />
                            </button>
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

      </div>

      {/* CENTERED MODAL: HIGH-FIDELITY PRINTABLE DOCUMENT PREVIEW */}
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
            padding: '24px 16px' 
          }}
          onClick={(e) => {
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
              maxWidth: '960px', 
              maxHeight: 'calc(100vh - 48px)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' 
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
                  color: activeDoc.type === 'packing_list' ? 'var(--text-info)' : 'var(--text-success)'
                }}>
                  {activeDoc.type === 'packing_list' ? 'Packing List' : 'Delivery Note'}
                </span>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'monospace' }}>
                  {activeDoc.id}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}
                  onClick={() => window.print()}
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
                <button 
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--text-danger)', border: '1px solid var(--border)', fontSize: '12px' }}
                  onClick={() => handleDeleteDoc(activeDoc)}
                >
                  <Trash2 size={13} /> Delete
                </button>
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
                  maxWidth: '860px', 
                  background: 'white', 
                  color: '#0f172a', 
                  padding: '36px 44px', 
                  borderRadius: '6px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
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
                      fontWeight: 700 
                    }}>
                      {activeDoc.type === 'packing_list' ? 'Logistical Packing List' : 'Official Delivery Note'}
                    </span>
                    <h3 style={{ margin: '6px 0 0 0', fontSize: '17px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {activeDoc.id}
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Date: {activeDoc.date}</span>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontStyle: 'italic' }}>Order Ref: {activeDoc.orderId}</span>
                  </div>
                </div>

                {/* Recipient & Project Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11.5px', color: '#334155', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Client Details</span>
                    <strong style={{ fontSize: '12px' }}>{activeDoc.orderObj?.clientCompany || activeDoc.projectClient || '—'}</strong>
                    <span style={{ display: 'block', marginTop: '2px' }}>Attn: {activeDoc.orderObj?.clientContact || '—'}</span>
                    <span style={{ display: 'block' }}>Phone: {activeDoc.orderObj?.clientPhone || '—'}</span>
                    <span style={{ display: 'block' }}>Email: {activeDoc.orderObj?.clientEmail || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Project Vitals & Destination</span>
                    <strong style={{ fontSize: '12px' }}>{activeDoc.projectName}</strong>
                    <span style={{ display: 'block', whiteSpace: 'pre-line', marginTop: '2px' }}>
                      {activeDoc.orderObj?.deliveryAddress || 'Site Delivery Address specified on project file.'}
                    </span>
                    {activeDoc.projectPm && (
                      <span style={{ display: 'block', marginTop: '3px', fontSize: '10.5px', color: '#64748b' }}>Project Manager: {activeDoc.projectPm}</span>
                    )}
                  </div>
                </div>

                {activeDoc.type === 'packing_list' ? (
                  // PACKING LIST TABLE
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', fontSize: '11px', color: '#475569' }}>
                      <strong>PACKING LOCATION REFERENCE:</strong> Verify items packed in specified boxes for transit.
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '7px 8px', textAlign: 'center', width: '40px' }}>Qty</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Made Code</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Plan Code</th>
                          <th style={{ padding: '7px 8px' }}>Description</th>
                          <th style={{ padding: '7px 8px', width: '65px' }}>Floor</th>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Area</th>
                          <th style={{ padding: '7px 8px', width: '90px' }}>Brand / Finish</th>
                          <th style={{ padding: '7px 8px', width: '75px', textAlign: 'center' }}>Box #</th>
                          <th style={{ padding: '7px 8px', width: '60px', textAlign: 'center' }}>Red List</th>
                          <th style={{ padding: '7px 8px', width: '60px', textAlign: 'center' }}>1st Fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeDoc.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{item.qtyDelivered}</td>
                            <td style={{ padding: '7px 8px', fontWeight: 700, fontFamily: 'monospace' }}>{item.type || '—'}</td>
                            <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#475569' }}>{item.code || '—'}</td>
                            <td style={{ padding: '7px 8px' }}>{item.description}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.floor || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.area || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.materialColour || item.brand || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9', borderRadius: '3px' }}>{item.boxNumber || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: item.redList === 'Yes' ? '#dc2626' : '#94a3b8', fontWeight: item.redList === 'Yes' ? 700 : 400 }}>{item.redList || 'No'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: item.firstFix === 'Yes' ? '#2563eb' : '#94a3b8', fontWeight: item.firstFix === 'Yes' ? 700 : 400 }}>{item.firstFix || 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {activeDoc.notes && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px', fontSize: '11px', color: '#334155', marginBottom: '24px' }}>
                        <strong>Packing Instructions & Notes:</strong>
                        <div style={{ marginTop: '2px', whiteSpace: 'pre-line' }}>{activeDoc.notes}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  // DELIVERY NOTE TABLE
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', fontSize: '11px', color: '#475569' }}>
                      <strong>DELIVERY DISPATCH:</strong> The goods listed below have been dispatched for delivery to site.
                      {activeDoc.packingListIds?.length > 0 && (
                        <div style={{ marginTop: '2px', fontSize: '10.5px', color: '#64748b' }}>
                          Originating Packing Lists: {activeDoc.packingListIds.join(', ')}
                        </div>
                      )}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '7px 8px', textAlign: 'center', width: '40px' }}>Qty</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Made Code</th>
                          <th style={{ padding: '7px 8px', width: '85px' }}>Plan Code</th>
                          <th style={{ padding: '7px 8px' }}>Description</th>
                          <th style={{ padding: '7px 8px', width: '65px' }}>Floor</th>
                          <th style={{ padding: '7px 8px', width: '75px' }}>Area</th>
                          <th style={{ padding: '7px 8px', width: '90px' }}>Brand / Finish</th>
                          <th style={{ padding: '7px 8px', width: '90px', textAlign: 'center' }}>Boxes</th>
                          <th style={{ padding: '7px 8px', width: '75px', textAlign: 'center' }}>ETA B/Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeDoc.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{item.qtyDelivered}</td>
                            <td style={{ padding: '7px 8px', fontWeight: 700, fontFamily: 'monospace' }}>{item.type || '—'}</td>
                            <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#475569' }}>{item.code || '—'}</td>
                            <td style={{ padding: '7px 8px' }}>{item.description}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.floor || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.area || '—'}</td>
                            <td style={{ padding: '7px 8px', color: '#64748b' }}>{item.brand || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9', borderRadius: '3px' }}>{item.boxNumber || '—'}</td>
                            <td style={{ padding: '7px 8px', textAlign: 'center', color: '#64748b' }}>{item.etaBackOrder || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {activeDoc.notes && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px', fontSize: '11px', color: '#334155', marginBottom: '24px' }}>
                        <strong>Delivery Notes & Site Access:</strong>
                        <div style={{ marginTop: '2px', whiteSpace: 'pre-line' }}>{activeDoc.notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* SIGNATURE HANDOVER SECTION */}
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', fontSize: '11px', color: '#334155' }}>
                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '20px' }}>Dispatched By (Warehouse)</span>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>Signature & Name</span>
                      <span>Date: {activeDoc.date}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '20px' }}>Received In Good Condition (Client / Site)</span>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '6px' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                      <span>Signature & Full Name</span>
                      <span>Date: _____ / _____ / 2026</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: NEW PACKING LIST                                     */}
      {/* ------------------------------------------------------------- */}
      {showPlModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 1200, 
            background: 'rgba(0,0,0,0.75)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'center', 
            overflowY: 'auto',
            padding: '24px 16px' 
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPlModal(false); }}
        >
          <div 
            style={{ 
              margin: 'auto',
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '1000px', 
              maxHeight: 'calc(100vh - 48px)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' 
            }}
            onClick={e => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} style={{ color: 'var(--text-info)' }} />
                  Create Logistical Packing List (PL)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a project order and specify packed quantities & box numbers from the BOQ</span>
              </div>
              <button 
                onClick={() => setShowPlModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePackingList} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Order Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Select Destination Project & Quotation Order <span style={{ color: 'var(--text-danger)' }}>*</span>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setPlOrderDropdownOpen(!plOrderDropdownOpen)}
                      className="form-control"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        height: '36px', 
                        background: 'var(--bg-primary)' 
                      }}
                    >
                      <span style={{ fontSize: '12.5px', color: plOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {plOrderKey ? (() => {
                          const [pKey, oId] = plOrderKey.split('_');
                          const ord = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                          return ord ? `${ord.projectName} — ${ord.quote_name || 'Spec Order'} (${ord.id})` : 'Select an order...';
                        })() : 'Select destination order to pack...'}
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {plOrderDropdownOpen && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        marginTop: '4px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        maxHeight: '220px', 
                        overflowY: 'auto', 
                        zIndex: 20, 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)' 
                      }}>
                        {allOrders.map(ord => (
                          <div 
                            key={`${ord.projectKey}_${ord.id}`}
                            onClick={() => {
                              setPlOrderKey(`${ord.projectKey}_${ord.id}`);
                              setPlOrderDropdownOpen(false);
                            }}
                            className="hover-row"
                            style={{ 
                              padding: '8px 12px', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid var(--border)', 
                              fontSize: '12px',
                              background: plOrderKey === `${ord.projectKey}_${ord.id}` ? 'rgba(59, 130, 246, 0.12)' : 'transparent'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ord.projectName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {ord.quote_name || 'Quotation Spec'} • {ord.itemsCount || 0} items • <span style={{ fontFamily: 'monospace' }}>{ord.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Selection Table */}
                {plSelectedOrder && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Select Items To Include In This Packing List
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {Object.values(plItemSelections).filter(v => v.selected && v.qty > 0).length} of {plOrderItems.length} lines packed
                      </span>
                    </div>

                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ width: '36px', textAlign: 'center', padding: '8px 4px' }}>
                              <input 
                                type="checkbox" 
                                checked={plOrderItems.length > 0 && plOrderItems.every(i => plItemSelections[i.id]?.selected)}
                                onChange={e => {
                                  const allChecked = e.target.checked;
                                  const updated = { ...plItemSelections };
                                  plOrderItems.forEach(i => {
                                    if (updated[i.id]) {
                                      updated[i.id].selected = allChecked;
                                    }
                                  });
                                  setPlItemSelections(updated);
                                }}
                              />
                            </th>
                            <th style={{ padding: '8px 10px' }}>Made Code</th>
                            <th style={{ padding: '8px 10px' }}>Plan Code</th>
                            <th style={{ padding: '8px 10px' }}>Description</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center', width: '50px' }}>Total</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center', width: '70px' }}>Pack Qty</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center', width: '80px' }}>Box #</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center', width: '60px' }}>Red List</th>
                            <th style={{ padding: '8px 8px', textAlign: 'center', width: '60px' }}>1st Fix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plOrderItems.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                No items found on this project order.
                              </td>
                            </tr>
                          ) : (
                            plOrderItems.map(item => {
                              const sel = plItemSelections[item.id] || { selected: false, qty: item.qty || 1, boxNumber: 'Box 1', redList: 'No', firstFix: 'No' };
                              return (
                                <tr 
                                  key={item.id} 
                                  style={{ 
                                    borderBottom: '1px solid var(--border)',
                                    background: sel.selected ? 'rgba(59, 130, 246, 0.06)' : 'transparent' 
                                  }}
                                >
                                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={sel.selected}
                                      onChange={e => {
                                        setPlItemSelections(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            selected: e.target.checked
                                          }
                                        }));
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {item.type || '—'}
                                  </td>
                                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--text-info)' }}>
                                    {item.code || '—'}
                                  </td>
                                  <td style={{ padding: '8px 10px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                                    {item.description || '—'}
                                  </td>
                                  <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 600 }}>
                                    {item.qty || 1}
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <input 
                                      type="number"
                                      min={1}
                                      max={item.qty || 999}
                                      value={sel.qty}
                                      disabled={!sel.selected}
                                      onChange={e => {
                                        const v = parseInt(e.target.value) || 1;
                                        setPlItemSelections(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            qty: v
                                          }
                                        }));
                                      }}
                                      className="form-control"
                                      style={{ width: '60px', height: '28px', textAlign: 'center', padding: '2px 4px', margin: '0 auto', fontSize: '11.5px', fontWeight: 700 }}
                                    />
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <input 
                                      type="text"
                                      value={sel.boxNumber}
                                      disabled={!sel.selected}
                                      placeholder="e.g. Box 1"
                                      onChange={e => {
                                        const v = e.target.value;
                                        setPlItemSelections(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            boxNumber: v
                                          }
                                        }));
                                      }}
                                      className="form-control"
                                      style={{ width: '75px', height: '28px', textAlign: 'center', padding: '2px 4px', margin: '0 auto', fontSize: '11.5px' }}
                                    />
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <select
                                      value={sel.redList}
                                      disabled={!sel.selected}
                                      onChange={e => {
                                        const v = e.target.value;
                                        setPlItemSelections(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            redList: v
                                          }
                                        }));
                                      }}
                                      className="form-control"
                                      style={{ width: '56px', height: '28px', padding: '2px 4px', fontSize: '10.5px', color: sel.redList === 'Yes' ? 'var(--text-danger)' : 'inherit' }}
                                    >
                                      <option>No</option>
                                      <option>Yes</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <select
                                      value={sel.firstFix}
                                      disabled={!sel.selected}
                                      onChange={e => {
                                        const v = e.target.value;
                                        setPlItemSelections(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...prev[item.id],
                                            firstFix: v
                                          }
                                        }));
                                      }}
                                      className="form-control"
                                      style={{ width: '56px', height: '28px', padding: '2px 4px', fontSize: '10.5px', color: sel.firstFix === 'Yes' ? 'var(--text-info)' : 'inherit' }}
                                    >
                                      <option>No</option>
                                      <option>Yes</option>
                                    </select>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Packing Instructions & Dispatch Notes
                  </label>
                  <textarea 
                    rows={2}
                    value={plNotes}
                    onChange={e => setPlNotes(e.target.value)}
                    placeholder="e.g. Fragile glass shades packed with heavy bubblewrap in Box 3..."
                    className="form-control"
                    style={{ fontSize: '12px', width: '100%', resize: 'vertical' }}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexShrink: 0 }}>
                <button 
                  type="button" 
                  onClick={() => setShowPlModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!plSelectedOrder || Object.values(plItemSelections).filter(v => v.selected && v.qty > 0).length === 0}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Check size={14} /> Issue Logistical Packing List
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: NEW DELIVERY NOTE                                    */}
      {/* ------------------------------------------------------------- */}
      {showDnModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 1200, 
            background: 'rgba(0,0,0,0.75)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'flex-start', 
            justifyContent: 'center', 
            overflowY: 'auto',
            padding: '24px 16px' 
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDnModal(false); }}
        >
          <div 
            style={{ 
              margin: 'auto',
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '900px', 
              maxHeight: 'calc(100vh - 48px)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' 
            }}
            onClick={e => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={18} style={{ color: 'var(--text-info)' }} />
                  Create Logistical Packing List (PL)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a project order and specify packed quantities & box numbers from the BOQ</span>
              </div>
              <button 
                onClick={() => setShowPlModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePackingList} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Order Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Select Destination Project & Quotation Order <span style={{ color: 'var(--text-danger)' }}>*</span>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setPlOrderDropdownOpen(!plOrderDropdownOpen)}
                      className="form-control"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        height: '36px', 
                        background: 'var(--bg-primary)' 
                      }}
                    >
                      <span style={{ fontSize: '12.5px', color: plOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {plOrderKey ? (() => {
                          const [pKey, oId] = plOrderKey.split('_');
                          const ord = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                          return ord ? `${ord.projectName} ➔ ${ord.quote_name ? `${ord.quote_name} (${ord.id})` : ord.id} [${ord.projectClient || 'Direct'}]` : 'Select Project Order...';
                        })() : 'Select Project Order...'}
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {plOrderDropdownOpen && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        zIndex: 20, 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)', 
                        marginTop: '4px',
                        maxHeight: '280px',
                        overflowY: 'auto'
                      }}>
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
                        {allOrders.filter(o => {
                          const q = plOrderSearchQuery.toLowerCase();
                          return !q || (o.projectName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q) || (o.projectClient || '').toLowerCase().includes(q);
                        }).map(o => (
                          <div 
                            key={`${o.projectKey}_${o.id}`}
                            onClick={() => handlePlOrderChange(`${o.projectKey}_${o.id}`)}
                            className="hover-row"
                            style={{ 
                              padding: '10px 12px', 
                              borderBottom: '1px solid var(--border)', 
                              cursor: 'pointer', 
                              fontSize: '12px',
                              background: plOrderKey === `${o.projectKey}_${o.id}` ? 'rgba(59, 130, 246, 0.12)' : 'transparent'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{o.projectName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span>Order: {o.quote_name ? `${o.quote_name} (${o.id})` : o.id}</span>
                              <span>Client: {o.projectClient || '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table when an Order is Selected */}
                {plOrderKey && (() => {
                  const [pKey, oId] = plOrderKey.split('_');
                  const selectedOrder = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                  if (!selectedOrder) return null;

                  const packedMap = getOrderPackedQtys(selectedOrder);
                  const validItems = (selectedOrder.itemsList || []).filter(item => (item.itemType || item.item_type) !== 'Service');

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            BOQ Items to Pack ({validItems.length} items)
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                            Specify how many units go into which box number
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                            onClick={() => handlePackAllRemaining(selectedOrder)}
                          >
                            <Sparkles size={12} style={{ color: 'var(--text-info)' }} /> Pack All Remaining
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            style={{ border: '1px solid var(--border)', fontSize: '11px' }}
                            onClick={() => handleResetPackingQtys(selectedOrder)}
                          >
                            Reset All to 0
                          </button>
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '360px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              <th style={{ padding: '8px 10px' }}>Code / Type</th>
                              <th style={{ padding: '8px 10px' }}>Description</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Ordered</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Packed</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Remain</th>
                              <th style={{ padding: '8px 10px', width: '90px' }}>Qty to Pack</th>
                              <th style={{ padding: '8px 10px', width: '110px' }}>Box Number</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}>Red List</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}>1st Fix</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validItems.map((item, idx) => {
                              const ordered = Number(item.qty || item.quantity) || 0;
                              const packed = packedMap[item.id] || 0;
                              const remaining = Math.max(0, ordered - packed);
                              const inputs = plItemInputs[item.id] || { qty: remaining, boxNumber: 'Box 1', redList: false, firstFix: false };
                              const isComplete = remaining === 0;

                              return (
                                <tr 
                                  key={item.id}
                                  style={{ 
                                    borderBottom: '1px solid var(--border)',
                                    background: isComplete ? 'rgba(34, 197, 94, 0.04)' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent'),
                                    opacity: isComplete ? 0.6 : 1
                                  }}
                                >
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', display: 'block' }}>{item.type || '—'}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.code || item.oneOneCode || '—'}</span>
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.description || item.name}</div>
                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.brand || '—'} • {item.area || 'General Area'}</span>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>{ordered}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{packed}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: remaining > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>
                                    {remaining}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <input 
                                      type="number"
                                      min="0"
                                      max={remaining}
                                      disabled={isComplete}
                                      className="form-control"
                                      style={{ height: '28px', padding: '2px 6px', fontSize: '12px', textAlign: 'center', background: 'var(--bg-secondary)', fontWeight: 700 }}
                                      value={inputs.qty ?? ''}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setPlItemInputs(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...(prev[item.id] || { boxNumber: 'Box 1', redList: false, firstFix: false }),
                                            qty: val
                                          }
                                        }));
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <input 
                                      type="text"
                                      disabled={isComplete}
                                      placeholder="e.g. Box 1"
                                      className="form-control"
                                      style={{ height: '28px', padding: '2px 6px', fontSize: '11px', background: 'var(--bg-secondary)' }}
                                      value={inputs.boxNumber || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setPlItemInputs(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...(prev[item.id] || { qty: remaining, redList: false, firstFix: false }),
                                            boxNumber: val
                                          }
                                        }));
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      disabled={isComplete}
                                      onClick={() => {
                                        setPlItemInputs(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...(prev[item.id] || { qty: remaining, boxNumber: 'Box 1', firstFix: false }),
                                            redList: !inputs.redList
                                          }
                                        }));
                                      }}
                                      style={{
                                        border: 'none',
                                        background: inputs.redList ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-secondary)',
                                        color: inputs.redList ? 'var(--text-danger)' : 'var(--text-tertiary)',
                                        fontWeight: 700,
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {inputs.redList ? 'YES' : 'NO'}
                                    </button>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      disabled={isComplete}
                                      onClick={() => {
                                        setPlItemInputs(prev => ({
                                          ...prev,
                                          [item.id]: {
                                            ...(prev[item.id] || { qty: remaining, boxNumber: 'Box 1', redList: false }),
                                            firstFix: !inputs.firstFix
                                          }
                                        }));
                                      }}
                                      style={{
                                        border: 'none',
                                        background: inputs.firstFix ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                                        color: inputs.firstFix ? 'var(--text-info)' : 'var(--text-tertiary)',
                                        fontWeight: 700,
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {inputs.firstFix ? 'YES' : 'NO'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Notes Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Packing Notes / Box Labeling Instructions
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Enter any special packing instructions, fragile handling notes, or box details..."
                    className="form-control"
                    style={{ fontSize: '12px', background: 'var(--bg-primary)' }}
                    value={plNotes}
                    onChange={e => setPlNotes(e.target.value)}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPlModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!plOrderKey}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Generate Packing List 📦
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: NEW DELIVERY NOTE                                    */}
      {/* ------------------------------------------------------------- */}
      {showDnModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDnModal(false); }}
        >
          <div 
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}
            onClick={e => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} style={{ color: 'var(--text-success)' }} />
                  Create Official Delivery Note (DN)
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select an order and check which available Packing Lists to dispatch for delivery</span>
              </div>
              <button 
                onClick={() => setShowDnModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDeliveryNote} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Order Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Select Project & Quotation Order <span style={{ color: 'var(--text-danger)' }}>*</span>
                  </label>
                  
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setDnOrderDropdownOpen(!dnOrderDropdownOpen)}
                      className="form-control"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer', 
                        height: '36px', 
                        background: 'var(--bg-primary)' 
                      }}
                    >
                      <span style={{ fontSize: '12.5px', color: dnOrderKey ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {dnOrderKey ? (() => {
                          const [pKey, oId] = dnOrderKey.split('_');
                          const ord = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                          return ord ? `${ord.projectName} ➔ ${ord.quote_name ? `${ord.quote_name} (${ord.id})` : ord.id} [${ord.projectClient || 'Direct'}]` : 'Select Project Order...';
                        })() : 'Select Project Order...'}
                      </span>
                      <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
                    </div>

                    {dnOrderDropdownOpen && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        zIndex: 20, 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.4)', 
                        marginTop: '4px',
                        maxHeight: '280px',
                        overflowY: 'auto'
                      }}>
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
                        {allOrders.filter(o => {
                          const q = dnOrderSearchQuery.toLowerCase();
                          return !q || (o.projectName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q) || (o.projectClient || '').toLowerCase().includes(q);
                        }).map(o => (
                          <div 
                            key={`${o.projectKey}_${o.id}`}
                            onClick={() => handleDnOrderChange(`${o.projectKey}_${o.id}`)}
                            className="hover-row"
                            style={{ 
                              padding: '10px 12px', 
                              borderBottom: '1px solid var(--border)', 
                              cursor: 'pointer', 
                              fontSize: '12px',
                              background: dnOrderKey === `${o.projectKey}_${o.id}` ? 'rgba(34, 197, 94, 0.12)' : 'transparent'
                            }}
                          >
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{o.projectName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span>Order: {o.quote_name ? `${o.quote_name} (${o.id})` : o.id}</span>
                              <span>Client: {o.projectClient || '—'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Packing Lists Checklist */}
                {dnOrderKey && (() => {
                  const availablePls = getAvailablePls();

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Available Un-Delivered Packing Lists ({availablePls.length})
                      </span>

                      {availablePls.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                          No pending Packing Lists available for this order. Please create a Packing List first.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {availablePls.map(pl => {
                            const isChecked = !!dnSelectedPlIds[pl.id];
                            const totalUnits = (pl.items || []).reduce((s, i) => s + (Number(i.qtyDelivered) || 0), 0);

                            return (
                              <div
                                key={pl.id}
                                onClick={() => {
                                  setDnSelectedPlIds(prev => ({
                                    ...prev,
                                    [pl.id]: !prev[pl.id]
                                  }));
                                }}
                                style={{
                                  border: isChecked ? '1px solid var(--text-success)' : '1px solid var(--border)',
                                  background: isChecked ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-primary)',
                                  borderRadius: '8px',
                                  padding: '12px 14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <div>
                                    <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '13px' }}>
                                      {pl.id}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                      Issued: {pl.date}
                                    </span>
                                  </div>
                                </div>

                                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {pl.items?.length || 0} line items ({totalUnits} total units)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Aggregated Items Preview */}
                {dnOrderKey && Object.values(dnSelectedPlIds).some(Boolean) && (() => {
                  const dnItems = getAggregatedDnItems();

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Delivery Dispatch Summary ({dnItems.length} unique items)
                      </span>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)' }}>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                              <th style={{ padding: '6px 10px' }}>Qty</th>
                              <th style={{ padding: '6px 10px' }}>Code / Type</th>
                              <th style={{ padding: '6px 10px' }}>Description</th>
                              <th style={{ padding: '6px 10px' }}>Boxes Included</th>
                              <th style={{ padding: '6px 10px', width: '120px' }}>Backorder ETA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dnItems.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--bg-primary)' : 'transparent' }}>
                                <td style={{ padding: '6px 10px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>{item.qtyDelivered}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 700, fontFamily: 'monospace' }}>{item.type || item.code}</td>
                                <td style={{ padding: '6px 10px' }}>{item.description}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.boxNumbers.join(', ') || '—'}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <input 
                                    type="text"
                                    placeholder="e.g. 2 weeks"
                                    className="form-control"
                                    style={{ height: '24px', padding: '2px 6px', fontSize: '10.5px', background: 'var(--bg-secondary)' }}
                                    value={dnItemEtas[item.id] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setDnItemEtas(prev => ({ ...prev, [item.id]: val }));
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Delivery Notes Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Delivery & Site Access Notes
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Enter site contact details, delivery driver instructions, gate codes, etc..."
                    className="form-control"
                    style={{ fontSize: '12px', background: 'var(--bg-primary)' }}
                    value={dnNotes}
                    onChange={e => setDnNotes(e.target.value)}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowDnModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!dnOrderKey || !Object.values(dnSelectedPlIds).some(Boolean)}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Generate Delivery Note 🚚
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
