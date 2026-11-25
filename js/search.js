import { request, debounce, element, message } from './ajax-client.js?v=2';
const input = document.querySelector('#user-search'),
    list = document.querySelector('#user-results'),
    more = document.querySelector('#load-more'),
    count = document.querySelector('#user-count');
let page = 1,
    controller,
    generation = 0,
    busy = false,
    ids = new Set();
async function load(append = false) {
    controller?.abort();
    controller = new AbortController();
    const current = ++generation;
    busy = true;
    more.disabled = true;
    list.setAttribute('aria-busy', 'true');
    if (!append) {
        page = 1;
        ids = new Set();
        more.hidden = true;
        message(list, 'Ищем участников…');
    }
    count.textContent = 'Загрузка…';
    try {
        const result = await request(
            { type: 'nickname', page, limit: 10, search: input.value.trim() },
            controller.signal
        );
        if (current !== generation) return;
        if (!append) list.replaceChildren();
        result.items.forEach((item) => {
            if (ids.has(item.id)) return;
            ids.add(item.id);
            const card = element('article', 'user-card liquid');
            const avatar = element(
                'div',
                'avatar',
                (item.displayName || item.nickname)
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
            );
            avatar.setAttribute('aria-hidden', 'true');
            const info = element('div', 'user-info');
            info.append(
                element('h2', '', item.displayName || item.nickname),
                element('span', 'handle', '@' + item.nickname)
            );
            card.append(avatar, info);
            list.append(card);
        });
        if (!ids.size) message(list, 'Такой никнейм не найден. Попробуйте ввести часть имени.');
        count.textContent = 'Показано ' + ids.size + ' из ' + result.total;
        more.hidden = !result.hasMore;
    } catch (error) {
        if (error.name !== 'AbortError' && current === generation) {
            count.textContent = 'Не удалось загрузить участников';
            if (!append) message(list, error.message, () => load());
            else {
                page--;
                more.hidden = false;
                count.textContent = error.message + ' Нажмите «Показать ещё», чтобы повторить.';
            }
        }
    } finally {
        if (current === generation) {
            busy = false;
            more.disabled = false;
            list.setAttribute('aria-busy', 'false');
        }
    }
}
const delayed = debounce(() => load());
input.addEventListener('input', () => {
    controller?.abort();
    generation++;
    busy = false;
    more.hidden = true;
    delayed();
});
document.querySelector('#user-form').addEventListener('submit', (event) => {
    event.preventDefault();
    delayed.cancel();
    load();
});
more.addEventListener('click', () => {
    if (!busy) {
        page++;
        load(true);
    }
});
load();
