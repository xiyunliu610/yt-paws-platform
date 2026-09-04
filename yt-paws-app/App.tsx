import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { registerForPushNotificationsAsync } from './src/notifications/pushToken';

// Screens
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import BookingDetailScreen from './src/screens/BookingDetailScreen';
import PetDetailScreen from './src/screens/PetDetailScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import ReportComposeScreen from './src/screens/ReportComposeScreen';
import StaffManagementScreen from './src/screens/StaffManagementScreen';
import BusinessHomeScreen from './src/screens/BusinessHomeScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PaymentVerificationScreen from './src/screens/PaymentVerificationScreen';
import ServiceManagementScreen from './src/screens/ServiceManagementScreen';
import BusinessSettingsScreen from './src/screens/BusinessSettingsScreen';
import ResetPasswordScreen from './src/screens/Auth/ResetPasswordScreen';
import RequiredPasswordChangeScreen from './src/screens/Auth/RequiredPasswordChangeScreen';
import HelpCenterScreen from './src/screens/HelpCenterScreen';
import SessionsScreen from './src/screens/SessionsScreen';

const Stack = createStackNavigator();

// Business/staff/owner accounts land on a "what needs attention today"
// dashboard instead of the customer-facing services/booking home screen.
const HomeRouter = () => {
  const { user } = useAuth();
  const isBusinessRole = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'staff';
  return isBusinessRole ? <BusinessHomeScreen /> : <HomeScreen />;
};

const Navigation = () => {
  const { token, user, isRestoring } = useAuth();
  const { t } = useLanguage();

  // Best-effort push registration once a session exists. No-ops quietly if
  // permission is denied or (as in Expo Go on SDK 53+) remote push simply
  // isn't available in the current runtime — see src/notifications/pushToken.ts.
  useEffect(() => {
    if (token) {
      registerForPushNotificationsAsync(token);
    }
  }, [token]);

  // Wait for the stored session to be restored before mounting the
  // navigator, so the initial route can be chosen correctly on cold start
  // instead of always forcing the user back to Login.
  if (isRestoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1F4A38" />
      </View>
    );
  }

  const linking = {
    prefixes: ['ytpaws://'],
    config: { screens: { ResetPassword: 'reset-password' } },
  };

  if (token && user?.mustChangePassword) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="RequiredPasswordChange" component={RequiredPasswordChangeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={token ? 'Home' : 'Login'}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
            shadowColor: 'transparent',
            elevation: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#F0EDE3',
          },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 17,
            color: '#1A1A1A',
          },
          headerBackButtonDisplayMode: 'minimal',
          cardStyle: {
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            title: t.register.title,
            headerShown: true,
          }}
        />

        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: t.resetPassword.title }} />

        <Stack.Screen
          name="Home"
          component={HomeRouter}
          options={{
            title: 'Y&T Paws',
            headerLeft: () => null,
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{
            title: t.booking.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: t.home.navProfile,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{
            title: t.report.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
          options={{
            title: t.myBookings.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="BookingDetail"
          component={BookingDetailScreen}
          options={{
            title: t.myBookings.detailTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PetDetail"
          component={PetDetailScreen}
          options={{
            title: t.petDetail.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            title: t.payment.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PaymentHistory"
          component={PaymentHistoryScreen}
          options={{
            title: t.paymentHistory.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="ReportCompose"
          component={ReportComposeScreen}
          options={{
            title: t.reportCompose.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="StaffManagement"
          component={StaffManagementScreen}
          options={{
            title: t.staffManagement.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: t.notifications.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PaymentVerification"
          component={PaymentVerificationScreen}
          options={{
            title: t.paymentVerification.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="ServiceManagement"
          component={ServiceManagementScreen}
          options={{
            title: t.serviceManagement.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="BusinessSettings"
          component={BusinessSettingsScreen}
          options={{
            title: t.businessSettings.headerTitle,
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="HelpCenter"
          component={HelpCenterScreen}
          options={{
            title: t.profile.helpCenterTitle,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="Sessions"
          component={SessionsScreen}
          options={{ title: t.profile.sessions, headerShown: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Navigation />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
