/* Indicador de "hay más integrantes" en la lista deslizable.
   Cuando la lista no cabe en el ancho, aparecen un degradado en el borde donde hay más contenido y una flecha
   que además sirve de botón. Al llegar al final desaparecen. Si todo cabe, no se muestra nada. */
(function () {
    'use strict';

    document.querySelectorAll('[data-integrantes]').forEach(function (contenedor) {
        var lista = contenedor.querySelector('.integrantes__lista');
        var boton = contenedor.querySelector('.integrantes__mas');
        if (!lista) return;

        function actualizar() {
            var maximo = lista.scrollWidth - lista.clientWidth;
            // En lenguajes de derecha a izquierda scrollLeft es negativo; aquí la página es siempre izquierda a derecha
            var posicion = lista.scrollLeft;
            contenedor.toggleAttribute('data-mas-derecha', maximo > 2 && posicion < maximo - 2);
            contenedor.toggleAttribute('data-mas-izquierda', posicion > 2);
            if (boton) boton.tabIndex = contenedor.hasAttribute('data-mas-derecha') ? 0 : -1;
        }

        if (boton) {
            boton.addEventListener('click', function () {
                var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                lista.scrollBy({ left: lista.clientWidth * 0.75, behavior: reducido ? 'auto' : 'smooth' });
            });
        }

        lista.addEventListener('scroll', actualizar, { passive: true });
        window.addEventListener('resize', actualizar);
        window.addEventListener('load', actualizar);
        if (window.ResizeObserver) new ResizeObserver(actualizar).observe(lista);
        actualizar();
    });
})();
