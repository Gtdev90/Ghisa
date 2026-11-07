// Ponte verso i plugin nativi quando GT Workout gira come APK (Capacitor).
// Nel browser e nella PWA `isNative` è false e si usano le API web.
const cx = window.Capacitor || window.capacitorExports?.Capacitor || window.capacitorExports;

export const isNative = !!(
  (typeof cx?.isNativePlatform === 'function' && cx.isNativePlatform()) ||
  (typeof cx?.Capacitor?.isNativePlatform === 'function' && cx.Capacitor.isNativePlatform()) ||
  window.androidBridge
);

const reg = (typeof cx?.registerPlugin === 'function' && cx.registerPlugin.bind(cx)) ||
  (typeof cx?.Capacitor?.registerPlugin === 'function' && cx.Capacitor.registerPlugin.bind(cx.Capacitor)) ||
  (typeof window.capacitorExports?.registerPlugin === 'function' && window.capacitorExports.registerPlugin);

const plugin = (name) => {
  if (!isNative || !reg) return null;
  try {
    return reg(name);
  } catch (e) {
    console.warn(`[GT-Native] Impossibile registrare plugin ${name}:`, e);
    return null;
  }
};

export const Haptics = plugin('Haptics');
export const KeepAwake = plugin('KeepAwake');
export const Filesystem = plugin('Filesystem');
export const Share = plugin('Share');

// Orologio Wear OS e ciclo di vita dell'app: registrati come plugin nativi in Android MainActivity.
export const Watch = plugin('Watch');
export const AppPlugin = plugin('App');
