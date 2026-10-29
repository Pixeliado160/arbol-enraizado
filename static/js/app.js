// Grafos dirigidos y los Puentes de Königsberg (Euler)
// Frontend: construye la matriz de adyacencia y pide el análisis al backend
// Python (/api/analizar). Si el backend no está (GitHub Pages), usa el
// fallback local 'analizarLocal', que replica exactamente la lógica de app.py.

let N = 4;
let datos = [];

function initDatos() {
    datos = Array.from({ length: N }, () => Array(N).fill(0));
}

function setSize(delta) {
    const nuevo = N + delta;
    if (nuevo < 2 || nuevo > 10) return;
    const viejo = datos;
    N = nuevo;
    const nuevaMatriz = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++)
            if (viejo[i] && viejo[i][j] != null) nuevaMatriz[i][j] = viejo[i][j];
    datos = nuevaMatriz;
    document.getElementById('sizeLabel').textContent = N;
    renderMatriz();
}

function etiqueta(i) { return 'v' + i; }

function renderMatriz() {
    const t = document.getElementById('matrix');
    let html = '<tr><th class="corner">·</th>';
    for (let j = 0; j < N; j++) html += `<th>${etiqueta(j)}</th>`;
    html += '</tr>';
    for (let i = 0; i < N; i++) {
        html += `<tr><th>${etiqueta(i)}</th>`;
        for (let j = 0; j < N; j++) {
            const diag = i === j ? 'diag' : '';
            const on = datos[i][j] > 0 ? 'on' : '';
            html += `<td><input class="${diag} ${on}" inputmode="numeric"
                        value="${datos[i][j]}"
                        onchange="setCell(${i},${j},this)"
                        oninput="markOn(${i},${j},this)"></td>`;
        }
        html += '</tr>';
    }
    t.innerHTML = html;
}

function markOn(i, j, el) {
    const v = parseInt(el.value, 10);
    el.classList.toggle('on', v > 0);
}

function setCell(i, j, el) {
    let v = parseInt(el.value, 10);
    if (isNaN(v) || v < 0) v = 0;
    datos[i][j] = v;
    el.value = v;
    el.classList.toggle('on', v > 0);
}

/* ---------- LÓGICA LOCAL (espejo de app.py) ---------- */
function analizarLocal(matriz) {
    const n = matriz.length;
    const V = Array.from({ length: n }, (_, i) => 'v' + i);

    const aristas = [];
    let c = 1;
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            if (i === j) {
                for (let k = 0; k < matriz[i][j]; k++)
                    aristas.push({ arista: 'e' + (c++), extremos: [V[i], V[i]], lazo: true });
            } else {
                const mult = Math.max(matriz[i][j], matriz[j][i]);
                for (let k = 0; k < mult; k++)
                    aristas.push({ arista: 'e' + (c++), extremos: [V[i], V[j]], lazo: false });
            }
        }
    }

    const grado = {}; V.forEach(v => grado[v] = 0);
    aristas.forEach(a => {
        const [u, w] = a.extremos;
        if (a.lazo) grado[u] += 2; else { grado[u]++; grado[w]++; }
    });

    const aislados = V.filter(v => grado[v] === 0);

    const ady = {}; V.forEach(v => ady[v] = new Set());
    aristas.forEach(a => {
        const [u, w] = a.extremos;
        if (u !== w) { ady[u].add(w); ady[w].add(u); }
    });

    const conGrado = V.filter(v => grado[v] > 0);
    let conexo = true;
    if (conGrado.length) {
        const vis = new Set(); const pila = [conGrado[0]];
        while (pila.length) {
            const x = pila.pop();
            if (vis.has(x)) continue;
            vis.add(x);
            ady[x].forEach(y => { if (!vis.has(y)) pila.push(y); });
        }
        conexo = conGrado.every(v => vis.has(v));
    }

    const impares = V.filter(v => grado[v] % 2 !== 0);
    const todosPares = impares.length === 0;

    let tiene, motivo;
    if (!conGrado.length) {
        tiene = false;
        motivo = 'El grafo no tiene aristas, por lo que no existe recorrido que trazar.';
    } else if (!conexo) {
        tiene = false;
        motivo = 'No existe Circuito Euleriano: los vértices con aristas NO están todos conectados entre sí (el grafo no es conexo). Un circuito debe poder recorrer todo el grafo sin saltar entre partes separadas.';
    } else if (!todosPares) {
        tiene = false;
        const lista = impares.map(v => `${v} (grado ${grado[v]})`).join(', ');
        motivo = `No existe Circuito Euleriano. Euler demostró que se necesita que TODOS los vértices tengan grado par. Aquí hay ${impares.length} vértice(s) de grado impar: ${lista}. Por eso NO se puede recorrer sin levantar el lápiz (igual que los puentes de Königsberg, que tenían 4 vértices impares).`;
    } else {
        tiene = true;
        motivo = 'SÍ existe un Circuito Euleriano. El grafo es conexo y todos sus vértices tienen grado par, que es exactamente la condición que Euler probó. Se puede partir de cualquier vértice, recorrer cada arista una sola vez y volver al inicio SIN levantar el lápiz.';
    }

    return {
        vertices: V, n, aristas, total_aristas: aristas.length,
        tabla_grados: V.map(v => ({ vertice: v, grado: grado[v] })),
        aislados, grados_impares: impares, todos_pares: todosPares,
        conexo, tiene_circuito_euleriano: tiene, diagnostico: motivo,
    };
}

/* ---------- ANÁLISIS ---------- */
async function analizar() {
    let res;
    try {
        const r = await fetch('/api/analizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matriz: datos }),
        });
        if (!r.ok) throw new Error('backend');
        res = await r.json();
        if (res.error) throw new Error(res.error);
    } catch (e) {
        res = analizarLocal(datos);
    }
    pintar(res);
}

function pintar(res) {
    // 02 - Diagnóstico
    const diagBlock = document.getElementById('diagBlock');
    const mark = document.getElementById('verdictMark');
    const vtext = document.getElementById('verdictText');
    const si = res.tiene_circuito_euleriano;
    mark.textContent = si ? '✓' : '✕';
    mark.className = 'verdict-mark ' + (si ? 'yes' : 'no');
    vtext.textContent = si ? 'Posee un Circuito Euleriano' : 'No posee Circuito Euleriano';
    document.getElementById('diagBody').textContent = res.diagnostico;
    diagBlock.classList.remove('hidden');

    // 03 - Vértices y grados
    const vg = document.getElementById('vgInfo');
    vg.innerHTML = `V(G) = { <b>${res.vertices.join(', ')}</b> }  ·  |V| = <b>${res.n}</b>  ·  aristas = <b>${res.total_aristas}</b>`;

    const gt = document.getElementById('gradosTable');
    let gh = '<tr><th>Vértice</th><th>Grado δ(v)</th><th>Paridad</th></tr>';
    res.tabla_grados.forEach(f => {
        const impar = f.grado % 2 !== 0;
        const aislado = f.grado === 0;
        gh += `<tr>
            <td>${f.vertice}${aislado ? '<span class="tag-aislado">aislado</span>' : ''}</td>
            <td class="${impar ? 'impar' : 'par'}">${f.grado}</td>
            <td>${impar ? 'impar <span class="tag-impar">impar</span>' : 'par'}</td>
        </tr>`;
    });
    gt.innerHTML = gh;

    const ai = document.getElementById('aisladosInfo');
    if (res.aislados.length)
        ai.innerHTML = `Vértices aislados (grado 0): <b>${res.aislados.join(', ')}</b>`;
    else
        ai.innerHTML = 'No hay vértices aislados: todos tienen al menos una arista.';
    document.getElementById('vertBlock').classList.remove('hidden');

    // 04 - Función punto extremo-arista
    const et = document.getElementById('edgesTable');
    if (!res.aristas.length) {
        et.innerHTML = '<tr><td class="mini">El grafo no tiene aristas.</td></tr>';
    } else {
        let eh = '<tr><th>Arista</th><th>Puntos extremos φ(e)</th><th>Tipo</th></tr>';
        res.aristas.forEach(a => {
            eh += `<tr>
                <td>${a.arista}</td>
                <td>{ ${a.extremos[0]}, ${a.extremos[1]} }</td>
                <td>${a.lazo ? 'lazo' : 'arista'}</td>
            </tr>`;
        });
        et.innerHTML = eh;
    }
    document.getElementById('edgeBlock').classList.remove('hidden');

    diagBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- EJEMPLOS ---------- */
function aplicar(m) {
    N = m.length;
    datos = m.map(f => f.slice());
    document.getElementById('sizeLabel').textContent = N;
    renderMatriz();
    toast('Ejemplo cargado. Pulse «Analizar grafo».');
}

// Königsberg: 4 regiones, 7 puentes. Vértices de grado impar.
// A-B 2, A-C 2, A-D 1, B-D 1, C-D 1  ->  grados 5,3,3,3 (todos impares)
function cargarKonigsberg() {
    aplicar([
        [0, 2, 2, 1],
        [2, 0, 0, 1],
        [2, 0, 0, 1],
        [1, 1, 1, 0],
    ]);
}

// Grafo sí euleriano: ciclo de 4 vértices, todos grado par (2).
function cargarEuler() {
    aplicar([
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
    ]);
}

/* ---------- UI ---------- */
let snackTimer;
function toast(msg) {
    const s = document.getElementById('snack');
    s.textContent = msg;
    s.classList.remove('hidden');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => s.classList.add('hidden'), 2600);
}

initDatos();
renderMatriz();
