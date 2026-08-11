import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { bookingsApi, Booking } from '../api/client';
import { formatLocalizedDate } from '../i18n/dateFormat';

type RootStackParamList = {
  BookingDetail: { booking: Booking };
};

type Navigation = StackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#C9A227',
  confirmed: '#1F4A38',
  in_progress: '#4A6B5E',
  completed: '#7C9C8F',
  cancelled: '#999999',
};

const STATUS_TINTS: Record<string, string> = {
  pending: '#F7EFD4',
  confirmed: '#E1EAE5',
  in_progress: '#E6ECE8',
  completed: '#EDF2F0',
  cancelled: '#EDEDED',
};

const MyBookingsScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { token } = useAuth();
  const { t, language } = useLanguage();

  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      bookingsApi
        .mine(token)
        .then((list) => {
          setBookings([...list].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, [token]),
  );

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.myBookings.statusPending;
      case 'confirmed':
        return t.myBookings.statusConfirmed;
      case 'in_progress':
        return t.myBookings.statusInProgress;
      case 'completed':
        return t.myBookings.statusCompleted;
      case 'cancelled':
        return t.myBookings.statusCancelled;
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {bookings === null ? (
            <ActivityIndicator color="#1F4A38" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.myBookings.loadFailed}</Text>
          ) : bookings.length === 0 ? (
            <Text style={styles.helperText}>{t.myBookings.empty}</Text>
          ) : (
            bookings.map((booking) => {
              const statusColor = STATUS_COLORS[booking.status] ?? '#999';
              const statusTint = STATUS_TINTS[booking.status] ?? '#EDEDED';
              return (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('BookingDetail', { booking })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.serviceName}>{booking.service?.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusTint }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel(booking.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.petName}>{booking.pet?.name}</Text>
                  <Text style={styles.dateRange}>
                    {formatLocalizedDate(booking.startDate, language)} → {formatLocalizedDate(booking.endDate, language)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#F7F5EF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  petName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 13,
    color: '#999',
  },
});

export default MyBookingsScreen;
