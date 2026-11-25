const key = 'newsearch_schedule_v2';
export function saveFilters(filters) {
    document.cookie =
        key +
        '=' +
        encodeURIComponent(JSON.stringify(filters)) +
        '; Max-Age=2592000; Path=/; SameSite=Lax' +
        (location.protocol === 'https:' ? '; Secure' : '');
}
export function readFilters() {
    try {
        const value = document.cookie.split('; ').find((item) => item.startsWith(key + '='));
        if (!value) return null;
        const parsed = JSON.parse(decodeURIComponent(value.slice(key.length + 1)));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
export function clearFilters() {
    for (const name of [key, 'newsearch_schedule'])
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
}
