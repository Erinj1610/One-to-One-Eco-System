import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  ClipboardList, Plus, FileText, Printer, ArrowLeft, Search, CheckCircle, Trash2, Eye 
} from 'lucide-react';

export default function PurchasingPage() {
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
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Modal display states
  const [showPoModal, setShowPoModal] = useState(false);
  const [showGrnModal, setShowGrnModal] = useState(false);

  // Form states for creating a Purchase Order
  const [poOrderKey, setPoOrderKey] = useState(''); // "projectKey_orderId"
  const [poSupplier, setPoSupplier] = useState(''); // Selected supplier from items
  const [poNotes, setPoNotes] = useState('');
  const [poItemInputs, setPoItemInputs] = useState({}); // { code: { qty, eta } }

  // Form states for creating a GRN
  const [grnPoId, setGrnPoId] = useState(''); // Selected PO ID
  const [grnNotes, setGrnNotes] = useState('');
  const [grnItemInputs, setGrnItemInputs] = useState({}); // { code: { qty } }

  // Form states for editing a PO
  const [showEditPoModal, setShowEditPoModal] = useState(false);
  const [editPoDoc, setEditPoDoc] = useState(null);
  const [editPoNotes, setEditPoNotes] = useState('');
  const [editPoItemEtas, setEditPoItemEtas] = useState({}); // { code: etaString }

  // Gather all orders
  const allOrders = Object.values(projects).flatMap(p => 
    (p.orders || []).map(o => ({
      ...o,
      projectKey: p.key,
      projectName: p.name,
      projectClient: p.client,
    }))
  );

  // Gather all issued POs and GRNs across all orders
  const allDocs = [];
  allOrders.forEach(order => {
    // Collect Purchase Orders
    (order.purchaseOrders || []).forEach(po => {
      allDocs.push({
        ...po,
        type: 'purchase_order',
        orderId: order.id,
        projectKey: order.projectKey,
        projectName: order.projectName,
        projectClient: order.projectClient,
        supplier: po.supplier || order.supplier,
        orderObj: order
      });
    });
    // Collect Goods Received Notes
    (order.goodsReceivedNotes || []).forEach(grn => {
      allDocs.push({
        ...grn,
        type: 'goods_received_note',
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
    (doc.supplier && doc.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Selected document to preview
  const activeDoc = allDocs.find(d => d.id === selectedDocId);

  // Helper: Count total documents created globally to generate serial numbers
  const getTotalDocCount = (type) => {
    return allDocs.filter(d => d.type === type).length;
  };

  // Helper: Calculate previously ordered quantities for an order
  const getOrderOrderedQtys = (order, excludePoId = null) => {
    const map = {};
    (order.itemsList || []).forEach(item => {
      const history = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : [];
      map[item.id] = history
        .filter(h => !excludePoId || h.ref !== excludePoId)
        .reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    });
    return map;
  };

  const getOrderReceivedQtys = (order, excludeGrnId = null) => {
    const map = {};
    (order.itemsList || []).forEach(item => {
      const history = Array.isArray(item.receivingHistory) ? item.receivingHistory : [];
      map[item.id] = history
        .filter(h => !excludeGrnId || h.ref !== excludeGrnId)
        .reduce((sum, h) => sum + (Number(h.qty) || 0), 0);
    });
    return map;
  };

  const getUniqueSuppliersForOrder = (order) => {
    if (!order) return [];
    const suppliers = (order.itemsList || [])
      .filter(item => item.stockStatus !== 'All Stock on Hand')
      .map(item => item.supplier || 'Warehouse Inventory');
    return Array.from(new Set(suppliers));
  };

  const getConsolidatedPoItems = (order, filterSupplier) => {
    if (!order) return [];
    const orderedQtys = getOrderOrderedQtys(order);
    const grouped = {};
    (order.itemsList || [])
      .filter(item => item.stockStatus !== 'All Stock on Hand')
      .forEach(item => {
        const itemSupplier = item.supplier || 'Warehouse Inventory';
        if (filterSupplier && itemSupplier !== filterSupplier) return;
        
        const code = item.code || 'NO-CODE';
        const alreadyPo = orderedQtys[item.id] || 0;
        const maxAvailable = Math.max(0, (item.qty || 0) - alreadyPo);

        if (!grouped[code]) {
          grouped[code] = {
            code,
            description: item.description,
            supplier: itemSupplier,
            qty: 0,
            alreadyPo: 0,
            maxAvailable: 0,
            originalItems: []
          };
        }
        grouped[code].qty += Number(item.qty) || 0;
        grouped[code].alreadyPo += alreadyPo;
        grouped[code].maxAvailable += maxAvailable;
        grouped[code].originalItems.push(item);
      });
    return Object.values(grouped);
  };

  const getGrnReceivedForPoItem = (order, poId, itemCode) => {
    if (!order) return 0;
    let totalReceived = 0;
    (order.goodsReceivedNotes || []).forEach(grn => {
      if (grn.poId === poId) {
        (grn.items || []).forEach(gi => {
          if (gi.code === itemCode) {
            totalReceived += Number(gi.qtyAction) || 0;
          }
        });
      }
    });
    return totalReceived;
  };

  // Initialize PO Form
  const handleOpenPoModal = () => {
    setPoOrderKey('');
    setPoSupplier('');
    setPoNotes('');
    setPoItemInputs({});
    setShowPoModal(true);
  };

  // Initialize GRN Form
  const handleOpenGrnModal = () => {
    setGrnPoId('');
    setGrnNotes('');
    setGrnItemInputs({});
    setShowGrnModal(true);
  };

  // Save Purchase Order
  const handleSavePo = (e) => {
    e.preventDefault();
    if (!poOrderKey) return;
    const [pKey, oId] = poOrderKey.split('_');
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    if (!poSupplier) {
      alert('Please select a supplier for this Purchase Order.');
      return;
    }

    const formattedDate = new Date().toISOString().split('T')[0];
    const docIndex = getTotalDocCount('purchase_order') + 1;
    const dateStr = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const newPoId = `PO-2026-${String(docIndex).padStart(3, '0')}`;

    const poItems = [];
    let hasQuantities = false;

    const consolidated = getConsolidatedPoItems(order, poSupplier);
    const updatedItemsList = [...(order.itemsList || [])];
    const orderedQtys = getOrderOrderedQtys(order);

    consolidated.forEach(cItem => {
      const input = poItemInputs[cItem.code] || {};
      const qtyAction = Math.max(0, parseInt(input.qty) || 0);
      const eta = input.eta || 'TBD';

      if (qtyAction > 0) {
        hasQuantities = true;
        
        poItems.push({
          code: cItem.code,
          description: cItem.description,
          qtyAction,
          eta
        });

        // Distribute to individual items
        let remainingToAllocate = qtyAction;
        cItem.originalItems.forEach(origItem => {
          if (remainingToAllocate <= 0) return;
          const alreadyOrdered = orderedQtys[origItem.id] || 0;
          const maxCapacity = origItem.qty || 0;
          const avail = Math.max(0, maxCapacity - alreadyOrdered);
          const toAlloc = Math.min(avail, remainingToAllocate);

          if (toAlloc > 0) {
            remainingToAllocate -= toAlloc;
            const targetIdx = updatedItemsList.findIndex(x => x.id === origItem.id);
            if (targetIdx !== -1) {
              const history = Array.isArray(updatedItemsList[targetIdx].purchaseHistory) ? updatedItemsList[targetIdx].purchaseHistory : [];
              updatedItemsList[targetIdx] = {
                ...updatedItemsList[targetIdx],
                poQtyOrdered: (Number(updatedItemsList[targetIdx].poQtyOrdered) || 0) + toAlloc,
                purchaseHistory: [...history, {
                  id: newPoId,
                  ref: newPoId,
                  date: formattedDate,
                  qty: toAlloc,
                  eta: eta,
                  supplier: poSupplier
                }]
              };
            }
          }
        });

        // Overflow
        if (remainingToAllocate > 0 && cItem.originalItems.length > 0) {
          const origItem = cItem.originalItems[0];
          const targetIdx = updatedItemsList.findIndex(x => x.id === origItem.id);
          if (targetIdx !== -1) {
            const history = Array.isArray(updatedItemsList[targetIdx].purchaseHistory) ? updatedItemsList[targetIdx].purchaseHistory : [];
            updatedItemsList[targetIdx] = {
              ...updatedItemsList[targetIdx],
              poQtyOrdered: (Number(updatedItemsList[targetIdx].poQtyOrdered) || 0) + remainingToAllocate,
              purchaseHistory: [...history, {
                id: newPoId,
                ref: newPoId,
                date: formattedDate,
                qty: remainingToAllocate,
                eta: eta,
                supplier: poSupplier
              }]
            };
          }
        }
      }
    });

    if (!hasQuantities) {
      alert('Please enter at least one quantity to purchase.');
      return;
    }

    const newPo = {
      id: newPoId,
      date: dateStr,
      supplier: poSupplier,
      notes: poNotes,
      items: poItems
    };

    const updatedOrders = project.orders.map(o => {
      if (o.id === oId) {
        return {
          ...o,
          purchaseOrders: [...(o.purchaseOrders || []), newPo],
          itemsList: updatedItemsList
        };
      }
      return o;
    });

    updateProject(pKey, 'orders', updatedOrders);
    setShowPoModal(false);
    setSelectedDocId(newPoId);
    setSelectedProjectKey(pKey);
  };

  // Save GRN
  const handleSaveGrn = (e) => {
    e.preventDefault();
    if (!grnPoId) return;
    const poDoc = allDocs.find(d => d.type === 'purchase_order' && d.id === grnPoId);
    if (!poDoc) return;
    const pKey = poDoc.projectKey;
    const oId = poDoc.orderId;
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    const formattedDate = new Date().toISOString().split('T')[0];
    const docIndex = getTotalDocCount('goods_received_note') + 1;
    const dateStr = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const newGrnId = `GRN-2026-${String(docIndex).padStart(3, '0')}`;

    const grnItems = [];
    let hasQuantities = false;

    const updatedItemsList = [...(order.itemsList || [])];

    (poDoc.items || []).forEach(poItem => {
      const input = grnItemInputs[poItem.code] || {};
      const qtyAction = Math.max(0, parseInt(input.qty) || 0);

      if (qtyAction > 0) {
        hasQuantities = true;
        grnItems.push({
          code: poItem.code,
          description: poItem.description,
          qtyAction
        });

        // Distribute to individual items that belong to this PO
        let remainingToAllocate = qtyAction;
        const matchingItems = updatedItemsList.filter(item => item.code === poItem.code);

        matchingItems.forEach(item => {
          if (remainingToAllocate <= 0) return;

          const pHist = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : [];
          const orderedForPo = pHist.filter(h => h.id === poDoc.id || h.ref === poDoc.id).reduce((sum, h) => sum + (Number(h.qty) || 0), 0);

          const rHist = Array.isArray(item.receivingHistory) ? item.receivingHistory : [];
          const receivedForPo = rHist.filter(h => h.poId === poDoc.id).reduce((sum, h) => sum + (Number(h.qty) || 0), 0);

          const avail = Math.max(0, orderedForPo - receivedForPo);
          const toAlloc = Math.min(avail, remainingToAllocate);

          if (toAlloc > 0) {
            remainingToAllocate -= toAlloc;
            const targetIdx = updatedItemsList.findIndex(x => x.id === item.id);
            if (targetIdx !== -1) {
              const history = Array.isArray(updatedItemsList[targetIdx].receivingHistory) ? updatedItemsList[targetIdx].receivingHistory : [];
              updatedItemsList[targetIdx] = {
                ...updatedItemsList[targetIdx],
                receivedQty: (Number(updatedItemsList[targetIdx].receivedQty) || 0) + toAlloc,
                receivedDate: formattedDate,
                receivingHistory: [...history, {
                  qty: toAlloc,
                  ref: newGrnId,
                  poId: poDoc.id,
                  date: formattedDate
                }]
              };
            }
          }
        });

        // Overflow
        if (remainingToAllocate > 0 && matchingItems.length > 0) {
          const item = matchingItems[0];
          const targetIdx = updatedItemsList.findIndex(x => x.id === item.id);
          if (targetIdx !== -1) {
            const history = Array.isArray(updatedItemsList[targetIdx].receivingHistory) ? updatedItemsList[targetIdx].receivingHistory : [];
            updatedItemsList[targetIdx] = {
              ...updatedItemsList[targetIdx],
              receivedQty: (Number(updatedItemsList[targetIdx].receivedQty) || 0) + remainingToAllocate,
              receivedDate: formattedDate,
              receivingHistory: [...history, {
                qty: remainingToAllocate,
                ref: newGrnId,
                poId: poDoc.id,
                date: formattedDate
              }]
            };
          }
        }
      }
    });

    if (!hasQuantities) {
      alert('Please enter at least one quantity received.');
      return;
    }

    const newGrn = {
      id: newGrnId,
      poId: poDoc.id,
      date: dateStr,
      notes: grnNotes,
      items: grnItems
    };

    const updatedOrders = project.orders.map(o => {
      if (o.id === oId) {
        return {
          ...o,
          goodsReceivedNotes: [...(o.goodsReceivedNotes || []), newGrn],
          itemsList: updatedItemsList
        };
      }
      return o;
    });

    updateProject(pKey, 'orders', updatedOrders);
    setShowGrnModal(false);
    setSelectedDocId(newGrnId);
    setSelectedProjectKey(pKey);
  };

  const handleOpenEditPoModal = (po) => {
    setEditPoDoc(po);
    setEditPoNotes(po.notes || '');
    const etas = {};
    (po.items || []).forEach(item => {
      etas[item.code] = item.eta || '';
    });
    setEditPoItemEtas(etas);
    setShowEditPoModal(true);
  };

  const handleUpdatePo = (e) => {
    e.preventDefault();
    if (!editPoDoc) return;
    const pKey = editPoDoc.projectKey;
    const oId = editPoDoc.orderId;
    const project = projects[pKey];
    if (!project) return;

    const updatedOrders = project.orders.map(o => {
      if (o.id === oId) {
        const updatedPOs = (o.purchaseOrders || []).map(po => {
          if (po.id === editPoDoc.id) {
            const updatedItems = (po.items || []).map(item => ({
              ...item,
              eta: editPoItemEtas[item.code] || item.eta || ''
            }));
            return {
              ...po,
              notes: editPoNotes,
              items: updatedItems
            };
          }
          return po;
        });

        const updatedItemsList = (o.itemsList || []).map(item => {
          const itemEta = editPoItemEtas[item.code];
          if (itemEta !== undefined) {
            const history = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : [];
            const updatedHistory = history.map(h => {
              if (h.ref === editPoDoc.id) {
                return { ...h, eta: itemEta };
              }
              return h;
            });
            return { ...item, purchaseHistory: updatedHistory };
          }
          return item;
        });

        return {
          ...o,
          purchaseOrders: updatedPOs,
          itemsList: updatedItemsList
        };
      }
      return o;
    });

    updateProject(pKey, 'orders', updatedOrders);
    setShowEditPoModal(false);
    setSelectedDocId(null);
    setTimeout(() => {
      setSelectedDocId(editPoDoc.id);
    }, 50);
  };

  // Delete Document
  const handleDeleteDoc = (doc) => {
    if (!window.confirm(`Are you sure you want to delete ${doc.id}? This will reverse its quantities.`)) return;
    const project = projects[doc.projectKey];
    if (!project) return;

    const updatedOrders = project.orders.map(o => {
      if (o.id === doc.orderId) {
        if (doc.type === 'purchase_order') {
          // Check if any GRNs are registered after this PO
          const hasLinkedGrns = (o.goodsReceivedNotes || []).length > 0;
          if (hasLinkedGrns && !window.confirm("Warning: Receiving documents exist on this order. Deleting this PO might invalidate received quantities. Proceed?")) {
            return o;
          }

          // Reverse quantities and remove PO
          const updatedItemsList = (o.itemsList || []).map(item => {
            const poItem = (doc.items || []).find(pi => pi.id === item.id);
            if (poItem) {
              const history = Array.isArray(item.purchaseHistory) ? item.purchaseHistory : [];
              const cleanedHistory = history.filter(h => h.ref !== doc.id);
              return {
                ...item,
                poQtyOrdered: Math.max(0, (Number(item.poQtyOrdered) || 0) - poItem.qtyAction),
                purchaseHistory: cleanedHistory
              };
            }
            return item;
          });

          return {
            ...o,
            purchaseOrders: (o.purchaseOrders || []).filter(po => po.id !== doc.id),
            itemsList: updatedItemsList
          };
        } else {
          // GRN deletion
          const updatedItemsList = (o.itemsList || []).map(item => {
            const grnItem = (doc.items || []).find(gi => gi.id === item.id);
            if (grnItem) {
              const history = Array.isArray(item.receivingHistory) ? item.receivingHistory : [];
              const cleanedHistory = history.filter(h => h.ref !== doc.id);
              return {
                ...item,
                receivedQty: Math.max(0, (Number(item.receivedQty) || 0) - grnItem.qtyAction),
                receivingHistory: cleanedHistory
              };
            }
            return item;
          });

          return {
            ...o,
            goodsReceivedNotes: (o.goodsReceivedNotes || []).filter(grn => grn.id !== doc.id),
            itemsList: updatedItemsList
          };
        }
      }
      return o;
    });

    updateProject(doc.projectKey, 'orders', updatedOrders);
    if (selectedDocId === doc.id) {
      setSelectedDocId(null);
      setSelectedProjectKey(null);
    }
  };

  // Dynamic calculations for selected order in PO form
  const selectedPoOrder = allOrders.find(o => `${o.projectKey}_${o.id}` === poOrderKey);
  const selectedPoOrderedQtys = selectedPoOrder ? getOrderOrderedQtys(selectedPoOrder) : {};



  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={20} style={{ color: 'var(--text-info)' }} />
            Purchasing & Receiving Ledger
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            Create and track Purchase Orders and Goods Received Notes. Updates dynamically flow into the Sales Tracker.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-sm" onClick={handleOpenPoModal} style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--text-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Plus size={14} style={{ marginRight: '4px' }} /> Create PO
          </button>
          <button className="btn btn-sm" onClick={handleOpenGrnModal} style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--text-success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Plus size={14} style={{ marginRight: '4px' }} /> Create GRN
          </button>
        </div>
      </div>

      {/* Main workspace splits */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left Side: Document Ledger List */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search by ID, supplier, project or order ID..."
                className="form-control"
                style={{ paddingLeft: '30px', height: '34px', fontSize: '12px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <button className="btn btn-sm" onClick={() => setSearchQuery('')}>Clear</button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table className="table" style={{ fontSize: '12px' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-secondary)' }}>
                  <th>Document ID</th>
                  <th>Type</th>
                  <th>Project / Client</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Items</th>
                  <th style={{ width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                      No documents found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map(doc => {
                    const isActive = doc.id === selectedDocId;
                    return (
                      <tr 
                        key={doc.id} 
                        className="clickable"
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setSelectedProjectKey(doc.projectKey);
                        }}
                        style={{
                          background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--text-info)' : '3px solid transparent'
                        }}
                      >
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{doc.id}</td>
                        <td>
                          <span className={`badge ${doc.type === 'purchase_order' ? 'b-info' : 'b-success'}`} style={{ textTransform: 'uppercase', fontSize: '9px' }}>
                            {doc.type === 'purchase_order' ? 'PO' : 'GRN'}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{doc.projectName}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Client: {doc.projectClient} | Order: {doc.orderId}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{doc.supplier || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{doc.date}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{(doc.items || []).length}</td>
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-ghost text-danger" 
                            style={{ padding: '4px' }} 
                            title="Delete Document"
                            onClick={() => handleDeleteDoc(doc)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Preview Panel */}
        <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {activeDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }} id="printable-purchasing-doc">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {activeDoc.type === 'purchase_order' ? 'Purchase Order' : 'Goods Received Note'}
                  </div>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>
                    {activeDoc.id}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {activeDoc.type === 'purchase_order' && (
                    <button className="btn btn-xs btn-outline" onClick={() => handleOpenEditPoModal(activeDoc)} title="Edit PO details and ETAs">
                      Edit PO
                    </button>
                  )}
                  <button className="btn btn-xs btn-ghost" onClick={() => window.print()} title="Print Document">
                    <Printer size={13} /> Print
                  </button>
                </div>
              </div>

              {/* Document Meta Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', marginBottom: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Project:</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeDoc.projectName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Date Issued:</div>
                  <div style={{ fontWeight: 600 }}>{activeDoc.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Supplier:</div>
                  <div style={{ fontWeight: 600 }}>{activeDoc.supplier || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Order Reference:</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{activeDoc.orderId}</div>
                </div>
              </div>

              {/* Notes */}
              {activeDoc.notes && (
                <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', padding: '8px', borderRadius: '6px', marginBottom: '12px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  <strong>Notes:</strong> {activeDoc.notes}
                </div>
              )}

              {/* Items List */}
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '6px', flexShrink: 0 }}>Document Items:</div>
              <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: '6px' }}>
                <table className="table" style={{ fontSize: '11.5px', margin: 0 }}>
                  <thead style={{ background: 'var(--bg-primary)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th>Code</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>Qty</th>
                      {activeDoc.type === 'purchase_order' && <th>ETA</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(activeDoc.items || []).map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.code}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.description}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{item.qtyAction}</td>
                        {activeDoc.type === 'purchase_order' && <td style={{ color: 'var(--text-info)', fontWeight: 500 }}>{item.eta || 'TBD'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <Eye size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '12px' }}>Select a document from the ledger list to preview details.</div>
            </div>
          )}
        </div>
      </div>

      {/* PO ISSUE MODAL */}
      {showPoModal && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>✍️ Issue Purchase Order</h3>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowPoModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSavePo} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Select Order Reference</label>
                    <select 
                      className="form-control" 
                      value={poOrderKey} 
                      onChange={e => {
                        setPoOrderKey(e.target.value);
                        setPoSupplier('');
                        setPoItemInputs({});
                      }}
                      required
                    >
                      <option value="">— Choose order —</option>
                      {allOrders.map(o => (
                        <option key={`${o.projectKey}_${o.id}`} value={`${o.projectKey}_${o.id}`}>
                          [{o.projectKey.toUpperCase()}] {o.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Supplier *</label>
                    <select
                      className="form-control"
                      value={poSupplier}
                      onChange={e => {
                        setPoSupplier(e.target.value);
                        setPoItemInputs({});
                      }}
                      required
                      disabled={!selectedPoOrder}
                    >
                      <option value="">— Select supplier —</option>
                      {getUniqueSuppliersForOrder(selectedPoOrder).map(sup => (
                        <option key={sup} value={sup}>{sup}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Notes / Instructions</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Expedited shipping, custom order remarks..." 
                    className="form-control" 
                    value={poNotes} 
                    onChange={e => setPoNotes(e.target.value)} 
                  />
                </div>

                {selectedPoOrder ? (
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Purchase Order Item Allocations:</div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                      <table className="table" style={{ fontSize: '11px', margin: 0 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-primary)' }}>
                            <th>Item Code</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Order Qty</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Already PO'd</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Qty to PO</th>
                            <th style={{ width: '120px' }}>Item ETA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getConsolidatedPoItems(selectedPoOrder, poSupplier).map(cItem => {
                            const inputs = poItemInputs[cItem.code] || { qty: 0, eta: '' };

                            return (
                              <tr key={cItem.code}>
                                <td>
                                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{cItem.code}</div>
                                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }}>{cItem.description}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--text-info)' }}>Supplier: {cItem.supplier}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{cItem.qty || 0}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{cItem.alreadyPo}</td>
                                <td style={{ padding: '2px' }}>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ height: '26px', fontSize: '11px', padding: '2px 6px', textAlign: 'center' }}
                                    min={0}
                                    max={cItem.maxAvailable}
                                    value={inputs.qty || ''}
                                    placeholder={`Max ${cItem.maxAvailable}`}
                                    disabled={!poSupplier || cItem.maxAvailable === 0}
                                    onChange={e => {
                                      const val = Math.min(cItem.maxAvailable, Math.max(0, parseInt(e.target.value) || 0));
                                      setPoItemInputs(prev => ({
                                        ...prev,
                                        [cItem.code]: { ...prev[cItem.code], qty: val }
                                      }));
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '2px' }}>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 3 weeks" 
                                    className="form-control" 
                                    style={{ height: '26px', fontSize: '11px', padding: '2px 6px' }}
                                    value={inputs.eta || ''}
                                    disabled={!poSupplier}
                                    onChange={e => {
                                      setPoItemInputs(prev => ({
                                        ...prev,
                                        [cItem.code]: { ...prev[cItem.code], eta: e.target.value }
                                      }));
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-tertiary)', fontSize: '11.5px' }}>
                    Select an order above and pick a supplier to populate item specifications.
                  </div>
                )}

              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowPoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={!selectedPoOrder || !poSupplier}>Issue Purchase Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRN ISSUE MODAL */}
      {showGrnModal && (() => {
        const poDoc = allDocs.find(d => d.type === 'purchase_order' && d.id === grnPoId);
        return (
          <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ width: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>✍️ Issue Goods Received Note</h3>
                <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowGrnModal(false)}>✕</button>
              </div>
              
              <form onSubmit={handleSaveGrn} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Select Purchase Order Reference</label>
                    <select 
                      className="form-control" 
                      value={grnPoId} 
                      onChange={e => {
                        setGrnPoId(e.target.value);
                        setGrnItemInputs({});
                      }}
                      required
                    >
                      <option value="">— Choose Purchase Order —</option>
                      {allDocs.filter(d => d.type === 'purchase_order').map(po => (
                        <option key={po.id} value={po.id}>
                          {po.id} ({po.supplier}) — Order {po.orderId} [{po.projectName}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Notes / Remarks</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Received package in good condition..." 
                      className="form-control" 
                      value={grnNotes} 
                      onChange={e => setGrnNotes(e.target.value)} 
                    />
                  </div>

                  {poDoc ? (
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Goods Received Allocations (from {poDoc.id}):</div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <table className="table" style={{ fontSize: '11px', margin: 0 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-primary)' }}>
                              <th>Item Code</th>
                              <th style={{ width: '80px', textAlign: 'center' }}>Ordered (PO)</th>
                              <th style={{ width: '80px', textAlign: 'center' }}>Already Rec</th>
                              <th style={{ width: '100px', textAlign: 'center' }}>Qty Received</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(poDoc.items || []).map(poItem => {
                              const orderedVal = poItem.qtyAction || 0;
                              const alreadyRec = getGrnReceivedForPoItem(poDoc.orderObj, poDoc.id, poItem.code);
                              const maxAvailable = Math.max(0, orderedVal - alreadyRec);
                              const inputs = grnItemInputs[poItem.code] || { qty: 0 };

                              return (
                                <tr key={poItem.code}>
                                  <td>
                                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{poItem.code}</div>
                                    <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '250px' }}>{poItem.description}</div>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{orderedVal}</td>
                                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{alreadyRec}</td>
                                  <td style={{ padding: '2px' }}>
                                    <input 
                                      type="number" 
                                      className="form-control" 
                                      style={{ height: '26px', fontSize: '11px', padding: '2px 6px', textAlign: 'center' }}
                                      min={0}
                                      max={maxAvailable}
                                      value={inputs.qty || ''}
                                      placeholder={`Max ${maxAvailable}`}
                                      disabled={maxAvailable === 0}
                                      onChange={e => {
                                        const val = Math.min(maxAvailable, Math.max(0, parseInt(e.target.value) || 0));
                                        setGrnItemInputs(prev => ({
                                          ...prev,
                                          [poItem.code]: { qty: val }
                                        }));
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-tertiary)', fontSize: '11.5px' }}>
                      Select a Purchase Order above to populate receiving options.
                    </div>
                  )}

                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                  <button type="button" className="btn btn-sm" onClick={() => setShowGrnModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-sm btn-primary" disabled={!poDoc}>Issue GRN</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* EDIT PO MODAL */}
      {showEditPoModal && editPoDoc && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>✏️ Edit Purchase Order: {editPoDoc.id}</h3>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowEditPoModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleUpdatePo} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Order Reference (Read Only)</label>
                    <input type="text" className="form-control" value={editPoDoc.orderId} disabled />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Supplier (Read Only)</label>
                    <input type="text" className="form-control" value={editPoDoc.supplier} disabled />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Notes / Instructions</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Expedited shipping, custom order remarks..." 
                    className="form-control" 
                    value={editPoNotes} 
                    onChange={e => setEditPoNotes(e.target.value)} 
                  />
                </div>

                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Update Item ETAs:</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                    <table className="table" style={{ fontSize: '11px', margin: 0 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-primary)' }}>
                          <th>Item Code</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>PO Qty</th>
                          <th style={{ width: '250px' }}>Item ETA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editPoDoc.items || []).map(item => (
                          <tr key={item.code}>
                            <td>
                              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.code}</div>
                              <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '250px' }}>{item.description}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qtyAction || 0}</td>
                            <td style={{ padding: '2px' }}>
                              <input 
                                type="text" 
                                placeholder="e.g. 3 weeks" 
                                className="form-control" 
                                style={{ height: '26px', fontSize: '11px', padding: '2px 6px' }}
                                value={editPoItemEtas[item.code] || ''}
                                onChange={e => {
                                  setEditPoItemEtas(prev => ({
                                    ...prev,
                                    [item.code]: e.target.value
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowEditPoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
