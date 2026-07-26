import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, bookingsApi, reportsApi, Booking, DailyReport } from '../api/client';

type RootStackParamList = {
  BookingDetail: { booking: Booking };
};

type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

const BookingDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<BookingDetailRouteProp>();
  const { token } = useAuth();
  const { t } = useLanguage();

  const [booking, setBooking] = useState(route.params.booking);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reports, setReports] = useState<DailyReport[] | null>(null);
  const [reportsFailed, setReportsFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    reportsApi
      .listForBooking(token, booking.id)
      .then(setReports)
      .catch(() => setReportsFailed(true));
  }, [token, booking.id]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

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

  const handleCancel = () => {
    Alert.alert(
      t.myBookings.cancelConfirmTitle,
      t.myBookings.cancelConfirmMessage,
      [
        { text: t.myBookings.keepBooking, style: 'cancel' },
        {
          text: t.myBookings.cancelButton,
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setIsCancelling(true);
            try {
              const updated = await bookingsApi.cancel(token, booking.id);
              setBooking({ ...booking, status: updated.status });
              Alert.alert(t.myBookings.cancelSuccessTitle, t.myBookings.cancelSuccessMessage);
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : t.myBookings.cancelFailedMessage;
              Alert.alert(t.myBookings.cancelFailedTitle, message);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t.myBookings.serviceLabel}</Text>
              <Text style={styles.value}>{booking.service?.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t.myBookings.petLabel}</Text>
              <Text style={styles.value}>{booking.pet?.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t.myBookings.startLabel}</Text>
              <Text style={styles.value}>{formatDate(booking.startDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t.myBookings.endLabel}</Text>
              <Text style={styles.value}>{formatDate(booking.endDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t.myBookings.statusLabel}</Text>
              <Text style={styles.value}>{statusLabel(booking.status)}</Text>
            </View>
          </View>

          {CANCELLABLE_STATUSES.includes(booking.status) && (
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
              onPress={handleCancel}
              disabled={isCancelling}
            >
              <Text style={styles.cancelButtonText}>
                {isCancelling ? t.booking.submitting : t.myBookings.cancelButton}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.myBookings.dailyReportsTitle}</Text>
            {reports === null ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : reportsFailed ? (
              <Text style={styles.helperText}>{t.myBookings.loadReportsFailed}</Text>
            ) : reports.length === 0 ? (
              <Text style={styles.helperText}>{t.myBookings.noReportsYet}</Text>
            ) : (
              reports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
                  {!!report.text && <Text style={styles.reportText}>{report.text}</Text>}
                  {report.mediaUrls.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                      {report.mediaUrls.map((url) => (
                        <Image key={url} source={{ uri: url }} style={styles.mediaThumb} />
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>
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
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
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
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  reportText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  mediaRow: {
    marginTop: 10,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default BookingDetailScreen;
