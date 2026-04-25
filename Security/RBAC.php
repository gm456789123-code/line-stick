<?php
/**
 * Security v2.3
 * Pure PHP 8.2+ 
 * Static Class แบบ Laravel → Shield::init();
 * Security / Saint-Dev /my/framework
 */
//RBAC

declare(strict_types=1);

final class RBAC
{
    public static function hasRole(string $role): bool
    {
        if (!Auth::check()) {
            return false;
        }

        $sessionRole = $_SESSION['role'] ?? null;
        if (is_string($sessionRole) && strcasecmp($sessionRole, $role) === 0) {
            return true;
        }

        $user = Auth::user();
        $actualRole = $user['role'] ?? null;

        return is_string($actualRole) && strcasecmp($actualRole, $role) === 0;
    }

    public static function requireAdmin(?string $redirect = null): void
    {
        if (self::hasRole('admin')) {
            return;
        }

        http_response_code(403);

        if ($redirect !== null && !headers_sent()) {
            header('Location: ' . $redirect);
            exit();
        }

        exit('403 Forbidden: Admin access required.');
    }
}