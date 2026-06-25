import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  Truck, ClipboardList, FileText, Plus, Printer, 
  ArrowLeft, Search, CheckCircle, AlertCircle, Eye, Trash2, HelpCircle 
} from 'lucide-react';

export default function LogisticsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateProject, getModuleName } = useStore();
  
  // Search & ledger navigation state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);

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
    // Clear state so that refresh or navigation doesn't stick
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal display states
  const [showPlModal, setShowPlModal] = useState(false);
  const [showDnModal, setShowDnModal] = useState(false);

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
  const allOrders = Object.values(projects).flatMap(p => 
    (p.orders || []).map(o => ({
      ...o,
      projectKey: p.key,
      projectName: p.name,
      projectClient: p.client,
    }))
  );

  // Gather all issued documents (Packing Lists and Delivery Notes) across all orders
  const allDocs = [];
  allOrders.forEach(order => {
    // Collect Packing Lists
    (order.packingLists || []).forEach(pl => {
      allDocs.push({
        ...pl,
        type: 'packing_list',
        orderId: order.id,
        projectKey: order.projectKey,
        projectName: order.projectName,
        projectClient: order.projectClient,
        supplier: order.supplier,
        orderObj: order
      });
    });
    // Collect Delivery Notes
    (order.deliveryNotes || []).forEach(dn => {
      allDocs.push({
        ...dn,
        type: 'delivery_note',
        orderId: order.id,
        projectKey: order.projectKey,
        projectName: order.projectName,
        projectClient: order.projectClient,
        supplier: order.supplier,
        orderObj: order
      });
    });
  });

  // Sort documents by date/id descending
  allDocs.sort((a, b) => b.id.localeCompare(a.id));

  // Filtered documents for ledger
  const filteredDocs = allDocs.filter(doc => 
    doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selected document to preview
  const activeDoc = allDocs.find(d => d.id === selectedDocId);

  // Helper: Count total documents created globally to generate serial numbers
  const getTotalDocCount = (type) => {
    return allDocs.filter(d => d.type === type).length;
  };

  // Helper: Calculate previously packed quantities for an order
  const getOrderPackedQtys = (order, excludePlId = null) => {
    const map = {};
    (order.itemsList || []).forEach(item => {
      map[item.id] = 0;
    });
    (order.packingLists || []).forEach(pl => {
      if (excludePlId && pl.id === excludePlId) return;
      (pl.items || []).forEach(pi => {
        if (map[pi.id] !== undefined) {
          map[pi.id] += Number(pi.qtyDelivered) || 0;
        }
      });
    });
    return map;
  };

  // Helper: Calculate previously delivered quantities for an order (across saved DNs)
  const getOrderDeliveredQtys = (order, excludeDnId = null) => {
    const map = {};
    (order.itemsList || []).forEach(item => {
      map[item.id] = 0;
    });
    (order.deliveryNotes || []).forEach(dn => {
      if (excludeDnId && dn.id === excludeDnId) return;
      (dn.items || []).forEach(di => {
        if (map[di.id] !== undefined) {
          map[di.id] += Number(di.qtyDelivered) || 0;
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
    setShowPlModal(true);
  };

  // Triggered when an order is selected in the PL creator
  const handlePlOrderChange = (orderKey) => {
    setPlOrderKey(orderKey);
    if (!orderKey) {
      setPlItemInputs({});
      return;
    }
    const [pKey, oId] = orderKey.split('_');
    const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);
    if (!order) return;

    const packedMap = getOrderPackedQtys(order);
    const initialInputs = {};
    (order.itemsList || []).forEach(item => {
      const ordered = Number(item.qty) || 0;
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

    (order.itemsList || []).forEach(item => {
      const ordered = Number(item.qty) || 0;
      const packed = packedMap[item.id] || 0;
      const outstanding = Math.max(0, ordered - packed);
      
      const inputs = plItemInputs[item.id] || {};
      const qtyToPack = Math.min(outstanding, Math.max(0, Number(inputs.qty) || 0));

      if (qtyToPack > 0) {
        hasItems = true;
        plItems.push({
          id: item.id,
          type: item.type, // Made Code
          code: item.code || 'NA', // Plan Code
          description: item.description,
          brand: item.brand,
          floor: item.floor,
          area: item.area,
          qtyDelivered: qtyToPack, // Current packed qty
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
      deliveryNoteId: '' // not yet delivered
    };

    const updatedOrders = project.orders.map(o => {
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
    setShowDnModal(true);
  };

  // Triggered when an order is selected in the DN creator
  const handleDnOrderChange = (orderKey) => {
    setDnOrderKey(orderKey);
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

    // Map fields
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

    // Update Project state: add DN and link PLs
    const formattedDate = new Date().toISOString().split('T')[0];
    const updatedOrders = project.orders.map(o => {
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

    const updatedOrders = project.orders.map(o => {
      if (o.id === doc.orderId) {
        if (doc.type === 'packing_list') {
          // If linked to a DN, alert user first
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
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTION FOR PREMIUM CLEAN DOCUMENT PRINTING */}
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
            padding: 0 !important;
            box-shadow: none !important;
            color: black !important;
            background: white !important;
          }
        }
      `}</style>

      {/* TOP HEADER STATUS ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            {getModuleName('logistics', 'Logistics')} & Warehousing Module
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Track Packing Lists (PL) & Delivery Notes (DN) issued for client orders
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleOpenPlModal}
          >
            <Plus size={14} /> New Packing List
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleOpenDnModal}
          >
            <Plus size={14} /> New Delivery Note
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDocId ? '400px 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ISSUED DOCUMENTS LEDGER */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              📋 Logistical Documents Ledger
            </h3>
            {selectedDocId && (
              <button 
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setSelectedDocId(null);
                  setSelectedProjectKey(null);
                }}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={12} /> Clear Preview
              </button>
            )}
          </div>

          <div className="search-box-container" style={{ position: 'relative' }}>
            <Search size={14} className="search-icon" style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search documents, projects, orders, or suppliers..." 
              className="form-control"
              style={{ paddingLeft: '32px', height: '32px', fontSize: '12.5px', background: 'var(--bg-primary)' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto', paddingRight: '2px' }}>
            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No issued packing lists or delivery notes found.
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isSelected = doc.id === selectedDocId;
                const isPL = doc.type === 'packing_list';
                const totalQty = doc.items.reduce((s, i) => s + (Number(i.qtyDelivered) || 0), 0);
                
                return (
                  <div 
                    key={doc.id}
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setSelectedProjectKey(doc.projectKey);
                    }}
                    style={{
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-primary)',
                      border: isSelected ? '1px solid var(--text-info)' : '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {doc.id}
                      </span>
                      <span style={{ 
                        fontSize: '9px', 
                        background: isPL ? '#1e3a8a' : '#14532d',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontWeight: 700
                      }}>
                        {isPL ? 'Packing List' : 'Delivery Note'}
                      </span>
                    </div>

                    <div 
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-info)', marginTop: '4px', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${doc.projectKey}`); }}
                    >
                      {doc.projectName}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      <span>Order: {doc.orderId}</span>
                      <span>Items: {totalQty}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      <span>Issued: {doc.date}</span>
                      {isPL && (
                        <span style={{ color: doc.deliveryNoteId ? 'var(--text-success)' : 'var(--text-warning)', fontWeight: 600 }}>
                          {doc.deliveryNoteId ? `Delivered (${doc.deliveryNoteId})` : 'Packed (Ready)'}
                        </span>
                      )}
                      <button 
                        className="btn btn-ghost btn-xs"
                        style={{ color: 'var(--text-danger)', padding: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc);
                        }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY PRINTABLE DOCUMENT PREVIEW */}
        {activeDoc && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-info)', fontWeight: 700 }}>
                📄 Live Document Canvas Preview ({activeDoc.id})
              </h3>
              <button 
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print / Save PDF 🖨️
              </button>
            </div>

            {/* HIGH FIDELITY LIVE CANVAS PREVIEW */}
            <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '4px' }}>
              <div 
                id="print-shipment-canvas" 
                style={{ 
                  width: '100%', 
                  maxWidth: '840px', 
                  background: 'white', 
                  color: '#1e293b', 
                  padding: '40px 50px', 
                  borderRadius: '8px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {/* Header Letterhead */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                      ONE TO ONE LIGHTING DESIGN
                    </h2>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      VAT Reg No: 4590312965 • Reg No: 2022/863083/07
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
                      {activeDoc.type === 'packing_list' ? 'Logistical Packing List' : 'Warehouse Delivery Note'}
                    </span>
                    <h3 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      {activeDoc.id}
                    </h3>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>Date: {activeDoc.date}</span>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontStyle: 'italic' }}>Order Ref: {activeDoc.orderId}</span>
                  </div>
                </div>

                {/* Recipient details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px', color: '#334155', marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Client Details</span>
                    <strong>{activeDoc.orderObj?.clientCompany || activeDoc.projectClient || '—'}</strong>
                    <span style={{ display: 'block' }}>Attn: {activeDoc.orderObj?.clientContact || '—'}</span>
                    <span style={{ display: 'block' }}>Phone: {activeDoc.orderObj?.clientPhone || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Project Vitals & Destination</span>
                    <strong>{activeDoc.projectName}</strong>
                    <span style={{ display: 'block', whiteSpace: 'pre-line', marginTop: '2px' }}>{activeDoc.orderObj?.deliveryAddress || 'No address specified.'}</span>
                  </div>
                </div>

                {activeDoc.type === 'packing_list' ? (
                  // PACKING LIST VIEW
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', fontSize: '10.5px', color: '#475569' }}>
                      <strong>PACKING LOCATION REFERENCE:</strong> Use this list to verify which boxes contain the specified area fixtures.
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '30px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '6px 8px', textAlign: 'center', width: '40px' }}>Qty</th>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Made Code</th>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Plan Code</th>
                          <th style={{ padding: '6px 8px' }}>Description</th>
                          <th style={{ padding: '6px 8px', width: '70px' }}>Floor</th>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Area</th>
                          <th style={{ padding: '6px 8px', width: '100px' }}>Material/Colour</th>
                          <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Box Number</th>
                          <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Back Order</th>
                          <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Red List</th>
                          <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>First Fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.items.map(item => {
                          const prevPacked = getOrderPackedQtys(activeDoc.orderObj, activeDoc.id)[item.id] || 0;
                          const backOrder = Math.max(0, item.qtyOrdered - (prevPacked + item.qtyDelivered));
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{item.qtyDelivered}</td>
                              <td style={{ padding: '8px 6px', fontWeight: 600 }}>{item.type}</td>
                              <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>{item.code}</td>
                              <td style={{ padding: '8px 6px' }}>{item.description}</td>
                              <td style={{ padding: '8px 6px' }}>{item.floor}</td>
                              <td style={{ padding: '8px 6px' }}>{item.area}</td>
                              <td style={{ padding: '8px 6px' }}>{item.materialColour}</td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, background: '#f8fafc' }}>{item.boxNumber}</td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', color: backOrder > 0 ? '#b45309' : '#1e293b' }}>
                                {backOrder > 0 ? backOrder : '—'}
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', color: item.redList === 'Yes' ? '#dc2626' : '#64748b' }}>
                                {item.redList === 'Yes' ? 'Yes' : 'No'}
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                {item.firstFix === 'Yes' ? 'Yes' : 'No'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // DELIVERY NOTE VIEW
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', fontSize: '10.5px', color: '#475569' }}>
                      <strong>DELIVERY CONFIRMATION NOTE:</strong> Verify hardware totals before signing off. Return one signed copy to the delivery agent.
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '30px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Made Code</th>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Plan Code</th>
                          <th style={{ padding: '6px 8px' }}>Description</th>
                          <th style={{ padding: '6px 8px', width: '50px', textAlign: 'center' }}>QTY</th>
                          <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>QTY Back Order</th>
                          <th style={{ padding: '6px 8px', width: '80px' }}>Packed</th>
                          <th style={{ padding: '6px 8px', width: '90px' }}>ETA Back Order</th>
                          <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Previously Delivered</th>
                          <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>Red List Items</th>
                          <th style={{ padding: '6px 8px', width: '60px', textAlign: 'center' }}>First Fix Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeDoc.items.map(item => {
                          const prevDelivered = getOrderDeliveredQtys(activeDoc.orderObj, activeDoc.id)[item.id] || 0;
                          const backOrder = Math.max(0, item.qtyOrdered - (prevDelivered + item.qtyDelivered));
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 6px', fontWeight: 600 }}>{item.type}</td>
                              <td style={{ padding: '8px 6px', fontFamily: 'monospace' }}>{item.code}</td>
                              <td style={{ padding: '8px 6px' }}>{item.description}</td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{item.qtyDelivered}</td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', color: backOrder > 0 ? '#b45309' : '#1e293b' }}>
                                {backOrder > 0 ? backOrder : '—'}
                              </td>
                              <td style={{ padding: '8px 6px', fontWeight: 500 }}>{item.boxNumber}</td>
                              <td style={{ padding: '8px 6px' }}>{backOrder > 0 ? item.etaBackOrder : '—'}</td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', color: prevDelivered > 0 ? '#166534' : '#64748b' }}>
                                {prevDelivered || '—'}
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center', color: item.redList === 'Yes' ? '#dc2626' : '#64748b' }}>
                                {item.redList === 'Yes' ? 'Yes' : 'No'}
                              </td>
                              <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                {item.firstFix === 'Yes' ? 'Yes' : 'No'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* WAREHOUSE SIGN-OFF FOOTER */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', fontSize: '11px', marginTop: '40px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                      <div>
                        <span>Dispatched by (Warehouse Manager):</span>
                        <div style={{ borderBottom: '1px solid #94a3b8', height: '28px', marginTop: '2px' }}></div>
                        <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>Sign & Date</span>
                      </div>
                      <div>
                        <span>Received in good order by (Client):</span>
                        <div style={{ borderBottom: '1px solid #94a3b8', height: '28px', marginTop: '2px' }}></div>
                        <span style={{ fontSize: '9px', color: '#64748b', display: 'block', marginTop: '2px' }}>Sign & Date</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                  <span>Reference: {activeDoc.notes || 'None'}</span>
                  <span>System Log Portal</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE PACKING LIST MODAL */}
      {showPlModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>📦 Create New Packing List</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPlModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSavePackingList}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Select Order Reference</label>
                  <select 
                    className="form-control"
                    required
                    style={{ height: '32px', fontSize: '12.5px' }}
                    value={plOrderKey}
                    onChange={e => handlePlOrderChange(e.target.value)}
                  >
                    <option value="">-- Select Order --</option>
                    {allOrders.map(o => (
                      <option key={`${o.projectKey}_${o.id}`} value={`${o.projectKey}_${o.id}`}>
                        {o.id} - {o.projectName} ({o.supplier})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Shipping Reference / Notes</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="E.g. Consignment #, driver info, box counts..."
                    style={{ height: '32px', fontSize: '12.5px' }}
                    value={plNotes}
                    onChange={e => setPlNotes(e.target.value)}
                  />
                </div>
              </div>

              {plOrderKey ? (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '20px', maxHeight: '400px' }}>
                  <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)', borderBottom: '1.5px solid var(--border)', color: 'var(--text-primary)' }}>
                        <th style={{ padding: '8px 12px' }}>Area / Space</th>
                        <th style={{ padding: '8px 12px' }}>Fixture Code & Desc</th>
                        <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}>Ordered</th>
                        <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>Outstanding</th>
                        <th style={{ padding: '8px 12px', width: '90px', textAlign: 'center' }}>To Pack</th>
                        <th style={{ padding: '8px 12px', width: '100px' }}>Box Number</th>
                        <th style={{ padding: '8px 12px', width: '100px' }}>Material/Colour</th>
                        <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}>Red List</th>
                        <th style={{ padding: '8px 12px', width: '60px', textAlign: 'center' }}>First Fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const [pKey, oId] = plOrderKey.split('_');
                        const order = allOrders.find(o => o.projectKey === pKey && o.id === oId);
                        if (!order) return null;

                        const packedMap = getOrderPackedQtys(order);

                        return (order.itemsList || []).map(item => {
                          const ordered = Number(item.qty) || 0;
                          const packed = packedMap[item.id] || 0;
                          const outstanding = Math.max(0, ordered - packed);
                          const isCompleted = outstanding === 0;
                          const inputs = plItemInputs[item.id] || {};

                          const handleInputChange = (field, val) => {
                            setPlItemInputs(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                [field]: val
                              }
                            }));
                          };

                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', opacity: isCompleted ? 0.6 : 1 }}>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block' }}>{item.floor}</span>
                                <strong>{item.area}</strong>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <strong>{item.type}</strong> — {item.description}
                                <span style={{ fontSize: '9px', display: 'block', color: 'var(--text-info)', fontFamily: 'monospace' }}>{item.code}</span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold' }}>{ordered}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', color: outstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)' }}>{outstanding}</td>
                              <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                                {isCompleted ? (
                                  <span style={{ fontSize: '10px', color: 'var(--text-success)', fontWeight: 'bold' }}>✓ Packed</span>
                                ) : (
                                  <input 
                                    type="number"
                                    min="0"
                                    max={outstanding}
                                    className="form-control"
                                    style={{ height: '24px', padding: '2px 4px', textAlign: 'center', width: '60px', fontSize: '11.5px' }}
                                    value={inputs.qty || 0}
                                    onChange={e => handleInputChange('qty', Math.min(outstanding, Math.max(0, parseInt(e.target.value) || 0)))}
                                  />
                                )}
                              </td>
                              <td style={{ padding: '4px 12px' }}>
                                <input 
                                  type="text" 
                                  className="form-control"
                                  disabled={isCompleted}
                                  style={{ height: '24px', padding: '2px 6px', fontSize: '11.5px' }}
                                  value={inputs.boxNumber || ''}
                                  onChange={e => handleInputChange('boxNumber', e.target.value)}
                                  placeholder="Box 1"
                                />
                              </td>
                              <td style={{ padding: '4px 12px' }}>
                                <input 
                                  type="text" 
                                  className="form-control"
                                  disabled={isCompleted}
                                  style={{ height: '24px', padding: '2px 6px', fontSize: '11.5px' }}
                                  value={inputs.materialColour || ''}
                                  onChange={e => handleInputChange('materialColour', e.target.value)}
                                  placeholder="Material/Colour"
                                />
                              </td>
                              <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox"
                                  disabled={isCompleted}
                                  checked={!!inputs.redList}
                                  onChange={e => handleInputChange('redList', e.target.checked)}
                                />
                              </td>
                              <td style={{ padding: '4px 12px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox"
                                  disabled={isCompleted}
                                  checked={!!inputs.firstFix}
                                  onChange={e => handleInputChange('firstFix', e.target.checked)}
                                />
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: '8px', marginBottom: '20px' }}>
                  Please select an order reference to load fixtures list.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPlModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!plOrderKey}>Save Packing List</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DELIVERY NOTE MODAL */}
      {showDnModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '1100px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>🚚 Create New Delivery Note</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDnModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveDeliveryNote}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Select Order Reference</label>
                  <select 
                    className="form-control"
                    required
                    style={{ height: '32px', fontSize: '12.5px' }}
                    value={dnOrderKey}
                    onChange={e => handleDnOrderChange(e.target.value)}
                  >
                    <option value="">-- Select Order --</option>
                    {allOrders.map(o => (
                      <option key={`${o.projectKey}_${o.id}`} value={`${o.projectKey}_${o.id}`}>
                        {o.id} - {o.projectName} ({o.supplier})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Delivery Reference / ETA Notes</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Driver, vehicle info, dispatch ETA details..."
                    style={{ height: '32px', fontSize: '12.5px' }}
                    value={dnNotes}
                    onChange={e => setDnNotes(e.target.value)}
                  />
                </div>
              </div>

              {dnOrderKey ? (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', marginBottom: '20px' }}>
                  
                  {/* PACKING LIST SELECTOR PANEL */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-info)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Select Packing Lists to Deliver
                    </span>
                    {getAvailablePls().length === 0 ? (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', padding: '20px 5px' }}>
                        No un-delivered Packing Lists found for this order. Please create a Packing List first.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {getAvailablePls().map(pl => {
                          const plQty = pl.items.reduce((s, i) => s + i.qtyDelivered, 0);
                          return (
                            <label 
                              key={pl.id}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: 'var(--bg-primary)', 
                                padding: '8px', 
                                borderRadius: '6px', 
                                border: '1px solid var(--border)',
                                fontSize: '11.5px',
                                cursor: 'pointer' 
                              }}
                            >
                              <input 
                                type="checkbox"
                                checked={!!dnSelectedPlIds[pl.id]}
                                onChange={e => {
                                  const val = e.target.checked;
                                  setDnSelectedPlIds(prev => ({ ...prev, [pl.id]: val }));
                                }}
                              />
                              <div>
                                <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{pl.id}</span>
                                <span style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                                  Qty: {plQty} • Packed: {pl.date}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* AGGREGATED VIEW PREVIEW */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-primary)', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', borderRadius: '8px 8px 0 0' }}>
                      Aggregated Delivery Items Preview
                    </span>

                    {getAggregatedDnItems().length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '50px 10px', color: 'var(--text-tertiary)', fontSize: '12px', flexGrow: 1 }}>
                        Check one or more Packing Lists on the left to aggregate delivery items.
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', flexGrow: 1, maxHeight: '350px' }}>
                        <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                              <th style={{ padding: '6px 10px' }}>Fixture Code & Desc</th>
                              <th style={{ padding: '6px 10px', width: '50px', textAlign: 'center' }}>QTY</th>
                              <th style={{ padding: '6px 10px', width: '90px' }}>Packed In</th>
                              <th style={{ padding: '6px 10px', width: '130px' }}>Back Order ETA</th>
                              <th style={{ padding: '6px 10px', width: '60px', textAlign: 'center' }}>Red List</th>
                              <th style={{ padding: '6px 10px', width: '60px', textAlign: 'center' }}>First Fix</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getAggregatedDnItems().map(item => {
                              return (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '8px 10px' }}>
                                    <strong>{item.type}</strong> — {item.description}
                                    <span style={{ fontSize: '9px', display: 'block', color: 'var(--text-info)', fontFamily: 'monospace' }}>{item.code}</span>
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold' }}>{item.qtyDelivered}</td>
                                  <td style={{ padding: '8px 10px', fontSize: '10px', color: 'var(--text-secondary)' }}>{item.boxNumbers.join(', ')}</td>
                                  <td style={{ padding: '4px 10px' }}>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      style={{ height: '22px', fontSize: '11px', padding: '2px 6px' }}
                                      value={dnItemEtas[item.id] || ''}
                                      onChange={e => {
                                        const val = e.target.value;
                                        setDnItemEtas(prev => ({ ...prev, [item.id]: val }));
                                      }}
                                      placeholder="TBD"
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.redList}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.firstFix}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: '8px', marginBottom: '20px' }}>
                  Please select an order reference to load packing lists.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDnModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={getAggregatedDnItems().length === 0}>Save Delivery Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
