/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import {
  analyzeFrequency,
  analyzeDescriptiveStats,
  analyzeGrouped,
  analyzeCrossTab,
  analyzeHistogram,
} from '../services/dataLabService.js';

describe('Data Lab - Analysis Functions', () => {
  const sampleData = [
    { Name: 'Alice', Age: 30, City: 'London', Score: 85 },
    { Name: 'Bob', Age: 25, City: 'Paris', Score: 92 },
    { Name: 'Charlie', Age: 35, City: 'London', Score: 78 },
    { Name: 'Diana', Age: 28, City: 'Berlin', Score: 95 },
    { Name: 'Eve', Age: 32, City: 'London', Score: 88 },
  ];

  it('should calculate frequency distribution', () => {
    const result = analyzeFrequency(sampleData, 'City');
    
    expect(result.column).toBe('City');
    expect(result.totalCount).toBe(5);
    expect(result.frequencies.length).toBe(3); // London, Paris, Berlin
    
    const london = result.frequencies.find((f: any) => f.value === 'London');
    expect(london.count).toBe(3);
    expect(london.percentage).toBe(60);
  });

  it('should handle missing values in frequency', () => {
    const data = [
      { Name: 'Alice', Value: 'A' },
      { Name: 'Bob', Value: undefined },
      { Name: 'Charlie', Value: 'A' },
    ];
    
    const result = analyzeFrequency(data, 'Value');
    
    const missing = result.frequencies.find((f: any) => f.value === 'Missing');
    expect(missing.count).toBe(1);
    expect(missing.percentage).toBe(33);
  });

  it('should calculate descriptive statistics', () => {
    const result = analyzeDescriptiveStats(sampleData, 'Age');
    
    expect(result.count).toBe(5);
    expect(result.mean).toBe(30);
    expect(result.min).toBe(25);
    expect(result.max).toBe(35);
    expect(result.median).toBe(30);
    expect(result.range).toBe(10);
    expect(result.stdDev).toBeGreaterThan(0);
  });

  it('should handle non-numeric columns gracefully', () => {
    const result = analyzeDescriptiveStats(sampleData, 'Name');
    
    expect(result).toHaveProperty('error');
  });

  it('should perform grouped analysis with sum', () => {
    const result = analyzeGrouped(sampleData, 'City', 'Score', 'sum');
    
    expect(result.groupColumn).toBe('City');
    expect(result.groups.length).toBe(3);
    
    const london = result.groups.find((g: any) => g.group === 'London');
    expect(london.aggregatedValue).toBeCloseTo(251, 0.1); // 85 + 78 + 88
  });

  it('should perform grouped analysis with mean', () => {
    const result = analyzeGrouped(sampleData, 'City', 'Age', 'mean');
    
    const paris = result.groups.find((g: any) => g.group === 'Paris');
    expect(paris.aggregatedValue).toBe(25);
  });

  it('should create cross-tabulation', () => {
    const data = [
      { Gender: 'M', Choice: 'A' },
      { Gender: 'F', Choice: 'B' },
      { Gender: 'M', Choice: 'A' },
      { Gender: 'F', Choice: 'A' },
    ];
    
    const result = analyzeCrossTab(data, 'Gender', 'Choice');
    
    expect(result.rowLabels).toContain('M');
    expect(result.colLabels).toContain('A');
    expect(result.table['M']['A']).toBe(2);
  });

  it('should generate histogram bins', () => {
    const data = sampleData.map(d => ({ Value: d.Age }));
    const result = analyzeHistogram(data, 'Value', 3);
    
    expect(result.bins).toBe(3);
    expect(result.frequencies.length).toBe(3);
    expect(result.frequencies.reduce((s: number, f: any) => s + f.count, 0)).toBe(5);
  });

  it('should handle empty dataset for frequency', () => {
    const result = analyzeFrequency([], 'Name');
    
    expect(result.totalCount).toBe(0);
    expect(result.frequencies).toEqual([]);
  });
});
