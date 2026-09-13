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
  ChevronDown
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
  const [submitting, setSubmitting] = useState(false);

  // Modal Form State
  const [selectedStageId, setSelectedStageId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [targetModule, setTargetModule] = useState('sales-tracker');
  const [targetTab, setTargetTab] = useState('purchasing');

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

  if (!projectKey) return null;

  const activeTicket = workflowData?.active_ticket;
  const currentStageName = activeTicket?.stage_name || 'Design & Specification';
  const stageColor = (workflowData?.stages || []).find(s => s.name === currentStageName)?.color || '#3b82f6';
  const IconComponent = ICON_MAP[(workflowData?.stages || []).find(s => s.name === currentStageName)?.icon] || Layers;

  return (
    <>
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '14px',
          fontSize: '12px'
        }}
      >
        {/* LEFT: CURRENT STAGE & ASSIGNED WORKER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
              Project Flow:
            </span>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '16px',
                background: `${stageColor}22`,
                border: `1px solid ${stageColor}55`,
                color: stageColor,
                fontWeight: 700,
                fontSize: '11.5px'
              }}
            >
              <IconComponent size={13} />
              <span>{currentStageName}</span>
            </div>
          </div>

          <div style={{ height: '14px', width: '1px', background: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={13} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Desk:</span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {activeTicket?.assigned_to || activeTicket?.assigned_role || 'Unassigned'}
            </strong>
          </div>

          {activeTicket?.action_note && (
            <>
              <div style={{ height: '14px', width: '1px', background: 'var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MessageSquare size={12} style={{ color: 'var(--text-info)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                  "{activeTicket.action_note}"
                </span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT: ROUTE / HANDOVER BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            <span>Route / Handover</span>
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
                <input
                  type="text"
                  className="input input-sm"
                  placeholder="e.g. Sarah / Purchasing Team / John"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  style={{ width: '100%', fontSize: '12px' }}
                  required
                />
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
    </>
  );
}
