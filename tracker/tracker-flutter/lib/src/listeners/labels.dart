import 'package:flutter/rendering.dart';

/// Longest label we send; matches nothing in the iOS SDK, which uses whole
/// strings, but keeps message sizes sane for long paragraphs.
const int _maxLabelLength = 80;

/// Best-effort human label for whatever sits under a touch.
///
/// The iOS SDK reads UIKit class names and their text
/// (`getViewDescription`). Flutter has no equivalent that survives release
/// builds: `--obfuscate` renames symbols, so `runtimeType.toString()` returns
/// noise in exactly the builds that ship. Text content, found by walking the
/// hit-tested subtree, is stable instead.
String labelForHitTest(Iterable<HitTestEntry> path) {
  for (final entry in path) {
    final target = entry.target;
    if (target is! RenderObject) continue;

    final explicit = _explicitLabel(target);
    if (explicit != null) return explicit;

    final text = _findText(target, 0);
    if (text != null) return text;
  }
  return 'View';
}

/// Set by [ORTrackedView] so authors can name a region explicitly.
final Map<RenderObject, String> annotatedLabels = {};

String? _explicitLabel(RenderObject node) => annotatedLabels[node];

/// Depth-limited search for a paragraph under [node]. Depth is bounded because
/// this runs on every touch, and a deep hit on a large list should not walk the
/// whole subtree.
String? _findText(RenderObject node, int depth) {
  if (depth > 6) return null;
  if (node is RenderParagraph) {
    final plain = node.text.toPlainText().trim();
    if (plain.isNotEmpty) return _truncate(plain);
  }
  String? found;
  node.visitChildren((child) {
    found ??= _findText(child, depth + 1);
  });
  return found;
}

String _truncate(String value) => value.length <= _maxLabelLength
    ? value
    : '${value.substring(0, _maxLabelLength)}...';
