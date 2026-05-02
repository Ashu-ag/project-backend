import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, X, FileText, Image, Presentation, Download, Table, CheckCircle, AlertCircle } from 'lucide-react';

const FileSearch = ({ classId, onFileSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    fileType: '',
    dateFrom: '',
    dateTo: '',
    tags: []
  });
  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    fileTypes: [],
    tags: []
  });
  const [downloadingId, setDownloadingId] = useState(null); // which file is being downloaded
  const [downloadStatus, setDownloadStatus] = useState({}); // { fileId: 'ok' | 'error' }

  useEffect(() => {
    fetchAvailableFilters();
  }, [classId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2 || Object.values(filters).some(f => f !== '' && f.length > 0)) {
        performSearch();
      } else if (searchQuery.length === 0 && !Object.values(filters).some(f => f !== '' && f.length > 0)) {
        setFiles([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filters]);

  const fetchAvailableFilters = async () => {
  try {
    // ✅ FIX: Remove the leading slash
    const url = classId ? `search/filters/${classId}` : 'search/filters';
    const response = await axios.get(url);
    setAvailableFilters(response.data.data.filters);
  } catch (error) {
    console.error('Error fetching filters:', error);
  }
};

  const performSearch = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (classId) params.append('classId', classId);
    if (filters.category) params.append('category', filters.category);
    if (filters.fileType) params.append('fileType', filters.fileType);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    console.log('🔍 Search API call:', `${axios.defaults.baseURL.replace(/\/$/, '')}/search/files?${params}`);
    
    // ✅ FIX: Remove the leading slash to avoid duplicate /api
    const response = await axios.get(`search/files?${params}`);
    
    console.log('📦 Search response:', response.data);
    console.log('📁 Files found:', response.data.data.files);
    
    setFiles(response.data.data.files);
  } catch (error) {
    console.error('❌ Search error:', error);
  } finally {
    setLoading(false);
  }
};

  const clearFilters = () => {
    setFilters({
      category: '',
      fileType: '',
      dateFrom: '',
      dateTo: '',
      tags: []
    });
    setSearchQuery('');
  };

  const handleDownload = async (e, fileId, fileName) => {
    e.stopPropagation(); // prevent row click triggering onFileSelect
    if (downloadingId === fileId) return; // already downloading
    setDownloadingId(fileId);
    setDownloadStatus(prev => ({ ...prev, [fileId]: null }));
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in again to download files.');
        return;
      }
      const response = await fetch(
        `${axios.defaults.baseURL.replace(/\/$/, '')}/files/download/${fileId}`,
        { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'ok' }));
      setTimeout(() => setDownloadStatus(prev => ({ ...prev, [fileId]: null })), 2500);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadStatus(prev => ({ ...prev, [fileId]: 'error' }));
      setTimeout(() => setDownloadStatus(prev => ({ ...prev, [fileId]: null })), 3000);
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5 text-green-500" />;
      case 'presentation':
        return <Presentation className="w-5 h-5 text-orange-500" />;
      case 'spreadsheet':
        return <Table className="w-5 h-5 text-green-600" />; // ✅ Fixed: Using Table icon instead of Spreadsheet
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const highlightExcerpt = (excerpt, terms) => {
    if (!excerpt) return null;
    if (!terms || terms.length === 0) return <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">"{excerpt}"</div>;
    
    let highlighted = excerpt;
    terms.forEach(term => {
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeTerm})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded font-medium">$1</mark>');
    });
    
    return (
      <div 
        className="mt-2 text-sm text-gray-700 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50 shadow-sm"
        dangerouslySetInnerHTML={{ __html: `...${highlighted}...` }} 
      />
    );
  };

  const hasActiveFilters = Object.values(filters).some(f => 
    Array.isArray(f) ? f.length > 0 : f !== ''
  ) || searchQuery;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search files by name, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
              showFilters 
                ? 'bg-blue-100 border-blue-300 text-blue-700' 
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(f => Array.isArray(f) ? f.length > 0 : f !== '').length + (searchQuery ? 1 : 0)}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {availableFilters.categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* File Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
              <select
                value={filters.fileType}
                onChange={(e) => setFilters(prev => ({ ...prev, fileType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {availableFilters.fileTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div
        className="p-4"
        style={{
          maxHeight: '480px',
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#c7d2fe #f1f5f9'
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : files.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">
              Found {files.length} file{files.length !== 1 ? 's' : ''}
            </div>
            {files.map(file => (
              <div
                key={file._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onFileSelect && onFileSelect(file)}
              >
                <div className="flex items-start space-x-4 w-full">
                  <div className="pt-1">{getFileIcon(file.fileType)}</div>
                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{file.originalName}</h3>
                      {file.aiScore !== undefined && (
                        <div className="flex flex-col items-end">
                          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-sm">
                            {Math.round(file.aiScore * 100)}% Match
                          </span>
                          {file.aiExtractedMethod && (
                            <span className="text-[10px] text-gray-400 mt-1">via {file.aiExtractedMethod}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {file.class?.name} • {file.uploadedBy?.name} • 
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>

                    {/* Show AI excerpt if available */}
                    {file.aiExcerpt && highlightExcerpt(file.aiExcerpt, file.aiMatchedTerms)}

                    {file.description && !file.aiExcerpt && (
                      <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                    )}
                    {file.aiTags && file.aiTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.aiTags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {file.aiTags.length > 3 && (
                          <span className="text-gray-500 text-xs">
                            +{file.aiTags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs capitalize">
                    {file.category}
                  </span>
                  <button
                    onClick={(e) => handleDownload(e, file._id, file.originalName)}
                    disabled={downloadingId === file._id}
                    title="Download file"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px', borderRadius: '8px', border: 'none',
                      cursor: downloadingId === file._id ? 'not-allowed' : 'pointer',
                      fontWeight: '600', fontSize: '12px',
                      background: downloadStatus[file._id] === 'ok'
                        ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                        : downloadStatus[file._id] === 'error'
                        ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                        : downloadingId === file._id
                        ? '#e0e7ff'
                        : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color: '#fff',
                      boxShadow: downloadingId === file._id ? 'none' : '0 2px 8px rgba(99,102,241,0.35)',
                      transition: 'all 0.2s ease',
                      minWidth: '90px', justifyContent: 'center'
                    }}
                  >
                    {downloadingId === file._id ? (
                      <>
                        <div style={{ width: '12px', height: '12px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        <span style={{ color: '#6366f1' }}>Loading...</span>
                      </>
                    ) : downloadStatus[file._id] === 'ok' ? (
                      <><CheckCircle size={13} /> Downloaded</>
                    ) : downloadStatus[file._id] === 'error' ? (
                      <><AlertCircle size={13} /> Failed</>
                    ) : (
                      <><Download size={13} /> Download</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (searchQuery || hasActiveFilters) ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No files found matching your search criteria</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Enter a search term or use filters to find files</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSearch;