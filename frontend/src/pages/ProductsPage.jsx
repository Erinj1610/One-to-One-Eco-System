import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  ArrowLeft, Search, Plus, FileText, Download, ShieldCheck, Mail, Globe, Phone, MapPin, 
  Truck, CreditCard, Clock, Star, TrendingUp, AlertTriangle, Package, Percent, Info, Settings
} from 'lucide-react';

// Actual product list parsed from the user's architectural lighting database
const initialProducts = [
  {
    id: 1,
    sku: '28402 9240 FW',
    name: 'Downlight - Entero RD-S 14W 2700K 30° IP20 White',
    family: 'Entero RD-S',
    category: 'Downlight',
    supplier: 'ELDC',
    brand: 'Delta Light',
    unitCost: 2416.37,
    retailPrice: 3835.50,
    tradePrice: 3451.95,
    margin: 37.0,
    markup: '58.73%',
    stock: 100,
    reorderLevel: 100,
    status: 'In Stock',
    leadTime: '6-8 Weeks',
    origin: 'Import',
    color: 'White',
    dimmable: 'Yes',
    dimmingProtocol: 'Driver Dependent',
    driverIncl: 'No',
    lightSourceIncl: 'Yes',
    lightSourceType: 'LED',
    kelvin: '2700K',
    beamAngle: '30°',
    cri: '90',
    ipRating: 'IP20',
    systemPower: 14.0,
    lightingType: 'Architectural',
    cutout: 'Ø76mm',
    driverSpec: '- External or Remote Driver (Check Driver Wetworks)\n- 1 Fitting per Driver\n- Direct Connection\n- Max Distance(Driver>Fitting): 1m away using 0.5mm cable',
    accessories: [
      { code: '28500 0060 B', desc: 'Entero RD-S Mounting Kit' },
      { code: '28500 0050 B', desc: 'Entero S Driver' }
    ],
    costing: {
      supplierSku: '28402 9240 FW',
      supplierUnitCost: 2416.37,
      supplierDiscount: 0,
      landedCost: 2780.00,
      lastUpdated: 'Jan 25, 2026',
      tiers: [
        { name: 'Retail / RRP', retailPrice: 3835.50, discount: 0, netRetail: 3835.50, margin: 37 },
        { name: 'Trade / Partner', retailPrice: 3835.50, discount: 10, netRetail: 3451.95, margin: 22 },
        { name: 'Contract Deal', retailPrice: 3835.50, discount: 15, netRetail: 3260.18, margin: 15 }
      ],
      avgMargin: 37,
      profitPerUnit: 1419.13,
      contactInfo: {
        company: 'ELDC Lighting Distribution',
        website: 'www.eldc.co.za',
        email: 'projects@eldc.co.za',
        phone: '+27 (0) 21 448 8658'
      },
      terms: 'Standard ELDC payment structure: 50% deposit, balance paid in full prior to release.'
    },
    supplierDetails: {
      name: 'ELDC Lighting Distribution',
      contactPerson: 'Alex Venter',
      role: 'Technical Procurement Lead',
      email: 'alex.venter@eldc.co.za',
      phone: '+27 82 458 9011',
      address: '22 Somerset Road, Green Point, Cape Town',
      leadTime: '6-8 Weeks',
      paymentTerms: '50/50 Deposit & COD',
      shippingMethod: 'Sea Freight (LCL)'
    },
    stockHistory: [
      { date: '05 Jun 2026', type: 'Stock In', reference: 'PO-2025-084', qty: '+50', balance: 100, staff: 'Dani' },
      { date: '29 May 2026', type: 'Stock Out', reference: 'SO-2025-142', qty: '-8', balance: 50, staff: 'Martin' },
      { date: '15 May 2026', type: 'Stock In', reference: 'PO-2025-072', qty: '+30', balance: 58, staff: 'Alex' },
      { date: '02 May 2026', type: 'Stock Out', reference: 'SO-2025-119', qty: '-12', balance: 28, staff: 'Sarah' }
    ]
  },
  {
    id: 2,
    sku: '28402 9240 B',
    name: 'Downlight - Entero RD-S 14W 2700K 30° IP20 Black',
    family: 'Entero RD-S',
    category: 'Downlight',
    supplier: 'ELDC',
    brand: 'Delta Light',
    unitCost: 2416.37,
    retailPrice: 3835.50,
    tradePrice: 3451.95,
    margin: 37.0,
    markup: '58.73%',
    stock: 85,
    reorderLevel: 100,
    status: 'Low Stock',
    leadTime: '6-8 Weeks',
    origin: 'Import',
    color: 'Black',
    dimmable: 'Yes',
    dimmingProtocol: 'Driver Dependent',
    driverIncl: 'No',
    lightSourceIncl: 'Yes',
    lightSourceType: 'LED',
    kelvin: '2700K',
    beamAngle: '30°',
    cri: '90',
    ipRating: 'IP20',
    systemPower: 14.0,
    lightingType: 'Architectural',
    cutout: 'Ø76mm',
    driverSpec: '- External or Remote Driver (Check Driver Wetworks)\n- 1 Fitting per Driver\n- Direct Connection\n- Max Distance(Driver>Fitting): 1m away using 0.5mm cable',
    accessories: [
      { code: '28500 0060 B', desc: 'Entero RD-S Mounting Kit' },
      { code: '28500 0050 B', desc: 'Entero S Driver' }
    ],
    costing: {
      supplierSku: '28402 9240 B',
      supplierUnitCost: 2416.37,
      supplierDiscount: 0,
      landedCost: 2780.00,
      lastUpdated: 'Jan 25, 2026',
      tiers: [
        { name: 'Retail / RRP', retailPrice: 3835.50, discount: 0, netRetail: 3835.50, margin: 37 },
        { name: 'Trade / Partner', retailPrice: 3835.50, discount: 10, netRetail: 3451.95, margin: 22 }
      ],
      avgMargin: 37,
      profitPerUnit: 1419.13,
      contactInfo: {
        company: 'ELDC Lighting Distribution',
        website: 'www.eldc.co.za',
        email: 'projects@eldc.co.za',
        phone: '+27 (0) 21 448 8658'
      },
      terms: 'Standard terms.'
    },
    supplierDetails: {
      name: 'ELDC Lighting Distribution',
      contactPerson: 'Alex Venter',
      role: 'Technical Procurement Lead',
      email: 'alex.venter@eldc.co.za',
      phone: '+27 82 458 9011',
      address: '22 Somerset Road, Green Point, Cape Town',
      leadTime: '6-8 Weeks',
      paymentTerms: '50/50 Deposit & COD',
      shippingMethod: 'Sea Freight (LCL)'
    },
    stockHistory: [
      { date: '01 Jun 2026', type: 'Stock In', reference: 'PO-2025-081', qty: '+25', balance: 85, staff: 'Dani' },
      { date: '20 May 2026', type: 'Stock Out', reference: 'SO-2025-139', qty: '-5', balance: 60, staff: 'Martin' }
    ]
  },
  {
    id: 3,
    sku: '28439 9240 FW',
    name: 'Downlight - Entero RD-S X 10W 2700K 30° IP65 White',
    family: 'Entero RD-S X',
    category: 'Downlight',
    supplier: 'ELDC',
    brand: 'Delta Light',
    unitCost: 3930.74,
    retailPrice: 6239.26,
    tradePrice: 5615.33,
    margin: 37.0,
    markup: '58.73%',
    stock: 0,
    reorderLevel: 20,
    status: 'Out of Stock',
    leadTime: '6-8 Weeks',
    origin: 'Import',
    color: 'White',
    dimmable: 'Yes',
    dimmingProtocol: 'Driver Dependent',
    driverIncl: 'No',
    lightSourceIncl: 'Yes',
    lightSourceType: 'LED',
    kelvin: '2700K',
    beamAngle: '30°',
    cri: '90',
    ipRating: 'IP65',
    systemPower: 10.0,
    lightingType: 'Architectural',
    cutout: 'Ø76mm',
    driverSpec: '- External or Remote Driver (Check Driver Wetworks)\n- 1 Fitting per Driver\n- Direct Connection',
    accessories: [
      { code: '28500 0050 B', desc: 'Entero S X Driver' }
    ],
    costing: {
      supplierSku: '28439 9240 FW',
      supplierUnitCost: 3930.74,
      supplierDiscount: 0,
      landedCost: 4520.00,
      lastUpdated: 'Mar 15, 2026',
      tiers: [
        { name: 'Retail / RRP', retailPrice: 6239.26, discount: 0, netRetail: 6239.26, margin: 37 },
        { name: 'Trade / Partner', retailPrice: 6239.26, discount: 10, netRetail: 5615.33, margin: 22 }
      ],
      avgMargin: 37,
      profitPerUnit: 2308.52,
      contactInfo: {
        company: 'ELDC Lighting Distribution',
        website: 'www.eldc.co.za',
        email: 'projects@eldc.co.za',
        phone: '+27 (0) 21 448 8658'
      },
      terms: 'Import indent terms.'
    },
    supplierDetails: {
      name: 'ELDC Lighting Distribution',
      contactPerson: 'Alex Venter',
      role: 'Technical Procurement Lead',
      email: 'alex.venter@eldc.co.za',
      phone: '+27 82 458 9011',
      address: '22 Somerset Road, Green Point, Cape Town',
      leadTime: '6-8 Weeks',
      paymentTerms: '50/50 Deposit & COD',
      shippingMethod: 'Sea Freight (LCL)'
    },
    stockHistory: [
      { date: '10 May 2026', type: 'Stock Out', reference: 'SO-2025-112', qty: '-4', balance: 0, staff: 'Sarah' }
    ]
  },
  {
    id: 4,
    sku: '11525 9220 B-B',
    name: 'Downlight - Dot.com Surface L4 ON 14W 2700K 32° IP20 Black/Black',
    family: 'Dot.com',
    category: 'Downlight',
    supplier: 'ELDC',
    brand: 'Delta Light',
    unitCost: 5699.35,
    retailPrice: 9046.57,
    tradePrice: 8141.91,
    margin: 37.0,
    markup: '58.73%',
    stock: 15,
    reorderLevel: 5,
    status: 'In Stock',
    leadTime: '6-8 Weeks',
    origin: 'Import',
    color: 'Black/Black-Insert',
    dimmable: 'No',
    dimmingProtocol: 'On-Off',
    driverIncl: 'Yes',
    lightSourceIncl: 'Yes',
    lightSourceType: 'LED',
    kelvin: '2700K',
    beamAngle: '32°',
    cri: '90',
    ipRating: 'IP20',
    systemPower: 14.0,
    lightingType: 'Architectural',
    cutout: 'Surface mounted',
    driverSpec: '- Integrated Driver\n- 1 Fitting per Driver\n- Direct 220-240VAC Connection to Driver',
    accessories: [],
    costing: {
      supplierSku: '11525 9220 B-B',
      supplierUnitCost: 5699.35,
      supplierDiscount: 0,
      landedCost: 6554.00,
      lastUpdated: 'Feb 10, 2026',
      tiers: [
        { name: 'Retail / RRP', retailPrice: 9046.57, discount: 0, netRetail: 9046.57, margin: 37 },
        { name: 'Trade / Partner', retailPrice: 9046.57, discount: 10, netRetail: 8141.91, margin: 22 }
      ],
      avgMargin: 37,
      profitPerUnit: 3347.22,
      contactInfo: {
        company: 'ELDC Lighting Distribution',
        website: 'www.eldc.co.za',
        email: 'projects@eldc.co.za',
        phone: '+27 (0) 21 448 8658'
      },
      terms: 'Standard trade guidelines.'
    },
    supplierDetails: {
      name: 'ELDC Lighting Distribution',
      contactPerson: 'Alex Venter',
      role: 'Technical Procurement Lead',
      email: 'alex.venter@eldc.co.za',
      phone: '+27 82 458 9011',
      address: '22 Somerset Road, Green Point, Cape Town',
      leadTime: '6-8 Weeks',
      paymentTerms: '50/50 Deposit & COD',
      shippingMethod: 'Sea Freight (LCL)'
    },
    stockHistory: [
      { date: '12 May 2026', type: 'Stock In', reference: 'PO-2025-068', qty: '+15', balance: 15, staff: 'Alex' }
    ]
  },
  {
    id: 5,
    sku: 'C00467GGMML',
    name: 'Downlight - Portik_R Surface 7.5W 2700K 37° IP65 Grey',
    family: 'Portik_R',
    category: 'Downlight',
    supplier: 'ELDC',
    brand: 'Linea Light',
    unitCost: 1350.32,
    retailPrice: 2143.36,
    tradePrice: 1929.02,
    margin: 37.0,
    markup: '58.73%',
    stock: 40,
    reorderLevel: 25,
    status: 'In Stock',
    leadTime: '6-8 Weeks',
    origin: 'Import',
    color: 'Grey',
    dimmable: 'No',
    dimmingProtocol: 'On-Off',
    driverIncl: 'Yes',
    lightSourceIncl: 'Yes',
    lightSourceType: 'LED',
    kelvin: '2700K',
    beamAngle: '37°',
    cri: '80',
    ipRating: 'IP65',
    systemPower: 7.5,
    lightingType: 'Architectural',
    cutout: 'Surface Mount',
    driverSpec: '- Integrated Driver\n- 1 Fitting per Driver\n- Direct 220-240VAC Connection to Driver',
    accessories: [],
    costing: {
      supplierSku: 'C00467GGMML',
      supplierUnitCost: 1350.32,
      supplierDiscount: 0,
      landedCost: 1550.00,
      lastUpdated: 'Apr 05, 2026',
      tiers: [
        { name: 'Retail / RRP', retailPrice: 2143.36, discount: 0, netRetail: 2143.36, margin: 37 },
        { name: 'Trade / Partner', retailPrice: 2143.36, discount: 10, netRetail: 1929.02, margin: 22 }
      ],
      avgMargin: 37,
      profitPerUnit: 793.04,
      contactInfo: {
        company: 'ELDC Lighting Distribution',
        website: 'www.eldc.co.za',
        email: 'projects@eldc.co.za',
        phone: '+27 (0) 21 448 8658'
      },
      terms: 'Immediate release terms.'
    },
    supplierDetails: {
      name: 'ELDC Lighting Distribution',
      contactPerson: 'Alex Venter',
      role: 'Technical Procurement Lead',
      email: 'alex.venter@eldc.co.za',
      phone: '+27 82 458 9011',
      address: '22 Somerset Road, Green Point, Cape Town',
      leadTime: '6-8 Weeks',
      paymentTerms: '50/50 Deposit & COD',
      shippingMethod: 'Sea Freight (LCL)'
    },
    stockHistory: [
      { date: '18 May 2026', type: 'Stock In', reference: 'PO-2025-075', qty: '+40', balance: 40, staff: 'Dani' }
    ]
  }
];

// Vector Downlight Drawing SVG Components
const ProductImageRenderer = ({ type, color = '#1a202c', width = "100%", height = 240 }) => {
  return (
    <svg width={width} height={height} viewBox="0 0 400 300" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      {/* Ceiling Profile Line */}
      <line x1="40" y1="80" x2="360" y2="80" stroke="var(--border-strong)" strokeWidth="3" />
      
      {/* Light glow (translucent gradient beam) */}
      <polygon points="200,80 80,260 320,260" fill="url(#pendantBeam)" opacity="0.3" />

      {/* Downlight Fixture (Recessed shape) */}
      <rect x="150" y="50" width="100" height="30" fill="#2d3748" rx="2" />
      <path d="M 140 80 Q 200 85 260 80" fill="none" stroke="#718096" strokeWidth="2" />
      
      {/* Inner Bevel & Reflector */}
      <ellipse cx="200" cy="80" rx="45" ry="10" fill="#1a202c" stroke="#4a5568" strokeWidth="1" />
      <ellipse cx="200" cy="80" rx="35" ry="7" fill="#edf2f7" />
      <circle cx="200" cy="80" r="10" fill="#fff" filter="blur(3px)" /> {/* LED COB Chip */}

      {/* Decorative details */}
      <text x="200" y="275" fill="var(--text-tertiary)" fontSize="10.5" fontWeight="600" textAnchor="middle">RECESSED DOWNLIGHT</text>

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
      {/* Grid Lines */}
      <line x1="30" y1="0" x2="30" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="120" y1="0" x2="120" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="210" y1="0" x2="210" y2="240" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="0" y1="80" x2="240" y2="80" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
      <line x1="0" y1="160" x2="240" y2="160" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />

      {/* Ceiling Plane */}
      <line x1="20" y1="100" x2="220" y2="100" stroke="var(--text-info)" strokeWidth="1.5" />
      
      {/* Downlight Outline */}
      <rect x="70" y="60" width="100" height="40" fill="none" stroke="var(--text-info)" strokeWidth="1.5" />
      <path d="M 60 100 L 180 100" stroke="var(--text-info)" strokeWidth="2" />
      <ellipse cx="120" cy="100" rx="50" ry="10" fill="none" stroke="var(--text-info)" strokeWidth="1" />
      <circle cx="120" cy="100" r="12" fill="none" stroke="var(--text-tertiary)" strokeWidth="0.75" />

      {/* Spring Clips */}
      <path d="M 70 80 Q 50 60 45 70" fill="none" stroke="var(--text-info)" strokeWidth="1" />
      <path d="M 170 80 Q 190 60 195 70" fill="none" stroke="var(--text-info)" strokeWidth="1" />

      {/* Dimensions Annotations */}
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

// SVG Stock Level Trend Line Chart
const StockTrendChart = ({ history }) => {
  if (!history || history.length === 0) return null;
  
  const balances = [...history].reverse().map(h => h.balance);
  const dates = [...history].reverse().map(h => h.date);

  const maxVal = Math.max(...balances, 10) * 1.25;
  const chartWidth = 550;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 25;
  
  const points = balances.map((val, idx) => {
    const x = paddingX + (idx * (chartWidth - paddingX * 2)) / (balances.length - 1 || 1);
    const y = chartHeight - paddingY - (val * (chartHeight - paddingY * 2)) / maxVal;
    return { x, y, val, date: dates[idx] };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z` 
    : '';

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 24px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={15} color="var(--text-info)" /> Inventory Stock Trend History
        </h4>
        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Based on recent transactions & audits</span>
      </div>
      
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
        {/* Fill Area Gradient */}
        {areaPath && <path d={areaPath} fill="url(#chartGlow)" />}
        
        {/* Main Line Stroke */}
        {linePath && <path d={linePath} fill="none" stroke="var(--text-info)" strokeWidth="2.5" strokeLinecap="round" />}
        
        {/* Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={paddingX} y1={(chartHeight - paddingY * 2) / 2 + paddingY} x2={chartWidth - paddingX} y2={(chartHeight - paddingY * 2) / 2 + paddingY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="var(--border)" strokeWidth="0.5" />

        {/* Data Nodes */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-primary)" stroke="var(--text-info)" strokeWidth="2" />
            
            {/* Tooltip Qty Badge */}
            <text x={p.x} y={p.y - 12} fill="var(--text-primary)" fontSize="9" fontWeight="700" textAnchor="middle">
              {p.val}
            </text>
            
            {/* Horizontal Timeline Labels */}
            <text x={p.x} y={chartHeight - 8} fill="var(--text-secondary)" fontSize="8.5" textAnchor="middle">
              {p.date}
            </text>
          </g>
        ))}

        <defs>
          <linearGradient id="chartGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--text-info)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--text-info)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default function ProductsPage() {
  const { getModuleName } = useStore();
  // Local state for product list
  const [products, setProducts] = useState([]);
  const [selectedSku, setSelectedSku] = useState(null); // String e.g. '28402 9240 FW'
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'costing' | 'supplier' | 'history'

  // Fetch products from database
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) {
        const data = await res.json();
        // Map db properties to mockup properties
        const mapped = data.map(p => ({
          ...p,
          unitCost: p.cost_price || 0.0,
          retailPrice: p.retail_price || 0.0,
          tradePrice: p.trade_price || 0.0,
          stock: p.stock_level || 0,
          reorderLevel: p.reorder_level || 100,
          status: p.stock_level === 0 ? 'Out of Stock' : p.stock_level <= (p.reorder_level || 100) ? 'Low Stock' : 'In Stock'
        }));
        setProducts(mapped);
      } else {
        console.error("Failed to fetch products from DB");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Workspace Local Editing States to prevent Stock History bug
  const [editingStatus, setEditingStatus] = useState('In Stock');
  const [editingStock, setEditingStock] = useState(0);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Toast System
  const [toast, setToast] = useState({ show: false, message: '' });

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Downlight');
  const [newSupplier, setNewSupplier] = useState('ELDC');
  const [newBrand, setNewBrand] = useState('Delta Light');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newRetailPrice, setNewRetailPrice] = useState('');
  const [newStock, setNewStock] = useState('50');
  const [newReorder, setNewReorder] = useState('100');

  // Trigger temporary Toast
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);
  };

  // Get currently selected product details
  const activeProduct = useMemo(() => {
    return products.find(p => p.sku === selectedSku) || null;
  }, [products, selectedSku]);

  // Synchronize editing variables when SKU changes
  useEffect(() => {
    if (activeProduct) {
      setEditingStatus(activeProduct.status);
      setEditingStock(activeProduct.stock);
    }
  }, [selectedSku, activeProduct]);

  // Date Range Checker
  const isProductInDateRange = (p) => {
    if (!startDate && !endDate) return true;
    const updateStr = p.costing?.lastUpdated;
    if (!updateStr) return false;
    const pDate = new Date(updateStr);
    if (isNaN(pDate.getTime())) return false;

    if (startDate) {
      const start = new Date(startDate);
      if (pDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (pDate > end) return false;
    }
    return true;
  };

  // Preset Date Helper
  const applyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Last Week') {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(lastWeek));
      setEndDate(formatDate(today));
    } else if (preset === 'Last 30 Days') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(lastMonth));
      setEndDate(formatDate(today));
    }
  };

  // Filter list of products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Date Check
      if (!isProductInDateRange(p)) return false;

      // Category filter
      if (categoryFilter !== 'All Categories' && p.category !== categoryFilter) return false;

      // Supplier filter
      if (supplierFilter !== 'All Suppliers' && p.supplier !== supplierFilter) return false;

      // Search Query SKU / Name / Supplier
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = 
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, supplierFilter, startDate, endDate]);

  // Aggregate stats based on products list
  const kpis = useMemo(() => {
    const totalSku = products.length;
    const lowStock = products.filter(p => p.stock <= p.reorderLevel && p.stock > 0).length;
    const outStock = products.filter(p => p.stock === 0).length;
    
    // Average Margin of products
    const sumMargin = products.reduce((acc, p) => acc + (p.margin || 37), 0);
    const avgMargin = totalSku > 0 ? Math.round(sumMargin / totalSku) : 37;

    // Aggregate Valuation & Profit
    const totalVal = products.reduce((acc, p) => acc + (p.unitCost * p.stock), 0);
    const totalMargin = products.reduce((acc, p) => acc + ((p.retailPrice - p.unitCost) * p.stock), 0);

    return {
      totalSku,
      lowStock,
      outStock,
      avgMargin,
      totalVal,
      totalMargin
    };
  }, [products]);

  // Commit changes from Workspace Engine (Save button trigger)
  const handleCommitChanges = async () => {
    if (!activeProduct) return;
    
    const qty = editingStock;

    const payload = {
      name: activeProduct.name,
      brand: activeProduct.brand,
      sku: activeProduct.sku,
      cost_price: activeProduct.unitCost || activeProduct.cost_price || 0.0,
      retail_price: activeProduct.retailPrice || activeProduct.retail_price || 0.0,
      trade_price: activeProduct.tradePrice || activeProduct.trade_price || 0.0,
      stock_level: qty,
      reorder_level: activeProduct.reorderLevel || activeProduct.reorder_level || 100,
      supplier_id: activeProduct.supplier_id,
      family: activeProduct.family,
      category: activeProduct.category,
      lead_time: activeProduct.leadTime || activeProduct.lead_time,
      origin: activeProduct.origin,
      color: activeProduct.color,
      dimmable: activeProduct.dimmable,
      dimming_protocol: activeProduct.dimmingProtocol || activeProduct.dimming_protocol,
      driver_incl: activeProduct.driverIncl || activeProduct.driver_incl,
      light_source_incl: activeProduct.lightSourceIncl || activeProduct.light_source_incl,
      light_source_type: activeProduct.lightSourceType || activeProduct.light_source_type,
      kelvin: activeProduct.kelvin,
      beam_angle: activeProduct.beamAngle || activeProduct.beam_angle,
      cri: activeProduct.cri,
      ip_rating: activeProduct.ipRating || activeProduct.ip_rating,
      system_power: activeProduct.systemPower || activeProduct.system_power,
      lighting_type: activeProduct.lightingType || activeProduct.lighting_type,
      cutout: activeProduct.cutout,
      driver_spec: activeProduct.driverSpec || activeProduct.driver_spec
    };

    try {
      const res = await fetch(`${API_BASE}/api/products/${activeProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast(`Changes committed successfully for ${activeProduct.sku}!`);
        fetchProducts();
      } else {
        alert("Failed to commit changes to backend database");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProduct = async () => {
    if (!newSku || !newName || !newUnitCost || !newRetailPrice) {
      alert("Please fill in all required fields (SKU, Name, Unit Cost, Retail Price).");
      return;
    }

    const costVal = parseFloat(newUnitCost) || 0;
    const retailVal = parseFloat(newRetailPrice) || 0;
    const stockVal = parseInt(newStock) || 0;
    const reorderVal = parseInt(newReorder) || 0;

    const newProd = {
      sku: newSku,
      name: newName,
      category: newCategory,
      brand: newBrand,
      cost_price: costVal,
      retail_price: retailVal,
      trade_price: Math.round(retailVal * 0.9),
      stock_level: stockVal,
      reorder_level: reorderVal,
      family: newBrand,
      lead_time: '6-8 Weeks',
      origin: 'Import',
      color: 'White',
      dimmable: 'Yes',
      dimming_protocol: 'Driver Dependent',
      driver_incl: 'No',
      light_source_incl: 'Yes',
      light_source_type: 'LED',
      kelvin: '2700K',
      beam_angle: '30°',
      cri: '90',
      ip_rating: 'IP20',
      system_power: 14.0,
      lighting_type: 'Architectural',
      cutout: 'Ø76mm',
      driver_spec: '- External or Remote Driver\n- Direct Connection'
    };

    try {
      const res = await fetch(`${API_BASE}/api/products/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProd)
      });
      if (res.ok) {
        triggerToast(`Product SKU ${newSku} created successfully!`);
        setShowCreateModal(false);
        setNewSku('');
        setNewName('');
        setNewUnitCost('');
        setNewRetailPrice('');
        setNewStock('50');
        setNewReorder('100');
        fetchProducts();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Could not create product'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error creating product: " + err.message);
    }
  };

  const handleUploadFile = async (productId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        triggerToast("Document uploaded successfully!");
        fetchProducts();
      } else {
        alert("Failed to upload document");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (productId, fileId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast("Document deleted successfully!");
        fetchProducts();
      } else {
        alert("Failed to delete document");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkImport = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/api/products/import/csv`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(`Import Complete! Added: ${data.added}, Updated: ${data.updated}`);
        fetchProducts();
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.detail || 'Import failed'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error importing CSV file: " + err.message);
    }
    // Reset file input
    e.target.value = '';
  };

  const stockBadgeClass = (statusStr) => {
    switch (statusStr) {
      case 'In Stock': return 'b-success';
      case 'Low Stock': return 'b-warning';
      case 'Out of Stock': return 'b-danger';
      case 'In transit': return 'b-info';
      default: return 'b-default';
    }
  };

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* TOAST NOTIFICATION POPUP */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 1000, transition: 'all 0.3s ease' }}>
          <ShieldCheck size={18} color="var(--text-info)" /> {toast.message}
        </div>
      )}

      {selectedSku === null ? (
        <>
          {/* ========================================================= */}
          {/* SCREEN 1: PRODUCT MASTER DATABASE (LIST VIEW)              */}
          {/* ========================================================= */}
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-success" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>{getModuleName('products', 'Products')} Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Integrated Inventory Management</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📦 {getModuleName('products', 'Products')} Master Database
                </h1>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a href={`${API_BASE}/api/products/template/csv`} download className="btn btn-ghost" style={{ border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '12px', height: '36px', boxSizing: 'border-box' }}>
                  <Download size={14} /> Download Template
                </a>
                <label className="btn btn-ghost" style={{ border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', height: '36px', boxSizing: 'border-box' }}>
                  <FileText size={14} /> Bulk Import (CSV)
                  <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleBulkImport} />
                </label>
                <button className="btn btn-ghost" onClick={() => triggerToast("Sales order builder initiated in background.")} style={{ border: '1px solid var(--border)' }}>
                  + Create Sales Order
                </button>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  <Plus size={15} /> Create Product SKU
                </button>
              </div>
            </div>
          </div>

          {/* DATE RANGE FILTER ROW */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Package size={15} color="var(--text-success)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter Products by Date:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All Time', 'Last Week', 'Last 30 Days'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', height: 'auto', fontSize: '11px', borderRadius: '6px' }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom Range:</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11px' }}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
              />
            </div>
          </div>

          {/* 4-KPI SUMMARY CARD GRID */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Products SKU</span>
                <Package size={15} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.totalSku} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>SKUs</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Value: <strong>R {kpis.totalVal.toLocaleString()}</strong></span>
                <span>Margin: <strong>R {kpis.totalMargin.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Low Stock Items</span>
                <AlertTriangle size={15} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-warning)' }}>
                {kpis.lowStock} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Count</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span className="badge b-warning" style={{ fontSize: '8.5px', padding: '1px 6px' }}>Warned</span> reorder threshold reached
              </div>
            </div>

            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Out of Stock Items</span>
                <AlertTriangle size={15} color="var(--text-danger)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-danger)' }}>
                {kpis.outStock} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Count</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span className="badge b-danger" style={{ fontSize: '8.5px', padding: '1px 6px' }}>Badly</span> critical stock count
              </div>
            </div>

            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Margin %</span>
                <Percent size={15} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-success)' }}>
                {kpis.avgMargin}% <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Avg</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                Standard target target threshold: <strong>37%</strong>
              </div>
            </div>
          </div>

          {/* FILTER CONTROL BAR */}
          <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text"
                    placeholder="Search by SKU, family, or supplier..."
                    className="form-control"
                    style={{ paddingLeft: '34px', height: '34px', fontSize: '12.5px' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="form-control"
                  style={{ width: '160px', height: '34px', fontSize: '12.5px' }}
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option>All Categories</option>
                  <option>Downlight</option>
                  <option>Starlight</option>
                </select>

                <select
                  className="form-control"
                  style={{ width: '165px', height: '34px', fontSize: '12.5px' }}
                  value={supplierFilter}
                  onChange={e => setSupplierFilter(e.target.value)}
                >
                  <option>All Suppliers</option>
                  <option>ELDC</option>
                  <option>Molecule Lighting</option>
                </select>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> product records
              </div>
            </div>

            {/* PRODUCT LEDGER TABLE */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-strong)' }}>
                    <th style={{ width: '60px', textAlign: 'center' }}>IMAGE</th>
                    <th style={{ width: '120px' }}>SKU</th>
                    <th>DESCRIPTION / PRODUCT</th>
                    <th style={{ width: '120px' }}>FAMILY</th>
                    <th style={{ width: '100px' }}>BRAND</th>
                    <th style={{ width: '100px' }}>SUPPLIER</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>UNIT COST</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>RRP PRICE</th>
                    <th style={{ textAlign: 'center', width: '90px' }}>STOCK</th>
                    <th style={{ textAlign: 'center', width: '110px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="clickable" style={{ cursor: 'pointer' }} onClick={() => setSelectedSku(p.sku)}>
                      <td style={{ verticalAlign: 'middle', padding: '6px', textAlign: 'center' }}>
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <ProductImageRenderer type={p.category.toLowerCase()} width="40" height="40" />
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-info)', textDecoration: 'underline' }}>
                        {p.sku}
                      </td>
                      <td style={{ verticalAlign: 'middle', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {p.name}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>{p.family}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.brand}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.supplier}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        R {p.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                        R {p.retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 600 }}>{p.stock}</td>
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        <span className={`badge ${stockBadgeClass(p.status)}`} style={{ minWidth: '78px', textAlign: 'center' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                        No products found matching the search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ========================================================= */}
          {/* SCREEN 2: PRODUCT DETAIL WORKSPACE VIEW                     */}
          {/* ========================================================= */}
          <div className="card" style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div className="card-body" style={{ padding: '24px' }}>
              
              {/* TOP HEADER CONTROLS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '18px', marginBottom: '20px' }}>
                <div>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: '4px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}
                    onClick={() => setSelectedSku(null)}
                  >
                    <ArrowLeft size={13} /> Back to Master Database
                  </button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(74,85,104,0.15)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Product Workspace Engine
                    </span>
                  </div>
                  
                  <h2 style={{ margin: '6px 0 0 0', fontSize: '20px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    {activeProduct.sku} — {activeProduct.name}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
                    <select
                      className="form-control"
                      style={{ width: '120px', height: '30px', padding: '2px 6px', fontSize: '12px' }}
                      value={editingStatus}
                      onChange={e => setEditingStatus(e.target.value)}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                      <option value="In transit">In transit</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1.5px solid var(--border)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Stock Qty:</span>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ width: '85px', height: '30px', padding: '2px 6px', fontSize: '12px', textAlign: 'center' }}
                      value={editingStock}
                      onChange={e => setEditingStock(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>

                  <button 
                    className="btn btn-primary btn-sm" 
                    style={{ height: '30px', fontSize: '11.5px', padding: '0 12px' }}
                    onClick={handleCommitChanges}
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {/* TABS CONTROLLER */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '0px', marginBottom: '20px' }}>
                {[
                  { id: 'specs', label: 'Specifications' },
                  { id: 'costing', label: 'Costing' },
                  { id: 'supplier', label: 'Supplier Details' },
                  { id: 'history', label: 'Stock History' }
                ].map(t => (
                  <button
                    key={t.id}
                    className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      borderRadius: '8px 8px 0 0',
                      borderBottom: activeTab === t.id ? 'none' : '1px solid transparent',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      height: '38px'
                    }}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ACTIVE TAB CONTENT */}
              <div className="animation-fade-in">
                
                {/* 1. SPECIFICATIONS VIEW */}
                {activeTab === 'specs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {/* Product Visual Mock Rendering */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', position: 'relative' }}>
                          <span style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Visual Specification</span>
                          <ProductImageRenderer type={activeProduct.category.toLowerCase()} height="260" />
                          <h4 style={{ margin: '12px 0 0 0', fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}>{activeProduct.family}</h4>
                        </div>
                      </div>

                      {/* Technical CAD blueprints + Specs detail sheet */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <div style={{ width: '110px', flexShrink: 0 }}>
                            <ProductCADRenderer cutout={activeProduct.cutout} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-info)' }}>📐 Design Spec & Blueprint</h4>
                            <div style={{ fontSize: '11.5px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Fitting Type:</strong> {activeProduct.category}</p>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Cut-Out Size:</strong> {activeProduct.cutout}</p>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Power Consumption:</strong> {activeProduct.systemPower}W</p>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Color Kelvin:</strong> {activeProduct.kelvin}</p>
                              <p style={{ margin: '0 0 4px 0' }}><strong>Beam Angle:</strong> {activeProduct.beamAngle}</p>
                              <p style={{ margin: 0 }}><strong>IP Rating:</strong> {activeProduct.ipRating} (CRI: {activeProduct.cri})</p>
                            </div>
                          </div>
                        </div>

                        {/* Driver Specs Box */}
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Settings size={13} /> Driver Specification & Connection Info
                          </h4>
                          <div style={{ fontSize: '11.5px', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                            {activeProduct.driverSpec}
                          </div>
                        </div>

                        {/* Instruction Manual / Technical PDF attachments */}
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Technical Documents</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeProduct.files && activeProduct.files.length > 0 ? (
                              activeProduct.files.map(file => (
                                <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '8px' }}>
                                  <a href={`${API_BASE}${file.file_path}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
                                    <FileText size={16} color={file.file_type === 'image' ? 'var(--text-warning)' : 'var(--text-info)'} />
                                    <span style={{ fontSize: '11.5px', fontWeight: 500 }}>{file.file_name}</span>
                                  </a>
                                  <button style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }} onClick={() => handleDeleteFile(activeProduct.id, file.id)}>Delete</button>
                                </div>
                              ))
                            ) : (
                              <>
                                <div className="clickable" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => alert("Downloading Technical Datasheet PDF...")}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} color="var(--text-info)" />
                                    <span style={{ fontSize: '11.5px', fontWeight: 500 }}>Technical_Datasheet_{activeProduct.sku.replace(/\s+/g, '_')}.pdf</span>
                                  </div>
                                  <Download size={14} color="var(--text-secondary)" />
                                </div>
                                {activeProduct.driverSpec && (
                                  <div className="clickable" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => alert("Downloading Connection Installation Guide PDF...")}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <FileText size={16} color="var(--text-success)" />
                                      <span style={{ fontSize: '11.5px', fontWeight: 500 }}>Driver_Wiring_Connection_Guide.pdf</span>
                                    </div>
                                    <Download size={14} color="var(--text-secondary)" />
                                  </div>
                                )}
                              </>
                            )}
                            <div style={{ marginTop: '4px' }}>
                              <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px dashed var(--border)', width: '100%', boxSizing: 'border-box' }}>
                                <Plus size={12} /> Upload Technical Document
                                <input type="file" style={{ display: 'none' }} onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleUploadFile(activeProduct.id, e.target.files[0]);
                                  }
                                }} />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accessories Requirements List */}
                    {activeProduct.accessories && activeProduct.accessories.length > 0 && (
                      <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Associated Accessories & Mounting Kits</h4>
                        <table className="table" style={{ width: '100%', fontSize: '11.5px' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              <th style={{ padding: '6px 10px', width: '180px' }}>Accessory SKU</th>
                              <th>Description</th>
                              <th style={{ textAlign: 'center', width: '120px' }}>Required Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeProduct.accessories.map((acc, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, padding: '6px 10px', color: 'var(--text-info)' }}>{acc.code}</td>
                                <td>{acc.desc}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700 }}>1 per Fitting</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. COSTING VIEW */}
                {activeTab === 'costing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Supplier Costing Breakdown */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Supplier & Costing Breakdown</h4>
                      <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th>Supplier</th>
                            <th>Brand</th>
                            <th style={{ textAlign: 'right' }}>Cost Price (Rands)</th>
                            <th style={{ textAlign: 'center' }}>Mark-Up %</th>
                            <th style={{ textAlign: 'right' }}>Landed Cost (Excl. VAT)</th>
                            <th style={{ textAlign: 'center' }}>Last Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600, color: 'var(--text-info)' }}>{activeProduct.supplier}</td>
                            <td>{activeProduct.brand}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>R {activeProduct.unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'center' }}>{activeProduct.markup}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>R {activeProduct.costing.landedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{activeProduct.costing.lastUpdated}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing Tiers & Margin Structure */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Pricing & Margin Structure</h4>
                      <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th>Customer Tier</th>
                            <th style={{ textAlign: 'right' }}>Target Retail Price</th>
                            <th style={{ textAlign: 'right' }}>Applied Discount %</th>
                            <th style={{ textAlign: 'right' }}>Net Retail Price</th>
                            <th style={{ textAlign: 'center' }}>Projected Margin %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeProduct.costing.tiers.map((t, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{t.name}</td>
                              <td style={{ textAlign: 'right' }}>R {t.retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'right' }}>{t.discount.toFixed(2)}%</td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>R {t.netRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge b-success" style={{ fontWeight: 700, padding: '2px 8px' }}>
                                  {t.margin}% margin
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Costing KPI row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Projected Margin %</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-success)', marginTop: '4px' }}>{activeProduct.margin}%</div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Landed Cost</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>R {activeProduct.costing.landedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RRP Retail Price</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>R {activeProduct.retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Net Profit per Unit</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-success)', marginTop: '4px' }}>R {activeProduct.costing.profitPerUnit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>

                    {/* Contact Info & Terms footer */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                      <div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Supplier Contact Info</h5>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={13} /> <a href={`https://${activeProduct.costing.contactInfo.website}`} target="_blank" rel="noreferrer">{activeProduct.costing.contactInfo.website}</a></span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={13} /> {activeProduct.costing.contactInfo.email}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} /> {activeProduct.costing.contactInfo.phone}</span>
                        </div>
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Fulfillment Terms</h5>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                          {activeProduct.costing.terms}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SUPPLIER DETAILS VIEW */}
                {activeTab === 'supplier' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    {/* Supplier Profile Card */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(24,95,165,0.08)', color: 'var(--text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', fontSize: '20px', fontWeight: 700 }}>
                          🏢
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{activeProduct.supplierDetails.name}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Primary Supplier Vendor</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <span>Origin Country</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{activeProduct.origin}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <span>Vendor Status</span>
                          <span className="badge b-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Active Partner</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                          <span>Supplier Rating</span>
                          <span style={{ color: 'var(--text-warning)', display: 'flex', alignItems: 'center', gap: '2px' }}><Star size={11} fill="var(--text-warning)" /> 4.9 / 5.0</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{activeProduct.supplierDetails.address}</span>
                        </div>
                      </div>
                    </div>

                    {/* Logistics & Business Terms Card */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Logistics & Terms</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <Clock size={16} color="var(--text-info)" />
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fulfillment Lead Time</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeProduct.supplierDetails.leadTime}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <CreditCard size={16} color="var(--text-success)" />
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Payment terms</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeProduct.supplierDetails.paymentTerms}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <Truck size={16} color="var(--text-warning)" />
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fulfillment / Shipping</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeProduct.supplierDetails.shippingMethod}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account representative contact details */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Account Manager Contact</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, border: '1px solid var(--border)' }}>
                            {activeProduct.supplierDetails.contactPerson.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeProduct.supplierDetails.contactPerson}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{activeProduct.supplierDetails.role}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <a href={`mailto:${activeProduct.supplierDetails.email}`} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={12} /> Email Representative
                        </a>
                        <a href={`tel:${activeProduct.supplierDetails.phone}`} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} /> Call Direct ({activeProduct.supplierDetails.phone})
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. STOCK HISTORY VIEW */}
                {activeTab === 'history' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* SVG Stock level Trend Area Chart */}
                    <StockTrendChart history={activeProduct.stockHistory} />

                    {/* Stock Movements Log ledger */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Stock Movement Transaction Log</h4>
                      <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th>Date</th>
                            <th>Transaction Type</th>
                            <th>Reference Document</th>
                            <th style={{ textAlign: 'center' }}>Quantity Changed</th>
                            <th style={{ textAlign: 'center' }}>Running Balance</th>
                            <th>Handled By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeProduct.stockHistory.map((h, idx) => (
                            <tr key={idx}>
                              <td>{h.date}</td>
                              <td>
                                <span className={`badge ${h.type === 'Stock In' ? 'b-success' : h.type === 'Stock Out' ? 'b-danger' : 'b-warning'}`} style={{ fontSize: '9px', padding: '2px 8px' }}>
                                  {h.type}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace' }}>{h.reference}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: h.qty.startsWith('+') ? 'var(--text-success)' : 'var(--text-danger)' }}>
                                {h.qty}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{h.balance}</td>
                              <td>{h.staff}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </>
      )}

      {/* CREATE NEW PRODUCT SKU MODAL */}
      {showCreateModal && (
        <div className="modal-bg active" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '520px', padding: '20px' }}>
            <div className="modal-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📦 Create New Product SKU</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <div className="row-2">
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>SKU Code (Required)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 28402 9240 FW" 
                    className="form-control"
                    value={newSku}
                    onChange={e => setNewSku(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Product Name (Required)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Downlight - Entero SQ-S White" 
                    className="form-control"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-control"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  >
                    <option value="Downlight">Downlight</option>
                    <option value="Starlight">Starlight</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Brand</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Supplier Vendor</label>
                  <select 
                    className="form-control"
                    value={newSupplier}
                    onChange={e => setNewSupplier(e.target.value)}
                  >
                    <option value="ELDC">ELDC</option>
                    <option value="Molecule Lighting">Molecule Lighting</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>Supplier Cost EXCL. (R)</label>
                  <input 
                    type="number" 
                    placeholder="2416.37"
                    className="form-control"
                    value={newUnitCost}
                    onChange={e => setNewUnitCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600 }}>RRP Target Price EXCL. (R)</label>
                  <input 
                    type="number" 
                    placeholder="3835.50"
                    className="form-control"
                    value={newRetailPrice}
                    onChange={e => setNewRetailPrice(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Initial Stock Qty</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="form-row" style={{ flex: '0 0 50%' }}>
                  <label className="form-label">Reorder Limit Threshold</label>
                  <input 
                    type="number" 
                    className="form-control"
                    value={newReorder}
                    onChange={e => setNewReorder(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateProduct}>Create Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
