import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:openreplay/openreplay.dart';

/// Supplied at build time:
///   flutter run --dart-define-from-file=.env
const String kProjectKey = String.fromEnvironment('OR_PROJECT_KEY');
const String kServerUrl = String.fromEnvironment(
  'OR_SERVER_URL',
  defaultValue: 'https://api.openreplay.com/ingest',
);

void main() {
  runApp(const OpenReplayWidget(child: ExampleApp()));
}

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OpenReplay example',
      // Named routes so the observer reports real names rather than depth.
      navigatorObservers: [ORNavigatorObserver()],
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      routes: {
        '/': (_) => const HomePage(),
        '/details': (_) => const DetailsPage(),
      },
      initialRoute: '/',
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _card = TextEditingController();
  bool _recording = false;
  String _lastNetwork = 'none yet';
  VoidCallback? _removeInputObserver;

  @override
  void dispose() {
    _removeInputObserver?.call();
    _email.dispose();
    _card.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (kProjectKey.isEmpty) {
      _toast('Set OR_PROJECT_KEY in .env, then restart');
      return;
    }
    await OpenReplay.instance.start(
      projectKey: kProjectKey,
      serverUrl: kServerUrl,
      options: OROptions.defaultDebug,
    );
    // Records dart:io traffic, including the button below.
    OpenReplay.instance.patchNetwork(
      const ORNetworkOptions(capturePayload: true),
    );
    _removeInputObserver =
        OpenReplay.instance.observeInput(_email, label: 'Email');
    if (mounted) setState(() => _recording = true);
  }

  void _toast(String message) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(message)));

  Future<void> _makeRequest() async {
    setState(() => _lastNetwork = 'requesting...');
    try {
      final client = HttpClient();
      final req = await client
          .getUrl(Uri.parse('https://jsonplaceholder.typicode.com/todos/1'));
      final res = await req.close();
      await res.drain<void>();
      client.close();
      if (mounted) setState(() => _lastNetwork = 'HTTP ${res.statusCode}');
    } on Object catch (e) {
      if (mounted) setState(() => _lastNetwork = 'failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OpenReplay example'),
        actions: [
          if (_recording)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(child: Text('REC')),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          FilledButton(
            onPressed: _recording ? null : _start,
            child: Text(_recording ? 'Recording' : 'Start recording'),
          ),
          const SizedBox(height: 8),
          if (_recording)
            OutlinedButton(
              onPressed: () async {
                await OpenReplay.instance.stop();
                if (mounted) setState(() => _recording = false);
              },
              child: const Text('Stop and flush'),
            ),

          _Section('Events', [
            _Chip('Identify', () => OpenReplay.instance.setUserID('demo-user')),
            _Chip('Metadata',
                () => OpenReplay.instance.setMetadata('plan', 'pro')),
            _Chip(
              'Custom event',
              () => OpenReplay.instance
                  .event('button_tapped', {'from': 'example'}),
            ),
            _Chip('Log line',
                () => OpenReplay.instance.log('info', 'hello from example')),
          ]),

          _Section('Overlays — check they appear in the replay', [
            _Chip('Dialog', () => _showDialog(context)),
            _Chip('Bottom sheet', () => _showSheet(context)),
            _Chip('Snackbar', () => _toast('A snackbar')),
            _Chip('Next screen',
                () => Navigator.of(context).pushNamed('/details')),
          ]),

          _Section('Errors', [
            _Chip('Throw (handled)', () => throw StateError('example error')),
            _Chip(
              'Async error',
              () => Future<void>.error(StateError('async example error')),
            ),
          ]),

          _Section('Network', [
            _Chip('GET /todos/1', _makeRequest),
          ]),
          Text('Last request: $_lastNetwork'),

          const _Heading('Masked input'),
          const Text('Blurred and hatched in the replay, even while scrolling.'),
          ORSanitizedView(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: TextField(
                controller: _card,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'Card number',
                ),
              ),
            ),
          ),

          const _Heading('Observed input'),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: TextField(
              controller: _email,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Email (recorded)',
              ),
            ),
          ),

          const _Heading('Swipe me'),
          const SizedBox(height: 120, child: _SwipeDeck()),

          const _Heading('Continuous animation'),
          const Text('Keeps scheduling frames, so capture throttles here.'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: _Pulse(),
          ),

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

          const _Heading('Long list — scroll to test capture'),
          for (var i = 1; i <= 60; i++)
            ListTile(
              dense: true,
              leading: CircleAvatar(child: Text('$i')),
              title: Text('Row $i — tap to fire a click event'),
              subtitle: Text(_lorem[i % _lorem.length]),
              onTap: () => OpenReplay.instance.event('row_tapped', {'row': i}),
            ),
        ],
      ),
    );
  }

  void _showDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('A dialog'),
        content: const Text(
          'Dialogs are routes, so this also emits a screen event.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SizedBox(
        height: 220,
        child: Center(
          child: ORSanitizedView(
            child: Container(
              padding: const EdgeInsets.all(24),
              color: Colors.amber.shade200,
              child: const Text('This sheet content is masked'),
            ),
          ),
        ),
      ),
    );
  }
}

class DetailsPage extends StatelessWidget {
  const DetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Details')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('A second route, to check screen events fire.'),
          const SizedBox(height: 16),
          for (var i = 0; i < 30; i++)
            ListTile(title: Text('Detail row $i')),
        ],
      ),
    );
  }
}

class _SwipeDeck extends StatelessWidget {
  const _SwipeDeck();

  @override
  Widget build(BuildContext context) {
    return PageView(
      children: [
        for (final color in [Colors.indigo, Colors.teal, Colors.deepOrange])
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            color: color.shade100,
            child: const Center(child: Text('Swipe horizontally')),
          ),
      ],
    );
  }
}

/// Repaints every frame, so the capture throttle is exercised.
class _Pulse extends StatefulWidget {
  const _Pulse();

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 2),
  )..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => Align(
        alignment: Alignment.centerLeft,
        child: Container(
          height: 24,
          width: 40 + _controller.value * 240,
          decoration: BoxDecoration(
            color: Colors.indigo,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 24, bottom: 4),
        child: Text(text, style: Theme.of(context).textTheme.titleMedium),
      );
}

class _Section extends StatelessWidget {
  const _Section(this.title, this.children);
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Heading(title),
          Wrap(spacing: 8, runSpacing: 8, children: children),
        ],
      );
}

class _Chip extends StatelessWidget {
  const _Chip(this.label, this.onTap);
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) =>
      ActionChip(label: Text(label), onPressed: onTap);
}

const List<String> _lorem = [
  'Scrolling changes pixels, so frames are captured here.',
  'An idle screen schedules no frames and costs nothing.',
  'Identical frames are dropped before the encode runs.',
  'Masked rects are recomputed in the same frame as the snapshot.',
];
