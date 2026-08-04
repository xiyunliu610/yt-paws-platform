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
    <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.requiredPasswordChange.submit}</Text>}</TouchableOpacity>
    <TouchableOpacity onPress={logout} disabled={loading}><Text style={styles.logout}>{t.requiredPasswordChange.signOut}</Text></TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F5EDD8' },
  title: { fontSize: 26, fontWeight: '700', color: '#2C4A3E', marginBottom: 8 },
  help: { color: '#667', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#c7cec9', borderRadius: 8, padding: 14, marginBottom: 12 },
  button: { backgroundColor: '#2C4A3E', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  logout: { color: '#2C4A3E', textAlign: 'center', marginTop: 24 },
});
