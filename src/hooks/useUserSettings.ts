import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTeacherPreferences,
  updateTeacherPreferences,
  getAdminSystemConfig,
  updateAdminSystemConfig,
} from '../services/settingsService';
import { TeacherPreferences, AdminSystemConfig, DEFAULT_TEACHER_PREFERENCES, DEFAULT_ADMIN_SYSTEM_CONFIG } from '../types/settings';

interface UseUserSettingsReturn {
  teacherPrefs: TeacherPreferences;
  adminConfig: AdminSystemConfig;
  loading: boolean;
  error: string | null;
  saveTeacherPrefs: (updates: Partial<TeacherPreferences>) => Promise<void>;
  saveAdminConfig: (updates: Partial<AdminSystemConfig>) => Promise<void>;
}

export const useUserSettings = (): UseUserSettingsReturn => {
  const { userProfile, userRole } = useAuth();
  const [teacherPrefs, setTeacherPrefs] = useState<TeacherPreferences>(DEFAULT_TEACHER_PREFERENCES);
  const [adminConfig, setAdminConfig] = useState<AdminSystemConfig>(DEFAULT_ADMIN_SYSTEM_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (userRole === 'teacher') {
          const prefs = await getTeacherPreferences(userProfile.uid);
          setTeacherPrefs(prefs);
        }
        if (userRole === 'admin') {
          const config = await getAdminSystemConfig();
          setAdminConfig(config);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userProfile?.uid, userRole]);

  const saveTeacherPrefs = useCallback(
    async (updates: Partial<TeacherPreferences>) => {
      if (!userProfile?.uid) return;
      const merged = await updateTeacherPreferences(userProfile.uid, updates);
      setTeacherPrefs(merged);
    },
    [userProfile?.uid],
  );

  const saveAdminConfig = useCallback(
    async (updates: Partial<AdminSystemConfig>) => {
      const merged = await updateAdminSystemConfig(updates);
      setAdminConfig(merged);
    },
    [],
  );

  return { teacherPrefs, adminConfig, loading, error, saveTeacherPrefs, saveAdminConfig };
};
