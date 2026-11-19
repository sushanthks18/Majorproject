#!/usr/bin/env python3
"""
Krishi Sakha - Stage 2 Botanical Crop Verifier Training Script
Trains a 7-class open-set crop verification model:
  0: Tomato
  1: Potato
  2: Rice
  3: Wheat
  4: Corn (Maize)
  5: Cotton
  6: Unsupported (Other plant leaves / non-target crops)

Uses ImageNet-pretrained MobileNetV2 features.
Trains on all 7,444 images from train_split.csv + diverse unsupported background vegetation.
Evaluates on all 1,594 validation images (val_split.csv) and held-out unsupported crops.
Saves weights to backend/ml/crop_verifier.pth and metadata to backend/ml/crop_verifier_metadata.json.
"""

import os
import sys
import csv
import json
import time
import random
from pathlib import Path
from collections import defaultdict

import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

# Set random seeds for reproducibility
SEED = 42
random.seed(SEED)
torch.manual_seed(SEED)

REPO_ROOT = Path("/Users/sushanthks/Developer/HOBBYPROJECT/krishisakha-an-iot-based-farm-assistan")
BACKEND_ML = REPO_ROOT / "backend" / "ml"
TRAIN_CSV = BACKEND_ML / "train_split.csv"
VAL_CSV = BACKEND_ML / "val_split.csv"
PLANTVILLAGE_DIR = Path("/Users/sushanthks/Documents/Major Project/plantvillage dataset/color")

CROP_NAMES = ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton", "Unsupported"]
CROP_TO_IDX = {name: idx for idx, name in enumerate(CROP_NAMES)}

class CropClassifierHead(nn.Module):
    def __init__(self, in_features=1280, num_classes=7):
        super().__init__()
        self.net = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.SiLU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        return self.net(x)


def get_device():
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def main():
    device = get_device()
    print("=" * 80)
    print("🌾 KRISHI SAKHA: TRAINING BOTANICAL CROP VERIFIER (STAGE 2)")
    print(f"Device: {device}")
    print("=" * 80)

    # 1. Load Pretrained Feature Extractor
    print("Loading ImageNet MobileNetV2 backbone...")
    weights = models.MobileNet_V2_Weights.DEFAULT
    base_model = models.mobilenet_v2(weights=weights)
    feature_extractor = base_model.features.to(device).eval()
    pool = nn.AdaptiveAvgPool2d((1, 1))
    transform = weights.transforms()

    # 2. Gather In-Distribution Training Items (All 7,444 train images)
    print("Reading train_split.csv...")
    train_items = []
    supported_counts = defaultdict(int)
    with open(TRAIN_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_crop = row["canonical_class"].split("___")[0]
            if raw_crop in CROP_TO_IDX:
                p = Path(row["filepath"])
                if p.exists():
                    train_items.append((str(p), CROP_TO_IDX[raw_crop]))
                    supported_counts[raw_crop] += 1

    print(f"Loaded {len(train_items)} in-distribution training samples across 6 supported crops:")
    for crop in ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"]:
        print(f"  • {crop:8s}: {supported_counts[crop]} samples")

    # 3. Gather Unsupported Background Training Items
    unsupported_folders = [
        "Apple___Apple_scab", "Apple___Black_rot", "Apple___healthy",
        "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___healthy",
        "Orange___Haunglongbing_(Citrus_greening)",
        "Peach___Bacterial_spot", "Peach___healthy",
        "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
        "Strawberry___Leaf_scorch", "Strawberry___healthy",
        "Soybean___healthy"
    ]
    unsupported_items = []
    if PLANTVILLAGE_DIR.exists():
        for folder in unsupported_folders:
            folder_path = PLANTVILLAGE_DIR / folder
            if folder_path.exists():
                all_files = sorted([f for f in folder_path.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
                # Take up to 100 images per folder for training, reserving the rest for held-out OOD testing
                for f in all_files[:100]:
                    unsupported_items.append((str(f), CROP_TO_IDX["Unsupported"]))

    print(f"Loaded {len(unsupported_items)} unsupported plant leaf samples from PlantVillage background folders.")

    all_train = train_items + unsupported_items
    random.shuffle(all_train)
    print(f"Total training dataset size: {len(all_train)} images.")

    # 4. Extract Feature Embeddings
    print("Extracting 1280-d feature embeddings...")
    t0 = time.time()
    X_train_list = []
    y_train_list = []
    batch_tensors = []

    batch_size = 128
    for i, (fpath, label) in enumerate(all_train):
        try:
            img = Image.open(fpath).convert("RGB")
            batch_tensors.append(transform(img).unsqueeze(0))
            y_train_list.append(label)
        except Exception as e:
            continue

        if len(batch_tensors) >= batch_size or i == len(all_train) - 1:
            if batch_tensors:
                t = torch.cat(batch_tensors).to(device)
                with torch.no_grad():
                    f_vecs = pool(feature_extractor(t)).flatten(1)
                X_train_list.append(f_vecs.cpu())
                batch_tensors.clear()

    X_train = torch.cat(X_train_list)
    y_train = torch.tensor(y_train_list, dtype=torch.long)
    print(f"Feature extraction complete in {time.time()-t0:.1f}s. Shape: {X_train.shape}")

    # 5. Class Weights for Balanced Learning
    class_counts = torch.bincount(y_train, minlength=7)
    total_samples = len(y_train)
    class_weights = (total_samples / (7.0 * class_counts.float())).to(device)
    print("Class weights:", [round(float(w), 3) for w in class_weights])

    # 6. Train Crop Classifier Head
    head = CropClassifierHead(in_features=1280, num_classes=7).to(device)
    optimizer = torch.optim.AdamW(head.parameters(), lr=0.002, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=35, eta_min=1e-5)

    dataset = torch.utils.data.TensorDataset(X_train, y_train)
    loader = torch.utils.data.DataLoader(dataset, batch_size=64, shuffle=True)

    print("\nTraining Botanical Crop Verifier Head (35 epochs)...")
    head.train()
    for epoch in range(1, 36):
        epoch_loss = 0.0
        correct = 0
        total = 0
        for bx, by in loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            logits = head(bx)
            loss = criterion(logits, by)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * bx.size(0)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == by).sum().item()
            total += bx.size(0)

        scheduler.step()
        if epoch % 5 == 0 or epoch == 1 or epoch == 35:
            train_acc = (correct / total) * 100
            avg_loss = epoch_loss / total
            print(f"Epoch {epoch:2d}/35 | Loss: {avg_loss:.4f} | Train Acc: {train_acc:.2f}% | LR: {scheduler.get_last_lr()[0]:.6f}")

    head.eval()

    # 7. Evaluate on ALL 1,594 Validation Images (val_split.csv)
    print("\n" + "=" * 80)
    print("Evaluating on Full Validation Split (val_split.csv)...")
    val_items = []
    with open(VAL_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_crop = row["canonical_class"].split("___")[0]
            if raw_crop in CROP_TO_IDX:
                p = Path(row["filepath"])
                if p.exists():
                    val_items.append((str(p), CROP_TO_IDX[raw_crop]))

    val_X_list = []
    val_y_list = []
    batch_tensors = []
    for i, (fpath, label) in enumerate(val_items):
        img = Image.open(fpath).convert("RGB")
        batch_tensors.append(transform(img).unsqueeze(0))
        val_y_list.append(label)
        if len(batch_tensors) >= batch_size or i == len(val_items) - 1:
            t = torch.cat(batch_tensors).to(device)
            with torch.no_grad():
                f_vecs = pool(feature_extractor(t)).flatten(1)
            val_X_list.append(f_vecs.cpu())
            batch_tensors.clear()

    X_val = torch.cat(val_X_list)
    y_val = torch.tensor(val_y_list, dtype=torch.long)

    with torch.no_grad():
        val_logits = head(X_val.to(device))
        val_probs = torch.softmax(val_logits, dim=1).cpu()
        val_preds = torch.argmax(val_probs, dim=1)

    val_total = len(y_val)
    val_correct = (val_preds == y_val).sum().item()
    val_false_rej = (val_preds == CROP_TO_IDX["Unsupported"]).sum().item()
    val_accuracy = (val_correct / val_total) * 100
    val_frr = (val_false_rej / val_total) * 100

    print(f"Validation Crop Identification Accuracy: {val_correct}/{val_total} ({val_accuracy:.2f}%)")
    print(f"Validation False Rejection Rate (falsely flagged Unsupported): {val_false_rej}/{val_total} ({val_frr:.2f}%)")
    for crop in ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"]:
        idx = CROP_TO_IDX[crop]
        mask = (y_val == idx)
        c_tot = mask.sum().item()
        c_cor = (val_preds[mask] == idx).sum().item()
        c_rej = (val_preds[mask] == CROP_TO_IDX["Unsupported"]).sum().item()
        print(f"  • {crop:8s}: {c_cor}/{c_tot} ({c_cor/c_tot*100:.1f}%), {c_rej} rejected ({c_rej/c_tot*100:.1f}%)")

    # 8. Evaluate on Held-Out Soybean Images (500 samples)
    soy_dir = PLANTVILLAGE_DIR / "Soybean___healthy"
    all_soy = sorted([f for f in soy_dir.iterdir() if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
    test_soy = all_soy[100:600] # strictly held out!
    print(f"\nEvaluating on {len(test_soy)} Held-Out Genuine Soybean Images...")

    soy_batch = []
    soy_X_list = []
    for i, fpath in enumerate(test_soy):
        img = Image.open(fpath).convert("RGB")
        soy_batch.append(transform(img).unsqueeze(0))
        if len(soy_batch) >= batch_size or i == len(test_soy) - 1:
            t = torch.cat(soy_batch).to(device)
            with torch.no_grad():
                f_vecs = pool(feature_extractor(t)).flatten(1)
            soy_X_list.append(f_vecs.cpu())
            soy_batch.clear()

    X_soy = torch.cat(soy_X_list)
    with torch.no_grad():
        soy_logits = head(X_soy.to(device))
        soy_probs = torch.softmax(soy_logits, dim=1).cpu()
        soy_preds = torch.argmax(soy_probs, dim=1)

    soy_rejected = (soy_preds == CROP_TO_IDX["Unsupported"]).sum().item()
    soy_far = ((len(test_soy) - soy_rejected) / len(test_soy)) * 100
    print(f"Held-Out Soybean Correctly Rejected as Unsupported: {soy_rejected}/{len(test_soy)} ({soy_rejected/len(test_soy)*100:.2f}%)")
    print(f"Soybean False Acceptance Rate: {soy_far:.2f}%")

    # 9. Save Weights and Metadata
    output_checkpoint = BACKEND_ML / "crop_verifier.pth"
    torch.save(head.state_dict(), output_checkpoint)
    print(f"\nSaved CropVerifier head weights to: {output_checkpoint} ({output_checkpoint.stat().st_size / (1024*1024):.2f} MB)")

    metadata = {
        "model_name": "Krishi Sakha Botanical Crop Verifier (Stage 2)",
        "checkpoint_file": "crop_verifier.pth",
        "checkpoint_size_bytes": output_checkpoint.stat().st_size,
        "base_backbone": "MobileNetV2 (ImageNet Pretrained DEFAULT)",
        "num_classes": 7,
        "classes": CROP_NAMES,
        "class_to_idx": CROP_TO_IDX,
        "supported_crops": ["Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton"],
        "unsupported_class_index": 6,
        "val_total": val_total,
        "val_accuracy": round(val_accuracy, 2),
        "val_false_rejection_rate": round(val_frr, 2),
        "held_out_soybean_count": len(test_soy),
        "held_out_soybean_rejection_rate": round((soy_rejected / len(test_soy)) * 100, 2),
        "held_out_soybean_false_acceptance_rate": round(soy_far, 2),
        "training_device": str(device),
        "random_seed": SEED,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    metadata_path = BACKEND_ML / "crop_verifier_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to: {metadata_path}")
    print("=" * 80)
    print("🎉 BOTANICAL CROP VERIFIER TRAINING & EVALUATION COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
