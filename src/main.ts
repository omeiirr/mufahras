import { mount } from 'svelte';
import '@fontsource/scheherazade-new/arabic-400.css';
import '@fontsource-variable/noto-naskh-arabic/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
