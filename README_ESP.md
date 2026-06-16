<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README_RU.md">Русский</a>
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
<h3 align="center">La plataforma de experiencia de código abierto que tú mismo alojas</h3>
<p align="center">Session replay, cobrowsing y product analytics — autoalojados, para que los datos de tus usuarios nunca salgan de tu infraestructura.</p>
<p align="center">
  <a href="https://github.com/openreplay/openreplay/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3%20%26%20more-394DFE" alt="Licencia"></a>
  <a href="https://slack.openreplay.com"><img src="https://img.shields.io/badge/Slack-join-394DFE?logo=slack&logoColor=white" alt="Únete en Slack"></a>
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

OpenReplay es una plataforma de experiencia de código abierto que alojas en tu propia infraestructura. Reproduce las sesiones de tus usuarios, depura con todo el contexto técnico, analiza el uso de tu producto y navega en directo junto a tus usuarios — sin enviar ni una sola sesión a terceros. Todo lo que OpenReplay captura permanece en tu nube, completamente bajo tu control.

Por eso OpenReplay encaja con equipos que no pueden ceder los datos de sus clientes a un proveedor externo: sin procesadores de terceros, sin revisiones de cumplimiento interminables y con alineación con los estándares regulatorios más estrictos. Lo utilizan equipos de ingeniería, producto, diseño y soporte de grandes empresas en sectores altamente regulados.

## Por qué OpenReplay

- **Tus datos son tuyos.** Aloja OpenReplay en tu propia infraestructura (AWS, GCP, Azure y más). Los datos de sesión nunca salen de tu perímetro de seguridad.
- **Privacidad por diseño.** Enmascara, oculta u omite cualquier dato [en el momento de la captura](https://docs.openreplay.com/en/sdk/sanitize-data/), antes de que llegue a tus servidores. Activa el [modo privado](https://docs.openreplay.com/en/sdk/private-mode/) para ocultarlo todo por defecto.
- **Todo en un solo lugar.** Session replay, DevTools, product analytics y cobrowsing — en lugar de combinar herramientas separadas.
- **Ligero.** Un tracker ligero que envía datos mínimos de forma asíncrona, con un impacto muy limitado en el rendimiento.
- **Código abierto.** Lee el código, autoalójalo gratis y contribuye. Sin cajas negras.

## Características

- **[Session Replay](https://openreplay.com/product/feature/session-replay).** Revive la experiencia de tus usuarios — por dónde navegan, hacen clic, dudan o se atascan — y detecta cada error, ralentización o caída de su recorrido. Busca y filtra por casi cualquier acción del usuario, atributo de sesión o evento técnico — sin instrumentación.
- **[DevTools](https://openreplay.com/product/feature/developer-tools).** Depura como si el error hubiera ocurrido en tu propio navegador. Obtén todo el contexto — actividad de red, registros de consola, errores JS, acciones/estado del store y más de 40 métricas de rendimiento — para reproducir y corregir problemas al instante.
- **[Product Analytics](https://docs.openreplay.com/en/product-analytics/).** Descubre qué recorridos convierten y dónde abandonan los usuarios, con [embudos](https://docs.openreplay.com/en/product-analytics/funnels/), [tendencias](https://docs.openreplay.com/en/product-analytics/trends/), [recorridos](https://docs.openreplay.com/en/product-analytics/journeys/), [mapas de calor](https://docs.openreplay.com/en/product-analytics/heatmaps/) y [web analytics](https://docs.openreplay.com/en/product-analytics/web-analytics/) — todo respaldado por los session replays para un contexto completo.
- **[Cobrowsing](https://docs.openreplay.com/en/plugins/assist/).** Ayuda a tus usuarios cuando más importa. Ve su pantalla en directo, toma el control del cursor con su permiso y entra en una llamada WebRTC — sin enlaces de reunión, sin descargas, sin software de pantalla compartida de terceros.
- **[Spot](https://openreplay.com/platform/spot).** Una extensión de Chrome gratuita que captura errores directamente desde el navegador. Cada grabación reúne la consola, la red y los detalles del entorno que los desarrolladores necesitan para corregir el problema.
- **[Mobile](https://openreplay.com/product/feature/mobile).** Session replay nativo para aplicaciones iOS, Android y React Native.

## Tus datos son tuyos

OpenReplay se creó para equipos de sectores regulados y conscientes de la seguridad que necesitan control total sobre los datos de los usuarios.

- **Autoalojado.** Ejecuta OpenReplay íntegramente en tu propia nube o entorno on-premise. No se comparte ningún dato con terceros.
- **Saneamiento en la captura.** Elige qué capturar, ocultar o ignorar para que los datos sensibles ni siquiera lleguen a tus servidores. Enmascara por selector CSS, redacta campos y sanea las cargas de red. Consulta [Saneamiento de datos](https://docs.openreplay.com/en/sdk/sanitize-data/).
- **Modo privado.** Enmascara todo el texto y las entradas por defecto — ideal para aplicaciones de salud, banca y legal. Consulta [Modo privado](https://docs.openreplay.com/en/sdk/private-mode/).
- **Resistente a los bloqueadores de anuncios.** Como lo autoalojas, el rastreo es de origen (first-party) y los bloqueadores de anuncios no lo bloquean, así capturas datos completos.
- **RGPD y CCPA.** Herramientas integradas para sanear datos sensibles, gestionar exportaciones y atender solicitudes de eliminación.
- **Control de acceso.** Acceso basado en roles (Owner, Admin, Member) y SSO (SAML, OIDC) para autenticación empresarial.
- **SOC 2 Type II.** OpenReplay Cloud cuenta con certificación SOC 2 Type II.

## Cómo se compara OpenReplay

La mayoría de las herramientas de session replay y product analytics son SaaS propietario: los datos de tus usuarios se capturan en la nube multiinquilino de un proveedor y tu control termina en una página de ajustes. OpenReplay es de código abierto y ofrece toda la gama de modelos de despliegue — incluidas opciones que ningún otro proveedor ofrece — para que la seguridad y la residencia de los datos sigan siendo tu decisión.

Además del autoalojamiento gratuito, puedes ejecutar OpenReplay de tres formas: **Serverless** (por uso, como todos), una instancia **Dedicated** totalmente gestionada con residencia de datos en **más de 50 regiones**, o **Bring-Your-Own-Cloud (BYOC)**, donde desplegamos y gestionamos OpenReplay dentro de tu *propia* cuenta de nube, para que los datos de sesión nunca salgan de ella.

| Seguridad y privacidad | OpenReplay | FullStory | LogRocket | PostHog |
| --- | :---: | :---: | :---: | :---: |
| Código abierto | ✅ | ❌ | ❌ | ✅ |
| Autoalojamiento en producción (gratis) | ✅ | ❌ | Solo Enterprise <sup>1</sup> | Descontinuado <sup>2</sup> |
| Cloud Serverless (por uso) | ✅ | ✅ | ✅ | ✅ |
| Cloud Dedicated | **50+ regiones en AWS/Azure/GCP** | ❌ | ❌ | ❌ |
| Bring-Your-Own-Cloud (BYOC) | ✅ | ❌ | ❌ | ❌ |
| Los datos permanecen en tu infraestructura | ✅ | ❌ | Solo Enterprise | Solo versión «hobby» |
| Sin procesador de terceros | ✅ | ❌ | ⚠️ | ⚠️ |
| Enmascarado de datos personales en la captura | ✅ | ✅ | ✅ | ✅ |

<sup>1</sup> LogRocket tiene una versión autoalojada, pero solo para clientes Enterprise. Es limitada y no es de código abierto.  
<sup>2</sup> PostHog es de código abierto, pero su despliegue autoalojado (Kubernetes) está descontinuado — solo queda una versión «hobby» con Docker, y las nuevas funciones se lanzan únicamente en la nube.

## Despliega donde quieras

OpenReplay se puede desplegar en cualquier lugar. Empieza por la [guía de inicio](https://docs.openreplay.com/en/getting-started/). Solo necesitas una única VM con una base de 2 vCPU, 8 GB de RAM y 50 GB de almacenamiento:

- [AWS](https://docs.openreplay.com/en/deployment/deploy-aws/)
- [Google Cloud](https://docs.openreplay.com/en/deployment/deploy-gcp/)
- [Azure](https://docs.openreplay.com/en/deployment/deploy-azure/)
- [DigitalOcean](https://docs.openreplay.com/en/deployment/deploy-digitalocean/)
- [Scaleway](https://docs.openreplay.com/en/deployment/deploy-scaleway/)
- [OVHcloud](https://docs.openreplay.com/en/deployment/deploy-ovhcloud/)
- [Kubernetes (Helm)](https://docs.openreplay.com/en/deployment/deploy-kubernetes/)
- [Docker](https://docs.openreplay.com/en/deployment/deploy-docker/)
- [Ubuntu (bare metal)](https://docs.openreplay.com/en/deployment/deploy-ubuntu/)
- [Desde el código fuente](https://docs.openreplay.com/en/deployment/deploy-source/)

## OpenReplay Cloud

¿Prefieres no autoalojar? Ejecuta OpenReplay en nuestra nube:

- **Serverless** — por uso, paga solo por las sesiones que grabas.
- **Dedicated** — una instancia totalmente gestionada, en una VPC dedicada, con residencia de datos en más de 50 regiones.
- **Bring-Your-Own-Cloud (BYOC)** — ejecutamos y gestionamos OpenReplay dentro de tu propia cuenta de AWS, GCP o Azure.

Consulta los [precios](https://openreplay.com/pricing) para más detalles.

## SDKs

- **Web** — un único tracker de JavaScript con guías para [React](https://docs.openreplay.com/en/sdk/using-or/react/), [Next.js](https://docs.openreplay.com/en/sdk/using-or/next/), [Angular](https://docs.openreplay.com/en/sdk/using-or/angular/), [Vue](https://docs.openreplay.com/en/sdk/using-or/vue/), [Nuxt](https://docs.openreplay.com/en/sdk/using-or/nuxt/), [Svelte](https://docs.openreplay.com/en/sdk/using-or/svelte/), [Gatsby](https://docs.openreplay.com/en/sdk/using-or/gatsby/), [Remix](https://docs.openreplay.com/en/sdk/using-or/remix/), [Electron](https://docs.openreplay.com/en/sdk/using-or/electron/) o un [snippet listo para usar](https://docs.openreplay.com/en/sdk/using-or/snippet/). Consulta la [referencia del SDK de JavaScript](https://docs.openreplay.com/en/sdk/).
- **Mobile** — session replay nativo para [iOS](https://docs.openreplay.com/en/ios-sdk/), [Android](https://docs.openreplay.com/en/android-sdk/) y [React Native](https://docs.openreplay.com/en/rn-sdk/) (actualmente en beta).

## Plugins e integraciones

Llega antes a la causa raíz capturando el estado de la aplicación y el contexto del backend junto a cada replay.

- **Gestión de estado:** [Redux](https://docs.openreplay.com/en/plugins/redux/), [VueX](https://docs.openreplay.com/en/plugins/vuex/), [Pinia](https://docs.openreplay.com/en/plugins/pinia/), [MobX](https://docs.openreplay.com/en/plugins/mobx/), [NgRx](https://docs.openreplay.com/en/plugins/ngrx/) y [Zustand](https://docs.openreplay.com/en/plugins/zustand/).
- **Red y rendimiento:** [Fetch](https://docs.openreplay.com/en/plugins/fetch/), [Axios](https://docs.openreplay.com/en/plugins/axios/), [GraphQL](https://docs.openreplay.com/en/plugins/graphql/) (Apollo, Relay) y el [Profiler](https://docs.openreplay.com/en/plugins/profiler/).
- **Integraciones:** Sincroniza los registros del backend y los errores con tus replays para ver qué pasó de principio a fin — [Sentry](https://docs.openreplay.com/en/integrations/sentry/), [Datadog](https://docs.openreplay.com/en/integrations/datadog/), [Elastic](https://docs.openreplay.com/en/integrations/elastic/), [Dynatrace](https://docs.openreplay.com/en/integrations/dynatrace/) y más. Además de tickets ([Jira](https://docs.openreplay.com/en/integrations/jira/), [GitHub](https://docs.openreplay.com/en/integrations/github/), [Zendesk](https://docs.openreplay.com/en/integrations/zendesk/)), mensajería ([Slack](https://docs.openreplay.com/en/integrations/slack/), [Microsoft Teams](https://docs.openreplay.com/en/integrations/msteams/)) y [Google Tag Manager](https://docs.openreplay.com/en/integrations/google-tag-manager/).

## Documentación y recursos

- [Documentación](https://docs.openreplay.com/) — guías, referencias de SDK e instrucciones de despliegue.
- [Guía de inicio](https://docs.openreplay.com/en/getting-started/) — de cero a tu primera sesión en ~30 minutos.
- [Blog](https://blog.openreplay.com/) — tutoriales, comparativas y análisis técnicos en profundidad.

## Comunidad y soporte

Empieza por la [documentación](https://docs.openreplay.com/) para resolver problemas comunes. Para más ayuda, contáctanos por cualquiera de estos canales:

- [Slack](https://slack.openreplay.com) — conecta con nuestros ingenieros y la comunidad.
- [Foro](https://forum.openreplay.com) — haz preguntas y explora debates anteriores.
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) — tutoriales y community calls anteriores.

## Contribuir

¡Siempre estamos atentos a las contribuciones y nos alegra que lo estés considerando! ¿No sabes por dónde empezar? Busca issues abiertas, preferiblemente las marcadas como «good first issue». Consulta nuestra [Guía de contribución](CONTRIBUTING.md) para más detalles, y no dudes en unirte a nuestro [Slack](https://slack.openreplay.com) para hacer preguntas, debatir ideas o conectar con otros colaboradores.

## Licencia

Este monorepo utiliza varias licencias. La mayor parte del código está bajo licencia **AGPLv3**, algunos directorios están bajo licencia **MIT**, y todo lo que se encuentra en el directorio `ee/` (la Enterprise Edition) está bajo una licencia comercial independiente definida en [`ee/LICENSE`](/ee/LICENSE). Los componentes de terceros conservan su licencia original.

Consulta [LICENSE](/LICENSE) para todos los detalles. ¿Preguntas? Escribe a license@openreplay.com.
