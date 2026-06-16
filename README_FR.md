<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
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
<h3 align="center">La plateforme d'expérience open source que vous hébergez vous-même</h3>
<p align="center">Session replay, cobrowsing et product analytics — auto-hébergés, pour que les données de vos utilisateurs ne quittent jamais votre infrastructure.</p>
<p align="center">
  <a href="https://github.com/openreplay/openreplay/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3%20%26%20more-394DFE" alt="Licence"></a>
  <a href="https://slack.openreplay.com"><img src="https://img.shields.io/badge/Slack-join-394DFE?logo=slack&logoColor=white" alt="Rejoignez-nous sur Slack"></a>
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

OpenReplay est une plateforme d'expérience open source que vous hébergez sur votre propre infrastructure. Rejouez les sessions de vos utilisateurs, déboguez avec tout le contexte technique, analysez l'usage de votre produit et co-naviguez en direct avec vos utilisateurs — sans envoyer la moindre session à un tiers. Tout ce qu'OpenReplay capture reste dans votre cloud, entièrement sous votre contrôle.

OpenReplay convient donc aux équipes qui ne peuvent pas confier les données de leurs clients à un fournisseur externe : aucun sous-traitant tiers, aucune revue de conformité interminable, et un alignement avec les normes réglementaires les plus strictes. Il est utilisé par les équipes d'ingénierie, de produit, de design et de support de grandes entreprises dans des secteurs très réglementés.

## Pourquoi OpenReplay

- **Vos données vous appartiennent.** Hébergez OpenReplay sur votre propre infrastructure (AWS, GCP, Azure, et plus encore). Les données de session ne quittent jamais votre périmètre de sécurité.
- **Confidentialité dès la conception.** Masquez, obscurcissez ou ignorez n'importe quelle donnée [au moment de la capture](https://docs.openreplay.com/en/sdk/sanitize-data/), avant même qu'elle n'atteigne vos serveurs. Activez le [mode privé](https://docs.openreplay.com/en/sdk/private-mode/) pour tout masquer par défaut.
- **Tout au même endroit.** Session replay, DevTools, product analytics et cobrowsing — au lieu d'assembler plusieurs outils distincts.
- **Léger.** Un traceur léger qui envoie un minimum de données de façon asynchrone, pour un impact très limité sur les performances.
- **Open source.** Lisez le code, hébergez-le gratuitement et contribuez. Aucune boîte noire.

## Fonctionnalités

- **[Session Replay](https://openreplay.com/product/feature/session-replay).** Revivez l'expérience de vos utilisateurs — où ils naviguent, cliquent, hésitent ou bloquent — et repérez chaque erreur, ralentissement ou plantage de leur parcours. Recherchez et filtrez par presque n'importe quelle action utilisateur, attribut de session ou événement technique — sans instrumentation.
- **[DevTools](https://openreplay.com/product/feature/developer-tools).** Déboguez comme si le bug s'était produit dans votre propre navigateur. Obtenez tout le contexte — activité réseau, logs console, erreurs JS, actions/état du store et plus de 40 métriques de performance — pour reproduire et corriger les problèmes instantanément.
- **[Product Analytics](https://docs.openreplay.com/en/product-analytics/).** Sachez quels parcours convertissent et où les utilisateurs décrochent, avec les [funnels](https://docs.openreplay.com/en/product-analytics/funnels/), [tendances](https://docs.openreplay.com/en/product-analytics/trends/), [parcours](https://docs.openreplay.com/en/product-analytics/journeys/), [heatmaps](https://docs.openreplay.com/en/product-analytics/heatmaps/) et [web analytics](https://docs.openreplay.com/en/product-analytics/web-analytics/) — le tout adossé aux session replays pour un contexte complet.
- **[Cobrowsing](https://docs.openreplay.com/en/plugins/assist/).** Assistez vos utilisateurs au moment crucial. Voyez leur écran en direct, prenez le contrôle du curseur avec leur autorisation et lancez un appel WebRTC — sans lien de réunion, sans téléchargement, sans logiciel de partage d'écran tiers.
- **[Spot](https://openreplay.com/platform/spot).** Une extension Chrome gratuite qui capture les bugs directement depuis le navigateur. Chaque enregistrement regroupe la console, le réseau et les détails d'environnement dont les développeurs ont besoin pour corriger le problème.
- **[Mobile](https://openreplay.com/product/feature/mobile).** Session replay natif pour les applications iOS, Android et React Native.

## Vos données vous appartiennent

OpenReplay a été conçu pour les équipes des secteurs réglementés et soucieux de la sécurité, qui ont besoin d'un contrôle total sur les données utilisateur.

- **Auto-hébergé.** Exécutez OpenReplay entièrement dans votre propre cloud ou sur site. Aucune donnée n'est partagée avec un tiers.
- **Assainissement à la capture.** Choisissez ce que vous capturez, obscurcissez ou ignorez, afin que les données sensibles n'atteignent même pas vos serveurs. Masquez par sélecteur CSS, expurgez les champs et assainissez les charges réseau. Voir [Assainissement des données](https://docs.openreplay.com/en/sdk/sanitize-data/).
- **Mode privé.** Masquez tout le texte et toutes les saisies par défaut — idéal pour les applications de santé, bancaires et juridiques. Voir [Mode privé](https://docs.openreplay.com/en/sdk/private-mode/).
- **Résistant aux bloqueurs de publicités.** Comme vous l'hébergez vous-même, le suivi est first-party et n'est pas bloqué par les bloqueurs de publicités : vous capturez des données complètes.
- **RGPD et CCPA.** Des outils intégrés pour assainir les données sensibles, gérer les exports et honorer les demandes de suppression.
- **Contrôle des accès.** Accès basé sur les rôles (Owner, Admin, Member) et SSO (SAML, OIDC) pour l'authentification en entreprise.
- **SOC 2 Type II.** OpenReplay Cloud est certifié SOC 2 Type II.

## Comment OpenReplay se compare

La plupart des outils de session replay et de product analytics sont des SaaS propriétaires : les données de vos utilisateurs sont capturées dans le cloud mutualisé d'un fournisseur, et votre contrôle s'arrête à une page de paramètres. OpenReplay est open source et offre toute la gamme des modèles de déploiement — y compris des options qu'aucun autre fournisseur ne propose — pour que la sécurité et la résidence des données restent votre décision.

En plus de l'auto-hébergement gratuit, vous pouvez exécuter OpenReplay de trois façons : **Serverless** (à l'usage, comme tout le monde), une instance **Dedicated** entièrement gérée avec résidence des données dans **plus de 50 régions**, ou **Bring-Your-Own-Cloud (BYOC)**, où nous déployons et gérons OpenReplay dans votre *propre* compte cloud, afin que les données de session ne le quittent jamais.

| Sécurité et confidentialité | OpenReplay | FullStory | LogRocket | PostHog |
| --- | :---: | :---: | :---: | :---: |
| Open source | ✅ | ❌ | ❌ | ✅ |
| Auto-hébergement en production (gratuit) | ✅ | ❌ | Entreprise uniquement <sup>1</sup> | Abandonné <sup>2</sup> |
| Cloud Serverless (à l'usage) | ✅ | ✅ | ✅ | ✅ |
| Cloud Dedicated | **50+ régions sur AWS/Azure/GCP** | ❌ | ❌ | ❌ |
| Bring-Your-Own-Cloud (BYOC) | ✅ | ❌ | ❌ | ❌ |
| Les données restent dans votre infrastructure | ✅ | ❌ | Entreprise uniquement | Version « hobby » uniquement |
| Aucun sous-traitant tiers | ✅ | ❌ | ⚠️ | ⚠️ |
| Masquage des données personnelles à la capture | ✅ | ✅ | ✅ | ✅ |

<sup>1</sup> LogRocket propose une version auto-hébergée, mais réservée aux clients entreprise. Elle est limitée et n'est pas open source.  
<sup>2</sup> PostHog est open source, mais son déploiement auto-hébergé (Kubernetes) est abandonné — seule une version « hobby » sous Docker subsiste, et les nouvelles fonctionnalités sortent uniquement dans le cloud.

## Déployez partout

OpenReplay peut être déployé n'importe où. Commencez par le [guide de démarrage](https://docs.openreplay.com/en/getting-started/). Il vous suffit d'une seule VM sur une base de 2 vCPU, 8 Go de RAM et 50 Go de stockage :

- [AWS](https://docs.openreplay.com/en/deployment/deploy-aws/)
- [Google Cloud](https://docs.openreplay.com/en/deployment/deploy-gcp/)
- [Azure](https://docs.openreplay.com/en/deployment/deploy-azure/)
- [DigitalOcean](https://docs.openreplay.com/en/deployment/deploy-digitalocean/)
- [Scaleway](https://docs.openreplay.com/en/deployment/deploy-scaleway/)
- [OVHcloud](https://docs.openreplay.com/en/deployment/deploy-ovhcloud/)
- [Kubernetes (Helm)](https://docs.openreplay.com/en/deployment/deploy-kubernetes/)
- [Docker](https://docs.openreplay.com/en/deployment/deploy-docker/)
- [Ubuntu (bare metal)](https://docs.openreplay.com/en/deployment/deploy-ubuntu/)
- [Depuis les sources](https://docs.openreplay.com/en/deployment/deploy-source/)

## OpenReplay Cloud

Vous préférez ne pas auto-héberger ? Exécutez OpenReplay dans notre cloud :

- **Serverless** — à l'usage, payez uniquement les sessions que vous enregistrez.
- **Dedicated** — une instance entièrement gérée, dans un VPC dédié, avec résidence des données dans plus de 50 régions.
- **Bring-Your-Own-Cloud (BYOC)** — nous exécutons et gérons OpenReplay dans votre propre compte AWS, GCP ou Azure.

Consultez les [tarifs](https://openreplay.com/pricing) pour plus de détails.

## SDK

- **Web** — un traceur JavaScript unique avec des guides pour [React](https://docs.openreplay.com/en/sdk/using-or/react/), [Next.js](https://docs.openreplay.com/en/sdk/using-or/next/), [Angular](https://docs.openreplay.com/en/sdk/using-or/angular/), [Vue](https://docs.openreplay.com/en/sdk/using-or/vue/), [Nuxt](https://docs.openreplay.com/en/sdk/using-or/nuxt/), [Svelte](https://docs.openreplay.com/en/sdk/using-or/svelte/), [Gatsby](https://docs.openreplay.com/en/sdk/using-or/gatsby/), [Remix](https://docs.openreplay.com/en/sdk/using-or/remix/), [Electron](https://docs.openreplay.com/en/sdk/using-or/electron/), ou un [snippet à intégrer](https://docs.openreplay.com/en/sdk/using-or/snippet/). Voir la [référence du SDK JavaScript](https://docs.openreplay.com/en/sdk/).
- **Mobile** — session replay natif pour [iOS](https://docs.openreplay.com/en/ios-sdk/), [Android](https://docs.openreplay.com/en/android-sdk/) et [React Native](https://docs.openreplay.com/en/rn-sdk/) (actuellement en bêta).

## Plugins et intégrations

Identifiez la cause racine plus vite en capturant l'état applicatif et le contexte backend en parallèle de chaque replay.

- **Gestion d'état :** [Redux](https://docs.openreplay.com/en/plugins/redux/), [VueX](https://docs.openreplay.com/en/plugins/vuex/), [Pinia](https://docs.openreplay.com/en/plugins/pinia/), [MobX](https://docs.openreplay.com/en/plugins/mobx/), [NgRx](https://docs.openreplay.com/en/plugins/ngrx/) et [Zustand](https://docs.openreplay.com/en/plugins/zustand/).
- **Réseau et performance :** [Fetch](https://docs.openreplay.com/en/plugins/fetch/), [Axios](https://docs.openreplay.com/en/plugins/axios/), [GraphQL](https://docs.openreplay.com/en/plugins/graphql/) (Apollo, Relay) et le [Profiler](https://docs.openreplay.com/en/plugins/profiler/).
- **Intégrations :** Synchronisez les logs backend et les erreurs avec vos replays pour voir ce qui s'est passé de bout en bout — [Sentry](https://docs.openreplay.com/en/integrations/sentry/), [Datadog](https://docs.openreplay.com/en/integrations/datadog/), [Elastic](https://docs.openreplay.com/en/integrations/elastic/), [Dynatrace](https://docs.openreplay.com/en/integrations/dynatrace/) et plus encore. Plus la gestion de tickets ([Jira](https://docs.openreplay.com/en/integrations/jira/), [GitHub](https://docs.openreplay.com/en/integrations/github/), [Zendesk](https://docs.openreplay.com/en/integrations/zendesk/)), la messagerie ([Slack](https://docs.openreplay.com/en/integrations/slack/), [Microsoft Teams](https://docs.openreplay.com/en/integrations/msteams/)) et [Google Tag Manager](https://docs.openreplay.com/en/integrations/google-tag-manager/).

## Documentation et ressources

- [Documentation](https://docs.openreplay.com/) — guides, références SDK et instructions de déploiement.
- [Guide de démarrage](https://docs.openreplay.com/en/getting-started/) — de zéro à votre première session en ~30 minutes.
- [Blog](https://blog.openreplay.com/) — tutoriels, comparatifs et analyses techniques approfondies.

## Communauté et support

Commencez par la [documentation](https://docs.openreplay.com/) pour résoudre les problèmes courants. Pour plus d'aide, contactez-nous sur l'un de ces canaux :

- [Slack](https://slack.openreplay.com) — échangez avec nos ingénieurs et la communauté.
- [Forum](https://forum.openreplay.com) — posez vos questions et parcourez les discussions passées.
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) — tutoriels et community calls passés.

## Contribuer

Nous sommes toujours à la recherche de contributions, et nous sommes ravis que vous l'envisagiez ! Vous ne savez pas par où commencer ? Cherchez les issues ouvertes, de préférence celles marquées « good first issue ». Consultez notre [Guide de contribution](CONTRIBUTING.md) pour plus de détails, et n'hésitez pas à rejoindre notre [Slack](https://slack.openreplay.com) pour poser des questions, discuter d'idées ou échanger avec d'autres contributeurs.

## Licence

Ce monorepo utilise plusieurs licences. La majeure partie du code est sous licence **AGPLv3**, certains répertoires sont sous licence **MIT**, et tout ce qui se trouve dans le répertoire `ee/` (l'Enterprise Edition) est sous une licence commerciale distincte définie dans [`ee/LICENSE`](/ee/LICENSE). Les composants tiers conservent leur licence d'origine.

Voir [LICENSE](/LICENSE) pour tous les détails. Des questions ? Écrivez à license@openreplay.com.
