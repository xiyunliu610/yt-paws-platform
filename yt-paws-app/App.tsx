import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/i18n/LanguageContext';

// Screens
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';

const Stack = createStackNavigator();

const Navigation = () => {
  const { token, isRestoring } = useAuth();

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

  return (
    <NavigationContainer>
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

        <Stack.Screen
          name="Home"
          component={HomeScreen}
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
