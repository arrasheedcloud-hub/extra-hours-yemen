import './style.css';

const RATE = 1500;
const STORE = 'overtime-entries-v1';
let screen = 'home';
let editingId = null;

const dateISO = (date = new Date()) => {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date - tz).toISOString().slice(0, 10);
};
const getEntries = () => JSON.parse(localStorage.getItem(STORE) || '[]').sort((a, b) => b.date.localeCompare(a.date));
const saveEntries = (items) => localStorage.setItem(STORE, JSON.stringify(items));
const arNum = new Intl.NumberFormat('ar-YE');
const money = (n) => `${arNum.format(n)} ريال`;
const hoursText = (n) => `${arNum.format(n)} ${n === 1 ? 'ساعة' : 'ساعات'}`;
const dayName = (date) => new Intl.DateTimeFormat('ar-YE', { weekday: 'long' }).format(new Date(`${date}T12:00:00`));
const dateText = (date, opts = { day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('ar-YE', opts).format(new Date(`${date}T12:00:00`));
const officialEnd = (date) => new Date(`${date}T12:00:00`).getDay() === 4 ? '13:00' : '14:00';
const isFriday = (date) => new Date(`${date}T12:00:00`).getDay() === 5;
const calcHours = (date, start, end) => {
  if (!date || !start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  // في غير الجمعة لا يمكن احتساب وقتٍ قبل نهاية الدوام الرسمي كوقت إضافي.
  const official = officialEnd(date).split(':').map(Number);
  const actualStart = isFriday(date) ? sh * 60 + sm : Math.max(sh * 60 + sm, official[0] * 60 + official[1]);
  return Math.max(0, ((eh * 60 + em) - actualStart) / 60);
};
const fmtHours = (h) => Number.isInteger(h) ? arNum.format(h) : arNum.format(h.toFixed(1));
const time12 = (time) => new Intl.DateTimeFormat('ar-YE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(`2000-01-01T${time}:00`));
const monthKey = (date) => date.slice(0, 7);
const stats = (items) => ({ days: items.length, hours: items.reduce((s, x) => s + Number(x.hours), 0), amount: items.reduce((s, x) => s + Number(x.amount), 0) });

function nav(active) {
  return `<nav class="bottom-nav">
    ${[['home','⌂','الرئيسية'],['log','▤','السجل'],['reports','▥','التقارير']].map(([id,icon,label]) => `<button class="nav-item ${active===id?'active':''}" data-nav="${id}"><span>${icon}</span>${label}</button>`).join('')}
  </nav>`;
}
function statCard(label, value, cls='') { return `<div class="stat ${cls}"><span>${label}</span><strong>${value}</strong></div>`; }
function home() {
  const all = getEntries(), month = monthKey(dateISO()), s = stats(all.filter(x => monthKey(x.date) === month));
  return `<main class="page home-page">
    <header class="top"><div><p class="eyebrow">أهلاً بك</p><h1>ساعاتي الإضافية</h1></div><div class="logo">س</div></header>
    <section class="hero"><p>هذا الشهر · ${dateText(dateISO(), {month:'long', year:'numeric'})}</p><strong>${money(s.amount)}</strong><div class="hero-line"><span>${fmtHours(s.hours)} ساعة إضافية</span><i></i><span>${arNum.format(s.days)} يوم</span></div></section>
    <section class="summary-grid">${statCard('أيام الإضافي', `${arNum.format(s.days)} يوم`)}${statCard('مجموع الساعات', `${fmtHours(s.hours)} ساعة`)}${statCard('سعر الساعة', money(RATE))}</section>
    <button class="add-main" data-add>+ <span>تسجيل إضافي</span><small>أضف يوم إضافي خلال ثوانٍ</small></button>
    <section class="section-heading"><h2>آخر التسجيلات</h2><button data-nav="log">عرض الكل</button></section>
    <section class="entries">${entryCards(all.slice(0, 3), true)}</section>
  </main>${nav('home')}`;
}
function entryCards(items, compact=false) {
  if (!items.length) return `<div class="empty"><div>◷</div><h3>لا توجد تسجيلات بعد</h3><p>أضف أول يوم إضافي لك الآن.</p></div>`;
  return items.map(x => `<article class="entry-card"><div class="date-badge"><strong>${new Date(`${x.date}T12:00:00`).getDate()}</strong><span>${dateText(x.date,{month:'short'})}</span></div><div class="entry-info"><strong>${dayName(x.date)}</strong><span>${time12(x.start)} — ${time12(x.end)}</span></div><div class="entry-total"><strong>${fmtHours(x.hours)} س</strong><span>${money(x.amount)}</span></div>${compact?'':`<button class="more" data-edit="${x.id}" aria-label="تعديل">⋮</button>`}</article>`).join('');
}
function log() {
  const all = getEntries();
  return `<main class="page"><header class="page-head"><div><p class="eyebrow">كل الأيام</p><h1>سجل الإضافي</h1></div><button class="round-add" data-add>+</button></header><section class="entries all">${entryCards(all)}</section></main>${nav('log')}`;
}
function monday(date) { const d = new Date(`${date}T12:00:00`); const offset = (d.getDay() + 6) % 7; d.setDate(d.getDate() - offset); return dateISO(d); }
function addDays(iso, days) { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+days); return dateISO(d); }
function reports() {
  const all=getEntries(), today=dateISO(); const wk=monday(today), wkEnd=addDays(wk,6); const ws=stats(all.filter(x=>x.date>=wk && x.date<=wkEnd));
  const month=monthKey(today), ms=stats(all.filter(x=>monthKey(x.date)===month));
  return `<main class="page"><header class="page-head"><div><p class="eyebrow">ملخصات واضحة</p><h1>التقارير</h1></div></header>
    <section class="report-box"><div class="report-title"><span class="report-icon">▣</span><div><h2>التقرير الأسبوعي</h2><p>${dateText(wk)} — ${dateText(wkEnd)}</p></div></div>${reportStats(ws)}</section>
    <section class="report-box"><div class="report-title"><span class="report-icon blue">◷</span><div><h2>التقرير الشهري</h2><p>${dateText(today,{month:'long',year:'numeric'})}</p></div></div>${reportStats(ms)}</section>
    <section class="report-box daily"><div class="report-title"><span class="report-icon orange">▤</span><div><h2>التقرير اليومي</h2><p>كل الأيام المسجلة</p></div></div><div class="daily-list">${all.slice(0,5).map(x=>`<div><span>${dateText(x.date)} · ${dayName(x.date)}</span><strong>${fmtHours(x.hours)} س</strong></div>`).join('') || '<p>لا توجد بيانات لعرضها.</p>'}</div></section>
  </main>${nav('reports')}`;
}
function reportStats(s) { return `<div class="report-stats"><div><span>أيام الإضافي</span><strong>${arNum.format(s.days)}</strong></div><div><span>مجموع الساعات</span><strong>${fmtHours(s.hours)}</strong></div><div><span>المبلغ</span><strong>${money(s.amount)}</strong></div></div>`; }
function modal(entry=null) {
  const date=entry?.date || dateISO(), start=entry?.start || (isFriday(date)?'08:00':officialEnd(date)), end=entry?.end || (isFriday(date)?'13:00': '17:00');
  return `<div class="modal-bg"><section class="modal"><header><div><p class="eyebrow">${entry?'تعديل تسجيل':'سجل يومك بسرعة'}</p><h2>${entry?'تعديل الإضافي':'تسجيل إضافي'}</h2></div><button data-close>×</button></header>
  <form id="entry-form"><label>التاريخ<input id="entry-date" name="date" type="date" value="${date}" required></label><p id="official-note" class="official-note"></p>
  <div class="time-grid"><label>بداية الإضافي<input id="start" name="start" type="time" value="${start}" required></label><label>نهاية الإضافي<input id="end" name="end" type="time" value="${end}" required></label></div>
  <div class="calc"><span>الساعات الإضافية</span><strong id="hours-preview">—</strong><span>المبلغ</span><strong id="amount-preview">—</strong></div>
  <button class="save" type="submit">${entry?'حفظ التعديلات':'حفظ يوم الإضافي'}</button>${entry?'<button class="delete" type="button" data-delete>حذف هذا اليوم</button>':''}</form></section></div>`;
}
function render() { document.querySelector('#app').innerHTML = (screen==='home'?home():screen==='log'?log():reports()); bind(); }
function bind() {
  document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{screen=el.dataset.nav; render();});
  document.querySelectorAll('[data-add]').forEach(el=>el.onclick=()=>openModal());
  document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>openModal(getEntries().find(x=>x.id===el.dataset.edit)));
}
function openModal(entry=null) {
  editingId=entry?.id||null; document.body.insertAdjacentHTML('beforeend',modal(entry));
  const panel=document.querySelector('.modal-bg'), date=panel.querySelector('#entry-date'), start=panel.querySelector('#start'), end=panel.querySelector('#end');
  const update=()=>{const friday=isFriday(date.value); panel.querySelector('#official-note').textContent=friday?'الجمعة إجازة: كل وقت العمل يُحسب إضافيًا.':'ينتهي الدوام الرسمي هذا اليوم عند '+time12(officialEnd(date.value))+'.'; const h=calcHours(date.value,start.value,end.value); panel.querySelector('#hours-preview').textContent=h>0?`${fmtHours(h)} ساعة`:'—'; panel.querySelector('#amount-preview').textContent=h>0?money(h*RATE):'—';};
  date.onchange=()=>{if(!editingId) start.value=isFriday(date.value)?'08:00':officialEnd(date.value); update();}; [start,end].forEach(x=>x.oninput=update); update();
  panel.querySelector('[data-close]').onclick=()=>panel.remove();
  panel.querySelector('#entry-form').onsubmit=(e)=>{e.preventDefault(); const h=calcHours(date.value,start.value,end.value); if(h<=0){alert('وقت النهاية يجب أن يكون بعد بداية الإضافي.'); return;} const items=getEntries(); const record={id:editingId||crypto.randomUUID(),date:date.value,start:start.value,end:end.value,hours:h,amount:h*RATE}; saveEntries(editingId?items.map(x=>x.id===editingId?record:x):[...items,record]); panel.remove(); render();};
  panel.querySelector('[data-delete]')?.addEventListener('click',()=>{if(confirm('هل تريد حذف هذا التسجيل؟')){saveEntries(getEntries().filter(x=>x.id!==editingId)); panel.remove(); render();}});
}
render();
