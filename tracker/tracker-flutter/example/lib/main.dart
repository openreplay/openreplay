import 'package:flutter/material.dart';
import 'package:openreplay/openreplay.dart';

/// Point this at your own ingest and project key.
const String kProjectKey = String.fromEnvironment('OR_PROJECT_KEY');
const String kServerUrl = String.fromEnvironment(
  'OR_SERVER_URL',
  defaultValue: 'https://api.openreplay.com/ingest',
);

void main() {
  runApp(const OpenReplayWidget(child: ExampleApp()));
}

class ExampleApp extends StatefulWidget {
  const ExampleApp({super.key});

  @override
  State<ExampleApp> createState() => _ExampleAppState();
}

class _ExampleAppState extends State<ExampleApp> {
  bool _recording = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OpenReplay example',
      navigatorObservers: [ORNavigatorObserver()],
      theme: ThemeData(colorSchemeSeed: Colors.indigo),
      home: Scaffold(
        appBar: AppBar(title: const Text('OpenReplay example')),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            FilledButton(
              onPressed: _recording ? null : _start,
              child: Text(_recording ? 'Recording' : 'Start recording'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => OpenReplay.instance
                  .event('button_tapped', {'from': 'example'}),
              child: const Text('Send custom event'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => OpenReplay.instance.setUserID('demo-user'),
              child: const Text('Identify user'),
            ),
            const Divider(height: 32),
            const Text('This field is masked in the replay:'),
            const ORSanitizedView(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: TextField(
                  decoration: InputDecoration(
                    border: OutlineInputBorder(),
                    labelText: 'Card number',
                  ),
                ),
              ),
            ),
            const Divider(height: 32),
            ORTrackedView(
              screenName: 'Home',
              viewName: 'DetailsCard',
              child: Card(
                child: ListTile(
                  title: const Text('Tracked region'),
                  subtitle: const Text('Emits visibility events'),
                  onTap: () {},
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _start() async {
    if (kProjectKey.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pass --dart-define=OR_PROJECT_KEY=... to record'),
        ),
      );
      return;
    }
    await OpenReplay.instance.start(
      projectKey: kProjectKey,
      serverUrl: kServerUrl,
      options: OROptions.defaultDebug,
    );
    if (mounted) setState(() => _recording = true);
  }
}
