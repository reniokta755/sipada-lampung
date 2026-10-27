<?php
// config/database.php - Koneksi Database SQLite & Seeder Otomatis

date_default_timezone_set('Asia/Jakarta');

$dbDir = __DIR__ . '/../data';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}

$dbPath = $dbDir . '/assets.sqlite';
$isFirstInit = !file_exists($dbPath);

try {
    $db = new PDO("sqlite:" . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Aktifkan WAL mode untuk performa tinggi
    $db->exec("PRAGMA journal_mode = WAL;");
    $db->exec("PRAGMA foreign_keys = ON;");

    // Inisialisasi Skema Tabel
    initDatabaseSchema($db);

    // Jika database baru dibuat, isi dengan data awal representatif Pemprov Lampung
    if ($isFirstInit) {
        seedSampleData($db);
    }

} catch (PDOException $e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'success' => false,
        'message' => 'Koneksi database gagal: ' . $e->getMessage()
    ]);
    exit;
}

function initDatabaseSchema(PDO $db) {
    // 1. Tabel Kategori KIB
    $db->exec("CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        kib_type TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT
    );");

    // 2. Tabel OPD (Organisasi Perangkat Daerah)
    $db->exec("CREATE TABLE IF NOT EXISTS opd (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        alias TEXT,
        head_name TEXT,
        address TEXT,
        phone TEXT
    );");

    // 3. Tabel Kabupaten/Kota di Provinsi Lampung
    $db->exec("CREATE TABLE IF NOT EXISTS regencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- Kota / Kabupaten
        latitude REAL,
        longitude REAL
    );");

    // 4. Tabel Utama Aset (Barang Milik Daerah)
    $db->exec("CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_code TEXT NOT NULL,
        register_number TEXT NOT NULL,
        name TEXT NOT NULL,
        category_id TEXT NOT NULL,
        opd_id INTEGER NOT NULL,
        regency_name TEXT NOT NULL,
        district TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        acquisition_year INTEGER NOT NULL,
        acquisition_value REAL NOT NULL,
        book_value REAL NOT NULL,
        condition TEXT NOT NULL, -- Baik, Rusak Ringan, Rusak Berat
        status TEXT NOT NULL, -- Digunakan Sendiri, Pinjam Pakai, Sewa, KSP, Idle, Usul Hapus
        
        -- Spesifikasi khusus KIB
        area_sqm REAL, -- Luas m2 (KIB A, C, D)
        certificate_status TEXT, -- Bersertifikat, Proses, Belum, Sengketa (KIB A)
        certificate_number TEXT,
        certificate_date TEXT,
        
        police_number TEXT, -- Plat nomor (KIB B)
        chassis_number TEXT,
        engine_number TEXT,
        brand_type TEXT,
        capacity_spec TEXT,
        custodian_name TEXT, -- Pemegang aset / penanggung jawab
        
        building_floors INTEGER, -- Jumlah lantai (KIB C)
        construction_type TEXT, -- Beton, Baja, Kayu
        imb_number TEXT,
        
        length_km REAL, -- Panjang jalan / jaringan (KIB D)
        
        contract_value REAL, -- KDP (KIB F)
        progress_percentage REAL, -- % Realisasi KDP
        
        image_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (opd_id) REFERENCES opd(id)
    );");

    // 5. Tabel Riwayat Pemeliharaan & Servis
    $db->exec("CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        maintenance_date DATE NOT NULL,
        description TEXT NOT NULL,
        cost REAL NOT NULL,
        service_provider TEXT,
        technician TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    );");
}

function seedSampleData(PDO $db) {
    // Seed Kategori KIB
    $categories = [
        ['kib-a', '01', 'Tanah', 'KIB A', 'Tanah perkantoran, tanah fasilitas umum, tanah pertanian/kebun, dan kawasan peruntukan lainnya.', 'fa-mountain-sun', '#10B981'],
        ['kib-b', '02', 'Peralatan dan Mesin', 'KIB B', 'Kendaraan dinas operasional, alat berat, alat kesehatan RSUD, komputer server, dan mesin produksi.', 'fa-car-side', '#3B82F6'],
        ['kib-c', '03', 'Gedung dan Bangunan', 'KIB C', 'Gedung kantor dinas, rumah jabatan, gedung sekolah/SMK, rumah sakit, dan bangunan monumental.', 'fa-building', '#8B5CF6'],
        ['kib-d', '04', 'Jalan, Irigasi dan Jaringan', 'KIB D', 'Ruas jalan provinsi, jembatan strategis, bendung & saluran irigasi, dan jaringan instalasi.', 'fa-road', '#F59E0B'],
        ['kib-e', '05', 'Aset Tetap Lainnya', 'KIB E', 'Buku perpustakaan daerah, barang bercorak kesenian/kebudayaan/museum, dan hewan ternak balai bibit.', 'fa-book-bookmark', '#EC4899'],
        ['kib-f', '06', 'Konstruksi Dalam Pengerjaan', 'KIB F', 'Pekerjaan pembangunan fisik infrastruktur atau gedung yang belum selesai 100% dan belum diserahterimakan.', 'fa-helmet-safety', '#EF4444']
    ];

    $stmtCat = $db->prepare("INSERT INTO categories (id, code, name, kib_type, description, icon, color) VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($categories as $cat) {
        $stmtCat->execute($cat);
    }

    // Seed OPD Pemprov Lampung
    $opds = [
        ['1.01.0.00.0.00.01.0000', 'Sekretariat Daerah Provinsi Lampung', 'Setda Provinsi Lampung', 'Ir. Fahrizal Darminto, MA', 'Jl. Wolter Monginsidi No. 69, Teluk Betung, Bandar Lampung', '0721-481166'],
        ['1.02.0.00.0.00.02.0000', 'Badan Pengelolaan Keuangan dan Aset Daerah', 'BPKAD Provinsi Lampung', 'Dr. Marindo Kurniawan, S.T., M.M.', 'Kompleks Kantor Gubernur Lampung, Teluk Betung, Bandar Lampung', '0721-481233'],
        ['1.03.0.00.0.00.03.0000', 'Dinas Bina Marga dan Bina Konstruksi', 'BMBK Provinsi Lampung', 'M. Taufiqullah, S.T., M.T.', 'Jl. Zainal Abidin Pagar Alam No. 11, Rajabasa, Bandar Lampung', '0721-701234'],
        ['1.04.0.00.0.00.04.0000', 'RSUD Dr. H. Abdul Moeloek', 'RSUDAM Lampung', 'dr. Lukman Pura, Sp.PD-KGH., MHSM.', 'Jl. Dr. Rivai No. 6, Penengahan, Bandar Lampung', '0721-703312'],
        ['1.05.0.00.0.00.05.0000', 'Dinas Pendidikan dan Kebudayaan', 'Disdikbud Provinsi Lampung', 'Drs. Sulpakar, M.M.', 'Jl. Drs. Warsito No. 72, Teluk Betung Utara, Bandar Lampung', '0721-482359'],
        ['1.06.0.00.0.00.06.0000', 'Dinas Kesehatan Provinsi Lampung', 'Dinkes Provinsi Lampung', 'dr. Edwin Rusli, MKM', 'Jl. Dr. Susilo No. 44, Teluk Betung Utara, Bandar Lampung', '0721-253452'],
        ['1.07.0.00.0.00.07.0000', 'Dinas Komunikasi, Informatika dan Statistik', 'Diskominfotik Lampung', 'Achmad Saefullah, S.Sos.', 'Kompleks Perkantoran Pemprov Lampung, Teluk Betung, Bandar Lampung', '0721-481544'],
        ['1.08.0.00.0.00.08.0000', 'Dinas Perhubungan Provinsi Lampung', 'Dishub Provinsi Lampung', 'Bambang Sumbogo, S.E., M.M.', 'Jl. Cut Meutia No. 40, Teluk Betung Utara, Bandar Lampung', '0721-481355'],
        ['1.09.0.00.0.00.09.0000', 'Dinas Pengelolaan Sumber Daya Air', 'PSDA Provinsi Lampung', 'Ir. Budhi Darmawan, S.T., M.T.', 'Jl. Gatot Subroto No. 59, Garuntang, Bandar Lampung', '0721-485600'],
        ['1.10.0.00.0.00.10.0000', 'Dinas Pariwisata dan Ekonomi Kreatif', 'Disparekraf Lampung', 'Dr. Bobby Irawan, S.E., M.Si.', 'Jl. Jend. Sudirman No. 29, Rawa Laut, Bandar Lampung', '0721-261430'],
        ['1.11.0.00.0.00.11.0000', 'Dinas Kehutanan Provinsi Lampung', 'Dishut Lampung', 'Ir. Y. Ruchyansyah, M.Si.', 'Jl. Rajabasa No. 1, Rajabasa, Bandar Lampung', '0721-703173'],
        ['1.12.0.00.0.00.12.0000', 'Dinas Kelautan dan Perikanan', 'DKP Provinsi Lampung', 'Ir. Liza Derni, M.M.', 'Jl. Dr. Susilo No. 70, Teluk Betung Utara, Bandar Lampung', '0721-481499'],
        ['1.13.0.00.0.00.13.0000', 'Satuan Polisi Pamong Praja', 'Satpol PP Lampung', 'M. Zulkarnain, S.Sos., M.Si.', 'Kompleks Perkantoran Pemprov Lampung, Teluk Betung', '0721-482201'],
        ['1.14.0.00.0.00.14.0000', 'DPRD Provinsi Lampung', 'Sekretariat DPRD Lampung', 'Hj. Tina Malinda, S.Sos., M.M.', 'Jl. Wolter Monginsidi No. 69, Teluk Betung, Bandar Lampung', '0721-481180']
    ];

    $stmtOpd = $db->prepare("INSERT INTO opd (code, name, alias, head_name, address, phone) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($opds as $o) {
        $stmtOpd->execute($o);
    }

    // Seed 15 Kabupaten/Kota di Lampung
    $regencies = [
        ['Kota Bandar Lampung', 'Kota', -5.4297, 105.2625],
        ['Kota Metro', 'Kota', -5.1136, 105.3069],
        ['Kabupaten Lampung Selatan', 'Kabupaten', -5.7145, 105.5898],
        ['Kabupaten Lampung Tengah', 'Kabupaten', -4.8667, 105.2167],
        ['Kabupaten Lampung Utara', 'Kabupaten', -4.8152, 104.8824],
        ['Kabupaten Lampung Barat', 'Kabupaten', -5.0167, 104.1833],
        ['Kabupaten Lampung Timur', 'Kabupaten', -5.1000, 105.6833],
        ['Kabupaten Tanggamus', 'Kabupaten', -5.4500, 104.6167],
        ['Kabupaten Way Kanan', 'Kabupaten', -4.4500, 104.5333],
        ['Kabupaten Tulang Bawang', 'Kabupaten', -4.4500, 105.2833],
        ['Kabupaten Pesawaran', 'Kabupaten', -5.4333, 105.1833],
        ['Kabupaten Pringsewu', 'Kabupaten', -5.3583, 104.9819],
        ['Kabupaten Mesuji', 'Kabupaten', -4.0333, 105.4167],
        ['Kabupaten Tulang Bawang Barat', 'Kabupaten', -4.4667, 105.0500],
        ['Kabupaten Pesisir Barat', 'Kabupaten', -5.1917, 103.9389]
    ];

    $stmtReg = $db->prepare("INSERT INTO regencies (name, type, latitude, longitude) VALUES (?, ?, ?, ?)");
    foreach ($regencies as $r) {
        $stmtReg->execute($r);
    }

    // Seed Realistis Aset Daerah Pemprov Lampung
    $sampleAssets = [
        // KIB A: Tanah
        [
            'asset_code' => '01.01.01.01.001',
            'register_number' => '000001',
            'name' => 'Tanah Kompleks Perkantoran Pemerintah Provinsi Lampung',
            'category_id' => 'kib-a',
            'opd_id' => 2, // BPKAD
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Jl. Wolter Monginsidi No. 69, Teluk Betung, Bandar Lampung',
            'latitude' => -5.4485,
            'longitude' => 105.2612,
            'acquisition_year' => 1978,
            'acquisition_value' => 245000000000,
            'book_value' => 245000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 64500,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00012/TBS/1982',
            'certificate_date' => '1982-08-17',
            'custodian_name' => 'BPKAD Provinsi Lampung',
            'notes' => 'Pusat kantor Gubernur, Bappeda, BPKAD, Balai Keratun, dan DPRD Provinsi Lampung.'
        ],
        [
            'asset_code' => '01.01.01.02.004',
            'register_number' => '000002',
            'name' => 'Kawasan Lahan Kota Baru Jati Agung (Pusat Pemerintahan Masa Depan)',
            'category_id' => 'kib-a',
            'opd_id' => 2, // BPKAD
            'regency_name' => 'Kabupaten Lampung Selatan',
            'district' => 'Jati Agung',
            'address' => 'Kawasan Kota Baru, Kec. Jati Agung, Kab. Lampung Selatan',
            'latitude' => -5.3218,
            'longitude' => 105.3450,
            'acquisition_year' => 2011,
            'acquisition_value' => 1850000000000,
            'book_value' => 1850000000000,
            'condition' => 'Baik',
            'status' => 'Idle',
            'area_sqm' => 13000000, // 1.300 Hektar
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'HPL No. 01/Kota Baru/2013',
            'certificate_date' => '2013-05-12',
            'custodian_name' => 'Pemerintah Provinsi Lampung',
            'notes' => 'Aset lahan strategis pengembangan pusat pemerintahan terpadu dan investasi agropolitan masa depan Lampung.'
        ],
        [
            'asset_code' => '01.01.01.03.007',
            'register_number' => '000003',
            'name' => 'Tanah Kompleks Pusat Kegiatan Olahraga (PKOR) Way Halim',
            'category_id' => 'kib-a',
            'opd_id' => 10, // Disparekraf / Dispora
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Way Halim',
            'address' => 'Jl. Sultan Agung, Sukarame, Bandar Lampung',
            'latitude' => -5.3855,
            'longitude' => 105.2810,
            'acquisition_year' => 1985,
            'acquisition_value' => 420000000000,
            'book_value' => 420000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 185000,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00045/Way Halim/1987',
            'certificate_date' => '1987-11-20',
            'custodian_name' => 'Dispora / BPKAD Pemprov Lampung',
            'notes' => 'Fasilitas Stadion Sumpah Pemuda, Hall Senam, Anjungan Rumah Adat 15 Kab/Kota, dan pusat rekreasi warga.'
        ],
        [
            'asset_code' => '01.01.01.04.012',
            'register_number' => '000004',
            'name' => 'Tanah Dermaga Pelabuhan Perikanan Pantai (PPP) Lempasing',
            'category_id' => 'kib-a',
            'opd_id' => 12, // DKP
            'regency_name' => 'Kabupaten Pesawaran',
            'district' => 'Teluk Pandan',
            'address' => 'Jl. Raya Lempasing, Kec. Teluk Pandan, Kab. Pesawaran',
            'latitude' => -5.4852,
            'longitude' => 105.2530,
            'acquisition_year' => 1996,
            'acquisition_value' => 78000000000,
            'book_value' => 78000000000,
            'condition' => 'Baik',
            'status' => 'KSP',
            'area_sqm' => 38000,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00021/Lempasing/1998',
            'certificate_date' => '1998-04-14',
            'custodian_name' => 'Dinas Kelautan dan Perikanan',
            'notes' => 'Dikerjasamakan sebagian dengan Koperasi Nelayan dan Asosiasi Cold Storage untuk retribusi PAD.'
        ],
        [
            'asset_code' => '01.01.01.05.015',
            'register_number' => '000005',
            'name' => 'Lahan Balai Benih Induk Hortikultura Tegineneng',
            'category_id' => 'kib-a',
            'opd_id' => 2, // BPKAD
            'regency_name' => 'Kabupaten Pesawaran',
            'district' => 'Tegineneng',
            'address' => 'Jl. Raya Lintas Sumatera Km 34, Kec. Tegineneng, Kab. Pesawaran',
            'latitude' => -5.1950,
            'longitude' => 105.1880,
            'acquisition_year' => 1989,
            'acquisition_value' => 45000000000,
            'book_value' => 45000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 250000,
            'certificate_status' => 'Proses',
            'certificate_number' => 'Pendaftaran No. 340/BPN/2024',
            'certificate_date' => '2024-03-01',
            'custodian_name' => 'Dinas Tanaman Pangan & Hortikultura',
            'notes' => 'Sedang dalam proses konversi sertifikat elektronik di BPN Pesawaran.'
        ],

        // KIB B: Peralatan dan Mesin (Kendaraan, Medis, Komputer)
        [
            'asset_code' => '02.03.01.01.001',
            'register_number' => '000101',
            'name' => 'Kendaraan Dinas Jabatan Gubernur Lampung (Toyota Land Cruiser 300 VX-R)',
            'category_id' => 'kib-b',
            'opd_id' => 1, // Setda
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Kompleks Kantor Gubernur Lampung',
            'latitude' => -5.4485,
            'longitude' => 105.2612,
            'acquisition_year' => 2023,
            'acquisition_value' => 2650000000,
            'book_value' => 2120000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'police_number' => 'BE 1 A',
            'chassis_number' => 'FJA300-0019284',
            'engine_number' => 'F33A-FTV-89412',
            'brand_type' => 'Toyota Land Cruiser 300 3.3L Twin Turbo Diesel',
            'capacity_spec' => '3346 CC / V6 Diesel',
            'custodian_name' => 'Biro Umum Sekretariat Daerah',
            'notes' => 'Kendaraan dinas operasional VVIP pimpinan daerah, servis rutin berkala bengkel resmi Auto2000 Raden Intan.'
        ],
        [
            'asset_code' => '02.03.01.01.002',
            'register_number' => '000102',
            'name' => 'Kendaraan Dinas Jabatan Wakil Gubernur (Toyota Alphard 2.5 G AT)',
            'category_id' => 'kib-b',
            'opd_id' => 1, // Setda
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Kompleks Kantor Gubernur Lampung',
            'latitude' => -5.4485,
            'longitude' => 105.2612,
            'acquisition_year' => 2022,
            'acquisition_value' => 1550000000,
            'book_value' => 1085000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'police_number' => 'BE 2 A',
            'chassis_number' => 'AGH30-0238194',
            'engine_number' => '2AR-FE-91204',
            'brand_type' => 'Toyota Alphard 2.5 G AT',
            'capacity_spec' => '2494 CC / Bensin',
            'custodian_name' => 'Biro Umum Sekretariat Daerah',
            'notes' => 'Kendaraan dinas pimpinan daerah, kondisi prima.'
        ],
        [
            'asset_code' => '02.03.01.02.015',
            'register_number' => '000103',
            'name' => 'Mobil Ambulans VVIP Emergency ICU RSUD Dr. H. Abdul Moeloek',
            'category_id' => 'kib-b',
            'opd_id' => 4, // RSUDAM
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'RSUD Dr. H. Abdul Moeloek, Jl. Dr. Rivai No. 6',
            'latitude' => -5.4022,
            'longitude' => 105.2589,
            'acquisition_year' => 2021,
            'acquisition_value' => 1450000000,
            'book_value' => 870000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'police_number' => 'BE 1008 AZ',
            'chassis_number' => 'GDH300-881923',
            'engine_number' => '1GD-FTV-77123',
            'brand_type' => 'Toyota HiAce Premio Luxury Emergency Unit',
            'capacity_spec' => '2755 CC Diesel + Ventilator Mobile',
            'custodian_name' => 'Instalasi Gawat Darurat RSUDAM',
            'notes' => 'Dilengkapi monitor pasien mobile, defibrillator, tabung oksigen sentral dan sirine standar kedaruratan medik.'
        ],
        [
            'asset_code' => '02.04.01.05.008',
            'register_number' => '000104',
            'name' => 'Alat Medis CT-Scan 128 Slices Spectral Imaging',
            'category_id' => 'kib-b',
            'opd_id' => 4, // RSUDAM
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'Gedung Radiologi Terpadu RSUDAM, Jl. Dr. Rivai No. 6',
            'latitude' => -5.4025,
            'longitude' => 105.2592,
            'acquisition_year' => 2020,
            'acquisition_value' => 19500000000,
            'book_value' => 11700000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'brand_type' => 'Siemens SOMATOM go.Top 128 Slice',
            'capacity_spec' => 'Multislice Computed Tomography System',
            'custodian_name' => 'Instalasi Radiologi RSUD Dr. H. Abdul Moeloek',
            'notes' => 'Fasilitas rujukan diagnostik utama regional Sumatera Bagian Selatan.'
        ],
        [
            'asset_code' => '02.05.02.01.003',
            'register_number' => '000105',
            'name' => 'Alat Berat Excavator Hidrolik PC200 UPTD Jalan & Jembatan',
            'category_id' => 'kib-b',
            'opd_id' => 3, // BMBK
            'regency_name' => 'Kabupaten Lampung Tengah',
            'district' => 'Gunung Sugih',
            'address' => 'Workshop UPTD Wilayah III BMBK, Gunung Sugih',
            'latitude' => -4.8912,
            'longitude' => 105.2104,
            'acquisition_year' => 2019,
            'acquisition_value' => 2450000000,
            'book_value' => 1225000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'brand_type' => 'Komatsu PC200-8M0',
            'capacity_spec' => 'Bucket Capacity 0.93 m3 / 168 HP',
            'custodian_name' => 'UPTD Wilayah III Gunung Sugih BMBK',
            'notes' => 'Siap siaga penanganan darurat longsor dan pemeliharaan jalan provinsi lintas tengah.'
        ],
        [
            'asset_code' => '02.06.01.08.012',
            'register_number' => '000106',
            'name' => 'Perangkat Server Enterprise Data Center Pemprov Lampung',
            'category_id' => 'kib-b',
            'opd_id' => 7, // Diskominfotik
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Gedung Data Center Diskominfotik, Jl. Wolter Monginsidi',
            'latitude' => -5.4490,
            'longitude' => 105.2618,
            'acquisition_year' => 2022,
            'acquisition_value' => 4800000000,
            'book_value' => 3360000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'brand_type' => 'HPE ProLiant DL380 Gen10 Plus Cluster (4 Nodes)',
            'capacity_spec' => '2x Intel Xeon Platinum, 1024GB RAM, 64TB NVMe SSD',
            'custodian_name' => 'Bidang TIK & e-Government Diskominfotik',
            'notes' => 'Hosting server portal SIPD, E-Aset, Satu Data Lampung, dan aplikasi SPBE provinsi.'
        ],
        [
            'asset_code' => '02.03.01.03.045',
            'register_number' => '000107',
            'name' => 'Mobil Patroli Penegakan Perda Satuan Polisi Pamong Praja',
            'category_id' => 'kib-b',
            'opd_id' => 13, // Satpol PP
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Mako Satpol PP Pemprov Lampung',
            'latitude' => -5.4480,
            'longitude' => 105.2605,
            'acquisition_year' => 2017,
            'acquisition_value' => 420000000,
            'book_value' => 84000000,
            'condition' => 'Rusak Ringan',
            'status' => 'Digunakan Sendiri',
            'police_number' => 'BE 9012 AZ',
            'chassis_number' => 'MH4GG21-88902',
            'engine_number' => '4D56-KT9912',
            'brand_type' => 'Mitsubishi Triton Double Cabin 4x4',
            'capacity_spec' => '2477 CC Turbo Intercooler',
            'custodian_name' => 'Bidang Trantibum Satpol PP',
            'notes' => 'Perlu perbaikan transmisi gardan depan dan penggantian kampas kopling.'
        ],

        // KIB C: Gedung dan Bangunan
        [
            'asset_code' => '03.07.01.01.001',
            'register_number' => '000201',
            'name' => 'Gedung Utama Kantor Gubernur Lampung & Balai Keratun',
            'category_id' => 'kib-c',
            'opd_id' => 1, // Setda
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Selatan',
            'address' => 'Jl. Wolter Monginsidi No. 69, Teluk Betung, Bandar Lampung',
            'latitude' => -5.4485,
            'longitude' => 105.2612,
            'acquisition_year' => 1982,
            'acquisition_value' => 165000000000,
            'book_value' => 125000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 22000,
            'building_floors' => 5,
            'construction_type' => 'Beton Bertulang dengan Arsitektur Tradisional Siger',
            'imb_number' => 'IMB No. 503/012/DTR/1982',
            'custodian_name' => 'Biro Umum Sekretariat Daerah',
            'notes' => 'Gedung pusat pemerintahan provinsi, ruang kerja Gubernur, Wakil Gubernur, Sekda, dan aula Balai Keratun.'
        ],
        [
            'asset_code' => '03.07.01.02.003',
            'register_number' => '000202',
            'name' => 'Gedung Rawat Inap Terpadu Penyakit Infeksi & Paru RSUDAM',
            'category_id' => 'kib-c',
            'opd_id' => 4, // RSUDAM
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'Jl. Dr. Rivai No. 6, Penengahan, Bandar Lampung',
            'latitude' => -5.4020,
            'longitude' => 105.2585,
            'acquisition_year' => 2021,
            'acquisition_value' => 92000000000,
            'book_value' => 87400000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 9800,
            'building_floors' => 4,
            'construction_type' => 'Beton Bertulang dengan Sistem Negatif Pressure Isolation',
            'imb_number' => 'PBG No. 1871/PBG/2021/0088',
            'custodian_name' => 'Direktur RSUD Dr. H. Abdul Moeloek',
            'notes' => 'Kapasitas 160 tempat tidur berstandar isolasi udara dan ICU airborne.'
        ],
        [
            'asset_code' => '03.07.01.03.005',
            'register_number' => '000203',
            'name' => 'Rumah Dinas Jabatan Gubernur Lampung (Mahan Agung)',
            'category_id' => 'kib-c',
            'opd_id' => 1, // Setda
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Utara',
            'address' => 'Jl. Dr. Susilo No. 1, Sumur Batu, Teluk Betung Utara',
            'latitude' => -5.4380,
            'longitude' => 105.2635,
            'acquisition_year' => 1975,
            'acquisition_value' => 54000000000,
            'book_value' => 48000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 8500,
            'building_floors' => 2,
            'construction_type' => 'Beton Kolonial Klasik & Ornamen Lampung',
            'imb_number' => 'IMB-1975-001/RD-GUB',
            'custodian_name' => 'Biro Umum Sekretariat Daerah',
            'notes' => 'Kediaman resmi Gubernur Lampung, tempat penerimaan tamu kenegaraan dan upacara adat kebesaran.'
        ],
        [
            'asset_code' => '03.07.01.04.009',
            'register_number' => '000204',
            'name' => 'Gedung Mess / Anjungan Penghubung Pemprov Lampung di Jakarta',
            'category_id' => 'kib-c',
            'opd_id' => 1, // Setda
            'regency_name' => 'Kota Bandar Lampung', // Dicatat di aset pemprov
            'district' => 'Palmerah, Jakarta Barat',
            'address' => 'Jl. Anggrek No. 14, Slipi, Palmerah, Jakarta Barat (DKI Jakarta)',
            'latitude' => -6.1895,
            'longitude' => 106.7950,
            'acquisition_year' => 1994,
            'acquisition_value' => 88000000000,
            'book_value' => 74800000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 3200,
            'building_floors' => 4,
            'construction_type' => 'Beton Bertulang',
            'imb_number' => 'IMB/DKI/1994/3391',
            'custodian_name' => 'Kantor Penghubung Pemprov Lampung Jakarta',
            'notes' => 'Kantor perwakilan dan fasilitas penginapan kedinasan ASN/pejabat Pemprov Lampung di Jakarta.'
        ],
        [
            'asset_code' => '03.07.01.05.018',
            'register_number' => '000205',
            'name' => 'Gedung Laboratorium Praktik SMK Negeri 2 Bandar Lampung',
            'category_id' => 'kib-c',
            'opd_id' => 5, // Disdikbud
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'Jl. Prof. Dr. Soemantri Brojonegoro No. 1, Rajabasa',
            'latitude' => -5.3670,
            'longitude' => 105.2440,
            'acquisition_year' => 2018,
            'acquisition_value' => 16500000000,
            'book_value' => 13200000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 2800,
            'building_floors' => 3,
            'construction_type' => 'Beton Bertulang',
            'imb_number' => 'PBG-0182-SMK2/2018',
            'custodian_name' => 'SMKN 2 Bandar Lampung / Disdikbud',
            'notes' => 'Workshop teknik permesinan, robotika, dan teknologi informasi.'
        ],

        // KIB D: Jalan, Irigasi dan Jaringan
        [
            'asset_code' => '04.08.01.01.001',
            'register_number' => '000301',
            'name' => 'Ruas Jalan Provinsi Ryacudu (Akses Gerbang Tol Itera Kota Baru)',
            'category_id' => 'kib-d',
            'opd_id' => 3, // BMBK
            'regency_name' => 'Kabupaten Lampung Selatan',
            'district' => 'Jati Agung / Sukarame',
            'address' => 'Ruas Simpang Jl. Soekarno Hatta - Gerbang Tol Trans Sumatera Itera',
            'latitude' => -5.3688,
            'longitude' => 105.3120,
            'acquisition_year' => 2019,
            'acquisition_value' => 78500000000,
            'book_value' => 62800000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'length_km' => 4.8,
            'construction_type' => 'Rigid Pavement Beton FS 45 & Aspal AC-WC',
            'custodian_name' => 'Dinas Bina Marga dan Bina Konstruksi',
            'notes' => 'Jalan utama akses gerbang tol Itera dan kampus Institut Teknologi Sumatera, 2 jalur 4 lajur.'
        ],
        [
            'asset_code' => '04.08.01.02.008',
            'register_number' => '000302',
            'name' => 'Ruas Jalan Provinsi Simpang Randu - Seputih Banyak',
            'category_id' => 'kib-d',
            'opd_id' => 3, // BMBK
            'regency_name' => 'Kabupaten Lampung Tengah',
            'district' => 'Seputih Banyak',
            'address' => 'Ruas Jalan Provinsi No. 042, Kab. Lampung Tengah',
            'latitude' => -4.9120,
            'longitude' => 105.4820,
            'acquisition_year' => 2023,
            'acquisition_value' => 64000000000,
            'book_value' => 60800000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'length_km' => 18.2,
            'construction_type' => 'Rigid Pavement Beton Bertulang',
            'custodian_name' => 'Dinas Bina Marga dan Bina Konstruksi',
            'notes' => 'Selesai rekonstruksi beton bertulang dengan dana Inpres Jalan Daerah & APBD Pemprov Lampung.'
        ],
        [
            'asset_code' => '04.08.01.03.014',
            'register_number' => '000303',
            'name' => 'Jembatan Way Seputih II (Bentang Panjang)',
            'category_id' => 'kib-d',
            'opd_id' => 3, // BMBK
            'regency_name' => 'Kabupaten Lampung Tengah',
            'district' => 'Gunung Sugih',
            'address' => 'Lintas Tengah, Kec. Gunung Sugih, Kab. Lampung Tengah',
            'latitude' => -4.8750,
            'longitude' => 105.2280,
            'acquisition_year' => 2016,
            'acquisition_value' => 45000000000,
            'book_value' => 36000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'length_km' => 0.16, // 160 meter
            'construction_type' => 'Steel Truss / Gelagar Baja Komposit',
            'custodian_name' => 'Dinas Bina Marga dan Bina Konstruksi',
            'notes' => 'Jembatan penghubung strategis mobilitas logistik Sumatera lintas tengah.'
        ],
        [
            'asset_code' => '04.09.02.01.005',
            'register_number' => '000304',
            'name' => 'Jaringan Irigasi Primer Daerah Irigasi (DI) Way Rarem UPTD Kotabumi',
            'category_id' => 'kib-d',
            'opd_id' => 9, // PSDA
            'regency_name' => 'Kabupaten Lampung Utara',
            'district' => 'Abung Barat',
            'address' => 'Saluran Induk Way Rarem, Kab. Lampung Utara',
            'latitude' => -4.8320,
            'longitude' => 104.8150,
            'acquisition_year' => 1991,
            'acquisition_value' => 115000000000,
            'book_value' => 69000000000,
            'condition' => 'Rusak Ringan',
            'status' => 'Digunakan Sendiri',
            'length_km' => 28.5,
            'construction_type' => 'Pasangan Batu Kali & Lining Precast',
            'custodian_name' => 'Dinas Pengelolaan Sumber Daya Air',
            'notes' => 'Mengairi sawah seluas 18.000 hektar. Perlu normalisasi sedimentasi saluran sekunder pada ruas Km 12-16.'
        ],

        // KIB E: Aset Tetap Lainnya
        [
            'asset_code' => '05.10.01.01.001',
            'register_number' => '000401',
            'name' => 'Koleksi Kain Tapis Kuno Abad 18 & Mahkota Siger Pengantin Adat Saibatin-Pepadun',
            'category_id' => 'kib-e',
            'opd_id' => 10, // Disparekraf / Museum
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'Museum Negeri Provinsi Lampung Ruwa Jurai, Jl. Z.A. Pagar Alam No. 64',
            'latitude' => -5.3725,
            'longitude' => 105.2510,
            'acquisition_year' => 1988,
            'acquisition_value' => 1250000000,
            'book_value' => 1250000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'custodian_name' => 'Kepala UPTD Museum Negeri Lampung',
            'notes' => 'Aset cagar budaya berharga tinggi, disimpan dalam lemari vakum ber-AC khusus museum dengan keamanan 24 jam.'
        ],
        [
            'asset_code' => '05.10.02.03.018',
            'register_number' => '000402',
            'name' => 'Koleksi Buku Naskah Kuno Kulit Kayu Aksara Lampung (Had Lampung)',
            'category_id' => 'kib-e',
            'opd_id' => 5, // Disdikbud / Perpusda
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Teluk Betung Utara',
            'address' => 'Dinas Perpustakaan dan Kearsipan Daerah Prov. Lampung, Jl. Wolter Monginsidi',
            'latitude' => -5.4410,
            'longitude' => 105.2640,
            'acquisition_year' => 1995,
            'acquisition_value' => 450000000,
            'book_value' => 450000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'custodian_name' => 'Dinas Perpustakaan dan Kearsipan Daerah',
            'notes' => 'Telah dilakukan digitalisasi naskah kuno manuskrip Lampung untuk kelestarian literasi budaya.'
        ],

        // KIB F: Konstruksi Dalam Pengerjaan (KDP)
        [
            'asset_code' => '06.11.01.01.002',
            'register_number' => '000501',
            'name' => 'Pembangunan Gedung Pelayanan Kanker Terpadu & Kedokteran Nuklir RSUDAM',
            'category_id' => 'kib-f',
            'opd_id' => 4, // RSUDAM
            'regency_name' => 'Kota Bandar Lampung',
            'district' => 'Kedaton',
            'address' => 'Area RSUDAM, Jl. Dr. Rivai No. 6, Bandar Lampung',
            'latitude' => -5.4018,
            'longitude' => 105.2595,
            'acquisition_year' => 2024,
            'acquisition_value' => 48500000000,
            'book_value' => 48500000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'contract_value' => 65000000000,
            'progress_percentage' => 74.6,
            'custodian_name' => 'PPK Proyek RSUD Dr. H. Abdul Moeloek',
            'notes' => 'Proyek strategis pelayanan kanker regional, target serah terima sementara (PHO) akhir tahun 2026.'
        ],
        [
            'asset_code' => '06.11.02.04.005',
            'register_number' => '000502',
            'name' => 'Pembangunan Jembatan Gantung Wisata Pesisir Barat (Krui)',
            'category_id' => 'kib-f',
            'opd_id' => 3, // BMBK
            'regency_name' => 'Kabupaten Pesisir Barat',
            'district' => 'Pesisir Tengah',
            'address' => 'Muara Way Krui, Pasar Krui, Kab. Pesisir Barat',
            'latitude' => -5.1980,
            'longitude' => 103.9350,
            'acquisition_year' => 2024,
            'acquisition_value' => 12800000000,
            'book_value' => 12800000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'contract_value' => 16000000000,
            'progress_percentage' => 80.0,
            'custodian_name' => 'Dinas Bina Marga dan Bina Konstruksi',
            'notes' => 'Pembangunan jembatan penghubung kawasan selancar Labuhan Jukung dan pemukiman pesisir.'
        ],

        // Tambahan aset di kabupaten lain untuk persebaran peta yang seimbang
        [
            'asset_code' => '01.01.01.06.022',
            'register_number' => '000006',
            'name' => 'Lahan UPTD Balai Latihan Pertanian Metro',
            'category_id' => 'kib-a',
            'opd_id' => 2,
            'regency_name' => 'Kota Metro',
            'district' => 'Metro Pusat',
            'address' => 'Jl. Jendral Sudirman No. 88, Kota Metro',
            'latitude' => -5.1150,
            'longitude' => 105.3080,
            'acquisition_year' => 1986,
            'acquisition_value' => 32000000000,
            'book_value' => 32000000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 45000,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00018/Metro/1988',
            'certificate_date' => '1988-06-25',
            'custodian_name' => 'Dinas Pertanian / BPKAD',
            'notes' => 'Pusat pelatihan petani dan uji varietas tanaman pangan unggulan.'
        ],
        [
            'asset_code' => '03.07.01.06.028',
            'register_number' => '000206',
            'name' => 'Gedung Samsat Pembantu Kotabumi Lampung Utara',
            'category_id' => 'kib-c',
            'opd_id' => 2,
            'regency_name' => 'Kabupaten Lampung Utara',
            'district' => 'Kotabumi',
            'address' => 'Jl. Alamsyah Ratu Perprawanegara No. 12, Kotabumi',
            'latitude' => -4.8120,
            'longitude' => 104.8850,
            'acquisition_year' => 2008,
            'acquisition_value' => 12500000000,
            'book_value' => 9375000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 1800,
            'building_floors' => 2,
            'construction_type' => 'Beton Bertulang',
            'imb_number' => 'IMB/KTB/2008/112',
            'custodian_name' => 'Bapenda / UPTD Samsat Kotabumi',
            'notes' => 'Pelayanan PKB dan BBNKB masyarakat Lampung Utara.'
        ],
        [
            'asset_code' => '01.01.01.07.030',
            'register_number' => '000007',
            'name' => 'Kawasan Rest Area Puncak Sumberjaya Lampung Barat',
            'category_id' => 'kib-a',
            'opd_id' => 10,
            'regency_name' => 'Kabupaten Lampung Barat',
            'district' => 'Sumber Jaya',
            'address' => 'Jl. Raya Lintas Liwa - Bukit Kemuning, Sumber Jaya, Kab. Lampung Barat',
            'latitude' => -5.0210,
            'longitude' => 104.3850,
            'acquisition_year' => 2012,
            'acquisition_value' => 18000000000,
            'book_value' => 18000000000,
            'condition' => 'Baik',
            'status' => 'Sewa',
            'area_sqm' => 22000,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00034/SBJ/2014',
            'certificate_date' => '2014-08-10',
            'custodian_name' => 'Disparekraf Provinsi Lampung',
            'notes' => 'Disewakan kios UMKM Kopi Robusta Liwa kepada asosiasi perkebunan setempat.'
        ],
        [
            'asset_code' => '02.03.01.04.051',
            'register_number' => '000108',
            'name' => 'Speedboat Patroli Pengawasan Pesisir 200 PK',
            'category_id' => 'kib-b',
            'opd_id' => 12,
            'regency_name' => 'Kabupaten Tanggamus',
            'district' => 'Kota Agung Barat',
            'address' => 'Pangkalan Pos Pengawasan DKP Kota Agung, Tanggamus',
            'latitude' => -5.4620,
            'longitude' => 104.6050,
            'acquisition_year' => 2021,
            'acquisition_value' => 850000000,
            'book_value' => 595000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'brand_type' => 'Fiberglass Patrol Boat Yamaha 2x100 PK',
            'capacity_spec' => '200 Horsepower / Twin Outboard Engine',
            'custodian_name' => 'Bidang Pengawasan SDKP Dinas Kelautan',
            'notes' => 'Operasi pengawasan zona penangkapan ikan Teluk Semangka dan konservasi lumba-lumba Kiluan.'
        ],
        [
            'asset_code' => '03.07.01.07.035',
            'register_number' => '000207',
            'name' => 'Gedung Workshop UPTD Balai Benih Ikan Way Kanan',
            'category_id' => 'kib-c',
            'opd_id' => 12,
            'regency_name' => 'Kabupaten Way Kanan',
            'district' => 'Blambangan Umpu',
            'address' => 'Jl. Lintas Tengah Sumatera, Blambangan Umpu',
            'latitude' => -4.4620,
            'longitude' => 104.5280,
            'acquisition_year' => 2015,
            'acquisition_value' => 6800000000,
            'book_value' => 4760000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'area_sqm' => 1200,
            'building_floors' => 1,
            'construction_type' => 'Beton dan Baja Ringan',
            'imb_number' => 'IMB/WK/2015/091',
            'custodian_name' => 'DKP UPTD Perikanan Air Tawar',
            'notes' => 'Pusat pembenihan ikan patin dan baung air tawar Way Kanan.'
        ],
        [
            'asset_code' => '01.01.01.08.041',
            'register_number' => '000008',
            'name' => 'Lahan Sentra Produksi Ternak Sukadana Lampung Timur',
            'category_id' => 'kib-a',
            'opd_id' => 2,
            'regency_name' => 'Kabupaten Lampung Timur',
            'district' => 'Sukadana',
            'address' => 'Kawasan Terpadu Peternakan Sapi, Sukadana',
            'latitude' => -5.0920,
            'longitude' => 105.6940,
            'acquisition_year' => 2005,
            'acquisition_value' => 26000000000,
            'book_value' => 26000000000,
            'condition' => 'Baik',
            'status' => 'Pinjam Pakai',
            'area_sqm' => 120000,
            'certificate_status' => 'Bersertifikat',
            'certificate_number' => 'SHP No. 00052/SKD/2007',
            'certificate_date' => '2007-09-15',
            'custodian_name' => 'Dinas Peternakan dan Kesehatan Hewan',
            'notes' => 'Status pinjam pakai dengan Balai Penelitian Veteriner untuk breeding sapi peranakan ongole (PO).'
        ],
        [
            'asset_code' => '04.08.01.04.019',
            'register_number' => '000305',
            'name' => 'Ruas Jalan Provinsi Menggala - Panaragan (Tulang Bawang - Tubaba)',
            'category_id' => 'kib-d',
            'opd_id' => 3,
            'regency_name' => 'Kabupaten Tulang Bawang',
            'district' => 'Menggala',
            'address' => 'Ruas Jalan Provinsi Menggala batas Tubaba',
            'latitude' => -4.4720,
            'longitude' => 105.1950,
            'acquisition_year' => 2020,
            'acquisition_value' => 52000000000,
            'book_value' => 44200000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'length_km' => 14.5,
            'construction_type' => 'Flexible Pavement / Aspal Hotmix AC-BC',
            'custodian_name' => 'Dinas Bina Marga dan Bina Konstruksi',
            'notes' => 'Konektivitas jalan penghubung Kabupaten Tulang Bawang menuju kompleks Kagungan Ratu Tubaba.'
        ],
        [
            'asset_code' => '02.03.01.05.062',
            'register_number' => '000109',
            'name' => 'Truk Tangki Air Bersih Kapasitas 5.000 Liter BPBD',
            'category_id' => 'kib-b',
            'opd_id' => 1,
            'regency_name' => 'Kabupaten Mesuji',
            'district' => 'Simpang Pematang',
            'address' => 'Pos Siaga Bencana Mesuji, Simpang Pematang',
            'latitude' => -4.0410,
            'longitude' => 105.4120,
            'acquisition_year' => 2021,
            'acquisition_value' => 620000000,
            'book_value' => 434000000,
            'condition' => 'Baik',
            'status' => 'Digunakan Sendiri',
            'police_number' => 'BE 9180 MZ',
            'chassis_number' => 'HINO-WU342-99120',
            'engine_number' => 'W04D-TN9912',
            'brand_type' => 'Hino Dutro 130 HD Water Tank',
            'capacity_spec' => '4009 CC / Tangki Stainless Steel 5000L',
            'custodian_name' => 'Badan Penanggulangan Bencana Daerah',
            'notes' => 'Bantuan distribusi air bersih musim kemarau di wilayah perbatasan Mesuji.'
        ],
        [
            'asset_code' => '01.01.01.09.049',
            'register_number' => '000009',
            'name' => 'Lahan Eks Perkantoran Terbengkalai Way Layap Pesawaran',
            'category_id' => 'kib-a',
            'opd_id' => 2,
            'regency_name' => 'Kabupaten Pesawaran',
            'district' => 'Gedong Tataan',
            'address' => 'Jl. Ahmad Yani, Way Layap, Kec. Gedong Tataan',
            'latitude' => -5.4150,
            'longitude' => 105.1550,
            'acquisition_year' => 1999,
            'acquisition_value' => 14000000000,
            'book_value' => 14000000000,
            'condition' => 'Rusak Berat',
            'status' => 'Usul Hapus',
            'area_sqm' => 18500,
            'certificate_status' => 'Sengketa',
            'certificate_number' => 'Register Tanah No. 91/WL/1999',
            'certificate_date' => '1999-12-01',
            'custodian_name' => 'BPKAD Provinsi Lampung',
            'notes' => 'Dalam proses penanganan hukum di Biro Hukum Setda dan usulan pelepasan/hibah aset ke Pemkab Pesawaran.'
        ]
    ];

    $stmtAsset = $db->prepare("INSERT INTO assets (
        asset_code, register_number, name, category_id, opd_id, regency_name,
        district, address, latitude, longitude, acquisition_year,
        acquisition_value, book_value, condition, status, area_sqm,
        certificate_status, certificate_number, certificate_date,
        police_number, chassis_number, engine_number, brand_type,
        capacity_spec, custodian_name, building_floors, construction_type,
        imb_number, length_km, contract_value, progress_percentage, notes
    ) VALUES (
        :asset_code, :register_number, :name, :category_id, :opd_id, :regency_name,
        :district, :address, :latitude, :longitude, :acquisition_year,
        :acquisition_value, :book_value, :condition, :status, :area_sqm,
        :certificate_status, :certificate_number, :certificate_date,
        :police_number, :chassis_number, :engine_number, :brand_type,
        :capacity_spec, :custodian_name, :building_floors, :construction_type,
        :imb_number, :length_km, :contract_value, :progress_percentage, :notes
    )");

    foreach ($sampleAssets as $asset) {
        $data = [
            ':asset_code' => $asset['asset_code'],
            ':register_number' => $asset['register_number'],
            ':name' => $asset['name'],
            ':category_id' => $asset['category_id'],
            ':opd_id' => $asset['opd_id'],
            ':regency_name' => $asset['regency_name'],
            ':district' => $asset['district'] ?? null,
            ':address' => $asset['address'] ?? null,
            ':latitude' => $asset['latitude'] ?? null,
            ':longitude' => $asset['longitude'] ?? null,
            ':acquisition_year' => $asset['acquisition_year'],
            ':acquisition_value' => $asset['acquisition_value'],
            ':book_value' => $asset['book_value'],
            ':condition' => $asset['condition'],
            ':status' => $asset['status'],
            ':area_sqm' => $asset['area_sqm'] ?? null,
            ':certificate_status' => $asset['certificate_status'] ?? null,
            ':certificate_number' => $asset['certificate_number'] ?? null,
            ':certificate_date' => $asset['certificate_date'] ?? null,
            ':police_number' => $asset['police_number'] ?? null,
            ':chassis_number' => $asset['chassis_number'] ?? null,
            ':engine_number' => $asset['engine_number'] ?? null,
            ':brand_type' => $asset['brand_type'] ?? null,
            ':capacity_spec' => $asset['capacity_spec'] ?? null,
            ':custodian_name' => $asset['custodian_name'] ?? null,
            ':building_floors' => $asset['building_floors'] ?? null,
            ':construction_type' => $asset['construction_type'] ?? null,
            ':imb_number' => $asset['imb_number'] ?? null,
            ':length_km' => $asset['length_km'] ?? null,
            ':contract_value' => $asset['contract_value'] ?? null,
            ':progress_percentage' => $asset['progress_percentage'] ?? null,
            ':notes' => $asset['notes'] ?? null
        ];
        $stmtAsset->execute($data);
    }

    // Seed beberapa data pemeliharaan untuk aset kendaraan & mesin
    $db->exec("INSERT INTO maintenance_logs (asset_id, maintenance_date, description, cost, service_provider, technician) VALUES 
        (6, '2024-08-15', 'Servis berkala 20.000 KM, ganti oli mesin sintetis, filter udara, filter bahan bakar, balancing & spooring roda', 4500000, 'Auto2000 Raden Intan Bandar Lampung', 'Budi Santoso'),
        (7, '2024-07-20', 'Servis berkala 30.000 KM, kuras minyak rem, tune up sistem hybrid, ganti busi iridium', 3800000, 'Auto2000 Raden Intan Bandar Lampung', 'Agus Prayitno'),
        (8, '2024-09-02', 'Kalibrasi tahunan perangkat medis CT-Scan & penggantian tube X-ray tabung pelindung', 85000000, 'PT Siemens Healthineers Indonesia', 'Eng. Marcus Tan'),
        (10, '2024-06-10', 'Penggantian filter hidrolik, oli swing motor, dan track shoe baut arm excavator', 18500000, 'United Tractors Branch Lampung', 'Hendra Wijaya')
    ");
}

