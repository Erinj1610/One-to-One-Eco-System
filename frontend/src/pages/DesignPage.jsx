import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api_config';
import { 
  Save, TrendingUp, AlertCircle, Plus, Search, ArrowLeft, 
  Edit3, Filter, CheckCircle, FileSpreadsheet, AlertTriangle, 
  Printer, FileText, DollarSign, Layers, ChevronRight, Sparkles, ClipboardList,
  Calendar, Clock, Play, TrendingDown, Calculator
} from 'lucide-react';
import CollapsibleAlertSidebar from '../components/common/CollapsibleAlertSidebar';
import DesignFeeBuilder from './projects/DesignFeeBuilder';

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
  'In Review': 'b-warning',
  Cancelled: 'b-danger'
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
  const { projects, updateProject, contacts, setContacts, logAttrition, addInvoice, invoices, moveDesignFee, getModuleName } = useStore();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Attrition/Cancellation modal state
  const [cancelModalItem, setCancelModalItem] = useState(null); // { feeId, projectKey, clientName }
  const [lossReason, setLossReason] = useState('Price');
  const [lossNotes, setLossNotes] = useState('');

  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_design') === 'true';
  });
  
  // Link/Unlink modal state
  const [linkModalItem, setLinkModalItem] = useState(null);
  const [linkClient, setLinkClient] = useState('');
  const [linkProjectKey, setLinkProjectKey] = useState('');
  
  // Workspace active values
  const [activeFeeName, setActiveFeeName] = useState('');
  const [activeFeeSqm, setActiveFeeSqm] = useState(1000);
  const [feeStatus, setFeeStatus] = useState('Draft');
  const [feePaidAmount, setFeePaidAmount] = useState(0);

  // New design fee modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeProjectKey, setNewFeeProjectKey] = useState('');

  const handleCreateDesignFee = () => {
    if (!newFeeName.trim()) {
      alert("Please enter a name for the design fee.");
      return;
    }
    if (!newFeeProjectKey) {
      alert("Please select a project to link the design fee to.");
      return;
    }

    const proj = projects[newFeeProjectKey];
    if (!proj) return;

    // Generate unique ID in the format DF-XXXX (4-digit number)
    const existingIds = Object.values(projects)
      .flatMap(p => p.designFees || [])
      .map(f => f.id);
    
    let nextIdVal = 101;
    while (existingIds.includes(`DF-${nextIdVal}`)) {
      nextIdVal++;
    }
    const newId = `DF-${nextIdVal}`;

    const newFee = {
      id: newId,
      name: newFeeName.trim(),
      sqm: 1000,
      landscapeSqm: 500,
      feeType: 'Signature',
      flatBaseFee: 50000,
      includeConcept: true,
      includeSchematic: true,
      includeFinal: true,
      includeSite: false,
      includeCommissioning: false,
      adjustmentPercent: 0,
      procurementDiscountActive: false,
      status: 'Draft',
      date: new Date().toISOString().split('T')[0],
      paid: 0,
      outstanding: 0,
      margin: 18,
      feeValue: 0,
      milestones: [
        { label: 'Deposit / Commitment Fee', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Concept Design Approval', percent: 30, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Schematic Layout Approval', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false },
        { label: 'Final Delivery & Sign-off', percent: 20, invoicedAmount: 0, paidAmount: 0, invoiceRef: '', isBilled: false }
      ]
    };

    const updatedFees = [...(proj.designFees || []), newFee];
    updateProject(newFeeProjectKey, 'designFees', updatedFees);

    // Explicit direct write to SQL endpoint to ensure immediate insertion into Cloud SQL design_fees table
    fetch(`${API_BASE}/api/projects/${newFeeProjectKey}/design-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFee)
    }).catch(err => console.error("Error writing design fee to SQL table:", err));

    // Reset create fields
    setNewFeeName('');
    setNewFeeProjectKey('');
    setShowCreateModal(false);

    // Auto-open workspace for the newly created fee
    handleOpenWorkspace({
      ...newFee,
      projectKey: proj.key,
      projectName: proj.name,
      projectClient: proj.client,
      pmName: proj.pm,
      projectStart: proj.start
    });
  };


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
    if (!dateStr) return true; // Default to visible if no date string present
    const pDate = parseProjectDate(dateStr);
    if (!pDate) return true;
    
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
    setTargetMargin(proj.targetMargin || 39);
    setActualMargin(fee.margin || 39);
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
        <div style={{ display: 'grid', gridTemplateColumns: isSidebarCollapsed ? '1fr 50px' : '1fr 340px', gap: '24px', alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
          <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
            <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="av-md" style={{ background: 'rgba(24, 95, 165, 0.1)', color: 'var(--text-info)' }}>
                  <Calculator size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Standalone {getModuleName('design', 'Design')} Fees & CAD Module</h2>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Central Design Fee Calculator & Deliverables Workspace.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Date Filters */}
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '0.5px solid var(--border)' }}>
                  {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className={`btn btn-sm ${datePreset === preset ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ border: 'none', background: datePreset === preset ? 'var(--text-info)' : 'none', color: datePreset === preset ? 'white' : 'var(--text-secondary)' }}
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
                    onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '125px', padding: '3px 8px', fontSize: '11px' }}
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
                  />
                </div>
              </div>
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

                <button 
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '0 16px', background: 'var(--text-info)', borderColor: 'var(--text-info)', color: '#fff' }}
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={14} /> Create Design Fee
                </button>
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
                      <th style={{ textAlign: 'center' }}>Actions</th>
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
                        <td style={{ fontWeight: 500, color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate(`/projects/${f.projectKey}`); }}>{f.projectName}</td>
                        <td style={{ color: 'var(--text-info)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); navigate('/crm', { state: { selectedClientName: f.projectClient } }); }}>{f.projectClient}</td>
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
                        <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          {f.status !== 'Cancelled' && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-danger)', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)' }}
                              onClick={() => setCancelModalItem({
                                feeId: f.id,
                                projectKey: f.projectKey,
                                clientName: f.projectClient
                              })}
                            >
                              <TrendingDown size={13} /> Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredFees.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No active design sub-fees found within range.
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
            module="design" 
            onNavigate={(path, state) => {
              if (path === '/design' && state?.selectedProjectKey) {
                setSelectedProjectKey(state.selectedProjectKey);
                const proj = projects[state.selectedProjectKey];
                if (proj && proj.designFees && proj.designFees.length > 0) {
                  setSelectedFeeId(proj.designFees[0].id);
                }
              } else {
                navigate(path, { state });
              }
            }}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(prev => !prev)}
          />
        </div>
      ) : (
        /* DESIGN FEE CALCULATOR WORKSPACE */
        <div style={{ width: '100%', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}
              onClick={() => setSelectedFeeId(null)}
            >
              <ArrowLeft size={14} /> Back to Ledger
            </button>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Design Fee Setup Workspace</h2>
          </div>
          <DesignFeeBuilder 
            isLocked={false} 
            projectId={selectedProjectKey}
            initialLivingArea={activeFeeSqm || 1000}
            initialLandscapeArea={activeLandscapeSqm || 500}
            updateFee={(feeData) => {
              handleSaveFeeWorkspace();
            }} 
          />
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

      {cancelModalItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', borderRadius: '12px', width: '450px', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Confirm Design Fee Attrition</h3>
              <button className="modal-close" style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }} onClick={() => setCancelModalItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <div style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', padding: '12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                <strong>Post-Mortem Policy:</strong> Before marking this design fee as Cancelled, you must log the exact friction reason. This data feeds directly into our Attrition Analytics to help leadership retain key partnerships.
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
                  const { feeId, projectKey, clientName } = cancelModalItem;
                  
                  // 1. Update the design fee status to Cancelled in the specific project
                  const project = projects[projectKey];
                  if (project) {
                    const updatedFees = (project.designFees || []).map(f => {
                      if (f.id === feeId) {
                        return { ...f, status: 'Cancelled' };
                      }
                      return f;
                    });
                    updateProject(projectKey, 'designFees', updatedFees);
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
                        lastContactSummary: `Post-Mortem: Design fee ${feeId} cancelled due to ${lossReason}` 
                      };
                    }
                    return c;
                  }));
                  
                  // 4. Update the feeStatus state if workspace is currently open for it
                  if (selectedFeeId === feeId) {
                    setFeeStatus('Cancelled');
                  }
                  
                  setCancelModalItem(null);
                  setLossNotes('');
                }}
              >
                Log Post-Mortem & Cancel Design Fee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW DESIGN FEE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '14px', fontWeight: 700 }}>Create New Design Fee</div>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Design Fee Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Phase 2 Concept Fee"
                  value={newFeeName} 
                  onChange={e => setNewFeeName(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Link to Project</label>
                <select 
                  className="form-control" 
                  value={newFeeProjectKey} 
                  onChange={e => setNewFeeProjectKey(e.target.value)}
                >
                  <option value="">-- Select Project --</option>
                  {Object.values(projects).map(p => (
                    <option key={p.key} value={p.key}>{p.name} ({p.client})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary"
                disabled={!newFeeName.trim() || !newFeeProjectKey}
                onClick={handleCreateDesignFee}
                style={{ background: 'var(--text-info)', borderColor: 'var(--text-info)', color: '#fff' }}
              >
                Create & Setup Fee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

