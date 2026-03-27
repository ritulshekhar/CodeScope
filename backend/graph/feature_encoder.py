"""
Feature Encoder — converts graph nodes into 64-dim float32 embeddings.
Embeddings are deterministic (MD5-seeded), L2-normalized.
"""
import hashlib
import math
import numpy as np


# Embedding dimensions
TYPE_DIM = 21
TOKEN_DIM = 21
POS_DIM = 22
TOTAL_DIM = TYPE_DIM + TOKEN_DIM + POS_DIM  # = 64

# Sinusoidal frequencies for positional encoding
_FREQS = [math.pi / (2 ** i) for i in range(4)]


def _seeded_vector(text: str, dim: int) -> np.ndarray:
    """Generate a deterministic random unit vector seeded by MD5 of text."""
    seed = int(hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(dim).astype(np.float32)
    norm = np.linalg.norm(v)
    return v / norm if norm > 1e-8 else v


def _type_embedding(node_type: str) -> np.ndarray:
    return _seeded_vector(f"type:{node_type}", TYPE_DIM)


def _token_embedding(token: str) -> np.ndarray:
    # Normalize token — strip whitespace, lowercase, limit length
    token = (token or "").strip().lower()[:50]
    return _seeded_vector(f"token:{token}", TOKEN_DIM)


def _positional_encoding(depth: int, in_deg: int, out_deg: int, children: int) -> np.ndarray:
    """22-dim positional encoding: 4 tanh values + 18 sinusoidal."""
    pos = np.zeros(POS_DIM, dtype=np.float32)
    # Tanh-scaled structural features
    pos[0] = math.tanh(depth / 10.0)
    pos[1] = math.tanh(in_deg / 5.0)
    pos[2] = math.tanh(out_deg / 5.0)
    pos[3] = math.tanh(children / 10.0)
    # Sinusoidal over depth
    for i, freq in enumerate(_FREQS):
        pos[4 + i * 2] = math.sin(depth * freq)
        pos[5 + i * 2] = math.cos(depth * freq)
    # Sinusoidal over in_deg
    pos[12] = math.sin(in_deg * math.pi / 8.0)
    pos[13] = math.cos(in_deg * math.pi / 8.0)
    # Sinusoidal over out_deg
    pos[14] = math.sin(out_deg * math.pi / 8.0)
    pos[15] = math.cos(out_deg * math.pi / 8.0)
    # Children encoding
    pos[16] = math.sin(children * math.pi / 20.0)
    pos[17] = math.cos(children * math.pi / 20.0)
    # Extra depth sinusoidals
    pos[18] = math.sin(depth * math.pi * 2)
    pos[19] = math.cos(depth * math.pi * 2)
    pos[20] = math.tanh((in_deg + out_deg) / 10.0)
    pos[21] = math.tanh(depth * 0.5)
    return pos


class FeatureEncoder:

    def encode(self, program_graph: dict) -> tuple:
        """
        Encode all nodes into N×64 float32 matrix.

        Args:
            program_graph: output dict from ProgramGraphBuilder.build()

        Returns:
            (node_ids: list, embeddings: np.ndarray [N×64])
        """
        node_ids = program_graph.get("node_ids", [])
        node_features_raw = program_graph.get("node_features_raw", {})

        N = len(node_ids)
        if N == 0:
            return node_ids, np.zeros((0, TOTAL_DIM), dtype=np.float32)

        embeddings = np.zeros((N, TOTAL_DIM), dtype=np.float32)

        for i, nid in enumerate(node_ids):
            feat = node_features_raw.get(nid, {})
            ntype = feat.get("type", "Unknown")
            token = feat.get("token", "")
            depth = int(feat.get("depth", 0))
            in_deg = int(feat.get("in_degree", 0))
            out_deg = int(feat.get("out_degree", 0))
            children = int(feat.get("num_children", 0))

            type_emb = _type_embedding(ntype)
            token_emb = _token_embedding(token)
            pos_emb = _positional_encoding(depth, in_deg, out_deg, children)

            emb = np.concatenate([type_emb, token_emb, pos_emb])

            # L2 normalize
            norm = np.linalg.norm(emb)
            if norm > 1e-8:
                emb = emb / norm

            embeddings[i] = emb

        return node_ids, embeddings
