// assets/js/dashboard.js - Visualisasi Grafik & Analytics Chart.js

const DashboardCharts = {
    charts: {},

    updateData(stats) {
        this.stats = stats;
        this.render();
    },

    render() {
        if (!this.stats) return;

        this.renderKibDoughnut();
        this.renderOpdBar();
        this.renderTrendYear();
        this.renderConditionChart();
        this.renderCertificationChart();
        this.renderRegencyBar();
    },

    // 1. Donut Chart: Komposisi Nilai KIB A - F
    renderKibDoughnut() {
        const ctx = document.getElementById('chartKibComposition');
        if (!ctx) return;

        if (this.charts.kib) this.charts.kib.destroy();

        const data = this.stats.by_category;
        const labels = data.map(d => `${d.kib_type} (${d.name})`);
        const values = data.map(d => d.total_value);
        const colors = data.map(d => d.color);

        this.charts.kib = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 },
                            boxWidth: 12,
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                return ' ' + App.formatRupiah(val);
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    },

    // 2. Horizontal Bar Chart: Top 10 OPD dengan Nilai Aset Terbesar
    renderOpdBar() {
        const ctx = document.getElementById('chartTopOpd');
        if (!ctx) return;

        if (this.charts.opd) this.charts.opd.destroy();

        const data = this.stats.top_opd.slice(0, 8);
        const labels = data.map(d => d.alias || d.name);
        const values = data.map(d => d.total_value);

        this.charts.opd = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Nilai Aset (Rp)',
                    data: values,
                    backgroundColor: '#0f172a',
                    hoverBackgroundColor: '#f59e0b',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return ' Total: ' + App.formatRupiah(ctx.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: true, color: '#f1f5f9' },
                        ticks: {
                            font: { family: 'Plus Jakarta Sans', size: 10 },
                            callback: function(value) {
                                return App.formatRupiahShort(value);
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            font: { family: 'Plus Jakarta Sans', size: 10, weight: 600 }
                        }
                    }
                }
            }
        });
    },

    // 3. Line/Bar: Tren Pengadaan Tiap Tahun
    renderTrendYear() {
        const ctx = document.getElementById('chartYearTrend');
        if (!ctx) return;

        if (this.charts.trend) this.charts.trend.destroy();

        const data = this.stats.by_year;
        const labels = data.map(d => d.year);
        const counts = data.map(d => d.count);
        const values = data.map(d => d.total_value);

        this.charts.trend = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: 'Nilai Perolehan (Rp)',
                        data: values,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        yAxisID: 'yValue',
                        fill: true
                    },
                    {
                        type: 'bar',
                        label: 'Jumlah Unit Pengadaan',
                        data: counts,
                        backgroundColor: '#94a3b8',
                        borderRadius: 4,
                        yAxisID: 'yCount'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { family: 'Plus Jakarta Sans', size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.dataset.yAxisID === 'yValue') {
                                    return ' Nilai: ' + App.formatRupiah(ctx.raw);
                                }
                                return ' Jumlah: ' + ctx.raw + ' unit';
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    yValue: {
                        type: 'linear',
                        position: 'left',
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            callback: function(val) {
                                return App.formatRupiahShort(val);
                            }
                        }
                    },
                    yCount: {
                        type: 'linear',
                        position: 'right',
                        grid: { display: false },
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    },

    // 4. Doughnut: Kondisi Fisik Barang
    renderConditionChart() {
        const ctx = document.getElementById('chartCondition');
        if (!ctx) return;

        if (this.charts.cond) this.charts.cond.destroy();

        const data = this.stats.by_condition;
        const labels = data.map(d => d.condition);
        const values = data.map(d => d.count);

        const colorMap = {
            'Baik': '#10b981',
            'Rusak Ringan': '#f59e0b',
            'Rusak Berat': '#ef4444'
        };

        this.charts.cond = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: labels.map(l => colorMap[l] || '#94a3b8'),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                },
                cutout: '70%'
            }
        });
    },

    // 5. Pie: Status Sertifikasi Tanah KIB A
    renderCertificationChart() {
        const ctx = document.getElementById('chartCertification');
        if (!ctx) return;

        if (this.charts.cert) this.charts.cert.destroy();

        const data = this.stats.by_certification;
        const labels = data.map(d => d.status);
        const values = data.map(d => d.count);

        const colorMap = {
            'Bersertifikat': '#10b981',
            'Proses': '#f59e0b',
            'Belum': '#94a3b8',
            'Sengketa': '#ef4444'
        };

        this.charts.cert = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: labels.map(l => colorMap[l] || '#cbd5e1'),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    },

    // 6. Bar: Distribusi Sebaran di Kab/Kota
    renderRegencyBar() {
        const ctx = document.getElementById('chartRegency');
        if (!ctx) return;

        if (this.charts.reg) this.charts.reg.destroy();

        const data = this.stats.by_regency;
        const labels = data.map(d => d.regency_name.replace('Kabupaten ', 'Kab. '));
        const values = data.map(d => d.count);

        this.charts.reg = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unit Aset',
                    data: values,
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 45 },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { precision: 0 },
                        grid: { color: '#f1f5f9' }
                    }
                }
            }
        });
    }
};

window.DashboardCharts = DashboardCharts;

