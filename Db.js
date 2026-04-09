
let SQL = null;
let db = null;

async function initSql() {
  SQL = await initSqlJs({
    locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`,
  });
}

async function loadDatabase(fileName) {
  const res = await fetch(fileName);
  if (!res.ok) throw new Error(`Не удалось загрузить ${fileName}`);
  const buf = await res.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buf));
  renderTablesList();
}

function getTables() {
  const query = `
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `;
  const result = db.exec(query);
  if (!result.length) return [];
  return result[0].values.flat();
}
function renderTablesList() {
  const ul = document.getElementById("tables");
  ul.innerHTML = "";
  const tables = getTables();
  if (!tables.length) {
    ul.innerHTML = "<li>(Нет таблиц)</li>";
    return;
  }
  tables.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    li.addEventListener("click", () => runSelectAll(t));
    ul.appendChild(li);
  });
  // сразу показать первую таблицу
  runSelectAll(tables[0]);
}


function runSQL(sql) {
  try {
    const start = performance.now();
    const results = db.exec(sql);
    const ms = (performance.now() - start).toFixed(1);
    renderResult(results, `SQL выполнен (${ms} ms)`);
  } catch (e) {
    renderError(e.message);
  }
}

// 5) SELECT * FROM table LIMIT 200
function runSelectAll(table) {
  const sql = `SELECT * FROM "${table}" LIMIT 200;`;
  document.getElementById("sql").value = sql;
  runSQL(sql);
  document.getElementById("resultTitle").textContent = `Таблица: ${table}`;
}

// 6) Отрисовка результата (первая таблица результата)
function renderResult(results, subtitle = "") {
  const box = document.getElementById("result");
  if (!results || !results.length) {
    box.innerHTML = `<div class="hint">Пустой результат</div>`;
    return;
  }
  const r = results[0]; // { columns:[], values:[[]] }
  const cols = r.columns;
  const rows = r.values;

  const thead = `<thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows.map(row =>
    `<tr>${row.map(v => `<td>${escapeHtml(String(v ?? ""))}</td>`).join("")}</tr>`
  ).join("")}</tbody>`;
  box.innerHTML = `<table>${thead}${tbody}</table>`;
  if (subtitle) document.getElementById("resultTitle").textContent += ` — ${subtitle}`;
}

function renderError(msg) {
  document.getElementById("result").innerHTML =
    `<div class="hint" style="color:#ffb3b3">Ошибка: ${escapeHtml(msg)}</div>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c]));
}


async function main() {
  await initSql();
  const select = document.getElementById("dbSelect");
  const reloadBtn = document.getElementById("reload");
  const runBtn = document.getElementById("run");

  reloadBtn.addEventListener("click", () => loadDatabase(select.value));
  runBtn.addEventListener("click", () => runSQL(document.getElementById("sql").value));


  await loadDatabase(select.value);
}
main().catch(err => renderError(err.message));
