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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, paymentsApi, Booking, WechatPaymentIntent, Payment } from '../api/client';
import { authenticatedMediaSource } from '../api/mediaSource';

type RootStackParamList = {
  Payment: { booking: Booking };
};

type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

type Method = 'stripe' | 'wechat';
type StripeStatus = 'idle' | 'opening' | 'processing' | 'paid' | 'failed';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PaymentScreen = () => {
  const route = useRoute<PaymentRouteProp>();
  const { token } = useAuth();
  const { language, t } = useLanguage();
  const { booking } = route.params;

  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [checking, setChecking] = useState(true);

  const [method, setMethod] = useState<Method>(language === 'zh' ? 'wechat' : 'stripe');

  // WeChat
  const [wechatIntent, setWechatIntent] = useState<WechatPaymentIntent | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  // Stripe — a Checkout Session is only created when the user actually taps
  // "Pay with Card" (not just for switching to this tab), since each retry
  // needs a fresh Session and there's no reason to burn one just from
  // browsing tabs.
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('idle');

  useEffect(() => {
    if (!token) return;
    paymentsApi
      .mine(token)
      .then((payments) => {
        const isPaid = payments.some((p) => p.bookingId === booking.id && p.status === 'paid');
        setAlreadyPaid(isPaid);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setChecking(false));
  }, [token, booking.id]);

  useEffect(() => {
    if (checking || alreadyPaid || loadFailed || method !== 'wechat' || wechatIntent) return;
    if (!token) return;
    paymentsApi
      .initiateWechat(token, booking.id)
      .then(setWechatIntent)
      .catch(() => setLoadFailed(true));
  }, [checking, alreadyPaid, loadFailed, method, wechatIntent, token, booking.id]);

  const handleMarkPaid = () => {
    if (!wechatIntent) return;
    Alert.alert(t.payment.markPaidConfirmTitle, t.payment.markPaidConfirmMessage, [
      { text: t.payment.notYet, style: 'cancel' },
      {
        text: t.payment.ivePaidButton,
        onPress: async () => {
          if (!token) return;
          setIsMarking(true);
          try {
            await paymentsApi.markPaid(token, wechatIntent.paymentId);
            setWechatIntent({ ...wechatIntent, status: 'pending_verification' });
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

  const pollUntilPaid = async (paymentId: string): Promise<Payment | null> => {
    if (!token) return null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const payment = await paymentsApi.getOne(token, paymentId);
        if (payment.status === 'paid' || payment.status === 'failed') {
          return payment;
        }
      } catch {
        // Keep polling; a single failed check isn't fatal.
      }
      await sleep(1500);
    }
    return null;
  };

  const handlePayWithCard = async () => {
    if (!token) return;
    setStripeStatus('opening');
    try {
      const returnUrl = Linking.createURL('stripe-redirect');
      const intent = await paymentsApi.initiateStripe(token, booking.id, returnUrl);
      const result = await WebBrowser.openAuthSessionAsync(intent.checkoutUrl, returnUrl);

      if (result.type !== 'success') {
        setStripeStatus('idle');
        return;
      }

      setStripeStatus('processing');
      const settled = await pollUntilPaid(intent.paymentId);
      if (settled?.status === 'paid') {
        setStripeStatus('paid');
      } else if (settled?.status === 'failed') {
        setStripeStatus('failed');
      } else {
        // Webhook hasn't landed yet; not an error, just not confirmed within
        // this screen's polling window. Payment History will reflect it
        // once Stripe's webhook arrives.
        setStripeStatus('processing');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.payment.cardPaymentFailedMessage;
      Alert.alert(t.payment.cardPaymentFailedTitle, message);
      setStripeStatus('idle');
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator color="#2C4A3E" />
        </View>
      </View>
    );
  }

  if (alreadyPaid || stripeStatus === 'paid') {
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.methodTabs}>
            <TouchableOpacity
              style={[styles.methodTab, method === 'stripe' && styles.methodTabActive]}
              onPress={() => setMethod('stripe')}
            >
              <Text style={[styles.methodTabText, method === 'stripe' && styles.methodTabTextActive]}>
                {t.payment.methodCard}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodTab, method === 'wechat' && styles.methodTabActive]}
              onPress={() => setMethod('wechat')}
            >
              <Text style={[styles.methodTabText, method === 'wechat' && styles.methodTabTextActive]}>
                {t.payment.methodWechat}
              </Text>
            </TouchableOpacity>
          </View>

          {method === 'stripe' ? (
            <View style={styles.card}>
              <Text style={styles.cardStripeIntro}>{t.payment.cardIntro}</Text>

              {stripeStatus === 'processing' ? (
                <View style={styles.processingBox}>
                  <ActivityIndicator color="#2C4A3E" style={styles.processingSpinner} />
                  <Text style={styles.helperText}>{t.payment.cardProcessingMessage}</Text>
                </View>
              ) : stripeStatus === 'failed' ? (
                <Text style={styles.helperText}>{t.payment.cardFailedMessage}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.payButton,
                  (stripeStatus === 'opening' || stripeStatus === 'processing') && styles.payButtonDisabled,
                ]}
                onPress={handlePayWithCard}
                disabled={stripeStatus === 'opening' || stripeStatus === 'processing'}
              >
                <Text style={styles.payButtonText}>
                  {stripeStatus === 'opening'
                    ? t.payment.submitting
                    : stripeStatus === 'failed'
                      ? t.payment.retryButton
                      : t.payment.payWithCardButton}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !wechatIntent ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color="#2C4A3E" />
            </View>
          ) : wechatIntent.status === 'pending_verification' ? (
            <View style={styles.centerContent}>
              <Text style={styles.paidTitle}>{t.payment.waitingVerificationTitle}</Text>
              <Text style={styles.paidMessage}>{t.payment.waitingVerificationMessage}</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t.payment.amountLabel}</Text>
                  <Text style={styles.amount}>NZD {wechatIntent.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>{t.payment.referenceLabel}</Text>
                  <Text style={styles.value}>{wechatIntent.referenceNote}</Text>
                </View>
              </View>

              <View style={styles.qrCard}>
                {wechatIntent.qrCodeUrl ? (
                  <Image source={authenticatedMediaSource(wechatIntent.qrCodeUrl, token)} style={styles.qrImage} resizeMode="contain" />
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
            </>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 24,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  methodTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  methodTabActive: {
    backgroundColor: '#2C4A3E',
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  methodTabTextActive: {
    color: '#F5EDD8',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardStripeIntro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  processingBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  processingSpinner: {
    marginBottom: 12,
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
    marginBottom: 16,
  },
});

export default PaymentScreen;
