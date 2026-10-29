"""Grafos dirigidos y el problema de los Puentes de Königsberg (Euler).

Backend en Python puro (Flask). Recibe una matriz de adyacencia n x n y calcula:
  1. Conjunto de vértices V(G) y tabla "función punto extremo-arista".
  2. Vértices aislados (grado 0).
  3. Diagnóstico de Circuito Euleriano (todos los grados pares + conexo).
"""
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


def analizar(matriz, nombres=None):
    n = len(matriz)
    if n == 0:
        return {"error": "La matriz está vacía."}
    for fila in matriz:
        if len(fila) != n:
            return {"error": "La matriz debe ser cuadrada (n x n)."}

    V = nombres if (nombres and len(nombres) == n) else [f"v{i}" for i in range(n)]

    # --- Aristas y tabla punto extremo-arista ---
    # Grafo no dirigido para Euler: se considera una conexión si hay adyacencia.
    aristas = []        # lista de (etiqueta, u, v)
    contador = 1
    for i in range(n):
        for j in range(i, n):
            peso = matriz[i][j]
            if i == j:
                # lazo: cuenta doble al grado
                for _ in range(peso):
                    aristas.append({"arista": f"e{contador}", "extremos": [V[i], V[i]], "lazo": True})
                    contador += 1
            else:
                mult = max(matriz[i][j], matriz[j][i])  # multiplicidad (soporta multigrafo)
                for _ in range(mult):
                    aristas.append({"arista": f"e{contador}", "extremos": [V[i], V[j]], "lazo": False})
                    contador += 1

    # --- Grados ---
    grado = {v: 0 for v in V}
    for a in aristas:
        u, w = a["extremos"]
        if a["lazo"]:
            grado[u] += 2
        else:
            grado[u] += 1
            grado[w] += 1

    # --- Vértices aislados (grado 0) ---
    aislados = [v for v in V if grado[v] == 0]

    # --- Conexidad entre vértices con grado > 0 ---
    ady = {v: set() for v in V}
    for a in aristas:
        u, w = a["extremos"]
        if u != w:
            ady[u].add(w)
            ady[w].add(u)

    con_grado = [v for v in V if grado[v] > 0]
    conexo = True
    if con_grado:
        visitados = set()
        pila = [con_grado[0]]
        while pila:
            x = pila.pop()
            if x in visitados:
                continue
            visitados.add(x)
            for y in ady[x]:
                if y not in visitados:
                    pila.append(y)
        conexo = all(v in visitados for v in con_grado)

    # --- Diagnóstico Euler ---
    impares = [v for v in V if grado[v] % 2 != 0]
    todos_pares = len(impares) == 0

    if not con_grado:
        tiene_circuito = False
        motivo = ("El grafo no tiene aristas, por lo que no existe recorrido que trazar.")
    elif not conexo:
        tiene_circuito = False
        motivo = ("No existe Circuito Euleriano: los vértices con aristas NO están todos "
                   "conectados entre sí (el grafo no es conexo). Un circuito debe poder "
                   "recorrer todo el grafo sin saltar entre partes separadas.")
    elif not todos_pares:
        tiene_circuito = False
        lista = ", ".join(f"{v} (grado {grado[v]})" for v in impares)
        motivo = (f"No existe Circuito Euleriano. Euler demostró que se necesita que TODOS "
                  f"los vértices tengan grado par. Aquí hay {len(impares)} vértice(s) de grado "
                  f"impar: {lista}. Por eso NO se puede recorrer sin levantar el lápiz "
                  f"(igual que los puentes de Königsberg, que tenían 4 vértices impares).")
    else:
        tiene_circuito = True
        motivo = ("SÍ existe un Circuito Euleriano. El grafo es conexo y todos sus vértices "
                  "tienen grado par, que es exactamente la condición que Euler probó. "
                  "Se puede partir de cualquier vértice, recorrer cada arista una sola vez "
                  "y volver al inicio SIN levantar el lápiz.")

    tabla = [{"vertice": v, "grado": grado[v]} for v in V]

    return {
        "vertices": V,
        "n": n,
        "aristas": aristas,
        "total_aristas": len(aristas),
        "tabla_grados": tabla,
        "aislados": aislados,
        "grados_impares": impares,
        "todos_pares": todos_pares,
        "conexo": conexo,
        "tiene_circuito_euleriano": tiene_circuito,
        "diagnostico": motivo,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/analizar", methods=["POST"])
def api_analizar():
    data = request.get_json(silent=True) or {}
    matriz = data.get("matriz")
    nombres = data.get("nombres")

    if not matriz:
        return jsonify({"error": "Falta la matriz de adyacencia."}), 400

    try:
        matriz = [[int(x) for x in fila] for fila in matriz]
    except (ValueError, TypeError):
        return jsonify({"error": "La matriz debe contener solo números enteros."}), 400

    resultado = analizar(matriz, nombres)
    if "error" in resultado:
        return jsonify(resultado), 400
    return jsonify(resultado)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
