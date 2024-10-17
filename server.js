const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const app = express();
const USER_COOKIE_KEY = 'USER';
const http = require('http'); // HTTP 서버 모듈 불러오기
const socketIo = require('socket.io'); // Socket.io 모듈 불러오기
const server = http.createServer(app); // HTTP 서버 생성
const io = socketIo(server); // Socket.io 서버를 HTTP 서버에 연결


app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use(cookieParser()); // 쿠키 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱

// MongoDB에 연결한 후 서버를 시작합니다.
connectToMongo().then(() => {
    app.listen(3000, () => {
        console.log('server is running at 3000');
    });
});

function authenticateJWT(req, res, next) {
    const token = req.cookies.auth_token;

    if (!token) {
        req.user = null; // 토큰이 없으면 사용자 정보를 null로 설정
        return next();
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded) {
        req.user = null; // 토큰이 유효하지 않으면 사용자 정보를 null로 설정
        return next();
    }

    // 검증이 완료되면 req.user에 사용자 정보 추가
    req.user = decoded;
    next();
}