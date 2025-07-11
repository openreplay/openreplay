const {logger} = require('./logger');
const {sendAssistEvent} = require('./cache');

class InMemoryCache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new InMemoryCache();

function startAssist(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.handshake.query.sessId}_${agentID}_assist_${tsNow}`;
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "assist",
        "event_state": "start",
        "timestamp": tsNow,
    });
    // Save uniq eventID to cache
    cache.set(`${socket.handshake.query.sessId}_${agentID}_assist`, eventID);
    // Debug log
    logger.debug(`assist_started, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${tsNow}`);
}

function endAssist(socket, agentID) {
    const eventID = cache.get(`${socket.handshake.query.sessId}_${agentID}_assist`);
    if (eventID === undefined) {
        logger.debug(`have to skip assist_ended, no eventID in the cache, agentID: ${socket.handshake.query.agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}`);
        return
    }
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "assist",
        "event_state": "end",
        "timestamp": +new Date(),
    })
    // Remove eventID from cache
    cache.delete(`${socket.handshake.query.sessId}_${agentID}_assist`);
    // Debug logs
    logger.debug(`assist_ended, agentID: ${socket.handshake.query.agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}`);
}

function startCall(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.handshake.query.sessId}_${agentID}_call_${tsNow}`;
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "call",
        "event_state": "start",
        "timestamp": tsNow,
    });
    // Save uniq eventID to cache
    cache.set(`${socket.handshake.query.sessId}_call`, eventID);
    // Debug logs
    logger.debug(`s_call_started, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${tsNow}`);
}

function endCall(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.handshake.query.sessId}_call`);
    if (eventID === undefined) {
        logger.debug(`have to skip s_call_ended, no eventID in the cache, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${tsNow}`);
        return
    }
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "call",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.handshake.query.sessId}_call`)
    // Debug logs
    logger.debug(`s_call_ended, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${tsNow}`);
}

function startControl(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.handshake.query.sessId}_${agentID}_control_${tsNow}`;
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "control",
        "event_state": "start",
        "timestamp": tsNow,
    });
    cache.set(`${socket.handshake.query.sessId}_control`, eventID)
    // Debug logs
    logger.debug(`s_control_started, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${+new Date()}`);
}

function endControl(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.handshake.query.sessId}_control`);
    if (eventID === undefined) {
        logger.debug(`have to skip s_control_ended, no eventID in the cache, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${tsNow}`);
        return
    }
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "control",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.handshake.query.sessId}_control`)
    // Debug logs
    logger.debug(`s_control_ended, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${+new Date()}`);
}

function startRecord(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.handshake.query.sessId}_${agentID}_record_${tsNow}`;
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "record",
        "event_state": "start",
        "timestamp": tsNow,
    });
    cache.set(`${socket.handshake.query.sessId}_record`, eventID)
    // Debug logs
    logger.debug(`s_recording_started, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${+new Date()}`);
}

function endRecord(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.sessId}_record`);
    void sendAssistEvent({
        "project_id": socket.handshake.query.projectId,
        "session_id": socket.handshake.query.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "record",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.handshake.query.sessId}_record`)
    // Debug logs
    logger.debug(`s_recording_ended, agentID: ${agentID}, sessID: ${socket.handshake.query.sessId}, projID: ${socket.handshake.query.projectId}, time: ${+new Date()}`);
}

function handleEvent(eventName, socket, agentID) {
    switch (eventName) {
        case "s_call_started": {
            startCall(socket, agentID);
            break;
        }
        case "s_call_ended": {
            endCall(socket, agentID);
            break;
        }
        case "s_control_started": {
            startControl(socket, agentID)
            break;
        }
        case "s_control_ended": {
            endControl(socket, agentID)
            break;
        }
        case "s_recording_started": {
            startRecord(socket, agentID);
            break;
        }
        case "s_recording_ended": {
            endRecord(socket, agentID);
            break;
        }
    }
}

module.exports = {
    startAssist,
    endAssist,
    handleEvent,
}