import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  Layers, 
  Activity,
  AlertTriangle,
  Clock,
  Briefcase
} from 'lucide-react';

const COLOR_PRESETS = [
  '#0f172a', // Luxury Dark Slate
  '#2563eb', // Royal Blue
  '#059669', // Emerald
  '#d97706', // Warm Amber
  '#7c3aed', // Violet
  '#0891b2', // Cyan
  '#db2777', // Rose
  '#475569'  // Muted Slate
];

export default function WorkflowManager() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radar, setRadar] = useState(null);
  
  // New Stage Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStageId, setEditingStageId] = useState(null);
  const [stageForm, setStageForm] = useState({
    name: '',
    default_role: '',
    color: '#0f172a',
    icon: 'CheckCircle',
    order_index: 10
  });

  const fetchStagesAndRadar = async () => {
    setLoading(true);
    try {
      const [stagesRes, radarRes] = await Promise.all([
        fetch(`${API_BASE}/api/workflow/stages`),
        fetch(`${API_BASE}/api/workflow/radar`)
      ]);
      if (stagesRes.ok) setStages(await stagesRes.json());
      if (radarRes.ok) setRadar(await radarRes.json());
    } catch (err) {
      console.error('Error fetching workflow manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStagesAndRadar();
  }, []);

  const handleSaveStage = async (e) => {
    e.preventDefault();
    if (!stageForm.name.trim()) return;

    try {
      if (editingStageId) {
        await fetch(`${API_BASE}/api/workflow/stages/${editingStageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stageForm)
        });
        if (window.otoToast) {
          window.otoToast('Workflow stage updated successfully!', 'success');
        }
      } else {
        await fetch(`${API_BASE}/api/workflow/stages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stageForm)
        });
        if (window.otoToast) {
          window.otoToast('New workflow stage created successfully!', 'success');
        }
      }

      setShowAddForm(false);
      setEditingStageId(null);
      setStageForm({ name: '', default_role: '', color: '#0f172a', icon: 'CheckCircle', order_index: (stages.length + 1) * 10 });
      await fetchStagesAndRadar();
    } catch (err) {
      if (window.otoToast) {
        window.otoToast(`Save error: ${err.message}`, 'error');
      } else {
        alert(`Save error: ${err.message}`);
      }
    }
  };

  const handleDeleteStage = async (stageId, stageName) => {
    if (window.otoConfirm) {
      const confirmed = await window.otoConfirm(
        `Are you sure you want to deactivate stage "${stageName}"? Active projects will retain history.`,
        { title: 'Deactivate Workflow Stage', isDanger: true, confirmText: 'Deactivate Stage' }
      );
      if (!confirmed) return;
    } else if (!confirm(`Are you sure you want to deactivate stage "${stageName}"?`)) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/workflow/stages/${stageId}`, { method: 'DELETE' });
      if (window.otoToast) {
        window.otoToast(`Stage "${stageName}" deactivated successfully!`, 'info');
      }
      await fetchStagesAndRadar();
    } catch (err) {
      if (window.otoToast) {
        window.otoToast(`Delete error: ${err.message}`, 'error');
      } else {
        alert(`Delete error: ${err.message}`);
      }
    }
  };

  const totalActiveProjects = radar?.total_active_tasks || 0;
  const bottleneckCount = (radar?.stages || []).filter(s => s.is_bottleneck).length;

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Workflow & Operations
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Workflow Stages & Operational Radar
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Master project lifecycle stages, department assignments, and live bottleneck radar monitoring operational pipeline throughput.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button"
            className="btn"
            onClick={fetchStagesAndRadar}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '8px 14px' }}
            title="Refresh live radar data"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Radar
          </button>
          
          <button 
            type="button"
            onClick={() => {
              setEditingStageId(null);
              setStageForm({ name: '', default_role: '', color: '#0f172a', icon: 'CheckCircle', order_index: (stages.length + 1) * 10 });
              setShowAddForm(true);
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              fontSize: '12.5px', 
              fontWeight: 600,
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
          >
            <Plus size={14} /> New Stage
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Configured Stages</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>{stages.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active lifecycle milestones</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Active Projects in Flight</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {totalActiveProjects}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>● Currently tracked across stages</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Bottleneck Stages</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: bottleneckCount > 0 ? '#b91c1c' : '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {bottleneckCount}
          </div>
          <div style={{ fontSize: '12px', color: bottleneckCount > 0 ? '#dc2626' : '#64748b', fontWeight: 500 }}>
            {bottleneckCount > 0 ? 'Requires executive review' : 'Zero bottlenecks identified'}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 700 }}>Operational Routing</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
            {Array.from(new Set(stages.map(s => s.default_role).filter(Boolean))).length}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned studio departments</div>
        </div>
      </div>

      {/* DIRECTOR'S LIVE BOTTLENECK RADAR CARDS */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#64748b" /> Director's Live Bottleneck Radar
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Live count and average wait times of active projects waiting at each stage across the studio pipeline.
            </p>
          </div>
          <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#0f172a', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            {totalActiveProjects} Projects Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          {(radar?.stages || []).map((s, idx) => (
            <div 
              key={idx}
              style={{
                background: '#f8fafc',
                border: s.is_bottleneck ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 16px',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {s.is_bottleneck && (
                <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.04em', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px' }}>
                  BOTTLENECK
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color || '#0f172a' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.stage_name}
                </span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {s.active_count} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>projects</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} color="#94a3b8" />
                Avg wait: <strong style={{ color: s.avg_wait_hours > 24 ? '#b45309' : '#334155' }}>{s.avg_wait_hours} hrs</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STAGE CONFIGURATION DIRECTORY */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#64748b" /> Workflow Stages Configuration
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              Add, rename, re-order, or deactivate workflow stages anytime to match evolving studio operations.
            </p>
          </div>
        </div>

        {/* ADD / EDIT INLINE FORM */}
        {showAddForm && (
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>
              {editingStageId ? 'Edit Workflow Stage' : 'Create New Workflow Stage'}
            </div>
            <form onSubmit={handleSaveStage} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Stage Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Design & Specification" 
                  value={stageForm.name} 
                  onChange={e => setStageForm({ ...stageForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Default Department
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Design / Purchasing / Accounts" 
                  value={stageForm.default_role} 
                  onChange={e => setStageForm({ ...stageForm, default_role: e.target.value })}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Display Order Index
                </label>
                <input 
                  type="number" 
                  value={stageForm.order_index} 
                  onChange={e => setStageForm({ ...stageForm, order_index: parseInt(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '4px 10px',
                    fontSize: '13px',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Stage Color Tag
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '34px' }}>
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStageForm({ ...stageForm, color: c })}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: c,
                        border: stageForm.color === c ? '2px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="submit" 
                  style={{ 
                    flex: 1,
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    padding: '8px 14px', 
                    fontSize: '12.5px', 
                    fontWeight: 600,
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <Check size={14} /> Save
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    color: '#475569',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAGES DIRECTORY TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ width: '80px', padding: '14px 20px', fontWeight: 600, textAlign: 'center' }}>Order</th>
                <th style={{ width: '60px', padding: '14px 16px', fontWeight: 600, textAlign: 'center' }}>Tag</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Stage Name</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Default Department</th>
                <th style={{ width: '140px', padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, idx) => (
                <tr 
                  key={s.id} 
                  style={{ 
                    borderBottom: idx < stages.length - 1 ? '1px solid #f1f5f9' : 'none',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <td style={{ textAlign: 'center', padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}>
                    {s.order_index}
                  </td>
                  <td style={{ textAlign: 'center', padding: '14px 16px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color || '#0f172a', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0f172a' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #e2e8f0'
                    }}>
                      {s.default_role || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingStageId(s.id);
                          setStageForm({
                            name: s.name,
                            default_role: s.default_role || '',
                            color: s.color || '#0f172a',
                            icon: s.icon || 'CheckCircle',
                            order_index: s.order_index || 0
                          });
                          setShowAddForm(true);
                        }}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 500,
                          color: '#334155',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 9px',
                          cursor: 'pointer'
                        }}
                        title="Edit stage"
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteStage(s.id, s.name)}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 500,
                          color: '#dc2626',
                          background: '#ffffff',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          padding: '4px 9px',
                          cursor: 'pointer'
                        }}
                        title="Deactivate stage"
                      >
                        Deactivate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
