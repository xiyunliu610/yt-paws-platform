import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, reportsApi } from '../api/client';

type RootStackParamList = {
  ReportCompose: { bookingId: string };
};

type ReportComposeRouteProp = RouteProp<RootStackParamList, 'ReportCompose'>;
type Navigation = StackNavigationProp<RootStackParamList>;

// No cloud storage/presigned-upload flow exists yet (see
// docs/03_System_Architecture.md §5), so photos are embedded directly as
// base64 data URIs rather than uploaded to a URL. Kept small and
// photos-only (no video) to keep the payload size reasonable.
const MAX_PHOTOS = 3;

const ReportComposeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ReportComposeRouteProp>();
  const { token } = useAuth();
  const { t } = useLanguage();
  const { bookingId } = route.params;

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.reportCompose.permissionRequiredTitle, t.reportCompose.libraryPermissionMessage);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        const dataUris = result.assets
          .filter((asset) => !!asset.base64)
          .map((asset) => `data:image/jpeg;base64,${asset.base64}`);
        setPhotos((prev) => [...prev, ...dataUris].slice(0, MAX_PHOTOS));
      }
    } catch (error) {
      console.error('Choosing report photos failed:', error);
      Alert.alert(t.reportCompose.pickImageErrorTitle, t.reportCompose.pickImageErrorMessage);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!token) return;
    if (!text.trim() && photos.length === 0) {
      Alert.alert(t.reportCompose.errorTitle, t.reportCompose.emptyError);
      return;
    }

    setIsSubmitting(true);
    try {
      await reportsApi.create(token, bookingId, {
        text: text.trim() || undefined,
        mediaUrls: photos,
      });
      Alert.alert(t.reportCompose.successTitle, t.reportCompose.successMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : t.reportCompose.submitFailedMessage;
      Alert.alert(t.reportCompose.submitFailedTitle, message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.label}>{t.reportCompose.textLabel}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t.reportCompose.textPlaceholder}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.label}>{t.reportCompose.photosLabel}</Text>
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity onPress={addPhotos} disabled={isSubmitting}>
                  <Text style={styles.addLink}>{t.reportCompose.addPhotosButton}</Text>
                </TouchableOpacity>
              )}
            </View>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photos.map((uri, index) => (
                  <TouchableOpacity key={index} style={styles.photoWrapper} onPress={() => removePhoto(index)}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    <View style={styles.removeBadge}>
                      <Text style={styles.removeBadgeText}>×</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t.reportCompose.submitting : t.reportCompose.submit}
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    height: 130,
    paddingTop: 14,
  },
  addLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  photoRow: {
    marginTop: 4,
  },
  photoWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ReportComposeScreen;
