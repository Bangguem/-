const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const app = express();
require('dotenv').config();
const http = require('http'); // HTTP 서버 모듈 불러오기
const socketIo = require('socket.io'); // Socket.io 모듈 불러오기
const server = http.createServer(app); // HTTP 서버 생성
const io = socketIo(server); // Socket.io 서버를 HTTP 서버에 연결
const { connectToMongo, fetchUser, createUser, removeUser, closeMongoConnection,
    createUserprofile, createSummoner, fetchUserByemail, updatePassword,
    saveVerificationCode, fetchVerificationCode, deleteVerificationCode,
    verifyVerificationCode } = require('./db');
const { generateToken, verifyToken } = require('./auth');
const nodemailer = require('nodemailer');
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
                <a href="/userprofile.html">프로필 수정</a>
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
    const { userid, password, passwordcheck, email, nickname, birthdate, gender } = req.body;

    if (password !== passwordcheck) {
        res.status(400).send('비밀번호가 일치하지 않습니다.');
        return;
    }

    const user = await fetchUser(userid);
    if (user) {
        res.status(400).send(`이미 존재하는 아이디입니다 : ${userid}`);
        return;
    }

    // 비밀번호 해싱 및 사용자 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { userid, password: hashedPassword, email, nickname, birthdate, gender };
    await createUser(newUser);

    const token = generateToken({ userid: newUser.userid });
    res.cookie('auth_token', token, { httpOnly: true });
    res.redirect('/');
});
// 중복 확인 API
app.post('/check-duplicate', async (req, res) => {
    const { userid } = req.body;
    const user = await fetchUser(userid);
    if (user) {
        res.status(400).send(`이미 존재하는 아이디입니다 : ${userid}`);
    } else {
        res.status(200).send('사용할 수 있는 아이디입니다.');
    }
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

function splitSummonerAndTag(input) {
    const [summonerName, tag = 'kr1'] = input.split('#');
    return { summonerName, tag };
}
//라이엇 정보 가져오기
app.post('/summonerInfo', authenticateJWT, async (req, res) => {
    const userData = req.user;
    if (userData) {
        const { summoner } = req.body;
        const { summonerName, tag } = splitSummonerAndTag(summoner);
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

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD,
    },
});

const crypto = require('crypto');
// 아이디 찾기 - 이메일 인증 코드 발송
app.post('/send-id-verification', async (req, res) => {
    const { email } = req.body;
    const user = await fetchUserByemail(email);

    if (!user) {
        return res.status(400).send('가입되지 않은 이메일입니다.');
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 300000; // 5분 유효

    // 인증 코드 저장
    await saveVerificationCode(email, verificationCode, expiresAt);

    // 이메일 발송
    await transporter.sendMail({
        from: process.env.NODEMAILER_USER,
        to: email,
        subject: '아이디 찾기 인증 코드',
        text: `인증 코드는 ${verificationCode}입니다.`,
    });

    res.send('인증 코드가 발송되었습니다.');
});

// 인증 코드 검증 및 아이디 반환
app.post('/verify-id-code', async (req, res) => {
    const { email, code } = req.body;

    // 인증 코드 검증
    const verificationResult = await verifyVerificationCode(email, code);
    if (!verificationResult.valid) {
        return res.status(400).send(verificationResult.reason);
    }

    // 인증 코드 삭제
    await deleteVerificationCode(email);

    // 사용자 정보 반환
    const user = await fetchUserByemail(email);
    if (!user) {
        return res.status(400).send('사용자를 찾을 수 없습니다.');
    }

    res.send(`아이디는 ${user.userid} 입니다.`);
});

// 비밀번호 찾기 - 이메일 인증 코드 발송
app.post('/send-password-verification', async (req, res) => {
    const { email } = req.body;
    const user = await fetchUserByemail(email);

    if (!user) {
        return res.status(400).send('가입되지 않은 이메일입니다.');
    }

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 300000; // 5분 유효

    // 인증 코드 저장
    await saveVerificationCode(email, verificationCode, expiresAt);

    // 이메일 발송
    await transporter.sendMail({
        from: process.env.NODEMAILER_USER,
        to: email,
        subject: '비밀번호 찾기 인증 코드',
        text: `인증 코드는 ${verificationCode}입니다.`,
    });

    res.send('인증 코드가 발송되었습니다.');
});

// 인증 코드 검증 및 비밀번호 변경
app.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    await fetchVerificationCode(email);

    const verificationResult = await verifyVerificationCode(email, code);
    if (!verificationResult) {
        return res.status(400).send(verificationResult.reason);
    }
    // 인증 코드 삭제
    await deleteVerificationCode(email);

    // 비밀번호 해싱 및 업데이트
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await updatePassword(email, hashedPassword);

        if (result.matchedCount > 0) {
            return res.send('비밀번호가 성공적으로 변경되었습니다.');
        } else {
            return res.status(400).send('사용자를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        return res.status(500).send('비밀번호를 변경하는 도중 문제가 발생했습니다.');
    }
});
