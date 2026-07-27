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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, staffApi, StaffMember } from '../api/client';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const StaffManagementScreen = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const roleLabel = (role: string) =>
    role === 'owner' ? t.staffManagement.roleOwner : t.staffManagement.roleStaff;

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
            <ActivityIndicator color="#2C4A3E" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.staffManagement.loadFailed}</Text>
          ) : staff.length === 0 && !isAdding ? (
            <Text style={styles.helperText}>{t.staffManagement.empty}</Text>
          ) : (
            staff.map((member) => (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.staffIcon}>
                  <Text style={styles.staffIconText}>{(member.name ?? member.email).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name ?? member.email}</Text>
                  <Text style={styles.staffEmail}>{member.email}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleLabel(member.role)}</Text>
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
    backgroundColor: '#F5EDD8',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  input: {
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EDD8',
  },
  spinner: {
    marginTop: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  staffCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 13,
    color: '#666',
  },
  roleBadge: {
    backgroundColor: '#F5EDD8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C4A3E',
  },
});

export default StaffManagementScreen;
