<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/Security/bootstrap.php';

function api_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

function api_method_not_allowed(array $allowed): void
{
    header('Allow: ' . implode(', ', $allowed));
    api_json([
        'ok' => false,
        'error' => 'Method Not Allowed',
        'allowed' => $allowed,
    ], 405);
}

function api_parse_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function api_storage_path(string $name): string
{
    $dir = dirname(__DIR__) . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    return $dir . '/' . $name . '.json';
}

function api_read_collection(string $name): array
{
    $path = api_storage_path($name);
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function api_write_collection(string $name, array $items): void
{
    $path = api_storage_path($name);
    file_put_contents(
        $path,
        json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

function api_now_iso8601(): string
{
    return gmdate('c');
}

function api_uuid(): string
{
    return bin2hex(random_bytes(8));
}

function api_normalize_float(mixed $value, float $fallback = 0): float
{
    if (is_numeric($value)) {
        return (float) $value;
    }
    return $fallback;
}

function api_normalize_int(mixed $value, int $fallback = 0): int
{
    if (is_numeric($value)) {
        return (int) $value;
    }
    return $fallback;
}

function api_env(string $key, ?string $default = null): ?string
{
    if (class_exists('Config')) {
        $value = Config::getString($key, $default ?? '');
        return $value === '' ? $default : $value;
    }

    $value = getenv($key);
    if ($value === false) {
        return $default;
    }

    $trimmed = trim((string) $value);
    return $trimmed === '' ? $default : $trimmed;
}

function api_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = api_env('DB_HOST', '127.0.0.1');
    $port = api_env('DB_PORT', '3306');
    $name = api_env('DB_NAME', 'line_stick');
    $user = api_env('DB_USER', 'root');
    $pass = api_env('DB_PASS', '');

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        $message = $e->getMessage();
        $unknownDatabase = str_contains($message, 'Unknown database') || str_contains($message, '[1049]');
        if (!$unknownDatabase) {
            throw $e;
        }

        $serverDsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $host, $port);
        $serverPdo = new PDO($serverDsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $quotedDb = '`' . str_replace('`', '``', $name) . '`';
        $serverPdo->exec(
            'CREATE DATABASE IF NOT EXISTS ' . $quotedDb .
            ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );

        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    api_ensure_admin_tables($pdo);
    return $pdo;
}

function api_ensure_admin_tables(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cms_admin_users (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(80) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT "active",
            created_by BIGINT UNSIGNED NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_role (role),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cms_admin_activity_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            admin_id BIGINT UNSIGNED NULL,
            username VARCHAR(80) NULL,
            role VARCHAR(20) NULL,
            session_id VARCHAR(128) NOT NULL,
            action VARCHAR(120) NOT NULL,
            target_type VARCHAR(80) NULL,
            target_id VARCHAR(120) NULL,
            ip VARCHAR(64) NULL,
            user_agent VARCHAR(255) NULL,
            details_json JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_id (admin_id),
            INDEX idx_session_id (session_id),
            INDEX idx_action (action),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    api_seed_default_admin_users($pdo);
    api_ensure_orders_table($pdo);
    api_migrate_orders_from_storage($pdo);
}

function api_seed_default_admin_users(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM cms_admin_users')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $defaults = [
        [
            'username' => api_env('CMS_SUPERADMIN_USER', 'superadmin'),
            'password' => api_env('CMS_SUPERADMIN_PASS', 'super123'),
            'role' => 'superadmin',
        ],
        [
            'username' => api_env('CMS_ADMIN_USER', 'admin'),
            'password' => api_env('CMS_ADMIN_PASS', 'admin123'),
            'role' => 'admin',
        ],
        [
            'username' => api_env('CMS_DEV_USER', 'dev'),
            'password' => api_env('CMS_DEV_PASS', 'dev123'),
            'role' => 'dev',
        ],
        [
            'username' => api_env('CMS_EDITOR_USER', 'editor'),
            'password' => api_env('CMS_EDITOR_PASS', 'editor123'),
            'role' => 'editor',
        ],
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO cms_admin_users (username, password_hash, role, status)
         VALUES (:username, :password_hash, :role, "active")'
    );

    foreach ($defaults as $user) {
        $stmt->execute([
            ':username' => (string) $user['username'],
            ':password_hash' => password_hash((string) $user['password'], PASSWORD_ARGON2ID),
            ':role' => (string) $user['role'],
        ]);
    }
}

function api_role_priority(string $role): int
{
    return match ($role) {
        'superadmin' => 100,
        'dev' => 80,
        'admin' => 60,
        'editor' => 40,
        default => 0,
    };
}

function api_auth_attempt(string $username, string $password): ?array
{
    $pdo = api_db();
    $stmt = $pdo->prepare(
        'SELECT id, username, password_hash, role, status
         FROM cms_admin_users
         WHERE username = :username
         LIMIT 1'
    );
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if (!is_array($user)) {
        return null;
    }

    if (($user['status'] ?? 'inactive') !== 'active') {
        return null;
    }

    $hash = (string) ($user['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
        return null;
    }

    if (password_needs_rehash($hash, PASSWORD_ARGON2ID)) {
        $update = $pdo->prepare('UPDATE cms_admin_users SET password_hash = :hash WHERE id = :id');
        $update->execute([
            ':hash' => password_hash($password, PASSWORD_ARGON2ID),
            ':id' => (int) $user['id'],
        ]);
    }

    return [
        'id' => (int) $user['id'],
        'username' => (string) $user['username'],
        'role' => (string) $user['role'],
        'sessionId' => session_id(),
    ];
}

function api_current_user(): ?array
{
    $user = $_SESSION['cms_user'] ?? null;
    return is_array($user) ? $user : null;
}

function api_require_auth(array $allowedRoles = []): array
{
    $user = api_current_user();
    if ($user === null) {
        api_json(['ok' => false, 'error' => 'Unauthorized'], 401);
    }

    if ($allowedRoles !== []) {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, $allowedRoles, true)) {
            api_json(['ok' => false, 'error' => 'Forbidden'], 403);
        }
    }

    return $user;
}

function api_log_activity(
    string $action,
    ?array $user = null,
    ?string $targetType = null,
    ?string $targetId = null,
    array $details = []
): void {
    try {
        $pdo = api_db();
        $actor = $user ?? api_current_user();

        $stmt = $pdo->prepare(
            'INSERT INTO cms_admin_activity_logs
            (admin_id, username, role, session_id, action, target_type, target_id, ip, user_agent, details_json)
            VALUES
            (:admin_id, :username, :role, :session_id, :action, :target_type, :target_id, :ip, :user_agent, :details_json)'
        );

        $stmt->execute([
            ':admin_id' => is_array($actor) ? ($actor['id'] ?? null) : null,
            ':username' => is_array($actor) ? ($actor['username'] ?? null) : null,
            ':role' => is_array($actor) ? ($actor['role'] ?? null) : null,
            ':session_id' => session_id(),
            ':action' => $action,
            ':target_type' => $targetType,
            ':target_id' => $targetId,
            ':ip' => Shield::clientIp(),
            ':user_agent' => substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
            ':details_json' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
    } catch (Throwable $e) {
        error_log('[api_log_activity] ' . $e->getMessage());
    }
}

function api_slugify(string $value): string
{
    $value = strtolower(trim($value));
    if ($value === '') {
        return '';
    }

    $value = preg_replace('/[^\pL\pN]+/u', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value;
}

function api_unique_slug(string $desiredSlug, array $stickers, ?string $excludeId = null): string
{
    $base = api_slugify($desiredSlug);
    if ($base === '') {
        $base = 'sticker';
    }

    $used = [];
    foreach ($stickers as $item) {
        if (!is_array($item)) {
            continue;
        }
        $itemId = (string) ($item['id'] ?? '');
        if ($excludeId !== null && $itemId === $excludeId) {
            continue;
        }
        $slug = trim((string) ($item['slug'] ?? ''));
        if ($slug !== '') {
            $used[$slug] = true;
        }
    }

    if (!isset($used[$base])) {
        return $base;
    }

    $i = 2;
    while (isset($used[$base . '-' . $i])) {
        $i++;
    }
    return $base . '-' . $i;
}

function api_site_settings_defaults(): array
{
    return [
        'siteEnabled' => true,
        'siteTitle' => 'LINE Stick Store',
        'siteDescription' => 'Modern LINE sticker storefront powered by Next.js.',
        'tabIconUrl' => '',
        'tabPreviewImageUrl' => '',
        'maintenanceMessage' => 'เว็บไซต์กำลังปิดปรับปรุงชั่วคราว',
    ];
}

function api_read_site_settings(): array
{
    $defaults = api_site_settings_defaults();
    $stored = api_read_collection('site-settings');
    if (!is_array($stored)) {
        return $defaults;
    }

    return array_merge($defaults, $stored);
}

function api_write_site_settings(array $settings): void
{
    $defaults = api_site_settings_defaults();
    $payload = array_merge($defaults, $settings);
    api_write_collection('site-settings', $payload);
}

function api_ensure_orders_table(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cms_orders (
            id VARCHAR(64) PRIMARY KEY,
            public_token VARCHAR(128) NULL,
            customer_json JSON NOT NULL,
            items_json JSON NOT NULL,
            total DECIMAL(12,2) NOT NULL DEFAULT 0,
            status VARCHAR(32) NOT NULL DEFAULT "pending_payment",
            payment_slip_image VARCHAR(255) NULL,
            payment_submitted_at DATETIME NULL,
            completed_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_status (status),
            INDEX idx_public_token (public_token),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function api_iso_to_mysql_datetime(?string $value): ?string
{
    $input = trim((string) ($value ?? ''));
    if ($input === '') {
        return null;
    }
    try {
        return (new DateTimeImmutable($input))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

function api_mysql_datetime_to_iso(?string $value): string
{
    $input = trim((string) ($value ?? ''));
    if ($input === '') {
        return '';
    }
    try {
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $input, new DateTimeZone('UTC'));
        if (!$dt instanceof DateTimeImmutable) {
            return '';
        }
        return $dt->format('c');
    } catch (Throwable $e) {
        return '';
    }
}

function api_order_row_to_array(array $row): array
{
    $customer = json_decode((string) ($row['customer_json'] ?? '{}'), true);
    $items = json_decode((string) ($row['items_json'] ?? '[]'), true);

    return [
        'id' => (string) ($row['id'] ?? ''),
        'publicToken' => (string) ($row['public_token'] ?? ''),
        'customer' => is_array($customer) ? $customer : [],
        'items' => is_array($items) ? array_values($items) : [],
        'total' => api_normalize_float($row['total'] ?? 0, 0),
        'status' => (string) ($row['status'] ?? 'pending_payment'),
        'paymentSlipImage' => (string) ($row['payment_slip_image'] ?? ''),
        'paymentSubmittedAt' => api_mysql_datetime_to_iso($row['payment_submitted_at'] ?? null),
        'completedAt' => api_mysql_datetime_to_iso($row['completed_at'] ?? null),
        'createdAt' => api_mysql_datetime_to_iso($row['created_at'] ?? null),
        'updatedAt' => api_mysql_datetime_to_iso($row['updated_at'] ?? null),
    ];
}

function api_orders_list(): array
{
    $pdo = api_db();
    $rows = $pdo->query(
        'SELECT id, public_token, customer_json, items_json, total, status,
                payment_slip_image, payment_submitted_at, completed_at, created_at, updated_at
         FROM cms_orders
         ORDER BY created_at DESC, id DESC'
    )->fetchAll();

    return array_values(array_map('api_order_row_to_array', is_array($rows) ? $rows : []));
}

function api_orders_get_by_id(string $id): ?array
{
    $pdo = api_db();
    $stmt = $pdo->prepare(
        'SELECT id, public_token, customer_json, items_json, total, status,
                payment_slip_image, payment_submitted_at, completed_at, created_at, updated_at
         FROM cms_orders
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!is_array($row)) {
        return null;
    }
    return api_order_row_to_array($row);
}

function api_orders_create(array $order): void
{
    $pdo = api_db();
    $stmt = $pdo->prepare(
        'INSERT INTO cms_orders
        (id, public_token, customer_json, items_json, total, status, payment_slip_image, payment_submitted_at, completed_at, created_at, updated_at)
        VALUES
        (:id, :public_token, :customer_json, :items_json, :total, :status, :payment_slip_image, :payment_submitted_at, :completed_at, :created_at, :updated_at)'
    );
    $stmt->execute([
        ':id' => (string) ($order['id'] ?? api_uuid()),
        ':public_token' => ($order['publicToken'] ?? null) !== '' ? ($order['publicToken'] ?? null) : null,
        ':customer_json' => json_encode($order['customer'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':items_json' => json_encode($order['items'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':total' => api_normalize_float($order['total'] ?? 0, 0),
        ':status' => (string) ($order['status'] ?? 'pending_payment'),
        ':payment_slip_image' => ($order['paymentSlipImage'] ?? null) !== '' ? ($order['paymentSlipImage'] ?? null) : null,
        ':payment_submitted_at' => api_iso_to_mysql_datetime($order['paymentSubmittedAt'] ?? null),
        ':completed_at' => api_iso_to_mysql_datetime($order['completedAt'] ?? null),
        ':created_at' => api_iso_to_mysql_datetime($order['createdAt'] ?? api_now_iso8601()),
        ':updated_at' => api_iso_to_mysql_datetime($order['updatedAt'] ?? ($order['createdAt'] ?? api_now_iso8601())),
    ]);
}

function api_orders_update(array $order): void
{
    $id = trim((string) ($order['id'] ?? ''));
    if ($id === '') {
        return;
    }

    $pdo = api_db();
    $stmt = $pdo->prepare(
        'UPDATE cms_orders
         SET public_token = :public_token,
             customer_json = :customer_json,
             items_json = :items_json,
             total = :total,
             status = :status,
             payment_slip_image = :payment_slip_image,
             payment_submitted_at = :payment_submitted_at,
             completed_at = :completed_at,
             updated_at = :updated_at
         WHERE id = :id'
    );
    $stmt->execute([
        ':id' => $id,
        ':public_token' => ($order['publicToken'] ?? null) !== '' ? ($order['publicToken'] ?? null) : null,
        ':customer_json' => json_encode($order['customer'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':items_json' => json_encode($order['items'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':total' => api_normalize_float($order['total'] ?? 0, 0),
        ':status' => (string) ($order['status'] ?? 'pending_payment'),
        ':payment_slip_image' => ($order['paymentSlipImage'] ?? null) !== '' ? ($order['paymentSlipImage'] ?? null) : null,
        ':payment_submitted_at' => api_iso_to_mysql_datetime($order['paymentSubmittedAt'] ?? null),
        ':completed_at' => api_iso_to_mysql_datetime($order['completedAt'] ?? null),
        ':updated_at' => api_iso_to_mysql_datetime($order['updatedAt'] ?? api_now_iso8601()),
    ]);
}

function api_migrate_orders_from_storage(PDO $pdo): void
{
    try {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM cms_orders')->fetchColumn();
        if ($count > 0) {
            return;
        }

        $legacyOrders = api_read_collection('orders');
        if (!is_array($legacyOrders) || count($legacyOrders) === 0) {
            return;
        }

        foreach ($legacyOrders as $order) {
            if (!is_array($order)) {
                continue;
            }
            api_orders_create([
                'id' => (string) ($order['id'] ?? api_uuid()),
                'publicToken' => (string) ($order['publicToken'] ?? ''),
                'customer' => is_array($order['customer'] ?? null) ? $order['customer'] : [],
                'items' => is_array($order['items'] ?? null) ? $order['items'] : [],
                'total' => api_normalize_float($order['total'] ?? 0, 0),
                'status' => (string) ($order['status'] ?? 'pending_payment'),
                'paymentSlipImage' => (string) ($order['paymentSlipImage'] ?? ''),
                'paymentSubmittedAt' => (string) ($order['paymentSubmittedAt'] ?? ''),
                'completedAt' => (string) ($order['completedAt'] ?? ''),
                'createdAt' => (string) ($order['createdAt'] ?? api_now_iso8601()),
                'updatedAt' => (string) ($order['updatedAt'] ?? ($order['createdAt'] ?? api_now_iso8601())),
            ]);
        }
    } catch (Throwable $e) {
        error_log('[api_migrate_orders_from_storage] ' . $e->getMessage());
    }
}
