const fs = require('fs');
const file = 'c:/Users/tarig/Desktop/RMS/frontend/src/components/DashboardShell.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add useRef to imports
if (!content.includes('useRef')) {
  content = content.replace('import React, { useEffect, useState } from', 'import React, { useEffect, useState, useRef } from');
}

// 2. Add alerts state
const stateMarker = 'const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});';
if (!content.includes('const [alerts, setAlerts]')) {
  const stateCode = `
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const pid = activePlant?.id || 'global';
        const res = await api.get(\`/dashboard/alerts/\${pid}\`);
        setAlerts(res.data);
      } catch(e) {}
    };
    if (activePlant) {
      fetchAlerts();
    }
  }, [activePlant]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);`;
  content = content.replace(stateMarker, stateMarker + '\n' + stateCode);
}

// 3. Replace bell icon HTML carefully
const bellRegex = /<button className="relative p-2 text-\[var\(--text-muted-alt\)\] hover:text-\[var\(--text-main\)\]">\s*<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">[\s\S]*?<span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"><\/span>\s*<\/button>/;

const newBellHtml = `
<div className="relative" ref={notificationsRef}>
  <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    {alerts.length > 0 && (
      <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[var(--bg-base)]">
        {alerts.length > 9 ? '9+' : alerts.length}
      </span>
    )}
  </button>
  
  {showNotifications && (
    <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] flex justify-between items-center">
        <h3 className="font-semibold text-sm text-[var(--text-main)]">Notifications</h3>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-base)] px-2 py-0.5 rounded-full">{alerts.length} New</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted-alt)] text-sm">No new notifications.</div>
        ) : (
          alerts.map((alert, i) => (
            <div key={i} className={\`p-4 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-base)] transition-colors cursor-pointer \${alert.type === 'LowStock' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-yellow-500'}\`}>
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-sm font-medium text-[var(--text-main)]">{alert.title}</h4>
                <span className="text-[10px] text-[var(--text-muted-alt)]">{alert.time}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2">{alert.details}</p>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--glass-bg)] text-center">
        <button onClick={() => { setShowNotifications(false); window.location.href = '/dashboard'; }} className="text-xs text-[#e67e00] hover:underline font-medium">View All Alerts in Dashboard</button>
      </div>
    </div>
  )}
</div>`;

content = content.replace(bellRegex, newBellHtml);
fs.writeFileSync(file, content);
console.log('Successfully updated DashboardShell.tsx safely');
