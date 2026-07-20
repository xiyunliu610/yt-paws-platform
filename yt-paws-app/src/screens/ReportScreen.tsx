import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ReportScreen = () => {
  const navigation = useNavigation();
  
  // 选择的时间范围
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // 统计数据（模拟）
  const stats = {
    totalBookings: 12,
    totalSpent: 540,
    favoritService: '寄养服务',
    activePets: 2,
  };

  // 预约历史（模拟数据）
  const bookingHistory = [
    {
      id: 1,
      date: '2026-05-10',
      service: '寄养服务',
      petName: 'Lucky',
      status: 'completed',
      amount: 135,
    },
    {
      id: 2,
      date: '2026-05-05',
      service: '美容护理',
      petName: 'Mimi',
      status: 'completed',
      amount: 60,
    },
    {
      id: 3,
      date: '2026-04-28',
      service: '日间托管',
      petName: 'Lucky',
      status: 'completed',
      amount: 90,
    },
    {
      id: 4,
      date: '2026-04-20',
      service: '上门探访',
      petName: 'Mimi',
      status: 'completed',
      amount: 35,
    },
    {
      id: 5,
      date: '2026-05-18',
      service: '寄养服务',
      petName: 'Lucky',
      status: 'upcoming',
      amount: 135,
    },
  ];

  // 月度数据（模拟简单柱状图数据）
  const monthlyData = [
    { month: '1月', amount: 120 },
    { month: '2月', amount: 180 },
    { month: '3月', amount: 90 },
    { month: '4月', amount: 220 },
    { month: '5月', amount: 540 },
  ];

  const getStatusText = (status: string) => {
    return status === 'completed' ? '已完成' : '即将到来';
  };

  const getStatusColor = (status: string) => {
    return status === 'completed' ? '#4CAF50' : '#FF9800';
  };

  const maxAmount = Math.max(...monthlyData.map(d => d.amount));

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 头部统计卡片 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>我的记录</Text>
          <Text style={styles.headerSubtitle}>查看预约历史和统计数据</Text>
        </View>

        <View style={styles.content}>
          {/* 时间范围选择 */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive,
                ]}>
                  {period === 'week' ? '本周' : period === 'month' ? '本月' : '本年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 统计卡片 */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>总预约数</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${stats.totalSpent}</Text>
              <Text style={styles.statLabel}>总消费</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.activePets}</Text>
              <Text style={styles.statLabel}>活跃宠物</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statLabel}>最爱服务</Text>
              <Text style={styles.statService}>{stats.favoritService}</Text>
            </View>
          </View>

          {/* 月度消费图表 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>月度消费趋势</Text>
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {monthlyData.map((data, index) => (
                  <View key={index} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${(data.amount / maxAmount) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{data.month}</Text>
                    <Text style={styles.barAmount}>${data.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 预约历史 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>预约历史</Text>
              <TouchableOpacity>
                <Text style={styles.filterText}>筛选</Text>
              </TouchableOpacity>
            </View>

            {bookingHistory.map((booking) => (
              <TouchableOpacity 
                key={booking.id}
                style={styles.bookingCard}
              >
                <View style={styles.bookingLeft}>
                  <View style={styles.bookingDateContainer}>
                    <Text style={styles.bookingMonth}>
                      {booking.date.split('-')[1]}月
                    </Text>
                    <Text style={styles.bookingDay}>
                      {booking.date.split('-')[2]}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingMiddle}>
                  <Text style={styles.bookingService}>{booking.service}</Text>
                  <Text style={styles.bookingPet}>🐾 {booking.petName}</Text>
                  <View style={styles.bookingStatusContainer}>
                    <View 
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(booking.status) }
                      ]}
                    />
                    <Text style={[
                      styles.bookingStatus,
                      { color: getStatusColor(booking.status) }
                    ]}>
                      {getStatusText(booking.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingRight}>
                  <Text style={styles.bookingAmount}>
                    ${booking.amount}
                  </Text>
                  <Text style={styles.bookingArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 服务分类统计 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服务使用统计</Text>
            <View style={styles.serviceStats}>
              {[
                { name: '寄养服务', count: 5, color: '#2C4A3E' },
                { name: '日间托管', count: 3, color: '#4A6B5E' },
                { name: '美容护理', count: 3, color: '#6B8B7E' },
                { name: '上门探访', count: 1, color: '#8BAB9E' },
              ].map((service, index) => (
                <View key={index} style={styles.serviceStatItem}>
                  <View style={styles.serviceStatLeft}>
                    <View 
                      style={[
                        styles.serviceColorDot,
                        { backgroundColor: service.color }
                      ]}
                    />
                    <Text style={styles.serviceStatName}>{service.name}</Text>
                  </View>
                  <View style={styles.serviceStatRight}>
                    <View 
                      style={[
                        styles.serviceStatBar,
                        { width: `${(service.count / 12) * 100}%` },
                        { backgroundColor: service.color }
                      ]}
                    />
                    <Text style={styles.serviceStatCount}>{service.count}次</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 导出报告按钮 */}
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => alert('导出功能即将上线')}
          >
            <Text style={styles.exportButtonIcon}>📊</Text>
            <Text style={styles.exportButtonText}>导出完整报告</Text>
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
    paddingBottom: 100,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#2C4A3E',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#F5EDD8',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: '1%',
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
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 6,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statService: {
    fontSize: 12,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
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
    marginBottom: 16,
  },
  filterText: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '80%',
    height: 140,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    backgroundColor: '#2C4A3E',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  barAmount: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  bookingCard: {
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
  bookingLeft: {
    marginRight: 16,
  },
  bookingDateContainer: {
    width: 50,
    alignItems: 'center',
  },
  bookingMonth: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  bookingDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
  },
  bookingMiddle: {
    flex: 1,
  },
  bookingService: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  bookingPet: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  bookingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  bookingStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingRight: {
    alignItems: 'flex-end',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  bookingArrow: {
    fontSize: 20,
    color: '#999',
  },
  serviceStats: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceStatItem: {
    marginBottom: 20,
  },
  serviceStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  serviceStatName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  serviceStatRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceStatBar: {
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  serviceStatCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    minWidth: 40,
  },
  exportButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#2C4A3E',
  },
  exportButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A3E',
  },
});

export default ReportScreen;