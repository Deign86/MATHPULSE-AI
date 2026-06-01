import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type {
  User,
  StudentProfile,
  TeacherProfile,
  AdminProfile,
} from '../types/models'

const secureStoreStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(name)
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name)
  },
}

interface AuthState {
  user: User | null
  studentProfile: StudentProfile | null
  teacherProfile: TeacherProfile | null
  adminProfile: AdminProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (user: User, profile: StudentProfile | TeacherProfile | AdminProfile) => void
  logout: () => void
  setUser: (user: User) => void
  updateProfile: (profile: Partial<StudentProfile | TeacherProfile | AdminProfile>) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      studentProfile: null,
      teacherProfile: null,
      adminProfile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: (user, profile) =>
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          ...(profile.role === 'student'
            ? { studentProfile: profile as StudentProfile, teacherProfile: null, adminProfile: null }
            : profile.role === 'teacher'
              ? { teacherProfile: profile as TeacherProfile, studentProfile: null, adminProfile: null }
              : { adminProfile: profile as AdminProfile, studentProfile: null, teacherProfile: null }),
        }),

      logout: () =>
        set({
          user: null,
          studentProfile: null,
          teacherProfile: null,
          adminProfile: null,
          isAuthenticated: false,
          error: null,
        }),

      setUser: (user) => set({ user }),

      updateProfile: (profile) =>
        set((state) => ({
          studentProfile:
            state.studentProfile && profile.role === 'student'
              ? { ...state.studentProfile, ...profile }
              : state.studentProfile,
          teacherProfile:
            state.teacherProfile && profile.role === 'teacher'
              ? { ...state.teacherProfile, ...profile }
              : state.teacherProfile,
          adminProfile:
            state.adminProfile && profile.role === 'admin'
              ? { ...state.adminProfile, ...profile }
              : state.adminProfile,
        })),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mathpulse-auth',
      storage: createJSONStorage(() => secureStoreStorage),
      partialize: (state) => ({
        user: state.user,
        studentProfile: state.studentProfile,
        teacherProfile: state.teacherProfile,
        adminProfile: state.adminProfile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
