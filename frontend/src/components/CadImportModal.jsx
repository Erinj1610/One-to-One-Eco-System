import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Upload, 
  FileCheck, 
  Layers, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  RefreshCw, 
  X, 
  ArrowRight, 
  Search, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { API_BASE } from '../api_config';

export default function CadImportModal({ isOpen, onClose, onImportData }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Layer Settings, 3: Preview
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [engineVersion, setEngineVersion] = useState('2.0'); // '2.0' (Smart) or '1.0' (Classic)
  const [showCadGuide, setShowCadGuide] = useState(true);

  // Inspection states
  const [inspecting, setInspecting] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [unstandardizedPrompt, setUnstandardizedPrompt] = useState(false);
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
    setUnstandardizedPrompt(false);
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

  const runParseWithEngine = async (engineToUse, targetFile = file, lightLayer = lightingLayer, boundLayer = boundaryLayer, floorName = defaultFloor) => {
    if (!targetFile) return;
    setParsing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', targetFile);
    formData.append('engine', engineToUse);
    if (lightLayer) formData.append('lighting_layer', lightLayer);
    if (boundLayer) formData.append('boundary_layer', boundLayer);
    if (floorName) formData.append('default_floor', floorName);

    try {
      const res = await fetch(API_BASE + '/api/cad/parse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to calculate CAD counts.');
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
      const lightLayer = data.suggestedLightingLayer || '*';
      const boundLayer = data.suggestedBoundaryLayer || '*';
      const floorName = (data.availableFloors && data.availableFloors.length > 0) ? data.availableFloors[0] : 'Ground Floor';

      setLightingLayer(lightLayer);
      setBoundaryLayer(boundLayer);
      setDefaultFloor(floorName);

      const hasStandardLayers = Boolean(data.isStandardized || (data.standardLayersFound && data.standardLayersFound.length > 0));

      if (!hasStandardLayers) {
        // Halt automatic parse: Prompt user that standard 0- layers were not found
        setUnstandardizedPrompt(true);
        return;
      }

      // Standard layers found: run parse immediately
      setUnstandardizedPrompt(false);
      await runParseWithEngine(engineVersion, selectedFile, lightLayer, boundLayer, floorName);
    } catch (err) {
      console.error('CAD inspect error:', err);
      setError(err.message || 'Error processing DWG file.');
    } finally {
      setInspecting(false);
    }
  };

  const handleRunParse = () => {
    runParseWithEngine(engineVersion, file, lightingLayer, boundaryLayer, defaultFloor);
  };

  const handleConfirm = (mode) => {
    if (!parseResult || !parseResult.items) return;
    const formatted = parseResult.items.map(item => ({
      floor: item.floor || 'Ground Floor',
      area: item.area || 'Landscape',
      tag: (item.tag || '').trim().toUpperCase(),
      qty: Math.max(0.01, parseFloat(item.qty) || 1),
      unit: item.unit || (item.itemType === 'linear_led' ? 'm' : 'pcs'),
      itemType: item.itemType || 'fixture',
      lengthMeters: Number(item.lengthMeters) || 0,
      runIndex: Number(item.runIndex) || 0,
      notes: item.notes || '',
      driver: item.driver || '',
      accessories: item.accessories || []
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        background: 'var(--bg-secondary, #1e222d)',
        border: '1px solid var(--border, #2e3545)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border, #2e3545)',
          background: 'var(--bg-primary, #151821)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                Import CAD Plan (.dwg)
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                Auto-extract light fittings, tags & rooms directly from AutoCAD drawings
              </div>
            </div>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={handleClose}
            style={{ padding: '6px', borderRadius: '6px', color: 'var(--text-secondary, #94a3b8)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          background: 'var(--bg-primary, #151821)',
          borderBottom: '1px solid var(--border, #2e3545)',
          fontSize: '11.5px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 1 ? 700 : 500,
            color: step >= 1 ? '#3b82f6' : 'var(--text-secondary, #64748b)'
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              background: step >= 1 ? '#3b82f6' : 'var(--bg-secondary, #1e222d)',
              color: step >= 1 ? '#ffffff' : 'var(--text-secondary, #64748b)',
              border: step >= 1 ? 'none' : '1px solid var(--border, #2e3545)'
            }}>1</span>
            1. Select Drawing
          </div>

          <ChevronRight size={14} style={{ color: 'var(--text-secondary, #64748b)', opacity: 0.5 }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 2 ? 700 : 500,
            color: step >= 2 ? '#3b82f6' : 'var(--text-secondary, #64748b)'
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              background: step >= 2 ? '#3b82f6' : 'var(--bg-secondary, #1e222d)',
              color: step >= 2 ? '#ffffff' : 'var(--text-secondary, #64748b)',
              border: step >= 2 ? 'none' : '1px solid var(--border, #2e3545)'
            }}>2</span>
            2. Layer Settings
          </div>

          <ChevronRight size={14} style={{ color: 'var(--text-secondary, #64748b)', opacity: 0.5 }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 3 ? 700 : 500,
            color: step >= 3 ? '#3b82f6' : 'var(--text-secondary, #64748b)'
          }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              background: step >= 3 ? '#3b82f6' : 'var(--bg-secondary, #1e222d)',
              color: step >= 3 ? '#ffffff' : 'var(--text-secondary, #64748b)',
              border: step >= 3 ? 'none' : '1px solid var(--border, #2e3545)'
            }}>3</span>
            3. Preview & Populate
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '12px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* STEP 1: UPLOAD DRAG-AND-DROP */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* ENGINE MODE SELECTOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CAD Ingestion Engine
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <div 
                    onClick={() => setEngineVersion('2.0')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: engineVersion === '2.0' ? '2px solid #3b82f6' : '1px solid var(--border, #2e3545)',
                      background: engineVersion === '2.0' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary, #1e222d)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: engineVersion === '2.0' ? '#60a5fa' : 'var(--text-primary, #ffffff)' }}>
                        <Zap size={15} style={{ color: '#3b82f6' }} />
                        <span>Engine 2.0</span>
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#3b82f6', color: '#ffffff', fontWeight: 700 }}>RECOMMENDED</span>
                      </div>
                      {engineVersion === '2.0' && <CheckCircle2 size={16} color="#3b82f6" />}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Smart & Zero Prep:</strong> Visual shape fingerprinting & wall-aware obstacle raycasting. No manual polylines needed!
                    </div>
                  </div>

                  <div 
                    onClick={() => setEngineVersion('1.0')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: engineVersion === '1.0' ? '2px solid #3b82f6' : '1px solid var(--border, #2e3545)',
                      background: engineVersion === '1.0' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary, #1e222d)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: engineVersion === '1.0' ? '#60a5fa' : 'var(--text-primary, #ffffff)' }}>
                        <Layers size={15} style={{ color: '#94a3b8' }} />
                        <span>Engine 1.0</span>
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: 'var(--bg-primary, #151821)', color: 'var(--text-secondary, #94a3b8)', border: '1px solid var(--border, #2e3545)' }}>CLASSIC</span>
                      </div>
                      {engineVersion === '1.0' && <CheckCircle2 size={16} color="#3b82f6" />}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Layer-Based:</strong> Requires CAD prep with standard layers (<code>E-LUM-SP</code>) and closed boundary polylines.
                    </div>
                  </div>
                </div>
              </div>

              {unstandardizedPrompt && inspectData ? (
                <div style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#fbbf24'
                      }}>
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fef3c7' }}>
                            Standard CAD Layers Not Found
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.25)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontWeight: 700
                          }}>
                            UNSTANDARDIZED DRAWING
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px', lineHeight: '1.5' }}>
                          File <strong>{file?.name}</strong> was inspected ({inspectData.totalEntities?.toLocaleString()} entities, {inspectData.totalLayers} layers), but none of the dedicated <code>0-</code> precision layers were detected.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUnstandardizedPrompt(false);
                        setFile(null);
                        setInspectData(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary, #94a3b8)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Clear File"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* MISSING SPECIFICATION PILLS */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Missing Precision Layers:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(inspectData.standardLayersMissing && inspectData.standardLayersMissing.length > 0 
                        ? inspectData.standardLayersMissing 
                        : ['0-FLOORS', '0-ROOMS', '0-FITTINGS', '0-LEDS', '0-TRACKS']
                      ).map(layerName => (
                        <span
                          key={layerName}
                          style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5'
                          }}
                        >
                          ✕ {layerName}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.4', marginTop: '2px' }}>
                      Without these layers, the system cannot mathematically separate fittings from other CAD symbols or exact room polygons.
                    </div>
                  </div>

                  {/* ACTION CARDS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select How to Proceed:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* OPTION 1: CANCEL & FORMAT */}
                      <div
                        onClick={() => {
                          setUnstandardizedPrompt(false);
                          setFile(null);
                          setInspectData(null);
                          setShowCadGuide(true);
                        }}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          background: 'rgba(59, 130, 246, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#60a5fa' }}>
                            Cancel & Format Drawing
                          </span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                            100% ACCURACY
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                          Clear this file and view the layer instructions below to set up <code>0-FITTINGS</code>, <code>0-ROOMS</code>, etc. in AutoCAD.
                        </div>
                      </div>

                      {/* OPTION 2: PROCEED WITH HEURISTIC */}
                      <div
                        onClick={() => {
                          setUnstandardizedPrompt(false);
                          runParseWithEngine('2.0', file, lightingLayer, boundaryLayer, defaultFloor);
                        }}
                        style={{
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          background: 'rgba(245, 158, 11, 0.1)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fbbf24' }}>
                            Proceed with Heuristic Mode (Engine 2.0) →
                          </span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', fontWeight: 700 }}>
                            SMART GUESSWORK
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                          Continue using visual shape recognition & wall obstacle raycasting. Results will be previewed for manual review.
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '2px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setUnstandardizedPrompt(false);
                          setEngineVersion('1.0');
                          setStep(2);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary, #94a3b8)',
                          fontSize: '11px',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: '2px 4px'
                        }}
                      >
                        Or manually configure layers using Classic Engine 1.0 →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
                  onClick={() => {
                    const el = document.getElementById('cad-file-input');
                    if (el) el.click();
                  }}
                  style={{
                    border: dragOver ? '2px dashed #3b82f6' : '2px dashed var(--border, #3a4254)',
                    borderRadius: '12px',
                    background: dragOver ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary, #151821)',
                    padding: '50px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '14px'
                  }}
                >
                  <input 
                    id="cad-file-input"
                    type="file" 
                    accept=".dwg"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Upload size={26} />
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
                      Choose an AutoCAD Plan (.dwg) or drag & drop here
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                      Supports AutoCAD binary drawings (AutoCAD R13 through 2024+)
                    </div>
                  </div>

                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary, #1e222d)',
                    border: '1px solid var(--border, #2e3545)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    📁 Browse Computer
                  </div>
                </div>
              )}

              {/* CAD PREPARATION SPECIFICATION GUIDE (FOR 100% ACCURACY) */}
              <div style={{
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                background: 'rgba(59, 130, 246, 0.04)',
                overflow: 'hidden'
              }}>
                <div 
                  onClick={() => setShowCadGuide(!showCadGuide)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(59, 130, 246, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="#3b82f6" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#60a5fa' }}>
                      AutoCAD Drawing Setup Guide (For 100% Accuracy)
                    </span>
                    <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontWeight: 700 }}>
                      STANDARD
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                    <span>{showCadGuide ? 'Hide Instructions' : 'View Instructions'}</span>
                    {showCadGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {showCadGuide && (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11.5px', lineHeight: '1.5' }}>
                    <div style={{ color: 'var(--text-secondary, #94a3b8)' }}>
                      To achieve <strong>100% mathematical precision</strong> with zero guesswork, set up your CAD drawing using these dedicated layers. When present, the parser reads <em>only</em> these layers and ignores all background drafting noise:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                      {/* Layer 1: 0-FLOORS */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#38bdf8' }}>
                          <code>0-FLOORS</code>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>Closed Polylines + Text</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                          Closed polyline enclosing each floor envelope (e.g. Ground Floor, First Floor). Place text inside naming the floor.
                        </div>
                      </div>

                      {/* Layer 2: 0-ROOMS */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#4ade80' }}>
                          <code>0-ROOMS</code>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>Closed Polylines + Text</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                          Closed polylines around rooms with room name text inside. <em>Tip: In AutoCAD type <code>BPOLY</code> and click inside each room for 1-click boundaries!</em>
                        </div>
                      </div>

                      {/* Layer 3: 0-FITTINGS or 0-FITTINGS-* */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#facc15' }}>
                          <code>0-FITTINGS-*</code>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>Blocks + Plan Code Text</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                          All point fixtures. Use prefixes like <code>0-FITTINGS-DOWNLIGHT</code>, <code>0-FITTINGS-DECORATIVE</code>, or <code>0-FITTINGS-EMERGENCY</code> to independently freeze them per paperspace viewport!
                        </div>
                      </div>

                      {/* Layer 4: 0-LEDS or 0-LEDS-* */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#fb923c' }}>
                          <code>0-LEDS-*</code>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>Polylines + Tag Text</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                          Linear LED coves, under-cabinet & joinery runs (in meters). Sub-layers like <code>0-LEDS-COVE</code> or <code>0-LEDS-JOINERY</code> are fully supported for paperspaces.
                        </div>
                      </div>

                      {/* Layer 5: 0-TRACKS or 0-TRACKS-* */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#c084fc' }}>
                          <code>0-TRACKS-*</code>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 400 }}>Polylines + Spot Blocks</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '4px' }}>
                          Track rails (in meters). Place spotlight blocks directly along the track polyline. Supports <code>0-TRACKS-MAIN</code>, <code>0-TRACKS-STAGE</code>, etc.
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                      fontSize: '11px',
                      color: '#86efac'
                    }}>
                      <CheckCircle2 size={14} style={{ flexShrink: 0, color: '#4ade80' }} />
                      <span><strong>Paperspace Viewport Freeze (`VP Freeze`):</strong> Drafters do not need to put all fittings on a single layer. Any layer beginning with <code>0-FITTINGS-</code>, <code>0-LEDS-</code>, or <code>0-TRACKS-</code> is recognized while allowing independent sheet visibility!</span>
                    </div>
                  </div>
                )}
              </div>

              {inspecting && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary, #151821)',
                  border: '1px solid var(--border, #2e3545)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span>Scanning drawing blocks, layers, and text tags...</span>
                </div>
              )}

              {parsing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary, #151821)',
                  border: '1px solid var(--border, #2e3545)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span>Processing CAD drawing with Engine {engineVersion}...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: LAYER CONFIGURATION */}
          {step === 2 && inspectData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* File Info Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>{file?.name}</span>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)' }}>({(file?.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                  {inspectData.totalEntities?.toLocaleString()} entities scanned
                </div>
              </div>

              {/* Engine Mode Toggle in Step 2 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--bg-primary, #151821)',
                border: '1px solid var(--border, #2e3545)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: engineVersion === '2.0' ? '#3b82f6' : '#64748b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {engineVersion === '2.0' ? <Zap size={12} /> : <Layers size={12} />}
                    Engine {engineVersion} Active
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)' }}>
                    {engineVersion === '2.0' ? 'Smart shape recognition & wall obstacle raycasting' : 'Classic AutoCAD layer & closed boundary polyline mapping'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setEngineVersion('2.0')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: engineVersion === '2.0' ? '#3b82f6' : 'var(--bg-secondary, #1e222d)',
                      color: engineVersion === '2.0' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                      border: '1px solid var(--border, #2e3545)',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ 2.0 (Smart)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngineVersion('1.0')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: engineVersion === '1.0' ? '#3b82f6' : 'var(--bg-secondary, #1e222d)',
                      color: engineVersion === '1.0' ? '#fff' : 'var(--text-secondary, #94a3b8)',
                      border: '1px solid var(--border, #2e3545)',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ 1.0 (Classic)
                  </button>
                </div>
              </div>

              {/* Ready Guidance Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--bg-success, #eaf3de)',
                border: '1px solid var(--border-success, rgba(59,109,17,0.3))',
                color: 'var(--text-success, #2e580c)',
                fontSize: '12px',
                lineHeight: '1.45'
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#2e7d32', marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Drawing scanned & layers auto-detected!</div>
                  <div style={{ marginTop: '2px', opacity: 0.9 }}>
                    All settings are pre-configured. Click the blue <strong>"Analyse & Count Drawing"</strong> button below to extract your quantities. You only need to touch the options below if you wish to override the layers.
                  </div>
                </div>
              </div>

              {/* Form Config Box */}
              <div style={{
                background: 'var(--bg-primary, #151821)',
                border: '1px solid var(--border, #2e3545)',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={14} style={{ color: '#3b82f6' }} /> Layer Mapping Configuration
                </div>

                {/* Lighting Layer */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Lighting Layer (Blocks & Plan Code MTexts):
                  </label>
                  <select 
                    value={lightingLayer}
                    onChange={e => setLightingLayer(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)', color: 'var(--text-primary, #ffffff)', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="*">All Lighting Layers (* Recommended) — {inspectData.totalLightingInserts || 'All'} fixtures</option>
                    {lightingLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.inserts} blocks {l.isLightingCandidate ? '★ (Lighting Candidate)' : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
                    Every block on this layer is counted and linked with its closest plan code tag.
                  </div>
                </div>

                {/* Boundary Layer */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Room / Count Area Layer (Closed Polylines):
                  </label>
                  <select 
                    value={boundaryLayer}
                    onChange={e => setBoundaryLayer(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)', color: 'var(--text-primary, #ffffff)', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="*">All Closed Polylines in Drawing (* Recommended)</option>
                    {boundaryLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.closedPolylines} closed areas {l.isBoundaryCandidate ? '★ (Area Candidate)' : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
                    Each fitting's coordinates are tested inside closed room boundaries using ray-casting.
                  </div>
                </div>

                {/* Default Floor */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>
                    Default Floor Name:
                  </label>
                  <input 
                    type="text" 
                    value={defaultFloor}
                    onChange={e => setDefaultFloor(e.target.value)}
                    placeholder="e.g. Ground Floor, Basement, Level 1"
                    style={{ width: '100%', fontSize: '12px', background: 'var(--bg-secondary, #1e222d)', border: '1px solid var(--border, #2e3545)', color: 'var(--text-primary, #ffffff)', padding: '8px 10px', borderRadius: '6px', outline: 'none' }}
                  />
                  {inspectData.availableFloors && inspectData.availableFloors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>Detected in drawing:</span>
                      {inspectData.availableFloors.map(fl => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setDefaultFloor(fl)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: defaultFloor === fl ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border, #2e3545)',
                            background: defaultFloor === fl ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary, #1e222d)',
                            color: defaultFloor === fl ? '#60a5fa' : 'var(--text-secondary, #94a3b8)',
                            cursor: 'pointer'
                          }}
                        >
                          {fl}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {parsing && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--bg-primary, #151821)',
                  border: '1px solid var(--border, #2e3545)',
                  color: 'var(--text-primary, #ffffff)',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                  <span>Calculating spatial intersections and aggregating room counts...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PREVIEW & CONFIRM */}
          {step === 3 && parseResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* ENGINE STATUS & COMPARISON BANNER */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: (parseResult.engine === '2.0' || engineVersion === '2.0') ? 'rgba(59, 130, 246, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                border: (parseResult.engine === '2.0' || engineVersion === '2.0') ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border, #2e3545)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: (parseResult.engine === '2.0' || engineVersion === '2.0') ? '#3b82f6' : '#64748b',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {(parseResult.engine === '2.0' || engineVersion === '2.0') ? <Zap size={12} /> : <Layers size={12} />}
                    Engine {parseResult.engine || engineVersion}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                    {(parseResult.engine === '2.0' || engineVersion === '2.0')
                      ? 'Smart shape fingerprinting & wall-aware obstacle raycasting'
                      : 'Classic AutoCAD layer filtering & closed boundary polylines'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>Compare:</span>
                  <button
                    type="button"
                    disabled={parsing}
                    onClick={() => {
                      const next = (parseResult.engine === '2.0' || engineVersion === '2.0') ? '1.0' : '2.0';
                      setEngineVersion(next);
                      runParseWithEngine(next);
                    }}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {parsing ? <RefreshCw size={12} className="animate-spin" /> : null}
                    Switch to {(parseResult.engine === '2.0' || engineVersion === '2.0') ? 'Engine 1.0 (Classic)' : 'Engine 2.0 (Smart)'}
                  </button>
                </div>
              </div>

              {/* DETERMINISTIC VS HEURISTIC STATUS CALLOUT */}
              {inspectData?.standardLayersFound && inspectData.standardLayersFound.length > 0 ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#86efac',
                  fontSize: '11.5px'
                }}>
                  <CheckCircle2 size={15} color="#4ade80" style={{ flexShrink: 0 }} />
                  <span><strong>100% Precision Mode:</strong> Drawing parsed deterministically via standard layers (<code>{inspectData.standardLayersFound.join(', ')}</code>). Zero heuristic estimations used.</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#fde68a',
                  fontSize: '11.5px'
                }}>
                  <AlertTriangle size={15} color="#fbbf24" style={{ flexShrink: 0 }} />
                  <span><strong>Heuristic Estimation:</strong> Standard <code>0-</code> layers were not found. Counts and areas were inferred using visual shape recognition and raycasting. Please verify line items carefully.</span>
                </div>
              )}

              {/* STATS METRIC TILES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>
                    {parseResult.summary?.totalFittings || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, marginTop: '2px' }}>
                    Fittings Counted
                  </div>
                </div>

                {(parseResult.summary?.totalLedRuns > 0 || parseResult.summary?.totalTrackRuns > 0) && (
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                      {parseResult.summary?.totalLedMeters ? `${parseResult.summary.totalLedMeters}m` : `${parseResult.summary?.totalTrackMeters || 0}m`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, marginTop: '2px' }}>
                      {parseResult.summary?.totalLedRuns || 0} LED Runs
                    </div>
                  </div>
                )}

                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc' }}>
                    {parseResult.summary?.uniqueTags || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, marginTop: '2px' }}>
                    Plan Codes (Tags)
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>
                    {parseResult.summary?.totalRooms || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, marginTop: '2px' }}>
                    Rooms / Areas
                  </div>
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-primary, #151821)',
                  border: '1px solid var(--border, #2e3545)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  flex: 1
                }}>
                  <Search size={14} style={{ color: 'var(--text-secondary, #94a3b8)', marginRight: '6px' }} />
                  <input 
                    type="text" 
                    placeholder="Filter floor, room or tag..."
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text-primary, #ffffff)', width: '100%' }}
                  />
                  {previewSearch && (
                    <button onClick={() => setPreviewSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a3b8)', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #94a3b8)', whiteSpace: 'nowrap' }}>
                  {filteredItems.length} of {parseResult.items?.length || 0} lines
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid var(--border, #2e3545)',
                borderRadius: '8px',
                background: 'var(--bg-primary, #151821)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary, #1e222d)', borderBottom: '1px solid var(--border, #2e3545)', color: 'var(--text-secondary, #94a3b8)', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Floor Level</th>
                      <th style={{ padding: '8px 12px' }}>Room / Area</th>
                      <th style={{ padding: '8px 12px' }}>Plan Code</th>
                      <th style={{ padding: '8px 12px' }}>Type & Details</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Measurement / Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr 
                        key={idx} 
                        style={{ borderBottom: '1px solid var(--border, #232836)', transition: 'background 0.1s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary, #1e222d)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '7px 12px', color: 'var(--text-secondary, #94a3b8)', fontSize: '11.5px' }}>{item.floor}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>{item.area}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            background: item.itemType === 'linear_led' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: item.itemType === 'linear_led' ? '#f59e0b' : '#60a5fa',
                            border: item.itemType === 'linear_led' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            {item.tag}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {item.itemType === 'linear_led' ? (
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                Linear LED
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                                {item.notes}
                              </div>
                            </div>
                          ) : item.itemType === 'track_system' ? (
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                Track System
                              </span>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                                {item.notes}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
                              Standard Luminaire
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                          {item.qty} <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-tertiary, #64748b)' }}>{item.unit || 'pcs'}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary, #94a3b8)' }}>
                          No matching items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border, #2e3545)',
          background: 'var(--bg-primary, #151821)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {step === 2 && (
              <button 
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setStep(1)}
                style={{ fontSize: '11.5px' }}
              >
                ← Back to Upload
              </button>
            )}
            {step === 3 && (
              <button 
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setStep(2)}
                style={{ fontSize: '11.5px' }}
              >
                ← Adjust Layer Settings
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClose}
              style={{ fontSize: '12px' }}
            >
              Cancel
            </button>

            {step === 2 && (
              <button 
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRunParse}
                disabled={parsing || !lightingLayer}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                {parsing ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Analyse & Count Drawing
              </button>
            )}

            {step === 3 && (
              <>
                <button 
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleConfirm('append')}
                  style={{ fontSize: '12px', fontWeight: 600 }}
                  title="Adds CAD items to existing Count-Up rows"
                >
                  Append to Count-Up
                </button>
                <button 
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleConfirm('replace')}
                  style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Replaces existing Count-Up rows with CAD items"
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
