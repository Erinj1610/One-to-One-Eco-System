import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  ArrowLeft, Search, Plus, FileText, Download, ShieldCheck, Mail, Globe, Phone, MapPin, 
  Truck, CreditCard, Clock, Star, TrendingUp, AlertTriangle, Package, Percent, Info, Settings,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

  // Product list state
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const PAGE_SIZE = 100;

  // KPI summary (from lightweight endpoint)
  const [summary, setSummary] = useState({ total: 0, low_stock: 0, out_of_stock: 0 });

  const [selectedSku, setSelectedSku] = useState(null);
  const [activeTab, setActiveTab] = useState('specs');

  // Read-only / edit mode for detail view
  const [isEditing, setIsEditing] = useState(false);

  const mapProduct = (p) => {
    const calculatedMargin = p.retail_price > 0 ? Math.round(((p.retail_price - p.cost_price) / p.retail_price) * 100) : 37;
    return {
      ...p,
      unitCost: p.cost_price || 0.0,
      retailPrice: p.retail_price || 0.0,
      tradePrice: p.trade_price || 0.0,
      stock: p.stock_level || 0,
      reorderLevel: p.reorder_level || 100,
      status: p.status || (p.is_active === false ? 'Inactive' : 'Active'),
      is_active: p.is_active !== undefined ? p.is_active : p.status !== 'Inactive',
      costing: p.costing || {
        supplierSku: p.sku,
        supplierUnitCost: p.cost_price || 0.0,
        supplierDiscount: 0,
        landedCost: Math.round((p.cost_price || 0.0) * 1.15),
        lastUpdated: 'Jan 25, 2026',
        tiers: [
          { name: 'Retail / RRP', retailPrice: p.retail_price || 0.0, discount: 0, netRetail: p.retail_price || 0.0, margin: calculatedMargin },
          { name: 'Trade / Partner', retailPrice: p.retail_price || 0.0, discount: 10, netRetail: p.trade_price || 0.0, margin: calculatedMargin - 5 }
        ],
        avgMargin: calculatedMargin,
        profitPerUnit: (p.retail_price || 0.0) - (p.cost_price || 0.0),
        contactInfo: { company: p.brand || 'Supplier', website: 'www.supplierportal.co.za', email: 'orders@supplierportal.co.za', phone: '+27 (0) 11 000 0000' },
        terms: 'Payment terms subject to credit application approval.'
      },
      supplierDetails: p.supplierDetails || {
        name: p.brand || 'Supplier', contactPerson: 'Account Team', role: 'Supplier Support Representative',
        email: 'info@supplier.co.za', phone: '+27 11 000 0000', address: 'Supplier Corporate Business Park, JHB',
        leadTime: p.lead_time || '6-8 Weeks', paymentTerms: 'COD', shippingMethod: 'Road Freight'
      },
      stockHistory: p.stockHistory || [
        { date: '05 Jun 2026', type: 'Stock In', reference: 'Initial Stock Count', qty: `+${p.stock_level || 0}`, balance: p.stock_level || 0, staff: 'Dani' }
      ]
    };
  };

  // Fetch a single page from backend with server-side filtering
  const fetchPage = async ({ page = 1, q = '', cat = 'All Categories', sup = 'All Suppliers' } = {}) => {
    setIsLoadingProducts(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (q) params.set('q', q);
      if (cat && cat !== 'All Categories') params.set('category', cat);
      const res = await fetch(`${API_BASE}/api/products/?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts((data.items || []).map(mapProduct));
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const [palladiumStatus, setPalladiumStatus] = useState(null);
  const [isSyncingPalladium, setIsSyncingPalladium] = useState(false);

  // Fetch lightweight KPI summary counts
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/summary`);
      if (res.ok) setSummary(await res.json());
    } catch (_) {}
  };

  const fetchPalladiumStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/palladium/status`);
      if (res.ok) setPalladiumStatus(await res.json());
    } catch (_) {}
  };

  const handleTriggerPalladiumSync = async () => {
    setIsSyncingPalladium(true);
    triggerToast("Starting 100% read-only Palladium ERP synchronization...");
    try {
      const res = await fetch(`${API_BASE}/api/palladium/sync`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        triggerToast(`🎉 ${data.message || 'Palladium sync completed successfully!'}`);
        fetchPage({ page: 1 });
        fetchSummary();
        fetchPalladiumStatus();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Palladium Sync Notice: ${err.detail || 'Failed to sync with Palladium ERP.'}`);
      }
    } catch (e) {
      alert(`Palladium Connection Error: ${e.message}`);
    } finally {
      setIsSyncingPalladium(false);
    }
  };

  // Backwards-compat alias used by import handler
  const fetchProducts = () => {
    fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter });
    fetchSummary();
    fetchPalladiumStatus();
  };

  useEffect(() => {
    fetchSummary();
    fetchPalladiumStatus();
    fetchPage({ page: 1 });
  }, []);

  // Workspace Local Editing States
  const [editingStatus, setEditingStatus] = useState('In Stock');
  const [editingStock, setEditingStock] = useState(0);
  const [formFields, setFormFields] = useState({});

  // Product Manager Bulk Edit Grid Mode toggle
  const [isBulkGridMode, setIsBulkGridMode] = useState(false);

  // Product Manager Live Grid Edits State (track dirty cells before committing to Cloud SQL)
  const [gridEdits, setGridEdits] = useState({}); // { [productId]: { field: newValue } }

  // 1. Bulk Re-Pricing Modal State
  const [showBulkRepricingModal, setShowBulkRepricingModal] = useState(false);
  const [bulkSupplier, setBulkSupplier] = useState('All Suppliers');
  const [bulkCategory, setBulkCategory] = useState('All Categories');
  const [bulkCostShift, setBulkCostShift] = useState(0.0);
  const [bulkRetailShift, setBulkRetailShift] = useState(0.0);

  // 2. Audit Trail State
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  // 4. Excel Import Progress Modal State
  const [importProgress, setImportProgress] = useState({
    isImporting: false,
    totalRows: 0,
    processedRows: 0,
    added: 0,
    updated: 0
  });

  const fetchAuditLogs = async (prodId) => {
    if (!prodId) return;
    setIsLoadingAuditLogs(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${prodId}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  const fetchAccessories = async (prodId) => {
    if (!prodId) return;
    setIsLoadingAccessories(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${prodId}/accessories`);
      if (res.ok) {
        const data = await res.json();
        setAccessoriesList(data);
      }
    } catch (e) {
      console.error('Error fetching accessories:', e);
    } finally {
      setIsLoadingAccessories(false);
    }
  };

  const handleAddAccessory = async (parentProdId) => {
    if (!newAccessoryId) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${parentProdId}/accessories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessory_product_id: parseInt(newAccessoryId),
          relationship_type: newAccessoryType
        })
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message);
        setNewAccessoryId('');
        fetchAccessories(parentProdId);
      } else {
        alert('Could not link accessory.');
      }
    } catch (e) {
      alert('Error adding accessory: ' + e.message);
    }
  };

  const handleRemoveAccessory = async (parentProdId, linkId) => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${parentProdId}/accessories/${linkId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        triggerToast('Unlinked accessory successfully.');
        fetchAccessories(parentProdId);
      }
    } catch (e) {
      alert('Error unlinking accessory: ' + e.message);
    }
  };

  const handleExecuteBulkRepricing = async () => {
    if (bulkCostShift === 0 && bulkRetailShift === 0) {
      alert("Please enter a percentage shift for cost or retail price.");
      return;
    }
    if (!window.confirm(`Are you sure you want to apply a ${bulkCostShift}% cost shift and ${bulkRetailShift}% retail shift for '${bulkSupplier}' / '${bulkCategory}'? This will update all matching products in Cloud SQL.`)) return;

    try {
      triggerToast("Executing bulk re-pricing in Cloud SQL...");
      const res = await fetch(`${API_BASE}/api/products/bulk-repricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: bulkSupplier,
          category: bulkCategory,
          cost_percent_shift: parseFloat(bulkCostShift) || 0.0,
          retail_percent_shift: parseFloat(bulkRetailShift) || 0.0,
          updated_by_name: (typeof currentUser !== 'undefined' && currentUser?.name) ? currentUser.name : "Product Manager"
        })
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(data.message);
        setShowBulkRepricingModal(false);
        fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter });
        fetchSummary();
      } else {
        const err = await res.json();
        alert("Bulk re-pricing failed: " + (err.detail || "Server error"));
      }
    } catch (e) {
      alert("Network error: " + e.message);
    }
  };

  const handleGridCellChange = (productId, field, value) => {
    setGridEdits(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [field]: value
      }
    }));
  };

  const handleCommitGridEdits = async () => {
    const dirtyIds = Object.keys(gridEdits);
    if (dirtyIds.length === 0) {
      triggerToast("No pending grid edits to commit.");
      return;
    }

    try {
      triggerToast(`Submitting atomic batch transaction for ${dirtyIds.length} product(s)...`);
      
      const updates = dirtyIds.map(id => {
        const prod = products.find(p => String(p.id) === String(id)) || {};
        return {
          id: parseInt(id),
          sku: prod.sku,
          changes: gridEdits[id] || {}
        };
      });

      const payload = {
        updated_by_name: (typeof currentUser !== 'undefined' && currentUser?.name) ? currentUser.name : "Product Manager",
        updates: updates
      };

      const res = await fetch(`${API_BASE}/api/products/batch-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setGridEdits({});
        triggerToast(`Batch Success: Updated ${result.updated_count} product(s) & wrote ${result.audit_logs_written} audit log entries.`);
        fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter });
        fetchSummary();
      } else {
        const err = await res.json();
        alert(`❌ BATCH TRANSACTION ROLLED BACK:\n\n${err.detail || "Validation or database error"}`);
      }
    } catch (e) {
      alert("Network error during batch commit: " + e.message);
    }
  };

  // Master Catalog View Presets ('commercial', 'technical', 'inventory', 'full')
  const [viewMode, setViewMode] = useState('commercial');

  // Bulk Selection State & Actions
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProductIds(products.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedProductIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to safely archive ${selectedProductIds.length} selected product(s) as Discontinued?`)) return;

    try {
      triggerToast(`Archiving ${selectedProductIds.length} products...`);
      for (const id of selectedProductIds) {
        await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
      }
      setSelectedProductIds([]);
      triggerToast(`Bulk operation complete! Selected products set to Discontinued.`);
      fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter });
      fetchSummary();
    } catch (err) {
      alert("Bulk archive error: " + err.message);
    }
  };

  // Filters State — changes trigger a new server fetch
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [supplierFilter, setSupplierFilter] = useState('All Suppliers');
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Re-fetch when search or filters change (debounced via useEffect)
  const searchRef = React.useRef(null);
  useEffect(() => {
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchPage({ page: 1, q: searchQuery, cat: categoryFilter });
    }, 350);
  }, [searchQuery, categoryFilter]);

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
    setIsEditing(false); // always open new products in read-only mode
    if (activeProduct) {
      setEditingStatus(activeProduct.status);
      setEditingStock(activeProduct.stock);
      setFormFields({
        name: activeProduct.name || '',
        brand: activeProduct.brand || '',
        sku: activeProduct.sku || '',
        family: activeProduct.family || '',
        category: activeProduct.category || '',
        lead_time: activeProduct.leadTime || activeProduct.lead_time || '',
        origin: activeProduct.origin || '',
        color: activeProduct.color || '',
        dimmable: activeProduct.dimmable || '',
        dimming_protocol: activeProduct.dimmingProtocol || activeProduct.dimming_protocol || '',
        driver_incl: activeProduct.driverIncl || activeProduct.driver_incl || '',
        light_source_incl: activeProduct.lightSourceIncl || activeProduct.light_source_incl || '',
        light_source_type: activeProduct.lightSourceType || activeProduct.light_source_type || '',
        kelvin: activeProduct.kelvin || '',
        beam_angle: activeProduct.beamAngle || activeProduct.beam_angle || '',
        cri: activeProduct.cri || '',
        ip_rating: activeProduct.ipRating || activeProduct.ip_rating || '',
        system_power: activeProduct.systemPower || activeProduct.system_power || 0,
        lighting_type: activeProduct.lightingType || activeProduct.lighting_type || '',
        cutout: activeProduct.cutout || '',
        driver_spec: activeProduct.driverSpec || activeProduct.driver_spec || '',
        one_to_one_code: activeProduct.one_to_one_code || '',
        foh_code_description: activeProduct.foh_code_description || '',
        client_description: activeProduct.client_description || '',
        fitting_type: activeProduct.fitting_type || '',
        consignment: activeProduct.consignment || '',
        selection: activeProduct.selection || '',
        first_fix: activeProduct.first_fix || '',
        red_list: activeProduct.red_list || '',
        markup: activeProduct.markup || '',
        recommended_retail_price: activeProduct.recommended_retail_price || activeProduct.retail_price || 0,
        trade_price: activeProduct.tradePrice || activeProduct.trade_price || 0,
        cost_price: activeProduct.unitCost || activeProduct.cost_price || 0,
        reorder_level: activeProduct.reorderLevel || activeProduct.reorder_level || 100,
        qr: activeProduct.qr || '',
        qr_link: activeProduct.qr_link || '',
        supplier: activeProduct.supplier || ''
      });
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

  // Products already filtered server-side; just expose the loaded page
  const filteredProducts = products;

  // Aggregate stats — use lightweight summary for global counts
  const kpis = useMemo(() => {
    const totalSku = summary.total || totalCount;
    const lowStock = summary.low_stock || 0;
    const outStock = summary.out_of_stock || 0;
    const sumMargin = products.reduce((acc, p) => acc + (p.margin || 37), 0);
    const avgMargin = products.length > 0 ? Math.round(sumMargin / products.length) : 37;
    const totalVal = products.reduce((acc, p) => acc + (p.unitCost * p.stock), 0);
    const totalMargin = products.reduce((acc, p) => acc + ((p.retailPrice - p.unitCost) * p.stock), 0);
    return { totalSku, lowStock, outStock, avgMargin, totalVal, totalMargin };
  }, [summary, totalCount, products]);

  // Commit changes from Workspace Engine (Save button trigger)
  const handleCommitChanges = async () => {
    if (!activeProduct) return;
    
    const qty = editingStock;

    const payload = {
      name: formFields.name,
      brand: formFields.brand,
      sku: formFields.sku,
      cost_price: parseFloat(formFields.cost_price) || 0.0,
      retail_price: parseFloat(formFields.recommended_retail_price) || 0.0,
      trade_price: parseFloat(formFields.trade_price) || 0.0,
      stock_level: qty,
      reorder_level: parseInt(formFields.reorder_level) || 100,
      supplier_id: activeProduct.supplier_id,
      family: formFields.family,
      category: formFields.category,
      lead_time: formFields.lead_time,
      origin: formFields.origin,
      color: formFields.color,
      dimmable: formFields.dimmable,
      dimming_protocol: formFields.dimming_protocol,
      driver_incl: formFields.driver_incl,
      light_source_incl: formFields.light_source_incl,
      light_source_type: formFields.light_source_type,
      kelvin: formFields.kelvin,
      beam_angle: formFields.beam_angle,
      cri: formFields.cri,
      ip_rating: formFields.ip_rating,
      system_power: parseFloat(formFields.system_power) || 0.0,
      lighting_type: formFields.lighting_type,
      cutout: formFields.cutout,
      driver_spec: formFields.driver_spec,
      one_to_one_code: formFields.one_to_one_code,
      foh_code_description: formFields.foh_code_description,
      client_description: formFields.client_description,
      fitting_type: formFields.fitting_type,
      consignment: formFields.consignment,
      selection: formFields.selection,
      first_fix: formFields.first_fix,
      red_list: formFields.red_list,
      markup: formFields.markup,
      recommended_retail_price: parseFloat(formFields.recommended_retail_price) || 0.0,
      qr: formFields.qr,
      qr_link: formFields.qr_link,
      client_code: activeProduct.client_code
    };

    try {
      const res = await fetch(`${API_BASE}/api/products/${activeProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        triggerToast(`Changes saved for ${activeProduct.sku}!`);
        setIsEditing(false);
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

  // Upload a product image or technical image directly onto the product record
  const handleUploadImage = async (productId, file, fileCategory) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_category', fileCategory);
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/upload-image`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        triggerToast(fileCategory === 'product_image' ? 'Product image updated!' : 'Technical image updated!');
        fetchProducts();
      } else {
        alert('Failed to upload image');
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

  const handleExportTemplateExcel = async () => {
    try {
      triggerToast("Fetching full database from server for Excel export...");
      
      let allProducts = products;
      try {
        const res = await fetch(`${API_BASE}/api/products?limit=10000`);
        if (res.ok) {
          const data = await res.json();
          allProducts = Array.isArray(data) ? data : (data.items || data.products || products);
        }
      } catch (fErr) {
        console.warn("Could not fetch unlimited products list, using current page state", fErr);
      }

      const sampleRow = {
        "id": 1,
        "name": "Downlight - Entero RD-S 14W 2700K 30° IP20 White",
        "brand": "Delta Light",
        "sku": "28402 9240 FW",
        "cost_price": 2416.37,
        "trade_price": 3451.95,
        "retail_price": 3835.50,
        "stock_level": 100,
        "supplier_id": 1,
        "family": "Entero RD-S",
        "category": "Downlight",
        "reorder_level": 100,
        "lead_time": "6-8 Weeks",
        "origin": "Import",
        "color": "White",
        "dimmable": "Yes",
        "dimming_protocol": "Driver Dependent",
        "driver_incl": "No",
        "light_source_incl": "Yes",
        "light_source_type": "LED",
        "kelvin": "2700K",
        "beam_angle": "30°",
        "cri": "90",
        "ip_rating": "IP20",
        "system_power": 14.0,
        "lighting_type": "Architectural",
        "cutout": "Ø76mm",
        "driver_spec": "- External or Remote Driver",
        "one_to_one_code": "1:1-ENT-RDS",
        "foh_code_description": "Front of House Entero S Description",
        "client_description": "Entero RD-S Downlight White",
        "fitting_type": "Recessed Downlight",
        "consignment": "No",
        "selection": "Primary Selection",
        "first_fix": "First Fix",
        "red_list": "No",
        "markup": "58.73%",
        "recommended_retail_price": 3835.50,
        "qr": "QR-CODE",
        "qr_link": "https://example.com/qr",
        "client_code": "CLIENT-1002",
        "image_url": "",
        "technical_image_url": "",
        "internal_cost": 2200.00,
        "supplier_name": "ELDC",
        "local_or_import": "Import",
        "driver_location": "Remote",
        "fittings_per_driver": "1 Fitting per Driver",
        "driver_connection_type": "Series",
        "driver_max_cable": "1m away using 0.5mm cable"
      };

      // Dynamically extract ALL keys present across products returned by SQL
      const dynamicHeaderSet = new Set();
      const rows = allProducts.length > 0 ? allProducts.map(p => {
        const rowObj = {};
        for (const [k, v] of Object.entries(p)) {
          if (k === 'files' || k === 'supplier') continue;
          dynamicHeaderSet.add(k);
          rowObj[k] = v !== null && v !== undefined ? v : "";
        }
        return rowObj;
      }) : [sampleRow];

      const headers = dynamicHeaderSet.size > 0 ? Array.from(dynamicHeaderSet) : Object.keys(sampleRow);

      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Product_Database");
      XLSX.writeFile(workbook, `Product_Database_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      triggerToast(`Export complete! Exported ${rows.length} product(s).`);
    } catch (err) {
      console.error(err);
      alert("Failed to export product template: " + err.message);
    }
  };

  const handleBulkImportExcel = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    e.target.value = '';

    // Parse locally first to validate
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (rawRows.length === 0) {
          alert("Selected Excel sheet contains no data.");
          return;
        }

        // Smart Column Header Normalization Map (Supports both user Excel format and Portal API format)
        const headerMap = {
          "sku": "sku",
          "description": "name",
          "name": "name",
          "client description": "client_description",
          "client_description": "client_description",
          "fitting type": "fitting_type",
          "fitting_type": "fitting_type",
          "lighting type": "lighting_type",
          "lighting_type": "lighting_type",
          "family/range": "family",
          "family": "family",
          "cost": "cost_price",
          "cost_price": "cost_price",
          "internal cost": "internal_cost",
          "internal_cost": "internal_cost",
          "mark-up": "markup",
          "markup": "markup",
          "trade": "trade_price",
          "trade_price": "trade_price",
          "retail": "retail_price",
          "retail_price": "retail_price",
          "brand": "brand",
          "supplier": "supplier_name",
          "supplier_name": "supplier_name",
          "lead times": "lead_time",
          "lead_time": "lead_time",
          "local / import": "local_or_import",
          "local_or_import": "local_or_import",
          "one to one code": "one_to_one_code",
          "one_to_one_code": "one_to_one_code",
          "product colour": "color",
          "color": "color",
          "dimmable": "dimmable",
          "dimming protocol": "dimming_protocol",
          "dimming_protocol": "dimming_protocol",
          "driver incl.": "driver_incl",
          "driver_incl": "driver_incl",
          "light source incl.": "light_source_incl",
          "light_source_incl": "light_source_incl",
          "light source type": "light_source_type",
          "light_source_type": "light_source_type",
          "kelvin": "kelvin",
          "beam angle": "beam_angle",
          "beam_angle": "beam_angle",
          "cri": "cri",
          "ip": "ip_rating",
          "ip_rating": "ip_rating",
          "system power": "system_power",
          "system_power": "system_power",
          "cut-out/mounting procedure": "cutout",
          "cutout": "cutout",
          "driver location": "driver_location",
          "driver_location": "driver_location",
          "qty of fittings per driver": "fittings_per_driver",
          "fittings_per_driver": "fittings_per_driver",
          "series or parallel connection": "driver_connection_type",
          "driver_connection_type": "driver_connection_type",
          "max cable length and gauge": "driver_max_cable",
          "driver_max_cable": "driver_max_cable",
          "consignment": "consignment",
          "first fix": "first_fix",
          "first_fix": "first_fix",
          "red list": "red_list",
          "red_list": "red_list",
          "qr": "qr",
          "qr link": "qr_link",
          "qr_link": "qr_link",
          "selection/non-selection": "selection",
          "selection": "selection",
          "rrp": "recommended_retail_price",
          "recommended_retail_price": "recommended_retail_price"
        };

        // Normalise: SKU and all text fields must be strings (Excel reads numeric SKUs as numbers)
        const numericFields = new Set(['cost_price','internal_cost','trade_price','retail_price','stock_level','reorder_level','system_power','recommended_retail_price']);
        const rows = rawRows.map(row => {
          const out = {};
          for (const [k, v] of Object.entries(row)) {
            const cleanKey = String(k).trim().toLowerCase();
            const targetKey = headerMap[cleanKey] || cleanKey.replace(/[^a-z0-9_]/g, '_');

            if (numericFields.has(targetKey)) {
              const numVal = parseFloat(v);
              out[targetKey] = !isNaN(numVal) ? numVal : 0;
            } else {
              out[targetKey] = v !== undefined && v !== null ? String(v).trim() : '';
            }
          }
          return out;
        });

        triggerToast(`Importing ${rows.length} product(s)...`);

        setImportProgress({
          isImporting: true,
          totalRows: rows.length,
          processedRows: 0,
          added: 0,
          updated: 0
        });

        // Send each row in chunks of 50 to avoid large payload / timeout issues
        const CHUNK = 50;
        let totalAdded = 0;
        let totalUpdated = 0;
        let failed = false;

        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          try {
            const res = await fetch(`${API_BASE}/api/products/reconcile-products-bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ products: chunk })
            });

            if (res.ok) {
              const result = await res.json();
              totalAdded += result.added || 0;
              totalUpdated += result.updated || 0;
              
              setImportProgress({
                isImporting: true,
                totalRows: rows.length,
                processedRows: Math.min(i + CHUNK, rows.length),
                added: totalAdded,
                updated: totalUpdated
              });
            } else {
              let detail = 'Server error';
              try { const errData = await res.json(); detail = errData.detail || detail; } catch (_) {}
              alert(`Import failed on rows ${i+1}–${i+chunk.length}: ${detail}`);
              failed = true;
              break;
            }
          } catch (fetchErr) {
            console.error('Chunk fetch error:', fetchErr);
            alert(`Network error on rows ${i+1}–${i+chunk.length}: ${fetchErr.message}\n\nCheck your connection and try again.`);
            failed = true;
            break;
          }
        }

        setImportProgress(prev => ({ ...prev, isImporting: false }));

        if (!failed) {
          triggerToast(`Import complete! Added: ${totalAdded}, Updated: ${totalUpdated}`);
          fetchPage({ page: 1, q: searchQuery, cat: categoryFilter });
          fetchSummary();
        }

      } catch (err) {
        console.error('Excel parse error:', err);
        alert("Failed to read Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const stockBadgeClass = (statusStr) => {
    if (!statusStr) return 'b-default';
    const s = statusStr.toLowerCase();
    if (s.includes('in stock')) return 'b-success';
    if (s.includes('low')) return 'b-warning';
    if (s.includes('out of stock')) return 'b-danger';
    if (s.includes('discontinued') || s.includes('archived')) return 'b-secondary';
    return 'b-default';
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
                  {palladiumStatus?.last_synced_at && (
                    <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      ● Palladium ERP Synced ({new Date(palladiumStatus.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📦 {getModuleName('products', 'Products')} Master Database
                </h1>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleTriggerPalladiumSync}
                  disabled={isSyncingPalladium}
                  className="btn btn-ghost"
                  title="100% Read-Only Sync from Palladium ERP Database"
                  style={{ 
                    border: '1px solid #10b981', 
                    color: '#10b981', 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '12px', 
                    height: '36px',
                    fontWeight: 600
                  }}
                >
                  <RefreshCw size={14} className={isSyncingPalladium ? 'animate-spin' : ''} />
                  {isSyncingPalladium ? 'Syncing Palladium...' : 'Sync Palladium ERP'}
                </button>

                <button onClick={handleExportTemplateExcel} className="btn btn-ghost" style={{ border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', height: '36px', boxSizing: 'border-box' }}>
                  <Download size={14} /> Export Product Database
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

                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isLoadingProducts ? (
                    <span>Loading products...</span>
                  ) : (
                    <span>
                      Showing <strong>{totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}</strong>–<strong>{Math.min(currentPage * PAGE_SIZE, totalCount)}</strong> of <strong>{totalCount}</strong> products
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCT LEDGER TABLE */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <table className="table" style={{ margin: 0, fontSize: '12px', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-strong)' }}>
                    <th style={{ width: '38px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={products.length > 0 && selectedProductIds.length === products.length} 
                      />
                    </th>
                    <th style={{ width: '60px', textAlign: 'center' }}>IMAGE</th>
                    <th style={{ width: '120px' }}>SKU</th>
                    <th>DESCRIPTION / PRODUCT</th>
                    <th style={{ width: '120px' }}>FAMILY</th>
                    <th style={{ width: '100px' }}>BRAND</th>
                    <th style={{ width: '100px' }}>SUPPLIER</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>UNIT COST</th>
                    <th style={{ textAlign: 'right', width: '100px' }}>RRP PRICE</th>
                    <th style={{ textAlign: 'center', width: '90px' }}>STOCK QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => (
                    <tr 
                      key={p.id} 
                      className="clickable" 
                      style={{ 
                        cursor: 'pointer',
                        background: gridEdits[p.id] ? 'rgba(245, 158, 11, 0.06)' : undefined,
                        borderLeft: gridEdits[p.id] ? '3px solid #f59e0b' : undefined
                      }} 
                      onClick={() => !isBulkGridMode && setSelectedSku(p.sku)}
                    >
                      <td style={{ verticalAlign: 'middle', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedProductIds.includes(p.id)} 
                          onChange={e => handleToggleSelect(p.id, e)} 
                        />
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '6px', textAlign: 'center' }}>
                        <div style={{ width: '44px', height: '44px', position: 'relative', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          {p.image_url ? (
                            <img
                              src={`${API_BASE}${p.image_url}`}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div style={{ display: p.image_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                            <ProductImageRenderer type={(p.category || 'downlight').toLowerCase()} width="44" height="44" />
                          </div>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</td>
                      
                      {/* DESCRIPTION / NAME */}
                      <td style={{ verticalAlign: 'middle', fontWeight: 500 }}>{p.name}</td>

                      <td style={{ verticalAlign: 'middle' }}>{p.family || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.brand || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.supplier_name || p.supplier || '-'}</td>
                      
                      {/* SUPPLIER COST PRICE */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                        {`R ${(p.unitCost || p.cost_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>

                      {/* RRP RETAIL PRICE */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right', fontWeight: 600 }}>
                        {`R ${(p.retailPrice || p.retail_price || p.recommended_retail_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>

                      {/* STOCK LEVEL (CLEAN NUMERIC DISPLAY) */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 600 }}>
                        <span className={`badge ${(p.stock || p.stock_level || 0) > 0 ? 'b-success' : 'b-secondary'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {p.stock || p.stock_level || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                        {isLoadingProducts ? 'Loading page products...' : 'No products found matching the search and filter criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalCount > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px 4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page <strong>{currentPage}</strong> of <strong>{Math.ceil(totalCount / PAGE_SIZE)}</strong>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1 || isLoadingProducts}
                    onClick={() => {
                      const nextP = currentPage - 1;
                      setCurrentPage(nextP);
                      fetchPage({ page: nextP, q: searchQuery, cat: categoryFilter });
                    }}
                  >
                    Previous
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE) || isLoadingProducts}
                    onClick={() => {
                      const nextP = currentPage + 1;
                      setCurrentPage(nextP);
                      fetchPage({ page: nextP, q: searchQuery, cat: categoryFilter });
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                  <span className={`badge ${activeProduct.status === 'Inactive' || !activeProduct.is_active ? 'b-danger' : 'b-success'}`} style={{ fontSize: '11px', padding: '4px 10px' }}>
                    {activeProduct.status === 'Inactive' || !activeProduct.is_active ? '🔴 Discontinued / Inactive in ERP' : '🟢 Active in Palladium ERP'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                    🔒 Palladium Single Source of Truth
                  </span>
                </div>
              </div>

              {/* READ-ONLY ERP SAFETY BANNER */}
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                <ShieldCheck size={20} color="#10b981" />
                <div>
                  <strong>Palladium ERP Managed Record:</strong> All product names, SKUs, selling prices, cost prices, categories, and stock quantities are live-synchronized from Palladium Accounting. Editing in the portal is disabled to protect database integrity.
                </div>
              </div>

              {/* TABS CONTROLLER */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '0px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[
                  { id: 'specs', label: 'Specifications' },
                  { id: 'costing', label: 'Costing' },
                  { id: 'supplier', label: 'Supplier Details' },
                  { id: 'history', label: 'Stock History' },
                  { id: 'audit', label: '📜 Audit Trail & History' },
                  { id: 'accessories', label: '⚡ Linked Drivers & Accessories' }
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
                    onClick={() => {
                      setActiveTab(t.id);
                      if (t.id === 'audit' && activeProduct?.id) fetchAuditLogs(activeProduct.id);
                      if (t.id === 'accessories' && activeProduct?.id) fetchAccessories(activeProduct.id);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ACTIVE TAB CONTENT */}
              <div className="animation-fade-in">
                
                {activeTab === 'specs' && (
                  <fieldset disabled={!isEditing} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {/* Product Images Panel — Photo + Technical Image */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                        {/* Product Photo Card */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', position: 'relative' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                            📷 Product Photo
                          </span>
                          <div style={{ marginTop: '10px', position: 'relative', width: '100%', aspectRatio: '4/3', background: 'var(--bg-primary)', borderRadius: '8px', overflow: 'hidden', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeProduct.image_url ? (
                              <img
                                src={`${API_BASE}${activeProduct.image_url}`}
                                alt={activeProduct.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px' }}>
                                <ProductImageRenderer type={(formFields.category || 'downlight').toLowerCase()} height="160" />
                                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>No photo uploaded</p>
                              </div>
                            )}
                          </div>
                          {isEditing && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px dashed var(--border)', width: '100%', boxSizing: 'border-box', marginTop: '8px', background: 'var(--bg-primary)' }}>
                              📷 {activeProduct.image_url ? 'Replace Product Photo' : 'Upload Product Photo'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadImage(activeProduct.id, e.target.files[0], 'product_image');
                                }
                              }} />
                            </label>
                          )}
                        </div>

                        {/* Technical Image Card */}
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', position: 'relative' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                            📐 Technical / Spec Image
                          </span>
                          <div style={{ marginTop: '10px', position: 'relative', width: '100%', aspectRatio: '4/3', background: 'var(--bg-primary)', borderRadius: '8px', overflow: 'hidden', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeProduct.technical_image_url ? (
                              <img
                                src={`${API_BASE}${activeProduct.technical_image_url}`}
                                alt={`${activeProduct.name} - Technical`}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', padding: '20px' }}>
                                <ProductCADRenderer cutout={activeProduct.cutout || 'N/A'} />
                                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>No technical image uploaded</p>
                              </div>
                            )}
                          </div>
                          {isEditing && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px dashed var(--border)', width: '100%', boxSizing: 'border-box', marginTop: '8px', background: 'var(--bg-primary)' }}>
                              📐 {activeProduct.technical_image_url ? 'Replace Technical Image' : 'Upload Technical Image'}
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadImage(activeProduct.id, e.target.files[0], 'technical_image');
                                }
                              }} />
                            </label>
                          )}
                        </div>

                        {/* Product Name field */}
                        <div className="form-row" style={{ textAlign: 'left' }}>
                          <label className="form-label">Product Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formFields.name || ''}
                            onChange={e => setFormFields({ ...formFields, name: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Custom status flags & Selection criteria */}
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Flags & Parameters</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
                            <div className="form-row">
                              <label className="form-label">Consignment</label>
                              <select 
                                className="form-control"
                                value={formFields.consignment || ''}
                                onChange={e => setFormFields({ ...formFields, consignment: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Red List</label>
                              <select 
                                className="form-control"
                                value={formFields.red_list || ''}
                                onChange={e => setFormFields({ ...formFields, red_list: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">First Fix</label>
                              <select 
                                className="form-control"
                                value={formFields.first_fix || ''}
                                onChange={e => setFormFields({ ...formFields, first_fix: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Selection</label>
                              <input 
                                type="text"
                                className="form-control"
                                value={formFields.selection || ''}
                                onChange={e => setFormFields({ ...formFields, selection: e.target.value })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical specifications details form grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📐 Specifications & Fitting Parameters
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'left' }}>
                            <div className="form-row">
                              <label className="form-label">SKU / Code</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.sku || ''} 
                                onChange={e => setFormFields({ ...formFields, sku: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">One to One Code</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.one_to_one_code || ''} 
                                onChange={e => setFormFields({ ...formFields, one_to_one_code: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Family / Range</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.family || ''} 
                                onChange={e => setFormFields({ ...formFields, family: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Fitting Type</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.category || ''} 
                                onChange={e => setFormFields({ ...formFields, category: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Brand</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.brand || ''} 
                                onChange={e => setFormFields({ ...formFields, brand: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Supplier</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.supplier || ''} 
                                onChange={e => setFormFields({ ...formFields, supplier: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Lead Time</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.lead_time || ''} 
                                onChange={e => setFormFields({ ...formFields, lead_time: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Local / Import</label>
                              <select 
                                className="form-control"
                                value={formFields.origin || ''}
                                onChange={e => setFormFields({ ...formFields, origin: e.target.value })}
                              >
                                <option value="">Select Option</option>
                                <option value="Local">Local</option>
                                <option value="Import">Import</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Product Colour</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.color || ''} 
                                onChange={e => setFormFields({ ...formFields, color: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Cut-Out / Mounting</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.cutout || ''} 
                                onChange={e => setFormFields({ ...formFields, cutout: e.target.value })} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Light Source parameters */}
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Light Source specs</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'left' }}>
                            <div className="form-row">
                              <label className="form-label">Light Source Incl.</label>
                              <select 
                                className="form-control"
                                value={formFields.light_source_incl || ''}
                                onChange={e => setFormFields({ ...formFields, light_source_incl: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Light Source Type</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.light_source_type || ''} 
                                onChange={e => setFormFields({ ...formFields, light_source_type: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Kelvin</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.kelvin || ''} 
                                onChange={e => setFormFields({ ...formFields, kelvin: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Beam Angle</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.beam_angle || ''} 
                                onChange={e => setFormFields({ ...formFields, beam_angle: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">CRI</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.cri || ''} 
                                onChange={e => setFormFields({ ...formFields, cri: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">IP Rating</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.ip_rating || ''} 
                                onChange={e => setFormFields({ ...formFields, ip_rating: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">System Power (W)</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={formFields.system_power || ''} 
                                onChange={e => setFormFields({ ...formFields, system_power: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Lighting Type</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.lighting_type || ''} 
                                onChange={e => setFormFields({ ...formFields, lighting_type: e.target.value })} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dimming and Driver details Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Dimming & Drivers</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', textAlign: 'left' }}>
                            <div className="form-row">
                              <label className="form-label">Dimmable</label>
                              <select 
                                className="form-control"
                                value={formFields.dimmable || ''}
                                onChange={e => setFormFields({ ...formFields, dimmable: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Dimming Protocol</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.dimming_protocol || ''} 
                                onChange={e => setFormFields({ ...formFields, dimming_protocol: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Driver Incl.</label>
                              <select 
                                className="form-control"
                                value={formFields.driver_incl || ''}
                                onChange={e => setFormFields({ ...formFields, driver_incl: e.target.value })}
                              >
                                <option value="">No</option>
                                <option value="Yes">Yes</option>
                              </select>
                            </div>
                            <div className="form-row">
                              <label className="form-label">Driver Location</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.driver_location || ''} 
                                onChange={e => setFormFields({ ...formFields, driver_location: e.target.value })} 
                                placeholder="e.g. Remote / External"
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Qty of Fittings per Driver</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.fittings_per_driver || ''} 
                                onChange={e => setFormFields({ ...formFields, fittings_per_driver: e.target.value })} 
                                placeholder="e.g. 1 Fitting per Driver"
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Series or Parallel Connection</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.driver_connection_type || ''} 
                                onChange={e => setFormFields({ ...formFields, driver_connection_type: e.target.value })} 
                                placeholder="e.g. Series"
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Max Cable Length & Gauge</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.driver_max_cable || ''} 
                                onChange={e => setFormFields({ ...formFields, driver_max_cable: e.target.value })} 
                                placeholder="e.g. 1m away using 0.5mm cable"
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Driver Specification</label>
                              <textarea 
                                className="form-control" 
                                style={{ height: '50px', fontSize: '11.5px', fontFamily: 'monospace' }}
                                value={formFields.driver_spec || ''} 
                                onChange={e => setFormFields({ ...formFields, driver_spec: e.target.value })} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Codes, description and QR Links */}
                        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Custom plan codes & QR</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', textAlign: 'left' }}>
                            <div className="form-row">
                              <label className="form-label">FOH Code</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.foh_code_description || ''} 
                                onChange={e => setFormFields({ ...formFields, foh_code_description: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">Client Description</label>
                              <textarea 
                                className="form-control" 
                                style={{ height: '50px', fontSize: '11.5px' }}
                                value={formFields.client_description || ''} 
                                onChange={e => setFormFields({ ...formFields, client_description: e.target.value })} 
                              />
                            </div>
                            <div className="form-row">
                              <label className="form-label">QR Link</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={formFields.qr_link || ''} 
                                onChange={e => setFormFields({ ...formFields, qr_link: e.target.value })} 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Technical Documents Box */}
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
                              <div className="clickable" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => alert("Downloading Technical Datasheet PDF...")}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={16} color="var(--text-info)" />
                                  <span style={{ fontSize: '11.5px', fontWeight: 500 }}>Technical_Datasheet_{activeProduct.sku.replace(/\s+/g, '_')}.pdf</span>
                                </div>
                                <Download size={14} color="var(--text-secondary)" />
                              </div>
                            )}
                            {isEditing && (
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
                            )}
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
                  </fieldset>
                )}

                {/* 2. COSTING VIEW */}
                {activeTab === 'costing' && (
                  <fieldset disabled={!isEditing} style={{ border: 'none', margin: 0, padding: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Supplier Costing Breakdown */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Supplier & Costing Breakdown</h4>
                      <table className="table" style={{ width: '100%', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th>Supplier</th>
                            <th>Brand</th>
                            <th style={{ textAlign: 'right' }}>Cost Price (R)</th>
                            <th style={{ textAlign: 'right' }}>Internal Cost (R)</th>
                            <th style={{ textAlign: 'center' }}>Mark-Up %</th>
                            <th style={{ textAlign: 'right' }}>Landed Cost (R)</th>
                            <th style={{ textAlign: 'center' }}>Last Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600, color: 'var(--text-info)' }}>{formFields.supplier || activeProduct.supplier}</td>
                            <td>{formFields.brand || activeProduct.brand}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              <input 
                                type="number" 
                                style={{ width: '110px', height: '28px', fontSize: '12px', textAlign: 'right', display: 'inline-block' }}
                                value={formFields.cost_price || ''}
                                onChange={e => {
                                  const cost = parseFloat(e.target.value) || 0;
                                  setFormFields({ ...formFields, cost_price: cost });
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              <input 
                                type="number" 
                                style={{ width: '110px', height: '28px', fontSize: '12px', textAlign: 'right', display: 'inline-block' }}
                                value={formFields.internal_cost || ''}
                                onChange={e => {
                                  const ic = parseFloat(e.target.value) || 0;
                                  setFormFields({ ...formFields, internal_cost: ic });
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="text" 
                                style={{ width: '70px', height: '28px', fontSize: '12px', textAlign: 'center', display: 'inline-block' }}
                                value={formFields.markup || ''}
                                onChange={e => setFormFields({ ...formFields, markup: e.target.value })}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>R {((parseFloat(formFields.cost_price) || 0) * 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{activeProduct.costing?.lastUpdated || 'Jan 25, 2026'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing Tiers & Margin Structure */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600 }}>Pricing & Margin Structure</h4>
                      <table className="table" style={{ width: '100%', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th>Customer Tier</th>
                            <th style={{ textAlign: 'right' }}>Target Price (R)</th>
                            <th style={{ textAlign: 'center' }}>Projected Margin %</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ fontWeight: 600 }}>RRP Price (Selling Price)</td>
                            <td style={{ textAlign: 'right' }}>
                              <input 
                                type="number" 
                                style={{ width: '120px', height: '28px', fontSize: '12px', textAlign: 'right' }}
                                value={formFields.recommended_retail_price || ''}
                                onChange={e => {
                                  const rrp = parseFloat(e.target.value) || 0;
                                  setFormFields({ ...formFields, recommended_retail_price: rrp });
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge b-success" style={{ fontWeight: 700, padding: '2px 8px' }}>
                                {formFields.recommended_retail_price > 0 ? Math.round(((formFields.recommended_retail_price - formFields.cost_price) / formFields.recommended_retail_price) * 100) : 0}% margin
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ fontWeight: 600 }}>Trade / Partner Price</td>
                            <td style={{ textAlign: 'right' }}>
                              <input 
                                type="number" 
                                style={{ width: '120px', height: '28px', fontSize: '12px', textAlign: 'right' }}
                                value={formFields.trade_price || ''}
                                onChange={e => {
                                  const trade = parseFloat(e.target.value) || 0;
                                  setFormFields({ ...formFields, trade_price: trade });
                                }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge b-info" style={{ fontWeight: 700, padding: '2px 8px' }}>
                                {formFields.trade_price > 0 ? Math.round(((formFields.trade_price - formFields.cost_price) / formFields.trade_price) * 100) : 0}% margin
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Costing KPI row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RRP Projected Margin %</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-success)', marginTop: '4px' }}>
                          {formFields.recommended_retail_price > 0 ? Math.round(((formFields.recommended_retail_price - formFields.cost_price) / formFields.recommended_retail_price) * 100) : 0}%
                        </div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Landed Cost</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>R {((parseFloat(formFields.cost_price) || 0) * 1.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RRP Price</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>R {(formFields.recommended_retail_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RRP Net Profit per Unit</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-success)', marginTop: '4px' }}>R {Math.max(0, (formFields.recommended_retail_price || 0) - (formFields.cost_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>

                    {/* Contact Info & Terms footer */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
                      <div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Supplier Contact Info</h5>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={13} /> <a href={`https://${activeProduct.costing?.contactInfo?.website || 'www.eldc.co.za'}`} target="_blank" rel="noreferrer">{activeProduct.costing?.contactInfo?.website || 'www.eldc.co.za'}</a></span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={13} /> {activeProduct.costing?.contactInfo?.email || 'orders@eldc.co.za'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} /> {activeProduct.costing?.contactInfo?.phone || '+27 (0) 21 448 8658'}</span>
                        </div>
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Fulfillment Terms</h5>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                          {activeProduct.costing?.terms || 'Standard payment structure: 50% deposit, balance paid in full prior to release.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  </fieldset>
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

                {/* 5. AUDIT TRAIL VIEW */}
                {activeTab === 'audit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>📜 Product Modification Audit Trail (Cloud SQL Log)</h4>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '11px' }} onClick={() => fetchAuditLogs(activeProduct.id)}>🔄 Refresh Log</button>
                      </div>

                      {isLoadingAuditLogs ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading database audit history...</div>
                      ) : auditLogs.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          No audit log entries recorded for this SKU yet. Any cell edits made in Bulk Grid or Workspace will log here permanently.
                        </div>
                      ) : (
                        <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              <th>Timestamp</th>
                              <th>Field Changed</th>
                              <th>Old Value</th>
                              <th>New Value</th>
                              <th>Modified By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr key={log.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{log.timestamp}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-info)' }}>{log.field_changed}</td>
                                <td style={{ color: 'var(--text-danger)', fontFamily: 'monospace' }}>{log.old_value || '(empty)'}</td>
                                <td style={{ color: 'var(--text-success)', fontFamily: 'monospace', fontWeight: 600 }}>{log.new_value}</td>
                                <td>{log.updated_by_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. LINKED ACCESSORIES & DRIVERS VIEW */}
                {activeTab === 'accessories' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 600 }}>⚡ Link Compatible Accessories, Drivers & Bezels</h4>
                      
                      {/* ADD ACCESSORY ROW */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Select Product to Link:</label>
                          <select 
                            className="form-control" 
                            style={{ height: '32px', fontSize: '12px' }}
                            value={newAccessoryId}
                            onChange={e => setNewAccessoryId(e.target.value)}
                          >
                            <option value="">-- Choose Driver or Accessory SKU --</option>
                            {products.filter(p => p.id !== activeProduct.id).map(p => (
                              <option key={p.id} value={p.id}>[{p.sku}] — {p.name} (R {p.retail_price || p.unitCost || 0})</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ width: '180px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Relationship Type:</label>
                          <select 
                            className="form-control" 
                            style={{ height: '32px', fontSize: '12px' }}
                            value={newAccessoryType}
                            onChange={e => setNewAccessoryType(e.target.value)}
                          >
                            <option value="Required Driver">Required Driver</option>
                            <option value="Optional Bezel / Trim">Optional Bezel / Trim</option>
                            <option value="Emergency Battery Pack">Emergency Battery Pack</option>
                            <option value="Dimmer Controller">Dimmer Controller</option>
                          </select>
                        </div>

                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ height: '32px', marginTop: '18px', padding: '0 16px', fontSize: '12px' }}
                          onClick={() => handleAddAccessory(activeProduct.id)}
                        >
                          ➕ Link Accessory
                        </button>
                      </div>

                      {/* ACCESSORIES TABLE */}
                      {isLoadingAccessories ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading linked accessories...</div>
                      ) : accessoriesList.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                          No drivers or accessories linked to this fitting yet.
                        </div>
                      ) : (
                        <table className="table" style={{ width: '100%', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                              <th>Relationship</th>
                              <th>Accessory SKU</th>
                              <th>Description / Name</th>
                              <th style={{ textAlign: 'right' }}>RRP Price</th>
                              <th style={{ textAlign: 'center' }}>Stock Qty</th>
                              <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accessoriesList.map((acc) => (
                              <tr key={acc.id}>
                                <td>
                                  <span className="badge b-info" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                    {acc.relationship_type}
                                  </span>
                                </td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{acc.sku}</td>
                                <td>{acc.name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>R {(acc.retail_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{acc.stock || 0}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ color: 'var(--text-danger)', padding: '2px 6px', fontSize: '11px' }}
                                    onClick={() => handleRemoveAccessory(activeProduct.id, acc.id)}
                                  >
                                    🗑️ Unlink
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
