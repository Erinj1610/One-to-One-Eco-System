import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { 
  Layout, MessageSquare, FileCheck, Ban, DollarSign, ArrowRightLeft, 
  User, TrendingUp, Filter, Calendar, Settings, AlertCircle, 
  CheckCircle, Plus, Info, Clock, Paperclip, FileText, Download, Send, Briefcase,
  TrendingDown, Sparkles, CheckSquare, Square, Eye, Target, Play
} from 'lucide-react';

const stageColors = { 
  Enquiry: 'b-info', 
  Proposal: 'b-warning', 
  Negotiation: 'b-default', 
  'Signed': 'b-success', 
  Lost: 'b-danger' 
};

const stageBorderColors = {
  Enquiry: 'var(--border-info)',
  Proposal: 'var(--border-warning)',
  Negotiation: 'var(--border)',
  'Signed': 'var(--border-success)',
  Lost: 'var(--border-danger)'
};

const todayStr = '2026-05-18'; // Mocked local current date

export default function PipelinePage({ clientFilter = null, isEmbedded = false }) {
  const { addProject, leads, setLeads, moveLead, updateLead, contacts, setContacts } = useStore();
  const navigate = useNavigate();

  // Date and View Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('All Time');
  const [isForecastView, setIsForecastView] = useState(false);
  const [isNeedsAttention, setIsNeedsAttention] = useState(false);

  // Selected Lead & Modal States
  const [selected, setSelected] = useState(null); // { lead, stage }
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('profile');

  // Gating Modals
  const [lossModalLead, setLossModalLead] = useState(null); // { lead, fromStage }
  const [lossReason, setLossReason] = useState('Price Too High');
  const [lossNotes, setLossNotes] = useState('');

  const [nextActionModal, setNextActionModal] = useState(null); // { lead, oldAction }
  const [newNextAction, setNewNextAction] = useState('');
  const [newNextActionDate, setNewNextActionDate] = useState('');

  // Toast / Automation Alert States
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Target Stage Durations & Inactivity Thresholds (Admin Config)
  const [targetDurations, setTargetDurations] = useState({ Enquiry: 3, Proposal: 7, Negotiation: 10 });
  const [inactivityThreshold, setInactivityThreshold] = useState(5); // default 5 days

  // New Lead Form States (Added Mandatory Next Action Fields)
  const [newLeadForm, setNewLeadForm] = useState({
    title: '',
    client: '',
    designValue: '',
    productValue: '',
    offering: 'Signature',
    owner: 'Dani',
    probability: '50',
    priority: 'High',
    estimateApprovalDate: '2026-06-30',
    nextAction: 'Introduce services portfolio',
    nextActionDate: '2026-05-22'
  });

  // Smart Lookup States
  const [clientSearch, setClientSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContactData, setNewContactData] = useState({
    company: '',
    type: 'Architect',
    email: '',
    phone: ''
  });

  // Automation Rules State
  const [automations, setAutomations] = useState([
    { id: 1, trigger: 'doc_uploaded', action_stage: 'Proposal', enabled: true, name: "Move to 'Proposal' when doc is uploaded" },
    { id: 2, trigger: 'note_added', action_stage: 'Negotiation', enabled: true, name: "Move to 'Negotiation' when note is added" },
    { id: 3, trigger: 'prob_high', action_stage: 'Negotiation', enabled: false, name: "Move to 'Negotiation' when Prob is >= 80%" }
  ]);
  const [showAutomationsPanel, setShowAutomationsPanel] = useState(false);
  const [newRuleTrigger, setNewRuleTrigger] = useState('doc_uploaded');
  const [newRuleAction, setNewRuleAction] = useState('Proposal');

  // Modal Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Notes & Docs states in modal
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedMockFile, setSelectedMockFile] = useState('Client_Brief_V2.pdf');

  // helper to trigger Toast
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4500);
  };

  // Helper date utility
  const getDaysBetween = (d1, d2) => {
    if (!d1 || !d2) return 0;
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2)) return 0;
    const diff = Math.abs(t2 - t1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Stagnation & Activity Nudge checks
  const getStageSittingDays = (lead, currentStage) => {
    const enterDate = lead.stageHistory?.[currentStage] || lead.createdDate;
    return getDaysBetween(enterDate, todayStr);
  };

  const isStagnant = (lead, currentStage) => {
    const limit = targetDurations[currentStage];
    if (!limit) return false;
    return getStageSittingDays(lead, currentStage) > limit;
  };

  const getDaysSinceLastActivity = (lead) => {
    if (!lead.activities || lead.activities.length === 0) return 0;
    // parse date part from timelines: "15 May 2026 10:30" -> "15 May 2026"
    const lastAct = lead.activities[lead.activities.length - 1];
    const parts = lastAct.date.split(' ');
    let dateStr = parts.slice(0, 3).join(' ');
    // If it has YYYY-MM-DD
    if (lastAct.date.includes('-') && !lastAct.date.includes(' ')) {
      dateStr = lastAct.date;
    }
    return getDaysBetween(dateStr, todayStr);
  };

  const needsNudge = (lead) => {
    return getDaysSinceLastActivity(lead) >= inactivityThreshold;
  };

  // Apply Date Presets
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

  // Date Filtering Logic
  const isDateInRange = (createdDate) => {
    if (!startDate && !endDate) return true;
    if (!createdDate) return false;
    const leadDate = new Date(createdDate);
    if (startDate) {
      const start = new Date(startDate);
      if (leadDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (leadDate > end) return false;
    }
    return true;
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    const res = {};
    Object.keys(leads).forEach(stage => {
      let stageList = leads[stage] || [];
      // Filter by Client
      if (clientFilter) {
        stageList = stageList.filter(l => l.client === clientFilter);
      }
      // Filter by Date
      stageList = stageList.filter(l => isDateInRange(l.createdDate));
      // Filter by Needs Attention
      if (isNeedsAttention) {
        stageList = stageList.filter(l => l.nextActionDate && l.nextActionDate <= todayStr);
      }
      res[stage] = stageList;
    });
    return res;
  }, [leads, startDate, endDate, isNeedsAttention, clientFilter, isDateInRange]);

  const stages = ['Enquiry', 'Proposal', 'Negotiation', 'Signed', 'Lost'];

  // Lead Score (Rank) Calculation
  const getLeadRank = (prob, priority) => {
    const pVal = Number(prob) || 0;
    const score = pVal * (priority === 'High' ? 1.0 : 0.6);
    if (score >= 75) return { grade: 'A', color: 'b-success' };
    if (score >= 40) return { grade: 'B', color: 'b-warning' };
    return { grade: 'C', color: 'b-danger' };
  };

  // Weighted Value Calculation for individual leads
  const getWeightedValue = (lead) => {
    const total = (lead.designValue || 0) + (lead.productValue || 0);
    const prob = (lead.probability || 0) / 100;
    return Math.round(total * prob);
  };

  // Automation Engine Trigger Listener
  const checkAutomations = (lead, triggerType, customData = null) => {
    const activeRules = automations.filter(a => a.enabled && a.trigger === triggerType);
    for (const rule of activeRules) {
      let isMatch = false;
      if (triggerType === 'doc_uploaded') {
        isMatch = true;
      } else if (triggerType === 'note_added') {
        isMatch = true;
      } else if (triggerType === 'prob_high') {
        const prob = Number(customData) || 0;
        if (prob >= 80) isMatch = true;
      }

      if (isMatch && lead.stage !== rule.action_stage) {
        const oldStage = lead.stage;
        moveLead(lead.id, oldStage, rule.action_stage);
        
        const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
        const autoLog = {
          id: Date.now() + Math.random(),
          text: `🤖 Automation: Moved stage from '${oldStage}' to '${rule.action_stage}' due to rule: "${rule.name}"`,
          date: timestamp
        };

        if (selected && selected.lead.id === lead.id) {
          setSelected(prev => ({
            ...prev,
            stage: rule.action_stage,
            lead: {
              ...prev.lead,
              stage: rule.action_stage,
              activities: [...(prev.lead.activities || []), autoLog]
            }
          }));
        }

        triggerToast(`🤖 Automation fired: Moved lead '${lead.title}' to '${rule.action_stage}'!`);
        break;
      }
    }
  };

  // KPIs Calculations (Forecasting & Weight updates merged)
  const stats = useMemo(() => {
    const enquiryList = filteredLeads.Enquiry || [];
    const proposalList = filteredLeads.Proposal || [];
    const signedList = filteredLeads.Signed || [];
    const lostList = filteredLeads.Lost || [];
    const negList = filteredLeads.Negotiation || [];

    // Enquiry Age calculation
    let avgEnquiryAge = 0;
    if (enquiryList.length > 0) {
      const sumAge = enquiryList.reduce((sum, l) => sum + getDaysBetween(l.createdDate, todayStr), 0);
      avgEnquiryAge = (sumAge / enquiryList.length).toFixed(1);
    }

    // Conversion rate
    const proposalLifecycleCount = proposalList.length + negList.length + signedList.length + lostList.length;
    const conversionRate = proposalLifecycleCount > 0 
      ? ((signedList.length / proposalLifecycleCount) * 100).toFixed(1) 
      : '0.0';

    // Won KPIs
    const totalWonDesign = signedList.reduce((s, l) => s + (l.designValue || 0), 0);
    const totalWonProduct = signedList.reduce((s, l) => s + (l.productValue || 0), 0);
    const totalWonValue = totalWonDesign + totalWonProduct;
    const avgDealSize = signedList.length > 0 ? (totalWonValue / signedList.length) : 0;

    // Lost KPIs
    const totalLostDesign = lostList.reduce((s, l) => s + (l.designValue || 0), 0);
    const totalLostProduct = lostList.reduce((s, l) => s + (l.productValue || 0), 0);
    const totalLostValue = totalLostDesign + totalLostProduct;

    // Win/Loss Ratio
    const winLossRatio = lostList.length > 0 
      ? (signedList.length / lostList.length).toFixed(1) 
      : signedList.length > 0 ? `${signedList.length}x` : '1.0';

    // Active Pipeline (Enquiry, Proposal, Negotiation)
    const activePipelineList = [...enquiryList, ...proposalList, ...negList];
    const pipelineDesign = activePipelineList.reduce((s, l) => s + (l.designValue || 0), 0);
    const pipelineProduct = activePipelineList.reduce((s, l) => s + (l.productValue || 0), 0);
    const pipelineTotal = pipelineDesign + pipelineProduct;

    // Weighted Pipeline Value Calculation (Section 1)
    const pipelineWeighted = activePipelineList.reduce((s, l) => s + getWeightedValue(l), 0);

    return {
      enquiries: {
        qty: enquiryList.length,
        design: enquiryList.reduce((s, l) => s + (l.designValue || 0), 0),
        product: enquiryList.reduce((s, l) => s + (l.productValue || 0), 0),
        avgAge: avgEnquiryAge
      },
      proposals: {
        qty: proposalList.length,
        design: proposalList.reduce((s, l) => s + (l.designValue || 0), 0),
        product: proposalList.reduce((s, l) => s + (l.productValue || 0), 0),
        conversion: conversionRate
      },
      won: {
        qty: signedList.length,
        design: totalWonDesign,
        product: totalWonProduct,
        total: totalWonValue,
        avgSize: avgDealSize
      },
      lost: {
        qty: lostList.length,
        design: totalLostDesign,
        product: totalLostProduct,
        total: totalLostValue,
        ratio: winLossRatio
      },
      pipeline: {
        qty: activePipelineList.length,
        design: pipelineDesign,
        product: pipelineProduct,
        total: pipelineTotal,
        weighted: pipelineWeighted
      }
    };
  }, [filteredLeads]);

  // Forecast View Grouping (Monthly Buckets, Section 1)
  const forecastMonthlyColumns = useMemo(() => {
    // Only forecast active pipeline deals
    const activeLeads = [
      ...(filteredLeads.Enquiry || []),
      ...(filteredLeads.Proposal || []),
      ...(filteredLeads.Negotiation || [])
    ];

    const monthlyMap = {};

    activeLeads.forEach(lead => {
      let dateKey = 'TBD';
      if (lead.estimateApprovalDate) {
        // "2026-06-15" -> "June 2026"
        const d = new Date(lead.estimateApprovalDate);
        if (!isNaN(d.getTime())) {
          const monthName = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          dateKey = monthName;
        }
      }
      if (!monthlyMap[dateKey]) {
        monthlyMap[dateKey] = [];
      }
      monthlyMap[dateKey].push(lead);
    });

    // Sort months chronologically
    const sortedKeys = Object.keys(monthlyMap).sort((a, b) => {
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedKeys.map(key => ({
      month: key,
      leads: monthlyMap[key],
      weightedTotal: monthlyMap[key].reduce((s, l) => s + getWeightedValue(l), 0)
    }));
  }, [filteredLeads]);

  // Lead Conversion to Project
  const convertToProject = (lead) => {
    addProject({
      name: lead.title,
      client: lead.client,
      offering: lead.offering,
      pm: lead.owner || 'Dani',
      sqm: '—',
      feeValue: lead.value,
      feeExcl: `R ${lead.value.toLocaleString()}`,
    });
    setLeads(prev => ({
      ...prev,
      'Signed': prev['Signed'].filter(l => l.id !== lead.id)
    }));
    setSelected(null);
    triggerToast(`🚀 '${lead.title}' successfully converted into active project!`);
    navigate('/tracker');
  };

  // Create Lead
  const handleCreateLead = () => {
    if (!newLeadForm.title || !newLeadForm.client) {
      triggerToast('⚠️ Project Title and Client Name are required.');
      return;
    }
    if (!newLeadForm.nextAction || !newLeadForm.nextActionDate) {
      triggerToast('⚠️ Mandatory fields missing: Next Action & Date must be defined.');
      return;
    }

    const designVal = Number(newLeadForm.designValue) || 0;
    const productVal = Number(newLeadForm.productValue) || 0;
    const totalVal = designVal + productVal;

    let finalClientName = newLeadForm.client;

    if (showNewContactForm) {
      const newContact = {
        id: Date.now(),
        name: newLeadForm.client,
        company: newContactData.company || 'Private Client',
        type: newContactData.type,
        email: newContactData.email || '',
        phone: newContactData.phone || '',
        projects: 1,
        status: 'Active'
      };
      setContacts(prev => [...prev, newContact]);
      triggerToast(`👤 New client '${newLeadForm.client}' created on the fly!`);
    }

    const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    
    const leadObject = {
      id: Date.now(),
      title: newLeadForm.title,
      client: finalClientName,
      designValue: designVal,
      productValue: productVal,
      value: totalVal,
      offering: newLeadForm.offering,
      owner: newLeadForm.owner,
      probability: Number(newLeadForm.probability) || 50,
      priority: newLeadForm.priority,
      createdDate: todayStr,
      estimateApprovalDate: newLeadForm.estimateApprovalDate,
      nextAction: newLeadForm.nextAction,
      nextActionDate: newLeadForm.nextActionDate,
      stageHistory: { Enquiry: todayStr },
      notes: [],
      activities: [
        { id: 1, text: `Lead initiated by PM ${newLeadForm.owner}`, date: timestamp },
        { id: 2, text: `Next Action scheduled: "${newLeadForm.nextAction}"`, date: timestamp }
      ],
      documents: []
    };

    setLeads(prev => ({
      ...prev,
      Enquiry: [...(prev.Enquiry || []), leadObject]
    }));

    setNewLeadForm({
      title: '',
      client: '',
      designValue: '',
      productValue: '',
      offering: 'Signature',
      owner: 'Dani',
      probability: '50',
      priority: 'High',
      estimateApprovalDate: '2026-06-30',
      nextAction: 'Introduce services portfolio',
      nextActionDate: '2026-05-22'
    });
    setClientSearch('');
    setShowContactDropdown(false);
    setShowNewContactForm(false);
    setNewContactData({ company: '', type: 'Architect', email: '', phone: '' });
    setShowCreateModal(false);

    triggerToast(`🎉 Lead '${leadObject.title}' created successfully under Enquiry!`);
  };

  // Lookup Filtering
  const filteredContactsLookup = useMemo(() => {
    if (!clientSearch) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [contacts, clientSearch]);

  // Edit details inside modal
  const handleSaveEdit = () => {
    const design = Number(editForm.designValue) || 0;
    const product = Number(editForm.productValue) || 0;
    const total = design + product;
    
    const updated = {
      ...editForm,
      designValue: design,
      productValue: product,
      value: total,
      probability: Number(editForm.probability) || 0
    };

    updateLead(selected.lead.id, selected.stage, updated);
    
    const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    const editLog = {
      id: Date.now() + Math.random(),
      text: 'Lead details modified by user',
      date: timestamp
    };

    setSelected(prev => ({
      ...prev,
      lead: {
        ...prev.lead,
        ...updated,
        activities: [...(prev.lead.activities || []), editLog]
      }
    }));
    
    setIsEditing(false);
    triggerToast('💾 Changes saved successfully!');

    if (updated.probability >= 80) {
      checkAutomations(updated, 'prob_high', updated.probability);
    }
  };

  // Add internal note in Modal Notes Tab
  const handleAddNote = () => {
    if (!newNoteText.trim()) return;

    const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    const noteObj = {
      id: Date.now(),
      author: selected.lead.owner || 'Alex',
      text: newNoteText,
      date: timestamp
    };

    const activityObj = {
      id: Date.now() + Math.random(),
      text: `Note added by ${noteObj.author}: "${noteObj.text.slice(0, 30)}..."`,
      date: timestamp
    };

    const updatedNotes = [...(selected.lead.notes || []), noteObj];
    const updatedActivities = [...(selected.lead.activities || []), activityObj];

    updateLead(selected.lead.id, selected.stage, {
      notes: updatedNotes,
      activities: updatedActivities
    });

    setSelected(prev => ({
      ...prev,
      lead: {
        ...prev.lead,
        notes: updatedNotes,
        activities: updatedActivities
      }
    }));

    setNewNoteText('');
    triggerToast('📝 Internal note logged!');

    const updatedLead = { ...selected.lead, notes: updatedNotes, stage: selected.stage };
    checkAutomations(updatedLead, 'note_added');
  };

  // Upload mock document inside modal Documents Tab
  const handleUploadDoc = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const docObj = {
      id: Date.now(),
      name: selectedMockFile,
      size: '2.1 MB',
      date: timestamp
    };

    const timeStr = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const formattedTimestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${timeStr}`;
    
    const activityObj = {
      id: Date.now() + Math.random(),
      text: `Document uploaded: "${docObj.name}" (${docObj.size})`,
      date: formattedTimestamp
    };

    const updatedDocs = [...(selected.lead.documents || []), docObj];
    const updatedActivities = [...(selected.lead.activities || []), activityObj];

    updateLead(selected.lead.id, selected.stage, {
      documents: updatedDocs,
      activities: updatedActivities
    });

    setSelected(prev => ({
      ...prev,
      lead: {
        ...prev.lead,
        documents: updatedDocs,
        activities: updatedActivities
      }
    }));

    triggerToast(`📎 Document '${docObj.name}' uploaded!`);

    const updatedLead = { ...selected.lead, documents: updatedDocs, stage: selected.stage };
    checkAutomations(updatedLead, 'doc_uploaded');
  };

  // Gating Interceptors for moves
  const interceptMove = (lead, fromStage, toStage) => {
    if (toStage === 'Lost') {
      // Trigger mandatory loss modal (Section 2)
      setLossModalLead({ lead, fromStage });
      setLossReason('Price Too High');
      setLossNotes('');
    } else {
      moveLead(lead.id, fromStage, toStage);
      triggerToast(`Moved '${lead.title}' from ${fromStage} to ${toStage}`);
    }
  };

  // Confirm Deal Loss (Section 2)
  const handleConfirmLoss = () => {
    if (!lossModalLead) return;
    const { lead, fromStage } = lossModalLead;
    const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    
    const lossActivity = {
      id: Date.now() + Math.random(),
      text: `Deal closed lost. Reason: ${lossReason}. Detail: "${lossNotes || 'None'}"`,
      date: timestamp
    };

    // Update details and relocate
    updateLead(lead.id, fromStage, { 
      lossReason, 
      lossNotes,
      activities: [...(lead.activities || []), lossActivity]
    });
    
    moveLead(lead.id, fromStage, 'Lost');
    
    if (selected && selected.lead.id === lead.id) {
      setSelected(prev => ({
        ...prev,
        stage: 'Lost',
        lead: {
          ...prev.lead,
          lossReason,
          lossNotes,
          activities: [...(prev.lead.activities || []), lossActivity]
        }
      }));
    }

    setLossModalLead(null);
    triggerToast(`💔 Lead '${lead.title}' closed lost due to: ${lossReason}`);
  };

  // Checking off next action box (Section 3 mandatory prompt)
  const handleCompleteNextActionClick = (lead, stage) => {
    setNextActionModal({ lead, stage, oldAction: lead.nextAction });
    setNewNextAction('');
    setNewNextActionDate('');
  };

  // Update Mandatory Next Action (Section 3)
  const handleUpdateNextAction = () => {
    if (!newNextAction || !newNextActionDate) {
      triggerToast('⚠️ Next Action and Date are mandatory parameters.');
      return;
    }

    const { lead, stage, oldAction } = nextActionModal;
    const timestamp = `${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    
    const actionActivity = {
      id: Date.now() + Math.random(),
      text: `Task completed: "${oldAction}". New Next Action set: "${newNextAction}" (Due: ${newNextActionDate})`,
      date: timestamp
    };

    const updatedLeadFields = {
      nextAction: newNextAction,
      nextActionDate: newNextActionDate,
      activities: [...(lead.activities || []), actionActivity]
    };

    updateLead(lead.id, stage, updatedLeadFields);

    if (selected && selected.lead.id === lead.id) {
      setSelected(prev => ({
        ...prev,
        lead: {
          ...prev.lead,
          ...updatedLeadFields
        }
      }));
    }

    setNextActionModal(null);
    triggerToast(`🎯 Next action scheduled for PM: "${newNextAction}"`);
  };

  // HTML5 Drag Handlers
  const handleDragStart = (e, leadId, fromStage) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ leadId, fromStage }));
  };

  const handleDrop = (e, toStage) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { leadId, fromStage } = data;
      if (fromStage !== toStage) {
        const leadObj = leads[fromStage]?.find(l => l.id === leadId);
        if (leadObj) {
          interceptMove(leadObj, fromStage, toStage);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickMove = (lead, fromStage, toStage) => {
    interceptMove(lead, fromStage, toStage);
  };

  // Custom rules manager rule addition
  const handleAddAutomationRule = () => {
    const triggerNames = {
      doc_uploaded: "Document Uploaded",
      note_added: "Note Added",
      prob_high: "Probability >= 80%"
    };
    const newRule = {
      id: Date.now(),
      trigger: newRuleTrigger,
      action_stage: newRuleAction,
      enabled: true,
      name: `Move to '${newRuleAction}' when ${triggerNames[newRuleTrigger]}`
    };
    setAutomations(prev => [...prev, newRule]);
    triggerToast(`🤖 Custom automation rule created!`);
  };

  return (
    <div className="animation-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Alert */}
      <div className={`toast ${showToast ? 'show' : ''}`} style={{ background: '#1e293b', borderLeft: '4px solid var(--text-info)', zIndex: 9999 }}>
        <Info size={16} color="var(--text-info)" />
        <span style={{ fontSize: '12px' }}>{toastMsg}</span>
      </div>

      {/* Title & Filter Bar Header — hidden when embedded in CRM */}
      {!isEmbedded && (
        <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)' }}>
          <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="av-md" style={{ background: 'var(--bg-info)', color: 'var(--text-info)' }}>
                <Layout size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Sales Pipeline (CRM Coach)</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Weighted forecasts, Visual decay, Action gates, and PM notifications.</div>
              </div>
            </div>

            {/* Date presets & Toggle buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* View Toggles (Forecast & Needs Attention filters) */}
              <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid var(--border)', paddingRight: '8px' }}>
                <button 
                  className={`btn btn-sm ${isForecastView ? 'btn-primary' : 'btn-ghost'}`} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: isForecastView ? 'var(--text-info)' : 'none',
                    color: isForecastView ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setIsForecastView(!isForecastView)}
                >
                  <Eye size={12} /> View Forecast
                </button>
                
                <button 
                  className={`btn btn-sm ${isNeedsAttention ? 'btn-danger' : 'btn-ghost'}`} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: isNeedsAttention ? 'var(--text-danger)' : 'none',
                    color: isNeedsAttention ? 'white' : 'var(--text-secondary)'
                  }}
                  onClick={() => setIsNeedsAttention(!isNeedsAttention)}
                >
                  <Target size={12} /> Needs Attention
                </button>
              </div>

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
      )}

      {/* SECTION 1 & 2: Advanced KPI Cards — hidden when embedded in CRM */}
      {!isEmbedded && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '18px' }}>
        
        {/* KPI 1: Active Enquiries */}
        <div className="stat" style={{ borderLeft: '3.5px solid var(--text-info)', background: 'var(--bg-primary)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Enquiries</span>
            <MessageSquare size={14} color="var(--text-info)" />
          </div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{stats.enquiries.qty} Enquiries</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
            <span>Design: <strong>R {(stats.enquiries.design / 1000).toFixed(0)}k</strong></span>
            <span>Product: <strong>R {(stats.enquiries.product / 1000).toFixed(0)}k</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} /> Avg. Age: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stats.enquiries.avgAge} Days</span>
          </div>
        </div>

        {/* KPI 2: Proposals Sent */}
        <div className="stat" style={{ borderLeft: '3.5px solid var(--text-warning)', background: 'var(--bg-primary)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-warning)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proposals Sent</span>
            <FileCheck size={14} color="var(--text-warning)" />
          </div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{stats.proposals.qty} Sent</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
            <span>Design: <strong>R {(stats.proposals.design / 1000).toFixed(0)}k</strong></span>
            <span>Product: <strong>R {(stats.proposals.product / 1000).toFixed(0)}k</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={11} /> Conv. Rate: <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>{stats.proposals.conversion}%</span>
          </div>
        </div>

        {/* KPI 3: Proposals Won */}
        <div className="stat" style={{ borderLeft: '3.5px solid var(--text-success)', background: 'var(--bg-primary)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proposals Won</span>
            <CheckCircle size={14} color="var(--text-success)" />
          </div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{stats.won.qty} Converted</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
            <span>Design: <strong>R {(stats.won.design / 1000).toFixed(0)}k</strong></span>
            <span>Product: <strong>R {(stats.won.product / 1000).toFixed(0)}k</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', flexDirection: 'column' }}>
            <div>Avg. Size: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>R {(stats.won.avgSize / 1000).toFixed(0)}k</span></div>
            <div>Won Value: <span style={{ color: 'var(--text-success)', fontWeight: 600 }}>R {(stats.won.total / 1000).toFixed(0)}k</span></div>
          </div>
        </div>

        {/* KPI 4: Proposals Lost */}
        <div className="stat" style={{ borderLeft: '3.5px solid var(--text-danger)', background: 'var(--bg-primary)', border: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-danger)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proposals Lost</span>
            <Ban size={14} color="var(--text-danger)" />
          </div>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>{stats.lost.qty} Closed Lost</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
            <span>Design: <strong>R {(stats.lost.design / 1000).toFixed(0)}k</strong></span>
            <span>Product: <strong>R {(stats.lost.product / 1000).toFixed(0)}k</strong></span>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={11} /> Win/Loss: <span style={{ color: 'var(--text-danger)', fontWeight: 600 }}>{stats.lost.ratio}</span>
          </div>
        </div>

        {/* KPI 5: Total Pipeline Card Update (Prominent Weighted Display, Section 1) */}
        <div className="stat" style={{ borderLeft: '3.5px solid var(--text-secondary)', background: '#f8fafc', border: '1px solid var(--border-info)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-info)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} color="var(--text-info)" /> Weighted Forecast
            </span>
            <DollarSign size={14} color="var(--text-info)" />
          </div>
          
          {/* Prominent display of weighted value */}
          <div className="stat-value" style={{ fontSize: '17.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
            R {stats.pipeline.weighted?.toLocaleString()}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column' }}>
            <span>Raw Pipeline: <strong style={{ color: 'var(--text-secondary)' }}>R {stats.pipeline.total?.toLocaleString()}</strong></span>
            <span>Active Deals count: <strong>{stats.pipeline.qty} Leads</strong></span>
          </div>
          
          <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '0.5px solid var(--border)', fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Weighted = Pipeline Value × Prob %
          </div>
        </div>
      </div>
      )}

      {/* Button & Automations Control Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        {!isEmbedded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className={`btn btn-sm ${showAutomationsPanel ? 'btn-primary' : 'btn-ghost'}`} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowAutomationsPanel(!showAutomationsPanel)}
            >
              <Settings size={13} /> Admin settings & Durations limits
            </button>
          </div>
        )}
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> + New Lead (Coaching Gated)
        </button>
      </div>

      {/* ADMIN CONFIGURATION & AUTOMATION RULES PANEL — hidden when embedded */}
      {!isEmbedded && showAutomationsPanel && (
        <div className="card animation-fade-in" style={{ marginBottom: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-info)' }}>
          <div className="card-head" style={{ padding: '10px 16px' }}>
            <div className="card-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={14} /> Admin Stage Target Limits & Automations Manager
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAutomationsPanel(false)}>✕</button>
          </div>
          <div className="card-body" style={{ padding: '16px', display: 'flex', gap: '20px', flexDirection: 'column' }}>
            
            {/* Target durations limit settings (Section 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              
              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Enquiry Column Max Days</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="range" min="1" max="15" className="form-control" style={{ padding: 0 }}
                    value={targetDurations.Enquiry}
                    onChange={e => setTargetDurations(prev => ({ ...prev, Enquiry: Number(e.target.value) }))}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{targetDurations.Enquiry}d</span>
                </div>
              </div>

              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Proposal Column Max Days</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="range" min="1" max="30" className="form-control" style={{ padding: 0 }}
                    value={targetDurations.Proposal}
                    onChange={e => setTargetDurations(prev => ({ ...prev, Proposal: Number(e.target.value) }))}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{targetDurations.Proposal}d</span>
                </div>
              </div>

              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Negotiation Column Max Days</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="range" min="1" max="30" className="form-control" style={{ padding: 0 }}
                    value={targetDurations.Negotiation}
                    onChange={e => setTargetDurations(prev => ({ ...prev, Negotiation: Number(e.target.value) }))}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{targetDurations.Negotiation}d</span>
                </div>
              </div>

              <div style={{ background: 'white', padding: '10px 14px', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>PM Inactivity Nudge Alert Days</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="range" min="1" max="15" className="form-control" style={{ padding: 0 }}
                    value={inactivityThreshold}
                    onChange={e => setInactivityThreshold(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-info)' }}>{inactivityThreshold}d</span>
                </div>
              </div>

            </div>

            {/* List of Rules */}
            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px' }}>
              <div className="section-label" style={{ marginBottom: '8px' }}>Active Automation Rules</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {automations.map(rule => (
                  <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${rule.enabled ? 'b-success' : 'b-default'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', padding: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: 500 }}>{rule.name}</span>
                    </div>
                    <button 
                      className={`btn btn-sm ${rule.enabled ? 'btn-danger' : 'btn-ghost'}`} 
                      style={{ padding: '2px 8px', fontSize: '9px', border: 'none' }}
                      onClick={() => setAutomations(prev => prev.map(a => a.id === rule.id ? { ...a, enabled: !a.enabled } : a))}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Rule Builder */}
            <div style={{ paddingTop: '12px', borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Create Custom Rule:</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>IF Event is:</span>
                <select 
                  className="form-control" 
                  style={{ width: '180px', padding: '4px 8px', fontSize: '11px' }}
                  value={newRuleTrigger}
                  onChange={e => setNewRuleTrigger(e.target.value)}
                >
                  <option value="doc_uploaded">Document Uploaded</option>
                  <option value="note_added">Note Added</option>
                  <option value="prob_high">Probability set to &gt;= 80%</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>THEN move status to:</span>
                <select 
                  className="form-control" 
                  style={{ width: '130px', padding: '4px 8px', fontSize: '11px' }}
                  value={newRuleAction}
                  onChange={e => setNewRuleAction(e.target.value)}
                >
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button className="btn btn-primary btn-sm" onClick={handleAddAutomationRule}>
                + Add Rule
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SWAPPABLE KANBAN BOARD OR FORECAST VIEW */}
      {isForecastView ? (
        
        /* FORECAST VIEW MONTHLY GRID swap (Section 1) */
        <div className="pipeline animation-fade-in" style={{ flex: 1, overflowX: 'auto', paddingBottom: '20px' }}>
          {forecastMonthlyColumns.map(col => (
            <div 
              className="pipe-col" 
              key={col.month} 
              style={{ minWidth: '300px', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px' }}
            >
              {/* Monthly Forecast Header Card */}
              <div 
                className="pipe-head" 
                style={{ 
                  padding: '8px 10px', 
                  background: '#f8fafc', 
                  border: '1.5px solid var(--border-info)',
                  borderTop: `4px solid var(--text-info)`,
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>{col.month}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Weighted Total:</span>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-info)' }}>R {col.weightedTotal?.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'right', marginTop: '2px' }}>
                  {col.leads.length} Active Deals
                </div>
              </div>

              {/* Monthly Column Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '380px' }}>
                {col.leads.map(lead => {
                  const stagnantCheck = isStagnant(lead, lead.stage);
                  
                  return (
                    <div 
                      className="pipe-card" 
                      key={lead.id} 
                      onClick={() => { setSelected({ lead, stage: lead.stage }); setIsEditing(false); setActiveModalTab('profile'); }}
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: stagnantCheck ? '1.5px solid var(--border-danger)' : '0.5px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.01)',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {stagnantCheck && (
                        <div style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Clock size={12} /> <span style={{ fontSize: '9px', fontWeight: 700 }}>STAGNANT</span>
                        </div>
                      )}

                      <div className="pipe-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word', maxWidth: stagnantCheck ? '170px' : '100%', marginBottom: '4px' }}>
                        {lead.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <User size={11} /> <strong>{lead.client}</strong>
                      </div>

                      {/* Forecast details values */}
                      <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '4px', border: '0.5px solid var(--border)', fontSize: '11px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Probability:</span>
                          <strong>{lead.probability}% ({lead.priority})</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-info)', fontWeight: 600, marginTop: '2px' }}>
                          <span>Weighted:</span>
                          <strong>R {getWeightedValue(lead)?.toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>
                          <span>Raw Contract:</span>
                          <span>R {lead.value?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Next Action Driver (Due May) */}
                      {lead.nextAction && (
                        <div style={{ fontSize: '10px', borderTop: '0.5px solid var(--border)', paddingTop: '6px', color: lead.nextActionDate <= todayStr ? 'var(--text-danger)' : 'var(--text-secondary)', fontWeight: 500 }}>
                          🎯 <strong>Next Action:</strong> "{lead.nextAction}" 
                          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>Due: {lead.nextActionDate}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {forecastMonthlyColumns.length === 0 && (
            <div style={{ flex: 1, textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No active pipeline leads mapped to forecasted approval dates.
            </div>
          )}
        </div>

      ) : (

        /* STANDARD KANBAN BOARD VIEW */
        <div className="pipeline" style={{ flex: 1, overflowX: 'auto', paddingBottom: '20px' }}>
          {stages.map(stage => {
            const colLeads = filteredLeads[stage] || [];
            return (
              <div 
                className="pipe-col" 
                key={stage} 
                style={{ minWidth: '295px', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, stage)}
              >
                <div 
                  className="pipe-head" 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 10px', 
                    background: 'var(--bg-primary)', 
                    border: '0.5px solid var(--border)',
                    borderTop: `3.5px solid ${stageBorderColors[stage]}`,
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px',
                    marginBottom: '10px'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{stage}</span>
                  <span className={`badge ${stageColors[stage]}`} style={{ fontWeight: 600 }}>{colLeads.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '380px' }}>
                  {colLeads.map(lead => {
                    const rankInfo = getLeadRank(lead.probability, lead.priority);
                    
                    // Stagnant (decay) check (Section 2)
                    const stagnantCheck = isStagnant(lead, stage);
                    const sittingDays = getStageSittingDays(lead, stage);
                    const maxAllowedDays = targetDurations[stage] || '—';

                    // Inactivity nudge alert (Section 3)
                    const coachNudgeCheck = needsNudge(lead) && stage !== 'Signed' && stage !== 'Lost';
                    const daysInactive = getDaysSinceLastActivity(lead);

                    return (
                      <div 
                        className="pipe-card" 
                        key={lead.id} 
                        draggable="true"
                        onDragStart={e => handleDragStart(e, lead.id, stage)}
                        onClick={() => { setSelected({ lead, stage }); setIsEditing(false); setActiveModalTab('profile'); }}
                        style={{ 
                          background: 'var(--bg-primary)', 
                          border: stagnantCheck ? '1.5px solid var(--border-danger)' : '0.5px solid var(--border)',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.01)',
                          cursor: 'grab',
                          position: 'relative'
                        }}
                      >
                        {/* Stagnant decay visual alert indicator */}
                        {stagnantCheck && (
                          <div 
                            title={`⚠️ Stagnant: Sitting in stage for ${sittingDays} days (Target limit: ${maxAllowedDays} days)`}
                            style={{ 
                              position: 'absolute', 
                              right: '8px', 
                              top: '8px', 
                              color: 'var(--text-danger)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px', 
                              background: '#fee2e2', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              border: '0.5px solid #fca5a5'
                            }}
                          >
                            <Clock size={11} /> <span style={{ fontSize: '9px', fontWeight: 700 }}>STALLING</span>
                          </div>
                        )}

                        {/* Top Row: Title and Rank Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div className="pipe-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word', maxWidth: stagnantCheck ? '150px' : '170px' }}>
                            {lead.title}
                          </div>
                          {!stagnantCheck && (
                            <span className={`badge ${rankInfo.color}`} style={{ fontSize: '9px', padding: '2px 6px', fontWeight: 600 }}>
                              Grade {rankInfo.grade}
                            </span>
                          )}
                        </div>

                        {/* Client name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <User size={12} color="var(--text-tertiary)" /> 
                          <span style={{ fontWeight: 500 }}>{lead.client}</span>
                        </div>

                        {/* Coach inactivity nudge prompt banner (Section 3) */}
                        {coachNudgeCheck && (
                          <div style={{ background: '#fffbeb', border: '0.5px solid var(--border-warning)', borderRadius: '4px', padding: '4px 6px', fontSize: '9.5px', color: '#b45309', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <AlertCircle size={11} /> <span>PM Nudge: Inactive for {daysInactive} days!</span>
                          </div>
                        )}

                        {/* Mandatory Next Action Field display with checkbox gate (Section 3) */}
                        {lead.nextAction && (
                          <div 
                            style={{ 
                              padding: '6px 8px', 
                              background: '#f8fafc', 
                              borderRadius: '4px', 
                              fontSize: '10px', 
                              marginBottom: '8px',
                              border: '0.5px solid var(--border)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px'
                            }}
                            onClick={e => e.stopPropagation()} // Intercept modal details popup
                          >
                            <input 
                              type="checkbox" 
                              title="Mark Next Action Complete (Gate)"
                              style={{ marginTop: '2px', cursor: 'pointer' }}
                              onChange={() => handleCompleteNextActionClick(lead, stage)}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Next PM Action:</div>
                              <div style={{ color: lead.nextActionDate <= todayStr ? 'var(--text-danger)' : 'var(--text-primary)', wordBreak: 'break-word' }}>
                                "{lead.nextAction}"
                              </div>
                              <div style={{ fontSize: '8.5px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                Due: <strong>{lead.nextActionDate}</strong> {lead.nextActionDate <= todayStr && '(OVERDUE)'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Weighted Value & Raw Values Breakdown */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                          <span>Est Approval: <strong>{lead.estimateApprovalDate || 'TBD'}</strong></span>
                          <span>Weighted: <strong style={{ color: 'var(--text-info)' }}>R {getWeightedValue(lead)?.toLocaleString()}</strong></span>
                        </div>

                        {/* Values Card splits */}
                        <div style={{ padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '10.5px', marginBottom: '10px', border: '0.5px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                          <div>Design: <strong style={{ color: 'var(--text-info)' }}>R {lead.designValue?.toLocaleString()}</strong></div>
                          <div style={{ textAlign: 'right' }}>Product: <strong style={{ color: 'var(--text-success)' }}>R {lead.productValue?.toLocaleString()}</strong></div>
                        </div>

                        {/* Card Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '0.5px solid var(--border)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                            R {lead.value?.toLocaleString()}
                          </div>
                          
                          {/* Method B: Quick-move cluster menu */}
                          <div 
                            style={{ position: 'relative' }} 
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '9.5px', borderRadius: '4px', height: '20px' }}>
                              Move <ArrowRightLeft size={10} style={{ marginLeft: '2px' }} />
                            </div>
                            
                            <div className="quick-move-menu" style={{ display: 'none', position: 'absolute', bottom: '24px', right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '4px', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', width: '130px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 6px', borderBottom: '0.5px solid var(--border)', marginBottom: '4px' }}>Move Stage:</div>
                              {stages.filter(s => s !== stage).map(s => (
                                <button 
                                  key={s} 
                                  className="btn btn-sm btn-ghost" 
                                  style={{ width: '100%', textLeft: 'left', display: 'block', padding: '3px 8px', fontSize: '10.5px', border: 'none', textAlign: 'left' }}
                                  onClick={() => handleQuickMove(lead, stage, s)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <style>{`.pipe-card:hover .quick-move-menu, .quick-move-menu:hover { display: block; }`}</style>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                  {colLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
                      No leads matching filter
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CENTRAL LEAD DETAILS POP-UP MODAL (Centrally centered) */}
      {selected && (
        <div className="modal-bg active" onClick={() => setSelected(null)}>
          <div 
            className="modal animation-fade-in" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '750px', 
              width: '90%', 
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.18)', 
              border: '0.5px solid var(--border)' 
            }}
          >
            {/* Modal Head Banner */}
            <div className="modal-head" style={{ padding: '16px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`badge ${stageColors[selected.stage]}`} style={{ padding: '4px 10px', fontWeight: 600 }}>{selected.stage}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selected.lead.title}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Client: <strong>{selected.lead.client}</strong></span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* A. Mandatory Top-Level Fields Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
              
              {/* Dynamic Score Grade */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Lead Score (Grade)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span className={`badge ${getLeadRank(selected.lead.probability, selected.lead.priority).color}`} style={{ fontWeight: 700, fontSize: '12px', padding: '3px 8px' }}>
                    Rank {getLeadRank(selected.lead.probability, selected.lead.priority).grade}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{selected.lead.probability}%</span>
                </div>
              </div>

              {/* Deal Velocity Metrics */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Deal Velocity</div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Total: {getDaysBetween(selected.lead.createdDate, todayStr)}d | In Stage: {getStageSittingDays(selected.lead, selected.stage)}d
                </div>
              </div>

              {/* Estimate Approval Date */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Est. Decision Date</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {selected.lead.estimateApprovalDate || 'TBD'}
                </div>
              </div>

              {/* Lead Owner */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-tertiary)', marginBottom: '3px' }}>Lead Owner (PM)</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  👤 {selected.lead.owner}
                </div>
              </div>

            </div>

            {/* B. Split Values Cards (Mandatory split display) */}
            <div style={{ background: 'var(--bg-secondary)', padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Design Value</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-info)' }}>R {selected.lead.designValue?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Potential Product Value</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-success)' }}>R {selected.lead.productValue?.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Foreground displays raw & weighted projection (Section 1) */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-info)', fontWeight: 600 }}>Weighted Forecast</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-info)' }}>R {getWeightedValue(selected.lead)?.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Raw Value</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>R {selected.lead.value?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Tabbed Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              
              <div className="tabs" style={{ background: 'var(--bg-primary)', borderBottom: '0.5px solid var(--border)', padding: '0 10px' }}>
                {[
                  { id: 'profile', label: 'Profile & Actions' },
                  { id: 'details', label: 'Details / Edit' },
                  { id: 'activity', label: `Activity Feed (${selected.lead.activities?.length || 0})` },
                  { id: 'notes', label: `Team Notes (${selected.lead.notes?.length || 0})` },
                  { id: 'docs', label: `Documents (${selected.lead.documents?.length || 0})` }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    className={`tab-btn ${activeModalTab === tab.id ? 'active' : ''}`}
                    onClick={() => { setActiveModalTab(tab.id); setIsEditing(false); }}
                    style={{ fontSize: '12px', padding: '10px 14px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Tab Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                
                {/* 1. Profile Tab (Merged next actions fields, Section 3) */}
                {activeModalTab === 'profile' && (
                  <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Coach activity nudge alert */}
                    {needsNudge(selected.lead) && selected.stage !== 'Signed' && selected.stage !== 'Lost' && (
                      <div className="card" style={{ margin: 0, padding: '12px', background: '#fffbeb', border: '1.5px solid var(--border-warning)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} /> <span>💡 Coach Nudge: Project Manager Inactivity Alert</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#78350f', marginTop: '4px' }}>
                          This deal has logged zero activities for the last <strong>{getDaysSinceLastActivity(selected.lead)} days</strong>. Please engage <strong>{selected.lead.client}</strong> immediately to prevent the deal from cooling down.
                        </div>
                      </div>
                    )}

                    {/* Stagnant decay warn block */}
                    {isStagnant(selected.lead, selected.stage) && (
                      <div className="card" style={{ margin: 0, padding: '12px', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} /> <span>⚠️ Pipeline bottleneck Decay Alert</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px' }}>
                          This lead has been stuck in the <strong>{selected.stage}</strong> column for <strong>{getStageSittingDays(selected.lead, selected.stage)} days</strong>, which exceeds your maximum allowed target duration of <strong>{targetDurations[selected.stage]} days</strong>.
                        </div>
                      </div>
                    )}

                    {/* Interactive Next Action Driver box */}
                    <div className="card" style={{ padding: '14px', margin: 0, background: '#f8fafc', border: '1px solid var(--border-info)' }}>
                      <div className="section-label" style={{ marginBottom: '6px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={14} /> 🎯 COACH ACTION GATER (MANDATORY PM STEPS)
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '8px' }}>
                        <input 
                          type="checkbox" 
                          style={{ transform: 'scale(1.2)', marginTop: '4px', cursor: 'pointer' }}
                          onChange={() => handleCompleteNextActionClick(selected.lead, selected.stage)}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            "{selected.lead.nextAction}"
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Due Date: <strong style={{ color: selected.lead.nextActionDate <= todayStr ? 'var(--text-danger)' : 'inherit' }}>{selected.lead.nextActionDate}</strong> 
                            {selected.lead.nextActionDate <= todayStr && ' (OVERDUE)'}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                            💡 Click the checkbox to mark this task complete and define your next step. Leads cannot exist in pipeline without scheduled next steps.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="card" style={{ padding: '12px', margin: 0 }}>
                        <div className="section-label" style={{ marginBottom: '6px' }}>Client Profile Details</div>
                        <div className="kv"><span className="kv-key">Full Name</span><span className="kv-val">{selected.lead.client}</span></div>
                        <div className="kv"><span className="kv-key">Offering Tier</span><span className="kv-val"><span className="badge b-info">{selected.lead.offering}</span></span></div>
                        <div className="kv"><span className="kv-key">Created Date</span><span className="kv-val">{selected.lead.createdDate}</span></div>
                        {selected.lead.lossReason && (
                          <div className="kv" style={{ background: '#fef2f2', padding: '4px', borderRadius: '4px' }}>
                            <span className="kv-key" style={{ color: 'var(--text-danger)' }}>Loss Reason</span>
                            <span className="kv-val" style={{ fontWeight: 600, color: 'var(--text-danger)' }}>{selected.lead.lossReason}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="card" style={{ padding: '12px', margin: 0 }}>
                        <div className="section-label" style={{ marginBottom: '6px' }}>Client Contact Info</div>
                        {contacts.find(c => c.name === selected.lead.client) ? (
                          <>
                            <div className="kv"><span className="kv-key">Company</span><span className="kv-val">{contacts.find(c => c.name === selected.lead.client).company}</span></div>
                            <div className="kv"><span className="kv-key">Email</span><span className="kv-val">{contacts.find(c => c.name === selected.lead.client).email || 'N/A'}</span></div>
                            <div className="kv"><span className="kv-key">Phone</span><span className="kv-val">{contacts.find(c => c.name === selected.lead.client).phone || 'N/A'}</span></div>
                          </>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px' }}>
                            No linked contact directory entry found.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Method B: Modal Button Cluster stage mover */}
                    <div className="card" style={{ padding: '14px', margin: 0, background: 'var(--bg-secondary)', border: '0.5px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                        <ArrowRightLeft size={14} /> <span>Quick-Move Button Cluster</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {stages.map(s => (
                          <button 
                            key={s} 
                            className={`btn btn-sm ${selected.stage === s ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ 
                              background: selected.stage === s ? 'var(--text-info)' : 'white',
                              color: selected.stage === s ? 'white' : 'var(--text-secondary)'
                            }}
                            onClick={() => handleQuickMove(selected.lead, selected.stage, s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selected.stage === 'Signed' && (
                      <div style={{ marginTop: '10px' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '8px' }} 
                          onClick={() => convertToProject(selected.lead)}
                        >
                          🚀 Convert to Active Project Portfolio
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Details & Editing Tab */}
                {activeModalTab === 'details' && (
                  <div className="animation-fade-in">
                    {!isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="kv"><span className="kv-key">Project Title</span><span className="kv-val">{selected.lead.title}</span></div>
                        <div className="kv"><span className="kv-key">Client / Contact</span><span className="kv-val">{selected.lead.client}</span></div>
                        <div className="kv"><span className="kv-key">Design Fee Value</span><span className="kv-val">R {selected.lead.designValue?.toLocaleString()}</span></div>
                        <div className="kv"><span className="kv-key">Potential Product Value</span><span className="kv-val">R {selected.lead.productValue?.toLocaleString()}</span></div>
                        <div className="kv"><span className="kv-key">Total Estimated Deal Value</span><span className="kv-val" style={{ fontWeight: 700 }}>R {selected.lead.value?.toLocaleString()}</span></div>
                        <div className="kv"><span className="kv-key">Weighted Projections Value</span><span className="kv-val" style={{ fontWeight: 700, color: 'var(--text-info)' }}>R {getWeightedValue(selected.lead)?.toLocaleString()}</span></div>
                        <div className="kv"><span className="kv-key">Offering Offering</span><span className="kv-val">{selected.lead.offering}</span></div>
                        <div className="kv"><span className="kv-key">Project Manager (Owner)</span><span className="kv-val">{selected.lead.owner}</span></div>
                        <div className="kv"><span className="kv-key">Probability (Chance of project)</span><span className="kv-val">{selected.lead.probability}%</span></div>
                        <div className="kv"><span className="kv-key">Project Importance (Priority)</span><span className="kv-val"><span className={`badge ${selected.lead.priority === 'High' ? 'b-danger' : 'b-default'}`}>{selected.lead.priority}</span></span></div>
                        <div className="kv"><span className="kv-key">Expected Decision Date</span><span className="kv-val">{selected.lead.estimateApprovalDate}</span></div>

                        <button 
                          className="btn btn-primary" 
                          style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}
                          onClick={() => { setIsEditing(true); setEditForm({ ...selected.lead }); }}
                        >
                          Edit Lead Fields
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        <div className="row-2">
                          <div className="form-row">
                            <label className="form-label">Project Title *</label>
                            <input 
                              className="form-control" 
                              value={editForm.title || ''} 
                              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            />
                          </div>
                          <div className="form-row">
                            <label className="form-label">Offering Offering</label>
                            <select 
                              className="form-control"
                              value={editForm.offering || 'Signature'}
                              onChange={e => setEditForm(f => ({ ...f, offering: e.target.value }))}
                            >
                              <option>Signature</option>
                              <option>Modus</option>
                              <option>Professional</option>
                            </select>
                          </div>
                        </div>

                        <div className="row-2">
                          <div className="form-row">
                            <label className="form-label">Design Fee Value (Rand)</label>
                            <input 
                              className="form-control" 
                              type="number"
                              value={editForm.designValue || ''} 
                              onChange={e => setEditForm(f => ({ ...f, designValue: e.target.value }))}
                            />
                          </div>
                          <div className="form-row">
                            <label className="form-label">Potential Product Value (Rand)</label>
                            <input 
                              className="form-control" 
                              type="number"
                              value={editForm.productValue || ''} 
                              onChange={e => setEditForm(f => ({ ...f, productValue: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="row-2">
                          <div className="form-row">
                            <label className="form-label">Lead Owner (Project Manager)</label>
                            <select 
                              className="form-control"
                              value={editForm.owner || 'Dani'}
                              onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))}
                            >
                              <option>Dani</option>
                              <option>Martin</option>
                              <option>Alex</option>
                              <option>Sarah</option>
                            </select>
                          </div>
                          <div className="form-row">
                            <label className="form-label">Estimate Decision Date</label>
                            <input 
                              type="date"
                              className="form-control" 
                              value={editForm.estimateApprovalDate || ''} 
                              onChange={e => setEditForm(f => ({ ...f, estimateApprovalDate: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="row-2">
                          <div className="form-row">
                            <label className="form-label">Probability (Chance of project): {editForm.probability}%</label>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              className="form-control" 
                              value={editForm.probability || 50} 
                              onChange={e => setEditForm(f => ({ ...f, probability: e.target.value }))}
                            />
                          </div>
                          <div className="form-row">
                            <label className="form-label">Priority Importance</label>
                            <select 
                              className="form-control"
                              value={editForm.priority || 'High'}
                              onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                            >
                              <option>High</option>
                              <option>Low</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                          <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* 3. Activity Feed Timeline Tab */}
                {activeModalTab === 'activity' && (
                  <div className="animation-fade-in">
                    <div className="section-label" style={{ marginBottom: '14px' }}>Lead Activity Timeline Log</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '18px', borderLeft: '1px solid var(--border)' }}>
                      {(selected.lead.activities || []).map((act, index) => (
                        <div key={act.id || index} style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-23.5px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--text-info)', border: '2px solid white' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{act.text}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}><Clock size={10} inline="true" /> {act.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Notes Tab */}
                {activeModalTab === 'notes' && (
                  <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <textarea 
                        className="form-control" 
                        placeholder="Write free-text internal note for the team..." 
                        style={{ height: '60px', flex: 1, resize: 'none' }}
                        value={newNoteText}
                        onChange={e => setNewNoteText(e.target.value)}
                      />
                      <button className="btn btn-primary" style={{ height: '60px', display: 'flex', alignItems: 'center' }} onClick={handleAddNote}>
                        <Send size={14} /> Log Note
                      </button>
                    </div>

                    <div>
                      <div className="section-label" style={{ marginBottom: '8px' }}>Internal Team Comments</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(selected.lead.notes || []).map((note, index) => (
                          <div key={note.id || index} style={{ background: 'var(--bg-secondary)', border: '0.5px solid var(--border)', borderRadius: '6px', padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                              <span>PM: <strong>{note.author}</strong></span>
                              <span>{note.date}</span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              "{note.text}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* 5. Documents Tab */}
                {activeModalTab === 'docs' && (
                  <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ border: '2px dashed var(--border-strong)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <FileText size={32} color="var(--text-tertiary)" />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Upload New Deal Document</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Upload Briefs, Proposals, or Signed SLA Contracts</div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        <select 
                          className="form-control" 
                          style={{ width: '220px', padding: '4px 8px', fontSize: '11px' }}
                          value={selectedMockFile}
                          onChange={e => setSelectedMockFile(e.target.value)}
                        >
                          <option value="Client_Brief_V2.pdf">Client_Brief_V2.pdf</option>
                          <option value="Steyn_SLA_Draft.docx">Steyn_SLA_Draft.docx</option>
                          <option value="Signed_Contract_UP.pdf">Signed_Contract_UP.pdf</option>
                          <option value="Proposed_Lighting_Layout.dwg">Proposed_Lighting_Layout.dwg</option>
                        </select>
                        
                        <button className="btn btn-primary btn-sm" onClick={handleUploadDoc}>
                          <Paperclip size={12} /> Upload File
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="section-label" style={{ marginBottom: '8px' }}>Hosted Deal Attachments</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(selected.lead.documents || []).map((doc, index) => (
                          <div key={doc.id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', border: '0.5px solid var(--border)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={16} color="var(--text-info)" />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-primary)' }}>{doc.name}</span>
                                <span style={{ fontSize: '9.5px', color: 'var(--text-tertiary)' }}>{doc.size} • Uploaded {doc.date}</span>
                              </div>
                            </div>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              style={{ padding: '4px' }}
                              onClick={() => triggerToast(`📥 Downloading file: ${doc.name} in high fidelity...`)}
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Mandatory "Loss Reason" Pop-up Modal (Blocks action, Section 2) */}
      {lossModalLead && (
        <div className="modal-bg active" style={{ zIndex: 10000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-head" style={{ background: '#fee2e2', borderBottom: '1px solid #fca5a5' }}>
              <div className="modal-title" style={{ color: 'var(--text-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ban size={16} /> Mandatory Loss Reason capture
              </div>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                Please capture the primary reason why deal <strong>"{lossModalLead.lead.title}"</strong> is marked lost. This is required for company statistical tracking.
              </div>
              
              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Primary Reason *</label>
                <select 
                  className="form-control"
                  value={lossReason}
                  onChange={e => setLossReason(e.target.value)}
                >
                  <option>Price Too High</option>
                  <option>Competitor</option>
                  <option>Ghosted</option>
                  <option>Timing/Budget Paused</option>
                  <option>Outside Scope</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Explanatory Notes (Optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="e.g. competitor quoted 20% lower on design fees"
                  style={{ height: '60px', resize: 'none', fontSize: '11.5px' }}
                  value={lossNotes}
                  onChange={e => setLossNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '0.5px solid var(--border)' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => {
                  setLossModalLead(null);
                  triggerToast('❌ Lost conversion aborted. Lead restored.');
                }}
              >
                Cancel Move
              </button>
              <button className="btn btn-danger" onClick={handleConfirmLoss}>
                Confirm Loss Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Mandatory "Next Action" Update Prompt Modal (Section 3) */}
      {nextActionModal && (
        <div className="modal-bg active" style={{ zIndex: 10000 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-head" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div className="modal-title" style={{ color: 'var(--text-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={16} /> Task Completed! Schedule Next step
              </div>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                You checked off action: <strong>"{nextActionModal.oldAction}"</strong>. 
                <br />
                Leads cannot sit idle. You **must** define your new Next Action and Due Date immediately.
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>New PM Next Action *</label>
                <input 
                  className="form-control" 
                  placeholder="e.g. Follow up on budget option draft"
                  value={newNextAction}
                  onChange={e => setNewNextAction(e.target.value)}
                />
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Next Action Due Date *</label>
                <input 
                  type="date"
                  className="form-control" 
                  value={newNextActionDate}
                  onChange={e => setNewNextActionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '0.5px solid var(--border)' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleUpdateNextAction}>
                Schedule Next Action & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Smart Lead Creation Modal (Mandatory Next Action inputs added) */}
      {showCreateModal && (
        <div className="modal-bg active" onClick={() => { setShowCreateModal(false); setShowContactDropdown(false); setShowNewContactForm(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-head">
              <div className="modal-title" style={{ fontWeight: 700 }}>Initialize Pipeline Lead</div>
              <button className="modal-close" onClick={() => { setShowCreateModal(false); setShowContactDropdown(false); setShowNewContactForm(false); }}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label">Project / Deal Title *</label>
                <input 
                  className="form-control" 
                  placeholder="e.g. Steyn City Penthouse"
                  value={newLeadForm.title} 
                  onChange={e => setNewLeadForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Smart Client Lookup */}
              <div className="form-row" style={{ margin: 0, position: 'relative' }}>
                <label className="form-label">Client Name * (Smart Lookup Search)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-control" 
                    placeholder="Search existing clients or enter new name..."
                    value={clientSearch} 
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setNewLeadForm(f => ({ ...f, client: e.target.value }));
                      setShowContactDropdown(true);
                      setShowNewContactForm(false);
                    }}
                    onFocus={() => setShowContactDropdown(true)}
                  />
                  {showContactDropdown && clientSearch && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', zIndex: 100, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                      {filteredContactsLookup.map(c => (
                        <div 
                          key={c.id} 
                          className="clickable"
                          onClick={() => {
                            setNewLeadForm(f => ({ ...f, client: c.name }));
                            setClientSearch(c.name);
                            setShowContactDropdown(false);
                            setShowNewContactForm(false);
                          }}
                          style={{ padding: '8px 12px', fontSize: '11.5px', borderBottom: '0.5px solid var(--border)' }}
                        >
                          👤 <strong>{c.name}</strong> <span style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}>({c.company})</span>
                        </div>
                      ))}
                      {filteredContactsLookup.length === 0 && (
                        <div 
                          className="clickable"
                          onClick={() => {
                            setShowContactDropdown(false);
                            setShowNewContactForm(true);
                          }}
                          style={{ padding: '10px 12px', fontSize: '11.5px', color: 'var(--text-info)', fontWeight: 600, borderBottom: '0.5px solid var(--border)' }}
                        >
                          ✨ Create New Client directory entry: "{clientSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* On-The-Fly Client Creation */}
              {showNewContactForm && (
                <div className="card animation-fade-in" style={{ margin: 0, background: 'var(--bg-secondary)', border: '1.5px dashed var(--border-info)', padding: '12px' }}>
                  <div className="section-label" style={{ marginBottom: '6px', color: 'var(--text-info)' }}>
                    ✨ Client on-the-fly directory Creation Form
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="row-2">
                      <div className="form-row" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>Company Name</label>
                        <input 
                          className="form-control" 
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                          placeholder="e.g. Venter Architects"
                          value={newContactData.company}
                          onChange={e => setNewContactData(c => ({ ...c, company: e.target.value }))}
                        />
                      </div>
                      <div className="form-row" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>Client Type</label>
                        <select 
                          className="form-control" 
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          value={newContactData.type}
                          onChange={e => setNewContactData(c => ({ ...c, type: e.target.value }))}
                        >
                          <option>Architect</option>
                          <option>Developer</option>
                          <option>Interior</option>
                          <option>Private</option>
                        </select>
                      </div>
                    </div>
                    <div className="row-2">
                      <div className="form-row" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>Email Address</label>
                        <input 
                          className="form-control" 
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                          placeholder="sarah@company.co.za"
                          value={newContactData.email}
                          onChange={e => setNewContactData(c => ({ ...c, email: e.target.value }))}
                        />
                      </div>
                      <div className="form-row" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '10px' }}>Phone Number</label>
                        <input 
                          className="form-control" 
                          style={{ padding: '5px 8px', fontSize: '11px' }}
                          placeholder="082 456 7890"
                          value={newContactData.phone}
                          onChange={e => setNewContactData(c => ({ ...c, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mandatory next action inputs (Section 3 rule) */}
              <div className="card" style={{ margin: 0, padding: '12px', background: '#f8fafc', border: '1.5px solid var(--border-info)' }}>
                <div className="section-label" style={{ marginBottom: '6px', color: 'var(--text-info)' }}>
                  🎯 MANDATORY ACTION DRIVER FIELDS
                </div>
                <div className="row-2">
                  <div className="form-row" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Project Next Step Action *</label>
                    <input 
                      className="form-control" 
                      style={{ padding: '5px 8px', fontSize: '11px' }}
                      placeholder="e.g. Confirm glass layouts layout"
                      value={newLeadForm.nextAction} 
                      onChange={e => setNewLeadForm(f => ({ ...f, nextAction: e.target.value }))}
                    />
                  </div>
                  <div className="form-row" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Next Action Target Due Date *</label>
                    <input 
                      type="date"
                      className="form-control" 
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      value={newLeadForm.nextActionDate} 
                      onChange={e => setNewLeadForm(f => ({ ...f, nextActionDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Split Values */}
              <div className="row-2">
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Design Fee Value (Rand) *</label>
                  <input 
                    className="form-control" 
                    type="number"
                    placeholder="e.g. 120000"
                    value={newLeadForm.designValue} 
                    onChange={e => setNewLeadForm(f => ({ ...f, designValue: e.target.value }))}
                  />
                </div>
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Potential Product Value (Rand) *</label>
                  <input 
                    className="form-control" 
                    type="number"
                    placeholder="e.g. 160000"
                    value={newLeadForm.productValue} 
                    onChange={e => setNewLeadForm(f => ({ ...f, productValue: e.target.value }))}
                  />
                </div>
              </div>

              {/* PM Lead Owner & Offering */}
              <div className="row-2">
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Lead Owner (Assigned PM)</label>
                  <select 
                    className="form-control"
                    value={newLeadForm.owner}
                    onChange={e => setNewLeadForm(f => ({ ...f, owner: e.target.value }))}
                  >
                    <option>Dani</option>
                    <option>Martin</option>
                    <option>Alex</option>
                    <option>Sarah</option>
                  </select>
                </div>
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Offering Offering Tier</label>
                  <select 
                    className="form-control"
                    value={newLeadForm.offering}
                    onChange={e => setNewLeadForm(f => ({ ...f, offering: e.target.value }))}
                  >
                    <option>Signature</option>
                    <option>Modus</option>
                    <option>Professional</option>
                  </select>
                </div>
              </div>

              {/* Probability & Priority */}
              <div className="row-2">
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Probability (Chance %): {newLeadForm.probability}%</label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    className="form-control" 
                    value={newLeadForm.probability} 
                    onChange={e => setNewLeadForm(f => ({ ...f, probability: e.target.value }))}
                  />
                </div>
                <div className="form-row" style={{ margin: 0 }}>
                  <label className="form-label">Importance Priority</label>
                  <select 
                    className="form-control"
                    value={newLeadForm.priority}
                    onChange={e => setNewLeadForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option>High</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              {/* Est Decision Date */}
              <div className="form-row" style={{ margin: 0 }}>
                <label className="form-label">Estimate Decision Date</label>
                <input 
                  type="date"
                  className="form-control" 
                  value={newLeadForm.estimateApprovalDate} 
                  onChange={e => setNewLeadForm(f => ({ ...f, estimateApprovalDate: e.target.value }))}
                />
              </div>

            </div>
            <div className="modal-footer" style={{ borderTop: '0.5px solid var(--border)' }}>
              <button className="btn btn-ghost" onClick={() => { setShowCreateModal(false); setShowContactDropdown(false); setShowNewContactForm(false); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateLead}>Create Pipeline Lead</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
