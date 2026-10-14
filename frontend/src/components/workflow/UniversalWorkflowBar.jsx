import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  User, 
  Tag, 
  MessageSquare,
  Compass,
  TrendingUp,
  ShoppingCart,
  Package,
  FileText,
  Truck,
  Layers,
  ChevronDown,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
  Upload,
  RefreshCw
} from 'lucide-react';

const ICON_MAP = {
  Compass: Compass,
  TrendingUp: TrendingUp,
  ShoppingCart: ShoppingCart,
  Package: Package,
  FileText: FileText,
  Truck: Truck,
  CheckCircle: CheckCircle,
  Layers: Layers
};

export default function UniversalWorkflowBar({ projectKey, currentUser, onRouted }) {
  const [workflowData, setWorkflowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Normal Handover Modal Form State
  const [selectedStageId, setSelectedStageId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [targetModule, setTargetModule] = useState('sales-tracker');
  const [targetTab, setTargetTab] = useState('purchasing');
  const [staffList, setStaffList] = useState([]);

  // Blocker / Snag Modal Form State
  const [blockerForm, setBlockerForm] = useState({
    title: '',
    ticket_type: 'Site Snag / Defect',
    target_stage_id: '',
    assigned_to: '',
    description: '',
    location_area: '',
    fitting_code: '',
    cost_impact: 0,
    schedule_impact_days: 0,
    attachments: []
  });

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
      console.error('Error fetching staff list for workflow:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchWorkflow = async () => {
    if (!projectKey) return;
    try {
      const res = await fetch(`${API_BASE}/api/workflow/project/${encodeURIComponent(projectKey)}`);
      if (res.ok) {
        const data = await res.json();
        setWorkflowData(data);
        if (data.active_ticket) {
          setSelectedStageId(data.active_ticket.stage_id || '');
          setAssignedTo(data.active_ticket.assigned_to || '');
        } else if (data.stages && data.stages.length > 0) {
          setSelectedStageId(data.stages[0].id);
          setAssignedTo(data.stages[0].default_role || '');
        }
      }
    } catch (err) {
      console.error('Error fetching workflow:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [projectKey]);

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    if (!projectKey || !selectedStageId) return;
    setSubmitting(true);

    const stageObj = (workflowData?.stages || []).find(s => String(s.id) === String(selectedStageId));

    try {
      const res = await fetch(`${API_BASE}/api/workflow/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectKey,
          stage_id: Number(selectedStageId),
          stage_name: stageObj ? stageObj.name : 'Design & Specification',
          assigned_to: assignedTo,
          assigned_role: stageObj?.default_role || '',
          action_note: actionNote,
          target_module: targetModule,
          target_tab: targetTab,
          priority: priority,
          routed_by: currentUser?.name || currentUser?.email || 'Staff'
        })
      });

      if (res.ok) {
        setShowRouteModal(false);
        setActionNote('');
        await fetchWorkflow();
        if (onRouted) onRouted();
      } else {
        alert('Failed to route project. Please check backend logs.');
      }
    } catch (err) {
      console.error('Error routing project:', err);
      alert(`Routing error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBlockerSubmit = async (e) => {
    e.preventDefault();
    if (!projectKey || !blockerForm.title.trim()) return;
    setSubmitting(true);

    const targetStage = (workflowData?.stages || []).find(s => String(s.id) === String(blockerForm.target_stage_id)) || workflowData?.stages?.[0];

    try {
      const res = await fetch(`${API_BASE}/api/workflow/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectKey,
          stage_id: targetStage ? targetStage.id : undefined,
          stage_name: targetStage ? targetStage.name : 'Design & Specification',
          assigned_to: blockerForm.assigned_to || '',
          assigned_role: targetStage?.default_role || '',
          action_note: blockerForm.description,
          priority: 'Urgent',
          is_blocker: true,
          blocker_title: blockerForm.title,
          blocker_type: blockerForm.ticket_type,
          location_area: blockerForm.location_area,
          fitting_code: blockerForm.fitting_code,
          cost_impact: parseFloat(blockerForm.cost_impact || 0),
          schedule_impact_days: parseInt(blockerForm.schedule_impact_days || 0),
          attachments: blockerForm.attachments || [],
          target_module: 'sales-tracker',
          routed_by: currentUser?.name || currentUser?.email || 'Staff'
        })
      });

      if (res.ok) {
        setShowBlockerModal(false);
        setBlockerForm({
          title: '',
          ticket_type: 'Site Snag / Defect',
          target_stage_id: '',
          assigned_to: '',
          description: '',
          location_area: '',
          fitting_code: '',
          cost_impact: 0,
          schedule_impact_days: 0,
          attachments: []
        });
        await fetchWorkflow();
        if (onRouted) onRouted();
      } else {
        alert('Failed to log blocker. Please try again.');
      }
    } catch (err) {
      alert(`Blocker error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveBlocker = async () => {
    if (!window.confirm(`Resolve active blocker and restore normal flow for ${projectKey}?`)) return;
    setResolving(true);
    try {
      const res = await fetch(`${API_BASE}/api/workflow/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_key: projectKey,
          resolved_by: currentUser?.name || currentUser?.email || 'Staff',
          resolution_notes: 'Blocker signed off and resolved directly from Project Workflow bar.'
        })
      });
      if (res.ok) {
        await fetchWorkflow();
        if (onRouted) onRouted();
      } else {
        alert('Failed to resolve blocker.');
      }
    } catch (err) {
      alert(`Resolve error: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  if (!projectKey) return null;

  const activeTicket = workflowData?.active_ticket;
  const currentStageName = activeTicket?.stage_name || 'Design & Specification';
  const stageColor = (workflowData?.stages || []).find(s => s.name === currentStageName)?.color || '#3b82f6';
  const IconComponent = ICON_MAP[(workflowData?.stages || []).find(s => s.name === currentStageName)?.icon] || Layers;
  const isCurrentlyBlocked = Boolean(activeTicket?.action_note?.includes('[⚠️ BLOCKED:') || activeTicket?.priority === 'Urgent');

  return (
    <>
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: isCurrentlyBlocked ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-primary, #ffffff)',
          border: isCurrentlyBlocked ? '1.5px solid #ef4444' : '1px solid var(--border-strong, #cbd5e1)',
          borderRadius: '8px',
          padding: '9px 16px',
          marginBottom: '14px',
          fontSize: '12.5px',
          boxShadow: isCurrentlyBlocked ? '0 0 10px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        {/* LEFT: CURRENT STAGE & ASSIGNED WORKER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isCurrentlyBlocked && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              <AlertTriangle size={12} /> BLOCKED
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary, #475569)', fontWeight: 700, textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.5px' }}>
              Project Flow:
            </span>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: `${stageColor}18`,
                border: `1.5px solid ${stageColor}`,
                color: stageColor,
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              <IconComponent size={14} />
              <span>{currentStageName}</span>
            </div>
          </div>

          <div style={{ height: '16px', width: '1px', background: 'var(--border-strong, #cbd5e1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} style={{ color: 'var(--text-info, #185fa5)' }} />
            <span style={{ color: 'var(--text-secondary, #475569)', fontWeight: 600 }}>Desk:</span>
            <strong style={{ color: 'var(--text-primary, #0f172a)', fontSize: '12.5px', background: 'var(--bg-secondary, #f1f5f9)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border, #e2e8f0)' }}>
              {activeTicket?.assigned_to || activeTicket?.assigned_role || 'Unassigned'}
            </strong>
          </div>

          {activeTicket?.action_note && (
            <>
              <div style={{ height: '16px', width: '1px', background: 'var(--border-strong, #cbd5e1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MessageSquare size={13} style={{ color: isCurrentlyBlocked ? '#ef4444' : 'var(--text-info, #185fa5)', flexShrink: 0 }} />
                <span style={{ color: isCurrentlyBlocked ? '#dc2626' : 'var(--text-primary, #1e293b)', fontStyle: 'italic', fontWeight: 600 }}>
                  "{activeTicket.action_note}"
                </span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: ROUTE / HANDOVER & BLOCKER BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isCurrentlyBlocked ? (
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={handleResolveBlocker}
              disabled={resolving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle2 size={13} />
              <span>{resolving ? 'Resolving...' : 'Resolve & Resume Flow'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setBlockerForm(prev => ({
                  ...prev,
                  target_stage_id: activeTicket?.stage_id || workflowData?.stages?.[0]?.id || '',
                  assigned_to: activeTicket?.assigned_to || ''
                }));
                setShowBlockerModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                background: 'rgba(239, 68, 68, 0.05)'
              }}
              title="Pause workflow and flag an issue, site snag, or missing info"
            >
              <AlertTriangle size={12} />
              <span>Raise Blocker / Snag</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowRouteModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Send size={12} />
            <span>Route to Next Stage</span>
          </button>
        </div>
      </div>

      {/* ROUTE / HANDOVER MODAL */}
      {showRouteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1400, padding: '16px', animation: 'fadeIn 0.15s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div className="card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={15} style={{ color: 'var(--text-info)' }} />
                <span>Route Project: {projectKey}</span>
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowRouteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRouteSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Workflow Stage
                </label>
                <select
                  className="input input-sm"
                  style={{ width: '100%', fontSize: '12.5px', fontWeight: 600 }}
                  value={selectedStageId}
                  onChange={e => {
                    setSelectedStageId(e.target.value);
                    const s = (workflowData?.stages || []).find(x => String(x.id) === e.target.value);
                    if (s?.default_role && !assignedTo) {
                      setAssignedTo(s.default_role);
                    }
                  }}
                  required
                >
                  {(workflowData?.stages || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.default_role || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Assign To (Person or Role)
                </label>
                <select
                  className="input input-sm"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  style={{ width: '100%', fontSize: '12.5px', fontWeight: 600 }}
                  required
                >
                  <option value="">-- Select Person or Role --</option>
                  
                  {/* REAL USERS & STAFF */}
                  {staffList.length > 0 && (
                    <optgroup label="Staff Members / Users">
                      {staffList.map(st => (
                        <option key={st.id || st.name} value={st.name}>
                          {st.name} {st.role && st.role !== 'Staff' ? `(${st.role})` : ''} {st.department ? `· ${st.department}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* TEAMS & DEPARTMENTS */}
                  <optgroup label="Departments & Teams">
                    <option value="Design">Design Team</option>
                    <option value="Sales">Sales & Estimating</option>
                    <option value="Purchasing">Purchasing / Procurement</option>
                    <option value="Stores">Stores / Warehouse</option>
                    <option value="Accounts">Accounts / Invoicing</option>
                    <option value="Logistics">Logistics & Delivery</option>
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Priority
                  </label>
                  <select
                    className="input input-sm"
                    style={{ width: '100%', fontSize: '12px' }}
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">🔥 Urgent / Priority</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Destination Tab
                  </label>
                  <select
                    className="input input-sm"
                    style={{ width: '100%', fontSize: '12px' }}
                    value={targetTab}
                    onChange={e => setTargetTab(e.target.value)}
                  >
                    <option value="purchasing">Sales Tracker: Purchasing</option>
                    <option value="order">Sales Tracker: Specification</option>
                    <option value="invoicing">Sales Tracker: Invoicing</option>
                    <option value="delivery">Sales Tracker: Delivery</option>
                    <option value="takeoff">Takeoff Spec Engine</option>
                    <option value="quotes">Client Quotes</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Action Required / Handover Note
                </label>
                <textarea
                  className="input"
                  placeholder="Explain what the next person needs to do (e.g. 'Added 4 extra downlights to bathroom, please place supplier PO')..."
                  rows={3}
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRouteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Routing...' : 'Confirm Handover →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RAISE BLOCKER / SNAG MODAL */}
      {showBlockerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1400, padding: '16px', animation: 'fadeIn 0.15s ease'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-secondary)', border: '1.5px solid #ef4444', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div className="card-head" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={17} />
                <span>Raise Workflow Blocker & Log Snag: {projectKey}</span>
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setShowBlockerModal(false)}>✕</button>
            </div>

            <form onSubmit={handleBlockerSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Logging a blocker will <strong>pause normal workflow progression</strong>, flag the project in red across all department desks, and place it at the top of the assigned person's Workspace queue.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Blocker / Issue Summary *
                </label>
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="e.g. Driver cut-out mismatch on site / Supplier out of stock for F12"
                  value={blockerForm.title}
                  onChange={e => setBlockerForm({ ...blockerForm, title: e.target.value })}
                  style={{ width: '100%', fontSize: '12.5px', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Issue Classification
                  </label>
                  <select
                    className="input input-sm"
                    style={{ width: '100%', fontSize: '12px' }}
                    value={blockerForm.ticket_type}
                    onChange={e => setBlockerForm({ ...blockerForm, ticket_type: e.target.value })}
                  >
                    <option value="Site Snag / Defect">Site Snag / Defect</option>
                    <option value="Design Revision">Design Revision Needed</option>
                    <option value="RFI / Site Query">RFI / Site Query</option>
                    <option value="Procurement Delay">Procurement / Supplier Delay</option>
                    <option value="Electrical / Install Hold-up">Electrical / Install Hold-up</option>
                    <option value="General Project Task">General Project Blocker</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Send Back To Department / Stage
                  </label>
                  <select
                    className="input input-sm"
                    style={{ width: '100%', fontSize: '12px' }}
                    value={blockerForm.target_stage_id}
                    onChange={e => setBlockerForm({ ...blockerForm, target_stage_id: e.target.value })}
                  >
                    {(workflowData?.stages || []).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.default_role || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Assign Blocker Resolution To
                  </label>
                  <select
                    className="input input-sm"
                    value={blockerForm.assigned_to}
                    onChange={e => setBlockerForm({ ...blockerForm, assigned_to: e.target.value })}
                    style={{ width: '100%', fontSize: '12px' }}
                  >
                    <option value="">-- Leave Unassigned / Stage Default --</option>
                    {staffList.map(st => (
                      <option key={st.id || st.name} value={st.name}>
                        {st.name} {st.department ? `(${st.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Fitting Code / Area Ref (Optional)
                  </label>
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="e.g. F12 · Master Ensuite"
                    value={blockerForm.fitting_code}
                    onChange={e => setBlockerForm({ ...blockerForm, fitting_code: e.target.value })}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Estimated Schedule Delay (Days)
                  </label>
                  <input
                    type="number"
                    className="input input-sm"
                    min="0"
                    placeholder="0"
                    value={blockerForm.schedule_impact_days}
                    onChange={e => setBlockerForm({ ...blockerForm, schedule_impact_days: e.target.value })}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Cost Impact (ZAR)
                  </label>
                  <input
                    type="number"
                    className="input input-sm"
                    min="0"
                    placeholder="0.00"
                    value={blockerForm.cost_impact}
                    onChange={e => setBlockerForm({ ...blockerForm, cost_impact: e.target.value })}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Blocker Details & Required Resolution Action *
                </label>
                <textarea
                  className="input"
                  placeholder="Detail the exact defect or hold-up and what must be done to clear it..."
                  rows={3}
                  value={blockerForm.description}
                  onChange={e => setBlockerForm({ ...blockerForm, description: e.target.value })}
                  style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowBlockerModal(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-sm" 
                  disabled={submitting}
                  style={{ background: '#ef4444', color: '#ffffff', fontWeight: 700, border: 'none' }}
                >
                  {submitting ? 'Applying Blocker...' : '⚠️ Raise Blocker & Halt Flow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
