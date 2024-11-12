const socketIo = require('socket.io');
const { fetchUser } = require('./db'); // 필요한 함수 가져오기
const { verifyToken } = require('./auth');

function setupSocketIo(server) {
    const io = socketIo(server); // Socket.io 서버를 HTTP 서버에 연결
    const connectedUsers = {}; // 연결된 사용자들 관리
    const waitingNormalQueue = []; // 단일 대기열 관리
    let isProcessingQueue = false;


    const duoRestrictions = {
        "IRON": ["IRON", "BRONZE", "SILVER"],
        "BRONZE": ["IRON", "BRONZE", "SILVER"],
        "SILVER": ["IRON", "BRONZE", "SILVER", "GOLD"],
        "GOLD": ["SILVER", "GOLD", "PLATINUM"],
        "PLATINUM": ["GOLD", "PLATINUM", "EMERALD"],
        "EMERALD IV": ["PLATINUM", "EMERALD"],
        "EMERALD III": ["PLATINUM", "EMERALD"],
        "EMERALD II": ["PLATINUM", "EMERALD", "DIAMOND IV"],
        "EMERALD I": ["PLATINUM", "EMERALD", "DIAMOND IV", "DIAMOND III"],
        "DIAMOND IV": ["EMERALD II", "EMERALD I", "DIAMOND IV", "DIAMOND III", "DIAMOND II"],
        "DIAMOND III": ["EMERALD I", "DIAMOND IV", "DIAMOND III", "DIAMOND II", "DIAMOND I"],
        "DIAMOND II": ["DIAMOND IV", "DIAMOND III", "DIAMOND II", "DIAMOND I"],
        "DIAMOND I": ["DIAMOND III", "DIAMOND II", "DIAMOND I", "MASTER"],
        "MASTER": ["DIAMOND I", "GRANDMASTER"],
        "GRANDMASTER": ["SOLO ONLY"],
        "CHALLENGER": ["SOLO ONLY"]
    };

    function getMatchableRanks(tier, rank) {
        const allowedTiers = duoRestrictions[tier];
        if (!allowedTiers) return null;

        if (typeof allowedTiers === 'object') {
            // 에메랄드와 다이아몬드 구간을 처리
            return allowedTiers[rank] ? { tiers: allowedTiers[rank], ranks: rank } : null;
        }

        return { tiers: allowedTiers, ranks: [rank] };
    }

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

        // 사용자 연결 정보 저장
        connectedUsers[socket.id] = {
            userid: user.userid,
            nickname: user.nickname,
            socket: socket,
        };

        // 매칭 요청 이벤트
        socket.on('request rankmatch', async (socket) => {
            const user = await fetchUser(socket.user.userid);
            console.log(`User ${socket.id} is requesting match for game: ${game}`);
            const matchableRanks = getMatchableRanks(user.summonerRank.tier, user.summonerRank.rank);
            if (!matchableRanks) {
                socket.emit('matchError', '매칭가능한 티어가 아닙니다.')
                return;
            }

            waitingQueue.push({ user, socket });

        });
        //--------------------일반 게임 매칭--------------------//
        async function processQueue() {
            if (isProcessingQueue) return;
            isProcessingQueue = true;

            while (waitingNormalQueue.length >= 2) {
                const match1 = waitingNormalQueue.shift();
                const match2 = waitingNormalQueue.shift();
                const roomName = `normal_room_${match1.socket.id}_${match2.socket.id}`;

                match1.socket.join(roomName);
                match2.socket.join(roomName);
                console.log(`${roomName}`);

                // 각 사용자에게 상대방 정보 포함하여 매칭 성공 메시지 전송
                match1.socket.emit('matchSuccess', {
                    partner: { nickname: match2.user.nickname, age: match2.user.age },
                    self: { nickname: match1.user.nickname, age: match1.user.age }
                });

                match2.socket.emit('matchSuccess', {
                    partner: { nickname: match1.user.nickname, age: match1.user.age },
                    self: { nickname: match2.user.nickname, age: match2.user.age }
                });
            }
            isProcessingQueue = false;
        }

        socket.on('request normalmatch', async () => {
            const user = await fetchUser(socket.user.userid);
            const isUserInQueue = waitingNormalQueue.some(entry => entry.user.userid === user.userid);

            if (isUserInQueue) {
                // 동일한 사용자가 이미 대기 중일 경우 클라이언트에 알림 전송
                socket.emit('alreadyInQueue', { message: "You are already in the queue!" });
                return; // 대기열에 추가하지 않고 종료
            }

            waitingNormalQueue.push({ user, socket });
            processQueue(); // 요청이 올 때마다 대기열 처리 시도
        });
        //--------------------일반 게임 매칭--------------------//


        // 채팅 메시지 이벤트
        socket.on('chat message', (msg) => {
            console.log(`${user.nickname}: ${msg}`);
            io.emit('chat message', {
                username: user.nickname,
                message: msg
            });
        });

        socket.on('cancel match', () => {
            // 대기열에서 사용자를 제거
            const index = waitingNormalQueue.findIndex(entry => entry.socket.id === socket.id);
            if (index !== -1) {
                waitingNormalQueue.splice(index, 1); // 대기열에서 사용자 제거
                socket.emit('matchCancelled', { message: "You have successfully left the queue." });
            }
        });

        // 사용자가 연결을 끊었을 때 처리
        socket.on('disconnect', () => {
            // 대기열에서 사용자를 제거
            const index = waitingNormalQueue.findIndex(entry => entry.socket.id === socket.id);
            if (index !== -1) {
                waitingNormalQueue.splice(index, 1); // 대기열에서 사용자 제거
            }
        });
    });

    return io;
}

module.exports = setupSocketIo;