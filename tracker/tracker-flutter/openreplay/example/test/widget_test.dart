import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:openreplay_example/main.dart';

void main() {
  testWidgets('renders and scrolls without a project key', (tester) async {
    await tester.pumpWidget(const ExampleApp());

    expect(find.text('Start recording'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);

    // Lower sections are below the fold in a lazy list, so scroll to them.
    await tester.scrollUntilVisible(
      find.text('Tracked region'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Tracked region'), findsOneWidget);
  });

  testWidgets('start button warns when no project key is set', (tester) async {
    await tester.pumpWidget(const ExampleApp());

    await tester.tap(find.text('Start recording'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.textContaining('OR_PROJECT_KEY'), findsOneWidget);
  });
}
