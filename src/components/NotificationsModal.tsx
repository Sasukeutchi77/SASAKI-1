import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Heart, MessageSquare, Shield, CheckCircle2 } from 'lucide-react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NotificationsModalProps {
  onClose: () => void;
  onOpenArticleId?: (articleId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onOpenArticleId,
}) => {
  const { refreshUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'verification':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'system':
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0b0e1a] border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(0,243,255,0.2)] overflow-hidden flex flex-col my-4 max-h-[85vh] text-slate-100 transition-all">
        {/* Header */}
        <div className="bg-[#101428] border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-black font-mono tracking-wide text-white">Vos Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tout marquer comme lu</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-cyan-400/60 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-cyan-400/60 font-mono">Chargement des alertes...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-cyan-400/50">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" />
              <p className="font-semibold text-slate-300">Aucune notification</p>
              <p className="text-xs text-cyan-400/60 font-mono mt-1">Vous êtes à jour dans votre flux d'actualité.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.targetId && onOpenArticleId) {
                      onOpenArticleId(notif.targetId);
                      onClose();
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                    notif.isRead
                      ? 'bg-[#101428] border-cyan-500/20 opacity-80 hover:opacity-100 hover:border-cyan-500/40'
                      : 'bg-[#101938] border-cyan-500/40 shadow-[0_0_12px_rgba(0,243,255,0.12)]'
                  }`}
                >
                  <div className="p-2 rounded-full bg-[#141933] border border-cyan-500/30 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-slate-100 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-cyan-400/60 font-mono mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f3ff] mt-1.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
