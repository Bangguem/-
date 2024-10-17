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
const { connectToMongo, fetchUser, createUser, removeUser, closeMongoConnection } = require('./db');
const { generateToken, verifyToken } = require('./auth');
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

app.get('/', authenticateJWT, async (req, res) => {
    const userData = req.user;

    if (userData) {
        const user = await fetchUser(userData.userid);
        if (user) {
            res.status(200).send(`
                <a href="/logout">Log Out</a>
                <a href="/withdraw">Withdraw</a>
                <h1>id:${user.userid}</h1>
                `);

        }
        else {
            res.status(404).send('User not found');
        }
    } else {
        res.status(200).send(`
            <a href="/login.html">Log In</a>
            <a href="/signup.html">Sign Up</a>
            <h1>Not Logged In</h1>
            `);
    }


});





app.post('/signup', async (req, res) => {
    const { userid, password } = req.body;
    const user = await fetchUser(userid);
    if (user) {
        res.status(400).send(`이미 존재하는 아이디입니다 : ${userid}`);
        return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { userid, password: hashedPassword };
    await createUser(newUser);

    res.cookie(USER_COOKIE_KEY, JSON.stringify({ userid: newUser.userid }));
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/');
});

app.post('/login', async (req, res) => {
    const { userid, password } = req.body;
    const user = await fetchUser(userid);

    if (!user) {
        res.status(400).send(`가입되지않은 계정입니다.`);
        return;
    }
    const matchPassword = await bcrypt.compare(password, user.password);
    if (!matchPassword) {
        res.status(400).send('비밀번호가 틀립니다.');
        return;
    }
    const token = generateToken({ userid: user.userid });
    res.cookie('auth_token', token, { httpOnly: true });
    res.redirect('/');
});

app.get('/withdraw', authenticateJWT, async (req, res) => {
    const user = req.user;
    try {
        const isDeleted = await removeUser(user.userid);
        if (isDeleted) {
            res.clearCookie('auth_token');
            res.redirect('/');
        } else {
            res.status(404).send('User not found in database');
        }
    } catch (error) {
        console.error('Error during withdrawal:', error);
        res.status(500).send('Error during account withdrawal');
    }
});
