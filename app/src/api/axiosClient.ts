import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Replace with your local machine's IP address if testing on a physical device
// For Android emulator: 10.0.2.2
// For Web: localhost
export const API_BASE_URL = Platform.OS === 'web' ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api'; 

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const uploadMedia = async (asset: any, type: 'image' | 'video' | 'audio'): Promise<string> => {
  const formData = new FormData();
  const filename = asset.fileName || asset.uri.split('/').pop() || `upload.${type === 'image' ? 'jpg' : 'mp4'}`;
  let mimeType = asset.mimeType || 'image/jpeg';
  if (type === 'video') mimeType = 'video/mp4';
  if (type === 'audio') mimeType = 'audio/m4a';

  if (Platform.OS === 'web' && asset.file) {
    formData.append('file', asset.file);
  } else {
    formData.append('file', {
      uri: asset.uri,
      name: filename,
      type: mimeType,
    } as any);
  }

  const res = await axiosClient.post('/conversations/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.url;
};
