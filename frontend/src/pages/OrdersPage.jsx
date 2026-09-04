import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResizableTable } from '../components/common/ResizableTable';
import CollapsibleAlertSidebar from '../components/common/CollapsibleAlertSidebar';
import TakeoffSpecEngine from '../components/TakeoffSpecEngine';
import { API_BASE } from '../api_config';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Calendar,
  Download,
  Settings,
  GripVertical,
  CreditCard
} from 'lucide-react';

const PHI_ADVISORIES = {
  orders: {
    author: "Eliyahu M. Goldratt (The Goal)",
    quote: "An hour lost at a bottleneck is an hour lost for the entire system. An hour saved at a non-bottleneck is a mirage.",
    advice: "Constraint-Driven Buffering. Ensure your specification spreadsheet highlights custom selections (green) vs off-the-shelf stock items (blue). Prioritize expediting custom selections, as their procurement lead time represents the primary critical path bottleneck."
  }
};

const statusColor = { 
  Complete: 'b-success', 
  Ongoing: 'b-info', 
  Pending: 'b-warning', 
  Draft: 'b-default',
  Cancelled: 'b-danger'
};

// Vector image mock rendering for fittings
const ProductImageRenderer = ({ type, color = '#1a202c', width = "100%", height = 240 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 400 300" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <line x1="40" y1="80" x2="360" y2="80" stroke="var(--border-strong)" strokeWidth="3" />
      <polygon points="200,80 80,260 320,260" fill="url(#pendantBeam)" opacity="0.3" />
      <rect x="150" y="50" width="100" height="30" fill="#2d3748" rx="2" />
      <path d="M 140 80 Q 200 85 260 80" fill="none" stroke="#718096" strokeWidth="2" />
      <ellipse cx="200" cy="80" rx="45" ry="10" fill="#1a202c" stroke="#4a5568" strokeWidth="1" />
      <ellipse cx="200" cy="80" rx="35" ry="7" fill="#edf2f7" />
      <circle cx="200" cy="80" r="10" fill="#fff" filter="blur(3px)" />
      <text x="200" y="275" fill="var(--text-tertiary)" fontSize="10.5" fontWeight="600" textAnchor="middle">{type ? type.toUpperCase() : 'FITTING'}</text>
      <defs>
        <linearGradient id="pendantBeam" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="25%" stopColor="#fefcbf" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fefcbf" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Vector CAD Wireframe Downlight Blueprint Component
const ProductCADRenderer = ({ cutout = 'Ø76mm' }) => {
  return (
    <svg width="100%" height={240} viewBox="0 0 240 240" style={{ border: '1.5px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
      <line x1="30" y1="0" x2="30" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="120" y1="0" x2="120" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="210" y1="0" x2="210" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="0" y1="80" x2="240" y2="80" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="0" y1="160" x2="240" y2="160" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="20" y1="100" x2="220" y2="100" stroke="var(--text-info)" strokeWidth="1.5" />
      <rect x="70" y="60" width="100" height="40" fill="none" stroke="var(--text-info)" strokeWidth="1.5" />
      <path d="M 60 100 L 180 100" stroke="var(--text-info)" strokeWidth="2" />
      <ellipse cx="120" cy="100" rx="50" ry="10" fill="none" stroke="var(--text-info)" strokeWidth="1" />
      <circle cx="120" cy="100" r="12" fill="none" stroke="var(--text-tertiary)" strokeWidth="0.75" />
      <path d="M 70 80 Q 50 60 45 70" fill="none" stroke="var(--text-info)" strokeWidth="1" />
      <path d="M 170 80 Q 190 60 195 70" fill="none" stroke="var(--text-info)" strokeWidth="1" />
      <line x1="70" y1="130" x2="170" y2="130" stroke="var(--text-warning)" strokeWidth="1" />
      <line x1="70" y1="125" x2="70" y2="135" stroke="var(--text-warning)" strokeWidth="1" />
      <line x1="170" y1="125" x2="170" y2="135" stroke="var(--text-warning)" strokeWidth="1" />
      <text x="120" y="145" fill="var(--text-warning)" fontSize="10" fontWeight="600" textAnchor="middle">Cut-Out: {cutout}</text>
      <line x1="200" y1="60" x2="200" y2="100" stroke="var(--text-warning)" strokeWidth="1" />
      <line x1="195" y1="60" x2="205" y2="60" stroke="var(--text-warning)" strokeWidth="1" />
      <line x1="195" y1="100" x2="205" y2="100" stroke="var(--text-warning)" strokeWidth="1" />
      <text x="212" y="85" fill="var(--text-warning)" fontSize="10" fontWeight="600" textAnchor="start">40 mm</text>
    </svg>
  );
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
  const [apiProducts, setApiProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Sync internal search value with prop
  useEffect(() => {
    setSearchVal(value || '');
  }, [value]);

  // Fetch options dynamically from backend API /api/products/
  useEffect(() => {
    if (!isOpen) return;
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const query = searchVal.trim();
        const url = `${API_BASE}/api/products/?limit=50${query ? `&q=${encodeURIComponent(query)}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.items || []);
          const mapped = items.map(p => ({
            code: p.sku,
            description: p.client_description || p.name || '',
            client_description: p.client_description || '',
            brand: p.brand || '',
            dimming: p.dimming_protocol || p.dimmable || 'Non-dim',
            unitCost: p.cost_price || 0,
            unitRetail: p.retail_price || p.trade_price || 0,
            stockQty: p.stock_level || 0,
            eta: p.lead_time || '4 weeks'
          }));
          setApiProducts(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch product code options', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchOptions, 250);
    return () => clearTimeout(timer);
  }, [searchVal, isOpen]);

  const filteredList = useMemo(() => {
    const list = apiProducts.length > 0 ? apiProducts : PRODUCT_CATALOG;
    const query = searchVal.toLowerCase();
    if (!query) return list;
    return list.filter(prod =>
      (prod.code || '').toLowerCase().includes(query) ||
      (prod.description || '').toLowerCase().includes(query)
    );
  }, [apiProducts, searchVal]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
        e.stopPropagation();
      } else {
        setHighlightedIndex(prev => Math.min(filteredList.length - 1, prev + 1));
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
      if (isOpen && highlightedIndex >= 0 && filteredList[highlightedIndex]) {
        e.preventDefault();
        e.stopPropagation();
        const selected = filteredList[highlightedIndex];
        onSelect(selected);
        setSearchVal(selected.code);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      e.preventDefault();
      e.stopPropagation();
    } else {
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
          e.preventDefault();
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
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-primary, #ffffff)',
          border: '1px solid var(--border-strong, #ccc)',
          borderRadius: '6px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
          maxHeight: '260px',
          overflowY: 'auto',
          zIndex: 1000,
          textAlign: 'left'
        }}>
          {loading && (
            <div style={{ padding: '8px 12px', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
              Loading matching products...
            </div>
          )}
          {!loading && filteredList.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
              No matching products found
            </div>
          )}
          {!loading && filteredList.map((prod, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={prod.code + idx}
                onMouseDown={() => {
                  onSelect(prod);
                  setSearchVal(prod.code);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  backgroundColor: isHighlighted ? 'var(--bg-info, rgba(23, 100, 230, 0.15))' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  color: isHighlighted ? 'var(--text-info, #1764e6)' : 'var(--text-primary)',
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
  const { 
    projects, updateProject, contacts, setContacts, logAttrition, moveOrder, getModuleName, projectManagers, logActivity,
    refreshProjects, bulkDeleteOrders, bulkRelinkOrders, bulkRenameOrders 
  } = useStore();
  const { isAdmin } = useAuth();

  // Bulk Selection States
  const [selectedPoNumbers, setSelectedPoNumbers] = useState(new Set());

  const toggleSelectPo = (po, e) => {
    e.stopPropagation();
    setSelectedPoNumbers(prev => {
      const next = new Set(prev);
      if (next.has(po)) {
        next.delete(po);
      } else {
        next.add(po);
      }
      return next;
    });
  };

  const toggleSelectAllPos = (ordersList) => {
    setSelectedPoNumbers(prev => {
      const allSelected = ordersList.length > 0 && ordersList.every(o => prev.has(o.id));
      const next = new Set(prev);
      if (allSelected) {
        ordersList.forEach(o => next.delete(o.id));
      } else {
        ordersList.forEach(o => next.add(o.id));
      }
      return next;
    });
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedPoNumbers.size === 0) return;
    if (window.confirm(`Are you sure you want to delete the ${selectedPoNumbers.size} selected orders and all their items? This cannot be undone.`)) {
      await bulkDeleteOrders(Array.from(selectedPoNumbers));
      setSelectedPoNumbers(new Set());
    }
  };

  const handleBulkRelinkOrders = async (targetProjectKey) => {
    if (selectedPoNumbers.size === 0 || !targetProjectKey) return;
    const targetProject = Object.values(projects).find(p => p.key === targetProjectKey);
    if (!targetProject) return;
    if (window.confirm(`Are you sure you want to shift/re-link the ${selectedPoNumbers.size} selected orders to project '${targetProject.name}'?`)) {
      await bulkRelinkOrders(Array.from(selectedPoNumbers), targetProjectKey);
      setSelectedPoNumbers(new Set());
    }
  };

  const handleBulkRenameOrders = async () => {
    if (selectedPoNumbers.size === 0) return;
    const newName = window.prompt("Enter a new Quote Name for all selected orders:");
    if (newName && newName.trim()) {
      await bulkRenameOrders(Array.from(selectedPoNumbers), newName.trim());
      setSelectedPoNumbers(new Set());
    }
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_orders') === 'true';
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Attrition/Cancellation modal state
  const [cancelModalItem, setCancelModalItem] = useState(null); // { orderId, projectKey, clientName }
  const [lossReason, setLossReason] = useState('Price');
  const [lossNotes, setLossNotes] = useState('');

  const { widths, onResizeStart } = useResizableTable('orders_boq_spreadsheet_v2', {
    qty: 60,
    oneOneCode: 100,
    type: 80,
    itemType: 90,
    code: 165,
    description: 250,
    floor: 90,
    area: 120,
    dimming: 95,
    brand: 90,
    supplier: 100,
    cost: 95,
    retail: 95,
    totalRetail: 100,
    margin: 60,
    stock: 90,
    actions: 70
  }, ['qty', 'oneOneCode', 'type', 'itemType', 'code', 'description', 'floor', 'area', 'dimming', 'brand', 'supplier', 'cost', 'retail', 'totalRetail', 'margin', 'stock', 'actions']);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Temporary state for the active order items in the spreadsheet workspace
  const [activeOrderItems, setActiveOrderItems] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderDepositPercent, setOrderDepositPercent] = useState(null);
  const [orderSupplier, setSupplier] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderEta, setOrderEta] = useState('');
  const [orderPaidAmount, setOrderPaidAmount] = useState(0);
  const [orderPayments, setOrderPayments] = useState([]);
  const [takeoffData, setTakeoffData] = useState({ countUpRows: [], specifications: {} });
  const [showAreaBreakdown, setShowAreaBreakdown] = useState(true);
  
  // Link/Unlink modal state
  const [linkModalItem, setLinkModalItem] = useState(null);
  const [linkClient, setLinkClient] = useState('');
  const [linkProjectKey, setLinkProjectKey] = useState('');

  // Union of hardcoded contacts and unique client names from database projects
  const combinedContacts = useMemo(() => {
    const projectClients = new Set();
    Object.values(projects || {}).forEach(p => {
      if (p.client && p.client.trim()) {
        projectClients.add(p.client.trim());
      }
    });

    const list = [...(contacts || [])];
    projectClients.forEach(clientName => {
      const exists = list.some(c => (c.name || '').toLowerCase() === clientName.toLowerCase());
      if (!exists) {
        list.push({
          id: `dyn-${clientName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          name: clientName,
          company: clientName,
          type: 'Private',
          email: '',
          phone: '',
          status: 'Active'
        });
      }
    });
    return list;
  }, [contacts, projects]);

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
  const [pfNumber, setPfNumber] = useState('');
  const [pfDate, setPfDate] = useState('');
  const [fileSource, setFileSource] = useState('');
  const [projectClass, setProjectClass] = useState('');
  const [quotationSentDate, setQuotationSentDate] = useState('');
  const [division, setDivision] = useState('');
  const [quoteName, setQuoteName] = useState('');

  // Search & Filter state for the ledger list
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [pmFilter, setPmFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Sorting States
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

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
  const [creditsSectionOpen, setCreditsSectionOpen] = useState(true);
  const [interactiveCreditsOpen, setInteractiveCreditsOpen] = useState(true);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [selectedItemToCredit, setSelectedItemToCredit] = useState('');
  const [qtyToCredit, setQtyToCredit] = useState(1);
  const [creditSourceType, setCreditSourceType] = useState('existing'); // 'existing' | 'custom'
  const [customCreditForm, setCustomCreditForm] = useState({
    code: '',
    description: '',
    brand: '',
    supplier: '',
    floor: '',
    area: '',
    dimming: 'Non-dim',
    unitCost: 0,
    unitRetail: 0,
    qty: 1
  });
  const [selectedDocType, setSelectedDocType] = useState('quote'); // 'quote' | 'boq_doc' | 'invoice' | 'schedule' | 'statement'
  const [checkedDocTypes, setCheckedDocTypes] = useState(['quote']);
  const [showRegForm, setShowRegForm] = useState(true);
  
  // Product Catalogue Tab & Filter States
  const [sidePanelTab, setSidePanelTab] = useState('breakdown'); // 'breakdown' | 'catalog'
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null);

  // Fetch products dynamically when catalogue search or category changes
  useEffect(() => {
    if (sidePanelTab !== 'catalog') return;
    
    const fetchCatalogProducts = async () => {
      setCatalogLoading(true);
      try {
        const queryParams = [];
        if (catalogSearch.trim()) {
          queryParams.push(`q=${encodeURIComponent(catalogSearch.trim())}`);
        }
        if (catalogCategory && catalogCategory !== 'All') {
          queryParams.push(`category=${encodeURIComponent(catalogCategory)}`);
        }
        const urlStr = `${API_BASE}/api/products/${queryParams.length ? '?' + queryParams.join('&') : ''}`;
        const res = await fetch(urlStr);
        if (res.ok) {
          const data = await res.json();
          const itemsList = Array.isArray(data) ? data : (data.items || []);
          setCatalogProducts(itemsList);
        }
      } catch (err) {
        console.error("Failed to load catalog products", err);
      } finally {
        setCatalogLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchCatalogProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [sidePanelTab, catalogSearch, catalogCategory]);

  const activeDocType = workspaceSubTab === 'boq' ? 'quote' : selectedDocType;
  const [customTerms, setCustomTerms] = useState('Payment: 70% deposit to initiate order, remaining balance prior to delivery/dispatch. Validity: 30 days from date of issue.');

  // Pricing consistency assistant modal state
  const [pendingPriceEdit, setPendingPriceEdit] = useState(null); // { itemId, field, value, code }

  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [activeEngineMode, setActiveEngineMode] = useState('word');
  const [liveCustomDocs, setLiveCustomDocs] = useState({});

  useEffect(() => {
    fetch(`${API_BASE}/admin/configs/MASTER_TEMPLATE_ORDER`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.config_json && data.config_json.templates) {
          setLiveCustomDocs(data.config_json.templates);
        } else {
          fetch(`${API_BASE}/admin/configs/CUSTOM_DOC_TYPES`)
            .then(res => res.ok ? res.json() : null)
            .then(legacy => {
              if (legacy && legacy.config_json) setLiveCustomDocs(legacy.config_json);
            }).catch(() => {});
        }
      })
      .catch(err => console.error("Error loading master template order in Orders:", err));
  }, []);

  // Dynamically fetch the selected document's active template engine mode configuration
  useEffect(() => {
    const fetchActiveEngineMode = async () => {
      let docType = activeDocType === 'boq_doc' ? 'BOQ' : activeDocType.toUpperCase();
      try {
        const res = await fetch(`${API_BASE}/admin/configs/${docType}`);
        if (res.ok) {
          const data = await res.json();
          if (data.config_json && data.config_json.engine_mode) {
            setActiveEngineMode(data.config_json.engine_mode);
          } else {
            setActiveEngineMode('excel');
          }
        } else {
          setActiveEngineMode('excel');
        }
      } catch (err) {
        console.error("Error fetching active template engine mode:", err);
      }
    };
    fetchActiveEngineMode();
  }, [activeDocType]);


  const handleDownloadXlsxTemplate = async () => {
    let docType = activeDocType === 'boq_doc' ? 'BOQ' : activeDocType.toUpperCase();
    try {
      const res = await fetch(`${API_BASE}/admin/templates/${docType}/xlsx/download`);
      if (!res.ok) throw new Error("Failed to download Excel template.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType.toLowerCase()}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert(`Error downloading Excel template: ${err.message}`);
    }
  };

  const handleUploadXlsxTemplate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.lowerCase().endsWith('.xlsx')) {
      alert("Only .xlsx files are allowed.");
      return;
    }
    let docType = activeDocType === 'boq_doc' ? 'BOQ' : activeDocType.toUpperCase();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/admin/templates/${docType}/xlsx/upload`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed.");
      }
      alert("Excel template uploaded successfully!");
    } catch (err) {
      alert(`Error uploading Excel template: ${err.message}`);
    }
  };

  const buildOrderDocumentTokens = () => {
    const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
    const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
    const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
    const vatAmount = discountedRetail * 0.15;
    const finalTotalInclVat = discountedRetail * 1.15;

    const finalItems = activeOrderItems.map((item, idx) => ({
      index: (idx + 1).toString(),
      isSpacer: !!(item.isSpacer || item.type === 'SPACER'),
      code: item.code || '',
      oneOneCode: item.oneOneCode || item.one_one_code || '',
      type: item.type || '',
      description: item.isSpacer || item.type === 'SPACER' ? '' : (item.description || item.client_description || item.clientDescription || ''),
      clientDescription: item.isSpacer || item.type === 'SPACER' ? '' : (item.clientDescription || item.client_description || item.description || ''),
      client_description: item.isSpacer || item.type === 'SPACER' ? '' : (item.client_description || item.clientDescription || item.description || ''),
      qty: item.isSpacer || item.type === 'SPACER' ? '' : (item.qty || 0).toString(),
      brand: item.brand || '',
      retail: item.isSpacer || item.type === 'SPACER' ? '' : `R ${(Number(item.unitRetail || item.unit_retail) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalRetail: item.isSpacer || item.type === 'SPACER' ? '' : `R ${((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      floor: item.floor || '',
      area: item.area || '',
      dimming: item.dimming || 'Non-dim',
      unitCost: item.isSpacer || item.type === 'SPACER' ? '' : `R ${(Number(item.unitCost || item.unit_cost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      stockStatus: item.stockStatus || item.stock_status || 'In Stock',
      eta: item.eta || '4 weeks'
    }));

    // Resolve Representative & PM Info
    const resolvedRep = oneOneRep || pmName || 'Martin Döller';
    const matchedRepInfo = (projectManagers || []).find(pm => {
      if (!pm || !pm.name) return false;
      const pmLower = pm.name.toLowerCase();
      const repLower = resolvedRep.toLowerCase();
      return pmLower === repLower || pmLower.includes(repLower) || repLower.includes(pmLower);
    });

    const repPhone = pmPhone || (matchedRepInfo ? matchedRepInfo.phone : '078 452 5643');
    const repEmail = pmEmail || (matchedRepInfo ? matchedRepInfo.email : `${resolvedRep.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world`);

    // Dynamic Deposit calculations:
    // Default is 70%, but if total gross value is under R10,000 it is 100%
    const defaultDepositRate = (finalTotalInclVat < 10000 && finalTotalInclVat > 0) ? 100 : 70;
    const effectiveDepositPercent = orderDepositPercent !== null && orderDepositPercent !== undefined 
      ? Number(orderDepositPercent) 
      : defaultDepositRate;

    const depositVal = finalTotalInclVat * (effectiveDepositPercent / 100);
    const balanceVal = Math.max(0, finalTotalInclVat - depositVal);
    const depositFormatted = `R ${depositVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const balanceFormatted = `R ${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const depositFormatted50 = `R ${(finalTotalInclVat * 0.50).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const depositFormatted70 = `R ${(finalTotalInclVat * 0.70).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const depositFormatted100 = `R ${(finalTotalInclVat * 1.00).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totalPaidNum = Number(orderPaidAmount) || 0;
    const balanceOutstandingNum = Math.max(0, finalTotalInclVat - totalPaidNum);

    return {
      PROJECT_NAME: projectFullName || 'Private Client Project',
      CLIENT_NAME: clientContact || clientCompany || 'Client Name',
      DATE: orderDate || new Date().toLocaleDateString('en-GB'),
      DOCUMENT_NUMBER: selectedOrderId || 'Q-2026-XXX',
      PROPOSAL_NUMBER: selectedOrderId || 'Q-2026-XXX',
      ORDER_NUMBER: selectedOrderId || 'Q-2026-XXX',
      FEE_NAME: quoteName || `Order ${selectedOrderId || 'Q-2026-XXX'}`,
      ORDER_NAME: quoteName || selectedOrderId || '',
      QUOTE_NAME: quoteName || '',
      ORDER_STATUS: orderStatus || 'Draft',
      
      CLIENT_COMPANY: clientCompany || 'Private Client',
      CLIENT_CONTACT_PERSON: clientContact || clientCompany || 'Client Name',
      CLIENT_EMAIL: clientEmail || '',
      CLIENT_PHONE: clientPhone || '',
      CLIENT_VAT: '',
      DELIVERY_ADDRESS: deliveryAddress || '',
      DELIVERY_DETAILS: deliveryAddress || '',
      BILLING_DETAILS: billingDetails || '',
      
      ONEONE_REP: resolvedRep,
      ONEONE_REP_PHONE: repPhone,
      ONEONE_REP_EMAIL: repEmail,
      REP_NAME: resolvedRep,
      REP_PHONE: repPhone,
      REP_EMAIL: repEmail,
      
      PM_NAME: pmName || resolvedRep,
      PM_EMAIL: repEmail,
      PM_PHONE: repPhone,
      PM_PPHONE: repPhone,
      PROJECT_PM: pmName || resolvedRep,
      PROJECT_SIZE: projectSize || '—',
      PROJECT_TIER: projectTier || 'Signature',
      
      SUBTOTAL: `R ${totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      DISCOUNT: `R ${(totalRetail - discountedRetail).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      DISCOUNT_AMOUNT: `R ${(totalRetail - discountedRetail).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      DISCOUNT_PERCENT: `${orderDiscount || 0}%`,
      DISCOUNT_PERCENTAGE: `${orderDiscount || 0}%`,
      orderDiscount: Number(orderDiscount) || 0,
      VAT_AMOUNT: `R ${vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      TOTAL_RETAIL: `R ${finalTotalInclVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      TOTAL_COST: `R ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      MARGIN_PERCENT: totalRetail > 0 ? `${Math.round(((totalRetail - totalCost) / totalRetail) * 100)}%` : '0%',
      
      DEPOSIT: depositFormatted,
      DEPOSIT_AMOUNT: depositFormatted,
      DEPOSIT_REQUIRED: depositFormatted,
      DEPOSIT_VALUE: depositFormatted,
      DEPOSIT_PERCENT: `${effectiveDepositPercent}%`,
      DEPOSIT_PERCENTAGE: `${effectiveDepositPercent}%`,
      DEPOSIT_RATE: `${effectiveDepositPercent}%`,
      DEPOSIT_50: depositFormatted50,
      DEPOSIT_70: depositFormatted70,
      DEPOSIT_100: depositFormatted100,
      
      BALANCE: balanceFormatted,
      BALANCE_DUE: balanceFormatted,
      BALANCE_OUTSTANDING: `R ${balanceOutstandingNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      OUTSTANDING: `R ${balanceOutstandingNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      OUTSTANDING_BALANCE: `R ${balanceOutstandingNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      BALANCE_REMAINING: `R ${balanceOutstandingNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

      TOTAL_PAID: `R ${totalPaidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      PAID: `R ${totalPaidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      AMOUNT_PAID: `R ${totalPaidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      VALUE_PAID: `R ${totalPaidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      TOTAL_AMOUNT_PAID: `R ${totalPaidNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      
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
          if (item.isSpacer || item.type === 'SPACER') return;
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
  };

  const handleExportXlsxTemplate = async () => {
    let docType = activeDocType === 'boq_doc' ? 'BOQ' : activeDocType.toUpperCase();
    setExportingXlsx(true);
    if (logActivity) {
      logActivity('document_export', `Exported ${docType} Excel-rendered PDF for order ${selectedOrderId}`);
    }
    try {
      const tokens = buildOrderDocumentTokens();

      let res;
      let targetDocTypes = checkedDocTypes.length > 0 
        ? checkedDocTypes.map(d => d === 'boq_doc' ? 'BOQ' : d === 'quote' ? 'QUOTATION' : d.toUpperCase())
        : [docType];

      if (targetDocTypes.length > 1) {
        res = await fetch(`${API_BASE}/admin/generate-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_types: targetDocTypes,
            data: tokens
          })
        });
      } else {
        const singleDoc = targetDocTypes[0] || docType;
        res = await fetch(`${API_BASE}/admin/generate/${singleDoc}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokens)
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate document from Excel template.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = targetDocTypes.length > 1 ? `Combined_Documents_${selectedOrderId}.pdf` : `${targetDocTypes[0].toLowerCase()}_${selectedOrderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert(`Error generating spreadsheet PDF: ${err.message}`);
    } finally {
      setExportingXlsx(false);
    }
  };

  const handleDownloadExcelFile = async () => {
    let docType = activeDocType === 'boq_doc' ? 'BOQ' : activeDocType.toUpperCase();
    setExportingXlsx(true);
    if (logActivity) {
      logActivity('document_export', `Exported ${docType} Excel file for order ${selectedOrderId}`);
    }
    try {
      const tokens = buildOrderDocumentTokens();

      const res = await fetch(`${API_BASE}/admin/generate/${docType}?format=xlsx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to generate Excel spreadsheet.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType.toLowerCase()}_${selectedOrderId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert(`Error generating Excel spreadsheet: ${err.message}`);
    } finally {
      setExportingXlsx(false);
    }
  };

  const [livePreviewUrl, setLivePreviewUrl] = useState(null);
  const [loadingLivePreview, setLoadingLivePreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const showIframe = !!livePreviewUrl;

  // Helper to roll up items for the summarized Quotation
  const groupItemsForQuotation = (items) => {
    const grouped = {};
    (items || []).forEach(item => {
      if (item.isSpacer || item.type === 'SPACER') return;
      const key = `${item.code || item.description || 'Custom'}_${item.unitRetail || 0}`;
      if (!grouped[key]) {
        grouped[key] = {
          code: item.code || '',
          description: item.description || '',
          qty: 0,
          unitRetail: Number(item.unitRetail) || 0,
          totalRetail: 0,
          brand: item.brand || '',
          eta: item.eta || '4 weeks'
        };
      }
      const q = Number(item.qty) || 0;
      grouped[key].qty += q;
      grouped[key].totalRetail += (q * (Number(item.unitRetail) || 0));
    });
    return Object.values(grouped).map(g => ({
      ...g,
      qty: g.qty.toString(),
      retail: `R ${g.unitRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalRetail: `R ${g.totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
  };

  const triggerLivePreviewCompile = async (targetTab, pageNum = 1) => {
    if (!selectedOrderId) {
      setLivePreviewUrl(null);
      return;
    }
    let docType = '';
    if (targetTab === 'quote') {
      docType = 'QUOTATION';
    } else if (targetTab === 'boq_doc') {
      docType = 'BOQ';
    } else if (targetTab === 'schedule') {
      docType = 'SCHEDULE';
    } else if (targetTab === 'deposit_invoice') {
      docType = 'DEPOSIT_INVOICE';
    } else if (targetTab === 'balance_invoice') {
      docType = 'BALANCE_INVOICE';
    } else if (targetTab === 'tax_invoice') {
      docType = 'TAX_INVOICE';
    } else if (targetTab === 'statement') {
      docType = 'PROGRESS_STATEMENT';
    } else if (targetTab) {
      docType = targetTab.toUpperCase();
    } else {
      setLivePreviewUrl(null);
      return;
    }

    setLoadingLivePreview(true);
    if (logActivity) {
      logActivity('document_generation', `Initiated preview compile of ${docType} for order ${selectedOrderId}`);
    }
    try {
      const tokens = buildOrderDocumentTokens();

      const res = await fetch(`${API_BASE}/admin/generate/${docType}?page=${pageNum}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`Preview compilation failed: ${errorData.detail || 'Status ' + res.status} ${errorData.trace || ''}`);
      }

      const blob = await res.blob();
      if (livePreviewUrl) {
        window.URL.revokeObjectURL(livePreviewUrl);
      }
      const url = window.URL.createObjectURL(blob);
      setLivePreviewUrl(url);
    } catch (err) {
      console.error("Failed to compile preview:", err);
      alert(`Preview compile error: ${err.message}`);
    } finally {
      setLoadingLivePreview(false);
    }
  };

  useEffect(() => {
    setPreviewPage(1);
  }, [workspaceSubTab, selectedDocType, selectedOrderId, activeOrderItems.length]);

  useEffect(() => {
    if (workspaceSubTab === 'doc_gen' && selectedDocType) {
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
    } else if (activeDocType === 'schedule') {
      docType = 'SCHEDULE';
    } else if (activeDocType === 'deposit_invoice') {
      docType = 'DEPOSIT_INVOICE';
    } else if (activeDocType === 'balance_invoice') {
      docType = 'BALANCE_INVOICE';
    } else if (activeDocType === 'tax_invoice') {
      docType = 'TAX_INVOICE';
    } else if (activeDocType === 'statement') {
      docType = 'PROGRESS_STATEMENT';
    } else if (activeDocType) {
      docType = activeDocType.toUpperCase();
    } else {
      alert(`${activeDocType} is not supported.`);
      return;
    }

    setExportingDocx(true);
    if (logActivity) {
      logActivity('document_export', `Exported ${docType} PDF for order ${selectedOrderId}`);
    }
    try {
      const tokens = buildOrderDocumentTokens();

      const res = await fetch(`${API_BASE}/admin/generate/${docType}?is_save_action=false`, {
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
    eta: 'TBD',
    quote_name: 'General Spec'
  });
  const [poProjectSearch, setPoProjectSearch] = useState("");
  const [linkProjectSearch, setLinkProjectSearch] = useState("");

  // Aggregate all orders/quotations from all projects in the store (Memoized to prevent recomputing on keystrokes)
  const allOrders = useMemo(() => {
    return Object.values(projects).flatMap(p => 
      (p.orders || []).map(o => {
        // Calculate progress percentages dynamically
        let totalQtyForProc = 0;
        let totalProcQty = 0;
        let totalQtyForInv = 0;
        let totalInvQty = 0;
        let totalQtyForDel = 0;
        let totalDelQty = 0;

        const itemsList = o.itemsList || [];
        itemsList.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
          const q = Number(item.qty) || 0;
          const isService = (item.itemType || item.item_type) === 'Service';
          
          // Simple mock defaults to calculate progress
          const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : 0;

          if (isService) {
            totalQtyForInv += q;
            totalInvQty += Number(invoiced) || 0;
            return;
          }

          totalQtyForProc += q;
          totalQtyForInv += q;
          totalQtyForDel += q;

          const received = item.receivedQty !== undefined ? item.receivedQty : 0;
          const delivered = item.deliveryQty !== undefined ? item.deliveryQty : 0;
          const stockStatus = item.stockStatus !== undefined ? item.stockStatus : '';

          totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
          totalInvQty += Number(invoiced) || 0;
          totalDelQty += Number(delivered) || 0;
        });

        const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
        const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
        const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

        // Standalone Payment Status calculation
        const totalPaidVal = Number(o.paid) || 0;
        const totalRetailVal = Number(o.value) || 0;
        const valueInclVat = totalRetailVal * 1.15;
        let paymentStatus = 'Unpaid';
        if (totalPaidVal > 0) {
          if (totalPaidVal >= valueInclVat - 1) { // 1 ZAR tolerance for rounding
            paymentStatus = 'Fully Paid';
          } else {
            paymentStatus = 'Partially Paid';
          }
        }

        // Dynamic Overhanging Order Status computation
        let computedStatus = o.status; 
        if (o.status !== 'Draft') {
          const isFullyPaid = paymentStatus === 'Fully Paid';
          if (totalPaidVal === 0 && procPct === 0 && delPct === 0) {
            computedStatus = 'Pending';
          } else if (procPct === 100 && invPct === 100 && delPct === 100 && isFullyPaid) {
            computedStatus = 'Complete';
          } else {
            computedStatus = 'Ongoing';
          }
        }

        const effectiveClient = (o.clientCompany || o.client_company || o.clientContact || o.client_contact || o.client || o.client_name || p.client || '').trim();
        return {
          ...o,
          projectKey: p.key,
          projectName: o.projectFullName || o.project_full_name || p.name,
          projectClient: effectiveClient || p.client,
          client: effectiveClient || p.client,
          clientCompany: o.clientCompany !== undefined ? o.clientCompany : (o.client_company !== undefined ? o.client_company : ''),
          clientContact: o.clientContact !== undefined ? o.clientContact : (o.client_contact !== undefined ? o.client_contact : ''),
          projectPm: o.pmName || o.pm_name || p.pm || p.pmName || '',
          paymentStatus,
          status: computedStatus
        };
      })
    );
  }, [projects]);

  // Memoized unique dropdown lists for instant O(1) filter rendering
  const projectOptions = useMemo(() => {
    const list = Array.from(new Set(allOrders.map(o => o.projectName).filter(Boolean))).sort();
    return list.map(projName => {
      const foundObj = allOrders.find(o => o.projectName === projName);
      return { key: foundObj?.projectKey || projName, name: projName };
    });
  }, [allOrders]);

  const clientOptions = useMemo(() => {
    return Array.from(new Set(allOrders.map(o => o.projectClient).filter(Boolean))).sort();
  }, [allOrders]);

  const pmOptions = useMemo(() => {
    return Array.from(new Set(allOrders.map(o => o.projectPm).filter(Boolean))).sort();
  }, [allOrders]);

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
  }, [location.state, allOrders]);

  // Filtered orders/quotations list for the ledger overview
  const isAnyFilterActive = searchQuery !== '' || filterStatus !== 'All' || projectFilterKey !== 'All' || clientFilter !== 'All' || pmFilter !== 'All' || paymentStatusFilter !== 'All' || !!startDate || !!endDate;

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setFilterStatus('All');
    setProjectFilterKey('All');
    setClientFilter('All');
    setPmFilter('All');
    setPaymentStatusFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const filteredOrders = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    return allOrders.filter(o => {
      const matchesSearch = !query ||
        (o.id || '').toLowerCase().includes(query) ||
        (o.quote_name || '').toLowerCase().includes(query) ||
        (o.projectName || '').toLowerCase().includes(query) ||
        (o.projectClient || '').toLowerCase().includes(query) ||
        (o.projectPm || '').toLowerCase().includes(query);
        
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchesProject = projectFilterKey === 'All' || o.projectKey === projectFilterKey || o.projectName === projectFilterKey;
      const matchesClient = clientFilter === 'All' || o.projectClient === clientFilter || o.client === clientFilter || o.clientCompany === clientFilter || o.clientContact === clientFilter;
      const matchesPm = pmFilter === 'All' || o.projectPm === pmFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'All' || o.paymentStatus === paymentStatusFilter;
      
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
      
      return matchesSearch && matchesStatus && matchesProject && matchesClient && matchesPm && matchesPaymentStatus && matchesDate;
    });
  }, [allOrders, debouncedSearchQuery, filterStatus, projectFilterKey, clientFilter, pmFilter, paymentStatusFilter, startDate, endDate]);

  // Sort Logic for All Columns in Orders Module
  const sortedOrders = useMemo(() => {
    if (!sortField) return filteredOrders;

    const getVal = (o, field) => {
      const cost = o.costValue || 0;
      const retail = o.value || 0;
      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
      const outstandingVal = o.outstanding || 0;

      switch (field) {
        case 'id':
          return (o.id || '').toLowerCase();
        case 'quote_name':
          return (o.quote_name || '').toLowerCase();
        case 'project':
          return (o.projectName || '').toLowerCase();
        case 'client':
          return (o.projectClient || '').toLowerCase();
        case 'supplier':
          return (o.supplier || '').toLowerCase();
        case 'items':
          return o.items || 0;
        case 'value':
          return retail;
        case 'paid':
          return o.paid || 0;
        case 'outstanding':
          return outstandingVal;
        case 'margin':
          return margin;
        case 'status':
          return (o.status || '').toLowerCase();
        case 'paymentStatus':
          return (o.paymentStatus || '').toLowerCase();
        default:
          return '';
      }
    };

    return [...filteredOrders].sort((a, b) => {
      const valA = getVal(a, sortField);
      const valB = getVal(b, sortField);

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.5 }} />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />
      : <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--text-info)' }} />;
  };

  // Dynamic statistics
  const { totalCostCompany, totalValueCompany, blendedMarginCompany, lowMarginPoCount } = useMemo(() => {
    const cost = filteredOrders.reduce((sum, o) => sum + (o.costValue || 0), 0);
    const value = filteredOrders.reduce((sum, o) => sum + (o.value || 0), 0);
    const margin = value > 0 ? Math.round(((value - cost) / value) * 100) : 0;
    const lowMargin = filteredOrders.filter(o => {
      const c = o.costValue || 0;
      const r = o.value || 0;
      if (r === 0) return false;
      return ((r - c) / r) * 100 < 39;
    }).length;

    return {
      totalCostCompany: cost,
      totalValueCompany: value,
      blendedMarginCompany: margin,
      lowMarginPoCount: lowMargin
    };
  }, [filteredOrders]);

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
    loadedItems.sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
    setActiveOrderItems(loadedItems);
    setOrderDiscount(order.discount || 0);
    if (order.depositPercentage !== undefined && order.depositPercentage !== null) {
      setOrderDepositPercent(Number(order.depositPercentage));
    } else if (order.deposit_percentage !== undefined && order.deposit_percentage !== null) {
      setOrderDepositPercent(Number(order.deposit_percentage));
    } else {
      setOrderDepositPercent(null);
    }
    setSupplier(order.supplier);
    setOrderStatus(order.status);
    setOrderPaidAmount(Number(order.paid) || 0);
    const rawPayments = order.payments;
    let parsedPayments = [];
    if (typeof rawPayments === 'string') {
      try { parsedPayments = JSON.parse(rawPayments); } catch (_) { parsedPayments = []; }
    } else if (Array.isArray(rawPayments)) {
      parsedPayments = rawPayments;
    }
    setOrderPayments(parsedPayments);

    const rawTakeoff = order.takeoffData || order.takeoff_data;
    let parsedTakeoff = { countUpRows: [], specifications: {} };
    if (rawTakeoff) {
      if (typeof rawTakeoff === 'string') {
        try { parsedTakeoff = JSON.parse(rawTakeoff); } catch (_) {}
      } else if (typeof rawTakeoff === 'object') {
        parsedTakeoff = rawTakeoff;
      }
    }
    setTakeoffData(parsedTakeoff);

    const orderIdToFetch = order.id || order.poNumber || order.po_number;
    if (orderIdToFetch) {
      fetch(`${API_BASE}/api/payments/order/${encodeURIComponent(orderIdToFetch)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.payments) {
            setOrderPayments(data.payments);
            setOrderPaidAmount(Number(data.paid) || 0);
          }
        })
        .catch(() => {});
    }
    setWorkspaceSubTab('boq');

    // Retrieve linked project & contact info for automatic defaults
    const proj = projects[order.projectKey] || {};
    const orderClient = order.clientCompany || order.client_company || order.clientContact || order.client_contact || order.client || order.client_name || '';
    const contact = (contacts || []).find(c => (orderClient && (c.name === orderClient || c.company === orderClient)) || (proj.client && (c.name === proj.client || c.company === proj.client))) || {};

    // Auto-populate or read existing order-adjusted properties
    const hasOrderComp = order.clientCompany !== undefined && order.clientCompany !== null ? order.clientCompany : (order.client_company !== undefined && order.client_company !== null ? order.client_company : null);
    const hasOrderCont = order.clientContact !== undefined && order.clientContact !== null ? order.clientContact : (order.client_contact !== undefined && order.client_contact !== null ? order.client_contact : null);
    const hasOrderPhone = order.clientPhone !== undefined && order.clientPhone !== null ? order.clientPhone : (order.client_phone !== undefined && order.client_phone !== null ? order.client_phone : null);
    const hasOrderEmail = order.clientEmail !== undefined && order.clientEmail !== null ? order.clientEmail : (order.client_email !== undefined && order.client_email !== null ? order.client_email : null);

    setClientCompany(hasOrderComp !== null ? hasOrderComp : (contact.company || proj.client || ''));
    setClientContact(hasOrderCont !== null ? hasOrderCont : (contact.name || order.client || proj.client || ''));
    setClientPhone(hasOrderPhone !== null ? hasOrderPhone : (contact.phone || ''));
    setClientEmail(hasOrderEmail !== null ? hasOrderEmail : (contact.email || ''));

    setProjectFullName(order.projectFullName || order.project_full_name || proj.name || '');
    setProjectTier(order.projectTier || order.project_tier || proj.offering || 'Signature');
    setProjectSize(order.projectSize || order.project_size || proj.sqm || '—');
    
    setElectrician(order.electrician || 'TBD Electrician');
    setElectricianPhone(order.electricianPhone || '—');
    setContractor(order.contractor || 'TBD Contractor');
    setContractorPhone(order.contractorPhone || '—');
    setInteriorDesigner(order.interiorDesigner || 'TBD Designer');
    setInteriorDesignerPhone(order.interiorDesignerPhone || '—');

    setOneOneRep(order.oneOneRep || order.salesRep || order.sales_rep || order.sales_rep_name || proj.pm || 'Martin Döller');
    
    // Resolve PM Name, matching partial names like "Ryan" or "Dani" to full names in projectManagers list
    let rawPm = order.pmName || order.pm_name || order.salesRep || order.sales_rep || order.sales_rep_name || order.pm || proj.pm || '';
    if (rawPm && typeof rawPm === 'string') {
      const lowerRaw = rawPm.trim().toLowerCase();
      const matchedPmObj = (projectManagers || []).find(pm => {
        if (!pm || !pm.name || typeof pm.name !== 'string') return false;
        const pmLower = pm.name.toLowerCase();
        const firstName = pmLower.split(' ')[0] || '';
        return pmLower === lowerRaw || pmLower.includes(lowerRaw) || (firstName && lowerRaw.includes(firstName));
      });
      if (matchedPmObj && matchedPmObj.name) {
        rawPm = matchedPmObj.name;
      }
    }
    const resolvedPm = rawPm;
    setPmName(resolvedPm);
    
    const matchedPmInfo = (projectManagers || []).find(pm => pm && pm.name === resolvedPm);
    setPmPhone(order.pmPhone || (matchedPmInfo ? matchedPmInfo.phone : '083 570 7795'));
    setPmEmail(order.pmEmail || (matchedPmInfo ? matchedPmInfo.email : (resolvedPm && typeof resolvedPm === 'string' ? `${resolvedPm.toLowerCase().replace(/\s+/g, '.')}@1-to-1.world` : 'merlyn.mittins@1-to-1.world')));
    
    const formattedToday = new Date().toLocaleDateString('en-GB'); // "dd/mm/yyyy"
    setOrderDate(order.orderDate || formattedToday);

    setPfNumber(order.pfNumber || '');
    setPfDate(order.pfDate || '');
    setFileSource(order.fileSource || '');
    setProjectClass(order.projectClass || '');
    setQuotationSentDate(order.quotationSentDate || '');

    // Auto-resolve Division based on PM Name or Project if unassigned
    let resolvedDiv = order.division || proj.division || '';
    if (!resolvedDiv || resolvedDiv === 'INTERNAL - Office') {
      const name = resolvedPm.toLowerCase();
      if (name.includes('ryan')) resolvedDiv = 'MODUS PROFESSIONAL ( Ryan )';
      else if (name.includes('thando')) resolvedDiv = 'MODUS SIGNATURE ( Thando )';
      else if (name.includes('peer') || name.includes('jon') || name.includes('made')) resolvedDiv = 'MADE ( Jon-Peer)';
      else if (name.includes('luxe')) resolvedDiv = 'LUXELINE';
      else if (name.includes('dani') || name.includes('daniel')) resolvedDiv = 'MODUS PROJECTS ( Dani )';
    }
    setDivision(resolvedDiv);
    setQuoteName(order.quote_name || 'General Spec');

    setDeliveryAddress(order.deliveryAddress || proj.deliveryAddress || '7 RAVENSCRAIG ROAD, WOODSTOCK, CAPE TOWN, 7941');
    setBillingDetails(order.billingDetails || proj.billingDetails || 'TEST TSTETESSETSETEESTSETEST\nTEST TSTETESSETSETEESTSETEST');
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
        if (field === 'qty') {
          if (item.is_credit || item.isCredit) {
            const numVal = parseInt(val) || 0;
            updated.qty = numVal > 0 ? -numVal : numVal;
          } else {
            updated.qty = Math.max(0, parseInt(val) || 0);
          }
        }
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
    // When code is selected, we want to look it up in both local catalog fallback or dynamically loaded products list
    // We can also retrieve the product details from the dynamic search select options callback
    // (SearchableCodeSelect passes the entire selected product object to onSelect)
  };

  const handleSelectProductFromCatalog = (itemId, selectedProduct) => {
    if (!selectedProduct) return;
    setActiveOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          code: selectedProduct.code,
          description: selectedProduct.description || '',
          brand: selectedProduct.brand || '',
          dimming: selectedProduct.dimming || 'Non-dim',
          unitCost: Number(selectedProduct.unitCost) || 0,
          unitRetail: Number(selectedProduct.unitRetail) || 0,
          eta: selectedProduct.eta || '4 weeks',
          supplier: selectedProduct.supplier || ''
        };
      }
      return item;
    }));
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

  const handleAddProductToOrder = (product) => {
    const newId = 'I-' + Date.now();
    const newRow = {
      id: newId,
      qty: 1,
      type: product.category || 'Hardware',
      oneOneCode: product.one_to_one_code || '',
      code: product.sku || '',
      description: product.client_description || product.name || '',
      floor: 'Ground',
      area: 'TBD Area',
      dimming: product.dimming_protocol || product.dimmable || 'Non-dim',
      brand: product.brand || '',
      supplier: product.supplier || orderSupplier || 'Molecule Dist.',
      unitCost: product.cost_price || 0,
      unitTrade: product.trade_price || 0,
      unitRetail: product.retail_price || 0,
      selection: product.selection || 'Selection',
      stockStatus: product.stock_level > 0 ? 'Stock' : 'Ordered',
      eta: product.lead_time || '4 weeks',
      foh_code_description: product.foh_code_description || '',
      wetworks: product.wetworks || '',
      image_url: product.image_url || '',
      technical_image_url: product.technical_image_url || '',
      spec_sheet_url: product.qr_link || product.spec_sheet_url || ''
    };
    setActiveOrderItems(prev => [...prev, newRow]);
    alert(`Added "${product.one_to_one_code || product.sku || product.name}" to the order!`);
  };

  // Add a blank spacer row to the active spreadsheet
  const handleAddBlankSpacerRow = () => {
    const newId = 'SPACER-' + Date.now();
    const newRow = {
      id: newId,
      isSpacer: true,
      qty: 0,
      type: 'SPACER',
      oneOneCode: '',
      code: '',
      description: '— Space Row —',
      floor: '',
      area: '',
      dimming: '',
      brand: '',
      supplier: '',
      unitCost: 0,
      unitTrade: 0,
      unitRetail: 0,
      selection: '',
      stockStatus: '',
      eta: ''
    };
    setActiveOrderItems(prev => [...prev, newRow]);
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

  // Issue a credit item
  const handleIssueCreditItem = () => {
    if (creditSourceType === 'existing') {
      const originalItem = activeOrderItems.find(item => item.id === selectedItemToCredit);
      if (!originalItem) return;

      // Constrain the return qty
      const creditQtyVal = Math.max(1, Math.min(originalItem.qty, Number(qtyToCredit) || 1));

      const creditId = 'C-' + Date.now();
      const creditItem = {
        ...originalItem,
        id: creditId,
        qty: -creditQtyVal, // Negative quantity
        is_credit: true,   // Flagged as credit
        isCredit: true
      };

      setActiveOrderItems(prev => [...prev, creditItem]);
    } else {
      // Custom Credit Note Item
      if (!customCreditForm.description) return;

      const creditId = 'C-CUSTOM-' + Date.now();
      const creditItem = {
        id: creditId,
        oneOneCode: customCreditForm.oneOneCode || '',
        type: 'Custom Credit',
        code: customCreditForm.code || 'Custom',
        description: customCreditForm.description,
        brand: customCreditForm.brand || '—',
        supplier: customCreditForm.supplier || '—',
        floor: customCreditForm.floor || '—',
        area: customCreditForm.area || '—',
        dimming: customCreditForm.dimming || 'Non-dim',
        unitCost: Number(customCreditForm.unitCost) || 0,
        unitRetail: Number(customCreditForm.unitRetail) || 0,
        qty: -Math.abs(Number(customCreditForm.qty) || 1), // Force negative quantity
        is_credit: true,
        isCredit: true
      };

      setActiveOrderItems(prev => [...prev, creditItem]);
      // Reset form
      setCustomCreditForm({
        code: '',
        description: '',
        brand: '',
        supplier: '',
        floor: '',
        area: '',
        dimming: 'Non-dim',
        unitCost: 0,
        unitRetail: 0,
        qty: 1
      });
    }

    setShowAddCreditModal(false);
    setSelectedItemToCredit('');
    setQtyToCredit(1);
  };

  // Remove a credit item
  const handleRemoveCreditItem = (itemId) => {
    setActiveOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add a blank credit row
  const handleAddCreditRow = () => {
    const newId = 'C-' + Date.now();
    const newCreditItem = {
      id: newId,
      qty: -1, // Negative quantity
      oneOneCode: '',
      type: 'Credit Note',
      code: '',
      description: '',
      floor: '',
      area: '',
      dimming: 'Non-dim',
      brand: '',
      supplier: '',
      unitCost: 0,
      unitRetail: 0,
      is_credit: true,
      isCredit: true
    };
    setActiveOrderItems(prev => [...prev, newCreditItem]);
  };

  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Save the spreadsheet and update the global store context
  const handleSaveOrderSpreadsheet = async (syncVault = false) => {
    if (isSavingOrder || isSyncingVault) return;

    if (syncVault) {
      setIsSyncingVault(true);
    } else {
      setIsSavingOrder(true);
    }

    // Locate source project
    let sourceProjectKey = selectedProjectKey;
    if (!sourceProjectKey || !projects[sourceProjectKey]?.orders?.some(o => o.id === selectedOrderId)) {
      for (const pKey of Object.keys(projects)) {
        if (projects[pKey]?.orders?.some(o => o.id === selectedOrderId)) {
          sourceProjectKey = pKey;
          break;
        }
      }
    }

    const effectiveTargetKey = selectedProjectKey || sourceProjectKey || (clientContact ? `client-${clientContact.toLowerCase().trim().replace(/\s+/g, '-')}` : 'direct-client');
    const targetProj = projects[effectiveTargetKey] || projects[sourceProjectKey] || {};
    const existingOrder = (targetProj.orders || []).find(o => String(o.id) === String(selectedOrderId) || String(o.poNumber) === String(selectedOrderId) || String(o.po_number) === String(selectedOrderId)) || {};

    // Calculate aggregated order totals from items list
    const totalCostTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
    const totalRetailTotal = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
    const discountedValue = Math.max(0, totalRetailTotal * (1 - (Number(orderDiscount) || 0) / 100));
    const itemsCount = activeOrderItems.filter(item => !(item.is_credit || item.isCredit)).reduce((s, item) => s + (Number(item.qty) || 0), 0);
    
    // Compute authentic payments and paid sum
    const paidSum = (orderPayments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const effectivePaid = paidSum > 0 ? paidSum : (Number(orderPaidAmount) > 0 ? Number(orderPaidAmount) : (Number(existingOrder.paid) || 0));
    const effectivePayments = (orderPayments && orderPayments.length > 0) ? orderPayments : (existingOrder.payments || []);
    const finalGrossWithVat = discountedValue * 1.15;
    const balanceOutstanding = Math.max(0, finalGrossWithVat - effectivePaid);
    const defaultDepositRate = (finalGrossWithVat < 10000 && finalGrossWithVat > 0) ? 100 : 70;
    const effectiveDepositPercent = orderDepositPercent !== null && orderDepositPercent !== undefined 
      ? Number(orderDepositPercent) 
      : defaultDepositRate;
    const calculatedDepositValue = Math.round(finalGrossWithVat * (effectiveDepositPercent / 100));
    const calculatedBalanceValue = Math.max(0, Math.round(finalGrossWithVat - calculatedDepositValue));

    // Attach explicit sequential sortOrder index to preserve exact drag-and-drop sequence in DB
    const orderedItemsWithIndex = activeOrderItems.map((item, idx) => ({
      ...item,
      sortOrder: idx
    }));

    const orderPayload = {
      project_key: effectiveTargetKey,
      po_number: selectedOrderId,
      supplier_name: orderSupplier,
      items_count: itemsCount,
      value: Math.round(discountedValue),
      costValue: Math.round(totalCostTotal),
      discount: Number(orderDiscount) || 0,
      depositPercentage: effectiveDepositPercent,
      deposit_percentage: effectiveDepositPercent,
      depositValue: calculatedDepositValue,
      deposit_value: calculatedDepositValue,
      balanceValue: calculatedBalanceValue,
      balance_value: calculatedBalanceValue,
      paid: effectivePaid,
      payments: effectivePayments,
      outstanding: Math.round(balanceOutstanding),
      status: orderStatus === 'Draft' ? 'Pending' : orderStatus,
      eta: orderEta,
      quote_name: quoteName,
      client: (clientCompany || clientContact || targetProj.client || '').trim(),
      client_name: (clientCompany || clientContact || targetProj.client || '').trim(),
      clientCompany,
      clientContact,
      clientPhone,
      clientEmail,
      projectFullName: projectFullName || targetProj.name || '',
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
      orderDate,
      pfNumber,
      pfDate,
      fileSource,
      projectClass,
      quotationSentDate,
      division,
      takeoffData: takeoffData,
      takeoff_data: takeoffData
    };

    // 1. Direct Cloud SQL order update
    try {
      const updateRes = await fetch(`${API_BASE}/api/orders/${selectedOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      if (!updateRes.ok && updateRes.status === 404) {
        await fetch(`${API_BASE}/api/orders/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
      }
    } catch (e) {
      console.error("Error saving order in database:", e);
    }

    // 2. Direct Cloud SQL items upsert
    for (const item of orderedItemsWithIndex) {
      try {
        const itemSchema = {
          id: String(item.id),
          qty: Math.round(Number(item.qty) || 0),
          type: item.type || null,
          one_one_code: item.oneOneCode || item.one_one_code || null,
          code: item.code || null,
          description: item.description || null,
          floor: item.floor || null,
          area: item.area || null,
          dimming: item.dimming || null,
          brand: item.brand || null,
          supplier: item.supplier || null,
          unit_cost: Number(item.unitCost || item.unit_cost) || 0.0,
          unit_trade: Number(item.unitTrade || item.unit_trade) || 0.0,
          unit_retail: Number(item.unitRetail || item.unit_retail) || 0.0,
          selection: item.selection || null,
          stock_status: item.stockStatus || item.stock_status || null,
          eta: item.eta || null,
          po_ref: item.poRef || item.po_ref || null,
          po_qty_ordered: Math.round(Number(item.poQtyOrdered || item.po_qty_ordered) || 0),
          po_eta: item.poEta || item.po_eta || null,
          invoice_qty: Math.round(Number(item.invoiceQty || item.invoice_qty) || 0),
          po_supplier: item.poSupplier || item.po_supplier || null,
          po_date: item.poDate || item.po_date || null,
          received_qty: Math.round(Number(item.receivedQty || item.received_qty) || 0),
          received_date: item.receivedDate || item.received_date || null,
          invoice_ref: item.invoiceRef || item.invoice_ref || null,
          invoice_date: item.invoiceDate || item.invoice_date || null,
          invoice_value: Number(item.invoiceValue || item.invoice_value) || 0.0,
          delivery_qty: Math.round(Number(item.deliveryQty || item.delivery_qty) || 0),
          delivery_date: item.deliveryDate || item.delivery_date || null,
          delivery_status: item.deliveryStatus || item.delivery_status || null,
          delivery_history: Array.isArray(item.deliveryHistory || item.delivery_history) ? (item.deliveryHistory || item.delivery_history) : [],
          purchase_history: Array.isArray(item.purchaseHistory || item.purchase_history) ? (item.purchaseHistory || item.purchase_history) : [],
          receiving_history: Array.isArray(item.receivingHistory || item.receiving_history) ? (item.receivingHistory || item.receiving_history) : [],
          invoice_history: Array.isArray(item.invoiceHistory || item.invoice_history) ? (item.invoiceHistory || item.invoice_history) : [],
          stock_on_hand: Math.round(Number(item.stockOnHand || item.stock_on_hand) || 0),
          is_credit: !!(item.isCredit || item.is_credit),
          item_type: item.itemType || item.item_type || "Hardware",
          sort_order: Math.round(Number(item.sortOrder !== undefined ? item.sortOrder : (item.sort_order !== undefined ? item.sort_order : 0)) || 0)
        };

        await fetch(`${API_BASE}/api/orders/${selectedOrderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemSchema)
        });
      } catch (e) {
        console.error("Error saving item in database:", e);
      }
    }

    // 3. Immediately re-fetch and refresh projects state
    if (refreshProjects) {
      await refreshProjects();
    }

    if (!syncVault) {
      setIsSavingOrder(false);
      setSaveSuccessMsg('✓ Order & items saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }

    // Trigger Drive vault save with visible feedback
    try {
      const orderDocTypes = ['QUOTATION', 'DEPOSIT_INVOICE', 'BOQ', 'LIGHTING_SCHEDULE'];
      const vaultTokens = buildOrderDocumentTokens();

      let successCount = 0;
      let errors = [];

      for (const dType of orderDocTypes) {
        try {
          const res = await fetch(`${API_BASE}/admin/generate/${dType}?is_save_action=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vaultTokens)
          });
          if (res.ok) {
            successCount++;
          } else {
            const errData = await res.json().catch(() => ({}));
            errors.push(`${dType}: ${errData.detail || res.statusText || 'Failed'}`);
          }
        } catch (e) {
          errors.push(`${dType}: ${e.message}`);
        }
      }

      const totalRetail = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
      const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
      const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
      const orderMarginPct = totalRetail > 0 ? Math.round(((totalRetail - totalCost) / totalRetail) * 100) : 0;

      if (errors.length > 0) {
        alert(`Order Synced to Database!\n- Billed Value: R ${Math.round(discountedRetail).toLocaleString()}\n- Calculated order margin: ${orderMarginPct}%.\n\n⚠️ Drive Vault Notice:\n` + errors.join('\n'));
      } else {
        alert(`Order & Google Drive Vault Synced Successfully!\n- Created/updated ${successCount} order document PDFs in Shared Drive.\n- Billed Value: R ${Math.round(discountedRetail).toLocaleString()}\n- Calculated order margin: ${orderMarginPct}%.`);
      }
    } catch (vaultErr) {
      alert(`Order Saved, but Drive Vault encountered an error: ${vaultErr.message}`);
    } finally {
      setIsSyncingVault(false);
    }
  };

  // Dedicated saver for Takeoff & Specification data
  const handleSaveTakeoffData = async (newTakeoffData) => {
    setTakeoffData(newTakeoffData);
    if (!selectedOrderId) return;
    try {
      await fetch(`${API_BASE}/api/orders/${selectedOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeoffData: newTakeoffData, takeoff_data: newTakeoffData })
      });
      // Also update projects store
      setProjects(prev => {
        const next = { ...prev };
        for (const pKey of Object.keys(next)) {
          if (next[pKey]?.orders) {
            next[pKey].orders = next[pKey].orders.map(o => {
              if (String(o.id) === String(selectedOrderId) || String(o.poNumber) === String(selectedOrderId)) {
                return { ...o, takeoffData: newTakeoffData, takeoff_data: newTakeoffData };
              }
              return o;
            });
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Error saving takeoff data:", err);
    }
  };

  // Compiler callback: receives generated items from Takeoff engine and populates into activeOrderItems
  const handleGenerateBOQFromTakeoff = (generatedItems, mode = 'append') => {
    if (mode === 'replace') {
      setActiveOrderItems(generatedItems);
    } else {
      setActiveOrderItems(prev => [...prev, ...generatedItems]);
    }
    setWorkspaceSubTab('boq');
    alert(`✨ Generated ${generatedItems.length} items from Takeoff into the BOQ Spreadsheet!\nClick 'Save & Update' when you are ready to commit changes to database.`);
  };

  // Create a brand-new Purchase Order / Quotation
  const handleCreatePo = (e) => {
    e.preventDefault();
    const proj = projects[newPoForm.projectKey];
    if (!proj) return;

    const newPoId = 'Q-2026-0' + (allOrders.length + 42);
    const contact = (contacts || []).find(c => c.name === proj.client || c.company === proj.client) || {};
    const newOrder = {
      id: newPoId,
      quote_name: newPoForm.quote_name || 'General Spec',
      supplier: 'Made by 1-to-1',
      items: 1,
      value: 1500,
      paid: 0,
      outstanding: 1500,
      status: newPoForm.status,
      eta: newPoForm.eta,
      costValue: 900,
      discount: 0,
      client: proj.client || '',
      client_name: proj.client || '',
      clientCompany: contact.company || proj.client || '',
      client_company: contact.company || proj.client || '',
      clientContact: contact.name || proj.client || '',
      client_contact: contact.name || proj.client || '',
      clientPhone: contact.phone || '',
      client_phone: contact.phone || '',
      clientEmail: contact.email || '',
      client_email: contact.email || '',
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
          supplier: 'Made by 1-to-1',
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
      projectClient: newOrder.clientCompany || newOrder.clientContact || proj.client
    });
  };

  const activeOrderObject = useMemo(() => {
    if (selectedOrderId === null) return null;
    return Object.values(projects)
      .flatMap(p => p.orders || [])
      .find(o => o.id === selectedOrderId);
  }, [projects, selectedOrderId]);

  const orderCreditNotes = useMemo(() => {
    if (!activeOrderObject) return [];
    return (activeOrderObject.creditNotes && activeOrderObject.creditNotes.length > 0)
      ? activeOrderObject.creditNotes
      : (activeOrderObject?.clientInvoices || []).filter(i => i.is_credit || String(i.id).toUpperCase().startsWith('CN-') || String(i.id).toUpperCase().startsWith('CR-'));
  }, [activeOrderObject]);

  const erpCreditedItems = useMemo(() => {
    return orderCreditNotes.flatMap(cn => 
      (cn.items || []).map(it => {
        const rawQty = it.qtyAction !== undefined ? it.qtyAction : (it.qty !== undefined ? it.qty : -1);
        const absQty = Math.abs(Number(rawQty) || 1);
        const unitPrice = Math.abs(Number(it.unitPrice || it.unitRetail || it.price || 0));
        const totalVal = it.total !== undefined ? it.total : (Number(it.totalValue || it.amount || 0));
        const finalTotal = totalVal !== undefined && totalVal !== 0 ? -Math.abs(Number(totalVal)) : -(absQty * unitPrice);

        const codeVal = it.code || it.sku || '';
        const boqMatch = (activeOrderItems || []).find(b => (b.code || '').trim() === codeVal.trim());
        const desc = it.description && it.description !== it.code ? it.description : (boqMatch?.description || it.description || codeVal);

        return {
          id: `${cn.id}-${codeVal}`,
          creditNoteId: cn.id,
          creditNoteDate: String(cn.date || '').split('T')[0] || '—',
          qty: -absQty,
          code: codeVal,
          description: desc,
          unitRetail: unitPrice,
          totalRetail: finalTotal,
          allocatedBy: cn.allocated_by || cn.allocated_by_name || 'Staff',
          notes: cn.notes || 'Allocated from Palladium ERP'
        };
      })
    );
  }, [orderCreditNotes, activeOrderItems]);

  return (
    <>
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
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          .print-only-canvas {
            display: none !important;
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
                      placeholder="Search Order ID, Order name, Linked Project, Client or PM..."
                      className="form-control"
                      style={{ paddingLeft: '32px', fontSize: '13px', height: '34px' }}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="form-control"
                    style={{ width: '130px', height: '34px', fontSize: '13px' }}
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={projectFilterKey}
                    onChange={e => setProjectFilterKey(e.target.value)}
                  >
                    <option value="All">All Projects</option>
                    {projectOptions.map(p => (
                      <option key={p.key} value={p.key}>{p.name}</option>
                    ))}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                  >
                    <option value="All">All Clients</option>
                    {clientOptions.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={pmFilter}
                    onChange={e => setPmFilter(e.target.value)}
                  >
                    <option value="All">All PMs</option>
                    {pmOptions.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>

                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '34px', fontSize: '13px' }}
                    value={paymentStatusFilter}
                    onChange={e => setPaymentStatusFilter(e.target.value)}
                  >
                    <option value="All">All Payments</option>
                    <option value="Fully Paid">Fully Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isAnyFilterActive && (
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={handleClearFilters}
                      style={{ fontSize: '11px', color: 'var(--text-info)', border: '1px solid var(--border)' }}
                    >
                      Clear Filters
                    </button>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Showing <strong>{filteredOrders.length}</strong> active BOQs
                  </div>
                </div>
              </div>

              {/* ORDERS BULK ACTIONS TOOLBAR */}
              {selectedPoNumbers.size > 0 && (
                <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '4px solid var(--text-info)', flexWrap: 'wrap', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {selectedPoNumbers.size} orders selected
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-sm btn-ghost" 
                      onClick={() => setSelectedPoNumbers(new Set())}
                      style={{ fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                    
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={handleBulkRenameOrders}
                      style={{ fontSize: '12px' }}
                    >
                      Rename Quote Name
                    </button>
                    
                    <select 
                      className="form-control" 
                      style={{ width: '180px', height: '28px', fontSize: '12px', padding: '0 8px', display: 'inline-block', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      onChange={e => {
                        if (e.target.value) {
                          handleBulkRelinkOrders(e.target.value);
                          e.target.value = ''; // Reset
                        }
                      }}
                    >
                      <option value="">Shift to Project...</option>
                      {Object.values(projects).map(p => (
                        <option key={p.key} value={p.key}>{p.name}</option>
                      ))}
                    </select>

                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={handleBulkDeleteOrders}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} />
                      Delete Selected ({selectedPoNumbers.size})
                    </button>
                  </div>
                </div>
              )}

              {/* ORDERS LEDGER LIST */}
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '70vh', position: 'relative' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={sortedOrders.length > 0 && sortedOrders.every(o => selectedPoNumbers.has(o.id))}
                          onChange={() => toggleSelectAllPos(sortedOrders)}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order ID {renderSortIcon('id')}</div>
                      </th>
                      <th onClick={() => handleSort('quote_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Name {renderSortIcon('quote_name')}</div>
                      </th>
                      <th onClick={() => handleSort('project')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Linked Project {renderSortIcon('project')}</div>
                      </th>
                      <th onClick={() => handleSort('client')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Client {renderSortIcon('client')}</div>
                      </th>
                      <th onClick={() => handleSort('pm')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Project Manager {renderSortIcon('pm')}</div>
                      </th>
                      <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Margin {renderSortIcon('margin')}</div>
                      </th>
                      <th onClick={() => handleSort('value')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Value {renderSortIcon('value')}</div>
                      </th>
                      <th onClick={() => handleSort('paid')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Amount Paid {renderSortIcon('paid')}</div>
                      </th>
                      <th onClick={() => handleSort('outstanding')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Balance Outstanding {renderSortIcon('outstanding')}</div>
                      </th>
                      <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Order Status {renderSortIcon('status')}</div>
                      </th>
                      <th onClick={() => handleSort('paymentStatus')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Payment Status {renderSortIcon('paymentStatus')}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map(o => {
                      const cost = o.costValue || 0;
                      const retail = o.value || 0;
                      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                      const isLowMargin = margin < 39;

                      return (
                        <tr key={o.id} className="clickable" onClick={() => handleOpenWorkspace(o)}>
                          <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedPoNumbers.has(o.id)}
                              onChange={(e) => toggleSelectPo(o.id, e)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
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
                          <td style={{ fontWeight: 600 }}>{o.quote_name || 'General Spec'}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${o.projectKey}`); }}>{o.projectName}</td>
                          <td style={{ color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate('/crm', { state: { selectedClientName: o.projectClient } }); }}>{o.projectClient || '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{o.projectPm || o.pm || '—'}</td>
                          <td style={{ fontWeight: 700, color: isLowMargin ? 'var(--text-danger)' : 'var(--text-success)' }}>
                            {margin}% {isLowMargin && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: '3px' }} />}
                          </td>
                          <td style={{ fontWeight: 600 }}>R {retail.toLocaleString()}</td>
                          <td style={{ color: 'var(--text-success)' }}>R {(o.paid || 0).toLocaleString()}</td>
                          <td style={{ fontWeight: 600, color: (o.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                            R {(o.outstanding || 0).toLocaleString()}
                          </td>
                          <td>
                            <span className={`badge ${statusColor[o.status] || 'b-default'}`}>{o.status}</span>
                          </td>
                          <td>
                            <span className={`badge ${
                              o.paymentStatus === 'Fully Paid' ? 'b-success' : o.paymentStatus === 'Partially Paid' ? 'b-warning' : 'b-danger'
                            }`}>{o.paymentStatus}</span>
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
                  {quoteName} — <span style={{ color: 'var(--text-info)' }}>{selectedOrderId}</span>
                </h2>
              </div>

              {/* Vitals Grid and Actions Container */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {(() => {
                  const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
                  const totalRetailGross = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
                  const totalCreditedRetail = (erpCreditedItems || []).reduce((s, item) => s + Math.abs(Number(item.totalRetail || 0)), 0);
                  const netRetail = Math.max(0, totalRetailGross - totalCreditedRetail);
                  const discountedRetail = Math.max(0, netRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  const overallMargin = discountedRetail > 0 ? Math.round(((discountedRetail - totalCost) / discountedRetail) * 100) : 0;
                  
                  // Calculate dynamic status and percentages
                  let totalQtyForProc = 0;
                  let totalProcQty = 0;
                  let totalQtyForInv = 0;
                  let totalInvQty = 0;
                  let totalQtyForDel = 0;
                  let totalDelQty = 0;

                  activeOrderItems.filter(item => !item.is_credit && !item.isCredit).forEach(item => {
                    const q = Number(item.qty) || 0;
                    const isService = (item.itemType || item.item_type) === 'Service';
                    const invoiced = item.invoiceQty !== undefined ? item.invoiceQty : 0;

                    if (isService) {
                      totalQtyForInv += q;
                      totalInvQty += Number(invoiced) || 0;
                      return;
                    }

                    totalQtyForProc += q;
                    totalQtyForInv += q;
                    totalQtyForDel += q;

                    const received = item.receivedQty !== undefined ? item.receivedQty : 0;
                    const delivered = item.deliveryQty !== undefined ? item.deliveryQty : 0;
                    const stockStatus = item.stockStatus !== undefined ? item.stockStatus : '';

                    totalProcQty += stockStatus === 'All Stock on Hand' ? q : (Number(received) || 0);
                    totalInvQty += Number(invoiced) || 0;
                    totalDelQty += Number(delivered) || 0;
                  });

                  const procPct = totalQtyForProc > 0 ? Math.round((totalProcQty / totalQtyForProc) * 100) : 100;
                  const invPct = totalQtyForInv > 0 ? Math.round((totalInvQty / totalQtyForInv) * 100) : 0;
                  const delPct = totalQtyForDel > 0 ? Math.round((totalDelQty / totalQtyForDel) * 100) : 100;

                  const valueInclVat = discountedRetail * 1.15;
                  let paymentStatus = 'Unpaid';
                  if (orderPaidAmount > 0) {
                    if (orderPaidAmount >= valueInclVat - 1) {
                      paymentStatus = 'Fully Paid';
                    } else {
                      paymentStatus = 'Partially Paid';
                    }
                  }

                  let computedStatus = orderStatus || 'Pending';
                  if (computedStatus !== 'Draft' && computedStatus !== 'Cancelled') {
                    const isFullyPaid = paymentStatus === 'Fully Paid';
                    if (orderPaidAmount === 0 && procPct === 0 && delPct === 0) {
                      computedStatus = 'Pending';
                    } else if (procPct === 100 && invPct === 100 && delPct === 100 && isFullyPaid) {
                      computedStatus = 'Complete';
                    } else {
                      computedStatus = 'Ongoing';
                    }
                  }

                  let progressPct = 0;
                  if (computedStatus === 'Complete') {
                    progressPct = 100;
                  } else if (computedStatus === 'Ongoing') {
                    progressPct = 50;
                  }

                  const balanceOutstanding = Math.max(0, valueInclVat - Number(orderPaidAmount));

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.2fr 1.2fr 1.2fr 1fr', gap: '12px', background: 'rgba(255,255,255,0.6)', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minWidth: '700px' }}>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Order Status</span>
                        <span className={`badge ${computedStatus === 'Complete' ? 'b-success' : computedStatus === 'Ongoing' ? 'b-info' : computedStatus === 'Pending' ? 'b-warning' : 'b-default'}`} style={{ fontSize: '10.5px', display: 'inline-block', marginTop: '2px' }}>{computedStatus}</span>
                      </div>
                      <div style={{ borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.08)', color: '#4ade80' }}>
                          <span>Proc:</span> <span style={{ color: 'var(--text-primary)' }}>{procPct}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}>
                          <span>Inv:</span> <span style={{ color: 'var(--text-primary)' }}>{invPct}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(96, 165, 250, 0.08)', color: '#60a5fa' }}>
                          <span>Del:</span> <span style={{ color: 'var(--text-primary)' }}>{delPct}%</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Order Value</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>R {Math.round(valueInclVat).toLocaleString()}</span>
                        {totalCreditedRetail > 0 && (
                          <span style={{ fontSize: '8.5px', color: 'var(--text-danger)', fontWeight: 600 }}>
                            Credited: -R {Math.round(totalCreditedRetail * 1.15).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Value Paid</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-success)', display: 'block', marginTop: '2px' }}>R {Math.round(orderPaidAmount).toLocaleString()}</span>
                      </div>
                      <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Outstanding</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: balanceOutstanding > 0 ? 'var(--text-warning)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>R {Math.round(balanceOutstanding).toLocaleString()}</span>
                      </div>
                      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', fontWeight: 600, letterSpacing: '0.5px' }}>Margin</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', marginTop: '2px' }}>{overallMargin}%</span>
                      </div>
                    </div>
                  );
                })()}


                {saveSuccessMsg && (
                  <div style={{
                    fontSize: '12px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {saveSuccessMsg}
                  </div>
                )}

                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => {
                    if (confirm('Discard edits and close workspace?')) setSelectedOrderId(null);
                  }}
                  disabled={isSavingOrder || isSyncingVault}
                >
                  Close
                </button>
                
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => handleSaveOrderSpreadsheet(false)}
                  disabled={isSavingOrder || isSyncingVault}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (isSavingOrder || isSyncingVault) ? 'not-allowed' : 'pointer' }}
                  title="Instantly save all edits, line items, and pricing to database without Google Drive sync"
                >
                  <Save size={14} /> {isSavingOrder ? 'Saving...' : 'Save & Update'}
                </button>

                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => handleSaveOrderSpreadsheet(true)}
                  disabled={isSavingOrder || isSyncingVault}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (isSavingOrder || isSyncingVault) ? 'not-allowed' : 'pointer' }}
                  title="Save order to database and generate Quotation, Invoice, BOQ & Schedule on Google Drive"
                >
                  <FileText size={14} /> {isSyncingVault ? '⏳ Generating Docs...' : 'Save & Document'}
                </button>
              </div>
            </div>


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

            {/* DYNAMIC SEGMENTED WORKSPACE TAB CONTROL */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '4px', overflowX: 'auto' }}>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'takeoff' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('takeoff')}
              >
                <Sparkles size={14} /> ⚡ Takeoff & Specification
              </button>
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
                className={`btn btn-sm ${workspaceSubTab === 'purchasing' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('purchasing')}
              >
                <ClipboardList size={14} /> 📋 Purchasing & Receiving
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'invoices' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('invoices')}
              >
                <FileText size={14} /> 💵 Invoicing
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'logistics' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('logistics')}
              >
                <Truck size={14} /> 📦 Delivery Logistics
              </button>
              <button 
                className={`btn btn-sm ${workspaceSubTab === 'credits' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}
                onClick={() => setWorkspaceSubTab('credits')}
              >
                <DollarSign size={14} style={{ color: '#ef4444' }} /> 🔴 Credits & Returns
              </button>
            </div>

            {/* SUB-TAB 0: TAKEOFF & SPECIFICATION ENGINE */}
            {workspaceSubTab === 'takeoff' && (
              <TakeoffSpecEngine
                orderId={selectedOrderId}
                projectKey={selectedProjectKey}
                orderSupplier={orderSupplier}
                initialTakeoffData={takeoffData}
                onSaveTakeoffData={handleSaveTakeoffData}
                onGenerateBOQ={handleGenerateBOQFromTakeoff}
              />
            )}

            {workspaceSubTab === 'boq' && (
              
              /* SUB-TAB 1: BOQ SPREADSHEET ENGINE */
              <div>
                {/* PROJECT REGISTRATION & METADATA VITALS COLLAPSIBLE BLOCK */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)' }}>
                      📋 Project Registration Form & Metadata Vitals
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-xs"
                        onClick={() => setWorkspaceSubTab('takeoff')}
                        style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Open Takeoff & Spec Engine to count fixtures and generate items"
                      >
                        <Sparkles size={11} /> ⚡ Populate from Takeoff & Spec
                      </button>
                      <button 
                        className="btn btn-ghost btn-xs" 
                        onClick={() => setShowRegForm(!showRegForm)}
                        style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}
                      >
                        {showRegForm ? 'Collapse Form ✕' : 'Expand Form ➔'}
                      </button>
                    </div>
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
                              setOneOneRep(val);
                              const found = (projectManagers || []).find(pm => pm.name === val);
                              if (found) {
                                setPmPhone(found.phone || '');
                                setPmEmail(found.email || '');
                              }
                              // Auto-select matching Division
                              const n = val.toLowerCase();
                              if (n.includes('ryan')) setDivision('MODUS PROFESSIONAL ( Ryan )');
                              else if (n.includes('thando')) setDivision('MODUS SIGNATURE ( Thando )');
                              else if (n.includes('peer') || n.includes('jon') || n.includes('made')) setDivision('MADE ( Jon-Peer)');
                              else if (n.includes('luxe')) setDivision('LUXELINE');
                              else if (n.includes('dani') || n.includes('daniel')) setDivision('MODUS PROJECTS ( Dani )');
                            }}
                          >
                            <option value="">Select Project Manager...</option>
                            {(projectManagers || []).map(pm => (
                              <option key={pm.id} value={pm.name}>{pm.name} {pm.active === false ? '(Inactive)' : ''}</option>
                            ))}
                            {pmName && !(projectManagers || []).some(pm => pm.name === pmName) && (
                              <option value={pmName}>{pmName}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase' }}>Division / Team</label>
                          <select 
                            className="form-control" 
                            style={{ height: '26px', fontSize: '11.5px', padding: '2px 6px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                            value={division} 
                            onChange={e => setDivision(e.target.value)}
                          >
                            <option value="">Auto-Detect (PM Name)</option>
                            <option value="MODUS PROFESSIONAL ( Ryan )">MODUS PROFESSIONAL ( Ryan )</option>
                            <option value="MOOD STORES">MOOD STORES</option>
                            <option value="MODUS PROJECTS ( Dani )">MODUS PROJECTS ( Dani )</option>
                            <option value="PROJECTS (Dani own)">PROJECTS (Dani own)</option>
                            <option value="MODUS SIGNATURE ( Thando )">MODUS SIGNATURE ( Thando )</option>
                            <option value="MADE ( Jon-Peer)">MADE ( Jon-Peer)</option>
                            <option value="LUXELINE">LUXELINE</option>
                            <option value="INTERNAL - Office">INTERNAL - Office</option>
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
                                value={combinedContacts.find(c => c.name === clientContact)?.name || ''}
                                onChange={e => {
                                  const contact = combinedContacts.find(c => c.name === e.target.value);
                                  if (contact) {
                                    setClientContact(contact.name);
                                    setClientCompany(contact.company || '');
                                    setClientPhone(contact.phone || '');
                                    setClientEmail(contact.email || '');
                                  }
                                }}
                              >
                                <option value="">-- Choose from Contacts CRM --</option>
                                {combinedContacts.map(c => (
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
                                value={selectedProjectKey || Object.keys(projects).find(k => projects[k].name === projectFullName) || ''}
                                onChange={e => {
                                  const projKey = e.target.value;
                                  setSelectedProjectKey(projKey);
                                  const proj = projects[projKey];
                                  if (proj) {
                                    setProjectFullName(proj.name);
                                    setProjectTier(proj.offering || 'Signature');
                                    setProjectSize(proj.sqm || '—');
                                    setPmName(proj.pm || '');
                                    
                                    if (proj.deliveryAddress) {
                                      setDeliveryAddress(proj.deliveryAddress);
                                    }
                                    if (proj.billingDetails) {
                                      setBillingDetails(proj.billingDetails);
                                    }

                                    // If no client is set yet, default from project
                                    if (!clientContact && !clientCompany && proj.client) {
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
                                    setDeliveryAddress('');
                                    setBillingDetails('');
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

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ gridColumn: 'span 4' }}>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Quote Name</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={quoteName} 
                                onChange={e => setQuoteName(e.target.value)} 
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>PF Number & Date</label>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input 
                                  type="text" 
                                  placeholder="PF Number" 
                                  className="form-control" 
                                  style={{ height: '24px', fontSize: '11px', flex: 1, padding: '2px 6px' }}
                                  value={pfNumber} 
                                  onChange={e => setPfNumber(e.target.value)}
                                />
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  style={{ height: '24px', fontSize: '11px', width: '95px', padding: '2px 4px', colorScheme: 'dark' }}
                                  value={pfDate} 
                                  onChange={e => setPfDate(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Project Class</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={projectClass} 
                                onChange={e => setProjectClass(e.target.value)} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Quotation Sent</label>
                              <input 
                                type="date" 
                                className="form-control" 
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px', colorScheme: 'dark' }}
                                value={quotationSentDate} 
                                onChange={e => setQuotationSentDate(e.target.value)} 
                              />
                            </div>
                            <div style={{ gridColumn: 'span 4' }}>
                              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                <span>File Source</span>
                                {fileSource && (
                                  <a 
                                    href={fileSource.startsWith('http') ? fileSource : `https://${fileSource}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    style={{ color: 'var(--text-info)', textDecoration: 'underline', fontWeight: 600, fontSize: '9.5px' }}
                                  >
                                    🔗 Open Link
                                  </a>
                                )}
                              </label>
                              <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Paste link to file source here..."
                                style={{ height: '24px', fontSize: '11px', padding: '2px 6px' }}
                                value={fileSource} 
                                onChange={e => setFileSource(e.target.value)} 
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
                  const totalCost = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0)), 0);
                  const totalRetailGross = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0)), 0);
                  const totalCreditedRetail = (erpCreditedItems || []).reduce((s, item) => s + Math.abs(Number(item.totalRetail || 0)), 0);
                  const totalRetail = Math.max(0, totalRetailGross - totalCreditedRetail);
                  const totalTrade = activeOrderItems.reduce((s, item) => s + ((Number(item.qty) || 0) * (Number(item.unitTrade || item.unit_trade) || 0)), 0);
                  const discountedRetail = Math.max(0, totalRetail * (1 - (Number(orderDiscount) || 0) / 100));
                  const overallMargin = discountedRetail > 0 ? Math.round(((discountedRetail - totalCost) / discountedRetail) * 100) : 0;
                  const finalGrossInclVat = discountedRetail * 1.15;
                  const balanceOutstanding = Math.max(0, finalGrossInclVat - Number(orderPaidAmount));

                  const defaultDepositRate = (finalGrossInclVat < 10000 && finalGrossInclVat > 0) ? 100 : 70;
                  const effectiveDepositPercent = orderDepositPercent !== null && orderDepositPercent !== undefined 
                    ? Number(orderDepositPercent) 
                    : defaultDepositRate;
                  const calculatedDepositVal = finalGrossInclVat * (effectiveDepositPercent / 100);
                  const calculatedBalanceVal = Math.max(0, finalGrossInclVat - calculatedDepositVal);

                  const hasLowMargins = activeOrderItems.filter(item => !(item.is_credit || item.isCredit)).some(item => {
                    const cost = Number(item.unitCost || item.unit_cost) || 0;
                    const retail = Number(item.unitRetail || item.unit_retail) || 0;
                    if (retail === 0) return false;
                    return (((retail - cost) / retail) * 100) < 39;
                  });

                  // Compile Area Subtotals
                  const areaTotals = {};
                  activeOrderItems.forEach(item => {
                    const areaName = item.area || 'General';
                    const lineCost = (Number(item.qty) || 0) * (Number(item.unitCost || item.unit_cost) || 0);
                    const lineRetail = (Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0);
                    
                    if (!areaTotals[areaName]) {
                      areaTotals[areaName] = { cost: 0, retail: 0 };
                    }
                    areaTotals[areaName].cost += lineCost;
                    areaTotals[areaName].retail += lineRetail;
                  });

                  return (
                    <>
                      {/* VITAL METRICS CARD GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Cost Price</span>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', margin: '4px 0' }}>R {Math.round(totalCost).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Supplier cost EX VAT</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billed Retail EX VAT</span>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', margin: '4px 0' }}>R {Math.round(totalRetail).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: totalCreditedRetail > 0 ? 'var(--text-danger)' : 'var(--text-tertiary)' }}>
                            {totalCreditedRetail > 0 ? `Less CN: -R ${Math.round(totalCreditedRetail).toLocaleString()}` : 'Subtotal before discount'}
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Volume Discount (%)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <input 
                              type="number"
                              className="form-control"
                              style={{ padding: '2px 6px', fontSize: '13px', width: '60px', height: '28px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                              value={orderDiscount}
                              onChange={e => setOrderDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            />
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>%</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px' }}>Reduces final retail price</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final Client Price</span>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-info)', display: 'block', margin: '4px 0' }}>R {Math.round(discountedRetail).toLocaleString()}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>VAT EXCLUDED</span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposit (%)</span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: finalGrossInclVat < 10000 && finalGrossInclVat > 0 && orderDepositPercent === null ? 'var(--text-warning)' : 'var(--text-info)' }}>
                              {finalGrossInclVat < 10000 && finalGrossInclVat > 0 && orderDepositPercent === null ? '100% (<R10k)' : `${effectiveDepositPercent}%`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              className="form-control"
                              style={{ padding: '2px 4px', fontSize: '13px', width: '54px', height: '28px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontWeight: 700 }}
                              value={effectiveDepositPercent}
                              onChange={e => setOrderDepositPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                            />
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>%</span>
                            <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                              <button 
                                type="button"
                                title="Set standard 70% deposit"
                                onClick={() => setOrderDepositPercent(70)}
                                className="btn btn-ghost btn-xs"
                                style={{ padding: '1px 3px', fontSize: '9.5px', height: '22px', background: effectiveDepositPercent === 70 ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: effectiveDepositPercent === 70 ? 'var(--text-info)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                              >
                                70%
                              </button>
                              <button 
                                type="button"
                                title="Set full 100% deposit"
                                onClick={() => setOrderDepositPercent(100)}
                                className="btn btn-ghost btn-xs"
                                style={{ padding: '1px 3px', fontSize: '9.5px', height: '22px', background: effectiveDepositPercent === 100 ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: effectiveDepositPercent === 100 ? 'var(--text-info)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                              >
                                100%
                              </button>
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px' }}>
                            Due: R {Math.round(calculatedDepositVal).toLocaleString()} (incl VAT)
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Blended Margin</span>
                          <span style={{ fontSize: '17px', fontWeight: 700, color: overallMargin < 39 ? 'var(--text-danger)' : 'var(--text-success)', display: 'block', margin: '4px 0' }}>
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

                      {/* TWO-COLUMN SPREADSHEET + AREA BREAKDOWN LAYOUT */}
                      <div style={{ display: 'grid', gridTemplateColumns: showAreaBreakdown ? '1fr 340px' : '1fr', gap: '20px', marginBottom: '20px' }}>
                        
                        {/* LEFT COLUMN: INTERACTIVE HIGH-DENSITY SPREADSHEET */}
<div 
                          style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                          onKeyDown={handleGridKeyDown}
                          onPaste={handleGridPaste}
                        >
                          <table className="table boq-table" style={{ margin: 0, tableLayout: 'fixed', width: '100%', minWidth: '1300px', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                                <th style={{ width: '32px', textAlign: 'center', color: 'var(--text-tertiary)', userSelect: 'none' }}>
                                  ⋮⋮
                                </th>
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
                                <th style={{ width: widths.itemType, position: 'relative' }}>
                                  Item Type
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('itemType', e)} />
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
                                <th style={{ width: widths.supplier, position: 'relative' }}>
                                  Supplier
                                  <div className="resize-handle" onMouseDown={e => onResizeStart('supplier', e)} />
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
                              {activeOrderItems.filter(item => !(item.is_credit || item.isCredit)).map((item, index) => {
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

                                if (item.isSpacer || item.type === 'SPACER') {
                                  return (
                                    <tr 
                                      key={item.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', index.toString());
                                        e.dataTransfer.effectAllowed = 'move';
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'move';
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const dragIndexStr = e.dataTransfer.getData('text/plain');
                                        if (dragIndexStr === '') return;
                                        const fromIndex = parseInt(dragIndexStr, 10);
                                        const toIndex = index;
                                        if (fromIndex === toIndex || isNaN(fromIndex)) return;

                                        setActiveOrderItems(prev => {
                                          const nonCreditItems = prev.filter(it => !(it.is_credit || it.isCredit));
                                          const creditItems = prev.filter(it => (it.is_credit || it.isCredit));
                                          const updated = [...nonCreditItems];
                                          const [movedItem] = updated.splice(fromIndex, 1);
                                          updated.splice(toIndex, 0, movedItem);
                                          return [...updated, ...creditItems];
                                        });
                                      }}
                                      style={{ background: 'rgba(0, 0, 0, 0.05)', height: '9px' }}
                                    >
                                      <td 
                                        style={{ textAlign: 'center', cursor: 'grab', userSelect: 'none', color: 'var(--text-tertiary)', padding: 0 }}
                                        title="Click & Drag to reorder space row"
                                      >
                                        <GripVertical size={9} style={{ verticalAlign: 'middle', opacity: 0.5 }} />
                                      </td>
                                      <td colSpan={17} style={{ background: 'rgba(0, 0, 0, 0.04)', height: '9px', padding: 0, borderTop: '1px solid rgba(0,0,0,0.08)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                                        <div style={{ height: '100%', width: '100%' }} />
                                      </td>
                                      <td style={{ textAlign: 'center', padding: '0 4px', verticalAlign: 'middle' }}>
                                        <button 
                                          type="button"
                                          className="btn btn-ghost"
                                          style={{ padding: '0', height: 'auto', color: 'var(--text-danger)', opacity: 0.6 }}
                                          title="Delete Space Row"
                                          onClick={() => handleDeleteSpreadsheetRow(item.id)}
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr 
                                    key={item.id} 
                                    style={rowStyle}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', index.toString());
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'move';
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const dragIndexStr = e.dataTransfer.getData('text/plain');
                                      if (dragIndexStr === '') return;
                                      const fromIndex = parseInt(dragIndexStr, 10);
                                      const toIndex = index;
                                      if (fromIndex === toIndex || isNaN(fromIndex)) return;

                                      setActiveOrderItems(prev => {
                                        const nonCreditItems = prev.filter(it => !(it.is_credit || it.isCredit));
                                        const creditItems = prev.filter(it => (it.is_credit || it.isCredit));
                                        const updated = [...nonCreditItems];
                                        const [movedItem] = updated.splice(fromIndex, 1);
                                        updated.splice(toIndex, 0, movedItem);
                                        return [...updated, ...creditItems];
                                      });
                                    }}
                                  >
                                    {/* ROW DRAG HANDLE */}
                                    <td 
                                      style={{ 
                                        textAlign: 'center', 
                                        cursor: 'grab', 
                                        userSelect: 'none', 
                                        color: 'var(--text-tertiary)',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                      }}
                                      title="Click & Drag to reorder row"
                                    >
                                      <GripVertical size={14} style={{ verticalAlign: 'middle', opacity: 0.6 }} />
                                    </td>

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

                                    {/* ITEM TYPE - Styled badge toggle */}
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '2px 4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSpreadsheetCell(item.id, 'itemType', (item.itemType || item.item_type || 'Hardware') === 'Hardware' ? 'Service' : 'Hardware')}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          border: 'none',
                                          letterSpacing: '0.3px',
                                          transition: 'all 0.15s',
                                          ...(((item.itemType || item.item_type) === 'Service') ? {
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#d97706',
                                            outline: '1px solid rgba(245, 158, 11, 0.4)'
                                          } : {
                                            background: 'rgba(59, 130, 246, 0.12)',
                                            color: '#3b82f6',
                                            outline: '1px solid rgba(59, 130, 246, 0.3)'
                                          })
                                        }}
                                        title="Click to toggle Hardware / Service"
                                      >
                                        {((item.itemType || item.item_type) === 'Service') ? '⚙ Service' : '🔩 Hardware'}
                                      </button>
                                    </td>

                                    {/* ITEM CODE SELECTOR / CUSTOM ENTRY */}
                                    <td>
                                      <SearchableCodeSelect 
                                        value={item.code || ''}
                                        onChange={val => handleUpdateSpreadsheetCell(item.id, 'code', val)}
                                        onSelect={prod => {
                                          handleSelectProductFromCatalog(item.id, prod);
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

                                    {/* SUPPLIER */}
                                    <td>
                                      <input 
                                        type="text"
                                        className="boq-cell-input"
                                        value={item.supplier || ''}
                                        onChange={e => handleUpdateSpreadsheetCell(item.id, 'supplier', e.target.value)}
                                        data-row={index}
                                        data-col={15}
                                        data-field="supplier"
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

                          {erpCreditedItems.length > 0 && (
                            <div style={{ marginTop: '20px', borderTop: '2px solid var(--border-danger)', paddingTop: '16px', paddingBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginLeft: '12px', marginRight: '12px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                  🔴 Credited Items & Returns (Allocated from Palladium ERP — {erpCreditedItems.length} line item{erpCreditedItems.length === 1 ? '' : 's'})
                                </h4>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-ghost" 
                                  style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-danger)', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                                  onClick={() => setCreditsSectionOpen(!creditsSectionOpen)}
                                >
                                  {creditsSectionOpen ? 'Collapse ˄' : 'Expand ˅'}
                                </button>
                              </div>
                              {creditsSectionOpen && (
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px', margin: '0 12px' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left', minWidth: '900px' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--text-danger)', fontWeight: 700 }}>
                                        <th style={{ padding: '8px 12px', width: '70px', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '8px 12px', width: '140px' }}>Credit Note #</th>
                                        <th style={{ padding: '8px 12px', width: '110px' }}>Date Issued</th>
                                        <th style={{ padding: '8px 12px', width: '160px' }}>Item Code</th>
                                        <th style={{ padding: '8px 12px' }}>Description</th>
                                        <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Unit Retail</th>
                                        <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Total Credited</th>
                                        <th style={{ padding: '8px 12px', width: '140px' }}>Source / By</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {erpCreditedItems.map((item, idx) => (
                                        <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.03)' }}>
                                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-danger)' }}>
                                            {item.qty}
                                          </td>
                                          <td 
                                            style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-danger)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => navigate('/invoices')}
                                          >
                                            🔴 {item.creditNoteId}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                            {item.creditNoteDate || '—'}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {item.code}
                                          </td>
                                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                            {item.description}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                            R {item.unitRetail?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-danger)', fontFamily: 'monospace' }}>
                                            -R {Math.abs(item.totalRetail || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            {item.allocatedBy || 'Palladium ERP'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: BOQ AREA FINANCIAL SUMMARY / PRODUCT CATALOGUE */}
                        {showAreaBreakdown && (
                          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: '340px' }}>
                            {/* Tab selector */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '8px', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    border: 'none',
                                    background: 'none',
                                    color: sidePanelTab === 'breakdown' ? 'var(--text-info)' : 'var(--text-tertiary)',
                                    borderBottom: sidePanelTab === 'breakdown' ? '2px solid var(--text-info)' : 'none',
                                    padding: '4px 2px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setSidePanelTab('breakdown')}
                                >
                                  Breakdown
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    border: 'none',
                                    background: 'none',
                                    color: sidePanelTab === 'catalog' ? 'var(--text-info)' : 'var(--text-tertiary)',
                                    borderBottom: sidePanelTab === 'catalog' ? '2px solid var(--text-info)' : 'none',
                                    padding: '4px 2px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => setSidePanelTab('catalog')}
                                >
                                  Catalogue 📖
                                </button>
                              </div>
                              <button 
                                type="button" 
                                className="btn btn-ghost btn-sm" 
                                style={{ padding: '2px 6px', fontSize: '10px', height: 'auto', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                onClick={() => setShowAreaBreakdown(false)}
                              >
                                Collapse ✕
                              </button>
                            </div>

                            {sidePanelTab === 'breakdown' ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={14} color="var(--text-info)" /> Area BOQ Breakdown
                                  </h4>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                                  {Object.entries(areaTotals)
                                    .filter(([_, totals]) => totals.retail > 0 || totals.cost > 0)
                                    .map(([areaName, totals]) => {
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
                              </>
                            ) : (
                              /* PRODUCT CATALOGUE VIEW */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ height: '28px', fontSize: '11px', padding: '4px 8px', flex: 1 }}
                                    placeholder="Search catalog..."
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                  />
                                  <select
                                    className="form-control"
                                    style={{ height: '28px', fontSize: '11px', padding: '2px 4px', width: '90px' }}
                                    value={catalogCategory}
                                    onChange={e => setCatalogCategory(e.target.value)}
                                  >
                                    <option value="All">All Categories</option>
                                    <option value="Downlight">Downlight</option>
                                    <option value="Linear">Linear</option>
                                    <option value="Track">Track</option>
                                    <option value="Wall">Wall</option>
                                    <option value="Pendant">Pendant</option>
                                    <option value="Decorative">Decorative</option>
                                    <option value="Outer">Outer</option>
                                    <option value="Power">Power</option>
                                  </select>
                                </div>

                                {catalogLoading ? (
                                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Loading Catalogue...
                                  </div>
                                ) : catalogProducts.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    No products found
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {catalogProducts.map(prod => (
                                      <div 
                                        key={prod.id} 
                                        style={{ 
                                          padding: '10px', 
                                          background: 'var(--bg-primary)', 
                                          border: '1px solid var(--border)', 
                                          borderRadius: '8px', 
                                          fontSize: '11px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '6px'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{prod.sku}</span>
                                            {prod.one_to_one_code && (
                                              <span className="badge b-info" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 700, fontFamily: 'monospace' }}>
                                                {prod.one_to_one_code}
                                              </span>
                                            )}
                                          </div>
                                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', background: 'var(--bg-secondary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border)', fontWeight: 600 }}>
                                            {prod.category || 'Product'}
                                          </span>
                                        </div>

                                        <div style={{ color: 'var(--text-primary)', fontSize: '11.5px', fontWeight: 600, lineHeight: '1.3' }}>
                                          {prod.client_description || prod.name}
                                        </div>

                                        {/* Specs Badges */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                          {prod.brand && (
                                            <span style={{ fontSize: '9.5px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                              {prod.brand}
                                            </span>
                                          )}
                                          {prod.system_power && (
                                            <span style={{ fontSize: '9.5px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                              {prod.system_power}W
                                            </span>
                                          )}
                                          {prod.kelvin && (
                                            <span style={{ fontSize: '9.5px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                                              {prod.kelvin}
                                            </span>
                                          )}
                                          {prod.dimming_protocol && (
                                            <span style={{ fontSize: '9.5px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-info)' }}>
                                              {prod.dimming_protocol}
                                            </span>
                                          )}
                                          <span style={{ fontSize: '9.5px', color: prod.stock_level > 0 ? 'var(--text-success)' : 'var(--text-warning)', marginLeft: 'auto', fontWeight: 600 }}>
                                            {prod.stock_level > 0 ? `${prod.stock_level} In Stock` : 'Out of Stock'}
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                                          <span style={{ fontWeight: 800, color: 'var(--text-info)', fontSize: '12px' }}>
                                            R {Math.round(prod.retail_price || 0).toLocaleString()}
                                          </span>
                                          <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                              type="button"
                                              className="btn btn-xs btn-ghost"
                                              style={{ fontSize: '10.5px', padding: '3px 8px', border: '1px solid var(--border)' }}
                                              onClick={() => setSelectedCatalogProduct(prod)}
                                            >
                                              Specs ↗
                                            </button>
                                            <button
                                              type="button"
                                              className="btn btn-xs btn-primary"
                                              style={{ fontSize: '10.5px', padding: '3px 10px', fontWeight: 600 }}
                                              onClick={() => handleAddProductToOrder(prod)}
                                            >
                                              + Add
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
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
                          
                          <button 
                            type="button"
                            className="btn btn-ghost"
                            style={{ border: '1px dashed var(--border-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.02)' }}
                            onClick={handleAddBlankSpacerRow}
                            title="Insert a thin blank space row to group fixtures"
                          >
                             <Plus size={14} /> Add blank space row
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
                  
                  {/* DOCUMENT SELECTION WITH CHECKBOXES */}
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Select Documents</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-info)', fontWeight: 600 }}>{checkedDocTypes.length} Selected</span>
                    </div>

                    {(() => {
                      let docsList = [];
                      if (liveCustomDocs && Object.keys(liveCustomDocs).length > 0) {
                        docsList = Object.values(liveCustomDocs).map(cd => ({
                          id: cd.id.toLowerCase() === 'quotation' ? 'quote' : cd.id.toLowerCase() === 'boq' ? 'boq_doc' : cd.id.toLowerCase(),
                          name: cd.name || cd.id,
                          icon: <FileText size={14} />
                        }));
                      } else {
                        docsList = [
                          { id: 'quote', name: 'Quotation (Summarized)', icon: <FileText size={14} /> },
                          { id: 'boq_doc', name: 'BOQ (Detailed Breakdown)', icon: <Layers size={14} /> },
                          { id: 'schedule', name: 'Lighting Schedule', icon: <ClipboardList size={14} /> },
                          { id: 'deposit_invoice', name: 'Deposit Invoice', icon: <DollarSign size={14} /> },
                          { id: 'balance_invoice', name: 'Balance Invoice', icon: <DollarSign size={14} /> },
                          { id: 'tax_invoice', name: 'Tax Invoice (Full)', icon: <DollarSign size={14} /> },
                          { id: 'statement', name: 'Progress Statement', icon: <TrendingUp size={14} /> }
                        ];
                      }

                      return docsList.map(doc => {
                        const isSelected = selectedDocType === doc.id;
                        const isChecked = checkedDocTypes.includes(doc.id);
                        return (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--border-info)' : 'transparent'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (e.target.checked) {
                                  setCheckedDocTypes(prev => [...prev, doc.id]);
                                } else {
                                  setCheckedDocTypes(prev => prev.filter(id => id !== doc.id));
                                }
                              }}
                              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--color-primary)' }}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                justifyContent: 'flex-start',
                                flex: 1,
                                padding: '4px 6px',
                                textAlign: 'left',
                                border: 'none',
                                background: 'transparent'
                              }}
                              onClick={() => setSelectedDocType(doc.id)}
                            >
                              {doc.icon}
                              <span style={{ fontSize: '12.5px', fontWeight: isSelected ? 600 : 500 }}>{doc.name}</span>
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* PRINT / EXPORT ACTIONS (Pure Excel Template System) */}
                  <button 
                    className="btn btn-success"
                    style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'linear-gradient(135deg, #1f9a55 0%, #156b3b 100%)', border: 'none', color: '#fff', width: '100%', fontWeight: 600 }}
                    onClick={handleExportXlsxTemplate}
                    disabled={exportingXlsx || checkedDocTypes.length === 0}
                  >
                    <FileSpreadsheet size={15} /> {exportingXlsx ? 'Compiling PDF Batch...' : `Download ${checkedDocTypes.length > 1 ? `Selected (${checkedDocTypes.length}) PDFs 📄` : 'PDF 📄'}`}
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
                          <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Generating from Master Excel template</span>
                        </div>
                      ) : (
                        <>
                              {showIframe && (
                                <div className="no-print" style={{ width: '100%', maxWidth: '840px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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
                              )}
                              <div 
                                id="print-document-canvas" 
                                className={showIframe ? "print-only-canvas" : ""}
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
                              {activeDocType === 'schedule' && 'Lighting Schedule'}
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
                                        <th style={{ padding: '6px', width: '100px' }}>Supplier</th>
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
                                          <td style={{ padding: '6px' }}>{item.supplier || '—'}</td>
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
                        {(activeDocType === 'invoice' || activeDocType === 'deposit_invoice' || activeDocType === 'balance_invoice' || activeDocType === 'tax_invoice') && (() => {
                          const defaultDepositRate = (finalTotalInclVat < 10000 && finalTotalInclVat > 0) ? 100 : 70;
                          const effectiveDepositPercent = orderDepositPercent !== null && orderDepositPercent !== undefined 
                            ? Number(orderDepositPercent) 
                            : defaultDepositRate;
                          const calculatedDepositVal = finalTotalInclVat * (effectiveDepositPercent / 100);
                          const calculatedBalanceVal = Math.max(0, finalTotalInclVat - calculatedDepositVal);

                          return (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h4 style={{ margin: 0, fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', flex: 1 }}>
                                {activeDocType === 'deposit_invoice' && `Official Billing Deposit Invoice (${effectiveDepositPercent}% Due)`}
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
                                  orderPaidAmount >= calculatedDepositVal ? 'DEPOSIT PAID ✓' : 'DEPOSIT PENDING'
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
                                      <span>{effectiveDepositPercent}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                      <span>DEPOSIT AMOUNT DUE:</span>
                                      <span>R {Math.round(calculatedDepositVal).toLocaleString()}</span>
                                    </div>
                                  </>
                                ) : activeDocType === 'balance_invoice' ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                      <span>Total Project Value (Incl VAT):</span>
                                      <span>R {Math.round(finalTotalInclVat).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                      <span>Less: Deposit Paid ({effectiveDepositPercent}%):</span>
                                      <span>R {Math.round(calculatedDepositVal).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 800, fontSize: '13px', borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                      <span>BALANCE OUTSTANDING:</span>
                                      <span>R {Math.round(calculatedBalanceVal).toLocaleString()}</span>
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 800, borderTop: '2px solid #0f172a', paddingTop: '6px', background: '#f8fafc', padding: '6px', borderRadius: '4px' }}>
                                      <span>Balance Outstanding:</span>
                                      <span>R {Math.round(balanceOutstanding).toLocaleString()}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })()}

                        {/* 3. TECHNICAL LIGHTING SCHEDULE OUTFLOW (PRICES COMPLETELY HIDDEN) */}
                        {activeDocType === 'schedule' && (
                          <div>
                            <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '18px', fontSize: '11px', color: '#475569' }}>
                              <strong>TECHNICAL INSTALLATION DIRECTIVE:</strong> This lighting schedule contains exclusively installation and product specification details for site execution. **All pricing structures are hidden** to maintain clean logistics focus on site.
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
                                  <th style={{ padding: '8px', width: '100px' }}>Supplier</th>
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
                                    <td style={{ padding: '8px' }}>{item.supplier || '—'}</td>
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
                                const inStockCount = items.filter(item => 
                                  item.stockStatus === 'In Stock' || 
                                  (item.itemType || item.item_type) === 'Service'
                                ).length;
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

                        {/* CUSTOM DYNAMIC DOCUMENT OUTFLOW FALLBACK */}
                        {!['quote', 'boq_doc', 'schedule', 'deposit_invoice', 'balance_invoice', 'tax_invoice', 'statement'].includes(activeDocType) && (
                          <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', textTransform: 'capitalize' }}>
                              {activeDocType.replace(/_/g, ' ')} Document Preview
                            </h4>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                              <thead>
                                <tr style={{ borderBottom: '2px solid #0f172a', color: '#0f172a', textAlign: 'left', fontWeight: 700 }}>
                                  <th style={{ padding: '6px', width: '40px', textAlign: 'center' }}>#</th>
                                  <th style={{ padding: '6px', width: '120px' }}>Location</th>
                                  <th style={{ padding: '6px', width: '90px' }}>Code</th>
                                  <th style={{ padding: '6px' }}>Description</th>
                                  <th style={{ padding: '6px', width: '40px', textAlign: 'center' }}>Qty</th>
                                  <th style={{ padding: '6px', width: '90px', textAlign: 'right' }}>Unit Retail</th>
                                  <th style={{ padding: '6px', width: '90px', textAlign: 'right' }}>Total Retail</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeOrderItems.map((item, idx) => (
                                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                                    <td style={{ padding: '6px', fontWeight: 500 }}>{item.area || 'General'}</td>
                                    <td style={{ padding: '6px', fontFamily: 'monospace', color: '#0284c7' }}>{item.code || '—'}</td>
                                    <td style={{ padding: '6px' }}>{item.description}</td>
                                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
                                    <td style={{ padding: '6px', textAlign: 'right' }}>R {Math.round(Number(item.unitRetail) || 0).toLocaleString()}</td>
                                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>
                                      R {Math.round((Number(item.qty) || 0) * (Number(item.unitRetail) || 0)).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                              <div style={{ width: '280px', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600, borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                                  <span>Subtotal Excl VAT:</span>
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

                        {/* CUSTOM TERMS AND NOTES BLOCK */}
                        <div style={{ marginTop: '36px', borderTop: '1px solid #cbd5e1', paddingTop: '16px', fontSize: '10.5px', color: '#475569', lineHeight: '1.5' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Notes & Contractual Terms</span>
                          {customTerms}
                        </div>

                            </div>
                          </>
                        )}
                    </div>
                  );
                })()}
              </div>
            )}


            {workspaceSubTab === 'payments' && (
              /* SUB-TAB 3: DEDICATED PALLADIUM PAYMENTS LOG WORKSPACE */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                
                {/* Left Side: Authentic Palladium Allocations Ledger */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-info)' }}>
                          💳 Palladium Payments Received Ledger
                        </h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Live read-only receipts allocated from Palladium ERP ({orderPayments.length} payment{orderPayments.length === 1 ? '' : 's'})
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600 }}
                        onClick={() => navigate('/payments')}
                      >
                        <CreditCard size={13} /> Open Payments & Allocations Hub
                      </button>
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.5px' }}>
                            <th style={{ padding: '8px 10px' }}>Receipt / Doc #</th>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px' }}>Payment Type</th>
                            <th style={{ padding: '8px 10px' }}>Reference / ERP Memo</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount Paid</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderPayments.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '36px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <CreditCard size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>No customer payments allocated yet for this quotation.</div>
                                <div style={{ fontSize: '11.5px', marginTop: '4px' }}>Allocate receipts from Palladium ERP via the Payments Hub.</div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}
                                  onClick={() => navigate('/payments')}
                                >
                                  <CreditCard size={13} /> Go to Payments & Allocations
                                </button>
                              </td>
                            </tr>
                          ) : (
                            orderPayments.map((p, idx) => (
                              <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px', fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>
                                  {p.receipt_no || p.receiptNo || (p.reference && p.reference.startsWith('RC-') ? p.reference : `RC-00000${idx + 1}`)}
                                </td>
                                <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                                  {p.date ? new Date(p.date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span className="badge b-info" style={{ fontSize: '11px', fontWeight: 600 }}>
                                    {p.type || 'Deposit Payment'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', color: 'var(--text-secondary)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.notes || p.reference || '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: 'var(--text-success)', fontSize: '13px' }}>
                                  R {(Number(p.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                    Active ✓
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
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
                    const defaultDepositRate = (finalTotalInclVat < 10000 && finalTotalInclVat > 0) ? 100 : 70;
                    const effectiveDepositPercent = orderDepositPercent !== null && orderDepositPercent !== undefined 
                      ? Number(orderDepositPercent) 
                      : defaultDepositRate;
                    const depositRequired = finalTotalInclVat * (effectiveDepositPercent / 100);
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
                            <span style={{ fontSize: '11px', fontWeight: 600, display: 'block' }}>{effectiveDepositPercent}% Deposit Status</span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                              {depositCleared ? 'Cleared ✓' : `Requires R ${Math.round(Math.max(0, depositRequired - orderPaidAmount)).toLocaleString()} more`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '11.5px', fontWeight: 600 }}
                          onClick={() => navigate('/payments')}
                        >
                          <CreditCard size={13} /> Open Payments & Allocations
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {workspaceSubTab === 'purchasing' && (
              /* SUB-TAB 5: PURCHASING & RECEIVING REFERENCE VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-info)' }}>
                        📋 Purchasing & Receiving Documents
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Purchase Orders and Goods Received Notes issued for this quotation order.</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => navigate('/purchasing', { state: { filterOrderId: selectedOrderId } })}
                    >
                      <ClipboardList size={14} /> Open Purchasing Dashboard
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
                          <th style={{ padding: '10px 12px' }}>Supplier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!activeOrderObject?.purchaseOrders?.length && !activeOrderObject?.goodsReceivedNotes?.length) ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No purchase orders or goods received notes have been generated for this order yet. Go to Purchasing & Receiving to draft one.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {/* Render POs */}
                            {(activeOrderObject?.purchaseOrders || []).map((po, idx) => (
                              <tr key={`po-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                <td 
                                  style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => navigate('/purchasing', { state: { openDocId: po.id, projectKey: activeOrderObject.projectKey } })}
                                >
                                  {po.id}
                                </td>
                                <td style={{ padding: '10px 12px' }}>📋 Purchase Order</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{po.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(po.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}>{po.supplier || '—'}</td>
                              </tr>
                            ))}
                            {/* Render GRNs */}
                            {(activeOrderObject?.goodsReceivedNotes || []).map((grn, idx) => (
                              <tr key={`grn-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                <td 
                                  style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => navigate('/purchasing', { state: { openDocId: grn.id, projectKey: activeOrderObject.projectKey } })}
                                >
                                  {grn.id}
                                </td>
                                <td style={{ padding: '10px 12px' }}>📥 Goods Received Note</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{grn.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(grn.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}>{activeOrderObject.supplier || '—'}</td>
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

            {workspaceSubTab === 'invoices' && (
              /* SUB-TAB 6: INVOICING REFERENCE VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-info)' }}>
                        💵 Client Product Invoices
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Client product invoices generated for this quotation order.</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => navigate('/invoices')}
                    >
                      <FileText size={14} /> Open Invoices Dashboard
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px' }}>Invoice ID</th>
                          <th style={{ padding: '10px 12px' }}>Document Type</th>
                          <th style={{ padding: '10px 12px' }}>Date Issued</th>
                          <th style={{ padding: '10px 12px' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!activeOrderObject?.clientInvoices?.length ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No product invoices have been issued for this order yet. Go to Invoices ledger to create one.
                            </td>
                          </tr>
                        ) : (
                          activeOrderObject.clientInvoices.map((inv, idx) => (
                            <tr key={`inv-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                              <td 
                                style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => navigate('/invoices')}
                              >
                                {inv.id}
                              </td>
                              <td style={{ padding: '10px 12px' }}>💵 Client Product Invoice</td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{inv.date || '—'}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                                R {Number(inv.totalValue || inv.value || inv.amount || (inv.items ? inv.items.reduce((s, it) => s + ((it.qtyAction || it.qty || 0) * (it.unitPrice || it.rate || it.unitCost || 0)), 0) : 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
                                <td 
                                  style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => navigate('/logistics', { state: { openDocId: pl.id, projectKey: pl.projectKey || activeOrderObject.projectKey } })}
                                >
                                  {pl.id}
                                </td>
                                <td style={{ padding: '10px 12px' }}>📋 Packing List / Box Label</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{pl.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(pl.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}><span className="badge b-info">Issued</span></td>
                              </tr>
                            ))}
                            {/* Render Delivery Notes */}
                            {(activeOrderObject?.deliveryNotes || []).map((dn, idx) => (
                              <tr key={`dn-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                                <td 
                                  style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                  onClick={() => navigate('/logistics', { state: { openDocId: dn.id, projectKey: dn.projectKey || activeOrderObject.projectKey } })}
                                >
                                  {dn.id}
                                </td>
                                <td style={{ padding: '10px 12px' }}>🚚 Delivery Note (Waybill)</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{dn.date || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{(dn.items || []).length} items</td>
                                <td style={{ padding: '10px 12px' }}><span className="badge b-success">Delivered</span></td>
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

            {workspaceSubTab === 'credits' && (() => {
              const totalErpCredited = orderCreditNotes.reduce((sum, cn) => sum + Math.abs(Number(cn.totalValue || cn.value || cn.amount || 0)), 0);
              const grossOrderValue = activeOrderItems.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitRetail || item.unit_retail) || 0), 0) * (1 - (orderDiscount || 0) / 100);
              const netOrderValue = Math.max(0, grossOrderValue - totalErpCredited);

              return (
              /* SUB-TAB: CREDITS & RETURNS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* VITAL METRICS CARD GRID FOR CREDITS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total ERP Credit Notes</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-danger)', display: 'block', margin: '4px 0' }}>
                      {orderCreditNotes.length} Document{orderCreditNotes.length === 1 ? '' : 's'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Allocated from Palladium ERP</span>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Retail Credited</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-danger)', display: 'block', margin: '4px 0' }}>
                      -R {totalErpCredited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Customer credit deduction</span>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Order Value</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', margin: '4px 0' }}>
                      R {netOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Gross order minus total ERP credits</span>
                  </div>
                </div>

                {/* 1. OFFICIAL PALLADIUM ERP CREDIT NOTES TABLE */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-danger)' }}>
                        🔴 Official Palladium ERP Credit Notes ({orderCreditNotes.length})
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Credit Notes allocated from Palladium ERP against this quotation order.</span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => navigate('/invoices')}
                    >
                      <FileText size={14} /> Open Invoices Workspace
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          <th style={{ padding: '10px 12px' }}>Document ID</th>
                          <th style={{ padding: '10px 12px' }}>Document Type</th>
                          <th style={{ padding: '10px 12px' }}>Date Issued</th>
                          <th style={{ padding: '10px 12px' }}>Items Credited</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Credited Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderCreditNotes.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No Credit Notes have been allocated to this order yet. Go to Invoices workspace to allocate pending Credit Notes from Palladium.
                            </td>
                          </tr>
                        ) : (
                          orderCreditNotes.map((cn, idx) => (
                            <tr key={`cn-${idx}`} style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}>
                              <td 
                                style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-danger)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => navigate('/invoices')}
                              >
                                {cn.id}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--text-danger)', fontSize: '10.5px', fontWeight: 700 }}>
                                  🔴 Credit Note (ERP)
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{String(cn.date || '').split('T')[0] || '—'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {cn.items?.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {cn.items.map((it, iIdx) => (
                                      <span key={iIdx} style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                                        {it.code} (Qty: {Math.abs(Number(it.qtyAction || it.qty || 1))})
                                      </span>
                                    ))}
                                  </div>
                                ) : `${cn.items?.length || 1} items`}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-danger)', textAlign: 'right' }}>
                                -R {Math.abs(Number(cn.totalValue || cn.value || cn.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. ITEMIZED CREDITED LINES BREAKDOWN TABLE */}
                {erpCreditedItems.length > 0 && (
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-danger)' }}>
                        📋 Itemized Credited Line Items ({erpCreditedItems.length})
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All individual line items credited across allocated Palladium ERP Credit Notes.</span>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--text-danger)', fontWeight: 700 }}>
                            <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '10px 12px', width: '140px' }}>Credit Note #</th>
                            <th style={{ padding: '10px 12px', width: '110px' }}>Date Issued</th>
                            <th style={{ padding: '10px 12px', width: '160px' }}>Item Code</th>
                            <th style={{ padding: '10px 12px' }}>Description</th>
                            <th style={{ padding: '10px 12px', width: '110px', textAlign: 'right' }}>Unit Retail</th>
                            <th style={{ padding: '10px 12px', width: '120px', textAlign: 'right' }}>Total Credited</th>
                            <th style={{ padding: '10px 12px', width: '140px' }}>Allocated By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {erpCreditedItems.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.02)' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-danger)' }}>
                                {item.qty}
                              </td>
                              <td 
                                style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-danger)', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => navigate('/invoices')}
                              >
                                🔴 {item.creditNoteId}
                              </td>
                              <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                {String(item.creditNoteDate || '').split('T')[0] || '—'}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.code}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                {item.description}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                R {item.unitRetail?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-danger)', fontFamily: 'monospace' }}>
                                -R {Math.abs(item.totalRetail || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {item.allocatedBy || 'Palladium ERP'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}



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
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Quote / Order Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. General Lighting, Extras 2"
                    value={newPoForm.quote_name || ''} 
                    onChange={e => setNewPoForm({...newPoForm, quote_name: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Linked Project</label>
                  <input
                    type="text"
                    placeholder="🔍 Filter project name..."
                    className="form-control"
                    style={{ marginBottom: '6px', fontSize: '12px', padding: '6px 10px', height: '30px' }}
                    value={poProjectSearch}
                    onChange={e => {
                      const search = e.target.value;
                      setPoProjectSearch(search);
                      const filtered = Object.values(projects).filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
                      if (filtered.length > 0) {
                        setNewPoForm(prev => ({ ...prev, projectKey: filtered[0].key }));
                      }
                    }}
                  />
                  <select 
                    className="form-control" 
                    value={newPoForm.projectKey} 
                    onChange={e => setNewPoForm({...newPoForm, projectKey: e.target.value})}
                  >
                    {Object.values(projects)
                      .filter(p => p.name.toLowerCase().includes(poProjectSearch.toLowerCase()))
                      .map(p => (
                        <option key={p.key} value={p.key}>{p.name}</option>
                      ))}
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
                      <option>Draft</option>
                      <option>Pending</option>
                      <option>Ongoing</option>
                      <option>Complete</option>
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


      
      </div>

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
                <input
                  type="text"
                  placeholder="🔍 Filter project name..."
                  className="form-control"
                  style={{ marginBottom: '6px', fontSize: '12px', padding: '6px 10px', height: '30px' }}
                  value={linkProjectSearch}
                  onChange={e => {
                    const search = e.target.value;
                    setLinkProjectSearch(search);
                    const filtered = Object.values(projects).filter(p => p.projectType !== 'Client-Direct' && p.name.toLowerCase().includes(search.toLowerCase()));
                    if (filtered.length > 0) {
                      const nextKey = filtered[0].key;
                      setLinkProjectKey(nextKey);
                      if (!linkClient && filtered[0].client) {
                        setLinkClient(filtered[0].client);
                      }
                    }
                  }}
                />
                <select 
                  className="form-control" 
                  value={linkProjectKey} 
                  onChange={e => {
                    const nextKey = e.target.value;
                    setLinkProjectKey(nextKey);
                    if (nextKey && !linkClient) {
                      const proj = projects[nextKey];
                      if (proj && proj.client) {
                        setLinkClient(proj.client);
                      }
                    }
                  }}
                >
                  <option value="">-- Client Direct / No Project --</option>
                  {Object.values(projects)
                    .filter(p => p.projectType !== 'Client-Direct' && p.name.toLowerCase().includes(linkProjectSearch.toLowerCase()))
                    .map(p => (
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
                >
                  <option value="">-- Select Client --</option>
                  {combinedContacts.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.company || 'Private'})</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Linking Note:</strong> Orders can be assigned any custom client while remaining linked to their project.
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setLinkModalItem(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  const targetClient = combinedContacts.find(c => c.name === linkClient) || {};
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

      {selectedCatalogProduct && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
          <div className="modal-container" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', width: '920px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 35px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📖 Fitting Specifications: {selectedCatalogProduct.name || selectedCatalogProduct.sku}
                </span>
                {selectedCatalogProduct.one_to_one_code && (
                  <span className="badge b-info" style={{ fontSize: '11px', padding: '2px 8px', fontFamily: 'monospace', fontWeight: 700 }}>
                    {selectedCatalogProduct.one_to_one_code}
                  </span>
                )}
                <span className="badge b-ghost" style={{ fontSize: '11px', padding: '2px 6px', fontFamily: 'monospace' }}>
                  SKU: {selectedCatalogProduct.sku}
                </span>
                <span className={`badge ${selectedCatalogProduct.selection?.toLowerCase().includes('non') ? 'b-ghost' : 'b-success'}`} style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 700 }}>
                  {selectedCatalogProduct.selection || 'Selection'}
                </span>
              </div>
              <button style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setSelectedCatalogProduct(null)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Client Description Heading */}
              {selectedCatalogProduct.client_description && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>Client Specification Description</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {selectedCatalogProduct.client_description}
                  </div>
                </div>
              )}

              {/* DUAL COLUMN: Visuals on Left, Specs on Right */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '18px' }}>
                
                {/* LEFT: Visual Photo & CAD Drawing */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Photo Card */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                      📷 Product Visual Asset
                    </span>
                    <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      {selectedCatalogProduct.image_url ? (
                        <img
                          src={selectedCatalogProduct.image_url.startsWith('http') ? selectedCatalogProduct.image_url : `${API_BASE}${selectedCatalogProduct.image_url}`}
                          alt={selectedCatalogProduct.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)' }}>
                          <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px', opacity: 0.6 }}>📷</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Visual Photo</div>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedCatalogProduct.family || selectedCatalogProduct.category || 'Catalog Spec'}
                    </div>
                  </div>

                  {/* CAD Drawing Card */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                      📐 Technical / CAD Drawing
                    </span>
                    <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      {selectedCatalogProduct.technical_image_url ? (
                        <img
                          src={selectedCatalogProduct.technical_image_url.startsWith('http') ? selectedCatalogProduct.technical_image_url : `${API_BASE}${selectedCatalogProduct.technical_image_url}`}
                          alt={`${selectedCatalogProduct.name} CAD`}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)' }}>
                          <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px', opacity: 0.6 }}>📐</span>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>No CAD Drawing</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PDF Spec Sheet Link */}
                  {(selectedCatalogProduct.qr_link || selectedCatalogProduct.spec_sheet_url) && (
                    <a 
                      href={selectedCatalogProduct.qr_link || selectedCatalogProduct.spec_sheet_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-outline" 
                      style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', padding: '8px' }}
                    >
                      <FileText size={14} color="var(--text-info)" /> Open Official Spec Sheet (PDF) ↗
                    </a>
                  )}
                </div>

                {/* RIGHT: Technical Specifications & Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Optical Performance Metrics KPI */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      💡 Optical & Fitting Performance
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Power</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedCatalogProduct.system_power ? `${selectedCatalogProduct.system_power} W` : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Kelvin (CCT)</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedCatalogProduct.kelvin || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Color Rendering</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedCatalogProduct.cri ? (String(selectedCatalogProduct.cri).toUpperCase().startsWith('CRI') ? selectedCatalogProduct.cri : `CRI ${selectedCatalogProduct.cri}`) : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Beam Angle</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedCatalogProduct.beam_angle || '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>IP Rating</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {selectedCatalogProduct.ip_rating ? (String(selectedCatalogProduct.ip_rating).toUpperCase().startsWith('IP') || String(selectedCatalogProduct.ip_rating).toLowerCase().includes('non') ? selectedCatalogProduct.ip_rating : `IP${selectedCatalogProduct.ip_rating}`) : '—'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Cutout</span>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                          {selectedCatalogProduct.cutout || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dimming & Light Source Specifications */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 700, color: 'var(--text-warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚡ Control, Dimming & Light Source
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Brand:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.brand || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Dimmable:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.dimmable || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Dimming Protocol:</span>
                        <div style={{ fontWeight: 700, color: 'var(--text-info)' }}>{selectedCatalogProduct.dimming_protocol || 'On-Off'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Driver Included:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.driver_incl || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Light Source Included:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.light_source_incl || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Light Source Type:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.light_source_type || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Finish / Color:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.color || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>FOH Code:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.foh_code_description || '—'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Origin:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCatalogProduct.local_or_import || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Wetworks & Installation Specifications Card */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🌊 Wetworks & Installation Constraints
                    </h4>
                    <div style={{ 
                      background: 'rgba(245, 158, 11, 0.06)', 
                      border: '1px solid rgba(245, 158, 11, 0.25)', 
                      borderRadius: '6px', 
                      padding: '10px 12px', 
                      fontSize: '11.5px', 
                      lineHeight: '1.5', 
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-line'
                    }}>
                      {selectedCatalogProduct.wetworks ? selectedCatalogProduct.wetworks : 'No special wetworks or installation constraints recorded.'}
                    </div>
                  </div>

                </div>

              </div>

              {/* FINANCIAL & INVENTORY COORDINATES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', background: 'rgba(24, 95, 165, 0.03)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(24, 95, 165, 0.12)' }}>
                <div>
                  <h4 style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-info)', fontWeight: 700, borderBottom: '1.5px solid rgba(24, 95, 165, 0.2)', paddingBottom: '4px', marginBottom: '8px' }}>Pricing Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11.5px' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Cost Price:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>R {Math.round(selectedCatalogProduct.cost_price || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Trade Price:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>R {Math.round(selectedCatalogProduct.trade_price || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Retail Price:</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-info)' }}>R {Math.round(selectedCatalogProduct.retail_price || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-info)', fontWeight: 700, borderBottom: '1.5px solid rgba(24, 95, 165, 0.2)', paddingBottom: '4px', marginBottom: '8px' }}>Inventory Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11.5px' }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Stock Level:</span>
                      <div style={{ fontWeight: 700, color: selectedCatalogProduct.stock_level > 0 ? 'var(--text-success)' : 'var(--text-warning)' }}>
                        {selectedCatalogProduct.stock_level > 0 ? `${selectedCatalogProduct.stock_level} In Stock` : 'Out of Stock'}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)' }}>Lead Time:</span>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedCatalogProduct.lead_time || '4 weeks'}</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)' }}>
              <button className="btn" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }} onClick={() => setSelectedCatalogProduct(null)}>Close</button>
              <button 
                className="btn btn-primary" 
                style={{ padding: '6px 16px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }} 
                onClick={() => {
                  handleAddProductToOrder(selectedCatalogProduct);
                  setSelectedCatalogProduct(null);
                }}
              >
                + Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
