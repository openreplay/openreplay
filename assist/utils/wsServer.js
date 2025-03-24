const _io = require("socket.io");
const {getCompressionConfig} = require("./helper");

let io;

function sendFrom(from, to, eventName, ...data) {
    from.to(to).emit(eventName, ...data);
}

function sendTo(to, eventName, ...data) {
    sendFrom(io, to, eventName, ...data);
}

const fetchSockets = async function (roomID, all=false) {
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
    sendTo,
    sendFrom,
    fetchSockets,
}