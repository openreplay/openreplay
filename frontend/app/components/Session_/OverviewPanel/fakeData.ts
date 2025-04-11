const zoomStartTime = 100;
// Generate fake fetchList data for NETWORK
const fetchList: any[] = [];
for (let i = 0; i < 100; i++) {
  const statusOptions = [200, 200, 200, 404, 500]; // Higher chance of 200
  const status =
    statusOptions[Math.floor(Math.random() * statusOptions.length)];
  const isRed = status >= 500;
  const isYellow = status >= 400 && status < 500;
  const resource = {
    time: zoomStartTime + i * 1000 + Math.floor(Math.random() * 500), // Incremental time with randomness
    name: `https://api.example.com/resource/${i}`,
    status,
    isRed,
    isYellow,
    success: status < 400,
    tp: Math.random() > 0.5 ? 'graph_ql' : 'fetch',
    // Additional properties used by your component
    method: 'GET',
    duration: Math.floor(Math.random() * 3000) + 500, // Duration between 500ms to 3.5s
  };
  fetchList.push(resource);
}
// Generate fake exceptionsList data for ERRORS
const exceptionsList: any[] = [];
for (let i = 0; i < 50; i++) {
  const exception = {
    time: zoomStartTime + i * 2000 + Math.floor(Math.random() * 1000),
    message: `Error message ${i}`,
    errorId: `error-${i}`,
    type: 'ERRORS',
    // Additional properties if needed
    stackTrace: `Error at function ${i} in file${i}.js`,
  };
  exceptionsList.push(exception);
}
// Generate fake eventsList data for EVENTS
const eventsList: any[] = [];
for (let i = 0; i < 50; i++) {
  const event = {
    time: zoomStartTime + i * 1500 + Math.floor(Math.random() * 500),
    name: `Custom Event ${i}`,
    type: 'EVENTS',
    // Additional properties if needed
    details: `Details about event ${i}`,
  };
  eventsList.push(event);
}
// Generate fake performanceChartData data for PERFORMANCE
const performanceChartData: any[] = [];
const performanceTypes = ['SLOW_PAGE_LOAD', 'HIGH_MEMORY_USAGE'];
for (let i = 0; i < 30; i++) {
  const performanceEvent = {
    time: zoomStartTime + i * 3000 + Math.floor(Math.random() * 1500),
    type: performanceTypes[Math.floor(Math.random() * performanceTypes.length)],
    // Additional properties if needed
    value: Math.floor(Math.random() * 1000) + 500, // Random value
  };
  performanceChartData.push(performanceEvent);
}
// Generate fake frustrationsList data for FRUSTRATIONS
const frustrationsList: any[] = [];
const frustrationEventTypes = [
  'CLICK',
  'INPUT',
  'CLICKRAGE',
  'DEAD_CLICK',
  'MOUSE_THRASHING',
];
for (let i = 0; i < 70; i++) {
  const frustrationEvent = {
    time: zoomStartTime + i * 1200 + Math.floor(Math.random() * 600),
    type: frustrationEventTypes[
      Math.floor(Math.random() * frustrationEventTypes.length)
    ],
    hesitation: Math.floor(Math.random() * 5000) + 1000, // 1s to 6s
    // Additional properties if needed
    details: `Frustration event ${i}`,
  };
  frustrationsList.push(frustrationEvent);
}

export const resources = {
  NETWORK: fetchList.filter(
    (r: any) => r.status >= 400 || r.isRed || r.isYellow,
  ),
  ERRORS: exceptionsList,
  EVENTS: eventsList,
  PERFORMANCE: performanceChartData,
  FRUSTRATIONS: frustrationsList,
};
