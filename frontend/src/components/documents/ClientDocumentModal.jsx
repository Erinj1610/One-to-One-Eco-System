import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Building, 
  User, 
  Clock, 
  Filter, 
  ChevronRight,
  Eye,
  RefreshCw,
  Edit3,
  Search,
  Folder
} from 'lucide-react';
import SearchableFilterDropdown from '../common/SearchableFilterDropdown';
import { API_BASE } from '../../api_config';

export default function ClientDocumentModal({
  isOpen,
  onClose,
  projects = {},
  allOrders = [],
  initialProjectKey = null,
  initialOrderId = null
}) {
  if (!isOpen) return null;

  // Active Document Tab: 'statement' | 'progress'
  const [docType, setDocType] = useState('statement');

  // Filter / Scope Mode: 'project' | 'client' | 'orders'
  const [scopeMode, setScopeMode] = useState(initialOrderId ? 'orders' : (initialProjectKey ? 'project' : 'project'));
  const [selectedProjectKey, setSelectedProjectKey] = useState(initialProjectKey || Object.keys(projects)[0] || '');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => initialOrderId ? [initialOrderId] : []);
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Order selection dropdown state
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [orderPickerSearch, setOrderPickerSearch] = useState('');
  const [orderPickerProjectFilter, setOrderPickerProjectFilter] = useState('ALL');

  // Editable Statement Details
  const [customNotes, setCustomNotes] = useState(
    '• Final payments are due prior to delivery of stock.\n• Quote your account name as payment reference.\n• Send proof of payment to debtors@1-to-1.world.\n• Attention: Najma Smith.'
  );
  const [bankDetails, setBankDetails] = useState({
    accountName: '1TO1 Design Studio',
    bank: 'FNB Cape Town City',
    branchCode: '201409',
    accountNumber: '630 430 807 36',
    swift: 'FIRNZAJJ'
  });

  const printRef = useRef(null);

  // Available unique clients list (formatted for SearchableFilterDropdown)
  const clientOptions = useMemo(() => {
    const set = new Set();
    Object.values(projects).forEach(p => {
      if (p.client) set.add(p.client);
    });
    return Array.from(set).sort().map(c => ({ value: c, label: c }));
  }, [projects]);

  // Available projects list (formatted for SearchableFilterDropdown)
  const projectOptions = useMemo(() => {
    return Object.values(projects).map(p => ({
      value: p.key,
      label: `${p.name || 'Project'} ${p.client ? `(${p.client})` : ''}`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [projects]);

  // Filter orders based on chosen Scope
  const scopedOrders = useMemo(() => {
    if (scopeMode === 'orders') {
      return allOrders.filter(o => selectedOrderIds.includes(o.id));
    }
    if (scopeMode === 'client') {
      const clientProjKeys = Object.values(projects)
        .filter(p => p.client === selectedClientName)
        .map(p => p.key);
      return allOrders.filter(o => clientProjKeys.includes(o.projectKey));
    }
    // 'project'
    return allOrders.filter(o => o.projectKey === selectedProjectKey);
  }, [allOrders, scopeMode, selectedOrderIds, selectedProjectKey, selectedClientName, projects]);

  // Group all orders by project for the comprehensive order picker
  const groupedOrdersForPicker = useMemo(() => {
    const map = {};
    allOrders.forEach(ord => {
      const pKey = ord.projectKey || 'OTHER';
      const pName = ord.projectName || projects[pKey]?.name || 'General Orders';
      const pClient = ord.projectClient || projects[pKey]?.client || '';
      const groupKey = `${pName}__${pKey}`;

      if (!map[groupKey]) {
        map[groupKey] = {
          projectKey: pKey,
          projectName: pName,
          clientName: pClient,
          orders: []
        };
      }
      map[groupKey].orders.push(ord);
    });
    return Object.values(map).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [allOrders, projects]);

  // Filtered orders list for the search & filter within the order picker
  const filteredPickerGroups = useMemo(() => {
    return groupedOrdersForPicker.map(group => {
      if (orderPickerProjectFilter !== 'ALL' && group.projectKey !== orderPickerProjectFilter) {
        return null;
      }

      const q = orderPickerSearch.trim().toLowerCase();
      const filteredOrders = group.orders.filter(ord => {
        if (!q) return true;
        const idMatch = String(ord.id || '').toLowerCase().includes(q);
        const nameMatch = String(ord.quote_name || '').toLowerCase().includes(q);
        const clientMatch = String(group.clientName || '').toLowerCase().includes(q);
        return idMatch || nameMatch || clientMatch;
      });

      if (filteredOrders.length === 0) return null;
      return {
        ...group,
        orders: filteredOrders
      };
    }).filter(Boolean);
  }, [groupedOrdersForPicker, orderPickerSearch, orderPickerProjectFilter]);

  // Resolved metadata for headers
  const currentProject = projects[selectedProjectKey] || (scopedOrders[0] ? projects[scopedOrders[0].projectKey] : null);
  const projectName = currentProject ? (currentProject.name || currentProject.title || 'General Project') : (scopedOrders[0]?.projectName || 'General Project');
  const clientName = currentProject ? (currentProject.client || currentProject.clientCompany || 'Valued Client') : (selectedClientName || 'Valued Client');
  const deliveryAddress = currentProject?.deliveryAddress || currentProject?.address || 'Site Address';
  const projectPm = currentProject?.pm || currentProject?.pmName || 'Brad Abrahams';

  // -------------------------------------------------------------
  // STATEMENT LEDGER COMPUTATION
  // -------------------------------------------------------------
  const statementData = useMemo(() => {
    const transactions = [];
    let totalInvoiced = 0;
    let totalPaid = 0;

    scopedOrders.forEach(ord => {
      const ordRef = ord.id || ord.poNumber || '—';
      const quoteTitle = ord.quote_name || ord.title || 'Order';

      // 1. Order Retail / Invoices
      const ordVal = Number(ord.value) || 0;
      if (ordVal > 0) {
        totalInvoiced += ordVal;
        transactions.push({
          date: ord.orderDate || ord.dateCreated || statementDate,
          orderRef: ordRef,
          docRef: ord.invoiceNumber || `INV-${String(ord.id).replace(/\D/g, '').padStart(5, '0')}`,
          description: `${quoteTitle} — Supply & Deliver`,
          type: 'INVOICE',
          value: ordVal,
          payment: null
        });
      }

      // 2. Client Invoices / Deposit Invoices
      if (ord.clientInvoices && Array.isArray(ord.clientInvoices)) {
        ord.clientInvoices.forEach(cinv => {
          if (cinv.is_credit || String(cinv.id).toUpperCase().startsWith('CN-')) {
            const crVal = Math.abs(Number(cinv.amount || cinv.total) || 0);
            totalPaid += crVal;
            transactions.push({
              date: cinv.date || statementDate,
              orderRef: ordRef,
              docRef: cinv.id || 'CN-00001',
              description: cinv.description || 'Credit note / adjustment',
              type: 'CREDIT',
              value: null,
              payment: -crVal
            });
          }
        });
      }

      // 3. Recorded Payments
      let paymentsList = [];
      if (Array.isArray(ord.payments)) {
        paymentsList = ord.payments;
      } else if (typeof ord.payments === 'string') {
        try { paymentsList = JSON.parse(ord.payments); } catch (_) { paymentsList = []; }
      }
      
      paymentsList.forEach(pmt => {
        const pmtVal = Number(pmt.amount || pmt.value) || 0;
        if (pmtVal > 0) {
          totalPaid += pmtVal;
          transactions.push({
            date: pmt.date || ord.orderDate || statementDate,
            orderRef: ordRef,
            docRef: pmt.reference || '—',
            description: pmt.notes || pmt.description || 'Payment received',
            type: 'PAYMENT',
            value: null,
            payment: pmtVal
          });
        }
      });

      // Fallback: If order has paid amount recorded directly on order
      if (paymentsList.length === 0 && Number(ord.paid) > 0) {
        const directPaid = Number(ord.paid);
        totalPaid += directPaid;
        transactions.push({
          date: ord.orderDate || statementDate,
          orderRef: ordRef,
          docRef: '—',
          description: 'Deposit / Payment received',
          type: 'PAYMENT',
          value: null,
          payment: directPaid
        });
      }
    });

    // Sort chronologically
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    const computedRows = transactions.map(t => {
      if (t.value !== null) {
        runningBalance += t.value;
      }
      if (t.payment !== null) {
        runningBalance -= t.payment;
      }
      return {
        ...t,
        balanceDue: runningBalance
      };
    });

    const balanceOutstanding = Math.max(0, totalInvoiced - totalPaid);

    return {
      rows: computedRows,
      totalInvoiced,
      totalPaid,
      balanceOutstanding
    };
  }, [scopedOrders, statementDate]);

  // -------------------------------------------------------------
  // PROGRESS REPORT ITEM BREAKDOWN COMPUTATION
  // -------------------------------------------------------------
  const progressReportGroups = useMemo(() => {
    return scopedOrders.map(ord => {
      const ordTitle = ord.quote_name ? `${projectName} (${ord.quote_name})` : `${projectName} (${ord.id})`;
      const rawItems = ord.itemsList || [];

      const itemMap = {};
      rawItems.filter(item => !item.is_credit && !item.isCredit && (Number(item.qty) || 0) > 0).forEach(item => {
        const oneOne = (item.oneOneCode || item.one_one_code || '').trim();
        const itemCode = (item.code || '').trim();
        const key = (oneOne || itemCode) ? `${oneOne}__${itemCode}` : ('ITEM_' + item.id);

        if (!itemMap[key]) {
          itemMap[key] = {
            qty: 0,
            oneOneCode: oneOne || '—',
            code: itemCode || '—',
            description: item.description || '',
            receivedQty: 0,
            deliveryQty: 0,
            poEta: item.poEta || item.eta || '',
            deliveryDate: item.deliveryDate || ''
          };
        }

        const q = Number(item.qty) || 0;
        itemMap[key].qty += q;
        itemMap[key].receivedQty += Number(item.receivedQty !== undefined ? item.receivedQty : (item.received_qty || 0));
        itemMap[key].deliveryQty += Number(item.deliveryQty !== undefined ? item.deliveryQty : (item.delivery_qty || 0));
        if (item.poEta && !itemMap[key].poEta) itemMap[key].poEta = item.poEta;
        if (item.deliveryDate && !itemMap[key].deliveryDate) itemMap[key].deliveryDate = item.deliveryDate;
      });

      const rows = Object.values(itemMap).map(row => {
        const totalQ = row.qty;
        const recQ = row.receivedQty;
        const delQ = row.deliveryQty;
        const backOrderQ = Math.max(0, totalQ - recQ);

        let progressStatus = 'Back Order';
        let etaText = row.poEta || 'Awaiting ETA';
        let deliveredText = '—';

        if (delQ > 0) {
          deliveredText = `${row.deliveryDate || 'Delivered'} (${delQ})`;
        }

        if (backOrderQ === 0) {
          progressStatus = 'Received';
          etaText = 'Stock Received';
        } else if (recQ > 0) {
          progressStatus = 'Back Order (Partial)';
          etaText = row.poEta || 'Partial In Hand';
        }

        return {
          qty: totalQ,
          oneOneCode: row.oneOneCode,
          code: row.code,
          description: row.description,
          progress: progressStatus,
          received: recQ,
          backOrder: backOrderQ,
          eta: etaText,
          dateDelivered: deliveredText
        };
      });

      return {
        orderId: ord.id,
        title: ordTitle,
        rows
      };
    }).filter(g => g.rows.length > 0);
  }, [scopedOrders, projectName]);

  const handlePrint = () => {
    window.print();
  };

  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAllInGroup = (orders) => {
    const ids = orders.map(o => o.id);
    setSelectedOrderIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllInGroup = (orders) => {
    const ids = new Set(orders.map(o => o.id));
    setSelectedOrderIds(prev => prev.filter(id => !ids.has(id)));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1140px',
        height: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} color="#0f766e" />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Client Document Engine
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Generate official One:One Statements & Live Progress Reports
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Printer size={15} /> Print / Save as PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #cbd5e1',
                padding: '6px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CONTROLS & SCOPE TOOLBAR (FEATURING SEARCHABLE DROPDOWNS) */}
        <div style={{
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 100
        }}>
          
          {/* Document Type Selector */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setDocType('statement')}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: docType === 'statement' ? '#ffffff' : 'transparent',
                color: docType === 'statement' ? '#0f766e' : '#64748b',
                boxShadow: docType === 'statement' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              💼 Client Statement
            </button>

            <button
              type="button"
              onClick={() => setDocType('progress')}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: docType === 'progress' ? '#ffffff' : 'transparent',
                color: docType === 'progress' ? '#0f766e' : '#64748b',
                boxShadow: docType === 'progress' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📊 Progress Report
            </button>
          </div>

          {/* Scope Controls with SearchableFilterDropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scope:
            </span>

            {/* Scope Mode Dropdown */}
            <SearchableFilterDropdown
              value={scopeMode}
              onChange={val => {
                setScopeMode(val);
                if (val === 'project' && !selectedProjectKey) {
                  setSelectedProjectKey(Object.keys(projects)[0] || '');
                }
              }}
              options={[
                { value: 'project', label: 'Per Project' },
                { value: 'client', label: 'Per Client (All Projects)' },
                { value: 'orders', label: `Select Specific Orders (${selectedOrderIds.length})` }
              ]}
              allLabel="Scope Mode"
              width="190px"
            />

            {/* Project Picker (Searchable) */}
            {scopeMode === 'project' && (
              <SearchableFilterDropdown
                value={selectedProjectKey}
                onChange={setSelectedProjectKey}
                options={projectOptions}
                allLabel="Choose Project..."
                width="240px"
              />
            )}

            {/* Client Picker (Searchable) */}
            {scopeMode === 'client' && (
              <SearchableFilterDropdown
                value={selectedClientName}
                onChange={setSelectedClientName}
                options={clientOptions}
                allLabel="Choose Client..."
                width="220px"
              />
            )}

            {/* Interactive Order Navigator Popover across Projects & Clients */}
            {scopeMode === 'orders' && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowOrderPicker(!showOrderPicker)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#0f172a'
                  }}
                >
                  <Filter size={13} color="#0f766e" />
                  <span>Choose Orders ({selectedOrderIds.length} Selected)</span>
                </button>

                {showOrderPicker && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 12px 30px -5px rgba(0,0,0,0.2)',
                    padding: '12px',
                    width: '380px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                    {/* Popover Header with Quick Search & Clear */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
                        ORDER & SUB-ORDER NAVIGATOR
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setSelectedOrderIds([])}
                        style={{ fontSize: '10.5px', color: '#b91c1c', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Clear Selection ({selectedOrderIds.length})
                      </button>
                    </div>

                    {/* Instant Search Bar */}
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '8px', top: '8px', color: '#94a3b8' }} />
                      <input 
                        type="text"
                        placeholder="Search order ID, quote name, client..."
                        value={orderPickerSearch}
                        onChange={e => setOrderPickerSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '5px 8px 5px 28px',
                          fontSize: '11.5px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1'
                        }}
                      />
                    </div>

                    {/* Quick Filter by Project */}
                    <div style={{ marginBottom: '10px' }}>
                      <select
                        value={orderPickerProjectFilter}
                        onChange={e => setOrderPickerProjectFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          fontSize: '11.5px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#334155'
                        }}
                      >
                        <option value="ALL">All Projects ({allOrders.length} Orders)</option>
                        {groupedOrdersForPicker.map(g => (
                          <option key={g.projectKey} value={g.projectKey}>
                            {g.projectName} ({g.orders.length} orders)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Orders Grouped by Project */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredPickerGroups.map(group => {
                        const groupOrderIds = group.orders.map(o => o.id);
                        const isAllSelected = groupOrderIds.length > 0 && groupOrderIds.every(id => selectedOrderIds.includes(id));
                        const isSomeSelected = groupOrderIds.some(id => selectedOrderIds.includes(id));

                        return (
                          <div 
                            key={group.projectKey}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: '#ffffff'
                            }}
                          >
                            {/* Group Header */}
                            <div style={{
                              padding: '5px 8px',
                              background: '#f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #e2e8f0'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                                <Folder size={12} color="#0f766e" />
                                <span>{group.projectName}</span>
                                {group.clientName && (
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>({group.clientName})</span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => isAllSelected ? deselectAllInGroup(group.orders) : selectAllInGroup(group.orders)}
                                style={{
                                  fontSize: '10px',
                                  color: '#0f766e',
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>

                            {/* Order Rows */}
                            <div style={{ padding: '4px 6px' }}>
                              {group.orders.map(ord => {
                                const isChecked = selectedOrderIds.includes(ord.id);
                                return (
                                  <label 
                                    key={ord.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11.5px',
                                      cursor: 'pointer',
                                      background: isChecked ? 'rgba(15, 118, 110, 0.08)' : 'transparent'
                                    }}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectOrder(ord.id)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      <strong style={{ fontFamily: 'monospace', color: '#0f766e' }}>{ord.id}</strong> — {ord.quote_name || 'General Spec'}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                                      {ord.itemsList ? `${ord.itemsList.length} items` : ''}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {filteredPickerGroups.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px' }}>
                          No orders match your search term.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Date:</span>
              <input 
                type="date"
                value={statementDate}
                onChange={e => setStatementDate(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* DOCUMENT PREVIEW WORKSPACE */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: '#cbd5e1',
          display: 'flex',
          justifyContent: 'center'
        }}>
          
          {/* A4 PRINT CONTAINER */}
          <div 
            ref={printRef}
            className="printable-client-document"
            style={{
              width: '100%',
              maxWidth: '850px',
              minHeight: '1100px',
              background: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '36px 42px',
              color: '#1e293b',
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >

            {/* ========================================================= */}
            {/* DOCUMENT 1: STATEMENT LAYOUT                              */}
            {/* ========================================================= */}
            {docType === 'statement' && (
              <div>
                {/* TOP HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f766e', paddingBottom: '12px', marginBottom: '16px' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '2px', color: '#0f172a' }}>
                      ONE:ONE
                    </h1>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>1TO1 Design Studio</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#0f766e' }}>
                      STATEMENT
                    </h2>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Statement date: <strong>{new Date(statementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </span>
                  </div>
                </div>

                {/* PROJECT BANNER */}
                <div style={{ color: '#0f766e', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                  PROJECT: {projectName}
                </div>

                {/* METADATA GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>CLIENT DETAILS</div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{clientName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>DELIVERY / BILLING ADDRESS</div>
                    <div style={{ fontSize: '11.5px', color: '#475569' }}>{deliveryAddress}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>PROJECT REPRESENTATIVE</div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{projectPm}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>projects@1-to-1.world</div>
                  </div>
                </div>

                {/* OUTSTANDING BALANCE HERO BANNER */}
                <div style={{ background: '#0f172a', color: '#ffffff', padding: '16px 20px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>OUTSTANDING BALANCE</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>R {statementData.balanceOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* ACCOUNT SUMMARY 3-BOX STRIP */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #0f766e', borderRadius: '4px', overflow: 'hidden', marginBottom: '22px' }}>
                  <div style={{ background: '#0f766e', color: '#ffffff', padding: '6px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL VALUE (INCL. VAT)</div>
                  <div style={{ background: '#0f766e', color: '#ffffff', padding: '6px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>PAYMENTS RECEIVED</div>
                  <div style={{ background: '#0f766e', color: '#ffffff', padding: '6px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL BALANCE</div>
                  
                  <div style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, borderTop: '1px solid #e2e8f0' }}>R {statementData.totalInvoiced.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, borderTop: '1px solid #e2e8f0', color: '#16a34a' }}>R {statementData.totalPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, borderTop: '1px solid #e2e8f0', color: statementData.balanceOutstanding > 0 ? '#b91c1c' : '#16a34a' }}>R {statementData.balanceOutstanding.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                {/* TRANSACTION DETAILS TABLE */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>TRANSACTION DETAILS</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                        <th style={{ padding: '7px 8px' }}>DATE</th>
                        <th style={{ padding: '7px 8px' }}>ORDER REF.</th>
                        <th style={{ padding: '7px 8px' }}>INVOICE / CREDIT REF.</th>
                        <th style={{ padding: '7px 8px' }}>DESCRIPTION</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>VALUE</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>PAYMENT / CREDIT</th>
                        <th style={{ padding: '7px 8px', textAlign: 'right' }}>BALANCE DUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.rows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: row.type === 'CREDIT' ? '#fffbeb' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc') }}>
                          <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td style={{ padding: '7px 8px', fontWeight: 600 }}>{row.orderRef}</td>
                          <td style={{ padding: '7px 8px' }}>{row.docRef}</td>
                          <td style={{ padding: '7px 8px', maxWidth: '200px' }}>{row.description}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: row.value ? 600 : 400 }}>
                            {row.value !== null ? `R ${row.value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: row.payment ? '#16a34a' : 'inherit', fontWeight: row.payment ? 600 : 400 }}>
                            {row.payment !== null ? `R ${row.payment.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>
                            R {row.balanceDue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {statementData.rows.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                            No financial transactions found for the selected scope.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM DUAL STRIP: IMPORTANT NOTES & BANKING DETAILS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '14px', marginBottom: '18px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '6px' }}>IMPORTANT NOTES</div>
                    <div style={{ fontSize: '10px', color: '#475569', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                      {customNotes}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '6px' }}>BANKING DETAILS</div>
                    <div style={{ fontSize: '10px', color: '#334155', lineHeight: '1.5' }}>
                      <div><strong>Account name:</strong> {bankDetails.accountName}</div>
                      <div><strong>Bank:</strong> {bankDetails.bank}</div>
                      <div><strong>Branch code:</strong> {bankDetails.branchCode}</div>
                      <div><strong>Account number:</strong> {bankDetails.accountNumber}</div>
                      <div><strong>SWIFT:</strong> {bankDetails.swift}</div>
                    </div>
                  </div>
                </div>

                {/* FOOTER */}
                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', fontSize: '9px', color: '#64748b', textAlign: 'center' }}>
                  <strong>First payment?</strong> If this is your first payment to ONE:ONE, contact your representative or office to confirm the banking details.<br />
                  <strong>1TO1 Design Studio</strong> · 7 Ravenscraig Road, Unit 116, Masons Press Building, Woodstock · VAT No. 4590312965 · Reg No. 2022/863083/07 · Tel: 087 711 0660
                </div>
              </div>
            )}


            {/* ========================================================= */}
            {/* DOCUMENT 2: PROGRESS REPORT LAYOUT                        */}
            {/* ========================================================= */}
            {docType === 'progress' && (
              <div>
                {/* REPORT HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #334155', paddingBottom: '12px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                    <strong>ONE:ONE</strong><br />
                    3 Ravenscraig Road, Woodstock<br />
                    Unit 09 The Stockyard<br />
                    VAT No: 4590312965<br />
                    Reg No: 2022/863083/07<br />
                    <strong>Date: {new Date(statementDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      PROGRESS REPORT
                    </h1>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>{projectName}</span>
                  </div>
                </div>

                {/* ORDERS & SUB-ORDERS ACCORDION GROUPS */}
                {progressReportGroups.map((group, gIdx) => (
                  <div key={gIdx} style={{ marginBottom: '26px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: 800, 
                      textAlign: 'center', 
                      borderBottom: '2px solid #0f172a', 
                      paddingBottom: '4px', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {group.title}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#cbd5e1', color: '#0f172a', borderTop: '1px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                          <th style={{ padding: '6px 6px', textAlign: 'center', width: '35px' }}>Qty</th>
                          <th style={{ padding: '6px 6px', width: '90px' }}>1:1 Code</th>
                          <th style={{ padding: '6px 6px', width: '90px' }}>Made Code</th>
                          <th style={{ padding: '6px 6px' }}>Description</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center', width: '80px' }}>Progress</th>
                          <th style={{ padding: '6px 6px', textAlign: 'right', width: '55px' }}>Received</th>
                          <th style={{ padding: '6px 6px', textAlign: 'right', width: '55px' }}>Back Order</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center', width: '85px' }}>ETA</th>
                          <th style={{ padding: '6px 6px', textAlign: 'center', width: '95px' }}>Date Delivered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((r, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #e2e8f0', background: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700 }}>{r.qty}</td>
                            <td style={{ padding: '6px 6px', fontFamily: 'monospace', fontWeight: 600, color: '#0f766e' }}>{r.oneOneCode}</td>
                            <td style={{ padding: '6px 6px', fontFamily: 'monospace' }}>{r.code}</td>
                            <td style={{ padding: '6px 6px', maxWidth: '240px' }}>{r.description}</td>
                            <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '8.5px',
                                fontWeight: 700,
                                background: r.progress === 'Received' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                                color: r.progress === 'Received' ? '#16a34a' : '#b45309'
                              }}>
                                {r.progress}
                              </span>
                            </td>
                            <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600 }}>{r.received.toFixed(2)}</td>
                            <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: 600, color: r.backOrder > 0 ? '#b91c1c' : '#64748b' }}>
                              {r.backOrder.toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 6px', textAlign: 'center', fontSize: '9px', fontWeight: 600 }}>{r.eta}</td>
                            <td style={{ padding: '6px 6px', textAlign: 'center', fontSize: '9px', color: '#475569' }}>{r.dateDelivered}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {progressReportGroups.length === 0 && (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No items or orders found for the selected scope.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
