const passport = require('passport');
const local = require('./local-strategy');
const kakao = require('./kakao-stratege');
const User = require('../../schemas/user');
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
                return done(null, user); // req.user에 user 저장
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

// deserializeUser
- 매 요청 시 실행
- passport.session 미들웨어가 이 메서드 호출
- serializeUser 의 done 의 두 번째 인수로 넣었던 데이터가 deserializeUser의 매개변수
- 조회한 정보를 req.user에 저장하므로 앞으로 req.user를 통해 로그인한 사용자의 정보를 가져올 수 있다. 
- 세션에 불필요한 데이터를 담아두지 않기 위한 과정

*/
