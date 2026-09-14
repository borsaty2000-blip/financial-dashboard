import * as SecureStore from 'expo-secure-store'
export async function saveAccessToken(token: string) { await SecureStore.setItemAsync('borsaty_access_token', token) }
export async function getAccessToken() { return SecureStore.getItemAsync('borsaty_access_token') }
export async function clearAccessToken() { await SecureStore.deleteItemAsync('borsaty_access_token') }
