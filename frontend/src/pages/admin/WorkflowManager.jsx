import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api_config';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  Compass, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  FileText, 
  Truck,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

const ICON_OPTIONS = ['Compass', 'TrendingUp', 'ShoppingCart', 'Package', 'FileText', 'Truck', 'CheckCircle', 'Layers'];
const COLOR_PRESETS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#64748b', '#ef4444'];

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
    color: '#3b82f6',
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
      } else {
        await fetch(`${API_BASE}/api/workflow/stages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stageForm)
        });
      }

      setShowAddForm(false);
      setEditingStageId(null);
      setStageForm({ name: '', default_role: '', color: '#3b82f6', icon: 'CheckCircle', order_index: 10 });
      await fetchStagesAndRadar();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDeleteStage = async (stageId, stageName) => {
    if (!confirm(`Are you sure you want to deactivate stage "${stageName}"?`)) return;
    try {
      await fetch(`${API_BASE}/api/workflow/stages/${stageId}`, { method: 'DELETE' });
      await fetchStagesAndRadar();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* DIRECTOR BOTTLENECK RADAR */}
      <div className="card" style={{ border: '1.5px solid var(--border-strong)', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡 Director's Live Bottleneck Radar</span>
              <span className="badge b-info" style={{ fontSize: '10px' }}>
                {radar?.total_active_tasks || 0} Projects Active
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Live count and average wait times of active projects waiting at each stage.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchStagesAndRadar} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {(radar?.stages || []).map((s, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'var(--bg-primary)',
                  border: s.is_bottleneck ? '1.5px solid var(--text-danger)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  position: 'relative'
                }}
              >
                {s.is_bottleneck && (
                  <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9.5px', fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--text-danger)', padding: '1px 6px', borderRadius: '4px' }}>
                    BOTTLENECK
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.stage_name}
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: s.active_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {s.active_count} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>projects</span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Avg wait: <strong style={{ color: s.avg_wait_hours > 24 ? '#f59e0b' : 'var(--text-primary)' }}>{s.avg_wait_hours} hrs</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STAGE CONFIGURATION */}
      <div className="card" style={{ border: '1.5px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              ⚙️ Company Workflow Stages Configuration
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Add, rename, re-order, or deactivate workflow stages anytime to match evolving operations.
            </div>
          </div>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingStageId(null);
              setStageForm({ name: '', default_role: '', color: '#3b82f6', icon: 'CheckCircle', order_index: (stages.length + 1) * 10 });
              setShowAddForm(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            <span>New Stage</span>
          </button>
        </div>

        {/* ADD / EDIT FORM MODAL */}
        {showAddForm && (
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.03)' }}>
            <form onSubmit={handleSaveStage} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Stage Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Design & Specification" 
                  value={stageForm.name} 
                  onChange={e => setStageForm({ ...stageForm, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Default Role / Department</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Design / Purchasing / Accounts" 
                  value={stageForm.default_role} 
                  onChange={e => setStageForm({ ...stageForm, default_role: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Display Order Index</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={stageForm.order_index} 
                  onChange={e => setStageForm({ ...stageForm, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 700 }}>Stage Color Tag</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setStageForm({ ...stageForm, color: c })}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: c,
                        border: stageForm.color === c ? '2px solid white' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <Check size={14} /> Save
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAGES LIST */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)' }}>
                <th style={{ width: '70px', textAlign: 'center' }}>Order</th>
                <th style={{ width: '40px' }}>Color</th>
                <th>Stage Name</th>
                <th>Default Department</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                    {s.order_index}
                  </td>
                  <td>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: s.color || '#3b82f6' }} />
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {s.name}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {s.default_role || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-xs btn-ghost"
                        onClick={() => {
                          setEditingStageId(s.id);
                          setStageForm({
                            name: s.name,
                            default_role: s.default_role || '',
                            color: s.color || '#3b82f6',
                            icon: s.icon || 'CheckCircle',
                            order_index: s.order_index || 0
                          });
                          setShowAddForm(true);
                        }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleDeleteStage(s.id, s.name)}
                      >
                        <Trash2 size={13} />
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
