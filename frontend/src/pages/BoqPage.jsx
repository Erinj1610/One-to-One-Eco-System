import React, { useState } from 'react';

const initialLines = [
  { id: 1, description: 'Recessed LED Downlight 10W', qty: 24, unit: 'R 890',   total: 21360 },
  { id: 2, description: 'Wall Washer Exterior 20W',   qty: 6,  unit: 'R 1,650', total: 9900 },
  { id: 3, description: 'Surface Strip 2700K 1200mm', qty: 10, unit: 'R 1,240', total: 12400 },
];

export default function BoqPage() {
  const [lines, setLines] = useState(initialLines);
  const [project, setProject] = useState('Tambor 9');
  const [newLine, setNewLine] = useState({ description: '', qty: '', unit: '' });

  const addLine = () => {
    if (!newLine.description || !newLine.qty || !newLine.unit) return;
    const unitVal = parseFloat(newLine.unit.replace(/[^0-9.]/g, ''));
    const qtyVal = parseFloat(newLine.qty);
    setLines(prev => [...prev, { id: Date.now(), ...newLine, total: unitVal * qtyVal }]);
    setNewLine({ description: '', qty: '', unit: '' });
  };

  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id));
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const fmt = (n) => 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2 });

  return (
    <div className="animation-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>BOQ Maker</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Bill of quantities for project</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-control" style={{ width: 180 }} value={project} onChange={e => setProject(e.target.value)}>
            {['Upper Primrose','Villa Z','Tambor 9','Singita Elela','House Sissou'].map(p => <option key={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary">Export PDF</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Line items — {project}</div>
          <span className="badge b-info">{lines.length} items</span>
        </div>
        <div className="card-body">
          <div className="boq-line header">
            <span>Description</span><span>Qty</span><span>Unit price</span><span>Total</span><span>Room / zone</span><span></span>
          </div>
          {lines.map(l => (
            <div className="boq-line" key={l.id}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.description}</span>
              <span>{l.qty}</span>
              <span>{l.unit}</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fmt(l.total)}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
              <button className="btn btn-sm btn-danger" onClick={() => removeLine(l.id)}>✕</button>
            </div>
          ))}
          <div className="boq-line" style={{ borderBottom: 'none', paddingTop: 10 }}>
            <input className="boq-input" placeholder="Description" value={newLine.description} onChange={e => setNewLine(f => ({...f, description: e.target.value}))} />
            <input className="boq-input" type="number" placeholder="Qty" value={newLine.qty} onChange={e => setNewLine(f => ({...f, qty: e.target.value}))} />
            <input className="boq-input" placeholder="R 0.00" value={newLine.unit} onChange={e => setNewLine(f => ({...f, unit: e.target.value}))} />
            <span></span><span></span>
            <button className="btn btn-sm btn-primary" onClick={addLine}>Add</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 360, marginLeft: 'auto' }}>
        <div className="card-body">
          <div className="kv-list">
            <div className="kv"><span className="kv-key">Subtotal (excl. VAT)</span><span className="kv-val">{fmt(subtotal)}</span></div>
            <div className="kv"><span className="kv-key">VAT (15%)</span><span className="kv-val">{fmt(vat)}</span></div>
            <div className="kv" style={{ paddingTop: 8, borderBottom: 'none' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Total</span>
              <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-info)' }}>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
