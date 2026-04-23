import { createApp } from 'vue'
import App from './App.vue'

// Изтриваме импорта на router и редът app.use(router)
const app = createApp(App)

app.mount('#app')