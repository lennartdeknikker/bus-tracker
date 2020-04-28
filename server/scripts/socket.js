const Utilities = require('./utilities')

function socket(io) {
    const availableRooms = []

    io.on('connection', function(socket){
        console.log('a user connected')

        socket.on('join', async function(roomName, userName) {
            let isCreator = false
            if (!io.sockets.adapter.rooms[roomName]) {
                const newRoom = await Utilities.createRoom(roomName)
                availableRooms.push(newRoom)
                isCreator = true
            }

            const newUser = await Utilities.createUser(userName, socket.id, isCreator)
            const roomIndex = availableRooms.findIndex(room => room.roomName === roomName)
            availableRooms[roomIndex].users.push(newUser)
            availableRooms[roomIndex].userTotal++

            socket.join(roomName)
            io.to(roomName).emit('new user', userName)

            console.log(userName, 'joined', roomName)
            console.log('room details', io.sockets.adapter.rooms[roomName])    
        })

        socket.on('disconnect', function() {
            availableRooms.forEach(room => {
                room.users.forEach(user => {
                    if (user.id === socket.id) {
                        const index = room.users.indexOf(user)
                        room.users.splice(index, 1)
                        room.userTotal--
                    }
                })
            })
            console.log('user disconnected', socket.id)
            
        })
        socket.on('wiki link clicked', link => {
            console.log(link)      
        })

    })
}

module.exports = socket