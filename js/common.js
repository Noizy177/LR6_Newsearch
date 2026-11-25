const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navigation a').forEach((link) => {
    if (link.getAttribute('href') === path) link.setAttribute('aria-current', 'page');
});
const year = document.querySelector('[data-year]');
if (year) year.textContent = new Date().getFullYear();
// A restrained specular highlight follows the pointer on the navigation glass.
const nav = document.querySelector('.navigation');
if (
    nav &&
    matchMedia('(pointer:fine)').matches &&
    !matchMedia('(prefers-reduced-motion:reduce)').matches
) {
    nav.addEventListener('pointermove', (event) => {
        const rect = nav.getBoundingClientRect();
        nav.style.setProperty('--shine-x', ((event.clientX - rect.left) / rect.width) * 100 + '%');
    });
    nav.addEventListener('pointerleave', () => nav.style.removeProperty('--shine-x'));
}
