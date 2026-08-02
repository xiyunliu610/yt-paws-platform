import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth, ApiError } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { PUBLIC_WEB_URL } from '../../api/client';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert(t.register.errorTitle, t.register.enterFullName);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert(t.register.errorTitle, t.register.invalidEmail);
      return false;
    }

    const phoneRegex = /^(\+64|0)[2-9]\d{7,9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      Alert.alert(t.register.errorTitle, t.register.invalidPhone);
      return false;
    }

    if (formData.password.length < 8) {
      Alert.alert(t.register.errorTitle, t.register.passwordTooShort);
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      Alert.alert(t.register.errorTitle, t.register.passwordRule);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t.register.errorTitle, t.register.passwordMismatch);
      return false;
    }

    if (!agreedToTerms) {
      Alert.alert(t.register.errorTitle, t.register.agreeToTerms);
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(formData.email, formData.password, formData.fullName, formData.phone);

      Alert.alert(t.register.successTitle, t.register.successMessage, [
        {
          text: t.register.goToLogin,
          onPress: () => navigation.navigate('Login' as never),
        },
      ]);
    } catch (error) {
      console.error('Registration failed:', error);
      const message = error instanceof ApiError ? error.message : t.register.registerFailedMessage;
      Alert.alert(t.register.registerFailedTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage}>
            <Text style={styles.languageToggleText}>{language === 'en' ? '中文' : 'EN'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Y&T</Text>
          </View>
          <Text style={styles.title}>{t.register.title}</Text>
          <Text style={styles.subtitle}>{t.register.subtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.register.fullName} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t.register.fullNamePlaceholder}
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.register.email} *</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.register.phone} *</Text>
            <TextInput
              style={styles.input}
              placeholder="021 123 4567"
              placeholderTextColor="#999"
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!isLoading}
            />
            <Text style={styles.hint}>{t.register.phoneHint}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.register.password} *</Text>
            <TextInput
              style={styles.input}
              placeholder="********"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            <Text style={styles.hint}>{t.register.passwordHint}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.register.confirmPassword} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t.register.confirmPasswordPlaceholder}
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]} />
            <Text style={styles.termsText}>
              {t.register.terms}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/terms`)}>{t.register.termsLink}</Text>
              {t.register.and}
              <Text style={styles.termsLink} onPress={() => Linking.openURL(`${PUBLIC_WEB_URL}/privacy`)}>{t.register.privacyLink}</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? t.register.signingUp : t.register.signUp}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t.register.orSocial}</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>{t.register.apple}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>{t.register.google}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t.register.haveAccount}</Text>
            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>{t.register.signIn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDD8',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  languageToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C4A3E',
  },
  languageToggleText: {
    color: '#2C4A3E',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginLeft: 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2C4A3E',
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#2C4A3E',
  },
  termsText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  termsLink: {
    color: '#2C4A3E',
    fontWeight: '600',
  },
  registerButton: {
    height: 54,
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: 'white',
  },
  socialButtonText: {
    fontSize: 16,
    color: '#333',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
