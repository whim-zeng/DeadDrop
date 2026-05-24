import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/api/client';
import type { Profile } from '@/types';

interface AuthState {
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  onboardingStep: number; // 0=welcome, 1=identity, 2=location, 3=done
  setProfile: (profile: Profile | null) => void;
  setOnboarded: (value: boolean) => void;
  setOnboardingStep: (step: number) => void;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: false,
      isOnboarded: false,
      onboardingStep: 0,

      setProfile: (profile) => set({ profile }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      signInAnonymously: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;

          if (data.user) {
            // Check if profile exists
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              set({
                profile: {
                  id: profile.id,
                  anonymousCode: profile.anonymous_code,
                  nickname: profile.nickname,
                  avatarGradient: profile.avatar_gradient,
                  createdAt: profile.created_at,
                },
                isOnboarded: true,
                onboardingStep: 3,
              });
            }
          }
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ profile: null, isOnboarded: false, onboardingStep: 0 });
      },

      refreshProfile: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          set({
            profile: {
              id: profile.id,
              anonymousCode: profile.anonymous_code,
              nickname: profile.nickname,
              avatarGradient: profile.avatar_gradient,
              createdAt: profile.created_at,
            },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
