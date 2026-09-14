import { PropsWithChildren } from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'
export function ScreenContainer({ children }: PropsWithChildren) { return <View style={styles.outer}><SafeAreaView style={styles.safe}>{children}</SafeAreaView></View> }
const styles = StyleSheet.create({ outer: { flex: 1, backgroundColor: '#f6f8fb' }, safe: { flex: 1, paddingHorizontal: 16 } })
