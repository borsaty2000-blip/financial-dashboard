# Package Boundaries

## قواعد الاعتماد

- `packages/design-system` لا يعتمد على API أو Prisma أو بيانات السوق.
- `packages/types` لا يعتمد على React أو Node.
- `packages/utils` لا يحتوي على أسرار أو استدعاءات شبكة.
- `apps/web` يستهلك العقود ولا يقرأ قاعدة البيانات مباشرة.
- `apps/api` يملك المصادقة والتفويض وتطبيع المصادر.
- `services/analysis` لا يملك صلاحية تنفيذ أمر تداول.

## قرار المرحلة الحالية

يتم إنشاء الحزم في المستودع الحالي دون تغيير `tsconfig` الإنتاجي، لأن نقل المسارات الآن سيحوّل ترقية هندسية إلى migration تشغيلية. بعد إضافة workspace manager وCI مستقل للحزم، يُفعل الاستيراد تدريجياً.

## تعريف الجاهزية للنقل

1. حزمة مستقلة لها `package.json` وREADME.
2. TypeScript وbuild يعملان دون اعتماد على ملفات التطبيق الخاصة.
3. اختبار API/visual موجود.
4. لا يوجد import عكسي من package إلى app.
5. rollback موثق في ADR.
