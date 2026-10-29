# Grafos dirigidos y los Puentes de Königsberg (Euler)

Aplicación web que analiza un grafo a partir de su **matriz de adyacencia (n × n)**:

1. Lista el conjunto de vértices **V(G)** y genera la tabla **función punto extremo–arista**.
2. Identifica **vértices aislados** (grado 0).
3. Evalúa matemáticamente si el grafo posee un **Circuito Euleriano** (como en el problema de los puentes de Königsberg), verificando que el grafo sea conexo y que todos los vértices tengan **grado par**, e imprime un diagnóstico explicando por qué sí o por qué no puede recorrerse sin levantar el lápiz.

## Arquitectura

- **Backend:** Python puro (Flask) — toda la lógica matemática vive en `app.py` (`/api/analizar`).
- **Frontend:** HTML + CSS + JavaScript. En GitHub Pages (que no ejecuta Python) el JS incluye un *fallback* local que replica exactamente la lógica del backend.

## Uso local (con backend Python)

```bash
pip install -r requirements.txt
python app.py
# abrir http://localhost:5001
```

## Despliegue

Publicado con GitHub Pages (versión estática con fallback en JS).
