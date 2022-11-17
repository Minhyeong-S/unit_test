const chat = require('../socket');
// const ChatProvider = require('./chat-provider');

// 로비에 연결 되었을때
chat.on('connection', async (socket) => {
    console.log(socket.id + ' 여긴 채팅방!!!');

    // 로비 채팅
    socket.on('sendLobbyMsg', async (payload, callback) => {
        socket.broadcast.emit('receiveLobbyMsg', payload);
        callback();
    });
    // 룸 채팅
    socket.on('sendRoomMsg', async (payload, roomNum, callback) => {
        socket.to(`/gameRoom${roomNum}`).emit('receiveRoomMsg', payload);

        callback();
    });
});

function publicRooms() {
    const sids = chat.sockets.adapter.sids;
    const rooms = chat.sockets.adapter.rooms;
    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

const getLobbyUsers = async () => {
    const sids = await chat.sockets.adapter.sids;
    const rooms = await chat.sockets.adapter.rooms;
    const lobbyUsers = [];
    await rooms.forEach((_, key) => {
        if (sids.get(key) !== undefined && sids.get(key).size === 1) {
            lobbyUsers.push(key);
        }
    });
    return lobbyUsers;
};
