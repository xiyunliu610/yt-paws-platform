import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

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
        <ActivityIndicator size="large" color="#2C4A3E" />
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
            backgroundColor: '#2C4A3E',
          },
          headerTintColor: '#F5EDD8',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerBackButtonDisplayMode: 'minimal',
          cardStyle: {
            backgroundColor: '#F5EDD8',
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
            title: 'Create Account',
            headerShown: true,
          }}
        />

        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />

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
            title: 'Book a Service',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{
            title: 'My Reports',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="MyBookings"
          component={MyBookingsScreen}
          options={{
            title: 'My Bookings',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="BookingDetail"
          component={BookingDetailScreen}
          options={{
            title: 'Booking Details',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PetDetail"
          component={PetDetailScreen}
          options={{
            title: 'Pet Details',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            title: 'Payment',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PaymentHistory"
          component={PaymentHistoryScreen}
          options={{
            title: 'Payment History',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="ReportCompose"
          component={ReportComposeScreen}
          options={{
            title: 'Add Daily Report',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="StaffManagement"
          component={StaffManagementScreen}
          options={{
            title: 'Manage Staff',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            title: 'Notifications',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="PaymentVerification"
          component={PaymentVerificationScreen}
          options={{
            title: 'Payment Verification',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="ServiceManagement"
          component={ServiceManagementScreen}
          options={{
            title: 'Manage Services',
            headerShown: true,
          }}
        />

        <Stack.Screen
          name="BusinessSettings"
          component={BusinessSettingsScreen}
          options={{
            title: 'Business Settings',
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor="#F5EDD8" />
        <Navigation />
      </AuthProvider>
    </LanguageProvider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5EDD8',
  },
});

export default App;
