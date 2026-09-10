#!/usr/bin/env python3
"""
Project JARVIS: BRAIN-001
PHASE E: Matrix Cross-Language Verification Runner (Python vs TypeScript)
Outputs exact raw comparison table mandated by specification v3.0.
"""

import json
import math
import subprocess
import sys
from matrix_reference import (
    py_frobenius_norm,
    py_norm_l1,
    py_norm_linf,
    py_trace,
    py_transpose,
    py_add,
    py_gemm,
    py_gemv,
)

# Load test cases
with open("src/math/matrix_test_vectors.json", "r") as f:
    cases = json.load(f)

# Build TypeScript runner code
ts_script = """
import { CanonicalMatrix } from './src/math/matrix';
import { CanonicalVector } from './src/math/vector';
import * as fs from 'fs';

const cases = JSON.parse(fs.readFileSync('src/math/matrix_test_vectors.json', 'utf8'));
const out: any[] = [];

for (const c of cases) {
  const A = CanonicalMatrix.from2DArray(c.A, c.dtype);
  const B = CanonicalMatrix.from2DArray(c.B, c.dtype);
  const x = CanonicalVector.fromArray(c.x, c.dtype);

  let traceA = null;
  if (A.isSquare()) {
    traceA = A.trace();
  }

  let addNorm = null;
  if (A.rows === B.rows && A.cols === B.cols) {
    addNorm = A.add(B).frobeniusNorm();
  }

  const gemmNorm = A.multiply(B).frobeniusNorm();
  const gemvNorm = A.multiplyVector(x).normL2();
  const transNorm = A.transpose().frobeniusNorm();

  out.push({
    id: c.id,
    dtype: c.dtype,
    frobeniusA: A.frobeniusNorm(),
    normL1A: A.normL1(),
    normLinfA: A.normLinf(),
    traceA: traceA,
    addNorm: addNorm,
    gemmNorm: gemmNorm,
    gemvNorm: gemvNorm,
    transNorm: transNorm,
  });
}

console.log(JSON.stringify(out));
"""

# Run TypeScript extractor
proc = subprocess.run(
    ["npx", "tsx", "-e", ts_script],
    capture_output=True,
    text=True,
    check=True
)

ts_results = json.loads(proc.stdout)
ts_map = {r["id"]: r for r in ts_results}

print("==========================================================================================")
print("BRAIN-001 CANONICAL MATRIX: PYTHON VS TYPESCRIPT RAW CROSS-LANGUAGE VERIFICATION TABLE")
print("==========================================================================================")
print("| Case ID | Metric / Op | Python Ref (Py3) | TypeScript (V8) | Abs Error | Rel Error | Higham Tol | Status |")
print("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |")

all_passed = True
total_comparisons = 0
passed_comparisons = 0

for c in cases:
    cid = c["id"]
    dtype = c["dtype"]
    ts = ts_map[cid]

    # Reference Python values
    py_frob_A = py_frobenius_norm(c["A"])
    py_l1_A = py_norm_l1(c["A"])
    py_linf_A = py_norm_linf(c["A"])
    py_gemm_res = py_gemm(c["A"], c["B"])
    py_gemm_norm = py_frobenius_norm(py_gemm_res)
    py_gemv_res = py_gemv(c["A"], c["x"])
    py_gemv_norm = math.sqrt(sum(y**2 for y in py_gemv_res))
    py_trans_norm = py_frobenius_norm(py_transpose(c["A"]))

    ops = [
        ("frob_norm(A)", py_frob_A, ts["frobeniusA"]),
        ("norm_L1(A)", py_l1_A, ts["normL1A"]),
        ("norm_Linf(A)", py_linf_A, ts["normLinfA"]),
        ("transpose_norm(A)", py_trans_norm, ts["transNorm"]),
        ("gemm_norm(A*B)", py_gemm_norm, ts["gemmNorm"]),
        ("gemv_norm(A*x)", py_gemv_norm, ts["gemvNorm"]),
    ]

    if c["A_rows"] == c["A_cols"]:
        py_tr = py_trace(c["A"])
        ops.append(("trace(A)", py_tr, ts["traceA"]))

    if c["A_rows"] == c["B_rows"] and c["A_cols"] == c["B_cols"]:
        py_add_res = py_add(c["A"], c["B"])
        py_add_norm = py_frobenius_norm(py_add_res)
        ops.append(("add_norm(A+B)", py_add_norm, ts["addNorm"]))

    # Higham backward tolerance based on dimension and dtype
    k = c["A_cols"]
    u = (1.192093e-7 / 2) if dtype == "float32" else (2.220446e-16 / 2)
    gamma_k = (k * u) / (1.0 - k * u)
    tol = max(gamma_k * 50.0, 1e-5 if dtype == "float32" else 1e-13)

    for op_name, py_val, ts_val in ops:
        total_comparisons += 1
        abs_err = abs(py_val - ts_val)
        rel_err = abs_err / (abs(py_val) + 1e-30)
        passed = abs_err <= tol or rel_err <= tol
        if not passed:
            all_passed = False
        else:
            passed_comparisons += 1

        print(f"| {cid[:18]} | {op_name[:16]} | {py_val:16.8e} | {ts_val:16.8e} | {abs_err:10.4e} | {rel_err:10.4e} | {tol:10.2e} | {'PASS' if passed else 'FAIL'} |")

print("==========================================================================================")
print(f"TOTAL COMPARISONS: {passed_comparisons}/{total_comparisons} PASSED")
print(f"OVERALL STATUS:    {'PROVEN' if all_passed else 'FAILED'}")
print("==========================================================================================")

if not all_passed:
    sys.exit(1)
