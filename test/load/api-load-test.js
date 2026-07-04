import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // simulate ramp-up of traffic from 1 to 50 users over 30s
    { duration: '1m', target: 50 },   // stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = 'http://localhost:5169'; // Default .NET Kestrel HTTP port

export default function () {
  const payload = JSON.stringify({
    email: `loadtest_${__VU}_${__ITER}@test.com`,
    password: 'Password123'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Test Login (even if it fails, we test the load on DB/Server)
  let loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  check(loginRes, {
    'is status 401 or 200': (r) => r.status === 200 || r.status === 401,
  });

  // 2. Test Get Top Agencies (anonymous endpoint if available, otherwise just home page)
  let agenciesRes = http.get(`${BASE_URL}/api/agencies/top`);
  
  check(agenciesRes, {
    'agencies returned 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}
