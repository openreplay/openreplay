import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

import 'screenshot_manager.dart';

/// Marks its subtree as sensitive so it is masked in the replay.
///
/// Unlike the React Native connector - which has to render an invisible
/// absolutely-positioned sibling to dodge a Fabric interop layout bug - this
/// can wrap its child directly, because nothing native is involved.
class ORSanitizedView extends SingleChildRenderObjectWidget {
  const ORSanitizedView({required Widget super.child, super.key});

  @override
  RenderObject createRenderObject(BuildContext context) => RenderORSanitized();
}

/// Registers itself with the capture pipeline for as long as it is in the tree.
class RenderORSanitized extends RenderProxyBox {
  @override
  void attach(PipelineOwner owner) {
    super.attach(owner);
    ScreenshotManager.shared.addSanitized(this);
  }

  @override
  void detach() {
    ScreenshotManager.shared.removeSanitized(this);
    super.detach();
  }
}
