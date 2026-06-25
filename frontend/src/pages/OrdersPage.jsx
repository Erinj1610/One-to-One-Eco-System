import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResizableTable } from '../components/common/ResizableTable';
import CollapsibleAlertSidebar from '../components/common/CollapsibleAlertSidebar';
import { API_BASE } from '../api_config';
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
  ClipboardList,
  TrendingDown,
  Calendar
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
  Processing: 'b-warning',
  Cancelled: 'b-danger'
};

// Global Product Catalog for Item Code selection
const PRODUCT_CATALOG = [
  { code: '28402 9240 W', description: 'Downlight - Entero RD-S 14W 2700K 30° White', brand: 'Delta Light', dimming: 'Non-dim', unitCost: 2238.63, unitRetail: 2995.00, stockQty: 45, eta: '6 weeks' },
  { code: 'TA8-WWW', description: 'Downlight - Club Series TA8 GU10 White', brand: 'NEKO', dimming: 'Phase', unitCost: 450.00, unitRetail: 690.00, stockQty: 120, eta: '3 weeks' },
  { code: 'LA_12859898', description: 'Lamp - Classic LED GU10 5.5W 2700K 36°', brand: 'Spazio', dimming: 'Non-dim', unitCost: 65.00, unitRetail: 110.00, stockQty: 250, eta: '2 weeks' },
  { code: 'MOD-LED-001', description: 'Recessed LED Downlight 10W', brand: 'Modus', dimming: 'Non-dim', unitCost: 590.00, unitRetail: 890.00, stockQty: 85, eta: '2 weeks' },
  { code: 'MOD-STR-003', description: 'Surface Strip 2700K 1200mm', brand: 'Modus', dimming: 'Phase', unitCost: 820.00, unitRetail: 1240.00, stockQty: 14, eta: '2 weeks' },
  { code: 'SIG-PND-007', description: 'Bespoke Pendant Cluster', brand: 'Signature', dimming: 'DALI', unitCost: 5400.00, unitRetail: 8400.00, stockQty: 3, eta: '8 weeks' },
  { code: 'MOL-DRV-012', description: 'DALI Driver 100W', brand: 'Molecule', dimming: 'DALI', unitCost: 1400.00, unitRetail: 2100.00, stockQty: 60, eta: '4 weeks' },
  { code: 'MOD-WAL-002', description: 'Wall Washer Exterior 20W', brand: 'Modus', dimming: 'Non-dim', unitCost: 1100.00, unitRetail: 1650.00, stockQty: 22, eta: '3 weeks' },
  { code: 'SIG-FLR-019', description: 'Architectural Floor Uplight', brand: 'Signature', dimming: 'Non-dim', unitCost: 2100.00, unitRetail: 3200.00, stockQty: 8, eta: '4 weeks' },
  { code: 'MOL-TRK-005', description: '3-Phase Track System 2m', brand: 'Molecule', dimming: 'Non-dim', unitCost: 520.00, unitRetail: 780.00, stockQty: 30, eta: '2 weeks' },
];

function SearchableCodeSelect({ value, onChange, onSelect, rowIdx, colIdx, onKeyDown }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Sync internal search value with prop
  useEffect(() => {
    setSearchVal(value || '');
  }, [value]);

  const filtered = useMemo(() => {
    const query = searchVal.toLowerCase();
    if (!query) return PRODUCT_CATALOG;
    return PRODUCT_CATALOG.filter(prod =>
      prod.code.toLowerCase().includes(query) ||
      prod.description.toLowerCase().includes(query)
    );
  }, [searchVal]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
        e.stopPropagation();
      } else {
        setHighlightedIndex(prev => Math.min(filtered.length - 1, prev + 1));
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key === 'ArrowUp') {
      if (isOpen) {
        setHighlightedIndex(prev => Math.max(0, prev - 1));
        e.preventDefault();
        e.stopPropagation();
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
        e.preventDefault();
        e.stopPropagation();
        const selected = filtered[highlightedIndex];
        onSelect(selected);
        setSearchVal(selected.code);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Pass other keys to the grid keydown handler
      if (onKeyDown) {
        onKeyDown(e);
      }
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      <input
        type="text"
        className="boq-cell-input"
        style={{ fontFamily: 'monospace', fontSize: '13.5px', width: '100%', border: 'none', background: 'transparent', paddingRight: '20px' }}
        value={searchVal}
        placeholder="Type code..."
        onChange={e => {
          const val = e.target.value;
          setSearchVal(val);
          onChange(val);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onBlur={() => {
          // Slight delay to register mouse downs on options before closing
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        data-row={rowIdx}
        data-col={colIdx}
        data-field="code"
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault(); // Prevents input focus loss and blur
          setIsOpen(prev => !prev);
          setHighlightedIndex(0);
        }}
        style={{
          position: 'absolute',
          right: '2px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          opacity: 0.6,
          fontSize: '10px',
          padding: '4px',
          zIndex: 5
        }}
        title="Toggle Product List"
      >
        ▼
      </button>
      {isOpen && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--card-bg, #1a1e29)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          maxHeight: '250px',
          overflowY: 'auto',
          zIndex: 1000,
          textAlign: 'left'
        }}>
          {filtered.map((prod, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={prod.code}
                onMouseDown={() => {
                  onSelect(prod);
                  setSearchVal(prod.code);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: isHighlighted ? 'var(--primary-light, rgba(23, 100, 230, 0.2))' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  color: isHighlighted ? 'var(--primary, #1764e6)' : 'var(--text-main)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{prod.code}</span>
                <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                  {prod.description}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { projects, updateProject, contacts, setContacts, logAttrition, moveOrder, getModuleName, projectManagers } = useStore();
  const { isAdmin } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_orders') === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Attrition/Cancellation modal state
  const [cancelModalItem, setCancelModalItem] = useState(null); // { orderId, projectKey, clientName }
  const [lossReason, setLossReason] = useState('Price');
  const [lossNotes, setLossNotes] = useState('');

  const { widths, onResizeStart } = useResizableTable('orders_boq_spreadsheet', {
    qty: 60,
    oneOneCode: 100,
    type: 80,
    code: 165,
    description: 250,
    floor: 90,
    area: 120,
    dimming: 95,
    brand: 90,
    cost: 95,
    retail: 95,
    totalRetail: 100,
    margin: 60,
    stock: 90,
    actions: 70
  }, ['qty', 'oneOneCode', 'type', 'code', 'description', 'floor', 'area', 'dimming', 'brand', 'cost', 'retail', 'totalRetail', 'margin', 'stock', 'actions']);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Temporary state for the active order items in the spreadsheet workspace
  const [activeOrderItems, setActiveOrderItems] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderSupplier, setSupplier] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderEta, setOrderEta] = useState('');
  const [orderPaidAmount, setOrderPaidAmount] = useState(0);
  const [orderPayments, setOrderPayments] = useState([]);

  useEffect(() => {
    const sum = orderPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    setOrderPaidAmount(sum);
  }, [orderPayments]);

  const [showAreaBreakdown, setShowAreaBreakdown] = useState(true);
  
  // Link/Unlink modal state
  const [linkModalItem, setLinkModalItem] = useState(null);
  const [linkClient, setLinkClient] = useState('');
  const [linkProjectKey, setLinkProjectKey] = useState('');

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

  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const applyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Last Week') {
      const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'Last 30 Days') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'Financial Year') {
      const currentYear = today.getFullYear();
      const march1 = new Date(currentYear, 2, 1);
      if (today < march1) {
        setStartDate(new Date(currentYear - 1, 2, 1).toISOString().split('T')[0]);
        setEndDate(new Date(currentYear, 1, 28).toISOString().split('T')[0]);
      } else {
        setStartDate(march1.toISOString().split('T')[0]);
        setEndDate(new Date(currentYear + 1, 1, 28).toISOString().split('T')[0]);
      }
    }
  };

  // Workspace View State (BOQ Spreadsheet vs Document Generator)
  const [workspaceSubTab, setWorkspaceSubTab] = useState('boq'); // 'boq' | 'doc_gen'
  const [selectedDocType, setSelectedDocType] = useState('quote'); // 'quote' | 'boq_doc' | 'invoice' | 'schedule' | 'statement'
  const [showRegForm, setShowRegForm] = useState(true);
  const activeDocType = workspaceSubTab === 'boq' ? 'quote' : selectedDocType;
  const [customTerms, setCustomTerms] = useState('Payment: 50% deposit to initiate order, 40% on delivery, 10% post-installation sign-off. Validity: 30 days from date of issue.');

  // Pricing consistency assistant modal state
  const [pendingPriceEdit, setPendingPriceEdit] = useState(null); // { itemId, field, value, code }

  const [exportingDocx, setExportingDocx] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState(null);
  const [loadingLivePreview, setLoadingLivePreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);

  // Helper to roll up items for the summarized Quotation
  const groupItemsForQuotation = (items) => {
    const grouped = {};
    items.forEach(item => {
      const code = (item.code || '').trim();
      const desc = (item.description || '').trim();
      const key = code ? code : desc;
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          qty: 0,
          floor: '',
          area: '',
        };
      }
      grouped[key].qty += (Number(item.qty) || 0);
    });
    return Object.values(grouped).filter(item => item.qty > 0);
  };

  const triggerLivePreviewCompile = async (targetTab, pageNum = 1) => {
    let docType = '';
    if (targetTab === 'quote') {
      docType = 'QUOTATION';
    } else if (targetTab === 'boq_doc') {
      docType = 'BOQ';
    } else if (targetTab === 'deposit_invoice') {
      docType = 'DEPOSIT_INVOICE';
    } else if (targetTab === 'balance_invoice') {
      docType = 'BALANCE_INVOICE';
    } else if (targetTab === 'tax_invoice') {
      docType = 'TAX_INVOICE';
    } else if (targetTab === 'statement') {
      docType = 'PROGRESS_STATEMENT';
    } else {
      setLivePreviewUrl(null);
      return;
    }

    setLoadingLivePreview(true);
    try {
      const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
      const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
      const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
      const vatAmount = discountedRetail * 0.15;
      const finalTotalInclVat = discountedRetail * 1.15;
      
      let finalItems = [];
      if (docType === 'QUOTATION') {
        const summarized = groupItemsForQuotation(activeOrderItems);
        finalItems = summarized.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: '',
          area: '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      } else if (docType === 'BOQ') {
        const sortedItems = [...activeOrderItems].sort((a, b) => {
          const floorA = (a.floor || '').toLowerCase();
          const floorB = (b.floor || '').toLowerCase();
          if (floorA !== floorB) return floorA.localeCompare(floorB);
          return (a.area || '').toLowerCase().localeCompare((b.area || '').toLowerCase());
        });
        finalItems = sortedItems.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: item.floor || '',
          area: item.area || '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      } else {
        finalItems = activeOrderItems.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: item.floor || '',
          area: item.area || '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      }

      const tokens = {
        PROJECT_NAME: projectFullName || 'Private Client Project',
        CLIENT_NAME: clientContact || 'Client Name',
        DATE: orderDate || new Date().toLocaleDateString('en-ZA'),
        DOCUMENT_NUMBER: selectedOrderId || 'PO-2025-XXX',
        PROPOSAL_NUMBER: selectedOrderId || 'PO-2025-XXX',
        ORDER_STATUS: orderStatus || 'Draft',
        
        CLIENT_COMPANY: clientCompany || 'Private Client',
        CLIENT_CONTACT_PERSON: clientContact || 'Client Name',
        CLIENT_EMAIL: clientEmail || '',
        CLIENT_PHONE: clientPhone || '',
        CLIENT_VAT: '',
        DELIVERY_ADDRESS: deliveryAddress || '',
        
        ONEONE_REP: oneOneRep || 'Martin Döller',
        PM_NAME: pmName || 'Merlyn Mittins',
        PM_EMAIL: pmEmail || 'merlyn.mittins@1-to-1.world',
        PM_PHONE: pmPhone || '083 570 7795',
        PM_PPHONE: pmPhone || '083 570 7795',
        PROJECT_PM: pmName || 'Merlyn Mittins',
        PROJECT_SIZE: projectSize || '—',
        PROJECT_TIER: projectTier || 'Signature',
        
        SUBTOTAL: `R ${totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        DISCOUNT_AMOUNT: `R ${(totalRetail - discountedRetail).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        VAT_AMOUNT: `R ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_RETAIL: `R ${finalTotalInclVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_COST: `R ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        MARGIN_PERCENT: totalRetail > 0 ? `${Math.round(((totalRetail - totalCost) / totalRetail) * 100)}%` : '0%',
        DEPOSIT: `R ${(finalTotalInclVat * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        BALANCE: `R ${(finalTotalInclVat - (finalTotalInclVat * 0.5)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_PAID: `R ${orderPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        BALANCE_OUTSTANDING: `R ${(finalTotalInclVat - orderPaidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        
        items: finalItems,
        payments: (orderPayments || []).map((p, idx) => ({
          index: (idx + 1).toString(),
          date: p.date || '',
          reference: p.reference || '',
          amount: `R ${(Number(p.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })),
        // Hierarchical structure for custom docx loop formatting
        floors: (() => {
          const floorMap = {};
          finalItems.forEach(item => {
            const fName = item.floor || 'Unspecified';
            const aName = item.area || 'Unspecified';
            if (!floorMap[fName]) {
              floorMap[fName] = { name: fName, areas: {} };
            }
            if (!floorMap[fName].areas[aName]) {
              floorMap[fName].areas[aName] = { name: aName, items: [] };
            }
            floorMap[fName].areas[aName].items.push(item);
          });
          return Object.values(floorMap).map(f => ({
            name: f.name,
            areas: Object.values(f.areas)
          }));
        })()
      };

      const res = await fetch(`${API_BASE}/admin/generate/${docType}?page=${pageNum}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      if (!res.ok) {
        throw new Error('Preview compilation failed');
      }

      const blob = await res.blob();
      if (livePreviewUrl) {
        window.URL.revokeObjectURL(livePreviewUrl);
      }
      const url = window.URL.createObjectURL(blob);
      setLivePreviewUrl(url);
    } catch (err) {
      console.error("Failed to compile preview:", err);
    } finally {
      setLoadingLivePreview(false);
    }
  };

  useEffect(() => {
    setPreviewPage(1);
  }, [workspaceSubTab, selectedDocType, selectedOrderId, activeOrderItems.length]);

  useEffect(() => {
    if (workspaceSubTab === 'doc_gen' && (
      selectedDocType === 'quote' || 
      selectedDocType === 'boq_doc' || 
      selectedDocType === 'deposit_invoice' || 
      selectedDocType === 'balance_invoice' || 
      selectedDocType === 'tax_invoice' || 
      selectedDocType === 'statement'
    )) {
      triggerLivePreviewCompile(selectedDocType, previewPage);
    } else {
      setLivePreviewUrl(null);
    }
  }, [workspaceSubTab, selectedDocType, selectedOrderId, activeOrderItems.length, previewPage]);

  const handleExportDocxTemplate = async () => {
    let docType = '';
    if (activeDocType === 'quote') {
      docType = 'QUOTATION';
    } else if (activeDocType === 'boq_doc') {
      docType = 'BOQ';
    } else if (activeDocType === 'deposit_invoice') {
      docType = 'DEPOSIT_INVOICE';
    } else if (activeDocType === 'balance_invoice') {
      docType = 'BALANCE_INVOICE';
    } else if (activeDocType === 'tax_invoice') {
      docType = 'TAX_INVOICE';
    } else if (activeDocType === 'statement') {
      docType = 'PROGRESS_STATEMENT';
    } else {
      alert(`${activeDocType} is not supported via Word docx templates.`);
      return;
    }

    setExportingDocx(true);
    try {
      const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
      const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
      const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
      const vatAmount = discountedRetail * 0.15;
      const finalTotalInclVat = discountedRetail * 1.15;
      
      let finalItems = [];
      if (docType === 'QUOTATION') {
        const summarized = groupItemsForQuotation(activeOrderItems);
        finalItems = summarized.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: '',
          area: '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      } else if (docType === 'BOQ') {
        const sortedItems = [...activeOrderItems].sort((a, b) => {
          const floorA = (a.floor || '').toLowerCase();
          const floorB = (b.floor || '').toLowerCase();
          if (floorA !== floorB) return floorA.localeCompare(floorB);
          return (a.area || '').toLowerCase().localeCompare((b.area || '').toLowerCase());
        });
        finalItems = sortedItems.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: item.floor || '',
          area: item.area || '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      } else {
        finalItems = activeOrderItems.map((item, idx) => ({
          index: (idx + 1).toString(),
          code: item.code || '',
          description: item.description || '',
          qty: (item.qty || 0).toString(),
          brand: item.brand || '',
          retail: `R ${(Number(item.unitRetail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalRetail: `R ${((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          floor: item.floor || '',
          area: item.area || '',
          dimming: item.dimming || 'Non-dim',
          unitCost: `R ${(Number(item.unitCost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          stockStatus: item.stockStatus || 'In Stock',
          eta: item.eta || '4 weeks'
        }));
      }

      const tokens = {
        PROJECT_NAME: projectFullName || 'Private Client Project',
        CLIENT_NAME: clientContact || 'Client Name',
        DATE: orderDate || new Date().toLocaleDateString('en-ZA'),
        DOCUMENT_NUMBER: selectedOrderId || 'PO-2025-XXX',
        ORDER_STATUS: orderStatus || 'Draft',
        
        CLIENT_COMPANY: clientCompany || 'Private Client',
        CLIENT_CONTACT_PERSON: clientContact || 'Client Name',
        CLIENT_EMAIL: clientEmail || '',
        CLIENT_PHONE: clientPhone || '',
        CLIENT_VAT: '',
        DELIVERY_ADDRESS: deliveryAddress || '',
        
        ONEONE_REP: oneOneRep || 'Martin Döller',
        PM_NAME: pmName || 'Merlyn Mittins',
        PM_EMAIL: pmEmail || 'merlyn.mittins@1-to-1.world',
        PM_PHONE: pmPhone || '083 570 7795',
        PM_PPHONE: pmPhone || '083 570 7795',
        PROJECT_PM: pmName || 'Merlyn Mittins',
        PROJECT_SIZE: projectSize || '—',
        PROJECT_TIER: projectTier || 'Signature',
        
        SUBTOTAL: `R ${totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        DISCOUNT_AMOUNT: `R ${(totalRetail - discountedRetail).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        VAT_AMOUNT: `R ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_RETAIL: `R ${finalTotalInclVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_COST: `R ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        MARGIN_PERCENT: totalRetail > 0 ? `${Math.round(((totalRetail - totalCost) / totalRetail) * 100)}%` : '0%',
        DEPOSIT: `R ${(finalTotalInclVat * 0.5).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        BALANCE: `R ${(finalTotalInclVat - (finalTotalInclVat * 0.5)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        TOTAL_PAID: `R ${orderPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        BALANCE_OUTSTANDING: `R ${(finalTotalInclVat - orderPaidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        
        items: finalItems,
        payments: (orderPayments || []).map((p, idx) => ({
          index: (idx + 1).toString(),
          date: p.date || '',
          reference: p.reference || '',
          amount: `R ${(Number(p.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        })),
        floors: (() => {
          const floorMap = {};
          finalItems.forEach(item => {
            const fName = item.floor || 'Unspecified';
            const aName = item.area || 'Unspecified';
            if (!floorMap[fName]) {
              floorMap[fName] = { name: fName, areas: {} };
            }
            if (!floorMap[fName].areas[aName]) {
              floorMap[fName].areas[aName] = { name: aName, items: [] };
            }
            floorMap[fName].areas[aName].items.push(item);
          });
          return Object.values(floorMap).map(f => ({
            name: f.name,
            areas: Object.values(f.areas)
          }));
        })()
      };

      const res = await fetch(`${API_BASE}/admin/generate/${docType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate document from Word template.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType.toLowerCase()}_${selectedOrderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert(`Error generating document: ${err.message}`);
    } finally {
      setExportingDocx(false);
    }
  };

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
        if (location.state?.initialSubTab) {
          setWorkspaceSubTab(location.state.initialSubTab);
        }
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
    
    let matchesDate = true;
    if (startDate || endDate) {
      if (o.orderDate) {
        const orderTime = new Date(o.orderDate).getTime();
        if (startDate && orderTime < new Date(startDate).getTime()) matchesDate = false;
        if (endDate && orderTime > new Date(endDate).getTime() + 86400000) matchesDate = false;
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesProject && matchesDate;
  });

  // Dynamic statistics
  const totalCostCompany = filteredOrders.reduce((sum, o) => sum + (o.costValue || 0), 0);
  const totalValueCompany = filteredOrders.reduce((sum, o) => sum + (o.value || 0), 0);
  const blendedMarginCompany = totalValueCompany > 0 ? Math.round(((totalValueCompany - totalCostCompany) / totalValueCompany) * 100) : 0;
  const lowMarginPoCount = filteredOrders.filter(o => {
    const cost = o.costValue || 0;
    const retail = o.value || 0;
    if (retail === 0) return false;
    return ((retail - cost) / retail) * 100 < 39;
  }).length;

  // Open the spreadsheet workspace
  const handleOpenWorkspace = (order) => {
    setSelectedOrderId(order.id);
    setSelectedProjectKey(order.projectKey);
    const loadedItems = (order.itemsList || []).map(item => {
      if (!item.eta) {
        const catalogItem = PRODUCT_CATALOG.find(p => p.code === item.code);
        return {
          ...item,
          eta: catalogItem ? catalogItem.eta : '4 weeks'
        };
      }
      return item;
    });
    setActiveOrderItems(loadedItems);
    setOrderDiscount(order.discount || 0);
    setSupplier(order.supplier);
    setOrderStatus(order.status);
    setOrderEta(order.eta || '—');
    setOrderPaidAmount(order.paid || 0);
    if (order.payments) {
      setOrderPayments(order.payments);
    } else if (order.paid) {
      setOrderPayments([{ date: order.orderDate || new Date().toISOString().split('T')[0], amount: order.paid, reference: 'Pre-existing Payment' }]);
    } else {
      setOrderPayments([]);
    }
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
        let updated = { ...item, [field]: val };
        
        // Auto-populate details from PRODUCT_CATALOG if code changes
        if (field === 'code') {
          const catalogItem = PRODUCT_CATALOG.find(p => p.code === val);
          if (catalogItem) {
            updated.description = catalogItem.description;
            updated.brand = catalogItem.brand;
            updated.dimming = catalogItem.dimming;
            updated.unitCost = catalogItem.unitCost;
            updated.unitRetail = catalogItem.unitRetail;
            updated.eta = catalogItem.eta;
          }
        }

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

  // Google Sheets-style Keyboard Navigation
  const handleGridKeyDown = (e) => {
    const target = e.target;
    if (!target.classList.contains('boq-cell-input')) return;

    const row = parseInt(target.getAttribute('data-row'), 10);
    const col = parseInt(target.getAttribute('data-col'), 10);
    const field = target.getAttribute('data-field');

    let nextRow = row;
    let nextCol = col;
    const maxCols = 10; // 0 to 10

    if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      nextRow = Math.min(activeOrderItems.length - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      if (target.tagName === 'SELECT' || target.selectionStart === 0) {
        nextCol = Math.max(0, col - 1);
      } else {
        return;
      }
    } else if (e.key === 'ArrowRight') {
      if (target.tagName === 'SELECT' || target.selectionEnd === target.value.length) {
        nextCol = Math.min(maxCols, col + 1);
      } else {
        return;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        nextRow = Math.max(0, row - 1);
      } else {
        if (row === activeOrderItems.length - 1) {
          handleAddSpreadsheetRow();
          setTimeout(() => {
            const nextInput = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
            if (nextInput) {
              nextInput.focus();
              if (nextInput.select) nextInput.select();
            }
          }, 50);
          return;
        } else {
          nextRow = row + 1;
        }
      }
    } else if (e.key === 'Tab') {
      const lastRowIdx = activeOrderItems.length - 1;
      const lastColIdx = 10;
      if (row === lastRowIdx && col === lastColIdx && !e.shiftKey) {
        e.preventDefault();
        handleAddSpreadsheetRow();
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${row + 1}"][data-col="0"]`);
          if (nextInput) {
            nextInput.focus();
            if (nextInput.select) nextInput.select();
          }
        }, 50);
        return;
      } else {
        return;
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (row > 0) {
        const prevItem = activeOrderItems[row - 1];
        if (prevItem) {
          const valToCopy = prevItem[field];
          handleUpdateSpreadsheetCell(activeOrderItems[row].id, field, valToCopy);
        }
      }
      return;
    } else {
      return;
    }

    if (nextRow !== row || nextCol !== col) {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"]`);
      if (nextInput) {
        nextInput.focus();
        if (nextInput.select) nextInput.select();
      }
    }
  };

  // Excel/Google Sheets copy/paste parsing
  const handleGridPaste = (e) => {
    const target = e.target;
    if (!target.classList.contains('boq-cell-input')) return;

    const startRow = parseInt(target.getAttribute('data-row'), 10);
    const startCol = parseInt(target.getAttribute('data-col'), 10);

    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    const pastedText = clipboardData.getData('Text');

    const lines = pastedText.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length === 0) return;

    e.preventDefault();

    const fieldsOrder = [
      'qty',
      'oneOneCode',
      'type',
      'code',
      'description',
      'floor',
      'area',
      'dimming',
      'brand',
      'unitCost',
      'unitRetail',
      'stockStatus'
    ];

    let updatedItems = [...activeOrderItems];

    lines.forEach((line, rowOffset) => {
      const cells = line.split('\t');
      const targetRowIdx = startRow + rowOffset;

      if (targetRowIdx >= updatedItems.length) {
        const newRow = {
          id: 'I-' + (Date.now() + rowOffset),
          qty: 1,
          type: 'NEW',
          oneOneCode: '',
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
        updatedItems.push(newRow);
      }

      const itemToUpdate = { ...updatedItems[targetRowIdx] };

      cells.forEach((cellVal, colOffset) => {
        const targetColIdx = startCol + colOffset;
        if (targetColIdx < fieldsOrder.length) {
          const fieldName = fieldsOrder[targetColIdx];
          let cleanedVal = cellVal.trim();

          if (['qty', 'unitCost', 'unitRetail'].includes(fieldName)) {
            cleanedVal = Number(cleanedVal.replace(/[^0-9.-]/g, '')) || 0;
          }
          itemToUpdate[fieldName] = cleanedVal;
        }
      });

      updatedItems[targetRowIdx] = itemToUpdate;
    });

    setActiveOrderItems(updatedItems);
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
            unitRetail: catalogItem.unitRetail,
            eta: catalogItem.eta
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
      oneOneCode: '',
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
      stockStatus: 'Ordered',
      eta: '4 weeks'
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
          payments: orderPayments,
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

  const activeOrderObject = useMemo(() => {
    if (selectedOrderId === null) return null;
    return Object.values(projects)
      .flatMap(p => p.orders || [])
      .find(o => o.id === selectedOrderId);
  }, [projects, selectedOrderId]);

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTION FOR PREMIUM CLEAN DOCUMENT PRINTING */}
      <style>{`
        @media print {
          /* Hide sidebar, navigation header, tabs, buttons, forms, and settings cards */
          .sidebar, .navbar, .tabs, button, select, input, .btn, .section-label, .search-box-container, .card-title,
          div[style*="display: flex; flex-direction: column; gap: 8px;"] {
            display: none !important;
          }
          
          /* Un-restrict layout wrappers so they don't block the canvas */
          #root, body, html, main, .app-container, .main-content {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }

          #print-document-canvas-container {
            display: block !important;
            width: 100% !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #print-document-canvas {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px 40px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* HEADER BANNER */}
      {selectedOrderId === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: isSidebarCollapsed ? '1fr 50px' : '1fr 340px', gap: '24px', alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
          <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
            <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="av-md" style={{ background: 'rgba(24, 95, 165, 0.1)', color: 'var(--text-info)' }}>
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Hardware {getModuleName('orders', 'Orders')} & BOQ Workspace</h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Central Quotations & Area-by-Area BOQ Builder.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Date Filters */}
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
                  {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                    <button 
                      key={preset} 
                      className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`} 
                      style={{ border: 'none', background: datePreset === preset ? 'var(--text-info)' : 'none', color: datePreset === preset ? 'white' : 'var(--text-secondary)' }}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Custom Date Inputs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                  <Calendar size={13} color="var(--text-tertiary)" />
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }}
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setDatePreset('Custom');
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                  <input 
                    type="date" 
                    className="form-control" 
                    style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }}
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      setDatePreset('Custom');
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                  {projectFilterKey !== 'All' && (
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => setProjectFilterKey('All')}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)', height: '28px' }}
                    >
                      Clear Project Filter ×
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowCreatePoModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '28px', fontSize: '12px' }}
                  >
                    <Plus size={16} /> Create Quotation BOQ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4-COLUMN HIGH-FIDELITY KPI METRICS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {/* Card 1 */}
            <div 
              className="stat-card hover-scale"
              style={{ 
                background: 'var(--bg-primary)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL ACTIVE QUOTATIONS</span>
                <ClipboardList size={16} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {filteredOrders.length} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Active Qty</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Total quotations in system.
              </div>
            </div>

            {/* Card 2 */}
            <div 
              className="stat-card hover-scale"
              style={{ 
                background: 'var(--bg-primary)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>AGGREGATE COST BASIS</span>
                <DollarSign size={16} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                R {Math.round(totalCostCompany).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Aggregate supplier cost.
              </div>
            </div>

            {/* Card 3 */}
            <div 
              className="stat-card hover-scale"
              style={{ 
                background: 'var(--bg-primary)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL QUOTATION VALUE</span>
                <TrendingUp size={16} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                R {Math.round(totalValueCompany).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Aggregate retail value.
              </div>
            </div>

            {/* Card 4 */}
            <div 
              className="stat-card hover-scale"
              style={{ 
                background: 'var(--bg-primary)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>BLENDED RETAIL MARGIN</span>
                <Layers size={16} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: blendedMarginCompany < 39 ? 'var(--text-danger)' : 'var(--text-success)' }}>
                {blendedMarginCompany}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Average margin across filtered.
              </div>
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
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <span className="btn-link" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleOpenWorkspace(o)}>{o.id}</span>
                            {isAdmin && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 4px', height: '20px', border: '1px solid var(--border)', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)' }}
                                title="Link / Shift Project or Client"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkModalItem(o);
                                  setLinkClient(o.projectClient || '');
                                  setLinkProjectKey(o.projectKey || '');
                                }}
                              >
                                <Layers size={10} /> Link
                              </button>
                            )}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${o.projectKey}`); }}>{o.projectName}</td>
                          <td style={{ color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate('/crm', { state: { selectedClientName: o.projectClient } }); }}>{o.projectClient || '—'}</td>
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
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              {o.status !== 'Cancelled' && (
                                <button 
                                  className="btn btn-ghost btn-sm" 
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-danger)', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)' }}
                                  onClick={() => setCancelModalItem({
                                    orderId: o.id,
                                    projectKey: o.projectKey,
                                    clientName: o.projectClient
                                  })}
                                >
                                  <TrendingDown size={13} /> Cancel
                                </button>
                              )}
                            </div>
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
          </div>
          <CollapsibleAlertSidebar 
            module="orders" 
            onNavigate={(path, state) => {
              if (path === '/orders' && state?.selectedOrderId) {
                setSelectedOrderId(state.selectedOrderId);
                if (state.selectedProjectKey) setSelectedProjectKey(state.selectedProjectKey);
              } else {
                navigate(path, { state });
              }
            }}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(prev => !prev)}
          />
        </div>
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
                    onChange={e => {
                      if (e.target.value === 'Cancelled') {
                        setCancelModalItem({
                          orderId: selectedOrderId,
                          projectKey: selectedProjectKey,
                          clientName: clientContact
                        });
                      } else {
                        setOrderStatus(e.target.value);
                      }
                    }}
                  >
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>In transit</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
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
                className={`btn btn-sm ${workspaceSubTab === 'doc_gen' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('doc_gen')}
              >
                <FileText size={14} /> 📄 Document Generator & Exporter
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'payments' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('payments')}
              >
                <DollarSign size={14} /> 💳 Payments
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'logistics' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('logistics')}
              >
                <Truck size={14} /> 📦 Delivery Logistics
              </button>
            </div>

            {workspaceSubTab === 'boq' && (
              
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'rgba(139, 92, 246, 0.05)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>PM Name</label>
                          <select 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={pmName} 
                            onChange={e => {
                              const val = e.target.value;
                              setPmName(val);
                              setOneOneRep(val); // Keep synchronized
                              const found = (projectManagers || []).find(pm => pm.name === val);
                              if (found) {
                                setPmPhone(found.phone || '');
                                setPmEmail(found.email || '');
                              }
                            }}
                          >
                            <option value="">Select Project Manager...</option>
                            {(projectManagers || []).map(pm => (
                              <option key={pm.id} value={pm.name}>{pm.name} {pm.active === false ? '(Inactive)' : ''}</option>
                            ))}
                          </select>
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
                            <div style={{ gridColumn: 'span 2', marginBottom: '2px' }}>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-info)', marginBottom: '2px', fontWeight: 600 }}>Linked Contact (Select to Auto-Fill)</label>
                              <select 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={contacts.find(c => c.name === clientContact)?.name || ''}
                                onChange={e => {
                                  const contact = contacts.find(c => c.name === e.target.value);
                                  if (contact) {
                                    setClientContact(contact.name);
                                    setClientCompany(contact.company || '');
                                    setClientPhone(contact.phone || '');
                                    setClientEmail(contact.email || '');
                                  }
                                }}
                              >
                                <option value="">-- Choose from Contacts CRM --</option>
                                {contacts.map(c => (
                                  <option key={c.id} value={c.name}>{c.name} ({c.company || 'Private'})</option>
                                ))}
                              </select>
                            </div>
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
                            <div style={{ gridColumn: 'span 3' }}>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-info)', marginBottom: '2px', fontWeight: 600 }}>Project Name</label>
                              <select 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={Object.keys(projects).find(k => projects[k].name === projectFullName) || ''}
                                onChange={e => {
                                  const projKey = e.target.value;
                                  const proj = projects[projKey];
                                  if (proj) {
                                    setProjectFullName(proj.name);
                                    setProjectTier(proj.offering || 'Signature');
                                    setProjectSize(proj.sqm || '—');
                                    setPmName(proj.pm || '');
                                    
                                    // Lock client details to this project's client contact
                                    if (proj.client) {
                                      setClientContact(proj.client);
                                      const contact = contacts.find(c => c.name === proj.client);
                                      if (contact) {
                                        setClientCompany(contact.company || '');
                                        setClientPhone(contact.phone || '');
                                        setClientEmail(contact.email || '');
                                      }
                                    }
                                  } else {
                                    setProjectFullName('');
                                    setProjectTier('');
                                    setProjectSize('—');
                                    setPmName('');
                                  }
                                }}
                              >
                                <option value="">-- Client Direct / No Project --</option>
                                {Object.values(projects).filter(p => p.projectType !== 'Client-Direct').map(p => (
                                  <option key={p.key} value={p.key}>{p.name}</option>
                                ))}
                              </select>
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

                      {/* CSS STYLE INJECTIONS FOR ENHANCED LEGIBILITY & SPACING */}
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                        .boq-cell-input {
                          padding: 6px 10px !important;
                          font-size: 13.5px !important;
                          height: 36px !important;
                          background: transparent !important;
                          border: 1px solid transparent !important;
                          color: var(--text-primary) !important;
                          border-radius: 0px !important;
                          width: 100% !important;
                          outline: none !important;
                        }
                        .boq-cell-input:hover {
                          border: 1px solid var(--border) !important;
                        }
                        .boq-cell-input:focus {
                          border: 2px solid #185fa5 !important;
                          background: rgba(24, 95, 165, 0.05) !important;
                          border-radius: 2px !important;
                        }
                        .boq-table th {
                          padding: 12px 14px !important;
                          font-size: 13px !important;
                          font-weight: 600 !important;
                          text-transform: uppercase !important;
                          letter-spacing: 0.5px !important;
                          background: var(--bg-secondary) !important;
                          color: var(--text-secondary) !important;
                          border-bottom: 2px solid var(--border-strong) !important;
                          position: sticky !important;
                          top: 0 !important;
                          z-index: 10 !important;
                        }
                        .boq-table td {
                          padding: 6px 8px !important;
                          vertical-align: middle !important;
                          border-bottom: 1px solid var(--border) !important;
                        }
                      `}</style>

                      {/* TWO-COLUMN SPREADSHEET + AREA BREAKDOWN LAYOUT */}
                      <div style={{ display: 'grid', gridTemplateColumns: showAreaBreakdown ? '1fr 280px' : '1fr', gap: '20px', marginBottom: '20px' }}>
                        
                        {/* LEFT COLUMN: INTERACTIVE HIGH-DENSITY SPREADSHEET */}
                        <div 
                          style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                          onKeyDown={handleGridKeyDown}
                          onPaste={handleGridPaste}
                        >
                          <table className="table boq-table" style={{ margin: 0, tableLayout: 'fixed', width: '100%', minWidth: '1300px', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <th style={{ width: widths.qty, position: 'relative', textAlign: 'center' }}>
                                  Qty
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('qty', e)} />
                                </th>
                                <th style={{ width: widths.oneOneCode, position: 'relative' }}>
                                  1:1 Code
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('oneOneCode', e)} />
                                </th>
                                <th style={{ width: widths.type, position: 'relative' }}>
                                  Type
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('type', e)} />
                                </th>
                                <th style={{ width: widths.code, position: 'relative' }}>
                                  Item Code
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('code', e)} />
                                </th>
                                <th style={{ width: widths.description, position: 'relative' }}>
                                  Description
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('description', e)} />
                                </th>
                                <th style={{ width: widths.floor, position: 'relative' }}>
                                  Floor
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('floor', e)} />
                                </th>
                                <th style={{ width: widths.area, position: 'relative' }}>
                                  Area Space
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('area', e)} />
                                </th>
                                <th style={{ width: widths.dimming, position: 'relative' }}>
                                  Dimming
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('dimming', e)} />
                                </th>
                                <th style={{ width: widths.brand, position: 'relative' }}>
                                  Brand
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('brand', e)} />
                                </th>
                                <th style={{ width: widths.cost, position: 'relative', textAlign: 'right' }}>
                                  Cost Ex VAT
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('cost', e)} />
                                </th>
                                <th style={{ width: widths.retail, position: 'relative', textAlign: 'right' }}>
                                  Retail Price
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('retail', e)} />
                                </th>
                                <th style={{ width: widths.totalRetail, position: 'relative', textAlign: 'right' }}>
                                  Total Retail
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('totalRetail', e)} />
                                </th>
                                <th style={{ width: widths.margin, position: 'relative', textAlign: 'center' }}>
                                  Margin
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('margin', e)} />
                                </th>
                                <th style={{ width: widths.stock, position: 'relative' }}>
                                  Stock
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('stock', e)} />
                                </th>
                                <th style={{ width: widths.eta, position: 'relative' }}>
                                  ETA
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('eta', e)} />
                                </th>
                                <th style={{ width: widths.actions, position: 'relative', textAlign: 'center' }}>
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeOrderItems.map((item, index) => {
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
                                        data-row={index}
                                        data-col={0}
                                        data-field="qty"
                                      />
                                    </td>
                                    
                                    {/* 1:1 CODE */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.oneOneCode || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'oneOneCode', e.target.value)}
                                        data-row={index}
                                        data-col={1}
                                        data-field="oneOneCode"
                                      />
                                    </td>

                                    {/* TYPE CODE */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.type || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'type', e.target.value)}
                                        data-row={index}
                                        data-col={2}
                                        data-field="type"
                                      />
                                    </td>

                                    {/* ITEM CODE SELECTOR / CUSTOM ENTRY */}
                                    <td>
                                      <SearchableCodeSelect 
                                        value={item.code || ''}
                                        onChange={val => handleUpdateSpreadsheetCell(item.id, 'code', val)}
                                        onSelect={prod => {
                                          handleItemCodeChange(item.id, prod.code);
                                        }}
                                        rowIdx={index}
                                        colIdx={3}
                                        onKeyDown={handleGridKeyDown}
                                      />
                                    </td>

                                    {/* DESCRIPTION */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.description || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'description', e.target.value)}
                                        data-row={index}
                                        data-col={4}
                                        data-field="description"
                                      />
                                    </td>

                                    {/* FLOOR */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.floor || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'floor', e.target.value)}
                                        data-row={index}
                                        data-col={5}
                                        data-field="floor"
                                      />
                                    </td>

                                    {/* AREA SPACE */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.area || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'area', e.target.value)}
                                        data-row={index}
                                        data-col={6}
                                        data-field="area"
                                      />
                                    </td>

                                    {/* DIMMING TYPE */}
                                    <td>
                                      <select 
                                        className="boq-cell-input"
                                        value={item.dimming || 'Non-dim'}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'dimming', e.target.value)}
                                        data-row={index}
                                        data-col={7}
                                        data-field="dimming"
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
                                        data-row={index}
                                        data-col={8}
                                        data-field="brand"
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
                                        data-row={index}
                                        data-col={9}
                                        data-field="unitCost"
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
                                        data-row={index}
                                        data-col={10}
                                        data-field="unitRetail"
                                      />
                                    </td>

                                    {/* LINE TOTAL */}
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                      R {Math.round(totalRetailLine).toLocaleString()}
                                    </td>

                                    {/* MARGIN */}
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13.5px', color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                                      {Math.round(lineMargin)}%
                                    </td>

                                    {/* STOCK STATUS (Stock on hand) */}
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                                      {(() => {
                                        const catalogItem = PRODUCT_CATALOG.find(p => p.code === item.code);
                                        return catalogItem ? `${catalogItem.stockQty} Qty` : '—';
                                      })()}
                                    </td>

                                    {/* ETA */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        style={{ textAlign: 'center' }}
                                        value={item.eta || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'eta', e.target.value)}
                                        data-row={index}
                                        data-col={14}
                                        data-field="eta"
                                      />
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
                        {showAreaBreakdown && (
                          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={14} color="var(--text-info)" /> Area BOQ Breakdown
                              </h4>
                              <button 
                                type="button" 
                                className="btn btn-ghost btn-sm" 
                                style={{ padding: '2px 6px', fontSize: '10px', height: 'auto', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                onClick={() => setShowAreaBreakdown(false)}
                              >
                                Collapse ✕
                              </button>
                            </div>
                            
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
                        )}
                      </div>

                      {/* ADD ROW CONTROLS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button"
                            className="btn btn-ghost"
                            style={{ border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                            onClick={handleAddSpreadsheetRow}
                          >
                             <Plus size={14} /> Add new fixture row
                          </button>
                          
                          {!showAreaBreakdown && (
                            <button 
                              type="button"
                              className="btn btn-ghost"
                              style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--bg-secondary)' }}
                              onClick={() => setShowAreaBreakdown(true)}
                            >
                              Show Area Breakdown 📊
                            </button>
                          )}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          * Stock items highlight in <span style={{ color: 'var(--text-info)', fontWeight: 600 }}>blue</span>. Selections highlight in <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>green</span>. Low-margins highlight in <span style={{ color: 'var(--text-danger)', fontWeight: 600 }}>red</span>.
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {workspaceSubTab === 'doc_gen' && (
              
              /* SUB-TAB 2: HIGH-FIDELITY DOCUMENT GENERATOR */
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
                
                {/* DOCUMENT SIDEBAR UTILITIES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* DOCUMENT SELECTION */}
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Select Document</span>
                    {[
                      { id: 'quote', name: 'Quotation (Summarized)', icon: <FileText size={14} /> },
                      { id: 'boq_doc', name: 'BOQ (Detailed Breakdown)', icon: <Layers size={14} /> },
                      { id: 'schedule', name: 'Fitting Schedule', icon: <ClipboardList size={14} /> },
                      { id: 'deposit_invoice', name: 'Deposit Invoice', icon: <DollarSign size={14} /> },
                      { id: 'balance_invoice', name: 'Balance Invoice', icon: <DollarSign size={14} /> },
                      { id: 'tax_invoice', name: 'Tax Invoice (Full)', icon: <DollarSign size={14} /> },
                      { id: 'statement', name: 'Progress Statement', icon: <TrendingUp size={14} /> }
                    ].map(doc => {
                      const isSelected = selectedDocType === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'flex-start',
                            width: '100%',
                            padding: '8px 12px',
                            textAlign: 'left',
                            borderRadius: '6px'
                          }}
                          onClick={() => setSelectedDocType(doc.id)}
                        >
                          {doc.icon}
                          <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 600 : 500 }}>{doc.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* PRINT / EXPORT ACTIONS */}
                  <button 
                    className="btn btn-primary"
                    style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'linear-gradient(135deg, #2b579a 0%, #1e3f70 100%)', border: 'none' }}
                    onClick={handleExportDocxTemplate}
                    disabled={exportingDocx}
                  >
                    <FileText size={15} /> {exportingDocx ? 'Compiling PDF...' : 'Download PDF (Word Template) 📝'}
                  </button>

                  <button 
                    className="btn"
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    onClick={() => window.print()}
                  >
                    <Printer size={15} /> Print Browser View 🖨️
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
                    <div id="print-document-canvas-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', overflowX: 'auto', padding: '4px' }}>
                      {loadingLivePreview ? (
                        <div style={{
                          width: '100%',
                          maxWidth: '840px',
                          height: '600px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'transparent',
                          border: '1px dashed var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)'
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(255,255,255,0.1)',
                            borderTopColor: 'var(--primary, #1764e6)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '16px'
                          }}></div>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Compiling Document Preview...</span>
                          <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Generating from Word template</span>
                        </div>
                      ) : (
                        activeDocType === 'quote' || 
                        activeDocType === 'boq_doc' || 
                        activeDocType === 'deposit_invoice' || 
                        activeDocType === 'balance_invoice' || 
                        activeDocType === 'tax_invoice' || 
                        activeDocType === 'statement'
                      ) && livePreviewUrl ? (
                        <div style={{ width: '100%', maxWidth: '840px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px',
                            background: 'var(--bg-secondary, #1a1e29)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '6px 16px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              disabled={previewPage <= 1}
                              onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                              style={{ fontSize: '14px', padding: '0 8px', minWidth: '32px', color: 'var(--text-primary)' }}
                            >
                              ◀
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '90px', textAlign: 'center' }}>
                              Page {previewPage}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => setPreviewPage(p => p + 1)}
                              style={{ fontSize: '14px', padding: '0 8px', minWidth: '32px', color: 'var(--text-primary)' }}
                            >
                              ▶
                            </button>
                          </div>
                          <iframe
                            src={`${livePreviewUrl}#page=${previewPage}&toolbar=0&navpanes=0`}
                            style={{
                              width: '100%',
                              height: '1000px',
                              border: 'none',
                              borderRadius: '8px',
                              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                              background: 'white'
                            }}
                            title="Live Document Preview"
                          />
                        </div>
                      ) : (
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
                              {activeDocType === 'deposit_invoice' && 'Deposit Invoice'}
                              {activeDocType === 'balance_invoice' && 'Balance Invoice'}
                              {activeDocType === 'tax_invoice' && 'Tax Invoice (Full)'}
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

                        {/* 1.5 DETAIL BOQ DOCUMENT OUTFLOW */}
                        {activeDocType === 'boq_doc' && (
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                              Detailed Bill of Quantity (BOQ) Breakdown
                            </h4>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #0f172a', color: '#0f172a', textAlign: 'left', fontWeight: 700 }}>
                                  <th style={{ padding: '6px', width: '40px', textAlign: 'center' }}>#</th>
                                  <th style={{ padding: '6px', width: '120px' }}>Location (Floor/Area)</th>
                                  <th style={{ padding: '6px', width: '90px' }}>Code</th>
                                  <th style={{ padding: '6px' }}>Description</th>
                                  <th style={{ padding: '6px', width: '80px' }}>Dimming</th>
                                  <th style={{ padding: '6px', width: '80px' }}>ETA</th>
                                  <th style={{ padding: '6px', width: '40px', textAlign: 'center' }}>Qty</th>
                                  <th style={{ padding: '6px', width: '90px', textAlign: 'right' }}>Unit Retail</th>
                                  <th style={{ padding: '6px', width: '90px', textAlign: 'right' }}>Total Retail</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...activeOrderItems]
                                  .sort((a, b) => {
                                    const floorA = (a.floor || '').toLowerCase();
                                    const floorB = (b.floor || '').toLowerCase();
                                    if (floorA !== floorB) return floorA.localeCompare(floorB);
                                    return (a.area || '').toLowerCase().localeCompare((b.area || '').toLowerCase());
                                  })
                                  .map((item, idx) => (
                                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                      <td style={{ padding: '6px', fontWeight: 500 }}>
                                        {item.floor ? `${item.floor} - ` : ''}{item.area || '—'}
                                      </td>
                                      <td style={{ padding: '6px', fontFamily: 'monospace', color: '#0284c7' }}>{item.code || '—'}</td>
                                      <td style={{ padding: '6px' }}>
                                        <strong>{item.brand ? `[${item.brand}] ` : ''}</strong>
                                        {item.description}
                                      </td>
                                      <td style={{ padding: '6px' }}>
                                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                                          {item.dimming || 'Non-dim'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{item.eta || '4 weeks'}</td>
                                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                                      <td style={{ padding: '6px', textAlign: 'right' }}>R {Math.round(Number(item.unitRetail) || 0).toLocaleString()}</td>
                                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>
                                        R {Math.round((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>

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
                        {(activeDocType === 'invoice' || activeDocType === 'deposit_invoice' || activeDocType === 'balance_invoice' || activeDocType === 'tax_invoice') && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ margin: 0, fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', flex: 1 }}>
                                {activeDocType === 'deposit_invoice' && 'Official Billing Deposit Invoice (50% Due)'}
                                {activeDocType === 'balance_invoice' && 'Official Billing Remaining Balance Invoice'}
                                {activeDocType === 'tax_invoice' && 'Official Tax Billing Invoice (Full Value)'}
                                {activeDocType === 'invoice' && 'Official Tax Billing Invoice'}
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
                                {activeDocType === 'deposit_invoice' ? (
                                  orderPaidAmount >= (finalTotalInclVat * 0.5) ? 'DEPOSIT PAID ✓' : 'DEPOSIT PENDING'
                                ) : balanceOutstanding === 0 ? 'PAID IN FULL ✓' : 'BALANCE OUTSTANDING'}
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
                              <div style={{ fontSize: '10.5px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                  <strong>Standard Payment Bank Details:</strong><br />
                                  First National Bank (FNB)<br />
                                  Account Number: 6289012345<br />
                                  Branch Code: 250655<br />
                                  Reference: Quote ID <strong>{selectedOrderId}</strong><br />
                                  Send POP to finance@1to1lighting.com
                                </div>
                                {orderPayments && orderPayments.length > 0 && (
                                  <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                                    <strong>Payments Received:</strong>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                      {orderPayments.map((p, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '2px' }}>
                                          <span>{p.date} - {p.reference || 'EFT'}</span>
                                          <strong style={{ color: '#10b981' }}>R {Number(p.amount).toLocaleString()}</strong>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {activeDocType === 'deposit_invoice' ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                      <span>Total Project Value (Incl VAT):</span>
                                      <span>R {Math.round(finalTotalInclVat).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                      <span>Deposit Percentage Required:</span>
                                      <span>50%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                      <span>DEPOSIT AMOUNT DUE:</span>
                                      <span>R {Math.round(finalTotalInclVat * 0.5).toLocaleString()}</span>
                                    </div>
                                  </>
                                ) : activeDocType === 'balance_invoice' ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                      <span>Total Project Value (Incl VAT):</span>
                                      <span>R {Math.round(finalTotalInclVat).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                      <span>Less: Deposit Paid (50%):</span>
                                      <span>R {Math.round(finalTotalInclVat * 0.5).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                      <span>BALANCE OUTSTANDING:</span>
                                      <span>R {Math.round(finalTotalInclVat - (finalTotalInclVat * 0.5)).toLocaleString()}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
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
                                  </>
                                )}
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
                                  <th style={{ padding: '8px', width: '90px' }}>1:1 Code</th>
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
                                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{item.oneOneCode || '—'}</td>
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
                      )}
                    </div>
                  );
                })()}

              </div>
            )}

            {workspaceSubTab === 'payments' && (
              /* SUB-TAB 3: DEDICATED PAYMENTS LOG WORKSPACE */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                
                {/* Left Side: Ledger and Entry Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Payments Table */}
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)' }}>
                      💳 Payments Received History Ledger
                    </h4>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            <th style={{ padding: '8px 10px', width: '120px' }}>Date</th>
                            <th style={{ padding: '8px 10px', width: '160px' }}>Payment Type</th>
                            <th style={{ padding: '8px 10px' }}>Reference / Notes</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', width: '120px' }}>Amount</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No payments have been logged yet for this quotation.
                              </td>
                            </tr>
                          ) : (
                            orderPayments.map((p, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 10px' }}>
                                  <input 
                                    type="date"
                                    className="form-control"
                                    style={{ height: '30px', fontSize: '12px', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                    value={p.date || ''}
                                    onChange={e => {
                                      const newP = [...orderPayments];
                                      newP[idx].date = e.target.value;
                                      setOrderPayments(newP);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <select 
                                    className="form-control"
                                    style={{ height: '30px', fontSize: '12px', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                                    value={p.type || 'Deposit Payment'}
                                    onChange={e => {
                                      const newP = [...orderPayments];
                                      newP[idx].type = e.target.value;
                                      setOrderPayments(newP);
                                    }}
                                  >
                                    <option value="Deposit Payment">Deposit Payment</option>
                                    <option value="Balance Payment">Balance Payment</option>
                                    <option value="Interim Payment">Interim Payment</option>
                                  </select>
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <input 
                                    type="text"
                                    placeholder="e.g. Deposit Payment EFT"
                                    className="form-control"
                                    style={{ height: '30px', fontSize: '12px', padding: '4px 8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: '100%' }}
                                    value={p.reference || ''}
                                    onChange={e => {
                                      const newP = [...orderPayments];
                                      newP[idx].reference = e.target.value;
                                      setOrderPayments(newP);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <input 
                                    type="number"
                                    className="form-control"
                                    style={{ height: '30px', fontSize: '12px', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: '110px', textAlign: 'right' }}
                                    value={p.amount || ''}
                                    onChange={e => {
                                      const newP = [...orderPayments];
                                      newP[idx].amount = Math.max(0, Number(e.target.value) || 0);
                                      setOrderPayments(newP);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <button 
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    style={{ color: 'var(--text-danger)' }}
                                    onClick={() => {
                                      if (confirm('Delete this payment record?')) {
                                        const newP = orderPayments.filter((_, i) => i !== idx);
                                        setOrderPayments(newP);
                                      }
                                    }}
                                  >
                                    Delete ✕
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <button 
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ border: '1px dashed var(--border)', marginTop: '15px', color: 'var(--text-info)' }}
                      onClick={() => setOrderPayments(prev => [...prev, { date: new Date().toISOString().split('T')[0], type: 'Deposit Payment', amount: 0, reference: '' }])}
                    >
                      + Add New Payment Entry
                    </button>
                  </div>
                </div>

                {/* Right Side: Payment Status Vitals Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {(() => {
                    const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost) || 0)), 0);
                    const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)), 0);
                    const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
                    const vatAmount = discountedRetail * 0.15;
                    const finalTotalInclVat = discountedRetail * 1.15;
                    const balanceOutstanding = Math.max(0, finalTotalInclVat - orderPaidAmount);
                    const depositRequired = finalTotalInclVat * 0.5; // 50% deposit
                    const depositCleared = orderPaidAmount >= depositRequired;

                    return (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Payment Vitals & Balances
                        </h4>

                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Quotation Value (Ex VAT):</span>
                          <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-primary)', marginTop: '2px' }}>
                            R {Math.round(discountedRetail).toLocaleString()}
                          </strong>
                        </div>

                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Gross Value (Incl VAT):</span>
                          <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-primary)', marginTop: '2px' }}>
                            R {Math.round(finalTotalInclVat).toLocaleString()}
                          </strong>
                        </div>

                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Paid to Date:</span>
                          <strong style={{ display: 'block', fontSize: '18px', color: 'var(--text-success)', marginTop: '2px' }}>
                            R {Math.round(orderPaidAmount).toLocaleString()}
                          </strong>
                        </div>

                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Outstanding Balance:</span>
                          <strong style={{ display: 'block', fontSize: '18px', color: balanceOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-muted)', marginTop: '2px' }}>
                            R {Math.round(balanceOutstanding).toLocaleString()}
                          </strong>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%', 
                            background: depositCleared ? 'var(--text-success)' : 'var(--text-warning)' 
                          }}></div>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 600, display: 'block' }}>50% Deposit Status</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                              {depositCleared ? 'Cleared ✓' : `Requires R ${Math.round(Math.max(0, depositRequired - orderPaidAmount)).toLocaleString()} more`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {workspaceSubTab === 'logistics' && (
              /* SUB-TAB 4: DELIVERY LOGISTICS & PACKING LISTS REFERENCE VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-info)' }}>
                        📦 Logistics Documents & Waybills
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Packing Lists and Delivery Notes issued for this quotation order.</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => navigate('/logistics', { state: { filterOrderId: selectedOrderId } })}
                    >
                      <Truck size={14} /> Open Logistics Dashboard
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px' }}>Document ID</th>
                          <th style={{ padding: '10px 12px' }}>Document Type</th>
                          <th style={{ padding: '10px 12px' }}>Date Issued</th>
                          <th style={{ padding: '10px 12px' }}>Items Count</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!activeOrderObject?.packingLists?.length && !activeOrderObject?.deliveryNotes?.length) ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No packing lists or delivery notes have been generated for this order yet. Go to Logistics to draft one.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {/* Render Packing Lists */}
                            {(activeOrderObject?.packingLists || []).map((pl, idx) => (
                              <tr key={`pl-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace' }}>{pl.id}</td>
                                <td style={{ padding: '10px 12px' }}>📋 Packing List / Box Label</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{pl.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(pl.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}><span className="badge b-info">Issued</span></td>
                              </tr>
                            ))}
                            {/* Render Delivery Notes */}
                            {(activeOrderObject?.deliveryNotes || []).map((dn, idx) => (
                              <tr key={`dn-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace' }}>{dn.id}</td>
                                <td style={{ padding: '10px 12px' }}>🚚 Delivery Note (Waybill)</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{dn.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(dn.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span className="badge b-success">Delivered</span>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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

      {/* LINK/UNLINK SHIFT PROJECT OR CLIENT MODAL */}
      {linkModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Link / Shift: {linkModalItem.id}</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setLinkModalItem(null)}>✕</button>
            </div>
            
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Project</label>
                <select 
                  className="form-control" 
                  value={linkProjectKey} 
                  onChange={e => {
                    const nextKey = e.target.value;
                    setLinkProjectKey(nextKey);
                    if (nextKey) {
                      const proj = projects[nextKey];
                      if (proj && proj.client) {
                        setLinkClient(proj.client);
                      }
                    }
                  }}
                >
                  <option value="">-- Client Direct / No Project --</option>
                  {Object.values(projects).filter(p => p.projectType !== 'Client-Direct').map(p => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Client (Contact)</label>
                <select 
                  className="form-control" 
                  value={linkClient} 
                  onChange={e => setLinkClient(e.target.value)}
                  disabled={!!linkProjectKey}
                >
                  <option value="">-- Select Client --</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.company || 'Private'})</option>
                  ))}
                </select>
                {linkProjectKey && (
                  <span style={{ fontSize: '10px', color: 'var(--text-info)', marginTop: '4px', display: 'block' }}>
                    🔒 Client locked to project client: <strong>{linkClient}</strong>
                  </span>
                )}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Linking Note:</strong> Changing links shifts this document. If unlinked from a project, it will be catalogued directly under the client's direct order portfolio.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setLinkModalItem(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const targetClient = contacts.find(c => c.name === linkClient) || {};
                  const oldProjectKey = linkModalItem.projectKey;
                  
                  // Compute target project key
                  let newProjectKey = linkProjectKey;
                  if (!newProjectKey) {
                    // Client direct - No Project
                    if (!linkClient) {
                      alert('Please select a client to link to if unlinking from a project.');
                      return;
                    }
                    newProjectKey = `client-${linkClient.toLowerCase().trim().replace(/\s+/g, '-')}`;
                  }
                  
                  moveOrder(
                    linkModalItem.id,
                    oldProjectKey,
                    newProjectKey,
                    linkClient,
                    targetClient.company || '',
                    targetClient.phone || '',
                    targetClient.email || ''
                  );
                  
                  setLinkModalItem(null);
                  alert(`Successfully shifted order ${linkModalItem.id}!`);
                }}
              >
                Save & Link Document
              </button>
            </div>
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

      {cancelModalItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', borderRadius: '12px', width: '450px', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Order Attrition</h3>
              <button className="modal-close" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }} onClick={() => setCancelModalItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                <strong>Post-Mortem Policy:</strong> Before marking this order as Cancelled, you must log the exact friction reason. This data feeds directly into our Attrition Analytics to help leadership retain key partnerships.
              </div>
              
              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Client Name</label>
                <input className="form-control" readOnly style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }} value={cancelModalItem.clientName || '—'} />
              </div>

              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Attrition Primary Reason</label>
                <select className="form-control" style={{ width: '100%' }} value={lossReason} onChange={e => setLossReason(e.target.value)}>
                  <option value="Price">Price Resistance / Budget caps</option>
                  <option value="PM friction">Project Manager friction / Handoff delays</option>
                  <option value="Competitor">Competitor (cheaper/local packaging)</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="form-row" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Detailed Post-Mortem Notes</label>
                <textarea 
                  className="form-control" 
                  rows={4} 
                  required
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="Log detail: Why are we losing them? What could we have done differently?"
                  value={lossNotes}
                  onChange={e => setLossNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setCancelModalItem(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={!lossNotes.trim()}
                style={{ padding: '6px 12px', fontSize: '12px', background: '#ef4444', borderColor: '#ef4444', color: 'white', cursor: 'pointer' }}
                onClick={() => {
                  const { orderId, projectKey, clientName } = cancelModalItem;
                  
                  // 1. Update the order status to Cancelled in the specific project
                  const project = projects[projectKey];
                  if (project) {
                    const updatedOrders = (project.orders || []).map(o => {
                      if (o.id === orderId) {
                        return { ...o, status: 'Cancelled' };
                      }
                      return o;
                    });
                    updateProject(projectKey, 'orders', updatedOrders);
                  }

                  // 2. Resolve or log attrition
                  const contact = (contacts || []).find(c => c.name === clientName);
                  const clientId = contact ? contact.id : Date.now();
                  logAttrition(clientId, clientName, lossReason, lossNotes);

                  // 3. Mark client contact as Inactive (Lost)
                  setContacts(prev => prev.map(c => {
                    if (c.name === clientName) {
                      return { 
                        ...c, 
                        status: 'Inactive', 
                        lastContactDate: '2026-05-19', 
                        lastContactSummary: `Post-Mortem: Order ${orderId} cancelled due to ${lossReason}` 
                      };
                    }
                    return c;
                  }));
                  
                  // 4. Update the orderStatus state if workspace is currently open for it
                  if (selectedOrderId === orderId) {
                    setOrderStatus('Cancelled');
                  }
                  
                  setCancelModalItem(null);
                  setLossNotes('');
                }}
              >
                Log Post-Mortem & Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
