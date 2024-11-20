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
//사용자가 작성한 게시글을 데이터베이스에 저장
const { createBoardPost, fetchBoardPosts, deleteBoardPost, updateBoardPost, fetchBoardPostById, incrementLikes, incrementDislikes} = require('./db');
const { generateToken, verifyToken } = require('./auth');
const methodOverride = require('method-override');//게시판 delete를 위한 미들웨어
app.use(methodOverride('_method')); // _method 쿼리 파라미터로 HTTP 메서드 재정의
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
                <a href="/logout">로그아웃</a>
                <a href="/mypage">마이페이지</a>
                <a href="/withdraw">탈퇴</a>
                <a href="/boards">게시판</a> <!-- 게시판 링크 추가 -->
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
    if (password == passwordcheck) {
        const user = await fetchUser(userid);
        if (user) {
            res.status(400).send(`이미 존재하는 아이디입니다 : ${userid}`);
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { userid, password: hashedPassword, email, nickname, birthdate, gender };
        await createUser(newUser);

        const token = generateToken({ userid: newUser.userid });
        res.cookie('auth_token', token, { httpOnly: true });
        res.redirect('/');
    } else {
        res.status(400).send('비밀번호가 일치하지 않습니다.');
    }
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

//게시판 페이지 로드
//데이터베이스에서 게시글 목록을 가져와 EJS템플릿으로 렌더링한다.
app.get('/boards', authenticateJWT, async (req, res) => {
    try {
        const posts = await fetchBoardPosts(); // 게시글 데이터 가져오기
        res.render('boards', { posts }); // EJS 템플릿으로 렌더링
    } catch (error) {
        console.error('Error fetching board posts:', error);
        res.status(500).send('Failed to fetch posts.');
    }
});

// 게시글 작성 라우트
app.post('/boards', authenticateJWT, async (req, res) => {
    const { title, content } = req.body;
    const user = req.user;

    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to write a post.');
    }

    try {
        const userData = await fetchUser(user.userid); // 사용자 정보 가져오기
        const nickname = userData.nickname; // 닉네임 추출

        const newPost = {
            title,
            content,
            author: nickname, // 작성자 닉네임
            authorId: user.userid, // 작성자 ID 추가
            createdAt: new Date(),
        };

        await createBoardPost(newPost); // 게시글 생성
        res.redirect('/boards'); // 게시판 페이지로 리디렉션
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send('Failed to create post.');
    }
});

//새 페이지를 렌더링
app.get('/boards/new', authenticateJWT, (req, res) => {
    if (!req.user) {
        return res.status(401).send('Unauthorized: Please log in to add a post.');
    }
    res.render('new-post'); // 새로운 게시글 작성 페이지 렌더링
});

const { ObjectId } = require('mongodb'); // MongoDB ObjectId 사용

// 게시글 삭제 라우트
app.delete('/boards/:id', authenticateJWT, async (req, res) => {
    const postId = req.params.id; // URL에서 게시글 ID 추출
    const user = req.user;

    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to delete a post.');
    }

    try {
        const post = await fetchBoardPostById(postId); // 게시글 데이터 가져오기
        if (!post) {
            return res.status(404).send('Post not found.');
        }

        if (post.authorId !== user.userid) {
            return res.status(403).send('Forbidden: You can only delete your own posts.');
        }

        await deleteBoardPost(postId); // MongoDB에서 게시글 삭제
        res.redirect('/boards'); // 삭제 후 게시판 목록으로 리디렉션
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Failed to delete post.');
    }
});

// 수정 페이지 렌더링
app.get('/boards/:id/edit', authenticateJWT, async (req, res) => {
    const postId = req.params.id;

    try {
        const post = await fetchBoardPostById(postId); // 특정 게시글 가져오기
        if (!post) {
            return res.status(404).send('Post not found.');
        }
        res.render('edit-post', { post }); // 수정 페이지 렌더링
    } catch (error) {
        console.error('Error loading edit page:', error);
        res.status(500).send('Failed to load edit page.');
    }
});

// 게시글 수정 처리
app.put('/boards/:id', authenticateJWT, async (req, res) => {
    const postId = req.params.id;
    const { title, content } = req.body;
    const user = req.user;

    if (!user) {
        return res.status(401).send('Unauthorized: Please log in to edit a post.');
    }

    try {
        const post = await fetchBoardPostById(postId); // 게시글 데이터 가져오기
        if (!post) {
            return res.status(404).send('Post not found.');
        }

        if (post.authorId !== user.userid) {
            return res.status(403).send('Forbidden: You can only edit your own posts.');
        }

        await updateBoardPost(postId, { title, content }); // 게시글 업데이트
        res.redirect('/boards'); // 수정 후 게시판 페이지로 리디렉션
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).send('Failed to update post.');
    }
});

//상세 페이지 라우트 추가
app.get('/boards/:id', authenticateJWT, async (req, res) => {
    const postId = req.params.id;

    try {
        const post = await fetchBoardPostById(postId); // 게시글 데이터 가져오기
        if (!post) {
            return res.status(404).send('Post not found.');
        }

        res.render('post-detail', { post }); // 상세 페이지 렌더링
    } catch (error) {
        console.error('Error fetching post details:', error);
        res.status(500).send('Failed to fetch post details.');
    }
});

// 좋아요 업데이트
app.post('/boards/:id/like', async (req, res) => {
    try {
        await incrementLikes(req.params.id); // incrementLikes 함수 호출
        const updatedPost = await fetchBoardPostById(req.params.id);
        res.json({ likes: updatedPost.likes, dislikes: updatedPost.dislikes });
    } catch (error) {
        console.error('Failed to update likes:', error);
        res.status(500).json({ error: 'Failed to update likes' });
    }
});

// 싫어요 업데이트
app.post('/boards/:id/dislike', async (req, res) => {
    try {
        await incrementDislikes(req.params.id); // incrementDislikes 함수 호출
        const updatedPost = await fetchBoardPostById(req.params.id);
        res.json({ likes: updatedPost.likes, dislikes: updatedPost.dislikes });
    } catch (error) {
        console.error('Failed to update dislikes:', error);
        res.status(500).json({ error: 'Failed to update dislikes' });
    }
});