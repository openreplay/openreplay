import 'package:flutter_test/flutter_test.dart';
import 'package:openreplay_example/main.dart';

void main() {
  testWidgets('example renders without a project key', (tester) async {
    await tester.pumpWidget(const ExampleApp());
    expect(find.text('Start recording'), findsOneWidget);
    expect(find.text('Tracked region'), findsOneWidget);
  });
}
