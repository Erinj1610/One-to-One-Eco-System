import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import * as Icons from 'lucide-react';

export default function Sidebar({ isCollapsed, toggleCollapse }) {
  const { moduleConfig } = useStore();

  const { modules = [], sections = [] } = moduleConfig || {};

  // Sort sections and modules by their designated order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  // Chevron components for toggling sidebar
  const ChevronRight = Icons.ChevronRight;
  const ChevronLeft = Icons.ChevronLeft;
  const Lightbulb = Icons.Lightbulb;
  const SettingsIcon = Icons.Settings;

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sb-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '49px' }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={18} color="var(--text-info)" /> 1-to-1 World
          </div>
        )}
        {isCollapsed && (
          <Lightbulb size={18} color="var(--text-info)" style={{ margin: '0 auto' }} />
        )}
        <button 
          onClick={toggleCollapse} 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            color: 'var(--text-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px',
            marginLeft: isCollapsed ? '0' : 'auto'
          }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      <div className="sb-nav-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1, paddingBottom: '60px' }}>
        {sortedSections.map((sec) => {
          // Get visible modules belonging to this section
          const secModules = sortedModules.filter(m => m.sectionId === sec.id && m.visible);
          if (secModules.length === 0) return null;

          return (
            <React.Fragment key={sec.id}>
              {!isCollapsed && <div className="sb-sec-label" style={{ marginTop: '12px' }}>{sec.label}</div>}
              {secModules.map((item) => {
                const IconComponent = Icons[item.icon] || Icons.HelpCircle;
                return (
                  <NavLink 
                    key={item.id} 
                    to={item.path} 
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <IconComponent size={16} style={{ flexShrink: 0 }} /> 
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      <div className="sb-bottom">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <SettingsIcon size={16} style={{ flexShrink: 0 }} /> 
          {!isCollapsed && <span>Settings</span>}
        </NavLink>

        {!isCollapsed && (
          <div style={{
            padding: '6px 12px 10px 12px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            marginTop: '4px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: (typeof window !== 'undefined' && window.location.hostname.includes('staging')) ? '#f59e0b' : '#10b981',
              boxShadow: (typeof window !== 'undefined' && window.location.hostname.includes('staging')) ? '0 0 6px rgba(245, 158, 11, 0.6)' : '0 0 6px rgba(16, 185, 129, 0.6)'
            }} />
            <span style={{ fontWeight: 600 }}>
              {(typeof window !== 'undefined' && window.location.hostname.includes('staging')) ? 'Staging Playground' : 'Live Production'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
