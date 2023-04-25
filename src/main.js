import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import "pdfjs-dist/build/pdf";
import "pdfjs-dist/web/pdf_viewer.css";
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

const app = createApp(App);

app.mount('#app');