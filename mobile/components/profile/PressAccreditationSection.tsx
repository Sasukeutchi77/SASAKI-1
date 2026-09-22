import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { User, VerificationRequest } from '../../types';
import { AppIcon } from '../AppIcon';

interface PressAccreditationSectionProps {
  currentUser: User;
  isAdmin: boolean;
  isJournalist: boolean;
  adminRequests: VerificationRequest[];
  loadingRequests: boolean;
  processingRequestId: string | null;
  onRefreshRequests: () => void;
  onReviewRequest: (requestId: string, applicantName: string | undefined, status: 'approved' | 'rejected') => void;
  onOpenApplyModal: () => void;
  onOpenCreateArticle?: (mediaId?: string, mediaName?: string) => void;
  onOpenCreateHouse: () => void;
  onRefreshProfileStatus: () => void;
  refreshingStatus: boolean;
}

export const PressAccreditationSection: React.FC<PressAccreditationSectionProps> = ({
  currentUser,
  isAdmin,
  isJournalist,
  adminRequests,
  loadingRequests,
  processingRequestId,
  onRefreshRequests,
  onReviewRequest,
  onOpenApplyModal,
  onOpenCreateArticle,
  onOpenCreateHouse,
  onRefreshProfileStatus,
  refreshingStatus,
}) => {
  const isPending = currentUser.verificationStatus === 'pending';
  const isApproved = currentUser.verificationStatus === 'approved' || isJournalist;
  const isRejected = currentUser.verificationStatus === 'rejected';

  return (
    <View style={styles.container}>
      {/* 1. SECTION JOURNALISTE & CARTE DE PRESSE OFFICIELLE */}
      {isJournalist ? (
        <View style={styles.pressCardContainer}>
          <View style={styles.pressCardBadgeHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="shield-checkmark" size={16} color="#06b6d4" style={{ marginRight: 6 }} />
              <Text style={styles.pressCardTitle}>CARTE DE PRESSE OFFICIELLE</Text>
            </View>
            <View style={styles.hologramPill}>
              <Text style={styles.hologramText}>ACCRÉDITÉ</Text>
            </View>
          </View>

          <View style={styles.pressCardBody}>
            <View style={styles.pressCardRow}>
              <Text style={styles.pressCardLabel}>Titulaire :</Text>
              <Text style={styles.pressCardValue}>{currentUser.name}</Text>
            </View>

            <View style={styles.pressCardRow}>
              <Text style={styles.pressCardLabel}>ID Accréditation :</Text>
              <Text style={styles.pressCardValueId}>
                {currentUser.pressCardNumber || `CP-PURGE-${currentUser.id.slice(-6).toUpperCase()}`}
              </Text>
            </View>

            <View style={styles.pressCardRow}>
              <Text style={styles.pressCardLabel}>Maison de Presse :</Text>
              <Text style={styles.pressCardValueMedia}>
                {currentUser.mediaName || 'Cellule Indépendante PURGE'}
              </Text>
            </View>

            <View style={styles.pressCardRow}>
              <Text style={styles.pressCardLabel}>Rôle Éditorial :</Text>
              <Text style={styles.pressCardValue}>
                {currentUser.mediaHouseRole || (isAdmin ? 'Administrateur Éditorial' : 'Enquêteur Titulaire')}
              </Text>
            </View>
          </View>

          {/* Actions Rédaction */}
          <View style={styles.journalistActionsRow}>
            {onOpenCreateArticle && (
              <TouchableOpacity
                style={styles.createArticleBtn}
                onPress={() => onOpenCreateArticle(currentUser.mediaId, currentUser.mediaName)}
                activeOpacity={0.8}
              >
                <AppIcon name="pencil" size={14} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.createArticleBtnText}>RÉDIGER UNE ENQUÊTE</Text>
              </TouchableOpacity>
            )}

            {!currentUser.mediaId && (
              <TouchableOpacity
                style={styles.createHouseOutlineBtn}
                onPress={onOpenCreateHouse}
                activeOpacity={0.8}
              >
                <AppIcon name="business" size={13} color="#06b6d4" style={{ marginRight: 6 }} />
                <Text style={styles.createHouseOutlineBtnText}>Fonder une Maison de Presse</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* 2. SECTION CITOYEN : PARCOURS D'ACCRÉDITATION */
        <View style={styles.accreditationFlowCard}>
          <View style={styles.accreditationHeaderRow}>
            <View>
              <Text style={styles.accreditationHeaderTitle}>ACCRÉDITATION JOURNALISTE</Text>
              <Text style={styles.accreditationHeaderSub}>
                Rejoignez le corps d'investigation certifié de PURGE
              </Text>
            </View>

            {isPending ? (
              <View style={styles.statusPillPending}>
                <Text style={styles.statusPillPendingText}>EN EXAMEN</Text>
              </View>
            ) : isRejected ? (
              <View style={styles.statusPillRejected}>
                <Text style={styles.statusPillRejectedText}>NON RETENU</Text>
              </View>
            ) : (
              <View style={styles.statusPillNone}>
                <Text style={styles.statusPillNoneText}>NON SOUMIS</Text>
              </View>
            )}
          </View>

          {/* Étapes du processus */}
          <View style={styles.timelineRow}>
            <View style={styles.stepBox}>
              <View style={[styles.stepCircle, isPending || isApproved ? styles.stepCircleActive : {}]}>
                <Text style={styles.stepNum}>1</Text>
              </View>
              <Text style={styles.stepLabel}>Candidature</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepBox}>
              <View style={[styles.stepCircle, isApproved ? styles.stepCircleActive : isPending ? styles.stepCircleCurrent : {}]}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <Text style={styles.stepLabel}>Examen</Text>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepBox}>
              <View style={[styles.stepCircle, isApproved ? styles.stepCircleActive : {}]}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.stepLabel}>Carte CP</Text>
            </View>
          </View>

          {isPending ? (
            <View style={styles.pendingInfoBox}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <AppIcon name="time" size={14} color="#f59e0b" style={{ marginRight: 6, marginTop: 1 }} />
                <Text style={styles.pendingInfoText}>
                  Votre dossier a bien été transmis. Les administrateurs vérifient votre rigueur méthodologique et vos références.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshStatusBtn}
                onPress={onRefreshProfileStatus}
                disabled={refreshingStatus}
                activeOpacity={0.8}
              >
                {refreshingStatus ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon name="refresh" size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.refreshStatusBtnText}>Actualiser le statut auprès du serveur</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.applyPromptBox}>
              <Text style={styles.applyPromptDesc}>
                L'accréditation confère la signature officielle certifiée, le droit de publier des dépêches en une et la possibilité d’administrer une Maison de Presse.
              </Text>

              <TouchableOpacity
                style={styles.applyPrimaryBtn}
                onPress={onOpenApplyModal}
                activeOpacity={0.8}
              >
                <AppIcon name="shield-checkmark" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.applyPrimaryBtnText}>
                  {isRejected ? 'SOUMETTRE UN NOUVEAU DOSSIER' : 'POSTULER À L’ACCRÉDITATION'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 3. ESPACE ADMINISTRATEUR : CENTRE DE VALIDATION DES DEMANDES */}
      {isAdmin && (
        <View style={styles.adminSectionCard}>
          <View style={styles.adminHeaderRow}>
            <View>
              <Text style={styles.adminTitle}>CENTRE DE VALIDATION DES CANDIDATURES</Text>
              <Text style={styles.adminSub}>
                {adminRequests.length} demande{adminRequests.length > 1 ? 's' : ''} en attente d'évaluation
              </Text>
            </View>

            <TouchableOpacity
              style={styles.adminRefreshBtn}
              onPress={onRefreshRequests}
              disabled={loadingRequests}
              activeOpacity={0.7}
            >
              {loadingRequests ? (
                <ActivityIndicator size="small" color="#06b6d4" />
              ) : (
                <AppIcon name="refresh" size={13} color="#06b6d4" />
              )}
            </TouchableOpacity>
          </View>

          {adminRequests.length === 0 ? (
            <View style={styles.adminEmptyState}>
              <AppIcon name="checkmark-circle" size={24} color="#10b981" style={{ marginBottom: 6 }} />
              <Text style={styles.adminEmptyTitle}>Toutes les demandes sont traitées</Text>
              <Text style={styles.adminEmptyDesc}>
                Aucune candidature de journaliste n'est actuellement en attente.
              </Text>
            </View>
          ) : (
            adminRequests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestApplicantCol}>
                    <Text style={styles.requestName}>{req.userName || 'Candidat Citoyen'}</Text>
                    <Text style={styles.requestEmail}>{req.userEmail}</Text>
                  </View>

                  <View style={styles.requestDateBadge}>
                    <Text style={styles.requestDateText}>
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString('fr-FR') : 'Récent'}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDetailsBox}>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Média visé : </Text>
                    <Text style={styles.requestDetailVal}>{req.mediaName || 'Indépendant'}</Text>
                  </Text>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Référence CP : </Text>
                    <Text style={styles.requestDetailVal}>{req.pressCardNumber || 'Investigation citoyenne'}</Text>
                  </Text>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Motivation : </Text>
                    <Text style={styles.requestDetailVal}>{req.motivation}</Text>
                  </Text>
                  {req.documentUrl ? (
                    <Text style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Portfolio : </Text>
                      <Text style={styles.requestLinkVal}>{req.documentUrl}</Text>
                    </Text>
                  ) : null}
                </View>

                {/* Boutons de décision */}
                <View style={styles.requestActionsRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, processingRequestId === req.id && styles.disabledBtn]}
                    onPress={() => onReviewRequest(req.id, req.userName, 'rejected')}
                    disabled={processingRequestId === req.id}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="close" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.rejectBtnText}>Refuser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.approveBtn, processingRequestId === req.id && styles.disabledBtn]}
                    onPress={() => onReviewRequest(req.id, req.userName, 'approved')}
                    disabled={processingRequestId === req.id}
                    activeOpacity={0.8}
                  >
                    <AppIcon name="checkmark" size={13} color="#10b981" style={{ marginRight: 4 }} />
                    <Text style={styles.approveBtnText}>Valider & Accréditer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 16,
  },
  pressCardContainer: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#06b6d4',
    gap: 12,
  },
  pressCardBadgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
  },
  pressCardTitle: {
    color: '#06b6d4',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  hologramPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hologramText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressCardBody: {
    backgroundColor: 'rgba(2, 5, 18, 0.7)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  pressCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pressCardLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  pressCardValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pressCardValueId: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pressCardValueMedia: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
  },
  journalistActionsRow: {
    gap: 8,
    marginTop: 4,
  },
  createArticleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    paddingVertical: 12,
    borderRadius: 10,
  },
  createArticleBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  createHouseOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  createHouseOutlineBtnText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '800',
  },
  // Flow Citoyen
  accreditationFlowCard: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gap: 14,
  },
  accreditationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accreditationHeaderTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  accreditationHeaderSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statusPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillPendingText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '900',
  },
  statusPillRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillRejectedText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
  },
  statusPillNone: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderWidth: 1,
    borderColor: '#64748b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillNoneText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  stepBox: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  stepCircleCurrent: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b',
  },
  stepNum: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  stepLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1e293b',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  pendingInfoBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  pendingInfoText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  refreshStatusBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshStatusBtnText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  applyPromptBox: {
    gap: 12,
  },
  applyPromptDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  applyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 10,
  },
  applyPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Admin Card
  adminSectionCard: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    gap: 12,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adminSub: {
    color: '#06b6d4',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  adminRefreshBtn: {
    padding: 6,
    backgroundColor: '#0b1329',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  adminEmptyState: {
    backgroundColor: 'rgba(2, 5, 18, 0.6)',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  adminEmptyTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  adminEmptyDesc: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#020512',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestApplicantCol: {
    flex: 1,
  },
  requestName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  requestEmail: {
    color: '#94a3b8',
    fontSize: 11,
  },
  requestDateBadge: {
    backgroundColor: '#0b1329',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requestDateText: {
    color: '#64748b',
    fontSize: 10,
  },
  requestDetailsBox: {
    backgroundColor: '#070d1e',
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  requestDetailRow: {
    fontSize: 11,
    lineHeight: 16,
  },
  requestDetailLabel: {
    color: '#64748b',
    fontWeight: '700',
  },
  requestDetailVal: {
    color: '#cbd5e1',
  },
  requestLinkVal: {
    color: '#06b6d4',
    textDecorationLine: 'underline',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 8,
    borderRadius: 6,
  },
  rejectBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  approveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
