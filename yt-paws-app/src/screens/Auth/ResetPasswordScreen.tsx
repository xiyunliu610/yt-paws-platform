import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ApiError, authApi } from '../../api/client';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const token = typeof route.params?.token === 'string' ? route.params.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token) return Alert.alert('Invalid link', 'This password reset link is incomplete.');
    if (password !== confirm) return Alert.alert('Passwords do not match');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      Alert.alert('Password reset', 'Sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login' as never) },
      ]);
    } catch (error) {
      Alert.alert('Could not reset password', error instanceof ApiError ? error.message : 'Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return <View style={styles.container}>
    <Text style={styles.title}>Choose a new password</Text>
    <Text style={styles.help}>Use at least 8 characters with letters and numbers.</Text>
    <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="New password" autoComplete="new-password" />
    <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm new password" autoComplete="new-password" />
    <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}</TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F5EDD8' },
  title: { fontSize: 26, fontWeight: '700', color: '#2C4A3E', marginBottom: 8 },
  help: { color: '#667', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#c7cec9', borderRadius: 8, padding: 14, marginBottom: 12 },
  button: { backgroundColor: '#2C4A3E', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
