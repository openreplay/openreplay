<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_ESP.md">Español</a>
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

<h3 align="center">Relecture de session pour développeurs</h3>
<p align="center">La relecture de session la plus avancée sur le marché pour des applications perfectionnées.</p>

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

OpenReplay est une suite d'outils de relecture (appelée aussi "replay") de sessions que vous pouvez héberger vous-même, vous permettant de voir ce que les utilisateurs font sur une application web ou mobile, vous aidant ainsi à résoudre différents types de problèmes plus rapidement.

- **Relecture de session**. OpenReplay rejoue ce que les utilisateurs font, mais pas seulement. Il vous montre également ce qui se passe en coulisse, comment votre site web ou votre application se comporte en capturant l'activité réseau, les journaux de console, les erreurs JS, les actions/états du store, les métriques de chargement des pages, l'utilisation du CPU/mémoire, et bien plus encore. En plus des applications web, les applications iOS et React Native sont également prises en charge (les versions Android et Flutter seront bientôt disponibles).
- **Faible empreinte**. Avec un traqueur d'environ 26 Ko (.br) qui envoie de manière asynchrone des données minimales, ce qui a un impact très limité sur les performances.
- **Auto-hébergé**. Plus de vérifications de conformité en matière de sécurité, plus de traitement des données des utilisateurs par des tiers. Tout ce qu'OpenReplay capture reste dans votre cloud pour un contrôle complet sur vos données.
- **Contrôles de confidentialité**. Fonctionnalités de sécurité détaillées pour la désinfection des données utilisateur.
- **Déploiement facile**. Avec le support des principaux fournisseurs de cloud public (AWS, GCP, Azure, DigitalOcean).

## Fonctionnalités

- **Relecture de session :** Vous permet de revivre l'expérience de vos utilisateurs, de voir où ils rencontrent des problèmes et comment cela affecte leur comportement. Chaque relecture de session est automatiquement analysée en se basant sur des heuristiques, pour un triage plus facile des problèmes en fonction de l'impact.
- **Outils de développement (DevTools) :** C'est comme déboguer dans votre propre navigateur. OpenReplay vous fournit le contexte complet (activité réseau, erreurs JS, actions/états du store et plus de 40 métriques) pour que vous puissiez instantanément reproduire les bugs et comprendre les problèmes de performance.
- **Assistance (Assist) :** Vous aide à soutenir vos utilisateurs en voyant leur écran en direct et en vous connectant instantanément avec eux via appel/vidéo (WebRTC), sans nécessiter de logiciel tiers de partage d'écran.
- **Drapeaux de fonctionnalité :** Activer ou désactiver une fonctionnalité, faire des déploiements progressifs et des tests A/B sans avoir à redéployer votre application.
- **Recherche universelle (Omni-search) :** Recherchez et filtrez presque n'importe quelle action/critère utilisateur, attribut de session ou événement technique, afin de pouvoir répondre à n'importe quelle question. Aucune instrumentation requise.
- **Entonnoirs (Funnels) :** Pour mettre en évidence les problèmes les plus impactants entraînant une conversion et une perte de revenus.
- **Contrôles de confidentialité détaillés :** Choisissez ce que vous voulez capturer, ce que vous voulez obscurcir ou ignorer, de sorte que les données utilisateur n'atteignent même pas vos serveurs.
- **Orienté vers les plugins :** Corrigez plus rapidement les bogues en suivant l'état de l'application (Redux, VueX, MobX, NgRx, Pinia et Zustand) et enregistrant les requêtes GraphQL (Apollo, Relay) et les requêtes Fetch/Axios.
- **Intégrations :** Synchronisez vos journaux backend avec vos relectures de sessions et voyez ce qui s'est passé du début à la fin. OpenReplay prend en charge Sentry, Datadog, CloudWatch, Stackdriver, Elastic et bien d'autres.

## Options de déploiement

OpenReplay peut être déployé n'importe où. Suivez nos guides détaillés pour le déployer sur les principaux clouds publics :

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [OVHcloud](https://docs.openreplay.com/deployment/deploy-ovhcloud)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## OpenReplay Cloud

Pour ceux qui veulent simplement utiliser OpenReplay en tant que service, [inscrivez-vous](https://app.openreplay.com/signup) pour un compte gratuit sur notre offre cloud.

## Support de la communauté

Veuillez vous référer à la [documentation officielle d'OpenReplay](https://docs.openreplay.com/). Cela devrait vous aider à résoudre les problèmes courants. Pour toute aide ou question supplémentaire, vous pouvez nous contacter sur l'un des canaux suivants :

- [Slack](https://slack.openreplay.com) (Connectez-vous avec nos ingénieurs et notre communauté)
- [GitHub](https://github.com/openreplay/openreplay/issues) (Rapports de bogues et problèmes)
- [Twitter](https://twitter.com/OpenReplayHQ) (Mises à jour du produit, articles techniques et autres annonces)
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) (Tutoriels)
- [Chat sur le site Web](https://openreplay.com) (Nous contacter)

## Contribution

Nous sommes toujours à la recherche de contributions pour rendre OpenReplay meilleur. Vous ne savez pas par où commencer ? Recherchez dans notre "GitHub Issues" pour trouver des tickets ouverts, de préférence ceux marqués comme "bonnes premières contributions".

Consultez notre [Guide de contribution](CONTRIBUTING.md) pour plus de détails.

N'hésitez pas à rejoindre notre [Slack](https://slack.openreplay.com) pour poser des questions, discuter vos idées ou simplement pour vous connecter avec nos contributeurs.

## Feuille de route

Consultez notre [feuille de route](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) et gardez un œil sur ce qui arrive prochainement. Vous êtes libre de [proposer](https://github.com/openreplay/openreplay/issues/new) de nouvelles idées et de voter pour des fonctionnalités.

## Licence

Ce monorepo utilise plusieurs licences. Consultez [LICENSE](/LICENSE) pour plus de détails.
