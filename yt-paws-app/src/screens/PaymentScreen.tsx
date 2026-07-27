import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, paymentsApi, Booking, WechatPaymentIntent } from '../api/client';

type RootStackParamList = {
  Payment: { booking: Booking };
};

type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

const PaymentScreen = () => {
  const route = useRoute<PaymentRouteProp>();
  const { token } = useAuth();
  const { t } = useLanguage();
  const { booking } = route.params;

  const [intent, setIntent] = useState<WechatPaymentIntent | null>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        // Check whether this booking has already been paid in full before
        // initiating a fresh WeChat payment attempt for it.
        const payments = await paymentsApi.mine(token);
        const isPaid = payments.some((p) => p.bookingId === booking.id && p.status === 'paid');
        if (cancelled) return;

        if (isPaid) {
          setAlreadyPaid(true);
          return;
        }

        const result = await paymentsApi.initiateWechat(token, booking.id);
        if (!cancelled) setIntent(result);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, booking.id]);

  const handleMarkPaid = () => {
    if (!intent) return;
    Alert.alert(t.payment.markPaidConfirmTitle, t.payment.markPaidConfirmMessage, [
      { text: t.payment.notYet, style: 'cancel' },
      {
        text: t.payment.ivePaidButton,
        onPress: async () => {
          if (!token) return;
          setIsMarking(true);
          try {
            await paymentsApi.markPaid(token, intent.paymentId);
            setIntent({ ...intent, status: 'pending_verification' });
          } catch (error) {
            const message =
              error instanceof ApiError ? error.message : t.payment.markPaidFailedMessage;
            Alert.alert(t.payment.markPaidFailedTitle, message);
          } finally {
            setIsMarking(false);
          }
        },
      },
    ]);
  };

  if (alreadyPaid) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.paidTitle}>{t.payment.paidTitle}</Text>
          <Text style={styles.paidMessage}>{t.payment.paidMessage}</Text>
        </View>
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.helperText}>{t.payment.loadFailedMessage}</Text>
        </View>
      </View>
    );
  }

  if (!intent) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator color="#2C4A3E" />
        </View>
      </View>
    );
  }

  if (intent.status === 'pending_verification') {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.paidTitle}>{t.payment.waitingVerificationTitle}</Text>
          <Text style={styles.paidMessage}>{t.payment.waitingVerificationMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t.payment.amountLabel}</Text>
              <Text style={styles.amount}>NZD {intent.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t.payment.referenceLabel}</Text>
              <Text style={styles.value}>{intent.referenceNote}</Text>
            </View>
          </View>

          <View style={styles.qrCard}>
            {intent.qrCodeUrl ? (
              <Image source={{ uri: intent.qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <Text style={styles.helperText}>{t.payment.noQrCodeMessage}</Text>
            )}
          </View>

          <Text style={styles.instructions}>{t.payment.wechatInstructions}</Text>

          <TouchableOpacity
            style={[styles.payButton, isMarking && styles.payButtonDisabled]}
            onPress={handleMarkPaid}
            disabled={isMarking}
          >
            <Text style={styles.payButtonText}>
              {isMarking ? t.payment.submitting : t.payment.ivePaidButton}
            </Text>
          </TouchableOpacity>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  qrCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 220,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  instructions: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paidTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 8,
    textAlign: 'center',
  },
  paidMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default PaymentScreen;
