#!/usr/bin/env node
/**
 * 배포용 빌드 스크립트
 * 환경 변수에서 API 키를 읽어서 index.html에 주입합니다.
 * 
 * 사용 방법:
 *   NAVER_MAP_API_KEY=your_key_here node build.js
 * 
 * 또는 .env 파일 사용:
 *   NAVER_MAP_API_KEY=your_key_here node build.js
 */

const fs = require('fs');
const path = require('path');

// 환경 변수에서 API 키 읽기
const naverMapApiKey = process.env.NAVER_MAP_API_KEY || 'YOUR_NAVER_MAP_API_KEY';

if (naverMapApiKey === 'YOUR_NAVER_MAP_API_KEY') {
    console.warn('⚠️  경고: NAVER_MAP_API_KEY 환경 변수가 설정되지 않았습니다.');
    console.warn('   환경 변수를 설정하거나 .env 파일을 사용하세요.');
    console.warn('   예: NAVER_MAP_API_KEY=your_key_here node build.js');
}

// index.html 읽기
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// API 키 주입
indexContent = indexContent.replace(
    /ncpKeyId=YOUR_NAVER_MAP_API_KEY/g,
    `ncpKeyId=${naverMapApiKey}`
);

// dist 디렉토리 생성 (없는 경우)
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// 배포용 파일들 복사
const filesToCopy = ['style.css', 'app.js', 'routes.js'];

filesToCopy.forEach(file => {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(distDir, file);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✓ ${file} 복사됨`);
    }
});

// index.html을 dist에 저장
const distIndexPath = path.join(distDir, 'index.html');
fs.writeFileSync(distIndexPath, indexContent, 'utf8');
console.log(`✓ index.html 생성됨 (API 키 주입 완료)`);
console.log(`\n📦 배포 준비 완료! dist/ 디렉토리를 배포하세요.`);
