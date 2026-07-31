import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, businessesApi, Business } from '../api/client';

const BusinessSettingsScreen = () => {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [business, setBusiness] = useState<Business | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [wechatQrCodeUrl, setWechatQrCodeUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadBusiness = useCallback(() => {
    if (!token) return;
    businessesApi
      .getMine(token)
      .then((result) => {
        setBusiness(result);
        setName(result.name);
        setRegion(result.region ?? '');
        setWechatQrCodeUrl(result.wechatQrCodeUrl);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadBusiness();
    }, [loadBusiness]),
  );

  // Same interim base64-data-URI approach as pet/report photos (see
  // docs/03_System_Architecture.md §5.3) — no cloud storage exists yet.
  const pickQrCode = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.businessSettings.permissionRequiredTitle, t.businessSettings.libraryPermissionMessage);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setWechatQrCodeUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Choosing a WeChat QR code image failed:', error);
      Alert.alert(t.businessSettings.pickImageErrorTitle, t.businessSettings.pickImageErrorMessage);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert(t.businessSettings.errorTitle, t.businessSettings.enterName);
      return;
    }

    setIsSaving(true);
    try {
      const updated = await businessesApi.updateMine(token, {
        name: name.trim(),
        // null (not undefined) so an emptied field actually clears the
        // column instead of the update silently leaving the old value.
        region: region.trim() || null,
        wechatQrCodeUrl,
      });
      setBusiness(updated);
      Alert.alert(t.businessSettings.savedTitle, t.businessSettings.savedMessage);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.businessSettings.saveFailedMessage;
      Alert.alert(t.businessSettings.saveFailedTitle, message);
    } finally {
      setIsSaving(false);
    }
  };

  if (business === null && !failed) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#2C4A3E" style={styles.spinner} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.container}>
        <Text style={styles.helperText}>{t.businessSettings.loadFailed}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.label}>{t.businessSettings.nameLabel}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} editable={!isSaving} />

          <Text style={styles.label}>{t.businessSettings.regionLabel}</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder={t.businessSettings.regionPlaceholder}
            editable={!isSaving}
            multiline
          />

          <Text style={styles.label}>{t.businessSettings.qrCodeLabel}</Text>
          <TouchableOpacity style={styles.qrCodePicker} onPress={pickQrCode} disabled={isSaving}>
            {wechatQrCodeUrl ? (
              <Image source={{ uri: wechatQrCodeUrl }} style={styles.qrCodeImage} />
            ) : (
              <Text style={styles.qrCodePlaceholderText}>{t.businessSettings.qrCodePlaceholder}</Text>
            )}
          </TouchableOpacity>
          {wechatQrCodeUrl && (
            <TouchableOpacity
              style={styles.removeQrCodeButton}
              onPress={() => setWechatQrCodeUrl(null)}
              disabled={isSaving}
            >
              <Text style={styles.removeQrCodeButtonText}>{t.businessSettings.removeQrCode}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? t.businessSettings.saving : t.businessSettings.saveButton}
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
  content: {
    padding: 24,
  },
  spinner: {
    marginTop: 40,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 8,
    marginTop: 16,
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
  qrCodePicker: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  qrCodeImage: {
    width: '100%',
    height: '100%',
  },
  qrCodePlaceholderText: {
    fontSize: 14,
    color: '#999',
  },
  removeQrCodeButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  removeQrCodeButtonText: {
    fontSize: 13,
    color: '#B04A3C',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EDD8',
  },
});

export default BusinessSettingsScreen;
