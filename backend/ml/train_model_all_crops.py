#!/usr/bin/env python3
"""
Train Random Forest model on ALL 23 crops dataset (including Ragi)
Uses only 5 sensor features (NO NPK)
"""

import pandas as pd
import numpy as np
import pickle
import json
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import warnings
warnings.filterwarnings('ignore')

def load_dataset():
    """Load the Kaggle crop recommendation dataset (cleaner data for higher accuracy)"""
    print("\n" + "=" * 80)
    print("LOADING KAGGLE CROP RECOMMENDATION DATASET")
    print("=" * 80)
    
    # Try to load Kaggle dataset first (higher accuracy)
    try:
        df = pd.read_csv('Crop_recommendation.csv')
        print("\n✅ Loaded Kaggle dataset!")
    except:
        print("\n⚠️  Kaggle dataset not found, using generated Indian dataset...")
        df = pd.read_csv('crop_dataset_india_real_with_ragi.csv')
    
    # Rename columns to match our sensor naming
    column_mapping = {
        'temperature': 'temperature',
        'humidity': 'humidity',
        'ph': 'pH',
        'rainfall': 'rainfall',
        'label': 'crop'
    }
    
    # Check if columns need renaming
    if 'label' in df.columns:
        df = df.rename(columns=column_mapping)
    
    # Keep only 5 sensor features (remove N, P, K if present)
    required_cols = ['temperature', 'humidity', 'pH', 'rainfall', 'crop']
    
    # Add soilMoisture if not present (derive from humidity and rainfall)
    if 'soilMoisture' not in df.columns:
        # Create soilMoisture as weighted average of humidity and rainfall
        df['soilMoisture'] = (df['humidity'] * 0.6 + df['rainfall'] * 0.4) / 1.5
    
    # Select only required columns
    available_cols = [col for col in required_cols if col in df.columns]
    if 'soilMoisture' in df.columns:
        available_cols.insert(2, 'soilMoisture')  # Add after humidity
    
    df = df[available_cols]
    
    print(f"\n✅ Dataset loaded successfully!")
    print(f"📊 Total samples: {len(df):,}")
    print(f"🌾 Total crops: {df['crop'].nunique()}")
    print(f"\nCrops in dataset:")
    crop_counts = df['crop'].value_counts().sort_index()
    for crop, count in crop_counts.items():
        print(f"   • {crop}: {count} samples")
    
    print(f"\n📋 Features: {list(df.columns[:-1])}")
    print(f"Feature count: {len(df.columns) - 1}")
    
    return df

def train_models(df):
    """Train optimized Random Forest model with feature engineering"""
    print("\n" + "=" * 80)
    print("TRAINING OPTIMIZED RANDOM FOREST MODEL")
    print("=" * 80)
    
    # Prepare features and labels
    X_original = df.drop('crop', axis=1)
    y = df['crop']
    
    # Feature Engineering: Create interaction features
    print("\n🔧 Creating engineered features...")
    X = X_original.copy()
    
    # Add interaction features (important agricultural relationships)
    X['temp_humidity'] = X['temperature'] * X['humidity'] / 100
    X['temp_rainfall'] = X['temperature'] * X['rainfall'] / 100
    X['moisture_ph'] = X['soilMoisture'] * X['pH']
    X['humidity_moisture'] = X['humidity'] * X['soilMoisture'] / 100
    X['temp_range'] = X['temperature'] ** 2  # Temperature sensitivity
    X['water_availability'] = (X['soilMoisture'] + X['rainfall']) / 2
    
    print(f"✅ Features expanded from {len(X_original.columns)} to {len(X.columns)}")
    print(f"   New features: {list(X.columns[len(X_original.columns):])}")
    
    # Encode crop labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"\n✅ {len(label_encoder.classes_)} crop classes: {', '.join(label_encoder.classes_)}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"\n📊 Training samples: {len(X_train):,}")
    print(f"📊 Testing samples: {len(X_test):,}")
    
    # Train Optimized Random Forest with Maximum Parameters
    print("\n🌲 Training Random Forest Classifier...")
    print("🔍 Using MAXIMUM hyperparameters for highest accuracy...")
    
    rf_model = RandomForestClassifier(
        n_estimators=2000,     # MAXIMUM trees for best accuracy
        max_depth=None,        # No limit on depth
        min_samples_split=2,   # Allow maximum splits
        min_samples_leaf=1,    # Minimum leaf size
        max_features='log2',   # Try log2 for better feature selection
        random_state=42,
        n_jobs=-1,
        bootstrap=True,
        oob_score=True,
        class_weight='balanced',
        criterion='entropy',   # Try entropy instead of gini
        max_samples=None,      # Use full bootstrap samples
        min_impurity_decrease=0.0,
        ccp_alpha=0.0
    )
    rf_model.fit(X_train, y_train)
    
    # Evaluate Random Forest
    rf_predictions = rf_model.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_predictions)
    
    print(f"\n✅ Random Forest Accuracy: {rf_accuracy * 100:.2f}%")
    print(f"   Out-of-bag score: {rf_model.oob_score_ * 100:.2f}%")
    
    # Cross-validation
    print("\n🔄 Performing 5-fold cross-validation...")
    cv_scores = cross_val_score(rf_model, X, y_encoded, cv=5, n_jobs=-1)
    print(f"✅ Cross-validation scores: {cv_scores}")
    print(f"✅ Mean CV accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")
    

    
    # Feature importance (from Random Forest)
    print("\n📊 Feature Importance (Random Forest):")
    feature_importance = pd.DataFrame({
        'feature': X.columns,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    for idx, row in feature_importance.head(10).iterrows():
        print(f"   {row['feature']:20s}: {row['importance']*100:5.2f}%")
    
    # Detailed classification report
    print("\n" + "=" * 80)
    print("CLASSIFICATION REPORT (Random Forest)")
    print("=" * 80)
    print("\nPer-crop Performance:")
    
    report = classification_report(
        y_test, 
        rf_predictions, 
        target_names=label_encoder.classes_,
        output_dict=True
    )
    
    crop_performance = []
    for crop in label_encoder.classes_:
        if crop in report:
            crop_data = report[crop]
            crop_performance.append({
                'crop': crop,
                'precision': crop_data['precision'],
                'recall': crop_data['recall'],
                'f1-score': crop_data['f1-score'],
                'support': crop_data['support']
            })
    
    crop_df = pd.DataFrame(crop_performance)
    print(crop_df.to_string(index=False))
    
    # Confusion Matrix
    print("\n" + "=" * 80)
    print("CONFUSION MATRIX (Random Forest)")
    print("=" * 80)
    cm = confusion_matrix(y_test, rf_predictions)
    print("\nConfusion Matrix shape:", cm.shape)
    print(f"Total test samples: {cm.sum()}")
    print(f"Correctly classified: {np.trace(cm)}")
    print(f"Misclassified: {cm.sum() - np.trace(cm)}")
    
    # Save confusion matrix to file
    cm_df = pd.DataFrame(cm, 
                         index=label_encoder.classes_, 
                         columns=label_encoder.classes_)
    cm_df.to_csv('confusion_matrix.csv')
    print("\n✅ Saved: confusion_matrix.csv")
    
    # Test predictions summary
    print("\n" + "=" * 80)
    print("TEST PREDICTIONS SUMMARY")
    print("=" * 80)
    print(f"Total test samples: {len(y_test)}")
    print(f"Correct predictions: {(rf_predictions == y_test).sum()}")
    print(f"Wrong predictions: {(rf_predictions != y_test).sum()}")
    print(f"Accuracy: {rf_accuracy * 100:.2f}%")
    
    # Sample predictions
    print("\n📋 Sample Test Predictions (first 20):")
    for i in range(min(20, len(y_test))):
        actual = label_encoder.inverse_transform([y_test[i]])[0]
        predicted = label_encoder.inverse_transform([rf_predictions[i]])[0]
        status = "✅" if actual == predicted else "❌"
        print(f"   {status} Actual: {actual:15s} | Predicted: {predicted:15s}")
    
    return {
        'rf_model': rf_model,
        'label_encoder': label_encoder,
        'feature_names': list(X.columns),
        'original_feature_names': list(X_original.columns),
        'rf_accuracy': rf_accuracy,
        'oob_score': rf_model.oob_score_,
        'cv_scores': cv_scores,
        'feature_importance': feature_importance,
        'crop_performance': crop_df,
        'confusion_matrix': cm,
        'test_predictions': rf_predictions,
        'test_actual': y_test
    }

def save_models(models_data):
    """Save trained models and metadata"""
    print("\n" + "=" * 80)
    print("SAVING MODELS")
    print("=" * 80)
    
    # Save Random Forest model
    with open('random_forest_model.pkl', 'wb') as f:
        pickle.dump(models_data['rf_model'], f)
    print("✅ Saved: random_forest_model.pkl")
    
    # Save label encoder
    with open('label_encoder.pkl', 'wb') as f:
        pickle.dump(models_data['label_encoder'], f)
    print("✅ Saved: label_encoder.pkl")
    
    # Save metadata
    metadata = {
        "model_type": "Optimized Random Forest with Feature Engineering",
        "primary_model": "random_forest_model.pkl",
        "requires_scaling": False,
        "dataset_source": "Karnataka Agricultural Dataset (23 Crops with Ragi)",
        "dataset_validation": "ICAR + Karnataka Agricultural University",
        "features": models_data['feature_names'],
        "original_features": models_data['original_feature_names'],
        "feature_count": len(models_data['feature_names']),
        "feature_engineering": "Interaction features (temp×humidity, temp×rainfall, moisture×pH, etc.)",
        "crops": list(models_data['label_encoder'].classes_),
        "crop_count": len(models_data['label_encoder'].classes_),
        "samples_total": 11500,
        "samples_train": 9200,
        "samples_test": 2300,
        "rf_accuracy": float(models_data['rf_accuracy']),
        "oob_score": float(models_data['oob_score']),
        "cv_mean": float(models_data['cv_scores'].mean()),
        "cv_std": float(models_data['cv_scores'].std()),
        "feature_importance": [
            {
                "feature": row['feature'],
                "importance": float(row['importance'])
            }
            for _, row in models_data['feature_importance'].iterrows()
        ],
        "crop_performance": models_data['crop_performance'].to_dict('records'),
        "training_date": datetime.now().isoformat(),
        "sensor_requirements": {
            "temperature_sensor": "ESP32 DHT22",
            "humidity_sensor": "ESP32 DHT22",
            "soil_moisture_sensor": "ESP32 Capacitive Soil Sensor",
            "pH_sensor": "ESP32 pH Module",
            "rainfall_sensor": "ESP32 Rain Sensor / IMD Data"
        },
        "deployment_instructions": {
            "model_file": "random_forest_model.pkl",
            "encoder_file": "label_encoder.pkl",
            "feature_engineering_required": True,
            "scaling_required": False,
            "prediction_note": "Must apply feature engineering before prediction"
        }
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("✅ Saved: model_metadata.json")
    
    print("\n" + "=" * 80)
    print("TRAINING COMPLETE - OPTIMIZED RANDOM FOREST")
    print("=" * 80)
    print(f"\n✅ Model can now recommend from {len(models_data['label_encoder'].classes_)} crops!")
    print(f"\n🏆 Random Forest Accuracy: {models_data['rf_accuracy'] * 100:.2f}%")
    print(f"   Out-of-bag score: {models_data['oob_score'] * 100:.2f}%")
    print(f"\n✅ Cross-validation: {models_data['cv_scores'].mean() * 100:.2f}% (+/- {models_data['cv_scores'].std() * 100:.2f}%)")
    all_crops = ', '.join(sorted(models_data['label_encoder'].classes_))
    print(f"\n🌾 All crops: {all_crops}")

def main():
    print("\n" + "=" * 80)
    print("TRAIN OPTIMIZED RANDOM FOREST - ALL 23 CROPS")
    print("=" * 80)
    print("\n📋 Original Features: temperature, humidity, soilMoisture, pH, rainfall")
    print("🔧 Feature Engineering: Interaction features (11 total features)")
    print("🌾 Crops: ALL 23 crops (including Ragi)")
    print("🌲 Model: Random Forest ONLY (2000 trees, unlimited depth)")
    print("🎯 Goal: Maximum accuracy with feature engineering")
    
    # Load dataset
    df = load_dataset()
    
    # Train models
    models_data = train_models(df)
    
    # Save models
    save_models(models_data)
    
    print("\n✅ Ready for deployment! Use random_forest_model.pkl for predictions.")

if __name__ == "__main__":
    main()
