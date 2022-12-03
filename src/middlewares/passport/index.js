const passport = require('passport');
const local = require('./local-strategy');
const kakao = require('./kakao-stratege');
const User = require('../../schemas/user');
const jwtService = require('../../users/jwt');
require('dotenv').config();

module.exports = () => {
    passport.serializeUser((user, done) => {
        console.log('/passport/index.js serializeUser');
        console.log('user :::', user.nickname);
        done(null, user.nickname);
    });

    passport.deserializeUser((nickname, done) => {
        console.log('/passport/index.js DDDDDeserializeUser');
        console.log(`닉네임 전달 받음? :::>> ${nickname}`);
        User.findOne({ nickname })
            .then((user) => {
                console.log('여기는 then!! user: ', user);
                return done(null, user);
            })
            .catch((err) => done(err));
    });
    local();
    kakao();
};

/*
    
    // serializeUser
    - 로그인 시 실행 
    - req.session(세션) 객체에 어떤 데이터를 저장할지 정하는 메서드

    // done(arg1, arg2)
    - arg1 : error
    - arg2 : 저장하고 싶은 데이터
             세션에 저장해야 하는 데이터이므로 필요한 정보만 저장한다.

    */

/*


*/
