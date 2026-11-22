// Multi-language translations for Smart Farming System
// Supported languages: English, Kannada (ಕನ್ನಡ)

export const translations = {
  en: {
    // Common
    welcome: "Welcome",
    welcomeBack: "Welcome back",
    appName: "KrishiSakha",
    tagline: "Soil's Voice for the Farmer",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    submit: "Submit",
    search: "Search",
    filter: "Filter",
    viewAll: "View All",
    seeMore: "See More",
    
    // Auth
    login: "Login",
    loginTo: "Login to",
    loginSuccessful: "Login successful!",
    loginFailed: "Login failed",
    loginError: "An error occurred during login",
    loggingIn: "Logging in...",
    signUp: "Sign Up",
    noAccount: "Don't have an account?",
    createAccount: "Create Account",
    join: "Join",
    haveAccount: "Already have an account?",
    fullName: "Full Name",
    enterYourName: "Enter your name",
    phoneNumber: "Phone Number",
    farmSize: "Farm Size (acres)",
    location: "Location",
    locationPlaceholder: "Click 'Get Location' to capture your location",
    getLocation: "Get Location",
    gettingLocation: "Getting Location...",
    locationCaptured: "Location captured successfully!",
    locationFailed: "Failed to get location. Please enable GPS and location permissions.",
    accountCreated: "Account created successfully!",
    signupFailed: "Signup failed",
    signupError: "An error occurred during signup",
    creatingAccount: "Creating Account...",
    farmer: "Farmer",
    labourAgent: "Labour / Worker",
    farmerPortal: "Farmer Portal",
    farmerDesc: "Live IoT, Soil NPK & Crops",
    labourPortal: "Labour & Services",
    labourDesc: "Farm Jobs, Tractor & Labour",
    mobileNumber: "Mobile Number",
    enterMobile: "Enter 10-digit mobile number",
    sendOtp: "Get OTP via SMS",
    sendingOtp: "Sending OTP...",
    enterOtp: "Enter 6-Digit OTP",
    verifyOtp: "Verify & Enter Dashboard",
    verifyingOtp: "Verifying OTP...",
    resendOtp: "Resend OTP",
    resendIn: "Resend in",
    usePassword: "Login with Password",
    useOtp: "Quick Login with Mobile OTP",
    changeMobile: "Change Number",
    otpSentTo: "OTP sent to",
    enterOtpCode: "Enter OTP code",
    demoOtpNotice: "Demo: Use displayed OTP or 123456",
    advisory: "Advisory & Health",
    cropRecommendationAndDisease: "Advisory: Crop AI & Disease",
    marketAndAnalytics: "Market & Analytics",
    labourServices: "Labour Services",
    email: "Email",
    password: "Password",
    
    // Dashboard specific
    farmStatus: "Here's what's happening on your farm today",
    liveSensorData: "Live Sensor Data",
    esp32Connected: "ESP32 Connected",
    criticalAlerts: "Critical Alerts",
    myFields: "My Fields",
    quickActions: "Quick Actions",
    recentActivity: "Recent Activity",
    lastUpdated: "Last updated",
    noFieldsYet: "No fields registered yet",
    addFirstField: "Add your first field to get started",
    
    // Weather
    today: "Today",
    todayWeather: "Today's Weather",
    sevenDayForecast: "7-Day Forecast",
    weatherForecast: "Weather Forecast",
    wind: "Wind",
    rainfall: "Rainfall",
    humidity: "Humidity",
    feelsLike: "Feels Like",
    precipProb: "Rain Chance",
    highLow: "High / Low",
    weatherClearSky: "Clear Sky",
    weatherMainlyClear: "Mainly Clear",
    weatherPartlyCloudy: "Partly Cloudy",
    weatherOvercast: "Overcast",
    weatherFoggy: "Foggy",
    weatherDrizzle: "Drizzle",
    weatherRainy: "Rainy",
    weatherHeavyRain: "Heavy Rain",
    weatherSnowy: "Snowy",
    weatherThunderstorm: "Thunderstorm",
    weatherFavorable: "Good weather ahead for general farming activities.",
    weatherRainWarning: "Rain expected ahead — consider adjusting irrigation.",
    weatherHeatWarning: "High temperatures expected — ensure adequate watering.",
    
    // Sensor labels
    phLevel: "pH Level",
    nitrogen: "Nitrogen (N)",
    phosphorus: "Phosphorus (P)",
    potassium: "Potassium (K)",
    npkNutrients: "NPK Soil Nutrients",
    rainSensor: "Rain Sensor",
    rainDetected: "Rain Detected",
    noRain: "No Rain",
    waitingForSensorData: "Waiting for sensor data",
    optimal: "Optimal",
    low: "Low",
    high: "High",
    sufficient: "Sufficient",
    
    // Alert messages
    extremeHeat: "Extreme heat detected! Protect your crops immediately",
    coldTemperature: "Cold temperatures may affect crop growth",
    soilMoistureLow: "Soil moisture critically low! Immediate irrigation needed",
    soilMoistureHigh: "Soil too wet! Risk of root rot and fungal diseases",
    nitrogenLow: "Soil Nitrogen (N) is critically low! Apply nitrogen-rich fertilizer",
    potassiumLow: "Soil Potassium (K) is low! Consider potash application",
    phOutOfRange: "Soil pH outside optimal range! Crop health may be affected",
    
    // Navigation
    dashboard: "Dashboard",
    cropRecommendation: "Crop Recommendation",
    mandiPrices: "Mandi Prices",
    myFields: "My Fields",
    cropPlans: "Crop Plans",
    weatherForecast: "Weather Forecast",
    soilHealth: "Soil Health",
    irrigation: "Irrigation",
    services: "Services",
    profile: "Profile",
    logout: "Logout",
    findLabour: "Find Labour",
    diseaseCheck: "Disease Check",
    analytics: "Analytics",
    
    // Dashboard
    totalFields: "Total Fields",
    activeCrops: "Active Crops",
    upcomingTasks: "Upcoming Tasks",
    recentAlerts: "Recent Alerts",
    
    // Crop Recommendation
    getCropRecommendation: "Get Crop Recommendation",
    selectField: "Select Field",
    temperature: "Temperature",
    humidity: "Humidity",
    soilMoisture: "Soil Moisture",
    recommendedCrop: "Recommended Crop",
    profitabilityScore: "Profitability Score",
    suitableAlternatives: "Suitable Alternatives",
    
    // Mandi Prices
    mandiPriceTrends: "Mandi Price Trends",
    selectCrop: "Select Crop",
    selectLocation: "Select Location",
    currentPrice: "Current Price",
    priceRange: "Price Range",
    trend: "Trend",
    refreshData: "Refresh Data",
    
    // Fields
    addNewField: "Add New Field",
    fieldName: "Field Name",
    area: "Area",
    hectares: "Hectares",
    location: "Location",
    state: "State",
    district: "District",
    taluk: "Taluk",
    village: "Village",
    soilType: "Soil Type",
    
    // Crop Plans
    createPlan: "Create Plan",
    cropName: "Crop Name",
    season: "Season",
    kharif: "Kharif",
    rabi: "Rabi",
    summer: "Summer",
    sowingDate: "Sowing Date",
    harvestDate: "Harvest Date",
    expectedYield: "Expected Yield",
    
    // Weather
    forecast: "Forecast",
    nextDays: "Next 7 Days",
    
    // Services
    requestService: "Request Service",
    serviceType: "Service Type",
    ploughing: "Ploughing",
    harvesting: "Harvesting",
    spraying: "Spraying",
    description: "Description",
    urgency: "Urgency",
    
    // Alerts
    priceAlert: "Price Alert",
    weatherAlert: "Weather Alert",
    taskReminder: "Task Reminder",
    
    // Crops (All 23 crops)
    crops: {
      Rice: "Rice",
      Maize: "Maize",
      Ragi: "Ragi (Finger Millet)",
      Chickpea: "Chickpea",
      Kidneybeans: "Kidney Beans",
      Pigeonpeas: "Pigeon Peas",
      Mothbeans: "Moth Beans",
      Mungbean: "Mung Bean",
      Blackgram: "Black Gram",
      Lentil: "Lentil",
      Pomegranate: "Pomegranate",
      Banana: "Banana",
      Mango: "Mango",
      Grapes: "Grapes",
      Watermelon: "Watermelon",
      Muskmelon: "Muskmelon",
      Apple: "Apple",
      Orange: "Orange",
      Papaya: "Papaya",
      Coconut: "Coconut",
      Cotton: "Cotton",
      Jute: "Jute",
      Coffee: "Coffee"
    }
  },
  
  kn: {
    // Common - ಸಾಮಾನ್ಯ
    welcome: "ಸ್ವಾಗತ",
    welcomeBack: "ಮರಳಿ ಸ್ವಾಗತ",
    appName: "ಕೃಷಿಸಖ",
    tagline: "ರೈತರಿಗಾಗಿ ಮಣ್ಣಿನ ಕೂಗು",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    save: "ಉಳಿಸಿ",
    cancel: "ರದ್ದುಮಾಡಿ",
    delete: "ಅಳಿಸಿ",
    edit: "ಸಂಪಾದಿಸಿ",
    submit: "ಸಲ್ಲಿಸಿ",
    search: "ಹುಡುಕಿ",
    filter: "ಫಿಲ್ಟರ್",
    viewAll: "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
    seeMore: "ಇನ್ನಷ್ಟು ನೋಡಿ",
    
    // Auth - ಪ್ರಮಾಣೀಕರಣ
    login: "ಲಾಗಿನ್",
    loginTo: "ಇಲ್ಲಿಗೆ ಲಾಗಿನ್ ಮಾಡಿ",
    loginSuccessful: "ಲಾಗಿನ್ ಯಶಸ್ವಿಯಾಗಿದೆ!",
    loginFailed: "ಲಾಗಿನ್ ವಿಫಲವಾಗಿದೆ",
    loginError: "ಲಾಗಿನ್ ಸಮಯದಲ್ಲಿ ದೋಷ ಉಂಟಾಗಿದೆ",
    loggingIn: "ಲಾಗಿನ್ ಆಗುತ್ತಿದೆ...",
    signUp: "ಸೈನ್ ಅಪ್",
    noAccount: "ಖಾತೆ ಇಲ್ಲವೇ?",
    createAccount: "ಖಾತೆ ರಚಿಸಿ",
    join: "ಸೇರಿ",
    haveAccount: "ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?",
    fullName: "ಪೂರ್ಣ ಹೆಸರು",
    enterYourName: "ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ",
    phoneNumber: "ದೂರವಾಣಿ ಸಂಖ್ಯೆ",
    farmSize: "ಕೃಷಿಭೂಮಿಯ ಗಾತ್ರ (ಎಕರೆಗಳಲ್ಲಿ)",
    location: "ಸ್ಥಳ",
    locationPlaceholder: "ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ಸೆರೆಹಿಡಿಯಲು 'ಸ್ಥಳವನ್ನು ಪಡೆಯಿರಿ' ಕ್ಲಿಕ್ ಮಾಡಿ",
    getLocation: "ಸ್ಥಳವನ್ನು ಪಡೆಯಿರಿ",
    gettingLocation: "ಸ್ಥಳವನ್ನು ಪಡೆಯಲಾಗುತ್ತಿದೆ...",
    locationCaptured: "ಸ್ಥಳವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸೆರೆಹಿಡಿಯಲಾಗಿದೆ!",
    locationFailed: "ಸ್ಥಳವನ್ನು ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ. GPS ಮತ್ತು ಸ್ಥಳ ಅನುಮತಿಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ.",
    accountCreated: "ಖಾತೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ!",
    signupFailed: "ಸೈನ್ಅಪ್ ವಿಫಲವಾಗಿದೆ",
    signupError: "ಸೈನ್ಅಪ್ ಸಮಯದಲ್ಲಿ ದೋಷ ಉಂಟಾಗಿದೆ",
    creatingAccount: "ಖಾತೆಯನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    farmer: "ಕೃಷಿಕ (ರೈತ)",
    labourAgent: "ಕಾರ್ಮಿಕ / ಕೆಲಸಗಾರ",
    farmerPortal: "ರೈತ ಪೋರ್ಟಲ್",
    farmerDesc: "ನೇರ IoT, ಮಣ್ಣಿನ NPK ಮತ್ತು ಬೆಳೆಗಳು",
    labourPortal: "ಕಾರ್ಮಿಕ & ಸೇವೆಗಳು",
    labourDesc: "ಕೃಷಿ ಕೆಲಸ, ಟ್ರ್ಯಾಕ್ಟರ್ ಮತ್ತು ಸೇವೆಗಳು",
    mobileNumber: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    enterMobile: "10 ಅಂಕಿಗಳ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ",
    sendOtp: "SMS ಮೂಲಕ OTP ಪಡೆಯಿರಿ",
    sendingOtp: "OTP ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",
    enterOtp: "6-ಅಂಕಿಯ OTP ನಮೂದಿಸಿ",
    verifyOtp: "ದೃಢೀಕರಿಸಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪ್ರವೇಶಿಸಿ",
    verifyingOtp: "OTP ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    resendOtp: "ಮತ್ತೆ OTP ಕಳುಹಿಸಿ",
    resendIn: "ಮರುಕಳುಹಿಸುವ ಸಮಯ",
    usePassword: "ಪಾಸ್‌ವರ್ಡ್ ಮೂಲಕ ಲಾಗಿನ್",
    useOtp: "ತ್ವರಿತ ಮೊಬೈಲ್ OTP ಲಾಗಿನ್",
    changeMobile: "ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ",
    otpSentTo: "OTP ಕಳುಹಿಸಲಾದ ಸಂಖ್ಯೆ",
    enterOtpCode: "OTP ಕೋಡ್ ನಮೂದಿಸಿ",
    demoOtpNotice: "ಡೆಮೊ: ತೋರಿಸಿದ OTP ಅಥವಾ 123456 ಬಳಸಿ",
    advisory: "ಸಲಹೆ ಮತ್ತು ಆರೋಗ್ಯ",
    cropRecommendationAndDisease: "ಬೆಳೆ ಶಿಫಾರಸು & ರೋಗ ಪತ್ತೆ",
    marketAndAnalytics: "ಮಾರುಕಟ್ಟೆ & ವಿಶ್ಲೇಷಣೆ",
    labourServices: "ಕಾರ್ಮಿಕ ಸೇವೆಗಳು",
    email: "ಇಮೇಲ್",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    
    // Dashboard specific - ಡ್ಯಾಶ್‌ಬೋರ್ಡ್
    farmStatus: "ಇಂದು ನಿಮ್ಮ ಹೊಲದಲ್ಲಿ ಏನಾಗುತ್ತಿದೆ ಎಂಬುದು ಇಲ್ಲಿದೆ",
    liveSensorData: "ನೇರ ಸಂವೇದಕ ಡೇಟಾ",
    esp32Connected: "ESP32 ಸಂಪರ್ಕಗೊಂಡಿದೆ",
    criticalAlerts: "ಪ್ರಮುಖ ಎಚ್ಚರಿಕೆಗಳು",
    myFields: "ನನ್ನ ಹೊಲಗಳು",
    quickActions: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು",
    recentActivity: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ",
    lastUpdated: "ಕೊನೆಯ ನವೀಕರಣ",
    noFieldsYet: "ಇನ್ನೂ ಯಾವುದೇ ಹೊಲಗಳನ್ನು ನೋಂದಾಯಿಸಿಲ್ಲ",
    addFirstField: "ಪ್ರಾರಂಭಿಸಲು ನಿಮ್ಮ ಮೊದಲ ಹೊಲವನ್ನು ಸೇರಿಸಿ",
    
    // Weather - ಹವಾಮಾನ
    today: "ಇಂದು",
    todayWeather: "ಇಂದಿನ ಹವಾಮಾನ",
    sevenDayForecast: "7 ದಿನಗಳ ಮುನ್ಸೂಚನೆ",
    weatherForecast: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
    wind: "ಗಾಳಿ",
    rainfall: "ಮಳೆ",
    humidity: "ಆರ್ದ್ರತೆ",
    feelsLike: "ಅನಿಸಿಕೆ",
    precipProb: "ಮಳೆಯ ಸಂಭವ",
    highLow: "ಗರಿಷ್ಠ / ಕನಿಷ್ಠ",
    weatherClearSky: "ಸ್ವಚ್ಛ ಆಕಾಶ",
    weatherMainlyClear: "ಹೆಚ್ಚಾಗಿ ಸ್ವಚ್ಛ",
    weatherPartlyCloudy: "ಭಾಗಶಃ ಮೋಡ",
    weatherOvercast: "ಮೋಡ ಕವಿದ ವಾತಾವರಣ",
    weatherFoggy: "ಮಂಜು ಮುಸುಕಿದ",
    weatherDrizzle: "ತುಂತುರು ಮಳೆ",
    weatherRainy: "ಮಳೆ",
    weatherHeavyRain: "ಭಾರಿ ಮಳೆ",
    weatherSnowy: "ಹಿಮಪಾತ",
    weatherThunderstorm: "ಗುಡುಗು ಸಹಿತ ಮಳೆ",
    weatherFavorable: "ಕೃಷಿ ಕೆಲಸಗಳಿಗೆ ಉತ್ತಮ ಹವಾಮಾನವಿದೆ.",
    weatherRainWarning: "ಮುಂದಿನ ದಿನಗಳಲ್ಲಿ ಮಳೆಯ ಸಾಧ್ಯತೆ — ನೀರಾವರಿಯನ್ನು ಹೊಂದಿಸಿ.",
    weatherHeatWarning: "ಹೆಚ್ಚಿನ ತಾಪಮಾನ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ — ಸಾಕಷ್ಟು ನೀರುಣಿಸಿ.",
    
    // Sensor labels - ಸಂವೇದಕ ಲೇಬಲ್‌ಗಳು
    phLevel: "pH ಮಟ್ಟ",
    nitrogen: "ಸಾರಜನಕ (N)",
    phosphorus: "ರಂಜಕ (P)",
    potassium: "ಪೊಟ್ಯಾಸಿಯಮ್ (K)",
    npkNutrients: "NPK ಮಣ್ಣಿನ ಪೋಷಕಾಂಶಗಳು",
    rainSensor: "ಮಳೆ ಸಂವೇದಕ",
    rainDetected: "ಮಳೆ ಪತ್ತೆಯಾಗಿದೆ",
    noRain: "ಮಳೆ ಇಲ್ಲ",
    waitingForSensorData: "ಸಂವೇದಕ ಡೇಟಾಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
    optimal: "ಸೂಕ್ತ",
    low: "ಕಡಿಮೆ",
    high: "ಹೆಚ್ಚು",
    sufficient: "ಸಾಕಷ್ಟು",
    
    // Alert messages - ಎಚ್ಚರಿಕೆ ಸಂದೇಶಗಳು
    extremeHeat: "ತೀವ್ರ ಶಾಖ ಪತ್ತೆಯಾಗಿದೆ! ತಕ್ಷಣ ನಿಮ್ಮ ಬೆಳೆಗಳನ್ನು ರಕ್ಷಿಸಿ",
    coldTemperature: "ಶೀತ ತಾಪಮಾನವು ಬೆಳೆ ಬೆಳವಣಿಗೆಯ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು",
    soilMoistureLow: "ಮಣ್ಣಿನ ತೇವಾಂಶ ತೀರಾ ಕಡಿಮೆ! ತಕ್ಷಣ ನೀರಾವರಿ ಅಗತ್ಯ",
    soilMoistureHigh: "ಮಣ್ಣು ತುಂಬಾ ತೇವವಾಗಿದೆ! ಬೇರು ಕೊಳೆತ ಮತ್ತು ಶಿಲೀಂಧ್ರ ರೋಗಗಳ ಅಪಾಯ",
    nitrogenLow: "ಮಣ್ಣಿನ ಸಾರಜನಕ (N) ತೀರಾ ಕಡಿಮೆಯಾಗಿದೆ! ಸಾರಜನಕ ಗೊಬ್ಬರ ಹಾಕಿ",
    potassiumLow: "ಮಣ್ಣಿನ ಪೊಟ್ಯಾಸಿಯಮ್ (K) ಕಡಿಮೆಯಾಗಿದೆ! ಪೊಟ್ಯಾಶ್ ಬಳಸಿ",
    phOutOfRange: "ಮಣ್ಣಿನ pH ಸೂಕ್ತ ವ್ಯಾಪ್ತಿಯ ಹೊರಗಿದೆ! ಬೆಳೆ ಆರೋಗ್ಯ ಪರಿಣಾಮಿತವಾಗಬಹುದು",
    
    // Navigation - ನ್ಯಾವಿಗೇಶನ್
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    cropRecommendation: "ಬೆಳೆ ಶಿಫಾರಸು",
    mandiPrices: "ಮಂಡಿ ಬೆಲೆಗಳು",
    myFields: "ನನ್ನ ಹೊಲಗಳು",
    cropPlans: "ಬೆಳೆ ಯೋಜನೆಗಳು",
    weatherForecast: "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
    soilHealth: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ",
    irrigation: "ನೀರಾವರಿ",
    services: "ಸೇವೆಗಳು",
    profile: "ಪ್ರೊಫೈಲ್",
    logout: "ಲಾಗ್ ಔಟ್",
    findLabour: "ಕೆಲಸಗಾರರನ್ನು ಹುಡುಕಿ",
    diseaseCheck: "ರೋಗ ಪರೀಕ್ಷೆ",
    analytics: "ವಿಶ್ಲೇಷಣೆ",
    
    // Dashboard - ಡ್ಯಾಶ್‌ಬೋರ್ಡ್
    totalFields: "ಒಟ್ಟು ಹೊಲಗಳು",
    activeCrops: "ಸಕ್ರಿಯ ಬೆಳೆಗಳು",
    upcomingTasks: "ಮುಂಬರುವ ಕಾರ್ಯಗಳು",
    recentAlerts: "ಇತ್ತೀಚಿನ ಎಚ್ಚರಿಕೆಗಳು",
    
    // Crop Recommendation - ಬೆಳೆ ಶಿಫಾರಸು
    getCropRecommendation: "ಬೆಳೆ ಶಿಫಾರಸು ಪಡೆಯಿರಿ",
    selectField: "ಹೊಲವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    temperature: "ತಾಪಮಾನ",
    humidity: "ಆರ್ದ್ರತೆ",
    soilMoisture: "ಮಣ್ಣಿನ ತೇವಾಂಶ",
    recommendedCrop: "ಶಿಫಾರಸು ಮಾಡಿದ ಬೆಳೆ",
    profitabilityScore: "ಲಾಭದಾಯಕತೆಯ ಅಂಕ",
    suitableAlternatives: "ಸೂಕ್ತ ಪರ್ಯಾಯಗಳು",
    
    // Mandi Prices - ಮಂಡಿ ಬೆಲೆಗಳು
    mandiPriceTrends: "ಮಂಡಿ ಬೆಲೆ ಪ್ರವೃತ್ತಿಗಳು",
    selectCrop: "ಬೆಳೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    selectLocation: "ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    currentPrice: "ಪ್ರಸ್ತುತ ಬೆಲೆ",
    priceRange: "ಬೆಲೆ ವ್ಯಾಪ್ತಿ",
    trend: "ಪ್ರವೃತ್ತಿ",
    refreshData: "ಡೇಟಾವನ್ನು ರಿಫ್ರೆಶ್ ಮಾಡಿ",
    
    // Fields - ಹೊಲಗಳು
    addNewField: "ಹೊಸ ಹೊಲವನ್ನು ಸೇರಿಸಿ",
    fieldName: "ಹೊಲದ ಹೆಸರು",
    area: "ಪ್ರದೇಶ",
    hectares: "ಹೆಕ್ಟೇರ್‌ಗಳು",
    location: "ಸ್ಥಳ",
    state: "ರಾಜ್ಯ",
    district: "ಜಿಲ್ಲೆ",
    taluk: "ತಾಲೂಕು",
    village: "ಗ್ರಾಮ",
    soilType: "ಮಣ್ಣಿನ ಪ್ರಕಾರ",
    
    // Crop Plans - ಬೆಳೆ ಯೋಜನೆಗಳು
    createPlan: "ಯೋಜನೆ ರಚಿಸಿ",
    cropName: "ಬೆಳೆಯ ಹೆಸರು",
    season: "ಋತು",
    kharif: "ಖರೀಫ್",
    rabi: "ರಬಿ",
    summer: "ಬೇಸಿಗೆ",
    sowingDate: "ಬಿತ್ತನೆ ದಿನಾಂಕ",
    harvestDate: "ಕೊಯ್ಲು ದಿನಾಂಕ",
    expectedYield: "ನಿರೀಕ್ಷಿತ ಇಳುವರಿ",
    
    // Weather - ಹವಾಮಾನ
    forecast: "ಮುನ್ಸೂಚನೆ",
    nextDays: "ಮುಂದಿನ 7 ದಿನಗಳು",
    
    // Services - ಸೇವೆಗಳು
    requestService: "ಸೇವೆಯನ್ನು ವಿನಂತಿಸಿ",
    serviceType: "ಸೇವೆಯ ಪ್ರಕಾರ",
    ploughing: "ಉಳುಮೆ",
    harvesting: "ಕೊಯ್ಲು",
    spraying: "ಸಿಂಪರಣೆ",
    description: "ವಿವರಣೆ",
    urgency: "ತುರ್ತು",
    
    // Alerts - ಎಚ್ಚರಿಕೆಗಳು
    priceAlert: "ಬೆಲೆ ಎಚ್ಚರಿಕೆ",
    weatherAlert: "ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ",
    taskReminder: "ಕಾರ್ಯ ಜ್ಞಾಪನೆ",
    
    // Crops - ಬೆಳೆಗಳು (All 23 crops in Kannada)
    crops: {
      Rice: "ಅಕ್ಕಿ",
      Maize: "ಮೆಕ್ಕೆಜೋಳ",
      Ragi: "ರಾಗಿ (ಕೆಂಪು ಜೋಳ)",
      Chickpea: "ಕಡಲೆಕಾಳು",
      Kidneybeans: "ರಾಜ್ಮಾ",
      Pigeonpeas: "ತೊಗರಿಕಾಳು",
      Mothbeans: "ಮಾಟ್ ಕಾಳು",
      Mungbean: "ಹೆಸರುಕಾಳು",
      Blackgram: "ಉದ್ದು",
      Lentil: "ಮಸೂರ್",
      Pomegranate: "ದಾಳಿಂಬೆ",
      Banana: "ಬಾಳೆ",
      Mango: "ಮಾವು",
      Grapes: "ದ್ರಾಕ್ಷಿ",
      Watermelon: "ಕಲ್ಲಂಗಡಿ",
      Muskmelon: "ಕರ್ಬೂಜ",
      Apple: "ಸೇಬು",
      Orange: "ಕಿತ್ತಳೆ",
      Papaya: "ಪಪ್ಪಾಯಿ",
      Coconut: "ತೆಂಗಿನಕಾಯಿ",
      Cotton: "ಹತ್ತಿ",
      Jute: "ಸೆಣಬು",
      Coffee: "ಕಾಫಿ"
    }
  }
};

// Get translation for a key
export const t = (key, lang = 'en') => {
  // Debug logging
  console.log('Translating key:', key, 'for language:', lang);
  
  const keys = key.split('.');
  let value = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English
      console.log('Translation not found, falling back to English for key:', key);
      value = translations.en;
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
      }
      break;
    }
  }
  
  const result = value || key;
  console.log('Translation result:', result);
  return result;
};

// Get crop name in selected language
export const getCropName = (cropEnglish, lang = 'en') => {
  console.log('Getting crop name for:', cropEnglish, 'in language:', lang);
  const result = translations[lang]?.crops?.[cropEnglish] || cropEnglish;
  console.log('Crop name result:', result);
  return result;
};

// Get all crop names in selected language
export const getAllCrops = (lang = 'en') => {
  return translations[lang]?.crops || translations.en.crops;
};

export default translations;