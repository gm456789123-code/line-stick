<?php
declare(strict_types=1);

require_once __DIR__ . '/Shield.php';

/**
 * Backward-compatible wrapper.
 * Use Shield directly in new projects.
 */
final class EliteShield
{
    public static function init(): void
    {
        Shield::init();
    }

    public static function __callStatic(string $name, array $arguments): mixed
    {
        if (!method_exists(Shield::class, $name)) {
            throw new BadMethodCallException('Method ' . $name . ' does not exist on Shield.');
        }

        return Shield::{$name}(...$arguments);
    }
}
