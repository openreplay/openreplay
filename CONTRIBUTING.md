We're glad you're considering contributing to OpenReplay. Each and every contribution is highly appreciated. Don't worry if you're not sure how to get things started. Although we don't want a wall of rules to stand in the way of your contribution, this document should give a bit more guidance on the best way to proceed. If you still have questions, reach out for help.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## First-time Contributors

We appreciate all contributions, especially those coming from first time contributors. Good first issues is the best way start. If you're not sure how to help, feel free to reach out anytime for assistance via [email](mailto:hey@openreplay.com) or [Slack](https://slack.openreplay.com). All contributors must approve our [Contributor License Agreement](https://cla-assistant.io/openreplay/openreplay).

## Areas for Contributing

### Documentation

We want to keep our docs comprehensive, concise and updated. We are grateful for any kind of contribution in this area:
- Report missing sections
- Fix errors in the existing docs
- Add content to the docs

### Community Content

We're happy about contributions that participate in educating our community, such as:
- Writing technical blog post
- Adding new user guides
- Organizing a workshop
- Speaking at an event

We have a repo dedicated to community content. Feel free to submit a pull request in this repo, if you have something to add even if it's not related to what's mentioned above.

### OpenReplay Core

We have some issues on core components that are suitable for open source contributions. If you know Go or JavaScript, check out our issue list.

## Ways to Contribute

### Writing Code

We love all code contributions, big or small. A few things to keep in mind:

- Please make sure there is an issue associated with what you're working on
- If you're tackling an issue, please comment on that to prevent duplicate work by others
- We follow the [fork-and-branch](https://blog.scottlowe.org/2015/01/27/using-fork-branch-git-workflow/) approach
- Squash your commits and refer to the issue using `fix #<issue-no>` in the commit message
- Rebase master with your branch before submitting a pull request.

If you're planning to work on a bigger feature that is not on the list of issues, please raise an issue first so we can check whether it makes sense for OpenReplay as a whole.

Check our Review Process below.

### Reporting Bugs

Bug reports help us make OpenReplay better for everyone. Before raising a new issue:
- Search within the list of reported bugs so you're not dealing with a duplicate
- Make sure you test against the last released version (we may have fixed it already)
- Provide clear steps to reproduce the issue and attach logs if relevant

### Reporting Security Flaws

Please do not create a public GitHub issue. If you find a security flaw, please email us directly at [security@openreplay.com](mailto:security@openreplay.com) instead of raising an issue.

### Upvoting Issues and Requesting Features

Upvoting issues and requesting new features is the best way to tell us what you'd like us to build and helps prioritize our efforts. Don't refrain from doing that but make sure to watch out for duplicates by looking at the feature-request list.

## Review Process

We try to answer the below questions when reviewing a PR:
- Does the PR fix the issue?
- Does the proposed solution makes sense?
- How will it perform with millions of sessions and users events?
- Has it been tested?
- Is it introducing any security flaws?
- Did the contributor approve our CLA?

Once your PR passes, we will merge it. Otherwise, we'll politely ask you to make a change.
