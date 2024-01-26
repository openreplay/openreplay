<p align="center">
  <a href="/README_FR.md">Français</a>
  &nbsp;|&nbsp;
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_RU.md">Русский</a>
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

<h3 align="center">Reproducción de sesiones para desarrolladores</h3>
<p align="center">La reproducción de sesiones más avanzada para crear aplicaciones web encantadoras.</p>

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

OpenReplay es una suite de retransmisión de sesiones que puedes alojar tú mismo, lo que te permite ver lo que hacen los usuarios en tu aplicación web y móviles y ayudarte a solucionar problemas más rápido.

- **Reproducción de sesiones**. OpenReplay reproduce lo que hacen los usuarios, pero no solo eso. También te muestra lo que ocurre bajo el capó, cómo se comporta tu sitio web o aplicación al capturar la actividad de la red, registros de la consola, errores de JavaScript, acciones/estado del almacén, métricas de velocidad de la página, uso de CPU/memoria y mucho más. Además de las aplicaciones web, las aplicaciones de iOS y React Native también son compatibles (las versiones de Android y Flutter saldrán pronto).
- **Huella reducida.** Con un rastreador de aproximadamente 26 KB (.br) que envía datos mínimos de forma asíncrona, lo que tiene un impacto muy limitado en el rendimiento.
- **Auto-alojado.** No más verificaciones de cumplimiento de seguridad, procesamiento de datos de usuario por terceros. Todo lo que OpenReplay captura se queda en tu nube para un control completo sobre tus datos.
- **Controles de privacidad.** Funciones de seguridad detalladas para desinfectar los datos de usuario.
- **Despliegue sencillo.** Con el soporte de los principales proveedores de nube pública (AWS, GCP, Azure, DigitalOcean).

## Características

- **Reproducción de sesiones:** Te permite revivir la experiencia de tus usuarios, ver dónde encuentran dificultades y cómo afecta su comportamiento. Cada reproducción de sesión se analiza automáticamente en función de heurísticas, para un triaje sencillo.
- **Herramientas de desarrollo (DevTools):** Es como depurar en tu propio navegador. OpenReplay te proporciona el contexto completo (actividad de red, errores de JavaScript, acciones/estado del almacén y más de 40 métricas) para que puedas reproducir instantáneamente errores y entender problemas de rendimiento.
- **Asistencia (Assist):** Te ayuda a brindar soporte a tus usuarios al ver su pantalla en tiempo real y unirte instantáneamente a una llamada (WebRTC) con ellos, sin necesidad de software de uso compartido de pantalla de terceros.
- **Banderas de características:** Habilitar o deshabilitar una característica, hacer lanzamientos graduales y pruebas A/B sin necesidad de volver a desplegar tu aplicación.
- **Búsqueda universal (Omni-search):** Busca y filtra por casi cualquier acción/criterio de usuario, atributo de sesión o evento técnico, para que puedas responder a cualquier pregunta. No se requiere instrumentación.
- **Embudos (Funnels):** Para resaltar los problemas más impactantes que causan la conversión y la pérdida de ingresos.
- **Controles de privacidad detallados:** Elige qué capturar, qué ocultar o qué ignorar para que los datos de usuario ni siquiera lleguen a tus servidores.
- **Orientado a complementos (Plugins oriented):** Llega más rápido a la causa raíz siguiendo el estado de la aplicación (Redux, VueX, MobX, NgRx, Pinia y Zustand) y registrando consultas GraphQL (Apollo, Relay) y solicitudes Fetch/Axios.
- **Integraciones:** Sincroniza tus registros del servidor con tus repeticiones de sesiones y observa lo que sucedió de principio a fin. OpenReplay es compatible con Sentry, Datadog, CloudWatch, Stackdriver, Elastic y más.

## Opciones de implementación

OpenReplay se puede implementar en cualquier lugar. Sigue nuestras guías paso a paso para implementarlo en los principales servicios de nube pública:

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [OVHcloud](https://docs.openreplay.com/deployment/deploy-ovhcloud)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## OpenReplay Cloud

Para aquellos que desean usar OpenReplay como un servicio, [regístrate](https://app.openreplay.com/signup) para obtener una cuenta gratuita en nuestra oferta en la nube.

## Soporte de la comunidad

Consulta la [documentación oficial de OpenReplay](https://docs.openreplay.com/). Eso debería ayudarte a solucionar problemas comunes. Para obtener ayuda adicional, puedes contactarnos a través de uno de estos canales:

- [Slack](https://slack.openreplay.com) (Conéctate con nuestros ingenieros y la comunidad)
- [GitHub](https://github.com/openreplay/openreplay/issues) (Informes de errores y problemas)
- [Twitter](https://twitter.com/OpenReplayHQ) (Actualizaciones del producto, contenido excelente)
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) (Tutoriales, reuniones comunitarias anteriores)
- [Chat en el sitio web](https://openreplay.com) (Háblanos)

## Contribución

Siempre estamos buscando contribuciones para OpenReplay, ¡y nos alegra que lo estés considerando! ¿No estás seguro por dónde empezar? Busca problemas abiertos, preferiblemente aquellos marcados como "buenas primeras contribuciones".

Consulta nuestra [Guía de Contribución](CONTRIBUTING.md) para obtener más detalles.

Además, no dudes en unirte a nuestro [Slack](https://slack.openreplay.com) para hacer preguntas, discutir ideas o conectarte con nuestros colaboradores.

## Hoja de ruta

Consulta nuestra [hoja de ruta](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) y mantente atento a lo que viene a continuación. Eres libre de [enviar](https://github.com/openreplay/openreplay/issues/new) nuevas ideas y votar por funciones.

## Licencia

Este monorepo utiliza varias licencias. Consulta [LICENSE](/LICENSE) para obtener más detalles.
