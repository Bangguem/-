// auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT 토큰 생성 함수
function generateToken(payload) {
    // 토큰은 2분간 유효하도록 설정
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2m' });
}

// JWT 토큰 검증 함수
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null; // 토큰이 유효하지 않으면 null 반환
    }
}

module.exports = {
    generateToken,
    verifyToken
};