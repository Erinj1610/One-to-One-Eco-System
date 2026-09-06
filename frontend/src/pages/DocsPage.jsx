import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Folder, RefreshCw } from 'lucide-react';
import DriveFileExplorer from '../components/common/DriveFileExplorer';

export default function DocsPage() {
  const { projects, getModuleName } = useStore();
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
      
      {/* Page Header and Project Dropdown Selector */}
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
            Google Drive {getModuleName('docs', 'Documents')} Portal
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Live two-way Google Drive integration. Upload, preview, and organize project, logistics, and design fee files.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, flexShrink: 0 }}>Project:</span>
          <select 
            className="form-control" 
            style={{ width: isMobile ? '100%' : '240px', padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projectList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drive File Explorer Component */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {selectedProjectId ? (
          <DriveFileExplorer 
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
