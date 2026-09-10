#!/usr/bin/env python3
"""
Project JARVIS: BRAIN-001
Canonical Matrix Mathematical Reference Layer in Python 3
"""

import math

def py_frobenius_norm(A):
    flat = [abs(x) for row in A for x in row]
    max_abs = max(flat) if flat else 0.0
    if max_abs == 0.0:
        return 0.0
    return max_abs * math.sqrt(sum((x / max_abs) ** 2 for x in flat))

def py_norm_l1(A):
    m = len(A)
    n = len(A[0])
    max_col = 0.0
    for j in range(n):
        col_sum = sum(abs(A[i][j]) for i in range(m))
        if col_sum > max_col:
            max_col = col_sum
    return max_col

def py_norm_linf(A):
    return max(sum(abs(x) for x in row) for row in A)

def py_trace(A):
    if len(A) != len(A[0]):
        raise ValueError("Non-square matrix has no trace")
    return sum(A[i][i] for i in range(len(A)))

def py_transpose(A):
    m = len(A)
    n = len(A[0])
    return [[A[i][j] for i in range(m)] for j in range(n)]

def py_add(A, B):
    m = len(A)
    n = len(A[0])
    return [[A[i][j] + B[i][j] for j in range(n)] for i in range(m)]

def py_gemm(A, B):
    m = len(A)
    k = len(A[0])
    if len(B) != k:
        raise ValueError(f"GEMM shape mismatch: {k} != {len(B)}")
    p = len(B[0])
    out = [[0.0] * p for _ in range(m)]
    for i in range(m):
        for kk in range(k):
            aVal = A[i][kk]
            if aVal == 0.0:
                continue
            for j in range(p):
                out[i][j] += aVal * B[kk][j]
    return out

def py_gemv(A, x):
    m = len(A)
    n = len(A[0])
    if len(x) != n:
        raise ValueError(f"GEMV shape mismatch: {n} != {len(x)}")
    out = [0.0] * m
    for i in range(m):
        out[i] = sum(A[i][j] * x[j] for j in range(n))
    return out
