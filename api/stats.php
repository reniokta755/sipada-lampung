<?php
// api/stats.php - Statistik & Indikator Dashboard Aset Pemprov Lampung

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');

try {
    // 1. Ringkasan Total Metrik
    $summary = $db->query("
        SELECT 
            COUNT(*) AS total_assets,
            COALESCE(SUM(acquisition_value), 0) AS total_acquisition_value,
            COALESCE(SUM(book_value), 0) AS total_book_value
        FROM assets
    ")->fetch();

    // 2. Breakdown per Kategori KIB
    $byCategory = $db->query("
        SELECT 
            c.id, c.code, c.name, c.kib_type, c.color, c.icon,
            COUNT(a.id) AS count,
            COALESCE(SUM(a.acquisition_value), 0) AS total_value
        FROM categories c
        LEFT JOIN assets a ON c.id = a.category_id
        GROUP BY c.id
        ORDER BY c.code ASC
    ")->fetchAll();

    // 3. Breakdown per Kondisi Fisik
    $byCondition = $db->query("
        SELECT 
            condition,
            COUNT(*) AS count,
            COALESCE(SUM(acquisition_value), 0) AS total_value
        FROM assets
        GROUP BY condition
    ")->fetchAll();

    // 4. Breakdown per Status Pemanfaatan (Digunakan Sendiri, Pinjam Pakai, Sewa, KSP, Idle, Usul Hapus)
    $byStatus = $db->query("
        SELECT 
            status,
            COUNT(*) AS count,
            COALESCE(SUM(acquisition_value), 0) AS total_value
        FROM assets
        GROUP BY status
    ")->fetchAll();

    // 5. Status Sertifikasi Tanah (Khusus KIB A)
    $byCertification = $db->query("
        SELECT 
            COALESCE(certificate_status, 'Belum Terdata') AS status,
            COUNT(*) AS count,
            COALESCE(SUM(area_sqm), 0) AS total_area,
            COALESCE(SUM(acquisition_value), 0) AS total_value
        FROM assets
        WHERE category_id = 'kib-a'
        GROUP BY certificate_status
    ")->fetchAll();

    // 6. Top 10 OPD dengan Nilai Aset Terbesar
    $topOpd = $db->query("
        SELECT 
            o.id, o.name, o.alias,
            COUNT(a.id) AS asset_count,
            COALESCE(SUM(a.acquisition_value), 0) AS total_value
        FROM opd o
        JOIN assets a ON o.id = a.opd_id
        GROUP BY o.id
        ORDER BY total_value DESC
        LIMIT 10
    ")->fetchAll();

    // 7. Tren Pengadaan / Perolehan Aset per Tahun
    $byYear = $db->query("
        SELECT 
            acquisition_year AS year,
            COUNT(*) AS count,
            COALESCE(SUM(acquisition_value), 0) AS total_value
        FROM assets
        WHERE acquisition_year >= 2010
        GROUP BY acquisition_year
        ORDER BY acquisition_year ASC
    ")->fetchAll();

    // 8. Sebaran per Kabupaten/Kota di Lampung
    $byRegency = $db->query("
        SELECT 
            regency_name,
            COUNT(*) AS count,
            COALESCE(SUM(acquisition_value), 0) AS total_value
        FROM assets
        GROUP BY regency_name
        ORDER BY count DESC
    ")->fetchAll();

    // 9. Statistik Khusus Kendaraan Dinas (KIB B)
    $vehicleStats = $db->query("
        SELECT 
            COUNT(*) AS total_vehicles,
            SUM(CASE WHEN condition = 'Baik' THEN 1 ELSE 0 END) AS good_condition,
            SUM(CASE WHEN condition != 'Baik' THEN 1 ELSE 0 END) AS damaged_condition,
            COALESCE(SUM(acquisition_value), 0) AS total_vehicle_value
        FROM assets
        WHERE category_id = 'kib-b' AND police_number IS NOT NULL
    ")->fetch();

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'by_category' => $byCategory,
        'by_condition' => $byCondition,
        'by_status' => $byStatus,
        'by_certification' => $byCertification,
        'top_opd' => $topOpd,
        'by_year' => $byYear,
        'by_regency' => $byRegency,
        'vehicle_stats' => $vehicleStats
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil statistik: ' . $e->getMessage()
    ]);
}

