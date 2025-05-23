const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");

let io;

const getServer = function () {
    return io;
}

const fetchSockets = async function (roomID) {
    if (!io) {
        return [];
    }
    if (!roomID) {
        return await io.fetchSockets();
    }
    return await io.in(roomID).fetchSockets();
}

const createSocketIOServer = function (server, prefix) {
    if (io) {
        return io;
    }
    let bufferSize = (parseFloat(process.env.maxHttpBufferSize) || 5) * 1e6
    io = _io(server, {
        maxHttpBufferSize: bufferSize,
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT"]
        },
        path: (prefix ? prefix : '') + '/socket',
        ...getCompressionConfig()
    });
    console.log('The maximum http buffer size:', bufferSize);
    return io;
}

module.exports = {
    createSocketIOServer,
    getServer,
    fetchSockets,
}
