const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares/local-login');
const UserProvider = require('./user-provider');
const User = require('../schemas/user');

const router = express.Router();

// 로그인 미들웨어, 인증 미들웨어 현재 미사용
// const loginMiddleware = require('../middlewares/login-middleware');
// const authMiddleware = require('../middlewares/auth-middleware');

// 넌적스에서 user 객체를 통해 사용자 정보에 접근할 수 있다 ? 프론트에서 유저 정보 접근할 수 있다는 말인가?
router.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.followerCount = 0;
    res.locals.followingCount = 0;
    res.locals.followerIdList = [];
    next();
});

// 카카오 로그인 1 : 클라이언트에서 인가코드 전달 받음 =>  카카오로 토큰 요청 =>  클라이언트에 카카오 토큰 전달
router.get('/api/auth/kakao/callback', /* loginMiddleware,*/ UserProvider.getKakaoToken);

// 카카오 로그인 2 : 토큰으로 카카오에 유저정보 전달하여 클라이언트에 새 토큰 + 유저정보 전달
router.post('/api/auth/kakao/callback', /* loginMiddleware,*/ UserProvider.getKakaoUserInfo);

// 유저 정보 조회
router.get('/api/user', isLoggedIn, /* authMiddleware,*/ UserProvider.onlyGetPlayRecord);

// 일반 회원가입
router.post('/api/join', isNotLoggedIn, async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const exUser = await User.findOne({ email });
        if (exUser) {
            return res.redirect('/join?error=exist');
        }
        const hash = await bcrypt.hash(password, 12);

        let nickNum, nickname, _id;
        // DB에 유저가 하나도 없다면 초기값 세팅
        const allUser = await User.find();
        if (allUser.length === 0) {
            _id = 1;
            nickname = 'Agent_001';
        } else {
            const lastNum = allUser.slice(-1)[0]._id; // 마지막 document 의 nickname

            let n = +lastNum + 1; // nickname 에서 Agent_ 뒷부분만 가져온 후 Number 변환
            console.log(`n :: ${n}`);
            // n이 1000이상이면 Agent_ 뒤에 그대로 붙이고, 1000보다 작으면 001 의 형태로 붙이기
            if (n < 1000) {
                nickNum = (0.001 * n).toFixed(3).toString().slice(2);
                nickname = `Agent_${nickNum}`;
            } else {
                nickname = `Agent_${n}`;
            }
            _id = +nickNum;
        }
        // 위에서 만든 값으로 newUser DB 에 저장하기
        const newUser = await User.create({
            _id,
            nickname,
            email,
            password: hash,
        });

        console.log(`newUser :: ${newUser}`);
        return res.send('회원가입 성공');
    } catch (e) {
        console.error(e);
        return next(e);
    }
});

// 일반 로그인
router.post('/api/login', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local', (authError, user, info) => {
        if (authError) {
            console.error(authError);
            return next(authError);
        }
        if (!user) {
            return res.redirect('/?loginError=${info.message}');
        }
        return req.login(user, (loginError) => {
            if (loginError) {
                console.error(loginError);
                return next(loginError);
            }
            return res.redirect('/');
        });
    })(req, res, next); // 미들웨어 내의 미들웨어에는 (req, res, next)를 붙인다.
});

// 로그아웃
router.post('/api/logout', isLoggedIn, (req, res) => {
    req.logout();
    console.log('res.locals.user ::', res.locals.user);
    req.session.destroy();
    console.log('req.session ::', req.session);
    res.redirect('/');
});

// passport kakao login
router.get('/kakao', passport.authenticate('kakao'));

router.get(
    '/kakao/callback',
    passport.authenticate('kakao', {
        failureRedirect: '/',
    }),
    (req, res) => {
        res.redirect('/');
    }
);

module.exports = router;
