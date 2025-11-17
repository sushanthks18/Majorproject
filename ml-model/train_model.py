#!/usr/bin/env python3
"""
ML Crop Recommendation Model Training
Uses Decision Tree Classifier on Kaggle agricultural dataset
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import pickle
import json

# Kaggle Crop Recommendation Dataset
# Features: N, P, K, temperature, humidity, pH, rainfall
# Target: Crop label

def create_synthetic_dataset():
    """
    Create synthetic dataset based on standard agricultural parameters
    Including acid-loving crops for extreme pH conditions
    """
    np.random.seed(42)
    
    data = []
    
    # Blueberries: Acid-loving, high moisture tolerance
    for _ in range(600):
        data.append({
            'N': np.random.randint(40, 80),
            'P': np.random.randint(30, 60),
            'K': np.random.randint(30, 50),
            'temperature': np.random.uniform(20, 30),
            'humidity': np.random.uniform(60, 85),
            'pH': np.random.uniform(2.0, 5.5),  # Very acidic
            'rainfall': np.random.uniform(80, 150),
            'label': 'Blueberries'
        })
    
    # Cranberries: Extremely acid-loving, waterlogged tolerance
    for _ in range(600):
        data.append({
            'N': np.random.randint(35, 70),
            'P': np.random.randint(25, 55),
            'K': np.random.randint(25, 45),
            'temperature': np.random.uniform(18, 28),
            'humidity': np.random.uniform(65, 90),
            'pH': np.random.uniform(2.0, 5.0),  # Very acidic
            'rainfall': np.random.uniform(100, 200),
            'label': 'Cranberries'
        })
    
    # Rice: High water, moderate temp, slightly acidic soil
    for _ in range(500):
        data.append({
            'N': np.random.randint(60, 100),
            'P': np.random.randint(40, 70),
            'K': np.random.randint(35, 50),
            'temperature': np.random.uniform(20, 35),
            'humidity': np.random.uniform(60, 90),
            'pH': np.random.uniform(5.5, 7.0),
            'rainfall': np.random.uniform(150, 300),
            'label': 'Rice'
        })
    
    # Wheat: Moderate conditions
    for _ in range(400):
        data.append({
            'N': np.random.randint(70, 110),
            'P': np.random.randint(50, 80),
            'K': np.random.randint(40, 60),
            'temperature': np.random.uniform(15, 25),
            'humidity': np.random.uniform(40, 70),
            'pH': np.random.uniform(6.0, 7.5),
            'rainfall': np.random.uniform(50, 100),
            'label': 'Wheat'
        })
    
    # Maize/Corn: Warm season, moderate water
    for _ in range(400):
        data.append({
            'N': np.random.randint(75, 120),
            'P': np.random.randint(45, 75),
            'K': np.random.randint(30, 50),
            'temperature': np.random.uniform(18, 32),
            'humidity': np.random.uniform(40, 70),
            'pH': np.random.uniform(5.5, 7.5),
            'rainfall': np.random.uniform(60, 110),
            'label': 'Maize'
        })
    
    # Cotton: Warm, moderate-high humidity
    for _ in range(400):
        data.append({
            'N': np.random.randint(80, 130),
            'P': np.random.randint(40, 70),
            'K': np.random.randint(40, 60),
            'temperature': np.random.uniform(21, 30),
            'humidity': np.random.uniform(50, 80),
            'pH': np.random.uniform(5.8, 8.0),
            'rainfall': np.random.uniform(50, 100),
            'label': 'Cotton'
        })
    
    # Sugarcane: High water, warm
    for _ in range(400):
        data.append({
            'N': np.random.randint(70, 110),
            'P': np.random.randint(50, 80),
            'K': np.random.randint(50, 70),
            'temperature': np.random.uniform(20, 35),
            'humidity': np.random.uniform(60, 90),
            'pH': np.random.uniform(6.0, 7.5),
            'rainfall': np.random.uniform(120, 250),
            'label': 'Sugarcane'
        })
    
    # Pulses: Moderate water, wide pH
    for _ in range(400):
        data.append({
            'N': np.random.randint(40, 80),
            'P': np.random.randint(50, 80),
            'K': np.random.randint(40, 60),
            'temperature': np.random.uniform(20, 30),
            'humidity': np.random.uniform(50, 70),
            'pH': np.random.uniform(6.0, 7.5),
            'rainfall': np.random.uniform(40, 80),
            'label': 'Pulses'
        })
    
    # Vegetables: Moderate all
    for _ in range(400):
        data.append({
            'N': np.random.randint(60, 100),
            'P': np.random.randint(50, 80),
            'K': np.random.randint(40, 60),
            'temperature': np.random.uniform(15, 30),
            'humidity': np.random.uniform(40, 80),
            'pH': np.random.uniform(6.0, 7.5),
            'rainfall': np.random.uniform(50, 100),
            'label': 'Vegetables'
        })
    
    # Groundnut: Warm, moderate water
    for _ in range(400):
        data.append({
            'N': np.random.randint(40, 70),
            'P': np.random.randint(60, 90),
            'K': np.random.randint(40, 60),
            'temperature': np.random.uniform(20, 30),
            'humidity': np.random.uniform(50, 70),
            'pH': np.random.uniform(6.0, 7.0),
            'rainfall': np.random.uniform(50, 100),
            'label': 'Groundnut'
        })
    
    return pd.DataFrame(data)

def train_model():
    """Train Decision Tree Classifier on crop dataset"""
    
    print("🌾 Creating agricultural dataset...")
    df = create_synthetic_dataset()
    
    print(f"Dataset shape: {df.shape}")
    print(f"Crops: {df['label'].unique()}")
    print(f"\nCrop distribution:\n{df['label'].value_counts()}\n")
    
    # Separate features and target
    X = df.drop('label', axis=1)
    y = df['label']
    
    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples\n")
    
    # Train Decision Tree Classifier
    print("🌳 Training Decision Tree Classifier...")
    model = DecisionTreeClassifier(
        max_depth=10,
        min_samples_split=20,
        min_samples_leaf=10,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Model Accuracy: {accuracy * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n📊 Feature Importance:")
    print(feature_importance)
    
    # Save model
    print("\n💾 Saving model...")
    with open('crop_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    # Save feature names and crop labels
    model_info = {
        'features': list(X.columns),
        'crops': list(y.unique()),
        'accuracy': float(accuracy),
        'feature_importance': feature_importance.to_dict('records')
    }
    
    with open('model_info.json', 'w') as f:
        json.dump(model_info, f, indent=2)
    
    print("✅ Model saved successfully!")
    print(f"   - crop_model.pkl")
    print(f"   - model_info.json")
    
    return model, model_info

if __name__ == "__main__":
    model, info = train_model()
    
    # Test prediction
    print("\n🧪 Test Prediction:")
    test_input = pd.DataFrame([{
        'N': 80,
        'P': 60,
        'K': 40,
        'temperature': 25,
        'humidity': 65,
        'pH': 6.5,
        'rainfall': 100
    }])
    
    prediction = model.predict(test_input)
    probabilities = model.predict_proba(test_input)
    
    print(f"Input: {test_input.iloc[0].to_dict()}")
    print(f"Predicted Crop: {prediction[0]}")
    print(f"Confidence: {max(probabilities[0]) * 100:.2f}%")
