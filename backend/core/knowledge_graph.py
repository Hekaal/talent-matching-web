"""Load Knowledge Graph SEKALI saat startup — jangan load per request.

Disalin dari Agent_TalentMatching_rombak_must_have_min_score=0.65.ipynb
(cell 4 load KG, cell 6 clo_node_to_col_idx).
KG berukuran besar (2.533 node, ~105.707 edge).

Optimasi startup: hasil parse graphml di-cache sebagai pickle (kg_cache.pkl)
di folder data — load ~0.1 detik vs ~3 detik parse XML. Cache dibuat ulang
otomatis jika file graphml lebih baru.
"""

import os
import pickle

import networkx as nx

from core.config import KG_PATH
from core.data_loader import COL_INDEX

_CACHE_PATH = str(KG_PATH) + ".cache.pkl"


def _load_kg():
    if os.path.isfile(_CACHE_PATH) and os.path.getmtime(_CACHE_PATH) >= os.path.getmtime(KG_PATH):
        with open(_CACHE_PATH, "rb") as f:
            return pickle.load(f)
    g = nx.read_graphml(KG_PATH)
    try:
        with open(_CACHE_PATH, "wb") as f:
            pickle.dump(g, f, protocol=pickle.HIGHEST_PROTOCOL)
    except OSError:
        pass  # cache gagal ditulis tidak fatal
    return g


G = _load_kg()


def clo_node_to_col_idx(node_id: str) -> int:
    """Konversi node_id KG (CLO__{clo_key}) ke index kolom matrix mahasiswa."""
    clo_key = node_id.replace("CLO__", "", 1)
    return COL_INDEX.get(clo_key, -1)


print(f"KG loaded: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges")
