// ========== STORAGE (localStorage) ==========
const STORAGE_KEY = 'thidua_data_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    tenTo, members, weeks, records, currentWeekId
  }));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ========== STATE ==========
let tenTo = 'Tổ 1';
let members = [];
let weeks = [];
let records = [];
let currentWeekId = null;

// ========== INIT ==========
function init() {
  const data = loadData();
  if (data) {
    tenTo = data.tenTo || 'Tổ 1';
    members = data.members || [];
    weeks = data.weeks || [];
    records = data.records || [];
    currentWeekId = data.currentWeekId || null;
  }
  if (weeks.length === 0) {
    createDefaultWeek();
  } else if (!currentWeekId || !weeks.find(w => w.id === currentWeekId)) {
    const active = weeks.find(w => w.status === 'active') || weeks[0];
    currentWeekId = active.id;
  }
  document.getElementById('ten-to-display').textContent = tenTo;
  renderAll();
}

function createDefaultWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const w = {
    id: uid(),
    name: 'Tuần 1',
    start_date: formatDateISO(start),
    end_date: formatDateISO(end),
    status: 'active'
  };
  weeks = [w];
  currentWeekId = w.id;
  saveData();
}

function renderAll() {
  renderWeekSelect();
  renderMainTable();
  renderHistory();
}

// ========== RENDER ==========
function renderWeekSelect() {
  const sel = document.getElementById('week-select');
  sel.innerHTML = weeks.map(w =>
    `<option value="${w.id}" ${w.id === currentWeekId ? 'selected' : ''}>${esc(w.name)}</option>`
  ).join('');
  updateWeekDates();
}

function updateWeekDates() {
  const w = weeks.find(x => x.id === currentWeekId);
  if (!w) return;
  document.getElementById('week-dates').textContent =
    `${formatDateVN(w.start_date)} – ${formatDateVN(w.end_date)}`;
}

function weekRecords() {
  return records.filter(r => r.week_id === currentWeekId);
}

function getMemberStats(memberId) {
  const recs = weekRecords().filter(r => r.member_id === memberId);
  let cong = 0, tru = 0;
  const contents = [];
  recs.forEach(r => {
    if (r.type === 'cong') cong += r.points;
    else tru += r.points;
    contents.push(r.content);
  });
  return { cong, tru, total: cong - tru, contents: contents.join('; ') || '—' };
}

function renderMainTable() {
  const tbody = document.getElementById('main-tbody');
  const empty = document.getElementById('empty-main');
  if (members.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const sorted = [...members].sort((a, b) => (a.stt || 0) - (b.stt || 0));
  tbody.innerHTML = sorted.map((m, i) => {
    const s = getMemberStats(m.id);
    const totalCls = s.total > 0 ? 'pos' : s.total < 0 ? 'neg' : '';
    return `<tr>
      <td>${m.stt || i + 1}</td>
      <td class="name-link" onclick="showDetail('${m.id}')">${esc(m.name)}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(s.contents)}">${esc(s.contents)}</td>
      <td class="points-plus">${s.cong > 0 ? '+' + s.cong : '0'}</td>
      <td class="points-minus">${s.tru > 0 ? '-' + s.tru : '0'}</td>
      <td class="points-total ${totalCls}">${s.total > 0 ? '+' : ''}${s.total}</td>
      <td>
        <button class="btn-icon" title="Sửa" onclick="editMember('${m.id}')">✏️</button>
        <button class="btn-icon del" title="Xóa" onclick="deleteMember('${m.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');
}

function renderHistory() {
  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = weeks.map(w => {
    const status = w.status === 'completed'
      ? '<span class="badge badge-done">Đã tổng kết</span>'
      : '<span class="badge badge-active">Đang thực hiện</span>';
    return `<tr>
      <td><strong>${esc(w.name)}</strong></td>
      <td>${formatDateVN(w.start_date)} – ${formatDateVN(w.end_date)}</td>
      <td>${status}</td>
      <td><button class="btn btn-sm btn-outline" onclick="viewPastWeek('${w.id}')">Xem</button></td>
    </tr>`;
  }).join('');
}

function showDetail(memberId) {
  const m = members.find(x => x.id === memberId);
  if (!m) return;
  document.getElementById('detail-name').textContent = m.name;
  const recs = weekRecords().filter(r => r.member_id === memberId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const tbody = document.getElementById('detail-tbody');
  let cong = 0, tru = 0;
  tbody.innerHTML = recs.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#64748b;">Chưa có ghi nhận nào</td></tr>'
    : recs.map(r => {
        if (r.type === 'cong') cong += r.points; else tru += r.points;
        const diem = r.type === 'cong' ? '+' + r.points : '-' + r.points;
        const cls = r.type === 'cong' ? 'points-plus' : 'points-minus';
        return `<tr>
          <td>${formatDateVN(r.date)}</td>
          <td>${esc(r.content)}</td>
          <td>${r.type === 'cong' ? 'Cộng' : 'Trừ'}</td>
          <td class="${cls}">${diem}</td>
          <td><button class="btn-icon del" onclick="deleteRecord('${r.id}')">🗑️</button></td>
        </tr>`;
      }).join('');
  const total = cong - tru;
  const el = document.getElementById('detail-total');
  el.textContent = `Tổng cộng: ${total > 0 ? '+' : ''}${total} điểm`;
  el.className = 'total-line ' + (total > 0 ? 'points-plus' : total < 0 ? 'points-minus' : '');
  showView('detail');
}

// ========== WEEK ==========
function changeWeek(id) {
  currentWeekId = id;
  saveData();
  updateWeekDates();
  renderMainTable();
}

function viewPastWeek(id) {
  currentWeekId = id;
  saveData();
  document.getElementById('week-select').value = id;
  updateWeekDates();
  renderMainTable();
  showView('main');
  document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-view="main"]')?.classList.add('active');
}

function saveWeek() {
  const name = document.getElementById('week-name').value.trim();
  const start = document.getElementById('week-start').value;
  const end = document.getElementById('week-end').value;
  if (!name || !start || !end) { toast('Vui lòng điền đầy đủ'); return; }
  if (start > end) { toast('Ngày bắt đầu phải trước ngày kết thúc'); return; }
  const w = { id: uid(), name, start_date: start, end_date: end, status: 'active' };
  weeks.unshift(w);
  currentWeekId = w.id;
  saveData();
  closeModal('week-modal');
  renderAll();
  toast('Đã tạo tuần mới');
}

// ========== MEMBERS ==========
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  if (id === 'member-modal') {
    document.getElementById('member-modal-title').textContent = 'Thêm thành viên';
    document.getElementById('member-id').value = '';
    document.getElementById('member-name').value = '';
    document.getElementById('member-stt').value = members.length + 1;
  }
  if (id === 'record-modal') {
    const sel = document.getElementById('record-member');
    if (members.length === 0) {
      toast('Hãy thêm thành viên trước');
      closeModal('record-modal');
      return;
    }
    sel.innerHTML = members.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
    document.getElementById('record-date').value = formatDateISO(new Date());
    document.getElementById('record-content').value = '';
    document.getElementById('record-type').value = 'tru';
    document.getElementById('record-points').value = 1;
  }
  if (id === 'week-modal') {
    document.getElementById('week-name').value = `Tuần ${weeks.length + 1}`;
    if (weeks.length > 0) {
      const last = weeks[0];
      const nextStart = new Date(last.end_date);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextStart.getDate() + 6);
      document.getElementById('week-start').value = formatDateISO(nextStart);
      document.getElementById('week-end').value = formatDateISO(nextEnd);
    } else {
      document.getElementById('week-start').value = formatDateISO(new Date());
      document.getElementById('week-end').value = '';
    }
  }
  if (id === 'settings-modal') {
    document.getElementById('settings-ten-to').value = tenTo;
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function editMember(id) {
  const m = members.find(x => x.id === id);
  if (!m) return;
  document.getElementById('member-modal-title').textContent = 'Sửa thành viên';
  document.getElementById('member-id').value = m.id;
  document.getElementById('member-name').value = m.name;
  document.getElementById('member-stt').value = m.stt || '';
  document.getElementById('member-modal').classList.remove('hidden');
}

function saveMember() {
  const id = document.getElementById('member-id').value;
  const name = document.getElementById('member-name').value.trim();
  const stt = parseInt(document.getElementById('member-stt').value) || 0;
  if (!name) { toast('Vui lòng nhập họ tên'); return; }
  if (id) {
    const idx = members.findIndex(m => m.id === id);
    if (idx >= 0) members[idx] = { ...members[idx], name, stt };
    toast('Đã cập nhật');
  } else {
    members.push({ id: uid(), name, stt });
    toast('Đã thêm thành viên');
  }
  saveData();
  closeModal('member-modal');
  renderMainTable();
}

function deleteMember(id) {
  if (!confirm('Xóa thành viên này? Tất cả điểm cũng sẽ bị xóa.')) return;
  members = members.filter(m => m.id !== id);
  records = records.filter(r => r.member_id !== id);
  saveData();
  renderMainTable();
  toast('Đã xóa');
}

// ========== RECORDS ==========
function saveRecord() {
  const member_id = document.getElementById('record-member').value;
  const date = document.getElementById('record-date').value;
  const content = document.getElementById('record-content').value.trim();
  const type = document.getElementById('record-type').value;
  const points = parseInt(document.getElementById('record-points').value) || 0;
  if (!member_id || !date || !content || points < 1) {
    toast('Vui lòng điền đầy đủ');
    return;
  }
  records.push({
    id: uid(),
    week_id: currentWeekId,
    member_id,
    date,
    content,
    type,
    points
  });
  saveData();
  closeModal('record-modal');
  renderMainTable();
  toast('Đã lưu điểm');
}

function deleteRecord(id) {
  if (!confirm('Xóa ghi nhận này?')) return;
  records = records.filter(r => r.id !== id);
  saveData();
  const detailName = document.getElementById('detail-name').textContent;
  const m = members.find(x => x.name === detailName);
  if (m && !document.getElementById('view-detail').classList.contains('hidden')) {
    showDetail(m.id);
  }
  renderMainTable();
  toast('Đã xóa');
}

// ========== SETTINGS ==========
function saveSettings() {
  tenTo = document.getElementById('settings-ten-to').value.trim() || 'Tổ 1';
  document.getElementById('ten-to-display').textContent = tenTo;
  saveData();
  closeModal('settings-modal');
  toast('Đã lưu tên tổ');
}

// ========== SUMMARY ==========
function openSummary() {
  const w = weeks.find(x => x.id === currentWeekId);
  if (!w) return;
  document.getElementById('summary-week-info').textContent =
    `${w.name}: ${formatDateVN(w.start_date)} – ${formatDateVN(w.end_date)} | ${tenTo}`;
  const stats = members.map(m => {
    const s = getMemberStats(m.id);
    return { ...m, ...s };
  }).sort((a, b) => b.total - a.total);
  document.getElementById('summary-tbody').innerHTML = stats.map((m, i) => {
    const totalCls = m.total > 0 ? 'pos' : m.total < 0 ? 'neg' : '';
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(m.name)}</td>
      <td class="points-plus">${m.cong > 0 ? '+' + m.cong : '0'}</td>
      <td class="points-minus">${m.tru > 0 ? '-' + m.tru : '0'}</td>
      <td class="points-total ${totalCls}">${m.total > 0 ? '+' : ''}${m.total}</td>
    </tr>`;
  }).join('');
  document.getElementById('summary-modal').classList.remove('hidden');
}

function markWeekCompleted() {
  const w = weeks.find(x => x.id === currentWeekId);
  if (w) {
    w.status = 'completed';
    saveData();
    renderHistory();
    toast('Đã đánh dấu tổng kết');
  }
}

// ========== EXPORT ==========
function getExportData() {
  const w = weeks.find(x => x.id === currentWeekId);
  const stats = members.map(m => {
    const s = getMemberStats(m.id);
    const detailRecs = weekRecords().filter(r => r.member_id === m.id)
      .map(r => `${formatDateVN(r.date)}: ${r.content} (${r.type === 'cong' ? '+' : '-'}${r.points})`)
      .join(' | ');
    return { stt: m.stt, name: m.name, cong: s.cong, tru: s.tru, total: s.total, details: detailRecs || '—' };
  }).sort((a, b) => b.total - a.total);
  return { week: w, stats };
}

function exportExcel() {
  const { week, stats } = getExportData();
  if (!week) return;
  const rows = [
    ['TỔNG KẾT THI ĐUA TỔ'],
    ['Tên tổ', tenTo],
    ['Tuần', week.name],
    ['Từ ngày', formatDateVN(week.start_date)],
    ['Đến ngày', formatDateVN(week.end_date)],
    [],
    ['STT', 'Họ và tên', 'Điểm cộng', 'Điểm trừ', 'Tổng điểm', 'Chi tiết lỗi / điểm']
  ];
  stats.forEach((s, i) => rows.push([i + 1, s.name, s.cong, s.tru, s.total, s.details]));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 50 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tong ket');
  XLSX.writeFile(wb, `Tong_ket_${week.name.replace(/\s/g, '_')}.xlsx`);
  toast('Đã xuất Excel');
}

function exportPDF() {
  const { week, stats } = getExportData();
  if (!week) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('TONG KET THI DUA TO', 105, 18, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Ten to: ${tenTo}`, 14, 30);
  doc.text(`Tuan: ${week.name}`, 14, 37);
  doc.text(`Tu ngay: ${formatDateVN(week.start_date)} - Den ngay: ${formatDateVN(week.end_date)}`, 14, 44);
  doc.autoTable({
    startY: 52,
    head: [['STT', 'Ho va ten', 'Diem cong', 'Diem tru', 'Tong diem']],
    body: stats.map((s, i) => [i + 1, s.name, s.cong, s.tru, s.total]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] }
  });
  let y = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(12);
  doc.text('Chi tiet loi / diem:', 14, y);
  y += 8;
  doc.setFontSize(9);
  stats.forEach(s => {
    if (s.details === '—') return;
    const lines = doc.splitTextToSize(`${s.name}: ${s.details}`, 180);
    if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.text(lines, 14, y);
    y += lines.length * 5 + 3;
  });
  doc.save(`Tong_ket_${week.name.replace(/\s/g, '_')}.pdf`);
  toast('Đã xuất PDF');
}

// ========== VIEW ==========
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');
  document.querySelectorAll('.btn-nav[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
}

// ========== UTILS ==========
function formatDateVN(d) {
  if (!d) return '';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

init();
