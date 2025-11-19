import pickle
import json
import os
import sys

def load_models():
    """Load trained Random Forest model"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        with open(os.path.join(script_dir, 'random_forest_model.pkl'), 'rb') as f:
            rf_model = pickle.load(f)
        
        with open(os.path.join(script_dir, 'label_encoder.pkl'), 'rb') as f:
            label_encoder = pickle.load(f)
        
        with open(os.path.join(script_dir, 'model_metadata.json'), 'r') as f:
            metadata = json.load(f)
        
        return rf_model, label_encoder, metadata
    except FileNotFoundError as e:
        print(f"Error: Model files not found. Please run train_model.py first.")
        print(f"Missing file: {e.filename}")
        return None, None, None

def predict_crop(temperature, humidity, soilMoisture, pH, rainfall=100):
    """Predict best crop using Random Forest ML model"""
    
    # Load model
    rf_model, label_encoder, metadata = load_models()
    
    if rf_model is None:
        return None
    
    # Prepare input
    X = [[temperature, humidity, soilMoisture, pH, rainfall]]
    
    # Get prediction from Random Forest
    rf_pred_encoded = rf_model.predict(X)[0]
    
    # Get probabilities from Random Forest
    rf_probabilities = rf_model.predict_proba(X)[0]
    
    # Decode prediction
    rf_prediction = label_encoder.inverse_transform([rf_pred_encoded])[0]
    
    # Get top 5 predictions with probabilities
    top_indices = rf_probabilities.argsort()[-5:][::-1]
    recommendations = []
    
    crop_info = {
        'Rice': {
            'pros': ['High yield potential', 'Good market demand', 'Suitable for wet conditions'],
            'cons': ['High water requirement', 'Labor intensive', 'Pest susceptible']
        },
        'Wheat': {
            'pros': ['Drought resistant', 'Good storage life', 'Stable market price'],
            'cons': ['Requires cool weather', 'Lower profit margin', 'Disease prone']
        },
        'Maize': {
            'pros': ['Fast growing', 'Multiple uses', 'Good market demand'],
            'cons': ['Pest attacks', 'Moderate water need', 'Storage issues']
        },
        'Cotton': {
            'pros': ['High profit potential', 'Long harvest period', 'Industrial demand'],
            'cons': ['Very high water need', 'Pest management critical', 'Market fluctuation']
        },
        'Sugarcane': {
            'pros': ['High yield', 'Long-term crop', 'Good returns'],
            'cons': ['Very high water requirement', 'Heavy investment', '12-18 month cycle']
        },
        'Tomato': {
            'pros': ['Quick harvest', 'High market demand', 'Good profit'],
            'cons': ['Disease susceptible', 'Requires care', 'Short shelf life']
        },
        'Potato': {
            'pros': ['High yield', 'Good storage', 'Year-round demand'],
            'cons': ['Cold storage needed', 'Disease prone', 'Market price varies']
        },
        'Soybean': {
            'pros': ['Nitrogen fixing', 'Good protein source', 'Industrial use'],
            'cons': ['Moderate yield', 'Pest issues', 'Weather dependent']
        }
    }
    
    for idx in top_indices:
        crop_name = label_encoder.inverse_transform([idx])[0]
        confidence = float(rf_probabilities[idx] * 100)
        
        if confidence > 1:  # Only include if confidence > 1%
            crop_data = crop_info.get(crop_name, {
                'pros': ['Suitable for current conditions'],
                'cons': ['Consult local agriculture expert']
            })
            
            recommendations.append({
                'name': crop_name,
                'confidence': round(confidence, 2),
                'pros': crop_data['pros'],
                'cons': crop_data['cons']
            })
    
    result = {
        'primaryCrop': rf_prediction,
        'confidence': round(float(rf_probabilities[rf_pred_encoded] * 100), 2),
        'recommendations': recommendations[:5],
        'modelUsed': 'Random Forest Classifier',
        'accuracy': metadata['accuracy'] * 100,
        'dataset': metadata['dataset'],
        'dataset_url': metadata['dataset_url'],
        'inputParameters': {
            'temperature': temperature,
            'humidity': humidity,
            'soilMoisture': soilMoisture,
            'pH': pH,
            'rainfall': rainfall
        }
    }
    
    return result

if __name__ == "__main__":
    # Test prediction
    if len(sys.argv) > 1:
        temp = float(sys.argv[1])
        hum = float(sys.argv[2])
        soil = float(sys.argv[3])
        ph = float(sys.argv[4])
        rain = float(sys.argv[5]) if len(sys.argv) > 5 else 100
        
        result = predict_crop(temp, hum, soil, ph, rain)
        if result:
            print(json.dumps(result, indent=2))
    else:
        # Default test
        result = predict_crop(28, 70, 75, 6.2, 180)
        if result:
            print(json.dumps(result, indent=2))
