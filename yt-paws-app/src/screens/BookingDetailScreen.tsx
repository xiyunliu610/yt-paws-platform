import React, { useCallback, useEffect, useState } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ApiError,
  bookingsApi,
  reportsApi,
  paymentsApi,
  staffApi,
  Booking,
  BookingCareDetails,
  DailyReport,
  Payment,
  StaffMember,
} from '../api/client';

type RootStackParamList = {
  BookingDetail: { booking: Booking };
  Payment: { booking: Booking };
  ReportCompose: { bookingId: string };
};

type BookingDetailRouteProp = RouteProp<RootStackParamList, 'BookingDetail'>;
type Navigation = StackNavigationProp<RootStackParamList>;

const CANCELLABLE_STATUSES = ['pending', 'confirmed'];
const NEXT_STATUS: Record<string, 'confirmed' | 'in_progress' | 'completed'> = {
  pending: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
};

const BookingDetailScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<BookingDetailRouteProp>();
  const { token, user } = useAuth();
  const { t } = useLanguage();

  const [booking, setBooking] = useState(route.params.booking);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [reports, setReports] = useState<DailyReport[] | null>(null);
  const [reportsFailed, setReportsFailed] = useState(false);
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);
  const [staffList, setStaffList] = useState<StaffMember[] | null>(null);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);
  const [careDetails, setCareDetails] = useState<BookingCareDetails | null>(null);
  const [careDetailsFailed, setCareDetailsFailed] = useState(false);

  const isManager = user?.role === 'owner' || user?.role === 'admin';
  const isAssignedStaff = user?.role === 'staff' && booking.assignedStaffId === user.id;

  // Refetch reports whenever the screen regains focus, so returning from
  // ReportComposeScreen shows the just-published entry without a manual pull.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      reportsApi
        .listForBooking(token, booking.id)
        .then((list) => {
          setReports(list);
          setReportsFailed(false);
        })
        .catch(() => setReportsFailed(true));
    }, [token, booking.id]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      bookingsApi
        .careDetails(token, booking.id)
        .then((details) => {
          setCareDetails(details);
          setCareDetailsFailed(false);
        })
        .catch(() => setCareDetailsFailed(true));
    }, [token, booking.id]),
  );

  useEffect(() => {
    if (!token || user?.role !== 'customer') return;
    paymentsApi
      .mine(token)
      .then((payments) => {
        const forThisBooking = payments
          .filter((p) => p.bookingId === booking.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayment(forThisBooking[0] ?? null);
      })
      .catch(() => setPayment(null));
  }, [token, user?.role, booking.id]);

  useEffect(() => {
    if (!token || !isManager) return;
    staffApi.list(token).then(setStaffList).catch(() => {});
  }, [token, isManager]);

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

  const paymentStatusLabel = () => {
    if (payment === null || payment === undefined) return t.myBookings.payNowButton;
    switch (payment.status) {
      case 'paid':
        return t.myBookings.paymentStatusPaid;
      case 'pending_verification':
        return t.myBookings.paymentStatusPendingVerification;
      case 'failed':
        return t.myBookings.payNowButton;
      default:
        return t.myBookings.paymentStatusPending;
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

  const handleAdvanceStatus = async () => {
    if (!token) return;
    const nextStatus = NEXT_STATUS[booking.status];
    if (!nextStatus) return;

    setIsAdvancing(true);
    try {
      const updated = await bookingsApi.updateStatus(token, booking.id, nextStatus);
      setBooking({ ...booking, status: updated.status });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.myBookings.advanceFailedMessage;
      Alert.alert(t.myBookings.advanceFailedTitle, message);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleAssignStaff = async (staffId: string) => {
    if (!token) return;
    setAssigningStaffId(staffId);
    try {
      const updated = await bookingsApi.assign(token, booking.id, staffId);
      setBooking({ ...booking, assignedStaffId: updated.assignedStaffId });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.myBookings.assignFailedMessage;
      Alert.alert(t.myBookings.assignFailedTitle, message);
    } finally {
      setAssigningStaffId(null);
    }
  };

  const canCancel = CANCELLABLE_STATUSES.includes(booking.status) && (user?.role === 'customer' || isManager);
  const canAdvance = isManager && !!NEXT_STATUS[booking.status];
  const canAddReport = booking.status === 'in_progress' && (isAssignedStaff || isManager);
  const assignedStaffMember = staffList?.find((s) => s.id === booking.assignedStaffId);

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

            {user?.role === 'customer' && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('Payment', { booking })}
                disabled={payment?.status === 'paid'}
              >
                <Text style={styles.label}>{t.myBookings.paymentStatusLabel}</Text>
                <Text
                  style={[
                    styles.value,
                    payment?.status === 'paid' ? styles.paidValue : styles.linkValue,
                  ]}
                >
                  {paymentStatusLabel()}
                </Text>
              </TouchableOpacity>
            )}

            {isManager && (
              <View style={styles.row}>
                <Text style={styles.label}>{t.myBookings.assignedStaffLabel}</Text>
                <Text style={styles.value}>
                  {assignedStaffMember?.name ?? assignedStaffMember?.email ?? t.myBookings.unassigned}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.myBookings.careDetailsTitle}</Text>
            {careDetails === null && !careDetailsFailed ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : careDetailsFailed ? (
              <Text style={styles.helperText}>{t.myBookings.loadCareDetailsFailed}</Text>
            ) : careDetails ? (
              <View style={styles.card}>
                {!!careDetails.pet.photoUrl && (
                  <Image source={{ uri: careDetails.pet.photoUrl }} style={styles.petPhoto} />
                )}
                <Text style={styles.careName}>{careDetails.pet.name}</Text>
                <Text style={styles.careText}>
                  {[careDetails.pet.species, careDetails.pet.breed].filter(Boolean).join(' · ') || t.myBookings.notProvided}
                </Text>
                <Text style={styles.careLabel}>{t.myBookings.personalityLabel}</Text>
                <Text style={styles.careText}>{careDetails.pet.personality || t.myBookings.notProvided}</Text>
                <Text style={styles.careLabel}>{t.myBookings.dietNotesLabel}</Text>
                <Text style={styles.careText}>{careDetails.pet.dietNotes || t.myBookings.notProvided}</Text>
                <Text style={styles.careLabel}>{t.myBookings.customerContactLabel}</Text>
                <Text style={styles.careText}>
                  {[careDetails.customer.name, careDetails.customer.phone, careDetails.customer.email]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={styles.careLabel}>{t.myBookings.healthRecordsLabel}</Text>
                {careDetails.pet.healthRecords.length === 0 ? (
                  <Text style={styles.careText}>{t.myBookings.noHealthRecords}</Text>
                ) : (
                  careDetails.pet.healthRecords.map((record) => (
                    <Text key={record.id} style={styles.careText}>
                      {formatDate(record.date)} · {record.type}{record.notes ? ` — ${record.notes}` : ''}
                    </Text>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {isManager && staffList && staffList.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.myBookings.assignStaffTitle}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {staffList.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.staffChip,
                      booking.assignedStaffId === member.id && styles.staffChipSelected,
                    ]}
                    onPress={() => handleAssignStaff(member.id)}
                    disabled={assigningStaffId !== null}
                  >
                    {assigningStaffId === member.id ? (
                      <ActivityIndicator
                        size="small"
                        color={booking.assignedStaffId === member.id ? '#F5EDD8' : '#2C4A3E'}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.staffChipText,
                          booking.assignedStaffId === member.id && styles.staffChipTextSelected,
                        ]}
                      >
                        {member.name ?? member.email}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {canAdvance && (
            <TouchableOpacity
              style={[styles.primaryButton, isAdvancing && styles.buttonDisabled]}
              onPress={handleAdvanceStatus}
              disabled={isAdvancing}
            >
              <Text style={styles.primaryButtonText}>
                {isAdvancing ? t.booking.submitting : t.myBookings.advanceStatusLabels[NEXT_STATUS[booking.status]]}
              </Text>
            </TouchableOpacity>
          )}

          {canAddReport && (
            <TouchableOpacity
              style={[styles.primaryButton, styles.reportButton]}
              onPress={() => navigation.navigate('ReportCompose', { bookingId: booking.id })}
            >
              <Text style={styles.primaryButtonText}>{t.myBookings.addReportButton}</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.buttonDisabled]}
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
  linkValue: {
    color: '#2C4A3E',
    textDecorationLine: 'underline',
  },
  paidValue: {
    color: '#2C4A3E',
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
  staffChip: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    minWidth: 60,
    alignItems: 'center',
  },
  staffChipSelected: {
    backgroundColor: '#2C4A3E',
    borderColor: '#2C4A3E',
  },
  staffChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  staffChipTextSelected: {
    color: '#F5EDD8',
  },
  primaryButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  reportButton: {
    backgroundColor: '#4A6B5E',
  },
  primaryButtonText: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  petPhoto: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  careName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  careLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 3,
  },
  careText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default BookingDetailScreen;
