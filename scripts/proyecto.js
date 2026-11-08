/* Galería de la página de proyecto: flechas, puntos y deslizamiento con el dedo.
   El desplazamiento y el "imán" los hace el CSS (scroll-snap); aquí solo se sincronizan los controles. */
(function () {
    'use strict';

    var galeria = document.querySelector('[data-galeria]');
    if (!galeria) return;

    var pista = galeria.querySelector('.galeria__pista');
    var imagenes = pista.querySelectorAll('.galeria__imagen');
    var puntos = galeria.querySelectorAll('.galeria__punto');
    var anterior = galeria.querySelector('.galeria__flecha--anterior');
    var siguiente = galeria.querySelector('.galeria__flecha--siguiente');
    var actual = 0;

    function reducido() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function irA(i) {
        i = Math.max(0, Math.min(imagenes.length - 1, i));
        pista.scrollTo({ left: i * pista.clientWidth, behavior: reducido() ? 'auto' : 'smooth' });
    }

    function marcar(i) {
        actual = i;
        puntos.forEach(function (p, n) {
            if (n === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
        });
        anterior.disabled = i === 0;
        siguiente.disabled = i === imagenes.length - 1;
    }

    pista.addEventListener('scroll', function () {
        var i = Math.round(pista.scrollLeft / pista.clientWidth);
        if (i !== actual) marcar(i);
    }, { passive: true });

    anterior.addEventListener('click', function () { irA(actual - 1); });
    siguiente.addEventListener('click', function () { irA(actual + 1); });
    puntos.forEach(function (p, n) { p.addEventListener('click', function () { irA(n); }); });

    pista.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); irA(actual - 1); }
    });

    marcar(0);
})();
