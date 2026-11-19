import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname.includes('nip.io') ? `${window.location.protocol}//api-qablny.169.58.32.179.nip.io/api` : 'https://api-qablny.169.58.32.179.nip.io/api'),
});
