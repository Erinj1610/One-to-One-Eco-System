import React, { useState } from 'react';
import { Sliders, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';

export default function ModuleNavigationSettings({
  moduleConfig,
  setModuleConfig,
  onBack
}) {
  const [newSectionName, setNewSectionName] = useState('');

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    const newName = newSectionName.trim();
    const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (moduleConfig.sections.some(s => s.id === newId)) {
      alert('Section ID already exists');
      return;
    }
    const newSections = [
      ...moduleConfig.sections,
      { id: newId, label: newName, order: moduleConfig.sections.length }
    ];
    setModuleConfig(prev => ({ ...prev, sections: newSections }));
    setNewSectionName('');
  };

  const visibleModulesCount = (moduleConfig.modules || []).filter(m => m.visible).length;

  return (
    <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {onBack && (
              <button 
                type="button" 
                onClick={onBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginRight: '6px'
                }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748b' }}>
              System & Releases
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
            Modules Layout & Navigation Hierarchy
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Configure visibility, custom names, section grouping, and navigation ordering for all portal modules.
          </p>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Navigation Sections
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {(moduleConfig.sections || []).length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Group categories defined
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Visible Modules
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {visibleModulesCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>/ {(moduleConfig.modules || []).length}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Active in portal sidebar
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Real-Time State
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
            Synchronized
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
            Stored in cloud state
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Sections Manager & Modules Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(480px, 1.6fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Card 1: Sections Manager */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
              Navigation Sections Manager
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                placeholder="New section name..." 
                value={newSectionName}
                onChange={e => setNewSectionName(e.target.value)}
                style={{
                  width: '150px',
                  height: '32px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddSection();
                }}
              />
              <button 
                type="button"
                onClick={handleAddSection}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section ID</th>
                <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Label / Name</th>
                <th style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>Order</th>
                <th style={{ width: '80px', textAlign: 'right', padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...moduleConfig.sections].sort((a, b) => a.order - b.order).map((sec, index, sortedArr) => (
                <tr key={sec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: '#64748b', fontSize: '11.5px' }}>
                    {sec.id}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <input 
                      type="text" 
                      value={sec.label}
                      onChange={e => {
                        const updatedSections = moduleConfig.sections.map(s => 
                          s.id === sec.id ? { ...s, label: e.target.value } : s
                        );
                        setModuleConfig(prev => ({ ...prev, sections: updatedSections }));
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        height: '28px',
                        width: '100%',
                        maxWidth: '140px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        outline: 'none',
                        color: '#0f172a'
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 14px', color: '#64748b', fontWeight: 600 }}>
                    {sec.order}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 14px' }}>
                    <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                      <button 
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const newSecs = [...moduleConfig.sections];
                          const current = newSecs.find(s => s.id === sec.id);
                          const prevSec = newSecs.find(s => s.id === sortedArr[index - 1].id);
                          if (current && prevSec) {
                            const temp = current.order;
                            current.order = prevSec.order;
                            prevSec.order = temp;
                            setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                          }
                        }}
                        style={{ padding: '2px 5px', fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: '#334155' }}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button 
                        type="button"
                        disabled={index === sortedArr.length - 1}
                        onClick={() => {
                          const newSecs = [...moduleConfig.sections];
                          const current = newSecs.find(s => s.id === sec.id);
                          const nextSec = newSecs.find(s => s.id === sortedArr[index + 1].id);
                          if (current && nextSec) {
                            const temp = current.order;
                            current.order = nextSec.order;
                            nextSec.order = temp;
                            setModuleConfig(prev => ({ ...prev, sections: newSecs }));
                          }
                        }}
                        style={{ padding: '2px 5px', fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === sortedArr.length - 1 ? 'not-allowed' : 'pointer', color: '#334155' }}
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button 
                        type="button"
                        disabled={['general', 'clients_sales', 'projects_sec', 'other_modules'].includes(sec.id)}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the section "${sec.label}"? All modules under it will move to 'General'.`)) {
                            const updatedSections = moduleConfig.sections.filter(s => s.id !== sec.id);
                            const updatedModules = moduleConfig.modules.map(m => 
                              m.sectionId === sec.id ? { ...m, sectionId: 'general' } : m
                            );
                            setModuleConfig({ sections: updatedSections, modules: updatedModules });
                          }
                        }}
                        style={{ padding: '2px 6px', fontSize: '11px', background: 'transparent', border: 'none', color: '#dc2626', cursor: ['general', 'clients_sales', 'projects_sec', 'other_modules'].includes(sec.id) ? 'not-allowed' : 'pointer', opacity: ['general', 'clients_sales', 'projects_sec', 'other_modules'].includes(sec.id) ? 0.3 : 1 }}
                        title="Delete section"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card 2: Modules Configuration */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
              Modules Layout, Renaming & Grouping
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {(moduleConfig.modules || []).length} modules configured
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ width: '50px', textAlign: 'center', padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Show</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module ID</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display Name</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section</th>
                <th style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '50px' }}>Order</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', width: '70px' }}>Sort</th>
              </tr>
            </thead>
            <tbody>
              {[...moduleConfig.modules].sort((a, b) => a.order - b.order).map((mod, index, sortedArr) => (
                <tr key={mod.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: mod.visible ? 1 : 0.6 }}>
                  <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                    <input 
                      type="checkbox"
                      checked={mod.visible}
                      onChange={e => {
                        const updatedModules = moduleConfig.modules.map(m => 
                          m.id === mod.id ? { ...m, visible: e.target.checked } : m
                        );
                        setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748b', fontSize: '11.5px' }}>
                    {mod.id}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <input 
                      type="text"
                      value={mod.label}
                      onChange={e => {
                        const updatedModules = moduleConfig.modules.map(m => 
                          m.id === mod.id ? { ...m, label: e.target.value } : m
                        );
                        setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                      }}
                      style={{
                        padding: '3px 8px',
                        fontSize: '12px',
                        height: '28px',
                        width: '100%',
                        maxWidth: '130px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        outline: 'none',
                        color: '#0f172a'
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <select
                      value={mod.sectionId}
                      onChange={e => {
                        const updatedModules = moduleConfig.modules.map(m => 
                          m.id === mod.id ? { ...m, sectionId: e.target.value } : m
                        );
                        setModuleConfig(prev => ({ ...prev, modules: updatedModules }));
                      }}
                      style={{
                        padding: '2px 6px',
                        fontSize: '12px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        outline: 'none',
                        color: '#334155',
                        background: '#ffffff'
                      }}
                    >
                      {moduleConfig.sections.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>
                    {mod.order}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                    <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                      <button 
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const newMods = [...moduleConfig.modules];
                          const current = newMods.find(m => m.id === mod.id);
                          const prevMod = newMods.find(m => m.id === sortedArr[index - 1].id);
                          if (current && prevMod) {
                            const temp = current.order;
                            current.order = prevMod.order;
                            prevMod.order = temp;
                            setModuleConfig(prev => ({ ...prev, modules: newMods }));
                          }
                        }}
                        style={{ padding: '2px 5px', fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: '#334155' }}
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button 
                        type="button"
                        disabled={index === sortedArr.length - 1}
                        onClick={() => {
                          const newMods = [...moduleConfig.modules];
                          const current = newMods.find(m => m.id === mod.id);
                          const nextMod = newMods.find(m => m.id === sortedArr[index + 1].id);
                          if (current && nextMod) {
                            const temp = current.order;
                            current.order = nextMod.order;
                            nextMod.order = temp;
                            setModuleConfig(prev => ({ ...prev, modules: newMods }));
                          }
                        }}
                        style={{ padding: '2px 5px', fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === sortedArr.length - 1 ? 'not-allowed' : 'pointer', color: '#334155' }}
                        title="Move Down"
                      >
                        ▼
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
