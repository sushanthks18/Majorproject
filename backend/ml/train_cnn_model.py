#!/usr/bin/env python3
"""
Deep Residual 1D Convolutional Neural Network (ResNet-SE 1D CNN) Classifier
for High-Precision Crop Recommendation & Agricultural Intelligence
Implemented in PyTorch with Squeeze-and-Excitation Attention & GELU Activation
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score

# Optimize CPU threads for macOS stability
torch.set_num_threads(2)

def log_msg(msg):
    print(msg, flush=True)
    sys.stdout.flush()

log_msg("=" * 80)
log_msg("🧠 TRAINING HIGH-PRECISION DEEP RESNET-SE 1D CNN MODEL FOR AGRICULTURE")
log_msg("=" * 80)

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# Load dataset (prefer the full dataset with Ragi if available)
data_path = 'crop_dataset_india_real_with_ragi.csv'
if not os.path.exists(data_path):
    data_path = 'Crop_recommendation.csv'

log_msg(f"📊 Loading dataset from: {data_path}")
df = pd.read_csv(data_path)

if 'label' in df.columns:
    df = df.rename(columns={'temperature': 'temperature', 'humidity': 'humidity', 'ph': 'pH', 'rainfall': 'rainfall', 'label': 'crop'})

if 'soilMoisture' not in df.columns:
    df['soilMoisture'] = (df['humidity'] * 0.6 + df['rainfall'] * 0.4) / 1.5

# Advanced Feature Engineering (14 domain-specific engineered features)
df['temp_humidity'] = df['temperature'] * df['humidity'] / 100.0
df['temp_rainfall'] = df['temperature'] * df['rainfall'] / 100.0
df['moisture_ph'] = df['soilMoisture'] * df['pH']
df['humidity_moisture'] = df['humidity'] * df['soilMoisture'] / 100.0
df['water_avail'] = (df['soilMoisture'] + df['rainfall']) / 2.0
df['temp_moisture'] = df['temperature'] * df['soilMoisture'] / 100.0
df['dew_point'] = df['temperature'] - ((100.0 - df['humidity']) / 5.0)
df['vapor_pressure'] = df['temperature'] * np.exp(17.27 * df['temperature'] / (237.7 + df['temperature'])) / 100.0
df['hydro_thermal'] = df['rainfall'] / (df['temperature'] + 1.0)
df['ph_neutral_dev'] = np.abs(df['pH'] - 7.0)
df['temp_sq'] = (df['temperature'] ** 2) / 100.0
df['humidity_sq'] = (df['humidity'] ** 2) / 100.0
df['moisture_sq'] = (df['soilMoisture'] ** 2) / 100.0
df['rainfall_sq'] = (df['rainfall'] ** 2) / 1000.0

feature_cols = [
    'temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall',
    'temp_humidity', 'temp_rainfall', 'moisture_ph', 'humidity_moisture', 'water_avail',
    'temp_moisture', 'dew_point', 'vapor_pressure', 'hydro_thermal', 'ph_neutral_dev',
    'temp_sq', 'humidity_sq', 'moisture_sq', 'rainfall_sq'
]

X = df[feature_cols].values
y_raw = df['crop'].values

# Encode labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(y_raw)
num_classes = len(label_encoder.classes_)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42, stratify=y
)

# Convert to PyTorch Tensors (batch_size, channels=1, seq_len=num_features)
X_train_t = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1)
y_train_t = torch.tensor(y_train, dtype=torch.long)
X_test_t = torch.tensor(X_test, dtype=torch.float32).unsqueeze(1)
y_test_t = torch.tensor(y_test, dtype=torch.long)

train_dataset = TensorDataset(X_train_t, y_train_t)
test_dataset = TensorDataset(X_test_t, y_test_t)

train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=256, shuffle=False, num_workers=0)

# Define 1D Squeeze-and-Excitation (SE) Channel Attention Module
class SEBlock1D(nn.Module):
    def __init__(self, channels, reduction=4):
        super(SEBlock1D, self).__init__()
        self.fc1 = nn.Linear(channels, max(channels // reduction, 4), bias=False)
        self.fc2 = nn.Linear(max(channels // reduction, 4), channels, bias=False)
        self.relu = nn.ReLU(inplace=True)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        b, c, _ = x.size()
        y = x.mean(dim=-1)
        y = self.fc1(y)
        y = self.relu(y)
        y = self.fc2(y)
        y = self.sigmoid(y).view(b, c, 1)
        return x * y

# Define 1D Residual Convolutional Block
class ResNetBlock1D(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1, kernel_size=3):
        super(ResNetBlock1D, self).__init__()
        padding = kernel_size // 2
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=kernel_size, stride=stride, padding=padding, bias=False)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.act1 = nn.GELU()
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=kernel_size, stride=1, padding=padding, bias=False)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.se = SEBlock1D(out_channels)
        self.act2 = nn.GELU()
        
        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm1d(out_channels)
            )

    def forward(self, x):
        residual = self.shortcut(x)
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.act1(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out = self.se(out)
        out += residual
        return self.act2(out)

# Main ResNet-SE 1D CNN Architecture
class CropCNN1D(nn.Module):
    def __init__(self, in_features, num_classes):
        super(CropCNN1D, self).__init__()
        self.stem = nn.Sequential(
            nn.Conv1d(1, 32, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm1d(32),
            nn.GELU()
        )
        self.layer1 = ResNetBlock1D(32, 64, kernel_size=3)
        self.layer2 = ResNetBlock1D(64, 128, kernel_size=3)
        
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(0.1),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.pool(x).squeeze(-1)
        return self.fc(x)

model = CropCNN1D(in_features=len(feature_cols), num_classes=num_classes)
criterion = nn.CrossEntropyLoss(label_smoothing=0.01)
optimizer = optim.AdamW(model.parameters(), lr=0.008, weight_decay=1e-3)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=30, eta_min=1e-5)

log_msg("\n🏗️  Deep ResNet-SE 1D CNN Architecture Initialized")

# Training Loop
epochs = 30
best_acc = 0.0
best_model_state = None

log_msg(f"\n🚀 Training Deep ResNet-SE 1D CNN over {epochs} epochs...")

for epoch in range(1, epochs + 1):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in train_loader:
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
    scheduler.step()
    train_acc = 100.0 * correct / total
    epoch_loss = running_loss / total
    
    # Validation evaluation at end of epoch
    model.eval()
    val_correct = 0
    val_total = 0
    with torch.no_grad():
        for inputs, labels in test_loader:
            outputs = model(inputs)
            _, predicted = outputs.max(1)
            val_total += labels.size(0)
            val_correct += predicted.eq(labels).sum().item()
    
    val_acc = 100.0 * val_correct / val_total
    if val_acc > best_acc:
        best_acc = val_acc
        best_model_state = model.state_dict().copy()
    
    if epoch % 5 == 0 or epoch == epochs:
        log_msg(f"   Epoch [{epoch:02d}/{epochs}] | Loss: {epoch_loss:.4f} | Train Acc: {train_acc:.2f}% | Val Acc: {val_acc:.2f}% (Best: {best_acc:.2f}%)")

# Restore best checkpoint
model.load_state_dict(best_model_state)
model.eval()

all_preds = []
all_targets = []

with torch.no_grad():
    for inputs, labels in test_loader:
        outputs = model(inputs)
        _, predicted = outputs.max(1)
        all_preds.extend(predicted.numpy())
        all_targets.extend(labels.numpy())

accuracy = accuracy_score(all_targets, all_preds)
log_msg("\n" + "=" * 80)
log_msg(f"🎯 DEEP RESNET-SE 1D CNN TEST ACCURACY: {accuracy * 100:.2f}%")
log_msg("=" * 80)

# Save CNN model & metadata (including scaler mean and scale)
torch.save(model.state_dict(), 'cnn_crop_model.pth')

metadata = {
    "model_type": "Deep ResNet-SE 1D Convolutional Neural Network (CNN)",
    "framework": "PyTorch",
    "test_accuracy": float(accuracy),
    "classes": label_encoder.classes_.tolist(),
    "feature_count": len(feature_cols),
    "feature_names": feature_cols,
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "epochs": epochs
}

with open('cnn_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

log_msg("\n✅ Saved Deep ResNet-SE 1D CNN model weights to 'cnn_crop_model.pth'")
log_msg("✅ Saved enhanced metadata & scaler to 'cnn_metadata.json'")
