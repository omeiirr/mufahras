// "Install app": Chrome/Edge/Android fire beforeinstallprompt, which we keep to show our own button.
// iOS Safari has no prompt; there the menu explains Share → Add to Home Screen instead.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;

export const install = $state({
  available: false,
  installed: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
});

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  install.available = true;
});
addEventListener('appinstalled', () => {
  install.installed = true;
  install.available = false;
});

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  install.available = false;
}
