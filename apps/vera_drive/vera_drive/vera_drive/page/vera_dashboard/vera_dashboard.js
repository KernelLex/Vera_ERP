frappe.pages['vera-dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'VE Drive Dashboard',
		single_column: true
	});

	frappe.ve_drive = new VEDriveDashboard(page);
};

class VEDriveDashboard {
	constructor(page) {
		this.page = page;
		this.current_category = 'All';
		this.files = [];
		this.init();
	}

	init() {
		this.render_layout();
		this.load_dashboard();
	}

	render_layout() {
		$(this.page.body).html(`
			<div id="ve-dashboard" style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
				<!-- Top Bar -->
				<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
					<div>
						<h2 style="margin:0; font-size:22px; font-weight:700; color:#1a1a2e;">
							Vera Enterprises — Drive Dashboard
						</h2>
						<div style="margin-top:4px; color:#666; font-size:13px;">
							Logged in as <strong>${frappe.session.user}</strong>
							&nbsp;|&nbsp; Last sync: <span id="ve-last-sync">Loading...</span>
						</div>
					</div>
					<button id="ve-sync-btn" style="
						background:#1D9E75; color:#fff; border:none; border-radius:8px;
						padding:10px 22px; font-size:14px; font-weight:600; cursor:pointer;
						display:flex; align-items:center; gap:8px; transition:opacity 0.2s;">
						⟳ Sync Now
					</button>
				</div>

				<!-- Metric Cards -->
				<div id="ve-metrics" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:28px;"></div>

				<!-- Category Filter -->
				<div id="ve-filters" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;"></div>

				<!-- File Table -->
				<div style="background:#fff; border-radius:12px; box-shadow:0 1px 8px rgba(0,0,0,0.08); overflow:hidden; margin-bottom:28px;">
					<div id="ve-table-container" style="overflow-x:auto;">
						<table style="width:100%; border-collapse:collapse; font-size:13px;">
							<thead id="ve-table-head"></thead>
							<tbody id="ve-table-body"></tbody>
						</table>
					</div>
					<div id="ve-no-files" style="display:none; padding:40px; text-align:center; color:#888;">
						No files found.
					</div>
				</div>

				<!-- Analysis Panel -->
				<div id="ve-analysis-panel" style="display:none; background:#fff; border-radius:12px; box-shadow:0 1px 8px rgba(0,0,0,0.08); padding:20px; margin-bottom:28px;">
					<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
						<h3 style="margin:0; font-size:16px; font-weight:600; color:#1a1a2e;" id="ve-analysis-title">File Analysis</h3>
						<div style="display:flex; gap:10px; flex-wrap:wrap;">
							<button class="ve-ai-btn" data-action="summarise" style="background:#f0fdf9; color:#1D9E75; border:1px solid #1D9E75; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer;">
								✦ Summarise this file
							</button>
							<button class="ve-ai-btn" data-action="anomalies" style="background:#f0fdf9; color:#1D9E75; border:1px solid #1D9E75; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer;">
								⚠ Flag anomalies
							</button>
							<button class="ve-ai-btn" data-action="compare" style="background:#f0fdf9; color:#1D9E75; border:1px solid #1D9E75; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer;">
								⇌ Compare with last month
							</button>
							<button id="ve-close-analysis" style="background:#f5f5f5; color:#666; border:none; border-radius:6px; padding:6px 14px; font-size:12px; cursor:pointer;">
								✕ Close
							</button>
						</div>
					</div>
					<div id="ve-analysis-content"></div>
				</div>

				<!-- Employee Status Cards -->
				<div>
					<h3 style="font-size:16px; font-weight:600; color:#1a1a2e; margin-bottom:16px;">Employee Upload Status — June 2026</h3>
					<div id="ve-employee-cards" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px;"></div>
				</div>
			</div>
		`);

		this.bind_events();
	}

	bind_events() {
		$('#ve-sync-btn').on('click', () => this.sync_now());
		$('#ve-close-analysis').on('click', () => {
			$('#ve-analysis-panel').hide();
		});
		$(document).on('click', '.ve-ai-btn', (e) => {
			const action = $(e.currentTarget).data('action');
			const fname = this._current_file_name || 'this file';
			let prompt = '';
			if (action === 'summarise') prompt = `Summarise the document: ${fname}`;
			if (action === 'anomalies') prompt = `Flag any financial anomalies or irregularities in: ${fname}`;
			if (action === 'compare') prompt = `Compare ${fname} with last month's equivalent document and highlight changes`;
			window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank');
		});
	}

	load_dashboard() {
		frappe.call({
			method: 'vera_drive.api.get_dashboard_stats',
			callback: (r) => {
				if (r.message) this.render_metrics(r.message);
			}
		});
		this.load_files();
	}

	render_metrics(stats) {
		$('#ve-last-sync').text(this.format_dt(stats.last_sync));

		const cards = [
			{ label: 'Files This Month', value: stats.total, icon: '📁', color: '#1D9E75' },
			{ label: 'Pending Review', value: stats.pending, icon: '🕐', color: '#F59E0B' },
			{ label: 'Flagged', value: stats.flagged, icon: '🚩', color: '#EF4444' },
			{ label: 'Last Sync', value: this.format_time_ago(stats.last_sync), icon: '⟳', color: '#6366F1' }
		];

		$('#ve-metrics').html(cards.map(c => `
			<div style="background:#fff; border-radius:12px; padding:20px; box-shadow:0 1px 8px rgba(0,0,0,0.08); border-left:4px solid ${c.color};">
				<div style="font-size:28px; margin-bottom:4px;">${c.icon}</div>
				<div style="font-size:26px; font-weight:700; color:${c.color};">${c.value}</div>
				<div style="font-size:12px; color:#888; margin-top:4px;">${c.label}</div>
			</div>
		`).join(''));
	}

	load_files() {
		frappe.call({
			method: 'vera_drive.api.get_all_files',
			args: { category: this.current_category },
			callback: (r) => {
				if (r.message !== undefined) {
					this.files = r.message;
					this.render_filters();
					this.render_table();
					this.render_employee_cards();
				}
			}
		});
	}

	render_filters() {
		const cats = ['All', 'Sales', 'Purchase', 'Accounts', 'HR', 'Logistics'];
		$('#ve-filters').html(cats.map(c => `
			<button class="ve-cat-pill" data-cat="${c}" style="
				padding:8px 18px; border-radius:20px; font-size:13px; font-weight:500; cursor:pointer;
				border:2px solid ${c === this.current_category ? '#1D9E75' : '#e5e7eb'};
				background:${c === this.current_category ? '#1D9E75' : '#fff'};
				color:${c === this.current_category ? '#fff' : '#555'};
				transition: all 0.2s;">
				${c}
			</button>
		`).join(''));

		$(document).off('click', '.ve-cat-pill').on('click', '.ve-cat-pill', (e) => {
			this.current_category = $(e.currentTarget).data('cat');
			this.load_files();
		});
	}

	render_table() {
		const files = this.files;

		if (!files.length) {
			$('#ve-table-head').html('');
			$('#ve-table-body').html('');
			$('#ve-no-files').show();
			return;
		}
		$('#ve-no-files').hide();

		$('#ve-table-head').html(`
			<tr style="background:#f9fafb; border-bottom:2px solid #e5e7eb;">
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">File Name</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Category</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Doc Type</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Party</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Date</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Status</th>
				<th style="padding:12px 16px; text-align:left; color:#555; font-weight:600;">Actions</th>
			</tr>
		`);

		$('#ve-table-body').html(files.map(f => `
			<tr style="border-bottom:1px solid #f0f0f0; transition:background 0.15s;" class="ve-file-row"
				onmouseover="this.style.background='#fafff9'" onmouseout="this.style.background='#fff'">
				<td style="padding:12px 16px; font-family:monospace; font-size:12px; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
					title="${frappe.utils.escape_html(f.file_name)}">
					${frappe.utils.escape_html(f.file_name.length > 40 ? f.file_name.substring(0,40) + '…' : f.file_name)}
				</td>
				<td style="padding:12px 16px;">${this.category_pill(f.category)}</td>
				<td style="padding:12px 16px; color:#444; font-size:12px;">${frappe.utils.escape_html(f.doc_type || '—')}</td>
				<td style="padding:12px 16px; color:#444; font-size:12px;">${frappe.utils.escape_html(f.party_name || '—')}</td>
				<td style="padding:12px 16px; color:#444; font-size:12px;">${f.file_date || '—'}</td>
				<td style="padding:12px 16px;">${this.status_badge(f.status)}</td>
				<td style="padding:12px 16px;">
					<div style="display:flex; gap:6px; flex-wrap:wrap;">
						<button class="ve-view-btn" data-id="${f.name}"
							data-file-id="${f.drive_file_id || ''}"
							data-ext="${frappe.utils.escape_html(f.file_extension || '')}"
							data-name="${frappe.utils.escape_html(f.file_name)}"
							data-link="${frappe.utils.escape_html(f.drive_view_link || '')}"
							style="background:#1D9E75; color:#fff; border:none; border-radius:5px; padding:5px 10px; font-size:11px; cursor:pointer;">
							View
						</button>
						${f.status !== 'Reviewed' ? `<button class="ve-reviewed-btn" data-id="${f.name}"
							style="background:#e5e7eb; color:#555; border:none; border-radius:5px; padding:5px 10px; font-size:11px; cursor:pointer;">
							✓ Reviewed
						</button>` : ''}
						${f.status !== 'Flagged' ? `<button class="ve-flag-btn" data-id="${f.name}" data-fname="${frappe.utils.escape_html(f.file_name)}"
							style="background:#fef2f2; color:#EF4444; border:1px solid #EF4444; border-radius:5px; padding:5px 10px; font-size:11px; cursor:pointer;">
							⚑ Flag
						</button>` : ''}
					</div>
				</td>
			</tr>
		`).join(''));

		this.bind_table_events();
	}

	bind_table_events() {
		$(document).off('click', '.ve-view-btn').on('click', '.ve-view-btn', (e) => {
			const btn = $(e.currentTarget);
			const link = btn.data('link');
			const file_id = btn.data('file-id');
			const ext = btn.data('ext');
			const fname = btn.data('name');
			this._current_file_name = fname;
			if (link) window.open(link, '_blank');
			if (file_id && ext) this.show_analysis(file_id, ext, fname);
		});

		$(document).off('click', '.ve-reviewed-btn').on('click', '.ve-reviewed-btn', (e) => {
			const id = $(e.currentTarget).data('id');
			frappe.call({
				method: 'vera_drive.api.mark_reviewed',
				args: { docname: id },
				callback: () => this.load_files()
			});
		});

		$(document).off('click', '.ve-flag-btn').on('click', '.ve-flag-btn', (e) => {
			const id = $(e.currentTarget).data('id');
			const fname = $(e.currentTarget).data('fname');
			const d = new frappe.ui.Dialog({
				title: `Flag: ${fname}`,
				fields: [{
					label: 'Notes',
					fieldname: 'notes',
					fieldtype: 'Small Text',
					reqd: 0
				}],
				primary_action_label: 'Flag',
				primary_action: (vals) => {
					frappe.call({
						method: 'vera_drive.api.flag_file',
						args: { docname: id, notes: vals.notes || '' },
						callback: () => { d.hide(); this.load_files(); }
					});
				}
			});
			d.show();
		});
	}

	show_analysis(file_id, ext, fname) {
		$('#ve-analysis-title').text(`Analysis: ${fname}`);
		$('#ve-analysis-content').html('<div style="color:#888; padding:20px 0;">Loading file content…</div>');
		$('#ve-analysis-panel').show();
		$('html, body').animate({ scrollTop: $('#ve-analysis-panel').offset().top - 80 }, 400);

		frappe.call({
			method: 'vera_drive.api.analyse_file',
			args: { drive_file_id: file_id, file_extension: ext },
			callback: (r) => {
				if (!r.message) {
					$('#ve-analysis-content').html('<div style="color:#888;">Could not load file content.</div>');
					return;
				}
				const res = r.message;
				if (res.type === 'spreadsheet') {
					const rows = res.rows || [];
					const table_html = `
						<div style="font-size:12px; color:#888; margin-bottom:8px;">Showing up to 30 rows (total: ${res.total_rows})</div>
						<div style="overflow-x:auto; border:1px solid #e5e7eb; border-radius:8px;">
							<table style="width:100%; border-collapse:collapse; font-size:12px;">
								<tbody>
									${rows.map((row, i) => `
										<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}; border-bottom:1px solid #f0f0f0;">
											${row.map(cell => `<td style="padding:6px 10px; white-space:nowrap;">${frappe.utils.escape_html(cell)}</td>`).join('')}
										</tr>
									`).join('')}
								</tbody>
							</table>
						</div>`;
					$('#ve-analysis-content').html(table_html);
				} else if (res.type === 'pdf') {
					$('#ve-analysis-content').html(`
						<div style="font-size:12px; color:#888; margin-bottom:8px;">First 3 pages — text extract</div>
						<pre style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px;
							font-size:12px; max-height:400px; overflow-y:auto; white-space:pre-wrap; word-break:break-word;">
${frappe.utils.escape_html(res.text || '(no text extracted)')}
						</pre>`);
				} else {
					$('#ve-analysis-content').html('<div style="color:#888;">Preview not available for this file type.</div>');
				}
			}
		});
	}

	render_employee_cards() {
		const employees = [
			{
				name: 'Maaz', email: 'maazdgr8.mma@gmail.com', category: 'Sales',
				color: '#1D9E75', bg: '#f0fdf9',
				required_types: ['Quotation', 'Sales Order', 'Sales Invoice', 'Receipt']
			},
			{
				name: 'Lookman', email: 'lookman.vera@outlook.com', category: 'Purchase',
				color: '#F97316', bg: '#fff7ed',
				required_types: ['Purchase Order', 'Purchase Invoice', 'GRN', 'Transport Doc']
			},
			{
				name: 'Manjunath', email: 'manju.veraaccnts@outlook.com', category: 'Accounts',
				color: '#8B5CF6', bg: '#f5f3ff',
				required_types: ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Ledger']
			},
			{
				name: 'Bhagya', email: 'Bhagyashree.veraenterprises@outlook.com', category: 'HR',
				color: '#F59E0B', bg: '#fffbeb',
				required_types: ['Attendance', 'Payroll Summary', 'Bank Reconciliation']
			}
		];

		const present_types = {};
		this.files.forEach(f => {
			const cat = f.category;
			if (!present_types[cat]) present_types[cat] = new Set();
			if (f.doc_type) present_types[cat].add(f.doc_type);
		});

		const count_by_cat = {};
		this.files.forEach(f => {
			count_by_cat[f.category] = (count_by_cat[f.category] || 0) + 1;
		});

		$('#ve-employee-cards').html(employees.map(emp => {
			const count = count_by_cat[emp.category] || 0;
			const cat_types = present_types[emp.category] || new Set();
			const max_count = 10;
			const pct = Math.min(100, Math.round((count / max_count) * 100));

			const type_checks = emp.required_types.map(t => {
				const present = cat_types.has(t);
				return `<div style="font-size:11px; padding:3px 0; color:${present ? '#1D9E75' : '#EF4444'};">
					${present ? '✓' : '✗'} ${t}
				</div>`;
			}).join('');

			return `
				<div style="background:${emp.bg}; border-radius:12px; padding:18px; border:1px solid ${emp.color}22; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
					<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
						<div>
							<div style="font-weight:700; font-size:15px; color:#1a1a2e;">${emp.name}</div>
							<div style="font-size:11px; color:#888;">${emp.category}</div>
						</div>
						<div style="font-size:22px; font-weight:700; color:${emp.color};">${count}</div>
					</div>
					<div style="background:#e5e7eb; border-radius:99px; height:6px; margin-bottom:12px;">
						<div style="background:${emp.color}; width:${pct}%; height:6px; border-radius:99px; transition:width 0.4s;"></div>
					</div>
					<div>${type_checks}</div>
				</div>`;
		}).join(''));
	}

	sync_now() {
		const btn = $('#ve-sync-btn');
		btn.prop('disabled', true).css('opacity', '0.6').text('Syncing…');
		frappe.call({
			method: 'vera_drive.api.sync_now',
			callback: () => {
				btn.prop('disabled', false).css('opacity', '1').html('⟳ Sync Now');
				frappe.show_alert({ message: 'Drive synced successfully', indicator: 'green' });
				this.load_dashboard();
			},
			error: () => {
				btn.prop('disabled', false).css('opacity', '1').html('⟳ Sync Now');
				frappe.show_alert({ message: 'Sync failed — check error log', indicator: 'red' });
			}
		});
	}

	category_pill(cat) {
		const colors = {
			'Sales': { bg: '#dcfce7', text: '#166534' },
			'Purchase': { bg: '#fee2e2', text: '#991b1b' },
			'Accounts': { bg: '#ede9fe', text: '#5b21b6' },
			'HR': { bg: '#fef3c7', text: '#92400e' },
			'Logistics': { bg: '#dbeafe', text: '#1e40af' },
			'Other': { bg: '#f3f4f6', text: '#374151' }
		};
		const c = colors[cat] || colors['Other'];
		return `<span style="background:${c.bg}; color:${c.text}; border-radius:99px; padding:3px 10px; font-size:11px; font-weight:600;">
			${frappe.utils.escape_html(cat || '—')}
		</span>`;
	}

	status_badge(status) {
		const s = {
			'New': { bg: '#dcfce7', text: '#166534' },
			'Reviewed': { bg: '#f3f4f6', text: '#6b7280' },
			'Flagged': { bg: '#fee2e2', text: '#991b1b' }
		}[status] || { bg: '#f3f4f6', text: '#6b7280' };
		return `<span style="background:${s.bg}; color:${s.text}; border-radius:99px; padding:3px 10px; font-size:11px; font-weight:600;">
			${frappe.utils.escape_html(status || '—')}
		</span>`;
	}

	format_dt(dt) {
		if (!dt || dt === 'Never') return 'Never';
		try {
			const d = new Date(dt.replace(' ', 'T'));
			return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
		} catch(e) { return dt; }
	}

	format_time_ago(dt) {
		if (!dt || dt === 'Never') return 'Never';
		try {
			const diff = Math.floor((Date.now() - new Date(dt.replace(' ', 'T'))) / 60000);
			if (diff < 1) return 'Just now';
			if (diff < 60) return `${diff}m ago`;
			if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
			return `${Math.floor(diff/1440)}d ago`;
		} catch(e) { return dt; }
	}
}
