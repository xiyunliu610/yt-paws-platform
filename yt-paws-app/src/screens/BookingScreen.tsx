import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../i18n/LanguageContext';

type ServiceKey = 'boarding' | 'dayCare' | 'grooming' | 'houseVisit';
type PetTypeKey = 'dog' | 'cat' | 'other';

type PreselectedService = {
  key: ServiceKey;
  name?: string;
};

type RootStackParamList = {
  Home: undefined;
  Booking: { service?: PreselectedService } | undefined;
};

type BookingNavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;
type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const SERVICE_KEYS: ServiceKey[] = ['boarding', 'dayCare', 'grooming', 'houseVisit'];
const SERVICE_PRICES: Record<ServiceKey, number> = {
  boarding: 45,
  dayCare: 30,
  grooming: 60,
  houseVisit: 35,
};
const PET_TYPE_KEYS: PetTypeKey[] = ['dog', 'cat', 'other'];
const DURATION_ELIGIBLE_SERVICES: ServiceKey[] = ['boarding', 'dayCare'];

const BookingScreen = () => {
  const navigation = useNavigation<BookingNavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { t } = useLanguage();

  const preSelectedService = route.params?.service;

  const [selectedServiceKey, setSelectedServiceKey] = useState<ServiceKey | ''>(
    preSelectedService?.key ?? '',
  );
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetTypeKey | ''>('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [duration, setDuration] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && time) {
      setSelectedTime(time);
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const calculateTotal = () => {
    if (!selectedServiceKey) return 0;
    return SERVICE_PRICES[selectedServiceKey] * parseInt(duration || '1');
  };

  const isDurationEligible = selectedServiceKey
    ? DURATION_ELIGIBLE_SERVICES.includes(selectedServiceKey)
    : false;

  const validateForm = () => {
    if (!selectedServiceKey) {
      Alert.alert(t.booking.errorTitle, t.booking.selectServiceError);
      return false;
    }
    if (!petName.trim()) {
      Alert.alert(t.booking.errorTitle, t.booking.enterPetName);
      return false;
    }
    if (!petType) {
      Alert.alert(t.booking.errorTitle, t.booking.selectPetType);
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      Alert.alert(t.booking.errorTitle, t.booking.dateInPastError);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedServiceKey) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: connect to the bookings API once it exists.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const serviceName = t.home.services[selectedServiceKey].name;
      const message = t.booking.successMessage
        .replace('{pet}', petName)
        .replace('{service}', serviceName)
        .replace('{date}', formatDate(selectedDate))
        .replace('{time}', formatTime(selectedTime));

      Alert.alert(t.booking.successTitle, message, [
        {
          text: t.booking.goHome,
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      console.error('Booking submission failed:', error);
      Alert.alert(t.booking.submitFailedTitle, t.booking.submitFailedMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.booking.headerTitle}</Text>
          <Text style={styles.headerSubtitle}>{t.booking.headerSubtitle}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.selectService}</Text>
            <View style={styles.optionsGrid}>
              {SERVICE_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionCard,
                    selectedServiceKey === key && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedServiceKey(key)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedServiceKey === key && styles.optionTextSelected,
                  ]}>
                    {t.home.services[key].name}
                  </Text>
                  <Text style={[
                    styles.optionPrice,
                    selectedServiceKey === key && styles.optionPriceSelected,
                  ]}>
                    NZD ${SERVICE_PRICES[key]}/{t.booking.serviceUnits[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.petNameLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.booking.petNamePlaceholder}
              value={petName}
              onChangeText={setPetName}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.petTypeLabel}</Text>
            <View style={styles.petTypeContainer}>
              {PET_TYPE_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.petTypeButton,
                    petType === key && styles.petTypeButtonSelected,
                  ]}
                  onPress={() => setPetType(key)}
                >
                  <Text style={[
                    styles.petTypeText,
                    petType === key && styles.petTypeTextSelected,
                  ]}>
                    {t.booking.petTypes[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.dateLabel}</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(selectedDate)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#2C4A3E"
                  themeVariant="light"
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerButtonContainer}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>{t.booking.confirm}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.timeLabel}</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatTime(selectedTime)}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <View>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  is24Hour={true}
                  textColor="#2C4A3E"
                  themeVariant="light"
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerButtonContainer}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>{t.booking.confirm}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {isDurationEligible && (
            <View style={styles.section}>
              <Text style={styles.label}>{t.booking.durationLabel}</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const current = parseInt(duration);
                    if (current > 1) setDuration((current - 1).toString());
                  }}
                >
                  <Text style={styles.durationButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const current = parseInt(duration);
                    setDuration((current + 1).toString());
                  }}
                >
                  <Text style={styles.durationButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.specialRequestsLabel}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t.booking.specialRequestsPlaceholder}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {selectedServiceKey && (
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceService}</Text>
                <Text style={styles.priceValue}>{t.home.services[selectedServiceKey].name}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceDate}</Text>
                <Text style={styles.priceValue}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceTime}</Text>
                <Text style={styles.priceValue}>{formatTime(selectedTime)}</Text>
              </View>
              {isDurationEligible && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t.booking.priceDuration}</Text>
                  <Text style={styles.priceValue}>{duration} {t.booking.dayUnit}</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>{t.booking.estimatedTotal}</Text>
                <Text style={styles.priceTotalValue}>
                  NZD ${calculateTotal()}
                </Text>
              </View>
              <Text style={styles.priceNote}>
                {t.booking.priceNote}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t.booking.submitting : t.booking.submit}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <View style={styles.infoAccent} />
            <Text style={styles.infoText}>
              {t.booking.infoText}
            </Text>
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
  header: {
    backgroundColor: '#2C4A3E',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F5EDD8',
    opacity: 0.9,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#2C4A3E',
    backgroundColor: '#2C4A3E',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 6,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#F5EDD8',
  },
  optionPrice: {
    fontSize: 13,
    color: '#666',
  },
  optionPriceSelected: {
    color: '#F5EDD8',
    opacity: 0.9,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  petTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  petTypeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  petTypeButtonSelected: {
    borderColor: '#2C4A3E',
    backgroundColor: '#2C4A3E',
  },
  petTypeText: {
    fontSize: 16,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  petTypeTextSelected: {
    color: '#F5EDD8',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  pickerButtonContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickerButton: {
    backgroundColor: '#2C4A3E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pickerButtonText: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  durationButton: {
    width: 50,
    height: 50,
    backgroundColor: '#2C4A3E',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 24,
    color: '#F5EDD8',
    fontWeight: 'bold',
  },
  durationInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
    textAlign: 'center',
    minWidth: 80,
    paddingHorizontal: 20,
  },
  priceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2C4A3E',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  priceTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  priceTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  priceNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  infoAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: '#C9A227',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default BookingScreen;
