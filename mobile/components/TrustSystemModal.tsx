import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface TrustSystemModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const TrustSystemModal: React.FC<TrustSystemModalProps> = ({
  visible,
  onClose,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'levels' | 'difference' | 'moderation' | 'charter'>('levels');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shieldIconWrapper}>
                <Text style={styles.shieldIcon}>🛡️</Text>
              </View>
              <View style={styles.titleWrapper}>
                <View style={styles.titleBadgeRow}>
                  <Text style={styles.title}>Système de Confiance</Text>
                  <View style={styles.certifiedBadge}>
                    <Text style={styles.certifiedText}>CERTIFIÉ</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>
                  Déontologie, rigueur journalistique & lutte contre les fake news
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation par onglets */}
          <View style={styles.tabNav}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'levels' && styles.tabBtnActive]}
                onPress={() => setActiveTab('levels')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, activeTab === 'levels' && styles.tabBtnTextActive]}>
                  3 Niveaux
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'difference' && styles.tabBtnActive]}
                onPress={() => setActiveTab('difference')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, activeTab === 'difference' && styles.tabBtnTextActive]}>
                  vs Réseaux Sociaux
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'moderation' && styles.tabBtnActive]}
                onPress={() => setActiveTab('moderation')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, activeTab === 'moderation' && styles.tabBtnTextActive]}>
                  Modération
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'charter' && styles.tabBtnActive]}
                onPress={() => setActiveTab('charter')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabBtnText, activeTab === 'charter' && styles.tabBtnTextActive]}>
                  Charte
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Corps de contenu */}
          <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'levels' && (
              <View style={styles.section}>
                <Text style={styles.sectionIntro}>
                  Sur PURGE-INFO, l’information est encadrée par une pyramide de confiance stricte en trois niveaux pour garantir une authenticité irréprochable.
                </Text>

                <View style={styles.levelCard}>
                  <View style={styles.levelHeader}>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>NIVEAU 1</Text>
                    </View>
                    <Text style={styles.levelTitle}>Journaliste Accrédité</Text>
                  </View>
                  <Text style={styles.levelDesc}>
                    Identité vérifiée ou accréditation validée par l'administration. Le journaliste répond personnellement de ses écrits et s'engage à citer ses sources de terrain.
                  </Text>
                </View>

                <View style={[styles.levelCard, styles.levelCardGreen]}>
                  <View style={styles.levelHeader}>
                    <View style={[styles.levelBadge, styles.levelBadgeGreen]}>
                      <Text style={styles.levelBadgeTextGreen}>NIVEAU 2</Text>
                    </View>
                    <Text style={styles.levelTitle}>Maison de Presse Fondée</Text>
                  </View>
                  <Text style={styles.levelDesc}>
                    Organe éditorial doté d'une ligne directrice transparente, d'un rédacteur en chef et d'une équipe de journalistes. La réputation de la maison est indexée sur la fiabilité de ses dépêches.
                  </Text>
                </View>

                <View style={[styles.levelCard, styles.levelCardGold]}>
                  <View style={styles.levelHeader}>
                    <View style={[styles.levelBadge, styles.levelBadgeGold]}>
                      <Text style={styles.levelBadgeTextGold}>NIVEAU 3</Text>
                    </View>
                    <Text style={styles.levelTitle}>Dépêche Factuelle Vérifiée</Text>
                  </View>
                  <Text style={styles.levelDesc}>
                    Article soumis au recoupement, respectant le pluralisme, le droit de réponse et exempt de manipulations sensationalistes. Score de confiance calculé en temps réel.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'difference' && (
              <View style={styles.section}>
                <Text style={styles.sectionIntro}>
                  Pourquoi PURGE-INFO est le contre-modèle radical des réseaux sociaux traditionnels :
                </Text>

                <View style={styles.diffCard}>
                  <Text style={styles.diffTitle}>❌ Sur les réseaux classiques</Text>
                  <Text style={styles.diffText}>
                    • Algorithmes d'indignation valorisant le buzz et la haine.{'\n'}
                    • Fermes à trolls et faux profils anonymes non traçables.{'\n'}
                    • Aucune vérification des faits avant la diffusion massive.
                  </Text>
                </View>

                <View style={[styles.diffCard, styles.diffCardOk]}>
                  <Text style={styles.diffTitleOk}>✨ Sur PURGE-INFO</Text>
                  <Text style={styles.diffTextOk}>
                    • Pas de manipulation algorithmique : flux chronologique ou par pertinence factuelle.{'\n'}
                    • Auteurs et rédactions pleinement identifiés et responsables.{'\n'}
                    • Droit de réponse et rectificatifs publics affichés avec transparence.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'moderation' && (
              <View style={styles.section}>
                <Text style={styles.sectionIntro}>
                  Un protocole de modération impartial piloté par la communauté citoyenne et le collège des rédactions.
                </Text>

                <View style={styles.modStepCard}>
                  <Text style={styles.modStepNumber}>01</Text>
                  <View style={styles.modStepContent}>
                    <Text style={styles.modStepTitle}>Signalement Citoyen</Text>
                    <Text style={styles.modStepDesc}>
                      Tout lecteur peut signaler une inexactitude, une diffamation ou un manquement déontologique avec pièces justificatives.
                    </Text>
                  </View>
                </View>

                <View style={styles.modStepCard}>
                  <Text style={styles.modStepNumber}>02</Text>
                  <View style={styles.modStepContent}>
                    <Text style={styles.modStepTitle}>Audit Déontologique</Text>
                    <Text style={styles.modStepDesc}>
                      L'équipe d'audit examine la contestation auprès de l'auteur et de sa maison de presse.
                    </Text>
                  </View>
                </View>

                <View style={styles.modStepCard}>
                  <Text style={styles.modStepNumber}>03</Text>
                  <View style={styles.modStepContent}>
                    <Text style={styles.modStepTitle}>Sanctions & Rectificatifs</Text>
                    <Text style={styles.modStepDesc}>
                      Publication d'un erratum obligatoire, baisse de l'indice de notoriété ou révocation de la carte de presse en cas de faute grave.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'charter' && (
              <View style={styles.section}>
                <Text style={styles.sectionIntro}>
                  Charte Déontologique de Munich appliquée à la couverture citoyenne et institutionnelle de la PURGE :
                </Text>

                <View style={styles.charterItem}>
                  <Text style={styles.charterNum}>I.</Text>
                  <Text style={styles.charterText}>
                    Respecter la vérité, quelles qu’en puissent être les conséquences pour soi-même, et ce, en raison du droit que le public a de connaître la vérité.
                  </Text>
                </View>

                <View style={styles.charterItem}>
                  <Text style={styles.charterNum}>II.</Text>
                  <Text style={styles.charterText}>
                    Défendre la liberté de l’information, du commentaire et de la critique. Ne publier que des informations dont l’origine est connue ou les accompagner des réserves nécessaires.
                  </Text>
                </View>

                <View style={styles.charterItem}>
                  <Text style={styles.charterNum}>III.</Text>
                  <Text style={styles.charterText}>
                    Ne pas user de méthodes déloyales pour obtenir des informations, des photographies ou des documents.
                  </Text>
                </View>

                <View style={styles.charterItem}>
                  <Text style={styles.charterNum}>IV.</Text>
                  <Text style={styles.charterText}>
                    S'obliger à respecter la vie privée des personnes sauf si l'intérêt public prévaut de manière manifeste.
                  </Text>
                </View>

                <View style={styles.charterItem}>
                  <Text style={styles.charterNum}>V.</Text>
                  <Text style={styles.charterText}>
                    Rectifier toute information publiée qui se révèle inexacte avec la même visibilité que la publication d'origine.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.gotItBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.gotItBtnText}>J'AI COMPRIS LA CHARTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 18, 0.88)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#070b1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    maxHeight: '90%',
    minHeight: '60%',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
    backgroundColor: '#0a1028',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shieldIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  shieldIcon: {
    fontSize: 20,
  },
  titleWrapper: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  certifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  certifiedText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabNav: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#050818',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  tabBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  contentScroll: {
    padding: 20,
    paddingBottom: 30,
  },
  section: {
    gap: 14,
  },
  sectionIntro: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  levelCard: {
    backgroundColor: '#0c1430',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  levelCardGreen: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  levelCardGold: {
    borderColor: 'rgba(234, 179, 8, 0.35)',
    backgroundColor: 'rgba(234, 179, 8, 0.06)',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  levelBadge: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeGreen: {
    backgroundColor: '#10b981',
  },
  levelBadgeGold: {
    backgroundColor: '#eab308',
  },
  levelBadgeText: {
    color: '#020512',
    fontSize: 10,
    fontWeight: '900',
  },
  levelBadgeTextGreen: {
    color: '#020512',
    fontSize: 10,
    fontWeight: '900',
  },
  levelBadgeTextGold: {
    color: '#020512',
    fontSize: 10,
    fontWeight: '900',
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  levelDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  diffCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  diffCardOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  diffTitle: {
    color: '#f87171',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  diffTitleOk: {
    color: '#34d399',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 6,
  },
  diffText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  diffTextOk: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
  modStepCard: {
    flexDirection: 'row',
    backgroundColor: '#0c1430',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  modStepNumber: {
    color: '#06b6d4',
    fontSize: 18,
    fontWeight: '900',
  },
  modStepContent: {
    flex: 1,
  },
  modStepTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  modStepDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  charterItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  charterNum: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '900',
    width: 24,
  },
  charterText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#070b1e',
  },
  gotItBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gotItBtnText: {
    color: '#020512',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
