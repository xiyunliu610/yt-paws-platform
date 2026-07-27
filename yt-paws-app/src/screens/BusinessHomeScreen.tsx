import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { bookingsApi, notificationsApi, Booking } from '../api/client';

type RootStackParamList = {
  BookingDetail: { booking: Booking };
  MyBookings: undefined;
  Notifications: undefined;
  Profile: undefined;
};

type Navigation = StackNavigationProp<RootStackParamList>;

const BusinessHomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const userName = user?.name ?? 'there';

  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [inProgressBookings, setInProgressBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      bookingsApi
        .mine(token)
        .then((bookings) => {
          setPendingBookings(bookings.filter((b) => b.status === 'pending'));
          setInProgressBookings(bookings.filter((b) => b.status === 'in_progress'));
        })
        .catch(() => {
          setPendingBookings([]);
          setInProgressBookings([]);
        });

      notificationsApi
        .mine(token)
        .then((list) => setUnreadCount(list.filter((n) => !n.readAt).length))
        .catch(() => setUnreadCount(0));
    }, [token]),
  );

  const formatDateTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} · ${hours}:${minutes}`;
  };

  const goToBooking = (booking: Booking) => navigation.navigate('BookingDetail', { booking });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C4A3E" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{t.businessHome.greeting}</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{pendingBookings.length}</Text>
              <Text style={styles.statLabel}>{t.businessHome.pendingLabel}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{inProgressBookings.length}</Text>
              <Text style={styles.statLabel}>{t.businessHome.inProgressLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.businessHome.needsConfirmation}</Text>
            {pendingBookings.length === 0 ? (
              <Text style={styles.helperText}>{t.businessHome.noPending}</Text>
            ) : (
              pendingBookings.map((booking) => (
                <TouchableOpacity key={booking.id} style={styles.card} onPress={() => goToBooking(booking)}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>{(booking.pet?.name ?? '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardPet}>{booking.pet?.name}</Text>
                    <Text style={styles.cardService}>{booking.service?.name}</Text>
                    <Text style={styles.cardDate}>{formatDateTime(booking.startDate)}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.businessHome.inProgressTitle}</Text>
            {inProgressBookings.length === 0 ? (
              <Text style={styles.helperText}>{t.businessHome.noInProgress}</Text>
            ) : (
              inProgressBookings.map((booking) => (
                <TouchableOpacity key={booking.id} style={styles.card} onPress={() => goToBooking(booking)}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>{(booking.pet?.name ?? '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardPet}>{booking.pet?.name}</Text>
                    <Text style={styles.cardService}>{booking.service?.name}</Text>
                    <Text style={styles.cardDate}>{formatDateTime(booking.startDate)}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Text style={styles.navTextActive}>{t.home.navHome}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.navText}>{t.profile.myBookings}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.navText}>{t.notifications.headerTitle}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.navText}>{t.home.navProfile}</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    backgroundColor: '#2C4A3E',
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#F5EDD8',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginTop: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 237, 216, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(245, 237, 216, 0.12)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  statLabel: {
    fontSize: 12,
    color: '#F5EDD8',
    opacity: 0.85,
    marginTop: 4,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
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
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  cardInfo: {
    flex: 1,
  },
  cardPet: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  cardService: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    color: '#2C4A3E',
    fontWeight: '300',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 13,
    color: '#999',
  },
  navTextActive: {
    fontSize: 13,
    color: '#2C4A3E',
    fontWeight: '700',
  },
});

export default BusinessHomeScreen;
