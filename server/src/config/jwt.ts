import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const accessSecret =
	process.env.ACCESS_TOKEN_SECRET ?? 'dev-access-secret-change-me-32-characters'
const refreshSecret =
	process.env.REFRESH_TOKEN_SECRET ??
	'dev-refresh-secret-change-me-32-characters'
if (
	process.env.NODE_ENV === 'production' &&
	(accessSecret.length < 32 || refreshSecret.length < 32)
)
	throw new Error(
		'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must each be at least 32 characters',
	)
const encoder = new TextEncoder()
export const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY = '7d'
export type TokenType = 'access' | 'refresh'
export async function signToken(subject: string, type: TokenType) {
	return new SignJWT({ type })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(subject)
		.setIssuedAt()
		.setExpirationTime(
			type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY,
		)
		.sign(encoder.encode(type === 'access' ? accessSecret : refreshSecret))
}
export async function verifyToken(
	token: string,
	type: TokenType,
): Promise<JWTPayload & { type: TokenType }> {
	const result = await jwtVerify(
		token,
		encoder.encode(type === 'access' ? accessSecret : refreshSecret),
	)
	if (result.payload.type !== type || typeof result.payload.sub !== 'string')
		throw new Error('Invalid token')
	return result.payload as JWTPayload & { type: TokenType }
}
