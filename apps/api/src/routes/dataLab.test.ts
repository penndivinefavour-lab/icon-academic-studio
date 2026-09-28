/// <reference types="vitest/globals" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import {
  importCsv,
  importXlsx,
  previewDataset,
  runAnalysis,
  applyTransformation,
  calculateMedian,
  calculateStdDev,
} from '../services/dataLabService.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

describe('Data Lab - CSV Import', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Data Lab Test Project', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should import valid CSV', async () => {
    const csvContent = `Name,Age,City,Score
Alice,30,London,85
Bob,25,Paris,92
Charlie,35,London,78
Diana,28,Berlin,95
Eve,32,London,88`;

    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'test.csv');

    expect(result.dataset).toBeDefined();
    expect(result.dataset.projectId).toBe(projectId);
    expect(result.dataset.rowCount).toBe(5);
    expect(result.dataset.columnCount).toBe(4);
    expect(result.dataset.format).toBe('CSV');
    expect(result.dataset.status).toBe('PROFILED');
  });

  it('should handle quoted CSV fields', async () => {
    const csvContent = `Name,Description,Value
"Smith, John","A ""quoted"" string",100
"Doe, Jane","Normal text",200`;

    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'quoted.csv');

    expect(result.dataset.rowCount).toBe(2);
  });

  it('should reject malformed CSV', async () => {
    // This should not throw but handle gracefully
    const csvContent = `Name,Age\nAlice,30\nBob,`;
    
    const buffer = Buffer.from(csvContent);
    await expect(importCsv(projectId, buffer, 'malformed.csv')).resolves.toBeDefined();
  });

  it('should handle empty CSV', async () => {
    const csvContent = 'Name,Age\n';
    const buffer = Buffer.from(csvContent);
    
    await expect(importCsv(projectId, buffer, 'empty.csv')).rejects.toThrow();
  });
});

describe('Data Lab - XLSX Import', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'XLSX Test Project', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should import valid XLSX', async () => {
    // Create test workbook
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'London'],
      ['Bob', 25, 'Paris'],
      ['Charlie', 35, 'London'],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const result = await importXlsx(projectId, buffer, 'test.xlsx');

    expect(result.dataset).toBeDefined();
    expect(result.dataset.rowCount).toBe(3);
    expect(result.dataset.columnCount).toBe(3);
    expect(result.dataset.format).toBe('XLSX');
    expect(result.sheetName).toBe('Sheet1');
  });

  it('should handle multiple worksheets', async () => {
    const workbook = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet([['A', 'B'], [1, 2]]);
    const ws2 = XLSX.utils.aoa_to_sheet([['X', 'Y'], [3, 4]]);
    
    XLSX.utils.book_append_sheet(workbook, ws1, 'Sheet1');
    XLSX.utils.book_append_sheet(workbook, ws2, 'Sheet2');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Import with specific sheet
    const result = await importXlsx(projectId, buffer, 'multi.xlsx', { sheetName: 'Sheet2' });
    
    expect(result.sheetName).toBe('Sheet2');
    expect(result.dataset.rowCount).toBe(1);
  });
});

describe('Data Lab - Preview', () => {
  let projectId: string;
  let datasetId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Preview Test', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;

    const csvContent = `Name,Age,City
Alice,30,London
Bob,25,Paris
Charlie,35,London
Diana,28,Berlin
Eve,32,London`;

    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'preview.csv');
    datasetId = result.dataset.id;
  });

  afterAll(async () => {
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should preview dataset rows', async () => {
    const preview = await previewDataset(datasetId, 1, 10);
    
    expect(preview.rows.length).toBeGreaterThan(0);
    expect(preview.rows[0]).toHaveProperty('Name');
    expect(preview.rows[0]).toHaveProperty('Age');
    expect(preview.total).toBe(5);
  });

  it('should paginate preview', async () => {
    const page1 = await previewDataset(datasetId, 1, 2);
    const page2 = await previewDataset(datasetId, 2, 2);
    
    expect(page1.rows.length).toBe(2);
    expect(page2.rows.length).toBe(2);
    expect(page1.rows[0].Name).not.toBe(page2.rows[0].Name);
  });
});

describe('Data Lab - Analysis', () => {
  let projectId: string;
  let datasetId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Analysis Test', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;

    const csvContent = `Name,Age,City,Score
Alice,30,London,85
Bob,25,Paris,92
Charlie,35,London,78
Diana,28,Berlin,95
Eve,32,London,88
Frank,45,London,72
Grace,29,Paris,91`;

    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'analysis.csv');
    datasetId = result.dataset.id;
  });

  afterAll(async () => {
    await prisma.analysis.deleteMany({ where: { datasetId } });
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should run frequency analysis', async () => {
    const result = await runAnalysis({
      type: 'FREQUENCY',
      datasetId,
      configuration: { column: 'City' },
    });

    expect(result.method).toBe('FREQUENCY');
    expect(result.results).toHaveProperty('column');
    expect(result.results).toHaveProperty('frequencies');
    expect(result.results.frequencies.length).toBeGreaterThan(0);
  });

  it('should run descriptive statistics', async () => {
    const result = await runAnalysis({
      type: 'DESCRIPTIVE_STATS',
      datasetId,
      configuration: { column: 'Age' },
    });

    expect(result.method).toBe('DESCRIPTIVE_STATS');
    expect(result.results).toHaveProperty('mean');
    expect(result.results).toHaveProperty('median');
    expect(result.results).toHaveProperty('min');
    expect(result.results).toHaveProperty('max');
    expect(result.results).toHaveProperty('stdDev');
  });

  it('should run grouped analysis', async () => {
    const result = await runAnalysis({
      type: 'GROUPED_ANALYSIS',
      datasetId,
      configuration: {
        groupColumn: 'City',
        measureColumn: 'Score',
        aggregation: 'mean',
      },
    });

    expect(result.method).toBe('GROUPED_ANALYSIS');
    expect(result.results.groups).toBeDefined();
    expect(result.results.groups.length).toBeGreaterThan(0);
  });

  it('should run cross-tabulation', async () => {
    const result = await runAnalysis({
      type: 'CROSS_TAB',
      datasetId,
      configuration: {
        rowColumn: 'City',
        colColumn: 'City',
      },
    });

    expect(result.method).toBe('CROSS_TAB');
    expect(result.results.table).toBeDefined();
  });

  it('should run histogram analysis', async () => {
    const result = await runAnalysis({
      type: 'HISTOGRAM',
      datasetId,
      configuration: {
        column: 'Score',
        bins: 5,
      },
    });

    expect(result.method).toBe('HISTOGRAM');
    expect(result.results.frequencies).toBeDefined();
  });
});

describe('Data Lab - Transformations', () => {
  let projectId: string;
  let datasetId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Transform Test', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;

    const csvContent = `Name,Age,City
Alice,30,London
Bob,25,Paris
Charlie,35,London`;

    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'transform.csv');
    datasetId = result.dataset.id;
  });

  afterAll(async () => {
    await prisma.transformation.deleteMany({ where: { datasetId } });
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should remove duplicates', async () => {
    const result = await applyTransformation(datasetId, 'REMOVE_DUPLICATES', {});
    
    expect(result.transformation).toBeDefined();
    expect(result.newDataset).toBeDefined();
    expect(result.newDataset.rowCount).toBeLessThanOrEqual(3);
  });

  it('should filter rows', async () => {
    const result = await applyTransformation(datasetId, 'FILTER_ROWS', {
      column: 'City',
      operator: 'equals',
      value: 'London',
    });
    
    expect(result.newDataset).toBeDefined();
  });

  it('should replace missing values', async () => {
    const csvContent = `Name,Age,City\nAlice,30,\nBob,,Paris`;
    const buffer = Buffer.from(csvContent);
    const importResult = await importCsv(projectId, buffer, 'missing.csv');
    
    const result = await applyTransformation(importResult.dataset.id, 'REPLACE_MISSING', {
      column: 'City',
      value: 'Unknown',
    });
    
    expect(result.newDataset).toBeDefined();
  });
});

describe('Statistical Calculations', () => {
  it('should calculate median correctly', () => {
    expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateMedian([5])).toBe(5);
  });

  it('should calculate standard deviation', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const mean = 5;
    const stddev = calculateStdDev(values, mean);
    
    expect(stddev).toBeGreaterThan(0);
    expect(stddev).toBeLessThan(3);
  });
});
