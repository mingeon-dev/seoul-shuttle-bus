// fetch-stations.js (수정된 버전)
const https = require('https');
const http = require('http');

// 서울시 공공데이터 API 키 설정
// 공개 저장소에 커밋하기 전에 YOUR_API_KEY를 실제 API 키로 변경하세요
const API_KEY = 'YOUR_SEOUL_API_KEY';
const stationIds = [
    // 송파구 임시1번
    '24101', '24102', '24109', '24468', '24406',
    '24119', '24120', '24397', '24431', '24105',
    '24106', '24107', '24108', '24101',
    // 송파구 임시2번
    '24157', '24158', '24436', '24437', '24159', '24160', '24162', '24156',
    // 송파구 임시3번
    '24138', '24148', '24150', '24171', '24481', '24483', '24543', '24190',
    '24187', '24185', '24176', '24175', '24174', '24173', '24172', '24149', '24147', '24138',
    // 송파구 임시4번
    '24380', '24363', '24371', '24370', '24369', '24910', '24379', '24380',
    // 송파구 임시5번
    '24319', '24329', '24345', '24357', '24267', '24269', '24255', '24117',
    '24253', '24350', '24351', '24352', '24332', '24392', '24330', '24319',
    // 송파구 임시6번
    '24418', '24416', '24414', '24412', '24492', '24509', '24493', '24441',
    '24427', '24192', '24448', '24450', '24452', '24309', '24307', '24317',
    '24316', '24455', '24424', '24443', '24418',
    // 송파구 임시7번
    '24429', '24290', '24291', '24293', '24296', '24298', '24304', '24299',
    '24306', '24273', '24276', '24402', '24279', '24280', '24429',
    // 송파구 임시8번
    '24571', '24126', '24396', '24217', '24221', '24222', '24223', '24224',
    '24391', '24220', '24214', '24215', '24571',
    // 송파구 임시9번
    '24409', '24268', '24266', '24250', '24338', '24524', '24525', '24247',
    '24245', '24242', '24235', '24236', '24237', '24409'
];

function fetchStations(startIndex, endIndex) {
    return new Promise((resolve, reject) => {
        const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/busStopLocationXyInfo/${startIndex}/${endIndex}/`;
        
        http.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (json.busStopLocationXyInfo) {
                        const stations = json.busStopLocationXyInfo.row || [];
                        resolve(stations);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

async function getAllStations() {
    const allStations = [];
    let startIndex = 1;
    const pageSize = 1000;
    
    console.log('서울시 정류소 정보 조회 중...');
    
    while (true) {
        try {
            const stations = await fetchStations(startIndex, startIndex + pageSize - 1);
            
            if (!stations || stations.length === 0) {
                break;
            }
            
            allStations.push(...stations);
            console.log(`${allStations.length}개 정류소 정보 조회됨...`);
            
            if (stations.length < pageSize) {
                break;
            }
            
            startIndex += pageSize;
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error:', error);
            break;
        }
    }
    
    return allStations;
}

async function main() {
    const allStations = await getAllStations();
    console.log(`\n총 ${allStations.length}개 정류소 정보 조회 완료\n`);
    
    const result = [];
    const foundIds = new Set();
    
    stationIds.forEach(id => {
        if (foundIds.has(id)) {
            return; // 중복 제거
        }
        
        // 실제 필드명: STOPS_NO
        const station = allStations.find(s => 
            s.STOPS_NO === id || 
            s.STOPS_NO === String(id) ||
            String(s.STOPS_NO) === String(id)
        );
        
        if (station) {
            foundIds.add(id);
            const name = station.STOPS_NM || '알 수 없음';
            const lat = parseFloat(station.YCRD) || 0;  // YCRD가 위도
            const lng = parseFloat(station.XCRD) || 0;   // XCRD가 경도
            
            result.push({
                name: name,
                lat: lat,
                lng: lng
            });
            console.log(`✓ ${id}: ${name} (${lat}, ${lng})`);
        } else {
            console.log(`✗ ${id}: 정류소를 찾을 수 없습니다`);
        }
    });
    
    console.log('\n// routes.js의 stations 배열에 추가할 내용:\n');
    console.log('stations: [');
    result.forEach((station, index) => {
        const comma = index < result.length - 1 ? ',' : '';
        console.log(`            { name: '${station.name}', lat: ${station.lat}, lng: ${station.lng} }${comma}`);
    });
    console.log('        ],');
}

main().catch(console.error);