import React, { useState, useEffect } from 'react';
import { X, Bell, CheckCheck, Heart, MessageSquare, Shield, CheckCircle2 } from 'lucide-react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface NotificationsModalProps {
  onClose: () => void;
  onOpenArticleId?: (articleId: string) => void;
  onOpenAdminJournalists?: () => void;
  onOpenProfile?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onOpenArticleId,
  onOpenAdminJournalists,
  onOpenProfile,
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
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
      await api.markAllNotificationsRead();
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
            {notifications.some((n) => !Boolean(n.read || n.isRead)) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 cursor-pointer transition-all"
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
              {notifications.map((notif) => {
                const isRead = Boolean(notif.read || notif.isRead);
                const targetArticleId = notif.targetId || (notif.link?.startsWith('#article-') ? notif.link.replace('#article-', '') : undefined);
                return (
                  <div
                    key={notif.id}
                    onClick={async () => {
                      if (!isRead) {
                        setNotifications((prev) =>
                          prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
                        );
                        try {
                          await api.markNotificationRead(notif.id);
                          refreshUser();
                        } catch {
                          // Ignore
                        }
                      }

                      if (notif.link === 'admin:journalists' || (notif.type === 'verification' && notif.forAdmin)) {
                        if (onOpenAdminJournalists) {
                          onOpenAdminJournalists();
                          onClose();
                          return;
                        }
                      }

                      if (notif.link === 'profile') {
                        if (onOpenProfile) {
                          onOpenProfile();
                          onClose();
                          return;
                        }
                      }

                      if (targetArticleId && onOpenArticleId) {
                        onOpenArticleId(targetArticleId);
                        onClose();
                      }
                    }}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isRead
                        ? 'bg-[#101428]/80 border-cyan-500/15 opacity-75 hover:opacity-100 hover:border-cyan-500/30'
                        : 'bg-[#101938] border-cyan-500/50 shadow-[0_0_14px_rgba(0,243,255,0.15)]'
                    }`}
                  >
                    <div className="p-2 rounded-full bg-[#141933] border border-cyan-500/30 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm leading-snug ${isRead ? 'text-slate-300' : 'text-slate-100 font-medium'}`}>
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
                    {!isRead ? (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setNotifications((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
                          );
                          try {
                            await api.markNotificationRead(notif.id);
                            refreshUser();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-1 rounded-full hover:bg-cyan-500/20 transition-all cursor-pointer mt-0.5 shrink-0 group"
                        title="Marquer comme lue (cliquez pour faire disparaître le point bleu)"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f3ff] block animate-pulse group-hover:scale-125 transition-transform" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-cyan-500/50 font-mono mt-1 shrink-0 flex items-center gap-1" title="Notification lue">
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-400/60" />
                        <span className="text-[9px] hidden sm:inline text-cyan-400/60">Lue</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
