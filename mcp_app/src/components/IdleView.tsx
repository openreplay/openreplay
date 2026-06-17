function IdleView() {
  return (
    <div className="view-empty" style={{ padding: '40px' }}>
      <div className="view-empty-title">Waiting for data...</div>
      <div className="view-empty-text">
        This app will display session replays or charts when invoked by the assistant.
      </div>
    </div>
  );
}

export default IdleView;
