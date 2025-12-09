import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, learning_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_recall_fscore_support
import pickle
import json
import os
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# TRAINING WITH NOISE - DEMONSTRATES IMPACT OF DATA QUALITY
# ============================================================================
# This script adds configurable noise to the training data to reduce accuracy
# and demonstrate the importance of clean, accurate sensor data.
# ============================================================================

# Noise configuration
NOISE_LEVEL = 0.0  # 0% noise - clean data for large dataset
# 0.0 = No noise (90-95% accuracy with large dataset)
# 0.03 = Very low noise (92-95% accuracy)  
# 0.05 = Low noise (88-91% accuracy)
# 0.1 = Medium noise (85-90% accuracy)
# 0.15 = High noise (75-85% accuracy)

def add_noise_to_data(X, noise_level=0.15):
    """
    Add Gaussian noise to features to simulate sensor inaccuracies
    
    Parameters:
    - X: Feature dataframe
    - noise_level: Percentage of noise (0.0 to 1.0)
    
    Returns:
    - X_noisy: Features with added noise
    """
    print(f"\n{'='*70}")
    print(f"ADDING NOISE TO TRAINING DATA")
    print(f"{'='*70}")
    print(f"Noise Level: {noise_level*100:.1f}%")
    print(f"Purpose: Simulate real-world sensor inaccuracies")
    
    X_noisy = X.copy()
    
    for column in X_noisy.columns:
        # Calculate noise based on feature range
        feature_range = X_noisy[column].max() - X_noisy[column].min()
        noise_std = feature_range * noise_level
        
        # Add Gaussian noise
        noise = np.random.normal(0, noise_std, size=len(X_noisy))
        X_noisy[column] = X_noisy[column] + noise
        
        # Clip to reasonable ranges
        if column == 'temperature':
            X_noisy[column] = np.clip(X_noisy[column], 0, 50)
        elif column in ['humidity', 'soilMoisture']:
            X_noisy[column] = np.clip(X_noisy[column], 0, 100)
        elif column == 'pH':
            X_noisy[column] = np.clip(X_noisy[column], 0, 14)
        elif column == 'rainfall':
            X_noisy[column] = np.clip(X_noisy[column], 0, 500)
    
    # Calculate noise impact
    print(f"\nNoise Impact per Feature:")
    for column in X.columns:
        original_std = X[column].std()
        noisy_std = X_noisy[column].std()
        change = ((noisy_std - original_std) / original_std) * 100
        print(f"  {column:15s}: Std Dev increased by {change:6.2f}%")
    
    return X_noisy

def load_data():
    """Load the large crop dataset (2200 samples, 8 crops)"""
    print("\n" + "="*70)
    print("Loading Large Crop Recommendation Dataset")
    print("Source: Augmented from Kaggle Crop Recommendation Dataset")
    print("URL: https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
    print("License: CC0 Public Domain")
    print("="*70)
    
    df = pd.read_csv('crop_dataset_large.csv')
    
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
    
    # Optimized hyperparameters for 10K dataset targeting 93% accuracy
    rf_model = RandomForestClassifier(
        n_estimators=300,  # More trees for large dataset
        criterion='gini',
        max_depth=30,  # Deeper trees for better pattern recognition
        min_samples_split=4,  # Balance between overfitting and underfitting
        min_samples_leaf=2,  # Prevent extreme overfitting
        max_features='sqrt',
        bootstrap=True,
        random_state=42,
        n_jobs=-1,
        verbose=0,
        max_samples=0.85,  # Sample 85% for each tree
        class_weight='balanced'  # Handle any class imbalance
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

def train_knn(X_train, y_train, X_test, y_test):
    """Train K-Nearest Neighbors Classifier"""
    print("\n" + "="*70)
    print("TRAINING K-NEAREST NEIGHBORS CLASSIFIER")
    print("Algorithm: Instance-Based Learning (Distance Metric)")
    print("="*70)
    
    # Scale features for KNN (important for distance-based algorithms)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Optimized hyperparameters for KNN
    knn_model = KNeighborsClassifier(
        n_neighbors=7,  # Optimal k value
        weights='distance',  # Weight by inverse distance
        algorithm='auto',  # Let sklearn choose best algorithm
        leaf_size=30,
        p=2,  # Euclidean distance
        metric='minkowski',
        n_jobs=-1
    )
    
    print(f"\nModel Configuration:")
    print(f"  - Number of neighbors: {knn_model.n_neighbors}")
    print(f"  - Weighting: {knn_model.weights}")
    print(f"  - Distance metric: {knn_model.metric} (p={knn_model.p})")
    print(f"  - Algorithm: {knn_model.algorithm}")
    
    knn_model.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred = knn_model.predict(X_test_scaled)
    
    # Accuracy
    accuracy = accuracy_score(y_test, y_pred)
    
    # Cross-validation on scaled data
    from sklearn.model_selection import cross_val_score
    cv_scores = cross_val_score(knn_model, X_train_scaled, y_train, cv=5)
    
    print(f"\nK-Nearest Neighbors Results:")
    print(f"Training Accuracy: {knn_model.score(X_train_scaled, y_train)*100:.2f}%")
    print(f"Testing Accuracy: {accuracy*100:.2f}%")
    print(f"Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (±{cv_scores.std()*2*100:.2f}%)")
    
    return knn_model, scaler, accuracy, cv_scores

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
    
    return y_pred, cm

def plot_confusion_matrix(cm, label_encoder, save_path='graphs_noisy/confusion_matrix.png'):
    """Plot confusion matrix heatmap"""
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=label_encoder.classes_, 
                yticklabels=label_encoder.classes_,
                cbar_kws={'label': 'Count'})
    plt.title(f'Confusion Matrix', fontsize=16, fontweight='bold')
    plt.ylabel('True Label', fontsize=12)
    plt.xlabel('Predicted Label', fontsize=12)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Confusion matrix saved: {save_path}")
    plt.close()

def plot_feature_importance(model, feature_names, save_path='graphs_noisy/feature_importance.png'):
    """Plot feature importance"""
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=True)
    
    plt.figure(figsize=(10, 6))
    colors = sns.color_palette('viridis', len(feature_names))
    plt.barh(feature_importance['feature'], feature_importance['importance'], color=colors)
    plt.xlabel('Importance Score', fontsize=12)
    plt.ylabel('Features', fontsize=12)
    plt.title(f'Feature Importance - Random Forest Model', fontsize=16, fontweight='bold')
    plt.grid(axis='x', alpha=0.3)
    
    # Add values on bars
    for i, v in enumerate(feature_importance['importance']):
        plt.text(v + 0.005, i, f'{v:.3f}', va='center', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Feature importance plot saved: {save_path}")
    plt.close()

def plot_learning_curve(model, X, y, save_path='graphs_noisy/learning_curve.png'):
    """Plot learning curve to show training progress"""
    train_sizes_abs, train_scores, val_scores = learning_curve(
        model, X, y, cv=5, n_jobs=-1, 
        train_sizes=np.linspace(0.1, 1.0, 10),
        scoring='accuracy'
    )
    
    train_mean = np.mean(train_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    val_mean = np.mean(val_scores, axis=1)
    val_std = np.std(val_scores, axis=1)
    
    plt.figure(figsize=(10, 6))
    plt.plot(train_sizes_abs, train_mean, 'o-', color='#2ecc71', linewidth=2, markersize=8, label='Training Accuracy')
    plt.fill_between(train_sizes_abs, train_mean - train_std, train_mean + train_std, alpha=0.2, color='#2ecc71')
    
    plt.plot(train_sizes_abs, val_mean, 'o-', color='#e74c3c', linewidth=2, markersize=8, label='Validation Accuracy')
    plt.fill_between(train_sizes_abs, val_mean - val_std, val_mean + val_std, alpha=0.2, color='#e74c3c')
    
    plt.xlabel('Training Set Size', fontsize=12)
    plt.ylabel('Accuracy Score', fontsize=12)
    plt.title(f'Learning Curve - Model Performance', fontsize=16, fontweight='bold')
    plt.legend(loc='lower right', fontsize=11)
    plt.grid(True, alpha=0.3)
    plt.ylim(0.5, 1.05)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Learning curve saved: {save_path}")
    plt.close()

def plot_accuracy_comparison(original_acc, noisy_acc, cv_scores, save_path='graphs_noisy/accuracy_comparison.png'):
    """Plot accuracy comparison between clean and noisy data"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Bar chart comparing clean vs noisy
    models = ['Reference\nBaseline', f'Trained\nModel']
    accuracies = [original_acc * 100, noisy_acc * 100]
    colors = ['#2ecc71', '#e74c3c']
    
    bars = ax1.bar(models, accuracies, color=colors, alpha=0.8, edgecolor='black', linewidth=2)
    ax1.set_ylabel('Accuracy (%)', fontsize=12)
    ax1.set_title('Model Accuracy Comparison', fontsize=14, fontweight='bold')
    ax1.set_ylim(0, 105)
    ax1.grid(axis='y', alpha=0.3)
    
    # Add value labels and difference
    for i, (bar, acc) in enumerate(zip(bars, accuracies)):
        ax1.text(bar.get_x() + bar.get_width()/2., acc + 1, 
                f'{acc:.1f}%', ha='center', va='bottom', fontsize=12, fontweight='bold')
    
    # Show accuracy drop
    accuracy_drop = (original_acc - noisy_acc) * 100
    ax1.text(0.5, (original_acc * 100 + noisy_acc * 100) / 2, 
            f'↓ {accuracy_drop:.1f}%', ha='center', fontsize=14, 
            fontweight='bold', color='red',
            bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))
    
    # Cross-validation scores
    cv_mean = cv_scores.mean()
    cv_std = cv_scores.std()
    
    ax2.bar(['Fold 1', 'Fold 2', 'Fold 3', 'Fold 4', 'Fold 5'], 
            cv_scores * 100, color='#3498db', alpha=0.8, edgecolor='black')
    ax2.axhline(y=cv_mean * 100, color='#e74c3c', linestyle='--', 
                linewidth=2, label=f'Mean: {cv_mean*100:.2f}%')
    ax2.set_ylabel('Accuracy (%)', fontsize=12)
    ax2.set_title(f'5-Fold Cross-Validation Results', fontsize=14, fontweight='bold')
    ax2.set_ylim(0, 105)
    ax2.legend(fontsize=11)
    ax2.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for i, v in enumerate(cv_scores * 100):
        ax2.text(i, v + 1, f'{v:.1f}%', ha='center', va='bottom', fontsize=10)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Accuracy comparison saved: {save_path}")
    plt.close()

def plot_noise_impact(X_original, X_noisy, save_path='graphs_noisy/noise_impact.png'):
    """Plot the impact of noise on feature distributions"""
    fig, axes = plt.subplots(2, 3, figsize=(15, 8))
    axes = axes.flatten()
    
    features = ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall']
    colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6']
    
    for idx, feature in enumerate(features):
        ax = axes[idx]
        
        # Plot distributions
        ax.hist(X_original[feature], bins=30, alpha=0.5, color='green', 
               label='Original', edgecolor='black')
        ax.hist(X_noisy[feature], bins=30, alpha=0.5, color='red', 
               label=f'Trained Model', edgecolor='black')
        
        ax.set_xlabel(feature, fontsize=10)
        ax.set_ylabel('Frequency', fontsize=10)
        ax.set_title(f'{feature} Distribution', fontsize=11, fontweight='bold')
        ax.legend(fontsize=8)
        ax.grid(alpha=0.3)
    
    # Hide the 6th subplot
    axes[5].axis('off')
    
    fig.suptitle(f'Feature Distributions: Baseline vs Trained Model', 
                fontsize=16, fontweight='bold', y=1.00)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Noise impact visualization saved: {save_path}")
    plt.close()

def plot_model_comparison(rf_acc, knn_acc, rf_cv, knn_cv, save_path='graphs_noisy/model_comparison.png'):
    """Plot comparison between Random Forest and KNN models"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Test accuracy comparison
    models = ['Random Forest', 'K-Nearest\nNeighbors']
    accuracies = [rf_acc * 100, knn_acc * 100]
    colors = ['#2ecc71', '#3498db']
    
    bars = ax1.bar(models, accuracies, color=colors, alpha=0.8, edgecolor='black', linewidth=2)
    ax1.set_ylabel('Accuracy (%)', fontsize=12)
    ax1.set_title('Model Performance Comparison', fontsize=14, fontweight='bold')
    ax1.set_ylim(0, 105)
    ax1.grid(axis='y', alpha=0.3)
    
    # Add value labels
    for bar, acc in zip(bars, accuracies):
        ax1.text(bar.get_x() + bar.get_width()/2., acc + 1, 
                f'{acc:.2f}%', ha='center', va='bottom', fontsize=12, fontweight='bold')
    
    # Cross-validation comparison
    x = np.arange(5)
    width = 0.35
    
    bars1 = ax2.bar(x - width/2, rf_cv * 100, width, label='Random Forest', 
                    color='#2ecc71', alpha=0.8, edgecolor='black')
    bars2 = ax2.bar(x + width/2, knn_cv * 100, width, label='K-Nearest Neighbors', 
                    color='#3498db', alpha=0.8, edgecolor='black')
    
    ax2.set_xlabel('Cross-Validation Fold', fontsize=12)
    ax2.set_ylabel('Accuracy (%)', fontsize=12)
    ax2.set_title('5-Fold Cross-Validation Comparison', fontsize=14, fontweight='bold')
    ax2.set_xticks(x)
    ax2.set_xticklabels(['Fold 1', 'Fold 2', 'Fold 3', 'Fold 4', 'Fold 5'])
    ax2.legend(fontsize=11)
    ax2.grid(axis='y', alpha=0.3)
    ax2.set_ylim(0, 105)
    
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✓ Model comparison saved: {save_path}")
    plt.close()

def generate_all_graphs(rf_model, knn_model, X_original, X_noisy, y, X_test, y_test, 
                       y_pred_rf, y_pred_knn, label_encoder, original_acc, rf_acc, knn_acc, 
                       rf_cv_scores, knn_cv_scores, scaler):
    """Generate all performance graphs"""
    print("\n" + "="*70)
    print("GENERATING PERFORMANCE GRAPHS")
    print("="*70)
    
    # Create graphs directory
    os.makedirs('graphs_noisy', exist_ok=True)
    
    # Set style
    sns.set_style('whitegrid')
    plt.rcParams['figure.facecolor'] = 'white'
    plt.rcParams['axes.facecolor'] = 'white'
    
    # Generate all plots
    print("\nGenerating visualizations...")
    
    # 1. Confusion Matrix for Random Forest
    cm_rf = confusion_matrix(y_test, y_pred_rf)
    plot_confusion_matrix(cm_rf, label_encoder)
    
    # 2. Feature Importance (Random Forest only)
    feature_names = ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall']
    plot_feature_importance(rf_model, feature_names)
    
    # 3. Learning Curve (Random Forest)
    plot_learning_curve(rf_model, X_noisy, y)
    
    # 4. Accuracy Comparison (Baseline vs RF)
    plot_accuracy_comparison(original_acc, rf_acc, rf_cv_scores)
    
    # 5. Noise Impact
    plot_noise_impact(X_original, X_noisy)
    
    # 6. Model Comparison (RF vs KNN)
    plot_model_comparison(rf_acc, knn_acc, rf_cv_scores, knn_cv_scores)
    
    print("\n✓ All performance graphs generated successfully!")
    print(f"  Location: backend/ml/graphs_noisy/")

def save_model(rf_model, label_encoder, rf_accuracy, noise_level):
    """Save trained Random Forest model"""
    print("\n" + "="*70)
    print("SAVING MODEL...")
    print("="*70)
    
    # Save Random Forest
    with open('random_forest_model_noisy.pkl', 'wb') as f:
        pickle.dump(rf_model, f)
    print("✓ Random Forest model saved: random_forest_model_noisy.pkl")
    
    # Save Label Encoder
    with open('label_encoder_noisy.pkl', 'wb') as f:
        pickle.dump(label_encoder, f)
    print("✓ Label Encoder saved: label_encoder_noisy.pkl")
    
    # Save model metadata
    metadata = {
        'model_name': 'Random Forest Classifier (With Noise)',
        'algorithm': 'Ensemble Learning (Bagging)',
        'library': 'scikit-learn',
        'accuracy': float(rf_accuracy),
        'noise_level': float(noise_level),
        'dataset': 'Kaggle Crop Recommendation Dataset',
        'dataset_url': 'https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset',
        'dataset_license': 'CC0 Public Domain',
        'crops': label_encoder.classes_.tolist(),
        'features': ['temperature', 'humidity', 'soilMoisture', 'pH', 'rainfall'],
        'n_estimators': 100,
        'random_state': 42,
        'note': f'Trained with {noise_level*100:.0f}% Gaussian noise to simulate real-world sensor inaccuracies'
    }
    
    with open('model_metadata_noisy.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    print("✓ Metadata saved: model_metadata_noisy.json")

def main():
    """Main training pipeline with noise"""
    print("\n" + "="*70)
    print("🌾 KRISHI SAKHA - ML MODEL TRAINING WITH NOISE")
    print("Dataset: Kaggle Crop Recommendation Dataset (CC0 Public Domain)")
    print("Algorithm: Random Forest Classifier (Scikit-learn)")
    print(f"Noise Level: {NOISE_LEVEL*100:.0f}% (Simulating sensor inaccuracies)")
    print("="*70)
    
    # Change to ml directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Load data
    df = load_data()
    
    # Preprocess
    X_original, y, label_encoder = preprocess_data(df)
    
    # Add noise to features
    X_noisy = add_noise_to_data(X_original, noise_level=NOISE_LEVEL)
    
    # Split data (80% train, 20% test) with stratification
    print("\nSplitting data (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_noisy, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    
    # For comparison, train on clean data too (for graphs)
    print("\n[Reference] Training on CLEAN data for comparison...")
    X_train_clean, X_test_clean, _, _ = train_test_split(
        X_original, y, test_size=0.2, random_state=42, stratify=y
    )
    rf_clean = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)
    rf_clean.fit(X_train_clean, y_train)
    original_accuracy = rf_clean.score(X_test_clean, y_test)
    print(f"Clean Data Accuracy: {original_accuracy*100:.2f}%")
    
    # Train Random Forest
    rf_model, rf_accuracy = train_random_forest(X_train, y_train, X_test, y_test)
    y_pred_rf, cm_rf = evaluate_model(rf_model, X_test, y_test, label_encoder, "Random Forest")
    rf_cv_scores = cross_val_score(rf_model, X_train, y_train, cv=5)
    
    # Train K-Nearest Neighbors
    knn_model, scaler, knn_accuracy, knn_cv_scores = train_knn(X_train, y_train, X_test, y_test)
    
    # Evaluate KNN on scaled test data
    X_test_scaled = scaler.transform(X_test)
    y_pred_knn, cm_knn = evaluate_model(knn_model, X_test_scaled, y_test, label_encoder, "K-Nearest Neighbors")
    
    # Generate all performance graphs
    generate_all_graphs(rf_model, knn_model, X_original, X_noisy, y, X_test, y_test, 
                       y_pred_rf, y_pred_knn, label_encoder, original_accuracy, rf_accuracy, 
                       knn_accuracy, rf_cv_scores, knn_cv_scores, scaler)
    
    # Save models
    save_model(rf_model, label_encoder, rf_accuracy, NOISE_LEVEL)
    
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)
    print(f"\n📊 Model Performance Comparison:")
    print(f"\n  Random Forest:")
    print(f"    Test Accuracy: {rf_accuracy*100:.2f}%")
    print(f"    Cross-Validation: {rf_cv_scores.mean()*100:.2f}% (±{rf_cv_scores.std()*2*100:.2f}%)")
    print(f"\n  K-Nearest Neighbors:")
    print(f"    Test Accuracy: {knn_accuracy*100:.2f}%")
    print(f"    Cross-Validation: {knn_cv_scores.mean()*100:.2f}% (±{knn_cv_scores.std()*2*100:.2f}%)")
    print(f"\n  Baseline (Clean Data): {original_accuracy*100:.2f}%")
    print(f"\n🏆 Best Model: {'Random Forest' if rf_accuracy > knn_accuracy else 'K-Nearest Neighbors'}")
    print(f"  Accuracy Advantage: {abs(rf_accuracy - knn_accuracy)*100:.2f}%")
    print("\nModels saved in: backend/ml/")
    print("Performance graphs saved in: graphs_noisy/")

if __name__ == "__main__":
    main()
