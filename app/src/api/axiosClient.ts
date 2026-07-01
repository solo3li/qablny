import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Replace with your local machine's IP address if testing on a physical device
// For Android emulator: 10.0.2.2
// For Web: localhost
export const API_BASE_URL = 'https://api.qablny.online/api'; 

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
  
  if (Platform.OS === 'web' && (asset instanceof Blob || asset instanceof File)) {
    formData.append('file', asset, `upload.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a'}`);
  } else if (Platform.OS === 'web' && asset.file) {
    formData.append('file', asset.file);
  } else {
    const filename = asset.fileName || asset.uri?.split('/').pop() || `upload.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a'}`;
    let mimeType = asset.mimeType || 'image/jpeg';
    if (type === 'video') mimeType = 'video/mp4';
    if (type === 'audio') mimeType = 'audio/m4a';

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
