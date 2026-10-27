# 🚀 Panduan Deploy SIPADA Lampung ke Vercel

Website **SIPADA LAMPUNG** telah dioptimalkan agar **100% kompatibel dan siap dideploy langsung ke Vercel** tanpa memerlukan server PHP atau database eksternal. Semua fitur (Dashboard, Grafik Chart.js, Peta WebGIS Leaflet, CRUD Aset, Export Excel, Cetak QR Code, & Cetak Berita Acara) berjalan cepat di Edge CDN Vercel.

---

## 🎯 Cara 1: Deploy Lewat GitHub (Sangat Disarankan & Praktis)

Ini adalah cara paling umum dan otomatis di Vercel:

### Langkah 1: Buat Repositori di GitHub
1. Buka [github.com](https://github.com) dan login ke akun Anda.
2. Klik tombol **New Repository**.
3. Beri nama repositori, misalnya: `sipada-lampung`.
4. Pilih **Public** (atau Private), biarkan centang README kosong, lalu klik **Create repository**.

### Langkah 2: Hubungkan & Push dari Komputer Anda
Buka terminal PowerShell di folder `d:\Belajaragent`, lalu jalankan:

```powershell
# Ganti URL di bawah dengan URL repository GitHub Anda
git remote add origin https://github.com/USERNAME_ANDA/sipada-lampung.git
git branch -M main
git push -u origin main
```

### Langkah 3: Import ke Vercel
1. Buka [vercel.com](https://vercel.com) dan login (bisa login menggunakan akun GitHub).
2. Di halaman Dashboard Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Pilih repositori `sipada-lampung` dari daftar GitHub Anda, lalu klik **"Import"**.
4. Pada bagian *Project Configuration*:
   - **Framework Preset**: Biarkan **Other** / default.
   - **Root Directory**: `./` (default).
5. Klik tombol **Deploy**.
6. Selesai! Dalam hitungan detik website Anda akan langsung aktif dengan link publik gratis, misalnya:
   👉 `https://sipada-lampung.vercel.app`

---

## ⚡ Cara 2: Deploy Menggunakan Vercel CLI

Jika Anda memiliki Node.js di komputer:

1. Buka PowerShell dan instal Vercel CLI:
   ```powershell
   npm install -g vercel
   ```
2. Jalankan perintah deploy di folder project:
   ```powershell
   cd d:\Belajaragent
   vercel
   ```
3. Ikuti petunjuk di layar (tekan `Enter` untuk konfirmasi default).
4. Untuk deploy ke production:
   ```powershell
   vercel --prod
   ```

---

## 📁 File Konfigurasi Vercel yang Disediakan

- [`vercel.json`](file:///d:/Belajaragent/vercel.json): Mengatur routing otomatis, clean URLs, dan header caching untuk performa tinggi.
- [`index.html`](file:///d:/Belajaragent/index.html): Halaman utama statis berstandar Vercel dengan preloaded database 34 aset Pemprov Lampung.
- [`assets/js/db.js`](file:///d:/Belajaragent/assets/js/db.js): Database awal resmi 15 Kabupaten/Kota, OPD, dan Kategori KIB.
- [`assets/js/store.js`](file:///d:/Belajaragent/assets/js/store.js): Engine database di browser (LocalStorage) yang memungkinkan fitur Tambah, Edit, Hapus, dan Filter tetap berjalan interaktif di Vercel.

