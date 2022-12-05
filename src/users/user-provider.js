const UserRepo = require('./user-repo');
const jwtService = require('./util/jwt');
const bcrypt = require('bcrypt');
const Joi = require('joi');
require('dotenv').config();

const re_email =
    /^[A-Za-z0-9]([-_\.]?[0-9a-zA-z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-z])*\.[a-zA-z]{2,3}$/;
const re_password = /^[a-zA-Z0-9]{4,16}$/;

const userSchema = Joi.object({
    email: Joi.string().pattern(re_email).required(),
    password: Joi.string().pattern(re_password).required(),
});

class UserProvider {
    /* 
    // 현재 미사용
    kakaoCallback = async (req, res) => {
        // 카카오 Strategy에서 성공한다면 콜백 실행 (패스포트 사용시)
        // 토큰 생성 및 유저 정보 가공해서 전달하기
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 kakaoCallbace!!!!!');
        console.log('전달받은 req.user::::::', req.user);
        console.log('세션 req.session::::::', req.session);
        const accessToken = await req.user;
        const decodedId = await jwtService.validateAccessToken(accessToken);

        console.log('------------토큰 값 및 디코딩 결과--------------');
        console.log('accessToken ::::::::::::', accessToken);
        console.log('decodeId ::::::::::::', decodedId);

        console.log('--------------DB에서 유저 정보 가져와서 보낼 정보 가공 --------------');
        const userInfo = await this.getUserInfo(decodedId, accessToken);
        console.log('userInfo:::>', userInfo);
        res.header('Access-Control-Allow-Origin', '*');
        res.status(200).redirect('/user/kakao');
    };
    */

    getKakaoToken = async (req, res) => {
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 getKakaoToken!!!!!');
        console.log('전달받은 인가 코드 :::::::::::: ', req.query.code);

        const kakaoToken = await UserRepo.getKakaoToken(req.query.code);

        console.log('kakao에서 받아온 accessToken :::::::::::: ', kakaoToken);
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Content-Type', 'text/html; charset=utf-8');

        return res.send({ accessToken: kakaoToken });
    };

    /*
  1. 클라이언트에서 토큰 전달 받아서 카카오에 유저정보 요청
  2. DB의 유저정보와 비교하여 필요시 회원가입
  3. 유저정보 가공하여 클라이언트로 전달 => 쿠키로 토큰 전달 / 바디로 닉네임만 전달
    */
    getKakaoUserInfo = async (req, res, next) => {
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 getKakaoUserInfo!!!!!');

        try {
            const { authorization } = req.headers;
            const kakaoToken = (authorization || '').split(' ')[1];

            // 토큰 카카오에 보내고 유저정보 받아오기
            const kakaoUserInfo = await UserRepo.getKakaoUserInfo(kakaoToken);

            console.log('kakaoToken:::::: ', kakaoToken);
            console.log('kakaoUserInfo::::::', kakaoUserInfo);

            // 카카오에서서 받은 유저정보에서 이메일로 DB에 저장된 유저 확인, 존재한다면 유저정보 가져오기 (undefinded일 수도.)
            // 유저가 존재한다면 전달할 형태로 Refo에서 가공되어져서 받아옴!!
            const exUserInfo = await this.exUserGetToken(kakaoUserInfo);

            // 1. 가입한 유저 => 토큰 + 유저정보 바로 전달
            if (exUserInfo) {
                console.log('user-route.js 4, exUserInfo:::::', exUserInfo);
                console.log('--------------------------------------------');
                // await redis.set(refreshToken, payload.userId, { EX: 3600*24, NX: true });
                res.cookie('accessToken', exUserInfo.accessToken, {
                    expires: new Date(Date.now() + 1000 * 60 * 60),
                    secure: true,
                    httpOnly: true,
                    SameSite: 'None',
                });

                return res
                    .status(200)
                    .json({ nickname: exUserInfo.nickname, accessToken: exUserInfo.accessToken });
            }
            // 2. 미가입 유저 => 회원가입 + 토큰발급 후 토큰 + 유저정보 전달
            const newUserInfo = await this.createUserToken(kakaoUserInfo);
            console.log('user-provider.js, newUserInfo::::::', newUserInfo);
            console.log('-------------------쿠키설정-------------------------');
            /*
            // 프론트로 쿠키 전달되지 않아 쿠키 세팅 보류
            await redis.set(refreshToken, payload.userId, { EX: 3600*24, NX: true });
            res.cookie('accessToken', exUserInfo.accessToken, {
                expires: new Date(Date.now() + 1000 * 60 * 60),
                secure: true,
                httpOnly: true,
                SameSite: 'None',
            });
            */
            return res
                .status(201)
                .json({ nickname: newUserInfo.nickname, accessToken: newUserInfo.accessToken });
        } catch (e) {
            next(e);
        }
    };

    // 유저 정보 조회
    onlyGetPlayRecord = async (req, res) => {
        try {
            const { nickname } = req.params;
            if (!nickname) throw new Error('nickname을 입력해야 합니다.');
            const exUser = await UserRepo.findOneByNickname(nickname);
            if (!exUser) throw new Error('nickname과 일치하는 유저가 존재하지 않습니다.');

            const userInfo = await UserRepo.onlyGetPlayRecord(exUser);
            if (!userInfo.nickname === res.locals.user.nickname)
                throw new Error('nickname과 토큰 정보가 일치하지 않습니다.');
            console.log('res.locals.user:: ', res.locals.user);
            return res.status(200).json(userInfo);
        } catch (e) {
            console.log(e);
            return res.status(400).json({ error: e.message });
        }
    };

    localSignUp = async (req, res, next) => {
        try {
            const { email, password } = await userSchema.validateAsync(req.body).catch((error) => {
                // joi error msg
                const joiError = error.details[0].message.split('with')[0].replace(/"/g, '');
                throw new Error(`${joiError}형식을 확인해주세요`);
            });

            const exUser = await UserRepo.findOneByEmail(email);
            console.log(email, password);
            if (exUser) {
                throw new Error('이메일 중복');
            }

            let newUser = {};
            newUser.email = email;
            newUser.password = await bcrypt.hash(password, 12);

            // DB에 유저가 하나도 없다면 초기값 세팅
            const allUser = await UserRepo.findAllUser();
            const allUserCount = allUser.length;

            if (allUserCount === 0) {
                newUser._id = 1;
                newUser.nickname = 'Agent_001';
            } else {
                // 마지막 유저의 _id 값 + 1
                // 유저 배열의 length를 구하는 과정을 생략하기 위해 allUser.slice(-1)[0] 을 사용했었으나,
                // 어짜피 유저가 없는 상태인지 판단하기 위해 바로 위에서 allUser.length를 받아오고 있어서 의미가 없다고 판단
                // 해당 값을 재사용하는 것이 더 효율적일 것 같아 수정
                const n = +allUser[allUserCount - 1]._id + 1;
                console.log(`n :: ${n}`);
                // n이 1000이상이면 Agent_ 뒤에 그대로 붙이고, 1000보다 작으면 001 의 형태로 붙이기
                if (n < 1000) {
                    let nickNum = (0.001 * n).toFixed(3).toString().slice(2);
                    newUser.nickname = `Agent_${nickNum}`;
                } else {
                    newUser.nickname = `Agent_${n}`;
                }
                newUser._id = +n;
            }

            console.log('newUser ::', newUser);
            // 위에서 만든 값으로 newUser DB 에 저장하기
            const newUserInfo = await UserRepo.localSingUp(newUser);

            console.log(`newUser :: ${newUserInfo}`);
            return res.json({ msg: '회원가입 성공', newUserInfo });
        } catch (e) {
            console.error(e);
            return next(e);
        }
    };

    /*
  미들웨어
  ===========================================================================
  메소드
  */
    // DB에 유저 정보 없음 => DB 저장 / 토큰발급 / 토큰 + 유저 게임정보 리턴
    createUserToken = async (kakaoUserInfo) => {
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 createUserToken!!!!!');

        const allUser = await UserRepo.findAllUser();
        const newUser = await UserRepo.createNewUser(kakaoUserInfo, allUser);

        console.log('여기는 user-provider.js 3, newUser::::::', newUser);

        // 새로 생셩한 newUser에게 _id 값으로 토큰 발급
        const newUserToken = await jwtService.createAccessToken(newUser._id);

        // 클라이언트에 전달하기 위해 유저 정보 가공
        const playRecord = await UserRepo.getPlayRecord(newUser, newUserToken);

        return playRecord;
    };

    getUserInfo = async (decodedId, accessToken) => {
        const exUser = await UserRepo.findOneById(decodedId);
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 getUserInfo!!!!!');
        console.log('exUser::::::', exUser);

        const playRecord = await UserRepo.getPlayRecord(exUser, accessToken);
        return playRecord;
    };

    exUserGetToken = async (kakaoUserInfo) => {
        // 존재하는 유저일 경우 토큰 발급하여 가져오기
        console.log('-------------------------------------------');
        console.log('여기는 user-provider.js 의 exUserGetToken!!!!!');

        const exUser = await UserRepo.findOneByEmail(kakaoUserInfo.kakao_account.email);
        console.log('exUserGetToken 1, exUser:::::: ', exUser);

        if (exUser) {
            const accessToken = await jwtService.createAccessToken(exUser._id);
            console.log('exUserGetToken 2, accessToken::::::', accessToken);

            const playRecord = await UserRepo.getPlayRecord(exUser, accessToken);
            return playRecord;
        } else return;
    };
}

module.exports = new UserProvider();
