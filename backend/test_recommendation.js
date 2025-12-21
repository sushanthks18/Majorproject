// Test Crop Recommendation API
const testRecommendation = async () => {
  try {
    console.log('Testing crop recommendation endpoint...\n');
    
    // First, login to get token
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'farmer1@test.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.token) {
      console.error('❌ Login failed:', loginData);
      return;
    }
    
    console.log('✅ Login successful\n');
    const token = loginData.token;
    
    // Now test recommendation
    const recommendationResponse = await fetch('http://localhost:5001/api/predict/crop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        temperature: 26.4,
        humidity: 49.3,
        soilMoisture: 0,
        pH: 9.09,
        rainfall: 0,
        useAggregated: true
      })
    });
    
    const responseText = await recommendationResponse.text();
    
    if (!recommendationResponse.ok) {
      console.error('❌ Recommendation failed');
      console.error('Status:', recommendationResponse.status);
      console.error('Response:', responseText);
      return;
    }
    
    const recommendationData = JSON.parse(responseText);
    
    console.log('✅ Recommendation successful!');
    console.log('\nTop Recommendation:', recommendationData.recommendedCrop);
    console.log('Profitability Score:', recommendationData.profitabilityScore);
    console.log('\nTop 3 Crops:');
    recommendationData.suitableCrops.slice(0, 3).forEach((crop, idx) => {
      console.log(`${idx + 1}. ${crop.name} - ${crop.suitability_score}% suitability`);
      if (crop.mandiPrice) {
        console.log(`   Mandi Price: ₹${crop.mandiPrice.current}/quintal`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testRecommendation();
