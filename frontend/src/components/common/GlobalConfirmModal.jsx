import React, { useEffect, useState } from 'react';

/**
 * GlobalConfirmModal
 * Elegant, branded replacement for jarring browser native `window.confirm()`.
 * Intercepts or offers an async confirm dialog with a luxury alert card,
 * backdrop blur, Escape to cancel, Enter to confirm.
 */
export default function GlobalConfirmModal() {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    message: '',
    title: 'Confirm Action',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: true,
    resolve: null
  });

  useEffect(() => {
    // Override window.confirm or hook into a custom event
    const originalConfirm = window.confirm;

    // Custom global confirm dispatcher
    window.otoConfirm = (message, options = {}) => {
      return new Promise((resolve) => {
        setDialogState({
          isOpen: true,
          message: typeof message === 'string' ? message : JSON.stringify(message),
          title: options.title || (options.isDanger !== false ? 'Confirm Action' : 'Notice'),
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          isDanger: options.isDanger !== false,
          resolve
        });
      });
    };

    // We can also gracefully hijack window.confirm asynchronously via custom event if desired,
    // or provide the seamless bridge:
    const handleTrigger = (e) => {
      if (e.detail && e.detail.message) {
        window.otoConfirm(e.detail.message, e.detail.options).then(res => {
          if (e.detail.callback) e.detail.callback(res);
        });
      }
    };

    window.addEventListener('oto-confirm-trigger', handleTrigger);

    return () => {
      window.removeEventListener('oto-confirm-trigger', handleTrigger);
    };
  }, []);

  const handleClose = (result) => {
    if (dialogState.resolve) {
      dialogState.resolve(result);
    }
    setDialogState(prev => ({ ...prev, isOpen: false, resolve: null }));
  };

  useEffect(() => {
    if (!dialogState.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose(false);
      } else if (e.key === 'Enter') {
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen, dialogState.resolve]);

  if (!dialogState.isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={() => handleClose(false)}
    >
      <div
        style={{
          backgroundColor: '#181e29',
          border: '1px solid rgba(224, 153, 36, 0.35)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
          animation: 'modalPopIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#f8fafc',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: dialogState.isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(224, 153, 36, 0.15)',
              border: `1px solid ${dialogState.isDanger ? 'rgba(239, 68, 68, 0.35)' : 'rgba(224, 153, 36, 0.35)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '18px',
              color: dialogState.isDanger ? '#ef4444' : '#e09924'
            }}
          >
            {dialogState.isDanger ? '⚠' : 'ℹ'}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>
              {dialogState.title}
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {dialogState.message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button
            type="button"
            onClick={() => handleClose(false)}
            style={{
              padding: '8px 16px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            {dialogState.cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => handleClose(true)}
            style={{
              padding: '8px 18px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: dialogState.isDanger ? '#dc2626' : '#e09924',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: dialogState.isDanger 
                ? '0 2px 8px rgba(220, 38, 38, 0.4)' 
                : '0 2px 8px rgba(224, 153, 36, 0.4)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            {dialogState.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
