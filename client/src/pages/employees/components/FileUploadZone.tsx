import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  file: File | null;
  isProcessing: boolean;
  accept: string;
  maxSize: number;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelected,
  file,
  isProcessing,
  accept,
  maxSize
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const selectedFile = acceptedFiles[0];
    
    // Validate file type
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !accept.includes(fileExt)) {
      setError(`Invalid file format. Please upload ${accept.replace(/\./g, '')} files only.`);
      return;
    }
    
    // Validate file size
    if (selectedFile.size > maxSize) {
      setError(`File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
      return;
    }
    
    setError(null);
    onFileSelected(selectedFile);
  }, [accept, maxSize, onFileSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
      'text/csv': []
    },
    maxSize,
    multiple: false,
    disabled: isProcessing
  });
  
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div 
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center gap-2">
          {!file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-medium">Drag & drop your file here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports Excel (.xlsx, .xls) and CSV (.csv) formats
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
              
              {!isProcessing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setError(null);
                    onFileSelected(file);
                  }}
                >
                  Change File
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {isProcessing && (
        <div className="space-y-2">
          <Progress value={65} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">Processing file, please wait...</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone; 