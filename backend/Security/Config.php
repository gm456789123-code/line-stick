<?php
declare(strict_types=1);

final class Config
{
    public static function getString(string $key, string $default = ''): string
    {
        if (function_exists('env_get_string')) {
            return env_get_string($key, $default);
        }

        $value = $_ENV[$key] ?? getenv($key);
        if ($value === false || $value === null) {
            return $default;
        }

        return trim((string) $value);
    }

    public static function getBool(string $key, bool $default = false): bool
    {
        if (function_exists('env_get_bool')) {
            return env_get_bool($key, $default);
        }

        $raw = strtolower(self::getString($key, $default ? '1' : '0'));
        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }
}
