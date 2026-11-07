// Animaciones del Home (GSAP), con el lenguaje del referente de Pinterest:
// movimientos largos y suaves (expo), textos que salen de una máscara y una curvatura 3D que responde
// al scroll (móvil/tablet) o al cursor (escritorio). Nada de rebotes ni giros elásticos.
//
// - Carga (solo la primera vez de cada visita): una línea crece desde el centro con el porcentaje.
// - Apertura: las tarjetas se abren desde una franja delgada, del centro hacia afuera, con un leve zoom.
// - Curvatura 3D: cada tarjeta se inclina según su distancia al "foco" (el centro de la pantalla, o el cursor en escritorio).
//   En el carrusel, además, se inclinan un poco hacia los lados según la velocidad del deslizamiento.
// - Clic en una categoría: el color de la categoría se expande desde el clic hasta llenar la pantalla y se abre su página.
// - Cambio de categoría (móvil/tablet): al detenerse el carrusel en otra tarjeta, su texto sale de la máscara y el ícono sube.
// Si la persona pidió menos movimiento en su sistema, no se anima nada.

(() => {
    const html = document.documentElement;
    const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

    function mostrarTodo() {
        html.classList.remove('con-animaciones', 'con-carga');
    }

    // Sin GSAP o sin animaciones: la página se queda tal cual está (nunca debe quedar oculta)
    if (!window.gsap || sinMovimiento) {
        mostrarTodo();
        return;
    }

    html.classList.add('gsap-activo');

    // Red de seguridad: si algo falla, a los 8 s se muestra todo igual
    setTimeout(mostrarTodo, 8000);

    const contenedor = document.querySelector('.categorias');
    const tarjetas = gsap.utils.toArray('.categoria');                                   // caja (<a>): tamaño, posición y snap
    const caras = tarjetas.map((tarjeta) => tarjeta.querySelector('.categoria__cara'));  // lo que se ve: se inclina y sube
    const iconos = tarjetas.map((tarjeta) => tarjeta.querySelector('.categoria__icono'));
    const flechas = tarjetas.map((tarjeta) => tarjeta.querySelector('.categoria__flecha'));
    const esTactil = () => matchMedia('(max-width: 1024px)').matches;                    // misma regla que el CSS (carrusel)
    const puedeHover = matchMedia('(hover: hover)').matches;

    /* ---------- Textos en máscara ---------- */

    // Cada línea del texto queda dentro de una máscara (overflow: hidden) para poder "subirla" desde abajo.
    // Las líneas se separan por los <br> que ya tiene el HTML.
    function enmascarar(elemento) {
        const lineas = elemento.innerHTML.split(/<br\s*\/?>/i);
        elemento.innerHTML = lineas
            .map((linea) => `<span class="mascara"><span class="mascara__texto">${linea.trim()}</span></span>`)
            .join('');
        return gsap.utils.toArray(elemento.querySelectorAll('.mascara__texto'));
    }

    const textosHeader = gsap.utils.toArray('.header__titulos > *').flatMap(enmascarar);
    const textosTarjeta = tarjetas.map((tarjeta) =>
        gsap.utils.toArray(tarjeta.querySelectorAll('.categoria__texto h3, .categoria__texto h4')).flatMap(enmascarar)
    );

    /* ---------- Curvatura 3D ---------- */

    // Grados que se inclina la tarjeta más lejana al foco
    const giroMaximo = () => (esTactil() ? 26 : 18);
    // Cuánto se inclina de lado por la velocidad del deslizamiento (solo carrusel)
    const INCLINACION_POR_VELOCIDAD = 0.45;
    const INCLINACION_MAXIMA = 9;

    const estado = { foco: 0 };        // -1 (izquierda) … 0 (centro) … 1 (derecha). En escritorio sigue al cursor.
    let velocidad = 0;
    let ultimoScroll = contenedor.scrollLeft;
    let centros = [];
    let ultimoFoco = null;
    let sucio = true;

    // Centro de cada tarjeta según el layout (no según la pantalla), para no depender de la propia inclinación
    function medir() {
        centros = tarjetas.map((t) => (t.offsetLeft - contenedor.offsetLeft) + t.offsetWidth / 2);
        sucio = true;
    }

    function curvar() {
        const scroll = contenedor.scrollLeft;
        velocidad += ((scroll - ultimoScroll) - velocidad) * 0.18;     // suavizada, para que no vibre
        ultimoScroll = scroll;

        // Si nada cambió (sin scroll, sin movimiento del foco), no se toca el DOM
        if (!sucio && Math.abs(velocidad) < 0.02 && estado.foco === ultimoFoco) return;
        sucio = false;
        ultimoFoco = estado.foco;

        const mitad = contenedor.clientWidth / 2;
        const max = giroMaximo();
        const foco = mitad + estado.foco * mitad;
        const inclinacion = esTactil()
            ? gsap.utils.clamp(-INCLINACION_MAXIMA, INCLINACION_MAXIMA, -velocidad * INCLINACION_POR_VELOCIDAD)
            : 0;

        gsap.set(caras, {
            // Signo negativo: lo que está lejos del foco se acerca a quien mira por los lados (cóncavo, como en el referente)
            rotationY: (i) => -gsap.utils.clamp(-1.4, 1.4, (centros[i] - scroll - foco) / mitad) * max,
            skewX: inclinacion
        });
    }

    gsap.ticker.add(curvar);
    window.addEventListener('resize', medir);
    medir();
    curvar();

    // Escritorio: la curvatura sigue al cursor, con inercia
    if (puedeHover) {
        const seguirFoco = gsap.quickTo(estado, 'foco', { duration: 1.4, ease: 'power3.out' });
        window.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse' || esTactil()) return;
            seguirFoco(gsap.utils.clamp(-1, 1, (e.clientX / window.innerWidth) * 2 - 1));
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => seguirFoco(0));
    }

    /* ---------- Cambio de categoría ---------- */

    // El texto de la tarjeta sale de su máscara y el ícono sube (solo en el carrusel)
    function revelarTarjeta(i) {
        gsap.fromTo(textosTarjeta[i], { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06, overwrite: 'auto' });
        gsap.fromTo(iconos[i], { y: 28, scale: 0.94 }, { y: 0, scale: 1, duration: 1.1, ease: 'expo.out', overwrite: 'auto' });
    }

    // Móvil / tablet: carrusel.js avisa cuando cambia la tarjeta visible
    document.addEventListener('categoria:cambio', (evento) => {
        const tarjeta = evento.detail && evento.detail.tarjeta;
        const i = tarjetas.indexOf(tarjeta);
        if (i === -1) return;
        revelarTarjeta(i);
    });

    /* ---------- Escritorio: mouse y teclado ---------- */

    tarjetas.forEach((tarjeta, i) => {
        function entrar() {
            gsap.to(caras[i], { y: -8, duration: 0.8, ease: 'expo.out', overwrite: 'auto' });
            gsap.to(iconos[i], { y: -8, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
            gsap.to(flechas[i], { x: 8, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
        }

        function salir() {
            gsap.to(caras[i], { y: 0, duration: 0.8, ease: 'expo.out', overwrite: 'auto' });
            gsap.to(iconos[i], { y: 0, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
            gsap.to(flechas[i], { x: 0, duration: 0.7, ease: 'expo.out', overwrite: 'auto' });
        }

        if (puedeHover) {
            tarjeta.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') entrar(); });
            tarjeta.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') salir(); });
        }

        tarjeta.addEventListener('focus', () => { if (tarjeta.matches(':focus-visible')) entrar(); });
        tarjeta.addEventListener('blur', salir);
    });

    /* ---------- Clic en una categoría: la pantalla se llena de su color ---------- */

    // El color se expande desde el punto del clic hasta cubrir toda la pantalla y entonces se abre la página.
    // La página de la categoría arranca con ese mismo color y lo va descubriendo (ver .viene-de-portada en el CSS).
    // Con ctrl/cmd/shift o clic central se deja el comportamiento normal del navegador (abrir en otra pestaña).
    let navegando = false;

    tarjetas.forEach((tarjeta, i) => {
        tarjeta.addEventListener('click', (e) => {
            if (navegando || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            navegando = true;

            // Con el teclado (Enter) el clic no trae posición: se usa el centro de la tarjeta
            const caja = tarjeta.getBoundingClientRect();
            const x = e.detail === 0 ? caja.left + caja.width / 2 : e.clientX;
            const y = e.detail === 0 ? caja.top + caja.height / 2 : e.clientY;
            const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 2;

            const relleno = document.createElement('div');
            relleno.className = 'relleno';
            relleno.setAttribute('aria-hidden', 'true');
            relleno.style.backgroundColor = getComputedStyle(caras[i]).backgroundColor;
            document.body.append(relleno);

            gsap.fromTo(relleno,
                { clipPath: `circle(0px at ${x}px ${y}px)` },
                {
                    clipPath: `circle(${radio}px at ${x}px ${y}px)`,
                    duration: 0.45,
                    ease: 'expo.inOut',
                    onComplete() {
                        try { sessionStorage.setItem('huella-transicion', '1'); } catch (err) { /* sin almacenamiento: se abre igual, solo sin la entrada con color */ }
                        window.location.href = tarjeta.href;
                    }
                }
            );
        });
    });

    // Si se vuelve con el botón "atrás", el navegador puede traer la portada tal como se dejó (con la pantalla llena de color)
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        document.querySelectorAll('.relleno').forEach((r) => r.remove());
        navegando = false;
    });

    /* ---------- Entrada: carga + apertura ---------- */

    const hayCarga = html.classList.contains('con-carga');
    const cantidad = tarjetas.length;
    // Retraso de cada tarjeta: del centro hacia afuera en escritorio, de izquierda a derecha en el carrusel
    const retraso = (i) => (esTactil() ? i : Math.abs(i - (cantidad - 1) / 2)) * 0.09;

    // Estados iniciales (los textos arrancan escondidos dentro de su máscara)
    gsap.set('.header__titulos > *', { opacity: 1 });
    gsap.set(textosHeader, { yPercent: 115 });
    gsap.set(textosTarjeta.flat(), { yPercent: 115 });
    gsap.set(iconos, { y: 44, opacity: 0 });
    gsap.set(flechas, { y: 24, opacity: 0 });

    const entrada = gsap.timeline({
        onComplete() {
            // Primero se quitan las clases que ocultan y luego los estilos inline: no hay parpadeo.
            // La inclinación (rotationY) de las caras se queda: es la curvatura.
            mostrarTodo();
            gsap.set(['.header__logo', '.header__creditos', '.indicador', '.deslizar'], { clearProps: 'opacity,transform,clipPath' });
            gsap.set(tarjetas, { clearProps: 'opacity,clipPath' });
            gsap.set(caras, { scale: 1 });
            iniciarAvisoDeslizar();
        }
    });

    if (hayCarga) {
        const numero = document.querySelector('.carga__numero');
        const progreso = { valor: 0 };
        try { sessionStorage.setItem('huella-carga', '1'); } catch (e) { /* sin almacenamiento: la carga se verá cada vez, no pasa nada */ }

        entrada
            .fromTo('.carga__linea', { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'expo.inOut' })
            .to(progreso, {
                valor: 100,
                duration: 1.0,
                ease: 'expo.inOut',
                onUpdate: () => { numero.textContent = `${Math.round(progreso.valor)}%`; }
            }, '<')
            .to(['.carga__numero', '.carga__linea'], { opacity: 0, duration: 0.3, ease: 'power2.out' }, '+=0.05')
            .to('.carga', { opacity: 0, duration: 0.5, ease: 'power1.inOut', onComplete: () => html.classList.remove('con-carga') }, '<0.15');
    }

    entrada.addLabel('abrir', hayCarga ? '-=0.5' : 0);

    entrada
        // Header: el logo se "destapa" de izquierda a derecha, los títulos suben desde su máscara
        .fromTo('.header__logo', { clipPath: 'inset(0% 100% 0% 0%)', opacity: 1 }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.out' }, 'abrir')
        .to(textosHeader, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 'abrir+=0.15')
        .fromTo('.header__creditos', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'expo.out' }, 'abrir+=0.3');

    // Tarjetas: se abren desde una franja delgada con un leve zoom que se asienta; después entra su contenido
    tarjetas.forEach((tarjeta, i) => {
        const d = retraso(i);
        entrada
            .fromTo(tarjeta,
                { clipPath: 'inset(49% 0% 49% 0%)', opacity: 1 },
                { clipPath: 'inset(-12% -12% -12% -12%)', duration: 1.35, ease: 'expo.inOut' },
                `abrir+=${0.1 + d}`)
            .fromTo(caras[i], { scale: 1.12 }, { scale: 1, duration: 1.7, ease: 'expo.out' }, '<')
            .to(iconos[i], { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }, `abrir+=${0.75 + d}`)
            .to(textosTarjeta[i], { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 }, `abrir+=${0.85 + d}`)
            .to(flechas[i], { y: 0, opacity: 1, duration: 1, ease: 'expo.out' }, `abrir+=${0.95 + d}`);
    });

    // Indicador y aviso de deslizar (solo se ven en móvil/tablet)
    entrada.fromTo(['.indicador', '.deslizar'], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.1 }, 'abrir+=1.1');

    /* ---------- Aviso de deslizar ---------- */

    function iniciarAvisoDeslizar() {
        // La flecha de "Desliza para ver todas las categorías" invita a deslizar (solo se ve en móvil/tablet)
        gsap.to('.deslizar svg', { x: 8, duration: 1.1, ease: 'power2.inOut', yoyo: true, repeat: -1 });
    }
})();
