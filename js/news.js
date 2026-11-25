import { request, debounce, element, message, dateLabel } from './ajax-client.js?v=2';
const grid = document.querySelector('#news-grid');
const pagination = document.querySelector('#pagination');
const search = document.querySelector('#news-search');
const count = document.querySelector('#news-count');
const dialog = document.querySelector('#article-dialog');
const body = document.querySelector('#article-body');
let page = 1,
    category = '',
    controller,
    generation = 0,
    detailController,
    detailGeneration = 0,
    opener;
function card(item) {
    const article = element('article', 'news-card liquid');
    const content = element('div', 'card-content');
    const meta = element('div', 'meta');
    const time = element('time', '', dateLabel(item.date));
    time.dateTime = item.date;
    meta.append(element('span', 'category-label', item.category), time);
    const heading = element('h2');
    const button = element('button', 'headline-button', item.title);
    button.type = 'button';
    button.setAttribute('aria-label', 'Читать: ' + item.title);
    button.addEventListener('click', () => openArticle(item.id, button));
    heading.append(button);
    content.append(
        meta,
        heading,
        element('p', '', item.excerpt),
        element('span', 'source-name', item.sourceName)
    );
    article.append(content);
    if (item.image) {
        const cover = element('div', 'card-cover');
        const img = element('img');
        img.src = item.image;
        img.alt = item.imageAlt || '';
        img.loading = 'lazy';
        img.width = 800;
        img.height = 500;
        cover.append(img);
        article.append(cover);
    }
    return article;
}
async function load() {
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    grid.setAttribute('aria-busy', 'true');
    const previousHeight = grid.getBoundingClientRect().height;
    if (previousHeight) grid.style.minHeight = previousHeight + 'px';
    pagination.querySelectorAll('button').forEach((button) => {
        button.disabled = true;
    });
    if (!grid.childElementCount) {
        count.textContent = 'Загружаем публикации…';
        message(grid, 'Загружаем публикации…');
    }
    try {
        const result = await request(
            { type: 'news', action: 'list', page, limit: 5, search: search.value.trim(), category },
            controller.signal
        );
        if (current !== generation) return;
        // Decode covers before replacing the visible list to avoid empty-image flashes.
        await Promise.all(
            result.items
                .filter((item) => item.image)
                .map((item) => {
                    const image = new Image();
                    image.src = item.image;
                    return image.decode().catch(() => {});
                })
        );
        if (current !== generation) return;
        pagination.replaceChildren();
        count.textContent = result.total ? 'Публикаций: ' + result.total : 'Ничего не найдено';
        if (!result.items.length)
            message(
                grid,
                'По вашему запросу публикаций нет. Попробуйте другое слово или категорию.'
            );
        else grid.replaceChildren(...result.items.map(card));
        const pages = Math.ceil(result.total / result.pageSize);
        if (pages > 1) {
            const add = (label, target, disabled = false) => {
                const button = element('button', 'page-button', label);
                button.type = 'button';
                button.disabled = disabled;
                if (target === page && /^\d+$/.test(label)) {
                    button.setAttribute('aria-current', 'page');
                    button.setAttribute('aria-label', 'Страница ' + label);
                }
                button.addEventListener('click', () => {
                    page = target;
                    load();
                    document
                        .querySelector('#feed')
                        .scrollIntoView({
                            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                                ? 'instant'
                                : 'smooth',
                            block: 'start',
                        });
                });
                pagination.append(button);
            };
            add('Назад', page - 1, page === 1);
            for (let i = 1; i <= pages; i++) add(String(i), i);
            add('Вперёд', page + 1, page === pages);
        }
    } catch (error) {
        if (error.name !== 'AbortError' && current === generation) {
            pagination.replaceChildren();
            count.textContent = 'Не удалось загрузить';
            message(grid, error.message, load);
        }
    } finally {
        if (current === generation) {
            grid.setAttribute('aria-busy', 'false');
            grid.style.removeProperty('min-height');
        }
    }
}
const delayed = debounce(() => {
    page = 1;
    load();
});
search.addEventListener('input', () => {
    controller?.abort();
    generation++;
    delayed();
});
document.querySelector('#news-form').addEventListener('submit', (event) => {
    event.preventDefault();
    delayed.cancel();
    page = 1;
    load();
});
document.querySelectorAll('[data-category]').forEach((button) =>
    button.addEventListener('click', () => {
        delayed.cancel();
        category = button.dataset.category;
        page = 1;
        document
            .querySelectorAll('[data-category]')
            .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        load();
    })
);
async function openArticle(id, button) {
    opener = button;
    detailController?.abort();
    detailController = new AbortController();
    const current = ++detailGeneration;
    message(body, 'Загружаем публикацию…');
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#close-article').focus();
    try {
        const item = await request({ type: 'news', action: 'detail', id }, detailController.signal);
        if (current !== detailGeneration || !dialog.open) return;
        const img = element('img', 'article-image');
        img.src = item.image;
        img.alt = '';
        const title = element('h2', '', item.title);
        title.id = 'article-title';
        const content = element('div', 'article-text');
        item.content.split('\n\n').forEach((text) => content.append(element('p', '', text)));
        const attribution = element('div', 'article-source');
        const source = element('a', '', item.sourceName);
        source.href = item.sourceUrl;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        attribution.append(element('span', '', 'Источник: '), source);
        if (item.imageCredit)
            attribution.append(element('p', 'image-credit', 'Фото: ' + item.imageCredit));
        const nodes = [element('div', 'meta', item.category + ' · ' + dateLabel(item.date)), title];
        if (item.image) nodes.push(img);
        nodes.push(content, attribution);
        body.replaceChildren(...nodes);
    } catch (error) {
        if (error.name !== 'AbortError' && current === detailGeneration)
            message(body, error.message, () => openArticle(id, opener));
    }
}
document.querySelector('#close-article').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
        )
            dialog.close();
    }
});
dialog.addEventListener('close', () => {
    detailController?.abort();
    detailGeneration++;
    document.body.classList.remove('modal-open');
    opener?.focus();
});
load();
