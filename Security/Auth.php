<?php
/**
 * Security v2.3
 * Pure PHP 8.2+ 
 * Static Class แบบ Laravel → Shield::init();
 * Security / Saint-Dev /my/framework
 */

declare(strict_types=1);

final class Auth
{
    private static function getPdo(): ?PDO
    {
        return $GLOBALS['pdo'] ?? null;
    }

    public static function check(): bool
    {
        return !empty($_SESSION['user_id']);
    }

    public static function id(): int|string|null
    {
        return $_SESSION['user_id'] ?? null;
    }

    public static function user(): ?array
    {
        if (!self::check()) {
            return null;
        }

        $userId = self::id();
        $pdo = self::getPdo();

        if (!$pdo instanceof PDO) {
            return [
                'id'       => $_SESSION['user_id'] ?? null,
                'username' => $_SESSION['username'] ?? null,
                'role'     => $_SESSION['role'] ?? null,
                'balance'  => $_SESSION['user_balance'] ?? null,
            ];
        }

        try {
            $stmt = $pdo->prepare("
                SELECT id, username, email, balance, role, ip_address
                FROM users
                WHERE id = :id
                LIMIT 1
            ");
            $stmt->execute([':id' => $userId]);
            $user = $stmt->fetch();

            if (!$user) {
                self::logout();
                return null;
            }

            $_SESSION['username'] = $user['username'] ?? ($_SESSION['username'] ?? null);
            $_SESSION['role'] = $user['role'] ?? ($_SESSION['role'] ?? null);
            $_SESSION['user_balance'] = $user['balance'] ?? ($_SESSION['user_balance'] ?? null);

            return $user;
        } catch (Throwable $e) {
            error_log('[Auth] Error fetching user: ' . $e->getMessage());
            return [
                'id'       => $_SESSION['user_id'] ?? null,
                'username' => $_SESSION['username'] ?? null,
                'role'     => $_SESSION['role'] ?? null,
                'balance'  => $_SESSION['user_balance'] ?? null,
            ];
        }
    }

    public static function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();

            setcookie(
                session_name(),
                '',
                [
                    'expires'  => time() - 42000,
                    'path'     => $params['path'] ?? '/',
                    'domain'   => $params['domain'] ?? '',
                    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]
            );
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
    }

    public static function protect(?string $redirect = null): void
    {
        if (self::check()) {
            return;
        }

        $target = $redirect ?? (defined('BASE_URL') ? BASE_URL . '/login.php' : 'login.php');

        if (!headers_sent()) {
            header('Location: ' . $target);
        }
        exit();
    }
}