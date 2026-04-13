import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api_config';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/`);
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;
    try {
      await fetch(`${API_BASE}/api/projects/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      });
      setNewProjectName('');
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="module-view animation-fade-in" style={{ width: '100%' }}>
      <button className="back-btn" onClick={() => navigate('/')}>← Back to Main Menu</button>
      <h2>📦 Project Management</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Select a project below or create a new master project to begin.</p>
      
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="New Project Name (e.g. Singita Lodge)" 
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
          style={{ flexGrow: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
        />
        <button type="submit" className="glow-btn" style={{ margin: 0 }}>Create Project</button>
      </form>

      <div className="card-grid">
        {loading ? <p>Loading projects...</p> : projects.length === 0 ? <p>No projects found in database.</p> : null}
        
        {projects.map(p => (
          <div key={p.id} className="stat-card clickable" onClick={() => navigate(`/projects/${p.id}`)}>
            <h3>{p.name}</h3>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
               <span className={`status-badge ${p.fee_status === 'paid' ? 'connected' : 'loading'}`} style={{ marginTop: 0 }}>
                 Fee: {p.fee_status}
               </span>
               <span className={`status-badge ${p.kanban_state === 'unlocked' ? 'connected' : 'error'}`} style={{ marginTop: 0 }}>
                 {p.kanban_state === 'locked' ? '🔒 Locked' : '🔓 Unlocked'}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectList;
