/// OpenReplay session replay for Flutter.
///
/// Wrap the app in [OpenReplayWidget], then start the tracker:
///
/// ```dart
/// void main() {
///   runApp(OpenReplayWidget(child: MyApp()));
/// }
///
/// // somewhere after the first frame
/// await OpenReplay.instance.start(projectKey: 'your-project-key');
/// ```
library;

export 'src/capture/sanitized.dart' show ORSanitizedView;
export 'src/listeners/analytics.dart' show ORNavigatorObserver, ORTrackedView;
export 'src/listeners/network_options.dart'
    show ORNetworkOptions, ORRequestResponse;
export 'src/openreplay.dart' show OpenReplay, kTrackerVersion;
export 'src/options.dart' show OROptions, RecordingQuality, ScreenshotBatchSize;
export 'src/widget.dart' show OpenReplayWidget;
