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
    io = _io(server, {
        maxHttpBufferSize: (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT"]
        },
        path: (prefix ? prefix : '') + '/socket',
        ...getCompressionConfig()
    });
    return io;
}

module.exports = {
    createSocketIOServer,
    getServer,
}