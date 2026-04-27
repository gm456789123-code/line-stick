<?php
declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/RBAC.php';
require_once __DIR__ . '/Shield.php';

final class SecurityManager
{
    private static function isHttpsRequest(): bool
    {
        if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }

        $forwardedProto = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
        $forwardedSsl = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_SSL'] ?? ''));

        return $forwardedProto === 'https' || $forwardedSsl === 'on';
    }

    public static function init(): void
    {
        if (PHP_SAPI === 'cli') {
            return;
        }

        $isHttps = self::isHttpsRequest();
        $forceHttps = Config::getBool('FORCE_HTTPS', false);

        if ($forceHttps && !$isHttps && !headers_sent()) {
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
            header('Location: https://' . $host . $requestUri, true, 301);
            exit();
        }

        if (session_status() === PHP_SESSION_NONE) {
            $sameSite = Config::getString('SESSION_SAMESITE', 'Lax');
            $sameSite = in_array($sameSite, ['Lax', 'Strict', 'None'], true) ? $sameSite : 'Lax';

            ini_set('session.use_strict_mode', '1');
            ini_set('session.cookie_httponly', '1');
            ini_set('session.cookie_samesite', $sameSite);
            ini_set('session.cookie_secure', $isHttps ? '1' : '0');

            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'domain' => '',
                'secure' => $isHttps,
                'httponly' => true,
                'samesite' => $sameSite,
            ]);

            session_start();
        }

        self::setSecurityHeaders();
        self::hardenSession();
    }

    private static function hardenSession(): void
    {
        if (empty($_SESSION['__session_init'])) {
            $_SESSION['__session_init'] = time();
        }

        if (empty($_SESSION['__session_regenerated'])) {
            session_regenerate_id(true);
            $_SESSION['__session_regenerated'] = time();
        }

        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $ip = Shield::clientIp();

        if (empty($_SESSION['__fingerprint'])) {
            $_SESSION['__fingerprint'] = hash('sha256', $userAgent . '|' . $ip);
            return;
        }

        $currentFingerprint = hash('sha256', $userAgent . '|' . $ip);
        if (!Auth::check() || hash_equals((string) $_SESSION['__fingerprint'], $currentFingerprint)) {
            return;
        }

        $_SESSION['app_toast'] = [
            'type' => 'warning',
            'message' => 'Session fingerprint mismatch. Please sign in again.',
        ];

        Auth::logout();
        if (!headers_sent()) {
            header('Location: login.php');
        }
        exit();
    }

    private static function setSecurityHeaders(): void
    {
        if (headers_sent()) {
            return;
        }

        header('X-Frame-Options: SAMEORIGIN');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-XSS-Protection: 0');
        header('Permissions-Policy: accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
        header('Cross-Origin-Opener-Policy: same-origin');
        header('Cross-Origin-Resource-Policy: same-origin');

        if (self::isHttpsRequest()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }

        $customCsp = trim(Config::getString('CONTENT_SECURITY_POLICY', ''));
        if ($customCsp !== '') {
            header('Content-Security-Policy: ' . $customCsp);
        }
    }
}
