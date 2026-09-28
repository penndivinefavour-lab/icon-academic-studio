# Data Lab - Documentation

## Overview

The Data Lab provides comprehensive data import, analysis, and visualization capabilities for research datasets.

## Supported File Formats

### CSV
- Standard comma-separated values
- UTF-8 encoding
- Quoted fields support
- Headers automatically detected in first row
- Max file size: 10MB

### XLSX (Excel)
- Excel workbook format
- Multiple worksheet support
- Cell value preservation
- Date and numeric type detection
- Max file size: 10MB

## Dataset Profile

Each imported dataset receives automatic profiling:

### General Statistics
- Row count
- Column count  
- File size
- Import timestamp
- Format type

### Column Profiling
For each column:
- Name (original and normalized)
- Inferred type (NUMBER, TEXT, DATE, BOOLEAN, CATEGORICAL)
- Unique value count
- Missing value count and percentage
- Sample values (first 10 non-null)

### Numeric Column Statistics
- Minimum
- Maximum
- Sum
- Mean
- Median
- Mode (top 3 values)
- Range (max - min)
- Variance (sample)
- Standard deviation (sample)

### Categorical Column Statistics
- Frequency distribution
- Percentage distribution
- Top 10 values by frequency

### Quality Flags
- Empty columns (100% missing)
- Mostly-missing columns (>90% missing)
- Duplicate columns (high correlation)
- Inconsistent types
- Malformed values

## Analysis Engine

### Frequency Analysis
Counts occurrences of each unique value in a column. Returns:
- Value
- Count
- Percentage
- Cumulative percentage

### Descriptive Statistics
Calculates statistics for numeric columns:
- N (count of non-null values)
- Sum
- Mean
- Median
- Std Dev (sample)
- Variance (sample)
- Min
- Max
- Range

### Grouped Analysis
Groups data by a categorical column and calculates aggregations:
- COUNT
- SUM
- MEAN
- MIN
- MAX

### Cross-Tabulation
Creates contingency tables showing frequency distributions across two categorical variables:
- Row labels
- Column labels
- Frequency counts
- Row percentages
- Column percentages
- Total percentages

### Histogram
Buckets numeric data into bins:
- Configurable number of bins
- Bin boundaries
- Frequency per bin
- Relative frequency

## Transformations

### Supported Operations
- **RENAME_COLUMN**: Rename a column
- **REMOVE_COLUMN**: Delete a column
- **TRIM_TEXT**: Trim whitespace from text columns
- **REPLACE_MISSING**: Replace null/empty values with specified value
- **REMOVE_DUPLICATES**: Remove duplicate rows
- **FILTER_ROWS**: Filter rows based on condition
- **CONVERT_TYPE**: Convert column to different data type

### Provenance
Each transformation creates a new dataset version while preserving the original. All transformations are tracked with:
- Operation type
- Configuration
- Timestamp
- Source dataset reference
- Resulting dataset

## API Endpoints

### Datasets
```
POST /api/v1/data-lab/csv
POST /api/v1/data-lab/xlsx
GET /api/v1/data-lab/datasets/:projectId
GET /api/v1/data-lab/datasets/:datasetId
GET /api/v1/data-lab/datasets/:datasetId/preview
DELETE /api/v1/data-lab/datasets/:datasetId
```

### Analyses
```
POST /api/v1/data-lab/analyses
GET /api/v1/data-lab/datasets/:datasetId/analyses
```

### Charts
```
POST /api/v1/data-lab/charts
GET /api/v1/data-lab/datasets/:datasetId/charts
GET /api/v1/data-lab/charts/:chartId/export
```

### Tables
```
POST /api/v1/data-lab/tables
GET /api/v1/data-lab/datasets/:datasetId/tables
```

### Transformations
```
POST /api/v1/data-lab/datasets/:datasetId/transformations
```

## Security

- File extension validation (.csv, .xlsx, .xls)
- MIME type verification where available
- File size limits enforced
- Path traversal protection
- No execution of formulas or scripts
- SQL injection prevention via parameterized queries
- XSS protection through output encoding

## Database Schema

### Dataset
- id (UUID)
- projectId (FK → Project)
- sourceId (FK → Source, nullable)
- name, description
- originalFilename, storedPath
- format (CSV, XLSX)
- rowCount, columnCount, fileSize
- checksum (SHA-256)
- status (IMPORTED, PROFILED, ANALYZED)
- profile (JSON)
- createdAt, updatedAt

### DatasetColumn
- id (UUID)
- datasetId (FK → Dataset)
- name, originalName, index
- inferredType
- nullable, uniqueCount, missingCount
- sampleValues (JSON), metadata (JSON)

### Analysis
- id (UUID)
- datasetId (FK → Dataset)
- projectId (FK → Project)
- name, type, configuration
- result (JSON)
- status
- createdAt, updatedAt

### Chart
- id (UUID)
- datasetId (FK → Dataset)
- projectId (FK → Project)
- name, chartType
- configuration (JSON), data (JSON)
- svg (optional exported SVG)
- createdAt, updatedAt

### Table_
- id (UUID)
- datasetId (FK → Dataset)
- projectId (FK → Project)
- name, title, headers, rows
- caption
- createdAt, updatedAt

### Transformation
- id (UUID)
- datasetId (FK → Dataset)
- type
- config (JSON)
- resultDatasetId (FK → Dataset, nullable)
- status, errorMessage
- createdAt, updatedAt

## Known Limitations

- Maximum dataset size: 10MB per file
- Preview limited to 50 rows per page
- No streaming for large files
- Histogram binning uses equal-width intervals only
- No advanced statistical tests (t-test, ANOVA, etc.)
- Correlation analysis not yet implemented
