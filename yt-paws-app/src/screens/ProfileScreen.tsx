import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  Report: undefined;
};

type ProfileNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const { logout } = useAuth();

  // 用户信息（模拟数据）
  const [userInfo] = useState({
    name: 'Lily',
    email: 'lily@example.com',
    phone: '021 XXX XXXX',
    memberSince: '2025-01',
  });

  // 头像 URI
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // 我的宠物（模拟数据）
  const [pets] = useState([
    { id: 1, name: 'Lucky', type: '狗狗', breed: '金毛', age: '3岁' },
    { id: 2, name: 'Mimi', type: '猫咪', breed: '英短', age: '2岁' },
  ]);

  // 设置选项
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  // 请求相册权限并选择图片
  const pickImage = async () => {
    try {
      // 请求权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要访问相册的权限才能选择照片');
        return;
      }

      // 打开图片选择器
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Alert.alert('成功', '头像更新成功！');
        
        // TODO: 上传到服务器
        // await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('选择图片错误:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  // 拍照
  const takePhoto = async () => {
    try {
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      // 打开相机
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Alert.alert('成功', '头像更新成功！');
        
        // TODO: 上传到服务器
        // await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('拍照错误:', error);
      Alert.alert('错误', '拍照失败，请重试');
    }
  };

  // 选择头像方式
  const selectAvatarMethod = () => {
    Alert.alert(
      '选择头像',
      '请选择获取头像的方式',
      [
        { text: '从相册选择', onPress: pickImage },
        { text: '拍照', onPress: takePhoto },
        { text: '取消', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('编辑资料', '此功能即将上线');
  };

  const handleAddPet = () => {
    Alert.alert('添加宠物', '此功能即将上线');
  };

  const handleViewBookings = () => {
    navigation.navigate('Report');
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 头部个人信息卡片 */}
        <View style={styles.header}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {userInfo.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={selectAvatarMethod}
              >
                <Text style={styles.editAvatarText}>📷</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
              <Text style={styles.memberSince}>
                会员时间：{userInfo.memberSince}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Text style={styles.editButtonText}>编辑资料</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* 我的宠物 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>我的宠物</Text>
              <TouchableOpacity onPress={handleAddPet}>
                <Text style={styles.addButton}>+ 添加</Text>
              </TouchableOpacity>
            </View>

            {pets.map((pet) => (
              <View key={pet.id} style={styles.petCard}>
                <View style={styles.petIcon}>
                  <Text style={styles.petIconText}>
                    {pet.type === '狗狗' ? '🐕' : '🐈'}
                  </Text>
                </View>
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petDetails}>
                    {pet.breed} · {pet.age}
                  </Text>
                </View>
                <TouchableOpacity style={styles.petArrow}>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 快捷功能 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>快捷功能</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleViewBookings}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>📅</Text>
              </View>
              <Text style={styles.menuText}>我的预约</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('收藏', '此功能即将上线')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>❤️</Text>
              </View>
              <Text style={styles.menuText}>我的收藏</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('优惠券', '此功能即将上线')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>🎟️</Text>
              </View>
              <Text style={styles.menuText}>优惠券</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 设置 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>设置</Text>
            
            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>🔔</Text>
              </View>
              <Text style={styles.menuText}>推送通知</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#E0E0E0', true: '#2C4A3E' }}
                thumbColor={'#F5EDD8'}
              />
            </View>

            <View style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>📧</Text>
              </View>
              <Text style={styles.menuText}>邮件通知</Text>
              <Switch
                value={emailUpdates}
                onValueChange={setEmailUpdates}
                trackColor={{ false: '#E0E0E0', true: '#2C4A3E' }}
                thumbColor={'#F5EDD8'}
              />
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('隐私设置', '此功能即将上线')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>🔒</Text>
              </View>
              <Text style={styles.menuText}>隐私设置</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('语言', '当前：简体中文')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>🌐</Text>
              </View>
              <Text style={styles.menuText}>语言</Text>
              <Text style={styles.menuValue}>简体中文</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 帮助与支持 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>帮助与支持</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('客服', '联系电话：021 XXX XXXX')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>💬</Text>
              </View>
              <Text style={styles.menuText}>联系客服</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('帮助中心', '此功能即将上线')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>❓</Text>
              </View>
              <Text style={styles.menuText}>帮助中心</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => Alert.alert('关于我们', 'Y&T Paws v1.0.0')}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>ℹ️</Text>
              </View>
              <Text style={styles.menuText}>关于我们</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 退出登录 */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Y&T Paws v1.0.0</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F5EDD8',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C4A3E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  editAvatarText: {
    fontSize: 14,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    backgroundColor: '#2C4A3E',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#F5EDD8',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
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
  },
  addButton: {
    fontSize: 14,
    color: '#2C4A3E',
    fontWeight: '600',
  },
  petCard: {
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
  petIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  petIconText: {
    fontSize: 24,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C4A3E',
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 13,
    color: '#666',
  },
  petArrow: {
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
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  menuArrow: {
    fontSize: 20,
    color: '#999',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#FF5252',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF5252',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 24,
  },
});

export default ProfileScreen;
