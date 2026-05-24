import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreMapScreen } from '@/screens/explore/ExploreMapScreen';
import { NearbyListScreen } from '@/screens/explore/NearbyListScreen';
import { NoteDetailScreen } from '@/screens/explore/NoteDetailScreen';
import { NoteFilterScreen } from '@/screens/explore/NoteFilterScreen';
import { CreateNoteScreen } from '@/screens/create/CreateNoteScreen';
import { ChatListScreen } from '@/screens/chat/ChatListScreen';
import { ChatRoomScreen } from '@/screens/chat/ChatRoomScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();

function ExploreNavigator() {
  return (
    <ExploreStack.Navigator screenOptions={{ headerShown: false }}>
      <ExploreStack.Screen name="ExploreMap" component={ExploreMapScreen} />
      <ExploreStack.Screen name="NearbyList" component={NearbyListScreen} />
      <ExploreStack.Screen name="NoteDetail" component={NoteDetailScreen} />
      <ExploreStack.Screen name="NoteFilter" component={NoteFilterScreen} />
    </ExploreStack.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} />
    </ChatStack.Navigator>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const color = focused ? '#f8fafc' : '#64748b';
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, { color }]}>{label[0]}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="探索" focused={focused} /> }}
      />
      <Tab.Screen
        name="Create"
        component={CreateNoteScreen}
        options={{
          tabBarButton: (props) => (
            <TouchableOpacity {...props} style={styles.createButton} activeOpacity={0.9}>
              <View style={styles.createCircle}>
                <Text style={styles.createText}>+</Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="消息" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="我的" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    height: 80,
    paddingBottom: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  createButton: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#0f172a',
    lineHeight: 32,
  },
});
