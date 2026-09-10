"""
Project JARVIS: BRAIN-001
Python 3 Tensor Reference Implementation for Cross-Language Verification

Conforms to standard IEEE 754 arithmetic and row-major C-contiguous memory layout.
"""

import math
from typing import List, Tuple, Union

class TensorRef:
    def __init__(self, shape: List[int], data: List[float]):
        self.shape = list(shape)
        self.rank = len(shape)
        total = 1
        for d in shape:
            total *= d
        if len(data) != total:
            raise ValueError(f"Data length {len(data)} != shape total {total}")
        self.data = [float(x) for x in data]
        self.strides = self._compute_strides(self.shape)

    @staticmethod
    def _compute_strides(shape: List[int]) -> List[int]:
        rank = len(shape)
        strides = [1] * rank
        stride = 1
        for k in range(rank - 1, -1, -1):
            strides[k] = stride
            stride *= shape[k]
        return strides

    def linear_index(self, indices: List[int]) -> int:
        idx = 0
        for k in range(self.rank):
            idx += indices[k] * self.strides[k]
        return idx

    def get(self, indices: List[int]) -> float:
        return self.data[self.linear_index(indices)]

    def frobenius_norm(self) -> float:
        max_abs = max(abs(x) for x in self.data)
        if max_abs == 0.0:
            return 0.0
        sum_sq = sum((x / max_abs) ** 2 for x in self.data)
        return max_abs * math.sqrt(sum_sq)

    def norm_l1(self) -> float:
        return sum(abs(x) for x in self.data)

    def norm_linf(self) -> float:
        return max(abs(x) for x in self.data)

    def add(self, other: 'TensorRef') -> 'TensorRef':
        if self.shape != other.shape:
            raise ValueError("Shapes must match for add")
        res_data = [a + b for a, b in zip(self.data, other.data)]
        return TensorRef(self.shape, res_data)

    def scale(self, s: float) -> 'TensorRef':
        res_data = [x * s for x in self.data]
        return TensorRef(self.shape, res_data)

    def transpose_2d(self) -> 'TensorRef':
        if self.rank != 2:
            raise ValueError("transpose_2d requires rank 2")
        m, n = self.shape
        res_data = [0.0] * (m * n)
        for i in range(m):
            for j in range(n):
                res_data[j * m + i] = self.data[i * n + j]
        return TensorRef([n, m], res_data)

    def batched_matmul(self, other: 'TensorRef') -> 'TensorRef':
        if self.rank != 3 or other.rank != 3:
            raise ValueError("batched_matmul reference expects rank 3")
        B, M, K = self.shape
        B2, K2, P = other.shape
        if B != B2 or K != K2:
            raise ValueError(f"Shape mismatch in batched_matmul: {self.shape} vs {other.shape}")

        out_shape = [B, M, P]
        out_data = [0.0] * (B * M * P)
        out_strides = self._compute_strides(out_shape)

        for b in range(B):
            for i in range(M):
                for k in range(K):
                    a_val = self.get([b, i, k])
                    if a_val == 0.0:
                        continue
                    for j in range(P):
                        b_val = other.get([b, k, j])
                        out_idx = b * out_strides[0] + i * out_strides[1] + j * out_strides[2]
                        out_data[out_idx] += a_val * b_val

        return TensorRef(out_shape, out_data)
