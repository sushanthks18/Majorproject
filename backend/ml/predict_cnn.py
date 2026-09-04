#!/usr/bin/env python3
"""
CLI & API Inference Module for trained PyTorch Deep ResNet-SE 1D CNN Model
"""

import sys
import json
import torch
import torch.nn as nn
import numpy as np

torch.set_num_threads(2)

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

# Define 1D Residual Block
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

# Main CropCNN1D Architecture
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

def predict_cnn(temp, hum, soil, ph, rain):
    # Load metadata, classes & fitted scaler parameters
    with open('cnn_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    classes = metadata['classes']
    num_classes = len(classes)
    
    # Feature engineering (19 features)
    temp_humidity = temp * hum / 100.0
    temp_rainfall = temp * rain / 100.0
    moisture_ph = soil * ph
    humidity_moisture = hum * soil / 100.0
    water_avail = (soil + rain) / 2.0
    temp_moisture = temp * soil / 100.0
    dew_point = temp - ((100.0 - hum) / 5.0)
    vapor_pressure = temp * np.exp(17.27 * temp / (237.7 + temp)) / 100.0
    hydro_thermal = rain / (temp + 1.0)
    ph_neutral_dev = abs(ph - 7.0)
    temp_sq = (temp ** 2) / 100.0
    humidity_sq = (hum ** 2) / 100.0
    moisture_sq = (soil ** 2) / 100.0
    rainfall_sq = (rain ** 2) / 1000.0
    
    features = np.array([[
        temp, hum, soil, ph, rain,
        temp_humidity, temp_rainfall, moisture_ph, humidity_moisture, water_avail,
        temp_moisture, dew_point, vapor_pressure, hydro_thermal, ph_neutral_dev,
        temp_sq, humidity_sq, moisture_sq, rainfall_sq
    ]], dtype=np.float32)
    
    if 'scaler_mean' in metadata and 'scaler_scale' in metadata:
        mean = np.array(metadata['scaler_mean'], dtype=np.float32)
        scale = np.array(metadata['scaler_scale'], dtype=np.float32)
        features_scaled = (features - mean) / scale
    else:
        features_scaled = features
    
    features_tensor = torch.tensor(features_scaled, dtype=torch.float32).unsqueeze(1)
    
    # Load model
    model = CropCNN1D(in_features=metadata.get('feature_count', 19), num_classes=num_classes)
    model.load_state_dict(torch.load('cnn_crop_model.pth', weights_only=True))
    model.eval()
    
    with torch.no_grad():
        logits = model(features_tensor)
        probs = torch.softmax(logits, dim=1).squeeze(0)
        
        top3_indices = torch.topk(probs, k=3).indices.tolist()
        
        results = []
        for idx in top3_indices:
            results.append({
                "crop": classes[idx],
                "confidence": float(probs[idx].item() * 100)
            })
            
    return {
        "model": "Deep ResNet-SE 1D Convolutional Neural Network (CNN)",
        "accuracy": f"{metadata['test_accuracy'] * 100:.2f}%",
        "predictions": results
    }

if __name__ == "__main__":
    res = predict_cnn(28.5, 68.2, 55.8, 6.8, 85.0)
    print(json.dumps(res, indent=2))
