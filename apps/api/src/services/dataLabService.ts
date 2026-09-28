// Data Lab services for ICON Academic Studio
import { prisma } from '@icon-academic/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  fileSize: number;
  columns: ColumnProfile[];
}

export interface ColumnProfile {
  name: string;
  type: 'NUMBER' | 'TEXT' | 'DATE' | 'BOOLEAN' | 'CATEGORICAL';
  uniqueCount: number;
  missingCount: number;
  sampleValues: any[];
  statistics?: any;
}

export interface AnalysisConfig {
  type: string;
  datasetId: string;
  configuration: Record<string, any>;
}

export interface AnalysisResult {
  id: string;
  datasetId: string;
  method: string;
  parameters: any;
  results: any;
}

// CSV Import
export async function importCsv(
  projectId: string,
  fileBuffer: Buffer,
  filename: string,
  options: { name?: string; description?: string } = {}
): Promise<any> {
  const text = fileBuffer.toString('utf-8');
  
  // Parse CSV with PapaParse
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: (_results: any) => {},
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
  }

  const data = result.data as any[];
  const headers = result.meta.fields || [];

  if (data.length === 0) {
    throw new Error('CSV file is empty or contains no data rows');
  }

  // Calculate checksum
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Save file
  const storageDir = path.join(process.cwd(), 'storage', 'datasets');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const storedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storedPath = path.join(storageDir, storedFilename);
  fs.writeFileSync(storedPath, fileBuffer);

  // Create dataset record
  const dataset = await prisma.dataset.create({
    data: {
      projectId,
      name: options.name || filename,
      description: options.description,
      originalFilename: filename,
      storedPath: storedPath,
      format: 'CSV',
      rowCount: data.length,
      columnCount: headers.length,
      fileSize: fileBuffer.length,
      checksum,
      status: 'IMPORTED',
    },
  });

  // Profile and create columns
  const columns = await profileDataset(dataset.id, headers, data);
  
  // Update dataset with profile
  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { 
      profile: JSON.stringify(columns),
      status: 'PROFILED'
    },
  });

  const updated = await prisma.dataset.findUniqueOrThrow({ where: { id: dataset.id } });
  return { dataset: updated, columns };
}

// XLSX Import
export async function importXlsx(
  projectId: string,
  fileBuffer: Buffer,
  filename: string,
  options: { name?: string; description?: string; sheetName?: string } = {}
): Promise<any> {
  // Read workbook
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Select worksheet
  const sheetName = options.sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  
  if (data.length === 0) {
    throw new Error('Excel workbook is empty');
  }

  // Extract headers and rows
  const headers = data[0] || [];
  const rows = data.slice(1);
  
  // Convert to array of objects
  const records = rows.map(row => {
    const record: any = {};
    headers.forEach((header: any, idx: number) => {
      record[String(header)] = row[idx];
    });
    return record;
  });

  // Calculate checksum
  const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Save file
  const storageDir = path.join(process.cwd(), 'storage', 'datasets');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const storedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storedPath = path.join(storageDir, storedFilename);
  fs.writeFileSync(storedPath, fileBuffer);

  // Create dataset record
  const dataset = await prisma.dataset.create({
    data: {
      projectId,
      name: options.name || `${filename} (${sheetName})`,
      description: options.description,
      originalFilename: filename,
      storedPath: storedPath,
      format: 'XLSX',
      rowCount: records.length,
      columnCount: headers.length,
      fileSize: fileBuffer.length,
      checksum,
      status: 'IMPORTED',
    },
  });

  // Profile and create columns
  const columns = await profileDataset(dataset.id, headers.map(String), records);
  
  // Update dataset with profile
  await prisma.dataset.update({
    where: { id: dataset.id },
    data: { 
      profile: JSON.stringify(columns),
      status: 'PROFILED'
    },
  });

  const updated = await prisma.dataset.findUniqueOrThrow({ where: { id: dataset.id } });
  return { dataset: updated, columns, sheetName };
}

// Profile dataset columns
async function profileDataset(datasetId: string, headers: string[], data: any[]): Promise<any[]> {
  const columns: ColumnProfile[] = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const values = data.map(row => row[header]).filter(v => v !== undefined && v !== null && v !== '');
    const missingValues = data.length - values.length;
    
    // Infer type
    let inferredType: 'NUMBER' | 'TEXT' | 'DATE' | 'BOOLEAN' | 'CATEGORICAL' = 'TEXT';
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
    const dateValues = values.filter(v => v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v))));
    
    if (numericValues.length / values.length > 0.7) {
      inferredType = 'NUMBER';
    } else if (dateValues.length / values.length > 0.7) {
      inferredType = 'DATE';
    } else if (values.length > 0) {
      const uniqueCount = new Set(values.map(String)).size;
      if (uniqueCount / values.length < 0.1) {
        inferredType = 'CATEGORICAL';
      } else if (uniqueCount <= 5 && values.every(v => v === true || v === false || v === 'true' || v === 'false')) {
        inferredType = 'BOOLEAN';
      }
    }

    // Calculate statistics for numeric columns
    const statistics: any = {
      uniqueCount: new Set(values.map(String)).size,
      missingCount: missingValues,
      missingPercentage: Math.round((missingValues / data.length) * 100),
    };

    if (inferredType === 'NUMBER') {
      const nums = values.map(v => Number(v)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        statistics.min = Math.min(...nums);
        statistics.max = Math.max(...nums);
        statistics.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        statistics.median = calculateMedian(nums);
        statistics.stdDev = calculateStdDev(nums, statistics.mean);
      }
    }

    // Sample values
    const sampleValues = values.slice(0, 10);

    // Store column
    const column = await prisma.datasetColumn.create({
      data: {
        datasetId,
        name: header,
        index: i,
        inferredType,
        nullable: missingValues > 0,
        uniqueCount: statistics.uniqueCount,
        missingCount: missingValues,
        sampleValues: JSON.stringify(sampleValues),
        metadata: JSON.stringify(statistics),
      },
    });

    columns.push({
      name: header,
      type: inferredType,
      uniqueCount: statistics.uniqueCount,
      missingCount: missingValues,
      sampleValues,
      statistics,
    });
  }

  return columns;
}

// Statistical helpers
export function calculateMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(avgSquaredDiff);
}

// Preview dataset rows
export async function previewDataset(datasetId: string, page: number = 1, pageSize: number = 50): Promise<{ rows: any[], total: number }> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: { columns: { orderBy: { index: 'asc' } } },
  });

  if (!dataset) {
    throw new Error('Dataset not found');
  }

  // Load data from stored file
  if (!dataset.storedPath) {
    throw new Error('Dataset has no stored file');
  }
  
  const data = await loadDatasetData(dataset.storedPath, dataset.format);
  
  // Pagination
  const total = data.length;
  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return { rows, total };
}

async function loadDatasetData(filepath: string, format: string): Promise<any[]> {
  const buffer = fs.readFileSync(filepath);
  
  if (format === 'CSV') {
    const result = Papa.parse(buffer.toString('utf-8'), { header: true, skipEmptyLines: true });
    return result.data as any[];
  } else if (format === 'XLSX') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet) as any[];
  }
  
  return [];
}

// Analysis engine
export async function runAnalysis(config: AnalysisConfig): Promise<AnalysisResult> {
  const dataset = await prisma.dataset.findUnique({
    where: { id: config.datasetId },
    include: { columns: { orderBy: { index: 'asc' } } },
  });

  if (!dataset) {
    throw new Error('Dataset not found');
  }

  if (!dataset.storedPath) {
    throw new Error('Dataset has no stored file');
  }
  
  const data = await loadDatasetData(dataset.storedPath, dataset.format);
  let results: any = {};

  switch (config.type) {
    case 'FREQUENCY':
      results = analyzeFrequency(data, config.configuration.column);
      break;
      
    case 'DESCRIPTIVE_STATS':
      results = analyzeDescriptiveStats(data, config.configuration.column);
      break;
      
    case 'GROUPED_ANALYSIS':
      results = analyzeGrouped(data, config.configuration.groupColumn, config.configuration.measureColumn, config.configuration.aggregation);
      break;
      
    case 'CROSS_TAB':
      results = analyzeCrossTab(data, config.configuration.rowColumn, config.configuration.colColumn);
      break;
      
    case 'HISTOGRAM':
      results = analyzeHistogram(data, config.configuration.column, config.configuration.bins);
      break;
  }

  // Persist analysis
  const analysis = await prisma.analysis.create({
    data: {
      datasetId: config.datasetId,
      method: config.type,
      parameters: JSON.stringify(config.configuration),
      results: JSON.stringify(results),
    },
  });

  return {
    id: analysis.id,
    datasetId: config.datasetId,
    method: config.type,
    parameters: config.configuration,
    results,
  };
}

// Analysis functions
export function analyzeFrequency(data: any[], column: string): any {
  const counts: Record<string, number> = {};
  let total = 0;
  
  for (const row of data) {
    const value = String(row[column] ?? 'Missing');
    counts[value] = (counts[value] || 0) + 1;
    total++;
  }
  
  return {
    column,
    totalCount: total,
    frequencies: Object.entries(counts).map(([value, count]) => ({
      value,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count),
  };
}

export function analyzeDescriptiveStats(data: any[], column: string): any {
  // Exclude empty/null/NaN values so blanks never become silent zeros
  const values = data
    .map(row => {
      const raw = row[column];
      if (raw === null || raw === undefined || raw === '') return null;
      const n = typeof raw === 'number' ? raw : Number(raw);
      return isNaN(n) ? null : n;
    })
    .filter((n: number | null): n is number => n !== null);
  
  if (values.length === 0) {
    return { error: 'No valid numeric values in column' };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  
  return {
    column,
    count: values.length,
    sum: sorted.reduce((a, b) => a + b, 0),
    mean,
    median: calculateMedian(sorted),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    variance: calculateVariance(sorted, mean),
    stdDev: Math.sqrt(calculateVariance(sorted, mean)),
  };
}

function calculateVariance(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
}

export function analyzeGrouped(data: any[], groupColumn: string, measureColumn: string, aggregation: string): any {
  const groups: Record<string, number[]> = {};
  
  for (const row of data) {
    const raw = row[measureColumn];
    if (raw === null || raw === undefined || raw === '') continue; // never coerce blanks to zero
    const value = typeof raw === 'number' ? raw : Number(raw);
    
    const groupKey = (row[groupColumn] ?? 'Unknown') as unknown;
    const group = (groupKey === null || groupKey === undefined || groupKey === '') ? 'Unknown' : String(groupKey);
    
    if (!groups[group]) groups[group] = [];
    if (!isNaN(value)) groups[group].push(value);
  }
  
  const results = Object.entries(groups).map(([group, values]) => {
    let aggregatedValue: number;
    
    switch (aggregation) {
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'mean':
        aggregatedValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      default:
        aggregatedValue = values.length;
    }
    
    return { group, count: values.length, aggregatedValue };
  });
  
  return { groupColumn, measureColumn, aggregation, groups: results };
}

export function analyzeCrossTab(data: any[], rowColumn: string, colColumn: string): any {
  const tab: Record<string, Record<string, number>> = {};
  const rowLabels = new Set<string>();
  const colLabels = new Set<string>();
  
  for (const row of data) {
    const rowVal = String(row[rowColumn] ?? 'Unknown');
    const colVal = String(row[colColumn] ?? 'Unknown');
    
    rowLabels.add(rowVal);
    colLabels.add(colVal);
    
    if (!tab[rowVal]) tab[rowVal] = {};
    tab[rowVal][colVal] = (tab[rowVal][colVal] || 0) + 1;
  }
  
  return {
    rowColumn,
    colColumn,
    rowLabels: Array.from(rowLabels),
    colLabels: Array.from(colLabels),
    table: tab,
  };
}

export function analyzeHistogram(data: any[], column: string, bins: number = 10): any {
  const values = data
    .map(row => Number(row[column]))
    .filter(n => !isNaN(n));
  
  if (values.length === 0) return { error: 'No valid numeric values' };
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins || 1;
  
  const histogram: number[] = new Array(bins).fill(0);
  
  for (const val of values) {
    const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
    histogram[binIndex]++;
  }
  
  return {
    column,
    bins,
    binWidth,
    min,
    max,
    frequencies: histogram.map((count, i) => ({
      bin: `${(min + i * binWidth).toFixed(2)}-${(min + (i + 1) * binWidth).toFixed(2)}`,
      count,
    })),
  };
}

// Transformations
export async function applyTransformation(
  datasetId: string,
  type: string,
  config: Record<string, any>
): Promise<any> {
  // Load original data
  const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } });
  if (!dataset) throw new Error('Dataset not found');
  
  const originalData = await loadDatasetData(dataset.storedPath ?? '', dataset.format);
  
  // Apply transformation
  let transformedData = [...originalData];
  
  switch (type) {
    case 'RENAME_COLUMN':
      transformedData = renamed(transformedData, config.oldName, config.newName);
      break;
    case 'REMOVE_COLUMN':
      transformedData = removedColumn(transformedData, config.columnName);
      break;
    case 'TRIM_TEXT':
      transformedData = trimmed(transformedData, config.columns || []);
      break;
    case 'REPLACE_MISSING':
      transformedData = replacedMissing(transformedData, config.column, config.value);
      break;
    case 'REMOVE_DUPLICATES':
      transformedData = removedDuplicates(transformedData);
      break;
    case 'FILTER_ROWS':
      transformedData = filteredRows(transformedData, config.column, config.operator, config.value);
      break;
    default:
      throw new Error(`Unknown transformation type: ${type}`);
  }
  
  // Save transformed data as new dataset
  const storageDir = path.join(process.cwd(), 'storage', 'datasets');
  const transformedFilename = `transformed_${datasetId}_${Date.now()}.csv`;
  const transformedPath = path.join(storageDir, transformedFilename);
  
  const csv = Papa.unparse(transformedData);
  fs.writeFileSync(transformedPath, csv);
  
  // Create transformation record
  const transformation = await prisma.transformation.create({
    data: {
      datasetId,
      type,
      config: JSON.stringify(config),
    },
  });
  
  // Create new dataset from transformation
  const newDataset = await prisma.dataset.create({
    data: {
      projectId: dataset.projectId,
      name: `${dataset.name} (Transformed)`,
      originalFilename: transformedFilename,
      storedPath: transformedPath,
      format: 'CSV',
      rowCount: transformedData.length,
      columnCount: transformedData.length > 0 ? Object.keys(transformedData[0] || {}).length : 0,
      status: 'PROFILED',
    },
  });
  
  // Update transformation with result
  await prisma.transformation.update({
    where: { id: transformation.id },
    data: { resultDatasetId: newDataset.id },
  });
  
  return { transformation, newDataset };
}

function renamed(data: any[], oldName: string, newName: string): any[] {
  return data.map(row => {
    const newRow = { ...row };
    if (oldName in newRow) {
      newRow[newName] = newRow[oldName];
      delete newRow[oldName];
    }
    return newRow;
  });
}

function removedColumn(data: any[], columnName: string): any[] {
  return data.map(row => {
    const newRow = { ...row };
    delete newRow[columnName];
    return newRow;
  });
}

function trimmed(data: any[], columns: string[]): any[] {
  return data.map(row => {
    const newRow = { ...row };
    for (const col of columns) {
      if (typeof newRow[col] === 'string') {
        newRow[col] = newRow[col].trim();
      }
    }
    return newRow;
  });
}

function replacedMissing(data: any[], column: string, value: any): any[] {
  return data.map(row => ({
    ...row,
    [column]: row[column] === undefined || row[column] === null || row[column] === '' ? value : row[column],
  }));
}

function removedDuplicates(data: any[]): any[] {
  const seen = new Set<string>();
  return data.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filteredRows(data: any[], column: string, operator: string, value: any): any[] {
  return data.filter(row => {
    const cell = row[column];
    switch (operator) {
      case 'equals': return cell === value;
      case 'not_equals': return cell !== value;
      case 'greater_than': return Number(cell) > Number(value);
      case 'less_than': return Number(cell) < Number(value);
      case 'contains': return String(cell).includes(String(value));
      default: return true;
    }
  });
}

// Get charts for a dataset
export async function getCharts(datasetId: string) {
  return prisma.chart.findMany({
    where: { datasetId },
    orderBy: { createdAt: 'desc' },
  });
}

// Create chart from analysis
export async function createChart(
  datasetId: string,
  type: string,
  config: Record<string, any>
): Promise<any> {
  const chart = await prisma.chart.create({
    data: {
      datasetId,
      type,
      config: JSON.stringify(config),
      data: JSON.stringify([]), // Will be populated when rendering
    },
  });
  
  return chart;
}

// Export chart as image (simple implementation)
export async function exportChart(chartId: string): Promise<{ svg: string; config: any }> {
  const chart = await prisma.chart.findUnique({ where: { id: chartId } });
  if (!chart) throw new Error('Chart not found');
  
  const config = JSON.parse(chart.config || '{}');
  
  // Generate SVG based on chart type
  let svg = '';
  switch (config.chartType) {
    case 'BAR':
      svg = generateBarChartSvg(config);
      break;
    case 'LINE':
      svg = generateLineChartSvg(config);
      break;
    case 'PIE':
      svg = generatePieChartSvg(config);
      break;
    case 'SCATTER':
      svg = generateScatterChartSvg(config);
      break;
    default:
      svg = '<svg></svg>';
  }
  
  return { svg, config };
}

function generateBarChartSvg(config: any): string {
  const data = config.data || [];
  const width = 400;
  const height = 300;
  const padding = 40;
  
  const maxVal = Math.max(...(data as any[]).map((d: any) => d.value), 1);
  const barWidth = (width - padding * 2) / data.length;
  
  let bars = '';
  data.forEach((d: any, i: number) => {
    const barHeight = (d.value / maxVal) * (height - padding * 2);
    const x = padding + i * barWidth + barWidth * 0.2;
    const y = height - padding - barHeight;
    
    bars += `<rect x="${x}" y="${y}" width="${barWidth * 0.6}" height="${barHeight}" fill="#6B21A8"/>`;
    bars += `<text x="${x + barWidth * 0.3}" y="${height - 10}" text-anchor="middle" font-size="10">${d.label}</text>`;
  });
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

function generateLineChartSvg(config: any): string {
  const data = config.data || [];
  const width = 400;
  const height = 300;
  const padding = 40;
  
  if (data.length < 2) return `<svg width="${width}" height="${height}"></svg>`;
  
  const maxVal = Math.max(...(data as any[]).map((d: any) => d.value), 1);
  const stepX = (width - padding * 2) / (data.length - 1);
  
  let path = 'M ';
  data.forEach((d: any, i: number) => {
    const x = padding + i * stepX;
    const y = height - padding - (d.value / maxVal) * (height - padding * 2);
    path += `${x},${y} `;
  });
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><path d="${path}" stroke="#6B21A8" fill="none"/></svg>`;
}

function generatePieChartSvg(config: any): string {
  const data = config.data || [];
  const total = data.reduce((sum: number, d: any) => sum + d.value, 0) || 1;
  const cx = 150;
  const cy = 150;
  const r = 100;
  
  let paths = '';
  let startAngle = 0;
  
  data.forEach((d: any) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    
    paths += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="#6B21A8"/>`;
    
    startAngle = endAngle;
  });
  
  return `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

function generateScatterChartSvg(config: any): string {
  const data = config.data || [];
  const width = 400;
  const height = 300;
  const padding = 40;
  
  const maxX = Math.max(...(data as any[]).map((d: any) => d.x), 1);
  const maxY = Math.max(...(data as any[]).map((d: any) => d.y), 1);
  
  let circles = '';
  data.forEach((d: any) => {
    const x = padding + (d.x / maxX) * (width - padding * 2);
    const y = height - padding - (d.y / maxY) * (height - padding * 2);
    circles += `<circle cx="${x}" cy="${y}" r="4" fill="#6B21A8"/>`;
  });
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
}

// Save table
export async function saveTable(
  datasetId: string,
  title: string,
  headers: string[],
  rows: any[][],
  caption?: string
): Promise<any> {
  return prisma.table_.create({
    data: {
      datasetId,
      title,
      headers: JSON.stringify(headers),
      rows: JSON.stringify(rows),
      caption,
    },
  });
}

// Get dataset with full details
export async function getDatasetFull(datasetId: string) {
  return prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      columns: { orderBy: { index: 'asc' } },
      analyses: { orderBy: { createdAt: 'desc' } },
      charts: { orderBy: { createdAt: 'desc' } },
      tables: { orderBy: { createdAt: 'desc' } },
      transformations: { orderBy: { createdAt: 'desc' } },
    },
  });
}
