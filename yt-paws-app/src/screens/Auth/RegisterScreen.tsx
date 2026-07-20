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

const RegisterScreen = () => {
  const navigation = useNavigation();
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
    // 姓名验证
    if (!formData.fullName.trim()) {
      Alert.alert('提示', '请输入您的姓名');
      return false;
    }

    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return false;
    }

    // 手机号验证 (新西兰格式)
    const phoneRegex = /^(\+64|0)[2-9]\d{7,9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      Alert.alert('提示', '请输入有效的新西兰手机号码');
      return false;
    }

    // 密码强度验证
    if (formData.password.length < 8) {
      Alert.alert('提示', '密码至少需要8个字符');
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      Alert.alert('提示', '密码需包含大小写字母和数字');
      return false;
    }

    // 确认密码
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return false;
    }

    // 条款同意
    if (!agreedToTerms) {
      Alert.alert('提示', '请阅读并同意服务条款和隐私政策');
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
      // TODO: 连接后端 API
      // const response = await registerAPI(formData);
      
      // 模拟注册延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        '注册成功！',
        '欢迎加入 Y&T Paws 大家庭',
        [
          {
            text: '前往登录',
            onPress: () => navigation.navigate('Login' as never),
          },
        ]
      );
      
      console.log('注册数据:', formData);
      
    } catch (error) {
      Alert.alert('错误', '注册失败，请稍后重试');
      console.error('注册错误:', error);
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
        {/* 头部 */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🐾</Text>
          </View>
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>加入 Y&T Paws 宠物护理社区</Text>
        </View>

        {/* 注册表单 */}
        <View style={styles.formContainer}>
          {/* 姓名 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>姓名 *</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入您的姓名"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(value) => updateField('fullName', value)}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          {/* 邮箱 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>邮箱地址 *</Text>
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

          {/* 手机号 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>手机号码 *</Text>
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
            <Text style={styles.hint}>新西兰手机号码</Text>
          </View>

          {/* 密码 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>密码 *</Text>
            <TextInput
              style={styles.input}
              placeholder="至少8个字符"
              placeholderTextColor="#999"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            <Text style={styles.hint}>需包含大小写字母和数字</Text>
          </View>

          {/* 确认密码 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>确认密码 *</Text>
            <TextInput
              style={styles.input}
              placeholder="再次输入密码"
              placeholderTextColor="#999"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {/* 服务条款 */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              我已阅读并同意{' '}
              <Text style={styles.termsLink}>服务条款</Text>
              {' '}和{' '}
              <Text style={styles.termsLink}>隐私政策</Text>
            </Text>
          </TouchableOpacity>

          {/* 注册按钮 */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? '注册中...' : '注册'}
            </Text>
          </TouchableOpacity>

          {/* 分隔线 */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>或使用社交账号注册</Text>
            <View style={styles.divider} />
          </View>

          {/* 社交注册按钮 */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>🍎 Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Text style={styles.socialButtonText}>🔍 Google</Text>
            </TouchableOpacity>
          </View>

          {/* 登录链接 */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>已有账户？</Text>
            <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
              <Text style={styles.loginLink}>立即登录</Text>
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
    backgroundColor: '#F5EDD8', // 奶油色背景
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
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
    fontSize: 36,
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
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#2C4A3E',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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