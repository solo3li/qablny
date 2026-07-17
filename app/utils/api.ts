import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.46.101.172.175.nip.io/api', // Adjust as needed for production/dev
});
