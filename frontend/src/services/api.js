import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)

// Rides
export const findRides = (params) => api.get('/rides/find', { params })
export const offerRide = (data) => api.post('/rides/offer', data)
export const getMyRides = () => api.get('/rides/my')
export const joinRide = (rideId) => api.post(`/rides/${rideId}/join`)
export const cancelRide = (rideId) => api.delete(`/rides/${rideId}`)

// Stats
export const getStats = () => api.get('/stats')
export const getAISuggestion = () => api.get('/ai/suggestion')

export default api