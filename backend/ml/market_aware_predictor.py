import pickle
import json
import os
import sys
import numpy as np

def apply_feature_engineering(temperature, humidity, soilMoisture, pH, rainfall):
    """
    Apply the same feature engineering as during training
    Expands 5 features to 11 features
    """
    # Original features
    features = {
        'temperature': temperature,
        'humidity': humidity,
        'soilMoisture': soilMoisture,
        'pH': pH,
        'rainfall': rainfall
    }
    
    # Engineered features (same as training)
    features['temp_humidity'] = temperature * humidity / 100
    features['temp_rainfall'] = temperature * rainfall / 100
    features['moisture_ph'] = soilMoisture * pH
    features['humidity_moisture'] = humidity * soilMoisture / 100
    features['temp_range'] = temperature ** 2
    features['water_availability'] = (soilMoisture + rainfall) / 2
    
    # Return in correct order (same as training)
    return [
        features['temperature'],
        features['humidity'],
        features['soilMoisture'],
        features['pH'],
        features['rainfall'],
        features['temp_humidity'],
        features['temp_rainfall'],
        features['moisture_ph'],
        features['humidity_moisture'],
        features['temp_range'],
        features['water_availability']
    ]

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
        print(f"Error: Model files not found. Please run train_model.py first.", file=sys.stderr)
        print(f"Missing file: {e.filename}", file=sys.stderr)
        return None, None, None

def calculate_market_penalty(crop_name, regional_distribution):
    """
    Calculate market penalty based on regional oversupply
    Returns a multiplier (0.0 to 1.0) where:
    - 1.0 = no penalty (low regional supply, good market opportunity)
    - 0.5 = moderate penalty (average supply)
    - 0.2 = high penalty (oversupply risk)
    """
    if not regional_distribution:
        return 1.0  # No data = no penalty
    
    total_area = regional_distribution.get('total_area', 0)
    if total_area == 0:
        return 1.0
    
    crop_area = regional_distribution.get('crop_distribution', {}).get(crop_name, 0)
    crop_percentage = (crop_area / total_area) * 100
    
    # Penalty thresholds
    if crop_percentage > 40:  # >40% = severe oversupply
        return 0.2
    elif crop_percentage > 30:  # >30% = high oversupply
        return 0.4
    elif crop_percentage > 20:  # >20% = moderate oversupply
        return 0.6
    elif crop_percentage > 15:  # >15% = slight oversupply
        return 0.8
    else:
        return 1.0  # Good diversity

def calculate_market_price_factor(crop_name):
    """
    Market price multiplier based on historical demand and current trends
    Higher value = better market opportunity
    """
    # Base market prices and demand factors (can be updated from real market APIs)
    market_factors = {
        'Rice': 0.85,      # Stable but moderate margins
        'Wheat': 0.80,     # Lower margins
        'Maize': 0.90,     # Good demand, multiple uses
        'Cotton': 1.10,    # High value, export potential
        'Sugarcane': 0.75, # Long cycle, moderate returns
        'Tomato': 1.15,    # High value vegetable
        'Potato': 0.95,    # Good storage, stable demand
        'Soybean': 1.00    # Industrial demand, protein crop
    }
    
    return market_factors.get(crop_name, 0.90)

def predict_crop_market_aware(temperature, humidity, soilMoisture, pH, rainfall=100, 
                               regional_distribution=None, market_prices=None):
    """
    Market-aware crop prediction that considers:
    1. Soil/climate suitability (ML model)
    2. Regional crop distribution (prevent oversupply)
    3. Current market prices and demand
    4. Diversification for price stability
    """
    
    # Load model
    rf_model, label_encoder, metadata = load_models()
    
    if rf_model is None:
        return None
    
    # Prepare input with feature engineering (11 features, not 5)
    X = [apply_feature_engineering(temperature, humidity, soilMoisture, pH, rainfall)]
    
    # Get prediction probabilities from Random Forest
    rf_probabilities = rf_model.predict_proba(X)[0]
    
    # Get all crops with their base suitability scores
    all_crops = label_encoder.classes_
    
    crop_info = {
        'Rice': {
            'pros': ['High yield potential', 'Good market demand', 'Suitable for wet conditions'],
            'cons': ['High water requirement', 'Labor intensive', 'Pest susceptible'],
            'water_need': 'High',
            'market_volatility': 'Low'
        },
        'Wheat': {
            'pros': ['Drought resistant', 'Good storage life', 'Stable market price'],
            'cons': ['Requires cool weather', 'Lower profit margin', 'Disease prone'],
            'water_need': 'Moderate',
            'market_volatility': 'Low'
        },
        'Maize': {
            'pros': ['Fast growing', 'Multiple uses', 'Good market demand', 'Fodder value'],
            'cons': ['Pest attacks', 'Moderate water need', 'Storage issues'],
            'water_need': 'Moderate',
            'market_volatility': 'Moderate'
        },
        'Cotton': {
            'pros': ['High profit potential', 'Long harvest period', 'Industrial demand', 'Export market'],
            'cons': ['Very high water need', 'Pest management critical', 'Market fluctuation'],
            'water_need': 'Very High',
            'market_volatility': 'High'
        },
        'Sugarcane': {
            'pros': ['High yield', 'Long-term crop', 'Good returns', 'Ratoon crops possible'],
            'cons': ['Very high water requirement', 'Heavy investment', '12-18 month cycle'],
            'water_need': 'Very High',
            'market_volatility': 'Low'
        },
        'Tomato': {
            'pros': ['Quick harvest', 'High market demand', 'Good profit', 'Multiple harvests'],
            'cons': ['Disease susceptible', 'Requires care', 'Short shelf life'],
            'water_need': 'Moderate',
            'market_volatility': 'High'
        },
        'Potato': {
            'pros': ['High yield', 'Good storage', 'Year-round demand', 'Cold storage option'],
            'cons': ['Cold storage needed', 'Disease prone', 'Market price varies'],
            'water_need': 'Moderate',
            'market_volatility': 'Moderate'
        },
        'Soybean': {
            'pros': ['Nitrogen fixing', 'Good protein source', 'Industrial use', 'Oil extraction'],
            'cons': ['Moderate yield', 'Pest issues', 'Weather dependent'],
            'water_need': 'Moderate',
            'market_volatility': 'Moderate'
        }
    }
    
    # Calculate market-aware scores for each crop
    recommendations = []
    
    for idx, crop_name in enumerate(all_crops):
        # Base suitability from ML model (0-100)
        base_confidence = float(rf_probabilities[idx] * 100)
        
        # Skip crops with very low suitability
        if base_confidence < 1:
            continue
        
        # Market diversification penalty (0.2 to 1.0)
        market_penalty = calculate_market_penalty(crop_name, regional_distribution)
        
        # Market price factor (0.75 to 1.15)
        price_factor = calculate_market_price_factor(crop_name)
        
        # Calculate final profitability score
        # Formula: Base Suitability × Market Penalty × Price Factor
        profitability_score = base_confidence * market_penalty * price_factor
        
        # Determine supply status
        supply_status = 'Good Diversity'
        market_warning = None
        
        if regional_distribution:
            total_area = regional_distribution.get('total_area', 0)
            crop_area = regional_distribution.get('crop_distribution', {}).get(crop_name, 0)
            if total_area > 0:
                crop_percentage = (crop_area / total_area) * 100
                if crop_percentage > 30:
                    supply_status = f'⚠️ Oversupply Risk ({crop_percentage:.1f}% of region)'
                    market_warning = f'{crop_percentage:.1f}% of your region is planning {crop_name}. Consider alternatives to avoid price drop.'
                elif crop_percentage > 20:
                    supply_status = f'⚡ Moderate Supply ({crop_percentage:.1f}% of region)'
                    market_warning = f'{crop_percentage:.1f}% regional coverage. Diversification recommended.'
                elif crop_percentage > 10:
                    supply_status = f'✅ Balanced ({crop_percentage:.1f}% of region)'
                else:
                    supply_status = f'🌟 Low Supply ({crop_percentage:.1f}% of region) - Good Opportunity!'
        
        crop_data = crop_info.get(crop_name, {
            'pros': ['Suitable for current conditions'],
            'cons': ['Consult local agriculture expert'],
            'water_need': 'Moderate',
            'market_volatility': 'Moderate'
        })
        
        recommendation = {
            'name': crop_name,
            'suitability_score': round(base_confidence, 2),
            'profitability_score': round(profitability_score, 2),
            'market_penalty': round(market_penalty, 2),
            'price_factor': round(price_factor, 2),
            'supply_status': supply_status,
            'pros': crop_data['pros'],
            'cons': crop_data['cons'],
            'water_requirement': crop_data['water_need'],
            'market_volatility': crop_data['market_volatility']
        }
        
        if market_warning:
            recommendation['market_warning'] = market_warning
        
        recommendations.append(recommendation)
    
    # Sort by profitability score (market-aware ranking)
    recommendations.sort(key=lambda x: x['profitability_score'], reverse=True)
    
    # Top recommendation
    best_crop = recommendations[0] if recommendations else None
    
    # Regional insights
    regional_insights = {
        'diversification_needed': False,
        'oversupplied_crops': [],
        'opportunity_crops': []
    }
    
    if regional_distribution and regional_distribution.get('total_area', 0) > 0:
        total_area = regional_distribution['total_area']
        crop_dist = regional_distribution.get('crop_distribution', {})
        
        for crop, area in crop_dist.items():
            percentage = (area / total_area) * 100
            if percentage > 25:
                regional_insights['oversupplied_crops'].append(f'{crop} ({percentage:.1f}%)')
                regional_insights['diversification_needed'] = True
            elif percentage < 5:
                # Check if crop is suitable
                for rec in recommendations:
                    if rec['name'] == crop and rec['suitability_score'] > 50:
                        regional_insights['opportunity_crops'].append(f'{crop} (only {percentage:.1f}% coverage)')
    
    result = {
        'recommended_crop': best_crop['name'] if best_crop else 'Mixed Vegetables',
        'profitability_score': best_crop['profitability_score'] if best_crop else 0,
        'suitability_score': best_crop['suitability_score'] if best_crop else 0,
        'recommendations': recommendations[:6],  # Top 6 crops
        'model_used': 'Market-Aware Random Forest',
        'accuracy': metadata['rf_accuracy'] * 100 if metadata else 99.4,
        'dataset': 'Real Indian Agricultural Data (Karnataka)',
        'regional_insights': regional_insights,
        'input_parameters': {
            'temperature': temperature,
            'humidity': humidity,
            'soilMoisture': soilMoisture,
            'pH': pH,
            'rainfall': rainfall
        },
        'market_factors_applied': True,
        'diversification_strategy': 'Active' if regional_distribution else 'Not Available'
    }
    
    return result

if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) > 1:
        # Arguments: temperature, humidity, soilMoisture, pH, rainfall, [regional_distribution]
        temp = float(sys.argv[1])
        hum = float(sys.argv[2])
        soil = float(sys.argv[3])
        ph = float(sys.argv[4])
        rain = float(sys.argv[5]) if len(sys.argv) > 5 else 100
        
        # Optional: regional distribution from JSON
        regional_dist = None
        if len(sys.argv) > 6:
            try:
                regional_dist = json.loads(sys.argv[6])
            except:
                pass
        
        result = predict_crop_market_aware(temp, hum, soil, ph, rain, regional_dist)
        if result:
            print(json.dumps(result, indent=2))
    else:
        # Test with mock data (Karnataka typical values)
        mock_regional = {
            'total_area': 1000,
            'crop_distribution': {
                'Rice': 450,  # 45% - oversupply!
                'Wheat': 200,  # 20%
                'Maize': 150,  # 15%
                'Cotton': 100,  # 10%
                'Tomato': 50,   # 5%
                'Potato': 50    # 5%
            }
        }
        # Test: T=28, H=70, SM=75, pH=6.5, R=180
        result = predict_crop_market_aware(28, 70, 75, 6.5, 180, mock_regional)
        if result:
            print(json.dumps(result, indent=2))
