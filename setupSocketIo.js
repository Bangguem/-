const socketIo = require('socket.io');
const { fetchUser } = require('./db'); // 필요한 함수 가져오기
const { verifyToken } = require('./auth');

function setupSocketIo(server) {
    const io = socketIo(server); // Socket.io 서버를 HTTP 서버에 연결
    const connectedUsers = {};
    // 인증 미들웨어
    io.use((socket, next) => {
        // 클라이언트에서 보낸 쿠키에서 토큰을 추출
        const token = socket.handshake.headers.cookie?.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];

        if (!token) {
            console.log('No token provided. Connection refused.');
            return next(new Error('Authentication error'));
        }

        // 토큰 검증
        const decoded = verifyToken(token);
        if (!decoded) {
            console.log('Invalid token. Connection refused.');
            return next(new Error('Authentication error'));
        }

        // 인증된 사용자의 정보를 socket 객체에 저장
        socket.user = decoded;
        next(); // 인증이 완료되면 연결 허용
    });

    // 연결 이벤트 핸들러
    io.on('connection', async (socket) => {
        const user = await fetchUser(socket.user.userid);
        console.log('A user connected:', user.userid);
        console.log('Authenticated user:', user.nickname);
        connectedUsers[socket.id] = {
            userid: user.userid,
            nickname: user.nickname,
            socket: socket,
        };

        console.log(Object.entries(connectedUser));

        socket.on('chat message', (msg) => {
            console.log(`${user.nickname}: ${msg}`);
            io.emit('chat message', {
                username: user.nickname,
                message: msg
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete connectedUsers[socket.id];
        });
    });

    return io;
}



module.exports = setupSocketIo;
