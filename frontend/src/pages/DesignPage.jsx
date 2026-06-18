import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Save, TrendingUp, AlertCircle, Plus, Search, ArrowLeft, 
  Edit3, Filter, CheckCircle, FileSpreadsheet, AlertTriangle, 
  Printer, FileText, DollarSign, Layers, ChevronRight, Sparkles, ClipboardList,
  Calendar, Clock, Play
} from 'lucide-react';

const PHI_ADVISORIES = {
  design: {
    author: "Aristotle (Nicomachean Ethics)",
    quote: "Beauty in art and architecture is found in the right proportions—neither too much nor too little.",
    advice: "Proportional Scope Costing. Ensure your design sub-project calculator balances Experiential Living rates (R180/m²) against non-experiential layout buffers. Under-scoping design capacity represents the principal bottleneck to project quality."
  }
};

const statusColor = { 
  Approved: 'b-success', 
  Draft: 'b-default', 
  'In Review': 'b-warning' 
};

// Rate card configuration from spec
const RATE_CARD = {
  ExperientialLiving: { concept: 180, schematic: 144, final: 117 },
  SecondaryLiving: { concept: 105, schematic: 84, final: 68.25 },
  NonExperiential: { concept: 30, schematic: 24, final: 19.50 },
  ExperientialLandscape: { concept: 140, schematic: 112, final: 91 },
  SecondaryLandscape: { concept: 55, schematic: 44, final: 35.75 }
};

export default function DesignPage() {
  const { projects, updateProject, contacts, addInvoice, invoices, moveDesignFee } = useStore();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  
  // Link/Unlink modal state
  const [linkModalItem, setLinkModalItem] = useState(null);
  const [linkClient, setLinkClient] = useState('');
  const [linkProjectKey, setLinkProjectKey] = useState('');
  
  // Workspace active values
  const [activeFeeName, setActiveFeeName] = useState('');
  const [activeFeeSqm, setActiveFeeSqm] = useState(1000);
  const [feeStatus, setFeeStatus] = useState('Draft');
  const [feePaidAmount, setFeePaidAmount] = useState(0);

  // Form registration details
  const [clientCompany, setClientCompany] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [projectFullName, setProjectFullName] = useState('');
  const [projectTier, setProjectTier] = useState('Signature');
  const [targetMargin, setTargetMargin] = useState(18);
  const [actualMargin, setActualMargin] = useState(18);
  const [oneOneRep, setOneOneRep] = useState('Martin Döller');
  const [pmName, setPmName] = useState('Dani');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [projectFilterKey, setProjectFilterKey] = useState('All');

  // Date Filter States
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null | 'all' | 'pending' | 'active' | 'complete'

  // Workspace View State (BOQ Spreadsheet vs Document Generator)
  const [workspaceSubTab, setWorkspaceSubTab] = useState('calculator'); // 'calculator' | 'files'
  const [showCalculatorBuilder, setShowCalculatorBuilder] = useState(false);
  const [showRegForm, setShowRegForm] = useState(true);

  // Stages breakdown settings
  const [includeConcept, setIncludeConcept] = useState(true);
  const [includeSchematic, setIncludeSchematic] = useState(true);
  const [includeFinal, setIncludeFinal] = useState(true);

  // Date parser helper
  const parseProjectDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date range checking logic
  const isDateInRange = (dateStr) => {
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;
    const pDate = parseProjectDate(dateStr);
    if (!pDate) return false;
    
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

  // Preset Date Applier
  const applyPreset = (preset) => {
    setDatePreset(preset);
    if (preset === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'Last Week') {
      setStartDate('2026-05-11');
      setEndDate('2026-05-18');
    } else if (preset === 'Last 30 Days') {
      setStartDate('2026-04-18');
      setEndDate('2026-05-18');
    } else if (preset === 'Financial Year') {
      setStartDate('2026-03-01');
      setEndDate('2027-02-28');
    }
  };

  // Aggregate all design fees from projects
  const allFees = useMemo(() => {
    const list = [];
    Object.values(projects).forEach(p => {
      if (p.designFees) {
        p.designFees.forEach(f => {
          list.push({
            ...f,
            projectKey: p.key,
            projectName: p.name,
            projectClient: p.client,
            pmName: p.pm,
            projectStart: p.start
          });
        });
      }
    });
    return list;
  }, [projects]);

  // Sync state from project context or direct navigation
  const handleOpenWorkspace = (fee) => {
    setSelectedFeeId(fee.id);
    setSelectedProjectKey(fee.projectKey);
    setActiveFeeName(fee.name || 'Main Residence Design Fee');
    setActiveFeeSqm(fee.sqm || 1000);
    setActiveLandscapeSqm(fee.landscapeSqm || 500);
    setFeeType(fee.feeType || 'Signature');
    setFlatBaseFee(fee.flatBaseFee || 50000);
    setFeeStatus(fee.status || 'Draft');
    setFeePaidAmount(fee.paid || 0);

    setIncludeConcept(fee.includeConcept !== undefined ? fee.includeConcept : true);
    setIncludeSchematic(fee.includeSchematic !== undefined ? fee.includeSchematic : true);
    setIncludeFinal(fee.includeFinal !== undefined ? fee.includeFinal : true);
    setIncludeSite(fee.includeSite !== undefined ? fee.includeSite : false);
    setIncludeCommissioning(fee.includeCommissioning !== undefined ? fee.includeCommissioning : false);
    
    setAdjustmentPercent(fee.adjustmentPercent || 0);
    setProcurementDiscountActive(fee.procurementDiscountActive || false);
    
    if (fee.milestones && fee.milestones.length > 0) {
      setMilestones(fee.milestones.map(m => ({
        label: m.label,
        percent: m.percent,
        invoicedAmount: m.invoicedAmount || 0,
        paidAmount: m.paidAmount || 0,
        invoiceRef: m.invoiceRef || '',
        isBilled: m.isBilled !== undefined ? m.isBilled : (!!m.invoiceRef || (m.invoicedAmount || 0) > 0)
      })));
    } else {
      setMilestones([
        { label: 'Deposit / Commitment Fee', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Concept Design Approval', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Schematic Layout Approval', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Final Delivery & Sign-off', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false }
      ]);
    }

    const proj = projects[fee.projectKey] || {};
    setClientCompany(proj.client || '');
    setClientContact(proj.client || '');
    setProjectFullName(proj.name || '');
    setProjectTier(proj.offering || 'Signature');
    setTargetMargin(proj.targetMargin || 18);
    setActualMargin(fee.margin || 18);
    setPmName(proj.pm || 'Dani');
    setWorkspaceSubTab('calculator');
    setShowCalculatorBuilder(false);
  };

  useEffect(() => {
    if (location.state?.projectKey) {
      setProjectFilterKey(location.state.projectKey);
    }
    if (location.state?.openFeeId) {
      const targetFee = allFees.find(f => f.id === location.state.openFeeId);
      if (targetFee) {
        handleOpenWorkspace(targetFee);
      }
    }
  }, [location.state, allFees]);

  // Filter design fees by Date Preset/Range
  const dateFilteredFees = useMemo(() => {
    return allFees.filter(f => isDateInRange(f.date || f.projectStart));
  }, [allFees, startDate, endDate]);

  // Dynamic KPI Metrics calculations (All, Pending, Active, Complete)
  const kpis = useMemo(() => {
    const getGroupMetrics = (groupList) => {
      const value = groupList.reduce((sum, f) => sum + (f.feeValue || 0), 0);
      const paid = groupList.reduce((sum, f) => sum + (f.paid || 0), 0);
      const outstanding = Math.max(0, value - paid);
      return {
        qty: groupList.length,
        value,
        paid,
        outstanding
      };
    };

    const allGroup = dateFilteredFees;
    const pendingGroup = dateFilteredFees.filter(f => f.status === 'Draft' || f.status === 'In Review');
    const activeGroup = dateFilteredFees.filter(f => f.status === 'Approved' && (f.outstanding || 0) > 0);
    const completeGroup = dateFilteredFees.filter(f => f.status === 'Approved' && (f.outstanding || 0) <= 0);

    return {
      all: getGroupMetrics(allGroup),
      pending: getGroupMetrics(pendingGroup),
      active: getGroupMetrics(activeGroup),
      complete: getGroupMetrics(completeGroup)
    };
  }, [dateFilteredFees]);

  const filteredFees = useMemo(() => {
    return dateFilteredFees.filter(f => {
      const matchesSearch = 
        f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = filterStatus === 'All' || f.status === filterStatus;
      const matchesProject = projectFilterKey === 'All' || f.projectKey === projectFilterKey;
      
      // KPI interactive filter matching
      let matchesKpi = true;
      if (activeKpiFilter === 'all') {
        matchesKpi = true;
      } else if (activeKpiFilter === 'pending') {
        matchesKpi = f.status === 'Draft' || f.status === 'In Review';
      } else if (activeKpiFilter === 'active') {
        matchesKpi = f.status === 'Approved' && (f.outstanding || 0) > 0;
      } else if (activeKpiFilter === 'complete') {
        matchesKpi = f.status === 'Approved' && (f.outstanding || 0) <= 0;
      }

      return matchesSearch && matchesStatus && matchesProject && matchesKpi;
    });
  }, [dateFilteredFees, searchQuery, filterStatus, projectFilterKey, activeKpiFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalCount = allFees.length;
    const totalValue = allFees.reduce((sum, f) => sum + (f.feeValue || 0), 0);
    const totalPaid = allFees.reduce((sum, f) => sum + (f.paid || 0), 0);
    const totalOutstanding = totalValue - totalPaid;
    const avgMargin = totalCount > 0 
      ? Math.round(allFees.reduce((sum, f) => sum + (f.margin || 18), 0) / totalCount)
      : 18;

    return {
      totalCount,
      totalValue,
      totalPaid,
      totalOutstanding,
      avgMargin
    };
  }, [allFees]);

  // Dynamic rates setup
  const FEE_PRESETS = {
    Signature: {
      name: 'Signature (ZAR Sqm)',
      type: 'sqm',
      currency: 'ZAR',
      symbol: 'R',
      description: 'Premium multi-tier sqm-based design rate card.',
      rates: {
        ExperientialLiving: { concept: 180, schematic: 144, final: 117 },
        SecondaryLiving: { concept: 105, schematic: 84, final: 68.25 },
        NonExperiential: { concept: 30, schematic: 24, final: 19.50 },
        ExperientialLandscape: { concept: 140, schematic: 112, final: 91 },
        SecondaryLandscape: { concept: 55, schematic: 44, final: 35.75 }
      },
      siteSupportBase: 15000,
      commissioningBase: 8000
    },
    ModusProjects: {
      name: 'Modus Projects (ZAR Sqm)',
      type: 'sqm',
      currency: 'ZAR',
      symbol: 'R',
      description: 'Budget-optimized sqm-based design rate card.',
      rates: {
        ExperientialLiving: { concept: 126, schematic: 100.8, final: 81.9 },
        SecondaryLiving: { concept: 73.5, schematic: 58.8, final: 47.78 },
        NonExperiential: { concept: 21, schematic: 16.8, final: 13.65 },
        ExperientialLandscape: { concept: 98, schematic: 78.4, final: 63.7 },
        SecondaryLandscape: { concept: 38.5, schematic: 30.8, final: 25.03 }
      },
      siteSupportBase: 10000,
      commissioningBase: 5000
    },
    InternationalPortfolio: {
      name: 'International (USD Flat)',
      type: 'flat',
      currency: 'USD',
      symbol: '$',
      description: 'Flat fee billed in USD for international clients.',
      baseFee: 12500,
      stagesRatio: {
        concept: 0.3,
        schematic: 0.3,
        final: 0.2,
        site: 0.1,
        commissioning: 0.1
      }
    },
    CustomZAR: {
      name: 'Custom Flat (ZAR)',
      type: 'flat-custom',
      currency: 'ZAR',
      symbol: 'R',
      description: 'Customizable flat fee in ZAR.',
      baseFee: 50000,
      stagesRatio: {
        concept: 0.3,
        schematic: 0.3,
        final: 0.2,
        site: 0.1,
        commissioning: 0.1
      }
    },
    CustomUSD: {
      name: 'Custom Flat (USD)',
      type: 'flat-custom',
      currency: 'USD',
      symbol: '$',
      description: 'Customizable flat fee in USD.',
      baseFee: 5000,
      stagesRatio: {
        concept: 0.3,
        schematic: 0.3,
        final: 0.2,
        site: 0.1,
        commissioning: 0.1
      }
    }
  };

  const [feeType, setFeeType] = useState('Signature');
  const [activeLandscapeSqm, setActiveLandscapeSqm] = useState(500);
  const [flatBaseFee, setFlatBaseFee] = useState(50000);
  const [includeSite, setIncludeSite] = useState(false);
  const [includeCommissioning, setIncludeCommissioning] = useState(false);
  const [adjustmentPercent, setAdjustmentPercent] = useState(0);
  const [procurementDiscountActive, setProcurementDiscountActive] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('proposal'); // 'proposal' | 'statement' | 'invoice'
  const [activePreviewInvoiceId, setActivePreviewInvoiceId] = useState('');
  const [milestones, setMilestones] = useState([
    { label: 'Deposit / Commitment Fee', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
    { label: 'Concept Design Approval', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
    { label: 'Schematic Layout Approval', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
    { label: 'Final Delivery & Sign-off', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false }
  ]);

  // Dynamic calculation block for the fee statement builder
  const calculatorBreakdown = useMemo(() => {
    const preset = FEE_PRESETS[feeType] || FEE_PRESETS.Signature;
    const isSqm = preset.type === 'sqm';
    const symbol = preset.symbol;

    let conceptSum = 0;
    let schematicSum = 0;
    let finalSum = 0;
    let siteSum = 0;
    let commSum = 0;

    let expLiving = 0;
    let secLiving = 0;
    let nonExp = 0;
    let expLandscape = 0;
    let secLandscape = 0;

    if (isSqm) {
      const interiorSqm = Number(activeFeeSqm) || 0;
      const landscapeSqm = Number(activeLandscapeSqm) || 0;

      // Splits
      expLiving = Math.round(interiorSqm * 0.3);
      secLiving = Math.round(interiorSqm * 0.6);
      nonExp = Math.round(interiorSqm * 0.1);

      expLandscape = Math.round(landscapeSqm * 0.4);
      secLandscape = Math.round(landscapeSqm * 0.6);

      const rates = preset.rates;

      if (includeConcept) {
        conceptSum = 
          (expLiving * rates.ExperientialLiving.concept) +
          (secLiving * rates.SecondaryLiving.concept) +
          (nonExp * rates.NonExperiential.concept) +
          (expLandscape * rates.ExperientialLandscape.concept) +
          (secLandscape * rates.SecondaryLandscape.concept);
      }

      if (includeSchematic) {
        schematicSum = 
          (expLiving * rates.ExperientialLiving.schematic) +
          (secLiving * rates.SecondaryLiving.schematic) +
          (nonExp * rates.NonExperiential.schematic) +
          (expLandscape * rates.ExperientialLandscape.schematic) +
          (secLandscape * rates.SecondaryLandscape.schematic);
      }

      if (includeFinal) {
        finalSum = 
          (expLiving * rates.ExperientialLiving.final) +
          (secLiving * rates.SecondaryLiving.final) +
          (nonExp * rates.NonExperiential.final) +
          (expLandscape * rates.ExperientialLandscape.final) +
          (secLandscape * rates.SecondaryLandscape.final);
      }

      if (includeSite) {
        siteSum = preset.siteSupportBase || 0;
      }
      if (includeCommissioning) {
        commSum = preset.commissioningBase || 0;
      }
    } else {
      // Flat fee types
      const base = preset.type === 'flat-custom' ? Number(flatBaseFee) || 0 : preset.baseFee;
      const ratios = preset.stagesRatio;

      if (includeConcept) conceptSum = base * ratios.concept;
      if (includeSchematic) schematicSum = base * ratios.schematic;
      if (includeFinal) finalSum = base * ratios.final;
      if (includeSite) siteSum = base * ratios.site;
      if (includeCommissioning) commSum = base * ratios.commissioning;
    }

    const subTotal = conceptSum + schematicSum + finalSum + siteSum + commSum;
    const modifierAmount = (subTotal * (Number(adjustmentPercent) || 0)) / 100;
    const standardTotal = subTotal + modifierAmount;

    // Reduced total (applying standard 15% discount if product supply is procured from 1-to-1)
    const discountAmount = standardTotal * 0.15;
    const reducedTotal = standardTotal - discountAmount;

    // Output final total (depends on whether the discount checkbox is active, or if we want to sync standard total)
    const finalTotal = standardTotal;

    return {
      expLiving,
      secLiving,
      nonExp,
      expLandscape,
      secLandscape,
      conceptSum: Math.round(conceptSum),
      schematicSum: Math.round(schematicSum),
      finalSum: Math.round(finalSum),
      siteSum: Math.round(siteSum),
      commSum: Math.round(commSum),
      subTotal: Math.round(subTotal),
      modifierAmount: Math.round(modifierAmount),
      standardTotal: Math.round(standardTotal),
      reducedTotal: Math.round(reducedTotal),
      finalTotal: Math.round(finalTotal),
      symbol,
      preset
    };
  }, [
    feeType, activeFeeSqm, activeLandscapeSqm, flatBaseFee,
    includeConcept, includeSchematic, includeFinal, includeSite, includeCommissioning,
    adjustmentPercent
  ]);

  const syncGlobalInvoice = (invoiceId, amountVal, milestoneName) => {
    if (!invoiceId) return;
    const exists = invoices.some(inv => inv.id.trim().toLowerCase() === invoiceId.trim().toLowerCase());
    if (!exists) {
      const newInvoice = {
        id: invoiceId,
        project: projectFullName || 'Upper Primrose',
        client: clientCompany || 'Sarah Venter',
        amount: `${calculatorBreakdown.symbol} ${amountVal.toLocaleString()}`,
        due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        issued: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Unpaid',
        paid: false,
        description: `Design Fee Milestone: ${milestoneName || 'Stage Payment'}`
      };
      addInvoice(newInvoice);
    }
  };

  const handleRaiseInvoice = (idx) => {
    const m = milestones[idx];
    if (!m.invoiceRef || !m.invoiceRef.trim()) {
      alert("Please enter the Invoice ID from your accounting system first.");
      return;
    }

    const totalBase = procurementDiscountActive ? calculatorBreakdown.reducedTotal : calculatorBreakdown.standardTotal;
    const milestoneVal = Math.round((totalBase * m.percent) / 100);
    const invoiceId = m.invoiceRef.trim();

    // Check if this invoice ID is already used globally
    const alreadyExists = invoices.some(inv => inv.id.trim().toLowerCase() === invoiceId.toLowerCase());
    if (alreadyExists) {
      alert(`Invoice ID "${invoiceId}" already exists in the system. Linking this milestone to the existing invoice.`);
    } else {
      const newInvoice = {
        id: invoiceId,
        project: projectFullName || 'Upper Primrose',
        client: clientCompany || 'Sarah Venter',
        amount: `${calculatorBreakdown.symbol} ${milestoneVal.toLocaleString()}`,
        due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        issued: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Unpaid',
        paid: false,
        description: `Design Fee Milestone: ${m.label}`
      };
      addInvoice(newInvoice);
      alert(`Success: Created and linked global invoice "${invoiceId}" for ${calculatorBreakdown.symbol} ${milestoneVal.toLocaleString()}!`);
    }

    // Update milestone state
    const next = [...milestones];
    next[idx].invoiceRef = invoiceId;
    next[idx].invoicedAmount = milestoneVal;
    next[idx].isBilled = true;
    setMilestones(next);

    // Switch to the invoice tab so they can see the invoice immediately
    setActivePreviewInvoiceId(invoiceId);
    setRightPanelTab('invoice');
  };

  const handleSaveFeeWorkspace = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    const newCalculatedValue = calculatorBreakdown.standardTotal;
    const totalPaidAmount = milestones.reduce((sum, m) => sum + (Number(m.paidAmount) || 0), 0);
    const balanceOutstanding = Math.max(0, newCalculatedValue - totalPaidAmount);

    const updatedFees = (proj.designFees || []).map(f => {
      if (f.id === selectedFeeId) {
        return {
          ...f,
          name: activeFeeName,
          sqm: activeFeeSqm,
          landscapeSqm: activeLandscapeSqm,
          feeType,
          flatBaseFee,
          includeConcept,
          includeSchematic,
          includeFinal,
          includeSite,
          includeCommissioning,
          adjustmentPercent,
          procurementDiscountActive,
          milestones,
          feeValue: newCalculatedValue,
          paid: totalPaidAmount,
          outstanding: balanceOutstanding,
          margin: actualMargin,
          status: feeStatus
        };
      }
      return f;
    });

    updateProject(selectedProjectKey, 'designFees', updatedFees);

    // Trigger blended margin update
    const designTotal = updatedFees.reduce((s, f) => s + (f.feeValue || 0), 0);
    const orderTotal = (proj.orders || []).reduce((s, o) => s + (o.value || 0), 0);
    const contractTotal = designTotal + orderTotal;
    
    const designMarginValue = updatedFees.reduce((s, f) => s + ((f.feeValue || 0) * ((f.margin || 20) / 100)), 0);
    const orderMarginValue = (proj.orders || []).reduce((s, o) => s + ((o.value || 0) - (o.costValue || 0)), 0);
    const totalProfit = designMarginValue + orderMarginValue;
    const blendedMargin = contractTotal > 0 ? Math.round((totalProfit / contractTotal) * 100) : 18;

    updateProject(selectedProjectKey, 'actualMargin', blendedMargin);

    setSelectedFeeId(null);
  };

  const activeFeeObject = useMemo(() => {
    if (selectedFeeId === null) return null;
    return Object.values(projects)
      .flatMap(p => p.designFees || [])
      .find(f => f.id === selectedFeeId);
  }, [projects, selectedFeeId]);

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* HEADER BANNER */}
      {selectedFeeId === null ? (
        <>
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Design Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Central Design Fee Calculator & Deliverables Workspace</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🧠 Standalone Design Fees & CAD Module
                </h1>
              </div>
            </div>
          </div>

          {/* Date range filter banner */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Calendar size={15} color="var(--text-info)" />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Filter Design Fees by Date:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => applyPreset(preset)}
                    className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', height: 'auto', fontSize: '11.5px', borderRadius: '6px' }}
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
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11.5px' }}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ width: '130px', height: '28px', padding: '2px 8px', fontSize: '11.5px' }}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
              />
            </div>
          </div>

          {/* KPI STATS GRID */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'all' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all')}
              style={{ border: activeKpiFilter === 'all' ? '2.5px solid var(--text-info)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>All Design Fees</span>
                <Layers size={14} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.all.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-info)', marginTop: '4px' }}>
                R {kpis.all.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.all.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.all.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'pending' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'pending' ? null : 'pending')}
              style={{ border: activeKpiFilter === 'pending' ? '2.5px solid var(--text-warning)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Design</span>
                <Clock size={14} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.pending.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-warning)', marginTop: '4px' }}>
                R {kpis.pending.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.pending.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.pending.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'active' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')}
              style={{ border: activeKpiFilter === 'active' ? '2.5px solid var(--text-success)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Design</span>
                <Play size={14} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.active.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-success)', marginTop: '4px' }}>
                R {kpis.active.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.active.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.active.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>

            <div 
              className={`stat clickable hover-scale ${activeKpiFilter === 'complete' ? 'active-filter' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'complete' ? null : 'complete')}
              style={{ border: activeKpiFilter === 'complete' ? '2.5px solid var(--text-muted)' : '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg-primary)', transition: 'all 0.2s', padding: '16px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Complete Design</span>
                <CheckCircle size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpis.complete.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '4px' }}>
                R {kpis.complete.value.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpis.complete.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpis.complete.outstanding.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

          {/* LEDGER OVERVIEW LIST */}
          <div className="card" style={{ border: '1.5px solid var(--border)' }}>
            <div className="card-body" style={{ padding: '20px' }}>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '300px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
                    <input 
                      type="text"
                      placeholder="Search by fee ref, project name, or sub-fee title..."
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
                    <option value="Draft">Draft</option>
                    <option value="In Review">In Review</option>
                    <option value="Approved">Approved</option>
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
              </div>

              {/* TABLE */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                  <thead>
                    <tr>
                      <th>DF#</th>
                      <th>Design Fee Name</th>
                      <th>Project Name</th>
                      <th>Client Name</th>
                      <th>Design Value Ex. Vat</th>
                      <th>Amount Paid</th>
                      <th>Amount Outstanding</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map(f => (
                      <tr key={f.id} className="clickable" onClick={() => handleOpenWorkspace(f)}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                          <span className="btn-link" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleOpenWorkspace(f)}>{f.id}</span>
                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 4px', height: '20px', border: '1px solid var(--border)', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)' }}
                              title="Link / Shift Project or Client"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkModalItem(f);
                                setLinkClient(f.projectClient || '');
                                setLinkProjectKey(f.projectKey || '');
                              }}
                            >
                              <Layers size={10} /> Link
                            </button>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{f.name}</td>
                        <td style={{ fontWeight: 500 }}>{f.projectName}</td>
                        <td>{f.projectClient}</td>
                        <td style={{ fontWeight: 600, color: 'white' }}>
                          R {f.feeValue?.toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-success)' }}>
                          R {(f.paid || 0).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: (f.outstanding || 0) > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)' }}>
                          R {(f.outstanding || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${statusColor[f.status] || 'b-default'}`}>{f.status}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredFees.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No active design sub-fees found within range.
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
        /* DESIGN FEE CALCULATOR & PROPOSAL PREVIEW WORKSPACE */
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '24px', alignItems: 'start' }}>
          
          {/* LEFT PANEL: SIDEBAR CONFIGURATION PANEL */}
          <div className="card" style={{ border: '1.5px solid var(--border)', padding: '24px', background: 'var(--bg-primary)' }}>
            
            {/* WORKSPACE HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '4px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}
                  onClick={() => setSelectedFeeId(null)}
                >
                  <ArrowLeft size={12} /> Back to Ledger
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Fee Setup & Options
                  </h3>
                  {isAdmin && activeFeeObject && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ padding: '2px 6px', height: '20px', border: '1px solid var(--border)', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--bg-secondary)', textTransform: 'none', letterSpacing: 'normal' }}
                      title="Link / Shift Project or Client"
                      onClick={() => {
                        setLinkModalItem(activeFeeObject);
                        setLinkClient(activeFeeObject.projectClient || '');
                        setLinkProjectKey(activeFeeObject.projectKey || '');
                      }}
                    >
                      <Layers size={10} /> Link / Shift
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }} onClick={() => setSelectedFeeId(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={handleSaveFeeWorkspace}>
                  <Save size={14} /> Save & Sync
                </button>
              </div>
            </div>

            {/* SECTION 1: BASIC INFO */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>1. Basic Details</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Design Fee Title</label>
                  <input 
                    type="text"
                    className="form-control"
                    style={{ height: '34px', fontSize: '13px' }}
                    value={activeFeeName}
                    onChange={e => setActiveFeeName(e.target.value)}
                    placeholder="e.g. Main Residence Design Fee"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</label>
                    <select 
                      className="form-control"
                      style={{ height: '34px', fontSize: '13px' }}
                      value={feeStatus}
                      onChange={e => setFeeStatus(e.target.value)}
                    >
                      <option>Draft</option>
                      <option>In Review</option>
                      <option>Approved</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Paid Amount ({calculatorBreakdown.symbol})
                    </label>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ height: '34px', fontSize: '13px' }}
                      value={feePaidAmount}
                      onChange={e => setFeePaidAmount(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: BILLING TYPE PRESET */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>2. Billing Structure Preset</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(FEE_PRESETS).map(([key, item]) => (
                  <div 
                    key={key} 
                    onClick={() => {
                      setFeeType(key);
                      // Adjust default base fee for flat rate options to match default
                      if (item.type === 'flat') {
                        setFlatBaseFee(item.baseFee);
                      }
                    }}
                    style={{ 
                      border: feeType === key ? '2px solid var(--text-info)' : '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '10px 14px', 
                      cursor: 'pointer',
                      background: feeType === key ? 'rgba(24,95,165,0.06)' : 'var(--bg-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: feeType === key ? 'var(--text-info)' : 'var(--text-primary)' }}>{item.name}</span>
                      <span className="badge b-info" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{item.currency}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: METRICS / base cost input */}
            <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>3. Area Metrics & Base Pricing</div>
              
              {(FEE_PRESETS[feeType]?.type === 'sqm') ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Interior Area (m²)</label>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ height: '34px', fontSize: '13px' }}
                      value={activeFeeSqm}
                      onChange={e => setActiveFeeSqm(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Landscape Area (m²)</label>
                    <input 
                      type="number"
                      className="form-control"
                      style={{ height: '34px', fontSize: '13px' }}
                      value={activeLandscapeSqm}
                      onChange={e => setActiveLandscapeSqm(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Flat Base Fee ({calculatorBreakdown.symbol})
                  </label>
                  <input 
                    type="number"
                    className="form-control"
                    style={{ height: '34px', fontSize: '13px' }}
                    disabled={FEE_PRESETS[feeType]?.type === 'flat'}
                    value={FEE_PRESETS[feeType]?.type === 'flat' ? FEE_PRESETS[feeType]?.baseFee : flatBaseFee}
                    onChange={e => setFlatBaseFee(Math.max(0, Number(e.target.value) || 0))}
                  />
                  {FEE_PRESETS[feeType]?.type === 'flat' && (
                    <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                      Base fee is fixed by preset configuration.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 4: INCLUDED STAGES */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>4. Include Design Phases</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeConcept} onChange={e => setIncludeConcept(e.target.checked)} />
                  <span>Concept Stage</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeSchematic} onChange={e => setIncludeSchematic(e.target.checked)} />
                  <span>Schematic Layout Stage</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeFinal} onChange={e => setIncludeFinal(e.target.checked)} />
                  <span>Final Spec Layout Stage</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeSite} onChange={e => setIncludeSite(e.target.checked)} />
                  <span>Site Support & Snags Stage</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeCommissioning} onChange={e => setIncludeCommissioning(e.target.checked)} />
                  <span>Commissioning Stage</span>
                </label>
              </div>
            </div>

            {/* SECTION 5: MODIFIERS AND SPECIAL DISCOUNTS */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>5. Adjustments & Product Discounts</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span>Percentage Adjustment:</span>
                    <strong style={{ color: adjustmentPercent >= 0 ? 'var(--text-success)' : 'var(--text-warning)' }}>
                      {adjustmentPercent >= 0 ? '+' : ''}{adjustmentPercent}%
                    </strong>
                  </div>
                  <input 
                    type="range"
                    min="-50"
                    max="50"
                    step="5"
                    value={adjustmentPercent}
                    onChange={e => setAdjustmentPercent(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--text-info)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    <span>-50% Discount</span>
                    <span>Standard</span>
                    <span>+50% Premium</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      style={{ marginTop: '3px' }}
                      checked={procurementDiscountActive} 
                      onChange={e => setProcurementDiscountActive(e.target.checked)} 
                    />
                    <div>
                      <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 600 }}>Enable Product Supply Incentive</span>
                      <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                        Shows a dual proposal statement highlighting a 15% discount if fittings are procured from 1-to-1 World.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 6: MILESTONES SCHEDULE BUILDER */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>6. Payment Milestones</span>
                <button 
                  className="btn btn-ghost btn-sm"
                  style={{ height: 'auto', padding: '2px 6px', fontSize: '10.5px', border: '1px solid var(--border)' }}
                  onClick={() => setMilestones([...milestones, { label: 'New Milestone', percent: 10, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false }])}
                >
                  + Add Row
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {milestones.map((m, idx) => (
                  <div key={idx} style={{ 
                    borderBottom: idx < milestones.length - 1 ? '1.5px solid var(--border)' : 'none', 
                    paddingBottom: '12px',
                    marginBottom: '6px'
                  }}>
                    {/* Top Row: Title, Percent, Delete */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <input 
                        type="text"
                        className="form-control"
                        style={{ flex: 3, height: '30px', fontSize: '12px', padding: '2px 8px' }}
                        value={m.label}
                        onChange={e => {
                          const next = [...milestones];
                          next[idx].label = e.target.value;
                          setMilestones(next);
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1.2 }}>
                        <input 
                          type="number"
                          className="form-control"
                          style={{ height: '30px', fontSize: '12px', padding: '2px 4px', textAlign: 'center' }}
                          value={m.percent}
                          onChange={e => {
                            const next = [...milestones];
                            next[idx].percent = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setMilestones(next);
                          }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>%</span>
                      </div>
                      <button 
                        className="btn btn-ghost"
                        style={{ color: 'var(--text-warning)', padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', border: '1px solid var(--border)' }}
                        onClick={() => {
                          const next = milestones.filter((_, i) => i !== idx);
                          setMilestones(next);
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Bottom Row: Invoiced, Paid, Invoice Ref, Raise Invoice Button */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', paddingLeft: '4px' }}>
                      {/* Billed (Ticked if Sent/Billed) */}
                      {(() => {
                        const totalBase = procurementDiscountActive ? calculatorBreakdown.reducedTotal : calculatorBreakdown.standardTotal;
                        const milestoneVal = Math.round((totalBase * m.percent) / 100);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="checkbox"
                              checked={!!m.isBilled}
                              onChange={e => {
                                const next = [...milestones];
                                const checked = e.target.checked;
                                next[idx].isBilled = checked;
                                next[idx].invoicedAmount = checked ? milestoneVal : 0;
                                
                                // If they checked it and there is an invoice ID, link it to the store
                                if (checked && m.invoiceRef) {
                                  syncGlobalInvoice(m.invoiceRef, milestoneVal, m.label);
                                }
                                setMilestones(next);
                              }}
                            />
                            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Billed:</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: m.isBilled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                              {calculatorBreakdown.symbol} {milestoneVal.toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Paid Input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Paid:</span>
                        <input 
                          type="number"
                          className="form-control"
                          placeholder="0"
                          style={{ width: '70px', height: '26px', fontSize: '11px', padding: '2px 4px' }}
                          value={m.paidAmount || ''}
                          onChange={e => {
                            const next = [...milestones];
                            next[idx].paidAmount = Number(e.target.value) || 0;
                            setMilestones(next);
                          }}
                        />
                      </div>

                      {/* Invoice ID input (comes from accounting system) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Invoice ID:</span>
                        <input 
                          type="text"
                          className="form-control"
                          placeholder="e.g. INV-087"
                          style={{ width: '80px', height: '26px', fontSize: '11px', padding: '2px 4px' }}
                          value={m.invoiceRef || ''}
                          onChange={e => {
                            const next = [...milestones];
                            next[idx].invoiceRef = e.target.value;
                            setMilestones(next);
                          }}
                        />
                      </div>

                      {/* Raise or View Button */}
                      {!m.isBilled ? (
                        <button 
                          className="btn btn-sm btn-ghost"
                          style={{ 
                            height: '24px', 
                            fontSize: '9.5px', 
                            padding: '2px 6px', 
                            borderColor: 'var(--border-info)',
                            color: 'var(--text-info)'
                          }}
                          onClick={() => handleRaiseInvoice(idx)}
                        >
                          Invoice
                        </button>
                      ) : (
                        <button 
                          className="btn btn-sm btn-ghost"
                          style={{ 
                            height: '24px', 
                            fontSize: '9.5px', 
                            padding: '2px 6px', 
                            borderColor: 'var(--border-success)',
                            color: 'var(--text-success)'
                          }}
                          onClick={() => {
                            setActivePreviewInvoiceId(m.invoiceRef);
                            setRightPanelTab('invoice');
                          }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Milestone validation checks */}
                {(() => {
                  const sum = milestones.reduce((s, m) => s + m.percent, 0);
                  const isValid = sum === 100;
                  return (
                    <div style={{ 
                      marginTop: '8px', 
                      padding: '6px 10px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isValid ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                      border: isValid ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(239,68,68,0.3)',
                      color: isValid ? '#4ade80' : '#ef4444'
                    }}>
                      <span>Milestone Target Sum: <strong>{sum}%</strong></span>
                      <span>{isValid ? '✓ Matches 100%' : '⚠️ Must sum to exactly 100%'}</span>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: LIVE PROPOSAL & STATEMENT PREVIEW SHEET */}
          <div style={{ position: 'sticky', top: '20px' }}>
            
            {/* Document Tab Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <button 
                className={`btn btn-sm ${rightPanelTab === 'proposal' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, height: '32px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setRightPanelTab('proposal')}
              >
                📄 Proposal Statement
              </button>
              <button 
                className={`btn btn-sm ${rightPanelTab === 'statement' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, height: '32px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => setRightPanelTab('statement')}
              >
                🧾 Statement of Account
              </button>
              {activePreviewInvoiceId && (
                <button 
                  className={`btn btn-sm ${rightPanelTab === 'invoice' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, height: '32px', fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => setRightPanelTab('invoice')}
                >
                  🧾 Invoice {activePreviewInvoiceId}
                </button>
              )}
            </div>

            {rightPanelTab === 'proposal' ? (
              <div style={{ 
                background: '#FAF9F6', 
                color: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '8px', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #e0ddd5',
                fontFamily: '"Outfit", "Inter", sans-serif'
              }}>
                {/* Proposal Header Banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: '24px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: '#000' }}>1-TO-1 WORLD</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#666', letterSpacing: '1px', marginTop: '2px' }}>LIGHTING DESIGN & SPECIFICATION SERVICES</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a', background: '#e0ddd5', padding: '4px 10px', borderRadius: '4px', display: 'inline-block' }}>
                      PROPOSAL STATEMENT
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontFamily: 'monospace' }}>REF: {selectedFeeId}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Date: {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Proposal Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px', fontSize: '12.5px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>CLIENT DETAILS</div>
                    <div style={{ fontWeight: 700, color: '#111' }}>{clientCompany || 'Direct Client'}</div>
                    <div style={{ color: '#444' }}>Attn: {clientContact || 'Representative'}</div>
                    <div style={{ color: '#666', fontSize: '11.5px', marginTop: '2px' }}>Studio PM: {pmName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>PROJECT SCOPE</div>
                    <div style={{ fontWeight: 700, color: '#111' }}>{projectFullName || 'Project Overview'}</div>
                    <div style={{ color: '#444' }}>Billing Preset: {FEE_PRESETS[feeType]?.name}</div>
                    {FEE_PRESETS[feeType]?.type === 'sqm' && (
                      <div style={{ color: '#555', marginTop: '2px' }}>
                        <strong>{activeFeeSqm} m²</strong> Interior • <strong>{activeLandscapeSqm} m²</strong> Landscape
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope/Items Breakdown Table */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>PROFESSIONAL FEES BREAKDOWN</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1a1a1a', textAlign: 'left', fontWeight: 700 }}>
                        <th style={{ padding: '8px 0', color: '#1a1a1a' }}>Stage / Deliverable Phase Description</th>
                        <th style={{ padding: '8px 0', textAlign: 'right', width: '120px', color: '#1a1a1a' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {includeConcept && (
                        <tr style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '10px 0', color: '#333' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: '#111' }}>Phase 1: Concept Lighting Design</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Initial architectural space analysis, load estimates, mood board layouts.</span>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                            {calculatorBreakdown.symbol} {calculatorBreakdown.conceptSum.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {includeSchematic && (
                        <tr style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '10px 0', color: '#333' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: '#111' }}>Phase 2: Schematic Layouts</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>AutoCAD layout drawings, circuit maps, load configurations.</span>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                            {calculatorBreakdown.symbol} {calculatorBreakdown.schematicSum.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {includeFinal && (
                        <tr style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '10px 0', color: '#333' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: '#111' }}>Phase 3: Final Specification Layout & Schedule</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Detailed fitting lists, supplier order schedules, datasheet packaging.</span>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                            {calculatorBreakdown.symbol} {calculatorBreakdown.finalSum.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {includeSite && (
                        <tr style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '10px 0', color: '#333' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: '#111' }}>Phase 4: Site Support & Snagging Coordination</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>On-site electrical consultations, installation snags, supplier audits.</span>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                            {calculatorBreakdown.symbol} {calculatorBreakdown.siteSum.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {includeCommissioning && (
                        <tr style={{ borderBottom: '1px dotted #ccc' }}>
                          <td style={{ padding: '10px 0', color: '#333' }}>
                            <span style={{ fontWeight: 600, display: 'block', color: '#111' }}>Phase 5: Technical Commissioning & Sign-off</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Final lighting levels inspection, testing, and official certificate issue.</span>
                          </td>
                          <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>
                            {calculatorBreakdown.symbol} {calculatorBreakdown.commSum.toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal & Adjustment breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', fontSize: '12.5px', marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#666' }}>
                    <span>Stages Subtotal:</span>
                    <span>{calculatorBreakdown.symbol} {calculatorBreakdown.subTotal.toLocaleString()}</span>
                  </div>
                  {adjustmentPercent !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: adjustmentPercent >= 0 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                      <span>Adjustment ({adjustmentPercent}%):</span>
                      <span>{adjustmentPercent >= 0 ? '+' : ''}{calculatorBreakdown.symbol} {calculatorBreakdown.modifierAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* DUAL-STATE TOTAL PRICING DISPLAY OR STANDARD TOTAL */}
                {procurementDiscountActive ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    
                    {/* Standard Option */}
                    <div style={{ 
                      border: '1.5px solid #ccc', 
                      borderRadius: '6px', 
                      padding: '16px',
                      background: '#fcfcfc',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: '#666', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Standard Design Fee</span>
                      <strong style={{ fontSize: '20px', color: '#333', fontWeight: 800 }}>
                        {calculatorBreakdown.symbol} {calculatorBreakdown.standardTotal.toLocaleString()}
                      </strong>
                      <span style={{ display: 'block', fontSize: '9px', color: '#888', marginTop: '4px' }}>Billed if lights are purchased externally.</span>
                    </div>

                    {/* Reduced Option */}
                    <div style={{ 
                      border: '2px solid #185fa5', 
                      borderRadius: '6px', 
                      padding: '16px',
                      background: '#edf5fd',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: '0', 
                        right: '0', 
                        background: '#185fa5', 
                        color: '#fff', 
                        fontSize: '8px', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderBottomLeftRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Incentive
                      </div>
                      <span style={{ fontSize: '10px', color: '#185fa5', fontWeight: 700, display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Reduced Design Fee</span>
                      <strong style={{ fontSize: '20px', color: '#185fa5', fontWeight: 900 }}>
                        {calculatorBreakdown.symbol} {calculatorBreakdown.reducedTotal.toLocaleString()}
                      </strong>
                      <span style={{ display: 'block', fontSize: '9px', color: '#555', marginTop: '4px', fontWeight: 600 }}>Applied if product supply is procured from 1-to-1.</span>
                    </div>

                  </div>
                ) : (
                  <div style={{ 
                    background: '#1a1a1a', 
                    color: '#fff', 
                    padding: '20px', 
                    borderRadius: '6px', 
                    textAlign: 'center', 
                    marginBottom: '32px' 
                  }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#aaa', letterSpacing: '0.5px' }}>Total Design Fee Ex. VAT</span>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px' }}>
                      {calculatorBreakdown.symbol} {calculatorBreakdown.standardTotal.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Payment Schedule Table */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>ESTIMATED PAYMENT SCHEDULE</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', color: '#444' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #666', textAlign: 'left', fontWeight: 700 }}>
                        <th style={{ padding: '6px 0' }}>Milestone Target Description</th>
                        <th style={{ padding: '6px 0', textAlign: 'center', width: '60px' }}>Split</th>
                        <th style={{ padding: '6px 0', textAlign: 'right', width: '100px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, i) => {
                        const totalBase = procurementDiscountActive ? calculatorBreakdown.reducedTotal : calculatorBreakdown.standardTotal;
                        const milestoneVal = Math.round((totalBase * m.percent) / 100);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #e2dfd7' }}>
                            <td style={{ padding: '8px 0', fontWeight: 500 }}>{m.label}</td>
                            <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 600 }}>{m.percent}%</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: '#111' }}>
                              {calculatorBreakdown.symbol} {milestoneVal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              /* STATEMENT OF ACCOUNT CLIENT-FACING SHEET */
              <div style={{ 
                background: '#FAF9F6', 
                color: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '8px', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #e0ddd5',
                fontFamily: '"Outfit", "Inter", sans-serif'
              }}>
                {/* Statement Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: '24px', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: '#000' }}>1-TO-1 WORLD</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#666', letterSpacing: '1px', marginTop: '2px' }}>STATEMENT OF ACCOUNT</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: '#185fa5', padding: '4px 10px', borderRadius: '4px', display: 'inline-block' }}>
                      FINANCIAL STATEMENT
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontFamily: 'monospace' }}>REF: {selectedFeeId}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>As of: {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Statement Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px', fontSize: '12.5px' }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>PREPARED FOR</div>
                    <div style={{ fontWeight: 700, color: '#111' }}>{clientCompany || 'Direct Client'}</div>
                    <div style={{ color: '#444' }}>Attn: {clientContact || 'Representative'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>PROJECT DETAILS</div>
                    <div style={{ fontWeight: 700, color: '#111' }}>{projectFullName || 'Project Overview'}</div>
                    <div style={{ color: '#555' }}>Design Fee Structure: {FEE_PRESETS[feeType]?.name}</div>
                  </div>
                </div>

                {/* Account Balances Grid */}
                {(() => {
                  const targetTotalFee = procurementDiscountActive ? calculatorBreakdown.reducedTotal : calculatorBreakdown.standardTotal;
                  const totalBilled = milestones.reduce((s, m) => s + (Number(m.invoicedAmount) || 0), 0);
                  const totalPaid = milestones.reduce((s, m) => s + (Number(m.paidAmount) || 0), 0);
                  const outstandingBalance = Math.max(0, targetTotalFee - totalPaid);
                  
                  return (
                    <>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '12px', 
                        marginBottom: '32px',
                        background: '#f4f2eb',
                        padding: '16px',
                        borderRadius: '6px',
                        border: '1px solid #dcdad0',
                        textAlign: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '9px', color: '#666', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Contract Value</span>
                          <strong style={{ fontSize: '15px', color: '#111', fontWeight: 800 }}>
                            {calculatorBreakdown.symbol} {targetTotalFee.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#666', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Total Billed</span>
                          <strong style={{ fontSize: '15px', color: '#185fa5', fontWeight: 800 }}>
                            {calculatorBreakdown.symbol} {totalBilled.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#666', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Total Paid</span>
                          <strong style={{ fontSize: '15px', color: '#10b981', fontWeight: 800 }}>
                            {calculatorBreakdown.symbol} {totalPaid.toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: '#666', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>Outstanding</span>
                          <strong style={{ fontSize: '15px', color: outstandingBalance > 0 ? '#f59e0b' : '#666', fontWeight: 800 }}>
                            {calculatorBreakdown.symbol} {outstandingBalance.toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {/* Milestone details table */}
                      <div style={{ marginBottom: '28px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>MILESTONE PAYMENT LEDGER</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#333' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #1a1a1a', textAlign: 'left', fontWeight: 700 }}>
                              <th style={{ padding: '8px 0' }}>Milestone Target Description</th>
                              <th style={{ padding: '8px 0', textAlign: 'center', width: '50px' }}>Split</th>
                              <th style={{ padding: '8px 0', textAlign: 'right', width: '90px' }}>Target Val</th>
                              <th style={{ padding: '8px 0', textAlign: 'right', width: '90px' }}>Billed</th>
                              <th style={{ padding: '8px 0', textAlign: 'right', width: '90px' }}>Paid</th>
                              <th style={{ padding: '8px 0', textAlign: 'center', width: '100px' }}>Invoice Ref</th>
                              <th style={{ padding: '8px 0', textAlign: 'right', width: '80px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {milestones.map((m, i) => {
                              const milestoneVal = Math.round((targetTotalFee * m.percent) / 100);
                              const invoiced = m.invoicedAmount || 0;
                              const paidVal = m.paidAmount || 0;
                              
                              let statusText = 'Unbilled';
                              let statusBg = '#e0ddd5';
                              let statusColorText = '#444';
                              
                              if (paidVal >= milestoneVal) {
                                statusText = 'Paid';
                                statusBg = '#d1fae5';
                                statusColorText = '#065f46';
                              } else if (paidVal > 0) {
                                statusText = 'Part Paid';
                                statusBg = '#fef3c7';
                                statusColorText = '#92400e';
                              } else if (invoiced > 0) {
                                statusText = 'Billed';
                                statusBg = '#fee2e2';
                                statusColorText = '#991b1b';
                              }

                              return (
                                <tr key={i} style={{ borderBottom: '1px solid #e2dfd7' }}>
                                  <td style={{ padding: '10px 0', fontWeight: 600 }}>{m.label}</td>
                                  <td style={{ padding: '10px 0', textAlign: 'center', color: '#666' }}>{m.percent}%</td>
                                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 500 }}>
                                    {calculatorBreakdown.symbol} {milestoneVal.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 0', textAlign: 'right', color: invoiced > 0 ? '#185fa5' : '#888' }}>
                                    {calculatorBreakdown.symbol} {invoiced.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 0', textAlign: 'right', color: paidVal > 0 ? '#10b981' : '#888', fontWeight: 600 }}>
                                    {calculatorBreakdown.symbol} {paidVal.toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 0', textAlign: 'center', fontFamily: 'monospace', fontSize: '11.5px' }}>
                                    {m.invoiceRef ? (
                                      <button 
                                        className="btn-link"
                                        style={{ 
                                          background: 'none', 
                                          border: 'none', 
                                          color: '#185fa5', 
                                          textDecoration: 'underline', 
                                          cursor: 'pointer', 
                                          fontFamily: 'monospace',
                                          padding: 0
                                        }}
                                        onClick={() => {
                                          setActivePreviewInvoiceId(m.invoiceRef);
                                          setRightPanelTab('invoice');
                                        }}
                                      >
                                        {m.invoiceRef}
                                      </button>
                                    ) : '—'}
                                  </td>
                                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                    <span style={{ 
                                      fontSize: '9.5px', 
                                      fontWeight: 700, 
                                      background: statusBg, 
                                      color: statusColorText, 
                                      padding: '2px 8px', 
                                      borderRadius: '4px',
                                      textTransform: 'uppercase'
                                    }}>
                                      {statusText}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}

                {/* Raised Invoices list */}
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>LINKED INVOICES LEDGER</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', color: '#444' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #666', textAlign: 'left', fontWeight: 700 }}>
                        <th style={{ padding: '6px 0' }}>Invoice ID</th>
                        <th style={{ padding: '6px 0' }}>Issued Date</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '6px 0', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.filter(inv => inv.project === (projectFullName || 'Upper Primrose')).map((inv, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2dfd7' }}>
                          <td style={{ padding: '8px 0', fontFamily: 'monospace', fontWeight: 600 }}>
                            <button 
                              className="btn-link"
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#185fa5', 
                                textDecoration: 'underline', 
                                cursor: 'pointer', 
                                fontFamily: 'monospace',
                                padding: 0
                              }}
                              onClick={() => {
                                setActivePreviewInvoiceId(inv.id);
                                setRightPanelTab('invoice');
                              }}
                            >
                              {inv.id}
                            </button>
                          </td>
                          <td style={{ padding: '8px 0' }}>{inv.issued}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#111' }}>{inv.amount}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: inv.status === 'Paid' ? '#10b981' : '#f59e0b' }}>
                            {inv.status}
                          </td>
                        </tr>
                      ))}
                      {invoices.filter(inv => inv.project === (projectFullName || 'Upper Primrose')).length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ padding: '12px 0', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                            No invoice records linked to this design fee project.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* INVOICE PREVIEW TAB */}
            {rightPanelTab === 'invoice' && (
              <div style={{ 
                background: '#FAF9F6', 
                color: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '8px', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                border: '1px solid #e0ddd5',
                fontFamily: '"Outfit", "Inter", sans-serif',
                position: 'relative'
              }}>
                <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                  <button 
                    className="btn btn-sm btn-ghost"
                    style={{ border: '1px solid #e0ddd5', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => window.print()}
                  >
                    <Printer size={12} /> Print Invoice
                  </button>
                </div>

                {(() => {
                  const inv = invoices.find(i => i.id.trim().toLowerCase() === activePreviewInvoiceId.trim().toLowerCase()) || {
                    id: activePreviewInvoiceId,
                    project: projectFullName || 'Upper Primrose',
                    client: clientCompany || 'Sarah Venter',
                    amount: `${calculatorBreakdown.symbol} 0`,
                    issued: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
                    due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
                    status: 'Unpaid',
                    description: 'Design Fee Milestone stage payment'
                  };

                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1a1a1a', paddingBottom: '24px', marginBottom: '24px', marginTop: '16px' }}>
                        <div>
                          <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '2px', color: '#000' }}>1-TO-1 WORLD</div>
                          <div style={{ fontSize: '9px', fontWeight: 600, color: '#666', letterSpacing: '1px', marginTop: '2px' }}>LIGHTING DESIGN & SPECIFICATION SERVICES</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '1px' }}>INVOICE</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#185fa5', marginTop: '4px', fontFamily: 'monospace' }}>#{inv.id}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px', fontSize: '12px' }}>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>FROM:</div>
                          <div style={{ fontWeight: 700, color: '#111' }}>1-to-1 World (Pty) Ltd</div>
                          <div style={{ color: '#555' }}>Studio 102, The Foundry, Green Point</div>
                          <div style={{ color: '#555' }}>Cape Town, 8005</div>
                          <div style={{ color: '#555' }}>VAT: 45202919382</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>BILLED TO:</div>
                          <div style={{ fontWeight: 700, color: '#111' }}>{inv.client || 'Direct Client'}</div>
                          <div style={{ color: '#555' }}>Project: {inv.project || 'Project Overview'}</div>
                          <div style={{ color: '#555' }}>Issued Date: {inv.issued}</div>
                          <div style={{ color: '#555' }}>Due Date: {inv.due}</div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '36px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#333' }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid #1a1a1a', textAlign: 'left', fontWeight: 700 }}>
                              <th style={{ padding: '8px 0' }}>Description</th>
                              <th style={{ padding: '8px 0', textAlign: 'right', width: '120px' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                              <td style={{ padding: '12px 0' }}>
                                <div style={{ fontWeight: 600, color: '#111' }}>{inv.description}</div>
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Professional lighting design services, layout calculations, and specifications.</div>
                              </td>
                              <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: '#111' }}>{inv.amount}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', borderTop: '1px solid #e0ddd5', paddingTop: '24px', fontSize: '11px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#444', marginBottom: '4px', textTransform: 'uppercase', fontSize: '9px' }}>Bank Payment Details</div>
                          <div style={{ color: '#666', lineHeight: '1.5' }}>
                            Bank: <strong>Standard Bank</strong><br />
                            Account Name: <strong>1-to-1 World Operations</strong><br />
                            Account Number: <strong>0712 9492 10</strong><br />
                            Branch Code: <strong>025009</strong><br />
                            Reference: <strong>{inv.id}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#666', fontWeight: 600 }}>Total Due</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a1a', marginTop: '2px' }}>{inv.amount}</div>
                          <div style={{ marginTop: '6px' }}>
                            <span style={{ 
                              fontSize: '9.5px', 
                              fontWeight: 700, 
                              background: inv.status === 'Paid' ? '#d1fae5' : '#fee2e2', 
                              color: inv.status === 'Paid' ? '#065f46' : '#991b1b', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {inv.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

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
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Link / Shift Design Fee: {linkModalItem.id}</div>
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

              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--bg-primary)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <strong>Linking Note:</strong> Changing links shifts this design fee. If unlinked from a project, it will be catalogued directly under the client's direct design fee portfolio.
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
                    if (!linkClient) {
                      alert('Please select a client to link to if unlinking from a project.');
                      return;
                    }
                    newProjectKey = `client-${linkClient.toLowerCase().trim().replace(/\s+/g, '-')}`;
                  }
                  
                  moveDesignFee(
                    linkModalItem.id,
                    oldProjectKey,
                    newProjectKey,
                    linkClient,
                    targetClient.company || ''
                  );
                  
                  setLinkModalItem(null);
                  alert(`Successfully shifted design fee ${linkModalItem.id}!`);
                }}
              >
                Save & Link Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
