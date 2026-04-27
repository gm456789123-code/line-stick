<?php
declare(strict_types=1);

require_once __DIR__ . '/_core.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$normalizedPath = is_string($uriPath) ? trim($uriPath, '/') : '';

$apiPos = strpos($normalizedPath, 'backend/api');
$route = $apiPos === false ? '' : substr($normalizedPath, $apiPos + strlen('backend/api'));
$route = '/' . trim((string) $route, '/');

if ($route === '/' || $route === '') {
    api_json([
        'ok' => true,
        'service' => 'line-stick-cms-api',
        'version' => '1.1.0',
        'routes' => [
            'GET /health',
            'GET /public/settings',
            'GET /public/stickers',
            'GET /public/stickers/{slug}',
            'GET /public/order-status/{id}',
            'POST /public/orders',
            'GET /public/orders/{id}?token=...',
            'POST /public/orders/{id}/upload-slip',
            'POST /public/orders/{id}/mark-paid',
            'GET /dashboard/summary',
            'GET|POST /auth/login',
            'GET /auth/me',
            'POST /auth/logout',
            'GET|POST /admins',
            'GET /audit/logs',
            'GET|PUT /settings/site',
            'GET|POST /stickers',
            'PUT|DELETE /stickers/{id}',
            'GET|POST /orders',
            'PUT /orders/{id}/status',
            'POST /upload',
        ],
    ]);
}

if ($route === '/health') {
    try {
        api_db();
        api_json([
            'ok' => true,
            'status' => 'healthy',
            'php' => PHP_VERSION,
            'time' => api_now_iso8601(),
            'db' => 'connected',
        ]);
    } catch (Throwable $e) {
        api_json([
            'ok' => false,
            'status' => 'degraded',
            'php' => PHP_VERSION,
            'time' => api_now_iso8601(),
            'db' => 'failed',
            'error' => $e->getMessage(),
        ], 500);
    }
}

if ($route === '/public/settings') {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }
    api_json(['ok' => true, 'data' => api_read_site_settings()]);
}

if ($route === '/public/stickers') {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    $stickers = api_read_collection('stickers');
    $active = array_values(array_filter($stickers, static function (array $item): bool {
        return strtolower((string) ($item['status'] ?? 'active')) === 'active';
    }));

    $normalized = array_values(array_map(static function (array $item): array {
        $slug = trim((string) ($item['slug'] ?? ''));
        if ($slug === '') {
            $id = trim((string) ($item['id'] ?? ''));
            $slug = $id !== '' ? 'sticker-' . $id : 'sticker';
        }
        $item['slug'] = $slug;
        return $item;
    }, $active));

    api_json(['ok' => true, 'data' => $normalized]);
}

if (str_starts_with($route, '/public/stickers/')) {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    $slug = trim(substr($route, strlen('/public/stickers/')));
    if ($slug === '') {
        api_json(['ok' => false, 'error' => 'slug is required'], 422);
    }

    $stickers = api_read_collection('stickers');
    $found = null;
    foreach ($stickers as $item) {
        $isActive = strtolower((string) ($item['status'] ?? 'active')) === 'active';
        $itemSlug = trim((string) ($item['slug'] ?? ''));
        $itemId = trim((string) ($item['id'] ?? ''));
        $fallbackSlug = $itemId !== '' ? 'sticker-' . $itemId : '';
        $isMatch = $itemSlug === $slug || $fallbackSlug === $slug;
        if ($isActive && $isMatch) {
            if ($itemSlug === '' && $fallbackSlug !== '') {
                $item['slug'] = $fallbackSlug;
            }
            $found = $item;
            break;
        }
    }

    if ($found === null) {
        api_json(['ok' => false, 'error' => 'Not found'], 404);
    }

    api_json(['ok' => true, 'data' => $found]);
}

if (str_starts_with($route, '/public/order-status/')) {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    $orderId = trim(substr($route, strlen('/public/order-status/')));
    if ($orderId === '') {
        api_json(['ok' => false, 'error' => 'order id is required'], 422);
    }

    $found = api_orders_get_by_id($orderId);

    if ($found === null) {
        api_json(['ok' => false, 'error' => 'Order not found'], 404);
    }

    api_json([
        'ok' => true,
        'data' => [
            'id' => (string) ($found['id'] ?? ''),
            'status' => (string) ($found['status'] ?? 'pending_payment'),
            'total' => api_normalize_float($found['total'] ?? 0, 0),
            'createdAt' => (string) ($found['createdAt'] ?? ''),
            'updatedAt' => (string) ($found['updatedAt'] ?? ''),
            'completedAt' => (string) ($found['completedAt'] ?? ''),
            'paymentSubmittedAt' => (string) ($found['paymentSubmittedAt'] ?? ''),
        ],
    ]);
}

if ($route === '/public/orders') {
    if ($method !== 'POST') {
        api_method_not_allowed(['POST']);
    }

    $body = Shield::clean(api_parse_json_body());
    $customer = is_array($body['customer'] ?? null) ? $body['customer'] : [];
    $items = is_array($body['items'] ?? null) ? array_values($body['items']) : [];
    $fullName = trim((string) ($customer['fullName'] ?? ''));
    $phone = trim((string) ($customer['phone'] ?? ''));
    $lineId = trim((string) ($customer['lineId'] ?? ''));
    $note = trim((string) ($customer['note'] ?? ''));

    if ($fullName === '' || $phone === '' || $lineId === '') {
        api_json(['ok' => false, 'error' => 'customer.fullName, customer.phone, customer.lineId are required'], 422);
    }
    if (count($items) <= 0) {
        api_json(['ok' => false, 'error' => 'items is required'], 422);
    }

    $normalizedItems = [];
    $total = 0.0;
    foreach ($items as $rawItem) {
        if (!is_array($rawItem)) {
            continue;
        }
        $price = api_normalize_float($rawItem['price'] ?? 0, 0);
        $qty = max(1, api_normalize_int($rawItem['qty'] ?? 1, 1));
        $row = [
            'slug' => trim((string) ($rawItem['slug'] ?? '')),
            'name' => trim((string) ($rawItem['name'] ?? 'Sticker')),
            'price' => $price,
            'qty' => $qty,
            'imageUrl' => trim((string) ($rawItem['imageUrl'] ?? '')),
            'emoji' => trim((string) ($rawItem['emoji'] ?? '')),
            'lineTotal' => $price * $qty,
        ];
        $total += $row['lineTotal'];
        $normalizedItems[] = $row;
    }

    if (count($normalizedItems) <= 0) {
        api_json(['ok' => false, 'error' => 'items is invalid'], 422);
    }

    $order = [
        'id' => api_uuid(),
        'publicToken' => bin2hex(random_bytes(16)),
        'customer' => [
            'fullName' => $fullName,
            'phone' => $phone,
            'lineId' => $lineId,
            'note' => $note,
        ],
        'items' => $normalizedItems,
        'total' => $total,
        'status' => 'pending_payment',
        'createdAt' => api_now_iso8601(),
    ];
    api_orders_create($order);

    api_json([
        'ok' => true,
        'data' => [
            'orderId' => $order['id'],
            'paymentToken' => $order['publicToken'],
            'status' => $order['status'],
            'total' => $order['total'],
        ],
    ], 201);
}

if (str_starts_with($route, '/public/orders/')) {
    $tail = trim(substr($route, strlen('/public/orders/')));
    if ($tail === '') {
        api_json(['ok' => false, 'error' => 'order id is required'], 422);
    }

    if (str_ends_with($tail, '/mark-paid')) {
        if ($method !== 'POST') {
            api_method_not_allowed(['POST']);
        }

        $orderId = trim(substr($tail, 0, -strlen('/mark-paid')));
        if ($orderId === '') {
            api_json(['ok' => false, 'error' => 'order id is required'], 422);
        }

        $body = Shield::clean(api_parse_json_body());
        $token = trim((string) ($body['token'] ?? ''));
        if ($token === '') {
            api_json(['ok' => false, 'error' => 'token is required'], 422);
        }

        $current = api_orders_get_by_id($orderId);
        if ($current === null) {
            api_json(['ok' => false, 'error' => 'Order not found'], 404);
        }
        $storedToken = (string) ($current['publicToken'] ?? '');
        if ($storedToken === '' || !hash_equals($storedToken, $token)) {
            api_json(['ok' => false, 'error' => 'Invalid token'], 403);
        }

        $current['status'] = 'under_review';
        $current['paymentSubmittedAt'] = api_now_iso8601();
        $current['updatedAt'] = api_now_iso8601();
        api_orders_update($current);

        api_json(['ok' => true, 'data' => $current]);
    }

    if (str_ends_with($tail, '/upload-slip')) {
        if ($method !== 'POST') {
            api_method_not_allowed(['POST']);
        }

        $orderId = trim(substr($tail, 0, -strlen('/upload-slip')));
        if ($orderId === '') {
            api_json(['ok' => false, 'error' => 'order id is required'], 422);
        }

        $token = trim((string) ($_POST['token'] ?? ''));
        if ($token === '') {
            api_json(['ok' => false, 'error' => 'token is required'], 422);
        }

        if (!isset($_FILES['file'])) {
            api_json(['ok' => false, 'error' => 'file is required'], 422);
        }

        $file = $_FILES['file'];
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            api_json(['ok' => false, 'error' => 'upload failed'], 422);
        }

        $current = api_orders_get_by_id($orderId);
        if ($current === null) {
            api_json(['ok' => false, 'error' => 'Order not found'], 404);
        }
        $storedToken = (string) ($current['publicToken'] ?? '');
        if ($storedToken === '' || !hash_equals($storedToken, $token)) {
            api_json(['ok' => false, 'error' => 'Invalid token'], 403);
        }

        $originalName = (string) ($file['name'] ?? 'slip');
        $ext = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        if (!in_array($ext, $allowed, true)) {
            api_json(['ok' => false, 'error' => 'Only jpg, jpeg, png, webp allowed'], 422);
        }

        $uploadDir = dirname(__DIR__) . '/uploads/slips';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        $targetName = 'slip-' . $orderId . '-' . api_uuid() . '.' . $ext;
        $targetPath = $uploadDir . '/' . $targetName;
        if (!move_uploaded_file((string) $file['tmp_name'], $targetPath)) {
            api_json(['ok' => false, 'error' => 'cannot move uploaded file'], 500);
        }

        $publicUrl = '/line-stick/backend/uploads/slips/' . $targetName;
        $current['paymentSlipImage'] = $publicUrl;
        $current['paymentSlipUploadedAt'] = api_now_iso8601();
        $current['updatedAt'] = api_now_iso8601();
        api_orders_update($current);

        api_json([
            'ok' => true,
            'data' => [
                'orderId' => $orderId,
                'paymentSlipImage' => $publicUrl,
            ],
        ], 201);
    }

    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    $orderId = $tail;
    $token = trim((string) ($_GET['token'] ?? ''));
    if ($token === '') {
        api_json(['ok' => false, 'error' => 'token is required'], 422);
    }

    $found = api_orders_get_by_id($orderId);
    if ($found !== null) {
        $publicToken = (string) ($found['publicToken'] ?? '');
        if ($publicToken === '' || !hash_equals($publicToken, $token)) {
            $found = null;
        }
    }

    if ($found === null) {
        api_json(['ok' => false, 'error' => 'Order not found'], 404);
    }

    api_json(['ok' => true, 'data' => $found]);
}

if ($route === '/dashboard/summary') {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }
    api_require_auth(['superadmin', 'dev', 'admin', 'editor']);

    $stickers = api_read_collection('stickers');
    $orders = api_orders_list();

    $today = (new DateTimeImmutable('now'))->format('Y-m-d');
    $todayOrders = 0;
    $todayRevenue = 0.0;
    $totalOrders = count($orders);
    $completedOrders = 0;
    $underReviewOrders = 0;

    foreach ($orders as $order) {
        $createdAt = (string) ($order['createdAt'] ?? '');
        if (str_starts_with($createdAt, $today)) {
            $todayOrders++;
            $todayRevenue += api_normalize_float($order['total'], 0);
        }

        $status = strtolower(trim((string) ($order['status'] ?? 'pending')));
        if (in_array($status, ['completed', 'success', 'paid', 'settled'], true)) {
            $completedOrders++;
        }
        if (in_array($status, ['under_review', 'pending_review'], true)) {
            $underReviewOrders++;
        }
    }

    $activeStickers = 0;
    $draftStickers = 0;
    foreach ($stickers as $sticker) {
        $status = strtolower((string) ($sticker['status'] ?? 'active'));
        if ($status === 'draft') {
            $draftStickers++;
        } else {
            $activeStickers++;
        }
    }

    api_json([
        'ok' => true,
        'data' => [
            'totalStickers' => count($stickers),
            'activeStickers' => $activeStickers,
            'draftStickers' => $draftStickers,
            'todayOrders' => $todayOrders,
            'todayRevenue' => $todayRevenue,
            'totalOrders' => $totalOrders,
            'completedOrders' => $completedOrders,
            'underReviewOrders' => $underReviewOrders,
            'serverStatus' => 'normal',
            'lastUpdatedAt' => api_now_iso8601(),
        ],
    ]);
}

if ($route === '/auth/login') {
    if ($method === 'GET') {
        api_json([
            'ok' => true,
            'message' => 'Use POST with username/password',
            'roles' => ['superadmin', 'dev', 'admin', 'editor'],
        ]);
    }

    if ($method !== 'POST') {
        api_method_not_allowed(['GET', 'POST']);
    }

    $body = api_parse_json_body();
    $username = trim((string) ($body['username'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if ($username === '' || $password === '') {
        api_json(['ok' => false, 'error' => 'username and password are required'], 422);
    }

    $canTry = Shield::throttle('cms_login_' . strtolower($username), 8, 300);
    if (!$canTry) {
        api_json(['ok' => false, 'error' => 'Too many login attempts. Please try again later.'], 429);
    }

    $user = api_auth_attempt($username, $password);
    if ($user === null) {
        api_log_activity('auth.login_failed', null, 'admin_user', $username);
        api_json(['ok' => false, 'error' => 'Invalid credentials'], 401);
    }

    session_regenerate_id(true);
    $user['sessionId'] = session_id();
    $_SESSION['cms_user'] = $user;

    api_log_activity('auth.login_success', $user, 'admin_user', (string) $user['id']);

    api_json([
        'ok' => true,
        'data' => [
            'user' => $_SESSION['cms_user'],
            'csrfToken' => Shield::csrfToken(),
        ],
    ]);
}

if ($route === '/auth/me') {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    $user = api_current_user();
    if ($user === null) {
        api_json(['ok' => false, 'error' => 'Unauthorized'], 401);
    }

    api_json(['ok' => true, 'data' => ['user' => $user]]);
}

if ($route === '/auth/logout') {
    if ($method !== 'POST') {
        api_method_not_allowed(['POST']);
    }

    $user = api_current_user();
    if ($user !== null) {
        api_log_activity('auth.logout', $user, 'admin_user', (string) ($user['id'] ?? ''));
    }

    Auth::logout();
    api_json(['ok' => true, 'message' => 'Logged out']);
}

if ($route === '/admins') {
    if ($method === 'GET') {
        api_require_auth(['superadmin', 'dev']);
        $pdo = api_db();

        $rows = $pdo->query(
            'SELECT id, username, role, status, created_by, created_at, updated_at
             FROM cms_admin_users
             ORDER BY id DESC'
        )->fetchAll();

        api_json(['ok' => true, 'data' => $rows]);
    }

    if ($method !== 'POST') {
        api_method_not_allowed(['GET', 'POST']);
    }

    $actor = api_require_auth(['superadmin']);
    $body = Shield::clean(api_parse_json_body());
    $username = strtolower(trim((string) ($body['username'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $role = strtolower(trim((string) ($body['role'] ?? 'admin')));
    $allowedRoles = ['admin', 'dev', 'editor'];

    if ($username === '' || $password === '') {
        api_json(['ok' => false, 'error' => 'username and password are required'], 422);
    }
    if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username)) {
        api_json(['ok' => false, 'error' => 'Invalid username format'], 422);
    }
    if (strlen($password) < 8) {
        api_json(['ok' => false, 'error' => 'Password must be at least 8 characters'], 422);
    }
    if (!in_array($role, $allowedRoles, true)) {
        api_json(['ok' => false, 'error' => 'Invalid role'], 422);
    }

    $pdo = api_db();
    $check = $pdo->prepare('SELECT id FROM cms_admin_users WHERE username = :username LIMIT 1');
    $check->execute([':username' => $username]);
    if ($check->fetch()) {
        api_json(['ok' => false, 'error' => 'Username already exists'], 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO cms_admin_users (username, password_hash, role, status, created_by)
         VALUES (:username, :password_hash, :role, "active", :created_by)'
    );
    $stmt->execute([
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_ARGON2ID),
        ':role' => $role,
        ':created_by' => (int) ($actor['id'] ?? 0),
    ]);

    $newId = (string) $pdo->lastInsertId();
    api_log_activity('admin.create', $actor, 'admin_user', $newId, [
        'username' => $username,
        'role' => $role,
    ]);

    api_json([
        'ok' => true,
        'data' => [
            'id' => (int) $newId,
            'username' => $username,
            'role' => $role,
            'status' => 'active',
        ],
    ], 201);
}

if ($route === '/audit/logs') {
    if ($method !== 'GET') {
        api_method_not_allowed(['GET']);
    }

    api_require_auth(['superadmin', 'dev']);
    $limit = min(200, max(1, api_normalize_int($_GET['limit'] ?? 100, 100)));
    $pdo = api_db();
    $stmt = $pdo->prepare(
        'SELECT id, admin_id, username, role, session_id, action, target_type, target_id, ip, user_agent, details_json, created_at
         FROM cms_admin_activity_logs
         ORDER BY id DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    api_json(['ok' => true, 'data' => $rows]);
}

if ($route === '/settings/site') {
    if ($method === 'GET') {
        api_require_auth(['superadmin', 'dev', 'admin']);
        api_json(['ok' => true, 'data' => api_read_site_settings()]);
    }

    if ($method !== 'PUT') {
        api_method_not_allowed(['GET', 'PUT']);
    }

    $actor = api_require_auth(['superadmin', 'dev', 'admin']);
    $body = Shield::clean(api_parse_json_body());
    $current = api_read_site_settings();

    $siteEnabled = filter_var($body['siteEnabled'] ?? $current['siteEnabled'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    $siteEnabled = $siteEnabled === null ? (bool) $current['siteEnabled'] : $siteEnabled;

    $updated = [
        'siteEnabled' => $siteEnabled,
        'siteTitle' => trim((string) ($body['siteTitle'] ?? $current['siteTitle'])),
        'siteDescription' => trim((string) ($body['siteDescription'] ?? $current['siteDescription'])),
        'tabIconUrl' => trim((string) ($body['tabIconUrl'] ?? $current['tabIconUrl'])),
        'tabPreviewImageUrl' => trim((string) ($body['tabPreviewImageUrl'] ?? $current['tabPreviewImageUrl'])),
        'maintenanceMessage' => trim((string) ($body['maintenanceMessage'] ?? $current['maintenanceMessage'])),
    ];

    api_write_site_settings($updated);
    api_log_activity('settings.site.update', $actor, 'site_settings', 'global', [
        'siteEnabled' => $updated['siteEnabled'],
    ]);

    api_json(['ok' => true, 'data' => $updated]);
}

if ($route === '/stickers') {
    if ($method === 'GET') {
        api_require_auth(['superadmin', 'dev', 'admin', 'editor']);
        api_json(['ok' => true, 'data' => api_read_collection('stickers')]);
    }

    if ($method !== 'POST') {
        api_method_not_allowed(['GET', 'POST']);
    }

    $actor = api_require_auth(['superadmin', 'admin']);
    $body = Shield::clean(api_parse_json_body());
    $name = trim((string) ($body['name'] ?? ''));

    if ($name === '') {
        api_json(['ok' => false, 'error' => 'name is required'], 422);
    }

    $stickers = api_read_collection('stickers');
    $previewImages = is_array($body['previewImages'] ?? null) ? array_values($body['previewImages']) : [];
    $autoCount = count($previewImages);
    if ($autoCount <= 0) {
        api_json(['ok' => false, 'error' => 'previewImages is required'], 422);
    }

    $item = [
        'id' => api_uuid(),
        'name' => $name,
        'slug' => '',
        'price' => api_normalize_float($body['price'] ?? 69, 69),
        'count' => $autoCount,
        'status' => trim((string) ($body['status'] ?? 'active')),
        'coverImage' => trim((string) ($body['coverImage'] ?? '')),
        'previewImages' => $previewImages,
        'createdAt' => api_now_iso8601(),
    ];
    $requestedSlug = trim((string) ($body['slug'] ?? ''));
    $item['slug'] = api_unique_slug($requestedSlug !== '' ? $requestedSlug : $name, $stickers, null);

    array_unshift($stickers, $item);
    api_write_collection('stickers', $stickers);
    api_log_activity('sticker.create', $actor, 'sticker', (string) $item['id'], [
        'name' => $item['name'],
        'slug' => $item['slug'],
    ]);

    api_json(['ok' => true, 'data' => $item], 201);
}

if (str_starts_with($route, '/stickers/')) {
    $id = trim(substr($route, strlen('/stickers/')));
    if ($id === '') {
        api_json(['ok' => false, 'error' => 'id is required'], 422);
    }

    if ($method === 'PUT') {
        $actor = api_require_auth(['superadmin', 'admin']);
        $body = Shield::clean(api_parse_json_body());
        $stickers = api_read_collection('stickers');
        $foundIndex = null;

        foreach ($stickers as $index => $sticker) {
            if ((string) ($sticker['id'] ?? '') === $id) {
                $foundIndex = $index;
                break;
            }
        }

        if ($foundIndex === null) {
            api_json(['ok' => false, 'error' => 'Sticker not found'], 404);
        }

        $current = $stickers[$foundIndex];
        $name = trim((string) ($body['name'] ?? ($current['name'] ?? '')));
        if ($name === '') {
            api_json(['ok' => false, 'error' => 'name is required'], 422);
        }

        $incomingPreviewImages = is_array($body['previewImages'] ?? null)
            ? array_values($body['previewImages'])
            : (is_array($current['previewImages'] ?? null) ? array_values($current['previewImages']) : []);

        if (count($incomingPreviewImages) <= 0) {
            api_json(['ok' => false, 'error' => 'previewImages is required'], 422);
        }

        $updated = [
            'id' => (string) ($current['id'] ?? $id),
            'name' => $name,
            'slug' => '',
            'price' => api_normalize_float($body['price'] ?? ($current['price'] ?? 69), 69),
            'count' => count($incomingPreviewImages),
            'status' => trim((string) ($body['status'] ?? ($current['status'] ?? 'active'))),
            'coverImage' => trim((string) ($body['coverImage'] ?? ($current['coverImage'] ?? ''))),
            'previewImages' => $incomingPreviewImages,
            'createdAt' => (string) ($current['createdAt'] ?? api_now_iso8601()),
            'updatedAt' => api_now_iso8601(),
        ];
        $requestedSlug = trim((string) ($body['slug'] ?? ($current['slug'] ?? '')));
        $updated['slug'] = api_unique_slug($requestedSlug !== '' ? $requestedSlug : $name, $stickers, $id);

        $stickers[$foundIndex] = $updated;
        api_write_collection('stickers', $stickers);

        api_log_activity('sticker.update', $actor, 'sticker', $id, [
            'name' => $updated['name'],
            'slug' => $updated['slug'],
            'status' => $updated['status'],
        ]);

        api_json(['ok' => true, 'data' => $updated]);
    }

    if ($method === 'DELETE') {
        $actor = api_require_auth(['superadmin', 'admin']);
        $stickers = api_read_collection('stickers');
        $foundIndex = null;
        $found = null;

        foreach ($stickers as $index => $sticker) {
            if ((string) ($sticker['id'] ?? '') === $id) {
                $foundIndex = $index;
                $found = $sticker;
                break;
            }
        }

        if ($foundIndex === null || !is_array($found)) {
            api_json(['ok' => false, 'error' => 'Sticker not found'], 404);
        }

        array_splice($stickers, $foundIndex, 1);
        api_write_collection('stickers', $stickers);

        api_log_activity('sticker.delete', $actor, 'sticker', $id, [
            'name' => (string) ($found['name'] ?? ''),
            'slug' => (string) ($found['slug'] ?? ''),
        ]);

        api_json(['ok' => true, 'message' => 'Sticker deleted']);
    }

    api_method_not_allowed(['PUT', 'DELETE']);
}

if ($route === '/orders') {
    if ($method === 'GET') {
        api_require_auth(['superadmin', 'dev', 'admin', 'editor']);
        api_json(['ok' => true, 'data' => api_orders_list()]);
    }

    if ($method !== 'POST') {
        api_method_not_allowed(['GET', 'POST']);
    }

    $actor = api_require_auth(['superadmin', 'admin']);
    $body = Shield::clean(api_parse_json_body());
    $customerName = trim((string) ($body['customerName'] ?? 'Admin Order'));
    $items = is_array($body['items'] ?? null) ? array_values($body['items']) : [];
    $total = api_normalize_float($body['total'] ?? 0, 0);

    $order = [
        'id' => api_uuid(),
        'publicToken' => '',
        'customer' => [
            'fullName' => $customerName,
            'phone' => '',
            'lineId' => '',
            'note' => '',
        ],
        'items' => $items,
        'total' => $total,
        'status' => 'under_review',
        'createdAt' => api_now_iso8601(),
    ];
    api_orders_create($order);
    api_log_activity('order.create', $actor, 'order', (string) $order['id'], [
        'total' => $total,
    ]);

    api_json(['ok' => true, 'data' => $order], 201);
}

if (str_starts_with($route, '/orders/') && str_ends_with($route, '/status')) {
    if ($method !== 'PUT') {
        api_method_not_allowed(['PUT']);
    }

    $orderId = trim(substr($route, strlen('/orders/'), -strlen('/status')));
    if ($orderId === '') {
        api_json(['ok' => false, 'error' => 'order id is required'], 422);
    }

    $actor = api_require_auth(['superadmin', 'dev', 'admin']);
    $body = Shield::clean(api_parse_json_body());
    $nextStatus = strtolower(trim((string) ($body['status'] ?? '')));
    $allowed = ['pending_payment', 'under_review', 'completed', 'cancelled'];
    if (!in_array($nextStatus, $allowed, true)) {
        api_json(['ok' => false, 'error' => 'Invalid status'], 422);
    }

    $order = api_orders_get_by_id($orderId);
    if ($order === null) {
        api_json(['ok' => false, 'error' => 'Order not found'], 404);
    }

    $order['status'] = $nextStatus;
    $order['updatedAt'] = api_now_iso8601();
    if ($nextStatus === 'completed') {
        $order['completedAt'] = api_now_iso8601();
    }

    api_orders_update($order);
    api_log_activity('order.status_update', $actor, 'order', $orderId, ['status' => $nextStatus]);

    api_json(['ok' => true, 'data' => api_orders_get_by_id($orderId)]);
}

if ($route === '/upload') {
    if ($method !== 'POST') {
        api_method_not_allowed(['POST']);
    }

    $actor = api_require_auth(['superadmin', 'admin']);
    if (!isset($_FILES['file'])) {
        api_json(['ok' => false, 'error' => 'file is required'], 422);
    }

    $file = $_FILES['file'];
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        api_json(['ok' => false, 'error' => 'upload failed'], 422);
    }

    $uploadDir = dirname(__DIR__) . '/uploads/stickers';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0775, true);
    }

    $originalName = (string) ($file['name'] ?? 'file');
    $ext = pathinfo($originalName, PATHINFO_EXTENSION);
    $safeExt = preg_replace('/[^a-zA-Z0-9]/', '', (string) $ext) ?: 'bin';
    $targetName = api_uuid() . '.' . strtolower($safeExt);
    $targetPath = $uploadDir . '/' . $targetName;

    if (!move_uploaded_file((string) $file['tmp_name'], $targetPath)) {
        api_json(['ok' => false, 'error' => 'cannot move uploaded file'], 500);
    }

    api_log_activity('upload.sticker_image', $actor, 'file', $targetName, [
        'originalName' => $originalName,
    ]);

    $publicUrl = '/line-stick/backend/uploads/stickers/' . $targetName;
    api_json([
        'ok' => true,
        'data' => [
            'filename' => $targetName,
            'url' => $publicUrl,
        ],
    ], 201);
}

api_json([
    'ok' => false,
    'error' => 'Route not found',
    'route' => $route,
], 404);
