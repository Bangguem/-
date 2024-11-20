require('dotenv').config(); // .env 파일에서 환경 변수를 로드합니다.
const axios = require('axios');
const { response } = require('express');
const { MongoClient } = require("mongodb");
const DDRAGON_VERSION = '14.22.1'; // 최신 버전으로 업데이트 필요
const DDRAGON_LANGUAGE = 'en_US'; // 원하는 언어 설정


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
    return await collection.findOne({ userid: userid });
}

async function fetchUserByemail(email) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    return await collection.findOne({ email: email });
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

async function updatePassword(email, hashedPassword) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.updateOne(
        { email: email },
        { $set: { password: hashedPassword } }
    );
    return result;
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
// DDragon에서 챔피언 ID와 이름 매핑 생성
async function getChampionIdToNameMap() {
    try {
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/${DDRAGON_LANGUAGE}/champion.json`);
        const championsData = response.data.data;

        // 챔피언 ID와 이름 매핑 생성
        const championIdToNameMap = {};
        for (const championKey in championsData) {
            const champion = championsData[championKey];
            championIdToNameMap[champion.key] = {
                name: champion.name,          // 한국어 이름 (또는 사용 중인 언어)
                englishName: champion.id      // 영어 이름 (아이콘 URL에 사용)
            };
        }
        return championIdToNameMap;
    } catch (error) {
        console.error('Error fetching champion data from DDragon:', error.message);
        throw error;
    }
}

// 숙련도 높은 5개 챔피언 가져오기
async function getTop5Champions(puuid) {
    const apiKey = process.env.RIOT_API_KEY;
    const url = `https://kr.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}?api_key=${apiKey}`;
    try {
        // 챔피언 마스터리 정보 가져오기
        const response = await axios.get(url);
        const top5Champions = response.data.slice(0, 5);

        // DDragon에서 챔피언 ID와 이름 매핑 생성
        const championIdToNameMap = await getChampionIdToNameMap();

        // 챔피언 ID를 이름과 아이콘 URL로 변환
        const top5ChampionsWithIcons = top5Champions.map(champion => {
            const championData = championIdToNameMap[champion.championId.toString()];
            const iconUrl = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championData.englishName}.png`;
            const loadingUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championData.englishName}_0.jpg`
            return {
                championName: championData.name,
                masteryPoints: champion.championPoints,
                masteryLevel: champion.championLevel,
                iconUrl: iconUrl,
                loadingUrl: loadingUrl
            };
        });

        return top5ChampionsWithIcons;
    } catch (error) {
        console.error('Error fetching top champions:', error.message);
        throw error;
    }
}


async function createSummoner(summonerprofile) {
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    const puuid = await fetchPuuid(summonerprofile.summonerName, summonerprofile.tag);
    const summonerInfo = await fetchSummonerIdByPuuid(puuid);
    const summonerRankData = await fetchSummonerInfoByid(summonerInfo.id);
    const top5Champions = await getTop5Champions(puuid);
    const summonerRank = summonerRankData.length > 0 ? summonerRankData[0] : null;

    return await collection.updateOne(
        { userid: summonerprofile.userid },
        {
            $set: {
                summonerInfo,
                summonerRank,
                top5Champions,
                SummonerName: summonerprofile.summonerName,
                Tag: summonerprofile.tag
            }
        }
    );
}

async function saveVerificationCode(email, code, expiresAt) {
    const db = client.db(DB_NAME);
    const collection = db.collection('verificationCodes');
    await collection.updateOne(
        { email: email },
        { $set: { code: code, expiresAt: expiresAt } },
        { upsert: true } // 문서가 없으면 새로 생성
    );
}

async function fetchVerificationCode(email) {
    const db = client.db(DB_NAME);
    const collection = db.collection('verificationCodes');
    return await collection.findOne({ email: email });
}

async function deleteVerificationCode(email) {
    const db = client.db(DB_NAME);
    const collection = db.collection('verificationCodes');
    await collection.deleteOne({ email: email });
}

async function verifyVerificationCode(email, code) {
    const db = client.db(DB_NAME);
    const collection = db.collection('verificationCodes');
    const record = await collection.findOne({ email: email });

    if (!record) {
        return { valid: false, reason: '인증 코드가 존재하지 않습니다.' };
    }

    if (record.code !== code) {
        return { valid: false, reason: '인증 코드가 일치하지 않습니다.' };
    }

    if (Date.now() > record.expiresAt) {
        return { valid: false, reason: '인증 코드가 만료되었습니다.' };
    }

    return { valid: true };
}

module.exports = {
    connectToMongo,
    fetchUser,
    createUser,
    removeUser,
    closeMongoConnection,
    createUserprofile,
    createSummoner,
    fetchUserByemail,
    updatePassword,
    saveVerificationCode,
    fetchVerificationCode,
    deleteVerificationCode,
    verifyVerificationCode
}