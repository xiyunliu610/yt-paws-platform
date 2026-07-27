import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { bookingsApi, notificationsApi, Booking } from '../api/client';

type ServiceKey = 'boarding' | 'dayCare' | 'grooming' | 'houseVisit';

type Service = {
  key: ServiceKey;
  name: string;
  description: string;
  price: string;
  color: string;
};

type RootStackParamList = {
  Booking: { service?: Service } | undefined;
  Profile: undefined;
  Report: undefined;
  Notifications: undefined;
};

type HomeNavigationProp = StackNavigationProp<RootStackParamList>;

const SERVICE_COLORS: Record<ServiceKey, string> = {
  boarding: '#2C4A3E',
  dayCare: '#4A6B5E',
  grooming: '#6B8B7E',
  houseVisit: '#8BAB9E',
};

const FEATURE_KEYS = ['team', 'care', 'local', 'updates'] as const;

const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const userName = user?.name ?? 'Guest';

  const services: Service[] = (['boarding', 'dayCare', 'grooming', 'houseVisit'] as ServiceKey[]).map(
    (key) => ({
      key,
      name: t.home.services[key].name,
      description: t.home.services[key].description,
      price: t.home.services[key].price,
      color: SERVICE_COLORS[key],
    }),
  );

  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Refetch on focus so a booking made from BookingScreen shows up here as
  // soon as the user comes back to Home, without needing an app restart.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      bookingsApi
        .mine(token)
        .then((bookings) => {
          const now = new Date();
          const upcoming = bookings
            .filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.startDate) >= now)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 3);
          setUpcomingBookings(upcoming);
        })
        .catch(() => setUpcomingBookings([]));

      notificationsApi
        .mine(token)
        .then((list) => setUnreadCount(list.filter((n) => !n.readAt).length))
        .catch(() => setUnreadCount(0));
    }, [token]),
  );

  const formatBookingDateTime = (isoDate: string) => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} · ${hours}:${minutes}`;
  };

  const navigateToBooking = (service?: Service) => {
    if (service) {
      navigation.navigate('Booking', { service });
      return;
    }

    navigation.navigate('Booking');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToReport = () => {
    navigation.navigate('Report');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C4A3E" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{t.home.greeting}</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <View style={styles.headerActions}>
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
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={navigateToProfile}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.quickBookingCard}
            onPress={() => navigateToBooking()}
          >
            <View style={styles.quickBookingContent}>
              <View style={styles.quickBookingTextContainer}>
                <Text style={styles.quickBookingTitle}>{t.home.quickBookingTitle}</Text>
                <Text style={styles.quickBookingSubtitle}>
                  {t.home.quickBookingSubtitle}
                </Text>
              </View>
              <View style={styles.quickBookingIcon}>
                <Text style={styles.quickBookingIconText}>›</Text>
              </View>
            </View>
          </TouchableOpacity>

          {upcomingBookings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t.home.upcoming}</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>{t.home.seeAll}</Text>
                </TouchableOpacity>
              </View>

              {upcomingBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.bookingCard}
                >
                  <View style={styles.bookingIcon}>
                    <Text style={styles.bookingIconText}>{(booking.pet?.name ?? '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingPetName}>{booking.pet?.name}</Text>
                    <Text style={styles.bookingService}>{booking.service?.name}</Text>
                    <Text style={styles.bookingDateTime}>
                      {formatBookingDateTime(booking.startDate)}
                    </Text>
                  </View>
                  <View style={styles.bookingArrow}>
                    <Text style={styles.arrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.home.ourServices}</Text>

            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.key}
                  style={styles.serviceCard}
                  onPress={() => navigateToBooking(service)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.serviceIconContainer,
                      { backgroundColor: service.color },
                    ]}
                  >
                    <Text style={styles.serviceIcon}>{service.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.home.whyChooseUs}</Text>

            <View style={styles.featuresList}>
              {FEATURE_KEYS.map((key) => (
                <View key={key} style={styles.featureItem}>
                  <View style={styles.featureAccent} />
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{t.home.features[key].title}</Text>
                    <Text style={styles.featureDesc}>{t.home.features[key].desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>{t.home.needHelp}</Text>
            <Text style={styles.contactText}>
              {t.home.phoneLabel}: 021 XXX XXXX
            </Text>
            <Text style={styles.contactText}>
              {t.home.emailLabel}: hello@ytpaws.co.nz
            </Text>
            <Text style={styles.contactText}>
              {t.home.addressLabel}: Remuera, Auckland
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {}}
        >
          <Text style={styles.navTextActive}>{t.home.navHome}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigateToBooking()}
        >
          <Text style={styles.navText}>{t.home.navBooking}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={navigateToReport}
        >
          <Text style={styles.navText}>{t.home.navReport}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={navigateToProfile}
        >
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
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  quickBookingCard: {
    backgroundColor: '#2C4A3E',
    borderRadius: 20,
    padding: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  quickBookingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickBookingTextContainer: {
    flex: 1,
  },
  quickBookingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginBottom: 6,
  },
  quickBookingSubtitle: {
    fontSize: 14,
    color: '#F5EDD8',
    opacity: 0.8,
  },
  quickBookingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 237, 216, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBookingIconText: {
    fontSize: 28,
    color: '#F5EDD8',
    fontWeight: '300',
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingPetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  bookingService: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookingDateTime: {
    fontSize: 12,
    color: '#999',
  },
  bookingArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#2C4A3E',
    fontWeight: '300',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: '#2C4A3E',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#666',
  },
  contactSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
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

export default HomeScreen;
