import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';

// 导入页面
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';

// 创建导航器
const Stack = createStackNavigator();

const App = () => {
  return (
    <>
      {/* 状态栏设置 */}
      <StatusBar
        style="dark"
        backgroundColor="#F5EDD8"
      />
      
      {/* 导航容器 */}
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
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
          {/* 登录页面 */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
            }}
          />
          
          {/* 注册页面 */}
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: '注册账户',
              headerShown: true,
            }}
          />
          
          {/* 主页面 */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Y&T Paws',
              headerLeft: () => null,
              headerShown: false,
            }}
          />
          
          {/* 预约页面 */}
          <Stack.Screen
            name="Booking"
            component={BookingScreen}
            options={{
              title: '预约服务',
              headerShown: true,
            }}
          />
          
          {/* 个人中心页面 */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: '个人中心',
              headerShown: true,
            }}
          />
          
          {/* 记录报告页面 */}
          <Stack.Screen
            name="Report"
            component={ReportScreen}
            options={{
              title: '我的记录',
              headerShown: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
