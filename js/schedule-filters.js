export function matchesFilters(lesson, filters, weekType) {
    return (
        (lesson.weekType === 'both' || lesson.weekType === weekType) &&
        (!filters.subject ||
            lesson.subject
                .toLocaleLowerCase('ru')
                .includes(filters.subject.trim().toLocaleLowerCase('ru'))) &&
        (!filters.day || String(lesson.dayOfWeek) === filters.day)
    );
}
export function academicWeek(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const value = Date.UTC(year, month - 1, day);
    const start = Date.UTC(2026, 7, 31);
    const number = Math.floor((value - start) / 604800000) + 1;
    return {
        number,
        type: number % 2 !== 0 ? 'upper' : 'lower',
        day: new Date(value).getUTCDay() || 7,
    };
}
export function localDate(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}
export function moveDate(value, offset) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + offset));
    return date.toISOString().slice(0, 10);
}
