import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import DesignFeeBuilder from './DesignFeeBuilder';
import { Lightbulb, ArrowLeft, RefreshCw, Upload, CheckCircle, Clock, Lock, File, FileText, Receipt, Plus, Play } from 'lucide-react';

export default function ProjectManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, updateProject } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

  const p = projects[id];

  if (!p) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading Project...</div>;

  return (
    <div className="animation-fade-in">
      <button className="back-btn" onClick={() => navigate('/projects')}>
        <ArrowLeft size={14} /> All projects
      </button>

      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '10px', background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lightbulb size={18} />
            <span>{p.name}</span>
            <span className={`badge ${p.status === 'On track' ? 'b-info' : 'b-danger'}`}>{p.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div className="av" style={{ width: '24px', height: '24px', fontSize: '10px' }}>{p.pm.substring(0,2).toUpperCase()}</div>
            <span>{p.pm}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'design', label: 'Design stages' },
            { id: 'docs', label: 'Documents' },
            { id: 'team', label: 'Team & time' },
            { id: 'fin', label: 'Financials' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                background: 'none',
                fontFamily: 'inherit',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--text-primary)' : 'transparent'}`,
                marginBottom: '-1px',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '20px' }}>
          {activeTab === 'overview' && (
            <div className="animation-fade-in">
              <div style={{ background: 'var(--bg-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} /> Changes made here sync live to the Design tracker and dashboard
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div className="section-label">Project details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Client</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{['upper','villa','sissou'].includes(id) ? 'SAOTA' : 'Private'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Offering</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.offering}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SQM</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.sqm} m²</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Design start</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.start}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Deadline</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.deadline}</span>
                  </div>
                </div>
                <div>
                  <div className="section-label">Update project status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Current stage</div>
                      <select className="t-sel" value={p.stage} onChange={e => updateProject(id, 'stage', e.target.value)}>
                        {['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Snags/Site visit','Ongoing','Complete'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</div>
                      <select className="t-sel" value={p.status} onChange={e => updateProject(id, 'status', e.target.value)}>
                        <option>On track</option><option>Off track</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Delay reason</div>
                      <select className="t-sel" value={p.delay} onChange={e => updateProject(id, 'delay', e.target.value)}>
                        {['—','Awaiting feedback/approval','Complex design iteration/rework required','Unforeseen technical challenges','Incomplete project requirements','Snags/Site visit','Other'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Complete/Ongoing</div>
                      <select className="t-sel" value={p.complete} onChange={e => updateProject(id, 'complete', e.target.value)}>
                        <option>Ongoing</option><option>Complete</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="animation-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="section-label" style={{ margin: 0 }}>Design stages</div>
                <button className="btn btn-primary btn-s"><Upload size={12} /> Upload</button>
              </div>
              
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-success)', color: 'var(--text-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Stage 1 — Concept design</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Client approved 10 May 2026</div>
                  </div>
                  <span className="badge b-success">Approved</span>
                </div>
                <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                    <File size={14} color="var(--text-tertiary)" />
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>Mood board v1.pdf</span>
                    <span className="badge b-success">Approved</span>
                  </div>
                </div>
              </div>
              
              <div style={{ border: '0.5px solid var(--border-info)', borderRadius: 'var(--radius-lg)', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-info)', color: 'var(--text-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Stage 2 — Schematic design</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sent for review 8 May 2026</div>
                  </div>
                  <span className="badge b-warning">Awaiting client</span>
                </div>
              </div>
              
              <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '10px', opacity: 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Stage 3 — Schematic 100%</div>
                  </div>
                  <span className="badge b-d">Not started</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fin' && (
            <div className="animation-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
                <div>
                  <DesignFeeBuilder />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="card">
                    <div className="card-head"><div className="card-title" style={{ fontSize: '13px' }}>Invoice Summary</div></div>
                    <div className="card-body">
                      <div className="kv"><span className="kv-key">Billed</span><span className="kv-val" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.feeExcl}</span></div>
                      <div className="kv"><span className="kv-key">Paid</span><span className="kv-val" style={{ color: 'var(--text-success)' }}>{p.paid}</span></div>
                      <div className="kv"><span className="kv-key">Outstanding</span><span className="kv-val" style={{ color: 'var(--text-danger)' }}>{p.outstanding}</span></div>
                      <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '12px' }}>+ Raise invoice</button>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><div className="card-title" style={{ fontSize: '13px' }}>Payment History</div></div>
                    <div className="card-body" style={{ padding: '0 12px' }}>
                      <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 500 }}>Deposit</span>
                          <span>{p.paid}</span>
                        </div>
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>Recorded 10 May 2026 · EFT</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="animation-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="section-label" style={{ margin: 0 }}>Project documents</div>
                <button className="btn btn-primary btn-sm"><Upload size={14} /> Upload file</button>
              </div>
              <div className="card">
                <table className="table">
                  <thead><tr><th>File name</th><th>Category</th><th>Phase</th><th>Date</th><th>Visibility</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} /> RCP plan v1.dwg</td>
                      <td>Design</td>
                      <td>Stage 1</td>
                      <td>8 May</td>
                      <td><span className="badge b-info">Client visible</span></td>
                      <td><span className="badge b-success">Approved</span></td>
                    </tr>
                    <tr>
                      <td className="link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={14} /> Mood board v2.pdf</td>
                      <td>Design</td>
                      <td>Stage 1</td>
                      <td>5 May</td>
                      <td><span className="badge b-info">Client visible</span></td>
                      <td><span className="badge b-success">Approved</span></td>
                    </tr>
                    <tr>
                      <td className="link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Receipt size={14} /> INV-112 Deposit.pdf</td>
                      <td>Invoice</td>
                      <td>—</td>
                      <td>29 Apr</td>
                      <td><span className="badge b-info">Client visible</span></td>
                      <td><span className="badge b-success">Paid</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="animation-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="section-label" style={{ margin: 0 }}>Project team</div>
                    <button className="btn btn-sm"><Plus size={14} /> Add member</button>
                  </div>
                  <div className="card">
                    <div className="card-body">
                      <div className="hr-row" style={{ padding: '12px' }}>
                        <div className="av-md" style={{ background: 'var(--bg-info)', color: 'var(--text-info)' }}>{p.pm.substring(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{p.pm} Muller</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Project Manager</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>12.5 hrs</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Logged to date</div>
                        </div>
                      </div>
                      <div className="hr-row" style={{ padding: '12px' }}>
                        <div className="av-md" style={{ background: 'var(--bg-success)', color: 'var(--text-success)' }}>LM</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>Lerato Mokoena</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Senior Designer</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>34.0 hrs</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Logged to date</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="section-label" style={{ margin: 0 }}>Recent time logs</div>
                    <button className="btn btn-primary btn-sm"><Play size={14} /> Log time</button>
                  </div>
                  <div className="card">
                    <div className="card-body" style={{ padding: 0 }}>
                      <div style={{ padding: '12px', borderBottom: '0.5px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500, fontSize: '13px' }}>Lerato M.</span>
                          <span style={{ color: 'var(--text-info)', fontWeight: 600 }}>6.5 hrs</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Stage 2 layouts & schematic updates</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>14 May 2026</div>
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500, fontSize: '13px' }}>Dani M.</span>
                          <span style={{ color: 'var(--text-info)', fontWeight: 600 }}>1.5 hrs</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Internal design review & brief alignment</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>12 May 2026</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
