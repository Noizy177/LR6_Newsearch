<?php
declare(strict_types=1);
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit();
}
function errorResponse(string $message, int $status): void
{
    respond(['error' => $message], $status);
}
try {
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
        header('Allow: GET, POST');
        errorResponse('Этот метод запроса не поддерживается.', 405);
    }
    $input = array_replace($_GET, $_POST);
    foreach (['type', 'action', 'search', 'page', 'limit', 'id', 'category'] as $key) {
        if (isset($input[$key]) && !is_string($input[$key])) {
            errorResponse('Некорректный параметр: ' . $key, 400);
        }
    }
    $type = $input['type'] ?? '';
    if (!in_array($type, ['news', 'nickname'], true)) {
        errorResponse('Неизвестный тип запроса.', 400);
    }
    $action = $input['action'] ?? 'list';
    if (
        !in_array($action, ['list', 'detail'], true) ||
        ($type === 'nickname' && $action !== 'list')
    ) {
        errorResponse('Неизвестное действие.', 400);
    }
    $raw = file_get_contents(
        __DIR__ . '/data/' . ($type === 'news' ? 'news' : 'nicknames') . '.json',
    );
    if ($raw === false) {
        throw new RuntimeException('Data unavailable');
    }
    $items = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($items)) {
        throw new RuntimeException('Invalid data');
    }
    if ($action === 'detail') {
        $id = filter_var($input['id'] ?? '', FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1],
        ]);
        if ($id === false) {
            errorResponse('Укажите корректный номер публикации.', 400);
        }
        foreach ($items as $item) {
            if ($item['id'] === $id) {
                respond($item);
            }
        }
        errorResponse('Публикация не найдена.', 404);
    }
    $page = filter_var($input['page'] ?? '1', FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => 100000],
    ]);
    $pageSize = $type === 'news' ? 5 : 10;
    $limit = filter_var($input['limit'] ?? (string) $pageSize, FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1, 'max_range' => $pageSize],
    ]);
    if ($page === false || $limit === false) {
        errorResponse('Некорректная страница или размер списка.', 400);
    }
    $query = trim($input['search'] ?? '');
    if (mb_strlen($query, 'UTF-8') > 200) {
        errorResponse('Поисковый запрос слишком длинный.', 400);
    }
    $category = $input['category'] ?? '';
    $items = array_values(
        array_filter($items, static function (array $item) use ($type, $query, $category): bool {
            if ($type === 'news' && $category !== '' && $item['category'] !== $category) {
                return false;
            }
            $haystack =
                $type === 'news'
                    ? implode(' ', [
                        $item['title'],
                        $item['excerpt'],
                        $item['content'],
                        $item['category'],
                    ])
                    : $item['nickname'] . ' ' . ($item['displayName'] ?? '');
            return $query === '' || mb_stripos($haystack, $query, 0, 'UTF-8') !== false;
        }),
    );
    if ($type === 'news') {
        usort($items, static fn($a, $b) => strcmp($b['date'], $a['date']) ?: $b['id'] <=> $a['id']);
    }
    $total = count($items);
    $slice = array_slice($items, ($page - 1) * $limit, $limit);
    if ($type === 'news') {
        $slice = array_map(static function ($item) {
            unset($item['content']);
            return $item;
        }, $slice);
    }
    respond([
        'items' => $slice,
        'page' => $page,
        'pageSize' => $limit,
        'total' => $total,
        'hasMore' => $page * $limit < $total,
    ]);
} catch (Throwable $e) {
    error_log('newsearch API: ' . $e->getMessage());
    errorResponse('Не удалось загрузить данные. Попробуйте ещё раз.', 500);
}
