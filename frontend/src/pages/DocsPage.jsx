import React, { useState } from 'react';

const DOCS = [
  { id: 1, name: 'Upper Primrose — Stage 1 Report.pdf',  project: 'Upper Primrose', type: 'PDF',  size: '4.2 MB', modified: '12 May 2025', by: 'Dani' },
  { id: 2, name: 'Villa Z — Lighting Concept.pdf',        project: 'Villa Z',        type: 'PDF',  size: '8.8 MB', modified: '11 May 2025', by: 'Martin' },
  { id: 3, name: 'Singita — Product Schedule.xlsx',       project: 'Singita Elela',  type: 'XLSX', size: '1.1 MB', modified: '10 May 2025', by: 'Dani' },
  { id: 4, name: 'Proposal Template v4.docx',             project: 'Admin',          type: 'DOCX', size: '620 KB', modified: '8 May 2025',  by: 'Martin' },
  { id: 5, name: 'Tambor 9 — Client Brief.pdf',           project: 'Tambor 9',       type: 'PDF',  size: '2.3 MB', modified: '7 May 2025',  by: 'Martin' },
  { id: 6, name: 'House Sissou — Drawing Set.pdf',        project: 'House Sissou',   type: 'PDF',  size: '14.5 MB',modified: '5 May 2025',  by: 'Dani' },
  { id: 7, name: 'Nandos — Sign-off Form.pdf',            project: "Nando's",        type: 'PDF',  size: '320 KB', modified: '1 May 2025',  by: 'Dani' },
];

const typeIcon = { PDF: '🗂', XLSX: '📊', DOCX: '📄' };
const typeColor = { PDF: 'b-danger', XLSX: 'b-success', DOCX: 'b-info' };

export default function DocsPage() {
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('All');

  const projects = ['All', ...new Set(DOCS.map(d => d.project))];
  const filtered = DOCS.filter(d => {
    const ms = d.name.toLowerCase().includes(search.toLowerCase());
    const mp = filterProject === 'All' || d.project === filterProject;
    return ms && mp;
  });

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{DOCS.length}</div><div className="stat-label">Total documents</div></div>
        <div className="stat"><div className="stat-value stat-danger">{DOCS.filter(d => d.type === 'PDF').length}</div><div className="stat-label">PDFs</div></div>
        <div className="stat"><div className="stat-value stat-success">{DOCS.filter(d => d.type === 'XLSX').length}</div><div className="stat-label">Spreadsheets</div></div>
        <div className="stat"><div className="stat-value stat-info">{DOCS.filter(d => d.type === 'DOCX').length}</div><div className="stat-label">Word docs</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-control" style={{ width: 260 }} placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-control" style={{ width: 180 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            {projects.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button className="btn btn-primary">+ Upload</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.map(doc => (
            <div key={doc.id} className="doc-row" style={{ padding: '10px 15px' }}>
              <div className="doc-ico" style={{ background: 'var(--bg-secondary)', fontSize: 18 }}>{typeIcon[doc.type]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="doc-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div className="doc-meta">{doc.project} · {doc.size} · Modified {doc.modified} by {doc.by}</div>
              </div>
              <span className={`badge ${typeColor[doc.type]}`}>{doc.type}</span>
              <button className="btn btn-sm" style={{ marginLeft: 8 }}>Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
