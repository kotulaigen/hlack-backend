const express = require('express');
const { InitiateMongoServer, mongoose } = require('./config/db')
const cors = require('cors')
const user = require('./routes/user')
const Message = require('./models/message')
const { CLIENT, PORT, WSPORT } = require('./constants/constants');
InitiateMongoServer()

const users = {}
const rooms = []
const app = express()
const io = require("socket.io")(WSPORT, {
    cors: {
        origin: "http://localhost:3000",
    }
});
app.use(express.json())
app.use(cors())
app.use('/user', user)
app.listen(PORT, (req, res) => {
    console.log(`Server started at PORT ${PORT}`)
})

function deleteUser(socket) {
    for (let key in users) {
        if (users[key] === socket) delete users[key]
    }
}

io.on('connection', (socket) => {
    socket.to(socket.id).emit('room-added', rooms)
    socket.on('delete-room', room => {
        const toDelete = rooms.findIndex(() => room)
        rooms.splice(toDelete - 1, 1)
        io.emit('room-deleted', rooms)
        Message.deleteMany({ roomName: room});
    })
    socket.on('add-room', room => {
        rooms.push(room)
        socket.broadcast.emit('room-added', rooms)
    })
    socket.on('join-room', async room => {
        socket.join(room)
        const res = await Message.find({ roomName: room }).exec()
        if (res === []) {
            io.emit('room-joined', room)
        } else io.emit('room-joined', res)
    })
    socket.on('user-log-in', (user, userSocket) => {
        users[user] = userSocket
        io.emit('users-connected', users, rooms)
    })
    socket.on('message', (msg, user, roomName, roomId) => {
        const message = new Message({
            user: user,
            message: msg,
            roomName: roomName,
            roomId: roomId
        })
        if (roomId === '') {
            socket.broadcast.emit('get-message', message.message, message.user, message.roomName, message.roomId)
            message.save()
        } else {
            socket.to(roomId).emit('get-message', message.message, message.user, message.roomName, message.roomId)
            message.save()
        }
    });
    socket.on('disconnect', () => {
        deleteUser(socket.id)
        io.emit('user-disconnected', users)
    })
});


