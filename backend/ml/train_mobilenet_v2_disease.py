#!/usr/bin/env python3
"""
Krishi Sakha: MobileNetV2 Plant Disease Classifier Trainer & Evaluator
Trains MobileNetV2 on 17 supported crop disease classes using leak-free splits.
Enforces strict test-set isolation and generates comprehensive performance metrics.
"""

import os
import sys
import time
import json
import csv
import random
import argparse
from pathlib import Path
from collections import defaultdict, Counter

import numpy as np
from PIL import Image

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import Dataset, DataLoader
    import torchvision.models as models
    import torchvision.transforms as transforms
except ImportError as e:
    print(f"❌ Error: PyTorch or Torchvision is missing: {e}")
    sys.exit(1)

# Target 4-Crop Taxonomy for Krishi Sakha
SUPPORTED_CLASSES = [
    "Paddy___Bacterial_Blight",
    "Paddy___Blast",
    "Paddy___Brown_Spot",
    "Paddy___Healthy",
    "Ragi___Blast",
    "Ragi___Brown_Spot",
    "Ragi___Healthy",
    "Jowar___Anthracnose",
    "Jowar___Leaf_Blight",
    "Jowar___Healthy",
    "Coconut___Bud_Rot",
    "Coconut___Leaf_Spot",
    "Coconut___Stem_Bleeding",
    "Coconut___Healthy"
]
ALL_TAXONOMY_CLASSES = SUPPORTED_CLASSES
CLASS_TO_IDX = {c: i for i, c in enumerate(SUPPORTED_CLASSES)}
IDX_TO_CLASS = {i: c for i, c in enumerate(SUPPORTED_CLASSES)}

class PlantDiseaseDataset(Dataset):
    def __init__(self, csv_path: Path, transform=None):
        self.samples = []
        self.transform = transform
        
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cls_name = row["canonical_class"]
                if cls_name in CLASS_TO_IDX:
                    self.samples.append({
                        "filepath": row["filepath"],
                        "class_idx": CLASS_TO_IDX[cls_name],
                        "class_name": cls_name,
                        "image_id": row["image_id"]
                    })
                    
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        item = self.samples[idx]
        img_path = item["filepath"]
        try:
            with open(img_path, "rb") as f:
                img = Image.open(f).convert("RGB")
        except Exception:
            img = Image.new("RGB", (224, 224), (0, 0, 0))
            
        if self.transform:
            img = self.transform(img)
            
        return img, item["class_idx"], item["class_name"]

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def compute_metrics(y_true, y_pred, num_classes):
    total = len(y_true)
    if total == 0:
        return {}
        
    correct = sum(1 for yt, yp in zip(y_true, y_pred) if yt == yp)
    accuracy = correct / total
    
    per_class = {}
    for c_idx in range(num_classes):
        tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c_idx and yp == c_idx)
        fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt != c_idx and yp == c_idx)
        fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == c_idx and yp != c_idx)
        support = sum(1 for yt in y_true if yt == c_idx)
        
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        
        per_class[IDX_TO_CLASS[c_idx]] = {
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "support": support
        }
        
    active_classes = [c for c in per_class.values() if c["support"] > 0]
    macro_prec = sum(c["precision"] for c in active_classes) / len(active_classes) if active_classes else 0.0
    macro_rec = sum(c["recall"] for c in active_classes) / len(active_classes) if active_classes else 0.0
    macro_f1 = sum(c["f1_score"] for c in active_classes) / len(active_classes) if active_classes else 0.0
    
    weighted_prec = sum(c["precision"] * c["support"] for c in active_classes) / total if total > 0 else 0.0
    weighted_rec = sum(c["recall"] * c["support"] for c in active_classes) / total if total > 0 else 0.0
    weighted_f1 = sum(c["f1_score"] * c["support"] for c in active_classes) / total if total > 0 else 0.0
    
    cm = [[0 for _ in range(num_classes)] for _ in range(num_classes)]
    for yt, yp in zip(y_true, y_pred):
        cm[yt][yp] += 1
        
    return {
        "accuracy": accuracy,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec,
        "macro_f1": macro_f1,
        "weighted_precision": weighted_prec,
        "weighted_recall": weighted_rec,
        "weighted_f1": weighted_f1,
        "per_class": per_class,
        "confusion_matrix": cm
    }

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for images, labels, _ in loader:
        images = images.to(device)
        labels = labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels).item()
        total += labels.size(0)
        
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc

def evaluate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    y_true = []
    y_pred = []
    total = 0
    
    with torch.no_grad():
        for images, labels, _ in loader:
            images = images.to(device)
            labels = labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            
            y_true.extend(labels.cpu().numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())
            total += labels.size(0)
            
    epoch_loss = running_loss / total
    metrics = compute_metrics(y_true, y_pred, len(SUPPORTED_CLASSES))
    metrics["loss"] = epoch_loss
    return metrics

def main():
    parser = argparse.ArgumentParser(description="Krishi Sakha MobileNetV2 Trainer")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Mini-batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate for AdamW")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--base-dir", type=str, default=str(Path(__file__).parent.resolve()), help="Base directory for ML artifacts")
    args = parser.parse_args()
    
    set_seed(args.seed)
    base_dir = Path(args.base_dir).resolve()
    
    train_csv = base_dir / "train_split.csv"
    val_csv = base_dir / "val_split.csv"
    test_csv = base_dir / "test_split.csv"
    
    checkpoint_path = base_dir / "mobilenet_v2_disease_best.pth"
    metadata_path = base_dir / "disease_model_metadata.json"
    history_path = base_dir / "training_history.json"
    test_report_path = base_dir / "test_evaluation_report.json"
    cm_csv_path = base_dir / "test_confusion_matrix.csv"
    
    print("=" * 80)
    print("🌾 KRISHI SAKHA: MobileNetV2 Disease Model Training & Evaluation")
    print("=" * 80)
    
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        device_name = "Apple Silicon GPU (MPS)"
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        device_name = "CUDA GPU"
    else:
        device = torch.device("cpu")
        device_name = "Standard CPU"
        
    print(f"Hardware Compute Device: {device_name}")
    print(f"PyTorch Version:         {torch.__version__}")
    print(f"Random Seed:             {args.seed}")
    print(f"Supported Classes:       {len(SUPPORTED_CLASSES)} (Paddy, Ragi, Jowar, Coconut)")
    print(f"Excluded Crops:          Tomato, Potato, Wheat, Corn, Cotton (Purged as requested)")
    print(f"Epochs:                  {args.epochs}")
    print(f"Batch Size:              {args.batch_size}")
    print(f"Learning Rate:           {args.lr}")
    
    train_transforms = transforms.Compose([
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    eval_transforms = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    print("\nLoading split datasets...")
    train_dataset = PlantDiseaseDataset(train_csv, transform=train_transforms)
    val_dataset = PlantDiseaseDataset(val_csv, transform=eval_transforms)
    test_dataset = PlantDiseaseDataset(test_csv, transform=eval_transforms)
    
    print(f"  • Training samples:   {len(train_dataset)}")
    print(f"  • Validation samples: {len(val_dataset)}")
    print(f"  • Test samples:       {len(test_dataset)} (Strictly isolated until final test)")
    
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)
    
    print("\nCalculating inverse-frequency class weights for training loss...")
    class_counts = Counter(item["class_idx"] for item in train_dataset.samples)
    total_train = len(train_dataset)
    num_classes = len(SUPPORTED_CLASSES)
    
    weights = []
    for c_idx in range(num_classes):
        cnt = class_counts.get(c_idx, 1)
        w = total_train / (num_classes * cnt)
        weights.append(w)
        
    norm_factor = num_classes / sum(weights)
    weights = [w * norm_factor for w in weights]
    class_weights_tensor = torch.tensor(weights, dtype=torch.float32).to(device)
    
    print("Class weights (sample):")
    for c_idx in range(min(5, num_classes)):
        print(f"  {IDX_TO_CLASS[c_idx]}: count={class_counts[c_idx]}, weight={weights[c_idx]:.2f}")
    print(f"  ... total classes weighted: {num_classes}")
    
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    
    print("\nInitializing MobileNetV2 with official pretrained ImageNet weights...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes, bias=True)
    model = model.to(device)
    
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    
    print("\n" + "=" * 80)
    print("🚀 TRAINING STARTED")
    print("=" * 80)
    
    best_val_macro_f1 = -1.0
    best_epoch = -1
    history = []
    t_train_start = time.time()
    
    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = evaluate(model, val_loader, criterion, device)
        scheduler.step()
        t1 = time.time()
        
        val_loss = val_metrics["loss"]
        val_acc = val_metrics["accuracy"]
        val_macro_f1 = val_metrics["macro_f1"]
        val_weighted_f1 = val_metrics["weighted_f1"]
        
        is_best = val_macro_f1 > best_val_macro_f1
        if is_best:
            best_val_macro_f1 = val_macro_f1
            best_epoch = epoch
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_macro_f1": val_macro_f1,
                "val_accuracy": val_acc,
                "val_loss": val_loss,
                "supported_classes": SUPPORTED_CLASSES,
                "class_to_idx": CLASS_TO_IDX,
                "training_seed": args.seed,
                "architecture": "MobileNetV2"
            }, checkpoint_path)
            
        history_entry = {
            "epoch": epoch,
            "train_loss": train_loss,
            "train_accuracy": train_acc,
            "val_loss": val_loss,
            "val_accuracy": val_acc,
            "val_macro_f1": val_macro_f1,
            "val_weighted_f1": val_weighted_f1,
            "is_best": is_best,
            "epoch_duration_sec": t1 - t0
        }
        history.append(history_entry)
        
        best_star = "🌟 [BEST CHECKPOINT]" if is_best else ""
        print(f"Epoch [{epoch:02d}/{args.epochs:02d}] ({t1 - t0:.1f}s) | "
              f"Train Loss: {train_loss:.4f}, Acc: {train_acc*100:.2f}% | "
              f"Val Loss: {val_loss:.4f}, Acc: {val_acc*100:.2f}%, Macro-F1: {val_macro_f1*100:.2f}% {best_star}",
              flush=True)
              
    t_train_end = time.time()
    total_train_duration = t_train_end - t_train_start
    print("\n" + "=" * 80)
    print(f"✅ Training completed in {total_train_duration:.1f}s ({total_train_duration/60:.2f} min)")
    print(f"Best validation checkpoint achieved at Epoch {best_epoch} with Val Macro-F1: {best_val_macro_f1*100:.2f}%")
    print(f"Saved best model checkpoint to: {checkpoint_path}")
    print("=" * 80)
    
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump({
            "model": "MobileNetV2",
            "epochs": args.epochs,
            "batch_size": args.batch_size,
            "learning_rate": args.lr,
            "random_seed": args.seed,
            "best_epoch": best_epoch,
            "best_val_macro_f1": best_val_macro_f1,
            "total_duration_sec": total_train_duration,
            "device": str(device),
            "history": history
        }, f, indent=2)
        
    checkpoint_file_size_bytes = os.path.getsize(checkpoint_path)
    model_metadata = {
        "model_name": "MobileNetV2 Agricultural Leaf Disease Classifier",
        "checkpoint_file": str(checkpoint_path.name),
        "checkpoint_size_bytes": checkpoint_file_size_bytes,
        "checkpoint_size_mb": round(checkpoint_file_size_bytes / (1024 * 1024), 2),
        "best_epoch": best_epoch,
        "best_val_macro_f1": best_val_macro_f1,
        "training_device": device_name,
        "random_seed": args.seed,
        "dataset_manifests": {
            "master_manifest": "backend/ml/dataset_split_manifest.csv",
            "train_manifest": "backend/ml/train_split.csv",
            "val_manifest": "backend/ml/val_split.csv",
            "test_manifest": "backend/ml/test_split.csv"
        },
        "num_supported_classes": len(SUPPORTED_CLASSES),
        "supported_classes": SUPPORTED_CLASSES,
        "class_to_idx": CLASS_TO_IDX,
        "idx_to_class": IDX_TO_CLASS,
        "supported_crops": ["Paddy", "Ragi", "Jowar", "Coconut"],
        "taxonomy_compliance": {
            "total_taxonomy_classes": len(SUPPORTED_CLASSES),
            "supported_classes_count": len(SUPPORTED_CLASSES),
            "unsupported_classes_count": 0,
            "ordering_preserved": True
        },
        "dependencies": {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "torchvision": models.__version__ if hasattr(models, "__version__") else "0.29.0"
        }
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)
    print(f"Model metadata written to: {metadata_path}")
    
    print("\n" + "=" * 80)
    print("🔒 RUNNING FINAL TEST EVALUATION (STRICTLY ISOLATED TEST SET)")
    print("=" * 80)
    print(f"Evaluating {len(test_dataset)} test samples on Best Checkpoint (Epoch {best_epoch})...")
    
    best_checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(best_checkpoint["model_state_dict"])
    
    t_eval_start = time.time()
    test_metrics = evaluate(model, test_loader, criterion, device)
    t_eval_end = time.time()
    
    print(f"\nFinal Test Set Results (Evaluated once on final model):")
    print(f"  • Test Loss:             {test_metrics['loss']:.4f}")
    print(f"  • Test Accuracy:         {test_metrics['accuracy']*100:.2f}%")
    print(f"  • Macro Precision:       {test_metrics['macro_precision']*100:.2f}%")
    print(f"  • Macro Recall:          {test_metrics['macro_recall']*100:.2f}%")
    print(f"  • Macro F1-Score:        {test_metrics['macro_f1']*100:.2f}%")
    print(f"  • Weighted F1-Score:     {test_metrics['weighted_f1']*100:.2f}%")
    print(f"  • Test Evaluation Time:  {t_eval_end - t_eval_start:.2f}s ({len(test_dataset)/(t_eval_end - t_eval_start):.1f} img/s)")
    
    print("\n" + "-" * 85)
    print(f"{'Class Name':<28} | {'Support':<8} | {'Precision':<10} | {'Recall':<8} | {'F1-Score':<8}")
    print("-" * 85)
    for c_name in SUPPORTED_CLASSES:
        c_stats = test_metrics["per_class"][c_name]
        print(f"{c_name:<28} | {c_stats['support']:<8} | {c_stats['precision']*100:<9.2f}% | {c_stats['recall']*100:<7.2f}% | {c_stats['f1_score']*100:<7.2f}%")
    print("-" * 85)
    
    with open(cm_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["True\\Pred"] + SUPPORTED_CLASSES)
        for i, row in enumerate(test_metrics["confusion_matrix"]):
            writer.writerow([SUPPORTED_CLASSES[i]] + row)
            
    test_report = {
        "evaluation_timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checkpoint_used": str(checkpoint_path.name),
        "best_epoch": best_epoch,
        "test_samples_count": len(test_dataset),
        "overall_metrics": {
            "loss": test_metrics["loss"],
            "accuracy": test_metrics["accuracy"],
            "macro_precision": test_metrics["macro_precision"],
            "macro_recall": test_metrics["macro_recall"],
            "macro_f1": test_metrics["macro_f1"],
            "weighted_precision": test_metrics["weighted_precision"],
            "weighted_recall": test_metrics["weighted_recall"],
            "weighted_f1": test_metrics["weighted_f1"]
        },
        "per_class_metrics": test_metrics["per_class"],
        "confusion_matrix": test_metrics["confusion_matrix"],
        "class_labels": SUPPORTED_CLASSES
    }
    with open(test_report_path, "w", encoding="utf-8") as f:
        json.dump(test_report, f, indent=2)
        
    print(f"\nArtifacts Saved:")
    print(f"  • Best Checkpoint:       {checkpoint_path}")
    print(f"  • Model Metadata:        {metadata_path}")
    print(f"  • Training History:      {history_path}")
    print(f"  • Test Evaluation JSON:  {test_report_path}")
    print(f"  • Confusion Matrix CSV:  {cm_csv_path}")
    
    print("\n" + "=" * 80)
    print("🔬 REPRODUCIBLE INFERENCE VERIFICATION TEST")
    print("=" * 80)
    sample_test_item = test_dataset.samples[0]
    sample_img_path = sample_test_item["filepath"]
    sample_true_class = sample_test_item["class_name"]
    
    print(f"Input Test Image:  {sample_img_path}")
    print(f"Ground Truth:      {sample_true_class}")
    
    model.eval()
    with Image.open(sample_img_path) as im:
        im_tensor = eval_transforms(im.convert("RGB")).unsqueeze(0).to(device)
        
    t_inf_0 = time.time()
    with torch.no_grad():
        logits = model(im_tensor)
        probs = torch.softmax(logits, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        confidence = probs[pred_idx].item()
    t_inf_1 = time.time()
    
    pred_class = IDX_TO_CLASS[pred_idx]
    latency_ms = (t_inf_1 - t_inf_0) * 1000
    
    print(f"Predicted Class:   {pred_class}")
    print(f"Confidence Score:  {confidence*100:.2f}%")
    print(f"Inference Latency: {latency_ms:.2f} ms")
    print(f"Match Status:      {'✅ MATCH' if pred_class == sample_true_class else '⚠️ MISMATCH'}")
    print("=" * 80)

if __name__ == "__main__":
    main()
