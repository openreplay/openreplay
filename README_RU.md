<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
  &nbsp;|&nbsp;
  <a href="/README_AR.md">العربية</a>
</p>
<p align="center">
  <a href="https://openreplay.com/#gh-light-mode-only">
    <img src="static/openreplay-git-banner-light.png" width="100%">
  </a>
  <a href="https://openreplay.com/#gh-dark-mode-only">
    <img src="static/openreplay-git-banner-dark.png" width="100%">
  </a>
</p>
<h3 align="center">Open-source платформа для анализа опыта, которую вы размещаете сами</h3>
<p align="center">Session replay, cobrowsing и product analytics — на собственном хостинге, чтобы данные ваших пользователей никогда не покидали вашу инфраструктуру.</p>
<p align="center">
  <a href="https://github.com/openreplay/openreplay/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3%20%26%20more-394DFE" alt="Лицензия"></a>
  <a href="https://slack.openreplay.com"><img src="https://img.shields.io/badge/Slack-join-394DFE?logo=slack&logoColor=white" alt="Присоединяйтесь в Slack"></a>
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

OpenReplay — это open-source платформа для анализа пользовательского опыта, которую вы размещаете на собственной инфраструктуре. Воспроизводите сессии пользователей, отлаживайте с полным техническим контекстом, анализируйте использование продукта и подключайтесь к экрану пользователя в реальном времени — не отправляя ни одной сессии третьим сторонам. Всё, что фиксирует OpenReplay, остаётся в вашем облаке и полностью под вашим контролем.

Поэтому OpenReplay подходит командам, которые не могут передавать данные клиентов внешнему поставщику: никаких сторонних обработчиков, никаких бесконечных проверок на соответствие требованиям и полное соответствие самым строгим нормативным стандартам. Его используют команды разработки, продукта, дизайна и поддержки в крупных компаниях из строго регулируемых отраслей.

## Почему OpenReplay

- **Данные принадлежат вам.** Размещайте OpenReplay на собственной инфраструктуре (AWS, GCP, Azure и другие). Данные сессий никогда не покидают ваш периметр безопасности.
- **Приватность по умолчанию.** Маскируйте, скрывайте или пропускайте любые данные [на этапе захвата](https://docs.openreplay.com/en/sdk/sanitize-data/), ещё до того как они попадут на ваши серверы. Включите [приватный режим](https://docs.openreplay.com/en/sdk/private-mode/), чтобы скрывать всё по умолчанию.
- **Всё в одном месте.** Session replay, DevTools, product analytics и cobrowsing — вместо набора разрозненных инструментов.
- **Легковесность.** Лёгкий трекер, который асинхронно отправляет минимум данных и почти не влияет на производительность.
- **Открытый код.** Читайте код, размещайте бесплатно и вносите вклад. Никаких «чёрных ящиков».

## Возможности

- **[Session Replay](https://openreplay.com/product/feature/session-replay).** Заново переживайте опыт пользователей — куда они переходят, кликают, где сомневаются или застревают — и замечайте каждую ошибку, замедление или сбой на их пути. Ищите и фильтруйте практически по любому действию пользователя, атрибуту сессии или техническому событию — без инструментирования.
- **[DevTools](https://openreplay.com/product/feature/developer-tools).** Отлаживайте так, будто баг произошёл в вашем собственном браузере. Получайте полный контекст — сетевую активность, логи консоли, JS-ошибки, действия/состояние store и более 40 метрик производительности — чтобы мгновенно воспроизводить и исправлять проблемы.
- **[Product Analytics](https://docs.openreplay.com/en/product-analytics/).** Узнавайте, какие сценарии приводят к конверсии, а где пользователи уходят, с помощью [воронок](https://docs.openreplay.com/en/product-analytics/funnels/), [трендов](https://docs.openreplay.com/en/product-analytics/trends/), [пользовательских путей](https://docs.openreplay.com/en/product-analytics/journeys/), [тепловых карт](https://docs.openreplay.com/en/product-analytics/heatmaps/) и [веб-аналитики](https://docs.openreplay.com/en/product-analytics/web-analytics/) — и всё это подкреплено session replay для полного контекста.
- **[Cobrowsing](https://docs.openreplay.com/en/plugins/assist/).** Помогайте пользователям в самый важный момент. Смотрите их экран в реальном времени, берите управление курсором с их разрешения и подключайтесь к WebRTC-звонку — без ссылок на встречи, загрузок и сторонних программ для демонстрации экрана.
- **[Spot](https://openreplay.com/platform/spot).** Бесплатное расширение для Chrome, которое фиксирует баги прямо из браузера. Каждая запись содержит консоль, сеть и детали окружения, которые нужны разработчикам для исправления.
- **[Mobile](https://openreplay.com/product/feature/mobile).** Нативный session replay для приложений на iOS, Android и React Native.

## Данные принадлежат вам

OpenReplay создан для команд из регулируемых и заботящихся о безопасности отраслей, которым нужен полный контроль над пользовательскими данными.

- **Собственный хостинг.** Запускайте OpenReplay целиком в собственном облаке или on-premise. Никакие данные не передаются третьим сторонам.
- **Очистка на этапе захвата.** Выбирайте, что захватывать, скрывать или игнорировать, чтобы конфиденциальные данные даже не достигали ваших серверов. Маскируйте по CSS-селектору, редактируйте поля ввода и очищайте сетевые данные. См. [Очистку данных](https://docs.openreplay.com/en/sdk/sanitize-data/).
- **Приватный режим.** Маскируйте весь текст и поля ввода по умолчанию — идеально для приложений в сфере здравоохранения, финансов и права. См. [Приватный режим](https://docs.openreplay.com/en/sdk/private-mode/).
- **Устойчивость к блокировщикам рекламы.** Поскольку вы размещаете систему сами, отслеживание является first-party и не блокируется блокировщиками рекламы — вы получаете полные данные.
- **GDPR и CCPA.** Встроенные инструменты для очистки конфиденциальных данных, управления экспортом и обработки запросов на удаление.
- **Управление доступом.** Ролевой доступ (Owner, Admin, Member) и SSO (SAML, OIDC) для корпоративной аутентификации.
- **SOC 2 Type II.** OpenReplay Cloud соответствует SOC 2 Type II.

## Сравнение OpenReplay

Большинство инструментов session replay и product analytics — это проприетарный SaaS: данные ваших пользователей захватываются в мультиарендное облако поставщика, а ваш контроль заканчивается на странице настроек. OpenReplay — open source и предлагает полный набор моделей развёртывания, включая варианты, которых нет ни у одного другого поставщика, так что безопасность и резидентность данных остаются вашим решением.

Помимо бесплатного собственного хостинга, OpenReplay можно запускать тремя способами: **Serverless** (с оплатой по использованию, как у всех), полностью управляемый экземпляр **Dedicated** с резидентностью данных в **более чем 50 регионах** или **Bring-Your-Own-Cloud (BYOC)**, когда мы разворачиваем и обслуживаем OpenReplay внутри вашего *собственного* облачного аккаунта, чтобы данные сессий никогда его не покидали.

| Безопасность и приватность | OpenReplay | FullStory | LogRocket | PostHog |
| --- | :---: | :---: | :---: | :---: |
| Открытый код | ✅ | ❌ | ❌ | ✅ |
| Собственный хостинг в продакшене (бесплатно) | ✅ | ❌ | Только Enterprise <sup>1</sup> | Прекращён <sup>2</sup> |
| Cloud Serverless (по использованию) | ✅ | ✅ | ✅ | ✅ |
| Cloud Dedicated | **50+ регионов в AWS/Azure/GCP** | ❌ | ❌ | ❌ |
| Bring-Your-Own-Cloud (BYOC) | ✅ | ❌ | ❌ | ❌ |
| Данные остаются в вашей инфраструктуре | ✅ | ❌ | Только Enterprise | Только hobby-версия |
| Без стороннего обработчика | ✅ | ❌ | ⚠️ | ⚠️ |
| Маскирование персональных данных при захвате | ✅ | ✅ | ✅ | ✅ |

<sup>1</sup> У LogRocket есть версия для собственного хостинга, но только для корпоративных клиентов. Она ограничена и не является open source.  
<sup>2</sup> PostHog — open source, но его развёртывание на собственном хостинге (Kubernetes) прекращено: осталась только «hobby»-сборка на Docker, а новые функции выходят только в облаке.

## Разворачивайте где угодно

OpenReplay можно развернуть где угодно. Начните с [руководства по началу работы](https://docs.openreplay.com/en/getting-started/). Всё, что нужно, — одна виртуальная машина на базовой конфигурации 2 vCPU, 8 ГБ ОЗУ и 50 ГБ хранилища:

- [AWS](https://docs.openreplay.com/en/deployment/deploy-aws/)
- [Google Cloud](https://docs.openreplay.com/en/deployment/deploy-gcp/)
- [Azure](https://docs.openreplay.com/en/deployment/deploy-azure/)
- [DigitalOcean](https://docs.openreplay.com/en/deployment/deploy-digitalocean/)
- [Scaleway](https://docs.openreplay.com/en/deployment/deploy-scaleway/)
- [OVHcloud](https://docs.openreplay.com/en/deployment/deploy-ovhcloud/)
- [Kubernetes (Helm)](https://docs.openreplay.com/en/deployment/deploy-kubernetes/)
- [Docker](https://docs.openreplay.com/en/deployment/deploy-docker/)
- [Ubuntu (bare metal)](https://docs.openreplay.com/en/deployment/deploy-ubuntu/)
- [Из исходного кода](https://docs.openreplay.com/en/deployment/deploy-source/)

## OpenReplay Cloud

Предпочитаете не размещать самостоятельно? Запускайте OpenReplay в нашем облаке:

- **Serverless** — с оплатой по использованию, платите только за записанные сессии.
- **Dedicated** — полностью управляемый экземпляр в выделенном VPC, с резидентностью данных более чем в 50 регионах.
- **Bring-Your-Own-Cloud (BYOC)** — мы запускаем и обслуживаем OpenReplay внутри вашего собственного аккаунта AWS, GCP или Azure.

Подробности см. в разделе [цены](https://openreplay.com/pricing).

## SDK

- **Web** — единый JavaScript-трекер с руководствами для [React](https://docs.openreplay.com/en/sdk/using-or/react/), [Next.js](https://docs.openreplay.com/en/sdk/using-or/next/), [Angular](https://docs.openreplay.com/en/sdk/using-or/angular/), [Vue](https://docs.openreplay.com/en/sdk/using-or/vue/), [Nuxt](https://docs.openreplay.com/en/sdk/using-or/nuxt/), [Svelte](https://docs.openreplay.com/en/sdk/using-or/svelte/), [Gatsby](https://docs.openreplay.com/en/sdk/using-or/gatsby/), [Remix](https://docs.openreplay.com/en/sdk/using-or/remix/), [Electron](https://docs.openreplay.com/en/sdk/using-or/electron/) или [готового сниппета](https://docs.openreplay.com/en/sdk/using-or/snippet/). См. [справочник по JavaScript SDK](https://docs.openreplay.com/en/sdk/).
- **Mobile** — нативный session replay для [iOS](https://docs.openreplay.com/en/ios-sdk/), [Android](https://docs.openreplay.com/en/android-sdk/) и [React Native](https://docs.openreplay.com/en/rn-sdk/) (сейчас в бете).

## Плагины и интеграции

Быстрее находите первопричину, фиксируя состояние приложения и контекст бэкенда вместе с каждым replay.

- **Управление состоянием:** [Redux](https://docs.openreplay.com/en/plugins/redux/), [VueX](https://docs.openreplay.com/en/plugins/vuex/), [Pinia](https://docs.openreplay.com/en/plugins/pinia/), [MobX](https://docs.openreplay.com/en/plugins/mobx/), [NgRx](https://docs.openreplay.com/en/plugins/ngrx/) и [Zustand](https://docs.openreplay.com/en/plugins/zustand/).
- **Сеть и производительность:** [Fetch](https://docs.openreplay.com/en/plugins/fetch/), [Axios](https://docs.openreplay.com/en/plugins/axios/), [GraphQL](https://docs.openreplay.com/en/plugins/graphql/) (Apollo, Relay) и [Profiler](https://docs.openreplay.com/en/plugins/profiler/).
- **Интеграции:** Синхронизируйте логи бэкенда и ошибки с вашими replay, чтобы видеть всё от фронта до бэка — [Sentry](https://docs.openreplay.com/en/integrations/sentry/), [Datadog](https://docs.openreplay.com/en/integrations/datadog/), [Elastic](https://docs.openreplay.com/en/integrations/elastic/), [Dynatrace](https://docs.openreplay.com/en/integrations/dynatrace/) и другие. Плюс трекинг задач ([Jira](https://docs.openreplay.com/en/integrations/jira/), [GitHub](https://docs.openreplay.com/en/integrations/github/), [Zendesk](https://docs.openreplay.com/en/integrations/zendesk/)), мессенджеры ([Slack](https://docs.openreplay.com/en/integrations/slack/), [Microsoft Teams](https://docs.openreplay.com/en/integrations/msteams/)) и [Google Tag Manager](https://docs.openreplay.com/en/integrations/google-tag-manager/).

## Документация и ресурсы

- [Документация](https://docs.openreplay.com/) — руководства, справочники по SDK и инструкции по развёртыванию.
- [Начало работы](https://docs.openreplay.com/en/getting-started/) — от нуля до первой сессии примерно за 30 минут.
- [Блог](https://blog.openreplay.com/) — туториалы, сравнения и технические разборы.

## Сообщество и поддержка

Начните с [документации](https://docs.openreplay.com/), чтобы решить типичные проблемы. Если нужна помощь, пишите нам по любому из каналов:

- [Slack](https://slack.openreplay.com) — общайтесь с нашими инженерами и сообществом.
- [Форум](https://forum.openreplay.com) — задавайте вопросы и просматривайте прошлые обсуждения.
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) — туториалы и прошедшие community calls.

## Участие в разработке

Мы всегда рады вкладу и рады, что вы об этом задумались! Не знаете, с чего начать? Поищите открытые issue, особенно отмеченные как «good first issue». Подробности в нашем [руководстве для контрибьюторов](CONTRIBUTING.md). Также присоединяйтесь к нашему [Slack](https://slack.openreplay.com), чтобы задавать вопросы, обсуждать идеи или общаться с другими участниками.

## Лицензия

Этот монорепозиторий использует несколько лицензий. Большая часть кода распространяется под лицензией **AGPLv3**, некоторые каталоги — под лицензией **MIT**, а всё, что находится в каталоге `ee/` (Enterprise Edition), распространяется под отдельной коммерческой лицензией, описанной в [`ee/LICENSE`](/ee/LICENSE). Сторонние компоненты сохраняют свои исходные лицензии.

Подробности см. в файле [LICENSE](/LICENSE). Вопросы? Пишите на license@openreplay.com.
