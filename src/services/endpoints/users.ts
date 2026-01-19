import api from '../api';
import type { ApiResponse, PaginationParams, PaginatedResponse } from '@/types';
import type { User } from '@/types';

export const usersApi = {
  getAll: async (
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<User>>>('/users', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  create: async (data: Omit<User, 'id'>): Promise<ApiResponse<User>> => {
    const response = await api.post<ApiResponse<User>>('/users', data);
    return response.data;
  },

  update: async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.patch<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
