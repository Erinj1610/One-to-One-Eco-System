import React, { useEffect, useState } from 'react';

/**
 * GlobalToastNotification
 * Non-intrusive, luxury brand floating toast alert system.
 * Automatically handles window.otoToast(message, type) and intercepts/upgrades window.alert()
 * so user never suffers through modal popups for informational notifications.
 */
export default function GlobalToastNotification() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Custom global toast method
    window.otoToast = (message, type = 'info', duration = 3500) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 6);
      const text = typeof message === 'string' ? message : JSON.stringify(message);

      setToasts(prev => [...prev.slice(-4), { id, text, type }]); // Keep at most 5

      if (duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
      }
    };

    // Gracefully route native window.alert to sleek, non-blocking toast
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const str = String(msg || '');
      // Determine if it is error-like or success-like
      const isError = str.toLowerCase().includes('fail') || 
                      str.toLowerCase().includes('error') || 
                      str.toLowerCase().includes('denied') ||
                      str.toLowerCase().includes('cannot');
      const isSuccess = str.toLowerCase().includes('success') || 
                        str.toLowerCase().includes('saved') || 
                        str.toLowerCase().includes('created') ||
                        str.toLowerCase().includes('copied');
      
      const type = isError ? 'error' : isSuccess ? 'success' : 'info';
      window.otoToast(str, type, isError ? 4500 : 3500);
    };

    // Clean up
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        pointerEvents: 'none'
      }}
    >
      {toasts.map(t => {
        let borderColor = 'rgba(224, 153, 36, 0.4)';
        let iconBg = 'rgba(224, 153, 36, 0.15)';
        let iconColor = '#e09924';
        let iconChar = 'ℹ';

        if (t.type === 'success') {
          borderColor = 'rgba(34, 197, 94, 0.45)';
          iconBg = 'rgba(34, 197, 94, 0.15)';
          iconColor = '#22c55e';
          iconChar = '✓';
        } else if (t.type === 'error') {
          borderColor = 'rgba(239, 68, 68, 0.45)';
          iconBg = 'rgba(239, 68, 68, 0.15)';
          iconColor = '#ef4444';
          iconChar = '✕';
        }

        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              backgroundColor: '#161c26',
              color: '#f8fafc',
              border: `1px solid ${borderColor}`,
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
              borderRadius: '9px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '13px',
              fontWeight: '500',
              lineHeight: '1.45',
              cursor: 'pointer',
              animation: 'modalPopIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={() => removeToast(t.id)}
            title="Click to dismiss"
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: iconBg,
                color: iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 'bold',
                flexShrink: 0
              }}
            >
              {iconChar}
            </div>
            <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingTop: '1px' }}>
              {t.text}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: '1',
                padding: '0 2px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
