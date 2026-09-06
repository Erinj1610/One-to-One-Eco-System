import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Folder, 
  FolderPlus, 
  File, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  Eye, 
  Download, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Upload, 
  ExternalLink, 
  X, 
  Plus, 
  Edit2, 
  Search, 
  Check,
  AlertCircle,
  Clock
} from 'lucide-react';
import { API_BASE } from '../../api_config';

export default function DriveFileExplorer({
  scope = 'project', // 'project' | 'order' | 'client' | 'design' | 'global'
  projectId,
  orderId,
  clientId,
  designId,
  projectName = '',
  clientName = '',
  orderRef = '',
  designRef = '',
  readOnly = false
}) {
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  // Search & Filter
  const [fileSearch, setFileSearch] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // In-App Preview Drawer
  const [previewFile, setPreviewFile] = useState(null);

  // Folder creation inline state
  const [creatingSubfolderOf, setCreatingSubfolderOf] = useState(null); // folder ID or 'root'
  const [newFolderName, setNewFolderName] = useState('');

  // Folder renaming state
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameInputVal, setRenameInputVal] = useState('');

  // Fetch folders based on current scope
  const loadFolders = async () => {
    let url = '';
    if (scope === 'order') {
      if (!orderId) return;
      url = `${API_BASE}/api/documents/order/${orderId}/folders`;
    } else if (scope === 'design') {
      if (!designId) return;
      url = `${API_BASE}/api/documents/design/${designId}/folders`;
    } else if (scope === 'client') {
      if (!clientId) return;
      url = `${API_BASE}/api/documents/client/${clientId}/folders`;
    } else if (scope === 'global') {
      url = `${API_BASE}/api/documents/tree`;
    } else {
      // project
      if (!projectId) return;
      url = `${API_BASE}/api/documents/${projectId}/folders`;
    }

    setFoldersLoading(true);
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];
        setFolders(safeData);

        // Auto-expand special containers
        const initialExpanded = {};
        safeData.forEach(f => {
          if (
            f.type === 'order_root' || 
            f.type === 'orders_root' || 
            f.type === 'design_root' || 
            f.type === 'design_package' ||
            f.type === 'client_root' ||
            f.type === 'project_folder' ||
            f.type === 'project_root' ||
            f.is_client_root
          ) {
            initialExpanded[f.id] = true;
          }
        });
        setExpandedFolders(prev => ({ ...initialExpanded, ...prev }));

        // Auto-select folder if none selected
        if (safeData.length > 0) {
          if (!selectedFolder || !safeData.some(f => f.id === selectedFolder.id)) {
            const preferred = (scope === 'order' 
              ? safeData.find(f => f.type === 'order_sub') 
              : scope === 'design'
              ? safeData.find(f => f.type === 'design_sub')
              : safeData[0]) || safeData[0];
            handleSelectFolder(preferred);
          }
        }
      } else {
        setFolders([]);
      }
    } catch (err) {
      console.error("Failed to load folders:", err);
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, [scope, projectId, orderId, clientId, designId]);

  // Fetch files when selected folder changes
  const handleSelectFolder = async (folder) => {
    setSelectedFolder(folder);
    if (!folder || !folder.gdrive_folder_id) {
      setFiles([]);
      return;
    }
    setFilesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${folder.gdrive_folder_id}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const toggleFolderExpand = (folderId, e) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Build hierarchical folder tree
  const folderTree = useMemo(() => {
    const safeFolders = Array.isArray(folders) ? folders : [];
    const map = {};
    const roots = [];

    safeFolders.forEach(node => {
      map[node.id] = { ...node, children: [] };
    });

    safeFolders.forEach(node => {
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(map[node.id]);
      } else {
        roots.push(map[node.id]);
      }
    });

    // Sort by sort_order then name
    roots.sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99) || (a.name || '').localeCompare(b.name || ''));
    return roots;
  }, [folders]);

  // Create Subfolder
  const handleConfirmCreateFolder = async (parentFolderId) => {
    if (!newFolderName.trim()) {
      setCreatingSubfolderOf(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/documents/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_folder_id: parentFolderId,
          name: newFolderName.trim()
        })
      });

      if (res.ok) {
        setNewFolderName('');
        setCreatingSubfolderOf(null);
        await loadFolders();
      } else {
        const errData = await res.json();
        alert(`Failed to create folder: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error creating folder:", err);
      alert("Network error creating folder.");
    }
  };

  // Rename Folder
  const handleConfirmRename = async (folderId) => {
    if (!renameInputVal.trim()) {
      setRenamingFolderId(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInputVal.trim() })
      });

      if (res.ok) {
        setRenamingFolderId(null);
        setRenameInputVal('');
        await loadFolders();
      } else {
        alert("Failed to rename folder.");
      }
    } catch (err) {
      console.error("Error renaming folder:", err);
    }
  };

  // Trash Folder
  const handleTrashFolder = async (folder, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to move the folder "${folder.name}" to Google Drive Trash?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${folder.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (selectedFolder?.id === folder.id) {
          setSelectedFolder(null);
          setFiles([]);
        }
        await loadFolders();
      } else {
        alert("Failed to delete folder.");
      }
    } catch (err) {
      console.error("Error deleting folder:", err);
    }
  };

  // Upload Files to selected folder
  const handleProcessUpload = async (fileList) => {
    if (!fileList || fileList.length === 0 || !selectedFolder) return;
    setIsUploading(true);
    setUploadProgress(15);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', fileList[0]);

    const timer = setInterval(() => {
      setUploadProgress(p => (p >= 85 ? p : p + 15));
    }, 120);

    try {
      const res = await fetch(`${API_BASE}/api/documents/folders/${selectedFolder.gdrive_folder_id}/upload`, {
        method: 'POST',
        body: formData
      });

      clearInterval(timer);

      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          handleSelectFolder(selectedFolder);
        }, 400);
      } else {
        const err = await res.json();
        setUploadError(err.detail || "Upload failed.");
        setIsUploading(false);
      }
    } catch (err) {
      clearInterval(timer);
      console.error("Upload failed:", err);
      setUploadError(err.message || "Network error uploading file.");
      setIsUploading(false);
    }
  };

  // Trash File
  const handleTrashFile = async (file) => {
    if (!window.confirm(`Move "${file.name}" to Google Drive Trash?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/documents/files/${file.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== file.id));
        if (previewFile?.id === file.id) {
          setPreviewFile(null);
        }
      } else {
        alert("Failed to move file to trash.");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!fileSearch.trim()) return files;
    const q = fileSearch.toLowerCase();
    return files.filter(f => (f.name || '').toLowerCase().includes(q));
  }, [files, fileSearch]);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  const getFileIcon = (file) => {
    const mime = (file.mimeType || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText size={18} style={{ color: '#ef4444' }} />;
    }
    if (mime.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return <Image size={18} style={{ color: '#3b82f6' }} />;
    }
    if (mime.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv') || name.endsWith('.sheet')) {
      return <FileSpreadsheet size={18} style={{ color: '#10b981' }} />;
    }
    return <File size={18} style={{ color: 'var(--text-secondary)' }} />;
  };

  const isPreviewable = (file) => {
    const mime = (file?.mimeType || '').toLowerCase();
    const name = (file?.name || '').toLowerCase();
    return mime.includes('pdf') || mime.includes('image') || name.endsWith('.pdf') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
  };

  // Render tree node recursively
  const renderTreeNodes = (nodes) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nodes.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = !!expandedFolders[node.id];
          const isSelected = selectedFolder?.id === node.id;
          const isRenaming = renamingFolderId === node.id;
          const isAddingSubfolder = creatingSubfolderOf === node.id;

          return (
            <div key={node.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  border: isSelected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  color: isSelected ? 'var(--text-info)' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 0.15s'
                }}
                onClick={() => handleSelectFolder(node)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  {hasChildren ? (
                    <span 
                      onClick={(e) => toggleFolderExpand(node.id, e)}
                      style={{ display: 'inline-flex', padding: '2px', cursor: 'pointer', opacity: 0.7 }}
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                  ) : (
                    <span style={{ width: '17px' }} />
                  )}

                  <Folder size={14} style={{ color: isSelected ? '#3b82f6' : '#f59e0b', flexShrink: 0 }} />

                  {isRenaming ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <input 
                        type="text"
                        className="form-control"
                        style={{ height: '22px', fontSize: '11px', padding: '1px 4px' }}
                        value={renameInputVal}
                        onChange={e => setRenameInputVal(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleConfirmRename(node.id);
                          if (e.key === 'Escape') setRenamingFolderId(null);
                        }}
                      />
                      <button className="btn btn-ghost btn-xs" onClick={() => handleConfirmRename(node.id)}>
                        <Check size={11} style={{ color: 'var(--text-success)' }} />
                      </button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setRenamingFolderId(null)}>
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {node.name}
                    </span>
                  )}
                </div>

                {!readOnly && !isRenaming && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', opacity: isSelected ? 0.9 : 0.4 }} onClick={e => e.stopPropagation()}>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      style={{ padding: '2px 4px', height: 'auto' }}
                      title="New Subfolder"
                      onClick={() => {
                        setCreatingSubfolderOf(node.id);
                        setNewFolderName('');
                      }}
                    >
                      <Plus size={11} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-xs" 
                      style={{ padding: '2px 4px', height: 'auto' }}
                      title="Rename"
                      onClick={() => {
                        setRenamingFolderId(node.id);
                        setRenameInputVal(node.name);
                      }}
                    >
                      <Edit2 size={11} />
                    </button>
                    {node.sort_order === 99 && (
                      <button 
                        className="btn btn-ghost btn-xs" 
                        style={{ padding: '2px 4px', height: 'auto', color: 'var(--text-danger)' }}
                        title="Delete Folder"
                        onClick={(e) => handleTrashFolder(node, e)}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Subfolder input if open */}
              {isAddingSubfolder && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '28px', marginTop: '3px' }}>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="New subfolder name..."
                    style={{ height: '22px', fontSize: '11px', padding: '1px 6px' }}
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleConfirmCreateFolder(node.id);
                      if (e.key === 'Escape') setCreatingSubfolderOf(null);
                    }}
                  />
                  <button className="btn btn-primary btn-xs" onClick={() => handleConfirmCreateFolder(node.id)}>
                    <Check size={11} />
                  </button>
                  <button className="btn btn-ghost btn-xs" onClick={() => setCreatingSubfolderOf(null)}>
                    <X size={11} />
                  </button>
                </div>
              )}

              {/* Child nodes */}
              {hasChildren && isExpanded && (
                <div style={{ paddingLeft: '14px', borderLeft: '1px dashed var(--border)', marginLeft: '14px', marginTop: '2px' }}>
                  {renderTreeNodes(node.children)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      
      {/* HEADER / TOOLBAR */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={16} style={{ color: '#3b82f6' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Google Drive File System
          </span>
          {scope === 'order' && (
            <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Order: {orderRef || orderId}
            </span>
          )}
          {scope === 'design' && (
            <span style={{ fontSize: '11px', color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Design: {designRef || designId}
            </span>
          )}
          {scope === 'project' && projectName && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              Project: {projectName}
            </span>
          )}
          {scope === 'client' && clientName && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              Client: {clientName}
            </span>
          )}
          {scope === 'global' && (
            <span style={{ fontSize: '11px', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Company Master Drive
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-tertiary)' }} />
            <input 
              type="text" 
              placeholder="Search files..."
              className="form-control"
              style={{ height: '26px', fontSize: '11.5px', paddingLeft: '26px', background: 'var(--bg-primary)' }}
              value={fileSearch}
              onChange={e => setFileSearch(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-ghost btn-sm" 
            style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
            title="Refresh from Google Drive"
            onClick={() => {
              loadFolders();
              if (selectedFolder) handleSelectFolder(selectedFolder);
            }}
          >
            <RefreshCw size={12} className={foldersLoading || filesLoading ? 'spin' : ''} /> Refresh
          </button>

          {!readOnly && (
            <button 
              className="btn btn-primary btn-sm" 
              style={{ padding: '4px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={!selectedFolder}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={12} /> Upload to Folder
            </button>
          )}

          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => handleProcessUpload(e.target.files)}
          />
        </div>
      </div>

      {/* UPLOAD PROGRESS BAR */}
      {isUploading && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px 16px', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={13} className="spin" style={{ color: 'var(--text-info)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
              <span>Streaming file directly to Google Drive...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
            </div>
          </div>
        </div>
      )}

      {uploadError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 16px', fontSize: '11.5px', color: 'var(--text-danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} /> {uploadError}
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => setUploadError(null)}><X size={11} /></button>
        </div>
      )}

      {/* MAIN TWO-PANE EXPLORER */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        
        {/* LEFT PANE: FOLDERS TREE */}
        <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              {scope === 'order' ? 'Order Folders' : scope === 'design' ? 'Design Folders' : scope === 'client' ? 'Client Folders' : scope === 'global' ? 'All Folders' : 'Project Folders'}
            </span>
            {!readOnly && (
              <button 
                className="btn btn-ghost btn-xs" 
                style={{ padding: '2px 6px', fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-info)' }}
                title="Create custom folder"
                onClick={() => {
                  const rootTarget = selectedFolder?.id || folders[0]?.project_gdrive_id || folders[0]?.id;
                  if (rootTarget) {
                    setCreatingSubfolderOf(rootTarget);
                    setNewFolderName('');
                  }
                }}
              >
                <FolderPlus size={11} /> New Folder
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', scrollbarWidth: 'thin' }}>
            {foldersLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={14} className="spin" style={{ margin: '0 auto 6px' }} />
                Loading Drive tree...
              </div>
            ) : folderTree.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                No folders available.
              </div>
            ) : (
              renderTreeNodes(folderTree)
            )}
          </div>
        </div>

        {/* RIGHT PANE: FILES IN SELECTED FOLDER */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: isDragOver ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-primary)',
            position: 'relative'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer?.files) {
              handleProcessUpload(e.dataTransfer.files);
            }
          }}
        >
          {/* Breadcrumbs & Selected Folder Header */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Drive</span>
              <ChevronRight size={11} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedFolder ? selectedFolder.name : 'Select a folder'}
              </span>
              {selectedFolder && (
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  ({filteredFiles.length} item{filteredFiles.length === 1 ? '' : 's'})
                </span>
              )}
            </div>

            {selectedFolder?.webViewLink && (
              <a 
                href={selectedFolder.webViewLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-ghost btn-xs"
                style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}
              >
                Open in Drive <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Files List / Table */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {filesLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                <RefreshCw size={16} className="spin" style={{ margin: '0 auto 8px' }} />
                Reading files from Google Drive...
              </div>
            ) : !selectedFolder ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                Select a folder on the left to view files.
              </div>
            ) : filteredFiles.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Folder size={32} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No files in this folder yet
                </div>
                <div style={{ fontSize: '11.5px', maxWidth: '320px', margin: '0 auto 16px', lineHeight: '1.4' }}>
                  Drag and drop PDFs, drawings, or documents here, or click upload to add to Google Drive.
                </div>
                {!readOnly && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '11.5px' }}
                  >
                    <Upload size={12} /> Choose File to Upload
                  </button>
                )}
              </div>
            ) : (
              <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600 }}>File Name</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '110px' }}>Size</th>
                    <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, width: '130px' }}>Uploaded</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(file => (
                    <tr 
                      key={file.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border)',
                        background: previewFile?.id === file.id ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getFileIcon(file)}
                        <span 
                          style={{ fontWeight: 500, color: 'var(--text-primary)', cursor: isPreviewable(file) ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (isPreviewable(file)) setPreviewFile(file);
                          }}
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </td>

                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                        {formatBytes(file.sizeBytes)}
                      </td>

                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                        {formatDate(file.createdTime || file.modifiedTime)}
                      </td>

                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          {isPreviewable(file) && (
                            <button 
                              className="btn btn-ghost btn-xs"
                              title="Preview in Portal"
                              onClick={() => setPreviewFile(file)}
                              style={{ padding: '3px 6px', fontSize: '11px', color: 'var(--text-info)', display: 'flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Eye size={12} /> Preview
                            </button>
                          )}

                          {file.webContentLink && (
                            <a 
                              href={file.webContentLink}
                              download
                              className="btn btn-ghost btn-xs"
                              title="Download file"
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            >
                              <Download size={12} />
                            </a>
                          )}

                          {file.webViewLink && (
                            <a 
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-xs"
                              title="Open in Google Drive"
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            >
                              <ExternalLink size={11} />
                            </a>
                          )}

                          {!readOnly && (
                            <button 
                              className="btn btn-ghost btn-xs"
                              title="Move to Trash"
                              onClick={() => handleTrashFile(file)}
                              style={{ padding: '3px 6px', color: 'var(--text-danger)' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* IN-PORTAL PREVIEW DRAWER */}
        {previewFile && (
          <div style={{
            width: '450px',
            flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
          }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                {getFileIcon(previewFile)}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewFile.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {previewFile.webViewLink && (
                  <a 
                    href={previewFile.webViewLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-xs"
                    title="Open in Drive"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
                <button className="btn btn-ghost btn-xs" onClick={() => setPreviewFile(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#1e293b', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(previewFile.mimeType || '').includes('image') ? (
                <img 
                  src={`${API_BASE}/api/documents/files/${previewFile.id}/stream`} 
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe 
                  src={`${API_BASE}/api/documents/files/${previewFile.id}/stream`}
                  title={previewFile.name}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
