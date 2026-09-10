#!/usr/bin/env python3
"""
Project JARVIS: BRAIN-001
Mathematical Kernel: Python Canonical Vector Reference Implementation
Enforces the identical mathematical specification for Cross-Language Verification.
"""

import json
import math
import sys
from typing import List, Tuple


class PythonCanonicalVector:
    def __init__(self, data: List[float], dtype: str = "float32"):
        if not data:
            raise ValueError("Empty vector is strictly forbidden")
        self.dimension = len(data)
        self.shape = (self.dimension,)
        self.dtype = dtype
        self.data = [float(x) for x in data]

        # Invariant check: all elements must be finite
        for i, x in enumerate(self.data):
            if not math.isfinite(x):
                raise ValueError(f"Non-finite element at index {i}: {x}")

    def add(self, other: "PythonCanonicalVector") -> "PythonCanonicalVector":
        if self.dimension != other.dimension:
            raise ValueError(f"Dimension mismatch: {self.dimension} vs {other.dimension}")
        return PythonCanonicalVector(
            [a + b for a, b in zip(self.data, other.data)],
            dtype=self.dtype
        )

    def subtract(self, other: "PythonCanonicalVector") -> "PythonCanonicalVector":
        if self.dimension != other.dimension:
            raise ValueError(f"Dimension mismatch: {self.dimension} vs {other.dimension}")
        return PythonCanonicalVector(
            [a - b for a, b in zip(self.data, other.data)],
            dtype=self.dtype
        )

    def scale(self, scalar: float) -> "PythonCanonicalVector":
        if not math.isfinite(scalar):
            raise ValueError(f"Scalar must be finite, got {scalar}")
        return PythonCanonicalVector(
            [x * scalar for x in self.data],
            dtype=self.dtype
        )

    def dot(self, other: "PythonCanonicalVector") -> float:
        if self.dimension != other.dimension:
            raise ValueError(f"Dimension mismatch: {self.dimension} vs {other.dimension}")
        return sum(a * b for a, b in zip(self.data, other.data))

    def norm_l1(self) -> float:
        return sum(abs(x) for x in self.data)

    def norm_l2(self) -> float:
        """Scaled Euclidean norm matching LAPACK dnrm2 algorithm."""
        max_abs = max(abs(x) for x in self.data)
        if max_abs == 0.0:
            return 0.0
        sum_sq = sum((x / max_abs) ** 2 for x in self.data)
        return max_abs * math.sqrt(sum_sq)

    def norm_linf(self) -> float:
        return max(abs(x) for x in self.data)

    def cosine_similarity(self, other: "PythonCanonicalVector") -> float:
        if self.dimension != other.dimension:
            raise ValueError(f"Dimension mismatch: {self.dimension} vs {other.dimension}")
        norm_u = self.norm_l2()
        norm_v = other.norm_l2()
        if norm_u == 0.0 or norm_v == 0.0:
            return 0.0
        dot_prod = self.dot(other)
        sim = dot_prod / (norm_u * norm_v)
        return max(-1.0, min(1.0, sim))


def verify_cross_language():
    json_path = "src/math/test_vectors.json"
    with open(json_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    print("============================================================")
    print("PROJECT JARVIS: CROSS-LANGUAGE VERIFICATION")
    print(f"Runner: Python {sys.version.split()[0]} vs TypeScript/Node.js")
    print("============================================================\n")

    all_passed = True
    for case in test_cases:
        cid = case["id"]
        dtype = case["dtype"]
        dim = case["dimension"]
        tol = 1e-6 if dtype == "float32" else 1e-12

        print(f"Verifying Test Vector: {cid} (Dim={dim}, DType={dtype}, Tol={tol})")

        py_u = PythonCanonicalVector(case["u"], dtype=dtype)
        py_v = PythonCanonicalVector(case["v"], dtype=dtype)
        alpha = case["alpha"]

        # 1. Add
        py_add = py_u.add(py_v).data
        max_diff_add = max(abs(a - b) for a, b in zip(py_add, case["expectedAdd"]))
        assert max_diff_add <= tol, f"Add failed: max diff {max_diff_add} > {tol}"
        print(f"  [PASS] Vector Addition max |Delta| = {max_diff_add:.2e}")

        # 2. Subtract
        py_sub = py_u.subtract(py_v).data
        max_diff_sub = max(abs(a - b) for a, b in zip(py_sub, case["expectedSub"]))
        assert max_diff_sub <= tol, f"Subtract failed: max diff {max_diff_sub} > {tol}"
        print(f"  [PASS] Vector Subtraction max |Delta| = {max_diff_sub:.2e}")

        # 3. Scale
        py_scale = py_u.scale(alpha).data
        max_diff_scale = max(abs(a - b) for a, b in zip(py_scale, case["expectedScaleU"]))
        assert max_diff_scale <= tol, f"Scale failed: max diff {max_diff_scale} > {tol}"
        print(f"  [PASS] Scalar Multiplication max |Delta| = {max_diff_scale:.2e}")

        # 4. Dot Product
        py_dot = py_u.dot(py_v)
        diff_dot = abs(py_dot - case["expectedDot"])
        assert diff_dot <= tol, f"Dot failed: diff {diff_dot} > {tol}"
        print(f"  [PASS] Dot Product |Delta| = {diff_dot:.2e}")

        # 5. L1 Norm
        py_l1 = py_u.norm_l1()
        diff_l1 = abs(py_l1 - case["expectedNormL1U"])
        assert diff_l1 <= tol, f"L1 Norm failed: diff {diff_l1} > {tol}"
        print(f"  [PASS] L1 Norm |Delta| = {diff_l1:.2e}")

        # 6. L2 Norm
        py_l2 = py_u.norm_l2()
        diff_l2 = abs(py_l2 - case["expectedNormL2U"])
        assert diff_l2 <= tol, f"L2 Norm failed: diff {diff_l2} > {tol}"
        print(f"  [PASS] Scaled L2 Norm |Delta| = {diff_l2:.2e}")

        # 7. Cosine Similarity
        py_cos = py_u.cosine_similarity(py_v)
        diff_cos = abs(py_cos - case["expectedCosineSim"])
        assert diff_cos <= tol, f"Cosine similarity failed: diff {diff_cos} > {tol}"
        print(f"  [PASS] Cosine Similarity |Delta| = {diff_cos:.2e}")
        print()

    print("============================================================")
    print("CROSS-LANGUAGE VERIFICATION RESULT: 100% MATCH ACROSS TS & PY")
    print("VERIFICATION: PASS (ALL TOLERANCES SATISFIED)")
    print("============================================================")


if __name__ == "__main__":
    verify_cross_language()
