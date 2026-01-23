// Advanced prediction engine that analyzes uploaded datasets
import { UploadedDataset, WeatherRecord, DataUploadService } from './DataUploadService';

interface DatasetAnalysis {
  correlations: { [key: string]: number };
  trends: { [key: string]: number };
  riskPatterns: RiskPattern[];
  seasonalFactors: { [key: string]: number };
  confidence: number;
}

interface RiskPattern {
  conditions: { [key: string]: { min: number; max: number } };
  riskScore: number;
  occurrences: number;
  disasterType: string;
}

interface PredictionInput {
  disasterType: string;
  location: string;
  currentConditions: {
    rainfall: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
  };
}

export class DatasetPredictionEngine {
  
  // Main prediction function that uses dataset analysis
  static generateDatasetBasedPrediction(
    dataset: UploadedDataset,
    input: PredictionInput
  ): {
    riskScore: number;
    confidence: number;
    analysis: DatasetAnalysis;
    timeline: string;
    affectedPopulation: number;
    recommendations: string[];
    reasoning: string[];
  } {
    
    // Filter dataset for relevant location and conditions
    const relevantRecords = this.getRelevantRecords(dataset, input.location);
    
    if (relevantRecords.length < 10) {
      // Fallback to basic prediction if insufficient data
      return this.generateBasicPrediction(input);
    }

    // Perform comprehensive dataset analysis
    const analysis = this.analyzeDataset(relevantRecords, input.disasterType);
    
    // Calculate risk based on historical patterns
    const riskScore = this.calculateRiskFromPatterns(input.currentConditions, analysis, input.disasterType);
    
    // Generate timeline based on historical data
    const timeline = this.predictTimeline(input.currentConditions, analysis, riskScore);
    
    // Calculate affected population using historical correlations
    const affectedPopulation = this.calculateAffectedPopulationFromData(
      riskScore, 
      input.currentConditions, 
      analysis
    );
    
    // Generate data-driven recommendations
    const recommendations = this.generateDataDrivenRecommendations(riskScore, analysis, input.disasterType);
    
    // Generate reasoning explanation
    const reasoning = this.generateReasoningExplanation(input.currentConditions, analysis, riskScore);

    return {
      riskScore: Math.min(Math.round(riskScore), 100),
      confidence: analysis.confidence,
      analysis,
      timeline,
      affectedPopulation,
      recommendations,
      reasoning
    };
  }

  // Analyze dataset for patterns and correlations
  private static analyzeDataset(records: WeatherRecord[], disasterType: string): DatasetAnalysis {
    const correlations = this.calculateCorrelations(records, disasterType);
    const trends = this.calculateTrends(records);
    const riskPatterns = this.identifyRiskPatterns(records, disasterType);
    const seasonalFactors = this.calculateSeasonalFactors(records);
    const confidence = this.calculateAnalysisConfidence(records);

    return {
      correlations,
      trends,
      riskPatterns,
      seasonalFactors,
      confidence
    };
  }

  // Calculate correlations between weather factors and risk
  private static calculateCorrelations(records: WeatherRecord[], disasterType: string): { [key: string]: number } {
    const factors = ['rainfall', 'temperature', 'humidity', 'windSpeed', 'pressure'];
    const correlations: { [key: string]: number } = {};

    factors.forEach(factor => {
      const values = records.map(r => r[factor] as number).filter(v => v !== undefined);
      const riskScores = this.calculateHistoricalRiskScores(records, disasterType);
      
      if (values.length > 5) {
        correlations[factor] = this.pearsonCorrelation(values, riskScores);
      } else {
        correlations[factor] = 0;
      }
    });

    return correlations;
  }

  // Calculate historical risk scores for correlation analysis
  private static calculateHistoricalRiskScores(records: WeatherRecord[], disasterType: string): number[] {
    return records.map(record => {
      // Simplified risk calculation for historical analysis
      let risk = 0;
      
      switch (disasterType) {
        case 'flood':
          risk = (record.rainfall || 0) * 0.4 + (record.humidity || 0) * 0.3 + 
                 (1000 - (record.pressure || 1013)) * 0.3;
          break;
        case 'cyclone':
          risk = (record.windSpeed || 0) * 0.5 + (1013 - (record.pressure || 1013)) * 0.3 + 
                 (record.temperature || 0) * 0.2;
          break;
        case 'landslide':
          risk = (record.rainfall || 0) * 0.6 + (record.humidity || 0) * 0.4;
          break;
        default:
          risk = (record.temperature || 0) + (record.rainfall || 0) + (record.humidity || 0);
      }
      
      return Math.min(risk, 100);
    });
  }

  // Calculate Pearson correlation coefficient
  private static pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.slice(0, n).reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.slice(0, n).reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Identify high-risk patterns in historical data
  private static identifyRiskPatterns(records: WeatherRecord[], disasterType: string): RiskPattern[] {
    const patterns: RiskPattern[] = [];
    const factors = ['rainfall', 'temperature', 'humidity', 'windSpeed', 'pressure'];
    
    // Group records by risk levels
    const highRiskRecords = records.filter(record => {
      const riskScore = this.calculateHistoricalRiskScores([record], disasterType)[0];
      return riskScore > 70;
    });

    if (highRiskRecords.length > 0) {
      const pattern: RiskPattern = {
        conditions: {},
        riskScore: 85,
        occurrences: highRiskRecords.length,
        disasterType
      };

      factors.forEach(factor => {
        const values = highRiskRecords.map(r => r[factor] as number).filter(v => v !== undefined);
        if (values.length > 0) {
          pattern.conditions[factor] = {
            min: Math.min(...values),
            max: Math.max(...values)
          };
        }
      });

      patterns.push(pattern);
    }

    return patterns;
  }

  // Calculate seasonal factors
  private static calculateSeasonalFactors(records: WeatherRecord[]): { [key: string]: number } {
    const seasonalFactors: { [key: string]: number } = {};
    const months = ['spring', 'summer', 'monsoon', 'winter'];
    
    // Simplified seasonal analysis
    months.forEach((season, index) => {
      const seasonRecords = records.filter(record => {
        if (!record.date) return false;
        const month = new Date(record.date).getMonth();
        return Math.floor(month / 3) === index;
      });
      
      if (seasonRecords.length > 0) {
        const avgRisk = seasonRecords.reduce((acc, record) => {
          return acc + ((record.rainfall || 0) + (record.humidity || 0)) / 2;
        }, 0) / seasonRecords.length;
        
        seasonalFactors[season] = avgRisk / 50; // Normalize to 0-2 range
      } else {
        seasonalFactors[season] = 1;
      }
    });

    return seasonalFactors;
  }

  // Calculate trends in the data
  private static calculateTrends(records: WeatherRecord[]): { [key: string]: number } {
    const trends: { [key: string]: number } = {};
    const factors = ['rainfall', 'temperature', 'humidity', 'windSpeed', 'pressure'];
    
    factors.forEach(factor => {
      const values = records
        .map(r => r[factor] as number)
        .filter(v => v !== undefined)
        .slice(-30); // Last 30 records
      
      if (values.length > 5) {
        // Simple trend calculation (slope)
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((acc, val, i) => acc + val * i, 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        trends[factor] = slope;
      } else {
        trends[factor] = 0;
      }
    });

    return trends;
  }

  // Calculate analysis confidence based on data quality
  private static calculateAnalysisConfidence(records: WeatherRecord[]): number {
    const dataQualityScore = records.length > 100 ? 100 : records.length;
    const completenessScore = this.calculateDataCompleteness(records);
    const recencyScore = this.calculateDataRecency(records);
    
    return Math.round((dataQualityScore * 0.4 + completenessScore * 0.3 + recencyScore * 0.3));
  }

  // Calculate data completeness score
  private static calculateDataCompleteness(records: WeatherRecord[]): number {
    const requiredFields = ['rainfall', 'temperature', 'humidity', 'windSpeed', 'pressure'];
    let totalFields = 0;
    let completeFields = 0;

    records.forEach(record => {
      requiredFields.forEach(field => {
        totalFields++;
        if (record[field] !== undefined && record[field] !== null) {
          completeFields++;
        }
      });
    });

    return totalFields > 0 ? (completeFields / totalFields) * 100 : 0;
  }

  // Calculate data recency score
  private static calculateDataRecency(records: WeatherRecord[]): number {
    const datedRecords = records.filter(r => r.date);
    if (datedRecords.length === 0) return 50;

    const latestDate = new Date(Math.max(...datedRecords.map(r => new Date(r.date!).getTime())));
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest <= 7) return 100;
    if (daysSinceLatest <= 30) return 80;
    if (daysSinceLatest <= 90) return 60;
    return 40;
  }

  // Calculate risk score based on identified patterns
  private static calculateRiskFromPatterns(
    conditions: PredictionInput['currentConditions'],
    analysis: DatasetAnalysis,
    disasterType: string
  ): number {
    let riskScore = 0;
    let weightSum = 0;

    // Use correlations to weight factors
    Object.entries(analysis.correlations).forEach(([factor, correlation]) => {
      const weight = Math.abs(correlation);
      const value = conditions[factor as keyof typeof conditions];
      
      if (value !== undefined && weight > 0.1) {
        let factorRisk = 0;
        
        switch (factor) {
          case 'rainfall':
            factorRisk = Math.min((value / 200) * 100, 100);
            break;
          case 'temperature':
            factorRisk = disasterType === 'heat' ? 
              Math.max(0, (value - 30) * 5) : 
              Math.abs(value - 25) * 2;
            break;
          case 'humidity':
            factorRisk = (value / 100) * (correlation > 0 ? 100 : -100);
            break;
          case 'windSpeed':
            factorRisk = Math.min((value / 150) * 100, 100);
            break;
          case 'pressure':
            factorRisk = Math.max(0, (1013 - value) * 2);
            break;
        }
        
        riskScore += factorRisk * weight;
        weightSum += weight;
      }
    });

    // Normalize by total weight
    if (weightSum > 0) {
      riskScore = riskScore / weightSum;
    }

    // Apply pattern matching bonus
    const patternBonus = this.calculatePatternMatchBonus(conditions, analysis.riskPatterns);
    riskScore += patternBonus;

    // Apply seasonal factors
    const currentSeason = this.getCurrentSeason();
    const seasonalMultiplier = analysis.seasonalFactors[currentSeason] || 1;
    riskScore *= seasonalMultiplier;

    return Math.max(0, Math.min(100, riskScore));
  }

  // Calculate pattern matching bonus
  private static calculatePatternMatchBonus(
    conditions: PredictionInput['currentConditions'],
    patterns: RiskPattern[]
  ): number {
    let maxBonus = 0;

    patterns.forEach(pattern => {
      let matchScore = 0;
      let totalFactors = 0;

      Object.entries(pattern.conditions).forEach(([factor, range]) => {
        const value = conditions[factor as keyof typeof conditions];
        if (value !== undefined) {
          totalFactors++;
          if (value >= range.min && value <= range.max) {
            matchScore++;
          }
        }
      });

      if (totalFactors > 0) {
        const matchPercentage = matchScore / totalFactors;
        const bonus = matchPercentage * 20; // Up to 20 point bonus
        maxBonus = Math.max(maxBonus, bonus);
      }
    });

    return maxBonus;
  }

  // Generate data-driven timeline prediction
  private static predictTimeline(
    conditions: PredictionInput['currentConditions'],
    analysis: DatasetAnalysis,
    riskScore: number
  ): string {
    const urgencyFactors = [
      conditions.rainfall > 100 ? 'immediate' : null,
      conditions.windSpeed > 80 ? 'immediate' : null,
      conditions.pressure < 980 ? 'urgent' : null,
      riskScore > 80 ? 'urgent' : null
    ].filter(Boolean);

    if (urgencyFactors.includes('immediate')) return '2-6 hours';
    if (urgencyFactors.includes('urgent')) return '6-24 hours';
    if (riskScore > 60) return '1-2 days';
    if (riskScore > 40) return '2-5 days';
    return '5-10 days';
  }

  // Calculate affected population using historical data
  private static calculateAffectedPopulationFromData(
    riskScore: number,
    conditions: PredictionInput['currentConditions'],
    analysis: DatasetAnalysis
  ): number {
    // Base calculation using risk score
    const basePopulation = 5000; // Default population density
    const riskMultiplier = riskScore / 100;
    
    // Apply correlation-based adjustments
    const rainfallCorrelation = analysis.correlations.rainfall || 0;
    const windCorrelation = analysis.correlations.windSpeed || 0;
    
    let impactMultiplier = 1;
    if (rainfallCorrelation > 0.5 && conditions.rainfall > 80) {
      impactMultiplier *= 1.5;
    }
    if (windCorrelation > 0.5 && conditions.windSpeed > 60) {
      impactMultiplier *= 1.3;
    }
    
    const affectedPopulation = basePopulation * riskMultiplier * impactMultiplier;
    return Math.round(affectedPopulation);
  }

  // Generate data-driven recommendations
  private static generateDataDrivenRecommendations(
    riskScore: number,
    analysis: DatasetAnalysis,
    disasterType: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskScore > 70) {
      recommendations.push(`Based on ${analysis.riskPatterns.length} similar historical patterns, immediate evacuation is recommended`);
      recommendations.push('Activate emergency response teams immediately');
      recommendations.push(`Historical data shows ${Math.round(analysis.confidence)}% confidence in high-risk scenarios`);
    } else if (riskScore > 40) {
      recommendations.push('Monitor conditions closely - historical patterns indicate potential escalation');
      recommendations.push('Prepare evacuation routes based on similar past events');
      recommendations.push('Issue weather warnings to residents');
    } else {
      recommendations.push('Continue routine monitoring');
      recommendations.push('Review emergency preparedness plans');
      recommendations.push('Update community on current risk assessment');
    }

    // Add disaster-specific recommendations
    if (disasterType === 'flood' && analysis.correlations.rainfall > 0.6) {
      recommendations.push('Historical data shows strong rainfall correlation - monitor drainage systems');
    }
    if (disasterType === 'cyclone' && analysis.correlations.windSpeed > 0.6) {
      recommendations.push('Wind speed patterns match historical cyclone events - secure loose objects');
    }

    return recommendations;
  }

  // Generate reasoning explanation
  private static generateReasoningExplanation(
    conditions: PredictionInput['currentConditions'],
    analysis: DatasetAnalysis,
    riskScore: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Analysis based on ${analysis.confidence}% confidence from historical data patterns`);
    
    // Explain strongest correlations
    const strongestCorrelation = Object.entries(analysis.correlations)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    
    if (strongestCorrelation && Math.abs(strongestCorrelation[1]) > 0.3) {
      reasoning.push(`${strongestCorrelation[0]} shows strongest correlation (${Math.round(strongestCorrelation[1] * 100)}%) with historical risk events`);
    }
    
    // Explain pattern matches
    if (analysis.riskPatterns.length > 0) {
      reasoning.push(`Current conditions match ${analysis.riskPatterns.length} historical high-risk patterns`);
    }
    
    // Explain seasonal factors
    const currentSeason = this.getCurrentSeason();
    const seasonalFactor = analysis.seasonalFactors[currentSeason];
    if (seasonalFactor && seasonalFactor > 1.2) {
      reasoning.push(`Current season (${currentSeason}) historically shows ${Math.round((seasonalFactor - 1) * 100)}% higher risk`);
    }

    return reasoning;
  }

  // Helper functions
  private static getRelevantRecords(dataset: UploadedDataset, location: string): WeatherRecord[] {
    return DataUploadService.getWeatherDataFromDataset(dataset, location);
  }

  private static getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'monsoon';
    return 'winter';
  }

  // Fallback basic prediction for insufficient data
  private static generateBasicPrediction(input: PredictionInput): any {
    return {
      riskScore: 30,
      confidence: 40,
      analysis: {
        correlations: {},
        trends: {},
        riskPatterns: [],
        seasonalFactors: {},
        confidence: 40
      },
      timeline: '2-5 days',
      affectedPopulation: 2000,
      recommendations: ['Insufficient historical data - using basic risk assessment', 'Upload more data for improved predictions'],
      reasoning: ['Basic prediction due to limited dataset', 'Recommendation: Upload more comprehensive historical data']
    };
  }
}

export type { DatasetAnalysis, RiskPattern, PredictionInput };