const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { isLoggedIn, isNotLoggedIn } = require('../middlewares/passport/local-login-middleware');
const UserProvider = require('./user-provider');
const User = require('../schemas/user');

const router = express.Router();

// 로그인 미들웨어, 인증 미들웨어 현재 미사용
// const loginMiddleware = require('../middlewares/login-middleware');
// const authMiddleware = require('../middlewares/auth-middleware');

// 넌적스에서 user 객체를 통해 사용자 정보에 접근할 수 있다 ? 이게 무슨 말 ?
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
router.post('/api/user/:nickname', /* authMiddleware,*/ UserProvider.onlyGetPlayRecord);

// 일반 회원가입
router.post('/api/join', isNotLoggedIn, async (req, res, next) => {
    const { email, nickname, password } = req.body;
    try {
        const exUser = await User.findOne({ email });
        if (exUser) {
            return res.redirect('/join?error=exist');
        }
        const hash = await bcrypt.hash(password, 12);
        await User.create({
            email,
            nickname,
            password: hash,
        });
    } catch (e) {
        console.error(e);
        return next(e);
    }
    res.render('join', { title: '회원가입 - WeAllLie' });
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
router.get('/logout', isLoggedIn, (req, res) => {
    req.logout();
    req.session.destroy();
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
