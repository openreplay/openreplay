const StatsHost = process.env.STATS_HOST || 'http://assist-stats-openreplay.app.svc.cluster.local:8000/events';

async function postData(payload) {
    const options = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    }

    try {
        const response = await fetch(StatsHost, options)
        const jsonResponse = await response.json();
        console.log('JSON response', JSON.stringify(jsonResponse, null, 4))
    } catch(err) {
        console.log('ERROR', err);
    }
}

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

const debug = process.env.debug === "1";

function startAssist(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.sessId}_${agentID}_assist_${tsNow}`;
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "assist",
        "event_state": "start",
        "timestamp": tsNow,
    });
    // Save uniq eventID to cache
    cache.set(`${socket.sessId}_${agentID}_assist`, eventID);
    // Debug log
    debug && console.log(`assist_started, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${tsNow}`);
}

function endAssist(socket, agentID) {
    const eventID = cache.get(`${socket.sessId}_${agentID}_assist`);
    if (eventID === undefined) {
        debug && console.log(`have to skip assist_ended, no eventID in the cache, agentID: ${socket.agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}`);
        return
    }
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "assist",
        "event_state": "end",
        "timestamp": +new Date(),
    })
    // Remove eventID from cache
    cache.delete(`${socket.sessId}_${agentID}_assist`);
    // Debug logs
    debug && console.log(`assist_ended, agentID: ${socket.agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}`);
}

function startCall(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.sessId}_${agentID}_call_${tsNow}`;
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "call",
        "event_state": "start",
        "timestamp": tsNow,
    });
    // Save uniq eventID to cache
    cache.set(`${socket.sessId}_call`, eventID);
    // Debug logs
    console.log(`s_call_started, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${tsNow}`);
}

function endCall(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.sessId}_call`);
    if (eventID === undefined) {
        console.log(`have to skip s_call_ended, no eventID in the cache, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${tsNow}`);
        return
    }
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "call",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.sessId}_call`)
    // Debug logs
    console.log(`s_call_ended, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${tsNow}`);
}

function startControl(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.sessId}_${agentID}_control_${tsNow}`;
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "control",
        "event_state": "start",
        "timestamp": tsNow,
    });
    cache.set(`${socket.sessId}_control`, eventID)
    // Debug logs
    console.log(`s_control_started, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${+new Date()}`);
}

function endControl(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.sessId}_control`);
    if (eventID === undefined) {
        console.log(`have to skip s_control_ended, no eventID in the cache, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${tsNow}`);
        return
    }
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "control",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.sessId}_control`)
    // Debug logs
    console.log(`s_control_ended, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${+new Date()}`);
}

function startRecord(socket, agentID) {
    const tsNow = +new Date();
    const eventID = `${socket.sessId}_${agentID}_record_${tsNow}`;
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "record",
        "event_state": "start",
        "timestamp": tsNow,
    });
    cache.set(`${socket.sessId}_record`, eventID)
    // Debug logs
    console.log(`s_recording_started, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${+new Date()}`);
}

function endRecord(socket, agentID) {
    const tsNow = +new Date();
    const eventID = cache.get(`${socket.sessId}_record`);
    void postData({
        "project_id": socket.projectId,
        "session_id": socket.sessId,
        "agent_id": agentID,
        "event_id": eventID,
        "event_type": "record",
        "event_state": "end",
        "timestamp": tsNow,
    });
    cache.delete(`${socket.sessId}_record`)
    // Debug logs
    console.log(`s_recording_ended, agentID: ${agentID}, sessID: ${socket.sessId}, projID: ${socket.projectId}, time: ${+new Date()}`);
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