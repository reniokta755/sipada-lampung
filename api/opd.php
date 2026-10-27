<?php
// api/opd.php - Daftar Organisasi Perangkat Daerah (OPD) Pemprov Lampung

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');

try {
    $stmt = $db->query("
        SELECT o.*, 
               COUNT(a.id) AS asset_count,
               COALESCE(SUM(a.acquisition_value), 0) AS total_value
        FROM opd o
        LEFT JOIN assets a ON o.id = a.opd_id
        GROUP BY o.id
        ORDER BY o.id ASC
    ");
    $opds = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $opds]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

