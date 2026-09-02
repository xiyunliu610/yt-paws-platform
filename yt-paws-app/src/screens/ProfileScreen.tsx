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
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ApiError, authApi, petsApi, Pet, PUBLIC_WEB_URL } from '../api/client';
import { registerForPushNotificationsAsync, unregisterPushNotifications } from '../notifications/pushToken';
import { authenticatedMediaSource } from '../api/mediaSource';

type PetTypeKey = 'dog' | 'cat' | 'other';

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  Report: undefined;
  MyBookings: undefined;
  PaymentHistory: undefined;
  PaymentVerification: undefined;
  StaffManagement: undefined;
  ServiceManagement: undefined;
  BusinessSettings: undefined;
  HelpCenter: undefined;
  Sessions: undefined;
  PetDetail: { pet: Pet };
};

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const PET_TYPE_KEYS: PetTypeKey[] = ['dog', 'cat', 'other'];

const MenuIcon = ({ name, danger }: { name: keyof typeof Feather.glyphMap; danger?: boolean }) => (
  <View style={[menuIconStyles.chip, danger && menuIconStyles.chipDanger]}>
    <Feather name={name} size={15} color={danger ? '#A15C43' : '#1F4A38'} />
  </View>
);

const menuIconStyles = StyleSheet.create({
  chip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F5EFE0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chipDanger: {
    backgroundColor: '#F0E4DC',
  },
});

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { user, token, logout, changePassword } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const displayName = user?.name ?? 'Guest';
  const displayEmail = user?.email ?? '';

  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petsFailed, setPetsFailed] = useState(false);
  const [isAddingPet, setIsAddingPet] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState<PetTypeKey | ''>('');
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
    navigation.navigate('MyBookings');
  };

  const handleViewPaymentHistory = () => {
    navigation.navigate('PaymentHistory');
  };

  const handleManageStaff = () => {
    navigation.navigate('StaffManagement');
  };

  const handleVerifyPayments = () => {
    navigation.navigate('PaymentVerification');
  };

  const handleManageServices = () => {
    navigation.navigate('ServiceManagement');
  };

  const handleBusinessSettings = () => {
    navigation.navigate('BusinessSettings');
  };

  const isManager = user?.role === 'owner' || user?.role === 'admin';

  const handleToggleNotifications = async (value: boolean) => {
    setNotifications(value);
    if (!token) return;
    if (value) {
      const granted = await registerForPushNotificationsAsync(token);
      if (!granted) {
        // Permission denied, no device token, or (as in Expo Go on SDK 53+)
        // remote push simply isn't available in this runtime — the toggle
        // reflects intent either way, in-app notifications work regardless.
        setNotifications(false);
      }
    } else {
      await unregisterPushNotifications(token);
    }
  };

  const toggleLanguage = () => {
    const next = language === 'en' ? 'zh' : 'en';
    setLanguage(next);
    if (token) void authApi.updateLocale(token, next).catch(() => undefined);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert(t.profile.passwordErrorTitle, t.profile.passwordFieldsRequired);
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
      Alert.alert(t.profile.passwordChangedTitle, t.profile.passwordChangedMessage);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.profile.passwordChangeFailed;
      Alert.alert(t.profile.passwordErrorTitle, message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const performDeleteAccount = async () => {
    if (!token || !deletePassword) return;
    setIsDeleting(true);
    try {
      await authApi.deleteAccount(token, deletePassword);
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.profile.deleteAccountFailed;
      Alert.alert(t.profile.deleteAccountErrorTitle, message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert(t.profile.deleteAccountErrorTitle, t.profile.deletePasswordRequired);
      return;
    }
    Alert.alert(t.profile.deleteAccountConfirmTitle, t.profile.deleteAccountConfirmMessage, [
      { text: t.profile.cancel, style: 'cancel' },
      {
        text: t.profile.continueDelete,
        style: 'destructive',
        onPress: () =>
          Alert.alert(t.profile.deleteAccountFinalTitle, t.profile.deleteAccountFinalMessage, [
            { text: t.profile.cancel, style: 'cancel' },
            { text: t.profile.deleteAccount, style: 'destructive', onPress: performDeleteAccount },
          ]),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userEmail}>{displayEmail}</Text>
            </View>
          </View>

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
              <ActivityIndicator color="#1F4A38" />
            ) : petsFailed ? (
              <Text style={styles.helperText}>{t.booking.loadPetsFailed}</Text>
            ) : (
              <>
                {pets.length === 0 && !isAddingPet && (
                  <Text style={styles.helperText}>{t.booking.noPetsYet}</Text>
                )}

                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={styles.petCard}
                    onPress={() => navigation.navigate('PetDetail', { pet })}
                  >
                    {pet.photoUrl ? (
                      <Image source={authenticatedMediaSource(pet.photoUrl, token)} style={styles.petPhoto} />
                    ) : (
                      <View style={styles.petIcon}>
                        <Text style={styles.petIconText}>{pet.name.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={styles.petInfo}>
                      <Text style={styles.petName}>{pet.name}</Text>
                      <Text style={styles.petDetails}>
                        {[pet.breed, pet.species].filter(Boolean).join(' · ') || '—'}
                      </Text>
                    </View>
                    <View style={styles.petArrow}>
                      <Text style={styles.arrowText}>›</Text>
                    </View>
                  </TouchableOpacity>
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
              <MenuIcon name="calendar" />
              <Text style={styles.menuText}>{t.profile.myBookings}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleViewPaymentHistory}
            >
              <MenuIcon name="credit-card" />
              <Text style={styles.menuText}>{t.profile.paymentHistory}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {isManager && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleManageStaff}
              >
                <MenuIcon name="users" />
                <Text style={styles.menuText}>{t.profile.manageStaff}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}

            {isManager && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleVerifyPayments}
              >
                <MenuIcon name="check-square" />
                <Text style={styles.menuText}>{t.profile.verifyPayments}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}

            {isManager && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleManageServices}
              >
                <MenuIcon name="list" />
                <Text style={styles.menuText}>{t.profile.manageServices}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}

            {isManager && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBusinessSettings}
              >
                <MenuIcon name="sliders" />
                <Text style={styles.menuText}>{t.profile.businessSettings}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}

          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.profile.settings}</Text>

            <View style={styles.menuItem}>
              <MenuIcon name="bell" />
              <Text style={styles.menuText}>{t.profile.pushNotifications}</Text>
              <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#1F4A38' }}
                thumbColor={'#F5EFE0'}
              />
            </View>

            <View style={styles.menuItem}>
              <MenuIcon name="mail" />
              <Text style={styles.menuText}>{t.profile.emailNotifications}</Text>
              <Switch
                value={emailUpdates}
                onValueChange={setEmailUpdates}
                trackColor={{ false: '#E0E0E0', true: '#1F4A38' }}
                thumbColor={'#F5EFE0'}
              />
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/privacy`)}
            >
              <MenuIcon name="lock" />
              <Text style={styles.menuText}>{t.profile.privacySettings}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/terms`)}>
              <MenuIcon name="file-text" />
              <Text style={styles.menuText}>{language === 'zh' ? '服务条款' : 'Terms of Service'}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/account-deletion`)}>
              <MenuIcon name="shield" />
              <Text style={styles.menuText}>{language === 'zh' ? '账号删除与数据保留' : 'Account deletion & retention'}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={toggleLanguage}
            >
              <MenuIcon name="globe" />
              <Text style={styles.menuText}>{t.profile.language}</Text>
              <Text style={styles.menuValue}>{t.profile.languageCurrent[language]}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordForm((value) => !value)}>
              <MenuIcon name="key" />
              <Text style={styles.menuText}>{t.profile.changePassword}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Sessions')}>
              <MenuIcon name="smartphone" />
              <Text style={styles.menuText}>{t.profile.sessions}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {showPasswordForm && (
              <View style={styles.securityForm}>
                <TextInput
                  style={styles.input}
                  placeholder={t.profile.currentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder={t.profile.newPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword} disabled={isChangingPassword}>
                  <Text style={styles.saveButtonText}>
                    {isChangingPassword ? t.profile.changingPassword : t.profile.changePassword}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowDeleteForm((value) => !value)}>
              <MenuIcon name="trash-2" danger />
              <Text style={styles.deleteMenuText}>{t.profile.deleteAccount}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {showDeleteForm && (
              <View style={styles.securityForm}>
                <Text style={styles.deleteWarning}>{t.profile.deleteAccountWarning}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.profile.confirmPassword}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                />
                <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount} disabled={isDeleting}>
                  <Text style={styles.deleteAccountButtonText}>
                    {isDeleting ? t.profile.deletingAccount : t.profile.deleteAccount}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.profile.helpSupport}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/support`)}
            >
              <MenuIcon name="message-circle" />
              <Text style={styles.menuText}>{t.profile.contactSupport}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('HelpCenter')}
            >
              <MenuIcon name="help-circle" />
              <Text style={styles.menuText}>{t.profile.helpCenter}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert(t.profile.aboutUsTitle, 'Y&T Paws v1.0.0')}
            >
              <MenuIcon name="info" />
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#F7F5EF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1F4A38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5EFE0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 34,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#1F4A38',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  editAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5EFE0',
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    backgroundColor: '#1F4A38',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#F5EFE0',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  addButton: {
    fontSize: 14,
    color: '#1F4A38',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  addPetForm: {
    backgroundColor: '#F7F5EF',
    borderRadius: 14,
    padding: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  petTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  petTypeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  petTypeButtonSelected: {
    backgroundColor: '#1F4A38',
  },
  petTypeText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  petTypeTextSelected: {
    color: '#F5EFE0',
  },
  saveButton: {
    backgroundColor: '#1F4A38',
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5EFE0',
  },
  petCard: {
    backgroundColor: '#F7F5EF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  petIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#4A6B5E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  petPhoto: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginRight: 12,
  },
  petIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5EFE0',
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  petDetails: {
    fontSize: 12,
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
    color: '#1A1A1A',
    opacity: 0.4,
    fontWeight: '300',
  },
  menuItem: {
    backgroundColor: '#F7F5EF',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 13,
    color: '#999',
    marginRight: 8,
  },
  menuArrow: {
    fontSize: 20,
    color: '#1A1A1A',
    opacity: 0.35,
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
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
  securityForm: {
    backgroundColor: '#F7F5EF',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  deleteMenuText: {
    fontSize: 16,
    color: '#A15C43',
  },
  deleteWarning: {
    color: '#A15C43',
    fontSize: 13,
    lineHeight: 18,
  },
  deleteAccountButton: {
    backgroundColor: '#A15C43',
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
