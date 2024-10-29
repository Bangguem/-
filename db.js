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

async function fetchPuuid(summonerName, tag) {
    const apiKey = process.env.RIOT_API_KEY;
    const url = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tag}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data.puuid; // Return the `puuid`
    } catch (error) {
        console.error('Failed to fetch puuid', error);
        throw error;
    }
}

// Function to fetch summoner information using `puuid`
async function fetchSummonerIdByPuuid(puuid) {
    const apiKey = process.env.RIOT_API_KEY;
    const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data; // Return the summoner data
    } catch (error) {
        console.error('Failed to fetch summoner info by puuid', error);
        throw error;
    }
}

// Function to fetch summoner rank information using `id`
async function fetchSummonerInfoByid(id) {
    const apiKey = process.env.RIOT_API_KEY;
    const url = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data; // Return the summoner rank data
    } catch (error) {
        console.error('Failed to fetch summoner rank info by id', error);
        throw error;
    }
}

async function createSummoner(summonerprofile) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const puuid = await fetchPuuid(summonerprofile.summonerName, summonerprofile.tag);
    const summonerInfo = await fetchSummonerIdByPuuid(puuid);
    const summonerRankData = await fetchSummonerInfoByid(summonerInfo.id);
    const summonerRank = summonerRankData.length > 0 ? summonerRankData[0] : null;

    return await collection.updateOne(
        { userid: summonerprofile.userid },
        {
            $set: {
                summonerInfo,
                summonerRank,
                SummonerName: summonerprofile.summonerName,
                Tag: summonerprofile.tag
            }
        }
    );
}

module.exports = {
    connectToMongo,
    fetchUser,
    createUser,
    removeUser,
    closeMongoConnection,
    createUserprofile,
    fetchPuuid,
    fetchSummonerIdByPuuid,
    fetchSummonerInfoByid,
    createSummoner
}