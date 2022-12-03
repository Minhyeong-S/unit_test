exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(403).send('로그인 필요');
    }
};

exports.isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        next();
    } else {
        const message = encodeURIComponent('로그인한 상태입니다.');
        res.redirect(`/?error=${message}`);
    }
};

/* 
// 로그인 여부 확인하기
(Passport 가 req 객체에 isAuthenticated 메서드를 추가한다.)
- 로그인 중 : isAuthenticated() = true
- 로그아웃 상태 : isAuthenticated() = false\
*/
