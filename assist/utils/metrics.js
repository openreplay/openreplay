const client = require('prom-client')

// Create a Registry which registers the metrics
const register = new client.Registry()
register.setDefaultLabels({
    app: 'assist_'
})

// Enable the collection of default metrics
client.collectDefaultMetrics({ register })

module.exports = {
    register,
}