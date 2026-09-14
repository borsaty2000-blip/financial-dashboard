import { useState } from 'react'
export function DeveloperDocsPage() {
	const [tab, setTab] = useState<'curl' | 'javascript' | 'python'>('curl')
	const examples = {
		curl: 'curl -H "X-API-Key: bors_..." https://borsatyai.com/api/v1/stocks',
		javascript: 'fetch("/api/v1/stocks", { headers: { "X-API-Key": key } })',
		python: 'requests.get(url, headers={"X-API-Key": key})',
	}
	return (
		<main className="analysis-page developer-docs-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Developer API v1</p>
				<h1>توثيق واجهة بورصتي</h1>
				<p>مفتاح القراءة فقط مطلوب في ترويسة X-API-Key.</p>
			</header>
			<section className="analysis-card">
				<h2>المصادقة والحدود</h2>
				<p>
					<code>bors_...</code> · FREE: 100 طلب/يوم · PRO: 10,000 طلب/يوم ·
					ENTERPRISE: غير محدود.
				</p>
				<h2>المسارات</h2>
				<ul>
					<li>GET /api/v1/stocks</li>
					<li>GET /api/v1/stocks/:symbol/candles</li>
					<li>GET /api/v1/analysis/:symbol/consensus</li>
					<li>GET /api/v1/news</li>
				</ul>
				<div className="docs-tabs">
					{(['curl', 'javascript', 'python'] as const).map((item) => (
						<button
							key={item}
							className={tab === item ? 'active' : ''}
							onClick={() => setTab(item)}
						>
							{item}
						</button>
					))}
				</div>
				<pre>{examples[tab]}</pre>
			</section>
		</main>
	)
}
