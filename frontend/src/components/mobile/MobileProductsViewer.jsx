import React, { useState, useMemo } from 'react';
import { Search, Package, Box, Tag, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import MobileProductDetailDrawer from './MobileProductDetailDrawer';

export default function MobileProductsViewer({ items = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredItems = useMemo(() => {
    return (items || []).filter(item => {
      if (!item) return false;
      const sku = (item.sku || '').toLowerCase();
      const name = (item.name || item.description || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const family = (item.family || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || sku.includes(term) || name.includes(term) || brand.includes(term) || family.includes(term);

      const qty = Number(item.stock_qty || item.stockQty || item.quantity || item.qty || 0);
      let matchesStock = true;
      if (stockFilter === 'In Stock') {
        matchesStock = qty > 0;
      } else if (stockFilter === 'Out of Stock') {
        matchesStock = qty <= 0;
      }

      return matchesSearch && matchesStock;
    });
  }, [items, searchTerm, stockFilter]);

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* SEARCH AND STOCK FILTER */}
      <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="Search SKU, product name, brand..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', fontSize: '13px', borderRadius: '10px', height: '38px', background: 'var(--bg-primary)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['All', 'In Stock', 'Out of Stock'].map(filter => {
            const active = stockFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStockFilter(filter)}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: active ? 'none' : '1px solid var(--border)'
                }}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* PRODUCTS FEED */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <AlertCircle size={24} color="var(--text-tertiary)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>No products found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Try adjusting your search query or filter.
            </div>
          </div>
        ) : (
          filteredItems.slice(0, 100).map(item => {
            const sku = item.sku || 'UNKNOWN-SKU';
            const name = item.name || item.description || 'Hardware Item';
            const brand = item.brand || item.family || 'Standard Catalog';
            const qty = Number(item.stock_qty || item.stockQty || item.quantity || item.qty || 0);
            const retail = Number(item.retail || item.unitRetail || item.price || 0);
            const location = item.location || 'STOCK';

            return (
              <div
                key={sku}
                className="mobile-feed-card"
                onClick={() => setSelectedProduct(item)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-info)', fontFamily: 'monospace' }}>
                    {sku}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      className={`badge ${qty > 0 ? 'b-success' : 'b-danger'}`}
                      style={{ fontSize: '9.5px', padding: '2px 7px' }}
                    >
                      {qty > 0 ? `${qty} in Stock` : 'Out of Stock'}
                    </span>
                    <ChevronRight size={14} color="var(--text-tertiary)" />
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {name}
                  </h4>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    {brand} {location ? `• Location: ${location}` : ''}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11px',
                  marginTop: '2px'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Retail Price</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>
                    {retail > 0 ? `R ${Math.round(retail).toLocaleString()}` : 'Custom Quote'}
                  </strong>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PRODUCT SPEC DETAIL DRAWER */}
      {selectedProduct && (
        <MobileProductDetailDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
