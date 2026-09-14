import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://borsatyai.com', timeout: 12000 })
export async function cachedGet<T>(path: string) { try { const { data } = await api.get<T>(path); await AsyncStorage.setItem(`cache:${path}`, JSON.stringify(data)); return { data, offline: false } } catch { const cached = await AsyncStorage.getItem(`cache:${path}`); if (!cached) throw new Error('لا توجد بيانات متاحة دون اتصال'); return { data: JSON.parse(cached) as T, offline: true } } }
