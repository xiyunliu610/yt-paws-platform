import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, staffApi, StaffMember } from '../api/client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StaffManagementScreen = () => {
  const { token, user } = useAuth();
  const { t } = useLanguage();

  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [capacityDrafts, setCapacityDrafts] = useState<Record<string, string>>({});

  const loadStaff = useCallback(() => {
    if (!token) return;
    staffApi
      .list(token)
      .then((list) => {
        setStaff(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadStaff();
    }, [loadStaff]),
  );

  const handleCreate = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert(t.staffManagement.errorTitle, t.staffManagement.enterName);
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      Alert.alert(t.staffManagement.errorTitle, t.staffManagement.enterEmail);
      return;
    }

    setIsSaving(true);
    try {
      const result = await staffApi.create(token, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      setStaff((prev) => [...(prev ?? []), result.user]);
      setName('');
      setEmail('');
      setPhone('');
      setIsAdding(false);
      Alert.alert(
        t.staffManagement.createdTitle,
        t.staffManagement.createdMessage
          .replace('{email}', result.user.email)
          .replace('{password}', result.temporaryPassword),
      );
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.staffManagement.createFailedMessage;
      Alert.alert(t.staffManagement.createFailedTitle, message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCapacitySave = async (member: StaffMember) => {
    if (!token) return;
    const raw = capacityDrafts[member.id] ?? (member.maxConcurrentBookings ? String(member.maxConcurrentBookings) : '');
    const value = raw.trim() ? Number(raw) : null;
    if (value !== null && (!Number.isInteger(value) || value <= 0)) {
      Alert.alert(t.staffManagement.errorTitle, t.staffManagement.invalidCapacity);
      return;
    }
    setUpdatingId(member.id);
    try {
      const updated = await staffApi.updateCapacity(token, member.id, value);
      setStaff((current) => current?.map((item) => (item.id === member.id ? updated : item)) ?? null);
      setCapacityDrafts((current) => ({ ...current, [member.id]: value ? String(value) : '' }));
    } catch (error) {
      Alert.alert(t.staffManagement.statusFailedTitle, error instanceof ApiError ? error.message : t.staffManagement.statusFailedMessage);
    } finally { setUpdatingId(null); }
  };

  const roleLabel = (role: string) =>
    role === 'owner' ? t.staffManagement.roleOwner : t.staffManagement.roleStaff;

  const handleStatusChange = async (member: StaffMember, isActive: boolean) => {
    if (!token) return;
    setUpdatingId(member.id);
    try {
      const updated = await staffApi.updateStatus(token, member.id, isActive);
      setStaff((current) => current?.map((item) => (item.id === member.id ? updated : item)) ?? null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.staffManagement.statusFailedMessage;
      Alert.alert(t.staffManagement.statusFailedTitle, message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.staffManagement.headerTitle}</Text>
            <TouchableOpacity onPress={() => setIsAdding((prev) => !prev)}>
              <Text style={styles.addLink}>
                {isAdding ? t.staffManagement.cancel : t.staffManagement.addStaffButton}
              </Text>
            </TouchableOpacity>
          </View>

          {isAdding && (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder={t.staffManagement.namePlaceholder}
                value={name}
                onChangeText={setName}
                editable={!isSaving}
              />
              <TextInput
                style={styles.input}
                placeholder={t.staffManagement.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSaving}
              />
              <TextInput
                style={styles.input}
                placeholder={t.staffManagement.phonePlaceholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleCreate}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? t.staffManagement.saving : t.staffManagement.saveButton}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {staff === null ? (
            <ActivityIndicator color="#1F4A38" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.staffManagement.loadFailed}</Text>
          ) : staff.length === 0 && !isAdding ? (
            <Text style={styles.helperText}>{t.staffManagement.empty}</Text>
          ) : (
            staff.map((member) => (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.staffTopRow}>
                <View style={styles.staffIcon}>
                  <Text style={styles.staffIconText}>{(member.name ?? member.email).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name ?? member.email}</Text>
                  <Text style={styles.staffEmail}>{member.email}</Text>
                  {!member.isActive && <Text style={styles.inactiveText}>{t.staffManagement.inactive}</Text>}
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel(member.role)}</Text>
                </View>
                <Switch
                  value={member.isActive}
                  onValueChange={(value) => handleStatusChange(member, value)}
                  disabled={member.id === user?.id || updatingId !== null}
                  trackColor={{ false: '#D0D0D0', true: '#1F4A38' }}
                />
                </View>
                <View style={styles.capacityRow}>
                  <TextInput
                    style={styles.capacityInput}
                    value={capacityDrafts[member.id] ?? (member.maxConcurrentBookings ? String(member.maxConcurrentBookings) : '')}
                    onChangeText={(value) => setCapacityDrafts((current) => ({ ...current, [member.id]: value }))}
                    placeholder={t.staffManagement.unlimited}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity onPress={() => handleCapacitySave(member)} disabled={updatingId !== null}>
                    <Text style={styles.capacitySave}>{t.staffManagement.saveCapacity}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  capacityRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  capacityInput: { flex: 1, backgroundColor: '#F7F5EF', borderRadius: 10, padding: 8 },
  capacitySave: { color: '#1F4A38', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F4A38',
  },
  form: {
    backgroundColor: '#F7F5EF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#1F4A38',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EFE0',
  },
  spinner: {
    marginTop: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  staffCard: {
    backgroundColor: '#F7F5EF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  staffTopRow: { flexDirection: 'row', alignItems: 'center' },
  staffIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F5EFE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F4A38',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 13,
    color: '#666',
  },
  roleBadge: {
    backgroundColor: '#F5EFE0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F4A38',
  },
  inactiveText: {
    marginTop: 3,
    color: '#A15C43',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StaffManagementScreen;
