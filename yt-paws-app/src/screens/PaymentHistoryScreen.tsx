import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { paymentsApi, Payment } from '../api/client';
import { formatLocalizedDate } from '../i18n/dateFormat';

const STATUS_COLORS: Record<string, string> = {
  pending: '#C9A227',
  pending_verification: '#C9A227',
  paid: '#1F4A38',
  failed: '#B0442E',
  refunded: '#999999',
  cancelled: '#999999',
  refund_pending: '#C9A227',
};

const STATUS_TINTS: Record<string, string> = {
  pending: '#F7EFD4',
  pending_verification: '#F7EFD4',
  paid: '#E1EAE5',
  failed: '#F5E3DE',
  refunded: '#EDEDED',
  cancelled: '#EDEDED',
  refund_pending: '#F7EFD4',
};

const PaymentHistoryScreen = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();

  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      paymentsApi
        .mine(token)
        .then((list) => {
          setPayments(list);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    }, [token]),
  );

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.paymentHistory.statusPending;
      case 'pending_verification':
        return t.paymentHistory.statusPendingVerification;
      case 'paid':
        return t.paymentHistory.statusPaid;
      case 'failed':
        return t.paymentHistory.statusFailed;
      case 'refunded':
        return t.paymentHistory.statusRefunded;
      case 'cancelled':
        return t.paymentHistory.statusCancelled;
      case 'refund_pending':
        return t.paymentHistory.statusRefundPending;
      default:
        return status;
    }
  };

  const methodLabel = (method: string) =>
    method === 'stripe' ? t.paymentHistory.methodStripe : t.paymentHistory.methodWechat;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {payments === null ? (
            <ActivityIndicator color="#1F4A38" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.paymentHistory.loadFailed}</Text>
          ) : payments.length === 0 ? (
            <Text style={styles.helperText}>{t.paymentHistory.empty}</Text>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.serviceName}>
                    {payment.booking?.service?.name ?? methodLabel(payment.method)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_TINTS[payment.status] ?? '#EDEDED' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: STATUS_COLORS[payment.status] ?? '#999' }]}>{statusLabel(payment.status)}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>NZD {payment.amount.toFixed(2)}</Text>
                <Text style={styles.meta}>
                  {methodLabel(payment.method)}
                  {payment.booking ? ` · ${formatLocalizedDate(payment.booking.startDate, language)}` : ''}
                </Text>
              </View>
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
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#999',
  },
});

export default PaymentHistoryScreen;
