import pandas as pd
import numpy as np
from datetime import datetime

"""
Generate a large crop recommendation dataset (2200 samples)
by augmenting the existing dataset with realistic variations
"""

print("\n" + "="*70)
print("🌾 GENERATING LARGE CROP DATASET")
print("="*70)

# Load existing dataset
df_original = pd.read_csv('crop_dataset.csv')
print(f"\n✓ Original dataset loaded: {len(df_original)} samples")
print(f"  Crops: {df_original['crop'].unique()}")

# Target number of samples
TARGET_SAMPLES = 10000
samples_per_crop = TARGET_SAMPLES // len(df_original['crop'].unique())

print(f"\n📊 Target: {TARGET_SAMPLES} samples ({samples_per_crop} per crop)")

# Define crop-specific ranges for realistic augmentation
crop_ranges = {
    'Rice': {
        'temperature': (20, 35),
        'humidity': (75, 95),
        'soilMoisture': (65, 85),
        'pH': (5.5, 7.0),
        'rainfall': (150, 300)
    },
    'Wheat': {
        'temperature': (12, 25),
        'humidity': (55, 75),
        'soilMoisture': (45, 65),
        'pH': (6.0, 7.5),
        'rainfall': (50, 150)
    },
    'Maize': {
        'temperature': (18, 35),
        'humidity': (55, 75),
        'soilMoisture': (50, 70),
        'pH': (5.5, 7.0),
        'rainfall': (50, 150)
    },
    'Cotton': {
        'temperature': (25, 40),
        'humidity': (45, 65),
        'soilMoisture': (35, 55),
        'pH': (6.5, 8.5),
        'rainfall': (50, 100)
    },
    'Sugarcane': {
        'temperature': (25, 40),
        'humidity': (70, 90),
        'soilMoisture': (70, 90),
        'pH': (6.0, 7.5),
        'rainfall': (150, 300)
    },
    'Tomato': {
        'temperature': (18, 30),
        'humidity': (60, 80),
        'soilMoisture': (55, 75),
        'pH': (5.8, 7.0),
        'rainfall': (50, 150)
    },
    'Potato': {
        'temperature': (15, 25),
        'humidity': (65, 85),
        'soilMoisture': (65, 85),
        'pH': (5.0, 6.5),
        'rainfall': (75, 150)
    },
    'Soybean': {
        'temperature': (20, 35),
        'humidity': (60, 75),
        'soilMoisture': (55, 75),
        'pH': (6.0, 7.5),
        'rainfall': (50, 150)
    }
}

# Generate augmented dataset
augmented_data = []

for crop in df_original['crop'].unique():
    print(f"\n  Generating {samples_per_crop} samples for {crop}...")
    
    # Get original samples for this crop
    crop_data = df_original[df_original['crop'] == crop]
    
    # Get crop ranges
    ranges = crop_ranges[crop]
    
    for i in range(samples_per_crop):
        if i < len(crop_data) * 10:
            # Use original sample with minimal variation (first 10x original samples)
            base_sample = crop_data.iloc[i % len(crop_data)]
            variation = 0.015  # Only 1.5% variation for very tight clustering
            
            sample = {
                'temperature': base_sample['temperature'] + np.random.uniform(-variation * base_sample['temperature'], variation * base_sample['temperature']),
                'humidity': base_sample['humidity'] + np.random.uniform(-variation * base_sample['humidity'], variation * base_sample['humidity']),
                'soilMoisture': base_sample['soilMoisture'] + np.random.uniform(-variation * base_sample['soilMoisture'], variation * base_sample['soilMoisture']),
                'pH': base_sample['pH'] + np.random.uniform(-0.3, 0.3),
                'rainfall': base_sample['rainfall'] + np.random.uniform(-variation * base_sample['rainfall'], variation * base_sample['rainfall']),
                'crop': crop
            }
        else:
            # Generate new synthetic sample with tighter ranges
            temp_center = (ranges['temperature'][0] + ranges['temperature'][1]) / 2
            hum_center = (ranges['humidity'][0] + ranges['humidity'][1]) / 2
            soil_center = (ranges['soilMoisture'][0] + ranges['soilMoisture'][1]) / 2
            ph_center = (ranges['pH'][0] + ranges['pH'][1]) / 2
            rain_center = (ranges['rainfall'][0] + ranges['rainfall'][1]) / 2
            
            # Use 60% of the range (tighter clustering)
            temp_range = (ranges['temperature'][1] - ranges['temperature'][0]) * 0.6
            hum_range = (ranges['humidity'][1] - ranges['humidity'][0]) * 0.6
            soil_range = (ranges['soilMoisture'][1] - ranges['soilMoisture'][0]) * 0.6
            ph_range = (ranges['pH'][1] - ranges['pH'][0]) * 0.6
            rain_range = (ranges['rainfall'][1] - ranges['rainfall'][0]) * 0.6
            
            sample = {
                'temperature': np.random.uniform(temp_center - temp_range/2, temp_center + temp_range/2),
                'humidity': np.random.uniform(hum_center - hum_range/2, hum_center + hum_range/2),
                'soilMoisture': np.random.uniform(soil_center - soil_range/2, soil_center + soil_range/2),
                'pH': np.random.uniform(ph_center - ph_range/2, ph_center + ph_range/2),
                'rainfall': np.random.uniform(rain_center - rain_range/2, rain_center + rain_range/2),
                'crop': crop
            }
        
        # Clip values to realistic ranges
        sample['temperature'] = round(np.clip(sample['temperature'], 10, 45), 1)
        sample['humidity'] = round(np.clip(sample['humidity'], 40, 100), 1)
        sample['soilMoisture'] = round(np.clip(sample['soilMoisture'], 30, 100), 1)
        sample['pH'] = round(np.clip(sample['pH'], 4.5, 9.0), 1)
        sample['rainfall'] = round(np.clip(sample['rainfall'], 20, 350), 1)
        
        augmented_data.append(sample)

# Create dataframe
df_large = pd.DataFrame(augmented_data)

# Shuffle the dataset
df_large = df_large.sample(frac=1, random_state=42).reset_index(drop=True)

# Save to CSV
output_file = 'crop_dataset_large.csv'
df_large.to_csv(output_file, index=False)

print(f"\n{'='*70}")
print(f"✅ LARGE DATASET GENERATED SUCCESSFULLY!")
print(f"{'='*70}")
print(f"\n📊 Dataset Statistics:")
print(f"  Total samples: {len(df_large)}")
print(f"  Features: {', '.join(df_large.columns[:-1])}")
print(f"  Target: {df_large.columns[-1]}")
print(f"\n  Samples per crop:")
for crop in sorted(df_large['crop'].unique()):
    count = len(df_large[df_large['crop'] == crop])
    print(f"    {crop:12s}: {count:4d} samples ({count/len(df_large)*100:.1f}%)")

print(f"\n  Feature ranges:")
for col in df_large.columns[:-1]:
    print(f"    {col:15s}: {df_large[col].min():.1f} - {df_large[col].max():.1f}")

print(f"\n  Saved to: {output_file}")
print(f"  File size: {len(df_large) * len(df_large.columns)} values")

print(f"\n{'='*70}")
print("Next: Run train_model_with_noise.py with the large dataset")
print("="*70)
