import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { API_BASE } from '../api_config';
import { 
  Ticket, Plus, Search, CheckCircle2, Clock, AlertTriangle, 
  AlertCircle, Star, Send, Image as ImageIcon, MessageSquare, 
  Upload, X, ArrowLeft, Trash2, User, FolderKanban,
  RefreshCw, ZoomIn, LayoutGrid, List, Layers, DollarSign,
  Calendar, MapPin, Tag, ShieldAlert, ArrowRight, Download, Check
} from 'lucide-react';

const TICKET_TYPES = [
  { label: 'Site Snag / Defect', value: 'Site Snag / Defect', color: 'b-danger', dotColor: '#ef4444' },
  { label: 'Design Revision', value: 'Design Revision', color: 'b-purple', dotColor: '#8b5cf6' },
  { label: 'RFI / Site Query', value: 'RFI / Site Query', color: 'b-info', dotColor: '#3b82f6' },
  { label: 'Procurement Delay', value: 'Procurement Delay', color: 'b-warning', dotColor: '#f59e0b' },
  { label: 'Electrical / Install Hold-up', value: 'Electrical / Install Hold-up', color: 'b-danger', dotColor: '#dc2626' },
  { label: 'General Project Task', value: 'General Project Task', color: 'b-default', dotColor: '#6b7280' }
];

const PROJECT_STAGES = [
  'Stage 1: Concept Design',
  'Stage 2: Schematic Design',
  'Stage 3: Detail Design',
  'Stage 4: Procurement',
  'Stage 5: Installation & Snagging',
  'Site Handover'
];

const PRIORITIES = [
  { label: 'Critical (Site Blocker)', value: 'Critical', badge: 'b-danger', dotColor: '#ef4444' },
  { label: 'High', value: 'High', badge: 'b-danger', dotColor: '#f97316' },
  { label: 'Medium', value: 'Medium', badge: 'b-warning', dotColor: '#eab308' },
  { label: 'Low', value: 'Low', badge: 'b-default', dotColor: '#6b7280' }
];

const STATUS_COLUMNS = [
  { id: 'Open', label: 'Open / Reported', badge: 'b-warning', color: '#f59e0b', icon: AlertCircle },
  { id: 'In progress', label: 'In Progress', badge: 'b-info', color: '#3b82f6', icon: Clock },
  { id: 'Awaiting Sign-off', label: 'Awaiting Sign-off', badge: 'b-purple', color: '#8b5cf6', icon: Layers },
  { id: 'Resolved', label: 'Resolved / Closed', badge: 'b-success', color: '#10b981', icon: CheckCircle2 }
];

const formatCurrency = (val) => {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(num);
};

export default function TicketLoggerPage({ initialProjectId = null, embedded = false }) {
  const { user } = useAuth();
  const { projects = {}, projectManagers = [] } = useStore();

  const [tickets, setTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState('table');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState(initialProjectId ? String(initialProjectId) : 'All');
  const [pmFilter, setPmFilter] = useState('All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected ticket for Detail Drawer
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState(null);

  // Create Form State
  const [form, setForm] = useState({
    project_id: initialProjectId || '',
    project_name: '',
    client_name: '',
    pm_name: '',
    stage: 'Stage 5: Installation & Snagging',
    title: '',
    description: '',
    ticket_type: 'Site Snag / Defect',
    priority: 'Medium',
    status: 'Open',
    location_area: '',
    fitting_code: '',
    cost_impact: 0,
    schedule_impact_days: 0,
    raised_by: '',
    assigned_to: '',
    due_date: ''
  });
  const [formImages, setFormImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail / Resolution editing
  const [detailStatus, setDetailStatus] = useState('Open');
  const [detailAssignedTo, setDetailAssignedTo] = useState('');
  const [detailResolutionNotes, setDetailResolutionNotes] = useState('');
  const [detailDueDate, setDetailDueDate] = useState('');
  const [detailCostImpact, setDetailCostImpact] = useState(0);
  const [detailScheduleDelay, setDetailScheduleDelay] = useState(0);
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  // Comments
  const [newComment, setNewComment] = useState('');

  // Fetch Project Tickets
  const fetchTickets = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/project-tickets`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTickets(data);
        }
      }
    } catch (err) {
      console.error('Error fetching project tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Staff Members from Cloud SQL
  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/project-tickets/staff`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStaffList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStaff();
  }, []);

  // Compute unified staff options list (Cloud SQL Staff + Project Managers + Defaults)
  const staffOptions = useMemo(() => {
    const staffMap = new Map();
    // 1. Staff from API (Cloud SQL Employees & Users)
    (staffList || []).forEach(s => {
      if (s && s.name && s.name.trim()) {
        staffMap.set(s.name.trim().toLowerCase(), {
          id: s.id,
          name: s.name.trim(),
          role: s.role || 'Staff',
          department: s.department || ''
        });
      }
    });
    // 2. PMs from StoreContext
    (projectManagers || []).forEach(pm => {
      if (pm && pm.name && pm.name.trim()) {
        const key = pm.name.trim().toLowerCase();
        if (!staffMap.has(key)) {
          staffMap.set(key, {
            id: pm.id || key,
            name: pm.name.trim(),
            role: 'Project Manager',
            department: 'Design'
          });
        }
      }
    });
    // 3. Fallbacks
    const defaultStaff = [
      'Erin Jones', 'Martin Doller', 'Dani', 'Brad Abrahams', 
      'Ryan McCarthy', 'Michaela Carter', 'Adiel Louw', 'Najma Smith', 
      'Dean Boyce', 'Alex', 'Merlyn'
    ];
    defaultStaff.forEach(name => {
      const key = name.toLowerCase();
      if (!staffMap.has(key)) {
        staffMap.set(key, {
          id: key,
          name: name,
          role: 'Staff',
          department: ''
        });
      }
    });
    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, projectManagers]);

  // Prepopulate Project Info in form when project selector changes
  const handleProjectSelect = (projId) => {
    const selected = Object.values(projects || {}).find(p => String(p.id) === String(projId));
    if (selected) {
      setForm(prev => ({
        ...prev,
        project_id: selected.id,
        project_name: selected.name || selected.projectName || '',
        client_name: selected.client || selected.clientName || '',
        pm_name: selected.pm || selected.pmName || '',
        stage: selected.stage || 'Stage 5: Installation & Snagging'
      }));
    } else {
      setForm(prev => ({
        ...prev,
        project_id: '',
        project_name: '',
        client_name: '',
        pm_name: ''
      }));
    }
  };

  // Open Detail Drawer
  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket);
    setDetailStatus(ticket.status || 'Open');
    setDetailAssignedTo(ticket.assigned_to || '');
    setDetailResolutionNotes(ticket.resolution_notes || '');
    setDetailDueDate(ticket.due_date || '');
    setDetailCostImpact(ticket.cost_impact || 0);
    setDetailScheduleDelay(ticket.schedule_impact_days || 0);
    setNewComment('');
  };

  // Screenshot / photo paste from clipboard
  const handlePasteImage = (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setFormImages(prev => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  // File Picker
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setFormImages(prev => [...prev, reader.result]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveImage = (index) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  // Create Project Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setIsSubmitting(true);
    const body = {
      ...form,
      project_id: form.project_id ? parseInt(form.project_id) : null,
      cost_impact: parseFloat(form.cost_impact) || 0.0,
      schedule_impact_days: parseInt(form.schedule_impact_days) || 0,
      raised_by: form.raised_by.trim() || user?.displayName || user?.email?.split('@')[0] || 'Staff',
      assigned_to: form.assigned_to ? form.assigned_to.trim() : '',
      attachments: formImages,
      created_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    try {
      const res = await fetch(`${API_BASE}/api/project-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchTickets();
        setShowCreateModal(false);
        setFormImages([]);
        setForm({
          project_id: initialProjectId || '',
          project_name: '',
          client_name: '',
          pm_name: '',
          stage: 'Stage 5: Installation & Snagging',
          title: '',
          description: '',
          ticket_type: 'Site Snag / Defect',
          priority: 'Medium',
          status: 'Open',
          location_area: '',
          fitting_code: '',
          cost_impact: 0,
          schedule_impact_days: 0,
          raised_by: user?.displayName || user?.email?.split('@')[0] || '',
          assigned_to: '',
          due_date: ''
        });
      }
    } catch (err) {
      console.error('Error creating project ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Detail Updates
  const handleSaveDetail = async () => {
    if (!selectedTicket) return;
    setIsSavingDetail(true);

    const body = {
      status: detailStatus,
      assigned_to: detailAssignedTo,
      resolution_notes: detailResolutionNotes,
      due_date: detailDueDate,
      cost_impact: parseFloat(detailCostImpact) || 0,
      schedule_impact_days: parseInt(detailScheduleDelay) || 0
    };

    try {
      const res = await fetch(`${API_BASE}/api/project-tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ticket) {
          setSelectedTicket(result.ticket);
        }
        await fetchTickets();
      }
    } catch (err) {
      console.error('Error saving ticket details:', err);
    } finally {
      setIsSavingDetail(false);
    }
  };

  // Fast Status Quick-Update
  const handleQuickStatusChange = async (ticketId, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/project-tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(prev => prev ? ({ ...prev, status: newStatus }) : null);
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;

    const commentObj = {
      sender: user?.displayName || user?.email?.split('@')[0] || 'PM Lead',
      text: newComment.trim(),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    };

    try {
      const res = await fetch(`${API_BASE}/api/project-tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_comment: commentObj })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ticket) setSelectedTicket(result.ticket);
        setNewComment('');
        await fetchTickets();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project ticket?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/project-tickets/${ticketId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedTicket?.id === ticketId) setSelectedTicket(null);
        await fetchTickets();
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
    }
  };

  // Export Snag List / Project Tickets to CSV
  const handleExportCSV = () => {
    const headers = ['Ticket Number', 'Project', 'Client', 'PM', 'Assigned To', 'Stage', 'Title', 'Type', 'Priority', 'Status', 'Area', 'Fitting Code', 'Cost Impact (ZAR)', 'Schedule Delay (Days)', 'Raised By', 'Due Date', 'Created Date'];
    const rows = filteredTickets.map(t => [
      t.ticket_number,
      `"${(t.project_name || '').replace(/"/g, '""')}"`,
      `"${(t.client_name || '').replace(/"/g, '""')}"`,
      t.pm_name,
      `"${t.assigned_to || ''}"`,
      `"${t.stage}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.ticket_type}"`,
      t.priority,
      t.status,
      `"${(t.location_area || '').replace(/"/g, '""')}"`,
      `"${t.fitting_code || ''}"`,
      t.cost_impact || 0,
      t.schedule_impact_days || 0,
      `"${t.raised_by || ''}"`,
      t.due_date || '',
      t.created_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Project_Tickets_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchNum = (t.ticket_number || '').toLowerCase().includes(q);
        const matchProj = (t.project_name || '').toLowerCase().includes(q);
        const matchArea = (t.location_area || '').toLowerCase().includes(q);
        const matchFitting = (t.fitting_code || '').toLowerCase().includes(q);
        const matchRaised = (t.raised_by || '').toLowerCase().includes(q);
        const matchAssigned = (t.assigned_to || '').toLowerCase().includes(q);
        const matchPm = (t.pm_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchNum && !matchProj && !matchArea && !matchFitting && !matchRaised && !matchAssigned && !matchPm) return false;
      }
      // Project filter
      if (projectFilter !== 'All') {
        if (String(t.project_id) !== String(projectFilter) && (t.project_name || '').toLowerCase() !== projectFilter.toLowerCase()) {
          return false;
        }
      }
      // PM filter
      if (pmFilter !== 'All') {
        if ((t.pm_name || '').toLowerCase() !== pmFilter.toLowerCase()) return false;
      }
      // Assigned Staff filter
      if (assignedFilter !== 'All') {
        if (assignedFilter === 'Unassigned') {
          if (t.assigned_to && t.assigned_to.trim()) return false;
        } else {
          if ((t.assigned_to || '').toLowerCase() !== assignedFilter.toLowerCase()) return false;
        }
      }
      // Stage filter
      if (stageFilter !== 'All') {
        if (t.stage !== stageFilter) return false;
      }
      // Type filter
      if (typeFilter !== 'All') {
        if (t.ticket_type !== typeFilter) return false;
      }
      // Priority filter
      if (priorityFilter !== 'All') {
        if (t.priority !== priorityFilter) return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Open' && t.status !== 'Open') return false;
        if (statusFilter === 'In progress' && t.status !== 'In progress') return false;
        if (statusFilter === 'Awaiting Sign-off' && t.status !== 'Awaiting Sign-off') return false;
        if (statusFilter === 'Resolved' && t.status !== 'Resolved' && t.status !== 'Closed') return false;
      }
      return true;
    });
  }, [tickets, searchQuery, projectFilter, pmFilter, assignedFilter, stageFilter, typeFilter, priorityFilter, statusFilter]);

  // Project List Options
  const projectList = useMemo(() => {
    if (!projects || typeof projects !== 'object') return [];
    return Object.values(projects).filter(p => p && (p.name || p.projectName));
  }, [projects]);

  // PM List Options
  const pmList = useMemo(() => {
    const fromProps = (projectManagers || []).map(p => p.name);
    const fromTickets = tickets.map(t => t.pm_name).filter(Boolean);
    return Array.from(new Set([...fromProps, ...fromTickets, 'Dani', 'Martin', 'Alex', 'Merlyn']));
  }, [projectManagers, tickets]);

  // Active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (projectFilter !== 'All' && !embedded) count++;
    if (pmFilter !== 'All') count++;
    if (assignedFilter !== 'All') count++;
    if (stageFilter !== 'All') count++;
    if (typeFilter !== 'All') count++;
    if (priorityFilter !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [projectFilter, pmFilter, assignedFilter, stageFilter, typeFilter, priorityFilter, statusFilter, searchQuery, embedded]);

  const handleResetFilters = () => {
    setSearchQuery('');
    if (!embedded) setProjectFilter('All');
    setPmFilter('All');
    setAssignedFilter('All');
    setStageFilter('All');
    setTypeFilter('All');
    setPriorityFilter('All');
    setStatusFilter('All');
  };

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const total = filteredTickets.length;
    const critical = filteredTickets.filter(t => t.priority === 'Critical').length;
    const openAndProgress = filteredTickets.filter(t => t.status === 'Open' || t.status === 'In progress').length;
    const awaitingSignoff = filteredTickets.filter(t => t.status === 'Awaiting Sign-off').length;
    const resolved = filteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    const totalCostImpact = filteredTickets.reduce((sum, t) => sum + (parseFloat(t.cost_impact) || 0), 0);
    const totalDelayDays = filteredTickets.reduce((sum, t) => sum + (parseInt(t.schedule_impact_days) || 0), 0);

    return { total, critical, openAndProgress, awaitingSignoff, resolved, totalCostImpact, totalDelayDays };
  }, [filteredTickets]);

  return (
    <div className="animation-fade-in" style={{ width: '100%', maxWidth: embedded ? '100%' : '1600px', margin: '0 auto', padding: embedded ? '0' : '0 8px' }}>
      
      {/* ─── HEADER & COMMAND BAR ────────────────────────────────────── */}
      {!embedded && (
        <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="card-body" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '10px', 
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(59, 130, 246, 0.15))', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--text-info)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <Ticket size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 700 }}>Project Management Ticket Logger</h1>
                  <span className="badge b-purple" style={{ fontSize: '11px', padding: '2px 8px' }}>Site & Snags Hub</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Log and resolve site snags, defect punch lists, design revisions, RFIs, and contractor queries across all projects.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* View Switcher: Table vs Kanban */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border)' }}>
                <button
                  className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('table')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px', fontSize: '12px' }}
                >
                  <List size={14} /> Table
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('kanban')}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px', fontSize: '12px' }}
                >
                  <LayoutGrid size={14} /> Kanban
                </button>
              </div>

              <button
                className="btn btn-ghost"
                onClick={handleExportCSV}
                title="Export Snag List to CSV"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
              >
                <Download size={15} /> Export
              </button>

              <button 
                className="btn btn-ghost" 
                onClick={() => fetchTickets(true)} 
                disabled={refreshing}
                title="Refresh project tickets"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
              >
                <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              </button>

              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreateModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontWeight: 600 }}
              >
                <Plus size={16} />
                <span>+ Log Project Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Action Bar */}
      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={18} color="var(--text-info)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Project Tickets & Snag List</h3>
            <span className="badge b-default" style={{ fontSize: '11px' }}>{filteredTickets.length} Items</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('table')}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                <List size={13} /> List
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('kanban')}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                <LayoutGrid size={13} /> Board
              </button>
            </div>

            <button
              className="btn btn-sm btn-ghost"
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <Download size={13} /> Export CSV
            </button>

            <button 
              className="btn btn-sm btn-primary" 
              onClick={() => {
                if (initialProjectId) handleProjectSelect(initialProjectId);
                setShowCreateModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={14} /> Log Snag / Ticket
            </button>
          </div>
        </div>
      )}

      {/* ─── KPI METRICS SUMMARY ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Tickets</span>
            <Ticket size={15} color="var(--text-tertiary)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
            {kpiStats.total}
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderLeft: '4px solid #ef4444', cursor: 'pointer' }}
          onClick={() => setPriorityFilter('Critical')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Site Blockers (Critical)</span>
            <ShieldAlert size={15} color="#ef4444" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: '#ef4444' }}>
            {kpiStats.critical}
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderLeft: '4px solid #3b82f6', cursor: 'pointer' }}
          onClick={() => setStatusFilter('In progress')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Active (Open / In Prog)</span>
            <Clock size={15} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: '#3b82f6' }}>
            {kpiStats.openAndProgress}
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
          onClick={() => setStatusFilter('Awaiting Sign-off')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Awaiting Sign-off</span>
            <Layers size={15} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: '#8b5cf6' }}>
            {kpiStats.awaitingSignoff}
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderLeft: '4px solid #10b981', cursor: 'pointer' }}
          onClick={() => setStatusFilter('Resolved')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Resolved Snags</span>
            <CheckCircle2 size={15} color="#10b981" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: '#10b981' }}>
            {kpiStats.resolved}
          </div>
        </div>

        <div 
          className="card" 
          style={{ padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Cost Variation</span>
            <DollarSign size={15} color="var(--text-warning)" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: kpiStats.totalCostImpact > 0 ? 'var(--text-danger)' : 'var(--text-primary)' }}>
            {formatCurrency(kpiStats.totalCostImpact)}
          </div>
        </div>
      </div>

      {/* ─── MODERN CLEAN FILTERS TOOLBAR ────────────────────────────── */}
      <div 
        className="card" 
        style={{ 
          marginBottom: '16px', 
          padding: '10px 14px', 
          background: 'var(--bg-primary)', 
          border: '1px solid var(--border)',
          borderRadius: '10px'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Left: Search & Filter Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', flex: '1 1 auto' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '210px', minWidth: '180px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search tickets, snags..."
                className="form-control"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '30px', paddingRight: searchQuery ? '26px' : '10px', fontSize: '12px', height: '34px', borderRadius: '6px' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Project Filter (only show if not embedded inside single project) */}
            {!embedded && (
              <select
                className="form-control"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '130px', maxWidth: '170px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: projectFilter !== 'All' ? 'var(--text-info)' : undefined }}
              >
                <option value="All">All Projects</option>
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>{p.name || p.projectName}</option>
                ))}
              </select>
            )}

            {/* Assigned Staff User Filter */}
            <select
              className="form-control"
              value={assignedFilter}
              onChange={e => setAssignedFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '140px', maxWidth: '190px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', fontWeight: assignedFilter !== 'All' ? 600 : 400, borderColor: assignedFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">👤 All Staff / Assignees</option>
              <option value="Unassigned">👤 Unassigned</option>
              <optgroup label="Staff Users">
                {staffOptions.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} {s.role ? `(${s.role})` : ''}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* PM Filter */}
            <select
              className="form-control"
              value={pmFilter}
              onChange={e => setPmFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '105px', maxWidth: '140px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: pmFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">All PMs</option>
              {pmList.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>

            {/* Stage Filter */}
            <select
              className="form-control"
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '110px', maxWidth: '150px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: stageFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">All Stages</option>
              {PROJECT_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Ticket Type Filter */}
            <select
              className="form-control"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '110px', maxWidth: '150px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: typeFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">All Types</option>
              {TICKET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              className="form-control"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '105px', maxWidth: '135px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: priorityFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">All Priorities</option>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '105px', maxWidth: '135px', height: '34px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', borderColor: statusFilter !== 'All' ? 'var(--text-info)' : undefined }}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In progress">In Progress</option>
              <option value="Awaiting Sign-off">Awaiting Sign-off</option>
              <option value="Resolved">Resolved</option>
            </select>

            {/* Reset Filters Pill */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="btn btn-ghost btn-sm"
                style={{ 
                  height: '34px', 
                  fontSize: '11px', 
                  fontWeight: 600,
                  color: 'var(--text-danger)', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
                title="Clear all active filters and search"
              >
                <X size={12} /> Reset ({activeFilterCount})
              </button>
            )}

          </div>

          {/* Right: Items Count Badge */}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{filteredTickets.length}</span>
            <span>of {tickets.length} tickets</span>
          </div>

        </div>
      </div>

      {/* ─── 1. TABLE VIEW ───────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 14px', width: '90px' }}>Ticket #</th>
                <th>Title & Details</th>
                {!embedded && <th style={{ width: '130px' }}>Project</th>}
                <th style={{ width: '130px' }}>Type</th>
                <th style={{ width: '105px' }}>Priority</th>
                <th style={{ width: '140px' }}>Assigned To</th>
                <th style={{ width: '95px' }}>PM</th>
                <th style={{ width: '100px' }}>Cost Impact</th>
                <th style={{ width: '115px' }}>Status</th>
                <th style={{ width: '45px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => {
                const typeConfig = TICKET_TYPES.find(item => item.value === t.ticket_type) || TICKET_TYPES[0];
                const priorityConfig = PRIORITIES.find(item => item.value === t.priority) || PRIORITIES[2];
                const statusCol = STATUS_COLUMNS.find(c => c.id === t.status) || STATUS_COLUMNS[0];

                return (
                  <tr
                    key={t.id}
                    className="clickable"
                    onClick={() => handleOpenDetail(t)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-info)', fontSize: '12px' }}>
                      {t.ticket_number || `PM-TKT-${String(t.id).padStart(3, '0')}`}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{t.title}</span>
                        {(t.attachments?.length > 0 || t.images?.length > 0) && (
                          <ImageIcon size={13} color="var(--text-info)" title="Site photo attached" />
                        )}
                        {(t.comments?.length > 0) && (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <MessageSquare size={11} /> {t.comments.length}
                          </span>
                        )}
                      </div>
                      {(t.location_area || t.fitting_code) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {t.location_area && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={11} /> {t.location_area}
                            </span>
                          )}
                          {t.fitting_code && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace' }}>
                              <Tag size={10} /> {t.fitting_code}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {!embedded && (
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>
                        {t.project_name || 'General'}
                      </td>
                    )}
                    <td>
                      <span className={`badge ${typeConfig.color}`} style={{ fontSize: '11px' }}>
                        {t.ticket_type}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: priorityConfig.dotColor }} />
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>{priorityConfig.label}</span>
                      </div>
                    </td>
                    <td>
                      {t.assigned_to ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ 
                            width: '22px', 
                            height: '22px', 
                            borderRadius: '50%', 
                            background: 'rgba(59, 130, 246, 0.15)', 
                            color: 'var(--text-info)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '10px', 
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {t.assigned_to.trim()[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {t.assigned_to}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {t.pm_name || '—'}
                    </td>
                    <td style={{ fontSize: '12px', fontWeight: 600, color: t.cost_impact > 0 ? 'var(--text-danger)' : 'var(--text-tertiary)' }}>
                      {t.cost_impact > 0 ? formatCurrency(t.cost_impact) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${statusCol.badge}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusCol.color }} />
                        {t.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost"
                        onClick={(e) => handleDeleteTicket(t.id, e)}
                        title="Delete ticket"
                        style={{ padding: '4px', color: 'var(--text-tertiary)' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTickets.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-tertiary)' }}>
                    <Ticket size={32} strokeWidth={1.5} color="var(--text-tertiary)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>No project management tickets found matching current filters</div>
                    {activeFilterCount > 0 && (
                      <button className="btn btn-sm btn-ghost" onClick={handleResetFilters} style={{ marginTop: '8px', color: 'var(--text-info)' }}>
                        Reset filters
                      </button>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={() => setShowCreateModal(true)} style={{ marginTop: '10px', marginLeft: '6px' }}>
                      + Log a Project Ticket
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 2. KANBAN BOARD VIEW ────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
          {STATUS_COLUMNS.map(col => {
            const columnTickets = filteredTickets.filter(t => {
              if (col.id === 'Resolved') return t.status === 'Resolved' || t.status === 'Closed';
              return t.status === col.id;
            });
            const IconComp = col.icon;

            return (
              <div 
                key={col.id} 
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: 'calc(100vh - 280px)'
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-primary)',
                  borderTopLeftRadius: '10px',
                  borderTopRightRadius: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconComp size={15} color={col.color} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{col.label}</span>
                  </div>
                  <span className="badge b-default" style={{ fontSize: '11px', fontWeight: 700 }}>
                    {columnTickets.length}
                  </span>
                </div>

                {/* Column Card Stream */}
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
                  {columnTickets.map(t => {
                    const typeConfig = TICKET_TYPES.find(item => item.value === t.ticket_type) || TICKET_TYPES[0];
                    const priorityConfig = PRIORITIES.find(item => item.value === t.priority) || PRIORITIES[2];

                    return (
                      <div
                        key={t.id}
                        onClick={() => handleOpenDetail(t)}
                        className="card"
                        style={{
                          padding: '12px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-info)' }}>
                            {t.ticket_number || `PM-TKT-${String(t.id).padStart(3, '0')}`}
                          </span>
                          <span className={`badge ${priorityConfig.badge}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {t.priority}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.3 }}>
                          {t.title}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          <span className={`badge ${typeConfig.color}`} style={{ fontSize: '10px' }}>
                            {t.ticket_type}
                          </span>
                          <span className="badge b-default" style={{ fontSize: '10px' }}>
                            {t.project_name}
                          </span>
                        </div>

                        {(t.location_area || t.fitting_code) && (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {t.location_area && <span>📍 {t.location_area}</span>}
                            {t.fitting_code && <span style={{ fontFamily: 'monospace' }}>[{t.fitting_code}]</span>}
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ 
                              width: '18px', 
                              height: '18px', 
                              borderRadius: '50%', 
                              background: t.assigned_to ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)', 
                              color: t.assigned_to ? 'var(--text-info)' : 'var(--text-tertiary)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '9px', 
                              fontWeight: 700 
                            }}>
                              {(t.assigned_to || t.pm_name || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: t.assigned_to ? 600 : 400, color: t.assigned_to ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {t.assigned_to || t.pm_name || 'Unassigned'}
                            </span>
                          </div>

                          {t.cost_impact > 0 && (
                            <span style={{ color: 'var(--text-danger)', fontWeight: 600 }}>
                              +{formatCurrency(t.cost_impact)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {columnTickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-tertiary)', fontSize: '12px', fontStyle: 'italic' }}>
                      No tickets in {col.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: LOG PROJECT TICKET ───────────────────────────────── */}
      {showCreateModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card animation-scale-up" style={{
            width: '100%',
            maxWidth: '740px',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Ticket size={22} color="var(--text-info)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Log Project Management Ticket</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Record site snags, design revisions, RFIs, or procurement hold-ups</div>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Project & Stage Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Project *</label>
                  <select
                    className="form-control"
                    required
                    value={form.project_id}
                    onChange={e => handleProjectSelect(e.target.value)}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    <option value="">Select Target Project...</option>
                    {projectList.map(p => (
                      <option key={p.id} value={p.id}>{p.name || p.projectName} ({p.client || 'Client'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Project Stage</label>
                  <select
                    className="form-control"
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    {PROJECT_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Ticket Title / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master suite en-suite ceiling cutout misalignment 50mm off..."
                  className="form-control"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  style={{ borderRadius: '8px', padding: '9px 12px', fontSize: '12px' }}
                />
              </div>

              {/* Type, Priority, and Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Ticket Type</label>
                  <select
                    className="form-control"
                    value={form.ticket_type}
                    onChange={e => setForm(f => ({ ...f, ticket_type: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    {TICKET_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Priority</label>
                  <select
                    className="form-control"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Initial Status</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    <option value="Open">Open / Reported</option>
                    <option value="In progress">In Progress</option>
                    <option value="Awaiting Sign-off">Awaiting Sign-off</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Location & Fitting Reference */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Location / Room Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Master Bedroom Ensuite - Zone 2"
                    className="form-control"
                    value={form.location_area}
                    onChange={e => setForm(f => ({ ...f, location_area: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Fitting / Luminaire Code</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-01 Downlight or TR-04 Track"
                    className="form-control"
                    value={form.fitting_code}
                    onChange={e => setForm(f => ({ ...f, fitting_code: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Impact: Cost (R) & Schedule Delay (Days) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Cost Variation (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    placeholder="0.00"
                    className="form-control"
                    value={form.cost_impact}
                    onChange={e => setForm(f => ({ ...f, cost_impact: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Schedule Delay (Days)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="form-control"
                    value={form.schedule_impact_days}
                    onChange={e => setForm(f => ({ ...f, schedule_impact_days: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Target Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Assigned Staff User & Raised By */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Assigned Staff User</label>
                  <select
                    className="form-control"
                    value={form.assigned_to}
                    onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 10px', fontSize: '12px' }}
                  >
                    <option value="">-- Select Assigned Staff User --</option>
                    {staffOptions.map(s => (
                      <option key={s.name} value={s.name}>
                        {s.name} {s.role ? `(${s.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Raised By</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="form-control"
                    value={form.raised_by}
                    onChange={e => setForm(f => ({ ...f, raised_by: e.target.value }))}
                    style={{ borderRadius: '8px', padding: '8px 12px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Description & Site Notes with Paste Support */}
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>
                  Description & Site Notes * <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(You can paste photos directly with Ctrl+V)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the issue, defect, contractor query, or variation details..."
                  className="form-control"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  onPaste={handlePasteImage}
                  style={{ borderRadius: '8px', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', fontSize: '12px' }}
                />
              </div>

              {/* Site Photos & Drawing Upload */}
              <div className="form-row">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '12px' }}>Site Photos & Plan Markups</label>
                <div
                  onPaste={handlePasteImage}
                  onClick={() => document.getElementById('project-ticket-file-input').click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '8px',
                    padding: '18px',
                    textAlign: 'center',
                    background: 'var(--bg-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <Upload size={22} color="var(--text-tertiary)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Click to upload site photos, or paste copied screenshots directly (Ctrl+V)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>PNG, JPG, JPEG supported</div>
                  <input
                    type="file"
                    id="project-ticket-file-input"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </div>

                {formImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {formImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '70px', height: '55px' }}>
                        <img
                          src={img}
                          alt="preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting || !form.title.trim()}
                  style={{ padding: '8px 22px', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Logging...' : 'Log Project Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: TICKET DETAIL & RESOLUTION WORKFLOW ───────────────── */}
      {selectedTicket && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card animation-scale-up" style={{
            width: '100%',
            maxWidth: '920px',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border)'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setSelectedTicket(null)}
                  style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-info)', fontSize: '14px' }}>
                      {selectedTicket.ticket_number}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{selectedTicket.title}</h3>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
              
              {/* Left Column: Meta, Description, Photos, Discussion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Meta Attributes Panel */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>PROJECT</span>
                    <strong style={{ fontSize: '13px' }}>{selectedTicket.project_name || 'General'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>ASSIGNED USER</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: selectedTicket.assigned_to ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-primary)', color: selectedTicket.assigned_to ? 'var(--text-info)' : 'var(--text-tertiary)', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {(selectedTicket.assigned_to || selectedTicket.pm_name || '?')[0].toUpperCase()}
                      </div>
                      <strong style={{ fontSize: '12px', color: selectedTicket.assigned_to ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {selectedTicket.assigned_to || 'Unassigned'}
                      </strong>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>ASSIGNED PM</span>
                    <strong style={{ fontSize: '13px' }}>{selectedTicket.pm_name || 'Unassigned'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>PROJECT STAGE</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedTicket.stage}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>TICKET TYPE</span>
                    <span className="badge b-default" style={{ marginTop: '3px', display: 'inline-block', fontSize: '11px' }}>
                      {selectedTicket.ticket_type}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>PRIORITY</span>
                    <span className={`badge ${PRIORITIES.find(p => p.value === selectedTicket.priority)?.badge || 'b-default'}`} style={{ marginTop: '3px', display: 'inline-block', fontSize: '11px' }}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>STATUS</span>
                    <span className={`badge ${STATUS_COLUMNS.find(c => c.id === selectedTicket.status)?.badge || 'b-default'}`} style={{ marginTop: '3px', display: 'inline-block', fontSize: '11px' }}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', fontWeight: 700 }}>RAISED BY</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedTicket.raised_by || 'Staff'}</span>
                  </div>
                </div>

                {/* Location & Fitting Reference */}
                {(selectedTicket.location_area || selectedTicket.fitting_code) && (
                  <div style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '12px' }}>
                    {selectedTicket.location_area && (
                      <div><strong>Location:</strong> {selectedTicket.location_area}</div>
                    )}
                    {selectedTicket.fitting_code && (
                      <div><strong>Fitting Code:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedTicket.fitting_code}</span></div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Description & Site Details
                  </h4>
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedTicket.description || 'No additional details logged.'}
                  </div>
                </div>

                {/* Photos & Markups Gallery */}
                {((selectedTicket.attachments && selectedTicket.attachments.length > 0) || (selectedTicket.images && selectedTicket.images.length > 0)) && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                      Site Photos & Attachments ({((selectedTicket.attachments || selectedTicket.images)).length})
                    </h4>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {(selectedTicket.attachments || selectedTicket.images).map((imgUrl, i) => (
                        <div 
                          key={i} 
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={() => setActiveZoomImage(imgUrl)}
                        >
                          <img
                            src={imgUrl}
                            alt={`site-photo-${i}`}
                            style={{
                              width: '120px',
                              height: '90px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid var(--border)'
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <ZoomIn size={12} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discussion / Site Updates Timeline */}
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Discussion & Site Updates ({(selectedTicket.comments || []).length})
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                    {(selectedTicket.comments || []).map((comm, idx) => (
                      <div key={idx} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                          <strong>{comm.sender}</strong>
                          <span>{comm.date}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{comm.text}</div>
                      </div>
                    ))}

                    {(selectedTicket.comments || []).length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        No discussion notes logged yet.
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add an update or site comment..."
                      className="form-control"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      style={{ borderRadius: '6px', fontSize: '12px' }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={!newComment.trim()} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Send size={14} /> Send
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Resolution Actions & Impact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Resolution Workflow Box */}
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--text-info)" />
                    Resolution Workflow
                  </h4>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Workflow Status</label>
                    <select
                      className="form-control"
                      value={detailStatus}
                      onChange={e => setDetailStatus(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px' }}
                    >
                      <option value="Open">Open / Reported</option>
                      <option value="In progress">In Progress</option>
                      <option value="Awaiting Sign-off">Awaiting Sign-off</option>
                      <option value="Resolved">Resolved / Closed</option>
                    </select>
                  </div>

                  {/* Assigned Staff User Selector */}
                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Assigned Staff User</label>
                    <select
                      className="form-control"
                      value={detailAssignedTo}
                      onChange={e => setDetailAssignedTo(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px' }}
                    >
                      <option value="">-- Unassigned --</option>
                      {staffOptions.map(s => (
                        <option key={s.name} value={s.name}>
                          {s.name} {s.role ? `(${s.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Target Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={detailDueDate}
                      onChange={e => setDetailDueDate(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px' }}
                    />
                  </div>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Cost Variation (ZAR)</label>
                    <input
                      type="number"
                      step="50"
                      className="form-control"
                      value={detailCostImpact}
                      onChange={e => setDetailCostImpact(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px' }}
                    />
                  </div>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Schedule Delay (Days)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={detailScheduleDelay}
                      onChange={e => setDetailScheduleDelay(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px' }}
                    />
                  </div>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>Resolution Actions Taken</label>
                    <textarea
                      rows={3}
                      placeholder="Describe what remedial action was taken or contractor sign-off details..."
                      className="form-control"
                      value={detailResolutionNotes}
                      onChange={e => setDetailResolutionNotes(e.target.value)}
                      style={{ fontSize: '12px', borderRadius: '6px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleSaveDetail}
                    disabled={isSavingDetail}
                    style={{ width: '100%', fontSize: '12px', fontWeight: 600, padding: '8px 12px' }}
                  >
                    {isSavingDetail ? 'Saving...' : 'Save Resolution Updates'}
                  </button>
                </div>

                {/* Delete Ticket Button */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteTicket(selectedTicket.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <Trash2 size={13} /> Delete Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX: ZOOM PHOTO MODAL ──────────────────────────────── */}
      {activeZoomImage && (
        <div 
          onClick={() => setActiveZoomImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={activeZoomImage}
              alt="zoomed-site-photo"
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setActiveZoomImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#000',
                color: '#fff',
                border: '2px solid #fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
