<p align="center">
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
  &nbsp;|&nbsp;
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_RU.md">العربية</a>
</p>

<p align="center">
  <a href="https://openreplay.com/#gh-light-mode-only">
    <img src="static/openreplay-git-banner-light.png" width="100%">
  </a>
  <a href="https://openreplay.com/#gh-dark-mode-only">
    <img src="static/openreplay-git-banner-dark.png" width="100%">
  </a>
</p>

<h3 align="center">Реплей сессий для разработчиков</h3>
<p align="center">Самое продвинутое решение для воспроизведения сессий с открытым исходным кодом для создания восхитительных веб-приложений.</p>

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

<p align="center">
  <a href="https://github.com/openreplay/openreplay">
    <img src="static/openreplay-git-hero.svg">
  </a>
</p>

OpenReplay - это набор инструментов для воспроизведения пользовательских сессий, позволяющий увидеть действия пользователи в вашем веб-приложении, который вы можете разместить в своем облаке или на серверах.

- **Воспроизведение сессий.** OpenReplay не только воспроизводит действия пользователей, но и показывает, что происходит под капотом сессии, как ведет себя ваш сайт или приложение, фиксируя сетевую активность, логи консоли, JS-ошибки, действия/состояние стейт менеджеров, показатели скорости страницы, использование процессора/памяти и многое другое.
- **Компактность**. Размером всего в ~26 КБ (.br), трекер асинхронно отправляет минимальное количество данных, оказывая очень незначительное влияние на производительность вашего приложения.
- **Self-hosted**. Больше никаких проверок на соответствие требованиям безопасности или обработки данных ваших пользователей третьими сторонами. Все, что фиксирует OpenReplay, остается в вашем облаке, что обеспечивает полный контроль над вашими данными.
- **Контроль над приватностью**. Тонкие настройки приватности позволяют записывать только действительно необходимые данные.
- **Легкая установка**. Мы поддерживаем всех крупных поставщиков облачных услуг (AWS, GCP, Azure, DigitalOcean).

## Особенности

- **Session Replay:** Позволяет повторить опыт пользователей, увидеть, где они испытывают трудности и как это влияет на конверсию. Каждый реплей автоматически анализируется на наличие ошибок и аномалий, что значительно облегчает сортировку и поиск проблемных сессий.
- **DevTools:** Прямо как отладка в вашем собственном браузере. OpenReplay предоставляет вам полный контекст (сетевая активность, JS ошибки, действия/состояние стейт менеджеров и более 40 метрик), чтобы вы могли мгновенно воспроизвести ошибки и найти проблемы с производительностью.
- **Assist:** Позволяет вам помочь вашим пользователям, наблюдая их экран в настоящем времени и мгновенно переходя на звонок (WebRTC) с ними, не требуя стороннего программного обеспечения для совместного просмотра экрана.
- **Omni-search:** Поиск и фильтрация практически любого действия пользователя/критерия, атрибута сессии или технического события, чтобы вы могли ответить на любой вопрос.
- **Воронки:** Для выявления наиболее влияющих на конверсию мест.
- **Тонкая настройка приватности:** Выбирайте, что записывать, а что игнорировать, чтобы данные пользователя даже не отправлялись на ваши сервера.
- **Ориентирован на плагины:** С помощью плагинов можно отслеживать состояние приложения (Redux, VueX, MobX, NgRx, Pinia, и Zustand), регистрировать запросы GraphQL (Apollo, Relay) и многое другое.
- **Интеграции:** OpenReplay поддерживает интеграции с Sentry, Datadog, CloudWatch, Stackdriver, Elastic и другими провайдерами, позволяя получать еще больше информации о пользовательской сессии.

## Варианты развертывания

OpenReplay можно развернуть где угодно. Следуйте нашим пошаговым руководствам по развертыванию на основных публичных облаках:

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [OVHcloud](https://docs.openreplay.com/deployment/deploy-ovhcloud)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## OpenReplay Cloud

Для тех, кто просто хочет использовать OpenReplay как сервис, [зарегистрируйте](https://app.openreplay.com/signup) бесплатную учетную запись в нашем приложении.

## Поддержка сообщества

В случае возникновения проблем, вы можете обратиться к [официальной документации OpenReplay](https://docs.openreplay.com/). Это поможет вам решить наиболее распространенные проблемы.
Для дополнительной помощи, вы можете связаться с нами через один из этих каналов:

- [Slack](https://slack.openreplay.com) (Свяжитесь с нашими инженерами и сообществом)
- [GitHub](https://github.com/openreplay/openreplay/issues) (Отчеты о багах и проблемах)
- [Twitter](https://twitter.com/OpenReplayHQ) (Обновления продукта)
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) (Учебные пособия, прошлые комьюнити-звонки)
- [Чат на веб-сайте](https://openreplay.com) (Общайтесь с нами)

## Содействие

Мы всегда рады любой помощи в создании OpenReplay, и готовы услышать ваши идеи. Не уверены, с чего начать? Ищите открытые задачи, особенно те, которые отмечены как "good first issue".

Смотрите наше [руководство по содействию](CONTRIBUTING.md) для более подробной информации.

Также не стесняйтесь присоединиться к нашему [Slack](https://slack.openreplay.com), чтобы задавать вопросы, обсуждать идеи или связываться с нашими участниками.

## План развития

Ознакомьтесь с нашим [планом развития](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) и следите за тем, что будет далее. Вы можете свободно [предложить](https://github.com/openreplay/openreplay/issues/new) новые идеи и голосовать за функции.

## Лицензия

В этом монорепозитории используются разные лицензии. См. [LICENSE](/LICENSE) для получения более подробной информации.
