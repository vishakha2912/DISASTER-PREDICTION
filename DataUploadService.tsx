// Data upload and parsing service for PDF and CSV files
interface UploadedDataset {
  id: string;
  name: string;
  type: 'csv' | 'pdf';
  uploadDate: string;
  records: WeatherRecord[];
  columns: string[];
  summary: DatasetSummary;
}

interface WeatherRecord {
  date?: string;
  location?: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  rainfall?: number;
  [key: string]: any;
}

interface DatasetSummary {
  totalRecords: number;
  dateRange: {
    start: string;
    end: string;
  };
  locations: string[];
  avgTemperature: number;
  avgHumidity: number;
  avgRainfall: number;
}

export class DataUploadService {
  private static STORAGE_KEY = 'uploadedDatasets';

  // Parse CSV file
  static async parseCSV(file: File): Promise<UploadedDataset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file must have at least a header and one data row');
          }

          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const records: WeatherRecord[] = [];

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue;

            const record: WeatherRecord = {};
            headers.forEach((header, index) => {
              const value = values[index];
              
              // Map common column names to standard format
              const mappedHeader = this.mapColumnName(header);
              
              if (mappedHeader && value) {
                if (mappedHeader === 'date') {
                  record[mappedHeader] = value;
                } else if (mappedHeader === 'location') {
                  record[mappedHeader] = value;
                } else {
                  // Try to parse as number
                  const numValue = parseFloat(value);
                  record[mappedHeader] = isNaN(numValue) ? value : numValue;
                }
              }
            });

            if (Object.keys(record).length > 0) {
              records.push(record);
            }
          }

          const dataset: UploadedDataset = {
            id: Date.now().toString(),
            name: file.name.replace('.csv', ''),
            type: 'csv',
            uploadDate: new Date().toISOString(),
            records,
            columns: headers,
            summary: this.generateSummary(records)
          };

          resolve(dataset);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  }

  // Parse PDF file (extract text and look for weather data)
  static async parsePDF(file: File): Promise<UploadedDataset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // For demo purposes, we'll simulate PDF parsing
          // In production, you'd use a library like pdf-parse or pdf.js
          const mockPDFData = this.generateMockPDFData(file.name);
          
          const dataset: UploadedDataset = {
            id: Date.now().toString(),
            name: file.name.replace('.pdf', ''),
            type: 'pdf',
            uploadDate: new Date().toISOString(),
            records: mockPDFData,
            columns: ['date', 'location', 'temperature', 'humidity', 'pressure', 'windSpeed', 'rainfall'],
            summary: this.generateSummary(mockPDFData)
          };

          resolve(dataset);
        } catch (error) {
          reject(new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read PDF file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Map various column names to standard format
  private static mapColumnName(header: string): string | null {
    const lowerHeader = header.toLowerCase();
    
    const mappings: { [key: string]: string } = {
      // Date mappings
      'date': 'date',
      'time': 'date',
      'datetime': 'date',
      'timestamp': 'date',
      
      // Location mappings
      'location': 'location',
      'city': 'location',
      'place': 'location',
      'station': 'location',
      
      // Temperature mappings
      'temperature': 'temperature',
      'temp': 'temperature',
      'temperature_c': 'temperature',
      'temp_c': 'temperature',
      
      // Humidity mappings
      'humidity': 'humidity',
      'humidity_%': 'humidity',
      'rh': 'humidity',
      'relative_humidity': 'humidity',
      
      // Pressure mappings
      'pressure': 'pressure',
      'atmospheric_pressure': 'pressure',
      'pressure_mb': 'pressure',
      'pressure_hpa': 'pressure',
      
      // Wind speed mappings
      'wind_speed': 'windSpeed',
      'windspeed': 'windSpeed',
      'wind': 'windSpeed',
      'wind_kmh': 'windSpeed',
      
      // Rainfall mappings
      'rainfall': 'rainfall',
      'rain': 'rainfall',
      'precipitation': 'rainfall',
      'precip': 'rainfall',
      'rainfall_mm': 'rainfall'
    };

    return mappings[lowerHeader] || null;
  }

  // Generate mock PDF data (replace with real PDF parsing in production)
  private static generateMockPDFData(filename: string): WeatherRecord[] {
    const locations = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore'];
    const records: WeatherRecord[] = [];
    
    // Generate 30 days of mock data
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      locations.forEach(location => {
        records.push({
          date: date.toISOString().split('T')[0],
          location: location,
          temperature: Math.round(20 + Math.random() * 20),
          humidity: Math.round(40 + Math.random() * 40),
          pressure: Math.round(1000 + Math.random() * 30),
          windSpeed: Math.round(Math.random() * 30),
          rainfall: Math.round(Math.random() * 50 * 10) / 10
        });
      });
    }

    return records;
  }

  // Generate dataset summary statistics
  private static generateSummary(records: WeatherRecord[]): DatasetSummary {
    const temperatures = records.map(r => r.temperature).filter(t => typeof t === 'number') as number[];
    const humidity = records.map(r => r.humidity).filter(h => typeof h === 'number') as number[];
    const rainfall = records.map(r => r.rainfall).filter(r => typeof r === 'number') as number[];
    const dates = records.map(r => r.date).filter(d => d) as string[];
    const locations = [...new Set(records.map(r => r.location).filter(l => l))] as string[];

    return {
      totalRecords: records.length,
      dateRange: {
        start: dates.length > 0 ? dates.sort()[0] : '',
        end: dates.length > 0 ? dates.sort()[dates.length - 1] : ''
      },
      locations: locations,
      avgTemperature: temperatures.length > 0 ? Math.round(temperatures.reduce((a, b) => a + b, 0) / temperatures.length) : 0,
      avgHumidity: humidity.length > 0 ? Math.round(humidity.reduce((a, b) => a + b, 0) / humidity.length) : 0,
      avgRainfall: rainfall.length > 0 ? Math.round(rainfall.reduce((a, b) => a + b, 0) / rainfall.length * 10) / 10 : 0
    };
  }

  // Save dataset to localStorage
  static saveDataset(dataset: UploadedDataset): void {
    const existing = this.getStoredDatasets();
    existing.push(dataset);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));
  }

  // Get all stored datasets
  static getStoredDatasets(): UploadedDataset[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Delete a dataset
  static deleteDataset(id: string): void {
    const existing = this.getStoredDatasets();
    const filtered = existing.filter(d => d.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  // Get weather data for a specific location and date range from dataset
  static getWeatherDataFromDataset(
    dataset: UploadedDataset, 
    location: string, 
    startDate?: string, 
    endDate?: string
  ): WeatherRecord[] {
    let filtered = dataset.records;

    // Filter by location
    if (location && location !== 'all') {
      filtered = filtered.filter(record => 
        record.location?.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(record => 
        !record.date || record.date >= startDate
      );
    }

    if (endDate) {
      filtered = filtered.filter(record => 
        !record.date || record.date <= endDate
      );
    }

    return filtered;
  }

  // Get latest record for a location from dataset
  static getLatestRecord(dataset: UploadedDataset, location: string): WeatherRecord | null {
    const locationRecords = this.getWeatherDataFromDataset(dataset, location);
    
    if (locationRecords.length === 0) return null;

    // Sort by date (most recent first)
    const sorted = locationRecords.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return sorted[0];
  }

  // Validate file type
  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['text/csv', 'application/pdf', '.csv', '.pdf'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    const fileType = file.type || file.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.some(type => 
      fileType?.includes(type.replace('.', '')) || file.name.toLowerCase().endsWith(type)
    );

    if (!isValidType) {
      return { valid: false, error: 'Only CSV and PDF files are supported' };
    }

    return { valid: true };
  }
}

export type { UploadedDataset, WeatherRecord, DatasetSummary };