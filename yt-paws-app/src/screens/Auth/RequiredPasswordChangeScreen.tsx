import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ApiError, useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

export default function RequiredPasswordChangeScreen() {
  const { changePassword, logout } = useAuth();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (error) {
      Alert.alert(t.requiredPasswordChange.errorTitle, error instanceof ApiError ? error.message : t.requiredPasswordChange.errorMessage);
    } finally { setLoading(false); }
  };

  return <View style={styles.container}>
    <Text style={styles.title}>{t.requiredPasswordChange.title}</Text>
    <Text style={styles.help}>{t.requiredPasswordChange.help}</Text>
    <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder={t.requiredPasswordChange.temporaryPassword} />
    <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder={t.requiredPasswordChange.newPassword} autoComplete="new-password" />
    <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#F5EFE0" /> : <Text style={styles.buttonText}>{t.requiredPasswordChange.submit}</Text>}</TouchableOpacity>
    <TouchableOpacity onPress={logout} disabled={loading}><Text style={styles.logout}>{t.requiredPasswordChange.signOut}</Text></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  help: { color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#F7F5EF', borderRadius: 12, padding: 14, marginBottom: 12 },
  button: { backgroundColor: '#1F4A38', padding: 16, borderRadius: 24, alignItems: 'center' },
  buttonText: { color: '#F5EFE0', fontWeight: '700' },
  logout: { color: '#1F4A38', textAlign: 'center', marginTop: 24 },
});
