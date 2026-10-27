<?php
// api/assets.php - API Pengelolaan Aset (CRUD, Pencarian & Filter)

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle CORS jika diakses dari port berbeda
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    switch ($method) {
        case 'GET':
            handleGet($db);
            break;
        case 'POST':
            handlePost($db);
            break;
        case 'PUT':
            handlePut($db);
            break;
        case 'DELETE':
            handleDelete($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Metode HTTP tidak diizinkan']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Terjadi kesalahan server: ' . $e->getMessage()
    ]);
}

/**
 * GET Handler - Ambil 1 aset atau daftar aset dengan filter
 */
function handleGet(PDO $db) {
    if (isset($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("
            SELECT a.*, c.name AS category_name, c.kib_type, c.color AS category_color, c.icon AS category_icon,
                   o.name AS opd_name, o.alias AS opd_alias, o.head_name AS opd_head
            FROM assets a
            JOIN categories c ON a.category_id = c.id
            JOIN opd o ON a.opd_id = o.id
            WHERE a.id = ?
        ");
        $stmt->execute([$id]);
        $asset = $stmt->fetch();

        if (!$asset) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Aset tidak ditemukan']);
            return;
        }

        // Ambil riwayat pemeliharaan jika ada
        $stmtLog = $db->prepare("SELECT * FROM maintenance_logs WHERE asset_id = ? ORDER BY maintenance_date DESC");
        $stmtLog->execute([$id]);
        $asset['maintenance_logs'] = $stmtLog->fetchAll();

        echo json_encode(['success' => true, 'data' => $asset]);
        return;
    }

    // Jika mode peta (geo_only): kembalikan data ringkas koordinat untuk Leaflet
    if (isset($_GET['geo_only']) && $_GET['geo_only'] == '1') {
        $sql = "
            SELECT a.id, a.name, a.asset_code, a.category_id, a.latitude, a.longitude, 
                   a.acquisition_value, a.condition, a.status, a.regency_name, a.address,
                   c.name AS category_name, c.kib_type, c.color AS category_color, c.icon AS category_icon,
                   o.alias AS opd_alias
            FROM assets a
            JOIN categories c ON a.category_id = c.id
            JOIN opd o ON a.opd_id = o.id
            WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL
        ";
        $params = [];

        if (!empty($_GET['category_id'])) {
            $sql .= " AND a.category_id = ?";
            $params[] = $_GET['category_id'];
        }
        if (!empty($_GET['opd_id'])) {
            $sql .= " AND a.opd_id = ?";
            $params[] = (int)$_GET['opd_id'];
        }
        if (!empty($_GET['regency'])) {
            $sql .= " AND a.regency_name = ?";
            $params[] = $_GET['regency'];
        }

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        return;
    }

    // Query daftar umum dengan filter, pencarian, dan pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(5, min(100, (int)($_GET['limit'] ?? 15)));
    $offset = ($page - 1) * $limit;

    $where = ["1=1"];
    $params = [];

    // Filter Pencarian (Keyword)
    if (!empty($_GET['search'])) {
        $term = '%' . trim($_GET['search']) . '%';
        $where[] = "(a.name LIKE ? OR a.asset_code LIKE ? OR a.register_number LIKE ? OR a.police_number LIKE ? OR a.address LIKE ? OR a.brand_type LIKE ?)";
        array_push($params, $term, $term, $term, $term, $term, $term);
    }

    // Filter Kategori KIB
    if (!empty($_GET['category_id'])) {
        $where[] = "a.category_id = ?";
        $params[] = $_GET['category_id'];
    }

    // Filter OPD
    if (!empty($_GET['opd_id'])) {
        $where[] = "a.opd_id = ?";
        $params[] = (int)$_GET['opd_id'];
    }

    // Filter Kabupaten / Kota
    if (!empty($_GET['regency'])) {
        $where[] = "a.regency_name = ?";
        $params[] = $_GET['regency'];
    }

    // Filter Kondisi
    if (!empty($_GET['condition'])) {
        $where[] = "a.condition = ?";
        $params[] = $_GET['condition'];
    }

    // Filter Status Pemanfaatan
    if (!empty($_GET['status'])) {
        $where[] = "a.status = ?";
        $params[] = $_GET['status'];
    }

    // Filter Status Sertifikat (KIB A)
    if (!empty($_GET['certificate_status'])) {
        $where[] = "a.certificate_status = ?";
        $params[] = $_GET['certificate_status'];
    }

    // Filter Tahun Perolehan
    if (!empty($_GET['year_min'])) {
        $where[] = "a.acquisition_year >= ?";
        $params[] = (int)$_GET['year_min'];
    }
    if (!empty($_GET['year_max'])) {
        $where[] = "a.acquisition_year <= ?";
        $params[] = (int)$_GET['year_max'];
    }

    $whereClause = implode(" AND ", $where);

    // Hitung total data
    $countSql = "SELECT COUNT(*) FROM assets a WHERE " . $whereClause;
    $countStmt = $db->prepare($countSql);
    $countStmt->execute($params);
    $totalRows = (int)$countStmt->fetchColumn();

    // Hitung total nilai perolehan untuk data yang terfilter
    $totalValSql = "SELECT COALESCE(SUM(acquisition_value), 0) FROM assets a WHERE " . $whereClause;
    $totalValStmt = $db->prepare($totalValSql);
    $totalValStmt->execute($params);
    $filteredTotalValue = (float)$totalValStmt->fetchColumn();

    // Sorting
    $allowedSort = ['id', 'name', 'acquisition_year', 'acquisition_value', 'created_at', 'category_id'];
    $sortBy = in_array($_GET['sort_by'] ?? '', $allowedSort) ? $_GET['sort_by'] : 'id';
    $sortOrder = (strtoupper($_GET['sort_order'] ?? '') === 'ASC') ? 'ASC' : 'DESC';

    // Ambil data
    $dataSql = "
        SELECT a.*, c.name AS category_name, c.kib_type, c.color AS category_color, c.icon AS category_icon,
               o.name AS opd_name, o.alias AS opd_alias
        FROM assets a
        JOIN categories c ON a.category_id = c.id
        JOIN opd o ON a.opd_id = o.id
        WHERE {$whereClause}
        ORDER BY a.{$sortBy} {$sortOrder}
        LIMIT {$limit} OFFSET {$offset}
    ";
    $dataStmt = $db->prepare($dataSql);
    $dataStmt->execute($params);
    $rows = $dataStmt->fetchAll();

    echo json_encode([
        'success' => true,
        'page' => $page,
        'limit' => $limit,
        'total_rows' => $totalRows,
        'total_pages' => ceil($totalRows / $limit),
        'filtered_total_value' => $filteredTotalValue,
        'data' => $rows
    ]);
}

/**
 * POST Handler - Tambah Aset Baru
 */
function handlePost(PDO $db) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    if (empty($input['name']) || empty($input['category_id']) || empty($input['opd_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nama aset, Kategori KIB, dan OPD penanggung jawab wajib diisi']);
        return;
    }

    // Auto-generate Kode Aset & Nomor Register jika kosong
    $catId = $input['category_id'];
    $stmtCat = $db->prepare("SELECT code FROM categories WHERE id = ?");
    $stmtCat->execute([$catId]);
    $catCode = $stmtCat->fetchColumn() ?: '01';

    $stmtMax = $db->prepare("SELECT COUNT(*) + 1 FROM assets WHERE category_id = ?");
    $stmtMax->execute([$catId]);
    $nextSeq = (int)$stmtMax->fetchColumn();

    $regNumber = !empty($input['register_number']) ? $input['register_number'] : str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
    $assetCode = !empty($input['asset_code']) ? $input['asset_code'] : sprintf("%02d.01.%02d.%04d", (int)$catCode, (int)($input['opd_id'] ?? 1), $nextSeq);

    $sql = "INSERT INTO assets (
        asset_code, register_number, name, category_id, opd_id, regency_name,
        district, address, latitude, longitude, acquisition_year,
        acquisition_value, book_value, condition, status, area_sqm,
        certificate_status, certificate_number, certificate_date,
        police_number, chassis_number, engine_number, brand_type,
        capacity_spec, custodian_name, building_floors, construction_type,
        imb_number, length_km, contract_value, progress_percentage, notes, image_url
    ) VALUES (
        :asset_code, :register_number, :name, :category_id, :opd_id, :regency_name,
        :district, :address, :latitude, :longitude, :acquisition_year,
        :acquisition_value, :book_value, :condition, :status, :area_sqm,
        :certificate_status, :certificate_number, :certificate_date,
        :police_number, :chassis_number, :engine_number, :brand_type,
        :capacity_spec, :custodian_name, :building_floors, :construction_type,
        :imb_number, :length_km, :contract_value, :progress_percentage, :notes, :image_url
    )";

    $acqVal = (float)($input['acquisition_value'] ?? 0);
    $bookVal = isset($input['book_value']) && $input['book_value'] !== '' ? (float)$input['book_value'] : $acqVal;

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':asset_code' => $assetCode,
        ':register_number' => $regNumber,
        ':name' => $input['name'],
        ':category_id' => $catId,
        ':opd_id' => (int)$input['opd_id'],
        ':regency_name' => $input['regency_name'] ?? 'Kota Bandar Lampung',
        ':district' => $input['district'] ?? null,
        ':address' => $input['address'] ?? null,
        ':latitude' => !empty($input['latitude']) ? (float)$input['latitude'] : null,
        ':longitude' => !empty($input['longitude']) ? (float)$input['longitude'] : null,
        ':acquisition_year' => !empty($input['acquisition_year']) ? (int)$input['acquisition_year'] : (int)date('Y'),
        ':acquisition_value' => $acqVal,
        ':book_value' => $bookVal,
        ':condition' => $input['condition'] ?? 'Baik',
        ':status' => $input['status'] ?? 'Digunakan Sendiri',
        ':area_sqm' => !empty($input['area_sqm']) ? (float)$input['area_sqm'] : null,
        ':certificate_status' => $input['certificate_status'] ?? null,
        ':certificate_number' => $input['certificate_number'] ?? null,
        ':certificate_date' => $input['certificate_date'] ?? null,
        ':police_number' => $input['police_number'] ?? null,
        ':chassis_number' => $input['chassis_number'] ?? null,
        ':engine_number' => $input['engine_number'] ?? null,
        ':brand_type' => $input['brand_type'] ?? null,
        ':capacity_spec' => $input['capacity_spec'] ?? null,
        ':custodian_name' => $input['custodian_name'] ?? null,
        ':building_floors' => !empty($input['building_floors']) ? (int)$input['building_floors'] : null,
        ':construction_type' => $input['construction_type'] ?? null,
        ':imb_number' => $input['imb_number'] ?? null,
        ':length_km' => !empty($input['length_km']) ? (float)$input['length_km'] : null,
        ':contract_value' => !empty($input['contract_value']) ? (float)$input['contract_value'] : null,
        ':progress_percentage' => !empty($input['progress_percentage']) ? (float)$input['progress_percentage'] : null,
        ':notes' => $input['notes'] ?? null,
        ':image_url' => $input['image_url'] ?? null
    ]);

    $newId = (int)$db->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Data aset berhasil dicatat dalam SIMBADA Pemprov Lampung',
        'id' => $newId,
        'asset_code' => $assetCode
    ]);
}

/**
 * PUT Handler - Perbarui Data Aset
 */
function handlePut(PDO $db) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID aset diperlukan']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Data input tidak valid']);
        return;
    }

    $sql = "UPDATE assets SET 
        name = :name,
        category_id = :category_id,
        opd_id = :opd_id,
        regency_name = :regency_name,
        district = :district,
        address = :address,
        latitude = :latitude,
        longitude = :longitude,
        acquisition_year = :acquisition_year,
        acquisition_value = :acquisition_value,
        book_value = :book_value,
        condition = :condition,
        status = :status,
        area_sqm = :area_sqm,
        certificate_status = :certificate_status,
        certificate_number = :certificate_number,
        certificate_date = :certificate_date,
        police_number = :police_number,
        chassis_number = :chassis_number,
        engine_number = :engine_number,
        brand_type = :brand_type,
        capacity_spec = :capacity_spec,
        custodian_name = :custodian_name,
        building_floors = :building_floors,
        construction_type = :construction_type,
        imb_number = :imb_number,
        length_km = :length_km,
        contract_value = :contract_value,
        progress_percentage = :progress_percentage,
        notes = :notes,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = :id";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':id' => $id,
        ':name' => $input['name'],
        ':category_id' => $input['category_id'],
        ':opd_id' => (int)$input['opd_id'],
        ':regency_name' => $input['regency_name'],
        ':district' => $input['district'] ?? null,
        ':address' => $input['address'] ?? null,
        ':latitude' => !empty($input['latitude']) ? (float)$input['latitude'] : null,
        ':longitude' => !empty($input['longitude']) ? (float)$input['longitude'] : null,
        ':acquisition_year' => (int)$input['acquisition_year'],
        ':acquisition_value' => (float)$input['acquisition_value'],
        ':book_value' => (float)($input['book_value'] ?? $input['acquisition_value']),
        ':condition' => $input['condition'],
        ':status' => $input['status'],
        ':area_sqm' => !empty($input['area_sqm']) ? (float)$input['area_sqm'] : null,
        ':certificate_status' => $input['certificate_status'] ?? null,
        ':certificate_number' => $input['certificate_number'] ?? null,
        ':certificate_date' => $input['certificate_date'] ?? null,
        ':police_number' => $input['police_number'] ?? null,
        ':chassis_number' => $input['chassis_number'] ?? null,
        ':engine_number' => $input['engine_number'] ?? null,
        ':brand_type' => $input['brand_type'] ?? null,
        ':capacity_spec' => $input['capacity_spec'] ?? null,
        ':custodian_name' => $input['custodian_name'] ?? null,
        ':building_floors' => !empty($input['building_floors']) ? (int)$input['building_floors'] : null,
        ':construction_type' => $input['construction_type'] ?? null,
        ':imb_number' => $input['imb_number'] ?? null,
        ':length_km' => !empty($input['length_km']) ? (float)$input['length_km'] : null,
        ':contract_value' => !empty($input['contract_value']) ? (float)$input['contract_value'] : null,
        ':progress_percentage' => !empty($input['progress_percentage']) ? (float)$input['progress_percentage'] : null,
        ':notes' => $input['notes'] ?? null
    ]);

    echo json_encode(['success' => true, 'message' => 'Data aset berhasil diperbarui']);
}

/**
 * DELETE Handler - Hapus Data Aset
 */
function handleDelete(PDO $db) {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID aset diperlukan']);
        return;
    }

    $stmt = $db->prepare("DELETE FROM assets WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode(['success' => true, 'message' => 'Data aset berhasil dihapus dari inventaris']);
}

