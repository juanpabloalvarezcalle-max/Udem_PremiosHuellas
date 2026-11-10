/* Galería del proyecto (docs/galeria.html).
   Lee de la dirección qué proyecto abrir (galeria.html?p=ophelia), busca sus fotos en scripts/galeria-datos.js
   y las muestra a pantalla completa con crossfade, miniaturas, pase automático, teclado y gestos táctiles.
   Adaptado del "Carrusel documental" (sin el sonido ambiente ni los recursos propios de ese proyecto). */
(function () {
    'use strict';

    var DURACION = 6000;          // ms que se muestra cada foto en el pase automático
    var INACTIVIDAD = 2800;       // ms sin actividad antes de esconder la interfaz

    var $ = function (id) { return document.getElementById(id); };
    var datos = window.GALERIAS || {};
    var clave = new URLSearchParams(window.location.search).get('p');
    var proyecto = datos[clave];

    var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var fondos = [$('fondoA'), $('fondoB')];
    var fotos = [$('fotoA'), $('fotoB')];
    var miniaturas = $('miniaturas');
    var pista = $('pistaMiniaturas');
    var puntos = $('puntos');
    var progreso = $('progreso');
    var btnAutoplay = $('btnAutoplay');

    var imagenes = [];
    var indice = 0;
    var capaActiva = 1;           // la capa 0 arranca visible; al cambiar de foto se alterna
    var autoplay = !reducido;
    var inicio = 0;
    var temporizador = null;

    function dos(n) { return (n < 10 ? '0' : '') + n; }

    /* ---------- Contenido del proyecto ---------- */
    if (!proyecto || !proyecto.imagenes || !proyecto.imagenes.length) {
        $('titulo').textContent = 'No encontramos esta galería';
        $('categoria').textContent = '';
        $('original').hidden = true;
        document.querySelector('.zona-inferior').hidden = true;
        document.querySelector('.pie').hidden = true;
        btnAutoplay.hidden = true;
        return;
    }

    document.title = proyecto.titulo + ' | Galería | Premios Huella 2026';
    $('titulo').textContent = proyecto.titulo;
    $('categoria').textContent = proyecto.categoria;
    document.body.classList.add('pagina--' + proyecto.categoriaSlug);
    $('cerrar').href = '../' + proyecto.proyecto;
    $('cerrar').setAttribute('aria-label', 'Cerrar la galería y volver a ' + proyecto.titulo);

    if (proyecto.original) {
        $('original').href = proyecto.original;
        $('originalTexto').textContent = proyecto.etiquetaOriginal || 'Abrir original';
        $('original').setAttribute('aria-label', proyecto.etiquetaOriginal || 'Abrir original');
        $('original').hidden = false;
    }

    imagenes = proyecto.imagenes.map(function (i) {
        return { src: '../' + i.src, alt: i.alt || proyecto.titulo };
    });
    $('total').textContent = dos(imagenes.length);

    /* ---------- Miniaturas y puntos ---------- */
    imagenes.forEach(function (img, i) {
        var m = document.createElement('div');
        m.className = 'miniatura' + (i === 0 ? ' activa' : '');
        m.setAttribute('role', 'button');
        m.tabIndex = 0;
        m.setAttribute('aria-label', 'Ver foto ' + (i + 1) + ' de ' + imagenes.length);
        m.innerHTML = '<img src="' + img.src + '" alt="" loading="lazy" draggable="false"><span class="miniatura__num">' + dos(i + 1) + '</span>';
        m.addEventListener('click', function () { mostrar(i); });
        m.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); mostrar(i); }
        });
        miniaturas.appendChild(m);

        var p = document.createElement('button');
        p.type = 'button';
        p.className = 'punto' + (i === 0 ? ' activo' : '');
        p.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
        p.addEventListener('click', function () { mostrar(i); });
        puntos.appendChild(p);
    });

    // Con una sola foto no hacen falta flechas, puntos ni pase automático
    if (imagenes.length === 1) {
        $('btnAnterior').hidden = true;
        $('btnSiguiente').hidden = true;
        btnAutoplay.hidden = true;
        document.querySelector('.progreso').hidden = true;
        puntos.hidden = true;
        autoplay = false;
    }

    /* ---------- Mostrar una foto ---------- */
    function poner(capa, src) { capa.style.backgroundImage = 'url("' + src + '")'; }

    function mostrar(i, inmediato) {
        i = (i + imagenes.length) % imagenes.length;
        if (i === indice && !inmediato) return;
        indice = i;
        var img = imagenes[i];

        var sigue = 1 - capaActiva;
        poner(fotos[sigue], img.src);
        poner(fondos[sigue], img.src);
        fotos[sigue].classList.add('activa');
        fondos[sigue].classList.add('activa');
        fotos[capaActiva].classList.remove('activa');
        fondos[capaActiva].classList.remove('activa');
        capaActiva = sigue;
        $('marco').setAttribute('aria-label', img.alt);

        $('actual').textContent = dos(i + 1);

        Array.prototype.forEach.call(miniaturas.children, function (m, n) {
            m.classList.toggle('activa', n === i);
            if (n === i) {
                // se centra solo dentro de la pista de miniaturas (scrollIntoView movería también la página)
                var destino = m.offsetLeft - (pista.clientWidth - m.offsetWidth) / 2;
                pista.scrollTo({ left: destino, behavior: reducido ? 'auto' : 'smooth' });
            }
        });
        Array.prototype.forEach.call(puntos.children, function (p, n) { p.classList.toggle('activo', n === i); });

        reiniciarProgreso();
    }

    /* ---------- Pase automático ---------- */
    function empezarProgreso() {
        if (!autoplay) return;
        inicio = performance.now();
        progreso.style.width = '0%';
        clearInterval(temporizador);
        temporizador = setInterval(function () {
            var pct = Math.min((performance.now() - inicio) / DURACION * 100, 100);
            progreso.style.width = pct + '%';
            if (pct >= 100) { clearInterval(temporizador); mostrar(indice + 1); }
        }, 30);
    }

    function reiniciarProgreso() {
        clearInterval(temporizador);
        progreso.style.width = '0%';
        if (autoplay) empezarProgreso();
    }

    function alternarAutoplay() {
        if (imagenes.length < 2) return;
        autoplay = !autoplay;
        btnAutoplay.setAttribute('aria-pressed', String(autoplay));
        btnAutoplay.querySelector('.icono-pausa').hidden = !autoplay;
        btnAutoplay.querySelector('.icono-play').hidden = autoplay;
        if (autoplay) empezarProgreso(); else { clearInterval(temporizador); progreso.style.width = '0%'; }
    }

    function pantallaCompleta() {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    /* ---------- Interacciones ---------- */
    function interacciones() {
        $('btnAnterior').addEventListener('click', function () { mostrar(indice - 1); });
        $('btnSiguiente').addEventListener('click', function () { mostrar(indice + 1); });
        btnAutoplay.addEventListener('click', alternarAutoplay);
        $('btnPantalla').addEventListener('click', pantallaCompleta);
        if (!document.documentElement.requestFullscreen) $('btnPantalla').hidden = true;

        // Arrastrar las miniaturas con el ratón
        var abajo = false, x0 = 0, scroll0 = 0, arrastrando = false;
        pista.addEventListener('mousedown', function (e) { abajo = true; arrastrando = false; x0 = e.pageX; scroll0 = pista.scrollLeft; });
        window.addEventListener('mouseup', function () { abajo = false; });
        pista.addEventListener('mousemove', function (e) {
            if (!abajo) return;
            var d = (e.pageX - x0) * 1.5;
            if (Math.abs(d) > 5) arrastrando = true;
            pista.scrollLeft = scroll0 - d;
        });
        miniaturas.addEventListener('click', function (e) {
            if (arrastrando) { e.stopPropagation(); e.preventDefault(); arrastrando = false; }
        }, true);
        pista.addEventListener('wheel', function (e) {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) pista.scrollLeft += e.deltaY;
        }, { passive: true });

        // Al pasar el ratón por las miniaturas se pausa el progreso de la foto
        pista.addEventListener('mouseenter', function () { if (autoplay) clearInterval(temporizador); });
        pista.addEventListener('mouseleave', function () { if (autoplay) empezarProgreso(); });

        // Deslizar con el dedo por toda la pantalla (fuera de botones y miniaturas)
        var tx = 0, ty = 0;
        window.addEventListener('touchstart', function (e) {
            if (e.target.closest('button, a, .miniatura, .pista-miniaturas')) return;
            tx = e.changedTouches[0].screenX; ty = e.changedTouches[0].screenY;
        }, { passive: true });
        window.addEventListener('touchend', function (e) {
            if (e.target.closest('button, a, .miniatura, .pista-miniaturas')) return;
            var dx = tx - e.changedTouches[0].screenX, dy = ty - e.changedTouches[0].screenY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) mostrar(dx > 0 ? indice + 1 : indice - 1);
        }, { passive: true });

        // Atajos de teclado
        window.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') mostrar(indice + 1);
            else if (e.key === 'ArrowLeft') mostrar(indice - 1);
            else if (e.key === ' ' && !e.target.closest('button, a, .miniatura')) { e.preventDefault(); alternarAutoplay(); }
            else if (e.key === 'f' || e.key === 'F') pantallaCompleta();
            else if (e.key === 'Escape' && !document.fullscreenElement) window.location.href = $('cerrar').href;
        });
    }

    /* ---------- Esconder la interfaz tras unos segundos sin actividad ---------- */
    var reposo = null;
    function despertar() {
        document.body.classList.remove('ui-inactiva');
        clearTimeout(reposo);
        reposo = setTimeout(function () { document.body.classList.add('ui-inactiva'); }, INACTIVIDAD);
    }

    function autoocultar() {
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'wheel'].forEach(function (ev) {
            window.addEventListener(ev, despertar, { passive: true });
        });
        // Un toque sobre la foto alterna entre verla limpia y mostrar los controles
        $('escenario').addEventListener('click', function () {
            if (document.body.classList.contains('ui-inactiva')) despertar();
            else { clearTimeout(reposo); document.body.classList.add('ui-inactiva'); }
        });
        despertar();
    }

    /* ---------- Inicio ---------- */
    poner(fotos[0], imagenes[0].src);
    poner(fondos[0], imagenes[0].src);
    fotos[0].classList.add('activa');
    fondos[0].classList.add('activa');
    $('marco').setAttribute('aria-label', imagenes[0].alt);
    capaActiva = 0;
    if (!autoplay) {
        btnAutoplay.setAttribute('aria-pressed', 'false');
        btnAutoplay.querySelector('.icono-pausa').hidden = true;
        btnAutoplay.querySelector('.icono-play').hidden = false;
    }

    interacciones();
    autoocultar();
    empezarProgreso();
})();
