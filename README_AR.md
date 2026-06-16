<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
  &nbsp;|&nbsp;
  <a href="/README_RU.md">Русский</a>
</p>
<p align="center">
  <a href="https://openreplay.com/#gh-light-mode-only">
    <img src="static/openreplay-git-banner-light.png" width="100%">
  </a>
  <a href="https://openreplay.com/#gh-dark-mode-only">
    <img src="static/openreplay-git-banner-dark.png" width="100%">
  </a>
</p>
<h3 align="center">منصة تحليل التجربة مفتوحة المصدر التي تستضيفها بنفسك</h3>
<p align="center">إعادة تشغيل الجلسات، والتصفّح المشترك، وتحليلات المنتج — باستضافة ذاتية، بحيث لا تغادر بيانات مستخدميك بنيتك التحتية أبدًا.</p>
<p align="center">
  <a href="https://github.com/openreplay/openreplay/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3%20%26%20more-394DFE" alt="الرخصة"></a>
  <a href="https://slack.openreplay.com"><img src="https://img.shields.io/badge/Slack-join-394DFE?logo=slack&logoColor=white" alt="انضم إلينا على Slack"></a>
  <img src="https://img.shields.io/badge/SOC%202-Type%20II-394DFE" alt="SOC 2 Type II">
</p>
<p align="center">
  <a href="https://docs.openreplay.com/en/deployment/deploy-aws">
    <img src="static/btn-deploy-aws.svg" height="40"/>
  </a>
  <a href="https://docs.openreplay.com/en/deployment/deploy-gcp">
    <img src="static/btn-deploy-google-cloud.svg" height="40" />
  </a>
  <a href="https://docs.openreplay.com/en/deployment/deploy-azure">
    <img src="static/btn-deploy-azure.svg" height="40" />
  </a>
  <a href="https://docs.openreplay.com/en/deployment/deploy-digitalocean">
    <img src="static/btn-deploy-digital-ocean.svg" height="40" />
  </a>
</p>
<p align="center">
  <a href="https://github.com/openreplay/openreplay">
    <img src="static/openreplay-git-hero.svg">
  </a>
</p>

<div dir="rtl">

OpenReplay هي منصة مفتوحة المصدر لتحليل تجربة المستخدم، تستضيفها على بنيتك التحتية الخاصة. أعد تشغيل جلسات المستخدمين، وصحّح الأخطاء بكامل السياق التقني، وحلّل استخدام المنتج، وتصفّح مع مستخدميك مباشرةً — دون إرسال أي جلسة إلى أي طرف ثالث. كل ما تلتقطه OpenReplay يبقى في سحابتك وتحت سيطرتك الكاملة.

لهذا تُعدّ OpenReplay مناسبة للفرق التي لا يمكنها تسليم بيانات عملائها إلى مزوّد خارجي: لا مُعالِجات من أطراف ثالثة، ولا مراجعات امتثال مطوّلة، مع توافق مع أصرم المعايير التنظيمية. تستخدمها فرق الهندسة والمنتج والتصميم والدعم في شركات كبرى ضمن قطاعات شديدة التنظيم.

## لماذا OpenReplay

- **بياناتك مِلكك.** استضِف OpenReplay على بنيتك التحتية الخاصة (AWS وGCP وAzure وغيرها). لا تغادر بيانات الجلسات محيط الأمان الخاص بك أبدًا.
- **الخصوصية بالتصميم.** أخفِ أو موّه أو تجاوز أي بيانات [عند الالتقاط](https://docs.openreplay.com/en/sdk/sanitize-data/)، قبل أن تصل إلى خوادمك. فعّل [الوضع الخاص](https://docs.openreplay.com/en/sdk/private-mode/) لإخفاء كل شيء افتراضيًا.
- **كل شيء في مكان واحد.** إعادة تشغيل الجلسات، وأدوات المطوّر، وتحليلات المنتج، والتصفّح المشترك — بدلًا من الجمع بين أدوات منفصلة.
- **خفيف.** مُتتبِّع خفيف يرسل أقل قدر من البيانات بشكل غير متزامن، بأثر محدود جدًا على الأداء.
- **مفتوح المصدر.** اطّلِع على الكود، واستضِفه مجانًا، وساهِم فيه. لا صناديق سوداء.

## المزايا

- **[Session Replay](https://openreplay.com/product/feature/session-replay).** عِشْ تجربة مستخدميك من جديد — أين يتنقّلون وينقرون ويترددون أو يتعثّرون — والتقِط كل خطأ أو تباطؤ أو تعطّل في رحلتهم. ابحث وصفِّ حسب أي إجراء للمستخدم أو سمة جلسة أو حدث تقني تقريبًا — دون أي إعداد إضافي.
- **[DevTools](https://openreplay.com/product/feature/developer-tools).** صحّح الأخطاء وكأنها وقعت في متصفحك أنت. احصل على السياق الكامل — نشاط الشبكة، وسجلات الكونسول، وأخطاء JavaScript، وإجراءات/حالة الـ store، وأكثر من 40 مقياس أداء — لإعادة إنتاج المشكلات وإصلاحها فورًا.
- **[Product Analytics](https://docs.openreplay.com/en/product-analytics/).** اعرف أي المسارات تُحقّق التحويل وأين ينسحب المستخدمون، عبر [المسارات التحويلية](https://docs.openreplay.com/en/product-analytics/funnels/) و[الاتجاهات](https://docs.openreplay.com/en/product-analytics/trends/) و[رحلات المستخدم](https://docs.openreplay.com/en/product-analytics/journeys/) و[الخرائط الحرارية](https://docs.openreplay.com/en/product-analytics/heatmaps/) و[تحليلات الويب](https://docs.openreplay.com/en/product-analytics/web-analytics/) — وكلها مدعومة بإعادة تشغيل الجلسات لسياق كامل.
- **[Cobrowsing](https://docs.openreplay.com/en/plugins/assist/).** ساعِد مستخدميك في أهم اللحظات. شاهِد شاشتهم مباشرةً، وتحكّم بالمؤشّر بإذنهم، وابدأ مكالمة WebRTC — دون روابط اجتماعات أو تنزيلات أو برامج مشاركة شاشة من أطراف ثالثة.
- **[Spot](https://openreplay.com/platform/spot).** امتداد مجاني لمتصفح Chrome يلتقط الأخطاء مباشرةً من المتصفح. كل تسجيل يجمع الكونسول والشبكة وتفاصيل البيئة التي يحتاجها المطوّرون للإصلاح.
- **[Mobile](https://openreplay.com/product/feature/mobile).** إعادة تشغيل جلسات أصلية لتطبيقات iOS وAndroid وReact Native.

## بياناتك مِلكك

صُمِّمت OpenReplay للفرق العاملة في القطاعات المنظَّمة والمهتمة بالأمان، التي تحتاج إلى سيطرة كاملة على بيانات المستخدمين.

- **استضافة ذاتية.** شغّل OpenReplay بالكامل داخل سحابتك الخاصة أو على خوادمك (on-premise). لا تُشارَك أي بيانات مع أي طرف ثالث.
- **التنقية عند الالتقاط.** اختر ما تلتقطه أو تموّهه أو تتجاهله، بحيث لا تصل البيانات الحساسة حتى إلى خوادمك. أخفِ حسب مُحدِّد CSS، ونقِّح حقول الإدخال، ونظِّف حمولات الشبكة. راجِع [تنقية البيانات](https://docs.openreplay.com/en/sdk/sanitize-data/).
- **الوضع الخاص.** أخفِ كل النصوص والمدخلات افتراضيًا — مثالي لتطبيقات الرعاية الصحية والمصارف والقطاع القانوني. راجِع [الوضع الخاص](https://docs.openreplay.com/en/sdk/private-mode/).
- **مقاوم لمانعات الإعلانات.** لأنك تستضيفه ذاتيًا، يكون التتبّع من الطرف الأول (first-party) ولا تحجبه مانعات الإعلانات، فتلتقط بيانات كاملة.
- **GDPR وCCPA.** أدوات مدمجة لتنقية البيانات الحساسة وإدارة عمليات التصدير وتلبية طلبات الحذف.
- **التحكّم في الوصول.** صلاحيات قائمة على الأدوار (Owner وAdmin وMember)، إضافةً إلى الدخول الموحّد SSO (SAML وOIDC) للمصادقة المؤسسية.
- **SOC 2 Type II.** إن OpenReplay Cloud حاصلة على شهادة SOC 2 Type II.

## كيف تتميّز OpenReplay

معظم أدوات إعادة تشغيل الجلسات وتحليلات المنتج هي خدمات SaaS مغلقة المصدر: تُلتقَط بيانات مستخدميك في سحابة المزوّد متعددة المستأجرين، وتنتهي سيطرتك عند صفحة الإعدادات. أما OpenReplay فهي مفتوحة المصدر وتمنحك المجموعة الكاملة من نماذج النشر — بما في ذلك خيارات لا يوفّرها أي مزوّد آخر — لتبقى قرارات الأمان وموقع تخزين البيانات بيدك.

إلى جانب الاستضافة الذاتية المجانية، يمكنك تشغيل OpenReplay بثلاث طرق: **Serverless** (بالدفع حسب الاستخدام، مثل الجميع)، أو نسخة **Dedicated** مُدارة بالكامل مع موقع تخزين للبيانات في **أكثر من 50 منطقة**، أو **Bring-Your-Own-Cloud (BYOC)** حيث ننشر OpenReplay ونديرها داخل حساب السحابة *الخاص بك*، بحيث لا تغادر بيانات الجلسات حسابك أبدًا.

| الأمان والخصوصية | OpenReplay | FullStory | LogRocket | PostHog |
| --- | :---: | :---: | :---: | :---: |
| مفتوح المصدر | ✅ | ❌ | ❌ | ✅ |
| استضافة ذاتية في الإنتاج (مجانًا) | ✅ | ❌ | للمؤسسات فقط <sup>1</sup> | متوقّف <sup>2</sup> |
| Cloud Serverless (حسب الاستخدام) | ✅ | ✅ | ✅ | ✅ |
| Cloud Dedicated | **أكثر من 50 منطقة عبر AWS/Azure/GCP** | ❌ | ❌ | ❌ |
| Bring-Your-Own-Cloud (BYOC) | ✅ | ❌ | ❌ | ❌ |
| تبقى البيانات في بنيتك التحتية | ✅ | ❌ | للمؤسسات فقط | نسخة «hobby» فقط |
| لا مُعالِج خارجي | ✅ | ❌ | ⚠️ | ⚠️ |
| إخفاء البيانات الشخصية عند الالتقاط | ✅ | ✅ | ✅ | ✅ |

<sup>1</sup> لدى LogRocket نسخة للاستضافة الذاتية، لكنها لعملاء المؤسسات فقط. وهي محدودة وليست مفتوحة المصدر.  
<sup>2</sup> PostHog مفتوحة المصدر، لكن نشرها بالاستضافة الذاتية (Kubernetes) متوقّف — لم يبقَ سوى إصدار «hobby» عبر Docker، والمزايا الجديدة تصدر للسحابة فقط.

## انشُر في أي مكان

يمكن نشر OpenReplay في أي مكان. ابدأ من [دليل البدء](https://docs.openreplay.com/en/getting-started/). كل ما تحتاجه هو جهاز افتراضي (VM) واحد بإعداد أساسي يتكوّن من 2 vCPU و8 غيغابايت من الذاكرة و50 غيغابايت من التخزين:

- [AWS](https://docs.openreplay.com/en/deployment/deploy-aws/)
- [Google Cloud](https://docs.openreplay.com/en/deployment/deploy-gcp/)
- [Azure](https://docs.openreplay.com/en/deployment/deploy-azure/)
- [DigitalOcean](https://docs.openreplay.com/en/deployment/deploy-digitalocean/)
- [Scaleway](https://docs.openreplay.com/en/deployment/deploy-scaleway/)
- [OVHcloud](https://docs.openreplay.com/en/deployment/deploy-ovhcloud/)
- [Kubernetes (Helm)](https://docs.openreplay.com/en/deployment/deploy-kubernetes/)
- [Docker](https://docs.openreplay.com/en/deployment/deploy-docker/)
- [Ubuntu (خادم فعلي)](https://docs.openreplay.com/en/deployment/deploy-ubuntu/)
- [من الكود المصدري](https://docs.openreplay.com/en/deployment/deploy-source/)

## OpenReplay Cloud

تفضّل عدم الاستضافة الذاتية؟ شغّل OpenReplay في سحابتنا:

- **Serverless** — حسب الاستخدام، ادفع فقط مقابل الجلسات التي تسجّلها.
- **Dedicated** — نسخة مُدارة بالكامل، في VPC مخصّص، مع موقع تخزين للبيانات في أكثر من 50 منطقة.
- **Bring-Your-Own-Cloud (BYOC)** — نشغّل OpenReplay ونديرها داخل حساب AWS أو GCP أو Azure الخاص بك.

اطّلِع على [الأسعار](https://openreplay.com/pricing) لمزيد من التفاصيل.

## حُزم التطوير (SDKs)

- **الويب** — مُتتبِّع JavaScript واحد مع أدلّة لـ [React](https://docs.openreplay.com/en/sdk/using-or/react/) و[Next.js](https://docs.openreplay.com/en/sdk/using-or/next/) و[Angular](https://docs.openreplay.com/en/sdk/using-or/angular/) و[Vue](https://docs.openreplay.com/en/sdk/using-or/vue/) و[Nuxt](https://docs.openreplay.com/en/sdk/using-or/nuxt/) و[Svelte](https://docs.openreplay.com/en/sdk/using-or/svelte/) و[Gatsby](https://docs.openreplay.com/en/sdk/using-or/gatsby/) و[Remix](https://docs.openreplay.com/en/sdk/using-or/remix/) و[Electron](https://docs.openreplay.com/en/sdk/using-or/electron/)، أو عبر [مقتطف جاهز للإضافة](https://docs.openreplay.com/en/sdk/using-or/snippet/). راجِع [مرجع JavaScript SDK](https://docs.openreplay.com/en/sdk/).
- **الجوّال** — إعادة تشغيل جلسات أصلية لـ [iOS](https://docs.openreplay.com/en/ios-sdk/) و[Android](https://docs.openreplay.com/en/android-sdk/) و[React Native](https://docs.openreplay.com/en/rn-sdk/) (في مرحلة تجريبية حاليًا).

## الإضافات والتكاملات

اعثُر على السبب الجذري بشكل أسرع عبر التقاط حالة التطبيق وسياق الخادم الخلفي مع كل عملية إعادة تشغيل.

- **إدارة الحالة:** [Redux](https://docs.openreplay.com/en/plugins/redux/) و[VueX](https://docs.openreplay.com/en/plugins/vuex/) و[Pinia](https://docs.openreplay.com/en/plugins/pinia/) و[MobX](https://docs.openreplay.com/en/plugins/mobx/) و[NgRx](https://docs.openreplay.com/en/plugins/ngrx/) و[Zustand](https://docs.openreplay.com/en/plugins/zustand/).
- **الشبكة والأداء:** [Fetch](https://docs.openreplay.com/en/plugins/fetch/) و[Axios](https://docs.openreplay.com/en/plugins/axios/) و[GraphQL](https://docs.openreplay.com/en/plugins/graphql/) (Apollo وRelay) و[Profiler](https://docs.openreplay.com/en/plugins/profiler/).
- **التكاملات:** زامِن سجلات الخادم الخلفي والأخطاء مع عمليات إعادة التشغيل لترى ما حدث من الواجهة إلى الخادم — [Sentry](https://docs.openreplay.com/en/integrations/sentry/) و[Datadog](https://docs.openreplay.com/en/integrations/datadog/) و[Elastic](https://docs.openreplay.com/en/integrations/elastic/) و[Dynatrace](https://docs.openreplay.com/en/integrations/dynatrace/) وغيرها. إضافةً إلى تتبّع التذاكر ([Jira](https://docs.openreplay.com/en/integrations/jira/) و[GitHub](https://docs.openreplay.com/en/integrations/github/) و[Zendesk](https://docs.openreplay.com/en/integrations/zendesk/))، والمراسلة ([Slack](https://docs.openreplay.com/en/integrations/slack/) و[Microsoft Teams](https://docs.openreplay.com/en/integrations/msteams/))، و[Google Tag Manager](https://docs.openreplay.com/en/integrations/google-tag-manager/).

## التوثيق والموارد

- [التوثيق](https://docs.openreplay.com/) — أدلّة، ومراجع حُزم التطوير، وتعليمات النشر.
- [البدء](https://docs.openreplay.com/en/getting-started/) — من الصفر إلى أول جلسة في نحو 30 دقيقة.
- [المدوّنة](https://blog.openreplay.com/) — دروس، ومقارنات، وتحليلات هندسية معمّقة.

## المجتمع والدعم

ابدأ من [التوثيق](https://docs.openreplay.com/) لحلّ المشكلات الشائعة. لمزيد من المساعدة، تواصل معنا عبر أيٍّ من هذه القنوات:

- [Slack](https://slack.openreplay.com) — تواصل مع مهندسينا والمجتمع.
- [المنتدى](https://forum.openreplay.com) — اطرح الأسئلة وتصفّح النقاشات السابقة.
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) — دروس ومكالمات مجتمعية سابقة.

## المساهمة

نحن نبحث دائمًا عن مساهمات، ويسعدنا أنك تفكّر في ذلك! لا تعرف من أين تبدأ؟ ابحث عن الـ issues المفتوحة، ويفضّل تلك المعلّمة بـ «good first issue». راجِع [دليل المساهمة](CONTRIBUTING.md) لمزيد من التفاصيل، ولا تتردّد في الانضمام إلى [Slack](https://slack.openreplay.com) لطرح الأسئلة ومناقشة الأفكار أو التواصل مع المساهمين الآخرين.

## الرخصة

يستخدم هذا المستودع الأحادي (monorepo) عدة رخص. الجزء الأكبر من الكود مرخّص بموجب **AGPLv3**، وبعض المجلدات مرخّصة بموجب **MIT**، وكل ما يقع ضمن مجلد `ee/` (إصدار المؤسسات) مرخّص بموجب رخصة تجارية منفصلة محدّدة في [`ee/LICENSE`](/ee/LICENSE). أما مكوّنات الأطراف الثالثة فتحتفظ برخصها الأصلية.

راجِع [LICENSE](/LICENSE) لكل التفاصيل. هل لديك أسئلة؟ راسِلنا على license@openreplay.com.

</div>
