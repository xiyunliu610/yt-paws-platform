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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authApi, ApiError } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';

const RegisterBusinessScreen = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      Alert.alert(t.registerBusiness.errorTitle, t.registerBusiness.enterBusinessName);
      return false;
    }
    if (!formData.fullName.trim()) {
      Alert.alert(t.registerBusiness.errorTitle, t.register.enterFullName);
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert(t.registerBusiness.errorTitle, t.register.invalidEmail);
      return false;
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^(\+64|0)[2-9]\d{7,9}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        Alert.alert(t.registerBusiness.errorTitle, t.register.invalidPhone);
        return false;
      }
    }

    if (formData.password.length < 8) {
      Alert.alert(t.registerBusiness.errorTitle, t.register.passwordTooShort);
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      Alert.alert(t.registerBusiness.errorTitle, t.register.passwordRule);
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t.registerBusiness.errorTitle, t.register.passwordMismatch);
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
      await authApi.registerBusiness(
        formData.businessName,
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone || undefined,
      );

      Alert.alert(t.registerBusiness.successTitle, t.registerBusiness.successMessage, [
        {
          text: t.registerBusiness.goToLogin,
          onPress: () => navigation.navigate('Login' as never),
        },
      ]);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.registerBusiness.registerFailedMessage;
      Alert.alert(t.registerBusiness.registerFailedTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
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
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Y&T</Text>
          </View>
          <Text style={styles.title}>{t.registerBusiness.title}</Text>
          <Text style={styles.subtitle}>{t.registerBusiness.subtitle}</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.registerBusiness.businessName}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.registerBusiness.businessNamePlaceholder}
              placeholderTextColor="#999"
              value={formData.businessName}
              onChangeText={(value) => updateField('businessName', value)}
              editable={!isLoading}
            />
          </View>

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
            <Text style={styles.label}>{t.register.phone}</Text>
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
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? t.registerBusiness.submitting : t.registerBusiness.submit}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t.registerBusiness.haveAccount}</Text>
            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>{t.registerBusiness.signIn}</Text>
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 8,
    textAlign: 'center',
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
    shadowOffset: { width: 0, height: 2 },
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

export default RegisterBusinessScreen;
