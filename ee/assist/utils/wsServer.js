const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");

let io;

const getServer = function () {
    return io;
}

const createSocketIOServer = function (server, prefix) {
    if (io) {
        return io;
    }
    if (process.env.uws !== "true") {
        io = _io(server, {
            maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"],
                credentials: true
            },
            path: (prefix ? prefix : '') + '/socket',
            ...getCompressionConfig()
        });
    } else {
        io = new _io.Server({
            maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT"],
                credentials: true
            },
            path: (prefix ? prefix : '') + '/socket',
            ...getCompressionConfig()
        });
        io.attachApp(server);
    }
    return io;
}

module.exports = {
    createSocketIOServer,
    getServer,
}