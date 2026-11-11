/* Animación de huella dactilar al abrir un proyecto.
   Al hacer clic en un proyecto de una página de categoría, la pantalla se cubre con el color de esa categoría y una huella
   dactilar se va formando línea por línea. Después se abre la página del proyecto, que arranca con la huella ya completa
   y la disuelve para mostrarse. Así parece una sola animación entre las dos páginas.

   Cómo se usa: este mismo archivo va en las páginas de categoría (docs/categorias, aquí escucha los clics)
   y en las páginas de proyecto (proyectos, aquí hace la entrada). Se incluye con:
   <script src="../../scripts/vendor/animHuella.js"></script>
   Colores: el fondo es el de la categoría (--fondo) y la huella lleva su color de texto (--texto), los mismos de style.css. */
(function () {
    'use strict';

    var CLAVE = 'huella-anim';          // lo que se guarda entre las dos páginas (colores de la categoría)
    var DIBUJO = 230;                   // ms que tarda en trazarse cada línea
    var ESCALON = 6;                   // ms de diferencia entre una línea y la siguiente (del centro hacia afuera)
    var ENTRADA = 90;                  // ms que tarda el color en cubrir la pantalla
    var PAUSA = 30;                    // ms que se queda la huella completa antes de abrir la página
    var SALIDA = 280;                   // ms que tarda la página de destino en destaparse

    var html = document.documentElement;
    var NS = 'http://www.w3.org/2000/svg';
    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var puedeAnimar = typeof Element !== 'undefined' && Element.prototype.animate;
    var navegando = false;

    /* ---------- La huella: crestas concéntricas con pequeñas roturas, recortadas con forma de yema ---------- */

    // Números repetibles (así la huella sale igual en las dos páginas, sin depender del azar)
    function semilla(n) {
        var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    // Devuelve la lista de trazos, cada uno con su orden de aparición (0 = centro)
    function crestas() {
        var trazos = [];
        var N = 21;
        for (var i = 0; i < N; i++) {
            var rx = 5 + i * 4.3;
            var ry = 7 + i * 5.7;
            // Dos huecos por cresta, en sitios distintos, para que parezca una huella y no una diana
            var h1 = semilla(i + 1) * 360;
            var h2 = (h1 + 140 + semilla(i + 40) * 90) % 360;
            var hueco = 7 + semilla(i + 80) * 9;           // ancho del hueco en grados
            var puntos = [];
            var trazo = null;
            var a0 = Math.floor(semilla(i + 120) * 90) * 4;     // cada cresta empieza a trazarse desde un ángulo distinto
            for (var k = 0; k <= 90; k++) {
                var a = (a0 + k * 4) % 360;
                var t = a * Math.PI / 180;
                // La ondulación cambia muy poco de una cresta a la siguiente, así las líneas vecinas van paralelas y no se cruzan
                var onda = 1 + 0.03 * Math.sin(3 * t + i * 0.22) + 0.018 * Math.sin(5 * t - i * 0.3);
                var x = 100 + rx * onda * Math.cos(t);
                var y = 134 + ry * onda * Math.sin(t);
                var enHueco = Math.abs(((a - h1 + 540) % 360) - 180) < hueco / 2 || Math.abs(((a - h2 + 540) % 360) - 180) < hueco / 2;
                if (i === 0) enHueco = a > 250;              // el centro es solo un pequeño gancho
                if (enHueco) { trazo = null; continue; }
                if (!trazo) { trazo = []; puntos.push(trazo); }
                trazo.push(x.toFixed(1) + ' ' + y.toFixed(1));
            }
            puntos.forEach(function (p) {
                if (p.length > 2) trazos.push({ d: 'M' + p.join('L'), orden: i });
            });
        }
        return trazos;
    }

    // Construye el <svg> con la huella; devuelve el svg y la lista de sus trazos
    function huella(color) {
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 200 268');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'display:block;width:min(46vmin,340px);height:auto;overflow:visible;';

        var defs = document.createElementNS(NS, 'defs');
        var clip = document.createElementNS(NS, 'clipPath');
        clip.setAttribute('id', 'huella-yema');
        var forma = document.createElementNS(NS, 'ellipse');
        forma.setAttribute('cx', '100'); forma.setAttribute('cy', '134');
        forma.setAttribute('rx', '90'); forma.setAttribute('ry', '124');
        clip.appendChild(forma); defs.appendChild(clip); svg.appendChild(defs);

        var g = document.createElementNS(NS, 'g');
        g.setAttribute('clip-path', 'url(#huella-yema)');
        g.setAttribute('transform', 'rotate(-9 100 134)');       // la yema va un poco inclinada, como una huella real
        g.setAttribute('fill', 'none');
        g.setAttribute('stroke', color);
        g.setAttribute('stroke-width', '2.3');
        g.setAttribute('stroke-linecap', 'round');
        g.setAttribute('stroke-linejoin', 'round');

        var lista = crestas().map(function (c) {
            var p = document.createElementNS(NS, 'path');
            p.setAttribute('d', c.d);
            p.setAttribute('pathLength', '1');
            p.setAttribute('stroke-dasharray', '1');
            g.appendChild(p);
            return { el: p, orden: c.orden };
        });
        svg.appendChild(g);
        return { svg: svg, trazos: lista };
    }

    function velo(fondo) {
        var d = document.createElement('div');
        d.id = 'huella-velo';
        d.setAttribute('aria-hidden', 'true');
        d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;' +
            'background-color:' + fondo + ';overflow:hidden;cursor:progress;';
        return d;
    }

    /* ---------- Colores de la categoría (los de style.css: --fondo y --texto de .pagina--<categoría>) ---------- */

    function coloresDe(slug) {
        var prueba = document.createElement('div');
        prueba.className = 'pagina--' + slug;
        prueba.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
        (document.body || html).appendChild(prueba);
        var estilo = getComputedStyle(prueba);
        var f = estilo.getPropertyValue('--fondo').trim();
        var t = estilo.getPropertyValue('--texto').trim();
        prueba.remove();
        return { fondo: f || '#F6ECDB', texto: t || '#214C70' };
    }

    /* ---------- Salida de una página de categoría: la huella se forma y se abre el proyecto ---------- */

    function formar(destino, colores) {
        var v = velo(colores.fondo);
        var h = huella(colores.texto);
        v.appendChild(h.svg);
        document.body.appendChild(v);

        if (!puedeAnimar || reducido) {
            // Sin movimiento: el color y la huella aparecen quietos un instante y se abre el proyecto
            guardar(colores);
            window.setTimeout(function () { window.location.href = destino; }, 220);
            return;
        }

        v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ENTRADA, easing: 'ease-out', fill: 'forwards' });

        var total = 0;
        h.trazos.forEach(function (t) {
            var retraso = ENTRADA * 0.4 + t.orden * ESCALON;
            total = Math.max(total, retraso + DIBUJO);
            t.el.setAttribute('stroke-dashoffset', '1');
            t.el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
                { duration: DIBUJO, delay: retraso, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
        });
        // Un último "latido" de toda la huella cuando ya está formada
        h.svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }],
            { duration: PAUSA + 160, delay: total, easing: 'ease-in-out' });

        guardar(colores);
        window.setTimeout(function () { window.location.href = destino; }, total + PAUSA);
    }

    function guardar(colores) {
        try { sessionStorage.setItem(CLAVE, JSON.stringify(colores)); } catch (e) { /* sin almacenamiento: el proyecto se abre igual, solo sin la entrada */ }
    }

    // Solo en páginas de categoría: se escuchan los clics en las tarjetas de proyecto
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a.proyecto');
        if (!a || navegando || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target && a.target !== '_self') return;
        var m = /\/proyectos\/([^\/]+)\//.exec(a.href);
        if (!m) return;                           // si no lleva a una página de proyecto, se deja como está
        e.preventDefault();
        navegando = true;
        formar(a.href, coloresDe(m[1]));
    });

    // Si se vuelve con "atrás", el navegador puede traer la página tal como se dejó (con la huella encima)
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        var v = document.getElementById('huella-velo');
        if (v) v.remove();
        navegando = false;
    });

    /* ---------- Entrada a una página de proyecto: huella completa que se disuelve ---------- */

    var guardado = null;
    try {
        guardado = sessionStorage.getItem(CLAVE);
        if (guardado) sessionStorage.removeItem(CLAVE);
    } catch (e) { guardado = null; }

    if (!guardado) return;
    var colores;
    try { colores = JSON.parse(guardado); } catch (e) { return; }
    if (!colores || !colores.fondo) return;

    // El script va en el <head>: el velo se pone en <html> para que cubra la página desde el primer instante
    var v = velo(colores.fondo);
    var h = huella(colores.texto);
    v.appendChild(h.svg);
    html.appendChild(v);

    var quitado = false;
    function destapar() {
        if (quitado) return;
        quitado = true;
        if (!puedeAnimar || reducido) { v.remove(); return; }
        v.style.pointerEvents = 'none';
        h.svg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }], { duration: SALIDA, easing: 'ease-in', fill: 'forwards' });
        v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SALIDA, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { v.remove(); };
    }

    // Se destapa cuando la página ya cargó (con un mínimo para que se alcance a ver) y, por seguridad, nunca más tarde de 3 s
    var listo = false, minimo = false;
    function intentar() { if (listo && minimo) destapar(); }
    window.setTimeout(function () { minimo = true; intentar(); }, 180);
    if (document.readyState === 'complete') listo = true;
    else window.addEventListener('load', function () { listo = true; intentar(); });
    window.setTimeout(destapar, 3000);
    intentar();
})();
