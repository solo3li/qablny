import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.qablny.online/api', // Adjust as needed for production/dev
});
