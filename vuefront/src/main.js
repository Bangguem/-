import { createApp } from 'vue';
import App from './App.vue';
import router from './routers';

// createApp(App).use(router).mount('#app');
const app = createApp(App);
app.use(router);
app.mount('#app');
