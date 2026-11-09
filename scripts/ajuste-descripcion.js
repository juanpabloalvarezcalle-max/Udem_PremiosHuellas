/* Ajusta el tamaño de la descripción para que se vea completa sin scroll (ni en el texto ni en la página).
   Solo en escritorio: si el texto es largo, se le va bajando la letra de a poco hasta que la página
   quepa en la ventana. Hay un tamaño mínimo para que siga siendo legible. */
(function () {
    'use strict';

    var descripcion = document.querySelector('.ficha__descripcion');
    var info = document.querySelector('.ficha__info');
    if (!descripcion || !info) return;

    var escritorio = window.matchMedia('(min-width: 1025px)');
    var PASO = 0.5;      // px que se reduce en cada intento
    var MINIMO = 12;     // px: por debajo de esto el texto deja de ser cómodo de leer
    var COMPACTAR = 14;  // px: antes de bajar más la letra, se compactan los espacios de la columna

    function cabe() {
        return document.documentElement.scrollHeight <= window.innerHeight;
    }

    function ajustar() {
        descripcion.style.fontSize = '';
        info.removeAttribute('data-compacto');
        if (!escritorio.matches) return;

        var tamano = parseFloat(getComputedStyle(descripcion).fontSize);
        while (!cabe() && tamano > MINIMO) {
            tamano -= PASO;
            descripcion.style.fontSize = tamano + 'px';
            if (tamano <= COMPACTAR && !info.hasAttribute('data-compacto')) info.setAttribute('data-compacto', '');
        }
    }

    var espera;
    window.addEventListener('resize', function () {
        clearTimeout(espera);
        espera = setTimeout(ajustar, 80);
    });

    ajustar();
    // La tipografía se carga después: al terminar cambia el alto del texto, así que se vuelve a ajustar
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
    window.addEventListener('load', ajustar);
})();
