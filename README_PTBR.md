<p align="center">
  <a href="/README.md">English</a>
  &nbsp;|&nbsp;
  <a href="/README_FR.md">Français</a>
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

<h3 align="center">Session replay para desenvolvedores</h3>
<p align="center">O session replay mais avançado para criar aplicativos web incríveis.</p>

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

O OpenReplay é um session replay suite que você mesmo pode hospedar e que permite ver o que os usuários fazem em seus aplicativos web e móveis, ajudando a solucionar problemas com mais rapidez.

- **Session replay**. OpenReplay reproduz o que os usuários fazem, mas não apenas isso. Ele também mostra o que aconteceu por baixo dos panos, como seu site ou aplicativo se comporta, capturando atividades de rede, logs de console, erros de JS, estado/actions do store, métricas de velocidade de página, uso de CPU/memória e muito mais. Além de aplicativos web, apps iOS e React Native também são suportados (Android e Flutter serão lançados em breve).
- **Tamanho ínfimo**. Com um rastreador de aproximadamente 26 KB (.br)  que envia dados mínimos de forma assíncrona para um impacto muito limitado no desempenho.
- **Self-hosted**. Chega de verificações de compliance de segurança e processamento de dados de usuários por terceiros. Tudo o que o OpenReplay captura permanece na sua cloud para um controle completo sobre seus dados.
- **Controles de privacidade**. Recursos de segurança detalhados para sanitizar dados de usuário.
- **Deploy fácil**. Com suporte aos principais provedores de nuvem pública (AWS, GCP, Azure, DigitalOcean).

## Funcionalidades

- **Session replay:** Permite que você reviva a experiência dos seus usuários, veja onde eles têm dificuldades e como isso afeta o comportamento deles. Cada session replay é analisado automaticamente com base em heurísticas, para facilitar a triagem.
- **DevTools:** Tal como debugar em seu próprio navegador. O OpenReplay fornece o contexto completo (atividade de rede, erros de JS, estado/actions do store e mais de 40 métricas) para que você possa reproduzir bugs instantaneamente e entender problemas de desempenho.
- **Assistência (Assist):** Ajuda você a dar suporte aos seus usuários vendo suas telas ao vivo e entrando instantaneamente em chamada (WebRTC) com eles sem precisar de nenhum software de compartilhamento de tela de terceiros.
- **Feature flags:** Habilite ou desabilite uma funcionalidade, faça releases graduais e testes A/B, tudo isso sem fazer o redeploy do seu aplicativo.
- **Pesquisa universal (Omni-search):** Pesquise e filtre por praticamente qualquer ação/critério do usuário, atributo de sessão ou evento técnico, para que possa responder a qualquer pergunta. Não é necessária instrumentação.
- **Analytics:** Para revelar os problemas mais impactantes que causam perda de receita e conversão.
- **Controles de privacidade detalhados:** Escolha o que capturar, o que ocultar ou o que ignorar para que os dados do usuário sequer cheguem aos seus servidores.
- **Orientado a plugins:** Chegue à causa raiz ainda mais rápido rastreando o estado do aplicativo (Redux, VueX, MobX, NgRx, Pinia e Zustand) e registrando queries GraphQL (Apollo, Relay) e requisições Fetch/Axios.
- **Intregrações:** Sincronize seus logs de back-end com os session replays e veja o que aconteceu de ponta a ponta. O OpenReplay é compatível com Sentry, Datadog, CloudWatch, Stackdriver, Elastic e muito mais.

## Opções de Deploy

O OpenReplay pode ser instalado em qualquer lugar. Siga nossos guias passo a passo para instalá-lo nas principais nuvens públicas:

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [OVHcloud](https://docs.openreplay.com/deployment/deploy-ovhcloud)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## OpenReplay Cloud

Para aqueles que desejam simplesmente usar o OpenReplay como um serviço, [inscreva-se](https://app.openreplay.com/signup) para obter uma conta gratuita em nossa oferta de cloud.

## Suporte da Comunidade

Consulte a [documentação oficial do OpenReplay](https://docs.openreplay.com/). Isso deve ajudá-lo a solucionar problemas comuns. Para obter ajuda adicional, você pode entrar em contato conosco em um desses canais:

- [Slack](https://slack.openreplay.com) (Conecte-se com nossos engenheiros e a comunidade)
- [GitHub](https://github.com/openreplay/openreplay/issues) (Informes de bugs e problemas)
- [Twitter](https://twitter.com/OpenReplayHQ) (Atualizações de produtos, ótimo conteúdo)
- [YouTube](https://www.youtube.com/channel/UCcnWlW-5wEuuPAwjTR1Ydxw) (tutoriais, Community Calls anteriores)
- [Chat no site](https://openreplay.com) (Fale com a gente)

## Contribuições

Estamos sempre em busca de contribuições para o OpenReplay e estamos felizes por você estar pensando nisso! Não sabe por onde começar? Procure por issues abertas, de preferência aquelas com a tag "good first issue".

Consulte nosso [Guia de contribuição](CONTRIBUTING.md) para obter mais detalhes.

Além disso, fique à vontade para entrar em nosso [Slack](https://slack.openreplay.com) para fazer perguntas, discutir ideias ou se conectar com nossos colaboradores.

## Roadmap

Confira nosso [roadmap](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) e fique de olho no que está por vir. Você pode [enviar](https://github.com/openreplay/openreplay/issues/new) novas ideias e votar por funcionalidades.

## Licença

Este monorepo usa várias licenças. Consulte [LICENSE](/LICENSE) para obter mais detalhes.
