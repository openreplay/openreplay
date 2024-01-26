<p align="center">
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
  &nbsp;|&nbsp;
  <a href="/README_RU.md">Русский</a>
  &nbsp;|&nbsp;
  <a href="/README.md">English</a>
</p>

<p align="center">
  <a href="https://openreplay.com/#gh-light-mode-only">
    <img src="static/openreplay-git-banner-light.png" width="100%">
  </a>
  <a href="https://openreplay.com/#gh-dark-mode-only">
    <img src="static/openreplay-git-banner-dark.png" width="100%">
  </a>
</p>

<h3 align="center">إعادة تشغيل الجلسة للمطورين</h3>
<p align="center">إعادة تشغيل الجلسة الأكثر تقدمًا لإنشاء تطبيقات ويب رائعة</p>

<p align="center">
  <a href="https://docs.openreplay.com/deployment/deploy-aws">
    <img src="static/btn-deploy-aws.svg" height="40"/>
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-gcp">
    <img src="static/btn-deploy-google-cloud.svg" height="40" />
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-azure">
    <img src="static/btn-deploy-azure.svg" height="40" />
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-digitalocean">
    <img src="static/btn-deploy-digital-ocean.svg" height="40" />
  </a>
</p>

https://github.com/openreplay/openreplay/assets/20417222/684133c4-575a-48a7-aa91-d4bf88c5436a

OpenReplay هو مجموعة إعادة تشغيل الجلسة التي يمكنك استضافتها بنفسك، والتي تتيح لك رؤية ما يقوم به المستخدمون على تطبيق الويب و تطبيقات الهاتف المحمول الخاص بك، مما يساعدك على حل المشكلات بشكل أسرع.

- **إعادة تشغيل الجلسة**. يقوم OpenReplay بإعادة تشغيل ما يقوم به المستخدمون، وكيف يتصرف موقع الويب الخاص بك أو التطبيق من خلال التقاط النشاط على الشبكة، وسجلات وحدة التحكم، وأخطاء JavaScript، وإجراءات/حالة التخزين، وقياسات سرعة الصفحة، واستخدام وحدة المعالجة المركزية/الذاكرة، وأكثر من ذلك بكثير. بالإضافة إلى تطبيقات الويب، تطبيقات نظام iOS و React Native مدعومة أيضاً (سيتم إطلاق نسخ Android و Flutter قريباً).
- **بصمة منخفضة**. مع متتبع بحجم حوالي 26 كيلوبايت (نوع .br) الذي يرسل بيانات دقيقة بشكل غير متزامن لتأثير محدود جدًا على الأداء. 
- **مضيف بواسطتك.** لا مزيد من فحوص الامتثال الأمني، ومعالجة بيانات المستخدمين من قبل جهات خارجية. كل ما يتم التقاطه بواسطة OpenReplay يبقى في سحابتك للتحكم الكامل في بياناتك.
- **ضوابط الخصوصية.** ميزات أمان دقيقة لتنقية بيانات المستخدم.
- **نشر سهل.** بدعم من مزودي الخدمة السحابية العامة الرئيسيين (AWS، GCP، Azure، DigitalOcean).

## الميزات

- **إعادة تشغيل الجلسة:** تتيح لك إعادة تشغيل الجلسة إعادة عيش تجربة مستخدميك، ورؤية أين يواجهون صعوبة وكيف يؤثر ذلك على سلوكهم. يتم تحليل كل إعادة تشغيل للجلسة تلقائيًا بناءً على الأساليب الاستدلالية، لسهولة التقييم.
- **أدوات التطوير (DevTools):** إنها مثل التصحيح في متصفحك الخاص. يوفر لك OpenReplay السياق الكامل (نشاط الشبكة، أخطاء JavaScript، إجراءات/حالة التخزين وأكثر من 40 مقياسًا) حتى تتمكن من إعادة إنتاج الأخطاء فورًا وفهم مشكلات الأداء.
- **المساعدة (Assist):** تساعدك في دعم مستخدميك من خلال رؤية شاشتهم مباشرة والانضمام فورًا إلى مكالمة (WebRTC) معهم دون الحاجة إلى برامج مشاركة الشاشة من جهات خارجية.
- **البحث الشامل (Omni-search):** ابحث وفرز حسب أي عملية/معيار للمستخدم تقريبًا، أو سمة الجلسة أو الحدث التقني، حتى تتمكن من الرد على أي سؤال. لا يلزم تجهيز.
- **الأنفاق (Funnels):** للكشف عن المشكلات الأكثر تأثيرًا التي تسبب في فقدان التحويل والإيرادات.
- **ضوابط الخصوصية الدقيقة:** اختر ماذا تريد التقاطه، ماذا تريد أن تخفي أو تجاهل حتى لا تصل بيانات المستخدم حتى إلى خوادمك.
- **موجهة للمكونات الإضافية (Plugins oriented):** تصل إلى السبب الجذري بشكل أسرع عن طريق تتبع حالة التطبيق (Redux، VueX، MobX، NgRx، Pinia، وZustand) وتسجيل استعلامات GraphQL (Apollo، Relay) وطلبات Fetch/Axios.
- **التكاملات (Integrations):** مزامنة سجلات الخادم الخلفي مع إعادات التشغيل للجلسات ورؤية ما حدث من الأمام إلى الخلف. يدعم OpenReplay Sentry وDatadog وCloudWatch وStackdriver وElastic والمزيد.

## خيارات النشر

يمكن نشر OpenReplay في أي مكان. اتبع دليلنا الخطوة بالخطوة لنشره على خدمات السحابة العامة الرئيسية:

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [OVHcloud](https://docs.openreplay.com/deployment/deploy-ovhcloud)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## سحابة OpenReplay

لأولئك الذين يرغبون في استخدام OpenReplay كخدمة، [قم بالتسجيل](https://app.openreplay.com/signup) للحصول على حساب مجاني على عرض السحابة لدينا.

## دعم المجتمع

يرجى الرجوع إلى [الوثائق الرسمية لـ OpenReplay](https://docs.openreplay.com/). سيساعدك ذلك في حل المشكلات الشائعة. للحصول على مساعدة إضافية، يمكنك الاتصال بنا عبر أحد هذه القنوات:

- [Slack](https://slack.openreplay.com) (الاتصال مع مهندسينا والمجتمع)
- [GitHub](https://github.com/openreplay/openreplay/issues) (تقارير الأخطاء والمشكلات)
- [Twitter](https://twitter.com/OpenReplayHQ) (تحديثات المنتج، محتوى رائع)
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) (دروس حول كيفية الاستخدام، مكالمات مجتمع سابقة)
- [دردشة الموقع الإلكتروني](https://openreplay.com) (تحدث معنا)

## المساهمة

نحن دائمًا في انتظار المساهمات في OpenReplay، ونحن سعداء بأنك تفكر في ذلك! غير متأكد من أين تبدأ؟ ابحث عن المشاكل المفتوحة، وخاصة تلك المُميزة بأنها مناسبة للمبتدئين.

انظر دليل المساهمة لدينا [دليل المساهمة](CONTRIBUTING.md) لمزيد من التفاصيل.

كما توجد حرية الانضمام إلى Slack لدينا [Slack](https://slack.openreplay.com) لطرح الأسئلة، مناقشة الأفكار أو التواصل مع مساهمينا.

## الخارطة الزمنية

تحقق من [الخارطة الزمنية لدينا](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) وابق على اطلاع على ما سيأتي لاحقًا. لديك حرية [تقديم أفكار جديدة](https://github.com/openreplay/openreplay/issues/new) والتصويت على الميزات.

## الترخيص

يستخدم هذا المستودع المتعدد التراخيص. انظر إلى [LICENSE](/LICENSE) لمزيد من التفاصيل.
