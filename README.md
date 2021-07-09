<p align="center">
  <a href="https://openreplay.com">
    <img src="static/logo.svg" height="70">
  </a>
</p>

<h3 align="center">Session replay for developers</h3>
<p align="center">The most advanced open-source session replay to build delightful web apps.</p>

<p align="center">
  <a href="https://docs.openreplay.com/deployment/deploy-aws">
    <img src="static/deploy-aws.png" height="35"/>
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-gcp">
    <img src="static/deploy-gcp.png" height="35" />
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-azure">
    <img src="static/deploy-azure.png" height="35" />
  </a>

  <a href="https://docs.openreplay.com/deployment/deploy-digitalocean">
    <img src="static/deploy-do.png" height="35" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/openreplay/openreplay">
    <img src="static/overview.png">
  </a>
</p>

OpenReplay is a session replay stack that lets you see what users do on your web app, helping you troubleshoot issues faster. It's the only open-source alternative to products such as FullStory and LogRocket.

- **Session replay.** OpenReplay replays what users do, but not only. It also shows you what went under the hood, how your website or app behaves by capturing network activity, console logs, JS errors, store actions/state, page speed metrics, cpu/memory usage and much more.
- **Low footprint**. With a ~16KB (.gz) tracker that asynchronously sends minimal data for a very limited impact on performance.
- **Self-hosted**. No more security compliance checks, 3rd-parties processing user data. Everything OpenReplay captures stays in your cloud for a complete control over your data.
- **Privacy controls**. Fine-grained security features for sanitizing user data.
- **Easy deploy**. With support of major public cloud providers (AWS, GCP, Azure, DigitalOcean).

## Features

- **Session replay:** Lets you relive your users' experience, see where they struggle and how it affects their behavior. Each session replay is automatically analyzed based on heuristics, for easy triage.
- **Omni-search:** Search and filter by almost any user action/criteria, session attribute or technical event, so you can answer any question. No instrumentation required.
- **Funnels:** For surfacing the most impactful issues causing conversion and revenue loss.
- **DevTools:** It's like debugging in your own browser. OpenReplay provides you with the full context so you can instantly reproduce bugs and understand performance issues.
- **Error tracking:** JS errors are captured and sync'ed with session replays. Upload your source-maps and see the source code right in the stack trace.
- **Performance metrics:** Ready-to-use dashboard with 40+ metrics to keep an eye on your web app's performance. Alerts keep you notified when critical slowdowns occur.
- **Fine-grained privacy controls:** Choose what to capture, what to obscure or what to ignore so user data doesn't even reach your servers.
- **Plugins oriented:** Get to the root cause even faster by tracking application state (Redux, VueX, MobX, NgRx) and logging GraphQL queries (Apollo, Relay) and Fetch requests.
- **Integrations:** Sync your backend logs with your session replays and see what happened front-to-back. OpenReplay supports Sentry, Datadog, CloudWatch, Stackdriver, Elastic and more.

## Deployment Options

OpenReplay can be deployed anywhere. Follow our step-by-step guides for deploying it on major public clouds:

- [AWS](https://docs.openreplay.com/deployment/deploy-aws)
- [Google Cloud](https://docs.openreplay.com/deployment/deploy-gcp)
- [Azure](https://docs.openreplay.com/deployment/deploy-azure)
- [Digital Ocean](https://docs.openreplay.com/deployment/deploy-digitalocean)
- [Scaleway](https://docs.openreplay.com/deployment/deploy-scaleway)
- [Kubernetes](https://docs.openreplay.com/deployment/deploy-kubernetes)

## OpenReplay Cloud

For those who want to simply use OpenReplay as a service, [sign up](https://asayer.io/register.html) for a free account on our cloud offering.

## Community Support

Please refer to the [official OpenReplay documentation](https://docs.openreplay.com/). That should help you troubleshoot common issues. For additional help, you can reach out to us on one of these channels:

- [Slack](https://slack.openreplay.com) (Connect with our engineers and community)
- [GitHub](https://github.com/openreplay/openreplay/issues) (Bug and issue reports)
- [Twitter](https://twitter.com/OpenReplayHQ) (Product updates, Great content)
- [Website chat](https://openreplay.com) (Talk to us)

## Contributing

We're always on the lookout for contributions to OpenReplay, and we're glad you're considering it! Not sure where to start? Look for open issues, preferably those marked as good first issues.

See our [Contributing Guide](CONTRIBUTING.md) for more details.

Also, feel free to join our [Slack](https://slack.openreplay.com) to ask questions, discuss ideas or connect with our  contributors.

## Roadmap

Check out our [roadmap](https://www.notion.so/openreplay/Roadmap-889d2c3d968b4786ab9b281ab2394a94) and keep an eye on what's coming next. You're free to [submit](https://github.com/openreplay/openreplay/issues/new) new ideas and vote on features.

## License

This repo is entirely MIT licensed, with the exception of the `ee` directory.
