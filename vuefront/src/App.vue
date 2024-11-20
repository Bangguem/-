<template>
  <div id="app">
    <!-- 조건에 따라 헤더를 표시 -->
    <header v-if="showHeader" class="header">
      <div class="logo">
        <div class="circle"></div>
        <span>Welcome</span>
      </div>
      <nav class="nav-links">
        <a href="#">공지</a>
        <router-link to="/signup">회원가입</router-link>
        <router-link to="/login">로그인</router-link>
      </nav>
    </header>

    <main class="main-content">
      <!-- 라우팅된 화면 표시 -->
      <router-view></router-view>

      <!-- 메인 페이지 컨텐츠 (로그인/회원가입 페이지 제외) -->
      <div v-if="showPlaceholder" class="placeholder"></div>
    </main>

    <!-- 조건에 따라 푸터를 표시 -->
    <footer v-if="showFooter" class="footer">
      <nav class="footer-links">
        <a href="#">Contact Us</a>
        <a href="#">About Us</a>
        <a href="#">Terms & Conditions</a>
        <a href="#">Privacy Policy</a>
      </nav>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  computed: {
    // 로그인, 회원가입 페이지 여부 확인
    isAuthPage() {
      return ['/login', '/signup'].includes(this.$route.path);
    },
    // 헤더와 푸터 표시 여부
    showHeader() {
      return !this.isAuthPage;
    },
    showFooter() {
      return !this.isAuthPage;
    },
    // 메인 페이지의 플레이스홀더 표시 여부
    showPlaceholder() {
      return !this.isAuthPage;
    },
  },
};
</script>

<style scoped>
/* 전체 스타일 초기화 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
}

#app {
  margin: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 헤더 스타일 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #424242;
  color: #FAFAFA;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #15513775;
}

.nav-links a,
.nav-links router-link {
  margin-left: 20px;
  color: #FAFAFA;
  text-decoration: none;
  font-size: 10px;
}

.nav-links a:hover,
.nav-links router-link:hover {
  text-decoration: underline;
}

/* 메인 컨텐츠 */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #757575;
}

.placeholder {
  width: 80%;
  height: 60%;
  background-color: #757575;
}

/* 푸터 스타일 */
.footer {
  background-color: #212121;
  color: #FAFAFA;
  padding: 90px 0;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 100px;
}

.footer-links a {
  color: #FAFAFA;
  text-decoration: none;
  font-size: 16px;
}

.footer-links a:hover {
  text-decoration: underline;
}
</style>
