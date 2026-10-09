import '@testing-library/jest-dom/vitest';

// jsdom no implementa scrollIntoView, que varios componentes llaman al abrir
// modales (p. ej. el de narrativa al centrarse). Sin esto, abrir un modal en un
// test lanza TypeError.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
