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
    var ESCALON = 3;                   // ms de diferencia entre una línea y la siguiente (de abajo hacia arriba)
    var ENTRADA = 90;                  // ms que tarda el color en cubrir la pantalla
    var PAUSA = 30;                    // ms que se queda la huella completa antes de abrir la página
    var SALIDA = 280;                   // ms que tarda la página de destino en destaparse

    var html = document.documentElement;
    var NS = 'http://www.w3.org/2000/svg';
    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var puedeAnimar = typeof Element !== 'undefined' && Element.prototype.animate;
    var navegando = false;

    /* ---------- La huella: crestas que siguen la forma del trofeo ---------- */

    // Cada línea es una cresta de huella que recorre el trofeo de Premios Huella por dentro (como curvas de nivel de su silueta):
    // los lazos llevan 2-3 líneas paralelas y la base se llena de líneas concentricas, con pequeños cortes como los de una huella real.
    // Van de abajo hacia arriba (primero la base y después los lazos) y así el trofeo se "va formando".
    // Sale de la silueta del trofeo, en un lienzo de 1024 x 1024; si cambia el trofeo hay que volver a generarlas.
    var TROFEO = ["M675 981L663 980L470 979L454 979L298 978","M286 978L225 977L223 975L223 870L224 867L227 866","M243 866L589 866","M601 866L810 866L818 866L842 867L843 870L843 979L840 980L675 981","M677 966L665 966L472 965L456 965L408 965","M396 965L299 964L283 964L239 963L237 961L237 884L238 881L245 880L281 880","M294 880L454 880","M466 880L804 880L828 881L829 884L829 965L826 966L677 966","M676 973L664 973L471 972L455 972L431 972","M399 972L298 971L286 971L234 970L231 969L230 966L230 877L231 874L238 873L427 873","M439 873L805 873L833 874L836 875L836 972L833 973L676 973","M678 959L666 959L473 958L457 958L421 958","M389 958L300 957L284 957L248 956L244 955L244 952L244 891L245 888L252 887L349 887","M365 887L803 887L819 888L822 889L822 954L822 958L819 959L678 959","M808 952L679 952L663 952L515 951","M502 951L470 951L458 951L301 950L285 950L253 949L251 947L251 931","M251 919L251 899L251 895L255 894L589 894","M601 894L806 894L814 895L815 898L815 950L812 952L808 952","M801 945L680 945L664 945L475 944L459 944L431 944","M419 944L302 943L286 943L262 942L258 941L258 937L258 905L259 901L266 901L403 901","M415 901L806 901L808 903L808 943L805 945L801 945","M795 938L682 938L662 938L473 937L457 937L300 936L288 936L268 935L265 933L265 909L268 908L361 908","M373 908L671 908","M687 908L800 908L801 911L801 935L799 938L795 938","M680 931L664 931L475 930L459 930L302 929L273 928L272 925L272 917L275 915L323 915","M339 915L790 915","M794 924L794 928L793 931L789 931L680 931","M595 853L587 853L551 853L539 853L382 852","M366 852L249 852L241 852L242 848L249 834L253 834L816 834","M822 844L826 851L824 853L595 853","M552 846L540 845L266 845","M254 845L254 842L258 841L358 841","M370 841L809 841L813 842L813 845L809 846L596 846L588 845L576 845L552 846","M376 814L294 814L291 813L294 810L301 806L305 805L378 805L386 806L390 807L396 813L392 814","M693 814L689 814L688 812L694 806L702 805L760 805L777 806L781 807L787 812L784 814L780 814","M790 822L532 821","M520 821L375 821","M363 821L271 821L267 820L272 815L296 800L300 798L304 798L376 798L392 799L401 807L405 809L413 809L670 809L678 808L682 807L690 799L698 798L759 798L783 799L798 812L806 820L790 822","M419 797L407 795L406 792L408 788L420 788L671 788L674 789L676 793L674 796L670 797L557 797","M544 797L419 797","M538 754L546 753L558 750L565 746L579 738L588 730L602 716L612 703L621 690L632 668L644 638L650 623L656 600L660 580L666 540","M667 528L667 520L667 508L666 488L662 464L659 452L654 437L647 423L637 410L623 395L610 386L599 381L592 378L580 376L560 376L548 378L533 383L522 390L516 395L509 404","M503 415L500 422L497 434L497 458L503 506L506 534L506 546L506 558L503 574L497 598L492 613L479 647L475 662L472 678L472 698L474 710L480 725L487 735L496 743L507 749L514 752L526 754L538 754","M539 761L547 760L559 757L570 752L580 746L592 736L607 722L619 706L628 692L635 678L642 664L651 641L657 622L666 587L670 563L673 539L674 519L674 503L673 487L669 464L665 448L660 433L653 419L641 402","M632 394L626 388L616 382L602 374L591 371L579 369L559 369L543 372L535 374L525 380L518 384L509 392L499 405L493 420L490 435","M490 451L490 460L496 507L499 535L499 547L498 559L496 575L491 595L486 610L473 644L467 663L465 679L465 703L469 718L474 729L482 739L490 747L497 752L507 757L515 760L523 761L539 761","M532 775L520 774L508 772L497 768L486 762L474 752L464 739L459 728L454 717L451 701L451 681L453 665L456 653L468 619","M473 604L478 593L482 577L485 554L485 530L476 458L476 438L477 430L481 414L489 396L499 383L505 378L511 373L525 364L540 359L548 357L560 355L576 355L599 359L611 363L621 369L634 378","M643 386L652 394L659 404L666 414L671 425L677 440L680 452L684 467L687 487L688 515L687 535L684 559L680 587L670 626L659 656L652 675L639 700L625 720L612 735L601 746L591 754L574 765L560 771L544 774L532 775","M532 768L520 767L508 765L497 760L490 756L481 748L471 736L465 725L462 718L458 698L458 678L461 662L468 639L476 617","M481 605L485 594L489 578L492 555L492 531L490 507","M488 495L483 459L483 439L487 419L491 408L497 397L502 391L510 382L517 377L527 371L538 367L554 363L561 362L578 362L589 364L605 369L623 378L635 388L644 396L654 409L660 419L665 430L671 445L677 468L679 480L681 512L680 536L675 572L670 600L662 627L657 642L647 668L640 683L632 697L619 717L606 732L597 740L588 748L571 759L560 763L544 767L532 768","M585 714L597 676L601 652L604 628L606 604L607 567L605 527L601 491L598 471L593 443L583 404","M581 390L593 393L601 395L604 398L616 445L623 489","M625 501L628 541L629 561L629 585L629 593L628 605L626 633L622 657L616 672L603 693L594 706L588 712L585 714","M606 673L606 665L609 645L613 605L614 568L613 540L611 508L604 464","M602 452L597 432L590 404L590 401L594 401L597 403L599 407L608 442L614 474L617 494L621 538L622 563L622 583L621 607L618 635L614 659L611 667L606 673","M443 646L442 642L439 626L435 611L430 600L421 586L404 564L368 521L341 491L316 465L303 450L292 434L284 420L277 401L274 385L273 373L273 365L274 349L279 330L287 311L296 293L303 283L316 268L333 251L349 239L363 232L378 225L393 221L409 218L421 217L429 217L445 218L457 220L469 224L480 228L494 235L511 246L520 254L532 265L552 290L569 317L580 339L580 342L560 342L557 339L543 315","M536 305L519 283L505 269L492 259L482 252L467 245L452 241L440 239L412 239L396 242L377 248L363 256L347 267L330 284","M322 293L313 307L305 321L299 336L296 347L295 359L295 379L296 391L298 399L305 414L315 431L320 437L355 475","M363 484L400 527L428 561L452 593L455 594L458 591L461 584L464 568L467 548L466 524L459 493L447 458L425 411L406 376L366 306L353 282L354 278L367 269L370 270L442 396L461 435L462 439L464 467L472 527L472 555L470 571L464 594L445 643L443 646","M455 455L451 448L437 419L422 390L365 291L362 284L363 280L366 279L369 282L411 356","M417 367L437 402L455 439L455 443L455 455","M446 617L431 589L415 566L374 517L347 487L322 461L304 439L293 422L287 407L282 392L280 372L280 364L282 348L287 329L293 314L299 303L310 286L320 274L331 262L347 250L368 238","M379 233L394 228L410 225L422 224L438 224L458 228L477 234L488 240L504 250L517 260L528 272L539 284L550 300L567 328L568 332L567 334L563 334L560 331L544 303L534 290L524 278L504 258","M494 251L487 247L469 238L450 233L442 232L418 232L406 233L394 235L378 240","M364 247L357 251L341 263L324 280L319 286L307 303L298 320L292 335L289 347L288 355L288 379L290 395L295 410L300 421L311 438L322 450L371 503L394 531L425 568L446 598L452 603L450 610L446 617","M695 453L689 434L679 412L679 408L679 388L679 336L677 292L673 252L665 216L656 185L650 170L641 152L630 135L623 126L615 117L606 109L596 101L575 90L564 86L552 83L536 81L512 81L492 83L461 91L435 101L420 108L406 116L397 123L385 134L374 146L363 163L356 182L354 194L353 206L353 214L353 222L340 230L336 232L334 229L332 217L332 197L334 185L338 170L344 155L348 148","M354 138L361 128L373 117L391 101L412 89L426 81L441 75L460 69L479 64L495 61L515 59L531 59L547 60","M559 63L567 65L582 70L593 75L613 88L623 95L637 110L649 126L662 146L669 161","M673 172L683 198L692 237L697 269L699 301L700 321L700 398L697 450L695 453","M691 418L689 415L686 408L687 388L687 332L683 280L679 244L672 212L662 182L656 167L647 149L637 132L629 122L616 108","M606 100L600 95L586 87L575 82L552 76L536 74L512 74L488 77L472 80L449 87","M438 92L431 95L410 106L393 117L381 128L368 143L357 160L351 175L349 183L347 194L346 206L346 214L345 218L342 220L339 218L339 214L339 198L343 178L348 163L353 152L362 139L370 130L381 118L397 106L414 95L428 88L443 82L462 76L482 71L505 67L517 66L529 66L549 68L565 72L584 78L591 82L605 90L620 103L632 114L644 130L656 151L669 180L674 195L680 215L687 250","M689 266L692 302L693 326L693 398L692 414L691 418"];

    // Devuelve la lista de trazos, cada uno con su orden de aparición (0 = el primero en dibujarse)
    function crestas() {
        return TROFEO.map(function (d, i) { return { d: d, orden: i }; });
    }

    // Construye el <svg> con la huella; devuelve el svg y la lista de sus trazos
    function huella(color) {
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '205 35 660 965');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.cssText = 'display:block;height:min(64vh,560px);width:auto;max-width:80vw;overflow:visible;';

        var g = document.createElementNS(NS, 'g');
        g.setAttribute('fill', 'none');
        g.setAttribute('stroke', color);
        g.setAttribute('stroke-width', '4.4');
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

    // La pantalla de carga de la portada (animaciones.js) reutiliza esta misma huella
    window.HuellaTrofeo = { crear: huella };

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
