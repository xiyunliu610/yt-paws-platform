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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, petsApi, Pet } from '../api/client';

type PetTypeKey = 'dog' | 'cat' | 'other';

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  Report: undefined;
};

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const PET_TYPE_KEYS: PetTypeKey[] = ['dog', 'cat', 'other'];

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, token, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const displayName = user?.name ?? 'Guest';
  const displayEmail = user?.email ?? '';

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petsFailed, setPetsFailed] = useState(false);
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState<PetTypeKey | ''>('');
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  // Refetch on focus (not just mount) so a pet added from the Booking
  // screen's inline form shows up here without needing a full app restart.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      petsApi
        .list(token)
        .then(setPets)
        .catch(() => setPetsFailed(true));
    }, [token]),
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t.profile.permissionRequiredTitle, t.profile.libraryPermissionMessage);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Alert.alert(t.profile.avatarUpdatedTitle, t.profile.avatarUpdatedMessage);
        // TODO: upload to the server once a media endpoint exists.
      }
    } catch (error) {
      console.error('Choosing an avatar photo failed:', error);
      Alert.alert(t.profile.pickImageErrorTitle, t.profile.pickImageErrorMessage);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t.profile.permissionRequiredTitle, t.profile.cameraPermissionMessage);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Alert.alert(t.profile.avatarUpdatedTitle, t.profile.avatarUpdatedMessage);
        // TODO: upload to the server once a media endpoint exists.
      }
    } catch (error) {
      console.error('Taking an avatar photo failed:', error);
      Alert.alert(t.profile.pickImageErrorTitle, t.profile.takePhotoErrorMessage);
    }
  };

  const selectAvatarMethod = () => {
    Alert.alert(
      t.profile.chooseAvatarTitle,
      t.profile.chooseAvatarMessage,
      [
        { text: t.profile.chooseFromLibrary, onPress: pickImage },
        { text: t.profile.takePhoto, onPress: takePhoto },
        { text: t.profile.cancel, style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t.profile.logoutConfirmTitle,
      t.profile.logoutConfirmMessage,
      [
        { text: t.profile.cancel, style: 'cancel' },
        {
          text: t.profile.logout,
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert(t.profile.editProfileTitle, t.profile.comingSoon);
  };

  const handleAddPet = () => {
    setIsAddingPet((prev) => !prev);
  };

  const handleSaveNewPet = async () => {
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

  const handleViewBookings = () => {
    navigation.navigate('Report');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={selectAvatarMethod}
              >
                <Text style={styles.editAvatarText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editButtonText}>{t.profile.editProfile}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.profile.myPets}</Text>
              <TouchableOpacity onPress={handleAddPet}>
                <Text style={styles.addButton}>
                  {isAddingPet ? t.profile.cancel : t.profile.addPet}
                </Text>
              </TouchableOpacity>
            </View>

            {pets === null ? (
              <ActivityIndicator color="#2C4A3E" />
            ) : petsFailed ? (
              <Text style={styles.helperText}>{t.booking.loadPetsFailed}</Text>
            ) : (
              <>
                {pets.length === 0 && !isAddingPet && (
                  <Text style={styles.helperText}>{t.booking.noPetsYet}</Text>
                )}

                {pets.map((pet) => (
                  <View key={pet.id} style={styles.petCard}>
                    <View style={styles.petIcon}>
                      <Text style={styles.petIconText}>{pet.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.petInfo}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petDetails}>
                        {[pet.breed, pet.species].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.petArrow}>
                      <Text style={styles.arrowText}>›</Text>
                    </TouchableOpacity>
                  </View>
                ))}

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
                      style={[styles.saveButton, isSavingPet && styles.saveButtonDisabled]}
                      onPress={handleSaveNewPet}
                      disabled={isSavingPet}
                    >
                      <Text style={styles.saveButtonText}>
                        {isSavingPet ? t.booking.submitting : t.booking.addPetConfirm}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.profile.quickActions}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleViewBookings}
            >
              <Text style={styles.menuText}>{t.profile.myBookings}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.favoritesTitle, t.profile.comingSoon)}
            >
              <Text style={styles.menuText}>{t.profile.myFavorites}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.couponsTitle, t.profile.comingSoon)}
            >
              <Text style={styles.menuText}>{t.profile.coupons}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.profile.settings}</Text>

            <View style={styles.menuItem}>
              <Text style={styles.menuText}>{t.profile.pushNotifications}</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E0E0E0', true: '#2C4A3E' }}
                thumbColor={'#F5EDD8'}
              />
            </View>

            <View style={styles.menuItem}>
              <Text style={styles.menuText}>{t.profile.emailNotifications}</Text>
              <Switch
                value={emailUpdates}
                onValueChange={setEmailUpdates}
                trackColor={{ false: '#E0E0E0', true: '#2C4A3E' }}
                thumbColor={'#F5EDD8'}
              />
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.privacyTitle, t.profile.comingSoon)}
            >
              <Text style={styles.menuText}>{t.profile.privacySettings}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={toggleLanguage}
            >
              <Text style={styles.menuText}>{t.profile.language}</Text>
              <Text style={styles.menuValue}>{t.profile.languageCurrent[language]}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.profile.helpSupport}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.contactSupportTitle, t.profile.contactSupportMessage)}
            >
              <Text style={styles.menuText}>{t.profile.contactSupport}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.helpCenterTitle, t.profile.comingSoon)}
            >
              <Text style={styles.menuText}>{t.profile.helpCenter}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.aboutUsTitle, 'Y&T Paws v1.0.0')}
            >
              <Text style={styles.menuText}>{t.profile.aboutUs}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>{t.profile.logout}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Y&T Paws v1.0.0</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 34,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  editAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5EDD8',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#2C4A3E',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#F5EDD8',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
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
  addButton: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addPetForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: '#F5EDD8',
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
    backgroundColor: '#F5EDD8',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 15,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  petTypeTextSelected: {
    color: '#F5EDD8',
  },
  saveButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EDD8',
  },
  petCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  petIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 13,
    color: '#666',
  },
  petArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#2C4A3E',
    fontWeight: '300',
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#FF5252',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
});

export default ProfileScreen;
