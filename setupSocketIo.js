const socketIo = require('socket.io');
const { fetchUser } = require('./db'); // 필요한 함수 가져오기
const { verifyToken } = require('./auth');

function setupSocketIo(server) {
    const io = socketIo(server); // Socket.io 서버를 HTTP 서버에 연결
    const connectedUsers = {}; // 연결된 사용자들 관리
    const waitingQueue = []; // 단일 대기열 관리

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

    // 매칭 조건 함수
    function findMatch(game) {
        return waitingQueue.findIndex(user => user.game === game);
    }

    // 연결 이벤트 핸들러
    io.on('connection', async (socket) => {
        const user = await fetchUser(socket.user.userid);
        console.log('A user connected:', user.userid);
        console.log('Authenticated user:', user.nickname);

        // 사용자 연결 정보 저장
        connectedUsers[socket.id] = {
            userid: user.userid,
            nickname: user.nickname,
            socket: socket,
        };

        // 매칭 요청 이벤트
        socket.on('request match', (game) => {
            console.log(`User ${socket.id} is requesting match for game: ${game}`);

            // 매칭 조건 함수 사용하여 대기열에서 조건에 맞는 사용자 찾기
            const matchIndex = findMatch(game);

            if (matchIndex !== -1) {
                // 조건에 맞는 사용자가 있으면 매칭 성사
                const partner = waitingQueue.splice(matchIndex, 1)[0]; // 매칭된 사용자 제거

                // 고유한 방 ID 생성 및 두 사용자 입장
                const roomId = `room-${socket.id}-${partner.socket.id}`;
                socket.join(roomId);
                partner.socket.join(roomId);

                // 매칭 성공 메시지 전송
                socket.emit('match success', { roomId, partner: { userid: partner.socket.user.userid, nickname: partner.socket.user.nickname } });
                partner.socket.emit('match success', { roomId, partner: { userid: user.userid, nickname: user.nickname } });

                console.log(`Match made in game '${game}' between ${user.nickname} and ${partner.socket.user.nickname} in room ${roomId}`);
            } else {
                // 조건에 맞는 사용자가 없으면 대기열에 추가
                waitingQueue.push({ socket, game });
                socket.emit('waiting', `Waiting for another player in ${game}...`);
            }
        });

        // 채팅 메시지 이벤트
        socket.on('chat message', (msg) => {
            console.log(`${user.nickname}: ${msg}`);
            io.emit('chat message', {
                username: user.nickname,
                message: msg
            });
        });

        // 연결 해제 이벤트
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete connectedUsers[socket.id];

            // 대기열에서도 사용자 제거
            const index = waitingQueue.findIndex(u => u.socket.id === socket.id);
            if (index !== -1) waitingQueue.splice(index, 1);
        });
    });

    return io;
}

module.exports = setupSocketIo;