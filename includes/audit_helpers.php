<?php
/**
 * Security Audit Helpers
 * Part of EliteShield Framework
 */

if (!function_exists('ensureAuditLogsTable')) {
    function ensureAuditLogsTable(PDO $pdo): void {
        $sql = "CREATE TABLE IF NOT EXISTS shield_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            action VARCHAR(255) NOT NULL,
            ip VARCHAR(45) NOT NULL,
            user_agent TEXT,
            details JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        $pdo->exec($sql);
    }
}
