import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Folder, RefreshCw, Globe, Filter } from 'lucide-react';
import DriveFileExplorer from '../components/common/DriveFileExplorer';

export default function DocsPage() {
  const { projects, getModuleName } = useStore();
  const [viewMode, setViewMode] = useState('global'); // 'global' | 'project'
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Convert projects object/array for selector
  const projectList = useMemo(() => {
    return Object.entries(projects || {}).map(([id, p]) => ({
      id,
      name: p.name,
      clientName: p.client_name || p.client || ''
    }));
  }, [projects]);

  // Set initial project
  useEffect(() => {
    if (projectList.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectList[0].id);
    }
  }, [projectList, selectedProjectId]);

  const activeProject = useMemo(() => {
    return projectList.find(p => p.id === selectedProjectId) || null;
  }, [projectList, selectedProjectId]);

  return (
    <div className="animation-fade-in" style={{ padding: isMobile ? '8px' : '20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      
      {/* Page Header and View Mode Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={22} style={{ color: '#3b82f6' }} />
            Google Drive {getModuleName('docs', 'Documents')} Master Portal
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Unified two-way Google Drive integration. Browse company-wide folders or filter directly by project, order, and client.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Global Tree vs Filter by Project */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <button 
              className={`btn btn-xs ${viewMode === 'global' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11.5px', borderRadius: '4px' }}
              onClick={() => setViewMode('global')}
            >
              <Globe size={12} /> Master Drive Tree
            </button>
            <button 
              className={`btn btn-xs ${viewMode === 'project' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11.5px', borderRadius: '4px' }}
              onClick={() => setViewMode('project')}
            >
              <Filter size={12} /> Filter by Project
            </button>
          </div>

          {viewMode === 'project' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select 
                className="form-control" 
                style={{ width: isMobile ? '100%' : '200px', padding: '4px 8px', borderRadius: 'var(--radius-md)', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projectList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Drive File Explorer Component */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {viewMode === 'global' ? (
          <DriveFileExplorer 
            scope="global"
          />
        ) : selectedProjectId ? (
          <DriveFileExplorer 
            scope="project"
            projectId={selectedProjectId}
            projectName={activeProject?.name || ''}
            clientName={activeProject?.clientName || ''}
          />
        ) : (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px' }} />
            Loading project files...
          </div>
        )}
      </div>

    </div>
  );
}
