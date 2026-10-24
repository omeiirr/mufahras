import { mount } from 'svelte';
import '@fontsource/scheherazade-new/arabic-400.css';
import '@fontsource-variable/noto-naskh-arabic/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import './lib/install.svelte';
import './lib/back.svelte';
import { loadBookmarks } from './lib/store/bookmarks.svelte';
import App from './App.svelte';

void loadBookmarks();

export default mount(App, { target: document.getElementById('app')! });
