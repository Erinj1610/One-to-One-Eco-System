import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useLocation } from 'react-router-dom';
import { 
  Save, 
  TrendingUp, 
  AlertCircle, 
  Trash2, 
  Copy, 
  Plus, 
  Search, 
  ArrowLeft, 
  HelpCircle, 
  Edit3, 
  Filter, 
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  BadgeAlert,
  Printer,
  FileText,
  DollarSign,
  Truck,
  Layers,
  ChevronRight,
  Sparkles,
  ClipboardList
} from 'lucide-react';

const PHI_ADVISORIES = {
  orders: {
    author: "Eliyahu M. Goldratt (The Goal)",
    quote: "An hour lost at a bottleneck is an hour lost for the entire system. An hour saved at a non-bottleneck is a mirage.",
    advice: "Constraint-Driven Buffering. Ensure your specification spreadsheet highlights custom selections (green) vs off-the-shelf stock items (blue). Prioritize expediting custom selections, as their procurement lead time represents the primary critical path bottleneck."
  }
};

const statusColor = { 
  Delivered: 'b-success', 
  'In transit': 'b-info', 
  Pending: 'b-default', 
  Processing: 'b-warning' 
};

// Global Product Catalog for Item Code selection
const PRODUCT_CATALOG = [
  { code: '28402 9240 W', description: 'Downlight - Entero RD-S 14W 2700K 30° White', brand: 'Delta Light', dimming: 'Non-dim', unitCost: 2238.63, unitRetail: 2995.00 },
  { code: 'TA8-WWW', description: 'Downlight - Club Series TA8 GU10 White', brand: 'NEKO', dimming: 'Phase', unitCost: 450.00, unitRetail: 690.00 },
  { code: 'LA_12859898', description: 'Lamp - Classic LED GU10 5.5W 2700K 36°', brand: 'Spazio', dimming: 'Non-dim', unitCost: 65.00, unitRetail: 110.00 },
  { code: 'MOD-LED-001', description: 'Recessed LED Downlight 10W', brand: 'Modus', dimming: 'Non-dim', unitCost: 590.00, unitRetail: 890.00 },
  { code: 'MOD-STR-003', description: 'Surface Strip 2700K 1200mm', brand: 'Modus', dimming: 'Phase', unitCost: 820.00, unitRetail: 1240.00 },
  { code: 'SIG-PND-007', description: 'Bespoke Pendant Cluster', brand: 'Signature', dimming: 'DALI', unitCost: 5400.00, unitRetail: 8400.00 },
  { code: 'MOL-DRV-012', description: 'DALI Driver 100W', brand: 'Molecule', dimming: 'DALI', unitCost: 1400.00, unitRetail: 2100.00 },
  { code: 'MOD-WAL-002', description: 'Wall Washer Exterior 20W', brand: 'Modus', dimming: 'Non-dim', unitCost: 1100.00, unitRetail: 1650.00 },
  { code: 'SIG-FLR-019', description: 'Architectural Floor Uplight', brand: 'Signature', dimming: 'Non-dim', unitCost: 2100.00, unitRetail: 3200.00 },
  { code: 'MOL-TRK-005', description: '3-Phase Track System 2m', brand: 'Molecule', dimming: 'Non-dim', unitCost: 520.00, unitRetail: 780.00 },
];

export default function OrdersPage() {
  const { projects, updateProject, contacts } = useStore();
  const location = useLocation();

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Temporary state for the active order items in the spreadsheet workspace
  const [activeOrderItems, setActiveOrderItems] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderSupplier, setSupplier] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderEta, setOrderEta] = useState('');
  const [orderPaidAmount, setOrderPaidAmount] = useState(0);

  // Editable Client & Project Registration details on the order
  const [clientCompany, setClientCompany] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [projectFullName, setProjectFullName] = useState('');
  const [projectTier, setProjectTier] = useState('');
  const [projectSize, setProjectSize] = useState('');
  const [electrician, setElectrician] = useState('');
  const [electricianPhone, setElectricianPhone] = useState('');
  const [contractor, setContractor] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [interiorDesigner, setInteriorDesigner] = useState('');
  const [interiorDesignerPhone, setInteriorDesignerPhone] = useState('');

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [billingDetails, setBillingDetails] = useState('');

  const [oneOneRep, setOneOneRep] = useState('Martin Döller');
  const [pmName, setPmName] = useState('Merlyn Mittins');
  const [pmPhone, setPmPhone] = useState('083 570 7795');
  const [pmEmail, setPmEmail] = useState('merlyn.mittins@1-to-1.world');
  const [orderDate, setOrderDate] = useState('');

  // Search & Filter state for the ledger list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');

  // Workspace View State (BOQ Spreadsheet vs Document Generator)
  const [workspaceSubTab, setWorkspaceSubTab] = useState('boq'); // 'boq' | 'quote' | 'invoice' | 'schedule' | 'statement'
  const [showRegForm, setShowRegForm] = useState(true);
  const activeDocType = workspaceSubTab === 'boq' ? 'quote' : workspaceSubTab;
  const [customTerms, setCustomTerms] = useState('Payment: 50% deposit to initiate order, 40% on delivery, 10% post-installation sign-off. Validity: 30 days from date of issue.');

  // Pricing consistency assistant modal state
  const [pendingPriceEdit, setPendingPriceEdit] = useState(null); // { itemId, field, value, code }

  // Modal creation state
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [newPoForm, setNewPoForm] = useState({
    projectKey: 'upper',
    supplier: 'Molecule Dist.',
    status: 'Pending',
    eta: 'TBD'
  });

  // Aggregate all orders/quotations from all projects in the store
  const allOrders = Object.values(projects).flatMap(p => 
    (p.orders || []).map(o => ({
      ...o,
      projectKey: p.key,
      projectName: p.name,
      projectClient: p.client,
    }))
  );

  // Check router state from location for automatic redirection/filtering
  useEffect(() => {
    if (location.state?.projectKey) {
      setProjectFilterKey(location.state.projectKey);
    }
    if (location.state?.openOrderId) {
      // Find the specific quotation
      const targetOrder = allOrders.find(o => o.id === location.state.openOrderId);
      if (targetOrder) {
        handleOpenWorkspace(targetOrder);
      }
    }
  }, [location.state]);

  // Filtered orders/quotations list for the ledger overview
  const filteredOrders = allOrders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchesProject = projectFilterKey === 'All' || o.projectKey === projectFilterKey;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  // Dynamic statistics
  const totalCostCompany = allOrders.reduce((sum, o) => sum + (o.costValue || 0), 0);
  const totalValueCompany = allOrders.reduce((sum, o) => sum + (o.value || 0), 0);
  const blendedMarginCompany = totalValueCompany > 0 ? Math.round(((totalValueCompany - totalCostCompany) / totalValueCompany) * 100) : 0;
  const lowMarginPoCount = allOrders.filter(o => {
    const cost = o.costValue || 0;
    const retail = o.value || 0;
    if (retail === 0) return false;
    return ((retail - cost) / retail) * 100 < 39;
  }).length;

  // Open the spreadsheet workspace
  const handleOpenWorkspace = (order) => {
    setSelectedOrderId(order.id);
    setSelectedProjectKey(order.projectKey);
    setActiveOrderItems(order.itemsList || []);
    setOrderDiscount(order.discount || 0);
    setSupplier(order.supplier);
    setOrderStatus(order.status);
    setOrderEta(order.eta || '—');
    setOrderPaidAmount(order.paid || 0);
    setWorkspaceSubTab('boq');

    // Retrieve linked project & contact info for automatic defaults
    const proj = projects[order.projectKey] || {};
    const contact = (contacts || []).find(c => c.name === proj.client || c.company === proj.client) || {};

    // Auto-populate or read existing order-adjusted properties
    setClientCompany(order.clientCompany !== undefined ? order.clientCompany : (contact.company || proj.client || ''));
    setClientContact(order.clientContact !== undefined ? order.clientContact : (contact.name || proj.client || ''));
    setClientPhone(order.clientPhone !== undefined ? order.clientPhone : (contact.phone || ''));
    setClientEmail(order.clientEmail !== undefined ? order.clientEmail : (contact.email || ''));

    setProjectFullName(order.projectFullName !== undefined ? order.projectFullName : (proj.name || ''));
    setProjectTier(order.projectTier !== undefined ? order.projectTier : (proj.offering || 'Signature'));
    setProjectSize(order.projectSize !== undefined ? order.projectSize : (proj.sqm || '—'));
    
    setElectrician(order.electrician || 'TBD Electrician');
    setElectricianPhone(order.electricianPhone || '—');
    setContractor(order.contractor || 'TBD Contractor');
    setContractorPhone(order.contractorPhone || '—');
    setInteriorDesigner(order.interiorDesigner || 'TBD Designer');
    setInteriorDesignerPhone(order.interiorDesignerPhone || '—');

    setOneOneRep(order.oneOneRep || 'Martin Döller');
    setPmName(order.pmName || proj.pm || 'Merlyn Mittins');
    setPmPhone(order.pmPhone || '083 570 7795');
    setPmEmail(order.pmEmail || (proj.pm ? `${proj.pm.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world` : 'merlyn.mittins@1-to-1.world'));
    
    const formattedToday = new Date().toLocaleDateString('en-GB'); // "dd/mm/yyyy"
    setOrderDate(order.orderDate || formattedToday);

    setDeliveryAddress(order.deliveryAddress || '7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941');
    setBillingDetails(order.billingDetails || 'TEST TSTETESSETSETEESTSETEST\nTEST TSTETESSETSETEESTSETEST');
  };

  // Cell modification in the spreadsheet workspace
  const handleUpdateSpreadsheetCell = (itemId, field, val) => {
    setActiveOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: val };
        
        // Parse numbers safely for real-time recalculations
        if (field === 'qty') updated.qty = Math.max(0, parseInt(val) || 0);
        if (field === 'unitCost') updated.unitCost = Math.max(0, parseFloat(val) || 0);
        if (field === 'unitTrade') updated.unitTrade = Math.max(0, parseFloat(val) || 0);
        if (field === 'unitRetail') updated.unitRetail = Math.max(0, parseFloat(val) || 0);
        
        return updated;
      }
      return item;
    }));
  };

  // Populate row fields based on selected product from catalog
  const handleItemCodeChange = (itemId, newCode) => {
    const catalogItem = PRODUCT_CATALOG.find(p => p.code === newCode);
    if (catalogItem) {
      setActiveOrderItems(prev => prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            code: catalogItem.code,
            description: catalogItem.description,
            brand: catalogItem.brand,
            dimming: catalogItem.dimming,
            unitCost: catalogItem.unitCost,
            unitRetail: catalogItem.unitRetail
          };
        }
        return item;
      }));
    }
  };

  // Intercept unit cost/retail edits to check if item is used multiple times
  const handlePriceEdit = (itemId, field, val, itemCode) => {
    const parsedVal = Math.max(0, parseFloat(val) || 0);
    
    // Count how many times this item code is used
    const count = activeOrderItems.filter(item => item.code && item.code === itemCode).length;
    
    if (itemCode && itemCode !== 'CUSTOM' && count > 1) {
      // Trigger prompt modal
      setPendingPriceEdit({ itemId, field, value: parsedVal, code: itemCode });
    } else {
      // Apply single update directly
      handleUpdateSpreadsheetCell(itemId, field, parsedVal);
    }
  };

  // Add a new row to the active spreadsheet
  const handleAddSpreadsheetRow = () => {
    const newId = 'I-' + Date.now();
    const newRow = {
      id: newId,
      qty: 1,
      type: 'NEW',
      code: '',
      description: 'New custom fixture description',
      floor: 'Ground',
      area: 'TBD Area',
      dimming: 'Non-dim',
      brand: 'Delta Light',
      supplier: orderSupplier,
      unitCost: 100,
      unitTrade: 130,
      unitRetail: 150,
      selection: 'Selection',
      stockStatus: 'Ordered'
    };
    setActiveOrderItems(prev => [...prev, newRow]);
  };

  // Duplicate an existing row
  const handleDuplicateSpreadsheetRow = (item) => {
    const newId = 'I-' + Date.now();
    const duplicated = {
      ...item,
      id: newId,
      qty: 1
    };
    setActiveOrderItems(prev => [...prev, duplicated]);
  };

  // Delete a row
  const handleDeleteSpreadsheetRow = (itemId) => {
    setActiveOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Save the spreadsheet and update the global store context
  const handleSaveOrderSpreadsheet = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    // Calculate aggregated order totals from items list
    const totalCostTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
    const totalRetailTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
    const discountedValue = Math.max(0, totalRetailTotal * (1 - (Number(orderDiscount) || 0) / 100));
    const itemsCount = activeOrderItems.reduce((s, item) => s + (Number(item.qty) || 0), 0);
    const balanceOutstanding = Math.max(0, discountedValue - Number(orderPaidAmount));

    const updatedOrders = (proj.orders || []).map(o => {
      if (o.id === selectedOrderId) {
        return {
          ...o,
          supplier: orderSupplier,
          status: orderStatus,
          eta: orderEta,
          items: itemsCount,
          value: Math.round(discountedValue),
          costValue: Math.round(totalCostTotal),
          discount: Number(orderDiscount) || 0,
          paid: Number(orderPaidAmount) || 0,
          outstanding: Math.round(balanceOutstanding),
          itemsList: activeOrderItems,
          // Save order-specific adjusted metadata fields
          clientCompany,
          clientContact,
          clientPhone,
          clientEmail,
          projectFullName,
          projectTier,
          projectSize,
          electrician,
          electricianPhone,
          contractor,
          contractorPhone,
          interiorDesigner,
          interiorDesignerPhone,
          oneOneRep,
          pmName,
          pmPhone,
          pmEmail,
          deliveryAddress,
          billingDetails,
          orderDate
        };
      }
      return o;
    });

    // Save back to dynamic project state
    updateProject(selectedProjectKey, 'orders', updatedOrders);

    // Calculate global margins for the project
    const designTotal = (proj.designFees || []).reduce((s, f) => s + (f.feeValue || 0), 0);
    const orderTotal = updatedOrders.reduce((s, o) => s + (o.value || 0), 0);
    const contractTotal = designTotal + orderTotal;
    
    const designMarginValue = (proj.designFees || []).reduce((s, f) => s + ((f.feeValue || 0) * ((f.margin || 20) / 100)), 0);
    const orderMarginValue = updatedOrders.reduce((s, o) => s + ((o.value || 0) - (o.costValue || 0)), 0);
    const totalProfit = designMarginValue + orderMarginValue;
    const blendedMargin = contractTotal > 0 ? Math.round((totalProfit / contractTotal) * 100) : 18;

    updateProject(selectedProjectKey, 'actualMargin', blendedMargin);

    alert(`Quotation Workspace Brain Synced!\n- Billed Value: R ${Math.round(discountedValue).toLocaleString()}\n- Total Cost: R ${Math.round(totalCostTotal).toLocaleString()}\n- Recalculated dynamic project blended margins to ${blendedMargin}%.`);
    setSelectedOrderId(null);
  };

  // Create a brand-new Purchase Order / Quotation
  const handleCreatePo = (e) => {
    e.preventDefault();
    const proj = projects[newPoForm.projectKey];
    if (!proj) return;

    const newPoId = 'Q-2026-0' + (allOrders.length + 42);
    const newOrder = {
      id: newPoId,
      supplier: newPoForm.supplier,
      items: 1,
      value: 1500,
      paid: 0,
      outstanding: 1500,
      status: newPoForm.status,
      eta: newPoForm.eta,
      costValue: 900,
      discount: 0,
      itemsList: [
        {
          id: 'I-' + Date.now(),
          qty: 1,
          type: 'DL-01',
          code: '28402 9240 W',
          description: 'Default Downlight Spec fixture',
          floor: 'Ground',
          area: 'Lobby',
          dimming: 'Non-dim',
          brand: 'Delta Light',
          supplier: newPoForm.supplier,
          unitCost: 900,
          unitTrade: 1200,
          unitRetail: 1500,
          selection: 'Selection',
          stockStatus: 'Ordered'
        }
      ]
    };

    const updatedOrders = [...(proj.orders || []), newOrder];
    updateProject(newPoForm.projectKey, 'orders', updatedOrders);
    
    setShowCreatePoModal(false);
    handleOpenWorkspace({
      ...newOrder,
      projectKey: newPoForm.projectKey,
      projectName: proj.name,
      projectClient: proj.client
    });
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTION FOR PREMIUM CLEAN DOCUMENT PRINTING */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-document-canvas, #print-document-canvas * {
            visibility: visible !important;
          }
          #print-document-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* HEADER BANNER */}
      {selectedOrderId === null ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Operations Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Central Quotations & Area-by-Area BOQ Builder</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Hardware Quotations & BOQ Workspace
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {projectFilterKey !== 'All' && (
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setProjectFilterKey('All')}
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}
                  >
                    Clear Project Filter ×
                  </button>
                )}
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => setShowCreatePoModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Create Quotation BOQ
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC VITAL CONTROLS STATS GRID */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
            <div className="stat" style={{ border: '1px solid var(--border)' }}>
              <div className="stat-value">{allOrders.length}</div>
              <div className="stat-label">Total Active Quotations</div>
            </div>
            <div className="stat" style={{ border: '1px solid var(--border)' }}>
              <div className="stat-value text-info">R {Math.round(totalCostCompany).toLocaleString()}</div>
              <div className="stat-label">Aggregate Cost Basis</div>
            </div>
            <div className="stat" style={{ border: '1px solid var(--border)' }}>
              <div className="stat-value text-success">R {Math.round(totalValueCompany).toLocaleString()}</div>
              <div className="stat-label">Total Quotation Value</div>
            </div>
            <div className="stat" style={{ border: '1px solid var(--border)' }}>
              <div className="stat-value text-info" style={{ color: blendedMarginCompany < 39 ? 'var(--text-danger)' : 'var(--text-success)' }}>
                {blendedMarginCompany}%
              </div>
              <div className="stat-label">Blended Retail Margin</div>
            </div>
          </div>

          {/* SEARCH, FILTER & LEDGER GRID */}
          <div className="card" style={{ border: '1.5px solid var(--border)' }}>
            <div className="card-body" style={{ padding: '20px' }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text"
                      placeholder="Search by quotation ref, client, or supplier..."
                      className="form-control"
                      style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="In transit">In transit</option>
                    <option value="Delivered">Delivered</option>
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '200px', height: '34px', fontSize: '13px' }}
                    value={projectFilterKey}
                    onChange={e => setProjectFilterKey(e.target.value)}
                  >
                    <option value="All">All Linked Projects</option>
                    {Object.values(projects).map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{filteredOrders.length}</strong> active BOQs
                </div>
              </div>

              {/* ORDERS LEDGER LIST */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>Quote Reference</th>
                      <th>Linked Project</th>
                      <th>Client Name</th>
                      <th>Hardware Supplier</th>
                      <th>BOQ Items</th>
                      <th>Retail Value (EX VAT)</th>
                      <th>Amount Paid</th>
                      <th>Balance Outstanding</th>
                      <th>Blended Margin</th>
                      <th>Order Status</th>
                      <th style={{ textAlign: 'center' }}>Workspace Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => {
                      const cost = o.costValue || 0;
                      const retail = o.value || 0;
                      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                      const isLowMargin = margin < 39;

                      return (
                        <tr key={o.id} className="clickable" onClick={() => handleOpenWorkspace(o)}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>{o.id}</td>
                          <td style={{ fontWeight: 600, color: 'white' }}>{o.projectName}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{o.projectClient || '—'}</td>
                          <td>{o.supplier}</td>
                          <td>{o.items} fixtures</td>
                          <td style={{ fontWeight: 600 }}>R {retail.toLocaleString()}</td>
                          <td style={{ color: 'var(--text-success)' }}>R {(o.paid || 0).toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: (o.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                            R {(o.outstanding || 0).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {margin}% {isLowMargin && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: '3px' }} />}
                          </td>
                          <td>
                            <span className={`badge ${statusColor[o.status] || 'b-default'}`}>{o.status}</span>
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)', border: '1px solid var(--border)' }}
                              onClick={() => handleOpenWorkspace(o)}
                            >
                              <FileSpreadsheet size={13} /> Open Spec Brain 🧠
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No active quotations or Bills of Quantity found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </>
      ) : (
        
        /* THE STANDALONE SPECIFICATION SPREADSHEET ENGINE WORKSPACE */
        <div className="card" style={{ border: '1.5px solid var(--border)' }}>
          <div className="card-body" style={{ padding: '24px' }}>
            
            {/* WORKSPACE TOP NAV HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: '4px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      if (confirm('Exit Workspace? Ensure you have saved your revisions.')) setSelectedOrderId(null);
                    }}
                  >
                    <ArrowLeft size={12} /> Back to Ledger
                  </button>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', background: 'rgba(59,130,246,0.15)', color: 'var(--text-info)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Order & BOQ Workspace Engine
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {orderSupplier} Quotation Specification — <span style={{ color: 'var(--text-info)' }}>{selectedOrderId}</span>
                </h2>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: '10px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Status:</span>
                  <select 
                    className="form-control"
                    style={{ width: '110px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value)}
                  >
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>In transit</option>
                    <option>Delivered</option>
                  </select>
                  
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginLeft: '6px' }}>Paid:</span>
                  <input 
                    type="number"
                    className="form-control"
                    style={{ width: '100px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                    value={orderPaidAmount}
                    onChange={e => setOrderPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>

                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => {
                    if (confirm('Discard edits and close workspace?')) setSelectedOrderId(null);
                  }}
                >
                  Cancel
                </button>
                
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleSaveOrderSpreadsheet}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} /> Save & Sync BOQ
                </button>
              </div>
            </div>

            {/* DYNAMIC SEGMENTED WORKSPACE TAB CONTROL */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '4px', overflowX: 'auto' }}>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'boq' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('boq')}
              >
                <FileSpreadsheet size={14} /> 📊 BOQ Spreadsheet
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'quote' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('quote')}
              >
                <FileText size={14} /> 🧾 Quotation
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'invoice' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('invoice')}
              >
                <DollarSign size={14} /> 💳 Invoice
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'schedule' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('schedule')}
              >
                <ClipboardList size={14} /> 🔧 Fitting Schedule
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'statement' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('statement')}
              >
                <TrendingUp size={14} /> 📊 Progress Statement
              </button>
            </div>

            {workspaceSubTab === 'boq' ? (
              
              /* SUB-TAB 1: BOQ SPREADSHEET ENGINE */
              <div>
                {/* PROJECT REGISTRATION & METADATA VITALS COLLAPSIBLE BLOCK */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)' }}>
                      📋 Project Registration Form & Metadata Vitals
                    </h3>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      onClick={() => setShowRegForm(!showRegForm)}
                      style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}
                    >
                      {showRegForm ? 'Collapse Form ✕' : 'Expand Form ➔'}
                    </button>
                  </div>
                  
                  {showRegForm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* TOP ROW: REP & PM VITALS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', background: 'rgba(139, 92, 246, 0.05)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>One:One Rep</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={oneOneRep} 
                            onChange={e => setOneOneRep(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>PM Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={pmName} 
                            onChange={e => setPmName(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>PM Mobile</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={pmPhone} 
                            onChange={e => setPmPhone(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>PM Email</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={pmEmail} 
                            onChange={e => setPmEmail(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>Date Registered</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={orderDate} 
                            onChange={e => setOrderDate(e.target.value)} 
                          />
                        </div>
                      </div>

                      {/* MIDDLE SECTION: CUSTOMER DETAILS vs DELIVERY ADDRESS */}
                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '15px' }}>
                        {/* CUSTOMER DETAILS CONTAINER */}
                        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-info)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Customer Details
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Company Name</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={clientCompany} 
                                onChange={e => setClientCompany(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Contact Person</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={clientContact} 
                                onChange={e => setClientContact(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Mobile Phone</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={clientPhone} 
                                onChange={e => setClientPhone(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email Address</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={clientEmail} 
                                onChange={e => setClientEmail(e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* DELIVERY ADDRESS CONTAINER */}
                        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-info)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Delivery Details
                          </span>
                          <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Delivery Address</label>
                          <textarea 
                            className="form-control" 
                            rows={2} 
                            style={{ fontSize: '11px', padding: '4px 6px', resize: 'vertical', minHeight: '52px', lineHeight: '1.4' }}
                            value={deliveryAddress} 
                            onChange={e => setDeliveryAddress(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* LOWER SECTION: PROJECT VITALS vs BILLING DETAILS */}
                      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '15px' }}>
                        {/* PROJECT DETAILS CONTAINER */}
                        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-info)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Project Details
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Full Project Name</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={projectFullName} 
                                onChange={e => setProjectFullName(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Project Tier</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={projectTier} 
                                onChange={e => setProjectTier(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Project Size (sqm)</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={projectSize} 
                                onChange={e => setProjectSize(e.target.value)} 
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Electrician Name & Mobile</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Name" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', flex: 1 }}
                                  value={electrician} 
                                  onChange={e => setElectrician(e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Mobile" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', width: '90px' }}
                                  value={electricianPhone} 
                                  onChange={e => setElectricianPhone(e.target.value)} 
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Contractor Name & Mobile</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Name" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', flex: 1 }}
                                  value={contractor} 
                                  onChange={e => setContractor(e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Mobile" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', width: '90px' }}
                                  value={contractorPhone} 
                                  onChange={e => setContractorPhone(e.target.value)} 
                                />
                              </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Interior Designer Name & Mobile</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Designer Name" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', flex: 1 }}
                                  value={interiorDesigner} 
                                  onChange={e => setInteriorDesigner(e.target.value)} 
                                />
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  placeholder="Designer Mobile" 
                                  style={{ height: '24px', fontSize: '11px', padding: '2px 6px', width: '120px' }}
                                  value={interiorDesignerPhone} 
                                  onChange={e => setInteriorDesignerPhone(e.target.value)} 
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BILLING DETAILS CONTAINER */}
                        <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-info)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Billing Details
                          </span>
                          <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Billing Address & Terms</label>
                          <textarea 
                            className="form-control" 
                            rows={5} 
                            style={{ fontSize: '11px', padding: '4px 6px', resize: 'vertical', minHeight: '114px', lineHeight: '1.4' }}
                            value={billingDetails} 
                            onChange={e => setBillingDetails(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(() => {
                  const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
                  const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                  const totalTrade = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitTrade) || 0)), 0);
                  const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  const overallMargin = discountedRetail > 0 ? Math.round(((discountedRetail - totalCost) / discountedRetail) * 100) : 0;
                  const balanceOutstanding = Math.max(0, discountedRetail - Number(orderPaidAmount));

                  const hasLowMargins = activeOrderItems.some(item => {
                    const cost = Number(item.unitCost) || 0;
                    const retail = Number(item.unitRetail) || 0;
                    if (retail === 0) return false;
                    return (((retail - cost) / retail) * 100) < 39;
                  });

                  // Compile Area Subtotals
                  const areaTotals = {};
                  activeOrderItems.forEach(item => {
                    const areaName = item.area || 'General';
                    const lineCost = (Number(item.qty) || 0) * (Number(item.unitCost) || 0);
                    const lineRetail = (Number(item.qty) || 0) * (Number(item.unitRetail) || 0);
                    
                    if (!areaTotals[areaName]) {
                      areaTotals[areaName] = { cost: 0, retail: 0 };
                    }
                    areaTotals[areaName].cost += lineCost;
                    areaTotals[areaName].retail += lineRetail;
                  });

                  return (
                    <>
                      {/* VITAL METRICS CARD GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Cost Price</span>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', margin: '4px 0' }}>R {Math.round(totalCost).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Supplier cost EX VAT</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billed Retail EX VAT</span>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', margin: '4px 0' }}>R {Math.round(totalRetail).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Subtotal before discount</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Volume Discount (%)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <input 
                              type="number"
                              className="form-control"
                              style={{ padding: '2px 6px', fontSize: '13px', width: '70px', height: '28px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                              value={orderDiscount}
                              onChange={e => setOrderDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            />
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>%</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px' }}>Reduces final retail price</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final Client Price</span>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-info)', display: 'block', margin: '4px 0' }}>R {Math.round(discountedRetail).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>VAT EXCLUDED</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blended Margin</span>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', margin: '4px 0' }}>
                            {overallMargin}%
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Target: &gt;= 39% overall</span>
                        </div>
                      </div>

                      {hasLowMargins && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1.5px dashed rgba(239, 68, 68, 0.4)', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BadgeAlert size={16} />
                          <span><strong>RED ALARM MARGIN DETECTED:</strong> There are individual fixtures in this specification sheet below the baseline 39% target margin. Increase markups to avoid pricing erosion.</span>
                        </div>
                      )}

                      {/* CSS STYLE INJECTIONS FOR MICRO SIZES & HIGH COMPACTNESS */}
                      <style>{`
                        .boq-cell-input {
                          padding: 2px 6px !important;
                          font-size: 11.5px !important;
                          height: 24px !important;
                          background: #ffffff !important;
                          border: 1px solid var(--border-strong) !important;
                          color: var(--text-primary) !important;
                          border-radius: 4px !important;
                          width: 100% !important;
                          outline: none !important;
                          transition: border-color 0.15s, box-shadow 0.15s;
                        }
                        .boq-cell-input:focus {
                          border-color: var(--text-info) !important;
                          background: #ffffff !important;
                          box-shadow: 0 0 0 2px rgba(24, 95, 165, 0.15) !important;
                        }
                        .boq-table th {
                          padding: 8px 10px !important;
                          font-size: 11px !important;
                          font-weight: 600 !important;
                          text-transform: uppercase !important;
                          letter-spacing: 0.5px !important;
                          background: var(--bg-secondary) !important;
                          color: var(--text-secondary) !important;
                          border-bottom: 2px solid var(--border-strong) !important;
                        }
                        .boq-table td {
                          padding: 4px 6px !important;
                          vertical-align: middle !important;
                          border-bottom: 1px solid var(--border) !important;
                        }
                      `}</style>

                      {/* TWO-COLUMN SPREADSHEET + AREA BREAKDOWN LAYOUT */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginBottom: '20px' }}>
                        
                        {/* LEFT COLUMN: INTERACTIVE HIGH-DENSITY SPREADSHEET */}
                        <div style={{ overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                          <table className="table boq-table" style={{ margin: 0, minWidth: '1300px', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <th style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                                <th style={{ width: '80px' }}>Type</th>
                                <th style={{ width: '165px' }}>Item Code</th>
                                <th>Description</th>
                                <th style={{ width: '90px' }}>Floor</th>
                                <th style={{ width: '120px' }}>Area Space</th>
                                <th style={{ width: '95px' }}>Dimming</th>
                                <th style={{ width: '90px' }}>Brand</th>
                                <th style={{ width: '95px', textAlign: 'right' }}>Cost Ex VAT</th>
                                <th style={{ width: '95px', textAlign: 'right' }}>Retail Price</th>
                                <th style={{ width: '100px', textAlign: 'right' }}>Total Retail</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Margin</th>
                                <th style={{ width: '90px' }}>Stock</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOrderItems.map((item) => {
                                const cost = Number(item.unitCost) || 0;
                                const retail = Number(item.unitRetail) || 0;
                                const qty = Number(item.qty) || 0;
                                const totalRetailLine = qty * retail;
                                const lineMargin = retail > 0 ? ((retail - cost) / retail) * 100 : 0;
                                const isLowMargin = lineMargin < 39;

                                // Google Sheet Highlighting rules
                                let rowStyle = {};
                                if (item.stockStatus === 'In Stock') {
                                  rowStyle = { background: 'rgba(59, 130, 246, 0.08)' };
                                } else if (item.selection === 'Selection') {
                                  rowStyle = { background: 'rgba(16, 185, 129, 0.06)' };
                                }

                                return (
                                  <tr key={item.id} style={rowStyle}>
                                    {/* QUANTITY */}
                                    <td>
                                      <input 
                                        type="number"
                                        className="boq-cell-input"
                                        style={{ textAlign: 'center' }}
                                        value={item.qty}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'qty', e.target.value)}
                                      />
                                    </td>
                                    
                                    {/* TYPE CODE */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.type || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'type', e.target.value)}
                                      />
                                    </td>

                                    {/* ITEM CODE SELECTOR / CUSTOM ENTRY */}
                                    <td>
                                      {item.isCustomCode || (!PRODUCT_CATALOG.some(p => p.code === item.code) && item.code) ? (
                                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                                          <input 
                                            type="text"
                                            className="boq-cell-input"
                                            style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-info)', flex: 1 }}
                                            value={item.code || ''}
                                            placeholder="Code..."
                                            onChange={e => handleUpdateSpreadsheetCell(item.id, 'code', e.target.value)}
                                          />
                                          <button 
                                            type="button" 
                                            className="btn btn-ghost" 
                                            style={{ padding: '0 4px', height: '22px', fontSize: '9px', border: '1px solid var(--border)' }}
                                            title="Back to Catalog List"
                                            onClick={() => {
                                              handleUpdateSpreadsheetCell(item.id, 'code', '');
                                              handleUpdateSpreadsheetCell(item.id, 'isCustomCode', false);
                                            }}
                                          >
                                            List
                                          </button>
                                        </div>
                                      ) : (
                                        <select 
                                          className="boq-cell-input"
                                          style={{ fontFamily: 'monospace', fontSize: '11px' }}
                                          value={item.code || ''}
                                          onChange={e => {
                                            const val = e.target.value;
                                            if (val === 'CUSTOM') {
                                              handleUpdateSpreadsheetCell(item.id, 'isCustomCode', true);
                                              handleUpdateSpreadsheetCell(item.id, 'code', '');
                                            } else {
                                              handleItemCodeChange(item.id, val);
                                            }
                                          }}
                                        >
                                          <option value="">-- Choose Product --</option>
                                          {PRODUCT_CATALOG.map(prod => (
                                            <option key={prod.code} value={prod.code}>{prod.code}</option>
                                          ))}
                                          <option value="CUSTOM">✎ Custom SKU...</option>
                                        </select>
                                      )}
                                    </td>

                                    {/* DESCRIPTION */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.description || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'description', e.target.value)}
                                      />
                                    </td>

                                    {/* FLOOR */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.floor || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'floor', e.target.value)}
                                      />
                                    </td>

                                    {/* AREA SPACE */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.area || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'area', e.target.value)}
                                      />
                                    </td>

                                    {/* DIMMING TYPE */}
                                    <td>
                                      <select 
                                        className="boq-cell-input"
                                        value={item.dimming || 'Non-dim'}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'dimming', e.target.value)}
                                      >
                                        <option>Non-dim</option>
                                        <option>Phase</option>
                                        <option>DALI</option>
                                        <option>1-10V</option>
                                      </select>
                                    </td>

                                    {/* BRAND */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.brand || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'brand', e.target.value)}
                                      />
                                    </td>

                                    {/* COST */}
                                    <td>
                                      <input 
                                        type="number"
                                        className="boq-cell-input"
                                        style={{ textAlign: 'right' }}
                                        value={item.unitCost}
                                        onChange={e => handlePriceEdit(item.id, 'unitCost', e.target.value, item.code)}
                                      />
                                    </td>

                                    {/* RETAIL */}
                                    <td>
                                      <input 
                                        type="number"
                                        className="boq-cell-input"
                                        style={{ textAlign: 'right' }}
                                        value={item.unitRetail}
                                        onChange={e => handlePriceEdit(item.id, 'unitRetail', e.target.value, item.code)}
                                      />
                                    </td>

                                    {/* LINE TOTAL */}
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontSize: '11px' }}>
                                      R {Math.round(totalRetailLine).toLocaleString()}
                                    </td>

                                    {/* MARGIN */}
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                                      {Math.round(lineMargin)}%
                                    </td>

                                    {/* STOCK STATUS */}
                                    <td>
                                      <select 
                                        className="boq-cell-input"
                                        value={item.stockStatus || 'Ordered'}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'stockStatus', e.target.value)}
                                      >
                                        <option>Ordered</option>
                                        <option>In Stock</option>
                                      </select>
                                    </td>

                                    {/* ACTIONS */}
                                    <td>
                                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                        <button 
                                          type="button"
                                          className="btn btn-ghost"
                                          style={{ padding: '2px', height: 'auto', color: 'var(--text-info)' }}
                                          title="Duplicate Row"
                                          onClick={() => handleDuplicateSpreadsheetRow(item)}
                                        >
                                          <Copy size={12} />
                                        </button>
                                        <button 
                                          type="button"
                                          className="btn btn-ghost"
                                          style={{ padding: '2px', height: 'auto', color: 'var(--text-danger)' }}
                                          title="Delete Row"
                                          onClick={() => handleDeleteSpreadsheetRow(item.id)}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* RIGHT COLUMN: BOQ AREA FINANCIAL SUMMARY */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                          <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} color="var(--text-info)" /> Area BOQ Breakdown
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                            {Object.entries(areaTotals).map(([areaName, totals]) => {
                              const areaMargin = totals.retail > 0 ? Math.round(((totals.retail - totals.cost) / totals.retail) * 100) : 0;
                              return (
                                <div key={areaName} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, display: 'block' }}>{areaName}</span>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    <span>Billed Retail:</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>R {Math.round(totals.retail).toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                    <span>Margin:</span>
                                    <span style={{ fontWeight: 700, color: areaMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)' }}>{areaMargin}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                            Allows PM to review spacing budgets before output generation.
                          </div>
                        </div>
                      </div>

                      {/* ADD ROW CONTROLS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                          type="button"
                          className="btn btn-ghost"
                          style={{ border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                          onClick={handleAddSpreadsheetRow}
                        >
                           <Plus size={14} /> Add new fixture row
                        </button>
                        
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          * Stock items highlight in <span style={{ color: 'var(--text-info)', fontWeight: 600 }}>blue</span>. Selections highlight in <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>green</span>. Low-margins highlight in <span style={{ color: 'var(--text-danger)', fontWeight: 600 }}>red</span>.
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              
              /* SUB-TAB 2: HIGH-FIDELITY DOCUMENT GENERATOR */
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
                
                {/* DOCUMENT SIDEBAR UTILITIES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* EDITABLE TERMS AND CONDITIONS BOX */}
                  <div style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Custom Terms & Notes
                    </label>
                    <textarea 
                      className="form-control"
                      style={{ fontSize: '11px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', height: '110px', resize: 'vertical', width: '100%' }}
                      value={customTerms}
                      onChange={e => setCustomTerms(e.target.value)}
                      placeholder="Insert customized contract T&Cs or bank detail descriptions..."
                    />
                  </div>

                  {/* PRINT / EXPORT BUTTON */}
                  <button 
                    className="btn btn-primary"
                    style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                    onClick={() => window.print()}
                  >
                    <Printer size={15} /> Print / Save PDF 🖨️
                  </button>
                </div>

                {/* THE HIGH-FIDELITY LIVE DOCUMENT CANVAS PREVIEW */}
                {(() => {
                  const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
                  const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                  const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  const vatAmount = discountedRetail * 0.15;
                  const finalTotalInclVat = discountedRetail * 1.15;
                  const balanceOutstanding = Math.max(0, discountedRetail - Number(orderPaidAmount));

                  // Group items by Area for clear section layouts
                  const groupedItems = {};
                  activeOrderItems.forEach(item => {
                    const areaName = item.area || 'General Spaces';
                    if (!groupedItems[areaName]) groupedItems[areaName] = [];
                    groupedItems[areaName].push(item);
                  });

                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '4px' }}>
                      <div 
                        id="print-document-canvas" 
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
                        {/* Dynamic Document Header Letterhead */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2.5px solid #0f172a', paddingBottom: '20px', marginBottom: '24px' }}>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
                              ONE TO ONE LIGHTING DESIGN
                            </h2>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              Ecosystem Portal Output Engine • Premium Architectural Fixtures
                            </span>
                            <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                              VAT Reg No: 4590312965 • Reg No: 2022/863083/07
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ 
                              fontSize: '11px', 
                              textTransform: 'uppercase', 
                              letterSpacing: '1px', 
                              background: '#f1f5f9', 
                              color: '#0f172a', 
                              padding: '4px 10px', 
                              borderRadius: '4px', 
                              fontWeight: 700 
                            }}>
                              {activeDocType === 'quote' && 'BOQ Client Quotation'}
                              {activeDocType === 'invoice' && 'Tax Invoice'}
                              {activeDocType === 'schedule' && 'Fitting Installation Schedule'}
                              {activeDocType === 'delivery' && 'Warehouse Delivery Note'}
                              {activeDocType === 'statement' && 'Quotation Progress Statement'}
                            </span>
                            <h3 style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                              {selectedOrderId}
                            </h3>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Date: {orderDate}</span>
                            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', fontStyle: 'italic' }}>Rep: {oneOneRep} | PM: {pmName}</span>
                          </div>
                        </div>

                        {/* RECIPIENT & CLIENT DETAILS METADATA BLOCK */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '11px', color: '#334155', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Client & Customer Details</span>
                            <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>{clientCompany || 'Private Client'}</strong>
                            <span style={{ display: 'block', fontWeight: 500 }}>Attn: {clientContact || 'Erin Jones'}</span>
                            <span style={{ display: 'block' }}>Phone: {clientPhone || '—'}</span>
                            <span style={{ display: 'block' }}>Email: {clientEmail || '—'}</span>

                            <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginTop: '10px', marginBottom: '4px' }}>Project Vitals</span>
                            <strong style={{ fontSize: '12px', color: '#0f172a', display: 'block' }}>{projectFullName || 'Upper Primrose'}</strong>
                            <span style={{ display: 'block' }}>Tier: {projectTier || 'Signature'} | Size: {projectSize || '—'}</span>
                            <span style={{ display: 'block', fontSize: '10px', marginTop: '4px', fontStyle: 'italic' }}>
                              Electrician: {electrician} ({electricianPhone})
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', fontStyle: 'italic' }}>
                              Contractor: {contractor} ({contractorPhone})
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', fontStyle: 'italic' }}>
                              Designer: {interiorDesigner} ({interiorDesignerPhone})
                            </span>
                          </div>
                          
                          <div>
                            <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Delivery Address</span>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '50px' }}>
                              {deliveryAddress || '7 Ravenscraig Road, Woodstock, Cape Town, 7941'}
                            </div>

                            <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginTop: '10px', marginBottom: '4px' }}>Billing Details & Terms</span>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4', background: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '70px', fontFamily: 'monospace', fontSize: '10px' }}>
                              {billingDetails || 'Standard Billing Details'}
                            </div>
                          </div>
                        </div>

                        {/* RENDER DYNAMIC TABLES BASED ON SELECTED DOCUMENT TYPE */}

                        {/* 1. CLIENT QUOTATION OUTFLOW */}
                        {activeDocType === 'quote' && (
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                              Itemized Bill of Quantity (BOQ) by Area
                            </h4>

                            {Object.entries(groupedItems).map(([areaName, items]) => {
                              const areaSum = items.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                              return (
                                <div key={areaName} style={{ marginBottom: '18px' }}>
                                  <div style={{ background: '#f1f5f9', padding: '6px 10px', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Area: {areaName}</span>
                                    <span>Area Sub-total: R {Math.round(areaSum).toLocaleString()}</span>
                                  </div>

                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                        <th style={{ padding: '6px', width: '40px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '6px', width: '80px' }}>Type</th>
                                        <th style={{ padding: '6px' }}>Description</th>
                                        <th style={{ padding: '6px', width: '90px' }}>Brand</th>
                                        <th style={{ padding: '6px', width: '100px', textAlign: 'right' }}>Unit Retail</th>
                                        <th style={{ padding: '6px', width: '100px', textAlign: 'right' }}>Total Retail</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '6px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                                          <td style={{ padding: '6px', fontFamily: 'monospace' }}>{item.type}</td>
                                          <td style={{ padding: '6px' }}>{item.description}</td>
                                          <td style={{ padding: '6px' }}>{item.brand}</td>
                                          <td style={{ padding: '6px', textAlign: 'right' }}>R {Math.round(Number(item.unitRetail) || 0).toLocaleString()}</td>
                                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>
                                            R {Math.round((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}

                            {/* VAT CALCULATIONS & FINAL BALANCES */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                              <div style={{ width: '280px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                  <span>BOQ Retail Subtotal:</span>
                                  <span>R {Math.round(totalRetail).toLocaleString()}</span>
                                </div>
                                {orderDiscount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-danger)' }}>
                                    <span>Volume Discount ({orderDiscount}%):</span>
                                    <span>- R {Math.round(totalRetail * (orderDiscount/100)).toLocaleString()}</span>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600, borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                                  <span>Total Net Excl VAT:</span>
                                  <span>R {Math.round(discountedRetail).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                  <span>VAT (15%):</span>
                                  <span>R {Math.round(vatAmount).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '13.5px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                  <span>Total Billed Incl VAT:</span>
                                  <span>R {Math.round(finalTotalInclVat).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. TAX INVOICE OUTFLOW */}
                        {activeDocType === 'invoice' && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ margin: 0, fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', flex: 1 }}>
                                Official Tax Billing Invoice
                              </h4>
                              
                              {/* Large Diagonal Style Paid Badge */}
                              <div style={{ 
                                border: `2.5px solid ${balanceOutstanding === 0 ? '#10b981' : '#f59e0b'}`, 
                                color: balanceOutstanding === 0 ? '#10b981' : '#f59e0b', 
                                textTransform: 'uppercase', 
                                padding: '4px 12px', 
                                borderRadius: '6px', 
                                fontSize: '12px', 
                                fontWeight: 900,
                                transform: 'rotate(-5deg)',
                                marginLeft: '15px'
                              }}>
                                {balanceOutstanding === 0 ? 'PAID IN FULL ✓' : 'DEPOSIT INVOICE ACTIVE'}
                              </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                  <th style={{ padding: '8px', width: '50px', textAlign: 'center' }}>Qty</th>
                                  <th style={{ padding: '8px' }}>Description</th>
                                  <th style={{ padding: '8px', width: '120px' }}>Area Space</th>
                                  <th style={{ padding: '8px', width: '100px', textAlign: 'right' }}>Unit Price (Ex VAT)</th>
                                  <th style={{ padding: '8px', width: '100px', textAlign: 'right' }}>Total (Ex VAT)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeOrderItems.map(item => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                                    <td style={{ padding: '8px' }}>
                                      <strong>{item.brand}</strong> - {item.description}
                                    </td>
                                    <td style={{ padding: '8px', color: '#64748b' }}>{item.area} ({item.floor})</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>R {Math.round(Number(item.unitRetail) * (1 - orderDiscount/100)).toLocaleString()}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                                      R {Math.round((Number(item.qty) || 0) * (Number(item.unitRetail) || 0) * (1 - orderDiscount/100)).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* TAX BREAKDOWN TABLE */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginTop: '20px' }}>
                              <div style={{ fontSize: '10.5px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                                <strong>Standard Payment Bank Details:</strong><br />
                                First National Bank (FNB)<br />
                                Account Number: 6289012345<br />
                                Branch Code: 250655<br />
                                Reference: Quote ID <strong>{selectedOrderId}</strong><br />
                                Send POP to finance@1to1lighting.com
                              </div>

                              <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                  <span>Total Net Invoice EX VAT:</span>
                                  <span>R {Math.round(discountedRetail).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                  <span>VAT (15%):</span>
                                  <span>R {Math.round(vatAmount).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 700, borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                                  <span>Gross Value (Incl VAT):</span>
                                  <span>R {Math.round(finalTotalInclVat).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                  <span>Amount Paid Received:</span>
                                  <span>R {Number(orderPaidAmount).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: balanceOutstanding > 0 ? '#f59e0b' : '#64748b', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                  <span>Balance Outstanding:</span>
                                  <span>R {Math.round(balanceOutstanding).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. TECHNICAL FITTING SCHEDULE OUTFLOW (PRICES COMPLETELY HIDDEN) */}
                        {activeDocType === 'schedule' && (
                          <div>
                            <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '18px', fontSize: '11px', color: '#475569' }}>
                              <strong>TECHNICAL INSTALLATION DIRECTIVE:</strong> This fitting schedule contains exclusively installation and product specification details for site execution. **All pricing structures are hidden** to maintain clean logistics focus on site.
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #0f172a', color: '#0f172a', textAlign: 'left', fontWeight: 700 }}>
                                  <th style={{ padding: '8px', width: '40px', textAlign: 'center' }}>Qty</th>
                                  <th style={{ padding: '8px', width: '70px' }}>Type</th>
                                  <th style={{ padding: '8px', width: '110px' }}>Item Code</th>
                                  <th style={{ padding: '8px' }}>Internal Technical Specification</th>
                                  <th style={{ padding: '8px', width: '90px' }}>Floor</th>
                                  <th style={{ padding: '8px', width: '100px' }}>Area Space</th>
                                  <th style={{ padding: '8px', width: '80px' }}>Dimming</th>
                                  <th style={{ padding: '8px', width: '90px' }}>Brand</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeOrderItems.map(item => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                                    <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 600 }}>{item.type}</td>
                                    <td style={{ padding: '8px', fontFamily: 'monospace', color: '#0284c7' }}>{item.code || '—'}</td>
                                    <td style={{ padding: '8px' }}>{item.description}</td>
                                    <td style={{ padding: '8px' }}>{item.floor}</td>
                                    <td style={{ padding: '8px', fontWeight: 500 }}>{item.area}</td>
                                    <td style={{ padding: '8px' }}>
                                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                        {item.dimming || 'Non-dim'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '8px' }}>{item.brand}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}



                        {/* 5. QUOTATION PROGRESS STATEMENT */}
                        {activeDocType === 'statement' && (
                          <div>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                              Quotation Balance Statement & Delivery Status
                            </h4>

                            {/* Ledger Statement Card */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>Total Quotation (EX VAT)</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '4px' }}>R {Math.round(discountedRetail).toLocaleString()}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>Total Paid (Received)</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', display: 'block', marginTop: '4px' }}>R {Number(orderPaidAmount).toLocaleString()}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>Outstanding Balance</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: balanceOutstanding > 0 ? '#f59e0b' : '#64748b', display: 'block', marginTop: '4px' }}>R {Math.round(balanceOutstanding).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Progress Bar Indicators */}
                            <div style={{ marginBottom: '30px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                                <span>Quotation Payment Cleared:</span>
                                <strong>{discountedRetail > 0 ? Math.round((Number(orderPaidAmount) / discountedRetail) * 100) : 0}%</strong>
                              </div>
                              <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ 
                                  background: '#10b981', 
                                  height: '100%', 
                                  width: `${discountedRetail > 0 ? Math.min(100, Math.round((Number(orderPaidAmount) / discountedRetail) * 100)) : 0}%` 
                                }}></div>
                              </div>
                            </div>

                            {/* Spacing areas delivery summary */}
                            <h5 style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#0f172a' }}>Site Area Delivery Summaries</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {Object.entries(groupedItems).map(([areaName, items]) => {
                                const inStockCount = items.filter(item => item.stockStatus === 'In Stock').length;
                                const percentDelivered = items.length > 0 ? Math.round((inStockCount / items.length) * 100) : 0;
                                
                                return (
                                  <div key={areaName} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                    <div>
                                      <strong>{areaName}</strong>
                                      <span style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                        {inStockCount} of {items.length} fixtures in stock/delivered on site
                                      </span>
                                    </div>
                                    
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ 
                                        background: percentDelivered === 100 ? '#d1fae5' : '#fef3c7', 
                                        color: percentDelivered === 100 ? '#065f46' : '#92400e', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '10px',
                                        fontWeight: 600
                                      }}>
                                        {percentDelivered === 100 ? 'Fully Delivered' : `${percentDelivered}% Completed`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* CUSTOM TERMS AND NOTES BLOCK */}
                        <div style={{ marginTop: '36px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', fontSize: '10.5px', color: '#475569', lineHeight: '1.5' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Notes & Contractual Terms</span>
                          {customTerms}
                        </div>

                      </div>
                    </div>
                  );
                })()}

              </div>
            )}

            {/* Stoic Logistical Advisory Banner */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(24,95,165,0.05) 0%, rgba(139,92,246,0.02) 100%)', 
              border: '1.5px dashed var(--border-info)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '14px 18px', 
              marginTop: '20px', 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center' 
            }}>
              <HelpCircle size={18} color="var(--text-info)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '2px' }}>Stoic Logistical Advisory ({PHI_ADVISORIES.orders.author})</span>
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{PHI_ADVISORIES.orders.quote}"</span>
                <span style={{ color: 'var(--text-info)', display: 'block', marginTop: '4px' }}><strong>Strategic Practice:</strong> {PHI_ADVISORIES.orders.advice}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreatePoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Setup Spec Quotation BOQ</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreatePoModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreatePo}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Project</label>
                  <select 
                    className="form-control" 
                    value={newPoForm.projectKey} 
                    onChange={e => setNewPoForm({...newPoForm, projectKey: e.target.value})}
                  >
                    {Object.values(projects).map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Hardware Supplier</label>
                  <select 
                    className="form-control" 
                    value={newPoForm.supplier} 
                    onChange={e => setNewPoForm({...newPoForm, supplier: e.target.value})}
                  >
                    <option>Molecule Dist.</option>
                    <option>Modus Lighting</option>
                    <option>Philips Advance</option>
                    <option>Made by 1-to-1</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Status</label>
                    <select 
                      className="form-control" 
                      value={newPoForm.status} 
                      onChange={e => setNewPoForm({...newPoForm, status: e.target.value})}
                    >
                      <option>Pending</option>
                      <option>Processing</option>
                      <option>In transit</option>
                      <option>Delivered</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delivery ETA</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 28 May"
                      value={newPoForm.eta} 
                      onChange={e => setNewPoForm({...newPoForm, eta: e.target.value})}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowCreatePoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Initialize BOQ & Open Spec 🧠</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRICING CONSISTENCY ASSISTANT MODAL */}
      {pendingPriceEdit && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', border: '1px solid var(--border-info)', background: 'var(--bg-secondary)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-info)', padding: '12px 16px' }}>
              <div className="card-title" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600 }}>
                <AlertCircle size={16} color="var(--text-info)" /> Pricing Consistency Assistant
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px', color: 'white' }} onClick={() => setPendingPriceEdit(null)}>✕</button>
            </div>
            
            <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                The product code <strong style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{pendingPriceEdit.code}</strong> is used in multiple areas across this BOQ specification.
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'white', fontWeight: 500, lineHeight: '1.5' }}>
                Would you like to update the {pendingPriceEdit.field === 'unitCost' ? 'cost price' : 'retail price'} to <strong style={{ color: 'var(--text-success)' }}>R {pendingPriceEdit.value}</strong> for all rows matching this item code, or apply it to this specific row only?
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.1)' }}>
              <button 
                type="button"
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', fontSize: '12.5px', padding: '8px' }}
                onClick={() => {
                  // Apply to all
                  const { field, value, code } = pendingPriceEdit;
                  setActiveOrderItems(prev => prev.map(item => {
                    if (item.code === code) {
                      return { ...item, [field]: value };
                    }
                    return item;
                  }));
                  setPendingPriceEdit(null);
                }}
              >
                Update All Matching Rows ({activeOrderItems.filter(item => item.code === pendingPriceEdit.code).length} items)
              </button>
              <button 
                type="button"
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', border: '1px solid var(--border)', fontSize: '12.5px', padding: '8px' }}
                onClick={() => {
                  // Apply to this line only
                  const { itemId, field, value } = pendingPriceEdit;
                  handleUpdateSpreadsheetCell(itemId, field, value);
                  setPendingPriceEdit(null);
                }}
              >
                Update This Single Row Only
              </button>
              <button 
                type="button"
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', color: 'var(--text-danger)', fontSize: '12.5px', padding: '6px' }}
                onClick={() => setPendingPriceEdit(null)}
              >
                Cancel Change
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
