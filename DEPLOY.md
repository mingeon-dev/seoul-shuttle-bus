# 배포 가이드

## 배포 방법별 API 키 설정

### 방법 1: 빌드 스크립트 사용 (권장)

빌드 스크립트를 사용하여 배포 시점에 API 키를 주입합니다.

```bash
# 환경 변수로 API 키 설정
NAVER_MAP_API_KEY=your_actual_api_key node build.js

# 또는 .env 파일 사용 (dotenv 패키지 필요)
echo "NAVER_MAP_API_KEY=your_actual_api_key" > .env
node build.js
```

빌드 후 `dist/` 디렉토리가 생성되며, 이 디렉토리를 배포하면 됩니다.

### 방법 2: GitHub Pages

#### 옵션 A: GitHub Actions 사용 (권장)

1. `.github/workflows/deploy.yml` 파일 생성
2. GitHub 저장소의 Secrets에 `NAVER_MAP_API_KEY` 추가
3. Actions에서 자동 빌드 및 배포

#### 옵션 B: 수동 배포

1. 로컬에서 빌드:
   ```bash
   NAVER_MAP_API_KEY=your_key node build.js
   ```

2. `dist/` 디렉토리의 내용을 `gh-pages` 브랜치에 푸시:
   ```bash
   cd dist
   git init
   git add .
   git commit -m "Deploy"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -f origin main:gh-pages
   ```

3. GitHub 저장소 설정에서 Pages 소스를 `gh-pages` 브랜치로 설정

### 방법 3: Netlify

1. Netlify 대시보드에서 프로젝트 연결
2. **Build settings**:
   - Build command: `NAVER_MAP_API_KEY=$NAVER_MAP_API_KEY node build.js`
   - Publish directory: `dist`
3. **Environment variables**에 `NAVER_MAP_API_KEY` 추가
4. 배포

### 방법 4: Vercel

1. Vercel 프로젝트 연결
2. **Environment Variables**에 `NAVER_MAP_API_KEY` 추가
3. `vercel.json` 파일 생성:
   ```json
   {
     "buildCommand": "NAVER_MAP_API_KEY=$NAVER_MAP_API_KEY node build.js",
     "outputDirectory": "dist"
   }
   ```
4. 배포

### 방법 5: 직접 서버 배포

1. 로컬에서 빌드:
   ```bash
   NAVER_MAP_API_KEY=your_key node build.js
   ```

2. `dist/` 디렉토리의 모든 파일을 서버에 업로드

## 보안 주의사항

⚠️ **중요**: 
- 실제 API 키는 절대 공개 저장소에 커밋하지 마세요
- 환경 변수나 빌드 스크립트를 통해 주입하세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다

## API 키 발급 방법

1. [네이버 클라우드 플랫폼](https://www.ncloud.com/)에 가입
2. [Application Service > Maps](https://www.ncloud.com/product/applicationService/maps) 메뉴에서 지도 API 신청
3. Client ID 발급
4. 배포할 도메인을 허용 목록에 추가 (중요!)

## 도메인 설정

네이버 지도 API는 허용된 도메인에서만 작동합니다:
1. 네이버 클라우드 플랫폼 콘솔 접속
2. Application Service > Maps > 내 애플리케이션
3. 해당 애플리케이션 선택
4. "서비스 URL"에 배포할 도메인 추가 (예: `https://your-domain.com`)
