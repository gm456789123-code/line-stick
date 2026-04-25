<?php
/**
 * EliteShield v2.3 
 * Pure PHP 8.2+ 
 * Static Class แบบ Laravel → Shield::init();
 * Security / Saint-Dev /my/framework
 */

require_once __DIR__ . '/Shield.php';

if (!class_exists('Shield', false)) {
class Shield
{
    private static array $env = [];
    private static ?\PDO $pdo = null;
    private static bool $initialized = false;

    public static function init(): void
    {
        if (self::$initialized) return;

        self::loadEnv();
        self::checkAppKey();          
        self::forceHttps();
        self::initDatabase();
        self::startSecureSession();
        self::sendSecurityHeaders();

        self::$initialized = true;
    }

    /*ENV & APP_KEY CHECK */
    private static function loadEnv(): void
    {
        $path = dirname(__DIR__) . '/.env';
        if (!file_exists($path)) return;

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;

            [$key, $value] = explode('=', $line, 2);
            self::$env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }

    private static function checkAppKey(): void
    {
        if (empty(self::env('APP_KEY'))) {
            die('⚠️ APP_KEY not set in .env — Security Framework cannot start!');
        }
    }

    public static function env(string $key, $default = null)
    {
        return self::$env[$key] ?? $default;
    }

    /* ================= HTTPS (รองรับ Proxy) ================= */
    private static function forceHttps(): void
    {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                   ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

        if (self::env('FORCE_HTTPS', true) && !$isHttps) {
            header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'], true, 301);
            exit;
        }
    }

    /* ================= DATABASE ================= */
    private static function initDatabase(): void
    {
        if (self::$pdo !== null) return;

        $host = self::env('DB_HOST', 'localhost');
        $dbname = self::env('DB_NAME');
        $user = self::env('DB_USER');
        $pass = self::env('DB_PASS');

        if (!$dbname || !$user) return;

        self::$pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public static function db(): ?\PDO
    {
        self::initDatabase();
        return self::$pdo;
    }

    /* ================= SECURE SESSION ================= */
    private static function startSecureSession(): void
    {
        ini_set('session.use_strict_mode', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');
        if (!empty($_SERVER['HTTPS'])) {
            ini_set('session.cookie_secure', '1');
        }

        if (session_status() === PHP_SESSION_NONE) session_start();

        $fingerprint = self::getFingerprint();

        if (!isset($_SESSION['_fingerprint'])) {
            $_SESSION['_fingerprint'] = $fingerprint;
            $_SESSION['_created'] = time();
        } elseif ($_SESSION['_fingerprint'] !== $fingerprint) {
            self::destroySession();
            $_SESSION['_fingerprint'] = $fingerprint;
            $_SESSION['_created'] = time();
        }

        $_SESSION['_last_activity'] ??= time();

        if (time() - $_SESSION['_last_activity'] > 1800 || time() - $_SESSION['_created'] > 86400) {
            self::destroySession();
            die('Session expired. Please login again.');
        }

        $_SESSION['_last_activity'] = time();
    }

    private static function getFingerprint(): string
    {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return hash('sha256', $ip . ($_SERVER['HTTP_USER_AGENT'] ?? '') . self::env('APP_KEY'));
    }

    private static function destroySession(): void
    {
        session_unset();
        session_destroy();
        setcookie(session_name(), '', time() - 42000, '/');   
        session_start();
    }

    /* ================= CSRF (แก้ undefined แล้ว) ================= */
    public static function generateToken(string $formName = 'default'): string
    {
        $_SESSION['_csrf'] ??= [];                    
        $token = bin2hex(random_bytes(32));
        $_SESSION['_csrf'][$formName] = [
            'token' => $token,
            'expires' => time() + 1800
        ];
        return $token;
    }

    public static function verifyToken(string $formName, string $token): bool
    {
        if (!isset($_SESSION['_csrf'][$formName])) return false;

        $data = $_SESSION['_csrf'][$formName];
        unset($_SESSION['_csrf'][$formName]);

        return ($data['expires'] >= time()) && hash_equals($data['token'], $token);
    }

    /* ================= THROTTLE (แก้ recursion แล้ว) ================= */
    public static function throttle(string $action, int $limit = 5, int $seconds = 60): bool
    {
        $pdo = self::db();
        if (!$pdo) return true;

        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $key = hash('sha256', $ip . $action);

        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT attempts, expires_at FROM shield_throttles WHERE `key` = ? FOR UPDATE");
        $stmt->execute([$key]);
        $row = $stmt->fetch();

        $now = time();

        if ($row) {
            if (strtotime($row['expires_at']) < $now) {
                $pdo->prepare("DELETE FROM shield_throttles WHERE `key` = ?")->execute([$key]);
                $row = null;                     
            }
        }

        if ($row && $row['attempts'] >= $limit) {
            $pdo->commit();
            return false;
        }

        if ($row) {
            $pdo->prepare("UPDATE shield_throttles SET attempts = attempts + 1 WHERE `key` = ?")
                ->execute([$key]);
        } else {
            $pdo->prepare("INSERT INTO shield_throttles (`key`, attempts, expires_at) 
                           VALUES (?, 1, DATE_ADD(NOW(), INTERVAL ? SECOND))")
                ->execute([$key, $seconds]);
        }

        $pdo->commit();
        return true;
    }

    /* ================= VALIDATION & SANITIZATION ================= */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];
        foreach ($rules as $field => $ruleStr) {
            $value = $data[$field] ?? null;
            foreach (explode('|', $ruleStr) as $rule) {
                if ($rule === 'required' && empty($value)) $errors[$field][] = 'required';
                if ($rule === 'email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) $errors[$field][] = 'invalid_email';
                if (str_starts_with($rule, 'min:')) {
                    $min = (int)explode(':', $rule)[1];
                    if (strlen($value ?? '') < $min) $errors[$field][] = 'too_short';
                }
            }
        }
        return $errors;
    }

    public static function clean($data)
    {
        if (is_array($data)) return array_map([self::class, 'clean'], $data);
        if (is_string($data)) return htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return $data;
    }

    /* ================= AUTH & AUDIT ================= */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_ARGON2ID);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function loginAttempt(string $username): bool
    {
        return self::throttle("login_{$username}", 5, 300);
    }

    public static function log(string $action, $userId = null, array $details = []): void
    {
        $pdo = self::db();
        if (!$pdo) return;

        $pdo->prepare("INSERT INTO shield_audit_logs (user_id, action, ip, user_agent, details)
                       VALUES (?, ?, ?, ?, ?)")
            ->execute([
                $userId,
                $action,
                $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? '',
                json_encode($details, JSON_UNESCAPED_UNICODE)
            ]);
    }

    /* ================= INTEGRITY & ANTI-TAMPERING ================= */
    public static function sign(array $data): string
    {
        ksort($data);
        $payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return hash_hmac('sha256', $payload, self::env('APP_KEY'));
    }

    public static function verifySignature(array $data, string $signature): bool
    {
        return hash_equals(self::sign($data), $signature);
    }

    public static function verifyIntegrity(string $table, string $field, $id, $userValue, string $signature): bool
    {
        if (!self::verifySignature([$table, $field, $id, $userValue], $signature)) return false;

        $allowedTables = ['users', 'matches', 'leagues', 'predictions'];
        $allowedFields = ['price', 'odds', 'status', 'point', 'amount'];

        if (!in_array($table, $allowedTables, true) || !in_array($field, $allowedFields, true)) return false;

        $stmt = self::db()->prepare("SELECT `$field` FROM `$table` WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $realValue = $stmt->fetchColumn();

        return $realValue == $userValue;
    }

    /* ================= SECURITY HEADERS ================= */
    private static function sendSecurityHeaders(): void
    {
        header('X-Frame-Options: DENY');
        header('X-Content-Type-Options: nosniff');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');

        $csp = self::env('CSP', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none';");
        header("Content-Security-Policy: $csp");
    }
}
}
