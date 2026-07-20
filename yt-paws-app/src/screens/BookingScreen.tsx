import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';

type Service = {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  price: string | number;
  color?: string;
};

type RootStackParamList = {
  Home: undefined;
  Booking: { service?: Service } | undefined;
};

type BookingNavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;
type BookingRouteProp = RouteProp<RootStackParamList, 'Booking'>;

const BookingScreen = () => {
  const navigation = useNavigation<BookingNavigationProp>();
  const route = useRoute<BookingRouteProp>();
  
  // 从路由参数获取预选服务（如果有）
  const preSelectedService = route.params?.service;

  // 表单状态
  const [selectedService, setSelectedService] = useState(preSelectedService?.name || '');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [duration, setDuration] = useState('1');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 日期时间选择器显示状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 服务列表
  const services = [
    { id: 1, name: '寄养服务', price: 45, unit: '天' },
    { id: 2, name: '日间托管', price: 30, unit: '天' },
    { id: 3, name: '美容护理', price: 60, unit: '次' },
    { id: 4, name: '上门探访', price: 35, unit: '次' },
  ];

  // 宠物类型选项
  const petTypes = ['狗狗 🐕', '猫咪 🐈', '其他 🐾'];

  // 处理日期选择
  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      if (Platform.OS === 'ios') {
        // iOS 上可以同时关闭
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  // 处理时间选择
  const onTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'set' && time) {
      setSelectedTime(time);
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  // 格式化日期显示
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 格式化时间显示
  const formatTime = (time: Date) => {
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // 计算总价
  const calculateTotal = () => {
    const service = services.find(s => s.name === selectedService);
    if (!service) return 0;
    return service.price * parseInt(duration || '1');
  };

  // 验证表单
  const validateForm = () => {
    if (!selectedService) {
      Alert.alert('提示', '请选择服务类型');
      return false;
    }
    if (!petName.trim()) {
      Alert.alert('提示', '请输入宠物名字');
      return false;
    }
    if (!petType) {
      Alert.alert('提示', '请选择宠物类型');
      return false;
    }
    // 检查日期不能是过去的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected < today) {
      Alert.alert('提示', '预约日期不能早于今天');
      return false;
    }
    
    return true;
  };

  // 提交预约
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: 连接后端 API
      // const response = await bookingAPI({...});
      
      // 模拟提交延迟
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        '预约成功！🎉',
        `我们已收到您为 ${petName} 预约的 ${selectedService}，预约时间为 ${formatDate(selectedDate)} ${formatTime(selectedTime)}。我们会尽快联系您确认详情。`,
        [
          {
            text: '返回首页',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );

      console.log('预约信息:', {
        service: selectedService,
        petName,
        petType,
        date: formatDate(selectedDate),
        time: formatTime(selectedTime),
        duration,
        specialRequests,
        total: calculateTotal(),
      });

    } catch (error) {
      Alert.alert('错误', '预约失败，请稍后重试');
      console.error('预约错误:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>预约服务</Text>
          <Text style={styles.headerSubtitle}>为您的爱宠预约专业护理</Text>
        </View>

        <View style={styles.content}>
          {/* 服务选择 */}
          <View style={styles.section}>
            <Text style={styles.label}>选择服务 *</Text>
            <View style={styles.optionsGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.optionCard,
                    selectedService === service.name && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedService(service.name)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedService === service.name && styles.optionTextSelected,
                  ]}>
                    {service.name}
                  </Text>
                  <Text style={[
                    styles.optionPrice,
                    selectedService === service.name && styles.optionPriceSelected,
                  ]}>
                    NZD ${service.price}/{service.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 宠物信息 */}
          <View style={styles.section}>
            <Text style={styles.label}>宠物名字 *</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：Lucky"
              value={petName}
              onChangeText={setPetName}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>宠物类型 *</Text>
            <View style={styles.petTypeContainer}>
              {petTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.petTypeButton,
                    petType === type && styles.petTypeButtonSelected,
                  ]}
                  onPress={() => setPetType(type)}
                >
                  <Text style={[
                    styles.petTypeText,
                    petType === type && styles.petTypeTextSelected,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 日期选择 */}
          <View style={styles.section}>
            <Text style={styles.label}>预约日期 *</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(selectedDate)}
              </Text>
              <Text style={styles.dateIcon}>📅</Text>
            </TouchableOpacity>

            {/* 日期选择器 */}
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                  textColor="#2C4A3E"
                  themeVariant="light"
                />
                {/* iOS 上添加确认按钮 */}
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerButtonContainer}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>确认</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 时间选择 */}
          <View style={styles.section}>
            <Text style={styles.label}>预约时间 *</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatTime(selectedTime)}
              </Text>
              <Text style={styles.dateIcon}>⏰</Text>
            </TouchableOpacity>

            {/* 时间选择器 */}
            {showTimePicker && (
              <View>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  is24Hour={true}
                  textColor="#2C4A3E"
                  themeVariant="light"
                />
                {/* iOS 上添加确认按钮 */}
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerButtonContainer}>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.pickerButtonText}>确认</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 时长/次数 */}
          {(selectedService === '寄养服务' || selectedService === '日间托管') && (
            <View style={styles.section}>
              <Text style={styles.label}>预约天数</Text>
              <View style={styles.durationContainer}>
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const current = parseInt(duration);
                    if (current > 1) setDuration((current - 1).toString());
                  }}
                >
                  <Text style={styles.durationButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.durationInput}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.durationButton}
                  onPress={() => {
                    const current = parseInt(duration);
                    setDuration((current + 1).toString());
                  }}
                >
                  <Text style={styles.durationButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 特殊要求 */}
          <View style={styles.section}>
            <Text style={styles.label}>特殊要求（可选）</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="例如：对某些食物过敏、特殊护理需求等"
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* 价格预览 */}
          {selectedService && (
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>服务</Text>
                <Text style={styles.priceValue}>{selectedService}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>日期</Text>
                <Text style={styles.priceValue}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>时间</Text>
                <Text style={styles.priceValue}>{formatTime(selectedTime)}</Text>
              </View>
              {(selectedService === '寄养服务' || selectedService === '日间托管') && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>时长</Text>
                  <Text style={styles.priceValue}>{duration} 天</Text>
                </View>
              )}
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>预估总价</Text>
                <Text style={styles.priceTotalValue}>
                  NZD ${calculateTotal()}
                </Text>
              </View>
              <Text style={styles.priceNote}>
                * 最终价格可能根据实际情况调整
              </Text>
            </View>
          )}

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? '提交中...' : '确认预约'}
            </Text>
          </TouchableOpacity>

          {/* 提示信息 */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              提交后我们会尽快联系您确认预约详情。如有疑问，请致电 021 XXX XXXX
            </Text>
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
  header: {
    backgroundColor: '#2C4A3E',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#F5EDD8',
    opacity: 0.9,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  optionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#2C4A3E',
    backgroundColor: '#2C4A3E',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 6,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#F5EDD8',
  },
  optionPrice: {
    fontSize: 13,
    color: '#666',
  },
  optionPriceSelected: {
    color: '#F5EDD8',
    opacity: 0.9,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  petTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  petTypeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    fontSize: 16,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  petTypeTextSelected: {
    color: '#F5EDD8',
  },
  dateInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  dateIcon: {
    fontSize: 20,
  },
  pickerButtonContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  pickerButton: {
    backgroundColor: '#2C4A3E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  pickerButtonText: {
    color: '#F5EDD8',
    fontSize: 16,
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  durationButton: {
    width: 50,
    height: 50,
    backgroundColor: '#2C4A3E',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 24,
    color: '#F5EDD8',
    fontWeight: 'bold',
  },
  durationInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
    textAlign: 'center',
    minWidth: 80,
    paddingHorizontal: 20,
  },
  priceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2C4A3E',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  priceTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  priceTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  priceNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#2C4A3E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default BookingScreen;
