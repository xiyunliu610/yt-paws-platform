import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { authApi, AuthSession } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatLocalizedDateTime } from '../i18n/dateFormat';

export default function SessionsScreen() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<AuthSession[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    authApi.sessions(token).then(setSessions).catch(() => setSessions([]));
  }, [token]);
  useFocusEffect(load);

  const revoke = (session: AuthSession) => {
    Alert.alert(
      language === 'zh' ? '移除此设备？' : 'Remove this device?',
      session.deviceName ?? (language === 'zh' ? '未知设备' : 'Unknown device'),
      [
        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' },
        { text: language === 'zh' ? '移除' : 'Remove', style: 'destructive', onPress: async () => {
          if (!token) return;
          setBusyId(session.id);
          try {
            await authApi.revokeSession(token, session.id);
            setSessions((current) => current?.filter((item) => item.id !== session.id) ?? []);
          } finally { setBusyId(null); }
        } },
      ],
    );
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        {language === 'zh' ? '查看已登录设备，并移除不再使用或不认识的设备。' : 'Review signed-in devices and remove any you no longer use or recognize.'}
      </Text>
      {sessions === null ? <ActivityIndicator color="#1F4A38" /> : sessions.map((session) => (
        <View style={styles.card} key={session.id}>
          <View style={styles.details}>
            <Text style={styles.name}>{session.deviceName ?? (language === 'zh' ? '未知设备' : 'Unknown device')}</Text>
            <Text style={styles.meta}>{language === 'zh' ? '最近使用' : 'Last used'}: {formatLocalizedDateTime(session.lastUsedAt, language)}</Text>
            {session.current && <Text style={styles.current}>{language === 'zh' ? '当前设备' : 'Current device'}</Text>}
          </View>
          {!session.current && (
            <TouchableOpacity disabled={busyId === session.id} onPress={() => revoke(session)}>
              <Text style={styles.remove}>{busyId === session.id ? '…' : language === 'zh' ? '移除' : 'Remove'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 18, gap: 10 },
  intro: { color: '#666', lineHeight: 21, marginBottom: 6 },
  card: { backgroundColor: '#F7F5EF', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
  details: { flex: 1 },
  name: { fontSize: 16, color: '#1A1A1A', fontWeight: '700' },
  meta: { color: '#666', fontSize: 12, marginTop: 5 },
  current: { color: '#1F4A38', fontSize: 12, fontWeight: '600', marginTop: 5 },
  remove: { color: '#A15C43', fontWeight: '600', padding: 8 },
});
