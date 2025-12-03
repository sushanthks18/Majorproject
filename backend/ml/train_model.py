import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import json
import os

# ============================================================================
# DATASET INFORMATION - ADAPTED FROM KAGGLE CROP RECOMMENDATION DATASET
# ============================================================================
# Original Source: Crop Recommendation Dataset (Kaggle)
# URL: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
# License: CC0 Public Domain
# 
# Adaptations for IoT Sensors:
#   - Removed N, P, K features (not available from basic IoT sensors)
#   - Added soilMoisture (measured by capacitive sensor on GPIO 34)
#   - Filtered to 8 major crops relevant for Karnataka agriculture
#   - Kept: temperature, humidity, pH, rainfall (from DHT22, pH sensor, rain sensor)
#
# Current Dataset: 459 samples, 8 crops
# Features: temperature (°C), humidity (%), soilMoisture (%), pH, rainfall (mm)
# Crops: Rice, Wheat, Maize, Cotton, Sugarcane, Tomato, Potato, Soybean
# ============================================================================

def load_data():
    """Load the adapted crop dataset (459 samples, 8 crops)"""
    print("\n" + "="*70)
    print("Loading Adapted Crop Recommendation Dataset")
    print("Source: Kaggle Crop Recommendation Dataset (Adapted for IoT)")
    print("URL: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
    print("License: CC0 Public Domain")
    print("="*70)
    
    df = pd.read_csv('crop_dataset.csv')
    
    print(f"\n✓ Dataset loaded successfully!")
    print(f"  Total samples: {len(df)}")
    print(f"  Number of crops: {len(df['crop'].unique())}")
    print(f"  Features: {', '.join(df.columns[:-1])}")
    print(f"  Target: {df.columns[-1]}")
    
    print(f"\n📊 Crop Distribution:")
    crop_counts = df['crop'].value_counts().sort_index()
    for crop, count in crop_counts.items():
        print(f"  {crop:15s}: {count:4d} samples ({count/len(df)*100:.1f}%)")
    
    return df

def preprocess_data(df):
    """Preprocess the data"""
    print("\nPreprocessing data...")
    
    # Features and target
    X = df[['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall']]
    y = df['crop']
    
    # Encode target labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"Features shape: {X.shape}")
    print(f"Target classes: {label_encoder.classes_}")
    
    return X, y_encoded, label_encoder


def train_random_forest(X_train, y_train, X_test, y_test):
    """Train Random Forest Classifier with optimized hyperparameters"""
    print("\n" + "="*70)
    print("TRAINING RANDOM FOREST CLASSIFIER")
    print("Algorithm: Ensemble Learning (Bagging with Decision Trees)")
    print("="*70)
    
    # Optimized hyperparameters based on Kaggle best practices
    # Regularized to prevent overfitting and achieve realistic accuracy
    rf_model = RandomForestClassifier(
        n_estimators=100,        # 100 decision trees (optimal for this dataset size)
        criterion='gini',        # Gini impurity for splitting
        max_depth=15,            # Limit depth to prevent overfitting (was None)
        min_samples_split=5,     # Require 5 samples to split (was 2)
        min_samples_leaf=2,      # Require 2 samples in leaf (was 1)
        max_features='sqrt',     # sqrt(n_features) for each split
        bootstrap=True,          # Bootstrap sampling
        random_state=42,         # Reproducible results
        n_jobs=-1,               # Use all CPU cores
        verbose=0,
        max_samples=0.8          # Use 80% of data per tree (regularization)
    )
    
    print(f"\nModel Configuration:")
    print(f"  - Number of trees: {rf_model.n_estimators}")
    print(f"  - Split criterion: {rf_model.criterion}")
    print(f"  - Max features per split: {rf_model.max_features}")
    print(f"  - Bootstrap sampling: {rf_model.bootstrap}")
    
    rf_model.fit(X_train, y_train)
    
    # Predictions
    y_pred = rf_model.predict(X_test)
    
    # Accuracy
    accuracy = accuracy_score(y_test, y_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X_train, y_train, cv=5)
    
    # Feature importance
    feature_names = ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall']
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nRandom Forest Results:")
    print(f"Training Accuracy: {rf_model.score(X_train, y_train)*100:.2f}%")
    print(f"Testing Accuracy: {accuracy*100:.2f}%")
    print(f"Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (±{cv_scores.std()*2*100:.2f}%)")
    
    print(f"\nFeature Importance (Kaggle Dataset):")
    for idx, row in feature_importance.iterrows():
        bar = '█' * int(row['importance'] * 50)
        print(f"  {row['feature']:15s}: {bar} {row['importance']*100:.2f}%")
    
    return rf_model, accuracy

def evaluate_model(model, X_test, y_test, label_encoder, model_name):
    """Evaluate model performance"""
    print(f"\n" + "="*60)
    print(f"{model_name} - Detailed Evaluation")
    print("="*60)
    
    y_pred = model.predict(X_test)
    
    # Classification report
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Confusion Matrix
    print("\nConfusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

def save_model(rf_model, label_encoder, rf_accuracy):
    """Save trained Random Forest model"""
    print("\n" + "="*70)
    print("SAVING MODEL...")
    print("="*70)
    
    # Save Random Forest
    with open('random_forest_model.pkl', 'wb') as f:
        pickle.dump(rf_model, f)
    print("✓ Random Forest model saved: random_forest_model.pkl")
    
    # Save Label Encoder
    with open('label_encoder.pkl', 'wb') as f:
        pickle.dump(label_encoder, f)
    print("✓ Label Encoder saved: label_encoder.pkl")
    
    # Save model metadata
    metadata = {
        'model_name': 'Random Forest Classifier',
        'algorithm': 'Ensemble Learning (Bagging)',
        'library': 'scikit-learn',
        'accuracy': float(rf_accuracy),
        'dataset': 'Kaggle Crop Recommendation Dataset',
        'dataset_url': 'https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset',
        'dataset_license': 'CC0 Public Domain',
        'crops': label_encoder.classes_.tolist(),
        'features': ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall'],
        'n_estimators': 100,
        'random_state': 42
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("✓ Metadata saved: model_metadata.json")

def test_prediction(rf_model, label_encoder):
    """Test prediction with sample data"""
    print("\n" + "="*70)
    print("TESTING PREDICTIONS")
    print("="*70)
    
    # Sample test cases from Kaggle dataset ranges
    test_samples = [
        {'temp': 26, 'humidity': 80, 'soil': 70, 'pH': 6.5, 'rain': 200, 'expected': 'Rice'},
        {'temp': 20, 'humidity': 50, 'soil': 55, 'pH': 6.8, 'rain': 100, 'expected': 'Wheat'},
        {'temp': 28, 'humidity': 65, 'soil': 60, 'pH': 6.2, 'rain': 90, 'expected': 'Maize'},
        {'temp': 32, 'humidity': 55, 'soil': 45, 'pH': 7.5, 'rain': 50, 'expected': 'Cotton'},
    ]
    
    print("\nSample Predictions:")
    print("-" * 70)
    
    for i, sample in enumerate(test_samples, 1):
        X_test = [[sample['temp'], sample['humidity'], sample['soil'], sample['pH'], sample['rain']]]
        
        rf_pred = label_encoder.inverse_transform(rf_model.predict(X_test))[0]
        rf_proba = rf_model.predict_proba(X_test)[0]
        rf_confidence = max(rf_proba) * 100
        
        status = '✓' if rf_pred == sample['expected'] else '✗'
        
        print(f"\n{i}. Input: T={sample['temp']}°C, H={sample['humidity']}%, SM={sample['soil']}%, pH={sample['pH']}, R={sample['rain']}mm")
        print(f"   Expected: {sample['expected']}")
        print(f"   Predicted: {rf_pred} ({rf_confidence:.1f}% confidence) {status}")

def main():
    """Main training pipeline"""
    print("\n" + "="*70)
    print("🌾 KRISHI SAKHA - ML MODEL TRAINING PIPELINE")
    print("Dataset: Kaggle Crop Recommendation Dataset (CC0 Public Domain)")
    print("Algorithm: Random Forest Classifier (Scikit-learn)")
    print("="*70)
    
    # Change to ml directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Load data
    df = load_data()
    
    # Preprocess
    X, y, label_encoder = preprocess_data(df)
    
    # Split data (80% train, 20% test) with stratification
    print("\nSplitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    
    # Train Random Forest (ONLY MODEL)
    rf_model, rf_accuracy = train_random_forest(X_train, y_train, X_test, y_test)
    evaluate_model(rf_model, X_test, y_test, label_encoder, "Random Forest")
    
    # Save model
    save_model(rf_model, label_encoder, rf_accuracy)
    
    # Test predictions
    test_prediction(rf_model, label_encoder)
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)
    print(f"\n🏆 Model Performance: {rf_accuracy*100:.2f}% accuracy")
    print("\nModel saved as: random_forest_model.pkl")
    print("Ready for crop prediction in Krishi Sakha system!")

if __name__ == "__main__":
    main()
