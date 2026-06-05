import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Calendar, Clock, Play, CheckCircle, Search, ArrowLeft, Save, Plus, 
  Layers, ChevronDown, ChevronUp, Edit3, Trash2, HelpCircle, 
  Sparkles, FileSpreadsheet, FileText, BarChart
} from 'lucide-react';

export default function DesignTracker() {
  const { projects, updateProject } = useStore();

  // Selected fee state
  const [selectedFeeId, setSelectedFeeId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);

  // Local state for workspace editing
  const [localFee, setLocalFee] = useState(null);
  const [isEditingRegDetails, setIsEditingRegDetails] = useState(false);

  // Active Workspace Tab state
  const [activeTab, setActiveTab] = useState('breakdown'); // 'breakdown' | 'time' | 'invoicing' | 'milestones'

  // Modal create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeProject, setNewFeeProject] = useState('');
  const [newFeeDesigner, setNewFeeDesigner] = useState('Merlyn');
  const [newFeeType, setNewFeeType] = useState('Fixed Phase');
  const [newFeeTerms, setNewFeeTerms] = useState('30 days');
  const [newFeeSqm, setNewFeeSqm] = useState(1000);
  const [newFeeMargin, setNewFeeMargin] = useState(18);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [projectFilter, setProjectFilter] = useState('All Linked Projects');
  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeKpiFilter, setActiveKpiFilter] = useState(null); // null | 'all' | 'pending' | 'active' | 'collected'

  // Load all design fees from store context
  const allFees = useMemo(() => {
    const list = [];
    Object.values(projects).forEach(proj => {
      if (proj.designFees) {
        proj.designFees.forEach(fee => {
          list.push({
            ...fee,
            projectKey: proj.key,
            projectClientName: proj.client,
            projectPMName: proj.pm,
            projectStartStr: proj.start
          });
        });
      }
    });
    return list;
  }, [projects]);

  // Parse date string to helper date object
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === '—') return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Date range checker
  const isFeeInDateRange = (fee) => {
    if (!startDate && !endDate) return true;
    const dateStr = fee.date || fee.projectStartStr;
    if (!dateStr) return false;
    const pDate = parseDate(dateStr);
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

  // Apply Date Preset Range
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
    } else if (preset === 'Financial Year') {
      // Localized FY: March 1st to Feb 28th
      const currentYear = today.getFullYear();
      setStartDate(`${currentYear}-03-01`);
      setEndDate(`${currentYear + 1}-02-28`);
    }
  };

  // Filter design fees matching search + status + project + date
  const filteredFees = useMemo(() => {
    return allFees.filter(fee => {
      // Date Check
      if (!isFeeInDateRange(fee)) return false;

      // Project Filter
      if (projectFilter !== 'All Linked Projects' && fee.projectKey !== projectFilter) return false;

      // Status Filter
      if (statusFilter !== 'All Statuses') {
        const currentStatus = fee.feeStatus || fee.status || 'Concept Phase';
        if (currentStatus !== statusFilter) return false;
      }

      // KPI interactive filter matching
      if (activeKpiFilter) {
        const currentStatus = fee.feeStatus || fee.status || 'Concept Phase';
        const outstanding = (fee.feeValue || 0) - (fee.paid || 0);

        if (activeKpiFilter === 'pending' && currentStatus !== 'Concept Phase' && currentStatus !== 'Detail Design') return false;
        if (activeKpiFilter === 'active' && currentStatus !== 'Documentation' && currentStatus !== 'Concept Phase' && currentStatus !== 'Detail Design') return false;
        if (activeKpiFilter === 'collected' && currentStatus !== 'Completed') return false;
      }

      // Search Query Matching
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = 
          fee.id.toLowerCase().includes(q) ||
          fee.name.toLowerCase().includes(q) ||
          fee.projectClientName.toLowerCase().includes(q) ||
          (fee.company && fee.company.toLowerCase().includes(q)) ||
          (fee.feeType && fee.feeType.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [allFees, projectFilter, statusFilter, activeKpiFilter, searchQuery, startDate, endDate]);

  // Compute KPI summaries dynamically
  const kpiData = useMemo(() => {
    let totalExVAT = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalCount = 0;

    let pendingCount = 0;
    let pendingVal = 0;
    let pendingPaid = 0;
    let pendingOutstanding = 0;

    let activeCount = 0;
    let activeVal = 0;
    let activePaid = 0;
    let activeOutstanding = 0;

    let collectedCount = 0;
    let collectedVal = 0;

    allFees.forEach(fee => {
      // Dynamic totals
      if (!isFeeInDateRange(fee)) return;

      const val = fee.feeValue || 0;
      const paid = fee.paid || 0;
      const out = Math.max(0, val - paid);

      totalCount++;
      totalExVAT += val;
      totalPaid += paid;
      totalOutstanding += out;

      const currentStatus = fee.feeStatus || fee.status || 'Concept Phase';

      // Pending (Concept Phase & Detail Design)
      if (currentStatus === 'Concept Phase' || currentStatus === 'Detail Design') {
        pendingCount++;
        pendingVal += val;
        pendingPaid += paid;
        pendingOutstanding += out;
      }

      // Active (Documentation, and anything WIP outstanding > 0)
      if (currentStatus === 'Documentation' || (currentStatus !== 'Completed' && out > 0)) {
        activeCount++;
        activeVal += val;
        activePaid += paid;
        activeOutstanding += out;
      }

      // Collected (Completed)
      if (currentStatus === 'Completed') {
        collectedCount++;
        collectedVal += paid;
      }
    });

    return {
      total: { qty: totalCount, val: totalExVAT, paid: totalPaid, out: totalOutstanding },
      pending: { qty: pendingCount, val: pendingVal, paid: pendingPaid, out: pendingOutstanding },
      active: { qty: activeCount, val: activeVal, paid: activePaid, out: activeOutstanding },
      collected: { qty: collectedCount, val: collectedVal }
    };
  }, [allFees, startDate, endDate]);

  // Handle open workspace row click
  const handleOpenWorkspace = (fee) => {
    setSelectedFeeId(fee.id);
    setSelectedProjectKey(fee.projectKey);
    setIsEditingRegDetails(false);
    setActiveTab('breakdown');

    // Create a deep copy of fee for local edits
    setLocalFee({
      ...fee,
      phases: fee.phases ? fee.phases.map(p => ({ ...p })) : [
        {
          phase: 'PHASE 1 CONCEPT',
          serviceCode: 'DS-001A',
          description: 'Moodboards & Space Planning Layout',
          estHours: 10,
          hourlyRate: 1800,
          phaseFee: 18000,
          actHours: 0,
          totalValue: 0,
          billedFee: 0,
          unbilledFee: 18000,
          progress: 0,
          nextMilestone: 'Concept Design'
        }
      ]
    });
  };

  // Keyboard navigation handler in spreadsheet table cells
  const handleSpreadsheetKeyDown = (e) => {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

    const rowStr = target.getAttribute('data-row');
    const col = target.getAttribute('data-col');
    if (rowStr === null || !col) return;

    const row = parseInt(rowStr);
    const visibleCols = [
      'phase', 'serviceCode', 'description', 'estHours', 'hourlyRate', 
      'actHours', 'billedFee', 'progress', 'nextMilestone'
    ];
    const colIndex = visibleCols.indexOf(col);
    if (colIndex === -1) return;

    let nextRow = row;
    let nextColIndex = colIndex;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(localFee.phases.length - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      // Only navigate left if cursor is at the beginning of the text or input type is number
      if (target.selectionStart === 0 || target.type === 'number') {
        e.preventDefault();
        nextColIndex = Math.max(0, colIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      // Only navigate right if cursor is at the end of the text or input type is number
      if (target.selectionStart === target.value.length || target.type === 'number') {
        e.preventDefault();
        nextColIndex = Math.min(visibleCols.length - 1, colIndex + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      nextRow = Math.min(localFee.phases.length - 1, row + 1);
    } else {
      return;
    }

    const nextCol = visibleCols[nextColIndex];
    const selector = `[data-row="${nextRow}"][data-col="${nextCol}"]`;
    const nextElement = document.querySelector(selector);
    if (nextElement) {
      nextElement.focus();
      if (nextElement.select) {
        nextElement.select();
      }
    }
  };

  // Copy-paste spreadsheet TSV values handler
  const handleSpreadsheetPaste = (e) => {
    const target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

    const rowStr = target.getAttribute('data-row');
    const col = target.getAttribute('data-col');
    if (rowStr === null || !col) return;

    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedText = clipboardData.getData('text');

    const lines = pastedText.split(/\r?\n/).filter(line => line.length > 0);
    const parsedGrid = lines.map(line => line.split('\t'));

    const startRow = parseInt(rowStr);
    const visibleCols = [
      'phase', 'serviceCode', 'description', 'estHours', 'hourlyRate', 
      'actHours', 'billedFee', 'progress', 'nextMilestone'
    ];
    const startColIndex = visibleCols.indexOf(col);
    if (startColIndex === -1) return;

    setLocalFee(prev => {
      const updatedPhases = prev.phases.map(p => ({ ...p }));
      
      parsedGrid.forEach((gridRow, rOffset) => {
        const targetRowIdx = startRow + rOffset;
        if (targetRowIdx >= updatedPhases.length) return;

        gridRow.forEach((cellValue, cOffset) => {
          const targetColIdx = startColIndex + cOffset;
          if (targetColIdx >= visibleCols.length) return;

          const targetCol = visibleCols[targetColIdx];
          const currentPhase = { ...updatedPhases[targetRowIdx] };

          if (['estHours', 'hourlyRate', 'actHours', 'billedFee', 'progress'].includes(targetCol)) {
            // Remove R or commas for numbers
            const cleanedVal = String(cellValue).replace(/[R\s,%]/g, '');
            currentPhase[targetCol] = Math.max(0, parseFloat(cleanedVal) || 0);
          } else {
            currentPhase[targetCol] = cellValue;
          }

          // Recalculate computed columns
          const est = Number(currentPhase.estHours) || 0;
          const rate = Number(currentPhase.hourlyRate) || 0;
          const act = Number(currentPhase.actHours) || 0;
          const billed = Number(currentPhase.billedFee) || 0;

          currentPhase.phaseFee = est * rate;
          currentPhase.totalValue = act * rate;
          currentPhase.unbilledFee = Math.max(0, currentPhase.phaseFee - billed);

          updatedPhases[targetRowIdx] = currentPhase;
        });
      });

      // Recalculate top level fee summary values
      const newExVATValue = updatedPhases.reduce((sum, p) => sum + (p.phaseFee || 0), 0);
      const newInvoiced = updatedPhases.reduce((sum, p) => sum + (p.billedFee || 0), 0);
      const newOutstanding = Math.max(0, newInvoiced - (prev.paid || 0));

      return {
        ...prev,
        phases: updatedPhases,
        feeValue: newExVATValue,
        amountInvoiced: newInvoiced,
        outstanding: newOutstanding
      };
    });
  };

  // Modify phase cell value
  const handleUpdatePhaseCell = (index, field, value) => {
    setLocalFee(prev => {
      const updatedPhases = prev.phases.map((p, idx) => {
        if (idx !== index) return p;
        const copy = { ...p, [field]: value };

        // Handle mathematical re-calculations
        if (field === 'estHours' || field === 'hourlyRate') {
          copy.phaseFee = (Number(copy.estHours) || 0) * (Number(copy.hourlyRate) || 0);
          copy.unbilledFee = Math.max(0, copy.phaseFee - (Number(copy.billedFee) || 0));
        }
        if (field === 'actHours' || field === 'hourlyRate') {
          copy.totalValue = (Number(copy.actHours) || 0) * (Number(copy.hourlyRate) || 0);
        }
        if (field === 'billedFee') {
          copy.phaseFee = (Number(copy.estHours) || 0) * (Number(copy.hourlyRate) || 0);
          copy.unbilledFee = Math.max(0, copy.phaseFee - Number(value));
        }

        return copy;
      });

      // Recalculate top level totals
      const newExVATValue = updatedPhases.reduce((sum, p) => sum + (p.phaseFee || 0), 0);
      const newInvoiced = updatedPhases.reduce((sum, p) => sum + (p.billedFee || 0), 0);
      const newOutstanding = Math.max(0, newInvoiced - (prev.paid || 0));

      return {
        ...prev,
        phases: updatedPhases,
        feeValue: newExVATValue,
        amountInvoiced: newInvoiced,
        outstanding: newOutstanding
      };
    });
  };

  // Add a new phase row to spreadsheet
  const handleAddPhaseRow = () => {
    setLocalFee(prev => {
      const nextPhaseNum = prev.phases.length + 1;
      const newPhase = {
        phase: `PHASE ${nextPhaseNum} NEW`,
        serviceCode: `DS-00${nextPhaseNum}`,
        description: 'New Design Service Phase Description',
        estHours: 10,
        hourlyRate: 1800,
        phaseFee: 18000,
        actHours: 0,
        totalValue: 0,
        billedFee: 0,
        unbilledFee: 18000,
        progress: 0,
        nextMilestone: 'TBD'
      };
      
      const updatedPhases = [...prev.phases, newPhase];
      const newExVATValue = updatedPhases.reduce((sum, p) => sum + (p.phaseFee || 0), 0);
      const newInvoiced = updatedPhases.reduce((sum, p) => sum + (p.billedFee || 0), 0);
      const newOutstanding = Math.max(0, newInvoiced - (prev.paid || 0));

      return {
        ...prev,
        phases: updatedPhases,
        feeValue: newExVATValue,
        amountInvoiced: newInvoiced,
        outstanding: newOutstanding
      };
    });
  };

  // Delete a phase row
  const handleDeletePhaseRow = (index) => {
    if (localFee.phases.length <= 1) {
      alert("A design fee structure must contain at least 1 phase.");
      return;
    }
    setLocalFee(prev => {
      const updatedPhases = prev.phases.filter((_, idx) => idx !== index);
      const newExVATValue = updatedPhases.reduce((sum, p) => sum + (p.phaseFee || 0), 0);
      const newInvoiced = updatedPhases.reduce((sum, p) => sum + (p.billedFee || 0), 0);
      const newOutstanding = Math.max(0, newInvoiced - (prev.paid || 0));

      return {
        ...prev,
        phases: updatedPhases,
        feeValue: newExVATValue,
        amountInvoiced: newInvoiced,
        outstanding: newOutstanding
      };
    });
  };

  // Save details and synchronize back to global StoreContext
  const handleSaveAndSyncFee = () => {
    const proj = projects[selectedProjectKey];
    if (!proj) return;

    // Save and recalculate
    const updatedFees = (proj.designFees || []).map(fee => {
      if (fee.id === selectedFeeId) {
        return {
          ...fee,
          name: localFee.name,
          company: localFee.company,
          leadDesigner: localFee.leadDesigner,
          feeType: localFee.feeType,
          feeTerms: localFee.feeTerms,
          sqm: localFee.sqm,
          feeValue: localFee.feeValue,
          amountInvoiced: localFee.amountInvoiced,
          paid: localFee.paid,
          outstanding: Math.max(0, localFee.amountInvoiced - (localFee.paid || 0)),
          status: localFee.status,
          feeStatus: localFee.feeStatus,
          phases: localFee.phases
        };
      }
      return fee;
    });

    updateProject(selectedProjectKey, 'designFees', updatedFees);

    // Dynamic actual project profit margin blender recalculation
    const totalDesignValue = updatedFees.reduce((s, f) => s + (f.feeValue || 0), 0);
    const totalOrdersValue = (proj.orders || []).reduce((s, o) => s + (o.value || 0), 0);
    const totalContract = totalDesignValue + totalOrdersValue;

    const designProfit = updatedFees.reduce((s, f) => s + ((f.feeValue || 0) * ((f.margin || 18) / 100)), 0);
    const ordersProfit = (proj.orders || []).reduce((s, o) => s + ((o.value || 0) - (o.costValue || 0)), 0);
    const totalBlendedProfit = designProfit + ordersProfit;

    const newBlendedMargin = totalContract > 0 ? Math.round((totalBlendedProfit / totalContract) * 100) : proj.targetMargin || 18;
    updateProject(selectedProjectKey, 'actualMargin', newBlendedMargin);

    alert(`Design Fee Spec DF-2025-${selectedFeeId.split('-').pop()} Saved & Synchronized Successfully!\n- Blended project actual profit margin updated to ${newBlendedMargin}%.`);
    
    // Close Workspace
    setSelectedFeeId(null);
    setLocalFee(null);
  };

  // Handle registration details input changes
  const handleUpdateRegDetails = (field, value) => {
    setLocalFee(prev => {
      let extra = {};
      // Sync client name dynamically if project changes
      if (field === 'projectKey') {
        const targetProj = projects[value] || {};
        extra = {
          projectName: targetProj.name || '',
          projectKey: value,
          company: targetProj.client || ''
        };
      }
      return {
        ...prev,
        [field]: value,
        ...extra
      };
    });
  };

  // Create new structure action
  const handleCreateNewFeeStructure = () => {
    if (!newFeeName || !newFeeProject) {
      alert("Please enter a name and select a linked project.");
      return;
    }

    const selectedProj = projects[newFeeProject];
    if (!selectedProj) return;

    // Generate reference code
    const baseNum = allFees.length + 1;
    const newId = `DF-2025-00${baseNum}`;

    const newFeeObj = {
      id: newId,
      name: newFeeName,
      company: selectedProj.client || 'Venter Architects',
      projectName: selectedProj.name || 'Upper Primrose',
      leadDesigner: newFeeDesigner,
      feeType: newFeeType,
      feeTerms: newFeeTerms,
      sqm: Number(newFeeSqm) || 1000,
      feeValue: 45000,
      amountInvoiced: 27000,
      paid: 0,
      outstanding: 27000,
      margin: Number(newFeeMargin) || 18,
      status: 'WIP',
      feeStatus: 'Concept Phase',
      files: [],
      phases: [
        {
          phase: 'PHASE 1 CONCEPT',
          serviceCode: 'DS-001A',
          description: 'Moodboards & Space Planning Layout',
          estHours: 15,
          hourlyRate: 1800,
          phaseFee: 27000,
          actHours: 10,
          totalValue: 18000,
          billedFee: 27000,
          unbilledFee: 0,
          progress: 100,
          nextMilestone: 'Concept Design'
        },
        {
          phase: 'PHASE 2 DEVELOP',
          serviceCode: 'DS-002',
          description: 'Custom Joinery Detail Drawing Set',
          estHours: 10,
          hourlyRate: 1800,
          phaseFee: 18000,
          actHours: 0,
          totalValue: 0,
          billedFee: 0,
          unbilledFee: 18000,
          progress: 0,
          nextMilestone: 'Development (Ground)'
        }
      ]
    };

    const existingFees = selectedProj.designFees || [];
    updateProject(newFeeProject, 'designFees', [...existingFees, newFeeObj]);

    // Close Modal and open Workspace directly on the newly created fee
    setShowCreateModal(false);
    
    // Clear inputs
    setNewFeeName('');
    setNewFeeProject('');
    
    // Auto-open workspace
    setTimeout(() => {
      handleOpenWorkspace({
        ...newFeeObj,
        projectKey: newFeeProject,
        projectClientName: selectedProj.client,
        projectPMName: selectedProj.pm,
        projectStartStr: selectedProj.start
      });
    }, 100);
  };

  // Status mapping colors matching mockups
  const getStatusBadgeClass = (statusStr) => {
    switch (statusStr) {
      case 'Concept Phase': return 'b-info';
      case 'Detail Design': return 'b-warning';
      case 'Documentation': return 'b-default';
      case 'Completed': return 'b-success';
      default: return 'b-default';
    }
  };

  // Compute column totals of local phases
  const phaseTotals = useMemo(() => {
    if (!localFee || !localFee.phases) return null;
    let estHoursSum = 0;
    let phaseFeeSum = 0;
    let actHoursSum = 0;
    let totalValueSum = 0;
    let billedFeeSum = 0;
    let unbilledFeeSum = 0;

    localFee.phases.forEach(p => {
      estHoursSum += Number(p.estHours) || 0;
      phaseFeeSum += Number(p.phaseFee) || 0;
      actHoursSum += Number(p.actHours) || 0;
      totalValueSum += Number(p.totalValue) || 0;
      billedFeeSum += Number(p.billedFee) || 0;
      unbilledFeeSum += Number(p.unbilledFee) || 0;
    });

    return {
      estHours: estHoursSum,
      phaseFee: phaseFeeSum,
      actHours: actHoursSum,
      totalValue: totalValueSum,
      billedFee: billedFeeSum,
      unbilledFee: unbilledFeeSum
    };
  }, [localFee]);

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 4px' }}>
      
      {/* STYLE INJECTIONS FOR SPREADSHEET FOCUS CELLS */}
      <style>{`
        .gs-cell-input {
          width: 100% !important;
          height: 100% !important;
          min-height: 32px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          padding: 6px 8px !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          font-family: inherit !important;
          outline: none !important;
          transition: box-shadow 0.1s ease, background-color 0.1s ease !important;
        }
        .gs-cell-input:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
        .gs-cell-select {
          width: 100% !important;
          height: 100% !important;
          min-height: 32px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: var(--text-primary) !important;
          padding: 4px 8px !important;
          margin: 0 !important;
          font-size: 11.5px !important;
          font-family: inherit !important;
          outline: none !important;
          transition: box-shadow 0.1s ease, background-color 0.1s ease !important;
        }
        .gs-cell-select:focus {
          background-color: var(--bg-secondary) !important;
          box-shadow: inset 0 0 0 2px var(--text-info) !important;
        }
        .active-kpi-card {
          border: 2px solid var(--text-info) !important;
          box-shadow: 0 4px 12px rgba(24,95,165,0.08) !important;
        }
      `}</style>

      {selectedFeeId === null ? (
        <>
          {/* DASHBOARD VIEW */}
          {/* HEADER BANNER */}
          <div style={{ background: 'linear-gradient(135deg, rgba(24,95,165,0.06) 0%, rgba(139,92,246,0.02) 100%)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge b-info" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>Design Suite</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Professional Service Fee Management</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📐 Design Fee Tracker Dashboard
                </h1>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={15} /> Create Fee Structure
              </button>
            </div>
          </div>

          {/* DATE RANGE FILTER ROW */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Calendar size={15} color="var(--text-info)" />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter Fees by Date:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['All Time', 'Last Week', 'Last 30 Days', 'Financial Year'].map(preset => (
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

          {/* 4-KPI STATS GRID */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: '20px' }}>
            {/* KPI 1: TOTAL DESIGN FEES */}
            <div 
              className={`stat clickable ${activeKpiFilter === 'all' ? 'active-kpi-card' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'all' ? null : 'all')}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Design Fees</span>
                <Layers size={15} color="var(--text-info)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpiData.total.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-info)', marginTop: '2px' }}>
                R {kpiData.total.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpiData.total.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpiData.total.out.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* KPI 2: PENDING INVOICES */}
            <div 
              className={`stat clickable ${activeKpiFilter === 'pending' ? 'active-kpi-card' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'pending' ? null : 'pending')}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Invoices</span>
                <Clock size={15} color="var(--text-warning)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpiData.pending.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-warning)', marginTop: '2px' }}>
                R {kpiData.pending.out.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpiData.pending.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpiData.pending.out.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* KPI 3: ACTIVE PROJECT FEES */}
            <div 
              className={`stat clickable ${activeKpiFilter === 'active' ? 'active-kpi-card' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'active' ? null : 'active')}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Active Project Fees</span>
                <Play size={15} color="var(--text-success)" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpiData.active.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-success)', marginTop: '2px' }}>
                R {kpiData.active.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpiData.active.paid.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R {kpiData.active.out.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* KPI 4: COLLECTED FEES */}
            <div 
              className={`stat clickable ${activeKpiFilter === 'collected' ? 'active-kpi-card' : ''}`}
              onClick={() => setActiveKpiFilter(activeKpiFilter === 'collected' ? null : 'collected')}
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Collected Fees</span>
                <CheckCircle size={15} color="var(--text-success)" style={{ stroke: 'var(--text-success)' }} />
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {kpiData.collected.qty} <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Qty</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                R {kpiData.collected.val.toLocaleString()} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>Val</span>
              </div>
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '8px', paddingTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Paid: <strong>R {kpiData.collected.val.toLocaleString()}</strong></span>
                <span>Outstanding: <strong>R 0</strong></span>
              </div>
            </div>
          </div>

          {/* FILTER AND DATA CONTROL BAR */}
          <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-primary)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text"
                    placeholder="Search by quotation ref, client, or fee title..."
                    className="form-control"
                    style={{ paddingLeft: '34px', height: '34px', fontSize: '12.5px' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="form-control"
                  style={{ width: '160px', height: '34px', fontSize: '12.5px' }}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option>All Statuses</option>
                  <option>Concept Phase</option>
                  <option>Detail Design</option>
                  <option>Documentation</option>
                  <option>Completed</option>
                </select>

                <select
                  className="form-control"
                  style={{ width: '200px', height: '34px', fontSize: '12.5px' }}
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                >
                  <option>All Linked Projects</option>
                  {Object.values(projects).map(p => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Showing <strong>{filteredFees.length}</strong> active design fee records
              </div>
            </div>

            {/* LEDGER TABLE */}
            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px' }}>Fee Reference</th>
                    <th>Project Name</th>
                    <th>Client Name</th>
                    <th>Fee Type</th>
                    <th style={{ textAlign: 'right' }}>Fee Value Ex VAT</th>
                    <th style={{ textAlign: 'right' }}>Amount Invoiced</th>
                    <th style={{ textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                    <th style={{ textAlign: 'center' }}>Fee Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map(fee => {
                    const statusStr = fee.feeStatus || fee.status || 'Concept Phase';
                    const valueExVAT = fee.feeValue || 0;
                    const invoiced = fee.amountInvoiced !== undefined ? fee.amountInvoiced : (fee.feeValue || 0);
                    const paid = fee.paid || 0;
                    const outstanding = Math.max(0, invoiced - paid);

                    return (
                      <tr 
                        key={fee.id} 
                        className="clickable"
                        onClick={() => handleOpenWorkspace(fee)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                          {fee.id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{fee.name}</td>
                        <td>{fee.projectClientName}</td>
                        <td>{fee.feeType || 'Fixed Phase'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>R {valueExVAT.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>R {invoiced.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-success)', fontWeight: 500 }}>R {paid.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', color: outstanding > 0 ? 'var(--text-warning)' : 'var(--text-tertiary)', fontWeight: 600 }}>
                          R {outstanding.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${getStatusBadgeClass(statusStr)}`} style={{ minWidth: '95px', textAlign: 'center' }}>
                            {statusStr}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredFees.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                        No active design fee structures match your filter criteria.
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
          {/* DETAIL WORKSPACE ENGINE */}
          {/* TOP BACK BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 18px', marginBottom: '14px' }}>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => { setSelectedFeeId(null); setLocalFee(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}
            >
              <ArrowLeft size={13} /> Back to Ledger
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="badge b-info" style={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Design Fee Tracker Workspace Engine
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status:</span>
                <select
                  className="form-control"
                  style={{ width: '120px', height: '28px', padding: '2px 6px', fontSize: '11.5px' }}
                  value={localFee.feeStatus}
                  onChange={e => handleUpdateRegDetails('feeStatus', e.target.value)}
                >
                  <option>Concept Phase</option>
                  <option>Detail Design</option>
                  <option>Documentation</option>
                  <option>Completed</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Billed:</span>
                <input 
                  type="text" 
                  readOnly
                  className="form-control"
                  style={{ width: '110px', height: '28px', padding: '2px 8px', fontSize: '11.5px', background: 'var(--bg-tertiary)', fontWeight: 600 }}
                  value={`R ${(localFee.amountInvoiced || 0).toLocaleString()}`}
                />
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedFeeId(null); setLocalFee(null); }}>Cancel</button>
              
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSaveAndSyncFee}
                style={{ background: 'var(--text-info)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Save size={13} /> Save & Sync Design Record
              </button>
            </div>
          </div>

          {/* WORKSPACE HEADER TITLE */}
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
            Design Fee Specification — <span style={{ color: 'var(--text-info)', fontFamily: 'monospace' }}>{selectedFeeId}</span>
          </h2>

          {/* PROJECT REGISTRATION DETAILS (MIRROR VIEW) */}
          <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', background: 'var(--bg-secondary)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  /* DESIGN TRACKER MIRROR VIEW */
                </div>
                
                {isEditingRegDetails ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Company</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '30px', fontSize: '11.5px' }}
                        value={localFee.company || ''} 
                        onChange={e => handleUpdateRegDetails('company', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Linked Project</label>
                      <select 
                        className="form-control" 
                        style={{ height: '30px', fontSize: '11.5px' }}
                        value={localFee.projectKey || ''} 
                        onChange={e => handleUpdateRegDetails('projectKey', e.target.value)}
                      >
                        {Object.values(projects).map(p => (
                          <option key={p.key} value={p.key}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Lead Designer</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ height: '30px', fontSize: '11.5px' }}
                        value={localFee.leadDesigner || ''} 
                        onChange={e => handleUpdateRegDetails('leadDesigner', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Fee Type</label>
                      <select 
                        className="form-control" 
                        style={{ height: '30px', fontSize: '11.5px' }}
                        value={localFee.feeType || ''} 
                        onChange={e => handleUpdateRegDetails('feeType', e.target.value)}
                      >
                        <option>Fixed Phase</option>
                        <option>Fixed-Fee (by Phase)</option>
                        <option>Hourly WIP</option>
                        <option>Percentage of BOQ</option>
                        <option>Retainer</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Fee Terms</label>
                      <select 
                        className="form-control" 
                        style={{ height: '30px', fontSize: '11.5px' }}
                        value={localFee.feeTerms || ''} 
                        onChange={e => handleUpdateRegDetails('feeTerms', e.target.value)}
                      >
                        <option>30 days</option>
                        <option>15 days</option>
                        <option>COD</option>
                        <option>Immediate</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12.5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>📋</span> 
                      <strong>Project Registration Details</strong>
                    </div>
                    <div style={{ borderLeft: '1px solid var(--border)', height: '16px' }}></div>
                    <div>Company: <strong>{localFee.company || 'Venter Architects'}</strong></div>
                    <div>Project: <strong>{localFee.projectName || 'Upper Primrose'}</strong></div>
                    <div>Lead Designer: <strong>{localFee.leadDesigner || 'Merlyn'}</strong></div>
                    <div>FEE TYPE: <strong>{localFee.feeType || 'Fixed-Fee (by Phase)'}</strong></div>
                    <div>FEE TERMS: <strong>{localFee.feeTerms || '30 days'}</strong></div>
                  </div>
                )}
              </div>
              
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setIsEditingRegDetails(!isEditingRegDetails)}
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)' }}
              >
                {isEditingRegDetails ? 'Close Editing' : 'Edit Details ▾'}
              </button>
            </div>
          </div>

          {/* MAIN TABS CONTAINER */}
          <div className="card" style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-primary)', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700 }}>
                <FileSpreadsheet size={15} color="var(--text-info)" />
                <span>Fee Breakdown</span>
              </div>

              {/* TAB BUTTONS */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { key: 'breakdown', label: 'Fee Breakdown' },
                  { key: 'time', label: 'Time Tracking' },
                  { key: 'invoicing', label: 'Invoicing' },
                  { key: 'milestones', label: 'Client Milestones' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11.5px', padding: '6px 12px', borderRadius: '6px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB PANELS */}
            {activeTab === 'breakdown' && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      {/* HIGH-LEVEL DOUBLE HEADER ROW */}
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-strong)' }}>
                        <th colSpan={6} style={{ textAlign: 'center', borderRight: '1px solid var(--border-strong)', padding: '6px', fontSize: '10px', letterSpacing: '0.5px', fontWeight: 700 }}>
                          CORE DESIGN SERVICES & DELIVERABLES
                        </th>
                        <th colSpan={7} style={{ textAlign: 'center', padding: '6px', fontSize: '10px', letterSpacing: '0.5px', fontWeight: 700 }}>
                          PROGRESS & BILLING STATUS
                        </th>
                      </tr>
                      {/* SUB-HEADER ROW */}
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ width: '140px', padding: '6px' }}>Phase</th>
                        <th style={{ width: '80px' }}>Service Code</th>
                        <th>Description</th>
                        <th style={{ width: '70px', textAlign: 'right' }}>Est. Hours</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Hourly Rate (Avg)</th>
                        <th style={{ width: '110px', textAlign: 'right', borderRight: '1px solid var(--border-strong)' }}>Phase Fee</th>
                        
                        <th style={{ width: '75px', textAlign: 'right' }}>Act. Hours</th>
                        <th style={{ width: '115px', textAlign: 'right' }}>Total Value (Hrs)</th>
                        <th style={{ width: '115px', textAlign: 'right' }}>Billed Fee</th>
                        <th style={{ width: '115px', textAlign: 'right' }}>Unbilled Fee</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Phase Progress %</th>
                        <th>Next Milestone</th>
                        <th style={{ width: '40px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody onKeyDown={handleSpreadsheetKeyDown} onPaste={handleSpreadsheetPaste}>
                      {localFee.phases.map((p, rIdx) => {
                        const phaseFee = (Number(p.estHours) || 0) * (Number(p.hourlyRate) || 0);
                        const totalValue = (Number(p.actHours) || 0) * (Number(p.hourlyRate) || 0);
                        const unbilled = Math.max(0, phaseFee - (Number(p.billedFee) || 0));

                        return (
                          <tr key={rIdx}>
                            {/* PHASE */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="text"
                                className="gs-cell-input"
                                data-row={rIdx}
                                data-col="phase"
                                value={p.phase || ''}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'phase', e.target.value)}
                              />
                            </td>
                            {/* SERVICE CODE */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="text"
                                className="gs-cell-input"
                                data-row={rIdx}
                                data-col="serviceCode"
                                value={p.serviceCode || ''}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'serviceCode', e.target.value)}
                              />
                            </td>
                            {/* DESCRIPTION */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="text"
                                className="gs-cell-input"
                                data-row={rIdx}
                                data-col="description"
                                value={p.description || ''}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'description', e.target.value)}
                              />
                            </td>
                            {/* EST HOURS */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="number"
                                className="gs-cell-input"
                                style={{ textAlign: 'right' }}
                                data-row={rIdx}
                                data-col="estHours"
                                value={p.estHours === 0 ? '' : p.estHours}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'estHours', Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </td>
                            {/* HOURLY RATE */}
                            <td style={{ padding: 0, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontTarget: 'inherit', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                              <input 
                                type="number"
                                className="gs-cell-input"
                                style={{ textAlign: 'right', paddingLeft: '16px' }}
                                data-row={rIdx}
                                data-col="hourlyRate"
                                value={p.hourlyRate === 0 ? '' : p.hourlyRate}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'hourlyRate', Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </td>
                            {/* PHASE FEE */}
                            <td style={{ textAlign: 'right', fontWeight: 600, borderRight: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '6px 8px' }}>
                              R {phaseFee.toLocaleString()}
                            </td>
                            
                            {/* ACT HOURS */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="number"
                                className="gs-cell-input"
                                style={{ textAlign: 'right' }}
                                data-row={rIdx}
                                data-col="actHours"
                                value={p.actHours === 0 ? '' : p.actHours}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'actHours', Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </td>
                            {/* TOTAL VALUE */}
                            <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                              R {totalValue.toLocaleString()}
                            </td>
                            {/* BILLED FEE */}
                            <td style={{ padding: 0, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontTarget: 'inherit', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>R</span>
                              <input 
                                type="number"
                                className="gs-cell-input"
                                style={{ textAlign: 'right', paddingLeft: '16px' }}
                                data-row={rIdx}
                                data-col="billedFee"
                                value={p.billedFee === 0 ? '' : p.billedFee}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'billedFee', Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </td>
                            {/* UNBILLED FEE */}
                            <td style={{ textAlign: 'right', padding: '6px 8px', color: unbilled > 0 ? 'var(--text-danger)' : 'var(--text-tertiary)', fontWeight: unbilled > 0 ? 600 : 400 }}>
                              R {unbilled.toLocaleString()}
                            </td>
                            {/* PROGRESS BADGE */}
                            <td style={{ padding: 0, textAlign: 'center' }}>
                              <select 
                                className="gs-cell-select"
                                style={{ textAlign: 'center', fontWeight: 600, color: p.progress === 100 ? 'var(--text-success)' : 'var(--text-warning)' }}
                                data-row={rIdx}
                                data-col="progress"
                                value={p.progress || 0}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'progress', parseInt(e.target.value) || 0)}
                              >
                                <option value="0">0%</option>
                                <option value="25">25%</option>
                                <option value="50">50%</option>
                                <option value="80">80%</option>
                                <option value="100">100%</option>
                              </select>
                            </td>
                            {/* NEXT MILESTONE */}
                            <td style={{ padding: 0 }}>
                              <input 
                                type="text"
                                className="gs-cell-input"
                                data-row={rIdx}
                                data-col="nextMilestone"
                                value={p.nextMilestone || ''}
                                onChange={e => handleUpdatePhaseCell(rIdx, 'nextMilestone', e.target.value)}
                              />
                            </td>
                            {/* DELETE ROW BTN */}
                            <td style={{ textAlign: 'center', padding: 0 }}>
                              <button 
                                onClick={() => handleDeletePhaseRow(rIdx)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-danger)', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', margin: '0 auto' }}
                                title="Delete Phase"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* TOTALS FOOTER ROW */}
                      <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600, borderTop: '2.5px solid var(--border-strong)' }}>
                        <td colSpan={3} style={{ padding: '8px 10px' }}>Total Summary Statements</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>{phaseTotals.estHours} hrs</td>
                        <td></td>
                        <td style={{ textAlign: 'right', padding: '8px', borderRight: '1px solid var(--border-strong)' }}>
                          R {phaseTotals.phaseFee.toLocaleString()}
                        </td>
                        
                        <td style={{ textAlign: 'right', padding: '8px' }}>{phaseTotals.actHours} hrs</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>R {phaseTotals.totalValue.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', padding: '8px' }}>R {phaseTotals.billedFee.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', padding: '8px', color: phaseTotals.unbilledFee > 0 ? 'var(--text-danger)' : 'var(--text-primary)' }}>
                          R {phaseTotals.unbilledFee.toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ADD ROW TRIGGER */}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={handleAddPhaseRow}>
                    <Plus size={13} /> Add Deliverable Service Phase
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    💡 Use <strong>Arrow Keys</strong> or <strong>Enter</strong> to navigate. You can <strong>Copy & Paste</strong> rows/cells from Excel.
                  </span>
                </div>
              </>
            )}

            {activeTab === 'time' && (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Clock size={40} color="var(--text-tertiary)" style={{ marginBottom: '12px' }} />
                <h4>Employee Time Sheets Integration Logs</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Weekly timesheets automatically logged by designers matching design service code: <strong>{localFee.phases[0]?.serviceCode}</strong>.
                </p>
                <div style={{ maxWidth: '400px', margin: '20px auto 0', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', textAlign: 'left', background: 'var(--bg-secondary)', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '4px', fontWeight: 600 }}>
                    <span>Designer Name</span>
                    <span>Date logged</span>
                    <span>Hours</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Merlyn V.</span>
                    <span>2026-05-12</span>
                    <span>6.5 hrs</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dani P.</span>
                    <span>2026-05-13</span>
                    <span>4.0 hrs</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoicing' && (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileText size={40} color="var(--text-tertiary)" style={{ marginBottom: '12px' }} />
                <h4>Invoicing Schedules & Payment Receipts</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Outstanding invoices associated with Design Fee Reference <strong>{selectedFeeId}</strong>.
                </p>
                <div style={{ maxWidth: '500px', margin: '20px auto 0', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', textAlign: 'left', background: 'var(--bg-secondary)', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '4px', fontWeight: 600 }}>
                    <span>Invoice Ref</span>
                    <span>Amount</span>
                    <span>Issued</span>
                    <span>Status</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>INV-DF-2026-102</span>
                    <span>R 27,000</span>
                    <span>02 May 2026</span>
                    <span className="badge b-success">Paid</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>INV-DF-2026-144</span>
                    <span>R 15,600</span>
                    <span>12 May 2026</span>
                    <span className="badge b-warning">Awaiting Pay</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'milestones' && (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <BarChart size={40} color="var(--text-tertiary)" style={{ marginBottom: '12px' }} />
                <h4>Client Sign-Offs & Deliverable Milestones</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Documented sign-off history for specific design deliverables.
                </p>
                <div style={{ maxWidth: '450px', margin: '20px auto 0', textAlign: 'left', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-success)', fontWeight: 'bold' }}>✓</span>
                    <span>Phase 1 Space Layout Concept approval signed off by <strong>Sarah Venter</strong> (2026-05-04)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
                    <span style={{ fontWeight: 'bold' }}>○</span>
                    <span>Phase 2 Custom Joinery Detail Drawing Set sign-off (Pending completion)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* CREATE NEW STRUCTURE MODAL */}
      {showCreateModal && (
        <div className="modal-bg active" style={{ display: 'flex' }}>
          <div className="modal" style={{ maxWidth: '520px', padding: '20px' }}>
            <div className="modal-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>📋 Create New Design Fee Structure</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <div className="form-row">
                <label className="form-label">Fee Structure Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Master Residence Design Fee" 
                  className="form-control"
                  value={newFeeName}
                  onChange={e => setNewFeeName(e.target.value)}
                />
              </div>

              <div className="form-row">
                <label className="form-label">Linked Project</label>
                <select 
                  className="form-control"
                  value={newFeeProject}
                  onChange={e => setNewFeeProject(e.target.value)}
                >
                  <option value="">Select a project...</option>
                  {Object.values(projects).map(p => (
                    <option key={p.key} value={p.key}>{p.name} ({p.client})</option>
                  ))}
                </select>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Lead Designer</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={newFeeDesigner}
                    onChange={e => setNewFeeDesigner(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label className="form-label">Fee Type</label>
                  <select 
                    className="form-control"
                    value={newFeeType}
                    onChange={e => setNewFeeType(e.target.value)}
                  >
                    <option>Fixed Phase</option>
                    <option>Fixed-Fee (by Phase)</option>
                    <option>Hourly WIP</option>
                    <option>Percentage of BOQ</option>
                  </select>
                </div>
              </div>

              <div className="row-2">
                <div className="form-row">
                  <label className="form-label">Fee Terms</label>
                  <select 
                    className="form-control"
                    value={newFeeTerms}
                    onChange={e => setNewFeeTerms(e.target.value)}
                  >
                    <option>30 days</option>
                    <option>15 days</option>
                    <option>COD</option>
                    <option>Immediate</option>
                  </select>
                </div>
                <div className="row-2" style={{ gap: '6px' }}>
                  <div>
                    <label className="form-label">SQM</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={newFeeSqm}
                      onChange={e => setNewFeeSqm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Margin %</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={newFeeMargin}
                      onChange={e => setNewFeeMargin(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateNewFeeStructure}>Create Structure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
