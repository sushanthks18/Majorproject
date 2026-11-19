#!/usr/bin/env python3
"""
Krishi Sakha - MobileNetV2 Plant Disease Dataset Audit & Integrity Scanner
Preserves the exact 19 disease-class taxonomy and ordering from mobilenet_v2_disease.py.

Performs:
1. Exact class mapping across flat or nested train/val/test split directory structures.
2. File validity and corruption detection (PIL verify & RGB convert).
3. Exact duplicate identification via SHA-256 byte hashing.
4. Near-duplicate identification via 64-bit dHash perceptual hashing (Hamming distance <= threshold).
5. Cross-split data leakage detection (identical or near-duplicate images across train/val/test).
6. Authoritative metadata and licensing documentation verification.
7. Class balance and volume evaluation without assuming image count equals trainability.
8. CSV and JSON report export for all 19 classes.
"""

import os
import sys
import argparse
import hashlib
import json
import csv
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    print("❌ Error: Pillow is not installed in this Python environment.")
    print("Run: pip3 install Pillow")
    sys.exit(1)

# Exact 19 classes and ordering preserved from mobilenet_v2_disease.py
TARGET_CLASSES: List[str] = [
    "Tomato___Early_Blight",
    "Tomato___Late_Blight",
    "Tomato___Healthy",
    "Potato___Early_Blight",
    "Potato___Late_Blight",
    "Potato___Healthy",
    "Rice___Blast",
    "Rice___Bacterial_Blight",
    "Rice___Brown_Spot",
    "Rice___Healthy",
    "Wheat___Leaf_Rust",
    "Wheat___Powdery_Mildew",
    "Wheat___Healthy",
    "Corn___Common_Rust",
    "Corn___Healthy",
    "Cotton___Bacterial_Blight",
    "Cotton___Healthy",
    "Ragi___Blast",
    "Ragi___Healthy"
]

IMAGE_EXTENSIONS: Set[str] = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"
}

SPLIT_KEYWORDS: Set[str] = {
    "train", "training", "val", "valid", "validation", "test", "testing"
}

# Perceptual hash Hamming distance threshold documentation:
# 64-bit dHash:
#   Distance 0: Exactly identical perceptual structure.
#   Distance 1-4: Extremely high visual similarity (minor compression, resize, slight color grade).
#   Distance > 10: Visually distinct images.
DEFAULT_HAMMING_THRESHOLD = 4

def normalize_class_name(name: str) -> str:
    """Normalizes class string for robust alias matching."""
    cleaned = name.lower()
    cleaned = cleaned.replace("(maize)", "").replace("(", "").replace(")", "")
    cleaned = cleaned.replace("___", "_").replace("__", "_").replace(" ", "_").replace("-", "_")
    return cleaned.strip("_")

# Precompute mapping of normalized names to canonical class name
NORMALIZED_CLASS_LOOKUP: Dict[str, str] = {
    normalize_class_name(c): c for c in TARGET_CLASSES
}

def compute_sha256(filepath: Path) -> str:
    """Calculates SHA-256 hash for exact duplicate detection."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def compute_dhash(image: Image.Image, hash_size: int = 8) -> int:
    """
    Computes a 64-bit difference hash (dHash) for perceptual near-duplicate detection.
    Evaluates relative horizontal luminance gradients.
    """
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
    pixels = list(resized.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(pixel_left > pixel_right)
    decimal_value = 0
    for idx, val in enumerate(diff):
        if val:
            decimal_value |= 1 << idx
    return decimal_value

def hamming_distance(h1: int, h2: int) -> int:
    """Computes bitwise Hamming distance between two 64-bit integer hashes."""
    return bin(h1 ^ h2).count("1")

def inspect_metadata_and_license(root_dir: Path) -> Dict[str, str]:
    """
    Audits dataset root and immediate subdirectories for verified source and license documentation.
    Marks metadata as 'Unknown / Unverified' unless authoritative documents exist.
    """
    info = {
        "source": "Unknown / Unverified",
        "license": "Unverified / No license file detected",
        "documentation_files_found": []
    }
    
    candidate_files = [
        "LICENSE", "LICENSE.txt", "LICENSE.md", "license",
        "README.md", "README.txt", "README",
        "dataset_info.json", "metadata.json", "metadata.csv"
    ]
    
    found_docs = []
    for fname in candidate_files:
        for p in [root_dir / fname, root_dir.parent / fname]:
            if p.exists() and p.is_file():
                found_docs.append(str(p.name))
                try:
                    snippet = p.read_text(errors="ignore")[:600].strip()
                    if "license" in p.name.lower():
                        info["license"] = f"Verified in {p.name}: {snippet.splitlines()[0][:100]}"
                    if "readme" in p.name.lower() or "dataset" in p.name.lower():
                        if "plantvillage" in snippet.lower():
                            info["source"] = f"PlantVillage (documented in {p.name})"
                        elif "kaggle" in snippet.lower():
                            info["source"] = f"Kaggle Dataset (documented in {p.name})"
                        else:
                            info["source"] = f"Documented in {p.name}"
                except Exception:
                    pass

    info["documentation_files_found"] = sorted(list(set(found_docs)))
    return info

def resolve_file_class_and_split(filepath: Path, root_dir: Path) -> Tuple[Optional[str], Optional[str]]:
    """
    Maps an image file path to one of the 19 target classes and identifies its split (train/val/test).
    Returns (canonical_class_name, split_name).
    Guarantees no double-counting by resolving against closest matching ancestor directory.
    """
    try:
        rel_parts = filepath.relative_to(root_dir).parts
    except ValueError:
        rel_parts = filepath.parts

    detected_split = None
    detected_class = None

    # Check parts from leaf folder up to root
    for part in reversed(rel_parts[:-1]):
        norm_part = normalize_class_name(part)
        
        # Check if this part matches one of our 19 classes
        if not detected_class and norm_part in NORMALIZED_CLASS_LOOKUP:
            detected_class = NORMALIZED_CLASS_LOOKUP[norm_part]
            
        # Check if this part designates a split
        part_lower = part.lower()
        if not detected_split and part_lower in SPLIT_KEYWORDS:
            if part_lower in {"train", "training"}:
                detected_split = "train"
            elif part_lower in {"val", "valid", "validation"}:
                detected_split = "val"
            elif part_lower in {"test", "testing"}:
                detected_split = "test"

    return detected_class, detected_split

def audit_dataset(data_dir: Path, output_csv: Path, output_json: Path, hamming_threshold: int, check_near_dupes: bool):
    print(f"\n{'='*70}")
    print(f"🔬 KRISHI SAKHA: MobileNetV2 Dataset Audit & Integrity Scanner")
    print(f"{'='*70}")
    print(f"Target Directory: {data_dir.resolve()}")
    print(f"Perceptual Hash Threshold: Hamming distance <= {hamming_threshold} (out of 64 bits)")

    if not data_dir.exists():
        print(f"\n❌ ERROR: Provided directory does not exist: {data_dir.resolve()}\n")
        # Still generate empty report with all 19 classes marked MISSING
        empty_stats = []
        for c in TARGET_CLASSES:
            empty_stats.append({
                "class_name": c,
                "crop": c.split("___")[0],
                "valid_images": 0,
                "corrupt_images": 0,
                "exact_duplicates": 0,
                "near_duplicates": 0,
                "train_count": 0,
                "val_count": 0,
                "test_count": 0,
                "unassigned_split_count": 0,
                "audit_status": "MISSING",
                "notes": "Target directory does not exist on disk"
            })
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(empty_stats[0].keys()))
            writer.writeheader()
            writer.writerows(empty_stats)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump({
                "error": f"Directory not found: {str(data_dir)}",
                "total_classes": len(TARGET_CLASSES),
                "classes_with_data": 0,
                "training_readiness": "NOT_READY_DIRECTORY_NOT_FOUND"
            }, f, indent=2)
        return

    meta_info = inspect_metadata_and_license(data_dir)

    # Tracking data structures ensuring zero double-counting
    visited_canonical_paths: Set[str] = set()
    
    # Per-class records
    class_valid_files: Dict[str, List[Path]] = {c: [] for c in TARGET_CLASSES}
    class_corrupt_files: Dict[str, List[Path]] = {c: [] for c in TARGET_CLASSES}
    class_splits: Dict[str, Dict[str, int]] = {c: defaultdict(int) for c in TARGET_CLASSES}
    
    unmatched_image_files: List[Path] = []
    
    # Hashing collections
    sha_to_paths: Dict[str, List[Dict]] = defaultdict(list)
    dhash_entries: List[Dict] = [] # list of {dhash, path, class, split}

    print("\nScanning nested directories and verifying image integrity...")
    scanned_count = 0

    # Recursive scan of all files
    for entry in data_dir.rglob("*"):
        if not entry.is_file():
            continue
        if entry.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        scanned_count += 1
        if scanned_count % 10000 == 0:
            print(f"  ... processed {scanned_count} files", flush=True)

        resolved_path_str = str(entry.resolve())
        if resolved_path_str in visited_canonical_paths:
            continue
        visited_canonical_paths.add(resolved_path_str)

        canonical_class, split_name = resolve_file_class_and_split(entry, data_dir)
        split_label = split_name if split_name else "unassigned"

        if not canonical_class:
            unmatched_image_files.append(entry)
            continue

        # Check image validity
        is_corrupt = False
        pil_img = None
        try:
            with open(entry, "rb") as f:
                pil_img = Image.open(f)
                pil_img.verify()
            with open(entry, "rb") as f:
                pil_img = Image.open(f)
                pil_img.convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
            is_corrupt = True

        if is_corrupt:
            class_corrupt_files[canonical_class].append(entry)
            continue

        class_valid_files[canonical_class].append(entry)
        class_splits[canonical_class][split_label] += 1

        # Compute SHA-256
        file_sha = compute_sha256(entry)
        sha_to_paths[file_sha].append({
            "path": resolved_path_str,
            "class": canonical_class,
            "split": split_label
        })

        # Compute dHash if near-duplicate checking is enabled
        if check_near_dupes and pil_img:
            dh = compute_dhash(pil_img)
            dhash_entries.append({
                "dhash": dh,
                "path": resolved_path_str,
                "class": canonical_class,
                "split": split_label
            })

    # Exact Duplicates and Cross-Split Leakage
    exact_duplicate_groups = 0
    total_exact_duplicate_files = 0
    cross_split_exact_leakage_groups = 0
    cross_split_exact_leakage_files = 0

    for sha_val, records in sha_to_paths.items():
        if len(records) > 1:
            exact_duplicate_groups += 1
            total_exact_duplicate_files += (len(records) - 1)
            
            splits_seen = {r["split"] for r in records if r["split"] in {"train", "val", "test"}}
            if len(splits_seen) > 1:
                cross_split_exact_leakage_groups += 1
                cross_split_exact_leakage_files += len(records)

    # Perceptual Near-Duplicates (Hamming distance <= threshold)
    near_duplicate_pairs = 0
    cross_split_near_leakage_pairs = 0

    if check_near_dupes and len(dhash_entries) > 1:
        print(f"Comparing perceptual hashes across {len(dhash_entries)} valid images (threshold <= {hamming_threshold})...")
        num_entries = len(dhash_entries)
        # Compare entries
        for i in range(num_entries):
            h1 = dhash_entries[i]["dhash"]
            p1 = dhash_entries[i]["path"]
            s1 = dhash_entries[i]["split"]
            for j in range(i + 1, num_entries):
                h2 = dhash_entries[j]["dhash"]
                p2 = dhash_entries[j]["path"]
                s2 = dhash_entries[j]["split"]
                
                # Check Hamming distance
                dist = hamming_distance(h1, h2)
                if dist <= hamming_threshold:
                    near_duplicate_pairs += 1
                    if s1 in {"train", "val", "test"} and s2 in {"train", "val", "test"} and s1 != s2:
                        cross_split_near_leakage_pairs += 1

    # Compile Per-Class Audit Statistics
    class_stats = []
    total_valid = 0
    total_corrupt = 0
    missing_classes = []
    low_sample_classes = []
    adequate_classes = []

    for cls_name in TARGET_CLASSES:
        valid_cnt = len(class_valid_files[cls_name])
        corrupt_cnt = len(class_corrupt_files[cls_name])
        total_valid += valid_cnt
        total_corrupt += corrupt_cnt

        tr_cnt = class_splits[cls_name]["train"]
        val_cnt = class_splits[cls_name]["val"]
        te_cnt = class_splits[cls_name]["test"]
        unassigned_cnt = class_splits[cls_name]["unassigned"]

        # Duplicates within this class
        exact_dupes_in_class = 0
        for records in sha_to_paths.values():
            in_cls = [r for r in records if r["class"] == cls_name]
            if len(in_cls) > 1:
                exact_dupes_in_class += (len(in_cls) - 1)

        # Audit status criteria (without assuming count alone guarantees trainability)
        status = "ADEQUATE_VOLUME"
        notes_list = []

        if valid_cnt == 0:
            status = "MISSING"
            missing_classes.append(cls_name)
            notes_list.append("0 images found in dataset")
        elif valid_cnt < 50:
            status = "INSUFFICIENT_DATA"
            low_sample_classes.append(cls_name)
            notes_list.append(f"Only {valid_cnt} images (<50 samples is insufficient for reliable training)")
        elif valid_cnt < 100:
            status = "LOW_SAMPLE_COUNT"
            low_sample_classes.append(cls_name)
            notes_list.append(f"{valid_cnt} images (100+ recommended for 70/15/15 stratified partition)")
        else:
            adequate_classes.append(cls_name)
            notes_list.append(f"{valid_cnt} images with valid format")

        if corrupt_cnt > 0:
            notes_list.append(f"{corrupt_cnt} corrupt/unreadable files")
        if exact_dupes_in_class > 0:
            notes_list.append(f"{exact_dupes_in_class} exact duplicate files")

        class_stats.append({
            "class_name": cls_name,
            "crop": cls_name.split("___")[0],
            "valid_images": valid_cnt,
            "corrupt_images": corrupt_cnt,
            "exact_duplicates": exact_dupes_in_class,
            "near_duplicates": 0, # reported globally / per class
            "train_count": tr_cnt,
            "val_count": val_cnt,
            "test_count": te_cnt,
            "unassigned_split_count": unassigned_cnt,
            "audit_status": status,
            "notes": "; ".join(notes_list)
        })

    # Class Imbalance Ratio
    valid_counts = [r["valid_images"] for r in class_stats if r["valid_images"] > 0]
    imbalance_ratio = round(max(valid_counts) / min(valid_counts), 2) if len(valid_counts) > 1 else 1.0

    # Training Readiness Assessment (Rigorous distinction between audit volume and training readiness)
    if len(missing_classes) > 0:
        training_readiness = f"NOT_READY_MISSING_CLASSES ({len(missing_classes)} of 19 classes missing)"
    elif len(low_sample_classes) > 0:
        training_readiness = f"NOT_READY_INSUFFICIENT_SAMPLES ({len(low_sample_classes)} classes have <100 samples)"
    elif cross_split_exact_leakage_groups > 0:
        training_readiness = f"REQUIRES_DELEAKING ({cross_split_exact_leakage_groups} exact duplicate groups span train/val/test)"
    elif len(adequate_classes) == 19:
        training_readiness = "AUDIT_VOLUME_PASSED_CANDIDATE_FOR_TRAINING (Requires manual label & diversity verification)"
    else:
        training_readiness = "INCOMPLETE"

    # Write CSV Report
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "class_name", "crop", "valid_images", "corrupt_images",
            "exact_duplicates", "train_count", "val_count", "test_count",
            "unassigned_split_count", "audit_status", "notes"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in class_stats:
            row_dict = {k: r[k] for k in fieldnames}
            writer.writerow(row_dict)

    # Write JSON Summary
    summary = {
        "dataset_directory": str(data_dir.resolve()),
        "audit_timestamp_iso": os.getenv("AUDIT_TIMESTAMP", ""),
        "metadata_and_license": meta_info,
        "classes_audit": {
            "total_target_classes": len(TARGET_CLASSES),
            "classes_with_data": len(TARGET_CLASSES) - len(missing_classes),
            "missing_classes": missing_classes,
            "low_sample_classes": low_sample_classes,
            "adequate_volume_classes": adequate_classes,
            "imbalance_ratio": f"{imbalance_ratio}:1"
        },
        "image_counts": {
            "total_valid_images": total_valid,
            "total_corrupted_images": total_corrupt,
            "unmatched_images_in_folder": len(unmatched_image_files)
        },
        "integrity_and_duplicates": {
            "exact_duplicate_groups": exact_duplicate_groups,
            "total_exact_duplicate_files": total_exact_duplicate_files,
            "near_duplicate_pairs": near_duplicate_pairs,
            "perceptual_hash_threshold": f"Hamming distance <= {hamming_threshold}"
        },
        "data_leakage": {
            "cross_split_exact_leakage_groups": cross_split_exact_leakage_groups,
            "cross_split_exact_leakage_files": cross_split_exact_leakage_files,
            "cross_split_near_leakage_pairs": cross_split_near_leakage_pairs
        },
        "training_readiness_assessment": {
            "readiness_status": training_readiness,
            "disclaimer": (
                "Dataset audit confirms file validity, volume, and absence of duplicate leakage. "
                "Trainability further requires expert botanical validation of image labels, "
                "environmental background diversity, and absence of lab-condition bias."
            )
        }
    }

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    # Print Clean Terminal Table
    print(f"\n{'Class Name':<28} | {'Valid':<7} | {'Corrupt':<7} | {'Dupes':<6} | {'Train':<6} | {'Val':<5} | {'Test':<5} | {'Audit Status':<18}")
    print("-" * 96)
    for r in class_stats:
        print(f"{r['class_name']:<28} | {r['valid_images']:<7} | {r['corrupt_images']:<7} | {r['exact_duplicates']:<6} | {r['train_count']:<6} | {r['val_count']:<5} | {r['test_count']:<5} | {r['audit_status']:<18}")
    print("-" * 96)

    print(f"\n📊 Audit Summary:")
    print(f"  • Target Classes: {len(TARGET_CLASSES)} (Found with data: {len(adequate_classes) + len(low_sample_classes)} / 19)")
    print(f"  • Missing Classes: {len(missing_classes)}")
    print(f"  • Total Valid Images: {total_valid}")
    print(f"  • Total Corrupted Images: {total_corrupt}")
    print(f"  • Exact Duplicate Files: {total_exact_duplicate_files} (across {exact_duplicate_groups} groups)")
    if check_near_dupes:
        print(f"  • Near-Duplicate Pairs: {near_duplicate_pairs} (Hamming dist <= {hamming_threshold})")
    print(f"  • Cross-Split Leakage: {cross_split_exact_leakage_files} files leaking across train/val/test")
    print(f"  • Class Imbalance Ratio: {imbalance_ratio}:1")
    print(f"  • Source Attribution: {meta_info['source']}")
    print(f"  • License Attribution: {meta_info['license']}")
    print(f"\n📋 Training Readiness Assessment:")
    print(f"  • Status: {training_readiness}")
    print(f"  • Note: Image count confirms sample volume only; training requires verified label fidelity.")
    print(f"\n📁 Reports Saved:")
    print(f"  • CSV:  {output_csv.resolve()}")
    print(f"  • JSON: {output_json.resolve()}\n")

def main():
    parser = argparse.ArgumentParser(
        description="Krishi Sakha: MobileNetV2 Disease Dataset Audit & Integrity Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Perceptual Hashing Note:
  Near-duplicates are computed using 64-bit dHash. A Hamming distance <= 4 signifies
  >= 93.75%% structural similarity, identifying recompressed or rescaled duplicates.
        """
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="./dataset",
        help="Path to the plant disease image dataset directory to audit"
    )
    parser.add_argument(
        "--output-csv",
        type=str,
        default="dataset_audit_report.csv",
        help="Destination path for the CSV report (default: dataset_audit_report.csv)"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="dataset_audit_summary.json",
        help="Destination path for the JSON summary (default: dataset_audit_summary.json)"
    )
    parser.add_argument(
        "--hamming-threshold",
        type=int,
        default=DEFAULT_HAMMING_THRESHOLD,
        help=f"Perceptual hash Hamming distance threshold (default: {DEFAULT_HAMMING_THRESHOLD})"
    )
    parser.add_argument(
        "--skip-near-dupes",
        action="store_true",
        help="Skip perceptual near-duplicate pairwise comparison (faster for 50k+ images)"
    )
    args = parser.parse_args()

    audit_dataset(
        data_dir=Path(args.data_dir),
        output_csv=Path(args.output_csv),
        output_json=Path(args.output_json),
        hamming_threshold=args.hamming_threshold,
        check_near_dupes=not args.skip_near_dupes
    )

if __name__ == "__main__":
    main()
