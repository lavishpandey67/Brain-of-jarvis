#!/usr/bin/env python3
"""
Project JARVIS: BRAIN-001
PHASE E: Cross-Language Verification Runner (Python vs TypeScript)
Outputs exact raw comparison table mandated by specification v3.0.
"""

import json
import math
import subprocess
import sys

def py_norm_l2(vec):
    max_abs = max(abs(x) for x in vec)
    if max_abs == 0.0:
        return 0.0
    return max_abs * math.sqrt(sum((x / max_abs) ** 2 for x in vec))

def py_dot(u, v):
    return sum(x * y for x, y in zip(u, v))

def py_cosine(u, v):
    nu = py_norm_l2(u)
    nv = py_norm_l2(v)
    if nu == 0.0 or nv == 0.0:
        return 0.0
    val = py_dot(u, v) / (nu * nv)
    return max(-1.0, min(1.0, val))

def py_normalize(u):
    nu = py_norm_l2(u)
    if nu == 0.0:
        raise ValueError("zero norm")
    return [x / nu for x in u]

# Load test vectors
with open("src/math/test_vectors.json", "r") as f:
    cases = json.load(f)

# Run TypeScript extraction helper to get live TS results
ts_code = """
import { CanonicalVector } from './src/math/vector';
import * as fs from 'fs';

const cases = JSON.parse(fs.readFileSync('src/math/test_vectors.json', 'utf8'));
const out: any[] = [];

for (const c of cases) {
  const u = CanonicalVector.fromArray(c.u, c.dtype);
  const v = CanonicalVector.fromArray(c.v, c.dtype);
  out.push({
    id: c.id,
    dot: u.dot(v),
    normU: u.normL2(),
    normV: v.normL2(),
    addFirst: u.add(v).get(0),
    normFirst: u.normalize().get(0),
    cosine: u.cosineSimilarity(v)
  });
}
console.log(JSON.stringify(out));
"""

with open("temp_ts_runner.ts", "w") as f:
    f.write(ts_code)

res = subprocess.run(["npx", "tsx", "temp_ts_runner.ts"], capture_output=True, text=True)
if res.returncode != 0:
    print(f"TS Runner failed: {res.stderr}")
    sys.exit(1)

ts_data = json.loads(res.stdout)
ts_map = {item["id"]: item for item in ts_data}

print("========================================================================================================================")
print("PROJECT JARVIS: BRAIN-001 — PHASE E RAW CROSS-LANGUAGE COMPARISON TABLE")
print("========================================================================================================================")
header = f"{'CASE / INPUT':<25} | {'OPERATION':<15} | {'TS RESULT':<16} | {'PYTHON RESULT':<16} | {'ABS ERROR':<10} | {'REL ERROR':<10} | {'TOL':<8} | {'STATUS':<5}"
print(header)
print("-" * len(header))

all_passed = True

for c in cases:
    cid = c["id"]
    dtype = c["dtype"]
    u = c["u"]
    v = c["v"]
    ts = ts_map[cid]
    tol = 1e-12 if dtype == "float64" else 1e-6

    # 1. Dot Product
    ts_val = ts["dot"]
    py_val = py_dot(u, v)
    abs_err = abs(ts_val - py_val)
    rel_err = abs_err / (abs(py_val) + 1e-18)
    status = "PASS" if abs_err <= tol else "FAIL"
    if status == "FAIL": all_passed = False
    print(f"{cid:<25} | {'dot_product':<15} | {ts_val:<16.8e} | {py_val:<16.8e} | {abs_err:<10.2e} | {rel_err:<10.2e} | {tol:<8.0e} | {status:<5}")

    # 2. Norm U
    ts_val = ts["normU"]
    py_val = py_norm_l2(u)
    abs_err = abs(ts_val - py_val)
    rel_err = abs_err / (abs(py_val) + 1e-18)
    status = "PASS" if abs_err <= tol else "FAIL"
    if status == "FAIL": all_passed = False
    print(f"{cid:<25} | {'norm_l2_u':<15} | {ts_val:<16.8e} | {py_val:<16.8e} | {abs_err:<10.2e} | {rel_err:<10.2e} | {tol:<8.0e} | {status:<5}")

    # 3. Addition (element 0)
    ts_val = ts["addFirst"]
    py_val = u[0] + v[0]
    abs_err = abs(ts_val - py_val)
    rel_err = abs_err / (abs(py_val) + 1e-18)
    status = "PASS" if abs_err <= tol else "FAIL"
    if status == "FAIL": all_passed = False
    print(f"{cid:<25} | {'add[0]':<15} | {ts_val:<16.8e} | {py_val:<16.8e} | {abs_err:<10.2e} | {rel_err:<10.2e} | {tol:<8.0e} | {status:<5}")

    # 4. Normalization (element 0)
    ts_val = ts["normFirst"]
    py_val = py_normalize(u)[0]
    abs_err = abs(ts_val - py_val)
    rel_err = abs_err / (abs(py_val) + 1e-18)
    status = "PASS" if abs_err <= tol else "FAIL"
    if status == "FAIL": all_passed = False
    print(f"{cid:<25} | {'normalize[0]':<15} | {ts_val:<16.8e} | {py_val:<16.8e} | {abs_err:<10.2e} | {rel_err:<10.2e} | {tol:<8.0e} | {status:<5}")

    # 5. Cosine Similarity
    ts_val = ts["cosine"]
    py_val = py_cosine(u, v)
    abs_err = abs(ts_val - py_val)
    rel_err = abs_err / (abs(py_val) + 1e-18)
    status = "PASS" if abs_err <= tol else "FAIL"
    if status == "FAIL": all_passed = False
    print(f"{cid:<25} | {'cosine_similarity':<15} | {ts_val:<16.8e} | {py_val:<16.8e} | {abs_err:<10.2e} | {rel_err:<10.2e} | {tol:<8.0e} | {status:<5}")

print("-" * len(header))
print(f"CROSS-LANGUAGE VERIFICATION: {'PASS (ALL TOLERANCES SATISFIED)' if all_passed else 'FAILED'}")
print("========================================================================================================================")

# Cleanup
subprocess.run(["rm", "-f", "temp_ts_runner.ts"])
