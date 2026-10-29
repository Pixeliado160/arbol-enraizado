"""Inspector de árboles enraizados — backend en Python puro (Flask).

Representa el árbol en memoria mediante un ARREGLO DE PADRES:
cada vértice apunta a su padre; la raíz apunta a sí misma / None.
"""
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


def construir_arbol(parent_array):
    """Normaliza el arreglo de padres en mapas de padre e hijos."""
    padre_de = {}
    hijos_de = {}
    vertices = set()
    raiz = None

    for v, p in parent_array.items():
        vertices.add(v)
        if p in (None, "", v):
            raiz = v
            padre_de[v] = None
        else:
            vertices.add(p)
            padre_de[v] = p
            hijos_de.setdefault(p, []).append(v)

    # vértices que solo aparecen como padres también existen
    for p in list(hijos_de.keys()):
        padre_de.setdefault(p, None)

    return raiz, padre_de, hijos_de, vertices


def ficha_tecnica(vertice, raiz, padre_de, hijos_de):
    es_raiz = vertice == raiz
    padre = padre_de.get(vertice)
    hijos = sorted(hijos_de.get(vertice, []))
    es_hoja = len(hijos) == 0

    hermanos = []
    if not es_raiz and padre is not None:
        hermanos = sorted(h for h in hijos_de.get(padre, []) if h != vertice)

    return {
        "vertice": vertice,
        "es_raiz": es_raiz,
        "padre": None if es_raiz else padre,
        "hijos": hijos,
        "es_hoja": es_hoja,
        "clasificacion": "Vértice Terminal (Hoja)" if es_hoja else "Vértice Interno",
        "hermanos": hermanos,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/ficha", methods=["POST"])
def api_ficha():
    data = request.get_json(silent=True) or {}
    parent_array = data.get("padres")
    vertice = data.get("vertice")

    if not parent_array or vertice is None:
        return jsonify({"error": "Faltan datos: se requiere el arreglo de padres y un vértice."}), 400

    raiz, padre_de, hijos_de, vertices = construir_arbol(parent_array)

    if raiz is None:
        return jsonify({"error": "No se identificó una raíz (un vértice sin padre)."}), 400

    if vertice not in vertices:
        return jsonify({"error": f"El vértice '{vertice}' no pertenece al árbol."}), 400

    resultado = ficha_tecnica(vertice, raiz, padre_de, hijos_de)
    resultado["raiz"] = raiz
    resultado["total"] = len(vertices)
    return jsonify(resultado)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
