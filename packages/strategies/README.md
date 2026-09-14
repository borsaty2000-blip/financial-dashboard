# @borsaty/strategies

محرك عقود لمنشئ استراتيجيات بصري.

## ما تم تثبيته

- 23 نوع node مصنفاً إلى input وindicator وlogic وaction وrisk وoutput.
- Graph validation: nodes، edges، output واحد، منع self-loop، واكتشاف cycles.
- قالب RSI تعليمي.
- `runEducationalBacktest` على candles تاريخية مع win rate وaverage return وmax drawdown.

## حدود مقصودة

المحرك لا ينفذ صفقات حقيقية، ولا يرسل أوامر إلى وسيط، ولا يدعي أن نتائج backtest تنبؤ. واجهة React Flow يمكن تركيبها فوق هذا العقد لاحقاً؛ وجود الرسم لا يغير حدود الخطر أو التفويض.

## Strategy Assistant contract

يوفر `assistant.ts` عقد طلب/استجابة typed، والتحقق من `question` و`symbol`، و`StrategyAssistantProvider` لحقن مزود LLM لاحقاً. التنفيذ الحالي `createDeterministicAssistantSuggestion` fallback حتمي لا يستهلك credits ولا يحتاج secrets؛ يعيد قالب RSI صالحاً، تفسيراً تعليمياً، limitations، وdisclaimer. لا يوجد فيه تنفيذ صفقات أو توصية مالية.
