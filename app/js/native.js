// Ponte verso i plugin nativi quando GHISA gira come APK (Capacitor).
// Nel browser e nella PWA `isNative` è false e si usano le API web.
const cx = window.capacitorExports;

export const isNative = !!cx?.Capacitor?.isNativePlatform?.();

const plugin = (name) => (isNative ? cx.registerPlugin(name) : null);

export const Haptics = plugin('Haptics');
export const KeepAwake = plugin('KeepAwake');
export const Filesystem = plugin('Filesystem');
export const Share = plugin('Share');
