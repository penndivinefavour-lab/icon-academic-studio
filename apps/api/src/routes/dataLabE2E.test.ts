// Data Lab E2E workflow tests
/// <reference types="vitest/globals" />
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@icon-academic/db';
import { importCsv, importXlsx, runAnalysis, applyTransformation, getDatasetFull } from '../services/dataLabService.js';
import * as XLSX from 'xlsx';

describe('Data Lab E2E - Full Workflow', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'E2E Test Project', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Clean up in reverse order
    await prisma.transformation.deleteMany();
    await prisma.analysis.deleteMany();
    await prisma.chart.deleteMany();
    await prisma.table_.deleteMany();
    await prisma.datasetColumn.deleteMany();
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should complete full CSV workflow: create → profile → preview → analyze → transform → result', async () => {
    // 1. Create project (done in beforeAll)

    // 2. Import real CSV
    const csvContent = `Subject,Grade,Age,Score,Pass
Mathematics,12,30,85,true
English,12,28,92,true
Physics,11,32,78,true
Chemistry,12,,72,true
Biology,11,29,88,false
Mathematics,12,31,,true
English,11,27,81,true
Physics,12,33,69,true
Chemistry,11,28,95,true
Biology,12,30,74,true`;

    const buffer = Buffer.from(csvContent);
    const importResult = await importCsv(projectId, buffer, 'research_data.csv');
    expect(importResult.dataset).toBeDefined();
    expect(importResult.dataset.rowCount).toBe(10);
    expect(importResult.dataset.columnCount).toBe(5);
    expect(importResult.dataset.status).toBe('PROFILED');
    expect(importResult.columns.length).toBe(5);

    const datasetId = importResult.dataset.id;
    const columns = importResult.columns;

    // Verify column profiles
    expect(columns.find(c => c.name === 'Subject')).toBeDefined();
    expect(columns.find(c => c.name === 'Score')?.type).toBe('NUMBER');
    // "true"/"false" strings may be inferred as NUMBER or TEXT depending on threshold
    const passCol = columns.find(c => c.name === 'Pass');
    expect(passCol?.type).toMatch(/^(NUMBER|TEXT|BOOLEAN)$/);

    // 3. Preview data
    const preview = await import('../services/dataLabService.js').then(m => m.previewDataset(datasetId, 1, 5));
    expect(preview.rows.length).toBe(5);
    expect(preview.total).toBe(10);
    expect(preview.rows[0]).toHaveProperty('Subject');
    expect(preview.rows[0]).toHaveProperty('Score');

    // 4. Run frequency analysis on Subject
    const freqResult = await runAnalysis({
      type: 'FREQUENCY',
      datasetId,
      configuration: { column: 'Subject' },
    });
    expect(freqResult.method).toBe('FREQUENCY');
    expect(freqResult.results.frequencies.length).toBeGreaterThan(0);
    expect(freqResult.results.frequencies.some((f: any) => f.value === 'Mathematics')).toBeTruthy();

    // 5. Run descriptive statistics on Score
    // Blank scores are excluded (never coerced to zero): 9 valid of 10 rows
    const statsResult = await runAnalysis({
      type: 'DESCRIPTIVE_STATS',
      datasetId,
      configuration: { column: 'Score' },
    });
    expect(statsResult.method).toBe('DESCRIPTIVE_STATS');
    expect(statsResult.results.count).toBe(9); // One missing
    expect(statsResult.results.mean).toBeCloseTo(81.56, 1);

    // 6. Run grouped analysis by Grade
    const groupedResult = await runAnalysis({
      type: 'GROUPED_ANALYSIS',
      datasetId,
      configuration: {
        groupColumn: 'Grade',
        measureColumn: 'Score',
        aggregation: 'mean',
      },
    });
    expect(groupedResult.method).toBe('GROUPED_ANALYSIS');
    expect(groupedResult.results.groups.length).toBe(2); // Grade 11 and 12

    // 7. Run cross-tabulation
    const crossResult = await runAnalysis({
      type: 'CROSS_TAB',
      datasetId,
      configuration: {
        rowColumn: 'Grade',
        colColumn: 'Pass',
      },
    });
    expect(crossResult.method).toBe('CROSS_TAB');
    expect(crossResult.results.table['11']).toBeDefined();
    expect(crossResult.results.table['12']).toBeDefined();

    // 8. Apply transformation - remove duplicates
    const transformResult = await applyTransformation(datasetId, 'REMOVE_DUPLICATES', {});
    expect(transformResult.transformation).toBeDefined();
    expect(transformResult.newDataset).toBeDefined();
    expect(transformResult.newDataset.rowCount).toBeLessThanOrEqual(10);

    // 9. Get full dataset details
    const fullDataset = await getDatasetFull(datasetId);
    expect(fullDataset).toBeDefined();
    expect(fullDataset.analyses.length).toBeGreaterThan(0);
    expect(fullDataset.transformations.length).toBeGreaterThan(0);
  });

  it('should complete full XLSX workflow', async () => {
    // Create a test workbook
    const workbook = XLSX.utils.book_new();
    
    const salesData = [
      ['Month', 'Sales', 'Region', 'Product'],
      ['January', 15000, 'North', 'Widget A'],
      ['February', 18000, 'North', 'Widget B'],
      ['March', 22000, 'South', 'Widget A'],
      ['April', 19000, 'South', 'Widget C'],
      ['May', 25000, 'North', 'Widget B'],
      ['June', 21000, 'South', 'Widget A'],
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Import XLSX
    const importResult = await importXlsx(projectId, buffer, 'sales.xlsx', { 
      sheetName: 'Sales',
      name: 'Sales Report'
    });
    
    expect(importResult.dataset.format).toBe('XLSX');
    expect(importResult.sheetName).toBe('Sales');
    expect(importResult.dataset.rowCount).toBe(6); // Header + 5 data rows (one less due to array indexing)
    
    const datasetId = importResult.dataset.id;
    
    // Run analysis
    const freqResult = await runAnalysis({
      type: 'FREQUENCY',
      datasetId,
      configuration: { column: 'Region' },
    });
    
    expect(freqResult.results.frequencies.length).toBe(2); // North, South
    expect(freqResult.results.frequencies.some((f: any) => f.value === 'North')).toBeTruthy();
    
    // Run descriptive stats
    const statsResult = await runAnalysis({
      type: 'DESCRIPTIVE_STATS',
      datasetId,
      configuration: { column: 'Sales' },
    });
    
    expect(statsResult.results.min).toBe(15000);
    expect(statsResult.results.max).toBe(25000);
  });

  it('should reject malformed or unsupported files', async () => {
    // Try with invalid file
    await expect(
      importCsv(projectId, Buffer.from('not,a,valid\x00csv'), 'invalid.csv')
    ).rejects.toThrow();
    
    // Try with empty file
    await expect(
      importCsv(projectId, Buffer.from(''), 'empty.csv')
    ).rejects.toThrow();
  });

  it('should track provenance correctly', async () => {
    // Create a fresh dataset
    const csvContent = `Name,Value\nAlice,100\nBob,200`;
    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'provenance_test.csv');
    const datasetId = result.dataset.id;
    
    // Run analysis
    await runAnalysis({
      type: 'FREQUENCY',
      datasetId,
      configuration: { column: 'Name' },
    });
    
    // Verify dataset has analyses
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      include: { analyses: true },
    });
    
    expect(dataset?.analyses.length).toBe(1);
    expect(dataset?.analyses[0].datasetId).toBe(datasetId);
    expect(dataset?.analyses[0].method).toBe('FREQUENCY');
    
    // Verify project has dataset
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { datasets: true },
    });
    
    expect(project?.datasets.length).toBeGreaterThan(0);
    expect(project?.datasets.some((d: any) => d.id === datasetId)).toBeTruthy();
  });
});

describe('Data Lab - Edge Cases', () => {
  let projectId: string;

  beforeAll(async () => {
    const project = await prisma.project.create({
      data: { name: 'Edge Case Project', type: 'DATA_ANALYSIS' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.dataset.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.$disconnect();
  });

  it('should handle CSV with special characters in quoted fields', async () => {
    const csvContent = `"City","Comment"
"London","Great ""wonderful"" city"
"New York","Has a lot of parks"`;
    
    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'special.csv');
    
    expect(result.dataset.rowCount).toBe(2);
    expect(result.columns.length).toBe(2);
  });

  it('should handle CSV with different line endings', async () => {
    const csvContent = 'A,B\r\n1,2\r\n3,4'; // Windows CRLF
    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'crlf.csv');
    
    expect(result.dataset.rowCount).toBe(2);
  });

  it('should handle UTF-8 content', async () => {
    const csvContent = 'Name,City\nAlice,London\nBob,München\nCharlie,Zürich';
    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'utf8.csv');
    
    expect(result.dataset.rowCount).toBe(3);
    expect(result.columns[0].name).toBe('Name');
  });

  it('should handle numeric inference correctly', async () => {
    const csvContent = `Name,Value,Category
Item1,123.45,A
Item2,678.90,B
Item3,abc,C`;
    
    const buffer = Buffer.from(csvContent);
    const result = await importCsv(projectId, buffer, 'numeric.csv');
    
    const valueCol = result.columns.find(c => c.name === 'Value');
    // With mixed values, should be TEXT
    expect(valueCol?.type).toBe('TEXT');
    
    const nameCol = result.columns.find(c => c.name === 'Name');
    // "Item1", "Item2", "Item3" - only 3 unique values out of 3, could be TEXT or CATEGORICAL
    expect(['TEXT', 'CATEGORICAL']).toContain(nameCol?.type);
  });

  it('should calculate median for even-length arrays', async () => {
    const { calculateMedian } = await import('../services/dataLabService.js');
    
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateMedian([10, 20])).toBe(15);
    expect(calculateMedian([5])).toBe(5);
  });
});
