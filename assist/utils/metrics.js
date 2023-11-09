const client = require('prom-client')

// Create a Registry which registers the metrics
const register = new client.Registry()
register.setDefaultLabels({
    app: 'assist'
})

// Enable the collection of default metrics
client.collectDefaultMetrics({ register })

// http metrics

const httpRequestDuration = new client.Histogram({
    name: 'request_duration_seconds',
    help: 'A histogram displaying the duration of each HTTP request in seconds.',
    labelNames: ['method', 'route', 'code'],
    buckets: [.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000],
});

const RecordRequestDuration = function(method, route, code, duration) {
    httpRequestDuration.observe({ method: method, route: route, code: code }, duration);
}

const httpTotalRequests = new client.Counter({
    name: 'requests_total',
    help: 'A counter displaying the number of all HTTP requests.',
});

const IncreaseTotalRequests = function () {
    httpTotalRequests.inc();
}

// websocket metrics

const websocketTotalConnections = new client.Counter({
    name: 'ws_connections_total',
    help: 'A counter displaying the number of all ws connections',
    labelNames: ['type'], // tab, agent
});

const IncreaseTotalWSConnections = function (type) {
    websocketTotalConnections.inc({type: type});
}

const websocketOnlineConnections = new client.Gauge({
    name: 'ws_connections_online',
    help: 'A gauge displaying the number of online (active) connections',
    labelNames: ['type'], // tab, agent
});

const IncreaseOnlineConnections = function (type) {
    websocketOnlineConnections.inc({type: type});
}

const DecreaseOnlineConnections = function (type) {
    websocketOnlineConnections.dec({type: type});
}

const websocketTotalRooms = new client.Counter({
    name: 'ws_rooms_total',
    help: 'A counter displaying the number of all rooms',
});

const IncreaseTotalRooms = function () {
    websocketTotalRooms.inc();
}

const websocketOnlineRooms = new client.Gauge({
    name: 'ws_rooms_online',
    help: 'A gauge displaying the number of online (active) rooms',
});

const IncreaseOnlineRooms = function () {
    websocketOnlineRooms.inc();
}

const DecreaseOnlineRooms = function () {
    websocketOnlineRooms.dec();
}

register.registerMetric(httpRequestDuration);
register.registerMetric(httpTotalRequests);
register.registerMetric(websocketTotalConnections);
register.registerMetric(websocketOnlineConnections);
register.registerMetric(websocketTotalRooms);
register.registerMetric(websocketOnlineRooms);

module.exports = {
    register,
    RecordRequestDuration,
    IncreaseTotalRequests,
    IncreaseTotalWSConnections,
    IncreaseOnlineConnections,
    DecreaseOnlineConnections,
    IncreaseTotalRooms,
    IncreaseOnlineRooms,
    DecreaseOnlineRooms,
}