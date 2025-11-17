import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import json
import os

# Dataset Information:
# This dataset is based on standard agricultural crop recommendation datasets
# similar to the Crop Recommendation Dataset from Kaggle and UCI Machine Learning Repository.
# Data is curated from agricultural research standards including:
# - FAO (Food and Agriculture Organization) crop water requirements
# - IRRI (International Rice Research Institute) guidelines
# - USDA (United States Department of Agriculture) soil pH standards
# - Agricultural universities research data on optimal growing conditions
#
# Total Samples: 520
# Features: temperature (°C), humidity (%), soilMoisture (%), pH, rainfall (mm)
# Crops: Rice, Wheat, Maize, Cotton, Sugarcane, Tomato, Potato, Soybean

def load_data():
    """Load the crop dataset"""
    print("Loading enhanced crop recommendation dataset...")
    print("Source: Based on standard agricultural datasets from FAO, IRRI, USDA")
    df = pd.read_csv('crop_dataset.csv')
    print(f"\nDataset loaded successfully!")
    print(f"  Total samples: {len(df)}")
    print(f"  Number of crops: {len(df['crop'].unique())}")
    print(f"  Crops: {', '.join(df['crop'].unique())}")
    print(f"\nSamples per crop:")
    for crop in sorted(df['crop'].unique()):
        count = len(df[df['crop'] == crop])
        print(f"  {crop}: {count} samples")
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

def train_decision_tree(X_train, y_train, X_test, y_test):
    """Train Decision Tree Classifier with optimized hyperparameters"""
    print("\n" + "="*60)
    print("Training Decision Tree Classifier...")
    print("="*60)
    
    # Hyperparameter tuning
    param_grid = {
        'max_depth': [10, 15, 20],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
    
    dt_base = DecisionTreeClassifier(
        criterion='gini',
        random_state=42
    )
    
    print("Performing GridSearchCV for hyperparameter tuning...")
    grid_search = GridSearchCV(
        dt_base, 
        param_grid, 
        cv=5, 
        scoring='accuracy',
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)
    
    print(f"Best parameters: {grid_search.best_params_}")
    
    dt_model = grid_search.best_estimator_
    
    # Predictions
    y_pred = dt_model.predict(X_test)
    
    # Accuracy
    accuracy = accuracy_score(y_test, y_pred)
    
    # Cross-validation
    cv_scores = cross_val_score(dt_model, X_train, y_train, cv=5)
    
    print(f"\nDecision Tree Results:")
    print(f"Training Accuracy: {dt_model.score(X_train, y_train)*100:.2f}%")
    print(f"Testing Accuracy: {accuracy*100:.2f}%")
    print(f"Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*2*100:.2f}%)")
    
    return dt_model, accuracy

def train_random_forest(X_train, y_train, X_test, y_test):
    """Train Random Forest Classifier with optimized hyperparameters"""
    print("\n" + "="*60)
    print("Training Random Forest Classifier...")
    print("="*60)
    
    # Optimized hyperparameters for crop recommendation
    rf_model = RandomForestClassifier(
        n_estimators=200,
        criterion='gini',
        max_depth=20,
        min_samples_split=3,
        min_samples_leaf=1,
        max_features='sqrt',
        bootstrap=True,
        random_state=42,
        n_jobs=-1
    )
    
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
    print(f"Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*2*100:.2f}%)")
    
    print(f"\nFeature Importance (Most to Least Important):")
    for idx, row in feature_importance.iterrows():
        print(f"  {row['feature']}: {row['importance']*100:.2f}%")
    
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

def save_models(dt_model, rf_model, label_encoder, dt_accuracy, rf_accuracy):
    """Save trained models"""
    print("\n" + "="*60)
    print("Saving Models...")
    print("="*60)
    
    # Save Decision Tree
    with open('decision_tree_model.pkl', 'wb') as f:
        pickle.dump(dt_model, f)
    print("✓ Decision Tree model saved: decision_tree_model.pkl")
    
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
        'decision_tree_accuracy': float(dt_accuracy),
        'random_forest_accuracy': float(rf_accuracy),
        'crops': label_encoder.classes_.tolist(),
        'features': ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall']
    }
    
    with open('model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("✓ Metadata saved: model_metadata.json")

def test_prediction(dt_model, rf_model, label_encoder):
    """Test prediction with sample data"""
    print("\n" + "="*60)
    print("Testing Predictions")
    print("="*60)
    
    # Sample test cases
    test_samples = [
        {'temp': 28, 'humidity': 70, 'soil': 75, 'pH': 6.2, 'rain': 180, 'expected': 'Rice'},
        {'temp': 20, 'humidity': 45, 'soil': 55, 'pH': 6.8, 'rain': 80, 'expected': 'Wheat'},
        {'temp': 30, 'humidity': 60, 'soil': 65, 'pH': 6.0, 'rain': 120, 'expected': 'Maize'},
        {'temp': 32, 'humidity': 55, 'soil': 45, 'pH': 7.5, 'rain': 50, 'expected': 'Cotton'},
    ]
    
    for sample in test_samples:
        X_test = [[sample['temp'], sample['humidity'], sample['soil'], sample['pH'], sample['rain']]]
        
        dt_pred = label_encoder.inverse_transform(dt_model.predict(X_test))[0]
        rf_pred = label_encoder.inverse_transform(rf_model.predict(X_test))[0]
        
        print(f"\nInput: T={sample['temp']}°C, H={sample['humidity']}%, S={sample['soil']}%, pH={sample['pH']}, R={sample['rain']}mm")
        print(f"Expected: {sample['expected']}")
        print(f"Decision Tree: {dt_pred} {'✓' if dt_pred == sample['expected'] else '✗'}")
        print(f"Random Forest: {rf_pred} {'✓' if rf_pred == sample['expected'] else '✗'}")

def main():
    """Main training pipeline"""
    print("\n" + "="*60)
    print("CROP RECOMMENDATION ML MODEL TRAINING")
    print("Dataset: Standard Agricultural Data (FAO, IRRI, USDA)")
    print("="*60)
    
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
    
    # Train Decision Tree with hyperparameter tuning
    dt_model, dt_accuracy = train_decision_tree(X_train, y_train, X_test, y_test)
    evaluate_model(dt_model, X_test, y_test, label_encoder, "Decision Tree")
    
    # Train Random Forest
    rf_model, rf_accuracy = train_random_forest(X_train, y_train, X_test, y_test)
    evaluate_model(rf_model, X_test, y_test, label_encoder, "Random Forest")
    
    # Compare models
    print("\n" + "="*60)
    print("MODEL COMPARISON")
    print("="*60)
    print(f"Decision Tree Accuracy: {dt_accuracy*100:.2f}%")
    print(f"Random Forest Accuracy: {rf_accuracy*100:.2f}%")
    
    improvement = abs(rf_accuracy - dt_accuracy) * 100
    if rf_accuracy > dt_accuracy:
        print(f"\n✓ Random Forest performs better by {improvement:.2f}%")
        print("  Recommended model: Random Forest")
    else:
        print(f"\n✓ Decision Tree performs better by {improvement:.2f}%")
        print("  Recommended model: Decision Tree")
    
    # Save models
    save_models(dt_model, rf_model, label_encoder, dt_accuracy, rf_accuracy)
    
    # Test predictions
    test_prediction(dt_model, rf_model, label_encoder)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print("\nModels are ready for deployment in the crop recommendation system.")
    print("The backend will use these models for accurate crop predictions.")

if __name__ == "__main__":
    main()
