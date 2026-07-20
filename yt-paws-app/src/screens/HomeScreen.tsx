import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

type Service = {
  id: number;
  name: string;
  icon: string;
  description: string;
  price: string;
  color: string;
};

type RootStackParamList = {
  Booking: { service?: Service } | undefined;
  Profile: undefined;
  Report: undefined;
};

type HomeNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeNavigationProp>();
  const [userName] = useState('Lily'); // TODO: 从登录状态获取真实用户名

  // 服务列表
  const services: Service[] = [
    {
      id: 1,
      name: '寄养服务',
      icon: '🏠',
      description: '24小时专业照护',
      price: 'NZD 45/天起',
      color: '#2C4A3E',
    },
    {
      id: 2,
      name: '日间托管',
      icon: '☀️',
      description: '白天照看，晚上接回',
      price: 'NZD 30/天起',
      color: '#4A6B5E',
    },
    {
      id: 3,
      name: '美容护理',
      icon: '✨',
      description: '洗澡、修剪、造型',
      price: 'NZD 60起',
      color: '#6B8B7E',
    },
    {
      id: 4,
      name: '上门探访',
      icon: '🚗',
      description: '专人上门喂养遛狗',
      price: 'NZD 35/次起',
      color: '#8BAB9E',
    },
  ];

  // 即将到来的预约（模拟数据）
  const upcomingBookings = [
    {
      id: 1,
      petName: 'Lucky',
      service: '寄养服务',
      date: '2026-05-18',
      time: '09:00',
    },
  ];

  const navigateToBooking = (service?: Service) => {
    if (service) {
      navigation.navigate('Booking', { service });
      return;
    }

    navigation.navigate('Booking');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToReport = () => {
    navigation.navigate('Report');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C4A3E" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 头部欢迎区域 */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>您好，</Text>
              <Text style={styles.userName}>{userName} 👋</Text>
            </View>
            <TouchableOpacity 
              style={styles.avatarButton}
              onPress={navigateToProfile}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>L</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 主要内容区域 */}
        <View style={styles.content}>
          {/* 快捷预约按钮 */}
          <TouchableOpacity 
            style={styles.quickBookingCard}
            onPress={() => navigateToBooking()}
          >
            <View style={styles.quickBookingContent}>
              <View style={styles.quickBookingTextContainer}>
                <Text style={styles.quickBookingTitle}>快速预约</Text>
                <Text style={styles.quickBookingSubtitle}>
                  为您的爱宠预约服务
                </Text>
              </View>
              <View style={styles.quickBookingIcon}>
                <Text style={styles.quickBookingIconText}>🐾</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 即将到来的预约 */}
          {upcomingBookings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>即将到来</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>查看全部</Text>
                </TouchableOpacity>
              </View>

              {upcomingBookings.map((booking) => (
                <TouchableOpacity 
                  key={booking.id}
                  style={styles.bookingCard}
                >
                  <View style={styles.bookingIcon}>
                    <Text style={styles.bookingIconText}>🐕</Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingPetName}>{booking.petName}</Text>
                    <Text style={styles.bookingService}>{booking.service}</Text>
                    <Text style={styles.bookingDateTime}>
                      📅 {booking.date} · ⏰ {booking.time}
                    </Text>
                  </View>
                  <View style={styles.bookingArrow}>
                    <Text style={styles.arrowText}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 服务列表 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>我们的服务</Text>
            
            <View style={styles.servicesGrid}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => navigateToBooking(service)}
                  activeOpacity={0.7}
                >
                  <View 
                    style={[
                      styles.serviceIconContainer,
                      { backgroundColor: service.color }
                    ]}
                  >
                    <Text style={styles.serviceIcon}>{service.icon}</Text>
                  </View>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 为什么选择我们 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>为什么选择 Y&T Paws</Text>
            
            <View style={styles.featuresList}>
              {[
                { icon: '✅', title: '专业团队', desc: '持证宠物护理师' },
                { icon: '💚', title: '用心服务', desc: '像对待自己宠物一样' },
                { icon: '📍', title: 'Remuera 本地', desc: '接送方便快捷' },
                { icon: '📸', title: '实时更新', desc: '随时了解宠物状态' },
              ].map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 底部联系方式 */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>需要帮助？</Text>
            <Text style={styles.contactText}>
              📞 联系我们：021 XXX XXXX
            </Text>
            <Text style={styles.contactText}>
              📧 邮箱：hello@ytpaws.co.nz
            </Text>
            <Text style={styles.contactText}>
              📍 地址：Remuera, Auckland
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部导航栏 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {}}
        >
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navTextActive}>首页</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigateToBooking()}
        >
          <Text style={styles.navIcon}>📅</Text>
          <Text style={styles.navText}>预约</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={navigateToReport}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navText}>记录</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={navigateToProfile}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>我的</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#F5EDD8',
    opacity: 0.9,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginTop: 4,
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  quickBookingCard: {
    backgroundColor: '#2C4A3E',
    borderRadius: 20,
    padding: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  quickBookingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickBookingTextContainer: {
    flex: 1,
  },
  quickBookingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F5EDD8',
    marginBottom: 6,
  },
  quickBookingSubtitle: {
    fontSize: 14,
    color: '#F5EDD8',
    opacity: 0.8,
  },
  quickBookingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 237, 216, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickBookingIconText: {
    fontSize: 32,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingIconText: {
    fontSize: 24,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingPetName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  bookingService: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookingDateTime: {
    fontSize: 12,
    color: '#999',
  },
  bookingArrow: {
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C4A3E',
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#666',
  },
  contactSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  navIconActive: {
    fontSize: 24,
    marginBottom: 4,
  },
  navText: {
    fontSize: 12,
    color: '#999',
  },
  navTextActive: {
    fontSize: 12,
    color: '#2C4A3E',
    fontWeight: '600',
  },
});

export default HomeScreen;
