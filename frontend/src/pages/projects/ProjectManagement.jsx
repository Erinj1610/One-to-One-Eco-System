import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../api_config';
import DesignFeeBuilder from './DesignFeeBuilder';

function ProjectManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [newQuoteName, setNewQuoteName] = useState('');
  
  const fetchDetails = async () => {
    try {
      const pRes = await fetch(`${API_BASE}/api/projects/`);
      const projects = await pRes.json();
      const current = projects.find(p => p.id.toString() === id);
      setProject(current);

      const qRes = await fetch(`${API_BASE}/api/projects/${id}/quotes`);
      setQuotes(await qRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const updateFee = async (status) => {
    await fetch(`${API_BASE}/api/projects/${id}/fee?status=${status}`, { method: 'PUT' });
    fetchDetails();
  };

  const addQuote = async (e) => {
    e.preventDefault();
    if (!newQuoteName) return;
    await fetch(`${API_BASE}/api/projects/${id}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase_name: newQuoteName })
    });
    setNewQuoteName('');
    fetchDetails();
  };

  if (!project) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading Project...</div>;

  const isLocked = false; 

  return (
    <div className="module-view animation-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <button className="back-btn" onClick={() => navigate('/projects')}>← Back to Projects Folder</button>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>📝 {project.name} Workspace</h2>
      </div>

      <DesignFeeBuilder isLocked={isLocked} updateFee={updateFee} />

      {/* Kanban Board Section */}
      <div className="stat-card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--accent-blue)', opacity: isLocked ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        <h3>📋 2. Design Workspace (Kanban)</h3>
        {isLocked ? (
           <p style={{ marginTop: '1rem', color: '#f87171' }}>Awaiting payment on master design fee before design team can access resources.</p>
        ) : (
           <div style={{ marginTop: '1rem' }}>
             <p style={{ color: 'var(--text-secondary)' }}>Designers can drag and drop active phases and sync DWG files to the master Drive folder here.</p>
             <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', height: '150px' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px dashed var(--panel-border)' }}>Concept Phase</div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px dashed var(--panel-border)' }}>Technical Drawings</div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px dashed var(--panel-border)' }}>Client Approval</div>
             </div>
           </div>
        )}
      </div>

      {/* Quote Splitting Section */}
      <div className="stat-card" style={{ marginBottom: '2rem', borderLeft: '4px solid #10b981' }}>
        <h3>🛍️ 3. Procurement Phases (Quotes Splitter)</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Create 1-to-Many quotes under this building. The Logistics team will fulfill items independently per Quote phase.
        </p>

        <form onSubmit={addQuote} style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <input 
            type="text" placeholder="Phase Name (e.g., Phase 1 - Reception)" value={newQuoteName} onChange={e => setNewQuoteName(e.target.value)}
            style={{ flexGrow: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
          />
          <button type="submit" className="glow-btn" style={{ margin: 0, background: 'linear-gradient(135deg, #10b981, #059669)' }}>Generate Quote Phase</button>
        </form>

        {quotes.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            {quotes.map(q => (
              <div key={q.id} style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <strong>{q.phase_name}</strong>
                   <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status: {q.status.toUpperCase()}</p>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>Fulfillment: {q.fulfillment}%</p>
                   <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                      <div style={{ width: `${q.fulfillment}%`, height: '100%', background: q.fulfillment > 80 ? '#10b981' : 'var(--accent-blue)', borderRadius: '3px' }}></div>
                   </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectManagement;
