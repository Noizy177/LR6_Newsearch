export async function request(params, signal) {
    let response;
    try {
        response = await fetch('ajax.php', {
            method: 'POST',
            body: new URLSearchParams(params),
            signal,
            headers: { Accept: 'application/json' },
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Не удалось связаться с сервером. Попробуйте ещё раз.');
    }
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
        throw new Error(
            'Сервис данных недоступен. Откройте сайт через http://localhost/web6/ с запущенным Apache в XAMPP.'
        );
    }
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error('Не удалось прочитать данные сервера. Попробуйте ещё раз.');
    }
    if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос.');
    return data;
}
export function debounce(callback, delay = 300) {
    let timer;
    const debounced = (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
}
export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
export function message(container, text, retry) {
    const panel = element('div', 'empty-state liquid');
    panel.append(element('p', '', text));
    if (retry) {
        const button = element('button', 'button', 'Повторить');
        button.type = 'button';
        button.addEventListener('click', retry);
        panel.append(button);
    }
    container.replaceChildren(panel);
}
export function dateLabel(date) {
    return new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}
