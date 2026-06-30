import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Plus, Search, CheckCircle, Trash2, Eye, Printer, ClipboardList 
} from 'lucide-react';

const statusColor = { Paid: 'b-success', Unpaid: 'b-warning', Overdue: 'b-danger', Draft: 'b-default' };

export default function InvoicesPage() {
  const { invoices, setInvoices, projects, updateProject } = useStore();
  const [activeTab, setActiveTab] = useState('design'); // 'design' | 'order'
  
  // Ledger filtering & preview state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  
  // Modal display states
  const [showIssueInvoiceModal, setShowIssueInvoiceModal] = useState(false);

  // Form states for creating a Client Invoice
  const [invoiceOrderKey, setInvoiceOrderKey] = useState(''); // "projectKey_orderId"
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceItemInputs, setInvoiceItemInputs] = useState({}); // { itemId: { qty } }
  const [customInvoiceId, setCustomInvoiceId] = useState('');
  const [customInvoiceDate, setCustomInvoiceDate] = useState('');

  // 1. Gather all design invoices (those without type: 'order_invoice')
  const designInvoices = invoices.filter(i => i.type !== 'order_invoice');

  // 2. Gather all order invoices (either from global invoices state or from project orders)
  const orderInvoices = invoices.filter(i => i.type === 'order_invoice');

  // Filter based on active tab
  const activeInvoices = activeTab === 'design' ? designInvoices : orderInvoices;

  // Search filter
  const filteredInvoices = activeInvoices.filter(inv => 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selected invoice for detail view
  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);

  // Gather all project orders to populate the invoice generation dropdown
  const allOrders = Object.values(projects).flatMap(p => 
    (p.orders || []).map(o => ({
      ...o,
      projectKey: p.key,
      projectName: p.name,
      projectClient: p.client,
    }))
  );

  // Helper: Count total invoice documents issued to generate next ID
  const getNextInvoiceId = () => {
    const count = invoices.length + 1;
    return `INV-2026-${String(count).padStart(3, '0')}`;
  };

  // Helper: Calculate previously invoiced quantities for an order
  const getOrderInvoicedQtys = (order) => {
    const map = {};
    (order.itemsList || []).forEach(item => {
      map[item.id] = 0;
    });
    // Scan all client invoices stored on the order
    (order.clientInvoices || []).forEach(inv => {
      (inv.items || []).forEach(item => {
        if (map[item.id] !== undefined) {
          map[item.id] += Number(item.qtyAction) || 0;
        }
      });
    });
    return map;
  };

  const getConsolidatedInvoiceItems = (order) => {
    if (!order) return [];
    const invoicedQtys = getOrderInvoicedQtys(order);
    const grouped = {};
    (order.itemsList || []).forEach(item => {
      const code = item.code || 'NO-CODE';
      // Calculate readyQty for individual item
      let readyQty = 0;
      if (item.stockStatus === 'All Stock on Hand') {
        readyQty = item.qty || 0;
      } else if (item.stockStatus === 'Partial Stock on Hand') {
        const inStock = Math.max(0, (item.qty || 0) - (item.poQtyOrdered || 0));
        readyQty = (item.receivedQty || 0) + inStock;
      } else {
        readyQty = item.receivedQty || 0;
      }
      const alreadyInv = invoicedQtys[item.id] || 0;
      const maxAvailable = Math.max(0, readyQty - alreadyInv);

      if (!grouped[code]) {
        grouped[code] = {
          code: code,
          description: item.description,
          unitRetail: item.unitRetail || 0,
          qty: 0,
          readyQty: 0,
          alreadyInv: 0,
          maxAvailable: 0,
          originalItems: []
        };
      }
      grouped[code].qty += Number(item.qty) || 0;
      grouped[code].readyQty += readyQty;
      grouped[code].alreadyInv += alreadyInv;
      grouped[code].maxAvailable += maxAvailable;
      grouped[code].originalItems.push(item);
    });
    return Object.values(grouped);
  };

  // Issue Client Invoice for order
  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!invoiceOrderKey) return;
    const [pKey, oId] = invoiceOrderKey.split('_');
    const project = projects[pKey];
    const order = (project?.orders || []).find(o => o.id === oId);
    if (!order) return;

    const formattedDate = customInvoiceDate || new Date().toISOString().split('T')[0];
    const newInvId = customInvoiceId.trim() || getNextInvoiceId();
    const dateObj = new Date(formattedDate);
    const dateStr = isNaN(dateObj.getTime()) 
      ? new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
      : dateObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    const dueObj = isNaN(dateObj.getTime()) ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : new Date(dateObj.getTime() + 15 * 24 * 60 * 60 * 1000);
    const dueStr = dueObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

    const invoiceItems = [];
    let invoiceTotalValue = 0;
    let hasQuantities = false;

    const consolidated = getConsolidatedInvoiceItems(order);
    const updatedItemsList = [...(order.itemsList || [])];
    const invoicedQtys = getOrderInvoicedQtys(order);

    consolidated.forEach(cItem => {
      const input = invoiceItemInputs[cItem.code] || {};
      const qtyAction = Math.max(0, parseInt(input.qty) || 0);

      if (qtyAction > 0) {
        hasQuantities = true;
        const lineVal = qtyAction * (cItem.unitRetail || 0);
        invoiceTotalValue += lineVal;
        
        invoiceItems.push({
          code: cItem.code,
          description: cItem.description,
          qtyAction,
          unitRetail: cItem.unitRetail || 0,
          value: lineVal
        });

        // Distribute to individual items
        let remainingToAllocate = qtyAction;
        cItem.originalItems.forEach(origItem => {
          if (remainingToAllocate <= 0) return;
          
          let readyQty = 0;
          if (origItem.stockStatus === 'All Stock on Hand') {
            readyQty = origItem.qty || 0;
          } else if (origItem.stockStatus === 'Partial Stock on Hand') {
            const inStock = Math.max(0, (origItem.qty || 0) - (origItem.poQtyOrdered || 0));
            readyQty = (origItem.receivedQty || 0) + inStock;
          } else {
            readyQty = origItem.receivedQty || 0;
          }
          const alreadyInv = invoicedQtys[origItem.id] || 0;
          const avail = Math.max(0, readyQty - alreadyInv);
          const toAlloc = Math.min(avail, remainingToAllocate);

          if (toAlloc > 0) {
            remainingToAllocate -= toAlloc;
            const targetIdx = updatedItemsList.findIndex(x => x.id === origItem.id);
            if (targetIdx !== -1) {
              const history = Array.isArray(updatedItemsList[targetIdx].invoiceHistory) ? updatedItemsList[targetIdx].invoiceHistory : [];
              const syncTransaction = {
                qty: toAlloc,
                ref: newInvId,
                date: formattedDate,
                value: toAlloc * (origItem.unitRetail || 0)
              };
              updatedItemsList[targetIdx] = {
                ...updatedItemsList[targetIdx],
                invoiceQty: (Number(updatedItemsList[targetIdx].invoiceQty) || 0) + toAlloc,
                invoiceValue: (Number(updatedItemsList[targetIdx].invoiceValue) || 0) + (toAlloc * (origItem.unitRetail || 0)),
                invoiceHistory: [...history, syncTransaction]
              };
            }
          }
        });

        // Overflow fallback
        if (remainingToAllocate > 0 && cItem.originalItems.length > 0) {
          const origItem = cItem.originalItems[0];
          const targetIdx = updatedItemsList.findIndex(x => x.id === origItem.id);
          if (targetIdx !== -1) {
            const history = Array.isArray(updatedItemsList[targetIdx].invoiceHistory) ? updatedItemsList[targetIdx].invoiceHistory : [];
            const syncTransaction = {
              qty: remainingToAllocate,
              ref: newInvId,
              date: formattedDate,
              value: remainingToAllocate * (origItem.unitRetail || 0)
            };
            updatedItemsList[targetIdx] = {
              ...updatedItemsList[targetIdx],
              invoiceQty: (Number(updatedItemsList[targetIdx].invoiceQty) || 0) + remainingToAllocate,
              invoiceValue: (Number(updatedItemsList[targetIdx].invoiceValue) || 0) + (remainingToAllocate * (origItem.unitRetail || 0)),
              invoiceHistory: [...history, syncTransaction]
            };
          }
        }
      }
    });

    if (!hasQuantities) {
      alert('Please enter at least one quantity to invoice.');
      return;
    }

    const newInvDoc = {
      id: newInvId,
      date: dateStr,
      notes: invoiceNotes,
      items: invoiceItems,
      totalValue: invoiceTotalValue
    };

    // Update order items & documents
    const updatedOrders = project.orders.map(o => {
      if (o.id === oId) {
        return {
          ...o,
          clientInvoices: [...(o.clientInvoices || []), newInvDoc],
          itemsList: updatedItemsList
        };
      }
      return o;
    });

    // Add to global invoices state
    const globalInvoiceRecord = {
      id: newInvId,
      project: project.name,
      client: project.client,
      amount: `R ${Math.round(invoiceTotalValue).toLocaleString()}`,
      issued: dateStr,
      due: dueStr,
      status: 'Unpaid',
      paid: false,
      type: 'order_invoice',
      projectKey: pKey,
      orderId: oId,
      items: invoiceItems,
      notes: invoiceNotes
    };

    updateProject(pKey, 'orders', updatedOrders);
    setInvoices(prev => [globalInvoiceRecord, ...prev]);
    setShowIssueInvoiceModal(false);
    setSelectedInvoiceId(newInvId);
  };

  // Mark invoice as paid
  const handleMarkPaid = (id) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'Paid', paid: true } : i));
  };

  // Delete/Reverse Client Invoice
  const handleDeleteInvoice = (inv) => {
    if (!window.confirm(`Are you sure you want to delete ${inv.id}? This will reverse its invoiced quantities.`)) return;

    if (inv.type === 'order_invoice') {
      const project = projects[inv.projectKey];
      if (project) {
        const updatedOrders = project.orders.map(o => {
          if (o.id === inv.orderId) {
            // Reverse quantities
            const updatedItemsList = (o.itemsList || []).map(item => {
              const invItem = (inv.items || []).find(ii => ii.id === item.id);
              if (invItem) {
                const history = Array.isArray(item.invoiceHistory) ? item.invoiceHistory : [];
                const cleanedHistory = history.filter(h => h.ref !== inv.id);
                return {
                  ...item,
                  invoiceQty: Math.max(0, (Number(item.invoiceQty) || 0) - invItem.qtyAction),
                  invoiceValue: Math.max(0, (Number(item.invoiceValue) || 0) - invItem.value),
                  invoiceHistory: cleanedHistory
                };
              }
              return item;
            });

            return {
              ...o,
              clientInvoices: (o.clientInvoices || []).filter(i => i.id !== inv.id),
              itemsList: updatedItemsList
            };
          }
          return o;
        });
        updateProject(inv.projectKey, 'orders', updatedOrders);
      }
    }

    setInvoices(prev => prev.filter(i => i.id !== inv.id));
    if (selectedInvoiceId === inv.id) {
      setSelectedInvoiceId(null);
    }
  };

  // Calculations for selected order in Invoice form
  const selectedInvoiceOrder = allOrders.find(o => `${o.projectKey}_${o.id}` === invoiceOrderKey);
  const selectedInvoiceInvoicedQtys = selectedInvoiceOrder ? getOrderInvoicedQtys(selectedInvoiceOrder) : {};

  // Financial calculations
  const outstanding = activeInvoices.filter(i => !i.paid).reduce((s, i) => s + parseFloat(i.amount.replace(/[^0-9.]/g, '') || 0), 0);
  const paid = activeInvoices.filter(i => i.paid).reduce((s, i) => s + parseFloat(i.amount.replace(/[^0-9.]/g, '') || 0), 0);

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Financial stats bar */}
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18, flexShrink: 0 }}>
        <div className="stat"><div className="stat-value">{activeInvoices.length}</div><div className="stat-label">Total invoices</div></div>
        <div className="stat"><div className="stat-value stat-danger">{activeInvoices.filter(i => i.status === 'Overdue').length}</div><div className="stat-label">Overdue</div></div>
        <div className="stat"><div className="stat-value stat-warning">R {(outstanding/1000).toFixed(0)}k</div><div className="stat-label">Outstanding</div></div>
        <div className="stat"><div className="stat-value stat-success">R {(paid/1000).toFixed(0)}k</div><div className="stat-label">Paid YTD</div></div>
      </div>

      {/* Tabs & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className={`btn btn-sm ${activeTab === 'design' ? 'btn-primary' : ''}`} onClick={() => { setActiveTab('design'); setSelectedInvoiceId(null); }}>
            📐 Design Invoices
          </button>
          <button className={`btn btn-sm ${activeTab === 'order' ? 'btn-primary' : ''}`} onClick={() => { setActiveTab('order'); setSelectedInvoiceId(null); }}>
            📦 Order Product Invoices
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'order' && (
            <button className="btn btn-sm btn-primary" onClick={() => { 
              setInvoiceOrderKey(''); 
              setInvoiceNotes(''); 
              setInvoiceItemInputs({}); 
              setCustomInvoiceId(getNextInvoiceId());
              setCustomInvoiceDate(new Date().toISOString().split('T')[0]);
              setShowIssueInvoiceModal(true); 
            }}>
              + New Client Invoice
            </button>
          )}
        </div>
      </div>

      {/* Main split dashboard */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* Left Side: Invoice Grid */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                placeholder="Search by invoice #, project or client..."
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
                  <th>Invoice #</th>
                  <th>Project / Client</th>
                  <th>Amount</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th style={{ width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const isActive = inv.id === selectedInvoiceId;
                    return (
                      <tr 
                        key={inv.id} 
                        className="clickable"
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        style={{
                          background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--text-info)' : '3px solid transparent'
                        }}
                      >
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{inv.id}</td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{inv.project}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>{inv.client}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{inv.amount}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{inv.issued}</td>
                        <td style={{ color: inv.status === 'Overdue' ? 'var(--text-danger)' : 'var(--text-secondary)' }}>{inv.due}</td>
                        <td><span className={`badge ${statusColor[inv.status]}`}>{inv.status}</span></td>
                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-ghost text-danger" 
                            style={{ padding: '4px' }} 
                            title="Delete Invoice"
                            onClick={() => handleDeleteInvoice(inv)}
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

        {/* Right Side: Detail & Action Panel */}
        <div className="card" style={{ width: '400px', display: 'flex', flexDirection: 'column', padding: '16px', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {selectedInvoice ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedInvoice.type === 'order_invoice' ? 'Client Product Invoice' : 'Design Fee Invoice'}
                  </div>
                  <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-info)' }}>
                    {selectedInvoice.id}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-xs btn-ghost" onClick={() => window.print()}>
                    <Printer size={13} /> Print
                  </button>
                </div>
              </div>

              {/* Status Action */}
              {!selectedInvoice.paid && selectedInvoice.status !== 'Draft' && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '10px', borderRadius: '6px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-warning)', fontWeight: 500 }}>Payment Outstanding</div>
                  <button className="btn btn-sm" onClick={() => handleMarkPaid(selectedInvoice.id)} style={{ background: 'var(--text-success)', color: '#fff', fontSize: '11px', padding: '4px 8px' }}>
                    Mark as Paid
                  </button>
                </div>
              )}

              {/* Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', marginBottom: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Project Name:</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedInvoice.project}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Client:</div>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.client}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Amount:</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-info)', fontSize: '12px' }}>{selectedInvoice.amount}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-tertiary)' }}>Due Date:</div>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.due}</div>
                </div>
              </div>

              {/* Items List (if order invoice) */}
              {selectedInvoice.type === 'order_invoice' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '6px', flexShrink: 0 }}>Invoiced Items:</div>
                  <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table className="table" style={{ fontSize: '11.5px', margin: 0 }}>
                      <thead style={{ background: 'var(--bg-primary)', position: 'sticky', top: 0 }}>
                        <tr>
                          <th>Item</th>
                          <th style={{ width: '40px', textAlign: 'center' }}>Qty</th>
                          <th style={{ width: '80px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedInvoice.items || []).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td>
                              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.code}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{item.description}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qtyAction}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>R {Math.round(item.value).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <Eye size={28} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontSize: '12px' }}>Select an invoice from the list to preview details.</div>
            </div>
          )}
        </div>
      </div>

      {/* NEW CLIENT INVOICE MODAL */}
      {showIssueInvoiceModal && (
        <div className="modal-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ width: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>✍️ Issue Client Product Invoice</h3>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowIssueInvoiceModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Select Order Reference</label>
                  <select 
                    className="form-control" 
                    value={invoiceOrderKey} 
                    onChange={e => {
                      setInvoiceOrderKey(e.target.value);
                      setInvoiceItemInputs({});
                    }}
                    required
                  >
                    <option value="">— Choose order —</option>
                    {allOrders.map(o => (
                      <option key={`${o.projectKey}_${o.id}`} value={`${o.projectKey}_${o.id}`}>
                        [{o.projectKey.toUpperCase()}] {o.id} — {o.supplier || 'No Supplier'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Invoice Reference *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-2026-001" 
                      className="form-control" 
                      value={customInvoiceId} 
                      onChange={e => setCustomInvoiceId(e.target.value)} 
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Invoice Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={customInvoiceDate} 
                      onChange={e => setCustomInvoiceDate(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Notes / Terms</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Standard 15-day payment terms..." 
                    className="form-control" 
                    value={invoiceNotes} 
                    onChange={e => setInvoiceNotes(e.target.value)} 
                  />
                </div>

                {selectedInvoiceOrder ? (
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Invoice Quantity Allocation:</div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                      <table className="table" style={{ fontSize: '11px', margin: 0 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-primary)' }}>
                            <th>Item Code</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Total Spec</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Packed/Rec</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Already Inv</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Qty to Invoice</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getConsolidatedInvoiceItems(selectedInvoiceOrder).map(cItem => {
                            const inputs = invoiceItemInputs[cItem.code] || { qty: 0 };

                            return (
                              <tr key={cItem.code}>
                                <td>
                                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{cItem.code}</div>
                                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }}>{cItem.description}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>{cItem.qty || 0}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-info)', fontWeight: 600 }}>{cItem.readyQty}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{cItem.alreadyInv}</td>
                                <td style={{ padding: '2px' }}>
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    style={{ height: '26px', fontSize: '11px', padding: '2px 6px', textAlign: 'center' }}
                                    min={0}
                                    max={cItem.maxAvailable}
                                    value={inputs.qty || ''}
                                    placeholder={`Max ${cItem.maxAvailable}`}
                                    disabled={cItem.maxAvailable === 0}
                                    onChange={e => {
                                      const val = Math.min(cItem.maxAvailable, Math.max(0, parseInt(e.target.value) || 0));
                                      setInvoiceItemInputs(prev => ({
                                        ...prev,
                                        [cItem.code]: { qty: val }
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
                    Select an order above to invoice items.
                  </div>
                )}

              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                <button type="button" className="btn btn-sm" onClick={() => setShowIssueInvoiceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={!selectedInvoiceOrder}>Issue Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
