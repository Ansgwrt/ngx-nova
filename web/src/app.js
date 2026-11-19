        const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

        const siteTypes = [
            { id: 'proxy', name: '反向代理' },
            { id: 'static', name: '静态站点' },
            { id: 'lb', name: '负载均衡' },
            { id: 'redirect', name: '域名重定向' }
        ];

        const siteTypeLabels = {
            proxy: '反向代理',
            static: '静态站点',
            lb: '负载均衡',
            redirect: '域名重定向'
        };

        const siteTypeDesc = {
            proxy: '将流量转发到指定后端服务，适合动态服务或上游应用。',
            static: '提供纯静态内容，可直接上传到对应目录。',
            lb: '对多个后端节点做轮询调度，提升集群可用性。',
            redirect: '把请求 301 重定向到新的目标域名或地址。'
        };

        const siteTypeStyles = {
            proxy: 'bg-blue-500/10 text-blue-300 border-blue-400/40',
            static: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/40',
            lb: 'bg-purple-500/10 text-purple-300 border-purple-400/40',
            redirect: 'bg-orange-500/10 text-orange-300 border-orange-400/40'
        };

        const navItems = [
            { id: 'dashboard', label: '控制中心', icon: 'fa-gauge' },
            { id: 'sites', label: '站点管理', icon: 'fa-globe' },
            { id: 'streams', label: '端口转发', icon: 'fa-network-wired' },
            { id: 'logs', label: '日志中心', icon: 'fa-scroll' },
            { id: 'notifications', label: '通知设置', icon: 'fa-bell' },
            { id: 'backup', label: '备份恢复', icon: 'fa-cloud' }
        ];

        // 手机底部导航只放高频入口，其余通过抽屉进入
        const mobileTabs = [
            { id: 'dashboard', label: '控制台', icon: 'fa-gauge' },
            { id: 'sites', label: '站点', icon: 'fa-globe' },
            { id: 'streams', label: '转发', icon: 'fa-network-wired' },
            { id: 'logs', label: '日志', icon: 'fa-scroll' },
            { id: 'more', label: '更多', icon: 'fa-ellipsis' }
        ];

        const emptyVersionReport = () => ({
            installed: '',
            branch: 'unknown',
            status: 'unknown',
            upgrade_to: '',
            latest_stable: '',
            latest_mainline: '',
            vulnerable: false,
            affected: [],
            major_count: 0,
            total_affected: 0,
            advisory_source: 'https://nginx.org/en/security_advisories.html',
            advisory_generated_at: '',
            summary: ''
        });

        // 与后端 BuildNginxFromSource 打印的日志锚点对应，用于估算安装进度
        const installPhases = [
            { label: '安装编译依赖', match: '>>> 安装编译依赖' },
            { label: '下载源码', match: '>>> 下载' },
            { label: '完整性校验', match: '>>> 校验源码完整性' },
            { label: 'configure', match: '>>> configure' },
            { label: '编译并安装', match: '>>> 安装到系统路径' },
            { label: '配置系统服务', match: '✅ 已写入 systemd unit' }
        ];
        const defaultBackupSourceDir = '/etc/nginx';

        const defaultSite = () => ({
            domain: '',
            type: 'proxy',
            backend_ip: '127.0.0.1',
            backend_port: 80,
            backends: [],
            target_url: ''
        });

        const defaultStream = () => ({
            name: '',
            listen_port: 0,
            target: ''
        });

        const defaultNotificationSettings = () => ({
            traffic_threshold: 80,
            server_expiry_date: '',
            expiry_notify_days: 7,
            server_label: '',
            traffic_monthly_limit_gb: 0,
            dingtalk: { enabled: false, webhook: '', secret: '' },
            telegram: { enabled: false, bot_token: '', chat_id: '' },
            last_updated_unix_time: 0
        });

        createApp({
            setup() {
                const currentTab = ref('dashboard');
                const mobileNavOpen = ref(false);
                const versionReport = ref(emptyVersionReport());
                const showVersionModal = ref(false);
                const status = ref({ nginx_active: false, nginx_version: '' });
                const siteConfigs = ref([]);
                const selectedSite = ref('');
                const showSiteModal = ref(false);
                const isSiteEdit = ref(false);
                const siteForm = ref(defaultSite());
                const backendsText = ref('');
                const showRawModal = ref(false);
                const rawContentDraft = ref('');
                const rawLoading = ref(false);
                const streams = ref([]);
                const showStreamModal = ref(false);
                const isStreamEdit = ref(false);
                const streamForm = ref(defaultStream());
                const showStreamRawModal = ref(false);
                const streamRawName = ref('');
                const streamRawContent = ref('');
                const streamRawLoading = ref(false);
                const siteLogs = ref([]);
                const siteLogsLoading = ref(false);
                const todayText = new Date().toLocaleDateString();
                const showLogModal = ref(false);
                const logModalSite = ref('');
                const logModalContent = ref({ access: [], error: [] });

                const backupStatus = ref({
                    rclone_configured: false,
                    backup_configured: false,
                    source_dir: defaultBackupSourceDir,
                    remote_path: '',
                    access_key: '',
                    endpoint: '',
                    has_secret: false
                });
                const backupStatusLoading = ref(false);
                const backupForm = ref({
                    access_key: '',
                    secret_key: '',
                    endpoint: '',
                    source_dir: defaultBackupSourceDir,
                    remote_path: ''
                });
                const skipInitialBackup = ref(false);
                const backupSaving = ref(false);
                const backupRunLoading = ref(false);
                const backupTestLoading = ref(false);
                const restoreForm = ref({ remote_path: '' });
                const restoreLoading = ref(false);

                const storedToken = localStorage.getItem('apiToken') || '';
                const storedExpiry = localStorage.getItem('sessionExpiresAt') || '';
                const apiToken = ref(storedToken);
                const loginToken = ref(storedToken);
                const loginError = ref('');
                const authenticating = ref(false);
                const isAuthenticated = ref(false);
                const tokenExpiresAt = ref(storedExpiry);

                const formatBytes = (value) => {
                    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
                    let bytes = Number(value) || 0;
                    if (bytes <= 0) {
                        return '0 B';
                    }
                    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
                    const scaled = bytes / Math.pow(1024, exponent);
                    return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)} ${units[exponent]}`;
                };

                const notifications = ref([]);
                const notify = (type, message) => {
                    const id = Date.now() + Math.random();
                    notifications.value.push({ id, type, message });
                    setTimeout(() => {
                        notifications.value = notifications.value.filter(n => n.id !== id);
                    }, 4000);
                };
                const removeNotification = (id) => {
                    notifications.value = notifications.value.filter(n => n.id !== id);
                };
                const noticeStyle = (type) => ({
                    success: 'border-emerald-400/40 text-emerald-200',
                    error: 'border-red-400/40 text-red-200',
                    info: 'border-blue-400/40 text-blue-200'
                }[type] || 'border-white/10 text-gray-200');

                const notificationSettings = ref(defaultNotificationSettings());
                const notificationLoading = ref(false);
                const notificationSaving = ref(false);

                const normalizeNotificationPayload = (data = {}) => {
                    const normalized = defaultNotificationSettings();
                    const dingtalkData = data.dingtalk || {};
                    const telegramData = data.telegram || {};
                    if (Number.isFinite(Number(data.traffic_threshold))) {
                        normalized.traffic_threshold = Number(data.traffic_threshold);
                    }
                    if (typeof data.server_expiry_date === 'string') {
                        normalized.server_expiry_date = data.server_expiry_date;
                    }
                    if (Number.isFinite(Number(data.expiry_notify_days))) {
                        normalized.expiry_notify_days = Number(data.expiry_notify_days);
                    }
                    if (typeof data.server_label === 'string') {
                        normalized.server_label = data.server_label;
                    }
                    if (Number.isFinite(Number(data.traffic_monthly_limit_gb))) {
                        normalized.traffic_monthly_limit_gb = Number(data.traffic_monthly_limit_gb);
                    }
                    normalized.dingtalk.enabled = !!dingtalkData.enabled;
                    normalized.dingtalk.webhook = dingtalkData.webhook || '';
                    normalized.dingtalk.secret = dingtalkData.secret || '';
                    normalized.telegram.enabled = !!telegramData.enabled;
                    normalized.telegram.bot_token = telegramData.bot_token || '';
                    normalized.telegram.chat_id = telegramData.chat_id || '';
                    if (Number.isFinite(Number(data.last_updated_unix_time))) {
                        normalized.last_updated_unix_time = Number(data.last_updated_unix_time);
                    } else if (Number.isFinite(Number(data.updated_at_unix))) {
                        normalized.last_updated_unix_time = Number(data.updated_at_unix);
                    }
                    return normalized;
                };

                const notificationLastUpdated = computed(() => {
                    const ts = Number(notificationSettings.value.last_updated_unix_time) || 0;
                    if (!ts) {
                        return '尚未保存';
                    }
                    const time = new Date(ts * 1000);
                    if (Number.isNaN(time.getTime())) {
                        return '尚未保存';
                    }
                    return time.toLocaleString();
                });

                const readJson = async (res) => {
                    const contentType = res.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        return await res.json().catch(() => ({}));
                    }
                    return {};
                };

                const installStatus = ref({ logs: [], is_running: false, exit_code: 0 });
                const showInstallModal = ref(false);
                const installPolling = ref(false);
                const installLogRef = ref(null);

                const tabTitle = computed(() => ({
                    dashboard: '控制中心',
                    sites: '站点管理',
                    streams: '端口转发',
                    logs: '日志中心',
                    notifications: '通知设置',
                    backup: 'Backup & Restore'
                }[currentTab.value] || '控制中心'));

                const siteStats = computed(() => {
                    const summary = { total: siteConfigs.value.length, proxy: 0, static: 0, lb: 0, redirect: 0 };
                    siteConfigs.value.forEach(site => {
                        summary[site.type] = (summary[site.type] || 0) + 1;
                    });
                    return summary;
                });

                const selectedSiteDetail = computed(() => siteConfigs.value.find(site => site.domain === selectedSite.value) || null);

                const advisoryCount = computed(() => Number(versionReport.value.advisory_total) || 0);

                const versionBadge = computed(() => {
                    const r = versionReport.value || {};
                    if (r.vulnerable) {
                        return {
                            label: `命中 ${r.total_affected || 0} 条公告`,
                            icon: 'fa-triangle-exclamation',
                            bg: 'bg-red-500/15 border-red-400/40 text-red-300',
                            chip: 'bg-red-500/15 text-red-200 border-red-400/40'
                        };
                    }
                    if (r.status === 'up_to_date') {
                        return {
                            label: '最新修复版',
                            icon: 'fa-shield-alt',
                            bg: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
                            chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                        };
                    }
                    if (r.status === 'upgrade_recommended') {
                        return {
                            label: '建议升级',
                            icon: 'fa-arrow-up',
                            bg: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
                            chip: 'bg-amber-500/15 text-amber-200 border-amber-400/40'
                        };
                    }
                    return {
                        label: '未检测到',
                        icon: 'fa-circle-question',
                        bg: 'bg-white/5 border-white/10 text-gray-400',
                        chip: 'bg-white/5 text-gray-300 border-white/10'
                    };
                });

                const selectTab = (id) => {
                    currentTab.value = id;
                    mobileNavOpen.value = false;
                };

                const onMobileTab = (item) => {
                    if (item.id === 'more') {
                        mobileNavOpen.value = true;
                        return;
                    }
                    selectTab(item.id);
                };

                const installProgress = computed(() => {
                    if (!installStatus.value) return 0;
                    const logs = installStatus.value.logs || [];
                    let done = 0;
                    installPhases.forEach(phase => {
                        if (logs.some(line => line.includes(phase.match))) {
                            done += 1;
                        }
                    });
                    let progress = (done / installPhases.length) * 100;
                    if (installStatus.value.is_running) {
                        progress = Math.min(progress, 95);
                    } else {
                        progress = (installStatus.value.exit_code === 0 && logs.length)
                            ? 100
                            : Math.max(Math.min(progress, 100), 5);
                    }
                    return Math.min(100, Math.round(progress));
                });

                const installStatusText = computed(() => {
                    if (installStatus.value.is_running) {
                        return '安装任务正在执行...';
                    }
                    if (installStatus.value.exit_code === 0) {
                        return installStatus.value.logs.length ? '安装任务已完成' : '暂无安装记录';
                    }
                    return '安装任务失败，请查看日志';
                });

                const trafficSummary = computed(() => {
                    const stats = (status.value && status.value.network_traffic) ? status.value.network_traffic : {};
                    const cycleUsed = Number(stats.cycle_used_bytes);
                    const totalBytes = Number.isFinite(cycleUsed) && cycleUsed >= 0
                        ? cycleUsed
                        : (Number(stats.total_bytes) || 0);
                    const limitBytes = Number(stats.cycle_limit_bytes) || 0;
                    const progress = limitBytes > 0
                        ? Math.min(100, Math.round((totalBytes / limitBytes) * 100))
                        : null;
                    let nextReset = '';
                    if (stats.cycle_next_reset) {
                        const t = new Date(stats.cycle_next_reset);
                        if (!Number.isNaN(t.getTime())) {
                            nextReset = t.toLocaleDateString();
                        }
                    }
                    let cycleStart = '';
                    if (stats.cycle_start) {
                        const t = new Date(stats.cycle_start);
                        if (!Number.isNaN(t.getTime())) {
                            cycleStart = t.toLocaleDateString();
                        }
                    }
                    return {
                        totalLabel: formatBytes(totalBytes),
                        limitLabel: limitBytes > 0 ? formatBytes(limitBytes) : '',
                        nextReset,
                        cycleStart,
                        progress,
                        hasLimit: limitBytes > 0
                    };
                });

                const sessionExpiryText = computed(() => {
                    if (!tokenExpiresAt.value) return '';
                    const expire = new Date(tokenExpiresAt.value);
                    if (Number.isNaN(expire.getTime())) return '';
                    return expire.toLocaleString();
                });

                const siteTypeLabel = (type) => siteTypeLabels[type] || type;
                const siteTypeDescription = (type) => siteTypeDesc[type] || '';
                const siteTypeStyle = (type) => siteTypeStyles[type] || 'bg-white/5 text-gray-200 border-white/10';

                const withAuth = (options = {}) => {
                    const opts = { ...options };
                    opts.headers = { ...(opts.headers || {}) };
                    if (apiToken.value) {
                        opts.headers['Authorization'] = 'Bearer ' + apiToken.value;
                    }
                    return opts;
                };

                let statusTimer = null;
                let installTimer = null;

                const stopPolling = () => {
                    if (statusTimer) {
                        clearInterval(statusTimer);
                        statusTimer = null;
                    }
                };

                const startPolling = () => {
                    stopPolling();
                    statusTimer = setInterval(fetchStatus, 5000);
                };

                const stopInstallPolling = () => {
                    if (installTimer) {
                        clearInterval(installTimer);
                        installTimer = null;
                    }
                    installPolling.value = false;
                };

                const startInstallPolling = () => {
                    if (installTimer) return;
                    installPolling.value = true;
                    installTimer = setInterval(fetchInstallLogs, 2000);
                };

                const logout = (showMessage = true) => {
                    stopPolling();
                    stopInstallPolling();
                    apiToken.value = '';
                    localStorage.removeItem('apiToken');
                    localStorage.removeItem('sessionExpiresAt');
                    isAuthenticated.value = false;
                    loginToken.value = '';
                    siteConfigs.value = [];
                    streams.value = [];
                    selectedSite.value = '';
                    showSiteModal.value = false;
                    showStreamModal.value = false;
                    showRawModal.value = false;
                    showStreamRawModal.value = false;
                    streamRawName.value = '';
                    streamRawContent.value = '';
                    streamRawLoading.value = false;
                    showLogModal.value = false;
                    logModalSite.value = '';
                    logModalContent.value = { access: [], error: [] };
                    siteLogs.value = [];
                    siteLogsLoading.value = false;
                    rawContentDraft.value = '';
                    tokenExpiresAt.value = '';
                    backupStatus.value = {
                        rclone_configured: false,
                        backup_configured: false,
                        source_dir: defaultBackupSourceDir,
                        remote_path: '',
                        access_key: '',
                        endpoint: '',
                        has_secret: false
                    };
                    backupStatusLoading.value = false;
                    backupForm.value = {
                        access_key: '',
                        secret_key: '',
                        endpoint: '',
                        source_dir: defaultBackupSourceDir,
                        remote_path: ''
                    };
                    skipInitialBackup.value = false;
                    backupSaving.value = false;
                    backupRunLoading.value = false;
                    backupTestLoading.value = false;
                    restoreForm.value = { remote_path: '' };
                    mobileNavOpen.value = false;
                    showVersionModal.value = false;
                    versionReport.value = emptyVersionReport();
                    restoreLoading.value = false;
                    notificationSettings.value = defaultNotificationSettings();
                    notificationLoading.value = false;
                    notificationSaving.value = false;
                    if (showMessage) {
                        notify('info', '已退出登录');
                    }
                };

                const handleUnauthorized = (message = '认证已过期，请重新登录') => {
                    logout(false);
                    loginError.value = message;
                    notify('error', message);
                };

                const ensureSiteSelection = () => {
                    if (!siteConfigs.value.length) {
                        selectedSite.value = '';
                        return;
                    }
                    if (!selectedSite.value || !siteConfigs.value.find(site => site.domain === selectedSite.value)) {
                        selectedSite.value = siteConfigs.value[0].domain;
                    }
                };

                const fetchStatus = async () => {
                    if (!isAuthenticated.value) return;
                    try {
                        const res = await fetch('/api/v1/system/status', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            status.value = data;
                        }
                    } catch (e) {
                        notify('error', '获取系统状态失败: ' + e.message);
                    }
                };

                const fetchSites = async () => {
                    if (!isAuthenticated.value) return;
                    try {
                        const res = await fetch('/api/v1/sites/details', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            siteConfigs.value = data;
                            ensureSiteSelection();
                        }
                    } catch (e) {
                        notify('error', '获取站点列表失败: ' + e.message);
                    }
                };

                const fetchStreams = async () => {
                    if (!isAuthenticated.value) return;
                    try {
                        const res = await fetch('/api/v1/streams/details', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            streams.value = data;
                        }
                    } catch (e) {
                        notify('error', '获取端口转发失败: ' + e.message);
                    }
                };

                const fetchNotificationSettings = async () => {
                    if (!isAuthenticated.value) return;
                    notificationLoading.value = true;
                    try {
                        const res = await fetch('/api/v1/settings/notifications', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notificationSettings.value = normalizeNotificationPayload(data);
                        } else {
                            notify('error', '获取通知设置失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '获取通知设置失败: ' + e.message);
                    } finally {
                        notificationLoading.value = false;
                    }
                };

                const saveNotificationSettings = async () => {
                    const serverLabel = (notificationSettings.value.server_label || '').trim();
                    const monthlyLimit = Number(notificationSettings.value.traffic_monthly_limit_gb) || 0;
                    const payload = {
                        traffic_threshold: Number(notificationSettings.value.traffic_threshold) || 0,
                        server_expiry_date: (notificationSettings.value.server_expiry_date || '').trim(),
                        expiry_notify_days: Number(notificationSettings.value.expiry_notify_days) || 0,
                        server_label: serverLabel,
                        traffic_monthly_limit_gb: monthlyLimit < 0 ? 0 : Number(monthlyLimit.toFixed(2)),
                        dingtalk: {
                            enabled: !!notificationSettings.value.dingtalk.enabled,
                            webhook: (notificationSettings.value.dingtalk.webhook || '').trim(),
                            secret: (notificationSettings.value.dingtalk.secret || '').trim()
                        },
                        telegram: {
                            enabled: !!notificationSettings.value.telegram.enabled,
                            bot_token: (notificationSettings.value.telegram.bot_token || '').trim(),
                            chat_id: (notificationSettings.value.telegram.chat_id || '').trim()
                        }
                    };

                    if (payload.traffic_threshold < 0 || payload.traffic_threshold > 100) {
                        notify('error', '流量阈值请设置在 0 - 100 之间');
                        return;
                    }
                    if (payload.expiry_notify_days < 0) {
                        notify('error', '提前通知天数不能为负数');
                        return;
                    }
                    if (payload.server_expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(payload.server_expiry_date)) {
                        notify('error', '到期日期格式应为 YYYY-MM-DD');
                        return;
                    }
                    if (payload.traffic_monthly_limit_gb < 0) {
                        notify('error', '月流量上限不能为负数');
                        return;
                    }
                    if (payload.dingtalk.enabled && !payload.dingtalk.webhook) {
                        notify('error', '启用钉钉通知时请填写 Webhook 地址');
                        return;
                    }
                    if (payload.telegram.enabled && (!payload.telegram.bot_token || !payload.telegram.chat_id)) {
                        notify('error', '启用 Telegram 通知时请填写 Bot Token 与 Chat ID');
                        return;
                    }

                    notificationSaving.value = true;
                    try {
                        const res = await fetch('/api/v1/settings/notifications', withAuth({
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notificationSettings.value = normalizeNotificationPayload(data);
                            notify('success', '通知设置已保存');
                        } else {
                            notify('error', '保存失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '保存失败: ' + e.message);
                    } finally {
                        notificationSaving.value = false;
                    }
                };

                const refreshSiteLogs = async (notifyError = false) => {
                    if (!isAuthenticated.value) return false;
                    siteLogsLoading.value = true;
                    let success = false;
                    try {
                        const res = await fetch('/api/v1/system/site-logs', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return false;
                        }
                        if (res.ok) {
                            const list = Array.isArray(data) ? data : [];
                            list.sort((a, b) => (a.domain || '').localeCompare(b.domain || '', 'zh-Hans-CN'));
                            siteLogs.value = list.map(item => ({
                                domain: item.domain || '',
                                access: Array.isArray(item.access) ? item.access : [],
                                error: Array.isArray(item.error) ? item.error : []
                            }));
                            success = true;
                        } else if (notifyError) {
                            notify('error', '获取站点日志失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        if (notifyError) {
                            notify('error', '获取站点日志失败: ' + e.message);
                        }
                    } finally {
                        siteLogsLoading.value = false;
                    }
                    return success;
                };

                const siteLogsMap = computed(() => {
                    const map = {};
                    (siteLogs.value || []).forEach(entry => {
                        if (!entry || !entry.domain) return;
                        map[entry.domain] = {
                            access: Array.isArray(entry.access) ? entry.access : [],
                            error: Array.isArray(entry.error) ? entry.error : []
                        };
                    });
                    return map;
                });

                const logPreview = (entry, kind) => {
                    if (!entry) return '';
                    const lines = Array.isArray(entry[kind]) ? entry[kind] : [];
                    if (!lines.length) return '';
                    const slice = lines.slice(-Math.min(lines.length, 3));
                    return slice.join('\n');
                };

                const openLogViewer = async (domain) => {
                    if (!domain) return;
                    let entry = siteLogsMap.value[domain];
                    if (!entry) {
                        const ok = await refreshSiteLogs(true);
                        if (ok) {
                            entry = siteLogsMap.value[domain];
                        }
                    }
                    if (!entry || (!entry.access.length && !entry.error.length)) {
                        notify('info', domain + ' 暂无日志记录');
                        return;
                    }
                    logModalSite.value = domain;
                    logModalContent.value = {
                        access: entry.access.slice(),
                        error: entry.error.slice()
                    };
                    showLogModal.value = true;
                    await nextTick();
                };

                const copyLog = async (kind) => {
                    const labels = { access: '访问日志', error: '错误日志' };
                    const lines = Array.isArray(logModalContent.value[kind]) ? logModalContent.value[kind] : [];
                    if (!lines.length) {
                        notify('info', (labels[kind] || '日志') + '为空，无法复制');
                        return;
                    }
                    const text = lines.join('\n');
                    try {
                        if (navigator.clipboard?.writeText) {
                            await navigator.clipboard.writeText(text);
                        } else {
                            const textarea = document.createElement('textarea');
                            textarea.value = text;
                            textarea.setAttribute('readonly', '');
                            textarea.style.position = 'fixed';
                            textarea.style.left = '-9999px';
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                        }
                        notify('success', (labels[kind] || '日志') + '已复制');
                    } catch (err) {
                        notify('error', '复制失败: ' + (err?.message || '未知错误'));
                    }
                };

                const closeLogModal = () => {
                    showLogModal.value = false;
                    logModalSite.value = '';
                    logModalContent.value = { access: [], error: [] };
                };

                const refreshSingleLog = async (domain) => {
                    if (!domain) return;
                    const ok = await refreshSiteLogs(true);
                    if (ok) {
                        const entry = siteLogsMap.value[domain];
                        if (entry && (entry.access.length || entry.error.length)) {
                            notify('success', domain + ' 日志已刷新');
                        } else {
                            notify('info', domain + ' 暂无日志记录');
                        }
                    }
                };

                const syncBackupFormFromStatus = (force = false) => {
                    const statusSnapshot = backupStatus.value || {};
                    if (force || !backupForm.value.access_key) {
                        backupForm.value.access_key = statusSnapshot.access_key || '';
                    }
                    if (force || !backupForm.value.endpoint) {
                        backupForm.value.endpoint = statusSnapshot.endpoint || '';
                    }
                    if (force || !backupForm.value.source_dir) {
                        backupForm.value.source_dir = statusSnapshot.source_dir || defaultBackupSourceDir;
                    }
                    if (force || !backupForm.value.remote_path) {
                        backupForm.value.remote_path = statusSnapshot.remote_path || '';
                    }
                    if (!restoreForm.value.remote_path && statusSnapshot.remote_path) {
                        restoreForm.value.remote_path = statusSnapshot.remote_path;
                    }
                };

                const fetchBackupStatus = async (notifyError = true, forceSync = false) => {
                    if (!isAuthenticated.value) return;
                    backupStatusLoading.value = true;
                    try {
                        const res = await fetch('/api/v1/backup/status', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            const normalized = {
                                rclone_configured: !!data.rclone_configured,
                                backup_configured: !!data.backup_configured,
                                source_dir: data.source_dir || defaultBackupSourceDir,
                                remote_path: data.remote_path || '',
                                access_key: data.access_key || '',
                                endpoint: data.endpoint || '',
                                has_secret: !!data.has_secret
                            };
                            backupStatus.value = normalized;
                            syncBackupFormFromStatus(forceSync);
                        } else if (notifyError) {
                            notify('error', '获取备份状态失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        if (notifyError) {
                            notify('error', '获取备份状态失败: ' + e.message);
                        }
                    } finally {
                        backupStatusLoading.value = false;
                    }
                };

                const saveBackupSetup = async () => {
                    const accessKey = (backupForm.value.access_key || '').trim();
                    const secretKey = (backupForm.value.secret_key || '').trim();
                    const endpoint = (backupForm.value.endpoint || '').trim();
                    const sourceDir = ((backupForm.value.source_dir || defaultBackupSourceDir).trim()) || defaultBackupSourceDir;
                    const remotePath = (backupForm.value.remote_path || '').trim();

                    if (!sourceDir || !remotePath) {
                        notify('error', '请填写备份源目录与 R2 存储路径');
                        return;
                    }

                    if (!backupStatus.value.rclone_configured && (!accessKey || !secretKey || !endpoint)) {
                        notify('error', '首次配置请完整填写 Cloudflare R2 凭证');
                        return;
                    }

                    const payload = {
                        access_key: accessKey,
                        secret_key: secretKey,
                        endpoint,
                        source_dir: sourceDir,
                        remote_path: remotePath,
                        skip_initial_backup: !!skipInitialBackup.value
                    };

                    if (!secretKey) {
                        if (accessKey === (backupStatus.value.access_key || '')) {
                            payload.access_key = '';
                        }
                        if (endpoint === (backupStatus.value.endpoint || '')) {
                            payload.endpoint = '';
                        }
                    }

                    const hasPartialCreds = (payload.access_key !== '' || payload.endpoint !== '') && payload.secret_key === '';
                    if (hasPartialCreds) {
                        notify('error', '更新 Cloudflare R2 凭证时需同时填写 Access Key、Secret Key 与 Endpoint');
                        return;
                    }
                    if (payload.secret_key && (payload.access_key === '' || payload.endpoint === '')) {
                        notify('error', '更新 Cloudflare R2 凭证时需同时填写 Access Key、Secret Key 与 Endpoint');
                        return;
                    }

                    backupSaving.value = true;
                    try {
                        const res = await fetch('/api/v1/backup/setup', withAuth({
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '备份配置已保存');
                            backupForm.value.secret_key = '';
                            skipInitialBackup.value = false;
                            await fetchBackupStatus(false, true);
                        } else {
                            notify('error', '配置失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '配置失败: ' + e.message);
                    } finally {
                        backupSaving.value = false;
                    }
                };

                const runBackupNow = async () => {
                    if (!backupStatus.value.backup_configured) {
                        notify('error', '请先完成备份配置');
                        return;
                    }
                    backupRunLoading.value = true;
                    try {
                        const res = await fetch('/api/v1/backup/run', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '备份任务已执行');
                            await fetchBackupStatus(false);
                        } else {
                            notify('error', '备份失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '备份失败: ' + e.message);
                    } finally {
                        backupRunLoading.value = false;
                    }
                };

                const testBackupConnection = async () => {
                    if (!backupStatus.value.rclone_configured) {
                        notify('error', '尚未配置 Cloudflare R2 凭证');
                        return;
                    }
                    backupTestLoading.value = true;
                    try {
                        const res = await fetch('/api/v1/backup/test', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '连接正常');
                        } else {
                            notify('error', '测试失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '测试失败: ' + e.message);
                    } finally {
                        backupTestLoading.value = false;
                    }
                };

                const restoreBackup = async () => {
                    if (!backupStatus.value.backup_configured) {
                        notify('error', '请先完成备份配置');
                        return;
                    }
                    const remote = (restoreForm.value.remote_path || '').trim();
                    if (!remote && !backupStatus.value.remote_path) {
                        notify('error', '请填写 Cloudflare R2 存储路径');
                        return;
                    }
                    if (!confirm('恢复操作将覆盖 /etc/nginx 现有配置，是否继续？')) return;
                    restoreLoading.value = true;
                    try {
                        const res = await fetch('/api/v1/backup/restore', withAuth({
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ remote_path: remote })
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '恢复任务完成');
                            await fetchStatus();
                        } else {
                            notify('error', '恢复失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '恢复失败: ' + e.message);
                    } finally {
                        restoreLoading.value = false;
                    }
                };

                const fetchInstallLogs = async () => {
                    if (!isAuthenticated.value) return;
                    try {
                        const res = await fetch('/api/v1/install/logs', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            const rawLogs = Array.isArray(data.logs)
                                ? data.logs
                                : (typeof data.logs === 'string' && data.logs ? [data.logs] : []);
                            const exitCodeRaw = typeof data.exit_code === 'number'
                                ? data.exit_code
                                : parseInt(data.exit_code, 10);
                            const normalizedExitCode = Number.isFinite(exitCodeRaw)
                                ? exitCodeRaw
                                : (installStatus.value.exit_code || 0);
                            installStatus.value = {
                                ...installStatus.value,
                                id: data.id || installStatus.value.id || 'install',
                                is_running: !!data.is_running,
                                exit_code: normalizedExitCode,
                                logs: rawLogs
                            };
                            if (!installStatus.value.is_running) {
                                stopInstallPolling();
                                await fetchStatus();
                                await fetchVersionReport();
                            }
                        }
                    } catch (e) {
                        notify('error', '获取安装日志失败: ' + e.message);
                    }
                };

                const selectSite = (domain) => {
                    selectedSite.value = domain;
                };

                const openCreateSiteModal = () => {
                    isSiteEdit.value = false;
                    siteForm.value = defaultSite();
                    backendsText.value = '';
                    showSiteModal.value = true;
                };

                const openEditSiteModal = (site) => {
                    if (!site) return;
                    isSiteEdit.value = true;
                    siteForm.value = JSON.parse(JSON.stringify(site));
                    backendsText.value = (site.backends || []).join('\n');
                    showSiteModal.value = true;
                };

                const prepareSitePayload = () => {
                    const payload = JSON.parse(JSON.stringify(siteForm.value));
                    payload.domain = (payload.domain || '').trim();
                    if (!payload.domain) {
                        notify('error', '域名不能为空');
                        throw new Error('invalid');
                    }
                    if (payload.type === 'lb') {
                        payload.backends = backendsText.value.split('\n').map(i => i.trim()).filter(Boolean);
                    } else {
                        payload.backends = [];
                    }
                    payload.backend_port = Number(payload.backend_port) || 0;
                    if (payload.type !== 'proxy') {
                        payload.backend_ip = payload.backend_ip || '';
                        payload.backend_port = payload.backend_port || 0;
                    }
                    if (payload.type !== 'redirect') {
                        payload.target_url = payload.target_url || '';
                    }
                    return payload;
                };

                const saveSite = async () => {
                    let payload;
                    try {
                        payload = prepareSitePayload();
                    } catch (_) {
                        return;
                    }
                    const method = isSiteEdit.value ? 'PUT' : 'POST';
                    const url = isSiteEdit.value ? '/api/v1/sites/' + payload.domain : '/api/v1/sites';
                    try {
                        const res = await fetch(url, withAuth({
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            showSiteModal.value = false;
                            await fetchSites();
                            notify('success', isSiteEdit.value ? '站点更新成功' : '站点创建成功');
                        } else {
                            notify('error', '操作失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const deleteSite = async (domain) => {
                    if (!domain) return;
                    if (!confirm('确定要删除站点 ' + domain + ' 吗？')) return;
                    try {
                        const res = await fetch('/api/v1/sites/' + domain, withAuth({ method: 'DELETE' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', '站点已删除');
                            await fetchSites();
                        } else {
                            notify('error', '删除失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const openRawModal = async () => {
                    if (!selectedSite.value) return;
                    showRawModal.value = true;
                    rawLoading.value = true;
                    await nextTick();
                    try {
                        const res = await fetch('/api/v1/sites/' + selectedSite.value + '/raw', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            showRawModal.value = false;
                            return;
                        }
                        if (res.ok) {
                            rawContentDraft.value = data.content || '';
                        } else {
                            notify('error', '读取配置失败: ' + (data.error || res.statusText));
                            showRawModal.value = false;
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                        showRawModal.value = false;
                    } finally {
                        rawLoading.value = false;
                    }
                };

                const saveRaw = async () => {
                    if (!selectedSite.value) return;
                    rawLoading.value = true;
                    await nextTick();
                    try {
                        const res = await fetch('/api/v1/sites/' + selectedSite.value + '/raw', withAuth({
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: rawContentDraft.value })
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', '配置已验证并重载成功');
                            showRawModal.value = false;
                            await fetchSites();
                        } else {
                            notify('error', '保存失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    } finally {
                        rawLoading.value = false;
                    }
                };

                const openCreateStreamModal = () => {
                    isStreamEdit.value = false;
                    streamForm.value = defaultStream();
                    showStreamModal.value = true;
                };

                const openEditStreamModal = (stream) => {
                    if (!stream) return;
                    isStreamEdit.value = true;
                    streamForm.value = JSON.parse(JSON.stringify(stream));
                    showStreamModal.value = true;
                };

                const openStreamRawModal = async (item) => {
                    const name = typeof item === 'string' ? item : (item?.name || '');
                    if (!name) return;
                    showStreamRawModal.value = true;
                    streamRawLoading.value = true;
                    streamRawName.value = name;
                    streamRawContent.value = '';
                    await nextTick();
                    try {
                        const res = await fetch('/api/v1/streams/' + name + '/raw', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            showStreamRawModal.value = false;
                            return;
                        }
                        if (res.ok) {
                            streamRawContent.value = data.content || '';
                        } else {
                            notify('error', '读取配置失败: ' + (data.error || res.statusText));
                            showStreamRawModal.value = false;
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                        showStreamRawModal.value = false;
                    } finally {
                        streamRawLoading.value = false;
                    }
                };

                const saveStream = async () => {
                    const payload = JSON.parse(JSON.stringify(streamForm.value));
                    payload.name = (payload.name || '').trim();
                    payload.target = (payload.target || '').trim();
                    payload.listen_port = Number(payload.listen_port) || 0;
                    if (!payload.name || !payload.listen_port || !payload.target) {
                        notify('error', '请完整填写规则名称、端口和目标地址');
                        return;
                    }
                    const method = isStreamEdit.value ? 'PUT' : 'POST';
                    const url = isStreamEdit.value ? '/api/v1/streams/' + payload.name : '/api/v1/streams';
                    try {
                        const res = await fetch(url, withAuth({
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', isStreamEdit.value ? '转发规则已更新' : '转发规则创建成功');
                            showStreamModal.value = false;
                            await fetchStreams();
                        } else {
                            notify('error', '操作失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const deleteStream = async (name) => {
                    if (!confirm('确定删除转发规则 ' + name + ' 吗？')) return;
                    try {
                        const res = await fetch('/api/v1/streams/' + name, withAuth({ method: 'DELETE' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', '转发规则已删除');
                            await fetchStreams();
                        } else {
                            notify('error', '删除失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const saveStreamRaw = async () => {
                    if (!streamRawName.value) return;
                    streamRawLoading.value = true;
                    await nextTick();
                    try {
                        const res = await fetch('/api/v1/streams/' + streamRawName.value + '/raw', withAuth({
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: streamRawContent.value })
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '转发配置已更新');
                            showStreamRawModal.value = false;
                            await fetchStreams();
                        } else {
                            notify('error', '保存失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    } finally {
                        streamRawLoading.value = false;
                    }
                };

                const reloadNginx = async () => {
                    try {
                        const res = await fetch('/api/v1/system/reload', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', '配置验证并重载成功');
                        } else {
                            notify('error', '重载失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const backupConfig = async () => {
                    try {
                        const res = await fetch('/api/v1/system/backup', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', '备份完成: ' + (data.path || '未知路径'));
                        } else {
                            notify('error', '备份失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const restoreLocalBackup = async () => {
                    const path = '/root/nginx_backups';
                    try {
                        const res = await fetch('/api/v1/system/restore', withAuth({
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ path })
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', data.message || '恢复成功');
                            await fetchStatus();
                        } else {
                            notify('error', '恢复失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '恢复失败: ' + e.message);
                    }
                };

                const confirmUninstall = async () => {
                    if (!confirm('警告：此操作将彻底清除所有 Nginx 数据！是否继续？')) return;
                    try {
                        const res = await fetch('/api/v1/system/uninstall', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            notify('success', 'Nginx 已卸载');
                            await fetchStatus();
                        } else {
                            notify('error', '卸载失败: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const openInstallModal = async () => {
                    showInstallModal.value = true;
                    await nextTick();
                    await fetchInstallLogs();
                    if (installStatus.value.is_running) {
                        startInstallPolling();
                    }
                };

                const closeInstallModal = () => {
                    showInstallModal.value = false;
                };

                const startInstall = async () => {
                    try {
                        const res = await fetch('/api/v1/install', withAuth({ method: 'POST' }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.status === 202 || res.status === 200) {
                            notify('success', '安装任务已启动，请稍候');
                            await openInstallModal();
                            startInstallPolling();
                        } else if (res.status === 409) {
                            notify('info', '已有安装任务正在运行');
                            await openInstallModal();
                            startInstallPolling();
                        } else {
                            notify('error', '无法启动安装: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const fetchVersionReport = async () => {
                    if (!isAuthenticated.value) return;
                    try {
                        const res = await fetch('/api/v1/system/version', withAuth());
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.ok) {
                            versionReport.value = {
                                ...emptyVersionReport(),
                                ...data,
                                affected: Array.isArray(data.affected) ? data.affected : []
                            };
                        }
                    } catch (e) {
                        // 版本自检失败不打断主流程，仅在控制台留痕
                        console.warn('获取版本自检失败:', e);
                    }
                };

                const upgradeNginx = async () => {
                    if (installStatus.value.is_running) {
                        notify('info', '已有安装/升级任务在运行');
                        await openInstallModal();
                        return;
                    }
                    const target = versionReport.value.upgrade_to || versionReport.value.latest_stable || '';
                    const hint = target ? `将升级到 ${target}` : '将升级到 stable 通道最新版';
                    if (!window.confirm(`${hint}。\n\n过程会下载源码、编译并重载 Nginx（通常 2-5 分钟），期间站点可能短暂中断。是否继续？`)) {
                        return;
                    }
                    showVersionModal.value = false;
                    try {
                        const res = await fetch('/api/v1/system/upgrade', withAuth({
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ version: target })
                        }));
                        const data = await readJson(res);
                        if (res.status === 401) {
                            handleUnauthorized(data.error || '认证已过期，请重新登录');
                            return;
                        }
                        if (res.status === 202 || res.status === 200) {
                            notify('success', '升级任务已启动，正在编译安装');
                            await openInstallModal();
                            startInstallPolling();
                        } else if (res.status === 409) {
                            notify('info', '已有任务正在运行');
                            await openInstallModal();
                            startInstallPolling();
                        } else {
                            notify('error', '无法启动升级: ' + (data.error || res.statusText));
                        }
                    } catch (e) {
                        notify('error', '请求失败: ' + e.message);
                    }
                };

                const login = async () => {
                    loginError.value = '';
                    const token = (loginToken.value || '').trim();
                    if (!token) {
                        loginError.value = '请填写访问令牌';
                        return;
                    }
                    authenticating.value = true;
                    try {
                        const res = await fetch('/api/v1/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token })
                        });
                        const data = await readJson(res);
                        if (res.ok) {
                            apiToken.value = token;
                            localStorage.setItem('apiToken', token);
                            tokenExpiresAt.value = data.expires_at || '';
                            if (tokenExpiresAt.value) {
                                localStorage.setItem('sessionExpiresAt', tokenExpiresAt.value);
                            } else {
                                localStorage.removeItem('sessionExpiresAt');
                            }
                            isAuthenticated.value = true;
                            loginError.value = '';
                            notify('success', data.new_token ? '已设置登录令牌（24 小时有效）' : '登录成功');
                            await initializeAfterAuth();
                        } else {
                            loginError.value = data.error || res.statusText;
                            if (res.status === 401 && data.expired) {
                                loginError.value = data.error || '令牌已过期，请在终端重置';
                            }
                        }
                    } catch (e) {
                        loginError.value = '网络错误: ' + e.message;
                    } finally {
                        authenticating.value = false;
                    }
                };

                const validateStoredToken = async () => {
                    if (!apiToken.value) return;
                    authenticating.value = true;
                    try {
                        const res = await fetch('/api/v1/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: apiToken.value })
                        });
                        const data = await readJson(res);
                        if (res.ok) {
                            isAuthenticated.value = true;
                            tokenExpiresAt.value = data.expires_at || '';
                            if (tokenExpiresAt.value) {
                                localStorage.setItem('sessionExpiresAt', tokenExpiresAt.value);
                            } else {
                                localStorage.removeItem('sessionExpiresAt');
                            }
                            notify('info', '令牌验证成功，已自动登录');
                            await initializeAfterAuth();
                        } else {
                            localStorage.removeItem('apiToken');
                            localStorage.removeItem('sessionExpiresAt');
                            handleUnauthorized(data.error || '令牌验证失败，请重新登录');
                        }
                    } catch (e) {
                        notify('error', '验证令牌失败: ' + e.message);
                    } finally {
                        authenticating.value = false;
                    }
                };

                const initializeAfterAuth = async () => {
                    await Promise.all([
                        fetchStatus(),
                        fetchSites(),
                        fetchStreams(),
                        fetchInstallLogs(),
                        fetchVersionReport(),
                        fetchBackupStatus(true, true),
                        fetchNotificationSettings()
                    ]);
                    startPolling();
                    if (installStatus.value.is_running) {
                        startInstallPolling();
                    }
                };

                watch(() => installStatus.value?.logs?.length || 0, async () => {
                    await nextTick();
                    if (installLogRef.value) {
                        installLogRef.value.scrollTop = installLogRef.value.scrollHeight;
                    }
                });

                onMounted(() => {
                    if (apiToken.value) {
                        loginToken.value = apiToken.value;
                        validateStoredToken();
                    }
                });

                return {
                    currentTab,
                    navItems,
                    mobileTabs,
                    mobileNavOpen,
                    selectTab,
                    onMobileTab,
                    versionReport,
                    versionBadge,
                    advisoryCount,
                    showVersionModal,
                    fetchVersionReport,
                    upgradeNginx,
                    status,
                    siteConfigs,
                    selectedSite,
                    showSiteModal,
                    isSiteEdit,
                    siteForm,
                    backendsText,
                    showRawModal,
                    rawContentDraft,
                    rawLoading,
                    streams,
                    showStreamModal,
                    isStreamEdit,
                    streamForm,
                    tabTitle,
                    siteStats,
                    selectedSiteDetail,
                    siteTypes,
                    isAuthenticated,
                    loginToken,
                    loginError,
                    authenticating,
                    tokenExpiresAt,
                    sessionExpiryText,
                    notifications,
                    noticeStyle,
                    removeNotification,
                    siteTypeLabel,
                    siteTypeDescription,
                    siteTypeStyle,
                    installStatus,
                    showInstallModal,
                    installProgress,
                    installStatusText,
                    installLogRef,
                    trafficSummary,
                    selectSite,
                    openCreateSiteModal,
                    openEditSiteModal,
                    saveSite,
                    deleteSite,
                    openRawModal,
                    saveRaw,
                    openCreateStreamModal,
                    openEditStreamModal,
                    saveStream,
                    deleteStream,
                    showStreamRawModal,
                    streamRawName,
                    streamRawContent,
                    streamRawLoading,
                    openStreamRawModal,
                    saveStreamRaw,
                    siteLogs,
                    siteLogsLoading,
                    todayText,
                    siteLogsMap,
                    refreshSiteLogs,
                    logPreview,
                    showLogModal,
                    logModalSite,
                    logModalContent,
                    openLogViewer,
                    copyLog,
                    closeLogModal,
                    refreshSingleLog,
                    backupStatus,
                    backupStatusLoading,
                    backupForm,
                    skipInitialBackup,
                    backupSaving,
                    backupRunLoading,
                    backupTestLoading,
                    restoreForm,
                    restoreLoading,
                    fetchBackupStatus,
                    saveBackupSetup,
                    runBackupNow,
                    testBackupConnection,
                    restoreBackup,
                    notificationSettings,
                    notificationLoading,
                    notificationSaving,
                    notificationLastUpdated,
                    saveNotificationSettings,
                    reloadNginx,
                    backupConfig,
                    restoreLocalBackup,
                    confirmUninstall,
                    startInstall,
                    openInstallModal,
                    closeInstallModal,
                    login,
                    logout
                };
            }
        }).mount('#app');
    