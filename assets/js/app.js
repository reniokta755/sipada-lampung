// assets/js/app.js - State Management, Routing & Core Functions (Vercel & Local Ready)

const App = {
    state: {
        activeTab: 'dashboard',
        adminMode: false,
        stats: null,
        categories: [],
        opds: [],
        regencies: [],
        assets: [],
        totalRows: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 15,
        filters: {
            search: '',
            category_id: '',
            opd_id: '',
            regency: '',
            condition: '',
            status: '',
            certificate_status: '',
            sensus_status: ''
        },
        selectedAsset: null,
        mapPickerMarker: null,
        pickerMap: null,
        html5QrCode: null,
        tempUploadedImage: null
    },

    // Format Rupiah Standar Akuntansi Pemerintah
    formatRupiah(num) {
        if (!num && num !== 0) return 'Rp 0';
        return 'Rp ' + Number(num).toLocaleString('id-ID');
    },

    // Format Singkat (Triliun, Miliar, Juta) untuk KPI Cards
    formatRupiahShort(num) {
        if (!num) return 'Rp 0';
        num = Number(num);
        if (num >= 1000000000000) {
            return 'Rp ' + (num / 1000000000000).toFixed(2).replace('.', ',') + ' T';
        } else if (num >= 1000000000) {
            return 'Rp ' + (num / 1000000000).toFixed(2).replace('.', ',') + ' M';
        } else if (num >= 1000000) {
            return 'Rp ' + (num / 1000000).toFixed(1).replace('.', ',') + ' Jt';
        }
        return 'Rp ' + num.toLocaleString('id-ID');
    },

    // Format Luas Area
    formatArea(sqm) {
        if (!sqm) return '-';
        if (sqm >= 10000) {
            const ha = sqm / 10000;
            return sqm.toLocaleString('id-ID') + ` m² (${ha.toFixed(2)} Ha)`;
        }
        return sqm.toLocaleString('id-ID') + ' m²';
    },

    async init() {
        if (window.Store) {
            Store.init();
        }

        this.setupEventListeners();
        await this.loadInitialMetadata();
        await this.loadDashboardStats();
        await this.loadAssetsTable();
        
        // Deep-link tab
        const hash = window.location.hash.replace('#', '');
        if (hash && ['dashboard', 'map', 'inventory', 'land', 'vehicles', 'utilization', 'reports'].includes(hash)) {
            this.switchTab(hash);
        }
    },

    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Search Input (Debounce)
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.state.filters.search = e.target.value;
                    this.state.currentPage = 1;
                    this.loadAssetsTable();
                }, 300);
            });
        }

        // Filter Selectors
        ['filterCategory', 'filterOpd', 'filterRegency', 'filterCondition', 'filterStatus', 'filterSensus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => {
                    this.state.filters.category_id = document.getElementById('filterCategory').value;
                    this.state.filters.opd_id = document.getElementById('filterOpd').value;
                    this.state.filters.regency = document.getElementById('filterRegency').value;
                    this.state.filters.condition = document.getElementById('filterCondition').value;
                    this.state.filters.status = document.getElementById('filterStatus').value;
                    if (document.getElementById('filterSensus')) {
                        this.state.filters.sensus_status = document.getElementById('filterSensus').value;
                    }
                    this.state.currentPage = 1;
                    this.loadAssetsTable();
                    if (this.state.activeTab === 'map' && window.GISMap) {
                        GISMap.filterMarkers();
                    }
                });
            }
        });

        // Reset Filter
        const resetBtn = document.getElementById('btnResetFilter');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Toggle Admin Mode
        const adminToggle = document.getElementById('toggleAdminMode');
        if (adminToggle) {
            adminToggle.addEventListener('change', (e) => {
                this.state.adminMode = e.target.checked;
                this.updateAdminModeUI();
            });
        }

        // Tombol Tambah Aset
        const btnAdd = document.getElementById('btnOpenAddModal');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.openAssetModal(null);
            });
        }

        // Form Submit
        const form = document.getElementById('assetForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAssetForm();
            });
        }

        // Form Photo Upload Listener
        const fileInput = document.getElementById('formImageFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e);
            });
        }

        // Form Kategori Switcher (Show/Hide tab form spesifik)
        const catSelect = document.getElementById('formCategory');
        if (catSelect) {
            catSelect.addEventListener('change', (e) => {
                this.adjustFormFieldsForCategory(e.target.value);
            });
        }

        // Form Tab Switchers in Modal
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.modalTab;
                document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active', 'border-amber-500', 'text-amber-600', 'font-bold'));
                document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));
                
                btn.classList.add('active', 'border-amber-500', 'text-amber-600', 'font-bold');
                const contentEl = document.getElementById(`modalTab_${target}`);
                if (contentEl) contentEl.classList.remove('hidden');

                if (target === 'location') {
                    setTimeout(() => {
                        this.initOrInvalidatePickerMap();
                    }, 200);
                }
            });
        });
    },

    resetFilters() {
        this.state.filters = {
            search: '',
            category_id: '',
            opd_id: '',
            regency: '',
            condition: '',
            status: '',
            certificate_status: '',
            sensus_status: ''
        };
        const searchInput = document.getElementById('globalSearchInput');
        if (searchInput) searchInput.value = '';
        ['filterCategory', 'filterOpd', 'filterRegency', 'filterCondition', 'filterStatus', 'filterSensus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.state.currentPage = 1;
        this.loadAssetsTable();
        if (this.state.activeTab === 'map' && window.GISMap) {
            GISMap.filterMarkers();
        }
    },

    updateAdminModeUI() {
        const badge = document.getElementById('modeBadge');
        if (badge) {
            if (this.state.adminMode) {
                badge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm';
                badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Mode Petugas BMD (Aktif)';
            } else {
                badge.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 flex items-center gap-1.5';
                badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Mode Transparansi Publik';
            }
        }

        // Tampilkan tombol admin action
        document.querySelectorAll('.admin-only').forEach(el => {
            if (this.state.adminMode) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
    },

    switchTab(tabName) {
        this.state.activeTab = tabName;
        window.location.hash = tabName;

        // Update tab nav buttons
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active', 'border-b-2', 'border-amber-500', 'text-amber-500', 'font-bold');
                btn.classList.remove('text-slate-400', 'border-transparent');
            } else {
                btn.classList.remove('active', 'border-b-2', 'border-amber-500', 'text-amber-500', 'font-bold');
                btn.classList.add('text-slate-400', 'border-transparent');
            }
        });

        // Hide all tab views
        document.querySelectorAll('.tab-view-content').forEach(view => {
            view.classList.add('hidden');
        });

        // Show active view
        const activeView = document.getElementById(`view_${tabName}`);
        if (activeView) {
            activeView.classList.remove('hidden');
        }

        // Callback khusus tab
        if (tabName === 'map') {
            setTimeout(() => {
                if (window.GISMap) {
                    GISMap.initOrResize();
                }
            }, 100);
        } else if (tabName === 'dashboard') {
            if (window.DashboardCharts) {
                DashboardCharts.render();
            }
        } else if (tabName === 'land') {
            this.loadLandSpecificView();
        } else if (tabName === 'vehicles') {
            this.loadVehicleSpecificView();
        } else if (tabName === 'utilization') {
            this.loadUtilizationView();
        } else if (tabName === 'reports') {
            this.loadReportView();
        }
    },

    async loadInitialMetadata() {
        try {
            let catData, opdData;
            if (window.Store) {
                catData = Store.getCategories();
                opdData = Store.getOpds();
            } else {
                const [catRes, opdRes] = await Promise.all([
                    fetch('api/categories.php').then(r => r.json()),
                    fetch('api/opd.php').then(r => r.json())
                ]);
                catData = catRes.data;
                opdData = opdRes.data;
            }

            this.state.categories = catData;
            this.populateCategoryDropdowns(catData);

            this.state.opds = opdData;
            this.populateOpdDropdowns(opdData);
        } catch (err) {
            console.error('Gagal memuat metadata awal:', err);
        }
    },

    populateCategoryDropdowns(categories) {
        const filterEl = document.getElementById('filterCategory');
        const formEl = document.getElementById('formCategory');
        
        let filterHtml = '<option value="">Semua Kategori (KIB A - F)</option>';
        let formHtml = '<option value="">Pilih Kategori KIB...</option>';

        categories.forEach(c => {
            filterHtml += `<option value="${c.id}">${c.kib_type} - ${c.name} (${c.asset_count})</option>`;
            formHtml += `<option value="${c.id}">${c.kib_type} - ${c.name}</option>`;
        });

        if (filterEl) filterEl.innerHTML = filterHtml;
        if (formEl) formEl.innerHTML = formHtml;
    },

    populateOpdDropdowns(opds) {
        const filterEl = document.getElementById('filterOpd');
        const formEl = document.getElementById('formOpd');

        let filterHtml = '<option value="">Semua OPD / SKPD</option>';
        let formHtml = '<option value="">Pilih OPD / Penanggung Jawab...</option>';

        opds.forEach(o => {
            filterHtml += `<option value="${o.id}">${o.alias || o.name}</option>`;
            formHtml += `<option value="${o.id}">${o.name} (${o.alias})</option>`;
        });

        if (filterEl) filterEl.innerHTML = filterHtml;
        if (formEl) formEl.innerHTML = formHtml;
    },

    async loadDashboardStats() {
        try {
            let result;
            if (window.Store) {
                result = Store.getStats();
            } else {
                const res = await fetch('api/stats.php');
                result = await res.json();
            }

            if (result.success) {
                this.state.stats = result;
                this.renderDashboardKPI(result);
                if (window.DashboardCharts) {
                    DashboardCharts.updateData(result);
                }
            }
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        }
    },

    renderDashboardKPI(stats) {
        const sum = stats.summary;
        
        // Total Nilai Aset
        const elTotalVal = document.getElementById('kpiTotalValue');
        if (elTotalVal) elTotalVal.textContent = this.formatRupiahShort(sum.total_acquisition_value);
        
        const elTotalValFull = document.getElementById('kpiTotalValueFull');
        if (elTotalValFull) elTotalValFull.textContent = this.formatRupiah(sum.total_acquisition_value);

        // Total Unit Aset
        const elTotalCount = document.getElementById('kpiTotalCount');
        if (elTotalCount) elTotalCount.textContent = Number(sum.total_assets).toLocaleString('id-ID');

        // Total Nilai Buku
        const elBookVal = document.getElementById('kpiBookValue');
        if (elBookVal) elBookVal.textContent = this.formatRupiahShort(sum.total_book_value);

        // Rasio Sertifikasi Tanah KIB A
        let certifiedCount = 0;
        let totalLand = 0;
        stats.by_certification.forEach(c => {
            totalLand += Number(c.count);
            if (c.status === 'Bersertifikat') certifiedCount += Number(c.count);
        });
        const certRatio = totalLand > 0 ? ((certifiedCount / totalLand) * 100).toFixed(1) : 0;
        const elCertRatio = document.getElementById('kpiCertRatio');
        if (elCertRatio) elCertRatio.textContent = certRatio + '%';

        // Persentase Kondisi Baik
        let goodCount = 0;
        stats.by_condition.forEach(c => {
            if (c.condition === 'Baik') goodCount += Number(c.count);
        });
        const goodRatio = sum.total_assets > 0 ? ((goodCount / sum.total_assets) * 100).toFixed(1) : 0;
        const elGoodRatio = document.getElementById('kpiGoodRatio');
        if (elGoodRatio) elGoodRatio.textContent = goodRatio + '%';

        // Aset Dimanfaatkan & Idle
        let idleCount = 0;
        let idleValue = 0;
        let utilCount = 0;
        let utilValue = 0;
        stats.by_status.forEach(s => {
            if (s.status === 'Idle') {
                idleCount = s.count;
                idleValue = s.total_value;
            } else if (['Pinjam Pakai', 'Sewa', 'KSP'].includes(s.status)) {
                utilCount += Number(s.count);
                utilValue += Number(s.total_value);
            }
        });
        const elIdle = document.getElementById('kpiIdleValue');
        if (elIdle) elIdle.textContent = this.formatRupiahShort(idleValue) + ` (${idleCount} aset)`;

        const elUtil = document.getElementById('kpiUtilValue');
        if (elUtil) elUtil.textContent = this.formatRupiahShort(utilValue) + ` (${utilCount} aset)`;

        // Render Kartu KIB Mini
        this.renderCategoryCards(stats.by_category);
    },

    renderCategoryCards(categories) {
        const container = document.getElementById('kibCardsContainer');
        if (!container) return;

        let html = '';
        categories.forEach(c => {
            html += `
                <div onclick="App.filterByCategoryQuick('${c.id}')" class="glass-card hover:border-amber-400 cursor-pointer transition-all duration-200 p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md flex flex-col justify-between group">
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2 py-0.5 text-xs font-bold rounded" style="background-color: ${c.color}15; color: ${c.color}">
                            ${c.kib_type}
                        </span>
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background-color: ${c.color}20; color: ${c.color}">
                            <i class="fa-solid ${c.icon}"></i>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-1">${c.name}</h4>
                        <div class="text-lg font-bold text-slate-900 mt-1">${this.formatRupiahShort(c.total_value)}</div>
                        <div class="text-xs text-slate-500 mt-0.5">${Number(c.count).toLocaleString('id-ID')} Barang Tercatat</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    filterByCategoryQuick(catId) {
        this.switchTab('inventory');
        const filterCat = document.getElementById('filterCategory');
        if (filterCat) filterCat.value = catId;
        this.state.filters.category_id = catId;
        this.state.currentPage = 1;
        this.loadAssetsTable();
    },

    async loadAssetsTable() {
        const tbody = document.getElementById('assetTableBody');
        const emptyState = document.getElementById('tableEmptyState');
        const countInfo = document.getElementById('tableCountInfo');
        const filteredValInfo = document.getElementById('tableFilteredValue');

        try {
            let result;
            const filterParams = {
                page: this.state.currentPage,
                limit: this.state.limit,
                search: this.state.filters.search,
                category_id: this.state.filters.category_id,
                opd_id: this.state.filters.opd_id,
                regency: this.state.filters.regency,
                condition: this.state.filters.condition,
                status: this.state.filters.status,
                certificate_status: this.state.filters.certificate_status,
                sensus_status: this.state.filters.sensus_status
            };

            if (window.Store) {
                result = Store.getAssets(filterParams);
            } else {
                const params = new URLSearchParams(filterParams);
                const res = await fetch(`api/assets.php?${params.toString()}`);
                result = await res.json();
            }

            if (!result.success) {
                if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-rose-500 font-medium">Gagal memuat data</td></tr>`;
                return;
            }

            this.state.assets = result.data;
            this.state.totalRows = result.total_rows;
            this.state.totalPages = result.total_pages;

            if (countInfo) {
                countInfo.textContent = `Menampilkan ${result.data.length} dari ${result.total_rows.toLocaleString('id-ID')} data aset daerah`;
            }
            if (filteredValInfo) {
                filteredValInfo.textContent = `Total Nilai Terfilter: ${this.formatRupiah(result.filtered_total_value)}`;
            }

            if (result.data.length === 0) {
                if (tbody) tbody.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                this.renderPagination();
                return;
            }

            if (emptyState) emptyState.classList.add('hidden');
            this.renderTableRows(result.data);
            this.renderPagination();

        } catch (err) {
            console.error('Error loading assets table:', err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-rose-500">Terjadi kesalahan memuat tabel</td></tr>`;
        }
    },

    renderTableRows(data) {
        const tbody = document.getElementById('assetTableBody');
        if (!tbody) return;

        let html = '';
        data.forEach(item => {
            // Pill Kondisi
            let condBadge = '';
            if (item.condition === 'Baik') {
                condBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Baik</span>';
            } else if (item.condition === 'Rusak Ringan') {
                condBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Rusak Ringan</span>';
            } else {
                condBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Rusak Berat</span>';
            }

            // Pill Status Pemanfaatan
            let statusBadge = '';
            if (item.status === 'Digunakan Sendiri') {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Operasional</span>';
            } else if (item.status === 'Idle') {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold animate-pulse">Aset Idle</span>';
            } else if (item.status === 'Sewa' || item.status === 'KSP') {
                statusBadge = `<span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">${item.status}</span>`;
            } else if (item.status === 'Pinjam Pakai') {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">Pinjam Pakai</span>';
            } else {
                statusBadge = '<span class="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">Usul Hapus</span>';
            }

            // Pill Status Sensus
            let sensusBadge = item.sensus_status === 'Terverifikasi' 
                ? '<span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1" title="Telah Disensus Fisik"><i class="fa-solid fa-check-circle"></i> Sensus OK</span>'
                : '<span class="text-[10px] text-slate-400 font-medium flex items-center gap-1" title="Menunggu Verifikasi Fisik"><i class="fa-regular fa-clock"></i> Belum Sensus</span>';

            // Atribut Spesifik Aset
            let extraSpec = '';
            if (item.category_id === 'kib-a' && item.area_sqm) {
                extraSpec = `<span class="text-xs text-slate-500"><i class="fa-regular fa-square"></i> ${this.formatArea(item.area_sqm)}</span>`;
            } else if (item.category_id === 'kib-b' && item.police_number) {
                extraSpec = `<span class="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded"><i class="fa-solid fa-hashtag text-slate-400"></i> ${item.police_number}</span>`;
            } else if (item.category_id === 'kib-d' && item.length_km) {
                extraSpec = `<span class="text-xs text-slate-500"><i class="fa-solid fa-ruler-horizontal"></i> ${item.length_km} Km</span>`;
            } else if (item.category_id === 'kib-f' && item.progress_percentage !== null) {
                extraSpec = `<span class="text-xs font-bold text-emerald-600"><i class="fa-solid fa-bars-progress"></i> Progres ${item.progress_percentage}%</span>`;
            }

            // Foto Thumbnail
            let photoThumb = item.image_url 
                ? `<div class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200"><img src="${item.image_url}" class="w-full h-full object-cover"></div>`
                : `<div class="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center text-slate-400"><i class="fa-solid fa-image text-xs"></i></div>`;

            html += `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 text-xs font-bold rounded" style="background-color: ${item.category_color}18; color: ${item.category_color}">
                                ${item.kib_type}
                            </span>
                        </div>
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="font-mono text-xs font-bold text-slate-700">${item.asset_code}</div>
                        <div class="text-[11px] text-slate-400">Reg: ${item.register_number}</div>
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-3">
                            ${photoThumb}
                            <div class="min-w-0">
                                <div class="font-semibold text-slate-900 line-clamp-1 hover:text-amber-600 cursor-pointer" onclick="App.viewAssetDetail(${item.id})">
                                    ${item.name}
                                </div>
                                <div class="flex items-center gap-2 mt-1">
                                    <span class="text-xs text-slate-500"><i class="fa-solid fa-location-dot text-slate-400"></i> ${item.regency_name}</span>
                                    ${extraSpec}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="text-xs font-medium text-slate-700 line-clamp-1">${item.opd_alias || item.opd_name}</div>
                        <div class="text-[11px] text-slate-400 mt-0.5">Thn: ${item.acquisition_year}</div>
                    </td>
                    <td class="px-4 py-3.5 text-right">
                        <div class="font-mono font-bold text-slate-900 text-sm">${this.formatRupiah(item.acquisition_value)}</div>
                        <div class="text-[11px] text-slate-400">Buku: ${this.formatRupiahShort(item.book_value)}</div>
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="flex flex-col gap-1 items-start">
                            ${condBadge}
                            <div class="flex items-center gap-1.5">
                                ${statusBadge}
                                ${sensusBadge}
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="App.viewAssetDetail(${item.id})" title="Lihat Rincian Aset" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-600 flex items-center justify-center transition-colors">
                                <i class="fa-solid fa-eye text-xs"></i>
                            </button>
                            <button onclick="App.printQRCodeLabel(${item.id})" title="Cetak Stiker Label QR" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors">
                                <i class="fa-solid fa-qrcode text-xs"></i>
                            </button>
                            <button onclick="App.openAssetModal(${item.id})" title="Edit Aset" class="admin-only ${this.state.adminMode ? '' : 'hidden'} w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 flex items-center justify-center transition-colors">
                                <i class="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button onclick="App.confirmDeleteAsset(${item.id}, '${item.name.replace(/'/g, "\\'")}')" title="Hapus Aset" class="admin-only ${this.state.adminMode ? '' : 'hidden'} w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 flex items-center justify-center transition-colors">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    renderPagination() {
        const container = document.getElementById('tablePagination');
        if (!container) return;

        if (this.state.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = `
            <div class="flex items-center gap-1">
                <button ${this.state.currentPage === 1 ? 'disabled' : ''} onclick="App.goToPage(${this.state.currentPage - 1})" class="px-3 py-1.5 text-xs rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium">
                    <i class="fa-solid fa-chevron-left"></i> Prev
                </button>
        `;

        for (let i = 1; i <= this.state.totalPages; i++) {
            if (i === 1 || i === this.state.totalPages || (i >= this.state.currentPage - 1 && i <= this.state.currentPage + 1)) {
                html += `
                    <button onclick="App.goToPage(${i})" class="px-3 py-1.5 text-xs rounded border font-medium ${i === this.state.currentPage ? 'bg-amber-500 text-white border-amber-500 font-bold' : 'border-slate-300 hover:bg-slate-100 text-slate-700'}">
                        ${i}
                    </button>
                `;
            } else if (i === this.state.currentPage - 2 || i === this.state.currentPage + 2) {
                html += `<span class="px-2 py-1 text-xs text-slate-400">...</span>`;
            }
        }

        html += `
                <button ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''} onclick="App.goToPage(${this.state.currentPage + 1})" class="px-3 py-1.5 text-xs rounded border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium">
                    Next <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        `;

        container.innerHTML = html;
    },

    goToPage(page) {
        if (page < 1 || page > this.state.totalPages) return;
        this.state.currentPage = page;
        this.loadAssetsTable();
    },

    // Modal Detail Aset Lengkap
    async viewAssetDetail(assetId) {
        try {
            let result;
            if (window.Store) {
                result = Store.getAssetById(assetId);
            } else {
                const res = await fetch(`api/assets.php?id=${assetId}`);
                result = await res.json();
            }

            if (!result.success) {
                alert('Aset tidak ditemukan');
                return;
            }

            const a = result.data;
            this.state.selectedAsset = a;

            // Isi informasi modal
            document.getElementById('detailModalTitle').textContent = a.name;
            document.getElementById('detailAssetCode').textContent = a.asset_code;
            document.getElementById('detailRegNumber').textContent = a.register_number;
            document.getElementById('detailCategoryBadge').textContent = `${a.kib_type} - ${a.category_name}`;
            document.getElementById('detailCategoryBadge').style.backgroundColor = `${a.category_color}20`;
            document.getElementById('detailCategoryBadge').style.color = a.category_color;

            document.getElementById('detailOpdName').textContent = a.opd_name;
            document.getElementById('detailOpdHead').textContent = a.opd_head || '-';
            document.getElementById('detailAcquisitionYear').textContent = a.acquisition_year;
            document.getElementById('detailAcqValue').textContent = this.formatRupiah(a.acquisition_value);
            document.getElementById('detailBookValue').textContent = this.formatRupiah(a.book_value);
            document.getElementById('detailCondition').textContent = a.condition;
            document.getElementById('detailStatus').textContent = a.status;
            document.getElementById('detailRegency').textContent = a.regency_name;
            document.getElementById('detailDistrict').textContent = a.district || '-';
            document.getElementById('detailAddress').textContent = a.address || '-';
            document.getElementById('detailNotes').textContent = a.notes || 'Tidak ada catatan tambahan.';

            // Status Sensus Fisik
            const sensusBox = document.getElementById('detailSensusStatusBox');
            if (sensusBox) {
                if (a.sensus_status === 'Terverifikasi') {
                    sensusBox.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                                <i class="fa-solid fa-circle-check text-emerald-600"></i> Terverifikasi Sensus Fisik (${a.sensus_date || '2026'})
                            </span>
                            <span class="text-[11px] text-slate-500">Petugas: ${a.verifier || 'Tim BPKAD'}</span>
                        </div>
                    `;
                } else {
                    sensusBox.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                                <i class="fa-solid fa-clock text-amber-600"></i> Belum Dilakukan Verifikasi Lapangan Sensus BMD
                            </span>
                            <button onclick="App.verifyAssetNow(${a.id})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm">
                                <i class="fa-solid fa-check"></i> Verifikasi Sekarang
                            </button>
                        </div>
                    `;
                }
            }

            // Preview Foto Fisik Jika Ada
            const photoContainer = document.getElementById('detailPhotoContainer');
            if (photoContainer) {
                if (a.image_url) {
                    photoContainer.innerHTML = `<img src="${a.image_url}" alt="${a.name}" class="w-full h-48 object-cover rounded-2xl border border-slate-200">`;
                    photoContainer.classList.remove('hidden');
                } else {
                    photoContainer.classList.add('hidden');
                }
            }

            // Spesifikasi Kategori Khusus
            const specContainer = document.getElementById('detailCategorySpecs');
            let specHtml = '';

            if (a.category_id === 'kib-a') {
                specHtml = `
                    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-xs text-emerald-700 font-semibold">Luas Tanah</div>
                            <div class="text-base font-bold text-emerald-900">${this.formatArea(a.area_sqm)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700 font-semibold">Status Hak / Sertifikat</div>
                            <div class="text-base font-bold text-emerald-900">${a.certificate_status || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700 font-semibold">Nomor Sertifikat / Registrasi</div>
                            <div class="text-sm font-mono font-medium text-emerald-900">${a.certificate_number || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-emerald-700 font-semibold">Tanggal Terbit</div>
                            <div class="text-sm text-emerald-900">${a.certificate_date || '-'}</div>
                        </div>
                    </div>
                `;
            } else if (a.category_id === 'kib-b') {
                specHtml = `
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">Nomor Polisi (Plat Merah)</div>
                            <div class="text-base font-mono font-bold text-blue-900">${a.police_number || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">Merk / Tipe</div>
                            <div class="text-sm font-medium text-blue-900">${a.brand_type || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">Kapasitas / CC / Spesifikasi</div>
                            <div class="text-sm text-blue-900">${a.capacity_spec || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">No. Rangka / Chassis</div>
                            <div class="text-xs font-mono text-blue-900">${a.chassis_number || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">No. Mesin / Serial</div>
                            <div class="text-xs font-mono text-blue-900">${a.engine_number || '-'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-blue-700 font-semibold">Pemegang Aset</div>
                            <div class="text-sm text-blue-900">${a.custodian_name || '-'}</div>
                        </div>
                    </div>
                `;
            } else if (a.category_id === 'kib-c') {
                specHtml = `
                    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <div class="text-xs text-purple-700 font-semibold">Luas Lantai Bangunan</div>
                            <div class="text-base font-bold text-purple-900">${this.formatArea(a.area_sqm)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-purple-700 font-semibold">Jumlah Lantai</div>
                            <div class="text-base font-bold text-purple-900">${a.building_floors || 1} Lantai</div>
                        </div>
                        <div>
                            <div class="text-xs text-purple-700 font-semibold">Tipe Konstruksi</div>
                            <div class="text-sm text-purple-900">${a.construction_type || '-'}</div>
                        </div>
                        <div class="col-span-2 md:col-span-3">
                            <div class="text-xs text-purple-700 font-semibold">Dokumen IMB / PBG</div>
                            <div class="text-sm font-mono text-purple-900">${a.imb_number || '-'}</div>
                        </div>
                    </div>
                `;
            } else if (a.category_id === 'kib-d') {
                specHtml = `
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-xs text-amber-700 font-semibold">Panjang Ruas / Jaringan</div>
                            <div class="text-base font-bold text-amber-900">${a.length_km || 0} Km</div>
                        </div>
                        <div>
                            <div class="text-xs text-amber-700 font-semibold">Konstruksi</div>
                            <div class="text-sm text-amber-900">${a.construction_type || '-'}</div>
                        </div>
                    </div>
                `;
            } else if (a.category_id === 'kib-f') {
                specHtml = `
                    <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 grid grid-cols-2 gap-4">
                        <div>
                            <div class="text-xs text-rose-700 font-semibold">Nilai Kontrak Proyek</div>
                            <div class="text-base font-bold text-rose-900">${this.formatRupiah(a.contract_value)}</div>
                        </div>
                        <div>
                            <div class="text-xs text-rose-700 font-semibold">Realisasi Fisik Progres</div>
                            <div class="text-base font-bold text-rose-900">${a.progress_percentage || 0}%</div>
                        </div>
                    </div>
                `;
            }
            specContainer.innerHTML = specHtml;

            // Generate QR Code di Modal
            this.renderQRCodeToElement('detailQrCodeContainer', `BMD-PROV-LAMPUNG:${a.asset_code}:${a.register_number}`);

            // Riwayat Pemeliharaan
            this.renderDetailMaintenanceLogs(a.maintenance_logs || []);

            // Koordinat & Google Maps
            const btnGmaps = document.getElementById('btnOpenGmaps');
            if (btnGmaps) {
                if (a.latitude && a.longitude) {
                    btnGmaps.href = `https://www.google.com/maps?q=${a.latitude},${a.longitude}`;
                    btnGmaps.classList.remove('hidden');
                } else {
                    btnGmaps.classList.add('hidden');
                }
            }

            // Tampilkan Modal
            document.getElementById('assetDetailModal').classList.remove('hidden');

        } catch (err) {
            console.error('Error fetching asset detail:', err);
        }
    },

    closeDetailModal() {
        document.getElementById('assetDetailModal').classList.add('hidden');
    },

    verifyAssetNow(assetId) {
        if (!confirm('Verifikasi bahwa kondisi fisik dan keberadaan barang milik daerah ini telah diperiksa di lapangan?')) return;
        if (window.Store) {
            Store.verifyAsset(assetId, 'Tim Verifikasi BPKAD');
            alert('Aset berhasil diverifikasi!');
            this.viewAssetDetail(assetId);
            this.loadAssetsTable();
            this.loadDashboardStats();
        }
    },

    renderDetailMaintenanceLogs(logs) {
        const container = document.getElementById('detailMaintenanceList');
        if (!container) return;

        if (logs.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-400 italic">Belum ada riwayat perbaikan atau pemeliharaan berkala yang dicatat untuk aset ini.</p>`;
            return;
        }

        let html = '';
        logs.forEach(l => {
            html += `
                <div class="border-l-2 border-amber-400 pl-3 py-1 text-xs">
                    <div class="flex items-center justify-between font-semibold text-slate-800">
                        <span>${l.maintenance_date}</span>
                        <span class="text-emerald-700 font-mono">${this.formatRupiah(l.cost)}</span>
                    </div>
                    <div class="text-slate-600 mt-0.5">${l.description}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">Bengkel/Penyedia: ${l.service_provider || '-'} (${l.technician || '-'})</div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    // QR Code Generator helper
    renderQRCodeToElement(containerId, text) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (window.QRCode) {
            new QRCode(container, {
                text: text,
                width: 110,
                height: 110,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    },

    // Cetak Stiker Label QR Code Inventaris (Standar BPKAD 7cm x 4.8cm)
    async printQRCodeLabel(assetId) {
        try {
            let result;
            if (window.Store) {
                result = Store.getAssetById(assetId);
            } else {
                const res = await fetch(`api/assets.php?id=${assetId}`);
                result = await res.json();
            }

            if (!result.success) return;

            const a = result.data;
            document.getElementById('labelStickerAssetCode').textContent = a.asset_code;
            document.getElementById('labelStickerRegNumber').textContent = `REG: ${a.register_number}`;
            document.getElementById('labelStickerName').textContent = a.name;
            document.getElementById('labelStickerOpd').textContent = a.opd_alias || a.opd_name;
            document.getElementById('labelStickerYear').textContent = `Thn Perolehan: ${a.acquisition_year}`;

            // Render QR Code untuk stiker
            this.renderQRCodeToElement('labelStickerQrContainer', `BMD-PROV-LAMPUNG:${a.asset_code}:${a.register_number}`);

            // Buka Modal Label Preview
            document.getElementById('qrLabelModal').classList.remove('hidden');
        } catch (err) {
            console.error('Error opening QR sticker modal:', err);
        }
    },

    closeQRLabelModal() {
        document.getElementById('qrLabelModal').classList.add('hidden');
    },

    triggerPrintLabel() {
        window.print();
    },

    // =========================================================================
    // FITUR KAMERA SCANNER QR CODE FISIK ASET
    // =========================================================================
    openQRScannerModal() {
        const modal = document.getElementById('qrScannerModal');
        if (!modal) return;
        modal.classList.remove('hidden');

        // Reset status text
        document.getElementById('qrScanStatus').innerHTML = '<span class="text-slate-500">Arahkan kamera ke stiker QR Code aset atau masukkan kode barang manual.</span>';

        // Inisialisasi scanner jika library tersedia
        if (typeof Html5Qrcode !== 'undefined') {
            try {
                if (this.state.html5QrCode) {
                    this.state.html5QrCode.stop().catch(() => {});
                }

                this.state.html5QrCode = new Html5Qrcode("qrReaderCamera");
                this.state.html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        this.handleScannedCode(decodedText);
                    },
                    (errorMessage) => {
                        // ignore frame errors
                    }
                ).catch(err => {
                    console.warn("Kamera tidak dapat diakses atau tidak ada izin:", err);
                    document.getElementById('qrScanStatus').innerHTML = `<span class="text-amber-600 font-semibold"><i class="fa-solid fa-camera"></i> Kamera tidak aktif. Gunakan pencarian kode manual di bawah.</span>`;
                });
            } catch (e) {
                console.error(e);
            }
        }
    },

    closeQRScannerModal() {
        if (this.state.html5QrCode) {
            this.state.html5QrCode.stop().then(() => {
                this.state.html5QrCode.clear();
            }).catch(() => {});
        }
        document.getElementById('qrScannerModal').classList.add('hidden');
    },

    handleScannedCode(rawCode) {
        console.log("QR Terdeteksi:", rawCode);
        document.getElementById('qrScanStatus').innerHTML = `<span class="text-emerald-600 font-bold"><i class="fa-solid fa-spinner fa-spin"></i> Membaca kode: ${rawCode}...</span>`;

        let matchAsset = null;
        if (window.Store) {
            matchAsset = Store.getAssetByCodeOrRegister(rawCode);
        }

        if (matchAsset) {
            this.closeQRScannerModal();
            this.viewAssetDetail(matchAsset.id);
        } else {
            document.getElementById('qrScanStatus').innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Aset dengan kode "${rawCode}" tidak ditemukan di database.</span>`;
        }
    },

    handleManualCodeLookup() {
        const input = document.getElementById('manualQrCodeInput');
        if (!input || !input.value.trim()) return;
        this.handleScannedCode(input.value.trim());
    },

    // =========================================================================
    // UPLOAD FOTO FISIK ASET
    // =========================================================================
    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, PNG, WEBP)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.state.tempUploadedImage = e.target.result;
            const preview = document.getElementById('formPhotoPreview');
            const img = document.getElementById('formPhotoImg');
            if (preview && img) {
                img.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    },

    removeUploadedPhoto() {
        this.state.tempUploadedImage = null;
        const fileInput = document.getElementById('formImageFile');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('formPhotoPreview');
        if (preview) preview.classList.add('hidden');
    },

    // Open Tambah / Edit Modal
    openAssetModal(assetId = null) {
        const modal = document.getElementById('assetFormModal');
        const title = document.getElementById('assetFormModalTitle');
        const form = document.getElementById('assetForm');
        form.reset();

        this.removeUploadedPhoto();
        document.getElementById('formAssetId').value = assetId || '';

        // Reset tabs to general
        document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active', 'border-amber-500', 'text-amber-600', 'font-bold'));
        document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));
        document.querySelector('.modal-tab-btn[data-modal-tab="general"]').classList.add('active', 'border-amber-500', 'text-amber-600', 'font-bold');
        document.getElementById('modalTab_general').classList.remove('hidden');

        if (assetId) {
            title.textContent = 'Edit Data Aset BMD Pemprov Lampung';
            this.populateEditForm(assetId);
        } else {
            title.textContent = 'Pencatatan Aset Baru (SIMBADA Pemprov Lampung)';
            document.getElementById('formAcquisitionYear').value = new Date().getFullYear();
            document.getElementById('formRegency').value = 'Kota Bandar Lampung';
            document.getElementById('formCondition').value = 'Baik';
            document.getElementById('formStatus').value = 'Digunakan Sendiri';
            this.adjustFormFieldsForCategory('');
        }

        modal.classList.remove('hidden');
    },

    async populateEditForm(assetId) {
        try {
            let r;
            if (window.Store) {
                r = Store.getAssetById(assetId);
            } else {
                const res = await fetch(`api/assets.php?id=${assetId}`);
                r = await res.json();
            }

            if (!r.success) return;
            const a = r.data;

            document.getElementById('formAssetId').value = a.id;
            document.getElementById('formName').value = a.name;
            document.getElementById('formCategory').value = a.category_id;
            document.getElementById('formOpd').value = a.opd_id;
            document.getElementById('formAssetCode').value = a.asset_code;
            document.getElementById('formRegisterNumber').value = a.register_number;
            document.getElementById('formAcquisitionYear').value = a.acquisition_year;
            document.getElementById('formAcquisitionValue').value = a.acquisition_value;
            document.getElementById('formBookValue').value = a.book_value;
            document.getElementById('formCondition').value = a.condition;
            document.getElementById('formStatus').value = a.status;

            // Foto jika ada
            if (a.image_url) {
                this.state.tempUploadedImage = a.image_url;
                const preview = document.getElementById('formPhotoPreview');
                const img = document.getElementById('formPhotoImg');
                if (preview && img) {
                    img.src = a.image_url;
                    preview.classList.remove('hidden');
                }
            }

            // Alamat & Lokasi
            document.getElementById('formRegency').value = a.regency_name;
            document.getElementById('formDistrict').value = a.district || '';
            document.getElementById('formAddress').value = a.address || '';
            document.getElementById('formLatitude').value = a.latitude || '';
            document.getElementById('formLongitude').value = a.longitude || '';

            // Spesifikasi Kategori
            document.getElementById('formAreaSqm').value = a.area_sqm || '';
            document.getElementById('formCertificateStatus').value = a.certificate_status || '';
            document.getElementById('formCertificateNumber').value = a.certificate_number || '';
            document.getElementById('formCertificateDate').value = a.certificate_date || '';

            document.getElementById('formPoliceNumber').value = a.police_number || '';
            document.getElementById('formBrandType').value = a.brand_type || '';
            document.getElementById('formCapacitySpec').value = a.capacity_spec || '';
            document.getElementById('formChassisNumber').value = a.chassis_number || '';
            document.getElementById('formEngineNumber').value = a.engine_number || '';
            document.getElementById('formCustodianName').value = a.custodian_name || '';

            document.getElementById('formBuildingFloors').value = a.building_floors || '';
            document.getElementById('formConstructionType').value = a.construction_type || '';
            document.getElementById('formImbNumber').value = a.imb_number || '';

            document.getElementById('formLengthKm').value = a.length_km || '';
            document.getElementById('formContractValue').value = a.contract_value || '';
            document.getElementById('formProgressPercentage').value = a.progress_percentage || '';
            document.getElementById('formNotes').value = a.notes || '';

            this.adjustFormFieldsForCategory(a.category_id);
        } catch (err) {
            console.error('Error populating edit form:', err);
        }
    },

    adjustFormFieldsForCategory(catId) {
        const specLand = document.getElementById('formSpecLand');
        const specVehicle = document.getElementById('formSpecVehicle');
        const specBuilding = document.getElementById('formSpecBuilding');
        const specNetwork = document.getElementById('formSpecNetwork');
        const specKdp = document.getElementById('formSpecKdp');

        [specLand, specVehicle, specBuilding, specNetwork, specKdp].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        if (catId === 'kib-a' && specLand) specLand.classList.remove('hidden');
        else if (catId === 'kib-b' && specVehicle) specVehicle.classList.remove('hidden');
        else if (catId === 'kib-c' && specBuilding) specBuilding.classList.remove('hidden');
        else if (catId === 'kib-d' && specNetwork) specNetwork.classList.remove('hidden');
        else if (catId === 'kib-f' && specKdp) specKdp.classList.remove('hidden');
    },

    closeAssetModal() {
        document.getElementById('assetFormModal').classList.add('hidden');
    },

    async saveAssetForm() {
        const form = document.getElementById('assetForm');
        const formData = new FormData(form);
        const data = {};
        formData.forEach((val, key) => {
            data[key] = val;
        });

        // Simpan foto jika ada
        if (this.state.tempUploadedImage) {
            data.image_url = this.state.tempUploadedImage;
        }

        const assetId = data.id;
        const isEdit = Boolean(assetId);

        try {
            let result;
            if (window.Store) {
                if (isEdit) {
                    result = Store.updateAsset(assetId, data);
                } else {
                    result = Store.addAsset(data);
                }
            } else {
                const url = isEdit ? `api/assets.php?id=${assetId}` : 'api/assets.php';
                const method = isEdit ? 'PUT' : 'POST';
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                result = await res.json();
            }

            if (result.success) {
                alert(result.message || 'Data aset berhasil disimpan');
                this.closeAssetModal();
                await this.loadDashboardStats();
                await this.loadAssetsTable();
                if (window.GISMap) GISMap.loadMapAssets();
            } else {
                alert('Gagal menyimpan: ' + (result.message || 'Terjadi kesalahan'));
            }
        } catch (err) {
            console.error('Error saving asset:', err);
            alert('Terjadi kendala saat menyimpan aset');
        }
    },

    async confirmDeleteAsset(assetId, assetName) {
        if (!confirm(`Apakah Anda yakin ingin menghapus aset "${assetName}" dari buku inventaris BMD Provinsi Lampung?`)) {
            return;
        }

        try {
            let result;
            if (window.Store) {
                result = Store.deleteAsset(assetId);
            } else {
                const res = await fetch(`api/assets.php?id=${assetId}`, { method: 'DELETE' });
                result = await res.json();
            }

            if (result.success) {
                alert('Aset berhasil dihapus');
                await this.loadDashboardStats();
                await this.loadAssetsTable();
                if (window.GISMap) GISMap.loadMapAssets();
            } else {
                alert('Gagal menghapus: ' + result.message);
            }
        } catch (err) {
            console.error('Error deleting asset:', err);
        }
    },

    // Reset database ke default Pemprov Lampung
    resetDatabaseToOfficialSeed() {
        if (!confirm('Apakah Anda ingin mereset seluruh data inventaris kembali ke data awal resmi Pemprov Lampung (34 aset)?')) {
            return;
        }
        if (window.Store) {
            Store.resetToDefault();
            alert('Database inventaris berhasil direset ke data awal resmi Pemprov Lampung!');
            this.init();
            if (window.GISMap) GISMap.loadMapAssets();
        }
    },

    // Inisialisasi Peta Pemilih Koordinat GPS di Modal Form
    initOrInvalidatePickerMap() {
        const container = document.getElementById('pickerMapContainer');
        if (!container) return;

        let latVal = parseFloat(document.getElementById('formLatitude').value) || -5.4485;
        let lngVal = parseFloat(document.getElementById('formLongitude').value) || 105.2612;

        if (!this.pickerMap) {
            this.pickerMap = L.map('pickerMapContainer').setView([latVal, lngVal], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(this.pickerMap);

            this.mapPickerMarker = L.marker([latVal, lngVal], { draggable: true }).addTo(this.pickerMap);

            this.mapPickerMarker.on('dragend', (e) => {
                const coord = e.target.getLatLng();
                document.getElementById('formLatitude').value = coord.lat.toFixed(6);
                document.getElementById('formLongitude').value = coord.lng.toFixed(6);
            });

            this.pickerMap.on('click', (e) => {
                this.mapPickerMarker.setLatLng(e.latlng);
                document.getElementById('formLatitude').value = e.latlng.lat.toFixed(6);
                document.getElementById('formLongitude').value = e.latlng.lng.toFixed(6);
            });
        } else {
            this.pickerMap.invalidateSize();
            this.pickerMap.setView([latVal, lngVal], 13);
            this.mapPickerMarker.setLatLng([latVal, lngVal]);
        }
    },

    // View Khusus KIB A (Tanah & Sertifikasi)
    async loadLandSpecificView() {
        const container = document.getElementById('landCardsContainer');
        if (!container) return;

        try {
            let result;
            if (window.Store) {
                result = Store.getAssets({ category_id: 'kib-a', limit: 50 });
            } else {
                const res = await fetch('api/assets.php?category_id=kib-a&limit=50');
                result = await res.json();
            }

            if (!result.success) return;

            let html = '';
            result.data.forEach(land => {
                let badgeCert = '';
                if (land.certificate_status === 'Bersertifikat') {
                    badgeCert = '<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold"><i class="fa-solid fa-check"></i> Bersertifikat</span>';
                } else if (land.certificate_status === 'Proses') {
                    badgeCert = '<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold"><i class="fa-solid fa-clock"></i> Proses BPN</span>';
                } else if (land.certificate_status === 'Sengketa') {
                    badgeCert = '<span class="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Sengketa</span>';
                } else {
                    badgeCert = '<span class="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">Belum Sertifikat</span>';
                }

                html += `
                    <div class="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div class="flex items-start justify-between gap-3 mb-3">
                            <span class="text-xs font-mono font-bold text-slate-500">${land.asset_code}</span>
                            ${badgeCert}
                        </div>
                        <h4 class="font-bold text-slate-900 text-base mb-1 line-clamp-2">${land.name}</h4>
                        <p class="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><i class="fa-solid fa-location-dot text-slate-400"></i> ${land.address || land.regency_name}</p>
                        
                        <div class="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs mb-3">
                            <div>
                                <span class="text-slate-400 block">Luas Tanah:</span>
                                <span class="font-bold text-slate-800">${this.formatArea(land.area_sqm)}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block">Nilai Perolehan:</span>
                                <span class="font-bold text-emerald-700 font-mono">${this.formatRupiah(land.acquisition_value)}</span>
                            </div>
                            <div class="col-span-2">
                                <span class="text-slate-400 block">No. Sertifikat:</span>
                                <span class="font-mono text-slate-700 text-[11px]">${land.certificate_number || 'Dalam Proses Pendaftaran'}</span>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-xs">
                            <span class="text-slate-500 font-medium">${land.opd_alias || land.opd_name}</span>
                            <button onclick="App.viewAssetDetail(${land.id})" class="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1">
                                Rincian <i class="fa-solid fa-arrow-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (err) {
            console.error('Error loading land view:', err);
        }
    },

    // View Khusus KIB B (Kendaraan Dinas & Alat Berat)
    async loadVehicleSpecificView() {
        const container = document.getElementById('vehicleCardsContainer');
        if (!container) return;

        try {
            let result;
            if (window.Store) {
                result = Store.getAssets({ category_id: 'kib-b', limit: 50 });
            } else {
                const res = await fetch('api/assets.php?category_id=kib-b&limit=50');
                result = await res.json();
            }

            if (!result.success) return;

            let html = '';
            result.data.forEach(v => {
                html += `
                    <div class="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div class="flex items-start justify-between gap-2 mb-3">
                            <div class="bg-red-600 text-white font-mono font-black text-sm px-3 py-1 rounded shadow-sm border border-red-700 tracking-wider">
                                ${v.police_number || 'PLAT DINAS'}
                            </div>
                            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${v.condition === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                                ${v.condition}
                            </span>
                        </div>
                        <h4 class="font-bold text-slate-900 text-base mb-1 line-clamp-1">${v.name}</h4>
                        <div class="text-xs text-slate-600 mb-3">${v.brand_type || '-'} (${v.capacity_spec || '-'})</div>
                        
                        <div class="space-y-1.5 py-3 border-y border-slate-100 text-xs mb-3">
                            <div class="flex justify-between">
                                <span class="text-slate-400">Pengguna / Pemegang:</span>
                                <span class="font-semibold text-slate-800">${v.custodian_name || v.opd_alias || v.opd_name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">Tahun Pengadaan:</span>
                                <span class="text-slate-700">${v.acquisition_year}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">Nilai Perolehan:</span>
                                <span class="font-bold text-slate-900 font-mono">${this.formatRupiah(v.acquisition_value)}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button onclick="App.viewAssetDetail(${v.id})" class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold text-center transition-colors">
                                Rincian
                            </button>
                            <button onclick="App.openMaintenanceModal(${v.id}, '${v.name.replace(/'/g, "\\'")}')" class="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1">
                                <i class="fa-solid fa-wrench"></i> Servis
                            </button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } catch (err) {
            console.error('Error loading vehicles view:', err);
        }
    },

    // Modal Input Pemeliharaan Cepat
    openMaintenanceModal(assetId, assetName) {
        document.getElementById('maintModalAssetId').value = assetId;
        document.getElementById('maintModalAssetName').textContent = assetName;
        document.getElementById('maintDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('maintDesc').value = '';
        document.getElementById('maintCost').value = '';
        document.getElementById('maintProvider').value = '';
        document.getElementById('maintTechnician').value = '';

        document.getElementById('maintenanceFormModal').classList.remove('hidden');
    },

    closeMaintenanceModal() {
        document.getElementById('maintenanceFormModal').classList.add('hidden');
    },

    async saveMaintenanceLog() {
        const assetId = document.getElementById('maintModalAssetId').value;
        const date = document.getElementById('maintDate').value;
        const desc = document.getElementById('maintDesc').value;
        const cost = document.getElementById('maintCost').value;
        const provider = document.getElementById('maintProvider').value;
        const tech = document.getElementById('maintTechnician').value;

        if (!desc || !cost) {
            alert('Deskripsi perbaikan dan biaya wajib diisi');
            return;
        }

        try {
            let r;
            const logData = {
                asset_id: assetId,
                maintenance_date: date,
                description: desc,
                cost: cost,
                service_provider: provider,
                technician: tech
            };

            if (window.Store) {
                r = Store.addMaintenanceLog(logData);
            } else {
                const res = await fetch('api/maintenance.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(logData)
                });
                r = await res.json();
            }

            if (r.success) {
                alert('Riwayat servis berhasil dicatat!');
                this.closeMaintenanceModal();
            } else {
                alert('Gagal menyimpan: ' + r.message);
            }
        } catch (err) {
            console.error(err);
        }
    },

    // View Pemanfaatan & Aset Idle
    async loadUtilizationView() {
        const container = document.getElementById('utilizationCardsContainer');
        if (!container) return;

        try {
            let result;
            if (window.Store) {
                result = Store.getAssets({ limit: 100 });
            } else {
                const res = await fetch('api/assets.php?limit=100');
                result = await res.json();
            }

            if (!result.success) return;

            const nonOpAssets = result.data.filter(a => ['Idle', 'Sewa', 'KSP', 'Pinjam Pakai', 'Usul Hapus'].includes(a.status));
            
            let html = '';
            nonOpAssets.forEach(a => {
                let statusBadge = '';
                if (a.status === 'Idle') {
                    statusBadge = '<span class="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Aset Idle</span>';
                } else if (a.status === 'Sewa' || a.status === 'KSP') {
                    statusBadge = `<span class="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold"><i class="fa-solid fa-handshake"></i> ${a.status} (PAD)</span>`;
                } else if (a.status === 'Pinjam Pakai') {
                    statusBadge = '<span class="bg-cyan-100 text-cyan-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Pinjam Pakai</span>';
                } else {
                    statusBadge = '<span class="bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 rounded-full font-bold">Usulan Penghapusan</span>';
                }

                html += `
                    <div class="glass-card p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-xs px-2 py-0.5 rounded font-bold" style="background-color: ${a.category_color}20; color: ${a.category_color}">
                                ${a.kib_type}
                            </span>
                            ${statusBadge}
                        </div>
                        <h4 class="font-bold text-slate-900 text-base mb-1 line-clamp-2">${a.name}</h4>
                        <p class="text-xs text-slate-500 mb-3"><i class="fa-solid fa-location-dot"></i> ${a.address || a.regency_name}</p>
                        
                        <div class="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-700 mb-3">
                            <div><span class="text-slate-400">Nilai Aset:</span> <strong class="text-slate-900 font-mono">${this.formatRupiah(a.acquisition_value)}</strong></div>
                            <div><span class="text-slate-400">Keterangan Status:</span> ${a.notes || '-'}</div>
                        </div>

                        <div class="flex justify-end">
                            <button onclick="App.viewAssetDetail(${a.id})" class="text-xs text-amber-600 font-bold hover:underline">
                                Lihat Analisis Pemanfaatan &rarr;
                            </button>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        } catch (err) {
            console.error('Error loading utilization view:', err);
        }
    },

    // View Cetak Laporan & Berita Acara Rekapitulasi BMD
    async loadReportView() {
        const tbody = document.getElementById('reportTableBody');
        if (!tbody || !this.state.stats) return;

        let html = '';
        let grandCount = 0;
        let grandValue = 0;

        this.state.stats.by_category.forEach((c, idx) => {
            grandCount += Number(c.count);
            grandValue += Number(c.total_value);

            html += `
                <tr class="border-b border-slate-200 text-xs">
                    <td class="text-center py-2.5 font-bold">${idx + 1}</td>
                    <td class="py-2.5 font-bold text-slate-800">${c.kib_type}</td>
                    <td class="py-2.5">${c.name}</td>
                    <td class="text-center py-2.5 font-semibold">${Number(c.count).toLocaleString('id-ID')}</td>
                    <td class="text-right py-2.5 font-mono font-bold">${this.formatRupiah(c.total_value)}</td>
                </tr>
            `;
        });

        document.getElementById('reportGrandCount').textContent = grandCount.toLocaleString('id-ID');
        document.getElementById('reportGrandValue').textContent = this.formatRupiah(grandValue);
        tbody.innerHTML = html;
    },

    triggerPrintReport() {
        window.print();
    },

    // Unduh Dokumen Berita Acara Langsung ke PDF
    downloadPDFReport() {
        const element = document.getElementById('printableArea');
        if (!element) return;

        if (typeof html2pdf !== 'undefined') {
            const opt = {
                margin: 10,
                filename: `Berita_Acara_Rekapitulasi_BMD_Lampung_${new Date().toISOString().slice(0, 10)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        } else {
            window.print();
        }
    },

    // Export Data ke Excel (CSV)
    exportToExcel() {
        let exportAssets = this.state.assets;
        if (window.Store) {
            exportAssets = Store.data.assets.map(a => Store.enrichAsset(a));
        }

        if (!exportAssets || exportAssets.length === 0) {
            alert('Tidak ada data aset untuk diekspor');
            return;
        }

        const headers = ["No", "Kode Barang", "No Register", "Nama Aset", "Kategori KIB", "OPD Penanggung Jawab", "Kabupaten/Kota", "Tahun Perolehan", "Nilai Perolehan (Rp)", "Nilai Buku (Rp)", "Kondisi", "Status Pemanfaatan", "Status Sensus", "Keterangan"];
        const rows = exportAssets.map((a, idx) => [
            idx + 1,
            `"${a.asset_code}"`,
            `"${a.register_number}"`,
            `"${(a.name || '').replace(/"/g, '""')}"`,
            `"${a.kib_type} - ${a.category_name}"`,
            `"${(a.opd_alias || a.opd_name || '').replace(/"/g, '""')}"`,
            `"${a.regency_name}"`,
            a.acquisition_year,
            a.acquisition_value,
            a.book_value,
            `"${a.condition}"`,
            `"${a.status}"`,
            `"${a.sensus_status || 'Belum Sensus'}"`,
            `"${(a.notes || '').replace(/"/g, '""')}"`
        ]);

        let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Rekapitulasi_Aset_BMD_Pemprov_Lampung_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
