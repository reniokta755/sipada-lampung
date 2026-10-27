<?php
// api/categories.php - Daftar Kategori KIB

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');

try {
    $stmt = $db->query("
        SELECT c.*, 
               COUNT(a.id) AS asset_count,
               COALESCE(SUM(a.acquisition_value), 0) AS total_value
        FROM categories c
        LEFT JOIN assets a ON c.id = a.category_id
        GROUP BY c.id
        ORDER BY c.code ASC
    ");
    $categories = $stmt->fetchAll();

    echo json_encode(['success' => true, 'data' => $categories]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

