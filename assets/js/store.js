// assets/js/store.js - Client-Side Database Engine & LocalStorage Manager for Vercel
// Memungkinkan aplikasi berjalan 100% mandiri, offline & di Vercel tanpa butuh backend PHP/MySQL

const Store = {
    STORAGE_KEY: 'SIPADA_LAMPUNG_DB_V2',
    data: null,

    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.data = JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Gagal membaca LocalStorage, menggunakan data awal:', e);
        }

        if (!this.data || !this.data.assets || this.data.assets.length === 0) {
            this.resetToDefault();
        }
    },

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Gagal menyimpan ke LocalStorage:', e);
        }
    },

    resetToDefault() {
        if (typeof INITIAL_DATABASE !== 'undefined') {
            // Deep clone data awal
            this.data = JSON.parse(JSON.stringify(INITIAL_DATABASE));
            this.save();
        } else {
            console.error('INITIAL_DATABASE tidak ditemukan!');
        }
    },

    getCategories() {
        if (!this.data) this.init();
        return this.data.categories.map(c => {
            const catAssets = this.data.assets.filter(a => a.category_id === c.id);
            const totalVal = catAssets.reduce((sum, a) => sum + (parseFloat(a.acquisition_value) || 0), 0);
            return {
                ...c,
                asset_count: catAssets.length,
                total_value: totalVal
            };
        });
    },

    getOpds() {
        if (!this.data) this.init();
        return this.data.opd.map(o => {
            const opdAssets = this.data.assets.filter(a => Number(a.opd_id) === Number(o.id));
            const totalVal = opdAssets.reduce((sum, a) => sum + (parseFloat(a.acquisition_value) || 0), 0);
            return {
                ...o,
                asset_count: opdAssets.length,
                total_value: totalVal
            };
        });
    },

    getStats() {
        if (!this.data) this.init();
        const assets = this.data.assets;
        const categories = this.getCategories();
        const opds = this.getOpds();

        // 1. Ringkasan
        const total_assets = assets.length;
        const total_acquisition_value = assets.reduce((s, a) => s + (parseFloat(a.acquisition_value) || 0), 0);
        const total_book_value = assets.reduce((s, a) => s + (parseFloat(a.book_value) || parseFloat(a.acquisition_value) || 0), 0);

        // 2. By Condition
        const condMap = {};
        assets.forEach(a => {
            const c = a.condition || 'Baik';
            if (!condMap[c]) condMap[c] = { condition: c, count: 0, total_value: 0 };
            condMap[c].count++;
            condMap[c].total_value += (parseFloat(a.acquisition_value) || 0);
        });
        const by_condition = Object.values(condMap);

        // 3. By Status
        const statusMap = {};
        assets.forEach(a => {
            const st = a.status || 'Digunakan Sendiri';
            if (!statusMap[st]) statusMap[st] = { status: st, count: 0, total_value: 0 };
            statusMap[st].count++;
            statusMap[st].total_value += (parseFloat(a.acquisition_value) || 0);
        });
        const by_status = Object.values(statusMap);

        // 4. By Certification (KIB A)
        const certMap = {};
        assets.filter(a => a.category_id === 'kib-a').forEach(a => {
            const cert = a.certificate_status || 'Belum Terdata';
            if (!certMap[cert]) certMap[cert] = { status: cert, count: 0, total_area: 0, total_value: 0 };
            certMap[cert].count++;
            certMap[cert].total_area += (parseFloat(a.area_sqm) || 0);
            certMap[cert].total_value += (parseFloat(a.acquisition_value) || 0);
        });
        const by_certification = Object.values(certMap);

        // 5. Top OPD
        const top_opd = [...opds].filter(o => o.total_value > 0).sort((a, b) => b.total_value - a.total_value).slice(0, 10);

        // 6. By Year
        const yearMap = {};
        assets.filter(a => a.acquisition_year >= 2010).forEach(a => {
            const y = a.acquisition_year;
            if (!yearMap[y]) yearMap[y] = { year: y, count: 0, total_value: 0 };
            yearMap[y].count++;
            yearMap[y].total_value += (parseFloat(a.acquisition_value) || 0);
        });
        const by_year = Object.values(yearMap).sort((a, b) => a.year - b.year);

        // 7. By Regency
        const regMap = {};
        assets.forEach(a => {
            const r = a.regency_name || 'Kota Bandar Lampung';
            if (!regMap[r]) regMap[r] = { regency_name: r, count: 0, total_value: 0 };
            regMap[r].count++;
            regMap[r].total_value += (parseFloat(a.acquisition_value) || 0);
        });
        const by_regency = Object.values(regMap).sort((a, b) => b.count - a.count);

        // 8. Vehicle Stats
        const vehicles = assets.filter(a => a.category_id === 'kib-b' && a.police_number);
        const goodVehicles = vehicles.filter(v => v.condition === 'Baik').length;
        const totalVehVal = vehicles.reduce((s, v) => s + (parseFloat(v.acquisition_value) || 0), 0);

        return {
            success: true,
            summary: { total_assets, total_acquisition_value, total_book_value },
            by_category: categories,
            by_condition,
            by_status,
            by_certification,
            top_opd,
            by_year,
            by_regency,
            vehicle_stats: {
                total_vehicles: vehicles.length,
                good_condition: goodVehicles,
                damaged_condition: vehicles.length - goodVehicles,
                total_vehicle_value: totalVehVal
            }
        };
    },

    getAssets(params = {}) {
        if (!this.data) this.init();
        let list = this.data.assets.map(a => this.enrichAsset(a));

        // Filters
        if (params.search) {
            const q = params.search.toLowerCase().trim();
            list = list.filter(a => 
                (a.name && a.name.toLowerCase().includes(q)) ||
                (a.asset_code && a.asset_code.toLowerCase().includes(q)) ||
                (a.register_number && a.register_number.toLowerCase().includes(q)) ||
                (a.police_number && a.police_number.toLowerCase().includes(q)) ||
                (a.address && a.address.toLowerCase().includes(q)) ||
                (a.brand_type && a.brand_type.toLowerCase().includes(q))
            );
        }

        if (params.category_id) {
            list = list.filter(a => a.category_id === params.category_id);
        }
        if (params.opd_id) {
            list = list.filter(a => Number(a.opd_id) === Number(params.opd_id));
        }
        if (params.regency) {
            list = list.filter(a => a.regency_name === params.regency);
        }
        if (params.condition) {
            list = list.filter(a => a.condition === params.condition);
        }
        if (params.status) {
            list = list.filter(a => a.status === params.status);
        }
        if (params.certificate_status) {
            list = list.filter(a => a.certificate_status === params.certificate_status);
        }

        // Total nilai terfilter
        const filtered_total_value = list.reduce((s, a) => s + (parseFloat(a.acquisition_value) || 0), 0);
        const total_rows = list.length;

        // Sorting
        const sortBy = params.sort_by || 'id';
        const sortOrder = (params.sort_order || 'desc').toLowerCase();
        list.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const page = Math.max(1, parseInt(params.page) || 1);
        const limit = Math.max(5, parseInt(params.limit) || 15);
        const total_pages = Math.ceil(total_rows / limit) || 1;
        const offset = (page - 1) * limit;
        const paginatedData = list.slice(offset, offset + limit);

        return {
            success: true,
            page,
            limit,
            total_rows,
            total_pages,
            filtered_total_value,
            data: paginatedData
        };
    },

    getGeoAssets(params = {}) {
        if (!this.data) this.init();
        let list = this.data.assets
            .filter(a => a.latitude !== null && a.longitude !== null && !isNaN(parseFloat(a.latitude)))
            .map(a => this.enrichAsset(a));

        if (params.category_id) {
            list = list.filter(a => a.category_id === params.category_id);
        }
        if (params.regency) {
            list = list.filter(a => a.regency_name === params.regency);
        }

        return { success: true, data: list };
    },

    enrichAsset(a) {
        const cat = this.data.categories.find(c => c.id === a.category_id) || {
            name: 'Aset', kib_type: 'KIB', color: '#64748b', icon: 'fa-box'
        };
        const opd = this.data.opd.find(o => Number(o.id) === Number(a.opd_id)) || {
            name: 'Pemerintah Provinsi Lampung', alias: 'Pemprov Lampung', head_name: '-'
        };

        return {
            ...a,
            category_name: cat.name,
            kib_type: cat.kib_type,
            category_color: cat.color,
            category_icon: cat.icon,
            opd_name: opd.name,
            opd_alias: opd.alias,
            opd_head: opd.head_name
        };
    },

    getAssetById(id) {
        if (!this.data) this.init();
        const asset = this.data.assets.find(a => Number(a.id) === Number(id));
        if (!asset) return { success: false, message: 'Aset tidak ditemukan' };

        const enriched = this.enrichAsset(asset);
        enriched.maintenance_logs = (this.data.maintenance_logs || [])
            .filter(m => Number(m.asset_id) === Number(id))
            .sort((a, b) => new Date(b.maintenance_date) - new Date(a.maintenance_date));

        return { success: true, data: enriched };
    },

    addAsset(input) {
        if (!this.data) this.init();
        const nextId = (this.data.assets.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1);
        
        // Auto-generate Kode Aset & Nomor Register jika kosong
        const catId = input.category_id;
        const cat = this.data.categories.find(c => c.id === catId);
        const catCode = cat ? cat.code : '01';
        const nextSeq = this.data.assets.filter(a => a.category_id === catId).length + 1;

        const regNumber = input.register_number || String(nextSeq).padStart(6, '0');
        const assetCode = input.asset_code || `${catCode}.01.${String(input.opd_id || 1).padStart(2, '0')}.${String(nextSeq).padStart(4, '0')}`;

        const newAsset = {
            id: nextId,
            asset_code: assetCode,
            register_number: regNumber,
            name: input.name,
            category_id: catId,
            opd_id: Number(input.opd_id),
            regency_name: input.regency_name || 'Kota Bandar Lampung',
            district: input.district || null,
            address: input.address || null,
            latitude: input.latitude ? parseFloat(input.latitude) : null,
            longitude: input.longitude ? parseFloat(input.longitude) : null,
            acquisition_year: Number(input.acquisition_year) || new Date().getFullYear(),
            acquisition_value: parseFloat(input.acquisition_value) || 0,
            book_value: parseFloat(input.book_value) || parseFloat(input.acquisition_value) || 0,
            condition: input.condition || 'Baik',
            status: input.status || 'Digunakan Sendiri',
            area_sqm: input.area_sqm ? parseFloat(input.area_sqm) : null,
            certificate_status: input.certificate_status || null,
            certificate_number: input.certificate_number || null,
            certificate_date: input.certificate_date || null,
            police_number: input.police_number || null,
            chassis_number: input.chassis_number || null,
            engine_number: input.engine_number || null,
            brand_type: input.brand_type || null,
            capacity_spec: input.capacity_spec || null,
            custodian_name: input.custodian_name || null,
            building_floors: input.building_floors ? parseInt(input.building_floors) : null,
            construction_type: input.construction_type || null,
            imb_number: input.imb_number || null,
            length_km: input.length_km ? parseFloat(input.length_km) : null,
            contract_value: input.contract_value ? parseFloat(input.contract_value) : null,
            progress_percentage: input.progress_percentage ? parseFloat(input.progress_percentage) : null,
            notes: input.notes || null,
            created_at: new Date().toISOString()
        };

        this.data.assets.unshift(newAsset);
        this.save();

        return {
            success: true,
            message: 'Data aset berhasil dicatat dalam SIMBADA Pemprov Lampung',
            id: nextId,
            asset_code: assetCode
        };
    },

    updateAsset(id, input) {
        if (!this.data) this.init();
        const index = this.data.assets.findIndex(a => Number(a.id) === Number(id));
        if (index === -1) return { success: false, message: 'Aset tidak ditemukan' };

        const old = this.data.assets[index];
        this.data.assets[index] = {
            ...old,
            name: input.name || old.name,
            category_id: input.category_id || old.category_id,
            opd_id: Number(input.opd_id) || old.opd_id,
            regency_name: input.regency_name || old.regency_name,
            district: input.district !== undefined ? input.district : old.district,
            address: input.address !== undefined ? input.address : old.address,
            latitude: input.latitude ? parseFloat(input.latitude) : old.latitude,
            longitude: input.longitude ? parseFloat(input.longitude) : old.longitude,
            acquisition_year: Number(input.acquisition_year) || old.acquisition_year,
            acquisition_value: parseFloat(input.acquisition_value) || old.acquisition_value,
            book_value: parseFloat(input.book_value) || old.book_value,
            condition: input.condition || old.condition,
            status: input.status || old.status,
            area_sqm: input.area_sqm ? parseFloat(input.area_sqm) : old.area_sqm,
            certificate_status: input.certificate_status || old.certificate_status,
            certificate_number: input.certificate_number || old.certificate_number,
            certificate_date: input.certificate_date || old.certificate_date,
            police_number: input.police_number || old.police_number,
            brand_type: input.brand_type || old.brand_type,
            capacity_spec: input.capacity_spec || old.capacity_spec,
            custodian_name: input.custodian_name || old.custodian_name,
            building_floors: input.building_floors ? parseInt(input.building_floors) : old.building_floors,
            construction_type: input.construction_type || old.construction_type,
            imb_number: input.imb_number || old.imb_number,
            length_km: input.length_km ? parseFloat(input.length_km) : old.length_km,
            contract_value: input.contract_value ? parseFloat(input.contract_value) : old.contract_value,
            progress_percentage: input.progress_percentage ? parseFloat(input.progress_percentage) : old.progress_percentage,
            notes: input.notes !== undefined ? input.notes : old.notes,
            updated_at: new Date().toISOString()
        };

        this.save();
        return { success: true, message: 'Data aset berhasil diperbarui' };
    },

    deleteAsset(id) {
        if (!this.data) this.init();
        this.data.assets = this.data.assets.filter(a => Number(a.id) !== Number(id));
        if (this.data.maintenance_logs) {
            this.data.maintenance_logs = this.data.maintenance_logs.filter(m => Number(m.asset_id) !== Number(id));
        }
        this.save();
        return { success: true, message: 'Data aset berhasil dihapus dari inventaris' };
    },

    addMaintenanceLog(input) {
        if (!this.data) this.init();
        if (!this.data.maintenance_logs) this.data.maintenance_logs = [];

        const nextId = (this.data.maintenance_logs.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0) + 1);
        const log = {
            id: nextId,
            asset_id: Number(input.asset_id),
            maintenance_date: input.maintenance_date || new Date().toISOString().split('T')[0],
            description: input.description,
            cost: parseFloat(input.cost) || 0,
            service_provider: input.service_provider || null,
            technician: input.technician || null,
            created_at: new Date().toISOString()
        };

        this.data.maintenance_logs.unshift(log);
        this.save();
        return { success: true, message: 'Catatan pemeliharaan aset berhasil disimpan' };
    }
};

window.Store = Store;
Store.init();
