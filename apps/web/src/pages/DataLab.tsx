// Data Lab frontend page for ICON Academic Studio
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Dataset {
  id: string;
  name: string;
  format: string;
  rowCount: number;
  columnCount: number;
  status: string;
  createdAt: string;
}

interface ColumnProfile {
  name: string;
  type: string;
  uniqueCount: number;
  missingCount: number;
  statistics?: any;
}

export default function DataLab() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisType, setAnalysisType] = useState('FREQUENCY');
  const [analysisConfig, setAnalysisConfig] = useState({ column: '', groupColumn: '', measureColumn: '' });

  // Fetch datasets on mount
  useEffect(() => {
    if (projectId) {
      fetchDatasets();
    }
  }, [projectId]);

  const fetchDatasets = async () => {
    try {
      const response = await axios.get(`/api/v1/data-lab/datasets/${projectId}`);
      setDatasets(response.data);
    } catch (err) {
      setError('Failed to load datasets');
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId || '');
    
    const isCsv = file.name.endsWith('.csv');
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (!isCsv && !isXlsx) {
      setError('Only CSV and XLSX files are supported');
      setUploading(false);
      return;
    }
    
    try {
      const url = isCsv ? '/api/v1/data-lab/csv' : '/api/v1/data-lab/xlsx';
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setDatasets(prev => [response.data.dataset, ...prev]);
      setSelectedDataset(response.data.dataset);
      setActiveTab('preview');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const fetchDatasetDetails = async (datasetId: string) => {
    try {
      const response = await axios.get(`/api/v1/data-lab/datasets/${datasetId}`);
      setSelectedDataset(response.data);
      setProfile(response.data.columns);
      setAnalyses(response.data.analyses || []);
      setCharts(response.data.charts || []);
    } catch (err) {
      setError('Failed to load dataset details');
    }
  };

  const fetchPreview = async (datasetId: string, page: number = 1) => {
    try {
      const response = await axios.get(`/api/v1/data-lab/datasets/${datasetId}/preview`, {
        params: { page, pageSize: 50 },
      });
      setPreviewRows(response.data.rows);
    } catch (err) {
      setError('Failed to load preview');
    }
  };

  const runAnalysis = async () => {
    if (!selectedDataset) return;
    
    try {
      const response = await axios.post('/api/v1/data-lab/analyses', {
        type: analysisType,
        datasetId: selectedDataset.id,
        configuration: analysisConfig,
      });
      
      setAnalysisResult(response.data.results);
      setAnalyses(prev => [...prev, response.data]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to run analysis');
    }
  };

  const createChart = async (chartType: string) => {
    if (!selectedDataset || !analysisResult) return;
    
    try {
      const response = await axios.post('/api/v1/data-lab/charts', {
        datasetId: selectedDataset.id,
        type: chartType,
        config: {
          chartType,
          data: analysisResult,
          title: `${chartType} Chart`,
        },
      });
      
      setCharts(prev => [...prev, response.data]);
    } catch (err) {
      setError('Failed to create chart');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Lab</h1>
          <p className="mt-2 text-gray-600">Import, analyze, and visualize datasets</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Dataset List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">Datasets</h2>
              
              {/* Upload Button */}
              <label className="w-full flex items-center justify-center px-4 py-2 border border-purple-500 rounded-md shadow-sm text-sm font-medium text-purple-500 bg-white hover:bg-purple-50 cursor-pointer mb-4">
                <span>Upload Dataset</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
              
              {uploading && <p className="text-sm text-gray-500 text-center">Uploading...</p>}

              {/* Dataset List */}
              <div className="space-y-2">
                {datasets.map(dataset => (
                  <button
                    key={dataset.id}
                    onClick={() => fetchDatasetDetails(dataset.id)}
                    className={`w-full text-left px-3 py-2 rounded ${selectedDataset?.id === dataset.id ? 'bg-purple-100 text-purple-900' : 'hover:bg-gray-100'}`}
                  >
                    <div className="font-medium text-sm truncate">{dataset.name}</div>
                    <div className="text-xs text-gray-500">
                      {dataset.rowCount} rows × {dataset.columnCount} cols • {dataset.format}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedDataset ? (
              <div className="bg-white rounded-lg shadow">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    {['overview', 'preview', 'transform', 'analyze'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-2 px-4 text-sm font-medium ${
                          activeTab === tab
                            ? 'border-purple-500 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } border-b-2 capitalize`}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <OverviewTab dataset={selectedDataset} profile={profile} analyses={analyses} charts={charts} />
                  )}
                  
                  {activeTab === 'preview' && (
                    <PreviewTab 
                      dataset={selectedDataset} 
                      previewRows={previewRows}
                      onPreview={() => fetchPreview(selectedDataset.id)}
                    />
                  )}
                  
                  {activeTab === 'transform' && (
                    <TransformTab dataset={selectedDataset} />
                  )}
                  
                  {activeTab === 'analyze' && (
                    <AnalyzeTab
                      dataset={selectedDataset}
                      analysisType={analysisType}
                      setAnalysisType={setAnalysisType}
                      analysisConfig={analysisConfig}
                      setAnalysisConfig={setAnalysisConfig}
                      onRun={runAnalysis}
                      result={analysisResult}
                      onCreateChart={createChart}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">Select or upload a dataset to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ dataset, profile, analyses, charts }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{dataset.name}</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-2xl font-bold">{dataset.rowCount}</div>
          <div className="text-gray-600">Rows</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-2xl font-bold">{dataset.columnCount}</div>
          <div className="text-gray-600">Columns</div>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <div className="text-2xl font-bold">{dataset.format}</div>
          <div className="text-gray-600">Format</div>
        </div>
      </div>

      {profile && (
        <div>
          <h3 className="font-semibold mb-3">Column Profiles</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unique</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profile.map((col: ColumnProfile) => (
                  <tr key={col.name}>
                    <td className="px-4 py-2 text-sm font-medium">{col.name}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getTypeColor(col.type)}`}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{col.uniqueCount}</td>
                    <td className="px-4 py-2 text-sm">{col.missingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewTab({ dataset, previewRows, onPreview }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Data Preview</h3>
        <button
          onClick={onPreview}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Refresh
        </button>
      </div>
      
      {previewRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(previewRows[0]).map(header => (
                  <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {previewRows.map((row: any, idx: number) => (
                <tr key={idx}>
                  {Object.values(row).map((val: any, i: number) => (
                    <td key={i} className="px-4 py-2 text-sm text-gray-900">
                      {val === null || val === undefined ? '-' : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No preview available. Click Refresh to load.</p>
      )}
    </div>
  );
}

function TransformTab({ dataset }: any) {
  const [transformType, setTransformType] = useState('REMOVE_DUPLICATES');
  const [config, setConfig] = useState({});
  const [result, setResult] = useState<any>(null);

  const applyTransform = async () => {
    try {
      const response = await axios.post(`/api/v1/data-lab/datasets/${dataset.id}/transformations`, {
        type: transformType,
        config,
      });
      setResult(response.data);
    } catch (err: any) {
      alert(err.response?.data?.error);
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-4">Transformations</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Transformation Type</label>
        <select
          value={transformType}
          onChange={(e) => setTransformType(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="REMOVE_DUPLICATES">Remove Duplicates</option>
          <option value="TRIM_TEXT">Trim Text Columns</option>
          <option value="REPLACE_MISSING">Replace Missing Values</option>
          <option value="REMOVE_COLUMN">Remove Column</option>
          <option value="RENAME_COLUMN">Rename Column</option>
          <option value="FILTER_ROWS">Filter Rows</option>
        </select>
      </div>

      <button
        onClick={applyTransform}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        Apply Transformation
      </button>

      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <p className="text-green-700">✓ New dataset created with {result.newDataset.rowCount} rows</p>
        </div>
      )}
    </div>
  );
}

function AnalyzeTab({ dataset, analysisType, setAnalysisType, analysisConfig, setAnalysisConfig, onRun, result, onCreateChart }: any) {
  return (
    <div>
      <h3 className="font-semibold mb-4">Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Type</label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="FREQUENCY">Frequency Analysis</option>
            <option value="DESCRIPTIVE_STATS">Descriptive Statistics</option>
            <option value="GROUPED_ANALYSIS">Grouped Analysis</option>
            <option value="CROSS_TAB">Cross-Tabulation</option>
            <option value="HISTOGRAM">Histogram</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Column</label>
          <input
            type="text"
            value={analysisConfig.column}
            onChange={(e) => setAnalysisConfig({ ...analysisConfig, column: e.target.value })}
            placeholder="Column name"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {analysisType === 'GROUPED_ANALYSIS' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Column</label>
            <input
              type="text"
              value={analysisConfig.groupColumn}
              onChange={(e) => setAnalysisConfig({ ...analysisConfig, groupColumn: e.target.value })}
              placeholder="e.g., City"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Measure Column</label>
            <input
              type="text"
              value={analysisConfig.measureColumn}
              onChange={(e) => setAnalysisConfig({ ...analysisConfig, measureColumn: e.target.value })}
              placeholder="e.g., Score"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      )}

      <button
        onClick={onRun}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 mr-2"
      >
        Run Analysis
      </button>

      {result && (
        <div className="mt-6">
          <h4 className="font-semibold mb-2">Results</h4>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onCreateChart('BAR')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Bar Chart
            </button>
            <button
              onClick={() => onCreateChart('LINE')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Line Chart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'NUMBER': return 'bg-blue-100 text-blue-800';
    case 'DATE': return 'bg-yellow-100 text-yellow-800';
    case 'BOOLEAN': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
