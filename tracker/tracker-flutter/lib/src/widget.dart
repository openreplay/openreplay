import 'package:flutter/widgets.dart';

import 'capture/screenshot_manager.dart';

/// Wraps the app in the repaint boundary the recorder captures from.
///
/// A boundary is required: `toImage` reads a layer, and only a
/// [RepaintBoundary] gives the app's own subtree one. Sentry and PostHog's
/// Flutter SDKs take the same approach.
///
/// ```dart
/// void main() => runApp(OpenReplayWidget(child: MyApp()));
/// ```
class OpenReplayWidget extends StatefulWidget {
  const OpenReplayWidget({required this.child, super.key});

  final Widget child;

  @override
  State<OpenReplayWidget> createState() => _OpenReplayWidgetState();
}

class _OpenReplayWidgetState extends State<OpenReplayWidget> {
  final GlobalKey _boundaryKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    ScreenshotManager.shared.boundaryKey = _boundaryKey;
  }

  @override
  void dispose() {
    if (ScreenshotManager.shared.boundaryKey == _boundaryKey) {
      ScreenshotManager.shared.boundaryKey = null;
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      RepaintBoundary(key: _boundaryKey, child: widget.child);
}
