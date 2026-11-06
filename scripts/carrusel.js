// Carrusel de categorías (versión móvil)
// Marca en el indicador (los segmentos de abajo) cuál es la tarjeta visible.
// En escritorio el indicador está oculto por CSS, así que esto no tiene efecto visual.

const carrusel = document.querySelector('.categorias');
const marcas = document.querySelectorAll('.indicador__marca');

if (carrusel && marcas.length) {
    const tarjetas = carrusel.querySelectorAll('.categoria');
    let pendiente = false;

    function actualizarIndicador() {
        pendiente = false;

        const estilos = getComputedStyle(carrusel);
        const inicio = carrusel.getBoundingClientRect().left + parseFloat(estilos.paddingLeft);

        // Tarjeta cuyo borde izquierdo está más cerca del inicio visible del carrusel
        let activa = 0;
        let menorDistancia = Infinity;
        tarjetas.forEach((tarjeta, indice) => {
            const distancia = Math.abs(tarjeta.getBoundingClientRect().left - inicio);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                activa = indice;
            }
        });

        // Al final del recorrido la última tarjeta no llega al inicio, así que la forzamos
        const alFinal = carrusel.scrollLeft + carrusel.clientWidth >= carrusel.scrollWidth - 2;
        if (alFinal) {
            activa = tarjetas.length - 1;
        }

        marcas.forEach((marca, indice) => {
            marca.classList.toggle('indicador__marca--activa', indice === activa);
        });
    }

    // requestAnimationFrame evita recalcular en cada píxel de scroll
    function alDeslizar() {
        if (!pendiente) {
            pendiente = true;
            requestAnimationFrame(actualizarIndicador);
        }
    }

    carrusel.addEventListener('scroll', alDeslizar, { passive: true });
    window.addEventListener('resize', alDeslizar);
    actualizarIndicador();
}