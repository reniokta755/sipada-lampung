@echo off
title SIPADA LAMPUNG - Server Web Aset Daerah
echo =====================================================================
echo  SIPADA LAMPUNG - SISTEM INFORMASI & PENCATATAN ASET DAERAH
echo  Badan Pengelolaan Keuangan dan Aset Daerah (BPKAD) Prov. Lampung
echo =====================================================================
echo.
echo Sedang memulai server PHP lokal di http://localhost:8080 ...

:: Buka browser secara otomatis setelah jeda singkat
start "" http://localhost:8080

:: Jalankan server PHP bawaan dari XAMPP
if exist "C:\xampp\php\php.exe" (
    "C:\xampp\php\php.exe" -S localhost:8080
) else (
    php -S localhost:8080
)

pause

