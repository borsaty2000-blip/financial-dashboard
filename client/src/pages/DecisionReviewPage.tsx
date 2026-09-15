import { navigate } from '../router'

export function DecisionReviewPage() {
	return (
		<main className="analysis-tools-page" dir="rtl">
			<header className="analysis-page-header">
				<p className="eyebrow">تحليل قابل للمراجعة</p>
				<h1>قرارات قابلة للمراجعة</h1>
				<p>
					من التحليل إلى الاختبار، مع فصل واضح بين القراءة التعليمية وأي قرار
					استثماري.
				</p>
			</header>
			<section className="analysis-card">
				<h2>القراءات الحالية</h2>
				<p className="muted">
					لا نعرض توصية عامة بلا رمز وبيانات تاريخية كافية. افتح صفحة سهم محدد
					لعرض الإجماع وElliott وGann والمؤشرات مع مصدر البيانات وحالتها.
				</p>
				<div className="stock-header-actions">
					<button
						className="primary-button"
						onClick={() => navigate('/stock/COMI')}
					>
						فتح تحليل COMI
					</button>
					<button
						className="secondary-button"
						onClick={() => navigate('/stock/2222')}
					>
						فتح تحليل 2222
					</button>
				</div>
			</section>
			<section className="analysis-card">
				<h2>من التحليل إلى الاختبار</h2>
				<p className="muted">
					اختبر الفرضية على البيانات السابقة قبل تفسيرها. نتائج الاختبار
					التاريخي ليست ضماناً للمستقبل ولا تمثل أمراً بالشراء أو البيع.
				</p>
				<button
					className="primary-button"
					onClick={() => navigate('/backtest')}
				>
					فتح الاختبار التاريخي
				</button>
			</section>
			<section className="analysis-card">
				<h2>سجل المراجعة</h2>
				<p className="muted">
					سيظهر السجل بعد تسجيل الدخول وحفظ فرضية مرتبطة بسهم وفترة ومصدر
					بيانات. لا يتم إنشاء سجل أو نسبة نجاح افتراضية من دون هذه المدخلات.
				</p>
			</section>
		</main>
	)
}
