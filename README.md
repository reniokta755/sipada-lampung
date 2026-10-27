# SIPADA LAMPUNG - Dashboard & Sistem Informasi Pencatatan Aset Daerah
### Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD) Pemerintah Provinsi Lampung
> Terinspirasi dari portal transparansi aset daerah [dashboard_aset.sumbarprov.go.id](https://dashboard_aset.sumbarprov.go.id/)

---

## 🏛️ Tentang Aplikasi

**SIPADA LAMPUNG** adalah platform sistem informasi dan dashboard interaktif pengelolaan **Barang Milik Daerah (BMD)** untuk Pemerintah Provinsi Lampung. Sistem ini dirancang untuk transparansi publik dan administrasi internal pengurus barang daerah sesuai standar **Permendagri No. 19 Tahun 2016** dan **Permendagri No. 47 Tahun 2021**.

Aplikasi ini mencakup pencatatan, pemantauan sertifikasi tanah (PTSL), pendataan kendaraan operasional dinas berplat **BE**, penatausahaan aset idle/pemanfaatan sewa untuk PAD, visualisasi geografis **WebGIS 15 Kabupaten/Kota**, hingga pencetakan **Berita Acara Rekapitulasi** dan **Stiker Label Barcode/QR Code** fisik barang.

---

## 🌟 Fitur Unggulan

### 1. Dashboard Eksekutif & Statistik Interaktif
- **Ringkasan Indikator KPI Utama**:
  - Total Nilai Perolehan BMD Daerah (hingga skala Triliun Rupiah).
  - Total Kuantitas Unit Barang teregistrasi.
  - Nilai Buku Akuntansi setelah penyusutan.
  - Rasio Sertifikasi Tanah KIB A (SHP/HPL Pemprov Lampung).
  - Persentase Kondisi Fisik Barang (Baik, Rusak Ringan, Rusak Berat).
  - Nilai Aset Dimanfaatkan (Sewa, Pinjam Pakai, KSP) & Nilai Aset Idle.
- **Visualisasi Chart.js**:
  - Komposisi nilai per Kategori KIB A - F (Doughnut Chart).
  - Top OPD dengan nilai aset terbesar (Horizontal Bar).
  - Tren pengadaan aset per tahun (Line & Bar Chart gabungan).
  - Status kondisi fisik & rasio sertifikasi tanah (Pie/Donut).
  - Distribusi sebaran aset di 15 Kabupaten/Kota.

### 2. Peta Sebaran Interaktif (WebGIS Leaflet.js)
- Peta sebaran titik koordinat aset di seluruh wilayah Provinsi Lampung:
  - Kota Bandar Lampung, Kota Metro, Lampung Selatan, Lampung Tengah, Lampung Utara, Lampung Barat, Lampung Timur, Tanggamus, Way Kanan, Tulang Bawang, Pesawaran, Pringsewu, Mesuji, Tulang Bawang Barat, dan Pesisir Barat.
- Pin marker berwarna khusus tiap kategori KIB.
- Popup interaktif dengan foto, nama barang, kode aset, OPD, nilai perolehan, status, dan tombol rute ke **Google Maps**.
- Filter titik langsung berdasarkan Kategori KIB dan Kabupaten/Kota.

### 3. Klasifikasi Standar KIB (Kartu Inventaris Barang)
- **KIB A (Tanah)**: Luas m², status sertifikat (SHP/Proses BPN/Sengketa), nomor sertifikat, tanggal terbit, peruntukan.
- **KIB B (Peralatan & Mesin)**: Nomor polisi plat merah (BE), merk/tipe, CC/kapasitas, nomor rangka & mesin, pemegang aset.
- **KIB C (Gedung & Bangunan)**: Luas lantai, jumlah tingkat, tipe konstruksi, nomor IMB/PBG.
- **KIB D (Jalan, Irigasi & Jaringan)**: Panjang ruas (Km), tipe konstruksi (rigid/aspal), kondisi saluran.
- **KIB E (Aset Tetap Lainnya)**: Koleksi budaya Museum Negeri Ruwa Jurai, naskah kuno, buku perpustakaan daerah.
- **KIB F (Konstruksi Dalam Pengerjaan / KDP)**: Pagu kontrak proyek, realisasi persentase fisik pembangunan.

### 4. Pencatatan & Manajemen Aset (CRUD)
- Formulir multi-tab berstandar SIMBADA:
  - Tab 1: Identitas & Nilai Akuntansi.
  - Tab 2: Spesifikasi Khusus Kategori KIB.
  - Tab 3: Lokasi & Picker Koordinat Peta GPS (bisa klik atau seret pin peta untuk mengisi lat/lng otomatis).
- Auto-generate kodefikasi barang dan nomor register.
- Pengaturan Mode Petugas BMD vs Mode Transparansi Publik.

### 5. Riwayat Pemeliharaan / Servis Aset
- Modul pencatatan servis berkala kendaraan operasional atau perbaikan fasilitas gedung dinas.
- Menyimpan tanggal pengerjaan, rincian servis, biaya perbaikan, bengkel/rekanan penyedia, dan nama teknisi.

### 6. Cetak Berita Acara & Label Stiker QR Code
- **Cetak Berita Acara Rekapitulasi BMD**: Format resmi surat dinas lengkap dengan Kop Surat Pemprov Lampung, tabel rekapitulasi KIB A-F, dan lembar pengesahan tanda tangan Kepala BPKAD dan Pejabat Penatausahaan Pengguna Barang.
- **Cetak Stiker Label Inventaris**: Label stiker ukuran 90mm x 48mm standar BPKAD dilengkapi kode QR untuk ditempel di fisik barang dan memudahkan inventarisasi lapangan.
- **Export Data**: Unduh seluruh daftar aset ke format spreadsheet Excel (CSV).

---

## 🚀 Cara Menjalankan Aplikasi

### Metode 1: Satu Klik (Windows)
Cukup klik ganda (double click) file:
```bash
run.bat
```
Browser akan otomatis terbuka dan menampilkan website di `http://localhost:8080`.

### Metode 2: Melalui Terminal / PowerShell
Pastikan Anda berada di direktori project `d:\Belajaragent`, lalu jalankan:
```powershell
& "C:\xampp\php\php.exe" -S localhost:8080
```
Lalu buka peramban web dan kunjungi:
```
http://localhost:8080
```

---

## 📁 Struktur Direktori

```
d:\Belajaragent\
├── api/
│   ├── assets.php            # Endpoint CRUD data aset, filter & pagination
│   ├── categories.php        # Endpoint kategori KIB A - F
│   ├── maintenance.php       # Endpoint riwayat servis & pemeliharaan
│   ├── opd.php               # Endpoint daftar Organisasi Perangkat Daerah
│   └── stats.php             # Endpoint agregasi metrik & statistik grafik
├── assets/
│   ├── css/
│   │   └── style.css         # Styling kustom, motif Tapis, dan print layout
│   ├── img/
│   │   ├── logo-lampung.svg  # Vektor resmi Lambang Provinsi Lampung
│   │   └── siger-gold.svg    # Ornamen Menara Siger khas Lampung
│   └── js/
│       ├── app.js            # State management, modal form, filter & navigasi
│       ├── dashboard.js      # Konfigurasi visualisasi Chart.js
│       └── map.js            # Integrasi WebGIS Leaflet.js
├── config/
│   └── database.php          # Koneksi SQLite & pembuat skema seeder otomatis
├── data/
│   └── assets.sqlite         # Database lokal SQLite (berisi puluhan aset riil Lampung)
├── index.php                 # Halaman utama portal transparansi & sistem pencatatan
├── run.bat                   # Skrip instan peluncur server lokal Windows
└── README.md                 # Dokumentasi proyek
```

---

## 🛡️ Semboyan Daerah
> **"Sang Bumi Ruwa Jurai"** — Lambang persatuan masyarakat adat Lampung (Saibatin dan Pepadun) yang rukun, damai, dan sejahtera.

