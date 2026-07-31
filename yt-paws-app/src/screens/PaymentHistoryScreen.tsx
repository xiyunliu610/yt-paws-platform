import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { paymentsApi, Payment } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
  pending: '#C9A227',
  pending_verification: '#C9A227',
  paid: '#2C4A3E',
  failed: '#FF5252',
  refunded: '#999999',
  cancelled: '#999999',
};

const PaymentHistoryScreen = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

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
      default:
        return status;
    }
  };

  const methodLabel = (method: string) =>
    method === 'stripe' ? t.paymentHistory.methodStripe : t.paymentHistory.methodWechat;

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {payments === null ? (
            <ActivityIndicator color="#2C4A3E" style={styles.spinner} />
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
                      { backgroundColor: STATUS_COLORS[payment.status] ?? '#999' },
                    ]}
                  >
                    <Text style={styles.statusText}>{statusLabel(payment.status)}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>NZD {payment.amount.toFixed(2)}</Text>
                <Text style={styles.meta}>
                  {methodLabel(payment.method)}
                  {payment.booking ? ` · ${formatDate(payment.booking.startDate)}` : ''}
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#2C4A3E',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
