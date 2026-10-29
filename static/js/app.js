// ===== Inspector de árbol enraizado (arreglo de padres) =====

const SVGNS = "http://www.w3.org/2000/svg";
let tree = null;      // { raiz, hijos_de, padre_de, vertices }
let positions = {};
let highlight = null;

// ---------- FILAS DE ENTRADA ----------
function addRow(vertex = "", parent = "") {
    const tbody = document.getElementById("rows");
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input class="in-v" placeholder="vértice" value="${vertex}" autocomplete="off"></td>
        <td><input class="in-p" placeholder="padre (vacío = raíz)" value="${parent}" autocomplete="off"></td>
        <td><button class="rm" onclick="rmRow(this)" title="quitar">×</button></td>
    `;
    tbody.appendChild(tr);
    syncOnEdit(tr);
    return tr;
}

function rmRow(btn) {
    const tr = btn.closest("tr");
    if (document.querySelectorAll("#rows tr").length <= 1) return;
    tr.style.animation = "rowIn 0.2s ease reverse";
    setTimeout(() => { tr.remove(); redraw(); }, 180);
}

function syncOnEdit(tr) {
    tr.querySelectorAll("input").forEach(inp => {
        inp.addEventListener("input", redraw);
    });
}

// ---------- LEER LA TABLA ----------
function readParents() {
    const padres = {};
    document.querySelectorAll("#rows tr").forEach(tr => {
        const v = tr.querySelector(".in-v").value.trim();
        const p = tr.querySelector(".in-p").value.trim();
        if (v) padres[v] = p === "" ? null : p;
    });
    return padres;
}

function buildTree(padres) {
    const padre_de = {};
    const hijos_de = {};
    const vertices = new Set();
    let raiz = null;

    for (const [v, p] of Object.entries(padres)) {
        vertices.add(v);
        if (p === null || p === "" || p === v) {
            raiz = v;
            padre_de[v] = null;
        } else {
            vertices.add(p);
            padre_de[v] = p;
            (hijos_de[p] = hijos_de[p] || []).push(v);
        }
    }
    for (const p of Object.keys(hijos_de)) {
        if (!(p in padre_de)) padre_de[p] = null;
    }

    return { raiz, padre_de, hijos_de, vertices: [...vertices] };
}

function redraw() {
    const padres = readParents();
    if (Object.keys(padres).length === 0) { tree = null; clearSvg(); return; }
    tree = buildTree(padres);
    highlight = null;
    drawTree(true);
    const lg = document.getElementById("legend");
    if (tree.raiz) {
        lg.textContent = `raíz: ${tree.raiz}  ·  ${tree.vertices.length} vértices  ·  clic en un nodo para inspeccionarlo`;
    } else {
        lg.textContent = "falta una raíz (un vértice con padre vacío)";
    }
}

// ---------- DIBUJO SVG (jerárquico, de arriba hacia abajo) ----------
function clearSvg() {
    document.getElementById("svg").innerHTML = "";
    document.getElementById("legend").textContent = "Defina el árbol para dibujarlo.";
}

function layout() {
    const { raiz, hijos_de } = tree;
    positions = {};
    if (!raiz) return { maxDepth: 0, leafCount: 0 };

    let leaf = 0;
    const depths = {};

    function assign(node, depth) {
        depths[node] = depth;
        const kids = (hijos_de[node] || []);
        if (kids.length === 0) {
            positions[node] = { col: leaf++, depth };
            return positions[node].col;
        }
        const cols = kids.map(k => assign(k, depth + 1));
        const mid = (Math.min(...cols) + Math.max(...cols)) / 2;
        positions[node] = { col: mid, depth };
        return mid;
    }
    assign(raiz, 0);

    const maxDepth = Math.max(...Object.values(depths));
    return { maxDepth, leafCount: Math.max(1, leaf) };
}

function drawTree(animate) {
    const svg = document.getElementById("svg");
    svg.innerHTML = "";
    if (!tree || !tree.raiz) return;

    const { maxDepth, leafCount } = layout();

    const W = 800, H = 540;
    const padX = 48, padY = 56;
    const colW = (W - padX * 2) / Math.max(1, leafCount);
    const rowH = maxDepth > 0 ? (H - padY * 2) / maxDepth : 0;
    const r = Math.max(14, Math.min(22, colW * 0.32));

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

    const px = node => padX + (positions[node].col + 0.5) * colW;
    const py = node => padY + positions[node].depth * rowH;

    // edges
    let edgeDelay = 0;
    for (const [parent, kids] of Object.entries(tree.hijos_de)) {
        for (const kid of kids) {
            const p = document.createElementNS(SVGNS, "path");
            const x1 = px(parent), y1 = py(parent);
            const x2 = px(kid), y2 = py(kid);
            const my = (y1 + y2) / 2;
            p.setAttribute("d", `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`);
            p.setAttribute("class", "edge-line");
            if (!animate) p.style.animation = "none", p.style.strokeDashoffset = "0";
            else p.style.animationDelay = `${edgeDelay += 0.03}s`;
            p.dataset.parent = parent;
            p.dataset.child = kid;
            svg.appendChild(p);
        }
    }

    // nodes
    let nodeDelay = 0;
    for (const node of Object.keys(positions)) {
        const g = document.createElementNS(SVGNS, "g");
        g.setAttribute("class", "node-g");
        g.setAttribute("transform", `translate(${px(node)}, ${py(node)})`);
        if (animate) g.style.animationDelay = `${nodeDelay += 0.04}s`;
        else g.style.animation = "none";
        g.addEventListener("click", () => {
            document.getElementById("query").value = node;
            inspeccionar();
        });

        const c = document.createElementNS(SVGNS, "circle");
        c.setAttribute("r", r);
        c.setAttribute("class", "node-c" + (node === tree.raiz ? " is-root" : ""));
        c.dataset.node = node;
        g.appendChild(c);

        const t = document.createElementNS(SVGNS, "text");
        t.setAttribute("class", "node-t");
        t.dataset.node = node;
        t.textContent = node.length > 5 ? node.slice(0, 4) + "…" : node;
        g.appendChild(t);

        if (node === tree.raiz) {
            const tag = document.createElementNS(SVGNS, "text");
            tag.setAttribute("class", "root-tag");
            tag.setAttribute("y", -r - 7);
            tag.textContent = "RAÍZ";
            g.appendChild(tag);
        }

        svg.appendChild(g);
    }
}

function paintHighlight(data) {
    if (!tree) return;
    const q = data.vertice;
    const padre = data.padre;
    const hijos = new Set(data.hijos);
    const hermanos = new Set(data.hermanos);

    document.querySelectorAll(".node-c").forEach(c => {
        const n = c.dataset.node;
        c.classList.remove("is-query", "is-parent", "is-child", "is-sibling");
        const t = document.querySelector(`.node-t[data-node="${CSS.escape(n)}"]`);
        if (t) t.classList.remove("inv");

        if (n === q) { c.classList.add("is-query"); if (t) t.classList.add("inv"); }
        else if (n === padre) c.classList.add("is-parent");
        else if (hijos.has(n)) c.classList.add("is-child");
        else if (hermanos.has(n)) c.classList.add("is-sibling");
    });

    document.querySelectorAll(".edge-line").forEach(e => {
        const hot = e.dataset.parent === q || e.dataset.child === q;
        e.classList.toggle("hot", hot);
    });
}

// ---------- ANÁLISIS LOCAL (fallback sin backend) ----------
function fichaLocal(padres, vertice) {
    const t = buildTree(padres);
    if (!t.raiz) return { error: "No se identificó una raíz (un vértice sin padre)." };
    if (!t.vertices.includes(vertice)) return { error: `El vértice '${vertice}' no pertenece al árbol.` };

    const esRaiz = vertice === t.raiz;
    const padre = t.padre_de[vertice] ?? null;
    const hijos = (t.hijos_de[vertice] || []).slice().sort();
    const esHoja = hijos.length === 0;
    let hermanos = [];
    if (!esRaiz && padre !== null) {
        hermanos = (t.hijos_de[padre] || []).filter(h => h !== vertice).sort();
    }
    return {
        vertice,
        es_raiz: esRaiz,
        padre: esRaiz ? null : padre,
        hijos,
        es_hoja: esHoja,
        clasificacion: esHoja ? "Vértice Terminal (Hoja)" : "Vértice Interno",
        hermanos,
        raiz: t.raiz,
        total: t.vertices.length,
    };
}

// ---------- INSPECCIONAR ----------
async function inspeccionar() {
    const padres = readParents();
    const vertice = document.getElementById("query").value.trim();

    if (Object.keys(padres).length === 0) return snack("Defina al menos un vértice.");
    if (!vertice) return snack("Escriba el vértice a inspeccionar.");

    tree = buildTree(padres);
    drawTree(false);

    let data;
    try {
        const resp = await fetch("/api/ficha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ padres, vertice }),
        });
        data = await resp.json();
    } catch {
        data = fichaLocal(padres, vertice);
    }

    if (data.error) return snack(data.error);

    renderSheet(data);
    highlight = vertice;
    paintHighlight(data);
}

function renderSheet(d) {
    const sheet = document.getElementById("sheet");
    sheet.classList.remove("hidden");
    sheet.style.animation = "none"; sheet.offsetHeight; sheet.style.animation = "";

    document.getElementById("sheetVertex").textContent = d.vertice;

    const cl = document.getElementById("sheetClass");
    cl.textContent = d.es_hoja ? "Terminal (Hoja)" : "Interno";
    cl.className = "sheet-class " + (d.es_hoja ? "leaf" : "internal");

    // Padre
    const fp = document.getElementById("fPadre");
    fp.innerHTML = d.es_raiz
        ? `<span class="chip root">RAÍZ · sin padre</span>`
        : `<span class="chip">${d.padre}</span>`;

    // Hijos
    const fh = document.getElementById("fHijos");
    fh.innerHTML = d.hijos.length
        ? d.hijos.map((h, i) => `<span class="chip" style="animation-delay:${i * .05}s">${h}</span>`).join("")
        : `<span class="chip none">ninguno — es hoja</span>`;

    // Hermanos
    const fm = document.getElementById("fHermanos");
    fm.innerHTML = d.hermanos.length
        ? d.hermanos.map((h, i) => `<span class="chip" style="animation-delay:${i * .05}s">${h}</span>`).join("")
        : `<span class="chip none">ninguno</span>`;
}

// ---------- EJEMPLO ----------
function cargarEjemplo() {
    const data = [
        ["v0", ""],
        ["v1", "v0"], ["v2", "v0"], ["v3", "v0"],
        ["v4", "v1"], ["v5", "v1"],
        ["v6", "v2"],
        ["v7", "v3"], ["v8", "v3"], ["v9", "v3"],
        ["v10", "v5"],
    ];
    document.getElementById("rows").innerHTML = "";
    data.forEach(([v, p]) => addRow(v, p));
    document.getElementById("query").value = "v3";
    redraw();
    snack("Ejemplo cargado · pruebe v3, v0 o v10");
}

// ---------- SNACK ----------
let snackTimer;
function snack(msg) {
    const s = document.getElementById("snack");
    s.textContent = msg;
    s.classList.remove("hidden");
    s.style.animation = "none"; s.offsetHeight; s.style.animation = "";
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => s.classList.add("hidden"), 3200);
}

// ---------- INIT ----------
addRow();
addRow();
addRow();
