#!/usr/bin/env python3
"""
ML API Service for Crop Recommendation
Serves the trained Decision Tree model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import json
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# Load model and info
try:
    with open('crop_model.pkl', 'rb') as f:
        model = pickle.load(f)
    
    with open('model_info.json', 'r') as f:
        model_info = json.load(f)
    
    print("✅ ML Model loaded successfully!")
    print(f"   Model Accuracy: {model_info['accuracy'] * 100:.2f}%")
    print(f"   Crops: {', '.join(model_info['crops'])}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    model_info = None

def estimate_npk_from_sensor_data(temperature, humidity, soil_moisture, ph):
    """
    Estimate N, P, K values based on sensor data and soil conditions
    """
    # Base NPK values (typical for average soil)
    N = 80
    P = 60
    K = 40
    
    # Adjust based on pH (affects nutrient availability)
    if ph < 6.0:  # Acidic soil
        N -= 10
        P -= 10
    elif ph > 7.5:  # Alkaline soil
        P -= 15
        K += 5
    
    # Adjust based on soil moisture (affects leaching)
    if soil_moisture > 70:  # High moisture
        N -= 15  # N leaches with water
        K -= 10
    elif soil_moisture < 40:  # Low moisture
        N += 10
        P += 5
    
    # Adjust based on temperature (affects organic matter decomposition)
    if temperature > 30:
        N += 10  # Higher decomposition
    
    # Ensure realistic ranges
    N = max(40, min(130, N))
    P = max(40, min(90, P))
    K = max(30, min(70, K))
    
    return N, P, K

def estimate_rainfall(humidity, temperature):
    """
    Estimate effective rainfall based on humidity and temperature
    """
    # Higher humidity and moderate temp = higher effective rainfall
    base_rainfall = 50
    
    if humidity > 75:
        base_rainfall += 30
    elif humidity > 60:
        base_rainfall += 15
    
    if temperature > 30:
        base_rainfall -= 10  # High evaporation
    
    return max(30, min(300, base_rainfall))

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'accuracy': model_info['accuracy'] if model_info else 0
    })

@app.route('/predict', methods=['POST'])
def predict_crop():
    """
    Predict crop based on sensor data
    Expected input: { temperature, humidity, soilMoisture, pH }
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract sensor data
        temperature = float(data.get('temperature', 25))
        humidity = float(data.get('humidity', 65))
        soil_moisture = float(data.get('soilMoisture', 50))
        ph = float(data.get('pH', 6.5))
        
        # Estimate NPK and rainfall from sensor data
        N, P, K = estimate_npk_from_sensor_data(temperature, humidity, soil_moisture, ph)
        rainfall = estimate_rainfall(humidity, temperature)
        
        # Prepare input for model
        input_data = pd.DataFrame([{
            'N': N,
            'P': P,
            'K': K,
            'temperature': temperature,
            'humidity': humidity,
            'pH': ph,
            'rainfall': rainfall
        }])
        
        # Get prediction
        prediction = model.predict(input_data)[0]
        probabilities = model.predict_proba(input_data)[0]
        confidence = float(max(probabilities) * 100)
        
        # Get top 3 crop recommendations
        crop_indices = np.argsort(probabilities)[::-1]
        recommendations = []
        
        for idx in crop_indices[:3]:
            crop_name = model.classes_[idx]
            crop_confidence = float(probabilities[idx] * 100)
            
            if crop_confidence > 10:  # Only include if confidence > 10%
                recommendations.append({
                    'name': crop_name,
                    'confidence': round(crop_confidence, 2),
                    'suitability': get_crop_suitability(crop_name, temperature, humidity, soil_moisture, ph)
                })
        
        # Response
        response = {
            'recommendedCrop': prediction,
            'confidence': round(confidence, 2),
            'suitableCrops': recommendations,
            'estimatedParams': {
                'nitrogen': N,
                'phosphorus': P,
                'potassium': K,
                'estimatedRainfall': round(rainfall, 2)
            },
            'sensorData': {
                'temperature': temperature,
                'humidity': humidity,
                'soilMoisture': soil_moisture,
                'pH': ph
            },
            'modelInfo': {
                'algorithm': 'Decision Tree Classifier',
                'accuracy': round(model_info['accuracy'] * 100, 2),
                'totalCrops': len(model_info['crops'])
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Error in prediction: {e}")
        return jsonify({'error': str(e)}), 500

def get_crop_suitability(crop, temp, humidity, soil_moisture, ph):
    """Get suitability factors for a crop"""
    suitability = {
        'Rice': {
            'pros': ['High yield potential', 'Good market demand', 'Water abundant conditions'],
            'cons': ['High water requirement', 'Labor intensive', 'Long growing period']
        },
        'Wheat': {
            'pros': ['Moderate water need', 'Stable market price', 'Short duration crop'],
            'cons': ['Pest susceptible', 'Requires cool weather', 'Moderate yield']
        },
        'Maize': {
            'pros': ['Fast growing', 'Multiple uses', 'Good market'],
            'cons': ['Bird attacks', 'Storage issues', 'Requires proper spacing']
        },
        'Cotton': {
            'pros': ['High value crop', 'Good export demand', 'Multiple picking seasons'],
            'cons': ['Pest management needed', 'Irrigation required', 'Heavy fertilizer use']
        },
        'Sugarcane': {
            'pros': ['Long crop duration', 'High biomass', 'Stable income'],
            'cons': ['High water need', 'Heavy fertilizer requirement', 'Processing needed']
        },
        'Pulses': {
            'pros': ['Nitrogen fixing', 'Good protein source', 'Short duration'],
            'cons': ['Pest susceptible', 'Low yield', 'Price fluctuation']
        },
        'Vegetables': {
            'pros': ['Year-round cultivation', 'Local market', 'Quick returns'],
            'cons': ['Variable prices', 'Daily maintenance', 'Perishable']
        },
        'Groundnut': {
            'pros': ['Oil seed crop', 'Good market', 'Improves soil'],
            'cons': ['Pest management', 'Harvesting labor', 'Storage issues']
        }
    }
    
    return suitability.get(crop, {
        'pros': ['Suitable for current conditions'],
        'cons': ['Standard agricultural practices apply']
    })

@app.route('/crops', methods=['GET'])
def get_crops():
    """Get list of all crops the model can predict"""
    return jsonify({
        'crops': model_info['crops'] if model_info else [],
        'count': len(model_info['crops']) if model_info else 0
    })

if __name__ == '__main__':
    if model is None:
        print("❌ Cannot start API - Model not loaded")
        exit(1)
    
    print("🚀 Starting ML API Server...")
    print("   Endpoint: http://localhost:5002/predict")
    print("   Health: http://localhost:5002/health")
    app.run(host='0.0.0.0', port=5002, debug=True)
