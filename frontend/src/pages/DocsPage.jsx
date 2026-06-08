import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Folder, Upload, Download, Trash2, ChevronRight, RefreshCw, FileText } from 'lucide-react';
import { API_BASE } from '../api_config';

export default function DocsPage() {
  const { projects } = useStore();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Convert projects object/array for selector
  const projectList = useMemo(() => {
    return Object.entries(projects || {}).map(([id, p]) => ({
      id,
      name: p.name
    }));
  }, [projects]);

  // Set initial project
  useEffect(() => {
    if (projectList.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projectList[0].id);
    }
  }, [projectList, selectedProjectId]);

  // Fetch folders when active project changes
  useEffect(() => {
    if (selectedProjectId) {
      const fetchFolders = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/documents/${selectedProjectId}/folders`);
          const data = await res.json();
          setFolders(data);
          setSelectedFolder(null);
          setFiles([]);
          if (data.length > 0) {
            setSelectedFolder(data[0]);
            setFilesLoading(true);
            const filesRes = await fetch(`${API_BASE}/api/documents/folders/${data[0].gdrive_folder_id}/files`);
            const filesData = await filesRes.json();
            setFiles(filesData);
            setFilesLoading(false);
          }
        } catch (err) {
          console.error("Failed to load folders:", err);
        }
      };
      fetchFolders();
    }
  }, [selectedProjectId]);

  const handleFolderClick = async (folder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${folder.gdrive_folder_id}/files`);
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFolderToggle = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files || e.dataTransfer?.files;
    if (!uploadedFiles || uploadedFiles.length === 0 || !selectedFolder) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append("file", uploadedFiles[0]);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 80);
    
    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${selectedFolder.gdrive_folder_id}/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(async () => {
          setIsUploading(false);
          setUploadProgress(0);
          // Refresh files list
          const filesRes = await fetch(`${API_BASE}/api/documents/folders/${selectedFolder.gdrive_folder_id}/files`);
          const filesData = await filesRes.json();
          setFiles(filesData);
        }, 500);
      } else {
        clearInterval(progressInterval);
        alert("Upload failed.");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      alert("Error uploading file: " + err.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleTrashFile = async (fileId) => {
    if (!confirm("Are you sure you want to move this file to Google Drive Trash?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/documents/files/${fileId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
      } else {
        alert("Failed to trash file.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const folderTree = useMemo(() => {
    const map = {};
    const roots = [];
    folders.forEach(node => {
      map[node.id] = { ...node, children: [] };
    });
    folders.forEach(node => {
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(map[node.id]);
      } else {
        roots.push(map[node.id]);
      }
    });
    return roots;
  }, [folders]);

  const renderFolderTree = (nodes) => {
    return (
      <ul style={{ listStyleType: 'none', paddingLeft: '14px', margin: 0 }}>
        {nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = !!expandedFolders[node.id];
          const isSelected = selectedFolder?.id === node.id;
          
          return (
            <li key={node.id} style={{ margin: '4px 0' }}>
              <div 
                onClick={() => handleFolderClick(node)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: isSelected ? 'var(--text-info)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  fontWeight: isSelected ? 600 : 500
                }}
              >
                <span 
                  onClick={(e) => handleFolderToggle(node.id, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    opacity: hasChildren ? 0.8 : 0,
                    cursor: hasChildren ? 'pointer' : 'default',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <ChevronRight size={14} />
                </span>
                
                <Folder size={15} style={{ marginRight: '8px', color: isSelected ? 'var(--text-info)' : 'var(--text-tertiary)' }} />
                
                <span style={{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {node.name}
                </span>
              </div>
              
              {hasChildren && isExpanded && (
                <div style={{ borderLeft: '1px dashed var(--border)', marginLeft: '16px' }}>
                  {renderFolderTree(node.children)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="animation-fade-in" style={{ padding: '20px' }}>
      
      {/* Page Header and Project Dropdown Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', fontWeight: 700 }}>Google Drive Document Portal</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Strictly read-only folder structure mirroring database layout. Files stay on Drive.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Project:</span>
          <select 
            className="form-control" 
            style={{ width: '220px', padding: '8px', borderRadius: 'var(--radius-md)' }}
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projectList.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shared Documents layout Card container */}
      <div className="card" style={{ border: '1.5px solid var(--border)', background: 'var(--bg-primary)', overflow: 'visible' }}>
        <div className="card-body" style={{ padding: '0px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', minHeight: '480px', padding: '20px' }}>
            
            {/* Left Panel: Folders Tree */}
            <div style={{ borderRight: '1px solid var(--border)', paddingRight: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                <Folder size={12} />
                <span>Project Folders</span>
              </div>
              {folders.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '10px' }}>
                  No folders configured for this project.
                </div>
              ) : (
                renderFolderTree(folderTree)
              )}
            </div>

            {/* Right Panel: File viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedFolder ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedFolder.name}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>G-Drive ID: <span style={{ fontFamily: 'monospace' }}>{selectedFolder.gdrive_folder_id}</span></span>
                    </div>
                    
                    <div>
                      <input 
                        type="file" 
                        id="global-file-upload-input" 
                        onChange={handleFileUpload} 
                        style={{ display: 'none' }} 
                        disabled={isUploading}
                      />
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => document.getElementById('global-file-upload-input').click()}
                        disabled={isUploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Upload size={13} />
                        <span>Upload File</span>
                      </button>
                    </div>
                  </div>

                  {isUploading && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        <span>Uploading directly to Google Drive...</span>
                        <strong>{uploadProgress}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--text-info)', transition: 'width 0.1s ease', borderRadius: '3px' }} />
                      </div>
                    </div>
                  )}

                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFileUpload(e); }}
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '30px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.01)',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => document.getElementById('global-file-upload-input').click()}
                  >
                    <Upload size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Drag & drop files here, or click to browse
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      Files are uploaded securely to Google Drive via backend Service Account credentials.
                    </div>
                  </div>

                  <div className="card" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 0 }}>
                    <div className="card-body" style={{ padding: 0 }}>
                      {filesLoading ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <RefreshCw size={20} className="animation-spin" />
                          <span style={{ fontSize: '12.5px' }}>Lazy-loading folder files from Google Drive...</span>
                        </div>
                      ) : files.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12.5px', fontStyle: 'italic' }}>
                          No files found in this folder.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {files.map(file => {
                            const ext = file.name.split('.').pop().toUpperCase();
                            const sizeStr = file.sizeBytes 
                              ? (file.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
                              : '0 KB';
                            const dateStr = file.createdTime 
                              ? new Date(file.createdTime).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—';

                            return (
                              <div 
                                key={file.id} 
                                className="doc-row" 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  padding: '12px 16px',
                                  borderBottom: '1px solid var(--border)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    background: 'var(--bg-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '15px'
                                  }}>
                                    {ext === 'PDF' ? '🗂' : ext === 'XLSX' || ext === 'XLS' ? '📊' : '📄'}
                                  </div>
                                  
                                  <div style={{ overflow: 'hidden' }}>
                                    <div 
                                      style={{ 
                                        fontSize: '13px', 
                                        fontWeight: 500, 
                                        color: 'var(--text-primary)',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {file.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                      {sizeStr} · Created {dateStr}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <a 
                                    href={file.webViewLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                  >
                                    <Download size={12} />
                                    <span>Download</span>
                                  </a>
                                  
                                  <button 
                                    onClick={() => handleTrashFile(file.id)}
                                    className="btn btn-sm btn-ghost"
                                    style={{ color: 'var(--text-danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '320px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  <Folder size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <span>Select a folder from the tree view to browse files.</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
