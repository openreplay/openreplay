import signal

class SignalHandler:
    KEEP_PROCESSING = True
    def __init__(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

    def exit_gracefully(self, signum, frame):
        print(f"Exiting gracefully with signal {signum}")
        self.KEEP_PROCESSING = False


signal_handler = SignalHandler()
