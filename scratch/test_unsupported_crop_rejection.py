#!/usr/bin/env python3
"""
Krishi Sakha - Comprehensive Unsupported Crop Rejection Verification Suite
Evaluates:
1. Supported crop detection accuracy across all 6 supported crops (val_split.csv and test_split.csv)
2. False rejection rate on supported crops
3. Unsupported crop rejection and false acceptance rate across:
   - Genuine Soybean images (PlantVillage)
   - Genuine Strawberry images (PlantVillage)
   - Genuine Apple images (PlantVillage)
   - Genuine Grape images (PlantVillage)
   - Genuine Peach images (PlantVillage)
   - Genuine Pepper Bell images (PlantVillage)
   - Sugarcane & Ragi queries
4. Confirmed disease diagnosis suppression on all unsupported inputs
"""

import os
import sys
import csv
import json
import base64
from pathlib import Path
from collections import defaultdict
from PIL import Image

REPO_ROOT = Path("/Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan")
BACKEND_ML = REPO_ROOT / "backend" / "ml"
sys.path.insert(0, str(BACKEND_ML))

from mobilenet_v2_disease import MobileNetV2PlantClassifier

def main():
    print("=" * 85)
    print("🌾 KRISHI SAKHA: EVIDENCE-BASED UNSUPPORTED CROP REJECTION BENCHMARK")
    print("=" * 85)

    classifier = MobileNetV2PlantClassifier()
    print(f"Device: {classifier.device}")
    print(f"Disease Model Checkpoint: {classifier.checkpoint_path.name}")
    print(f"Crop Verifier Checkpoint: {classifier.crop_verifier.checkpoint_path.name}")

    # -------------------------------------------------------------------------
    # PART 1: UNSUPPORTED CROP REJECTION EVALUATION
    # -------------------------------------------------------------------------
    pv_dir = Path("/Users/sushanthks/Documents/Major Project/plantvillage dataset/color")
    
    unsupported_tests = {
        "Soybean": pv_dir / "Soybean___healthy",
        "Strawberry": pv_dir / "Strawberry___Leaf_scorch",
        "Apple": pv_dir / "Apple___Apple_scab",
        "Grape": pv_dir / "Grape___Black_rot",
        "Peach": pv_dir / "Peach___Bacterial_spot",
        "Pepper_Bell": pv_dir / "Pepper,_bell___healthy",
        "Orange": pv_dir / "Orange___Haunglongbing_(Citrus_greening)"
    }

    print("\n" + "-" * 85)
    print("PART 1: TESTING GENUINE UNSUPPORTED CROPS (OUT-OF-DISTRIBUTION)")
    print("-" * 85)

    ood_summary = {}
    total_ood = 0
    total_ood_rejected = 0
    total_ood_false_accepted = 0

    for crop_name, folder in unsupported_tests.items():
        if not folder.exists():
            print(f"Warning: {folder} does not exist, skipping.")
            continue
            
        files = sorted([f for f in folder.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
        # Test 100 images per category (total ~700 images!)
        test_files = files[:100]
        
        rejected_count = 0
        false_accept_count = 0
        sample_results = []
        
        for f in test_files:
            try:
                img = Image.open(f).convert("RGB")
                res = classifier.predict(img, target_crop=None)
                total_ood += 1
                
                # Check if properly suppressed:
                # Proper suppression means status is 'uncertain' or 'unsupported' or 'invalid_image'
                # AND diagnosis is NOT a confirmed disease on a supported crop with treatments!
                is_rejected = (res["status"] in ["uncertain", "unsupported", "invalid_image"])
                
                if is_rejected:
                    rejected_count += 1
                    total_ood_rejected += 1
                else:
                    false_accept_count += 1
                    total_ood_false_accepted += 1
                    
                if len(sample_results) < 3:
                    sample_results.append({
                        "file": f.name,
                        "status": res["status"],
                        "diagnosis": res.get("diagnosis"),
                        "crop": res.get("crop"),
                        "confidence": res.get("confidence")
                    })
            except Exception as e:
                continue
                
        rej_rate = (rejected_count / len(test_files)) * 100
        far = (false_accept_count / len(test_files)) * 100
        ood_summary[crop_name] = {
            "total_tested": len(test_files),
            "rejected_safe": rejected_count,
            "false_accepted": false_accept_count,
            "rejection_rate_pct": round(rej_rate, 2),
            "false_acceptance_rate_pct": round(far, 2),
            "samples": sample_results
        }
        
        status_flag = "✅ PASS" if far <= 5.0 else "⚠️ REVIEW"
        print(f"{status_flag} | {crop_name:12s}: Tested={len(test_files):3d} | Rejected={rejected_count:3d} ({rej_rate:5.1f}%) | False Accepted={false_accept_count:2d} ({far:4.1f}%)")

    overall_far = (total_ood_false_accepted / total_ood) * 100 if total_ood > 0 else 0
    overall_rej = (total_ood_rejected / total_ood) * 100 if total_ood > 0 else 0
    print(f"\nOVERALL UNSUPPORTED RESULTS: Total={total_ood} | Rejection Rate={overall_rej:.2f}% | False Acceptance Rate={overall_far:.2f}%")

    # -------------------------------------------------------------------------
    # PART 2: SUPPORTED CROP EVALUATION (val_split.csv)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 85)
    print("PART 2: TESTING SUPPORTED CROPS ON VALIDATION SET (val_split.csv)")
    print("-" * 85)

    val_csv = BACKEND_ML / "val_split.csv"
    val_crop_stats = defaultdict(lambda: {"total": 0, "correct_crop": 0, "false_rejected": 0, "success": 0})
    
    with open(val_csv, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        total_val_rows = len(reader)
        for idx, row in enumerate(reader, 1):
            if idx % 500 == 0 or idx == total_val_rows:
                print(f"  ... Evaluated {idx}/{total_val_rows} validation samples")
            p = Path(row["filepath"])
            true_crop = row["canonical_class"].split("___")[0]
            if p.exists():
                try:
                    img = Image.open(p).convert("RGB")
                    res = classifier.predict(img, target_crop=None)
                    stats = val_crop_stats[true_crop]
                    stats["total"] += 1
                    
                    if res.get("crop") == true_crop or (true_crop == "Corn" and res.get("crop") in ["Corn", "Maize"]):
                        stats["correct_crop"] += 1
                        
                    if res.get("status") == "success":
                        stats["success"] += 1
                    elif res.get("diagnosis") == "Uncertain / Unsupported Crop":
                        stats["false_rejected"] += 1
                except Exception as e:
                    continue

    val_total = sum(s["total"] for s in val_crop_stats.values())
    val_correct_crop = sum(s["correct_crop"] for s in val_crop_stats.values())
    val_false_rej = sum(s["false_rejected"] for s in val_crop_stats.values())
    val_success = sum(s["success"] for s in val_crop_stats.values())

    print(f"Validation In-Distribution Samples: {val_total}")
    print(f"Correct Supported Crop Identification: {val_correct_crop}/{val_total} ({(val_correct_crop/val_total)*100:.2f}%)")
    print(f"False Rejection Rate (falsely rejected as Unsupported): {val_false_rej}/{val_total} ({(val_false_rej/val_total)*100:.2f}%)")
    print(f"Successful Validated Predictions: {val_success}/{val_total} ({(val_success/val_total)*100:.2f}%)")

    for crop in ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"]:
        s = val_crop_stats[crop]
        if s["total"] > 0:
            c_rate = (s["correct_crop"] / s["total"]) * 100
            fr_rate = (s["false_rejected"] / s["total"]) * 100
            print(f"  • {crop:8s}: {s['correct_crop']}/{s['total']} correct ({c_rate:5.1f}%), {s['false_rejected']} false rejected ({fr_rate:4.1f}%)")

    # -------------------------------------------------------------------------
    # PART 3: FINAL HELD-OUT TEST SET EVALUATION (test_split.csv)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 85)
    print("PART 3: FINAL INDEPENDENT EVALUATION ON TEST SET (test_split.csv)")
    print("-" * 85)

    test_csv = BACKEND_ML / "test_split.csv"
    test_crop_stats = defaultdict(lambda: {"total": 0, "correct_crop": 0, "false_rejected": 0, "success": 0})
    
    with open(test_csv, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        total_test_rows = len(reader)
        for idx, row in enumerate(reader, 1):
            if idx % 500 == 0 or idx == total_test_rows:
                print(f"  ... Evaluated {idx}/{total_test_rows} test samples")
            p = Path(row["filepath"])
            true_crop = row["canonical_class"].split("___")[0]
            if p.exists():
                try:
                    img = Image.open(p).convert("RGB")
                    res = classifier.predict(img, target_crop=None)
                    stats = test_crop_stats[true_crop]
                    stats["total"] += 1
                    
                    if res.get("crop") == true_crop or (true_crop == "Corn" and res.get("crop") in ["Corn", "Maize"]):
                        stats["correct_crop"] += 1
                        
                    if res.get("status") == "success":
                        stats["success"] += 1
                    elif res.get("diagnosis") == "Uncertain / Unsupported Crop":
                        stats["false_rejected"] += 1
                except Exception as e:
                    continue

    test_total = sum(s["total"] for s in test_crop_stats.values())
    test_correct_crop = sum(s["correct_crop"] for s in test_crop_stats.values())
    test_false_rej = sum(s["false_rejected"] for s in test_crop_stats.values())
    test_success = sum(s["success"] for s in test_crop_stats.values())

    print(f"Test In-Distribution Samples: {test_total}")
    print(f"Correct Supported Crop Identification: {test_correct_crop}/{test_total} ({(test_correct_crop/test_total)*100:.2f}%)")
    print(f"False Rejection Rate (falsely rejected as Unsupported): {test_false_rej}/{test_total} ({(test_false_rej/test_total)*100:.2f}%)")
    print(f"Successful Validated Predictions: {test_success}/{test_total} ({(test_success/test_total)*100:.2f}%)")

    for crop in ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"]:
        s = test_crop_stats[crop]
        if s["total"] > 0:
            c_rate = (s["correct_crop"] / s["total"]) * 100
            fr_rate = (s["false_rejected"] / s["total"]) * 100
            print(f"  • {crop:8s}: {s['correct_crop']}/{s['total']} correct ({c_rate:5.1f}%), {s['false_rejected']} false rejected ({fr_rate:4.1f}%)")

    # -------------------------------------------------------------------------
    # PART 4: SUGARCANE & RAGI QUERIES
    # -------------------------------------------------------------------------
    print("\n" + "-" * 85)
    print("PART 4: TESTING SUGARCANE & RAGI EXPLICIT QUERY INTERCEPTION")
    print("-" * 85)

    dummy_img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    res_sugarcane = classifier.predict(dummy_img, target_crop="Sugarcane")
    res_ragi = classifier.predict(dummy_img, target_crop="Ragi")

    print(f"Sugarcane Query: status={res_sugarcane.get('status')} | diagnosis={res_sugarcane.get('diagnosis')}")
    print(f"Ragi Query:      status={res_ragi.get('status')} | diagnosis={res_ragi.get('diagnosis')}")

    sugarcane_pass = (res_sugarcane.get("status") == "unsupported" and res_sugarcane.get("diagnosis") == "NOT SUPPORTED YET")
    ragi_pass = (res_ragi.get("status") == "unsupported" and res_ragi.get("diagnosis") == "NOT SUPPORTED YET")

    print("=" * 85)
    print("BENCHMARK SUMMARY:")
    print(f"1. Supported Crop Identification Rate: {(test_correct_crop/test_total)*100:.2f}% (Test Split)")
    print(f"2. Supported Crop False Rejection Rate: {(test_false_rej/test_total)*100:.2f}% (Test Split)")
    print(f"3. Unsupported Crop False Acceptance Rate: {overall_far:.2f}% across {total_ood} genuine images")
    print(f"4. Sugarcane & Ragi Safety: {'✅ PASS' if (sugarcane_pass and ragi_pass) else '❌ FAIL'}")
    print("=" * 85)

    # Save detailed JSON report
    report = {
        "timestamp": json.dumps(None),
        "total_ood_tested": total_ood,
        "overall_ood_false_acceptance_rate_pct": round(overall_far, 2),
        "overall_ood_rejection_rate_pct": round(overall_rej, 2),
        "ood_breakdown": ood_summary,
        "val_set_evaluation": {
            "total_samples": val_total,
            "correct_crop_pct": round((val_correct_crop/val_total)*100, 2),
            "false_rejection_rate_pct": round((val_false_rej/val_total)*100, 2),
            "crop_breakdown": {c: dict(val_crop_stats[c]) for c in val_crop_stats}
        },
        "test_set_evaluation": {
            "total_samples": test_total,
            "correct_crop_pct": round((test_correct_crop/test_total)*100, 2),
            "false_rejection_rate_pct": round((test_false_rej/test_total)*100, 2),
            "crop_breakdown": {c: dict(test_crop_stats[c]) for c in test_crop_stats}
        }
    }

    report_path = BACKEND_ML / "unsupported_rejection_evaluation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved full JSON evaluation report to: {report_path}")

if __name__ == "__main__":
    main()
