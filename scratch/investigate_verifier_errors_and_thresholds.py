#!/usr/bin/env python3
"""
Krishi Sakha - Stage 2 Botanical Crop Verifier Next-Stage Evaluation
Task 1: Identify and deeply investigate all 29 false acceptances among 1,400 held-out images.
Task 2: Evaluate alternative threshold configurations using VALIDATION DATA ONLY for supported crops.
Task 3: Gather dataset information for independent field evaluation.
Task 4: Maintain complete model and code integrity (zero modifications).
"""

import os
import sys
import csv
import json
import time
from pathlib import Path
from collections import defaultdict
from PIL import Image
import numpy as np
import torch
import torchvision.transforms as transforms
import torchvision.models as models
import torch.nn as nn

REPO_ROOT = Path("/Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan")
BACKEND_ML = REPO_ROOT / "backend" / "ml"
VAL_CSV = BACKEND_ML / "val_split.csv"
PLANTVILLAGE_DIR = Path("/Users/sushanthks/Documents/Major Project/plantvillage dataset/color")

sys.path.insert(0, str(BACKEND_ML))
from crop_verifier import BotanicalCropVerifier, CROP_NAMES

BENCHMARK_FOLDERS = {
    "Soybean": PLANTVILLAGE_DIR / "Soybean___healthy",
    "Strawberry": PLANTVILLAGE_DIR / "Strawberry___Leaf_scorch",
    "Apple": PLANTVILLAGE_DIR / "Apple___Apple_scab",
    "Grape": PLANTVILLAGE_DIR / "Grape___Black_rot",
    "Peach": PLANTVILLAGE_DIR / "Peach___Bacterial_spot",
    "Pepper_Bell": PLANTVILLAGE_DIR / "Pepper,_bell___healthy",
    "Orange": PLANTVILLAGE_DIR / "Orange___Haunglongbing_(Citrus_greening)"
}

def analyze_image_visuals(img_path):
    """Computes basic visual metrics for an image to identify visual error patterns."""
    try:
        img = Image.open(img_path).convert("RGB")
        arr = np.array(img, dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        mean_r, mean_g, mean_b = np.mean(r), np.mean(g), np.mean(b)
        # Dominant hue / greenness ratio
        greenness = mean_g / (mean_r + mean_b + 1e-5)
        # Spot/lesion metric: variance of brightness
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        lum_std = np.std(gray)
        # Brownness (R > G > B with low B)
        brown_pixels = np.logical_and(r > g, g > b)
        brown_fraction = np.mean(brown_pixels)
        return {
            "dimensions": f"{img.width}x{img.height}",
            "greenness_ratio": round(float(greenness), 2),
            "luminance_std": round(float(lum_std), 1),
            "brown_pixel_fraction": round(float(brown_fraction), 3)
        }
    except Exception as e:
        return {}

def main():
    print("=" * 90)
    print("🔬 BOTANICAL CROP VERIFIER: ERROR INVESTIGATION & THRESHOLD CALIBRATION")
    print("=" * 90)

    device = "cpu"
    if torch.backends.mps.is_available():
        device = "mps"
    print(f"Inference Device: {device}")

    verifier = BotanicalCropVerifier(device=device)

    # -------------------------------------------------------------------------
    # PART 1: EVALUATE 1,400 HELD-OUT UNSUPPORTED IMAGES & EXTRACT 29 ERRORS
    # -------------------------------------------------------------------------
    print("\n[1/3] Evaluating 1,400 Held-Out Unsupported Images (files[100:300])...")
    held_out_records = []
    false_acceptances = []

    for crop_name, folder in BENCHMARK_FOLDERS.items():
        if not folder.exists():
            continue
        all_files = sorted([f for f in folder.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
        test_files = all_files[100:300] # Exactly 200 held-out files
        
        for f in test_files:
            try:
                img = Image.open(f).convert("RGB")
                # Directly extract raw softmax probabilities from model head
                t = verifier.transform(img).unsqueeze(0).to(verifier.device)
                with torch.no_grad():
                    feat = verifier.pool(verifier.features(t)).flatten(1)
                    logits = verifier.head(feat)[0]
                    probs = torch.softmax(logits, dim=0).cpu().numpy()
                
                pred_idx = int(np.argmax(probs))
                pred_crop = CROP_NAMES[pred_idx]
                top_prob = float(probs[pred_idx])
                unsupported_prob = float(probs[6])
                margin = top_prob - unsupported_prob

                # Current production rule in crop_verifier.py:
                # is_supported = (pred_crop != "Unsupported") and (unsupported_prob < 0.35) and (top_prob >= 0.50)
                is_supported = (pred_crop != "Unsupported") and (unsupported_prob < 0.35) and (top_prob >= 0.50)

                record = {
                    "filepath": str(f),
                    "filename": f.name,
                    "true_crop": crop_name,
                    "folder": folder.name,
                    "pred_crop": pred_crop,
                    "top_prob": round(top_prob, 4),
                    "unsupported_prob": round(unsupported_prob, 4),
                    "margin": round(margin, 4),
                    "is_supported": is_supported,
                    "probs": {CROP_NAMES[i]: round(float(probs[i]), 4) for i in range(7)}
                }
                held_out_records.append(record)

                if is_supported:
                    # This is a false acceptance!
                    vis_stats = analyze_image_visuals(f)
                    record["visual_stats"] = vis_stats
                    false_acceptances.append(record)

            except Exception as e:
                continue

    print(f"Total Held-Out Images Evaluated: {len(held_out_records)}")
    print(f"Total False Acceptances Identified: {len(false_acceptances)} / {len(held_out_records)} ({(len(false_acceptances)/len(held_out_records))*100:.2f}%)")

    # Group false acceptances by crop
    fa_by_crop = defaultdict(list)
    for fa in false_acceptances:
        fa_by_crop[fa["true_crop"]].append(fa)

    print("\nFalse Acceptances Breakdown by Crop Category:")
    for crop in ["Soybean", "Strawberry", "Apple", "Grape", "Peach", "Pepper_Bell", "Orange"]:
        items = fa_by_crop[crop]
        print(f"  • {crop:12s}: {len(items):2d} false acceptances")
        for it in items[:3]: # preview up to 3
            print(f"      - {it['filename'][:40]}... -> Predicted: {it['pred_crop']} (Conf: {it['top_prob']*100:.1f}%, Unsupp: {it['unsupported_prob']*100:.1f}%, Margin: {it['margin']*100:.1f}%)")

    # -------------------------------------------------------------------------
    # PART 2: EVALUATE 1,594 VALIDATION SET IMAGES (SUPPORTED CROPS)
    # -------------------------------------------------------------------------
    print("\n[2/3] Evaluating 1,594 In-Distribution Validation Images (val_split.csv)...")
    val_records = []
    with open(VAL_CSV, "r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        for row in reader:
            p = Path(row["filepath"])
            true_crop = row["canonical_class"].split("___")[0]
            if p.exists():
                try:
                    img = Image.open(p).convert("RGB")
                    t = verifier.transform(img).unsqueeze(0).to(verifier.device)
                    with torch.no_grad():
                        feat = verifier.pool(verifier.features(t)).flatten(1)
                        logits = verifier.head(feat)[0]
                        probs = torch.softmax(logits, dim=0).cpu().numpy()

                    pred_idx = int(np.argmax(probs))
                    pred_crop = CROP_NAMES[pred_idx]
                    top_prob = float(probs[pred_idx])
                    unsupported_prob = float(probs[6])
                    margin = top_prob - unsupported_prob

                    val_records.append({
                        "filepath": str(p),
                        "filename": p.name,
                        "true_crop": true_crop,
                        "pred_crop": pred_crop,
                        "top_prob": round(top_prob, 4),
                        "unsupported_prob": round(unsupported_prob, 4),
                        "margin": round(margin, 4),
                        "probs": {CROP_NAMES[i]: round(float(probs[i]), 4) for i in range(7)}
                    })
                except Exception as e:
                    continue

    print(f"Total Validation Images Evaluated: {len(val_records)}")

    # -------------------------------------------------------------------------
    # PART 3: THRESHOLD EXPLORATION & PARETO TRADEOFF ANALYSIS
    # -------------------------------------------------------------------------
    print("\n[3/3] Simulating Decision Rules & Threshold Configurations...")

    # We want to test different combinations of:
    # 1. max_unsupported_prob (tau_u): Unsupported prob must be < tau_u
    # 2. min_top_prob (tau_c): Top supported prob must be >= tau_c
    # 3. min_margin (tau_m): top_prob - unsupported_prob >= tau_m

    threshold_experiments = []

    # Baseline (Current Production Rule)
    # is_supp = (pred != 'Unsupported') and (p_unsupp < 0.35) and (top_p >= 0.50)
    def evaluate_rule(tau_u, tau_c, tau_m, rule_name):
        # 1. Measure False Acceptance on 1,400 Held-Out Unsupported
        unsupp_total = len(held_out_records)
        fa_count = 0
        fa_crop_counts = defaultdict(int)
        for r in held_out_records:
            pred = r["pred_crop"]
            top_p = r["top_prob"]
            p_unsupp = r["unsupported_prob"]
            margin = r["margin"]

            # Decision rule
            is_supp = (pred != "Unsupported") and (p_unsupp < tau_u) and (top_p >= tau_c) and (margin >= tau_m)
            if is_supp:
                fa_count += 1
                fa_crop_counts[r["true_crop"]] += 1

        far_pct = (fa_count / unsupp_total) * 100

        # 2. Measure False Rejection on 1,594 Validation Supported Crops
        val_total = len(val_records)
        fr_count = 0
        correct_crop_count = 0
        fr_by_crop = defaultdict(int)
        for r in val_records:
            true_c = r["true_crop"]
            pred = r["pred_crop"]
            top_p = r["top_prob"]
            p_unsupp = r["unsupported_prob"]
            margin = r["margin"]

            is_supp = (pred != "Unsupported") and (p_unsupp < tau_u) and (top_p >= tau_c) and (margin >= tau_m)
            if not is_supp:
                fr_count += 1
                fr_by_crop[true_c] += 1
            else:
                # Check if correct crop
                if pred == true_c or (true_c == "Corn" and pred in ["Corn", "Maize"]):
                    correct_crop_count += 1

        frr_pct = (fr_count / val_total) * 100
        val_acc_pct = (correct_crop_count / val_total) * 100

        return {
            "rule_name": rule_name,
            "tau_unsupported_max": tau_u,
            "tau_confidence_min": tau_c,
            "tau_margin_min": tau_m,
            "unsupported_fa_count": fa_count,
            "unsupported_far_pct": round(far_pct, 2),
            "supported_fr_count": fr_count,
            "supported_frr_pct": round(frr_pct, 2),
            "supported_crop_accuracy_pct": round(val_acc_pct, 2),
            "fa_by_crop": dict(fa_crop_counts),
            "fr_by_crop": dict(fr_by_crop)
        }

    rules_to_test = [
        # Current Production Baseline
        (0.35, 0.50, 0.00, "Current Baseline (tau_u<0.35, conf>=0.50)"),
        
        # Variations in Unsupported Threshold (tau_u)
        (0.25, 0.50, 0.00, "Tighter Unsupported Gate (tau_u<0.25, conf>=0.50)"),
        (0.20, 0.50, 0.00, "Tighter Unsupported Gate (tau_u<0.20, conf>=0.50)"),
        (0.15, 0.50, 0.00, "Strict Unsupported Gate (tau_u<0.15, conf>=0.50)"),
        (0.10, 0.50, 0.00, "Very Strict Unsupported Gate (tau_u<0.10, conf>=0.50)"),

        # Variations in Confidence Threshold (tau_c)
        (0.35, 0.65, 0.00, "Elevated Supported Conf (tau_u<0.35, conf>=0.65)"),
        (0.35, 0.70, 0.00, "Disease Model Parity Conf (tau_u<0.35, conf>=0.70)"),
        (0.35, 0.75, 0.00, "Elevated Supported Conf (tau_u<0.35, conf>=0.75)"),
        (0.35, 0.80, 0.00, "Strict Supported Conf (tau_u<0.35, conf>=0.80)"),

        # Margin-Based Rules (tau_m: top_prob - unsupported_prob)
        (0.35, 0.50, 0.30, "Margin Gate (tau_u<0.35, conf>=0.50, margin>=0.30)"),
        (0.35, 0.50, 0.40, "Margin Gate (tau_u<0.35, conf>=0.50, margin>=0.40)"),
        (0.35, 0.50, 0.50, "Margin Gate (tau_u<0.35, conf>=0.50, margin>=0.50)"),
        (0.35, 0.50, 0.60, "Margin Gate (tau_u<0.35, conf>=0.50, margin>=0.60)"),

        # Dual Conservative Combinations
        (0.20, 0.65, 0.40, "Balanced Dual Gate (tau_u<0.20, conf>=0.65, margin>=0.40)"),
        (0.15, 0.70, 0.50, "Strict Dual Gate (tau_u<0.15, conf>=0.70, margin>=0.50)"),
        (0.10, 0.75, 0.60, "Ultra Conservative Gate (tau_u<0.10, conf>=0.75, margin>=0.60)")
    ]

    print("\n" + "-" * 105)
    print(f"{'Rule Configuration':48s} | {'Unsupported FAR':17s} | {'Supported FRR':17s} | {'Val Accuracy':12s}")
    print("-" * 105)

    experiment_results = []
    for tau_u, tau_c, tau_m, name in rules_to_test:
        res = evaluate_rule(tau_u, tau_c, tau_m, name)
        experiment_results.append(res)
        far_str = f"{res['unsupported_fa_count']:2d}/1400 ({res['unsupported_far_pct']:4.2f}%)"
        frr_str = f"{res['supported_fr_count']:2d}/1594 ({res['supported_frr_pct']:4.2f}%)"
        acc_str = f"{res['supported_crop_accuracy_pct']:5.2f}%"
        print(f"{name:48s} | {far_str:17s} | {frr_str:17s} | {acc_str:12s}")

    # -------------------------------------------------------------------------
    # PART 4: SAVE DETAILED REPORT DATA
    # -------------------------------------------------------------------------
    output_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "task1_false_acceptances_count": len(false_acceptances),
        "task1_false_acceptances": false_acceptances,
        "task2_threshold_experiments": experiment_results
    }

    report_path = BACKEND_ML / "verifier_error_and_threshold_investigation.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print(f"\nSaved complete investigation JSON to: {report_path}")
    print("=" * 90)

if __name__ == "__main__":
    main()
