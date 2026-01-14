# GitHub Pages 배포 가이드

## 📋 단계별 배포 방법

### 1단계: GitHub 저장소 생성

1. [GitHub](https://github.com)에 로그인
2. 우측 상단의 **+** 버튼 클릭 > **New repository**
3. 저장소 이름 입력 (예: `seoul-shuttle-bus`)
4. **Public** 선택 (GitHub Pages는 Public 저장소에서 무료)
5. **Create repository** 클릭

### 2단계: 코드 커밋 및 푸시

터미널에서 다음 명령어를 실행하세요:

```bash
# 현재 디렉토리에서 실행
cd /Users/gimmingeon/seoul-shuttle-bus

# 모든 파일 추가 (민감한 정보는 .gitignore에 의해 제외됨)
git add .

# 첫 커밋
git commit -m "Initial commit: Seoul shuttle bus route app"

# GitHub 저장소 연결 (your-username을 실제 GitHub 사용자명으로 변경)
git remote add origin https://github.com/your-username/seoul-shuttle-bus.git

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

### 3단계: GitHub Secrets에 API 키 추가

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** > **Actions** 클릭
4. **New repository secret** 버튼 클릭
5. 다음 정보 입력:
   - **Name**: `NAVER_MAP_API_KEY`
   - **Value**: 실제 네이버 지도 API 키 (예: `fd07nm3i0z`)
6. **Add secret** 클릭

### 4단계: GitHub Pages 활성화

1. 저장소의 **Settings** 탭으로 이동
2. 왼쪽 메뉴에서 **Pages** 클릭
3. **Source** 섹션에서:
   - **Deploy from a branch** 선택
   - **Branch**: `gh-pages` 선택 (또는 **GitHub Actions** 선택 - 권장)
4. **Save** 클릭

**참고**: GitHub Actions를 사용하는 경우 (권장):
- Source를 **GitHub Actions**로 선택하면 자동 배포가 설정됩니다
- `.github/workflows/deploy.yml` 파일이 자동으로 배포를 처리합니다

### 5단계: 네이버 지도 API 도메인 설정

**중요**: 네이버 지도 API는 허용된 도메인에서만 작동합니다!

1. [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com/) 접속
2. **Application Service** > **Maps** > **내 애플리케이션** 클릭
3. 해당 애플리케이션 선택
4. **서비스 URL** 섹션에서:
   - **+ 추가** 클릭
   - 도메인 입력: `https://your-username.github.io` (your-username을 실제 사용자명으로 변경)
   - 또는 저장소 이름이 다르면: `https://your-username.github.io/seoul-shuttle-bus`
5. **저장** 클릭

### 6단계: 배포 확인

1. GitHub 저장소의 **Actions** 탭으로 이동
2. 워크플로우가 실행되는지 확인
3. 배포가 완료되면 (약 1-2분 소요):
   - **Settings** > **Pages**에서 사이트 URL 확인
   - 또는 `https://your-username.github.io/seoul-shuttle-bus` 접속

## 🔄 업데이트 배포

코드를 수정한 후:

```bash
git add .
git commit -m "Update: 설명"
git push origin main
```

푸시하면 자동으로 GitHub Actions가 실행되어 재배포됩니다.

## ⚠️ 문제 해결

### 지도가 표시되지 않는 경우

1. **API 키 확인**: GitHub Secrets에 올바른 키가 설정되었는지 확인
2. **도메인 설정 확인**: 네이버 클라우드 플랫폼에서 도메인이 추가되었는지 확인
3. **브라우저 콘솔 확인**: F12 > Console에서 에러 메시지 확인
4. **Actions 로그 확인**: GitHub Actions 탭에서 빌드 로그 확인

### 배포가 실패하는 경우

1. **Actions 탭**에서 실패한 워크플로우 클릭
2. 에러 메시지 확인
3. 일반적인 원인:
   - Secrets에 API 키가 설정되지 않음
   - `build.js` 파일에 문법 오류
   - Node.js 버전 문제

## 📝 참고사항

- GitHub Pages는 Public 저장소에서 무료로 사용 가능합니다
- 배포는 보통 1-2분 정도 소요됩니다
- 코드를 푸시할 때마다 자동으로 재배포됩니다
- API 키는 GitHub Secrets에 안전하게 저장되며 코드에 노출되지 않습니다
