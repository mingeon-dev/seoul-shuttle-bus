// 네이버 지도 초기화 및 셔틀 버스 노선 표시 앱

// 상수 정의
const CONSTANTS = {
    DEFAULT_COLOR: '#667eea',
    MARKER_SIZE: 30,
    MARKER_OFFSET_DISTANCE: 0.00003,
    LOCATION_MARKER_SIZE: 40,
    DEFAULT_ZOOM: 12,
    DETAIL_ZOOM: 16,
    SEOUL_CENTER: { lat: 37.5665, lng: 126.9780 }
};

// 유틸리티 함수들
const Utils = {
    // 구 추출 (캐싱)
    districtCache: new Map(),
    
    getDistrict(routeName) {
        if (this.districtCache.has(routeName)) {
            return this.districtCache.get(routeName);
        }
        const match = routeName.match(/^([가-힣]+구)/);
        const district = match ? match[1] : null;
        this.districtCache.set(routeName, district);
        return district;
    },
    
    // 시간 문자열을 분 단위로 변환
    parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    },
    
    // 현재 시간을 분 단위로 변환
    getCurrentTimeInMinutes() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    },
    
    // 정류소명 가져오기
    getStationName(station) {
        return station.name || (station.stationId ? `정류소 ID: ${station.stationId}` : '정류소');
    },
    
    // HTML 이스케이프 (XSS 방지)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

let map;
let markers = [];
let polylines = [];
let currentRouteId = null;
let currentLocationMarker = null;
let currentDistrict = '';
let infoWindows = []; // 정보창 관리

// 직선 폴리라인 생성
function createSimplePolyline(stations, routeColor) {
    if (stations.length < 2) return;
    
    const path = stations.map(station => 
        new naver.maps.LatLng(station.lat, station.lng)
    );
    
    // 첫 번째와 마지막 정류소의 위치가 다른 경우 연결선 추가
    const firstStation = stations[0];
    const lastStation = stations[stations.length - 1];
    
    if (firstStation.lat !== lastStation.lat || firstStation.lng !== lastStation.lng) {
        path.push(new naver.maps.LatLng(firstStation.lat, firstStation.lng));
    }
    
    const polyline = new naver.maps.Polyline({
        map: map,
        path: path,
        strokeColor: routeColor,
        strokeWeight: 5,
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
    });
    
    polylines.push(polyline);
}

// 마커 아이콘 HTML 생성 (캐싱)
const markerIconCache = new Map();

function createMarkerIconHTML(routeColor, index) {
    const cacheKey = `${routeColor}-${index}`;
    if (markerIconCache.has(cacheKey)) {
        return markerIconCache.get(cacheKey);
    }
    
    const html = `
        <div style="
            background-color: ${routeColor};
            width: ${CONSTANTS.MARKER_SIZE}px;
            height: ${CONSTANTS.MARKER_SIZE}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            position: relative;
        ">${index}</div>
    `;
    
    markerIconCache.set(cacheKey, html);
    return html;
}

// 정보창 HTML 생성
function createInfoWindowHTML(station, route, index, groupSize) {
    const stationName = Utils.getStationName(station);
    const escapedName = Utils.escapeHtml(stationName);
    const escapedRouteName = Utils.escapeHtml(route.name);
    
    return `
        <div style="padding: 10px; min-width: 150px;">
            <strong style="color: ${route.color};">${escapedName}</strong><br>
            ${station.stationId && station.name ? `<span style="font-size: 11px; color: #888;">정류소 ID: ${station.stationId}</span><br>` : ''}
            ${groupSize > 1 ? `<span style="font-size: 10px; color: #999;">같은 위치에 ${groupSize}개 정류소</span><br>` : ''}
            <span style="font-size: 12px; color: #666;">${escapedRouteName}</span>
        </div>
    `;
}

// 단일 마커 생성
function createMarker(station, route, index, position, groupSize = 1) {
    const marker = new naver.maps.Marker({
        position: position,
        map: map,
        title: Utils.getStationName(station),
        icon: {
            content: createMarkerIconHTML(route.color, index),
            anchor: new naver.maps.Point(CONSTANTS.MARKER_SIZE / 2, CONSTANTS.MARKER_SIZE / 2)
        },
        zIndex: 1000 + index
    });
    
    const infoWindow = new naver.maps.InfoWindow({
        content: createInfoWindowHTML(station, route, index, groupSize)
    });
    
    naver.maps.Event.addListener(marker, 'click', () => {
        // 다른 정보창 닫기
        infoWindows.forEach(iw => iw.close());
        infoWindow.open(map, marker);
    });
    
    markers.push(marker);
    infoWindows.push(infoWindow);
}

// 지도 초기화
function initMap() {
    const seoulCenter = new naver.maps.LatLng(
        CONSTANTS.SEOUL_CENTER.lat, 
        CONSTANTS.SEOUL_CENTER.lng
    );
    
    const mapOptions = {
        center: seoulCenter,
        zoom: CONSTANTS.DEFAULT_ZOOM,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
    };
    
    map = new naver.maps.Map('map', mapOptions);
    
    // 구 선택 드롭다운 채우기
    populateDistrictSelect();
    
    // 노선 선택 드롭다운 채우기
    populateRouteSelect();
    
    // 전체 노선 표시
    displayAllRoutes();
    
    // 이벤트 리스너 설정
    document.getElementById('districtSelect').addEventListener('change', handleDistrictSelect);
    document.getElementById('routeSelect').addEventListener('change', handleRouteSelect);
    document.getElementById('currentLocationBtn').addEventListener('click', showCurrentLocation);
}

// 구 목록 추출 (캐싱)
let districtsCache = null;

function getDistricts() {
    if (districtsCache) return districtsCache;
    
    const districts = new Set();
    shuttleRoutes.forEach(route => {
        const district = Utils.getDistrict(route.name);
        if (district) {
            districts.add(district);
        }
    });
    
    districtsCache = Array.from(districts).sort();
    return districtsCache;
}

// 구 선택 드롭다운 채우기
function populateDistrictSelect() {
    const select = document.getElementById('districtSelect');
    const districts = getDistricts();
    
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        select.appendChild(option);
    });
}

// 노선 선택 드롭다운 채우기 (구 필터링)
function populateRouteSelect(district = '') {
    const select = document.getElementById('routeSelect');
    
    // 기존 옵션 제거 (첫 번째 "전체 노선 보기" 제외)
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // 필터링된 노선 추가
    shuttleRoutes.forEach(route => {
        if (district) {
            const routeDistrict = Utils.getDistrict(route.name);
            if (!routeDistrict || routeDistrict !== district) {
                return;
            }
        }
        
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        select.appendChild(option);
    });
    
    // 선택 초기화
    select.value = '';
}

// 구 필터링된 노선 가져오기
function getFilteredRoutes(district) {
    if (!district) return shuttleRoutes;
    
    return shuttleRoutes.filter(route => {
        const routeDistrict = Utils.getDistrict(route.name);
        return routeDistrict === district;
    });
}

// 지도 범위 조정 (중복 제거)
function fitMapBounds(padding = 0) {
    if (markers.length === 0) return;
    
    const bounds = new naver.maps.LatLngBounds();
    markers.forEach(marker => {
        bounds.extend(marker.getPosition());
    });
    
    if (padding > 0) {
        map.fitBounds(bounds, { padding });
    } else {
        map.fitBounds(bounds);
    }
}

// 구 선택 핸들러
function handleDistrictSelect(event) {
    const selectedDistrict = event.target.value;
    currentDistrict = selectedDistrict;
    
    // 노선 드롭다운 업데이트
    populateRouteSelect(selectedDistrict);
    
    // 선택된 구의 노선 표시
    const filteredRoutes = getFilteredRoutes(selectedDistrict);
    
    clearMap();
    currentRouteId = null;
    
    filteredRoutes.forEach(route => {
        displayRoute(route);
    });
    
    fitMapBounds();
    updateRouteInfo(null);
}

// 전체 노선 표시
function displayAllRoutes() {
    clearMap();
    currentRouteId = null;
    
    shuttleRoutes.forEach(route => {
        displayRoute(route);
    });
    
    fitMapBounds();
    updateRouteInfo(null);
}

// 특정 노선 표시
function displayRoute(route) {
    if (!route?.stations?.length) return;
    
    const routeColor = route.color || CONSTANTS.DEFAULT_COLOR;
    const stations = route.stations;
    
    // 같은 위치의 정류소들을 그룹화
    const stationGroups = new Map();
    
    stations.forEach((station, index) => {
        // 좌표 유효성 검사
        if ((station.lat === 0 && station.lng === 0) || 
            isNaN(station.lat) || isNaN(station.lng)) {
            return;
        }
        
        // 위치 키 생성 (소수점 6자리까지 비교)
        const locationKey = `${station.lat.toFixed(6)},${station.lng.toFixed(6)}`;
        
        if (!stationGroups.has(locationKey)) {
            stationGroups.set(locationKey, []);
        }
        
        stationGroups.get(locationKey).push({
            station: station,
            index: index + 1
        });
    });
    
    // 그룹화된 정류소들로 마커 생성
    stationGroups.forEach((group, locationKey) => {
        const [lat, lng] = locationKey.split(',').map(Number);
        const firstStation = group[0].station;
        
        // 같은 위치에 여러 정류소가 있는 경우
        if (group.length > 1) {
            group.forEach((item, offsetIndex) => {
                // 원형으로 배치하기 위한 오프셋 계산
                const angle = (offsetIndex / group.length) * 2 * Math.PI;
                const offsetLat = lat + CONSTANTS.MARKER_OFFSET_DISTANCE * Math.cos(angle);
                const offsetLng = lng + CONSTANTS.MARKER_OFFSET_DISTANCE * Math.sin(angle);
                
                createMarker(
                    item.station,
                    route,
                    item.index,
                    new naver.maps.LatLng(offsetLat, offsetLng),
                    group.length
                );
            });
        } else {
            // 단일 정류소인 경우
            const item = group[0];
            createMarker(
                item.station,
                route,
                item.index,
                new naver.maps.LatLng(lat, lng)
            );
        }
    });
    
    // 폴리라인 생성 (노선 경로 표시)
    const validStations = stations.filter(station => 
        station.lat !== 0 || station.lng !== 0
    );
    
    if (validStations.length > 1) {
        createSimplePolyline(validStations, routeColor);
    }
}

// 노선 선택 핸들러
function handleRouteSelect(event) {
    const selectedRouteId = event.target.value;
    
    if (!selectedRouteId) {
        // 전체 노선 보기 선택 시, 선택된 구가 있으면 해당 구의 전체 노선만 표시
        const filteredRoutes = getFilteredRoutes(currentDistrict);
        
        clearMap();
        currentRouteId = null;
        
        filteredRoutes.forEach(route => {
            displayRoute(route);
        });
        
        fitMapBounds();
        updateRouteInfo(null);
        return;
    }
    
    const route = shuttleRoutes.find(r => r.id === selectedRouteId);
    if (!route) return;
    
    clearMap();
    currentRouteId = selectedRouteId;
    displayRoute(route);
    
    fitMapBounds(50);
    updateRouteInfo(route);
}

// 현재 위치 표시
function showCurrentLocation() {
    const btn = document.getElementById('currentLocationBtn');
    btn.disabled = true;
    btn.textContent = '📍 위치 확인 중...';
    
    if (!navigator.geolocation) {
        alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        btn.disabled = false;
        btn.textContent = '📍 내 위치';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const location = new naver.maps.LatLng(lat, lng);
            
            // 기존 현재 위치 마커 제거
            if (currentLocationMarker) {
                currentLocationMarker.setMap(null);
            }
            
            // 현재 위치 마커 생성
            currentLocationMarker = new naver.maps.Marker({
                position: location,
                map: map,
                icon: {
                    content: `
                        <div style="
                            width: ${CONSTANTS.LOCATION_MARKER_SIZE}px;
                            height: ${CONSTANTS.LOCATION_MARKER_SIZE}px;
                            background: #4285F4;
                            border: 3px solid white;
                            border-radius: 50%;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        ">📍</div>
                    `,
                    anchor: new naver.maps.Point(CONSTANTS.LOCATION_MARKER_SIZE / 2, CONSTANTS.LOCATION_MARKER_SIZE / 2)
                },
                zIndex: 1000
            });
            
            // 현재 위치로 지도 이동
            map.setCenter(location);
            map.setZoom(CONSTANTS.DETAIL_ZOOM);
            
            btn.disabled = false;
            btn.textContent = '📍 내 위치';
        },
        function(error) {
            const errorMessages = {
                [error.PERMISSION_DENIED]: '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.',
                [error.POSITION_UNAVAILABLE]: '위치 정보를 사용할 수 없습니다.',
                [error.TIMEOUT]: '위치 요청 시간이 초과되었습니다.'
            };
            
            alert(errorMessages[error.code] || '위치를 가져올 수 없습니다.');
            btn.disabled = false;
            btn.textContent = '📍 내 위치';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// 지도 초기화 (마커 및 폴리라인 제거)
function clearMap() {
    markers.forEach(marker => marker.setMap(null));
    polylines.forEach(polyline => polyline.setMap(null));
    infoWindows.forEach(iw => iw.close());
    
    markers = [];
    polylines = [];
    infoWindows = [];
}

// 다음 출발 시간 찾기
function findNextDeparture(schedule) {
    if (!schedule?.length) return null;
    
    const currentTime = Utils.getCurrentTimeInMinutes();
    
    // 오늘의 다음 출발 시간 찾기
    for (const timeStr of schedule) {
        const timeInMinutes = Utils.parseTime(timeStr);
        if (timeInMinutes > currentTime) {
            return timeStr;
        }
    }
    
    // 오늘의 마지막 출발 시간이 지났으면 내일 첫 출발 시간 반환
    return schedule[0];
}

// 모든 출발 시간을 하나의 배열로 합치기 (호차별 시간표가 있는 경우)
function getAllScheduleTimes(schedule, scheduleByVehicle) {
    if (schedule?.length) {
        return schedule;
    }
    
    if (scheduleByVehicle) {
        const allTimes = [];
        Object.values(scheduleByVehicle).forEach(vehicleSchedule => {
            allTimes.push(...vehicleSchedule);
        });
        // 중복 제거 및 정렬
        return [...new Set(allTimes)].sort();
    }
    
    return [];
}

// 시간표 HTML 생성 (템플릿 리터럴 최적화)
function generateScheduleHTML(schedule, scheduleByVehicle, routeColor) {
    const allTimes = getAllScheduleTimes(schedule, scheduleByVehicle);
    
    if (!allTimes.length) {
        return '<p style="color: #888;">출발 시간표 정보가 없습니다.</p>';
    }
    
    const nextDeparture = findNextDeparture(allTimes);
    const currentTime = Utils.getCurrentTimeInMinutes();
    
    // 시간을 오전/오후로 분류
    const morning = [];
    const afternoon = [];
    
    allTimes.forEach(timeStr => {
        const [hours] = timeStr.split(':').map(Number);
        (hours < 12 ? morning : afternoon).push(timeStr);
    });
    
    // 시간 카드 생성 함수
    const createTimeCard = (timeStr) => {
        const isNext = timeStr === nextDeparture;
        const timeInMinutes = Utils.parseTime(timeStr);
        const isPast = timeInMinutes < currentTime;
        
        const cardClass = `time-card${isNext ? ' next-departure' : ''}${isPast ? ' past' : ''}`;
        const cardStyle = isNext ? `background: ${routeColor}; color: white;` : '';
        
        return `<div class="${cardClass}" style="${cardStyle}" title="${timeStr}">${timeStr}${isNext ? '<span class="next-badge">다음</span>' : ''}</div>`;
    };
    
    // HTML 조각 생성
    const morningCards = morning.map(createTimeCard).join('');
    const afternoonCards = afternoon.map(createTimeCard).join('');
    
    const nextDepartureHTML = nextDeparture ? (() => {
        const timeInMinutes = Utils.parseTime(nextDeparture);
        const isToday = timeInMinutes > currentTime;
        
        return `
            <div class="next-departure-info" style="border-left: 4px solid ${routeColor};">
                <strong>다음 출발 시간:</strong>
                <span class="next-time" style="color: ${routeColor}; font-size: 1.2em; font-weight: bold;">
                    ${nextDeparture}
                </span>
                ${isToday ? '' : '<span style="color: #888; font-size: 0.9em;"> (내일)</span>'}
            </div>
        `;
    })() : '';
    
    return `
        <div class="schedule-section">
            ${nextDepartureHTML}
            <div class="schedule-grid">
                ${morning.length ? `<div class="time-group"><div class="time-group-label">오전</div><div class="time-cards">${morningCards}</div></div>` : ''}
                ${afternoon.length ? `<div class="time-group"><div class="time-group-label">오후</div><div class="time-cards">${afternoonCards}</div></div>` : ''}
            </div>
        </div>
    `;
}

// 노선 정보 업데이트
function updateRouteInfo(route) {
    const infoDiv = document.getElementById('routeInfo');
    
    if (!route) {
        const filteredRoutes = getFilteredRoutes(currentDistrict);
        const routeCount = currentDistrict ? filteredRoutes.length : shuttleRoutes.length;
        const title = currentDistrict ? `${currentDistrict} 전체 노선` : '전체 노선';
        
        infoDiv.innerHTML = `
            <h3>${title}</h3>
            <p>현재 <strong>${routeCount}개</strong>의 셔틀 버스 노선이 운행 중입니다.</p>
            <p>위의 드롭다운에서 특정 노선을 선택하면 상세 정보를 확인할 수 있습니다.</p>
        `;
        return;
    }
    
    const stationsList = route.stations.map((station, index) => {
        const stationName = Utils.getStationName(station);
        const escapedName = Utils.escapeHtml(stationName);
        const stationIdDisplay = station.stationId && station.name 
            ? ` <span style="color: #888; font-size: 0.9em;">(ID: ${station.stationId})</span>` 
            : '';
        return `<li><strong>${index + 1}.</strong> ${escapedName}${stationIdDisplay}</li>`;
    }).join('');
    
    // 출발 시간표 HTML 생성
    const scheduleHTML = (route.schedule || route.scheduleByVehicle) 
        ? generateScheduleHTML(route.schedule, route.scheduleByVehicle, route.color) 
        : '';
    
    const escapedDescription = Utils.escapeHtml(route.description);
    const escapedRouteName = Utils.escapeHtml(route.name);
    
    infoDiv.innerHTML = `
        <h3 style="color: ${route.color};">${escapedRouteName}</h3>
        <div class="route-details">
            <p><strong>설명:</strong> ${escapedDescription}</p>
            <p><strong>배차 간격:</strong> ${route.interval || '정보 없음'}</p>
            ${scheduleHTML ? `<div class="schedule-container">${scheduleHTML}</div>` : ''}
            <p><strong>경유지:</strong></p>
            <ul>${stationsList}</ul>
        </div>
    `;
}

// 페이지 로드 시 지도 초기화
window.addEventListener('DOMContentLoaded', function() {
    // 네이버 지도 API가 로드되었는지 확인
    if (typeof naver !== 'undefined' && naver.maps) {
        initMap();
    } else {
        console.error('네이버 지도 API를 로드할 수 없습니다. CLIENT_ID를 확인하세요.');
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #666;">
                <div style="text-align: center; padding: 20px;">
                    <h3>지도를 불러올 수 없습니다</h3>
                        <p>index.html 파일에서 YOUR_NAVER_MAP_API_KEY를 네이버 클라우드 플랫폼의 Client ID로 변경해주세요.</p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        <a href="https://www.ncloud.com/product/applicationService/maps" target="_blank">네이버 지도 API 신청하기</a>
                    </p>
                </div>
            </div>
        `;
        }
    }
});
