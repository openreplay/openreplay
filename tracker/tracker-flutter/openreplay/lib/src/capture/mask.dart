import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';

/// Visual constants copied from ScreenCapture.swift so replays look the same
/// across platforms.
const double kBlurSigma = 2.5;
const double kStripeWidth = 5;
const double kStripeSpacing = 15;
final Color kStripeColor = const Color(0xFF808080).withValues(alpha: 0.7);
const Color kPlaceholderFill = Color(0xFF3A3A3A);
const Color kSolidMaskFill = Color(0xFF0000FF);

/// Redraws [source] with every rect in [sensitive] blurred and hatched, and
/// every rect in [platformViews] replaced by an opaque placeholder.
///
/// Masking has to happen after the capture: altering the widget tree would
/// change what the user sees. This is a second raster pass, but it is one image
/// blit plus a handful of rects.
ui.Image maskFrame({
  required ui.Image source,
  required List<Rect> sensitive,
  required List<Rect> platformViews,
  required bool blurMode,
  required bool debugOutlines,
}) {
  if (sensitive.isEmpty && platformViews.isEmpty) return source;

  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  final full =
      Rect.fromLTWH(0, 0, source.width.toDouble(), source.height.toDouble());

  canvas.drawImageRect(source, full, full, Paint());

  for (final rect in sensitive) {
    final clipped = rect.intersect(full);
    if (clipped.isEmpty) continue;

    if (blurMode) {
      canvas
        ..save()
        ..clipRect(clipped)
        // Drawing just this region with a blur filter samples the underlying
        // pixels, which is what makes the content unreadable but still shaped
        // like the original.
        ..drawImageRect(
          source,
          clipped,
          clipped,
          Paint()
            ..imageFilter = ui.ImageFilter.blur(
              sigmaX: kBlurSigma,
              sigmaY: kBlurSigma,
              tileMode: TileMode.clamp,
            ),
        )
        ..drawPath(
          _hatch(clipped),
          Paint()
            ..color = kStripeColor
            ..strokeWidth = kStripeWidth
            ..style = PaintingStyle.stroke,
        )
        ..restore();
    } else {
      canvas.drawRect(clipped, Paint()..color = kSolidMaskFill);
    }

    if (debugOutlines) {
      canvas.drawRect(
        clipped,
        Paint()
          ..color = const Color(0xFF000000)
          ..strokeWidth = 1
          ..style = PaintingStyle.stroke,
      );
    }
  }

  // Platform views render in separate native layers that toImage cannot read,
  // so they arrive blank. An opaque placeholder is honest about that.
  for (final rect in platformViews) {
    final clipped = rect.intersect(full);
    if (!clipped.isEmpty) {
      canvas.drawRect(clipped, Paint()..color = kPlaceholderFill);
    }
  }

  final picture = recorder.endRecording();
  final masked = picture.toImageSync(source.width, source.height);
  picture.dispose();
  source.dispose();
  return masked;
}

/// Diagonal lines across [rect], as the iOS SDK draws them.
Path _hatch(Rect rect) {
  final path = Path();
  final h = rect.height;
  for (var x = -h; x < rect.width; x += kStripeSpacing + kStripeWidth) {
    path
      ..moveTo(x + rect.left, rect.top)
      ..lineTo(x + h + rect.left, h + rect.top);
  }
  return path;
}
