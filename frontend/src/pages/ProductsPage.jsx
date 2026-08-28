import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  ArrowLeft, Search, Plus, FileText, Download, ShieldCheck, Mail, Globe, Phone, MapPin, 
  Truck, CreditCard, Clock, Star, TrendingUp, AlertTriangle, Package, Percent, Info, Settings,
  RefreshCw, ExternalLink, ArrowUp, ArrowDown, ArrowUpDown
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
const StockTrendChart = ({ chartPoints = [], currentStock = 0 }) => {
  const pointsData = chartPoints && chartPoints.length > 0
    ? chartPoints 
    : [{ date: 'Today', balance: currentStock }];

  const balances = pointsData.map(h => h.balance);
  const dates = pointsData.map(h => h.date);

  const maxVal = Math.max(...balances, 10) * 1.25;
  const chartWidth = 650;
  const chartHeight = 170;
  const paddingX = 45;
  const paddingY = 30;
  
  const points = balances.map((val, idx) => {
    const x = paddingX + (idx * (chartWidth - paddingX * 2)) / (balances.length - 1 || 1);
    const y = chartHeight - paddingY - (val * (chartHeight - paddingY * 2)) / (maxVal || 1);
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
        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Live Palladium ERP stock movement ledger</span>
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
      supplier_details_json: p.supplier_details_json || [],
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

  // Dynamic Filter Options from Database
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    suppliers: [],
    brands: [],
    families: []
  });

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/filter-options`);
      if (res.ok) {
        const data = await res.json();
        setFilterOptions({
          categories: data.categories || [],
          suppliers: data.suppliers || [],
          brands: data.brands || [],
          families: data.families || []
        });
      }
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // Sorting States (mirrored from Orders module)
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    let newDir = 'asc';
    if (sortField === field) {
      newDir = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDir);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
    fetchPage({
      page: 1,
      q: searchQuery,
      cat: categoryFilter,
      sup: supplierFilter,
      sort_by: field,
      sort_dir: newDir
    });
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ marginLeft: '4px', opacity: 0.4 }} />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} style={{ marginLeft: '4px', color: 'var(--primary)' }} />
    ) : (
      <ArrowDown size={12} style={{ marginLeft: '4px', color: 'var(--primary)' }} />
    );
  };

  // Fetch a single page from backend with server-side filtering and sorting
  const fetchPage = async ({ 
    page = 1, 
    q = searchQuery, 
    cat = categoryFilter, 
    sup = supplierFilter, 
    sort_by = sortField, 
    sort_dir = sortDirection 
  } = {}) => {
    setIsLoadingProducts(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (q) params.set('q', q);
      if (cat && cat !== 'All Categories') params.set('category', cat);
      if (sup && sup !== 'All Suppliers') params.set('supplier', sup);
      if (sort_by) {
        params.set('sort_by', sort_by);
        params.set('sort_dir', sort_dir || 'asc');
      }
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
  const isSyncActive = isSyncingPalladium || Boolean(palladiumStatus?.is_syncing);
  const prevSyncingRef = useRef(false);

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
    triggerToast("⚡ Initiating unified master sync (Palladium ERP + Google Sheets + Inbox routing)...");
    try {
      const res = await fetch(`${API_BASE}/api/palladium/sync`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.status === 'in_progress') {
          triggerToast(`⏳ ${data.message || 'Synchronization is actively running in background...'}`);
        } else {
          triggerToast(`🎉 ${data.message || 'Master sync completed successfully!'}`);
          fetchPage({ page: 1, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
          fetchSummary();
          fetchFilterOptions();
          fetchSpecsSheetInfo();
        }
      } else {
        triggerToast(`⚠️ Sync Notice: ${data.detail || 'Failed to trigger sync.'}`);
      }
    } catch (e) {
      triggerToast(`⚠️ Sync Connection Error: ${e.message}`);
    } finally {
      await fetchPalladiumStatus();
      setIsSyncingPalladium(false);
    }
  };

  // Backwards-compat alias used by import handler
  const fetchProducts = () => {
    fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
    fetchSummary();
    fetchPalladiumStatus();
    fetchFilterOptions();
  };

  useEffect(() => {
    fetchSummary();
    fetchPalladiumStatus();
    fetchFilterOptions();
    fetchPage({ page: 1, q: '', cat: 'All Categories', sup: 'All Suppliers', sort_by: 'name', sort_dir: 'asc' });
  }, []);

  // Adaptive sync polling: 2 seconds when actively syncing, 30 seconds when idle
  useEffect(() => {
    const intervalTime = isSyncActive ? 2000 : 30000;
    const statusTimer = setInterval(() => {
      fetchPalladiumStatus();
    }, intervalTime);
    return () => clearInterval(statusTimer);
  }, [isSyncActive]);

  // When background sync transitions from running to finished, automatically refresh table & data
  useEffect(() => {
    if (prevSyncingRef.current && !isSyncActive) {
      fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
      fetchSummary();
      fetchFilterOptions();
      fetchSpecsSheetInfo();
      triggerToast("🎉 Master synchronization completed! All products & Google Sheets refreshed.");
    }
    prevSyncingRef.current = isSyncActive;
  }, [isSyncActive]);

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

  // 3. Stock History State (Live from Palladium)
  const [stockHistoryData, setStockHistoryData] = useState(null);
  const [isLoadingStockHistory, setIsLoadingStockHistory] = useState(false);

  const fetchStockHistory = async (sku) => {
    if (!sku) return;
    setIsLoadingStockHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/palladium/products/${encodeURIComponent(sku)}/stock-history`);
      if (res.ok) {
        const data = await res.json();
        setStockHistoryData(data);
      } else {
        setStockHistoryData(null);
      }
    } catch (err) {
      console.error('Failed to fetch stock history:', err);
      setStockHistoryData(null);
    } finally {
      setIsLoadingStockHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && selectedSku) {
      fetchStockHistory(selectedSku);
    }
  }, [activeTab, selectedSku]);

  // 4. Google Sheets Specifications Master State
  const [specsSheetInfo, setSpecsSheetInfo] = useState({ configured: false, spreadsheet_url: '', last_synced_at: '' });
  const [isSyncingSheetSpecs, setIsSyncingSheetSpecs] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  const fetchSpecsSheetInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/specs-sheet-info`);
      if (res.ok) {
        const data = await res.json();
        setSpecsSheetInfo(data);
      }
    } catch (e) {
      console.error("Failed to fetch specs sheet info", e);
    }
  };

  const handleGenerateSpecsSheet = async () => {
    setIsGeneratingSheet(true);
    triggerToast("Generating Master Product Specifications Google Sheet in Google Drive...");
    try {
      const res = await fetch(`${API_BASE}/api/products/generate-specs-sheet`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        triggerToast("🎉 Google Sheet created and populated successfully in Drive!");
        setSpecsSheetInfo(data);
        if (data.spreadsheet_url) {
          window.open(data.spreadsheet_url, '_blank');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Sheet Generation Error: ${err.detail || 'Failed to generate sheet'}`);
      }
    } catch (e) {
      alert(`Connection error: ${e.message}`);
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const handleSyncSheetSpecs = async () => {
    setIsSyncingSheetSpecs(true);
    triggerToast("Synchronizing specifications & images from Google Sheet...");
    try {
      const res = await fetch(`${API_BASE}/api/products/sync-sheet-specs`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        triggerToast(`🎉 ${data.message || 'Specifications synchronized successfully!'}`);
        fetchPage({ page: currentPage, q: searchQuery, cat: categoryFilter });
        fetchSpecsSheetInfo();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Sheet Sync Notice: ${err.detail || 'Failed to sync with Google Sheet'}`);
      }
    } catch (e) {
      alert(`Connection error: ${e.message}`);
    } finally {
      setIsSyncingSheetSpecs(false);
    }
  };

  useEffect(() => {
    fetchSpecsSheetInfo();
  }, []);

  // 5. Excel Import Progress Modal State
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
      fetchPage({ page: 1, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
    }, 350);
  }, [searchQuery, categoryFilter, supplierFilter]);

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
        fitting_type: activeProduct.fitting_type || '',
        consignment: activeProduct.consignment || '',
        selection: activeProduct.selection || '',
        first_fix: activeProduct.first_fix || '',
        red_list: activeProduct.red_list || '',
        markup: activeProduct.markup || '',
        recommended_retail_price: activeProduct.recommended_retail_price || activeProduct.retailPrice || 0,
        internal_cost: activeProduct.internal_cost || activeProduct.unitCost || 0,
        supplier_name: activeProduct.supplier_name || activeProduct.supplier || '',
        local_or_import: activeProduct.local_or_import || '',
        driver_location: activeProduct.driver_location || '',
        fittings_per_driver: activeProduct.fittings_per_driver || '',
        driver_connection_type: activeProduct.driver_connection_type || '',
        driver_max_cable: activeProduct.driver_max_cable || '',
        qr: activeProduct.qr || '',
        qr_link: activeProduct.qr_link || '',
        client_code: activeProduct.client_code || '',
        one_to_one_code: activeProduct.one_to_one_code || '',
        foh_code_description: activeProduct.foh_code_description || '',
        client_description: activeProduct.client_description || '',
        wetworks: activeProduct.wetworks || '',
        image_url: activeProduct.image_url || activeProduct.image || '',
        technical_image_url: activeProduct.technical_image_url || '',
        status: activeProduct.status || 'Active',
      });
      // Automatically fetch live stock history from Palladium for the active product
      fetchStockHistory(activeProduct.sku);
    }
  }, [activeProduct]);

  // Date Filter Preset Logic
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Today') {
      const formatted = formatDate(today);
      setStartDate(formatted);
      setEndDate(formatted);
    } else if (preset === 'This Week') {
      const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      setStartDate(formatDate(firstDayOfWeek));
      setEndDate(formatDate(new Date()));
    } else if (preset === 'This Month') {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDayOfMonth));
      setEndDate(formatDate(new Date()));
    } else if (preset === 'Last 30 Days') {
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 1000);
      setStartDate(formatDate(lastMonth));
      setEndDate(formatDate(today));
    }
  };

  // Sort Logic for Products Module (mirrored from Orders module)
  const sortedProducts = useMemo(() => {
    if (!sortField) return products;

    const getVal = (item, field) => {
      switch (field) {
        case 'image':
          return (item.image || item.image_url) ? 1 : 0;
        case 'sku':
          return (item.sku || '').toLowerCase();
        case 'name':
        case 'description':
          return (item.name || '').toLowerCase();
        case 'family':
          return (item.family || '').toLowerCase();
        case 'brand':
          return (item.brand || '').toLowerCase();
        case 'supplier':
          return (item.supplier || item.supplier_name || '').toLowerCase();
        case 'unit_cost':
        case 'unitCost':
          return Number(item.unitCost ?? item.cost_price ?? 0) || 0;
        case 'retail_price':
        case 'retailPrice':
          return Number(item.retailPrice ?? item.recommended_retail_price ?? item.retail_price ?? 0) || 0;
        case 'stock':
        case 'stock_qty':
          return Number(item.stock ?? item.stock_level ?? 0) || 0;
        default:
          return (item[field] || '').toString().toLowerCase();
      }
    };

    return [...products].sort((a, b) => {
      const valA = getVal(a, sortField);
      const valB = getVal(b, sortField);

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sortField, sortDirection]);

  // Products already filtered server-side; expose sorted list
  const filteredProducts = sortedProducts;

  // Aggregate stats — use global database summary across all 6,367+ products
  const kpis = useMemo(() => {
    const totalSku = summary.total || totalCount;
    const lowStock = summary.low_stock || 0;
    const outStock = summary.out_of_stock || 0;
    const avgMargin = summary.avg_margin_pct !== undefined ? summary.avg_margin_pct : 37;
    const totalVal = summary.total_valuation !== undefined ? summary.total_valuation : 0;
    const totalMargin = summary.total_margin_val !== undefined ? summary.total_margin_val : 0;
    const totalUnits = summary.total_units !== undefined ? summary.total_units : 0;
    return { totalSku, lowStock, outStock, avgMargin, totalVal, totalMargin, totalUnits };
  }, [summary, totalCount]);

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
      local_or_import: formFields.local_or_import,
      wetworks: formFields.wetworks,
      image_url: formFields.image_url,
      technical_image_url: formFields.technical_image_url,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span className="badge b-success" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>{getModuleName('products', 'Products')} Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Dual Feed: Palladium ERP & Master Google Sheets</span>
                  {isSyncActive ? (
                    <span style={{ fontSize: '11px', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(2, 132, 199, 0.12)', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '3px 12px', borderRadius: '12px', fontWeight: 600 }}>
                      <RefreshCw size={11} className="animate-spin" color="#0284c7" />
                      <span>{palladiumStatus?.current_step || 'Syncing ERP & Google Sheets...'}</span>
                    </span>
                  ) : (
                    palladiumStatus?.last_synced_at && (
                      <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 10px', borderRadius: '12px', fontWeight: 600 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        Auto-Sync Active (Every 15m) • Last Synced: {(() => {
                          const d = palladiumStatus.last_synced_at;
                          const str = String(d);
                          const dateObj = !str.endsWith('Z') && !str.includes('+') ? new Date(str + 'Z') : new Date(str);
                          return isNaN(dateObj.getTime()) ? 'Live' : dateObj.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                        })()}
                      </span>
                    )
                  )}
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📦 {getModuleName('products', 'Products')} Master Database
                </h1>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleTriggerPalladiumSync}
                  disabled={isSyncActive}
                  className="btn btn-ghost"
                  title="Unified Sync from Palladium ERP and Master Google Sheet"
                  style={{ 
                    border: isSyncActive ? '1px solid #0284c7' : '1px solid #10b981', 
                    color: isSyncActive ? '#0284c7' : '#10b981', 
                    background: isSyncActive ? 'rgba(2, 132, 199, 0.08)' : 'rgba(16, 185, 129, 0.08)', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '12px', 
                    height: '36px',
                    fontWeight: 600,
                    cursor: isSyncActive ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={14} className={isSyncActive ? 'animate-spin' : ''} />
                  {isSyncActive 
                    ? (palladiumStatus?.current_step || 'Syncing in Progress...') 
                    : '⚡ Sync Master (ERP + Google Sheets)'}
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
                {kpis.totalSku.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>SKUs</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Stock Value: <strong>R {kpis.totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                <span>Units: <strong>{kpis.totalUnits.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Low Stock Items</span>
                <AlertTriangle size={15} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-warning)' }}>
                {kpis.lowStock.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Count</span>
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
                {kpis.outStock.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Count</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <span className="badge b-danger" style={{ fontSize: '8.5px', padding: '1px 6px' }}>Stock Alert</span> zero or negative inventory
              </div>
            </div>

            <div className="stat" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Stock Margin Potential</span>
                <Percent size={15} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-success)' }}>
                {kpis.avgMargin}% <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Avg Margin</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                Stock Profit Potential: <strong>R {kpis.totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
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
                  style={{ width: '180px', height: '34px', fontSize: '12.5px' }}
                  value={categoryFilter}
                  onChange={e => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All Categories">All Categories {filterOptions.categories.length > 0 ? `(${filterOptions.categories.length})` : ''}</option>
                  {filterOptions.categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  className="form-control"
                  style={{ width: '180px', height: '34px', fontSize: '12.5px' }}
                  value={supplierFilter}
                  onChange={e => {
                    setSupplierFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All Suppliers">All Suppliers {filterOptions.suppliers.length > 0 ? `(${filterOptions.suppliers.length})` : ''}</option>
                  {filterOptions.suppliers.map(sup => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
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
                    <th 
                      onClick={() => handleSort('image')} 
                      style={{ width: '56px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        IMAGE {renderSortIcon('image')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('sku')} 
                      style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        SKU {renderSortIcon('sku')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('name')} 
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        DESCRIPTION / PRODUCT {renderSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('category')} 
                      style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        CATEGORY {renderSortIcon('category')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('family')} 
                      style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        FAMILY {renderSortIcon('family')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('brand')} 
                      style={{ width: '110px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        BRAND {renderSortIcon('brand')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('supplier')} 
                      style={{ width: '120px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        SUPPLIER {renderSortIcon('supplier')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('unit_cost')} 
                      style={{ textAlign: 'right', width: '110px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                        UNIT COST {renderSortIcon('unit_cost')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('retail_price')} 
                      style={{ textAlign: 'right', width: '110px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%' }}>
                        RRP PRICE {renderSortIcon('retail_price')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('stock')} 
                      style={{ textAlign: 'center', width: '95px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                        STOCK QTY {renderSortIcon('stock')}
                      </div>
                    </th>
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
                        {p.image_url ? (
                          <div style={{ width: '40px', height: '40px', position: 'relative', margin: '0 auto', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                              src={p.image_url.startsWith('http') ? p.image_url : `${API_BASE}${p.image_url}`}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                              onError={e => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>—</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</td>
                      
                      {/* DESCRIPTION / NAME */}
                      <td style={{ verticalAlign: 'middle', fontWeight: 500 }}>{p.name}</td>

                      {/* CATEGORY */}
                      <td style={{ verticalAlign: 'middle' }}>
                        {p.category ? (
                          <span className="badge b-secondary" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 600 }}>
                            {p.category}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      <td style={{ verticalAlign: 'middle' }}>{p.family || '—'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.brand || '—'}</td>
                      <td style={{ verticalAlign: 'middle' }}>{p.supplier_name || p.supplier || '—'}</td>
                      
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
                      <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
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
                      fetchPage({ page: nextP, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
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
                      fetchPage({ page: nextP, q: searchQuery, cat: categoryFilter, sup: supplierFilter, sort_by: sortField, sort_dir: sortDirection });
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
                  { id: 'history', label: 'Stock History' },
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
                      if (t.id === 'history' && activeProduct?.sku) fetchStockHistory(activeProduct.sku);
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* Google Sheets Specs Master Toolbar */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                          📊
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Specifications & Digital Assets Master
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Synchronized with 30-Column Master Google Sheet • Tab: <code>ITEM DATABASE</code>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ fontSize: '11px', padding: '6px 14px', height: '32px' }}
                          onClick={handleSyncSheetSpecs}
                          disabled={isSyncingSheetSpecs}
                        >
                          <RefreshCw size={13} className={isSyncingSheetSpecs ? 'spin' : ''} /> {isSyncingSheetSpecs ? 'Syncing...' : 'Sync From Google Sheet'}
                        </button>
                        
                        <a 
                          href={specsSheetInfo.spreadsheet_url || "https://docs.google.com/spreadsheets/d/15A8TQ-BAXITQy7-BWfg6O8zeg71K3_lRITuWxIDYMYU/edit"} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-ghost btn-sm" 
                          style={{ border: '1px solid var(--border)', fontSize: '11px', padding: '6px 14px', height: '32px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <ExternalLink size={13} /> Open Master Sheet ↗
                        </a>

                        {!specsSheetInfo.spreadsheet_url && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '11px', padding: '6px 12px', height: '32px' }}
                            onClick={handleGenerateSpecsSheet}
                            disabled={isGeneratingSheet}
                          >
                            ⚡ Generate Sheet
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hero Product Summary Header Card */}
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                            {activeProduct.name || activeProduct.sku}
                          </div>
                          {activeProduct.client_description && activeProduct.client_description !== activeProduct.name && (
                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {activeProduct.client_description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {activeProduct.one_to_one_code && (
                            <span className="badge b-info" style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700, fontFamily: 'monospace' }}>
                              {activeProduct.one_to_one_code}
                            </span>
                          )}
                          <span className="badge b-ghost" style={{ fontSize: '11px', padding: '4px 8px', fontFamily: 'monospace' }}>
                            SKU: {activeProduct.sku}
                          </span>
                          <span className={`badge ${activeProduct.selection?.toLowerCase().includes('non') ? 'b-ghost' : 'b-success'}`} style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700 }}>
                            {activeProduct.selection || 'Selection'}
                          </span>
                        </div>
                      </div>

                      {/* Quick Specs Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                        {activeProduct.brand && (
                          <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Brand: <strong>{activeProduct.brand}</strong>
                          </span>
                        )}
                        {activeProduct.family && (
                          <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Family: <strong>{activeProduct.family}</strong>
                          </span>
                        )}
                        {activeProduct.category && (
                          <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Category: <strong>{activeProduct.category}</strong>
                          </span>
                        )}
                        {activeProduct.lighting_type && (
                          <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Type: <strong>{activeProduct.lighting_type}</strong>
                          </span>
                        )}
                        {activeProduct.local_or_import && (
                          <span style={{ fontSize: '11px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Origin: <strong>{activeProduct.local_or_import}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Master 3-Column Specifications Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                      
                      {/* ========================================================
                          COLUMN 1: VISUAL ASSETS & PDF DATASHEET
                          ======================================================== */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Product Photo Card */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                              📷 Product Visual Asset
                            </span>
                            {activeProduct.image_url && (
                              <span className="badge b-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Linked</span>
                            )}
                          </div>
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeProduct.image_url ? (
                              <img
                                src={activeProduct.image_url.startsWith('http') ? activeProduct.image_url : `${API_BASE}${activeProduct.image_url}`}
                                alt={activeProduct.name}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.6 }}>📷</span>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Visual Photo Provided</div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Add a photo URL in column F of the Google Sheet</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Technical / CAD Drawing Card */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                              📐 Technical Dimension / CAD Drawing
                            </span>
                            {activeProduct.technical_image_url && (
                              <span className="badge b-success" style={{ fontSize: '9px', padding: '1px 6px' }}>Linked</span>
                            )}
                          </div>
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeProduct.technical_image_url ? (
                              <img
                                src={activeProduct.technical_image_url.startsWith('http') ? activeProduct.technical_image_url : `${API_BASE}${activeProduct.technical_image_url}`}
                                alt={`${activeProduct.name} - Technical`}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
                                <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px', opacity: 0.6 }}>📐</span>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>No CAD Drawing Provided</div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Add a technical drawing URL in column G of the Google Sheet</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Official PDF Datasheet Button */}
                        {(activeProduct.qr_link || activeProduct.spec_sheet_url) && (
                          <a 
                            href={activeProduct.qr_link || activeProduct.spec_sheet_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-outline" 
                            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '10px' }}
                          >
                            <FileText size={15} color="var(--text-info)" /> Open Official Spec Sheet (PDF) ↗
                          </a>
                        )}
                      </div>

                      {/* ========================================================
                          COLUMN 2: LIGHTING PERFORMANCE & ELECTRICAL
                          ======================================================== */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Optical Metrics KPI Grid */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💡 Lighting Performance & Optical Metrics
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>System Power (W)</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.system_power ? `${activeProduct.system_power} W` : '—'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Color Temp (CCT)</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.kelvin || '—'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Color Rendering</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.cri ? (String(activeProduct.cri).toUpperCase().startsWith('CRI') ? activeProduct.cri : `CRI ${activeProduct.cri}`) : '—'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Beam Angle</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.beam_angle || '—'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Ingress Protection</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.ip_rating ? (String(activeProduct.ip_rating).toUpperCase().startsWith('IP') || String(activeProduct.ip_rating).toLowerCase().includes('non') ? activeProduct.ip_rating : `IP${activeProduct.ip_rating}`) : '—'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Lighting Type</span>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                {activeProduct.lighting_type || '—'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dimming, Driver & Light Source Specifications */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⚡ Dimming, Drivers & Light Source
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Dimmable</span>
                              <strong>{activeProduct.dimmable || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Dimming Protocol</span>
                              <strong className={activeProduct.dimming_protocol ? "badge b-info" : ""} style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {activeProduct.dimming_protocol || 'On-Off'}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Driver Included</span>
                              <strong>{activeProduct.driver_incl || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Light Source Included</span>
                              <strong>{activeProduct.light_source_incl || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Light Source Type</span>
                              <strong>{activeProduct.light_source_type || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Ceiling Cutout</span>
                              <strong style={{ fontFamily: 'monospace' }}>{activeProduct.cutout || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Finish / Color</span>
                              <strong>{activeProduct.color || '—'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ========================================================
                          COLUMN 3: PROJECT SPECIFICATIONS & WETWORKS
                          ======================================================== */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Project & 1-to-1 Specifications Card */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📋 Project & Catalog Classification
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>1-to-1 Code</span>
                              <strong style={{ fontFamily: 'monospace', color: 'var(--text-info)' }}>{activeProduct.one_to_one_code || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>FOH Code</span>
                              <strong>{activeProduct.foh_code_description || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Client Description</span>
                              <strong>{activeProduct.client_description || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Family</span>
                              <strong>{activeProduct.family || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Category</span>
                              <strong>{activeProduct.category || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Brand</span>
                              <strong>{activeProduct.brand || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Selection Status</span>
                              <strong>{activeProduct.selection || '—'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Procurement & Sourcing Card */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📦 Procurement & Compliance
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Local / Import</span>
                              <strong>{activeProduct.local_or_import || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Consignment</span>
                              <strong>{activeProduct.consignment || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Redlist</span>
                              <strong>{activeProduct.red_list || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>First Fix</span>
                              <strong>{activeProduct.first_fix || '—'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Wetworks & Installation Specifications Card */}
                        <div className="card" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🌊 Wetworks & Installation Constraints
                          </h4>
                          <div style={{ 
                            background: 'rgba(245, 158, 11, 0.06)', 
                            border: '1px solid rgba(245, 158, 11, 0.25)', 
                            borderRadius: '8px', 
                            padding: '12px 14px', 
                            fontSize: '12px', 
                            lineHeight: '1.6', 
                            color: 'var(--text-primary)',
                            whiteSpace: 'pre-line',
                            fontFamily: activeProduct.wetworks ? 'inherit' : 'sans-serif'
                          }}>
                            {activeProduct.wetworks ? activeProduct.wetworks : 'No special wetworks or installation constraints specified.'}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. COSTING & COMMERCIAL STRUCTURE VIEW */}
                {activeTab === 'costing' && (
                  <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* 1. TOP COMMERCIAL KPI SUMMARY CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      
                      {/* Supplier Unit Cost */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                          📦 Supplier Cost Price
                        </span>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                          R {(activeProduct.unitCost || activeProduct.cost_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Palladium Price List Cost (Last PP)
                        </span>
                      </div>

                      {/* RRP Selling Price */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                          🏷️ RRP Selling Price (Excl. VAT)
                        </span>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-info)', marginTop: '6px' }}>
                          R {(activeProduct.retailPrice || activeProduct.retail_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          R {((activeProduct.retailPrice || activeProduct.retail_price || 0) * 1.15).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Incl. 15% VAT)
                        </span>
                      </div>

                      {/* Gross Profit Margin % & Markup */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                          📈 Profit Margin & Mark-Up
                        </span>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
                          {activeProduct.retailPrice > 0 ? (((activeProduct.retailPrice - activeProduct.unitCost) / activeProduct.retailPrice) * 100).toFixed(1) : '0.0'}% Margin
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Mark-Up: {activeProduct.unitCost > 0 ? (((activeProduct.retailPrice - activeProduct.unitCost) / activeProduct.unitCost) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>

                      {/* Total Warehouse Stock Valuation */}
                      {(() => {
                        const onHandVal = typeof activeProduct.stock_on_hand === 'number' ? activeProduct.stock_on_hand : (activeProduct.stock ?? 0);
                        const unitCostVal = activeProduct.unitCost || activeProduct.cost_price || 0;

                        return (
                          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                              🏢 Total Stock Valuation
                            </span>
                            <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                              R {(onHandVal * unitCostVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                              {onHandVal} {activeProduct.unit_of_measure || 'EA'} Physical On Hand
                            </span>
                          </div>
                        );
                      })()}

                    </div>

                    {/* 2. VENDOR & COMMERCIAL PROCUREMENT DETAILS (LIST TABLE) */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🏢 Vendor & Commercial Procurement List
                        </h4>
                        <span className="badge b-success" style={{ fontSize: '10px', padding: '3px 8px' }}>
                          Source: Palladium tblInvVend
                        </span>
                      </div>

                      {(() => {
                        const rawVendors = activeProduct.supplier_details_json;
                        const vendorList = Array.isArray(rawVendors) 
                          ? rawVendors 
                          : (rawVendors && typeof rawVendors === 'object' && Object.keys(rawVendors).length > 0 ? [rawVendors] : []);

                        if (vendorList.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                              <div style={{ fontSize: '20px', marginBottom: '4px' }}>📦</div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                No alternate vendors or procurement price lists linked in Palladium.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', fontSize: '11.5px', margin: 0, textAlign: 'left', whiteSpace: 'nowrap' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                  <th style={{ padding: '8px 12px' }}>Number</th>
                                  <th style={{ padding: '8px 12px' }}>Vendor Name</th>
                                  <th style={{ padding: '8px 12px' }}>Vendor Item Code</th>
                                  <th style={{ padding: '8px 12px' }}>Vendor Item Description</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Warranty</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Vendor Price</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Exchange</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Local Price</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Disc %</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Landed Cost Factor %</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Estimated Landed</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Preferred</th>
                                </tr>
                              </thead>
                              <tbody>
                                {vendorList.map((vend, idx) => (
                                  <tr key={idx}>
                                    <td style={{ padding: '9px 12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                      {vend.vendor_number || vend.vend_code || vend.vendor_name || '-'}
                                    </td>
                                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {vend.vendor_name || vend.vend_code || '-'}
                                    </td>
                                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>
                                      {vend.vendor_item_code || vend.vend_item_code || '-'}
                                    </td>
                                    <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {vend.vendor_item_desc || vend.vend_item_desc || '-'}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                      {vend.warranty_days !== undefined ? vend.warranty_days : 0}
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>
                                      {(vend.vendor_price !== undefined ? vend.vendor_price : (vend.vend_price || 0)).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                      {(vend.exchange_rate !== undefined ? vend.exchange_rate : 1.0).toFixed(4)}
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {(vend.local_price !== undefined ? vend.local_price : (vend.vend_local_price || 0)).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                      {(vend.discount_pct !== undefined ? vend.discount_pct : 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                      {(vend.landed_cost_factor_pct !== undefined ? vend.landed_cost_factor_pct : 0).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {(vend.estimated_landed !== undefined ? vend.estimated_landed : (vend.local_price || 0)).toFixed(2)}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                                      {vend.is_preferred ? (
                                        <span style={{ color: '#10b981', fontSize: '14px', fontWeight: 700 }}>
                                          ☑
                                        </span>
                                      ) : (
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>☐</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 3. LIVE INVENTORY & WAREHOUSE LOCATION BREAKDOWN */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>🏢 Live Warehouse Stock & Allocations</h4>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          Unit of Measure: <strong>{activeProduct.unit_of_measure || 'EA'}</strong> | Lead Time: <strong>{activeProduct.lead_time || 'In Stock'}</strong>
                        </span>
                      </div>

                      {(() => {
                        const availVal = typeof activeProduct.stock_available === 'number' ? activeProduct.stock_available : (activeProduct.stock ?? 0);
                        const onHandVal = typeof activeProduct.stock_on_hand === 'number' ? activeProduct.stock_on_hand : 0;
                        const allocVal = activeProduct.stock_allocated || 0;
                        const onOrderVal = activeProduct.stock_on_order || 0;

                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Available to Sell</span>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: availVal > 0 ? '#10b981' : (availVal === 0 ? 'var(--text-secondary)' : 'var(--text-danger)'), marginTop: '4px' }}>
                                {availVal}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Physical On Hand</span>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                                {onHandVal}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Allocated to Orders</span>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-warning)', marginTop: '4px' }}>
                                {allocVal}
                              </div>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Incoming (On PO)</span>
                              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-info)', marginTop: '4px' }}>
                                {onOrderVal}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Detailed Location & Bin Breakdown Rows */}
                      {(() => {
                        const rawLocs = activeProduct.stock_locations_json;
                        let locList = [];
                        if (Array.isArray(rawLocs)) {
                          locList = rawLocs;
                        } else if (rawLocs && typeof rawLocs === 'object') {
                          locList = Object.entries(rawLocs).map(([locName, locData]) => ({
                            location: locName,
                            bin_code: 'DEFAULT',
                            bin_desc: 'General Location',
                            on_hand: locData.on_hand || 0,
                            avail: locData.avail || 0,
                            alloc: locData.alloc || 0
                          }));
                        }

                        if (locList.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                              No location or bin allocation records found. All stock managed under standard inventory.
                            </div>
                          );
                        }

                        return (
                          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                              Warehouse & Bin Breakdown
                            </div>
                            <table className="table" style={{ width: '100%', fontSize: '12px', margin: 0 }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-primary)' }}>
                                  <th style={{ padding: '8px 12px' }}>Warehouse / Location</th>
                                  <th style={{ padding: '8px 12px' }}>Bin / Shelf / Zone</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Physical On Hand</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Available to Sell</th>
                                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Allocated</th>
                                </tr>
                              </thead>
                              <tbody>
                                {locList.map((loc, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontWeight: 600, padding: '9px 12px' }}>
                                      {loc.location === 'STOCK' ? '🏢 Main Warehouse (STOCK)' : loc.location === 'PROJECT' ? '📋 Project Allocated (PROJECT)' : loc.location === 'FAULT' ? '⚠️ Fault / QA (FAULT)' : (loc.location || 'Warehouse')}
                                    </td>
                                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)' }}>
                                      {loc.bin_code && loc.bin_code !== 'DEFAULT' ? `📍 ${loc.bin_code}` : 'Standard Bin'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', padding: '9px 12px' }}>
                                      {loc.on_hand || 0}
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700, padding: '9px 12px' }}>
                                      {loc.avail || 0}
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-warning)', fontWeight: 600, padding: '9px 12px' }}>
                                      {loc.alloc || 0}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 4. DISCREET ERP SYNC FOOTER */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-secondary)', padding: '2px 4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                        ERP Data Source: <strong>paldbOnetoOneLive</strong>
                      </span>
                      <span>•</span>
                      <span>Last Synced: <strong>{(() => {
                        const d = activeProduct.palladium_last_synced_at;
                        if (!d) return 'Live';
                        const str = String(d);
                        const dateObj = !str.endsWith('Z') && !str.includes('+') ? new Date(str + 'Z') : new Date(str);
                        return isNaN(dateObj.getTime()) ? 'Live' : dateObj.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                      })()}</strong></span>
                    </div>

                  </div>
                )}

                {/* 3. STOCK HISTORY VIEW (LIVE PALLADIUM AUDIT TRAIL) */}
                {activeTab === 'history' && (
                  <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* SVG Stock level Trend Area Chart */}
                    <StockTrendChart 
                      chartPoints={stockHistoryData?.chart_points || []} 
                      currentStock={activeProduct.stock_on_hand || activeProduct.stock || 0} 
                    />

                    {/* Stock Movements Log ledger */}
                    <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', background: 'var(--bg-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📦 Stock Movement Transaction Log
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                            onClick={() => fetchStockHistory(activeProduct.sku)}
                            disabled={isLoadingStockHistory}
                          >
                            <RefreshCw size={12} className={isLoadingStockHistory ? 'spin' : ''} /> Refresh History
                          </button>
                          <span className="badge b-success" style={{ fontSize: '10px', padding: '3px 8px' }}>
                            Source: Palladium ERP Ledger
                          </span>
                        </div>
                      </div>

                      {isLoadingStockHistory ? (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          <RefreshCw size={20} className="spin" style={{ marginBottom: '8px' }} />
                          <div>Loading live stock movement transactions from Palladium ERP...</div>
                        </div>
                      ) : stockHistoryData?.transactions && stockHistoryData.transactions.length > 0 ? (
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                          <table className="table" style={{ width: '100%', fontSize: '12px', margin: 0, textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={{ padding: '8px 12px' }}>Date</th>
                                <th style={{ padding: '8px 12px' }}>Transaction Type</th>
                                <th style={{ padding: '8px 12px' }}>Reference Document</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px' }}>Quantity Changed</th>
                                <th style={{ textAlign: 'right', padding: '8px 12px' }}>Running Balance</th>
                                <th style={{ padding: '8px 12px' }}>Handled By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stockHistoryData.transactions.map((t, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.date}</td>
                                  <td style={{ padding: '10px 12px' }}>
                                    <span className={`badge ${
                                      t.type.includes('Receipt') || t.type.includes('GRV') ? 'b-success' : 
                                      t.type.includes('Sales') || t.type.includes('Invoice') ? 'b-danger' : 
                                      'b-warning'
                                    }`} style={{ fontSize: '9.5px', padding: '2px 8px', fontWeight: 700 }}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-info)', fontWeight: 600 }}>
                                    {t.doc_number} {t.reference && t.reference !== 'Supplier' && t.reference !== 'Customer' ? `(${t.reference})` : ''}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: t.qty > 0 ? '#10b981' : 'var(--text-danger)' }}>
                                    {t.qty_display}
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {t.balance}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                    {t.handled_by || 'System'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>📦</div>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            No stock movement transactions recorded in Palladium ERP for this item.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. LINKED ACCESSORIES & DRIVERS VIEW */}
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
