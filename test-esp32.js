const axios = require('axios');

// Simulate ESP32 sending data
const sendESP32Data = async () => {
  const data = {
    temperature: +(25 + Math.random() * 10).toFixed(2),
    humidity: +(60 + Math.random() * 20).toFixed(2),
    soilMoisture: +(40 + Math.random() * 30).toFixed(2),
    rainLevel: +(Math.random() * 50).toFixed(2),
    pH: +(6.5 + (Math.random() - 0.5) * 2).toFixed(2)
  };

  try {
    console.log('\n📡 Simulating ESP32 sending data to port 5001...');
    console.log('Data:', data);
    
    const response = await axios.post('http://localhost:5001/api/sensors/data', data);
    
    console.log('✅ Response from sensor backend:', response.data.message);
    console.log('🔄 Data forwarded to main backend:', response.data.forwarded_to_main_backend);
    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Send data every 10 seconds
console.log('🌾 ESP32 Simulator - Sending data to Krishi Sakha backend');
console.log('Backend: http://localhost:5001/api/sensors/data');
console.log('=================================================\n');

sendESP32Data();
setInterval(sendESP32Data, 10000);
