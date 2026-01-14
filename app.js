// 네이버 지도 초기화 및 셔틀 버스 노선 표시 앱

let map;
let markers = [];
let polylines = [];
let currentRouteId = null;

// 직선 폴리라인 생성
function createSimplePolyline(stations, routeColor) {
    const path = stations.map(station => 
        new naver.maps.LatLng(station.lat, station.lng)
    );
    
    // 첫 번째와 마지막 정류소의 위치가 다른 경우 연결선 추가
    const firstStation = stations[0];
    const lastStation = stations[stations.length - 1];
    
    const firstLat = firstStation.lat.toFixed(6);
    const firstLng = firstStation.lng.toFixed(6);
    const lastLat = lastStation.lat.toFixed(6);
    const lastLng = lastStation.lng.toFixed(6);
    
    if (firstLat !== lastLat || firstLng !== lastLng) {
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

// 지도 초기화
function initMap() {
    // 서울 중심 좌표
    const seoulCenter = new naver.maps.LatLng(37.5665, 126.9780);
    
    const mapOptions = {
        center: seoulCenter,
        zoom: 12,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
    };
    
    map = new naver.maps.Map('map', mapOptions);
    
    // 노선 선택 드롭다운 채우기
    populateRouteSelect();
    
    // 전체 노선 표시
    displayAllRoutes();
    
    // 이벤트 리스너 설정
    document.getElementById('routeSelect').addEventListener('change', handleRouteSelect);
}

// 노선 선택 드롭다운 채우기
function populateRouteSelect() {
    const select = document.getElementById('routeSelect');
    
    shuttleRoutes.forEach(route => {
        const option = document.createElement('option');
        option.value = route.id;
        option.textContent = route.name;
        select.appendChild(option);
    });
}

// 전체 노선 표시
function displayAllRoutes() {
    clearMap();
    currentRouteId = null;
    
    shuttleRoutes.forEach(route => {
        displayRoute(route);
    });
    
    // 모든 마커가 보이도록 지도 범위 조정
    if (markers.length > 0) {
        const bounds = new naver.maps.LatLngBounds();
        markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        map.fitBounds(bounds);
    }
    
    updateRouteInfo(null);
}

// 특정 노선 표시
function displayRoute(route) {
    if (!route || !route.stations || route.stations.length === 0) return;
    
    const routeColor = route.color || '#667eea';
    const stations = route.stations;
    
    // 같은 위치의 정류소들을 그룹화
    const stationGroups = new Map();
    
    stations.forEach((station, index) => {
        // 좌표가 둘 다 0인 경우에만 마커를 생성하지 않음
        // 임시 정류소도 좌표가 있으면 표시됨
        if (station.lat === 0 && station.lng === 0) {
            return;
        }
        
        // 좌표가 유효한지 확인 (NaN 체크)
        if (isNaN(station.lat) || isNaN(station.lng)) {
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
            // 각 마커를 약간씩 오프셋하여 표시
            group.forEach((item, offsetIndex) => {
                // 원형으로 배치하기 위한 오프셋 계산
                const angle = (offsetIndex / group.length) * 2 * Math.PI;
                const offsetDistance = 0.00003; // 약 3m 정도 오프셋 (더 가깝게)
                const offsetLat = lat + offsetDistance * Math.cos(angle);
                const offsetLng = lng + offsetDistance * Math.sin(angle);
                
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(offsetLat, offsetLng),
                    map: map,
                    title: item.station.name || (item.station.stationId ? `정류소 ID: ${item.station.stationId}` : '정류소'),
                    icon: {
                        content: `
                            <div style="
                                background-color: ${routeColor};
                                width: 30px;
                                height: 30px;
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
                            ">${item.index}</div>
                        `,
                        anchor: new naver.maps.Point(15, 15)
                    },
                    zIndex: 1000 + item.index // 나중 번호가 위에 표시되도록
                });
                
                // 정보창 추가
                const stationName = item.station.name || (item.station.stationId ? `정류소 ID: ${item.station.stationId}` : '정류소');
                const infoWindow = new naver.maps.InfoWindow({
                    content: `
                        <div style="padding: 10px; min-width: 150px;">
                            <strong style="color: ${routeColor};">${stationName}</strong><br>
                            <span style="font-size: 11px; color: #888;">정류소 번호: ${item.index}</span><br>
                            ${item.station.stationId && item.station.name ? `<span style="font-size: 11px; color: #888;">정류소 ID: ${item.station.stationId}</span><br>` : ''}
                            ${group.length > 1 ? `<span style="font-size: 10px; color: #999;">같은 위치에 ${group.length}개 정류소</span><br>` : ''}
                            <span style="font-size: 12px; color: #666;">${route.name}</span>
                        </div>
                    `
                });
                
                naver.maps.Event.addListener(marker, 'click', function() {
                    infoWindow.open(map, marker);
                });
                
                markers.push(marker);
            });
        } else {
            // 단일 정류소인 경우
            const item = group[0];
            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(lat, lng),
                map: map,
                title: item.station.name || (item.station.stationId ? `정류소 ID: ${item.station.stationId}` : '정류소'),
                icon: {
                    content: `
                        <div style="
                            background-color: ${routeColor};
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: bold;
                            font-size: 12px;
                        ">${item.index}</div>
                    `,
                    anchor: new naver.maps.Point(15, 15)
                }
            });
            
            // 정보창 추가
            const stationName = item.station.name || (item.station.stationId ? `정류소 ID: ${item.station.stationId}` : '정류소');
            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div style="padding: 10px; min-width: 150px;">
                        <strong style="color: ${routeColor};">${stationName}</strong><br>
                        ${item.station.stationId && item.station.name ? `<span style="font-size: 11px; color: #888;">정류소 ID: ${item.station.stationId}</span><br>` : ''}
                        <span style="font-size: 12px; color: #666;">${route.name}</span>
                    </div>
                `
            });
            
            naver.maps.Event.addListener(marker, 'click', function() {
                infoWindow.open(map, marker);
            });
            
            markers.push(marker);
        }
    });
    
    // 폴리라인 생성 (노선 경로 표시)
    if (stations.length > 1) {
        const validStations = stations.filter(station => 
            station.lat !== 0 || station.lng !== 0 // 좌표가 있는 정류소만
        );
        
        if (validStations.length > 1) {
            createSimplePolyline(validStations, routeColor);
        }
    }
}

// 노선 선택 핸들러
function handleRouteSelect(event) {
    const selectedRouteId = event.target.value;
    
    if (!selectedRouteId) {
        displayAllRoutes();
        return;
    }
    
    const route = shuttleRoutes.find(r => r.id === selectedRouteId);
    if (!route) return;
    
    clearMap();
    currentRouteId = selectedRouteId;
    displayRoute(route);
    
    // 선택된 노선의 마커가 보이도록 지도 범위 조정
    if (markers.length > 0) {
        const bounds = new naver.maps.LatLngBounds();
        markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        map.fitBounds(bounds, { padding: 50 });
    }
    
    updateRouteInfo(route);
}

// 지도 초기화 (마커 및 폴리라인 제거)
function clearMap() {
    markers.forEach(marker => marker.setMap(null));
    polylines.forEach(polyline => polyline.setMap(null));
    markers = [];
    polylines = [];
}

// 지도 새로고침
function refreshMap() {
    if (currentRouteId) {
        const route = shuttleRoutes.find(r => r.id === currentRouteId);
        if (route) {
            handleRouteSelect({ target: { value: currentRouteId } });
        }
    } else {
        displayAllRoutes();
    }
}

// 노선 정보 업데이트
function updateRouteInfo(route) {
    const infoDiv = document.getElementById('routeInfo');
    
    if (!route) {
        infoDiv.innerHTML = `
            <h3>전체 노선</h3>
            <p>현재 <strong>${shuttleRoutes.length}개</strong>의 셔틀 버스 노선이 운행 중입니다.</p>
            <p>위의 드롭다운에서 특정 노선을 선택하면 상세 정보를 확인할 수 있습니다.</p>
        `;
        return;
    }
    
    const stationsList = route.stations.map((station, index) => {
        const stationName = station.name || (station.stationId ? `정류소 ID: ${station.stationId}` : '정류소');
        const stationIdDisplay = station.stationId && station.name ? ` <span style="color: #888; font-size: 0.9em;">(ID: ${station.stationId})</span>` : '';
        return `<li><strong>${index + 1}.</strong> ${stationName}${stationIdDisplay}</li>`;
    }).join('');
    
    infoDiv.innerHTML = `
        <h3 style="color: ${route.color};">${route.name}</h3>
        <div class="route-details">
            <p><strong>설명:</strong> ${route.description}</p>
            <p><strong>운행 시간:</strong> ${route.operatingHours}</p>
            <p><strong>배차 간격:</strong> ${route.interval}</p>
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
        document.getElementById('map').innerHTML = `
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
});
