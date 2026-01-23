// Weather API service for live data integration
interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  rainfall: number;
  location: string;
  timestamp: string;
  source: string;
}

interface WeatherAPIResponse {
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
  };
  rain?: {
    '1h'?: number;
  };
  name: string;
  dt: number;
}

export class WeatherService {
  private static API_KEY = 'YOUR_OPENWEATHER_API_KEY'; // Replace with real API key
  private static BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

  // Location coordinates for Indian cities
  private static CITY_COORDS = {
    mumbai: { lat: 19.0760, lon: 72.8777 },
    chennai: { lat: 13.0827, lon: 80.2707 },
    kolkata: { lat: 22.5726, lon: 88.3639 },
    delhi: { lat: 28.6139, lon: 77.2090 },
    bangalore: { lat: 12.9716, lon: 77.5946 },
    hyderabad: { lat: 17.3850, lon: 78.4867 }
  };

  static async fetchLiveWeatherData(location: string): Promise<WeatherData> {
    try {
      // For demo purposes, we'll use mock data that simulates real API responses
      // In production, uncomment the real API call below
      return this.getMockWeatherData(location);

      /* Real API call (uncomment when you have API key):
      const coords = this.CITY_COORDS[location as keyof typeof this.CITY_COORDS];
      if (!coords) {
        throw new Error('Location not supported');
      }

      const response = await fetch(
        `${this.BASE_URL}?lat=${coords.lat}&lon=${coords.lon}&appid=${this.API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data: WeatherAPIResponse = await response.json();
      
      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        pressure: Math.round(data.main.pressure),
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        rainfall: data.rain?.['1h'] || 0,
        location: data.name,
        timestamp: new Date(data.dt * 1000).toISOString(),
        source: 'OpenWeatherMap API'
      };
      */
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to mock data if API fails
      return this.getMockWeatherData(location);
    }
  }

  private static getMockWeatherData(location: string): WeatherData {
    // Generate realistic mock weather data that varies by location and time
    const now = new Date();
    const hour = now.getHours();
    const isRainySeasonMonth = [6, 7, 8, 9].includes(now.getMonth()); // June-September
    
    // Base conditions vary by city
    const cityBaseConditions = {
      mumbai: { temp: 30, humidity: 75, pressure: 1010, wind: 15, coastalFactor: 1.2 },
      chennai: { temp: 32, humidity: 70, pressure: 1012, wind: 12, coastalFactor: 1.1 },
      kolkata: { temp: 29, humidity: 80, pressure: 1011, wind: 8, coastalFactor: 0.8 },
      delhi: { temp: 35, humidity: 45, pressure: 1015, wind: 10, coastalFactor: 0.5 },
      bangalore: { temp: 25, humidity: 60, pressure: 1018, wind: 6, coastalFactor: 0.3 },
      hyderabad: { temp: 33, humidity: 55, pressure: 1014, wind: 9, coastalFactor: 0.4 }
    };

    const base = cityBaseConditions[location as keyof typeof cityBaseConditions] || 
                 cityBaseConditions.mumbai;

    // Add realistic variations
    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 8; // Temperature curve throughout day
    const pressureVariation = (Math.random() - 0.5) * 20;
    const humidityVariation = isRainySeasonMonth ? 15 : -10;
    const windVariation = (Math.random() - 0.5) * 10;

    // Rainfall probability increases during rainy season and certain hours
    const rainfallProbability = isRainySeasonMonth ? 0.3 : 0.1;
    const isRaining = Math.random() < rainfallProbability;
    const rainfall = isRaining ? Math.random() * 50 + 5 : Math.random() * 2;

    return {
      temperature: Math.round(base.temp + tempVariation + (Math.random() - 0.5) * 4),
      humidity: Math.max(20, Math.min(95, Math.round(base.humidity + humidityVariation + (Math.random() - 0.5) * 10))),
      pressure: Math.round(base.pressure + pressureVariation),
      windSpeed: Math.max(0, Math.round(base.wind + windVariation)),
      rainfall: Math.round(rainfall * 10) / 10,
      location: location.charAt(0).toUpperCase() + location.slice(1),
      timestamp: now.toISOString(),
      source: 'Live Weather Simulation (Demo Mode)'
    };
  }

  static getWeatherTrend(location: string, hours: number = 24): WeatherData[] {
    // Generate historical/forecast data for trend analysis
    const trend: WeatherData[] = [];
    const now = new Date();
    
    for (let i = -hours; i <= 0; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const mockDate = new Date();
      mockDate.setHours(time.getHours());
      
      // Temporarily set current time for mock data generation
      const originalNow = Date.now;
      Date.now = () => mockDate.getTime();
      
      const data = this.getMockWeatherData(location);
      data.timestamp = time.toISOString();
      
      trend.push(data);
      
      // Restore original Date.now
      Date.now = originalNow;
    }
    
    return trend;
  }

  static isAPIKeyConfigured(): boolean {
    return this.API_KEY !== 'YOUR_OPENWEATHER_API_KEY' && this.API_KEY.length > 0;
  }
}