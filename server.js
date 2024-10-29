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
const { connectToMongo, fetchUser, createUser, removeUser, closeMongoConnection, createUserprofile, createSummoner } = require('./db');
const { generateToken, verifyToken } = require('./auth');
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use(cookieParser()); // 쿠키 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 요청 본문 파싱
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
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
                <a href="/mypage">My Page</a>
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

    const token = generateToken({ userid: newUser.userid });
    res.cookie('auth_token', token, { httpOnly: true });
    res.redirect('/userprofile.html');
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


//사용자 정보 수정
app.post('/userprofile', authenticateJWT, async (req, res) => {
    const userData = req.user;

    if (userData) {
        const { nickname, birthdate, gender } = req.body;

        try {
            const userprofile = {
                userid: userData.userid,
                nickname,
                birthdate,
                gender,
            };
            await createUserprofile(userprofile);
            res.redirect('/'); // 저장 후 홈 페이지로 이동
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).send('Failed to update profile');
        }
    } else {
        res.status(404).send('User Not Found');
    }
});

app.post('/summonerInfo', authenticateJWT, async (req, res) => {
    const userData = req.user;
    if (userData) {
        const { summonerName, tag } = req.body;
        try {
            const summonerprofile = {
                userid: userData.userid,
                summonerName,
                tag,
            };
            await createSummoner(summonerprofile);
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).send('소환사 정보 가져오기 실패');
        }
    } else {
        res.status(404).send('User Not Found');
    }
});


//마이페이지
app.get('/mypage', authenticateJWT, async (req, res) => {
    try {
        const userData = req.user; // JWT에서 사용자 정보 추출
        if (!userData) {
            return res.status(401).send('Unauthorized: No user found');
        }

        const user = await fetchUser(userData.userid); // 새로 분리한 함수 사용

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('mypage', { user }); // EJS 템플릿에 사용자 정보 전달
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Error fetching user information');
    }
});


let waitingUsers = [];
let chatRooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);


})