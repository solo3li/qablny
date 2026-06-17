import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your local machine's IP address if testing on a physical device
// For Android emulator: 10.0.2.2
// For iOS simulator: localhost
export const API_BASE_URL = 'http://10.0.2.2:5000/api'; 

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

export const uploadMedia = async (uri: string, type: 'image' | 'video' | 'audio'): Promise<string> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || `upload.${type === 'image' ? 'jpg' : 'mp4'}`;
  let mimeType = 'image/jpeg';
  if (type === 'video') mimeType = 'video/mp4';
  if (type === 'audio') mimeType = 'audio/m4a';

  formData.append('file', {
    uri: uri,
    name: filename,
    type: mimeType,
  } as any);

  const res = await axiosClient.post('/conversations/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.url;
};
