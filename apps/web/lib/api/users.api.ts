import {
  ChangeMyPasswordPayload,
  CreateUserPayload,
  UpdateUserPayload,
  UserDto,
} from '@portal-alvim/shared';
import { apiClient } from './client';

export const usersApi = {
  list: () => apiClient.get<UserDto[]>('users'),
  get: (id: string) => apiClient.get<UserDto>(`users/${id}`),
  create: (payload: CreateUserPayload) => apiClient.post<UserDto>('users', payload),
  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.patch<UserDto>(`users/${id}`, payload),
  deactivate: (id: string) => apiClient.delete<UserDto>(`users/${id}`),
  me: () => apiClient.get<UserDto>('users/me'),
  uploadMySignature: (file: File) => {
    const formData = new FormData();
    formData.set('file', file);
    return apiClient.postForm<UserDto>('users/me/signature', formData);
  },
  removeMySignature: () => apiClient.delete<UserDto>('users/me/signature'),
  mySignatureFileUrl: () => '/api/backend/users/me/signature/file',
  changeMyPassword: (payload: ChangeMyPasswordPayload) =>
    apiClient.patch<UserDto>('users/me/password', payload),
};
