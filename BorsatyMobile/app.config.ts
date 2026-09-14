import type { ExpoConfig } from 'expo/config'
const config: ExpoConfig = { name: 'بورصتي', slug: 'borsaty-mobile', version: '1.0.0', orientation: 'portrait', scheme: 'borsaty', userInterfaceStyle: 'automatic', newArchEnabled: true, ios: { supportsTablet: true, bundleIdentifier: 'com.borsaty.mobile' }, android: { package: 'com.borsaty.mobile', permissions: ['POST_NOTIFICATIONS'] }, plugins: ['expo-router', 'expo-notifications'], experiments: { typedRoutes: true } }
export default config
