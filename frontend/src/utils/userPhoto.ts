import { User } from '../types';
import api from '../services/api';

export const getUserPhotoUrl = (
  user?: Pick<User, 'id' | 'photoKey' | 'updatedAt'> | null,
): string | null => {
  if (!user?.id || !user.photoKey) {
    return null;
  }

  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const cacheKey = user.updatedAt ? `?updatedAt=${encodeURIComponent(user.updatedAt)}` : '';

  return `${baseURL}/public/users/${user.id}/photo${cacheKey}`;
};
