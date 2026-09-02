import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError, authApi } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const route = useRoute<any>();
  const token = typeof route.params?.token === 'string' ? route.params.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) return Alert.alert(t.resetPassword.invalidTitle, t.resetPassword.invalidMessage);
    if (password !== confirm) return Alert.alert(t.resetPassword.mismatch);
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      Alert.alert(t.resetPassword.successTitle, t.resetPassword.successMessage, [
        { text: t.resetPassword.ok, onPress: () => navigation.navigate('Login' as never) },
      ]);
    } catch (error) {
      Alert.alert(t.resetPassword.errorTitle, error instanceof ApiError ? error.message : t.resetPassword.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return <View style={styles.container}>
    <Text style={styles.title}>{t.resetPassword.chooseTitle}</Text>
    <Text style={styles.help}>{t.resetPassword.help}</Text>
    <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder={t.resetPassword.newPassword} autoComplete="new-password" />
    <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder={t.resetPassword.confirmPassword} autoComplete="new-password" />
    <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#F5EFE0" /> : <Text style={styles.buttonText}>{t.resetPassword.submit}</Text>}</TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  help: { color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#F7F5EF', borderRadius: 12, padding: 14, marginBottom: 12 },
  button: { backgroundColor: '#1F4A38', padding: 16, borderRadius: 24, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#F5EFE0', fontWeight: '700' },
});
