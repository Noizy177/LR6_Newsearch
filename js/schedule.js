import { element, message } from './ajax-client.js?v=2';
import { matchesFilters, academicWeek, localDate, moveDate } from './schedule-filters.js?v=2';
import { saveFilters, readFilters, clearFilters } from './cookies.js?v=2';
const form = document.querySelector('#schedule-filters'),
    results = document.querySelector('#lessons'),
    date = document.querySelector('#schedule-date'),
    note = document.querySelector('#filter-note');
const days = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
let lessons = [],
    bells = [],
    ready = false;
date.value = localDate();
function getFilters() {
    return { subject: form.elements.subject.value, day: form.elements.day.value };
}
function weekDate(day) {
    const current = academicWeek(date.value);
    return moveDate(date.value, day - current.day);
}
function render() {
    if (!ready || !date.value) return;
    const week = academicWeek(date.value),
        filters = getFilters();
    const label = week.type === 'upper' ? 'Верхняя неделя' : 'Нижняя неделя';
    const format = (value) =>
        new Date(value + 'T12:00:00').toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
        });
    document.querySelector('#date-label').textContent =
        format(weekDate(1)) + ' — ' + format(weekDate(5));
    document.querySelector('#week-number').textContent =
        week.number > 0 ? week.number + '-я учебная неделя · 2026' : 'До начала семестра';
    document.querySelectorAll('[data-week]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.week === week.type));
        button.title = label + ', № ' + week.number;
    });
    if (date.value < '2026-09-01' || date.value > '2026-12-31') {
        document.querySelector('#lesson-count').textContent = '';
        message(
            results,
            'Для этой даты расписание не опубликовано. Доступен осенний семестр 2026 года.'
        );
        return;
    }
    const visible = lessons
        .filter(
            (item) =>
                weekDate(item.dayOfWeek) >= '2026-09-01' &&
                weekDate(item.dayOfWeek) <= '2026-12-31' &&
                matchesFilters(item, filters, week.type)
        )
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.lessonNumber - b.lessonNumber);
    document.querySelector('#lesson-count').textContent = 'Занятий: ' + visible.length;
    if (!visible.length) {
        message(results, 'Нет занятий по выбранным фильтрам.');
        return;
    }
    results.replaceChildren();
    const visibleDays = [...new Set(visible.map((item) => item.dayOfWeek))];
    for (const day of visibleDays) {
        const block = element('section', 'day-block');
        const heading = element('div', 'day-heading');
        heading.append(element('h2', '', days[day]), element('span', '', format(weekDate(day))));
        const cards = element('div', 'day-lessons');
        visible
            .filter((lesson) => lesson.dayOfWeek === day)
            .forEach((lesson) => {
                const bell = bells.find((item) => item.number === lesson.lessonNumber);
                const item = element('article', 'lesson-card liquid');
                const button = element('button', 'lesson-toggle');
                button.type = 'button';
                button.setAttribute('aria-expanded', 'false');
                const id = 'lesson-' + lesson.id;
                button.setAttribute('aria-controls', id);
                const time = element('span', 'lesson-time');
                time.append(
                    element('strong', '', bell.start),
                    element('span', '', bell.end),
                    element('small', '', lesson.lessonNumber + '-я пара')
                );
                const info = element('span', 'lesson-info');
                info.append(
                    element('strong', '', lesson.subject),
                    element(
                        'span',
                        'muted',
                        [lesson.teacher, lesson.lessonType === 'Не указан' ? '' : lesson.lessonType]
                            .filter(Boolean)
                            .join(' · ')
                    )
                );
                const room = element(
                    'span',
                    'lesson-room',
                    lesson.room ? 'ауд. ' + lesson.room : ''
                );
                const chevron = element('span', 'chevron', '+');
                chevron.setAttribute('aria-hidden', 'true');
                button.append(time, info, room, chevron);
                const details = element('div', 'lesson-details');
                details.id = id;
                details.hidden = true;
                const inner = element('dl', 'detail-grid');
                const values = {
                    Дисциплина: lesson.subject,
                    Преподаватель: lesson.teacher || 'Не указан в источнике',
                    Аудитория: lesson.room || 'Не указана в источнике',
                    'Тип занятия':
                        lesson.lessonType === 'Не указан'
                            ? 'Не указан в источнике'
                            : lesson.lessonType,
                    Пара: lesson.lessonNumber + ' · ' + bell.start + '–' + bell.end,
                    Неделя: label + ' · № ' + week.number,
                    Группа: 'ИВТ-5 · Дизайнеры-1',
                };
                Object.entries(values).forEach(([key, value]) => {
                    const row = element('div');
                    row.append(element('dt', '', key), element('dd', '', value));
                    inner.append(row);
                });
                details.append(inner);
                button.addEventListener('click', () => {
                    const expanded = button.getAttribute('aria-expanded') === 'true';
                    results
                        .querySelectorAll('.lesson-toggle[aria-expanded="true"]')
                        .forEach((other) => {
                            other.setAttribute('aria-expanded', 'false');
                            document.getElementById(other.getAttribute('aria-controls')).hidden =
                                true;
                            other.querySelector('.chevron').textContent = '+';
                        });
                    button.setAttribute('aria-expanded', String(!expanded));
                    details.hidden = expanded;
                    chevron.textContent = expanded ? '−' : '+';
                });
                item.append(button, details);
                cards.append(item);
            });
        block.append(heading, cards);
        results.append(block);
    }
}
function restore() {
    const saved = readFilters();
    if (!saved) return;
    let restored = false;
    for (const name of ['subject', 'day']) {
        const control = form.elements[name];
        if (typeof saved[name] !== 'string') continue;
        if (
            name === 'day' &&
            !Array.from(control.options).some((option) => option.value === saved[name])
        )
            continue;
        control.value = saved[name].slice(0, 200);
        control.classList.add('restored');
        restored = true;
    }
    if (restored) {
        note.textContent = 'Фильтры восстановлены';
        note.hidden = false;
    }
}
async function init() {
    ready = false;
    form.querySelectorAll('input,select,button').forEach((item) => (item.disabled = true));
    message(results, 'Загружаем расписание…');
    try {
        const responses = await Promise.all([
            fetch('data/schedule.json?v=2'),
            fetch('data/bell-schedule.json'),
        ]);
        if (responses.some((response) => !response.ok))
            throw new Error('Не удалось получить расписание.');
        [lessons, bells] = await Promise.all(responses.map((response) => response.json()));
        if (
            !Array.isArray(lessons) ||
            !Array.isArray(bells) ||
            !lessons.length ||
            bells.length !== 6 ||
            !bells.every(
                (item) =>
                    Number.isInteger(item.number) &&
                    /^\d{2}:\d{2}$/.test(item.start) &&
                    /^\d{2}:\d{2}$/.test(item.end)
            ) ||
            !lessons.every(
                (item) =>
                    typeof item.subject === 'string' &&
                    item.group === 'ИВТ-5' &&
                    [1, 2, 3, 4, 5].includes(item.dayOfWeek) &&
                    ['both', 'upper', 'lower'].includes(item.weekType) &&
                    bells.some((bell) => bell.number === item.lessonNumber)
            )
        )
            throw new Error('Данные расписания имеют неверный формат.');
        ready = true;
        form.querySelectorAll('input,select,button').forEach((item) => (item.disabled = false));
        restore();
        render();
    } catch (error) {
        document.querySelector('#lesson-count').textContent = '';
        message(results, error.message, init);
    }
}
form.addEventListener('input', (event) => {
    event.target.classList.remove('restored');
    note.hidden = true;
    if (!ready) return;
    saveFilters(getFilters());
    render();
});
form.addEventListener('submit', (event) => event.preventDefault());
document.querySelector('#reset-filters').addEventListener('click', () => {
    clearFilters();
    for (const name of ['subject', 'day']) {
        form.elements[name].value = '';
        form.elements[name].classList.remove('restored');
    }
    note.hidden = true;
    render();
});
date.addEventListener('change', render);
document.querySelector('#today').addEventListener('click', () => {
    date.value = localDate();
    render();
});
document.querySelectorAll('[data-week]').forEach((button) =>
    button.addEventListener('click', () => {
        if (!date.value) return;
        const week = academicWeek(date.value);
        if (week.type !== button.dataset.week) {
            const offset = date.value > '2026-12-24' ? -7 : 7;
            date.value = moveDate(date.value, offset);
        }
        render();
    })
);
init();
