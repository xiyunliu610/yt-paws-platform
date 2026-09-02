import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { bookingsApi, notificationsApi, Booking } from '../api/client';
import { formatLocalizedDateTime } from '../i18n/dateFormat';

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
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
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

  const formatDateTime = (isoDate: string) => formatLocalizedDateTime(isoDate, language);

  const goToBooking = (booking: Booking) => navigation.navigate('BookingDetail', { booking });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{t.businessHome.greeting}</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Feather name="bell" size={19} color="#1F4A38" />
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
          <Feather name="home" size={20} color="#1F4A38" />
          <Text style={styles.navTextActive}>{t.home.navHome}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyBookings')}>
          <Feather name="calendar" size={20} color="#999" />
          <Text style={styles.navText}>{t.profile.myBookings}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Notifications')}>
          <Feather name="bell" size={20} color="#999" />
          <Text style={styles.navText}>{t.notifications.headerTitle}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Feather name="user" size={20} color="#999" />
          <Text style={styles.navText}>{t.home.navProfile}</Text>
        </TouchableOpacity>
      </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 15,
    color: '#666',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 2,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5EFE0',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F7F5EF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F4A38',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    backgroundColor: '#F7F5EF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#F5EFE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F4A38',
  },
  cardInfo: {
    flex: 1,
  },
  cardPet: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    color: '#1A1A1A',
    opacity: 0.4,
    fontWeight: '300',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE3',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 13,
    color: '#999',
  },
  navTextActive: {
    fontSize: 13,
    color: '#1F4A38',
    fontWeight: '700',
  },
});

export default BusinessHomeScreen;
