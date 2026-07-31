import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, servicesApi, Service, ServiceInput, ServiceUpdateInput } from '../api/client';

interface ServiceFormState {
  name: string;
  description: string;
  price: string;
  pricingUnit: 'flat' | 'per_day';
  durationMinutes: string;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  price: '',
  pricingUnit: 'flat',
  durationMinutes: '',
};

const ServiceManagementScreen = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [services, setServices] = useState<Service[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadServices = useCallback(() => {
    if (!token) return;
    servicesApi
      .list(token)
      .then((list) => {
        setServices(list);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [loadServices]),
  );

  const parsePrice = (value: string): number | null => {
    const price = Number(value);
    if (!value.trim() || Number.isNaN(price) || price < 0) return null;
    return price;
  };

  const toServiceInput = (form: ServiceFormState): ServiceInput | null => {
    const price = parsePrice(form.price);
    if (!form.name.trim() || price === null) return null;
    const durationMinutes = form.durationMinutes.trim() ? Number(form.durationMinutes) : undefined;
    if (durationMinutes !== undefined && (Number.isNaN(durationMinutes) || durationMinutes <= 0)) return null;
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      pricingUnit: form.pricingUnit,
      durationMinutes,
    };
  };

  const handleCreate = async () => {
    if (!token) return;
    const input = toServiceInput(addForm);
    if (!input) {
      Alert.alert(t.serviceManagement.errorTitle, t.serviceManagement.invalidForm);
      return;
    }

    setIsSaving(true);
    try {
      const created = await servicesApi.create(token, input);
      setServices((prev) => [...(prev ?? []), created]);
      setAddForm(EMPTY_FORM);
      setIsAdding(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.serviceManagement.saveFailedMessage;
      Alert.alert(t.serviceManagement.saveFailedTitle, message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (service: Service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      description: service.description ?? '',
      price: String(service.price),
      pricingUnit: service.pricingUnit,
      durationMinutes: service.durationMinutes ? String(service.durationMinutes) : '',
    });
  };

  const handleUpdate = async (service: Service) => {
    if (!token) return;
    const input = toServiceInput(editForm);
    if (!input) {
      Alert.alert(t.serviceManagement.errorTitle, t.serviceManagement.invalidForm);
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await servicesApi.update(token, service.id, { ...input, isActive: service.isActive });
      setServices((prev) => (prev ?? []).map((s) => (s.id === service.id ? updated : s)));
      setEditingId(null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.serviceManagement.saveFailedMessage;
      Alert.alert(t.serviceManagement.saveFailedTitle, message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (service: Service, value: boolean) => {
    if (!token) return;
    // Optimistic: this is a simple boolean flip the owner expects to feel
    // instant, unlike the full edit form's explicit Save step.
    setServices((prev) => (prev ?? []).map((s) => (s.id === service.id ? { ...s, isActive: value } : s)));
    try {
      const updated: ServiceUpdateInput = { isActive: value };
      await servicesApi.update(token, service.id, updated);
    } catch (error) {
      setServices((prev) => (prev ?? []).map((s) => (s.id === service.id ? { ...s, isActive: !value } : s)));
      const message = error instanceof ApiError ? error.message : t.serviceManagement.saveFailedMessage;
      Alert.alert(t.serviceManagement.saveFailedTitle, message);
    }
  };

  const renderForm = (
    form: ServiceFormState,
    setForm: React.Dispatch<React.SetStateAction<ServiceFormState>>,
    disabled: boolean,
  ) => (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder={t.serviceManagement.namePlaceholder}
        value={form.name}
        onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
        editable={!disabled}
      />
      <TextInput
        style={styles.input}
        placeholder={t.serviceManagement.descriptionPlaceholder}
        value={form.description}
        onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
        editable={!disabled}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder={t.serviceManagement.pricePlaceholder}
        value={form.price}
        onChangeText={(price) => setForm((prev) => ({ ...prev, price }))}
        keyboardType="decimal-pad"
        editable={!disabled}
      />
      <View style={styles.pricingUnitRow}>
        {(['flat', 'per_day'] as const).map((unit) => (
          <TouchableOpacity
            key={unit}
            style={[styles.pricingUnitButton, form.pricingUnit === unit && styles.pricingUnitButtonActive]}
            onPress={() => setForm((prev) => ({ ...prev, pricingUnit: unit }))}
            disabled={disabled}
          >
            <Text
              style={[
                styles.pricingUnitButtonText,
                form.pricingUnit === unit && styles.pricingUnitButtonTextActive,
              ]}
            >
              {unit === 'flat' ? t.serviceManagement.pricingUnitFlat : t.serviceManagement.pricingUnitPerDay}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder={t.serviceManagement.durationPlaceholder}
        value={form.durationMinutes}
        onChangeText={(durationMinutes) => setForm((prev) => ({ ...prev, durationMinutes }))}
        keyboardType="number-pad"
        editable={!disabled}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.serviceManagement.headerTitle}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsAdding((prev) => !prev);
                setEditingId(null);
              }}
            >
              <Text style={styles.addLink}>
                {isAdding ? t.serviceManagement.cancel : t.serviceManagement.addServiceButton}
              </Text>
            </TouchableOpacity>
          </View>

          {isAdding && (
            <View>
              {renderForm(addForm, setAddForm, isSaving)}
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleCreate}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? t.serviceManagement.saving : t.serviceManagement.saveButton}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {services === null ? (
            <ActivityIndicator color="#2C4A3E" style={styles.spinner} />
          ) : failed ? (
            <Text style={styles.helperText}>{t.serviceManagement.loadFailed}</Text>
          ) : services.length === 0 && !isAdding ? (
            <Text style={styles.helperText}>{t.serviceManagement.empty}</Text>
          ) : (
            services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <TouchableOpacity
                  style={styles.serviceCardHeader}
                  onPress={() => (editingId === service.id ? setEditingId(null) : startEditing(service))}
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.servicePrice}>
                      NZD {service.price}
                      {service.pricingUnit === 'per_day' ? ` / ${t.serviceManagement.dayUnit}` : ''}
                    </Text>
                  </View>
                  <Switch
                    value={service.isActive}
                    onValueChange={(value) => handleToggleActive(service, value)}
                    trackColor={{ true: '#2C4A3E' }}
                  />
                </TouchableOpacity>

                {editingId === service.id && (
                  <View>
                    {renderForm(editForm, setEditForm, isUpdating)}
                    <TouchableOpacity
                      style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                      onPress={() => handleUpdate(service)}
                      disabled={isUpdating}
                    >
                      <Text style={styles.saveButtonText}>
                        {isUpdating ? t.serviceManagement.saving : t.serviceManagement.saveButton}
                      </Text>
                    </TouchableOpacity>
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
    backgroundColor: '#F5EDD8',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pricingUnitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingUnitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  pricingUnitButtonActive: {
    backgroundColor: '#2C4A3E',
    borderColor: '#2C4A3E',
  },
  pricingUnitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pricingUnitButtonTextActive: {
    color: '#F5EDD8',
  },
  saveButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EDD8',
  },
  spinner: {
    marginTop: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 13,
    color: '#666',
  },
});

export default ServiceManagementScreen;
