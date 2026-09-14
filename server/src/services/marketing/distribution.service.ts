export type DistributionTarget =
	'medium' | 'linkedin' | 'twitter' | 'nabd' | 'arab-hardware' | 'mada-blog'

const targets: DistributionTarget[] = [
	'medium',
	'linkedin',
	'twitter',
	'nabd',
	'arab-hardware',
	'mada-blog',
]
export function distributionStatus() {
	return targets.map((target) => ({
		target,
		configured: Boolean(
			process.env[`${target.toUpperCase().replace(/-/g, '_')}_API_KEY`],
		),
		mode: 'draft-only',
		published: false,
	}))
}
export function createDistributionDraft(post: {
	title: string
	excerpt?: string
	content: string
	slug: string
}) {
	return {
		title: post.title,
		excerpt: post.excerpt ?? '',
		content: post.content,
		canonicalUrl: `https://borsatyai.com/blog/${post.slug}`,
		targets,
		mode: 'draft-only',
		requiresManualReview: true,
	}
}
