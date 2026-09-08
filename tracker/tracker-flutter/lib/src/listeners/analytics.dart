import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import '../debug.dart';
import '../proto/messages.gen.dart';
import '../transport/message_collector.dart';
import 'labels.dart';

/// Distance in logical pixels above which a touch counts as a swipe.
/// Matches `TouchTracking.capture` in Analytics.swift.
const double _swipeThreshold = 10;

/// Port of Analytics / TouchTracking in Analytics.swift.
///
/// Touches are observed through the pointer router's global route, which sees
/// every pointer event without competing in the gesture arena - so it can
/// never swallow a tap the app needed.
class Analytics {
  Analytics._();
  static final Analytics shared = Analytics._();

  bool enabled = false;

  final Map<int, Offset> _down = {};
  bool _routeAttached = false;

  void start() {
    enabled = true;
    if (_routeAttached) return;
    GestureBinding.instance.pointerRouter.addGlobalRoute(_handlePointer);
    _routeAttached = true;
  }

  void stop() {
    enabled = false;
    if (_routeAttached) {
      GestureBinding.instance.pointerRouter.removeGlobalRoute(_handlePointer);
      _routeAttached = false;
    }
    _down.clear();
    annotatedLabels.clear();
  }

  void _handlePointer(PointerEvent event) {
    if (!enabled) return;

    if (event is PointerDownEvent) {
      _down[event.pointer] = event.position;
      return;
    }
    if (event is PointerCancelEvent) {
      _down.remove(event.pointer);
      return;
    }
    if (event is! PointerUpEvent) return;

    final start = _down.remove(event.pointer);
    if (start == null) return;

    final end = event.position;
    final label = _labelAt(end, event.viewId);
    final x = end.dx.clamp(0, double.infinity).round();
    final y = end.dy.clamp(0, double.infinity).round();

    if ((end - start).distance > _swipeThreshold) {
      sendSwipe(label: label, x: x, y: y, direction: _direction(start, end));
    } else {
      sendClick(label: label, x: x, y: y);
    }
  }

  String _labelAt(Offset position, int viewId) {
    try {
      final result = HitTestResult();
      WidgetsBinding.instance.hitTestInView(result, position, viewId);
      return labelForHitTest(result.path);
    } on Object catch (e) {
      DebugUtils.error('hit test failed: $e');
      return 'View';
    }
  }

  /// Dominant axis, defaulting to `right` on an exact tie - as the iOS SDK does.
  static String _direction(Offset from, Offset to) {
    final dx = to.dx - from.dx;
    final dy = to.dy - from.dy;
    if (dx.abs() > dy.abs()) return dx > 0 ? 'right' : 'left';
    if (dy.abs() > dx.abs()) return dy > 0 ? 'down' : 'up';
    return 'right';
  }

  void sendClick({required String label, required int x, required int y}) {
    if (!enabled) return;
    MessageCollector.shared
        .sendMessage(ORMobileClickEvent(label: label, x: x, y: y));
  }

  void sendSwipe({
    required String label,
    required int x,
    required int y,
    required String direction,
  }) {
    if (!enabled) return;
    MessageCollector.shared.sendMessage(
      ORMobileSwipeEvent(label: label, x: x, y: y, direction: direction),
    );
  }

  void sendViewComponent({
    required String screenName,
    required String viewName,
    required bool visible,
  }) {
    if (!enabled) return;
    MessageCollector.shared.sendMessage(
      ORMobileViewComponentEvent(
        screenName: screenName,
        viewName: viewName,
        visible: visible,
      ),
    );
  }

  /// Viewport change, sent when the window is resized or rotated.
  void sendScreenChange(Size size) {
    MessageCollector.shared.sendMessage(
      ORMobileScreenChanges(
        x: 0,
        y: 0,
        width: size.width.round(),
        height: size.height.round(),
      ),
    );
  }

  /// Debounced, matching `sendDebouncedMessage` - text bindings fire per
  /// keystroke.
  void sendInput({
    required String value,
    required String label,
    required bool masked,
  }) {
    if (!enabled) return;
    MessageCollector.shared.sendDebouncedMessage(
      ORMobileInputEvent(
        value: masked ? '****' : value,
        valueMasked: masked,
        label: label,
      ),
    );
  }
}

/// Reports its region to the tracker as a named, observable view, and emits
/// visibility events on mount and unmount.
///
/// Port of `observeView(screenName:viewName:)` in Analytics.swift.
class ORTrackedView extends StatefulWidget {
  const ORTrackedView({
    required this.screenName,
    required this.viewName,
    required this.child,
    super.key,
  });

  final String screenName;
  final String viewName;
  final Widget child;

  @override
  State<ORTrackedView> createState() => _ORTrackedViewState();
}

class _ORTrackedViewState extends State<ORTrackedView> {
  final GlobalKey _key = GlobalKey();

  @override
  void initState() {
    super.initState();
    Analytics.shared.sendViewComponent(
      screenName: widget.screenName,
      viewName: widget.viewName,
      visible: true,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _annotate());
  }

  void _annotate() {
    final node = _key.currentContext?.findRenderObject();
    if (node != null) annotatedLabels[node] = widget.viewName;
  }

  @override
  void dispose() {
    final node = _key.currentContext?.findRenderObject();
    if (node != null) annotatedLabels.remove(node);
    Analytics.shared.sendViewComponent(
      screenName: widget.screenName,
      viewName: widget.viewName,
      visible: false,
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      KeyedSubtree(key: _key, child: widget.child);
}

/// Emits screen events as routes are pushed and popped.
///
/// `route.settings.name` is null unless the app uses named routes, so an
/// unnamed route falls back to its position in the stack rather than reporting
/// nothing.
class ORNavigatorObserver extends NavigatorObserver {
  int _depth = 0;

  @override
  void didPush(Route<Object?> route, Route<Object?>? previousRoute) {
    _depth++;
    _emit(route, visible: true);
  }

  @override
  void didPop(Route<Object?> route, Route<Object?>? previousRoute) {
    _emit(route, visible: false);
    _depth = _depth > 0 ? _depth - 1 : 0;
  }

  @override
  void didReplace({Route<Object?>? newRoute, Route<Object?>? oldRoute}) {
    if (oldRoute != null) _emit(oldRoute, visible: false);
    if (newRoute != null) _emit(newRoute, visible: true);
  }

  void _emit(Route<Object?> route, {required bool visible}) {
    final name = route.settings.name ?? 'route/$_depth';
    Analytics.shared
        .sendViewComponent(screenName: name, viewName: name, visible: visible);
  }
}
