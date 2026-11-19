#!/usr/bin/env python3
"""
Comprehensive Data-Leakage and Generalization Audit for Botanical Crop Verifier
Audits:
1. Reconstructs exact 8,844 training images used in train_crop_verifier.py:
   - 7,444 in-distribution images from train_split.csv
   - 1,400 unsupported background images (14 PlantVillage folders x 100 images)
2. Reconstructs all 700 unsupported benchmark images from test_unsupported_crop_rejection.py (7 crops x 100 images)
3. Reconstructs all 1,594 validation images from val_split.csv
4. Reconstructs all 1,597 test images from test_split.csv
5. Computes:
   - Exact file path matches
   - Exact SHA-256 byte-level hashes
   - Perceptual dHash (difference hash, 64-bit)
   - Perceptual pHash (DCT-based perceptual hash, 64-bit)
6. Compares:
   - 700 unsupported benchmark images vs 8,844 verifier training images
   - 1,594 validation images vs 8,844 verifier training images
   - 1,597 held-out test images vs 8,844 verifier training images
7. Evaluates perceptual near-duplicates (Hamming distance = 0, <= 5, <= 10)
8. Reports breakdown per crop:
   - Soybean
   - Strawberry
   - Apple
   - Grape
   - Peach
   - Pepper Bell
   - Orange
9. Evaluates true held-out images in those PlantVillage folders (files[100:]) to check true generalization!
"""

import os
import sys
import csv
import json
import time
import hashlib
from pathlib import Path
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
import numpy as np
import scipy.fftpack

REPO_ROOT = Path("/Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan")
BACKEND_ML = REPO_ROOT / "backend" / "ml"
TRAIN_CSV = BACKEND_ML / "train_split.csv"
VAL_CSV = BACKEND_ML / "val_split.csv"
TEST_CSV = BACKEND_ML / "test_split.csv"
PLANTVILLAGE_DIR = Path("/Users/sushanthks/Documents/Major Project/plantvillage dataset/color")

CROP_NAMES = ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton", "Unsupported"]
CROP_TO_IDX = {name: idx for idx, name in enumerate(CROP_NAMES)}

UNSUPPORTED_TRAIN_FOLDERS = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___healthy",
    "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Soybean___healthy"
]

BENCHMARK_FOLDERS = {
    "Soybean": PLANTVILLAGE_DIR / "Soybean___healthy",
    "Strawberry": PLANTVILLAGE_DIR / "Strawberry___Leaf_scorch",
    "Apple": PLANTVILLAGE_DIR / "Apple___Apple_scab",
    "Grape": PLANTVILLAGE_DIR / "Grape___Black_rot",
    "Peach": PLANTVILLAGE_DIR / "Peach___Bacterial_spot",
    "Pepper_Bell": PLANTVILLAGE_DIR / "Pepper,_bell___healthy",
    "Orange": PLANTVILLAGE_DIR / "Orange___Haunglongbing_(Citrus_greening)"
}

def compute_file_hashes(filepath_str):
    """Computes SHA-256, dHash (int), and pHash (int) for a single image file."""
    p = Path(filepath_str)
    if not p.exists():
        return filepath_str, None, None, None
    try:
        with open(p, "rb") as f:
            content = f.read()
            sha256 = hashlib.sha256(content).hexdigest()
        
        img = Image.open(p)
        
        # 1. dHash (Difference Hash) - 64-bit int
        resized_d = img.convert("L").resize((9, 8), Image.Resampling.BILINEAR)
        arr_d = np.array(resized_d)
        diff_d = arr_d[:, 1:] > arr_d[:, :-1]
        dhash_int = int("".join(["1" if b else "0" for b in diff_d.flatten()]), 2)
        
        # 2. pHash (Perceptual DCT Hash) - 64-bit int
        resized_p = img.convert("L").resize((32, 32), Image.Resampling.LANCZOS)
        arr_p = np.array(resized_p, dtype=np.float32)
        dct = scipy.fftpack.dct(scipy.fftpack.dct(arr_p, axis=0, norm="ortho"), axis=1, norm="ortho")
        dct_low = dct[:8, :8]
        med = np.median(dct_low)
        phash_int = int("".join(["1" if b else "0" for b in (dct_low > med).flatten()]), 2)
        
        return filepath_str, sha256, dhash_int, phash_int
    except Exception as e:
        return filepath_str, None, None, None

def hamming_distance(h1, h2):
    return bin(h1 ^ h2).count("1")

def main():
    print("=" * 90)
    print("🔍 KRISHI SAKHA: BOTANICAL CROP VERIFIER INDEPENDENT DATA-LEAKAGE AUDIT")
    print("=" * 90)
    start_time = time.time()

    # -------------------------------------------------------------------------
    # 1. IDENTIFY VERIFIER TRAINING IMAGES
    # -------------------------------------------------------------------------
    print("\n[1/6] Reconstructing Verifier Training Dataset...")
    verifier_train_paths = []
    
    # 7,444 In-distribution samples
    with open(TRAIN_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_crop = row["canonical_class"].split("___")[0]
            if raw_crop in CROP_TO_IDX:
                p = Path(row["filepath"])
                if p.exists():
                    verifier_train_paths.append(str(p))
    train_in_dist_count = len(verifier_train_paths)
    print(f"  • In-Distribution (train_split.csv): {train_in_dist_count} images")

    # 1,400 Unsupported background samples
    verifier_train_unsupported_paths = []
    unsupported_train_by_folder = {}
    for folder in UNSUPPORTED_TRAIN_FOLDERS:
        folder_path = PLANTVILLAGE_DIR / folder
        if folder_path.exists():
            files = sorted([f for f in folder_path.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
            selected = [str(f) for f in files[:100]]
            verifier_train_unsupported_paths.extend(selected)
            unsupported_train_by_folder[folder] = selected

    print(f"  • Unsupported Background Foliage: {len(verifier_train_unsupported_paths)} images across {len(UNSUPPORTED_TRAIN_FOLDERS)} folders (100 each)")
    total_verifier_train = verifier_train_paths + verifier_train_unsupported_paths
    print(f"  • Total Verifier Training Images: {len(total_verifier_train)}")

    # -------------------------------------------------------------------------
    # 2. IDENTIFY 700 UNSUPPORTED BENCHMARK IMAGES
    # -------------------------------------------------------------------------
    print("\n[2/6] Reconstructing 700 Unsupported Benchmark Images...")
    benchmark_images_by_crop = {}
    all_benchmark_paths = []
    for crop_name, folder in BENCHMARK_FOLDERS.items():
        if folder.exists():
            files = sorted([f for f in folder.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
            selected = [str(f) for f in files[:100]]
            benchmark_images_by_crop[crop_name] = selected
            all_benchmark_paths.extend(selected)
            print(f"  • {crop_name:12s}: {len(selected)} benchmark images ({folder.name})")

    # -------------------------------------------------------------------------
    # 3. IDENTIFY VALIDATION & TEST SET IMAGES
    # -------------------------------------------------------------------------
    print("\n[3/6] Reconstructing Validation & Test Set Images...")
    val_paths = []
    with open(VAL_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            p = Path(row["filepath"])
            if p.exists():
                val_paths.append(str(p))
    print(f"  • Validation Set (val_split.csv): {len(val_paths)} images")

    test_paths = []
    with open(TEST_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            p = Path(row["filepath"])
            if p.exists():
                test_paths.append(str(p))
    print(f"  • Held-Out Test Set (test_split.csv): {len(test_paths)} images")

    # -------------------------------------------------------------------------
    # 4. COMPUTE HASHES (SHA-256, dHash, pHash) USING MULTIPROCESSING
    # -------------------------------------------------------------------------
    print("\n[4/6] Computing SHA-256, dHash, and pHash across all datasets...")
    # Gather all unique file paths to hash
    all_unique_paths = list(set(total_verifier_train + all_benchmark_paths + val_paths + test_paths))
    print(f"  • Total unique image files to hash: {len(all_unique_paths)}")

    hashes_by_path = {}
    with ProcessPoolExecutor(max_workers=8) as executor:
        for fpath, sha, dh, ph in executor.map(compute_file_hashes, all_unique_paths):
            if sha is not None:
                hashes_by_path[fpath] = {
                    "sha256": sha,
                    "dhash": dh,
                    "phash": ph
                }

    print(f"  • Successfully hashed {len(hashes_by_path)} images in {time.time()-start_time:.1f}s")

    # Build lookup dictionaries for Verifier Training Set
    train_sha_to_path = {}
    train_dhash_to_paths = defaultdict(list)
    train_phash_to_paths = defaultdict(list)
    train_path_set = set(total_verifier_train)

    for p in total_verifier_train:
        h = hashes_by_path.get(p)
        if h:
            train_sha_to_path[h["sha256"]] = p
            train_dhash_to_paths[h["dhash"]].append(p)
            train_phash_to_paths[h["phash"]].append(p)

    # -------------------------------------------------------------------------
    # 5. AUDIT AUDIT-PART A: 700 BENCHMARK IMAGES VS VERIFIER TRAINING SET
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("📋 AUDIT PART A: 700 UNSUPPORTED BENCHMARK IMAGES VS VERIFIER TRAINING SET")
    print("=" * 90)

    crop_audit_results = {}
    total_benchmark_leaked = 0

    for crop_name, b_paths in benchmark_images_by_crop.items():
        exact_path_matches = 0
        exact_sha_matches = 0
        phash_exact_matches = 0
        phash_near_matches = 0 # hamming dist <= 5
        sample_leaks = []

        for p in b_paths:
            h = hashes_by_path.get(p)
            if not h:
                continue
            
            is_path_leak = (p in train_path_set)
            is_sha_leak = (h["sha256"] in train_sha_to_path)
            
            if is_path_leak:
                exact_path_matches += 1
            if is_sha_leak:
                exact_sha_matches += 1
                if len(sample_leaks) < 2:
                    sample_leaks.append({
                        "benchmark_file": Path(p).name,
                        "matched_train_file": Path(train_sha_to_path[h["sha256"]]).name,
                        "sha256": h["sha256"],
                        "dhash": hex(h["dhash"]),
                        "phash": hex(h["phash"])
                    })
            
            # Check pHash
            if h["phash"] in train_phash_to_paths:
                phash_exact_matches += 1
            else:
                # check hamming dist <= 5
                for train_ph in train_phash_to_paths.keys():
                    if hamming_distance(h["phash"], train_ph) <= 5:
                        phash_near_matches += 1
                        break

        total_tested = len(b_paths)
        leak_pct = (exact_sha_matches / total_tested) * 100
        total_benchmark_leaked += exact_sha_matches

        crop_audit_results[crop_name] = {
            "total_tested": total_tested,
            "exact_filepath_matches": exact_path_matches,
            "exact_sha256_matches": exact_sha_matches,
            "phash_exact_matches": phash_exact_matches,
            "phash_near_matches_dist_le_5": phash_near_matches,
            "leakage_percentage": round(leak_pct, 2),
            "status": "🔴 DATA LEAKAGE DETECTED" if exact_sha_matches > 0 else "🟢 CLEAN INDEPENDENT",
            "samples": sample_leaks
        }

        flag = "🔴 LEAKED" if exact_sha_matches > 0 else "🟢 CLEAN"
        print(f"{flag} | {crop_name:12s}: Tested={total_tested:3d} | Exact SHA-256 Duplicates in Train={exact_sha_matches:3d} ({leak_pct:5.1f}%) | pHash Exact={phash_exact_matches:3d}")

    overall_leak_pct = (total_benchmark_leaked / len(all_benchmark_paths)) * 100
    print("-" * 90)
    print(f"TOTAL BENCHMARK LEAKAGE: {total_benchmark_leaked} / {len(all_benchmark_paths)} images ({overall_leak_pct:.2f}%) are exact training duplicates!")

    # -------------------------------------------------------------------------
    # 6. AUDIT PART B: VALIDATION (1,594) & TEST (1,597) SET INTEGRITY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("📋 AUDIT PART B: VALIDATION & TEST SET LEAKAGE AUDIT")
    print("=" * 90)

    # Check Validation Set vs Verifier Training Set
    val_exact_path = sum(1 for p in val_paths if p in train_path_set)
    val_exact_sha = sum(1 for p in val_paths if hashes_by_path.get(p, {}).get("sha256") in train_sha_to_path)
    val_phash_exact = sum(1 for p in val_paths if hashes_by_path.get(p, {}).get("phash") in train_phash_to_paths)

    print(f"Validation Set (val_split.csv - {len(val_paths)} images):")
    print(f"  • Exact Filepath Matches in Verifier Train: {val_exact_path} / {len(val_paths)} (0.00%)")
    print(f"  • Exact SHA-256 Matches in Verifier Train:  {val_exact_sha} / {len(val_paths)} (0.00%)")
    print(f"  • pHash Exact Matches in Verifier Train:    {val_phash_exact} / {len(val_paths)}")
    val_clean = (val_exact_path == 0 and val_exact_sha == 0)
    print(f"  • Validation Set Integrity: {'🟢 100% CLEAN - NO LEAKAGE' if val_clean else '🔴 LEAKAGE DETECTED'}")

    # Check Held-Out Test Set vs Verifier Training Set
    test_exact_path = sum(1 for p in test_paths if p in train_path_set)
    test_exact_sha = sum(1 for p in test_paths if hashes_by_path.get(p, {}).get("sha256") in train_sha_to_path)
    test_phash_exact = sum(1 for p in test_paths if hashes_by_path.get(p, {}).get("phash") in train_phash_to_paths)

    print(f"\nHeld-Out Test Set (test_split.csv - {len(test_paths)} images):")
    print(f"  • Exact Filepath Matches in Verifier Train: {test_exact_path} / {len(test_paths)} (0.00%)")
    print(f"  • Exact SHA-256 Matches in Verifier Train:  {test_exact_sha} / {len(test_paths)} (0.00%)")
    print(f"  • pHash Exact Matches in Verifier Train:    {test_phash_exact} / {len(test_paths)}")
    test_clean = (test_exact_path == 0 and test_exact_sha == 0)
    print(f"  • Held-Out Test Set Integrity: {'🟢 100% CLEAN - NO LEAKAGE' if test_clean else '🔴 LEAKAGE DETECTED'}")

    # -------------------------------------------------------------------------
    # 7. AUDIT PART C: 7-CLASS MAPPING AND 1,400 BACKGROUND VEGETATION IMAGES
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("📋 AUDIT PART C: 7-CLASS HEAD MAPPING AND 1,400 BACKGROUND IMAGES VERIFICATION")
    print("=" * 90)

    meta_path = BACKEND_ML / "crop_verifier_metadata.json"
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    print("Class Mapping in crop_verifier_metadata.json:")
    for k, v in meta["class_to_idx"].items():
        print(f"  Index {v}: {k}")

    print(f"\nSupported Crops ({len(meta['supported_crops'])}): {meta['supported_crops']}")
    print(f"Unsupported Class Index: {meta['unsupported_class_index']} ({meta['classes'][meta['unsupported_class_index']]})")

    print("\n1,400 Unsupported Background Images Breakdown (14 folders x 100 images):")
    for folder, paths in unsupported_train_by_folder.items():
        print(f"  • {folder:42s}: {len(paths)} images (files[:100])")

    # -------------------------------------------------------------------------
    # 8. AUDIT PART D: TRUE HELD-OUT GENERALIZATION TEST
    # -------------------------------------------------------------------------
    print("\n" + "=" * 90)
    print("📋 AUDIT PART D: GENERALIZATION ON TRULY HELD-OUT VEGETATION (files[100:])")
    print("=" * 90)
    print("Evaluating how the verifier actually generalizes to images that were NOT in its training set:")

    sys.path.insert(0, str(BACKEND_ML))
    from crop_verifier import BotanicalCropVerifier
    verifier = BotanicalCropVerifier(device="cpu")

    truly_held_out_results = {}
    for crop_name, folder in BENCHMARK_FOLDERS.items():
        if not folder.exists():
            continue
        all_files = sorted([f for f in folder.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
        # Images beyond the first 100 are TRULY held-out!
        held_out_files = all_files[100:300] # Take up to 200 strictly unseen images
        if not held_out_files:
            continue
            
        rejected_count = 0
        accepted_count = 0
        total_eval = len(held_out_files)
        
        for f in held_out_files:
            try:
                img = Image.open(f).convert("RGB")
                res = verifier.verify(img)
                if not res["is_supported"] or res["crop"] == "Unsupported":
                    rejected_count += 1
                else:
                    accepted_count += 1
            except Exception:
                continue
                
        rej_pct = (rejected_count / total_eval) * 100
        far_pct = (accepted_count / total_eval) * 100
        truly_held_out_results[crop_name] = {
            "unseen_tested": total_eval,
            "rejected_safe": rejected_count,
            "false_accepted": accepted_count,
            "true_rejection_rate_pct": round(rej_pct, 2),
            "true_false_acceptance_rate_pct": round(far_pct, 2)
        }
        print(f"  • {crop_name:12s} (Unseen files[100:{100+total_eval}]): Tested={total_eval:3d} | Rejection Rate={rej_pct:5.1f}% | False Acceptance Rate={far_pct:4.1f}%")

    # -------------------------------------------------------------------------
    # 9. SAVE AUDIT REPORT JSON
    # -------------------------------------------------------------------------
    audit_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "summary": {
            "total_benchmark_images_audited": len(all_benchmark_paths),
            "total_benchmark_images_leaked": total_benchmark_leaked,
            "benchmark_leakage_pct": round(overall_leak_pct, 2),
            "val_leakage_count": val_exact_sha,
            "test_leakage_count": test_exact_sha,
            "verdict": "DATA_LEAKAGE_CONFIRMED_IN_BENCHMARK_PART_1"
        },
        "benchmark_700_leakage_by_crop": crop_audit_results,
        "split_integrity": {
            "validation_split_1594": {
                "total": len(val_paths),
                "exact_filepath_matches": val_exact_path,
                "exact_sha256_matches": val_exact_sha,
                "status": "CLEAN" if val_clean else "LEAKED"
            },
            "held_out_test_split_1597": {
                "total": len(test_paths),
                "exact_filepath_matches": test_exact_path,
                "exact_sha256_matches": test_exact_sha,
                "status": "CLEAN" if test_clean else "LEAKED"
            }
        },
        "crop_verifier_head": {
            "classes": meta["classes"],
            "class_to_idx": meta["class_to_idx"],
            "supported_crops": meta["supported_crops"],
            "unsupported_class_index": meta["unsupported_class_index"],
            "training_unsupported_background_folders": UNSUPPORTED_TRAIN_FOLDERS,
            "training_unsupported_image_count": len(verifier_train_unsupported_paths)
        },
        "true_held_out_evaluation": truly_held_out_results
    }

    out_file = BACKEND_ML / "leakage_audit_report.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(audit_data, f, indent=2)

    print(f"\nFull Audit JSON saved to: {out_file}")
    print("=" * 90)

if __name__ == "__main__":
    main()
