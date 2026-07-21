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
import { useAuth, ApiError } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t.login.errorTitle, t.login.enterEmail);
      return;
    }

    if (!password.trim()) {
      Alert.alert(t.login.errorTitle, t.login.enterPassword);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert(t.login.errorTitle, t.login.invalidEmail);
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigation.navigate('Home' as never);
    } catch (error) {
      console.error('Login failed:', error);
      const message = error instanceof ApiError ? error.message : t.login.loginFailedMessage;
      Alert.alert(t.login.loginFailedTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  const handleForgotPassword = () => {
    Alert.alert(t.login.forgotPasswordTitle, t.login.forgotPasswordMessage);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity style={styles.languageToggle} onPress={toggleLanguage}>
        <Text style={styles.languageToggleText}>{language === 'en' ? '中文' : 'EN'}</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Y&T</Text>
          </View>
          <Text style={styles.brandName}>{t.common.brandName}</Text>
          <Text style={styles.tagline}>{t.login.tagline}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>{t.login.welcomeBack}</Text>
          <Text style={styles.subtitle}>{t.login.subtitle}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.login.email}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.login.emailPlaceholder}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t.login.password}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.login.passwordPlaceholder}
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!isLoading}
            />
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} />
              <Text style={styles.rememberMeText}>{t.login.rememberMe}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPassword}>{t.login.forgotPassword}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? t.login.signingIn : t.login.signIn}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{t.login.or}</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>{t.login.apple}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>{t.login.google}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t.login.noAccount}</Text>
            <TouchableOpacity onPress={navigateToRegister} disabled={isLoading}>
              <Text style={styles.registerLink}>{t.login.signUp}</Text>
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
  languageToggle: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 1,
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2C4A3E',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#2C4A3E',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#666',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  loginButton: {
    height: 54,
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
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
    marginHorizontal: 16,
    fontSize: 14,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  registerLink: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
