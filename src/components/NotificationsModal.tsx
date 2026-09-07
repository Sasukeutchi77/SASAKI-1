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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-4 max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-stone-900">Vos Notifications</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tout marquer comme lu</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-stone-400">Chargement des alertes...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-stone-400">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-stone-700">Aucune notification</p>
              <p className="text-xs text-stone-500 mt-1">Vous êtes à jour dans votre fil d'actualité.</p>
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
                      ? 'bg-white border-stone-200'
                      : 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                  }`}
                >
                  <div className="p-2 rounded-full bg-white border border-stone-200 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-stone-800 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
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
