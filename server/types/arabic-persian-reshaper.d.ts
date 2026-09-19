declare module 'arabic-persian-reshaper' {
	export const ArabicShaper: {
		convertArabic(value: string): string
	}
	const reshaper: { ArabicShaper: typeof ArabicShaper }
	export default reshaper
}
