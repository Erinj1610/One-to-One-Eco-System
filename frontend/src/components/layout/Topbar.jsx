import React from 'react';
import { Bell } from 'lucide-react';

export default function Topbar({ title }) {
  return (
    <div className="topbar">
      <div className="topbar-title">{title || 'Portal'}</div>
      <div className="topbar-right">
        <Bell size={18} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
        <div className="av">JV</div>
      </div>
    </div>
  );
}
