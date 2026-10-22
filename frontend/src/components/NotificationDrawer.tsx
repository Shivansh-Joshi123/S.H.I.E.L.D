import React, { useState } from 'react';
import type { NotificationItem } from '../types';
import { X, CheckCheck, Bell, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  const [filterUnread, setFilterUnread] = useState(false);

  if (!isOpen) return null;

  const filtered = filterUnread ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Maintenance Notification Center</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader / Filters */}
          <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterUnread(false)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  !filterUnread ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilterUnread(true)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  filterUnread ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold text-[11px]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Banner clarifying simulated notifications */}
          <div className="p-3 bg-cyan-950/30 border-b border-cyan-900/30 text-[11px] text-cyan-300/80 leading-snug">
            <strong>System Notice:</strong> In-application alerts generated for maintenance personnel dispatch.
            External SMS/Email dispatch requires physical modem/API configuration.
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <ShieldCheck className="w-10 h-10 mb-2 opacity-40 text-emerald-400" />
                <span>No notifications to show. System running smoothly.</span>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.read && onMarkRead(item.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    item.read
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-80'
                      : 'bg-slate-800/40 border-slate-700/80 shadow-md hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-2">
                      {getSeverityIcon(item.severity)}
                      <h4 className="text-xs font-bold text-white">{item.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour12: false })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">{item.message}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-900 font-mono font-semibold">
                      {item.type}
                    </span>
                    {!item.read && (
                      <span className="text-cyan-400 font-bold flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mr-1" />
                        Click to mark read
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
