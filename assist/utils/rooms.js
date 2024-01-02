const roomsInfo = new Map(); // sessionID -> sessionInfo
const projectSessions = new Map(); // projectKey -> Set(sessionIDs) // all rooms (even with agent only)
const projectRooms = new Map(); // projectKey -> Set(roomIDs) // online rooms

function AddRoom(projKey, sessID, sessInfo) {
    roomsInfo.set(sessID, sessInfo);
    if (!projectRooms.has(projKey)) {
        projectRooms.set(projKey, new Set());
    }
    projectRooms.get(projKey).add(sessID);
    if (!projectSessions.has(projKey)) {
        projectSessions.set(projKey, new Set());
    }
    projectSessions.get(projKey).add(sessID);
}

function UpdateRoom(sessID, sessInfo) {
    roomsInfo.set(sessID, sessInfo);
}

function DeleteSession(projKey, sessID) {
    projectSessions.get(projKey)?.delete(sessID);
}

function DeleteRoom(projKey, sessID) {
    projectRooms.get(projKey)?.delete(sessID);
}

function GetRoomInfo(sessID) {
    return roomsInfo.get(sessID);
}

function GetRooms(projectKey) {
    return projectRooms.get(projectKey) || new Set();
}

function GetSessions(projectKey) {
    return projectSessions.get(projectKey) || new Set();
}

module.exports = {
    AddRoom,
    UpdateRoom,
    DeleteRoom,
    DeleteSession,
    GetRoomInfo,
    GetRooms,
    GetSessions,
}