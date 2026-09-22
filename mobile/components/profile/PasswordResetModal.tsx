import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppIcon } from '../AppIcon';
import { api } from '../../services/api';

interface PasswordResetModalProps {
  visible: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  visible,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && defaultEmail) {
      setEmail(defaultEmail);
    }
  }, [visible, defaultEmail]);

  const handleReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Email invalide', 'Veuillez renseigner une adresse email valide.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mots de passe non identiques', 'La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.resetPassword(cleanEmail, newPassword);
      Alert.alert(
        'Accès sécurisé',
        res.message || 'Votre mot de passe a été mis à jour avec succès.'
      );
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur réinitialisation', err.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="key" size={16} color="#06b6d4" />
              <Text style={styles.title}>Sécurité du Mot de Passe</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <AppIcon name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sub}>
            Définissez un nouveau mot de passe sécurisé pour votre compte PURGE.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Adresse Email du Compte</Text>
            <TextInput
              style={styles.input}
              placeholder="citoyen@purge.info"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Nouveau Mot de Passe (min. 6 car.)</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleShowText}>{showPassword ? 'Masquer' : 'Afficher'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Confirmer le Nouveau Mot de Passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <View style={styles.noticeBox}>
              <AppIcon name="shield-checkmark" size={13} color="#06b6d4" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.noticeText}>
                Un chiffrement robuste est appliqué pour protéger l’accès à votre profil et vos sources.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledBtn]}
              onPress={handleReset}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  sub: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  form: {
    gap: 10,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  toggleShowText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  noticeText: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
