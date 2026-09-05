import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Upload, 
  FileCheck, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  ArrowRight, 
  Search, 
  Hash, 
  ChevronRight,
  Sliders,
  Check
} from 'lucide-react';
import { API_BASE } from '../api_config';

export default function CadImportModal({ isOpen, onClose, onImportData }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Layer Settings, 3: Preview
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Inspection states
  const [inspecting, setInspecting] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [lightingLayer, setLightingLayer] = useState('');
  const [boundaryLayer, setBoundaryLayer] = useState('');
  const [defaultFloor, setDefaultFloor] = useState('Ground Floor');

  // Parsing states
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [previewSearch, setPreviewSearch] = useState('');

  // Error handling
  const [error, setError] = useState(null);

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setInspecting(false);
    setInspectData(null);
    setLightingLayer('');
    setBoundaryLayer('');
    setDefaultFloor('Ground Floor');
    setParsing(false);
    setParseResult(null);
    setPreviewSearch('');
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.dwg')) {
      setError('Please upload a valid AutoCAD drawing (.dwg) file.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setInspecting(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(API_BASE + '/api/cad/inspect', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to inspect CAD drawing layers.');
      }

      const data = await res.json();
      setInspectData(data);
      setLightingLayer(data.suggestedLightingLayer || '');
      setBoundaryLayer(data.suggestedBoundaryLayer || '*');
      if (data.availableFloors && data.availableFloors.length > 0) {
        setDefaultFloor(data.availableFloors[0]);
      }
      setStep(2);
    } catch (err) {
      console.error('CAD inspect error:', err);
      setError(err.message || 'Error inspecting DWG file.');
    } finally {
      setInspecting(false);
    }
  };

  const handleRunParse = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (lightingLayer) formData.append('lighting_layer', lightingLayer);
    if (boundaryLayer) formData.append('boundary_layer', boundaryLayer);
    if (defaultFloor) formData.append('default_floor', defaultFloor);

    try {
      const res = await fetch(API_BASE + '/api/cad/parse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to parse and count fittings.');
      }

      const result = await res.json();
      setParseResult(result);
      setStep(3);
    } catch (err) {
      console.error('CAD parse error:', err);
      setError(err.message || 'Error processing CAD drawing.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = (mode) => {
    if (!parseResult || !parseResult.items) return;
    const formatted = parseResult.items.map(item => ({
      floor: item.floor || 'Ground Floor',
      area: item.area || 'Landscape',
      tag: (item.tag || '').trim().toUpperCase(),
      qty: Number(item.qty) || 1,
    }));

    onImportData(formatted, mode);
    handleClose();
  };

  // Filtered preview items
  const filteredItems = useMemo(() => {
    if (!parseResult || !parseResult.items) return [];
    if (!previewSearch.trim()) return parseResult.items;
    const q = previewSearch.toLowerCase();
    return parseResult.items.filter(item => 
      (item.floor || '').toLowerCase().includes(q) ||
      (item.area || '').toLowerCase().includes(q) ||
      (item.tag || '').toLowerCase().includes(q)
    );
  }, [parseResult, previewSearch]);

  // Lighting layers options
  const lightingLayerOptions = useMemo(() => {
    if (!inspectData || !inspectData.layers) return [];
    return inspectData.layers.filter(l => l.inserts > 0);
  }, [inspectData]);

  // Boundary layers options
  const boundaryLayerOptions = useMemo(() => {
    if (!inspectData || !inspectData.layers) return [];
    return inspectData.layers.filter(l => l.closedPolylines > 0);
  }, [inspectData]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in'>
      <div 
        className='flex flex-col w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden'
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]'>
          <div className='flex items-center gap-3'>
            <div className='p-2 rounded-lg bg-blue-500/10 text-blue-500'>
              <Compass size={20} />
            </div>
            <div>
              <h2 className='text-base font-semibold text-[var(--text-primary)]'>
                Import CAD Plan (.dwg)
              </h2>
              <p className='text-xs text-[var(--text-secondary)]'>
                Automatically count light fittings, tags, and rooms from AutoCAD drawings
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className='p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors'
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-8 py-2.5 bg-[var(--bg-primary)] border-b border-[var(--border)] text-xs">
          <div className={'flex items-center gap-2 font-medium ' + (step >= 1 ? 'text-blue-500' : 'text-[var(--text-secondary)]')}>
            <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[10px] ' + (step >= 1 ? 'bg-blue-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)]')}>1</span>
            Upload File
          </div>
          <ChevronRight size={14} className="text-[var(--text-secondary)] opacity-50" />
          <div className={'flex items-center gap-2 font-medium ' + (step >= 2 ? 'text-blue-500' : 'text-[var(--text-secondary)]')}>
            <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[10px] ' + (step >= 2 ? 'bg-blue-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)]')}>2</span>
            Layer Settings
          </div>
          <ChevronRight size={14} className="text-[var(--text-secondary)] opacity-50" />
          <div className={'flex items-center gap-2 font-medium ' + (step >= 3 ? 'text-blue-500' : 'text-[var(--text-secondary)]')}>
            <span className={'w-5 h-5 rounded-full flex items-center justify-center text-[10px] ' + (step >= 3 ? 'bg-blue-500 text-white' : 'bg-[var(--bg-secondary)] border border-[var(--border)]')}>3</span>
            Preview & Confirm
          </div>
        </div>

        {/* Modal Body */}
        <div className='p-6 overflow-y-auto flex-1 space-y-4'>
          {error && (
            <div className='flex items-start gap-3 p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg'>
              <AlertCircle size={16} className='shrink-0 mt-0.5' />
              <div className='flex-1'>{error}</div>
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className='space-y-4'>
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                className={'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ' + (
                  dragOver 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-[var(--border)] hover:border-blue-500/50 bg-[var(--bg-secondary)]/50'
                )}
                onClick={() => {
                  const el = document.getElementById('cad-file-input');
                  if (el) el.click();
                }}
              >
                <input 
                  id='cad-file-input'
                  type='file' 
                  accept='.dwg'
                  className='hidden'
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <div className='p-3 rounded-full bg-blue-500/10 text-blue-500 mb-3'>
                  <Upload size={24} />
                </div>
                <h3 className='text-sm font-semibold text-[var(--text-primary)]'>
                  Choose a CAD Drawing (.dwg) or drag & drop here
                </h3>
                <p className='text-xs text-[var(--text-secondary)] mt-1'>
                  Supports AutoCAD binary drawings (AutoCAD R13 through 2024+)
                </p>
                <div className='mt-4 px-3 py-1.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)]'>
                  Browse Computer
                </div>
              </div>

              {inspecting && (
                <div className='flex items-center justify-center gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)]'>
                  <RefreshCw size={16} className='animate-spin text-blue-500' />
                  <span>Scanning drawing entities, blocks, layers, and text tags...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Layer Settings */}
          {step === 2 && inspectData && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs'>
                <div className='flex items-center gap-2'>
                  <FileCheck size={16} className='text-blue-500' />
                  <span className='font-semibold text-[var(--text-primary)]'>{file?.name}</span>
                  <span className='text-[var(--text-secondary)]'>({(file?.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <span className='text-blue-500 font-medium'>
                  {inspectData.totalEntities?.toLocaleString()} entities scanned
                </span>
              </div>

              <div className='space-y-3 bg-[var(--bg-secondary)]/50 p-4 rounded-xl border border-[var(--border)]'>
                <h4 className='text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2'>
                  <Sliders size={14} className='text-blue-500' /> Layer Mapping Configuration
                </h4>

                {/* Lighting Layer */}
                <div>
                  <label className='block text-[11px] font-medium text-[var(--text-secondary)] mb-1'>
                    Lighting / Fittings Layer (Blocks & MText Tags)
                  </label>
                  <select 
                    className='select select-sm w-full text-xs'
                    value={lightingLayer}
                    onChange={e => setLightingLayer(e.target.value)}
                  >
                    {lightingLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.inserts} blocks {l.isLightingCandidate ? '★ (Lighting Candidate)' : ''}
                      </option>
                    ))}
                    <option value='*'>All Layers with Blocks (*)</option>
                  </select>
                  <p className='text-[10px] text-[var(--text-secondary)] mt-1'>
                    Fittings on this layer are extracted and paired with their nearest plan code tag.
                  </p>
                </div>

                {/* Boundary Layer */}
                <div>
                  <label className='block text-[11px] font-medium text-[var(--text-secondary)] mb-1'>
                    Room / Area Boundary Layer (Closed Polylines)
                  </label>
                  <select 
                    className='select select-sm w-full text-xs'
                    value={boundaryLayer}
                    onChange={e => setBoundaryLayer(e.target.value)}
                  >
                    <option value='*'>All Closed Polylines in Drawing (* Recommended)</option>
                    {boundaryLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.closedPolylines} closed areas {l.isBoundaryCandidate ? '★ (Area Candidate)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className='text-[10px] text-[var(--text-secondary)] mt-1'>
                    Defines room boundaries. Fittings inside each closed boundary take its room name.
                  </p>
                </div>

                {/* Default Floor */}
                <div>
                  <label className='block text-[11px] font-medium text-[var(--text-secondary)] mb-1'>
                    Default Floor Name (if not specified inside boundary)
                  </label>
                  <input 
                    type='text' 
                    className='input input-sm w-full text-xs'
                    value={defaultFloor}
                    onChange={e => setDefaultFloor(e.target.value)}
                    placeholder='e.g. Ground Floor, Basement, Level 1'
                  />
                  {inspectData.availableFloors && inspectData.availableFloors.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 mt-2'>
                      <span className='text-[10px] text-[var(--text-secondary)] self-center mr-1'>Detected floors:</span>
                      {inspectData.availableFloors.map(fl => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setDefaultFloor(fl)}
                          className={'px-2 py-0.5 rounded text-[10px] border transition-colors ' + (
                            defaultFloor === fl 
                              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 font-medium' 
                              : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          )}
                        >
                          {fl}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {parsing && (
                <div className='flex items-center justify-center gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-[var(--text-primary)]'>
                  <RefreshCw size={16} className='animate-spin text-blue-500' />
                  <span>Processing geometry, resolving tags, and aggregating room counts...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview & Confirm */}
          {step === 3 && parseResult && (
            <div className='space-y-4'>
              {/* Summary Stats */}
              <div className='grid grid-cols-3 gap-3'>
                <div className='p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center'>
                  <div className='text-xl font-bold text-blue-500'>
                    {parseResult.summary?.totalFittings || 0}
                  </div>
                  <div className='text-[11px] text-[var(--text-secondary)] font-medium'>
                    Total Fittings Counted
                  </div>
                </div>
                <div className='p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center'>
                  <div className='text-xl font-bold text-purple-500'>
                    {parseResult.summary?.uniqueTags || 0}
                  </div>
                  <div className='text-[11px] text-[var(--text-secondary)] font-medium'>
                    Unique Plan Codes (Tags)
                  </div>
                </div>
                <div className='p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center'>
                  <div className='text-xl font-bold text-emerald-500'>
                    {parseResult.summary?.totalRooms || 0}
                  </div>
                  <div className='text-[11px] text-[var(--text-secondary)] font-medium'>
                    Rooms / Areas Detected
                  </div>
                </div>
              </div>

              {/* Filter & Search */}
              <div className='flex items-center justify-between gap-3'>
                <div className='flex items-center bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-1.5 flex-1'>
                  <Search size={14} className='text-[var(--text-secondary)] mr-2' />
                  <input 
                    type='text' 
                    placeholder='Search floor, room, or tag...'
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    className='bg-transparent border-none outline-none text-xs text-[var(--text-primary)] w-full'
                  />
                  {previewSearch && (
                    <button onClick={() => setPreviewSearch('')} className='text-[var(--text-secondary)] hover:text-[var(--text-primary)]'>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <span className='text-[11px] text-[var(--text-secondary)] whitespace-nowrap'>
                  Showing {filteredItems.length} of {parseResult.items?.length || 0} line items
                </span>
              </div>

              {/* Table Preview */}
              <div className='border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-primary)]'>
                <div className='max-h-64 overflow-y-auto'>
                  <table className='w-full text-left text-xs border-collapse'>
                    <thead className='sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold uppercase text-[10px]'>
                      <tr>
                        <th className='px-4 py-2'>Floor Level</th>
                        <th className='px-4 py-2'>Room / Area</th>
                        <th className='px-4 py-2'>Plan Code (Tag)</th>
                        <th className='px-4 py-2 text-right'>Quantity</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-[var(--border)] text-[var(--text-primary)]'>
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className='hover:bg-[var(--bg-secondary)]/50 transition-colors'>
                          <td className='px-4 py-2 text-[var(--text-secondary)]'>{item.floor}</td>
                          <td className='px-4 py-2 font-medium'>{item.area}</td>
                          <td className='px-4 py-2'>
                            <span className='px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20'>
                              {item.tag}
                            </span>
                          </td>
                          <td className='px-4 py-2 text-right font-bold text-[var(--text-primary)]'>
                            {item.qty}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className='text-center py-6 text-xs text-[var(--text-secondary)]'>
                            No matching items found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className='flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]'>
          <div>
            {step === 2 && (
              <button 
                className='btn btn-ghost btn-xs text-xs'
                onClick={() => setStep(1)}
              >
                ← Back to Upload
              </button>
            )}
            {step === 3 && (
              <button 
                className='btn btn-ghost btn-xs text-xs'
                onClick={() => setStep(2)}
              >
                ← Adjust Layer Settings
              </button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <button 
              className='btn btn-ghost btn-sm text-xs'
              onClick={handleClose}
            >
              Cancel
            </button>

            {step === 2 && (
              <button 
                className='btn btn-primary btn-sm text-xs flex items-center gap-1.5'
                onClick={handleRunParse}
                disabled={parsing || !lightingLayer}
              >
                {parsing ? <RefreshCw size={14} className='animate-spin' /> : <CheckCircle2 size={14} />}
                Analyse & Count Drawing
              </button>
            )}

            {step === 3 && (
              <>
                <button 
                  className='btn btn-secondary btn-sm text-xs'
                  onClick={() => handleConfirm('append')}
                  title='Adds CAD items to existing Count-Up rows'
                >
                  Append to Count-Up
                </button>
                <button 
                  className='btn btn-primary btn-sm text-xs flex items-center gap-1'
                  onClick={() => handleConfirm('replace')}
                  title='Replaces existing Count-Up rows with CAD items'
                >
                  <Check size={14} /> Replace Count-Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
