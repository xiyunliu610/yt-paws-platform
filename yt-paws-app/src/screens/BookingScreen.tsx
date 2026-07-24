import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ApiError, servicesApi, petsApi, bookingsApi, Service, Pet } from '../api/client';

type PetTypeKey = 'dog' | 'cat' | 'other';

type PreselectedService = {
  name: string;
};

type RootStackParamList = {
  Home: undefined;
  Booking: { service?: PreselectedService } | undefined;
};

type BookingNavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;
type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const PET_TYPE_KEYS: PetTypeKey[] = ['dog', 'cat', 'other'];

const BookingScreen = () => {
  const navigation = useNavigation<BookingNavigationProp>();
  const route = useRoute<BookingRouteProp>();
  const { t } = useLanguage();
  const { token } = useAuth();

  const preSelectedServiceName = route.params?.service?.name;

  const [services, setServices] = useState<Service[] | null>(null);
  const [servicesFailed, setServicesFailed] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petsFailed, setPetsFailed] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState<PetTypeKey | ''>('');
  const [isSavingPet, setIsSavingPet] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [duration, setDuration] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!token) return;

    servicesApi
      .list(token)
      .then((list) => {
        setServices(list);
        if (preSelectedServiceName) {
          const match = list.find(
            (s) => s.name.toLowerCase() === preSelectedServiceName.toLowerCase(),
          );
          if (match) setSelectedServiceId(match.id);
        }
      })
      .catch(() => setServicesFailed(true));

    petsApi
      .list(token)
      .then((list) => {
        setPets(list);
        setIsAddingPet(list.length === 0);
      })
      .catch(() => setPetsFailed(true));
  }, [token]);

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

  const selectedService = services?.find((s) => s.id === selectedServiceId) ?? null;
  const selectedPet = pets?.find((p) => p.id === selectedPetId) ?? null;
  const isPerDay = selectedService?.pricingUnit === 'per_day';
  const durationDays = parseInt(duration || '1', 10);
  const estimatedTotal = selectedService
    ? (isPerDay ? selectedService.price * durationDays : selectedService.price)
    : 0;

  const validateForm = () => {
    if (!selectedService) {
      Alert.alert(t.booking.errorTitle, t.booking.selectServiceError);
      return false;
    }
    if (!selectedPet) {
      Alert.alert(t.booking.errorTitle, t.booking.selectPetError);
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

  const handleAddPet = async () => {
    if (!token) return;
    if (!newPetName.trim()) {
      Alert.alert(t.booking.errorTitle, t.booking.enterPetName);
      return;
    }
    if (!newPetType) {
      Alert.alert(t.booking.errorTitle, t.booking.selectPetType);
      return;
    }

    setIsSavingPet(true);
    try {
      const created = await petsApi.create(token, {
        name: newPetName.trim(),
        species: t.booking.petTypes[newPetType],
      });
      setPets((prev) => [...(prev ?? []), created]);
      setSelectedPetId(created.id);
      setNewPetName('');
      setNewPetType('');
      setIsAddingPet(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.booking.addPetFailedMessage;
      Alert.alert(t.booking.addPetFailedTitle, message);
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedService || !selectedPet || !token) {
      return;
    }

    setIsSubmitting(true);

    const startDate = new Date(selectedDate);
    startDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
    const endDate = isPerDay
      ? new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
      : new Date(startDate.getTime() + (selectedService.durationMinutes ?? 60) * 60 * 1000);

    try {
      await bookingsApi.create(token, {
        serviceId: selectedService.id,
        petId: selectedPet.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const message = t.booking.successMessage
        .replace('{pet}', selectedPet.name)
        .replace('{service}', selectedService.name)
        .replace('{date}', formatDate(selectedDate))
        .replace('{time}', formatTime(selectedTime));

      Alert.alert(t.booking.successTitle, message, [
        {
          text: t.booking.goHome,
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        Alert.alert(t.booking.errorTitle, t.booking.conflictErrorMessage);
      } else {
        const message = error instanceof ApiError ? error.message : t.booking.submitFailedMessage;
        Alert.alert(t.booking.submitFailedTitle, message);
      }
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
            {services === null ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : servicesFailed ? (
              <Text style={styles.helperText}>{t.booking.loadServicesFailed}</Text>
            ) : services.length === 0 ? (
              <Text style={styles.helperText}>{t.booking.noServicesAvailable}</Text>
            ) : (
              <View style={styles.optionsGrid}>
                {services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.optionCard,
                      selectedServiceId === service.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedServiceId(service.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedServiceId === service.id && styles.optionTextSelected,
                    ]}>
                      {service.name}
                    </Text>
                    <Text style={[
                      styles.optionPrice,
                      selectedServiceId === service.id && styles.optionPriceSelected,
                    ]}>
                      NZD ${service.price}{service.pricingUnit === 'per_day' ? `/${t.booking.dayUnit.replace(/s$/, '')}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.booking.selectPetLabel}</Text>
            {pets === null ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : petsFailed ? (
              <Text style={styles.helperText}>{t.booking.loadPetsFailed}</Text>
            ) : (
              <>
                {pets.length > 0 && !isAddingPet && (
                  <View style={styles.optionsGrid}>
                    {pets.map((pet) => (
                      <TouchableOpacity
                        key={pet.id}
                        style={[
                          styles.optionCard,
                          selectedPetId === pet.id && styles.optionCardSelected,
                        ]}
                        onPress={() => setSelectedPetId(pet.id)}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedPetId === pet.id && styles.optionTextSelected,
                        ]}>
                          {pet.name}
                        </Text>
                        {!!pet.species && (
                          <Text style={[
                            styles.optionPrice,
                            selectedPetId === pet.id && styles.optionPriceSelected,
                          ]}>
                            {pet.species}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {pets.length === 0 && !isAddingPet && (
                  <Text style={styles.helperText}>{t.booking.noPetsYet}</Text>
                )}

                {!isAddingPet && (
                  <TouchableOpacity onPress={() => setIsAddingPet(true)}>
                    <Text style={styles.addPetLink}>+ {t.booking.addPetInline}</Text>
                  </TouchableOpacity>
                )}

                {isAddingPet && (
                  <View style={styles.addPetForm}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.booking.petNamePlaceholder}
                      value={newPetName}
                      onChangeText={setNewPetName}
                      editable={!isSavingPet}
                    />
                    <View style={styles.petTypeContainer}>
                      {PET_TYPE_KEYS.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.petTypeButton,
                            newPetType === key && styles.petTypeButtonSelected,
                          ]}
                          onPress={() => setNewPetType(key)}
                        >
                          <Text style={[
                            styles.petTypeText,
                            newPetType === key && styles.petTypeTextSelected,
                          ]}>
                            {t.booking.petTypes[key]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.submitButton, isSavingPet && styles.submitButtonDisabled]}
                      onPress={handleAddPet}
                      disabled={isSavingPet}
                    >
                      <Text style={styles.submitButtonText}>
                        {isSavingPet ? t.booking.submitting : t.booking.addPetConfirm}
                      </Text>
                    </TouchableOpacity>
                    {pets.length > 0 && (
                      <TouchableOpacity onPress={() => setIsAddingPet(false)}>
                        <Text style={styles.addPetLink}>{t.profile.cancel}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
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

          {isPerDay && (
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

          {selectedService && (
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceService}</Text>
                <Text style={styles.priceValue}>{selectedService.name}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceDate}</Text>
                <Text style={styles.priceValue}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{t.booking.priceTime}</Text>
                <Text style={styles.priceValue}>{formatTime(selectedTime)}</Text>
              </View>
              {isPerDay && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t.booking.priceDuration}</Text>
                  <Text style={styles.priceValue}>{duration} {t.booking.dayUnit}</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>{t.booking.estimatedTotal}</Text>
                <Text style={styles.priceTotalValue}>
                  NZD ${estimatedTotal}
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
  helperText: {
    fontSize: 14,
    color: '#666',
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
  addPetLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C4A3E',
    marginTop: 4,
  },
  addPetForm: {
    marginTop: 12,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  petTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
