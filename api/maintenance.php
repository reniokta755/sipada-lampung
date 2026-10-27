<?php
// api/maintenance.php - Riwayat Pemeliharaan & Perawatan Aset

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

try {
    if ($method === 'GET') {
        $assetId = (int)($_GET['asset_id'] ?? 0);
        if ($assetId > 0) {
            $stmt = $db->prepare("SELECT * FROM maintenance_logs WHERE asset_id = ? ORDER BY maintenance_date DESC");
            $stmt->execute([$assetId]);
        } else {
            $stmt = $db->query("
                SELECT m.*, a.name AS asset_name, a.asset_code, a.police_number
                FROM maintenance_logs m
                JOIN assets a ON m.asset_id = a.id
                ORDER BY m.maintenance_date DESC
                LIMIT 50
            ");
        }
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        if (empty($input['asset_id']) || empty($input['description']) || empty($input['cost'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Asset ID, rincian pekerjaan, dan biaya wajib diisi']);
            return;
        }

        $stmt = $db->prepare("INSERT INTO maintenance_logs (asset_id, maintenance_date, description, cost, service_provider, technician) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            (int)$input['asset_id'],
            $input['maintenance_date'] ?? date('Y-m-d'),
            $input['description'],
            (float)$input['cost'],
            $input['service_provider'] ?? null,
            $input['technician'] ?? null
        ]);

        echo json_encode(['success' => true, 'message' => 'Catatan pemeliharaan aset berhasil disimpan']);
        return;
    }

    if ($method === 'DELETE') {
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $db->prepare("DELETE FROM maintenance_logs WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Catatan pemeliharaan dihapus']);
        return;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

