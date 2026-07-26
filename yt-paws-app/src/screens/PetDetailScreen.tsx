import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, petsApi, Pet, PetHealthRecord } from '../api/client';

type RootStackParamList = {
  PetDetail: { pet: Pet };
};

type PetDetailRouteProp = RouteProp<RootStackParamList, 'PetDetail'>;

const PetDetailScreen = () => {
  const route = useRoute<PetDetailRouteProp>();
  const { token } = useAuth();
  const { t } = useLanguage();
  const { pet } = route.params;

  const [name, setName] = useState(pet.name);
  const [species, setSpecies] = useState(pet.species ?? '');
  const [breed, setBreed] = useState(pet.breed ?? '');
  const [age, setAge] = useState(pet.age?.toString() ?? '');
  const [weight, setWeight] = useState(pet.weight?.toString() ?? '');
  const [personality, setPersonality] = useState(pet.personality ?? '');
  const [dietNotes, setDietNotes] = useState(pet.dietNotes ?? '');
  const [isNeutered, setIsNeutered] = useState(pet.isNeutered ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const [records, setRecords] = useState<PetHealthRecord[] | null>(null);
  const [recordsFailed, setRecordsFailed] = useState(false);
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordType, setRecordType] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());
  const [recordNotes, setRecordNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  useEffect(() => {
    if (!token) return;
    petsApi
      .listHealthRecords(token, pet.id)
      .then(setRecords)
      .catch(() => setRecordsFailed(true));
  }, [token, pet.id]);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert(t.petDetail.errorTitle, t.petDetail.enterName);
      return;
    }

    setIsSaving(true);
    try {
      await petsApi.update(token, pet.id, {
        name: name.trim(),
        species: species.trim() || undefined,
        breed: breed.trim() || undefined,
        age: age.trim() ? parseInt(age, 10) : undefined,
        weight: weight.trim() ? parseFloat(weight) : undefined,
        personality: personality.trim() || undefined,
        dietNotes: dietNotes.trim() || undefined,
        isNeutered,
      });
      Alert.alert(t.petDetail.saveSuccessTitle, t.petDetail.saveSuccessMessage);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.petDetail.saveFailedMessage;
      Alert.alert(t.petDetail.saveFailedTitle, message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRecord = async () => {
    if (!token) return;
    if (!recordType.trim()) {
      Alert.alert(t.petDetail.errorTitle, t.petDetail.enterRecordType);
      return;
    }

    setIsSavingRecord(true);
    try {
      const created = await petsApi.addHealthRecord(token, pet.id, {
        type: recordType.trim(),
        date: recordDate.toISOString(),
        notes: recordNotes.trim() || undefined,
      });
      setRecords((prev) => [...(prev ?? []), created]);
      setRecordType('');
      setRecordNotes('');
      setRecordDate(new Date());
      setIsAddingRecord(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.petDetail.recordSaveFailedMessage;
      Alert.alert(t.petDetail.recordSaveFailedTitle, message);
    } finally {
      setIsSavingRecord(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>{t.petDetail.nameLabel}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} editable={!isSaving} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.petDetail.speciesLabel}</Text>
            <TextInput style={styles.input} value={species} onChangeText={setSpecies} editable={!isSaving} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.petDetail.breedLabel}</Text>
            <TextInput style={styles.input} value={breed} onChangeText={setBreed} editable={!isSaving} />
          </View>

          <View style={styles.row}>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>{t.petDetail.ageLabel}</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                editable={!isSaving}
              />
            </View>
            <View style={[styles.section, styles.halfWidth]}>
              <Text style={styles.label}>{t.petDetail.weightLabel}</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.petDetail.personalityLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.petDetail.personalityPlaceholder}
              value={personality}
              onChangeText={setPersonality}
              editable={!isSaving}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t.petDetail.dietNotesLabel}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t.petDetail.dietNotesPlaceholder}
              value={dietNotes}
              onChangeText={setDietNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          <View style={[styles.section, styles.switchRow]}>
            <Text style={styles.label}>{t.petDetail.neuteredLabel}</Text>
            <Switch
              value={isNeutered}
              onValueChange={setIsNeutered}
              disabled={isSaving}
              trackColor={{ false: '#E0E0E0', true: '#2C4A3E' }}
              thumbColor="#F5EDD8"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? t.petDetail.saving : t.petDetail.saveButton}
            </Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.petDetail.healthRecordsTitle}</Text>
              <TouchableOpacity onPress={() => setIsAddingRecord((prev) => !prev)}>
                <Text style={styles.addLink}>
                  {isAddingRecord ? t.petDetail.cancel : t.petDetail.addRecordButton}
                </Text>
              </TouchableOpacity>
            </View>

            {records === null ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : recordsFailed ? (
              <Text style={styles.helperText}>{t.petDetail.loadRecordsFailed}</Text>
            ) : (
              <>
                {records.length === 0 && !isAddingRecord && (
                  <Text style={styles.helperText}>{t.petDetail.noRecordsYet}</Text>
                )}
                {records.map((record) => (
                  <View key={record.id} style={styles.recordCard}>
                    <Text style={styles.recordType}>{record.type}</Text>
                    <Text style={styles.recordDate}>{record.date.slice(0, 10)}</Text>
                    {!!record.notes && <Text style={styles.recordNotes}>{record.notes}</Text>}
                  </View>
                ))}

                {isAddingRecord && (
                  <View style={styles.addRecordForm}>
                    <TextInput
                      style={styles.input}
                      placeholder={t.petDetail.recordTypePlaceholder}
                      value={recordType}
                      onChangeText={setRecordType}
                      editable={!isSavingRecord}
                    />
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateText}>{formatDate(recordDate)}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={recordDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          if (Platform.OS === 'android') setShowDatePicker(false);
                          if (event.type === 'set' && date) {
                            setRecordDate(date);
                            if (Platform.OS === 'ios') setShowDatePicker(false);
                          } else if (event.type === 'dismissed') {
                            setShowDatePicker(false);
                          }
                        }}
                        textColor="#2C4A3E"
                        themeVariant="light"
                      />
                    )}
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={t.petDetail.recordNotesPlaceholder}
                      value={recordNotes}
                      onChangeText={setRecordNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      editable={!isSavingRecord}
                    />
                    <TouchableOpacity
                      style={[styles.saveButton, isSavingRecord && styles.saveButtonDisabled]}
                      onPress={handleSaveRecord}
                      disabled={isSavingRecord}
                    >
                      <Text style={styles.saveButtonText}>
                        {isSavingRecord ? t.petDetail.saving : t.petDetail.saveRecordButton}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 90,
    paddingTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recordType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  recordNotes: {
    fontSize: 13,
    color: '#666',
  },
  addRecordForm: {
    marginTop: 8,
    gap: 12,
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default PetDetailScreen;
