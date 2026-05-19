import React, { useState } from 'react';

const initialProducts = [
  { id: 1, sku: 'MOD-LED-001', name: 'Recessed LED Downlight 10W',  brand: 'Modus',     category: 'Downlight', price: 'R 890',   stock: 42, status: 'In stock' },
  { id: 2, sku: 'MOD-STR-003', name: 'Surface Strip 2700K 1200mm',  brand: 'Modus',     category: 'Strip',     price: 'R 1,240', stock: 17, status: 'In stock' },
  { id: 3, sku: 'SIG-PND-007', name: 'Bespoke Pendant Cluster',     brand: 'Signature', category: 'Pendant',   price: 'R 8,400', stock: 3,  status: 'Low stock' },
  { id: 4, sku: 'MOL-DRV-012', name: 'DALI Driver 100W',            brand: 'Molecule',  category: 'Driver',    price: 'R 2,100', stock: 0,  status: 'Out of stock' },
  { id: 5, sku: 'MOD-WAL-002', name: 'Wall Washer Exterior 20W',    brand: 'Modus',     category: 'Exterior',  price: 'R 1,650', stock: 28, status: 'In stock' },
  { id: 6, sku: 'SIG-FLR-019', name: 'Architectural Floor Uplight', brand: 'Signature', category: 'Floor',     price: 'R 3,200', stock: 8,  status: 'In stock' },
  { id: 7, sku: 'MOL-TRK-005', name: '3-Phase Track System 2m',     brand: 'Molecule',  category: 'Track',     price: 'R 780',   stock: 0,  status: 'Out of stock' },
];

const stockColor = { 'In stock': 'b-success', 'Low stock': 'b-warning', 'Out of stock': 'b-danger' };

export default function ProductsPage() {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('All');

  const filtered = products.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const mb = filterBrand === 'All' || p.brand === filterBrand;
    return ms && mb;
  });

  return (
    <div className="animation-fade-in">
      <div className="stat-grid stat-grid-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="stat-value">{products.length}</div><div className="stat-label">Total SKUs</div></div>
        <div className="stat"><div className="stat-value stat-success">{products.filter(p => p.status === 'In stock').length}</div><div className="stat-label">In stock</div></div>
        <div className="stat"><div className="stat-value stat-warning">{products.filter(p => p.status === 'Low stock').length}</div><div className="stat-label">Low stock</div></div>
        <div className="stat"><div className="stat-value stat-danger">{products.filter(p => p.status === 'Out of stock').length}</div><div className="stat-label">Out of stock</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="form-control" style={{ width: 240 }} placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-control" style={{ width: 140 }} value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
          <option>All</option><option>Modus</option><option>Signature</option><option>Molecule</option>
        </select>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>SKU</th><th>Product</th><th>Brand</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="clickable">
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{p.sku}</td>
                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</td>
                <td><span className="badge b-info">{p.brand}</span></td>
                <td>{p.category}</td>
                <td style={{ fontWeight: 500 }}>{p.price}</td>
                <td style={{ textAlign: 'center' }}>{p.stock}</td>
                <td><span className={`badge ${stockColor[p.status]}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
