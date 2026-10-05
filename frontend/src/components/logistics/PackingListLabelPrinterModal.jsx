import React, { useState, useMemo } from 'react';
import { 
  X, Printer, Tag, Box, Settings, CheckSquare, Square, 
  ChevronLeft, ChevronRight, Layers, AlertCircle, Sparkles, Filter, RefreshCw,
  RotateCw
} from 'lucide-react';
import { 
  generateCode128Svg, 
  drawCode128OnCanvas, 
  renderLabelToDataUrl,
  evaluateTokens, 
  DEFAULT_LABEL_TEMPLATES 
} from '../../utils/labelGenerator';

export default function PackingListLabelPrinterModal({
  isOpen,
  onClose,
  packingList,
  project,
  order,
  templates = DEFAULT_LABEL_TEMPLATES,
  onOpenTemplateManager
}) {
  if (!isOpen || !packingList) return null;

  // Active print mode: 'item' (individual fittings) or 'box' (outer box manifest)
  const [mode, setMode] = useState('item'); 
  
  // Available templates matching current mode (or allow user to pick any)
  const availableTemplates = templates && templates.length > 0 ? templates : DEFAULT_LABEL_TEMPLATES;
  const filteredTemplates = availableTemplates.filter(t => t.type === mode);
  const activeTemplatePool = filteredTemplates.length > 0 ? filteredTemplates : availableTemplates;

  // Selected Template ID
  const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplatePool[0]?.id || availableTemplates[0]?.id);
  const currentTemplate = availableTemplates.find(t => t.id === selectedTemplateId) || availableTemplates[0];

  // Print Rotation state (degrees: 0, 90, 180, 270)
  const [printRotation, setPrintRotation] = useState(currentTemplate?.rotation ?? 0);

  // When mode changes, switch to a template that matches the mode if possible
  const handleModeChange = (newMode) => {
    setMode(newMode);
    const matching = availableTemplates.filter(t => t.type === newMode);
    if (matching.length > 0) {
      setSelectedTemplateId(matching[0].id);
      setPrintRotation(matching[0].rotation ?? 0);
    }
  };

  // Raw items from the packing list
  const plItems = packingList.items || [];

  // Item mode selection state: { [itemId]: { selected: boolean, qtyToPrint: number } }
  const [itemSelections, setItemSelections] = useState(() => {
    const init = {};
    plItems.forEach(item => {
      const q = Math.max(1, Number(item.qtyDelivered ?? item.qty) || 1);
      init[item.id] = { selected: true, qtyToPrint: q };
    });
    return init;
  });

  // Box mode selection state: { [boxName]: boolean }
  const boxGroups = useMemo(() => {
    const map = {};
    plItems.forEach(item => {
      const boxName = (item.boxNumber || 'Box 1').trim();
      if (!map[boxName]) {
        map[boxName] = {
          name: boxName,
          items: [],
          totalUnits: 0
        };
      }
      const q = Number(item.qtyDelivered ?? item.qty) || 0;
      map[boxName].items.push(item);
      map[boxName].totalUnits += q;
    });
    return Object.values(map);
  }, [plItems]);

  const [boxSelections, setBoxSelections] = useState(() => {
    const init = {};
    boxGroups.forEach(b => {
      init[b.name] = true;
    });
    return init;
  });

  // Current preview page index
  const [previewIndex, setPreviewIndex] = useState(0);

  // Generate complete list of printable label payload contexts
  const generatedLabels = useMemo(() => {
    const labels = [];
    const totalBoxesCount = boxGroups.length || 1;

    if (mode === 'item') {
      plItems.forEach(item => {
        const sel = itemSelections[item.id];
        if (!sel || !sel.selected || sel.qtyToPrint <= 0) return;

        const count = Number(sel.qtyToPrint);
        for (let i = 1; i <= count; i++) {
          const serialText = count > 1 ? `${i} of ${count}` : '1 of 1';
          labels.push({
            id: `${item.id}_${i}`,
            context: {
              item: {
                ...item,
                serial: serialText,
                qty: count
              },
              project: project || {},
              order: order || {},
              packingList: packingList || {},
              box: {
                number: item.boxNumber || 'Box 1',
                index: 1,
                total: totalBoxesCount
              }
            }
          });
        }
      });
    } else {
      // Box Manifest Mode
      boxGroups.forEach((b, bIdx) => {
        if (!boxSelections[b.name]) return;

        // Generate manifest lines
        const manifestSummary = b.items
          .map(it => `${it.qtyDelivered || it.qty || 1}x ${it.code || it.oneOneCode || 'Item'} (${it.area || it.floor || 'Site'})`)
          .join('\n');

        labels.push({
          id: `box_${b.name}`,
          context: {
            item: b.items[0] || {},
            project: project || {},
            order: order || {},
            packingList: packingList || {},
            box: {
              number: b.name,
              index: bIdx + 1,
              total: totalBoxesCount,
              itemsCount: b.totalUnits,
              manifestSummary: manifestSummary,
              manifestItems: b.items
            }
          }
        });
      });
    }

    return labels;
  }, [mode, plItems, itemSelections, boxGroups, boxSelections, project, order, packingList]);

  // Adjust preview index if generatedLabels shrinks
  const activePreviewIndex = Math.min(previewIndex, Math.max(0, generatedLabels.length - 1));
  const activeLabel = generatedLabels[activePreviewIndex] || null;

  // Real-time canvas rasterized preview matching exact 203 DPI print engine output
  const previewDataUrl = useMemo(() => {
    if (!activeLabel || !currentTemplate) return null;
    return renderLabelToDataUrl(currentTemplate, activeLabel.context, printRotation || 0);
  }, [activeLabel, currentTemplate, printRotation]);

  // Toggle item selection
  const handleToggleItem = (itemId) => {
    setItemSelections(prev => {
      const cur = prev[itemId] || { selected: false, qtyToPrint: 1 };
      return {
        ...prev,
        [itemId]: { ...cur, selected: !cur.selected }
      };
    });
  };

  // Change quantity for an item
  const handleItemQtyChange = (itemId, val) => {
    const q = Math.max(1, parseInt(val, 10) || 1);
    setItemSelections(prev => {
      const cur = prev[itemId] || { selected: true, qtyToPrint: 1 };
      return {
        ...prev,
        [itemId]: { ...cur, qtyToPrint: q }
      };
    });
  };

  // Toggle all items
  const handleSelectAllItems = (select) => {
    setItemSelections(prev => {
      const next = { ...prev };
      plItems.forEach(it => {
        next[it.id] = {
          selected: select,
          qtyToPrint: next[it.id]?.qtyToPrint || Number(it.qtyDelivered ?? it.qty) || 1
        };
      });
      return next;
    });
  };

  // Toggle box selection
  const handleToggleBox = (boxName) => {
    setBoxSelections(prev => ({
      ...prev,
      [boxName]: !prev[boxName]
    }));
  };

  // Toggle all boxes
  const handleSelectAllBoxes = (select) => {
    const next = {};
    boxGroups.forEach(b => {
      next[b.name] = select;
    });
    setBoxSelections(next);
  };

  // Trigger high-precision continuous thermal roll printing via canvas rasterization (203 DPI)
  const handlePrint = () => {
    if (generatedLabels.length === 0) {
      alert("No labels selected to print. Check at least one item or box.");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert("Please allow pop-ups to open the thermal print dialog.");
      return;
    }

    const { widthMm = 50, heightMm = 32 } = currentTemplate;
    const effectiveRotation = printRotation !== undefined ? printRotation : (currentTemplate.rotation || 0);

    // Rasterize every label onto a 203 DPI canvas with the exact rotation baked in
    const imagesHtml = generatedLabels.map((lbl, idx) => {
      const dataUrl = renderLabelToDataUrl(currentTemplate, lbl.context, effectiveRotation);
      return `
        <div class="thermal-label-page">
          <img src="${dataUrl}" class="thermal-img" alt="Label ${idx + 1}" />
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Argox O4-250 Thermal Print - ${packingList.id}</title>
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${widthMm}mm;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .thermal-label-page {
            width: ${widthMm}mm;
            height: ${heightMm}mm;
            page-break-before: auto;
            page-break-inside: avoid;
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #ffffff;
          }
          .thermal-img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            display: block;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
          }
          @media screen {
            body {
              background: #f1f5f9;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
            }
            .thermal-label-page {
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              border: 1px solid #cbd5e1;
            }
          }
        </style>
      </head>
      <body>
        ${imagesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1200px',
          height: '92vh',
          maxHeight: '880px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
              color: 'var(--text-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Printer size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Thermal Label Printing Engine
                </h2>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--text-info)',
                  fontFamily: 'monospace'
                }}>
                  Argox O4-250 (203 DPI)
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Target Packing List: <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{packingList.id}</strong> • Project: <strong style={{ color: 'var(--text-primary)' }}>{project?.name || packingList.projectName || 'One to One'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onOpenTemplateManager}
              style={{ border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              title="Configure label sizes, templates and variables"
            >
              <Settings size={14} /> Template Designer
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* WORKSPACE TOOLBAR & CONFIGURATION */}
        <div style={{
          padding: '12px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          flexShrink: 0
        }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button
              onClick={() => handleModeChange('item')}
              style={{
                border: 'none',
                background: mode === 'item' ? 'var(--text-info)' : 'transparent',
                color: mode === 'item' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Tag size={13} /> Item Fitting Labels ({plItems.length})
            </button>
            <button
              onClick={() => handleModeChange('box')}
              style={{
                border: 'none',
                background: mode === 'box' ? 'var(--text-info)' : 'transparent',
                color: mode === 'box' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Box size={13} /> Box Manifest Stickers ({boxGroups.length})
            </button>
          </div>

          {/* Template Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Template:
            </span>
            <select
              value={selectedTemplateId}
              onChange={e => {
                setSelectedTemplateId(e.target.value);
                const found = availableTemplates.find(t => t.id === e.target.value);
                setPrintRotation(found?.rotation ?? 0);
              }}
              className="form-control"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                minWidth: '220px'
              }}
            >
              {availableTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.widthMm}×{t.heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Rotation & Orientation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '3px 8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RotateCw size={12} /> Rotation:
            </span>
            <select
              value={printRotation}
              onChange={e => setPrintRotation(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <option value="0">0° (Standard)</option>
              <option value="90">90° (Clockwise)</option>
              <option value="180">180° (Inverted)</option>
              <option value="270">270° (Counter-CW)</option>
            </select>
          </div>

          {/* Master Print Action */}
          <button
            className="btn btn-primary"
            onClick={handlePrint}
            disabled={generatedLabels.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
            }}
          >
            <Printer size={16} /> Print {generatedLabels.length} {generatedLabels.length === 1 ? 'Label' : 'Labels'}
          </button>
        </div>

        {/* MAIN BODY: 2 COLUMN SPLIT */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* LEFT COLUMN: SELECTION & QUANTITY OVERRIDES (60%) */}
          <div style={{
            flex: '0 0 60%',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Column Header */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {mode === 'item' ? 'Packed Hardware Lines' : 'Shipping Cartons & Boxes'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  Select items and review print quantities
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => mode === 'item' ? handleSelectAllItems(true) : handleSelectAllBoxes(true)}
                  style={{ fontSize: '11px', color: 'var(--text-info)' }}
                >
                  Select All
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => mode === 'item' ? handleSelectAllItems(false) : handleSelectAllBoxes(false)}
                  style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {mode === 'item' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '36px' }}>Print</th>
                      <th style={{ padding: '8px 10px' }}>Item Code & Description</th>
                      <th style={{ padding: '8px 10px' }}>Area / Floor</th>
                      <th style={{ padding: '8px 10px' }}>Box</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Packed Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Copies to Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plItems.map(item => {
                      const sel = itemSelections[item.id] || { selected: false, qtyToPrint: 1 };
                      const packedQty = Number(item.qtyDelivered ?? item.qty) || 0;

                      return (
                        <tr 
                          key={item.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: sel.selected ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleItem(item.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: sel.selected ? 'var(--text-info)' : 'var(--text-tertiary)', padding: 0 }}
                            >
                              {sel.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                              {item.code || item.oneOneCode || 'N/A'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                              {item.description || item.name || 'Hardware Fitting'}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                            <div>{item.floor || '—'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.area || '—'}</div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border)',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {item.boxNumber || 'Box 1'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {packedQty}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              disabled={!sel.selected}
                              value={sel.qtyToPrint}
                              onChange={e => handleItemQtyChange(item.id, e.target.value)}
                              className="form-control"
                              style={{
                                width: '64px',
                                textAlign: 'center',
                                padding: '3px 6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                opacity: sel.selected ? 1 : 0.4
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* Box Manifest Mode List */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {boxGroups.map((box, bIdx) => {
                    const isSelected = !!boxSelections[box.name];
                    return (
                      <div
                        key={box.name}
                        onClick={() => handleToggleBox(box.name)}
                        style={{
                          border: isSelected ? '1px solid var(--text-info)' : '1px solid var(--border)',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: isSelected ? 'var(--text-info)' : 'var(--text-tertiary)' }}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {box.name}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                (Box {bIdx + 1} of {boxGroups.length})
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {box.items.length} line items • <strong>{box.totalUnits} total units</strong> inside
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-info)' }}>
                          1 Label Copy
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE VISUAL PREVIEW (40%) */}
          <div style={{
            flex: '0 0 40%',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Preview Toolbar */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Live Thermal Roll Preview
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                  Scaled 1:1 Argox O4-250 Continuous Feed
                </span>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={activePreviewIndex <= 0}
                  onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                  style={{ padding: '3px 6px' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {generatedLabels.length > 0 ? `${activePreviewIndex + 1} of ${generatedLabels.length}` : '0 of 0'}
                </span>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={activePreviewIndex >= generatedLabels.length - 1}
                  onClick={() => setPreviewIndex(prev => Math.min(generatedLabels.length - 1, prev + 1))}
                  style={{ padding: '3px 6px' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Preview Stage */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a'
            }}>
              {activeLabel && previewDataUrl ? (
                <div>
                  {/* Physical Label Canvas Preview */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '4px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <img 
                      src={previewDataUrl} 
                      alt="Thermal Label Preview" 
                      style={{
                        maxWidth: '360px',
                        maxHeight: '360px',
                        display: 'block',
                        imageRendering: 'pixelated',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>

                  <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                    Label Size: <strong>{currentTemplate.widthMm}mm × {currentTemplate.heightMm}mm</strong> • Continuous Roll • Rotation: <strong>{printRotation || 0}°</strong>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <AlertCircle size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>No labels selected</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Check at least one item on the left to view the preview</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
