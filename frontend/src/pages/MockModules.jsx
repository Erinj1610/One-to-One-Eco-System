import React from 'react';

export function CrmPage() {
  return (
    <div className="animation-fade-in">
      
  <div className="stat-grid stat-grid-4">
    <div className="stat"><div className="stat-value">38</div><div className="stat-label">Total clients</div></div>
    <div className="stat"><div className="stat-value stat-success">R 8.4M</div><div className="stat-label">Lifetime fees billed</div></div>
    <div className="stat"><div className="stat-value stat-info">5</div><div className="stat-label">Active leads</div></div>
    <div className="stat"><div className="stat-value stat-danger">12</div><div className="stat-label">Lost leads</div></div>
  </div>
  <div className="row-2">
    <div>
      <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '10px'}}><div className="section-label" style={{'margin': '0'}}>Top clients by revenue</div><button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New client</button></div>
      <div id="top-clients"></div>
    </div>
    <div>
      <div className="section-label">Active leads</div>
      <div className="card" style={{'marginBottom': '12px'}}><table className="table">
        <thead><tr><th>Lead</th><th>Value</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td className="link">Clifton villa</td><td>R 280k</td><td><span className="badge b-warning">Proposal sent</span></td></tr>
          <tr><td className="link">Franschhoek lodge</td><td>R 420k</td><td><span className="badge b-info">Brief received</span></td></tr>
          <tr><td className="link">Waters Edge 61</td><td>R 74k</td><td><span className="badge b-warning">Proposal sent</span></td></tr>
          <tr><td className="link">Waterfall retail</td><td>R 95k</td><td><span className="badge b-default">Enquiry</span></td></tr>
          <tr><td className="link">Omoyo Hospitality</td><td>R 90k</td><td><span className="badge b-warning">Proposal sent</span></td></tr>
        </tbody></table></div>
      <div className="section-label">Recent lost leads</div>
      <div className="card"><table className="table">
        <thead><tr><th>Lead</th><th>Value</th><th>Reason</th></tr></thead>
        <tbody>
          <tr><td style={{'color': 'var(--text-tertiary)'}}>Hyde Park penthouse</td><td>R 180k</td><td style={{'color': 'var(--text-danger)', 'fontSize': '11px'}}>Price</td></tr>
          <tr><td style={{'color': 'var(--text-tertiary)'}}>Steyn City villa</td><td>R 320k</td><td style={{'color': 'var(--text-danger)', 'fontSize': '11px'}}>Went elsewhere</td></tr>
          <tr><td style={{'color': 'var(--text-tertiary)'}}>Bali resort</td><td>R 890k</td><td style={{'color': 'var(--text-danger)', 'fontSize': '11px'}}>Budget cut</td></tr>
        </tbody></table></div>
    </div>
  </div>
</div>
  );
}

export function PipelinePage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>Sales pipeline</div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New lead</button>
  </div>
  <div className="pipeline">
    <div className="pipe-col">
      <div className="pipe-head">Enquiry <span>2</span></div>
      <div className="pipe-card"><div className="pipe-title">Clifton villa</div><div className="pipe-val">Signature · R est. 280k</div></div>
      <div className="pipe-card"><div className="pipe-title">Waterfall retail</div><div className="pipe-val">Modus · R est. 95k</div></div>
    </div>
    <div className="pipe-col">
      <div className="pipe-head">Brief received <span>1</span></div>
      <div className="pipe-card"><div className="pipe-title">Franschhoek lodge</div><div className="pipe-val">Signature · 2,400m²</div></div>
    </div>
    <div className="pipe-col">
      <div className="pipe-head">Proposal sent <span>3</span></div>
      <div className="pipe-card"><div className="pipe-title">Nando's exterior</div><div className="pipe-val">Modus · R 68,640</div></div>
      <div className="pipe-card"><div className="pipe-title">Omoyo Hospitality</div><div className="pipe-val">Portfolio · R 90,613</div></div>
      <div className="pipe-card"><div className="pipe-title">Waters Edge 61</div><div className="pipe-val">Professional · R 74,000</div></div>
    </div>
    <div className="pipe-col">
      <div className="pipe-head">Approved <span>2</span></div>
      <div className="pipe-card" style={{'borderColor': 'var(--border-success)'}}><div className="pipe-title">Upper Primrose</div><div className="pipe-val" style={{'color': 'var(--text-success)'}}>R 1.88M · Convert →</div></div>
      <div className="pipe-card" style={{'borderColor': 'var(--border-success)'}}><div className="pipe-title">Nando's Stlbsch ext</div><div className="pipe-val" style={{'color': 'var(--text-success)'}}>R 171,600 · Convert →</div></div>
    </div>
    <div className="pipe-col">
      <div className="pipe-head">Won <span>14</span></div>
      <div className="pipe-card"><div className="pipe-title">Singita Elela</div><div className="pipe-val">R 1.0M</div></div>
      <div className="pipe-card"><div className="pipe-title">Villa Z</div><div className="pipe-val">R 436,727</div></div>
    </div>
    <div className="pipe-col">
      <div className="pipe-head">Lost <span>12</span></div>
      <div className="pipe-card" style={{'opacity': '0.6'}}><div className="pipe-title">Hyde Park penthouse</div><div className="pipe-val" style={{'color': 'var(--text-danger)'}}>Price</div></div>
      <div className="pipe-card" style={{'opacity': '0.6'}}><div className="pipe-title">Bali resort</div><div className="pipe-val" style={{'color': 'var(--text-danger)'}}>Budget cut</div></div>
    </div>
  </div>
</div>
  );
}

export function TimePage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div>
      <div className="section-label" style={{'margin': '0'}}>Time tracking</div>
      <div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)', 'marginTop': '3px'}}>Hours logged per project — for internal profitability analysis only (not billable)</div>
    </div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-player-play"></i> Start timer</button>
  </div>
  <div className="stat-grid stat-grid-4">
    <div className="stat"><div className="stat-value">128.5</div><div className="stat-label">Hours this week</div></div>
    <div className="stat"><div className="stat-value">543</div><div className="stat-label">Hours this month</div></div>
    <div className="stat"><div className="stat-value">12</div><div className="stat-label">Active projects logged</div></div>
    <div className="stat"><div className="stat-value">6</div><div className="stat-label">Staff logging time</div></div>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>Staff</th><th>Project</th><th>Task</th><th>Date</th><th>Hours</th><th></th></tr></thead>
    <tbody>
      <tr><td>Lerato M.</td><td className="link">Upper Primrose</td><td>Stage 2 layouts</td><td>14 May</td><td>6.5 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      <tr><td>Dani M.</td><td className="link">Villa Z</td><td>Client meeting</td><td>14 May</td><td>1.5 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      <tr><td>Tanya K.</td><td className="link">Singita Elela</td><td>Spec update</td><td>13 May</td><td>4.0 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      <tr><td>Martin R.</td><td className="link">Tambor 9</td><td>Internal review</td><td>13 May</td><td>2.0 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      <tr><td>Sipho D.</td><td className="link">House Sissou</td><td>RCP drawings</td><td>12 May</td><td>5.5 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      <tr><td>Lerato M.</td><td className="link">Upper Primrose</td><td>Concept revision</td><td>12 May</td><td>3.0 hrs</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function ProductsPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>Product catalog</div>
    <div style={{'display': 'flex', 'gap': '6px'}}>
      <input className="form-control" placeholder="Search products..." style={{'width': '200px'}} />
      <select className="form-control" style={{'width': 'auto', 'padding': '5px 9px', 'fontSize': '11px'}}><option>All brands</option></select>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> Add product</button>
    </div>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>Product</th><th>Brand</th><th>SKU</th><th>Cost</th><th>Trade</th><th>Retail</th><th>Stock</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td className="link">Parscan 50W LED</td><td>ERCO</td><td>ERO-4821</td><td>R 1,950</td><td>R 2,550</td><td>R 3,200</td><td>24</td><td><span className="badge b-success">In stock</span></td></tr>
      <tr><td className="link">Aim pendant</td><td>Flos</td><td>FLO-0892</td><td>R 1,100</td><td>R 1,450</td><td>R 1,850</td><td>8</td><td><span className="badge b-success">In stock</span></td></tr>
      <tr><td className="link">Guise wall light</td><td>Vibia</td><td>VIB-3341</td><td>R 1,250</td><td>R 1,650</td><td>R 2,100</td><td>0</td><td><span className="badge b-danger">Out of stock</span></td></tr>
      <tr><td className="link">Pivot track 30W</td><td>iGuzzini</td><td>IGU-9912</td><td>R 890</td><td>R 1,150</td><td>R 1,450</td><td>16</td><td><span className="badge b-success">In stock</span></td></tr>
      <tr><td className="link">Bamboo pendant</td><td>Foscarini</td><td>FOS-2241</td><td>R 4,200</td><td>R 5,400</td><td>R 6,800</td><td>3</td><td><span className="badge b-warning">Low stock</span></td></tr>
      <tr><td className="link">Wireflow chandelier</td><td>Vibia</td><td>VIB-7752</td><td>R 18,500</td><td>R 23,800</td><td>R 32,000</td><td>2</td><td><span className="badge b-warning">Low stock</span></td></tr>
      <tr><td className="link">Compendium floor</td><td>Luceplan</td><td>LUC-8821</td><td>R 12,400</td><td>R 16,200</td><td>R 21,500</td><td>5</td><td><span className="badge b-success">In stock</span></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function BoqPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>BOQ Maker</div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New BOQ</button>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>BOQ #</th><th>Project</th><th>Client</th><th>Items</th><th>Total retail</th><th>Margin</th><th>Status</th></tr></thead>
    <tbody>
      <tr className="clickable" onClick={() => {}}><td className="link">BOQ-031</td><td>Upper Primrose</td><td>SAOTA</td><td>14 lines</td><td>R 148,000</td><td>R 59,600</td><td><span className="badge b-success">Approved</span></td></tr>
      <tr><td className="link">BOQ-030</td><td>Singita Elela</td><td>Singita</td><td>22 lines</td><td>R 388,000</td><td>R 142,000</td><td><span className="badge b-warning">Pending approval</span></td></tr>
      <tr><td className="link">BOQ-029</td><td>House Sissou</td><td>SAOTA</td><td>8 lines</td><td>R 175,200</td><td>R 68,400</td><td><span className="badge b-success">Approved</span></td></tr>
      <tr><td className="link">BOQ-028</td><td>Tambor 9</td><td>Private</td><td>11 lines</td><td>R 89,500</td><td>R 32,100</td><td><span className="badge b-default">Draft</span></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function OrdersPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>Purchase orders</div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New order</button>
  </div>
  <div className="stat-grid stat-grid-4">
    <div className="stat"><div className="stat-value">7</div><div className="stat-label">Active orders</div></div>
    <div className="stat"><div className="stat-value stat-warning">2</div><div className="stat-label">Partial delivery</div></div>
    <div className="stat"><div className="stat-value stat-info">3</div><div className="stat-label">In transit</div></div>
    <div className="stat"><div className="stat-value">R 1.2M</div><div className="stat-label">Value in flight</div></div>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>Order #</th><th>Project</th><th>Supplier</th><th>Items</th><th>Value</th><th>Expected</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td className="link">PO-083</td><td className="link">Upper Primrose</td><td>ERCO SA</td><td>3 lines</td><td>R 198,750</td><td>28 May</td><td><span className="badge b-info">Ordered</span></td></tr>
      <tr><td className="link">PO-082</td><td className="link">Singita Elela</td><td>Flos SA</td><td>6 lines</td><td>R 314,000</td><td>15 May</td><td><span className="badge b-warning">Partial</span></td></tr>
      <tr><td className="link">PO-081</td><td className="link">Tambor 9</td><td>iGuzzini</td><td>2 lines</td><td>R 87,400</td><td>—</td><td><span className="badge b-default">Draft</span></td></tr>
      <tr><td className="link">PO-080</td><td className="link">Villa Z</td><td>Multiple</td><td>8 lines</td><td>R 412,000</td><td>Delivered</td><td><span className="badge b-success">Received</span></td></tr>
      <tr><td className="link">PO-079</td><td className="link">House Sissou</td><td>Vibia SA</td><td>4 lines</td><td>R 145,200</td><td>22 May</td><td><span className="badge b-info">Ordered</span></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function InvoicesPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>All invoices</div>
    <div style={{'display': 'flex', 'gap': '6px'}}>
      <button className="btn btn-sm"><i className="ti ti-refresh"></i> Sync to Xero</button>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New invoice</button>
    </div>
  </div>
  <div className="stat-grid stat-grid-4">
    <div className="stat"><div className="stat-value">R 4.8M</div><div className="stat-label">Issued YTD</div></div>
    <div className="stat"><div className="stat-value stat-success">R 2.9M</div><div className="stat-label">Collected</div></div>
    <div className="stat"><div className="stat-value stat-warning">R 1.9M</div><div className="stat-label">Outstanding</div></div>
    <div className="stat"><div className="stat-value stat-danger">R 350k</div><div className="stat-label">Overdue</div></div>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>Invoice</th><th>Project</th><th>Type</th><th>Issued</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td className="link">INV-112</td><td className="link">Upper Primrose</td><td>Design fee</td><td>29 Apr</td><td>R 565,720</td><td>R 565,720</td><td>R 0</td><td><span className="badge b-success">Paid</span></td></tr>
      <tr><td className="link">INV-111</td><td className="link">Singita Elela</td><td>Design fee</td><td>18 Apr</td><td>R 350,794</td><td>R 0</td><td>R 350,794</td><td><span className="badge b-danger">Overdue</span></td></tr>
      <tr><td className="link">INV-110</td><td className="link">Tambor 9</td><td>Design fee</td><td>10 Apr</td><td>R 122,439</td><td>R 60,000</td><td>R 62,439</td><td><span className="badge b-warning">Partial</span></td></tr>
      <tr><td className="link">INV-109</td><td className="link">House Sissou</td><td>Product supply</td><td>5 Apr</td><td>R 178,000</td><td>R 178,000</td><td>R 0</td><td><span className="badge b-success">Paid</span></td></tr>
      <tr><td className="link">INV-108</td><td className="link">Kalahari</td><td>Design fee</td><td>28 Mar</td><td>R 35,000</td><td>R 35,000</td><td>R 0</td><td><span className="badge b-success">Paid</span></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function DocsPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>All documents</div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-upload"></i> Upload</button>
  </div>
  <div style={{'display': 'flex', 'gap': '6px', 'marginBottom': '14px', 'flexWrap': 'wrap'}}>
    <button className="btn btn-primary btn-sm">All</button>
    <button className="btn btn-sm">Design files</button>
    <button className="btn btn-sm">Proposals</button>
    <button className="btn btn-sm">Invoices</button>
    <button className="btn btn-sm">Orders</button>
    <button className="btn btn-sm">Contracts</button>
    <button className="btn btn-sm">Other</button>
  </div>
  <div className="card"><div className="card-body">
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}><i className="ti ti-file"></i></div><div style={{'flex': '1'}}><div className="doc-name">RCP plan v1 — Upper Primrose.dwg</div><div className="doc-meta">Design · Upper Primrose · 8 May · Client visible</div></div><span className="badge b-warning">In review</span></div>
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}><i className="ti ti-file"></i></div><div style={{'flex': '1'}}><div className="doc-name">Luminaire spec v2 — Villa Z.pdf</div><div className="doc-meta">Design · Villa Z · 2 May · Client visible</div></div><span className="badge b-success">Approved</span></div>
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-success)', 'color': 'var(--text-success)'}}><i className="ti ti-file-text"></i></div><div style={{'flex': '1'}}><div className="doc-name">Proposal P-2026-031 — Upper Primrose.pdf</div><div className="doc-meta">Proposal · Upper Primrose · 29 Apr 2026</div></div><span className="badge b-success">Approved</span></div>
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-warning)', 'color': 'var(--text-warning)'}}><i className="ti ti-receipt"></i></div><div style={{'flex': '1'}}><div className="doc-name">INV-112 — Upper Primrose deposit.pdf</div><div className="doc-meta">Invoice · Upper Primrose · 29 Apr 2026</div></div><span className="badge b-success">Paid</span></div>
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-warning)', 'color': 'var(--text-warning)'}}><i className="ti ti-truck"></i></div><div style={{'flex': '1'}}><div className="doc-name">PO-083 ERCO supply.pdf</div><div className="doc-meta">Order · Upper Primrose · 30 Apr 2026</div></div><span className="badge b-info">Ordered</span></div>
    <div className="doc-row"><div className="doc-ico" style={{'background': 'var(--bg-secondary)', 'color': 'var(--text-tertiary)'}}><i className="ti ti-file"></i></div><div style={{'flex': '1'}}><div className="doc-name">T&Cs — 1-to-1 World standard.pdf</div><div className="doc-meta">Contract · General · Internal</div></div><span className="badge b-default">Internal</span></div>
  </div></div>
</div>
  );
}

export function HrPage() {
  return (
    <div className="animation-fade-in">
      
  <div className="tabs" style={{'marginBottom': '18px'}}>
    <button className="tab active" onClick={() => {}}>Staff directory</button>
    <button className="tab" onClick={() => {}}>Leave requests</button>
    <button className="tab" onClick={() => {}}>Leave balances</button>
    <button className="tab" onClick={() => {}}>Leave calendar</button>
    <button className="tab" onClick={() => {}}>Leave types</button>
  </div>
  <div className="tab-panel active" data-tab-group="hr" data-tab="staff">
    <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
      <div className="section-label" style={{'margin': '0'}}>Staff directory (20 people)</div>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> Add staff</button>
    </div>
    <div className="card"><div className="card-body">
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>MR</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Martin Ryan</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Project manager · 6 active projects · joined Mar 2022</div></div><span className="badge b-info">Active</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-success)', 'color': 'var(--text-success)'}}>DM</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Dani Muller</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Project manager · 7 active projects · joined Jul 2022</div></div><span className="badge b-info">Active</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-warning)', 'color': 'var(--text-warning)'}}>LM</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Lerato Mokoena</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Senior designer · 3 projects · joined Jan 2023</div></div><span className="badge b-info">Active</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-danger)', 'color': 'var(--text-danger)'}}>SD</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Sipho Dlamini</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Senior designer · 2 projects · joined Nov 2023</div></div><span className="badge b-warning">On leave today</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-secondary)', 'color': 'var(--text-secondary)'}}>TK</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Tanya Kruger</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Junior designer · 4 projects · joined Feb 2024</div></div><span className="badge b-info">Active</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>JV</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Jen van der Walt</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Sales rep · 5 active leads · joined Jun 2023</div></div><span className="badge b-info">Active</span></div>
      <div className="hr-row"><div className="av-md" style={{'background': 'var(--bg-success)', 'color': 'var(--text-success)'}}>PN</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Pieter Nel</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Warehouse manager · joined Apr 2022</div></div><span className="badge b-info">Active</span></div>
    </div></div>
  </div>
  <div className="tab-panel" data-tab-group="hr" data-tab="leave-requests">
    <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
      <div className="section-label" style={{'margin': '0'}}>Pending leave requests</div>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New request</button>
    </div>
    <div className="card"><table className="table">
      <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
      <tbody>
        <tr><td>Lerato Mokoena</td><td>Annual</td><td>22 May</td><td>26 May</td><td>5</td><td>14 May</td><td><span className="badge b-warning">Pending</span></td><td><button className="btn btn-sm btn-primary">Approve</button> <button className="btn btn-sm btn-danger">Reject</button></td></tr>
        <tr><td>Tanya Kruger</td><td>Sick</td><td>13 May</td><td>13 May</td><td>1</td><td>13 May</td><td><span className="badge b-warning">Pending</span></td><td><button className="btn btn-sm btn-primary">Approve</button> <button className="btn btn-sm btn-danger">Reject</button></td></tr>
        <tr><td>Sipho Dlamini</td><td>Annual</td><td>14 May</td><td>14 May</td><td>1</td><td>10 May</td><td><span className="badge b-success">Approved</span></td><td></td></tr>
        <tr><td>Martin Ryan</td><td>Family</td><td>3 Jun</td><td>5 Jun</td><td>3</td><td>9 May</td><td><span className="badge b-success">Approved</span></td><td></td></tr>
      </tbody>
    </table></div>
  </div>
  <div className="tab-panel" data-tab-group="hr" data-tab="balances">
    <div className="section-label">Leave balances 2026</div>
    <div className="card"><table className="table">
      <thead><tr><th>Employee</th><th>Annual</th><th>Sick</th><th>Family</th><th>Study</th></tr></thead>
      <tbody>
        <tr><td>Martin Ryan</td><td>15 / 21</td><td>8 / 10</td><td>3 / 3</td><td>0 / 5</td></tr>
        <tr><td>Dani Muller</td><td>12 / 21</td><td>10 / 10</td><td>3 / 3</td><td>2 / 5</td></tr>
        <tr><td>Lerato Mokoena</td><td>18 / 21</td><td>9 / 10</td><td>3 / 3</td><td>5 / 5</td></tr>
        <tr><td>Sipho Dlamini</td><td>14 / 21</td><td>7 / 10</td><td>3 / 3</td><td>0 / 5</td></tr>
        <tr><td>Tanya Kruger</td><td>16 / 21</td><td>8 / 10</td><td>3 / 3</td><td>0 / 5</td></tr>
      </tbody>
    </table></div>
  </div>
  <div className="tab-panel" data-tab-group="hr" data-tab="calendar">
    <div className="section-label">Leave calendar — May 2026</div>
    <div className="cal-grid">
      <div className="cal-day-head">Mon</div><div className="cal-day-head">Tue</div><div className="cal-day-head">Wed</div><div className="cal-day-head">Thu</div><div className="cal-day-head">Fri</div><div className="cal-day-head">Sat</div><div className="cal-day-head">Sun</div>
      <div className="cal-day other-month">28</div><div className="cal-day other-month">29</div><div className="cal-day other-month">30</div><div className="cal-day">1</div><div className="cal-day">2</div><div className="cal-day other-month">3</div><div className="cal-day other-month">4</div>
      <div className="cal-day">5</div><div className="cal-day">6</div><div className="cal-day">7</div><div className="cal-day">8</div><div className="cal-day">9</div><div className="cal-day other-month">10</div><div className="cal-day other-month">11</div>
      <div className="cal-day">12</div><div className="cal-day">13<div className="cal-leave" style={{'background': 'var(--bg-warning)', 'color': 'var(--text-warning)'}}>TK sick</div></div><div className="cal-day">14<div className="cal-leave" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>SD annual</div></div><div className="cal-day">15</div><div className="cal-day">16</div><div className="cal-day other-month">17</div><div className="cal-day other-month">18</div>
      <div className="cal-day">19</div><div className="cal-day">20</div><div className="cal-day">21</div><div className="cal-day">22<div className="cal-leave" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>LM annual</div></div><div className="cal-day">23<div className="cal-leave" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>LM annual</div></div><div className="cal-day other-month">24</div><div className="cal-day other-month">25</div>
      <div className="cal-day">26<div className="cal-leave" style={{'background': 'var(--bg-info)', 'color': 'var(--text-info)'}}>LM annual</div></div><div className="cal-day">27</div><div className="cal-day">28</div><div className="cal-day">29</div><div className="cal-day">30</div><div className="cal-day other-month">31</div><div className="cal-day other-month"></div>
    </div>
  </div>
  <div className="tab-panel" data-tab-group="hr" data-tab="types">
    <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
      <div className="section-label" style={{'margin': '0'}}>Leave types</div>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> Add leave type</button>
    </div>
    <div className="card"><table className="table">
      <thead><tr><th>Leave type</th><th>Days per year</th><th>Carry over max</th><th>Requires docs</th><th></th></tr></thead>
      <tbody>
        <tr><td>Annual</td><td>21</td><td>10</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
        <tr><td>Sick</td><td>10</td><td>0</td><td>Yes (3+ days)</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
        <tr><td>Family responsibility</td><td>3</td><td>0</td><td>Yes</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
        <tr><td>Study</td><td>5</td><td>0</td><td>Yes</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
        <tr><td>Unpaid</td><td>Unlimited</td><td>—</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
      </tbody>
    </table></div>
  </div>
</div>
  );
}

export function ReportsPage() {
  return (
    <div className="animation-fade-in">
      
  <div className="stat-grid stat-grid-4">
    <div className="stat"><div className="stat-value">R 4.8M</div><div className="stat-label">Fees issued YTD</div></div>
    <div className="stat"><div className="stat-value stat-success">R 2.9M</div><div className="stat-label">Collected</div></div>
    <div className="stat"><div className="stat-value stat-warning">R 1.9M</div><div className="stat-label">Outstanding</div></div>
    <div className="stat"><div className="stat-value">12</div><div className="stat-label">Active projects</div></div>
  </div>
  <div className="row-2">
    <div className="card"><div className="card-head"><div className="card-title">Performance by PM</div></div><div className="card-body">
      <div className="kv"><span className="kv-key">Martin Ryan</span><span className="kv-val">R 2.1M issued · 6 projects</span></div>
      <div className="kv"><span className="kv-key">Dani Muller</span><span className="kv-val">R 2.7M issued · 7 projects</span></div>
    </div></div>
    <div className="card"><div className="card-head"><div className="card-title">Revenue by offering</div></div><div className="card-body">
      <div className="kv"><span className="kv-key">Signature</span><span className="kv-val">R 3.8M · 8 projects</span></div>
      <div className="kv"><span className="kv-key">Modus</span><span className="kv-val">R 680k · 4 projects</span></div>
      <div className="kv"><span className="kv-key">Professional</span><span className="kv-val">R 194k · 2 projects</span></div>
      <div className="kv"><span className="kv-key">Portfolio</span><span className="kv-val">R 90k · 1 project</span></div>
    </div></div>
  </div>
  <div className="row-2">
    <div className="card"><div className="card-head"><div className="card-title">Project profitability</div></div><div className="card-body">
      <div className="kv"><span className="kv-key">Singita Elela</span><span className="kv-val">68% margin</span></div>
      <div className="kv"><span className="kv-key">Upper Primrose</span><span className="kv-val">72% margin</span></div>
      <div className="kv"><span className="kv-key">Villa Z</span><span className="kv-val" style={{'color': 'var(--text-danger)'}}>42% margin (over-budget hours)</span></div>
    </div></div>
    <div className="card"><div className="card-head"><div className="card-title">Lost deals analysis</div></div><div className="card-body">
      <div className="kv"><span className="kv-key">Price</span><span className="kv-val">5 deals · R 890k</span></div>
      <div className="kv"><span className="kv-key">Went elsewhere</span><span className="kv-val">4 deals · R 1.1M</span></div>
      <div className="kv"><span className="kv-key">Budget cut</span><span className="kv-val">3 deals · R 1.4M</span></div>
    </div></div>
  </div>
</div>
  );
}

export function SupportPage() {
  return (
    <div className="animation-fade-in">
      
  <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
    <div className="section-label" style={{'margin': '0'}}>Support tickets</div>
    <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New ticket</button>
  </div>
  <div className="card"><table className="table">
    <thead><tr><th>#</th><th>Subject</th><th>Project</th><th>Raised by</th><th>Assigned</th><th>Raised</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td className="link">#041</td><td>Fitting spec query — floor 2</td><td className="link">Upper Primrose</td><td>Client</td><td>Lerato M.</td><td>13 May</td><td><span className="badge b-info">Open</span></td></tr>
      <tr><td className="link">#040</td><td>Revision request Stage 3</td><td className="link">Villa Z</td><td>Client</td><td>Martin R.</td><td>12 May</td><td><span className="badge b-warning">In progress</span></td></tr>
      <tr><td className="link">#039</td><td>Invoice correction needed</td><td className="link">Singita Elela</td><td>Internal</td><td>Dani M.</td><td>10 May</td><td><span className="badge b-success">Resolved</span></td></tr>
      <tr><td className="link">#038</td><td>Damaged fitting on delivery</td><td className="link">Tambor 9</td><td>Client</td><td>Pieter N.</td><td>8 May</td><td><span className="badge b-warning">In progress</span></td></tr>
    </tbody>
  </table></div>
</div>
  );
}

export function SettingsPage() {
  return (
    <div className="animation-fade-in">
      
  <div className="tabs" style={{'marginBottom': '18px'}}>
    <button className="tab active" onClick={() => {}}>General</button>
    <button className="tab" onClick={() => {}}>Roles & permissions</button>
    <button className="tab" onClick={() => {}}>Project templates</button>
    <button className="tab" onClick={() => {}}>Fee rate card</button>
    <button className="tab" onClick={() => {}}>Integrations</button>
  </div>
  <div className="tab-panel active" data-tab-group="settings" data-tab="general">
    <div className="card"><div className="card-body">
      <div className="form-row">
        <label className="form-label">Company name</label>
        <input className="form-control" value="1-to-1 World" />
      </div>
      <div className="form-row">
        <label className="form-label">Trading currency</label>
        <select className="form-control"><option>ZAR (R)</option></select>
      </div>
      <div className="form-row">
        <label className="form-label">VAT number</label>
        <input className="form-control" value="4500123456" />
      </div>
      <div className="form-row">
        <label className="form-label">Default VAT rate (%)</label>
        <input type="number" className="form-control" value="15" />
      </div>
    </div></div>
  </div>
  <div className="tab-panel" data-tab-group="settings" data-tab="permissions">
    <div style={{'fontSize': '12px', 'color': 'var(--text-secondary)', 'marginBottom': '14px'}}>Create your own roles with any name. For each role, set what they can do per section. Staff only see sections they have access to.</div>
    <div className="perm-roles">
      <span style={{'fontSize': '12px', 'color': 'var(--text-tertiary)'}}>Roles:</span>
      <button className="perm-role-chip active" onClick={() => {}}>Senior designer</button>
      <button className="perm-role-chip" onClick={() => {}}>Estimator</button>
      <button className="perm-role-chip" onClick={() => {}}>Project manager</button>
      <button className="perm-role-chip" onClick={() => {}}>Warehouse</button>
      <button className="perm-role-chip" onClick={() => {}}>Sales rep</button>
      <button className="btn btn-sm" style={{'borderStyle': 'dashed'}}><i className="ti ti-plus"></i> New role</button>
    </div>
    <div className="card"><div className="card-head">
      <div className="card-title" id="role-title">Senior designer</div>
      <div style={{'display': 'flex', 'gap': '6px'}}>
        <button className="btn btn-sm">Duplicate</button>
        <button className="btn btn-sm btn-danger">Delete</button>
        <button className="btn btn-primary btn-sm">Save</button>
      </div>
    </div><div className="card-body">
      <div className="perm-row"><div className="perm-section"><i className="ti ti-home"></i> Dashboard</div><select className="form-control" style={{'width': '140px'}}><option>Full access</option><option>View only</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-address-book"></i> CRM</div><select className="form-control" style={{'width': '140px'}}><option>View only</option><option>Full access</option><option>Can edit</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-trending-up"></i> Sales pipeline</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>View only</option><option>Full access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-table"></i> Design tracker</div><select className="form-control" style={{'width': '140px'}}><option>Can edit</option><option>View only</option><option>Full access</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-layout-kanban"></i> Projects</div><select className="form-control" style={{'width': '140px'}}><option>Full access</option><option>Can edit</option><option>View only</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-calculator"></i> Design fee calc</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>View only</option><option>Full access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-clock"></i> Time tracking</div><select className="form-control" style={{'width': '140px'}}><option>Can edit (own)</option><option>Full access</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-package"></i> Products</div><select className="form-control" style={{'width': '140px'}}><option>View only</option><option>Full access</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-list-numbers"></i> BOQ maker</div><select className="form-control" style={{'width': '140px'}}><option>Can edit</option><option>View only</option><option>Full access</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-truck-delivery"></i> Orders</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>View only</option><option>Full access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-receipt"></i> Invoices</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>View only</option><option>Full access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-folder"></i> Documents</div><select className="form-control" style={{'width': '140px'}}><option>Full access</option><option>Can edit</option><option>View only</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-id-badge"></i> HR & people</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>View only</option><option>Full access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-chart-bar"></i> Reports</div><select className="form-control" style={{'width': '140px'}}><option>View only</option><option>Full access</option><option>No access</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-headset"></i> Support</div><select className="form-control" style={{'width': '140px'}}><option>Can edit</option><option>Full access</option><option>View only</option></select></div>
      <div className="perm-row"><div className="perm-section"><i className="ti ti-settings"></i> Settings</div><select className="form-control" style={{'width': '140px'}}><option>No access</option><option>Full access</option></select></div>
    </div></div>
    <div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)', 'marginTop': '12px', 'background': 'var(--bg-secondary)', 'padding': '10px 12px', 'borderRadius': 'var(--radius-md)', 'lineHeight': '1.6'}}><strong style={{'color': 'var(--text-primary)'}}>Full access</strong> — create, edit, delete. <strong style={{'color': 'var(--text-primary)'}}>Can edit</strong> — create and edit, no delete. <strong style={{'color': 'var(--text-primary)'}}>View only</strong> — read-only. <strong style={{'color': 'var(--text-primary)'}}>No access</strong> — section hidden from this role's navigation.</div>
  </div>
  <div className="tab-panel" data-tab-group="settings" data-tab="templates">
    <div style={{'fontSize': '12px', 'color': 'var(--text-secondary)', 'marginBottom': '14px'}}>Project templates define phases and custom fields. Add, remove, and reorder columns — changes apply to new projects.</div>
    <div style={{'display': 'flex', 'justifyContent': 'space-between', 'alignItems': 'center', 'marginBottom': '14px'}}>
      <div className="section-label" style={{'margin': '0'}}>Available templates</div>
      <button className="btn btn-primary btn-sm"><i className="ti ti-plus"></i> New template</button>
    </div>
    <div className="card" style={{'marginBottom': '14px'}}><table className="table">
      <thead><tr><th>Template name</th><th>Type</th><th>Phases</th><th>Custom fields</th><th>Projects using</th><th></th></tr></thead>
      <tbody>
        <tr><td>Design only (Signature)</td><td>Design</td><td>5 phases</td><td>8 fields</td><td>14</td><td><button className="btn btn-sm">Edit</button></td></tr>
        <tr><td>Design + Supply</td><td>Hybrid</td><td>6 phases</td><td>12 fields</td><td>8</td><td><button className="btn btn-sm">Edit</button></td></tr>
        <tr><td>Supply only</td><td>Supply</td><td>3 phases</td><td>4 fields</td><td>3</td><td><button className="btn btn-sm">Edit</button></td></tr>
        <tr><td>Modus standard</td><td>Hybrid</td><td>5 phases</td><td>10 fields</td><td>6</td><td><button className="btn btn-sm">Edit</button></td></tr>
      </tbody>
    </table></div>
    <div className="card"><div className="card-head"><div className="card-title">Editing: Design only (Signature)</div></div><div className="card-body">
      <div className="section-label">Phases (drag to reorder)</div>
      <div style={{'display': 'flex', 'flexDirection': 'column', 'gap': '6px', 'marginBottom': '18px'}}>
        <div style={{'display': 'flex', 'alignItems': 'center', 'gap': '9px', 'padding': '9px 12px', 'border': '0.5px solid var(--border)', 'borderRadius': 'var(--radius-md)'}}><i className="ti ti-grip-vertical" style={{'color': 'var(--text-tertiary)', 'cursor': 'grab'}}></i><span style={{'flex': '1', 'fontWeight': '500'}}>Stage 1 — Concept design</span><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Requires approval</label><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" /> Triggers invoice</label><button className="btn btn-sm btn-ghost"><i className="ti ti-x"></i></button></div>
        <div style={{'display': 'flex', 'alignItems': 'center', 'gap': '9px', 'padding': '9px 12px', 'border': '0.5px solid var(--border)', 'borderRadius': 'var(--radius-md)'}}><i className="ti ti-grip-vertical" style={{'color': 'var(--text-tertiary)', 'cursor': 'grab'}}></i><span style={{'flex': '1', 'fontWeight': '500'}}>Stage 2 — Schematic design</span><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Requires approval</label><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Triggers invoice</label><button className="btn btn-sm btn-ghost"><i className="ti ti-x"></i></button></div>
        <div style={{'display': 'flex', 'alignItems': 'center', 'gap': '9px', 'padding': '9px 12px', 'border': '0.5px solid var(--border)', 'borderRadius': 'var(--radius-md)'}}><i className="ti ti-grip-vertical" style={{'color': 'var(--text-tertiary)', 'cursor': 'grab'}}></i><span style={{'flex': '1', 'fontWeight': '500'}}>Stage 3 — Schematic 100%</span><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Requires approval</label><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" /> Triggers invoice</label><button className="btn btn-sm btn-ghost"><i className="ti ti-x"></i></button></div>
        <div style={{'display': 'flex', 'alignItems': 'center', 'gap': '9px', 'padding': '9px 12px', 'border': '0.5px solid var(--border)', 'borderRadius': 'var(--radius-md)'}}><i className="ti ti-grip-vertical" style={{'color': 'var(--text-tertiary)', 'cursor': 'grab'}}></i><span style={{'flex': '1', 'fontWeight': '500'}}>Stage 4 — Final design</span><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Requires approval</label><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Triggers invoice</label><button className="btn btn-sm btn-ghost"><i className="ti ti-x"></i></button></div>
        <div style={{'display': 'flex', 'alignItems': 'center', 'gap': '9px', 'padding': '9px 12px', 'border': '0.5px solid var(--border)', 'borderRadius': 'var(--radius-md)'}}><i className="ti ti-grip-vertical" style={{'color': 'var(--text-tertiary)', 'cursor': 'grab'}}></i><span style={{'flex': '1', 'fontWeight': '500'}}>Stage 5 — Snags / site visit</span><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" /> Requires approval</label><label style={{'display': 'flex', 'alignItems': 'center', 'gap': '5px', 'fontSize': '11px', 'color': 'var(--text-secondary)'}}><input type="checkbox" checked /> Triggers invoice</label><button className="btn btn-sm btn-ghost"><i className="ti ti-x"></i></button></div>
      </div>
      <button className="btn btn-sm" style={{'marginBottom': '18px'}}><i className="ti ti-plus"></i> Add phase</button>
      <div className="section-label">Custom fields (tracker columns)</div>
      <div className="card" style={{'marginBottom': '12px'}}><table className="table">
        <thead><tr><th>Field name</th><th>Type</th><th>Required</th><th></th></tr></thead>
        <tbody>
          <tr><td>SQM</td><td>Number</td><td>Yes</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
          <tr><td>Offering</td><td>Dropdown</td><td>Yes</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
          <tr><td>Delay reason</td><td>Dropdown</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
          <tr><td>Product approved</td><td>Yes/No</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
          <tr><td>Site visit date</td><td>Date</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
          <tr><td>Electrical sign-off</td><td>Yes/No</td><td>No</td><td><button className="btn btn-sm btn-ghost"><i className="ti ti-edit"></i></button></td></tr>
        </tbody>
      </table></div>
      <button className="btn btn-sm"><i className="ti ti-plus"></i> Add field</button>
      <div style={{'marginTop': '18px', 'display': 'flex', 'justifyContent': 'flex-end', 'gap': '6px'}}><button className="btn">Cancel</button><button className="btn btn-primary"><i className="ti ti-check"></i> Save template</button></div>
    </div></div>
  </div>
  <div className="tab-panel" data-tab-group="settings" data-tab="rates">
    <div style={{'fontSize': '12px', 'color': 'var(--text-secondary)', 'marginBottom': '14px'}}>Per-m² rates feeding the design fee calculator. Edit and save to update all future quotes.</div>
    <div className="card"><table className="table">
      <thead><tr><th>Zone</th><th>Concept</th><th>Schematic</th><th>Final design</th><th>Product budget</th></tr></thead>
      <tbody>
        <tr><td>Experiential living (30%)</td><td>R 180</td><td>R 144</td><td>R 117</td><td>R 1,050</td></tr>
        <tr><td>Secondary living (60%)</td><td>R 105</td><td>R 84</td><td>R 68.25</td><td>R 750</td></tr>
        <tr><td>Non-experiential (10%)</td><td>R 30</td><td>R 24</td><td>R 19.50</td><td>R 300</td></tr>
        <tr><td>Experiential landscape (40%)</td><td>R 140</td><td>R 112</td><td>R 91</td><td>R 825</td></tr>
        <tr><td>Secondary landscape (60%)</td><td>R 55</td><td>R 44</td><td>R 35.75</td><td>R 525</td></tr>
      </tbody>
    </table></div>
    <div style={{'marginTop': '14px', 'display': 'flex', 'justifyContent': 'flex-end', 'gap': '6px'}}><button className="btn btn-primary"><i className="ti ti-check"></i> Save rate card</button></div>
  </div>
  <div className="tab-panel" data-tab-group="settings" data-tab="integrations">
    <div className="card" style={{'marginBottom': '10px'}}><div className="card-body" style={{'display': 'flex', 'alignItems': 'center', 'gap': '14px'}}><div style={{'width': '42px', 'height': '42px', 'background': 'var(--bg-info)', 'borderRadius': 'var(--radius-md)', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center', 'color': 'var(--text-info)', 'fontWeight': '500'}}>X</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Xero</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Sync invoices and payments to accounting</div></div><span className="badge b-success">Connected</span><button className="btn btn-sm">Configure</button></div></div>
    <div className="card" style={{'marginBottom': '10px'}}><div className="card-body" style={{'display': 'flex', 'alignItems': 'center', 'gap': '14px'}}><div style={{'width': '42px', 'height': '42px', 'background': 'var(--bg-secondary)', 'borderRadius': 'var(--radius-md)', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center', 'color': 'var(--text-tertiary)', 'fontWeight': '500'}}>S</div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>SAGE</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Alternative accounting integration</div></div><button className="btn btn-sm">Connect</button></div></div>
    <div className="card"><div className="card-body" style={{'display': 'flex', 'alignItems': 'center', 'gap': '14px'}}><div style={{'width': '42px', 'height': '42px', 'background': 'var(--bg-info)', 'borderRadius': 'var(--radius-md)', 'display': 'flex', 'alignItems': 'center', 'justifyContent': 'center', 'color': 'var(--text-info)'}}><i className="ti ti-mail" style={{'fontSize': '20px'}}></i></div><div style={{'flex': '1'}}><div style={{'fontWeight': '500'}}>Resend</div><div style={{'fontSize': '11px', 'color': 'var(--text-tertiary)'}}>Transactional email delivery</div></div><span className="badge b-success">Connected</span><button className="btn btn-sm">Configure</button></div></div></div>
    </div>
  );
}

