<?php
declare(strict_types=1);

$auditHelpersPath = dirname(__DIR__) . '/includes/audit_helpers.php';
if (is_file($auditHelpersPath)) {
    require_once $auditHelpersPath;
}

final class Shield
{
    private static bool $initialized = false;

    public static function init(): void
    {
        if (self::$initialized) {
            return;
        }

        if (!class_exists('SecurityManager', false)) {
            require_once __DIR__ . '/SecurityManager.php';
        }
        SecurityManager::init();
        self::$initialized = true;
    }

    public static function clean(mixed $data): mixed
    {
        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $value) {
                $cleanedKey = is_string($key) ? self::cleanString($key) : $key;
                $cleaned[$cleanedKey] = self::clean($value);
            }
            return $cleaned;
        }

        if (is_string($data)) {
            return self::cleanString($data);
        }

        return $data;
    }

    private static function cleanString(string $value): string
    {
        $value = trim($value);
        $value = str_replace("\0", '', $value);
        return strip_tags($value);
    }

    public static function throttle(string $key, int $limit = 5, int $seconds = 60): bool
    {
        if ($key === '') {
            return false;
        }

        if (!isset($_SESSION['__throttle']) || !is_array($_SESSION['__throttle'])) {
            $_SESSION['__throttle'] = [];
        }

        $now = time();
        $bucket = $_SESSION['__throttle'][$key] ?? ['count' => 0, 'start' => $now];

        if (($now - (int) $bucket['start']) >= $seconds) {
            $bucket = ['count' => 0, 'start' => $now];
        }

        $bucket['count']++;
        $_SESSION['__throttle'][$key] = $bucket;

        return $bucket['count'] <= $limit;
    }

    public static function csrfToken(): string
    {
        return self::generateToken();
    }

    public static function validateCsrf(?string $token): bool
    {
        return self::verifyToken('default', $token);
    }

    public static function generateToken(string $formName = 'default'): string
    {
        $_SESSION['__csrf_tokens'] ??= [];
        $now = time();
        $existing = $_SESSION['__csrf_tokens'][$formName] ?? null;

        if (
            is_array($existing)
            && !empty($existing['token'])
            && !empty($existing['expires'])
            && (int) $existing['expires'] >= $now
        ) {
            return (string) $existing['token'];
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['__csrf_tokens'][$formName] = [
            'token' => $token,
            'expires' => $now + 1800,
        ];

        if ($formName === 'default') {
            $_SESSION['__csrf_token'] = $token;
        }

        return $token;
    }

    public static function verifyToken(string $formName, ?string $token): bool
    {
        $stored = $_SESSION['__csrf_tokens'][$formName] ?? null;
        if (
            empty($token)
            || !is_array($stored)
            || empty($stored['token'])
            || empty($stored['expires'])
        ) {
            return false;
        }

        $isValid = (int) $stored['expires'] >= time() && hash_equals((string) $stored['token'], $token);

        if ($formName !== 'admin_form') {
            unset($_SESSION['__csrf_tokens'][$formName]);
        }
        if ($formName === 'default') {
            unset($_SESSION['__csrf_token']);
        }

        return $isValid;
    }

    public static function log(string $action, int|string|null $userId = null, array $details = []): void
    {
        $pdo = $GLOBALS['pdo'] ?? null;
        if (!$pdo instanceof PDO) {
            error_log('[Shield] ' . $action . ' ' . json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return;
        }

        try {
            if (function_exists('ensureAuditLogsTable')) {
                ensureAuditLogsTable($pdo);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO shield_audit_logs (user_id, action, ip, user_agent, details)
                 VALUES (:user_id, :action, :ip, :user_agent, :details)'
            );
            $stmt->execute([
                ':user_id' => $userId,
                ':action' => $action,
                ':ip' => self::clientIp(),
                ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                ':details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
        } catch (Throwable $e) {
            error_log('[Shield] log failed: ' . $e->getMessage());
        }
    }

    public static function clientIp(): string
    {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return (string) $_SERVER['HTTP_CF_CONNECTING_IP'];
        }

        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return (string) $_SERVER['HTTP_CLIENT_IP'];
        }

        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($parts[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return filter_var($remoteAddr, FILTER_VALIDATE_IP) ? $remoteAddr : '0.0.0.0';
    }
}
