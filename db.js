require('dotenv').config(); // .env 파일에서 환경 변수를 로드합니다.
const axios = require('axios');
const { MongoClient } = require("mongodb");

// MongoDB 연결 URL을 환경 변수에서 가져옵니다.
const url = process.env.MONGODB_URI;

// MongoDB 클라이언트 인스턴스를 생성합니다.
const client = new MongoClient(url);

// 데이터베이스와 컬렉션 이름을 정의합니다.
const DB_NAME = 'userDB';
const COLLECTION_NAME = 'users';

// MongoDB에 연결하는 비동기 함수입니다.
async function connectToMongo() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        return client.db(DB_NAME);
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1); // 연결 실패 시 프로세스를 종료합니다.
    }
}

async function fetchUser(userid) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    return await collection.findOne({ userid });
}

async function createUser(newUser) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    return await collection.insertOne(newUser);
}

async function removeUser(userid) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteOne({ userid });
    return result.deletedCount > 0;
}

async function createUserprofile(userprofile) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    return await collection.updateOne(
        { userid: userprofile.userid }, // `userid`로 문서 찾기
        {
            $set: {
                nickname: userprofile.nickname,
                birthdate: userprofile.birthdate,
                gender: userprofile.gender
            }
        }
    );
}


async function closeMongoConnection() {
    await client.close();
    console.log('MongoDB 접속 해제');
}

async function fetchUserProfile(userid) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // 해당 사용자 정보 가져오기 (비밀번호 제외)
    return await collection.findOne(
        { userid },
        { projection: { password: 0 } }
    );
}

module.exports = {
    connectToMongo,
    fetchUser,
    createUser,
    removeUser,
    closeMongoConnection,
    createUserprofile,
    fetchUserProfile
}