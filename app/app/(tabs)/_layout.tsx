import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Home, Heart, MessageSquare, User, Plus } from 'lucide-react-native';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '../../store/useAppStore';

function TabIcon({ icon, focused }: { icon: React.ReactNode; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      {icon}
    </View>
  );
}

const CustomFloatingButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={styles.floatingButtonContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={Colors.gradPrimary}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.floatingButton}
    >
      <Plus color="#FFFFFF" size={28} strokeWidth={2.5} />
    </LinearGradient>
  </TouchableOpacity>
);

export default function TabLayout() {
  const friends = useAppStore(state => state.friends);
  const isMatchMode = useAppStore(state => state.isMatchMode);
  const totalUnread = friends.reduce((acc, f) => acc + f.unread, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null,
          isMatchMode ? { display: 'none' } : undefined,
        ],
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<Heart color={color} size={24} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="action"
        options={{
          title: 'New',
          tabBarIcon: () => null,
          tabBarButton: (props) => <CustomFloatingButton {...props} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Handle floating action button press (e.g., open modal or go to explore)
            navigation.navigate('explore');
          },
        })}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <TabIcon focused={focused} icon={<MessageSquare color={color} size={24} strokeWidth={focused ? 2.5 : 2} />} />
              {totalUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} icon={<User color={color} size={24} strokeWidth={focused ? 2.5 : 2} />} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    marginHorizontal: 24,
    height: 70,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    paddingBottom: 0,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
      }
    }),
  },
  tabIcon: {
    alignItems: 'center', 
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  
  floatingButtonContainer: {
    top: -24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: Colors.shadowGlow } as any,
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }
    }),
  }
});
