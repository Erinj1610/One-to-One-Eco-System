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
  const [missingLayersPrompt, setMissingLayersPrompt] = useState(false);
  const [dismissExcludedWarning, setDismissExcludedWarning] = useState(false);
  const [showExcludedDrawer, setShowExcludedDrawer] = useState(false);
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
    setMissingLayersPrompt(false);
    setDismissExcludedWarning(false);
    setShowExcludedDrawer(false);
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
        // Halt automatic parse: Prompt user that standard layers were not found
        setUnstandardizedPrompt(true);
        setMissingLayersPrompt(false);
        return;
      }

      // Check if some standard layers are missing - prompt user as requested
      if (data.standardLayersMissing && data.standardLayersMissing.length > 0) {
        setUnstandardizedPrompt(false);
        setMissingLayersPrompt(true);
        return;
      }

      // Standard layers fully present: run parse immediately
      setUnstandardizedPrompt(false);
      setMissingLayersPrompt(false);
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
      firstFix: item.firstFix || (item.notes?.includes('First Fix') ? 'Yes' : 'No'),
      level: item.level || 'HL',
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
        maxWidth: '740px',
        maxHeight: '90vh',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Import CAD Plan (.dwg)
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Auto-extract light fittings, tags & rooms directly from AutoCAD drawings
              </div>
            </div>
          </div>
          <button 
            className="btn btn-ghost" 
            onClick={handleClose}
            style={{ padding: '6px', borderRadius: '6px', color: '#64748b' }}
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
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '11.5px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 1 ? 700 : 500,
            color: step >= 1 ? '#1d4ed8' : '#64748b'
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
              background: step >= 1 ? '#1d4ed8' : '#e2e8f0',
              color: step >= 1 ? '#ffffff' : '#64748b',
              border: step >= 1 ? 'none' : '1px solid #cbd5e1'
            }}>1</span>
            1. Select Drawing
          </div>

          <ChevronRight size={14} style={{ color: '#94a3b8' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 2 ? 700 : 500,
            color: step >= 2 ? '#1d4ed8' : '#64748b'
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
              background: step >= 2 ? '#1d4ed8' : '#e2e8f0',
              color: step >= 2 ? '#ffffff' : '#64748b',
              border: step >= 2 ? 'none' : '1px solid #cbd5e1'
            }}>2</span>
            2. Layer Settings
          </div>

          <ChevronRight size={14} style={{ color: '#94a3b8' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: step === 3 ? 700 : 500,
            color: step >= 3 ? '#1d4ed8' : '#64748b'
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
              background: step >= 3 ? '#1d4ed8' : '#e2e8f0',
              color: step >= 3 ? '#ffffff' : '#64748b',
              border: step >= 3 ? 'none' : '1px solid #cbd5e1'
            }}>3</span>
            3. Preview & Populate
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
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
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                      border: engineVersion === '2.0' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: engineVersion === '2.0' ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>
                        <Zap size={15} style={{ color: '#2563eb' }} />
                        <span>Engine 2.0</span>
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#2563eb', color: '#ffffff', fontWeight: 700 }}>RECOMMENDED</span>
                      </div>
                      {engineVersion === '2.0' && <CheckCircle2 size={16} color="#2563eb" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Smart & Zero Prep:</strong> Visual shape fingerprinting & wall-aware obstacle raycasting. No manual polylines needed!
                    </div>
                  </div>

                  <div 
                    onClick={() => setEngineVersion('1.0')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: engineVersion === '1.0' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: engineVersion === '1.0' ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: engineVersion === '1.0' ? '#1d4ed8' : '#0f172a' }}>
                        <Layers size={15} style={{ color: '#64748b' }} />
                        <span>Engine 1.0</span>
                        <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>CLASSIC</span>
                      </div>
                      {engineVersion === '1.0' && <CheckCircle2 size={16} color="#2563eb" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Layer-Based:</strong> Requires CAD prep with standard layers (<code>E-LUM-SP</code>) and closed boundary polylines.
                    </div>
                  </div>
                </div>
              </div>

              {unstandardizedPrompt && inspectData ? (
                <div style={{
                  borderRadius: '12px',
                  border: '1.5px solid #d97706',
                  background: '#fffbeb',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(217, 119, 6, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#b45309'
                      }}>
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#78350f' }}>
                            Standard CAD Layers Not Found
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#fef3c7',
                            border: '1px solid #fcd34d',
                            color: '#92400e',
                            fontWeight: 700
                          }}>
                            UNSTANDARDIZED DRAWING
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#1e293b', marginTop: '4px', lineHeight: '1.5' }}>
                          File <strong>{file?.name}</strong> was inspected ({inspectData.totalEntities?.toLocaleString()} entities, {inspectData.totalLayers} layers), but none of the dedicated <code style={{ background: '#fef3c7', color: '#78350f', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>0-</code> precision layers were detected.
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
                        color: '#64748b',
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
                    background: '#ffffff',
                    border: '1px solid #fed7aa'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#991b1b'
                          }}
                        >
                          ✕ {layerName}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: '1.4', marginTop: '2px' }}>
                      Without these layers, the system cannot mathematically separate fittings from other CAD symbols or exact room polygons.
                    </div>
                  </div>

                  {/* ACTION CARDS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                          border: '1.5px solid #93c5fd',
                          background: '#eff6ff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d4ed8' }}>
                            Cancel & Format Drawing
                          </span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#1d4ed8', color: '#fff', fontWeight: 700 }}>
                            100% ACCURACY
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
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
                          border: '1.5px solid #fcd34d',
                          background: '#fffbeb',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#92400e' }}>
                            Proceed with Heuristic Mode (Engine 2.0) →
                          </span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontWeight: 700 }}>
                            SMART GUESSWORK
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.4' }}>
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
                          color: '#475569',
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
              ) : missingLayersPrompt && inspectData ? (
                <div style={{
                  borderRadius: '12px',
                  border: '1.5px solid #3b82f6',
                  background: '#eff6ff',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#1d4ed8'
                      }}>
                        <Layers size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            Layer Checklist: Not All Standard CAD Layers Exist
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#dbeafe',
                            border: '1px solid #93c5fd',
                            color: '#1e40af',
                            fontWeight: 700
                          }}>
                            {inspectData.standardLayersFound?.length || 0} FOUND / {inspectData.standardLayersMissing?.length || 0} MISSING
                          </span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#1e293b', marginTop: '4px', lineHeight: '1.5' }}>
                          File <strong>{file?.name}</strong> was inspected ({inspectData.totalEntities?.toLocaleString()} entities). Standard layers were detected, but some expected layers are not present in this drawing.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMissingLayersPrompt(false);
                        setFile(null);
                        setInspectData(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Clear File"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Detected Standard Layers ({inspectData.standardLayersFound?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(inspectData.standardLayersFound || []).map(l => (
                          <span key={l} style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
                            ✓ {l}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> Missing Layers ({inspectData.standardLayersMissing?.length || 0}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(inspectData.standardLayersMissing || []).map(l => (
                          <span key={l} style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            ✕ {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setMissingLayersPrompt(false);
                        setFile(null);
                        setInspectData(null);
                        setShowCadGuide(true);
                      }}
                      style={{ fontSize: '12px' }}
                    >
                      Cancel & Review CAD Setup Guide
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setMissingLayersPrompt(false);
                        runParseWithEngine(engineVersion, file, lightingLayer, boundaryLayer, defaultFloor);
                      }}
                      style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle2 size={14} /> Proceed with Detected Layers →
                    </button>
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
                    border: dragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    background: dragOver ? '#eff6ff' : '#f8fafc',
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
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Upload size={26} />
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      Choose an AutoCAD Plan (.dwg) or drag & drop here
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Supports AutoCAD binary drawings (AutoCAD R13 through 2024+)
                    </div>
                  </div>

                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b',
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
                border: '1px solid #bfdbfe',
                background: '#ffffff',
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
                    background: '#eff6ff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} color="#2563eb" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d4ed8' }}>
                      AutoCAD Drawing Setup Guide (For 100% Accuracy)
                    </span>
                    <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: '#2563eb', color: '#fff', fontWeight: 700 }}>
                      STANDARD
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                    <span>{showCadGuide ? 'Hide Instructions' : 'View Instructions'}</span>
                    {showCadGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {showCadGuide && (
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11.5px', lineHeight: '1.5' }}>
                    <div style={{ color: '#334155' }}>
                      To achieve <strong>100% mathematical precision</strong> with zero guesswork, set up your CAD drawing using these dedicated layers. When present, the parser reads <em>only</em> these layers and ignores all background drafting noise:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                      {/* BOUNDARIES */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0369a1' }}>
                          <code>0-FLOORS</code> & <code>0-ROOMS</code>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 400 }}>Spatial Polylines</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px', fontSize: '11px' }}>
                          <strong>0-FLOORS:</strong> Closed polyline around each floor envelope with floor name text inside.<br />
                          <strong>0-ROOMS:</strong> Closed polyline around each room with room name text inside. <em>(Tip: Type <code>BPOLY</code> inside room for 1-click boundary!)</em>
                        </div>
                      </div>

                      {/* HIGH LEVEL (HL) FITTINGS */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#92400e' }}>
                          <code>0-HL-ARC</code> | <code>0-HL-LED</code> | <code>0-HL-TRACK</code>
                          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>HIGH LEVEL</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px', fontSize: '11px' }}>
                          <strong>0-HL-ARC:</strong> High-level architectural fixtures (downlights, pendants, ceiling wash).<br />
                          <strong>0-HL-LED:</strong> High-level linear LEDs (coves, pelmets, bulkheads) in meters.<br />
                          <strong>0-HL-TRACK:</strong> High-level track runs and spotlights in meters.
                        </div>
                      </div>

                      {/* LOW LEVEL (LL) FITTINGS */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#15803d' }}>
                          <code>0-LL-ARC</code> | <code>0-LL-LED</code> | <code>0-LL-TRACK</code>
                          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>LOW LEVEL</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px', fontSize: '11px' }}>
                          <strong>0-LL-ARC:</strong> Low-level architectural fixtures (step lights, floor wash, low wall wash).<br />
                          <strong>0-LL-LED:</strong> Low-level linear LEDs (skirting, toe-kicks, stair risers, joinery).<br />
                          <strong>0-LL-TRACK:</strong> Low-level or floor-recessed track systems.
                        </div>
                      </div>

                      {/* FIRST FIX (-FF) EXTENSIONS */}
                      <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fcd34d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#78350f' }}>
                          <code>*-FF</code> (First Fix Layers)
                          <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '3px', background: '#f59e0b', color: '#ffffff', fontWeight: 800 }}>FIRST FIX</span>
                        </div>
                        <div style={{ color: '#334155', marginTop: '4px', fontSize: '11px' }}>
                          <code>0-HL-ARC-FF</code>, <code>0-HL-LED-FF</code>, <code>0-HL-TRACK-FF</code>, <code>0-LL-ARC-FF</code>, <code>0-LL-LED-FF</code>, <code>0-LL-TRACK-FF</code>.<br />
                          Items on <code>-FF</code> layers are automatically flagged as <strong>First Fix = Yes</strong> in the BoQ without mutating the catalog tag or description!
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      fontSize: '11px',
                      color: '#166534'
                    }}>
                      <CheckCircle2 size={14} style={{ flexShrink: 0, color: '#15803d' }} />
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
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#2563eb' }} />
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
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#2563eb' }} />
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
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{file?.name}</span>
                  <span style={{ color: '#64748b' }}>({(file?.size / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>
                <div style={{ fontWeight: 600, color: '#1d4ed8' }}>
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
                background: '#f8fafc',
                border: '1px solid #cbd5e1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: engineVersion === '2.0' ? '#2563eb' : '#64748b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {engineVersion === '2.0' ? <Zap size={12} /> : <Layers size={12} />}
                    Engine {engineVersion} Active
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#475569' }}>
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
                      background: engineVersion === '2.0' ? '#2563eb' : '#ffffff',
                      color: engineVersion === '2.0' ? '#fff' : '#334155',
                      border: '1px solid #cbd5e1',
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
                      background: engineVersion === '1.0' ? '#2563eb' : '#ffffff',
                      color: engineVersion === '1.0' ? '#fff' : '#334155',
                      border: '1px solid #cbd5e1',
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
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#166534',
                fontSize: '12px',
                lineHeight: '1.45'
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, color: '#15803d', marginTop: '1px' }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Drawing scanned & layers auto-detected!</div>
                  <div style={{ marginTop: '2px', opacity: 0.9 }}>
                    All settings are pre-configured. Click the blue <strong>"Analyse & Count Drawing"</strong> button below to extract your quantities. You only need to touch the options below if you wish to override the layers.
                  </div>
                </div>
              </div>

              {/* Form Config Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={14} style={{ color: '#2563eb' }} /> Layer Mapping Configuration
                </div>

                {/* Lighting Layer */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Lighting Layer (Blocks & Plan Code MTexts):
                  </label>
                  <select 
                    value={lightingLayer}
                    onChange={e => setLightingLayer(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="*">All Lighting Layers (* Recommended) — {inspectData.totalLightingInserts || 'All'} fixtures</option>
                    {lightingLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.inserts} blocks {l.isLightingCandidate ? '★ (Lighting Candidate)' : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                    Every block on this layer is counted and linked with its closest plan code tag.
                  </div>
                </div>

                {/* Boundary Layer */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Room / Count Area Layer (Closed Polylines):
                  </label>
                  <select 
                    value={boundaryLayer}
                    onChange={e => setBoundaryLayer(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '6px' }}
                  >
                    <option value="*">All Closed Polylines in Drawing (* Recommended)</option>
                    {boundaryLayerOptions.map(l => (
                      <option key={l.name} value={l.name}>
                        {l.name} — {l.closedPolylines} closed areas {l.isBoundaryCandidate ? '★ (Area Candidate)' : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                    Each fitting's coordinates are tested inside closed room boundaries using ray-casting.
                  </div>
                </div>

                {/* Default Floor */}
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Default Floor Name:
                  </label>
                  <input 
                    type="text" 
                    value={defaultFloor}
                    onChange={e => setDefaultFloor(e.target.value)}
                    placeholder="e.g. Ground Floor, Basement, Level 1"
                    style={{ width: '100%', fontSize: '12px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 10px', borderRadius: '6px', outline: 'none' }}
                  />
                  {inspectData.availableFloors && inspectData.availableFloors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Detected in drawing:</span>
                      {inspectData.availableFloors.map(fl => (
                        <button
                          key={fl}
                          type="button"
                          onClick={() => setDefaultFloor(fl)}
                          style={{
                            padding: '3px 9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: defaultFloor === fl ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            background: defaultFloor === fl ? '#eff6ff' : '#ffffff',
                            color: defaultFloor === fl ? '#1d4ed8' : '#334155',
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
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12.5px'
                }}>
                  <RefreshCw size={16} className="animate-spin" style={{ color: '#2563eb' }} />
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
                background: (parseResult.engine === '2.0' || engineVersion === '2.0') ? '#eff6ff' : '#f8fafc',
                border: (parseResult.engine === '2.0' || engineVersion === '2.0') ? '1px solid #bfdbfe' : '1px solid #cbd5e1'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: (parseResult.engine === '2.0' || engineVersion === '2.0') ? '#2563eb' : '#64748b',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {(parseResult.engine === '2.0' || engineVersion === '2.0') ? <Zap size={12} /> : <Layers size={12} />}
                    Engine {parseResult.engine || engineVersion}
                  </span>
                  <span style={{ fontSize: '12px', color: '#334155' }}>
                    {(parseResult.engine === '2.0' || engineVersion === '2.0')
                      ? 'Smart shape fingerprinting & wall-aware obstacle raycasting'
                      : 'Classic AutoCAD layer filtering & closed boundary polylines'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Compare:</span>
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
                      color: '#1d4ed8',
                      background: '#ffffff',
                      border: '1px solid #bfdbfe',
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
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#166534',
                  fontSize: '11.5px'
                }}>
                  <CheckCircle2 size={15} color="#15803d" style={{ flexShrink: 0 }} />
                  <span><strong>100% Precision Mode:</strong> Drawing parsed deterministically via standard layers (<code>{inspectData.standardLayersFound.join(', ')}</code>). Zero heuristic estimations used.</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                  fontSize: '11.5px'
                }}>
                  <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                  <span><strong>Heuristic Estimation:</strong> Standard <code>0-</code> layers were not found. Counts and areas were inferred using visual shape recognition and raycasting. Please verify line items carefully.</span>
                </div>
              )}

              {/* BOUNDARY EXCLUSION WARNING PROMPT */}
              {parseResult.unassignedFittings && parseResult.unassignedFittings.length > 0 && !dismissExcludedWarning && (
                <div style={{
                  borderRadius: '10px',
                  border: '1.5px solid #d97706',
                  background: '#fffbeb',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 10px rgba(217, 119, 6, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#b45309'
                    }}>
                      <AlertTriangle size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#78350f', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>⚠️ Boundary Exclusion: {parseResult.unassignedFittings.length} fittings were not found within any room/floor boundary</span>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#dc2626', color: '#fff', fontWeight: 700 }}>EXCLUDED</span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#1e293b', marginTop: '6px', lineHeight: '1.5' }}>
                        These fittings were excluded because their CAD coordinates are not inside any closed <code style={{ background: '#fef3c7', color: '#78350f', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>0-ROOMS</code> boundary polylines.
                        <br />
                        <strong style={{ color: '#78350f' }}>Do you want to ignore them and click proceed?</strong> If not, please correct your CAD file by ensuring the fittings are within the boundary lines of rooms.
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #fde68a', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowExcludedDrawer(!showExcludedDrawer)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#b45309',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 0'
                      }}
                    >
                      {showExcludedDrawer ? '▲ Hide Excluded Fittings' : `▼ View ${parseResult.unassignedFittings.length} Excluded Fittings (${Array.from(new Set(parseResult.unassignedFittings.map(f => f.tag || 'Unknown'))).slice(0, 5).join(', ')}${parseResult.unassignedFittings.length > 5 ? '...' : ''})`}
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          handleReset();
                          setShowCadGuide(true);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Cancel & Correct CAD File
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissExcludedWarning(true)}
                        style={{
                          background: '#d97706',
                          border: '1px solid #b45309',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        ✓ Ignore Excluded & Proceed ({parseResult.items?.length || 0} In-Room Items)
                      </button>
                    </div>
                  </div>

                  {showExcludedDrawer && (
                    <div style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      background: '#ffffff',
                      border: '1px solid #fcd34d',
                      borderRadius: '6px',
                      padding: '4px'
                    }}>
                      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', color: '#0f172a' }}>
                        <thead>
                          <tr style={{ background: '#fef3c7', color: '#78350f', borderBottom: '1px solid #fcd34d' }}>
                            <th style={{ textAlign: 'left', padding: '5px 8px' }}>Tag</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px' }}>Layer</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px' }}>Type</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px' }}>Coordinates (X, Y)</th>
                            <th style={{ textAlign: 'left', padding: '5px 8px' }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.unassignedFittings.map((uf, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 8px', fontWeight: 700, color: '#b91c1c', fontFamily: 'monospace' }}>{uf.tag || 'Unknown'}</td>
                              <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#334155' }}>{uf.layer}</td>
                              <td style={{ padding: '5px 8px', color: '#334155' }}>{uf.itemType}</td>
                              <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#475569' }}>({Math.round(uf.x)}, {Math.round(uf.y)})</td>
                              <td style={{ padding: '5px 8px', color: '#b45309', fontWeight: 600 }}>{uf.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* STATS METRIC TILES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#1d4ed8' }}>
                    {parseResult.summary?.totalFittings || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                    Fittings Counted
                  </div>
                </div>

                {(parseResult.summary?.totalLedRuns > 0 || parseResult.summary?.totalTrackRuns > 0) && (
                  <div style={{ padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#b45309' }}>
                      {parseResult.summary?.totalLedMeters ? `${parseResult.summary.totalLedMeters}m` : `${parseResult.summary?.totalTrackMeters || 0}m`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                      {parseResult.summary?.totalLedRuns || 0} LED Runs
                    </div>
                  </div>
                )}

                <div style={{ padding: '12px', borderRadius: '10px', background: '#faf5ff', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#7e22ce' }}>
                    {parseResult.summary?.uniqueTags || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                    Plan Codes (Tags)
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                    {parseResult.summary?.totalRooms || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
                    Rooms / Areas
                  </div>
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  flex: 1
                }}>
                  <Search size={14} style={{ color: '#64748b', marginRight: '6px' }} />
                  <input 
                    type="text" 
                    placeholder="Filter floor, room or tag..."
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: '#0f172a', width: '100%' }}
                  />
                  {previewSearch && (
                    <button onClick={() => setPreviewSearch('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', whiteSpace: 'nowrap' }}>
                  {filteredItems.length} of {parseResult.items?.length || 0} lines
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#ffffff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Floor Level</th>
                      <th style={{ padding: '8px 12px' }}>Room / Area</th>
                      <th style={{ padding: '8px 12px' }}>Plan Code</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>First Fix</th>
                      <th style={{ padding: '8px 12px' }}>Type & Details</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Measurement / Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr 
                        key={idx} 
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '7px 12px', color: '#475569', fontSize: '11.5px' }}>{item.floor}</td>
                        <td style={{ padding: '7px 12px', fontWeight: 600, color: '#0f172a' }}>{item.area}</td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            background: item.itemType === 'linear_led' ? '#fffbeb' : '#eff6ff',
                            color: item.itemType === 'linear_led' ? '#b45309' : '#1d4ed8',
                            border: item.itemType === 'linear_led' ? '1px solid #fcd34d' : '1px solid #bfdbfe'
                          }}>
                            {item.tag}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '11px',
                            background: item.firstFix === 'Yes' ? '#fef3c7' : '#f1f5f9',
                            color: item.firstFix === 'Yes' ? '#92400e' : '#64748b',
                            border: item.firstFix === 'Yes' ? '1px solid #fcd34d' : '1px solid #e2e8f0'
                          }}>
                            {item.firstFix === 'Yes' ? '⚡ Yes (FF)' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          {item.itemType === 'linear_led' ? (
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                Linear LED
                              </span>
                              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                {item.notes}
                              </div>
                            </div>
                          ) : item.itemType === 'track_system' ? (
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                Track System
                              </span>
                              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                {item.notes}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Standard Luminaire
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {item.qty} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>{item.unit || 'pcs'}</span>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
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
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
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
                style={{ fontSize: '11.5px', color: '#475569' }}
              >
                ← Back to Upload
              </button>
            )}
            {step === 3 && (
              <button 
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setStep(2)}
                style={{ fontSize: '11.5px', color: '#475569' }}
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
