#!/usr/bin/env python3
"""
Project JARVIS: BRAIN-001
PHASE E: Tensor Cross-Language Verification Runner (Python 3 vs TypeScript V8)
Outputs exact raw comparison table mandated by specification v3.0.
"""

import json
import math
import subprocess
import sys
from tensor_reference import TensorRef

# Load test vectors
with open("src/math/tensor_test_vectors.json", "r") as f:
    vector_file = json.load(f)
cases = vector_file["cases"]

# TypeScript evaluation script
ts_script = """
import { CanonicalTensor } from './src/math/tensor';
import * as fs from 'fs';

const vectorFile = JSON.parse(fs.readFileSync('src/math/tensor_test_vectors.json', 'utf8'));
const cases = vectorFile.cases;
const results: any[] = [];

for (const c of cases) {
  if (c.id === 'tensor_case_03_batched_matmul_f64') {
    const A = CanonicalTensor.fromFlatArray(c.shapeA, c.dataA, c.dtype);
    const B = CanonicalTensor.fromFlatArray(c.shapeB, c.dataB, c.dtype);
    const C = A.batchedMatMul(B);
    results.push({
      id: c.id,
      dtype: c.dtype,
      frobA: A.frobeniusNorm(),
      l1A: A.normL1(),
      linfA: A.normLinf(),
      bmmFrob: C.frobeniusNorm(),
      bmmL1: C.normL1(),
    });
  } else {
    const A = CanonicalTensor.fromFlatArray(c.shape, c.dataA, c.dtype);
    const B = CanonicalTensor.fromFlatArray(c.shape, c.dataB, c.dtype);
    const sumAB = A.add(B);
    const scaledA = A.scale(2.5);

    results.push({
      id: c.id,
      dtype: c.dtype,
      frobA: A.frobeniusNorm(),
      l1A: A.normL1(),
      linfA: A.normLinf(),
      addFrob: sumAB.frobeniusNorm(),
      addL1: sumAB.normL1(),
      scaleFrob: scaledA.frobeniusNorm(),
    });
  }
}

console.log(JSON.stringify(results));
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
print("BRAIN-001 CANONICAL TENSOR: PYTHON VS TYPESCRIPT RAW CROSS-LANGUAGE VERIFICATION TABLE")
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

    u = (1.192093e-7 / 2) if dtype == "float32" else (2.220446e-16 / 2)
    tol = 1e-5 if dtype == "float32" else 1e-12

    if cid == "tensor_case_03_batched_matmul_f64":
        py_A = TensorRef(c["shapeA"], c["dataA"])
        py_B = TensorRef(c["shapeB"], c["dataB"])
        py_C = py_A.batched_matmul(py_B)

        ops = [
            ("frob_norm(A)", py_A.frobenius_norm(), ts["frobA"]),
            ("norm_L1(A)", py_A.norm_l1(), ts["l1A"]),
            ("norm_Linf(A)", py_A.norm_linf(), ts["linfA"]),
            ("bmm_frob(A*B)", py_C.frobenius_norm(), ts["bmmFrob"]),
            ("bmm_L1(A*B)", py_C.norm_l1(), ts["bmmL1"]),
        ]
    else:
        py_A = TensorRef(c["shape"], c["dataA"])
        py_B = TensorRef(c["shape"], c["dataB"])
        py_sum = py_A.add(py_B)
        py_scaled = py_A.scale(2.5)

        ops = [
            ("frob_norm(A)", py_A.frobenius_norm(), ts["frobA"]),
            ("norm_L1(A)", py_A.norm_l1(), ts["l1A"]),
            ("norm_Linf(A)", py_A.norm_linf(), ts["linfA"]),
            ("add_frob(A+B)", py_sum.frobenius_norm(), ts["addFrob"]),
            ("add_L1(A+B)", py_sum.norm_l1(), ts["addL1"]),
            ("scale_frob(2.5*A)", py_scaled.frobenius_norm(), ts["scaleFrob"]),
        ]

    for op_name, py_val, ts_val in ops:
        total_comparisons += 1
        abs_err = abs(py_val - ts_val)
        rel_err = abs_err / (abs(py_val) + 1e-30)
        passed = abs_err <= tol or rel_err <= tol
        if not passed:
            all_passed = False
        else:
            passed_comparisons += 1

        print(f"| {cid[:18]} | {op_name[:17]} | {py_val:16.8e} | {ts_val:16.8e} | {abs_err:10.4e} | {rel_err:10.4e} | {tol:10.2e} | {'PASS' if passed else 'FAIL'} |")

print("==========================================================================================")
print(f"TOTAL COMPARISONS: {passed_comparisons}/{total_comparisons} PASSED")
print(f"OVERALL STATUS:    {'PROVEN' if all_passed else 'FAILED'}")
print("==========================================================================================")

if not all_passed:
    sys.exit(1)
