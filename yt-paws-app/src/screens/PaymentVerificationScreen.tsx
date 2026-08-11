import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, paymentsApi, Payment } from '../api/client';
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

const PaymentVerificationScreen = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();

  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [refundFormId, setRefundFormId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    paymentsApi
      .business(token)
      .then((list) => {
        // Payments needing action first, then everything else by recency.
        const sorted = [...list].sort((a, b) => {
          if (a.status === 'pending_verification' && b.status !== 'pending_verification') return -1;
          if (b.status === 'pending_verification' && a.status !== 'pending_verification') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setPayments(sorted);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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

  const handleVerify = (payment: Payment) => {
    Alert.alert(
      t.paymentVerification.confirmTitle,
      t.paymentVerification.confirmMessage,
      [
        { text: t.staffManagement.cancel, style: 'cancel' },
        {
          text: t.paymentVerification.verifyButton,
          onPress: async () => {
            if (!token) return;
            setVerifyingId(payment.id);
            try {
              await paymentsApi.verify(token, payment.id);
              load();
            } catch (error) {
              const message =
                error instanceof ApiError ? error.message : t.paymentVerification.verifyFailedMessage;
              Alert.alert(t.paymentVerification.verifyFailedTitle, message);
            } finally {
              setVerifyingId(null);
            }
          },
        },
      ],
    );
  };

  const openRefundForm = (payment: Payment) => {
    setRefundFormId(payment.id);
    setRefundReason('');
  };

  const submitRefund = (payment: Payment) => {
    if (!token) return;
    setRefundingId(payment.id);
    paymentsApi
      .refund(token, payment.id, refundReason.trim())
      .then(() => {
        setRefundFormId(null);
        setRefundReason('');
        load();
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : t.paymentVerification.refundFailedMessage;
        Alert.alert(t.paymentVerification.refundFailedTitle, message);
      })
      .finally(() => setRefundingId(null));
  };

  const handleRefund = (payment: Payment) => {
    if (!refundReason.trim()) {
      Alert.alert(t.paymentVerification.refundFailedTitle, t.paymentVerification.enterRefundReason);
      return;
    }

    // WeChat has no refund API — tapping this only records that the owner
    // has *already* sent the money back manually. Confirm that explicitly
    // so the button can't be mistaken for an automatic refund the way the
    // Stripe path actually is.
    if (payment.method === 'wechat_qr') {
      Alert.alert(
        t.paymentVerification.manualRefundConfirmTitle,
        t.paymentVerification.manualRefundConfirmMessage,
        [
          { text: t.paymentVerification.refundCancelButton, style: 'cancel' },
          { text: t.paymentVerification.manualRefundConfirmButton, onPress: () => submitRefund(payment) },
        ],
      );
      return;
    }

    submitRefund(payment);
  };

  const handleReconcile = async (payment: Payment) => {
    if (!token) return;
    setReconcilingId(payment.id);
    try {
      await paymentsApi.reconcileRefund(token, payment.id);
      load();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.paymentVerification.reconcileFailedMessage;
      Alert.alert(t.paymentVerification.refundFailedTitle, message);
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {payments === null ? (
            <ActivityIndicator color="#1F4A38" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.paymentVerification.loadFailed}</Text>
          ) : payments.length === 0 ? (
            <Text style={styles.helperText}>{t.paymentVerification.empty}</Text>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.customerName}>
                    {payment.booking?.customer?.name ?? payment.booking?.customer?.email}
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
                <Text style={styles.meta}>
                  {payment.booking?.service?.name}
                  {payment.booking ? ` · ${formatLocalizedDate(payment.booking.startDate, language)}` : ''}
                </Text>
                <View style={styles.amountRow}>
                  <Text style={styles.amount}>NZD {payment.amount.toFixed(2)}</Text>
                  {!!payment.referenceNote && (
                    <Text style={styles.reference}>{payment.referenceNote}</Text>
                  )}
                </View>

                {payment.status === 'pending_verification' && (
                  <TouchableOpacity
                    style={[styles.verifyButton, verifyingId === payment.id && styles.verifyButtonDisabled]}
                    onPress={() => handleVerify(payment)}
                    disabled={verifyingId !== null}
                  >
                    <Text style={styles.verifyButtonText}>
                      {verifyingId === payment.id
                        ? t.paymentVerification.verifying
                        : t.paymentVerification.verifyButton}
                    </Text>
                  </TouchableOpacity>
                )}

                {payment.status === 'paid' && refundFormId !== payment.id && (
                  <TouchableOpacity style={styles.refundButton} onPress={() => openRefundForm(payment)}>
                    <Text style={styles.refundButtonText}>
                      {payment.method === 'wechat_qr'
                        ? t.paymentVerification.markManualRefundButton
                        : t.paymentVerification.refundButton}
                    </Text>
                  </TouchableOpacity>
                )}

                {payment.status === 'refund_pending' && payment.method === 'stripe' && (
                  <TouchableOpacity
                    style={[styles.verifyButton, reconcilingId === payment.id && styles.verifyButtonDisabled]}
                    onPress={() => handleReconcile(payment)}
                    disabled={reconcilingId !== null}
                  >
                    <Text style={styles.verifyButtonText}>
                      {reconcilingId === payment.id
                        ? t.paymentVerification.reconciling
                        : t.paymentVerification.reconcileRefundButton}
                    </Text>
                  </TouchableOpacity>
                )}

                {refundFormId === payment.id && (
                  <View style={styles.refundForm}>
                    {payment.method === 'wechat_qr' && (
                      <Text style={styles.manualRefundWarning}>
                        {t.paymentVerification.manualRefundWarning}
                      </Text>
                    )}
                    <TextInput
                      style={styles.refundInput}
                      placeholder={t.paymentVerification.refundReasonPlaceholder}
                      value={refundReason}
                      onChangeText={setRefundReason}
                      editable={refundingId !== payment.id}
                      multiline
                    />
                    <View style={styles.refundFormButtons}>
                      <TouchableOpacity
                        style={styles.refundCancelButton}
                        onPress={() => setRefundFormId(null)}
                        disabled={refundingId === payment.id}
                      >
                        <Text style={styles.refundCancelButtonText}>
                          {t.paymentVerification.refundCancelButton}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.refundButton, refundingId === payment.id && styles.verifyButtonDisabled]}
                        onPress={() => handleRefund(payment)}
                        disabled={refundingId !== null}
                      >
                        <Text style={styles.refundButtonText}>
                          {refundingId === payment.id
                            ? t.paymentVerification.refunding
                            : payment.method === 'wechat_qr'
                              ? t.paymentVerification.markManualRefundButton
                              : t.paymentVerification.refundConfirmButton}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
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
    marginBottom: 4,
  },
  customerName: {
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
  meta: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  reference: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Courier',
  },
  verifyButton: {
    backgroundColor: '#1F4A38',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#F5EFE0',
    fontSize: 14,
    fontWeight: '600',
  },
  refundButton: {
    backgroundColor: '#A15C43',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
    flex: 1,
  },
  refundButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refundForm: {
    marginTop: 8,
    gap: 8,
  },
  manualRefundWarning: {
    fontSize: 13,
    color: '#A15C43',
    fontWeight: '600',
  },
  refundInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  refundFormButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refundCancelButton: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  refundCancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PaymentVerificationScreen;
