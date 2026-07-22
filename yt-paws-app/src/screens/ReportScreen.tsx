import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

type ServiceKey = 'boarding' | 'dayCare' | 'grooming' | 'houseVisit';
type BookingStatus = 'completed' | 'upcoming';
type Period = 'week' | 'month' | 'year';

const SERVICE_COLORS: Record<ServiceKey, string> = {
  boarding: '#2C4A3E',
  dayCare: '#4A6B5E',
  grooming: '#6B8B7E',
  houseVisit: '#8BAB9E',
};

const bookingHistory: {
  id: number;
  date: string;
  serviceKey: ServiceKey;
  petName: string;
  status: BookingStatus;
  amount: number;
}[] = [
  { id: 1, date: '2026-05-10', serviceKey: 'boarding', petName: 'Lucky', status: 'completed', amount: 135 },
  { id: 2, date: '2026-05-05', serviceKey: 'grooming', petName: 'Mimi', status: 'completed', amount: 60 },
  { id: 3, date: '2026-04-28', serviceKey: 'dayCare', petName: 'Lucky', status: 'completed', amount: 90 },
  { id: 4, date: '2026-04-20', serviceKey: 'houseVisit', petName: 'Mimi', status: 'completed', amount: 35 },
  { id: 5, date: '2026-05-18', serviceKey: 'boarding', petName: 'Lucky', status: 'upcoming', amount: 135 },
];

const serviceStats: { key: ServiceKey; count: number }[] = [
  { key: 'boarding', count: 5 },
  { key: 'dayCare', count: 3 },
  { key: 'grooming', count: 3 },
  { key: 'houseVisit', count: 1 },
];

const monthlyData = [
  { month: 1, amount: 120 },
  { month: 2, amount: 180 },
  { month: 3, amount: 90 },
  { month: 4, amount: 220 },
  { month: 5, amount: 540 },
];

const stats = {
  totalBookings: 12,
  totalSpent: 540,
  favoriteServiceKey: 'boarding' as ServiceKey,
  activePets: 2,
};

const ReportScreen = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');

  const periodLabels: Record<Period, string> = {
    week: t.report.periodWeek,
    month: t.report.periodMonth,
    year: t.report.periodYear,
  };

  const statusLabels: Record<BookingStatus, string> = {
    completed: t.report.statusCompleted,
    upcoming: t.report.statusUpcoming,
  };

  const getStatusColor = (status: BookingStatus) => {
    return status === 'completed' ? '#4CAF50' : '#FF9800';
  };

  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.report.headerTitle}</Text>
          <Text style={styles.headerSubtitle}>{t.report.headerSubtitle}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.periodSelector}>
            {(['week', 'month', 'year'] as Period[]).map((period) => (
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
                  {periodLabels[period]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>{t.report.totalBookings}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>${stats.totalSpent}</Text>
              <Text style={styles.statLabel}>{t.report.totalSpent}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.activePets}</Text>
              <Text style={styles.statLabel}>{t.report.activePets}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{t.report.favoriteService}</Text>
              <Text style={styles.statService}>{t.home.services[stats.favoriteServiceKey].name}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.report.monthlyTrend}</Text>
            <View style={styles.chartCard}>
              <View style={styles.chart}>
                {monthlyData.map((data) => (
                  <View key={data.month} style={styles.barContainer}>
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
                    <Text style={styles.barLabel}>{t.report.months[data.month - 1]}</Text>
                    <Text style={styles.barAmount}>${data.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.report.bookingHistory}</Text>
              <TouchableOpacity>
                <Text style={styles.filterText}>{t.report.filter}</Text>
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
                      {t.report.months[Number(booking.date.split('-')[1]) - 1]}
                    </Text>
                    <Text style={styles.bookingDay}>
                      {booking.date.split('-')[2]}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingMiddle}>
                  <Text style={styles.bookingService}>{t.home.services[booking.serviceKey].name}</Text>
                  <Text style={styles.bookingPet}>{booking.petName}</Text>
                  <View style={styles.bookingStatusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(booking.status) },
                      ]}
                    />
                    <Text style={[
                      styles.bookingStatus,
                      { color: getStatusColor(booking.status) },
                    ]}>
                      {statusLabels[booking.status]}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.report.serviceUsage}</Text>
            <View style={styles.serviceStats}>
              {serviceStats.map((service) => (
                <View key={service.key} style={styles.serviceStatItem}>
                  <View style={styles.serviceStatLeft}>
                    <View
                      style={[
                        styles.serviceColorDot,
                        { backgroundColor: SERVICE_COLORS[service.key] },
                      ]}
                    />
                    <Text style={styles.serviceStatName}>{t.home.services[service.key].name}</Text>
                  </View>
                  <View style={styles.serviceStatRight}>
                    <View
                      style={[
                        styles.serviceStatBar,
                        { width: `${(service.count / 12) * 100}%` },
                        { backgroundColor: SERVICE_COLORS[service.key] },
                      ]}
                    />
                    <Text style={styles.serviceStatCount}>{service.count} {t.report.timesUnit}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => Alert.alert(t.report.exportComingSoonTitle, t.report.exportComingSoonMessage)}
          >
            <Text style={styles.exportButtonText}>{t.report.exportReport}</Text>
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
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C4A3E',
  },
});

export default ReportScreen;
