import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { navigate } from '../router'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'

type MarketCard = {
	label: string
	caption: string
	value?: number
	change?: number
	status: 'live' | 'cached' | 'unavailable'
}

type DirectoryCompany = {
	symbol: string
	displaySymbol?: string
	name: string
	price?: number | null
	changePercent?: number | null
	available?: boolean
}

type PulseTab = 'ALL' | 'EGX' | 'TASI' | 'COMMODITIES'

const formatValue = (value?: number) => formatEnglishNumber(value)

export function PublicMarketPulse({
	cards,
	egxCompanies,
	tasiCompanies,
}: {
	cards: MarketCard[]
	egxCompanies: DirectoryCompany[]
	tasiCompanies: DirectoryCompany[]
}) {
	const [tab, setTab] = useState<PulseTab>('ALL')
	const [sortBy, setSortBy] = useState<'change' | 'price'>('change')
	const marketCards = cards.filter((card) =>
		tab === 'COMMODITIES'
			? ['GOLD', 'SILVER'].includes(card.label)
			: tab === 'EGX'
				? card.label.startsWith('EGX')
				: tab === 'TASI'
					? card.label === 'TASI'
					: true,
	)
	const quoted = useMemo(() => {
		const companies = [
			...(tab === 'TASI' || tab === 'COMMODITIES'
				? []
				: egxCompanies.map((item) => ({ ...item, market: 'EGX' }))),
			...(tab === 'EGX' || tab === 'COMMODITIES'
				? []
				: tasiCompanies.map((item) => ({ ...item, market: 'TASI' }))),
		]
		return companies
			.filter((company) => company.price != null || company.available)
			.sort((left, right) =>
				sortBy === 'price'
					? (right.price ?? -Infinity) - (left.price ?? -Infinity)
					: (right.changePercent ?? -Infinity) -
						(left.changePercent ?? -Infinity),
			)
			.slice(0, 8)
	}, [egxCompanies, tasiCompanies, sortBy, tab])
	const maxMove = Math.max(
		...quoted.map((company) => Math.abs(company.changePercent ?? 0)),
		1,
	)

	return (
		<section
			className="borsaty-section borsaty-pulse-section"
			aria-labelledby="market-pulse-title"
		>
			<div className="borsaty-section__heading borsaty-pulse-heading">
				<div>
					<span className="borsaty-kicker">لوحة الأسواق</span>
					<h2 id="market-pulse-title">نبض السوق</h2>
				</div>
				<p>الأسعار والحركة تظهر فقط عندما تعيد خدمات السوق أرقاماً صالحة.</p>
			</div>
			<div
				className="borsaty-pulse-tabs"
				role="tablist"
				aria-label="أسواق نبض السوق"
			>
				{(
					[
						['ALL', 'نظرة عامة'],
						['EGX', 'الأسهم المصرية'],
						['TASI', 'الأسهم السعودية'],
						['COMMODITIES', 'الذهب والفضة'],
					] as const
				).map(([value, label]) => (
					<button
						key={value}
						role="tab"
						aria-selected={tab === value}
						className={tab === value ? 'is-active' : ''}
						onClick={() => setTab(value)}
					>
						{label}
					</button>
				))}
			</div>
			<div className="borsaty-pulse-grid">
				<div className="borsaty-pulse-indices">
					{marketCards.map((card) => (
						<article className="borsaty-pulse-index" key={card.label}>
							<div>
								<strong>{card.label}</strong>
								<span>{card.caption}</span>
							</div>
							<i className={`borsaty-status-dot is-${card.status}`} />
							<b>{formatValue(card.value)}</b>
							<span
								className={
									card.change == null
										? 'is-muted'
										: card.change >= 0
											? 'is-up'
											: 'is-down'
								}
							>
								{card.change == null ? '—' : formatEnglishPercent(card.change)}
							</span>
						</article>
					))}
				</div>
				<div className="borsaty-pulse-table-card">
					<div className="borsaty-pulse-table-head">
						<div>
							<strong>الأكثر حركة</strong>
							<span>{quoted.length} أسعار متاحة في العرض الحالي</span>
						</div>
						<label>
							<span>فرز</span>
							<select
								value={sortBy}
								onChange={(event) =>
									setSortBy(event.target.value as typeof sortBy)
								}
							>
								<option value="change">التغير</option>
								<option value="price">السعر</option>
							</select>
						</label>
					</div>
					{quoted.length ? (
						<div className="borsaty-pulse-rows">
							{quoted.map((company) => {
								const move = company.changePercent
								const width = `${Math.max(8, Math.min(100, (Math.abs(move ?? 0) / maxMove) * 100))}%`
								return (
									<button
										className="borsaty-pulse-row"
										key={`${company.market}-${company.symbol}`}
										onClick={() =>
											navigate(
												`/stock/${company.symbol}?market=${company.market}&name=${encodeURIComponent(company.name)}`,
											)
										}
									>
										<span className="borsaty-pulse-symbol">
											<b>{company.displaySymbol ?? company.symbol}</b>
											<small>{company.name}</small>
										</span>
										<strong>{formatValue(company.price ?? undefined)}</strong>
										<span
											className={
												move == null
													? 'is-muted'
													: move >= 0
														? 'is-up'
														: 'is-down'
											}
										>
											{move == null ? '—' : formatEnglishPercent(move)}
										</span>
										<i
											className={move != null && move < 0 ? 'is-down' : 'is-up'}
											style={{ '--pulse-width': width } as CSSProperties}
										/>
									</button>
								)
							})}
						</div>
					) : (
						<div className="borsaty-pulse-empty">
							لا توجد أسعار متاحة لهذا القسم حالياً. سيتم عرضها تلقائياً عند
							عودة البيانات.
						</div>
					)}
				</div>
			</div>
		</section>
	)
}
