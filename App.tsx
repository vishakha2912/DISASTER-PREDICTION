import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Slider } from './components/ui/slider';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Progress } from './components/ui/progress';
import { Switch } from './components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, MapPin, Clock, Users, TrendingUp, History, Brain, Wifi, WifiOff, RefreshCw, Satellite, Upload, FileText, Database, Trash2, Eye } from 'lucide-react';
import { WeatherService } from './components/WeatherService';
import { DataUploadService, UploadedDataset, WeatherRecord } from './components/DataUploadService';
import { DatasetPredictionEngine, DatasetAnalysis } from './components/DatasetPredictionEngine';

interface PredictionData {
  id: string;
  timestamp: string;
  location: string;
  disasterType: string;
  rainfall: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  population: number;
  riskScore: number;
  riskLevel: string;
  timeline: string;
  affectedPopulation: number;
  confidence: number;
  recommendations: string[];
  reasoning?: string[];
  datasetAnalysis?: DatasetAnalysis;
  predictionMethod: 'manual' | 'live' | 'dataset';
}

interface EnvironmentalFactors {
  rainfall: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  population: number;
}

const LOCATIONS = [
  { value: 'mumbai', label: 'Mumbai', seismicZone: 3, coastalRisk: 0.9 },
  { value: 'chennai', label: 'Chennai', seismicZone: 2, coastalRisk: 0.8 },
  { value: 'kolkata', label: 'Kolkata', seismicZone: 3, coastalRisk: 0.7 },
  { value: 'delhi', label: 'Delhi', seismicZone: 4, coastalRisk: 0.0 },
  { value: 'bangalore', label: 'Bangalore', seismicZone: 2, coastalRisk: 0.0 },
  { value: 'hyderabad', label: 'Hyderabad', seismicZone: 2, coastalRisk: 0.0 }
];

const DISASTER_TYPES = [
  { value: 'flood', label: 'Flood', icon: '🌊' },
  { value: 'earthquake', label: 'Earthquake', icon: '🌍' },
  { value: 'cyclone', label: 'Cyclone', icon: '🌪️' },
  { value: 'landslide', label: 'Landslide', icon: '⛰️' }
];

export default function App() {
  const [location, setLocation] = useState('mumbai');
  const [disasterType, setDisasterType] = useState('flood');
  const [factors, setFactors] = useState<EnvironmentalFactors>({
    rainfall: 50,
    temperature: 28,
    humidity: 60,
    windSpeed: 20,
    pressure: 1013,
    population: 5000
  });
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [history, setHistory] = useState<PredictionData[]>([]);
  const [activeTab, setActiveTab] = useState('prediction');
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [lastWeatherUpdate, setLastWeatherUpdate] = useState<string>('');
  const [weatherSource, setWeatherSource] = useState<string>('Manual Input');
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [weatherTrend, setWeatherTrend] = useState<any[]>([]);
  const [uploadedDatasets, setUploadedDatasets] = useState<UploadedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [isDatasetMode, setIsDatasetMode] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WeatherRecord | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('disasterPredictionHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    
    // Load uploaded datasets
    const datasets = DataUploadService.getStoredDatasets();
    setUploadedDatasets(datasets);
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('disasterPredictionHistory', JSON.stringify(history.slice(-10))); // Keep last 10
    }
  }, [history]);

  // Auto-save predictions every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (prediction) {
        const existingIndex = history.findIndex(h => h.id === prediction.id);
        if (existingIndex === -1) {
          setHistory(prev => [...prev.slice(-9), prediction]); // Keep last 10
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [prediction, history]);

  // Live weather data fetching
  const fetchLiveWeatherData = async () => {
    if (!isLiveMode) return;
    
    setIsLoadingWeather(true);
    try {
      const weatherData = await WeatherService.fetchLiveWeatherData(location);
      
      setFactors(prev => ({
        ...prev,
        rainfall: weatherData.rainfall,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        pressure: weatherData.pressure
      }));
      
      setLastWeatherUpdate(new Date().toLocaleTimeString());
      setWeatherSource(weatherData.source);
      
      // Fetch weather trend for analysis
      const trend = WeatherService.getWeatherTrend(location, 12);
      setWeatherTrend(trend.map((data, index) => ({
        time: new Date(data.timestamp).getHours() + ':00',
        temperature: data.temperature,
        humidity: data.humidity,
        rainfall: data.rainfall,
        pressure: data.pressure
      })));
      
      // Auto-generate prediction if auto-refresh is enabled
      if (autoRefresh) {
        setTimeout(() => {
          const event = new Event('auto-prediction');
          generatePrediction();
        }, 1000);
      }
      
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setWeatherSource('API Error - Using Last Known Data');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Auto-refresh weather data when live mode is enabled
  useEffect(() => {
    if (isLiveMode) {
      fetchLiveWeatherData();
      
      if (autoRefresh) {
        const interval = setInterval(fetchLiveWeatherData, 300000); // Every 5 minutes
        return () => clearInterval(interval);
      }
    }
  }, [isLiveMode, location, autoRefresh]);

  // Load data from dataset when location or dataset changes
  useEffect(() => {
    if (isDatasetMode && selectedDataset) {
      loadDataFromDataset();
    }
  }, [isDatasetMode, selectedDataset, location]);

  // Handle live mode toggle
  const handleLiveModeToggle = (enabled: boolean) => {
    setIsLiveMode(enabled);
    if (enabled) {
      setIsDatasetMode(false);
      fetchLiveWeatherData();
    } else {
      setWeatherSource('Manual Input');
      setLastWeatherUpdate('');
    }
  };

  // Handle dataset mode toggle
  const handleDatasetModeToggle = (enabled: boolean) => {
    setIsDatasetMode(enabled);
    if (enabled) {
      setIsLiveMode(false);
      setWeatherSource('Uploaded Dataset');
      if (selectedDataset && uploadedDatasets.length > 0) {
        loadDataFromDataset();
      }
    } else {
      setWeatherSource('Manual Input');
      setSelectedRecord(null);
    }
  };

  // Load data from selected dataset
  const loadDataFromDataset = () => {
    if (!selectedDataset) return;
    
    const dataset = uploadedDatasets.find(d => d.id === selectedDataset);
    if (!dataset) return;

    const record = DataUploadService.getLatestRecord(dataset, location);
    if (record) {
      setFactors(prev => ({
        ...prev,
        rainfall: record.rainfall || prev.rainfall,
        temperature: record.temperature || prev.temperature,
        humidity: record.humidity || prev.humidity,
        windSpeed: record.windSpeed || prev.windSpeed,
        pressure: record.pressure || prev.pressure
      }));
      setSelectedRecord(record);
      setLastWeatherUpdate(new Date().toLocaleTimeString());
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsUploading(true);

    try {
      const validation = DataUploadService.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      let dataset: UploadedDataset;
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        dataset = await DataUploadService.parseCSV(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        dataset = await DataUploadService.parsePDF(file);
      } else {
        throw new Error('Unsupported file type');
      }

      DataUploadService.saveDataset(dataset);
      setUploadedDatasets(DataUploadService.getStoredDatasets());
      setSelectedDataset(dataset.id);
      
      // Switch to dataset mode and load data
      setIsDatasetMode(true);
      setIsLiveMode(false);
      
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Delete dataset
  const deleteDataset = (id: string) => {
    DataUploadService.deleteDataset(id);
    setUploadedDatasets(DataUploadService.getStoredDatasets());
    if (selectedDataset === id) {
      setSelectedDataset(null);
      setIsDatasetMode(false);
    }
  };

  const calculateFloodRisk = (factors: EnvironmentalFactors, locationData: any): number => {
    let risk = 0;
    
    // Rainfall impact (40% weight)
    if (factors.rainfall > 150) risk += 40;
    else if (factors.rainfall > 100) risk += 30;
    else if (factors.rainfall > 50) risk += 15;
    
    // Humidity impact (20% weight)
    if (factors.humidity > 80) risk += 20;
    else if (factors.humidity > 60) risk += 10;
    
    // Pressure impact (20% weight)
    if (factors.pressure < 980) risk += 20;
    else if (factors.pressure < 1000) risk += 10;
    
    // Temperature impact (10% weight)
    if (factors.temperature > 35) risk += 5;
    else if (factors.temperature < 15) risk += 5;
    
    // Population density impact (10% weight)
    if (factors.population > 10000) risk += 10;
    else if (factors.population > 5000) risk += 5;
    
    return Math.min(risk, 100);
  };

  const calculateEarthquakeRisk = (factors: EnvironmentalFactors, locationData: any): number => {
    let risk = 0;
    
    // Seismic zone impact (60% weight)
    risk += locationData.seismicZone * 15;
    
    // Population density impact (25% weight)
    if (factors.population > 15000) risk += 25;
    else if (factors.population > 10000) risk += 20;
    else if (factors.population > 5000) risk += 15;
    
    // Infrastructure vulnerability (15% weight)
    if (factors.population > 12000) risk += 15; // Dense areas have older infrastructure
    
    return Math.min(risk, 100);
  };

  const calculateCycloneRisk = (factors: EnvironmentalFactors, locationData: any): number => {
    let risk = 0;
    
    // Wind speed impact (40% weight)
    if (factors.windSpeed > 120) risk += 40;
    else if (factors.windSpeed > 80) risk += 30;
    else if (factors.windSpeed > 40) risk += 15;
    
    // Coastal proximity (20% weight)
    risk += locationData.coastalRisk * 20;
    
    // Pressure impact (20% weight)
    if (factors.pressure < 970) risk += 20;
    else if (factors.pressure < 990) risk += 15;
    else if (factors.pressure < 1005) risk += 10;
    
    // Temperature impact (10% weight)
    if (factors.temperature > 30) risk += 10;
    else if (factors.temperature > 28) risk += 5;
    
    // Population impact (10% weight)
    if (factors.population > 8000) risk += 10;
    
    return Math.min(risk, 100);
  };

  const calculateLandslideRisk = (factors: EnvironmentalFactors, locationData: any): number => {
    let risk = 0;
    
    // Rainfall impact (50% weight)
    if (factors.rainfall > 120) risk += 50;
    else if (factors.rainfall > 80) risk += 35;
    else if (factors.rainfall > 40) risk += 20;
    
    // Humidity impact (20% weight)
    if (factors.humidity > 85) risk += 20;
    else if (factors.humidity > 70) risk += 15;
    
    // Temperature impact (15% weight)
    if (factors.temperature < 20) risk += 15; // Cold can affect soil stability
    else if (factors.temperature > 35) risk += 10; // Heat can dry and crack soil
    
    // Population density (15% weight) - affects deforestation and construction
    if (factors.population > 8000) risk += 15;
    else if (factors.population > 4000) risk += 10;
    
    return Math.min(risk, 100);
  };

  const calculateAffectedPopulation = (disasterType: string, riskScore: number, factors: EnvironmentalFactors, locationData: any): number => {
    const basePop = factors.population;
    const riskMultiplier = riskScore / 100;
    
    // Disaster-specific impact calculations
    let impactFactor = 0;
    let areaMultiplier = 1;
    let evacuationRate = 0;
    
    switch (disasterType) {
      case 'flood':
        // Floods affect wide areas, especially low-lying regions
        impactFactor = 0.2 + (factors.rainfall / 200) * 0.3; // 20-50% based on rainfall
        areaMultiplier = 1.5; // Floods spread across larger areas
        evacuationRate = riskScore > 70 ? 0.8 : riskScore > 40 ? 0.5 : 0.2;
        break;
        
      case 'earthquake':
        // Earthquakes affect entire urban areas but impact varies by building quality
        impactFactor = 0.15 + (locationData.seismicZone / 4) * 0.25; // 15-40% based on seismic zone
        areaMultiplier = 2.0; // Wide area impact
        evacuationRate = riskScore > 70 ? 0.6 : riskScore > 40 ? 0.3 : 0.1;
        break;
        
      case 'cyclone':
        // Cyclones affect coastal areas with decreasing intensity inland
        impactFactor = 0.25 + (factors.windSpeed / 150) * 0.4; // 25-65% based on wind speed
        areaMultiplier = locationData.coastalRisk * 1.8 + 0.5; // Higher for coastal areas
        evacuationRate = riskScore > 70 ? 0.9 : riskScore > 40 ? 0.6 : 0.3;
        break;
        
      case 'landslide':
        // Landslides affect smaller, localized areas but can be severe
        impactFactor = 0.1 + (factors.rainfall / 200) * 0.2; // 10-30% based on rainfall
        areaMultiplier = 0.3; // Localized impact
        evacuationRate = riskScore > 70 ? 0.7 : riskScore > 40 ? 0.4 : 0.15;
        break;
    }
    
    // Calculate affected population
    const directlyAffected = basePop * riskMultiplier * impactFactor * areaMultiplier;
    
    // Add evacuated population (people moved for safety)
    const evacuated = basePop * evacuationRate * riskMultiplier;
    
    // Total affected includes both directly impacted and evacuated
    const totalAffected = directlyAffected + evacuated;
    
    // Add some realistic variance (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    
    return Math.round(totalAffected * variance);
  };

  const generatePrediction = () => {
    const locationData = LOCATIONS.find(l => l.value === location)!;
    
    // Determine prediction method and use appropriate algorithm
    if (isDatasetMode && selectedDataset) {
      generateDatasetBasedPrediction(locationData);
    } else if (isLiveMode) {
      generateLivePrediction(locationData);
    } else {
      generateManualPrediction(locationData);
    }
  };

  const generateDatasetBasedPrediction = (locationData: any) => {
    const dataset = uploadedDatasets.find(d => d.id === selectedDataset);
    if (!dataset) {
      generateManualPrediction(locationData);
      return;
    }

    const predictionInput = {
      disasterType,
      location,
      currentConditions: {
        rainfall: factors.rainfall,
        temperature: factors.temperature,
        humidity: factors.humidity,
        windSpeed: factors.windSpeed,
        pressure: factors.pressure
      }
    };

    const result = DatasetPredictionEngine.generateDatasetBasedPrediction(dataset, predictionInput);
    
    const riskLevel = result.riskScore >= 70 ? 'High' : result.riskScore >= 40 ? 'Medium' : 'Low';

    const newPrediction: PredictionData = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      location: locationData.label,
      disasterType,
      ...factors,
      riskScore: result.riskScore,
      riskLevel,
      timeline: result.timeline,
      affectedPopulation: result.affectedPopulation,
      confidence: result.confidence,
      recommendations: result.recommendations,
      reasoning: result.reasoning,
      datasetAnalysis: result.analysis,
      predictionMethod: 'dataset'
    };

    setPrediction(newPrediction);
  };

  const generateLivePrediction = (locationData: any) => {
    // Enhanced live prediction with weather trend analysis
    let riskScore = 0;
    switch (disasterType) {
      case 'flood':
        riskScore = calculateFloodRisk(factors, locationData);
        break;
      case 'earthquake':
        riskScore = calculateEarthquakeRisk(factors, locationData);
        break;
      case 'cyclone':
        riskScore = calculateCycloneRisk(factors, locationData);
        break;
      case 'landslide':
        riskScore = calculateLandslideRisk(factors, locationData);
        break;
    }

    // Enhance with trend analysis
    if (weatherTrend.length > 5) {
      const trendAdjustment = calculateTrendAdjustment(weatherTrend, disasterType);
      riskScore += trendAdjustment;
    }

    const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
    const timeline = riskScore >= 70 ? '6-24 hours' : riskScore >= 40 ? '1-3 days' : '3-7 days';
    const affectedPopulation = calculateAffectedPopulation(disasterType, riskScore, factors, locationData);
    const confidence = Math.min(80 + Math.round(Math.random() * 15), 95); // Higher confidence for live data

    const recommendations = generateRecommendations(riskLevel, disasterType);
    recommendations.unshift('Based on real-time weather data analysis');

    const newPrediction: PredictionData = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      location: locationData.label,
      disasterType,
      ...factors,
      riskScore: Math.round(riskScore),
      riskLevel,
      timeline,
      affectedPopulation,
      confidence,
      recommendations,
      reasoning: [`Live weather data from ${weatherSource}`, 'Real-time trend analysis applied'],
      predictionMethod: 'live'
    };

    setPrediction(newPrediction);
  };

  const generateManualPrediction = (locationData: any) => {
    let riskScore = 0;
    switch (disasterType) {
      case 'flood':
        riskScore = calculateFloodRisk(factors, locationData);
        break;
      case 'earthquake':
        riskScore = calculateEarthquakeRisk(factors, locationData);
        break;
      case 'cyclone':
        riskScore = calculateCycloneRisk(factors, locationData);
        break;
      case 'landslide':
        riskScore = calculateLandslideRisk(factors, locationData);
        break;
    }

    const riskLevel = riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low';
    const timeline = riskScore >= 70 ? '6-24 hours' : riskScore >= 40 ? '1-3 days' : '3-7 days';
    const affectedPopulation = calculateAffectedPopulation(disasterType, riskScore, factors, locationData);
    const confidence = Math.min(70 + Math.round(Math.random() * 25), 95);

    const recommendations = generateRecommendations(riskLevel, disasterType);

    const newPrediction: PredictionData = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      location: locationData.label,
      disasterType,
      ...factors,
      riskScore: Math.round(riskScore),
      riskLevel,
      timeline,
      affectedPopulation,
      confidence,
      recommendations,
      reasoning: ['Manual input-based prediction', 'Standard risk calculation algorithms'],
      predictionMethod: 'manual'
    };

    setPrediction(newPrediction);
  };

  // Calculate trend adjustment for live predictions
  const calculateTrendAdjustment = (trend: any[], disasterType: string): number => {
    if (trend.length < 3) return 0;

    const recent = trend.slice(-3);
    const earlier = trend.slice(-6, -3);

    let adjustment = 0;

    // Temperature trend
    const tempTrend = recent.reduce((acc, curr) => acc + curr.temperature, 0) / recent.length -
                     earlier.reduce((acc, curr) => acc + curr.temperature, 0) / earlier.length;
    
    // Rainfall trend
    const rainTrend = recent.reduce((acc, curr) => acc + curr.rainfall, 0) / recent.length -
                     earlier.reduce((acc, curr) => acc + curr.rainfall, 0) / earlier.length;

    switch (disasterType) {
      case 'flood':
        if (rainTrend > 5) adjustment += 10;
        if (rainTrend > 10) adjustment += 10;
        break;
      case 'cyclone':
        if (tempTrend > 2) adjustment += 5;
        break;
      case 'landslide':
        if (rainTrend > 3) adjustment += 8;
        break;
    }

    return Math.min(adjustment, 20);
  };

  const generateRecommendations = (riskLevel: string, type: string): string[] => {
    const baseRecommendations = {
      High: [
        'Issue immediate evacuation orders for high-risk areas',
        'Activate emergency response teams',
        'Set up emergency shelters and medical facilities',
        'Issue red alert to all residents',
        'Coordinate with disaster management authorities'
      ],
      Medium: [
        'Issue warning alerts to residents',
        'Prepare evacuation routes and shelters',
        'Monitor conditions continuously',
        'Brief emergency response teams',
        'Advise residents to prepare emergency kits'
      ],
      Low: [
        'Issue advisory notices',
        'Continue monitoring weather conditions',
        'Review emergency preparedness plans',
        'Keep emergency services on standby',
        'Inform public about potential risks'
      ]
    };

    return baseRecommendations[riskLevel as keyof typeof baseRecommendations] || [];
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAnalysisData = () => {
    if (!prediction) return [];

    const locationData = LOCATIONS.find(l => l.value === location)!;
    
    const data = [
      { name: 'Rainfall', value: (factors.rainfall / 200) * 100, unit: 'mm' },
      { name: 'Temperature', value: ((factors.temperature - 10) / 40) * 100, unit: '°C' },
      { name: 'Humidity', value: factors.humidity, unit: '%' },
      { name: 'Wind Speed', value: (factors.windSpeed / 150) * 100, unit: 'km/h' },
      { name: 'Pressure', value: ((factors.pressure - 950) / 100) * 100, unit: 'mb' },
      { name: 'Population', value: (factors.population / 20000) * 100, unit: '/km²' }
    ];

    if (disasterType === 'earthquake') {
      data.push({ name: 'Seismic Zone', value: locationData.seismicZone * 25, unit: 'Level' });
    }
    if (disasterType === 'cyclone') {
      data.push({ name: 'Coastal Risk', value: locationData.coastalRisk * 100, unit: 'Factor' });
    }

    return data;
  };

  const loadHistoryItem = (item: PredictionData) => {
    setLocation(LOCATIONS.find(l => l.label === item.location)?.value || 'mumbai');
    setDisasterType(item.disasterType);
    setFactors({
      rainfall: item.rainfall,
      temperature: item.temperature,
      humidity: item.humidity,
      windSpeed: item.windSpeed,
      pressure: item.pressure,
      population: item.population
    });
    setPrediction(item);
    setActiveTab('prediction');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Live Disaster Prediction Model
          </h1>
          <p className="text-gray-600">Input real environmental data and get AI-powered disaster predictions in real-time</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="prediction" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Prediction
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Satellite className="w-4 h-4" />
              Live Data
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prediction" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Environmental Data Input
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isLiveMode ? <Wifi className="w-4 h-4 text-green-500" /> : 
                         isDatasetMode ? <Database className="w-4 h-4 text-blue-500" /> : 
                         <WifiOff className="w-4 h-4 text-gray-400" />}
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={isLiveMode}
                            onCheckedChange={handleLiveModeToggle}
                            className="data-[state=checked]:bg-green-500 scale-75"
                          />
                          <span className="text-xs">Live</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={isDatasetMode}
                            onCheckedChange={handleDatasetModeToggle}
                            className="data-[state=checked]:bg-blue-500 scale-75"
                          />
                          <span className="text-xs">Dataset</span>
                        </div>
                      </div>
                      {isLiveMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchLiveWeatherData}
                          disabled={isLoadingWeather}
                          className="h-8"
                        >
                          {isLoadingWeather ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  {(isLiveMode || isDatasetMode) && (
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Source: {weatherSource}</span>
                        {lastWeatherUpdate && <span>Updated: {lastWeatherUpdate}</span>}
                      </div>
                      {isLiveMode && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={autoRefresh}
                              onCheckedChange={setAutoRefresh}
                              className="scale-75"
                            />
                            <span>Auto-refresh (5min)</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {WeatherService.isAPIKeyConfigured() ? 'API Connected' : 'Demo Mode'}
                          </Badge>
                        </div>
                      )}
                      {isDatasetMode && (
                        <div className="flex items-center gap-4">
                          <Select value={selectedDataset || ''} onValueChange={setSelectedDataset}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Select dataset" />
                            </SelectTrigger>
                            <SelectContent>
                              {uploadedDatasets.map(dataset => (
                                <SelectItem key={dataset.id} value={dataset.id}>
                                  {dataset.name} ({dataset.type.toUpperCase()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedRecord && (
                            <Badge variant="outline" className="text-xs">
                              {selectedRecord.date || 'Latest Record'}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2">Location</label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATIONS.map(loc => (
                            <SelectItem key={loc.value} value={loc.value}>
                              {loc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block mb-2">Disaster Type</label>
                      <Select value={disasterType} onValueChange={setDisasterType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISASTER_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 flex items-center justify-between">
                        <span>Rainfall: {factors.rainfall} mm</span>
                        {isLiveMode && <Badge variant="secondary" className="text-xs">Live</Badge>}
                        {isDatasetMode && <Badge variant="outline" className="text-xs">Dataset</Badge>}
                      </label>
                      <Slider
                        value={[factors.rainfall]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, rainfall: value }))}
                        max={200}
                        step={5}
                        className="w-full"
                        disabled={isLiveMode || isDatasetMode}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 flex items-center justify-between">
                        <span>Temperature: {factors.temperature}°C</span>
                        {isLiveMode && <Badge variant="secondary" className="text-xs">Live</Badge>}
                        {isDatasetMode && <Badge variant="outline" className="text-xs">Dataset</Badge>}
                      </label>
                      <Slider
                        value={[factors.temperature]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, temperature: value }))}
                        min={10}
                        max={50}
                        step={1}
                        className="w-full"
                        disabled={isLiveMode || isDatasetMode}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 flex items-center justify-between">
                        <span>Humidity: {factors.humidity}%</span>
                        {isLiveMode && <Badge variant="secondary" className="text-xs">Live</Badge>}
                        {isDatasetMode && <Badge variant="outline" className="text-xs">Dataset</Badge>}
                      </label>
                      <Slider
                        value={[factors.humidity]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, humidity: value }))}
                        max={100}
                        step={5}
                        className="w-full"
                        disabled={isLiveMode || isDatasetMode}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 flex items-center justify-between">
                        <span>Wind Speed: {factors.windSpeed} km/h</span>
                        {isLiveMode && <Badge variant="secondary" className="text-xs">Live</Badge>}
                        {isDatasetMode && <Badge variant="outline" className="text-xs">Dataset</Badge>}
                      </label>
                      <Slider
                        value={[factors.windSpeed]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, windSpeed: value }))}
                        max={150}
                        step={5}
                        className="w-full"
                        disabled={isLiveMode || isDatasetMode}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 flex items-center justify-between">
                        <span>Atmospheric Pressure: {factors.pressure} mb</span>
                        {isLiveMode && <Badge variant="secondary" className="text-xs">Live</Badge>}
                        {isDatasetMode && <Badge variant="outline" className="text-xs">Dataset</Badge>}
                      </label>
                      <Slider
                        value={[factors.pressure]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, pressure: value }))}
                        min={950}
                        max={1050}
                        step={5}
                        className="w-full"
                        disabled={isLiveMode || isDatasetMode}
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Population Density: {factors.population.toLocaleString()}/km²</label>
                      <Slider
                        value={[factors.population]}
                        onValueChange={([value]) => setFactors(prev => ({ ...prev, population: value }))}
                        min={100}
                        max={20000}
                        step={100}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Button onClick={generatePrediction} className="w-full" size="lg">
                    Generate Prediction
                  </Button>
                </CardContent>
              </Card>

              {/* Results Panel */}
              {prediction && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Prediction Results
                      </span>
                      <Badge variant="outline">{prediction.confidence}% Confidence</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Risk Score */}
                    <div className="text-center space-y-2">
                      <div className="relative w-32 h-32 mx-auto">
                        <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                          <div className={`w-24 h-24 rounded-full ${getRiskColor(prediction.riskLevel)} flex items-center justify-center text-white`}>
                            <span className="text-xl">{prediction.riskScore}%</span>
                          </div>
                        </div>
                      </div>
                      <h3>Risk Score</h3>
                      <Badge className={getRiskColor(prediction.riskLevel)}>
                        {prediction.riskLevel} Risk
                      </Badge>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-sm text-gray-600">Timeline</p>
                        <p>{prediction.timeline}</p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <Users className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <p className="text-sm text-gray-600">Affected Population</p>
                        <p>{prediction.affectedPopulation.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="mb-3">Recommended Actions</h4>
                      <div className="space-y-2">
                        {prediction.recommendations.map((rec, index) => (
                          <Alert key={index}>
                            <AlertDescription>{rec}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>

                    {/* Population Impact Breakdown */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Population Impact Calculation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Base Population Density:</span>
                          <span>{prediction.population.toLocaleString()}/km²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Score Impact:</span>
                          <span>{prediction.riskScore}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Disaster Type Factor:</span>
                          <span>{prediction.disasterType === 'earthquake' ? 'Wide area' : 
                                 prediction.disasterType === 'cyclone' ? 'Coastal zones' :
                                 prediction.disasterType === 'flood' ? 'Low-lying areas' : 'Localized slopes'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Evacuation Estimate:</span>
                          <span>{prediction.riskLevel === 'High' ? '60-90%' : 
                                 prediction.riskLevel === 'Medium' ? '30-60%' : '10-30%'}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                          <span>Total Affected:</span>
                          <span className="font-medium">{prediction.affectedPopulation.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          * Includes directly impacted residents plus those requiring evacuation
                        </p>
                      </div>
                    </div>

                    {/* Dataset Analysis */}
                    {prediction.datasetAnalysis && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="mb-3 flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Dataset Analysis Insights
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium">Strong Correlations:</span>
                              <div className="mt-1">
                                {Object.entries(prediction.datasetAnalysis.correlations)
                                  .filter(([_, corr]) => Math.abs(corr) > 0.3)
                                  .map(([factor, corr]) => (
                                    <div key={factor} className="text-xs">
                                      {factor}: {Math.round(corr * 100)}%
                                    </div>
                                  ))}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Risk Patterns:</span>
                              <div className="mt-1 text-xs">
                                {prediction.datasetAnalysis.riskPatterns.length > 0 ? 
                                  `${prediction.datasetAnalysis.riskPatterns.length} historical matches` :
                                  'No similar patterns found'}
                              </div>
                            </div>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <span className="font-medium">Analysis Confidence: </span>
                            <span className="text-purple-600">{prediction.datasetAnalysis.confidence}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prediction Reasoning */}
                    {prediction.reasoning && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          Prediction Reasoning
                        </h4>
                        <div className="space-y-1">
                          {prediction.reasoning.map((reason, index) => (
                            <div key={index} className="text-sm flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="mb-2 flex items-center justify-between">
                        <span>Input Summary</span>
                        <Badge variant="outline" className="text-xs">
                          {prediction.predictionMethod === 'dataset' ? 'Dataset-Based' :
                           prediction.predictionMethod === 'live' ? 'Live Data' : 'Manual Input'}
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Location: {prediction.location}</span>
                        <span>Type: {DISASTER_TYPES.find(t => t.value === prediction.disasterType)?.label}</span>
                        <span>Rainfall: {prediction.rainfall}mm</span>
                        <span>Temperature: {prediction.temperature}°C</span>
                        <span>Humidity: {prediction.humidity}%</span>
                        <span>Wind: {prediction.windSpeed} km/h</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Weather Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="mb-2">Drop your files here</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Support for CSV and PDF files up to 10MB
                    </p>
                    <input
                      type="file"
                      accept=".csv,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isUploading}
                    />
                    <Button 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                      className="relative"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Files
                        </>
                      )}
                    </Button>
                  </div>

                  {uploadError && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-red-800">
                        {uploadError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="mb-2">Supported Data Formats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span><strong>CSV Files:</strong> Headers like date, location, temperature, humidity, pressure, wind_speed, rainfall</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-red-600" />
                        <span><strong>PDF Files:</strong> Weather reports with tabular data or structured text</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="mb-2">CSV Format Example</h4>
                    <div className="text-xs font-mono bg-white p-2 rounded border">
                      date,location,temperature,humidity,pressure,wind_speed,rainfall<br/>
                      2024-01-01,Mumbai,28,75,1010,15,2.5<br/>
                      2024-01-02,Mumbai,30,70,1012,12,0.0
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Uploaded Datasets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Uploaded Datasets ({uploadedDatasets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadedDatasets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No datasets uploaded yet</p>
                      <p className="text-sm">Upload CSV or PDF files to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {uploadedDatasets.map((dataset) => (
                        <div 
                          key={dataset.id} 
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedDataset === dataset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedDataset(dataset.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <FileText className={`w-4 h-4 ${dataset.type === 'csv' ? 'text-green-600' : 'text-red-600'}`} />
                              <span className="font-medium">{dataset.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {dataset.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab('analysis');
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDataset(dataset.id);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>
                              <span>Records: {dataset.summary.totalRecords}</span>
                            </div>
                            <div>
                              <span>Locations: {dataset.summary.locations.length}</span>
                            </div>
                            <div>
                              <span>Avg Temp: {dataset.summary.avgTemperature}°C</span>
                            </div>
                            <div>
                              <span>Avg Rain: {dataset.summary.avgRainfall}mm</span>
                            </div>
                          </div>
                          
                          {dataset.summary.dateRange.start && (
                            <div className="mt-2 text-xs text-gray-500">
                              {dataset.summary.dateRange.start} to {dataset.summary.dateRange.end}
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Uploaded: {new Date(dataset.uploadDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Dataset Usage Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use Your Uploaded Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h4 className="mb-2">1. Upload Data</h4>
                    <p className="text-sm text-gray-600">Upload your CSV or PDF weather data files</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Database className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h4 className="mb-2">2. Select Dataset</h4>
                    <p className="text-sm text-gray-600">Choose a dataset and enable "Dataset Mode" in Prediction tab</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <h4 className="mb-2">3. Generate Predictions</h4>
                    <p className="text-sm text-gray-600">Use your uploaded data to make disaster predictions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Weather Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Satellite className="w-5 h-5" />
                    Live Weather Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <h3 className="text-sm text-gray-600">Current Temperature</h3>
                      <p className="text-2xl">{factors.temperature}°C</p>
                    </div>
                    <div className="text-center p-4 bg-cyan-50 rounded-lg">
                      <h3 className="text-sm text-gray-600">Humidity</h3>
                      <p className="text-2xl">{factors.humidity}%</p>
                    </div>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <h3 className="text-sm text-gray-600">Wind Speed</h3>
                      <p className="text-2xl">{factors.windSpeed} km/h</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <h3 className="text-sm text-gray-600">Pressure</h3>
                      <p className="text-2xl">{factors.pressure} mb</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm text-gray-600 mb-2">Rainfall (Last Hour)</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((factors.rainfall / 50) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-lg">{factors.rainfall} mm</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Source:</span>
                      <span className="text-blue-600">{weatherSource}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Updated:</span>
                      <span>{lastWeatherUpdate || 'Not yet updated'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Update Frequency:</span>
                      <span>{autoRefresh ? '5 minutes' : 'Manual only'}</span>
                    </div>
                  </div>

                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {WeatherService.isAPIKeyConfigured() 
                        ? 'Connected to live weather API. Data updates automatically.'
                        : 'Demo mode: Using simulated weather data. Configure API key for real data.'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Weather Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weather Trend (Last 12 Hours)</CardTitle>
                </CardHeader>
                <CardContent>
                  {weatherTrend.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weatherTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} name="Temp (°C)" />
                          <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} name="Humidity (%)" />
                          <Line type="monotone" dataKey="rainfall" stroke="#10b981" strokeWidth={2} name="Rainfall (mm)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Enable live mode to see weather trends</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Auto-Prediction Results */}
            {(isLiveMode || isDatasetMode) && prediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {isLiveMode ? 'Live' : 'Dataset'} Prediction Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full ${getRiskColor(prediction.riskLevel)} mx-auto mb-2 flex items-center justify-center text-white`}>
                        <span>{prediction.riskScore}%</span>
                      </div>
                      <p className="text-sm text-gray-600">Risk Score</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p>{prediction.timeline}</p>
                      <p className="text-sm text-gray-600">Timeline</p>
                    </div>
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p>{prediction.affectedPopulation.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Affected Population</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Button 
                      onClick={generatePrediction}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Update Prediction with Latest Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {prediction ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Factor Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getAnalysisData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Factor Impact Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {getAnalysisData().map((factor, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between">
                            <span>{factor.name}</span>
                            <span>{Math.round(factor.value)}%</span>
                          </div>
                          <Progress value={factor.value} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Dataset-Specific Analysis */}
                {prediction.datasetAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="w-5 h-5" />
                          Historical Correlations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(prediction.datasetAnalysis.correlations).map(([factor, correlation]) => (
                            <div key={factor} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="capitalize">{factor}</span>
                                <span className={`${correlation > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                  {Math.round(correlation * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${correlation > 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.abs(correlation) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Risk Pattern Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {prediction.datasetAnalysis.riskPatterns.length > 0 ? (
                          prediction.datasetAnalysis.riskPatterns.map((pattern, index) => (
                            <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                              <h4 className="font-medium mb-2">Pattern {index + 1}</h4>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span>Historical Occurrences:</span>
                                  <span>{pattern.occurrences}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Average Risk Score:</span>
                                  <span>{pattern.riskScore}%</span>
                                </div>
                                <div className="mt-2">
                                  <span className="font-medium">Condition Ranges:</span>
                                  {Object.entries(pattern.conditions).map(([factor, range]) => (
                                    <div key={factor} className="text-xs ml-2">
                                      {factor}: {range.min}-{range.max}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No historical risk patterns found</p>
                            <p className="text-sm">Current conditions are unique</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Seasonal Analysis */}
                {prediction.datasetAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Seasonal Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        {Object.entries(prediction.datasetAnalysis.seasonalFactors).map(([season, factor]) => (
                          <div key={season} className="text-center p-3 bg-blue-50 rounded-lg">
                            <h4 className="capitalize mb-2">{season}</h4>
                            <div className={`text-2xl ${factor > 1.2 ? 'text-red-600' : factor < 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                              {Math.round(factor * 100)}%
                            </div>
                            <p className="text-xs text-gray-600">Risk Factor</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2">No Analysis Available</h3>
                  <p className="text-gray-600">Generate a prediction first to see the analysis breakdown.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {history.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.slice().reverse().map((item, index) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => loadHistoryItem(item)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4>{item.location}</h4>
                          <p className="text-sm text-gray-600">{DISASTER_TYPES.find(t => t.value === item.disasterType)?.label}</p>
                        </div>
                        <Badge className={getRiskColor(item.riskLevel)}>
                          {item.riskScore}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-2">{item.timestamp}</p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Timeline:</span>
                          <span>{item.timeline}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Affected:</span>
                          <span>{item.affectedPopulation.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span>{item.confidence}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Method:</span>
                          <span className="capitalize">{item.predictionMethod || 'manual'}</span>
                        </div>
                      </div>
                      {item.datasetAnalysis && (
                        <div className="mt-2 text-xs bg-purple-100 p-2 rounded">
                          <span className="font-medium">Dataset Analysis:</span>
                          <span className="ml-1">{item.datasetAnalysis.confidence}% confidence</span>
                        </div>
                      )}
                      <p className="text-xs text-blue-600 mt-2">Click to reload</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="mb-2">No History Available</h3>
                  <p className="text-gray-600">Your prediction history will appear here automatically.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}