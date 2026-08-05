import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { notificationsApi, AppNotification } from '../api/client';
import { formatLocalizedDateTime } from '../i18n/dateFormat';

const NotificationsScreen = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();

  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      notificationsApi
        .mine(token)
        .then((list) => {
          setNotifications(list);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, [token]),
  );

  const handlePress = async (notification: AppNotification) => {
    if (!token || notification.readAt) return;
    try {
      const updated = await notificationsApi.markRead(token, notification.id);
      setNotifications((prev) =>
        prev ? prev.map((n) => (n.id === updated.id ? updated : n)) : prev,
      );
    } catch {
      // Best-effort; the item just stays showing as unread.
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {notifications === null ? (
            <ActivityIndicator color="#2C4A3E" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.notifications.loadFailed}</Text>
          ) : notifications.length === 0 ? (
            <Text style={styles.helperText}>{t.notifications.empty}</Text>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.card, !notification.readAt && styles.cardUnread]}
                onPress={() => handlePress(notification)}
                activeOpacity={notification.readAt ? 1 : 0.7}
              >
                <View style={styles.cardHeader}>
                  {!notification.readAt && <View style={styles.dot} />}
                  <Text style={styles.title}>{notification.title}</Text>
                </View>
                <Text style={styles.body}>{notification.body}</Text>
                <Text style={styles.date}>{formatLocalizedDateTime(notification.createdAt, language)}</Text>
              </TouchableOpacity>
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
  spinner: {
    marginTop: 40,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#2C4A3E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C4A3E',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  body: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
});

export default NotificationsScreen;
