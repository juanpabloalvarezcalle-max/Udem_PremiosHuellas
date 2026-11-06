// Popup de créditos
// Usa el elemento nativo <dialog>: el navegador se encarga del fondo oscuro,
// de cerrar con la tecla Esc, de mantener el foco dentro del popup y de
// devolverlo al botón que lo abrió.

const dialogo = document.getElementById('dialogo-creditos');
const botonAbrir = document.querySelector('[data-abrir-creditos]');
const botonCerrar = document.querySelector('[data-cerrar-creditos]');

if (dialogo && botonAbrir && botonCerrar) {
    // Abrir
    botonAbrir.addEventListener('click', () => {
        dialogo.showModal();
    });

    // Cerrar con el botón X
    botonCerrar.addEventListener('click', () => {
        dialogo.close();
    });

    // Cerrar al hacer clic en el fondo oscuro (fuera del cuadro)
    dialogo.addEventListener('click', (evento) => {
        if (evento.target === dialogo) {
            dialogo.close();
        }
    });
}