
import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import VoiceUpload from "@/components/VoiceUpload";
import { FileUploadList } from "@/components/FileUploadList";
import { supabase } from "@/lib/supabase";
import { 
  Upload as UploadIcon, 
  X,
  Image as ImageIcon, 
  FileCheck, 
  FileText, 
  Download,
  Files,
  FileCog
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("upload");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const acceptedFileTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    
    if (!acceptedFileTypes.includes(file.type)) {
      setUploadError("Invalid file type. Please upload a JPG, PNG, GIF, WebP, PDF, or text file.");
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a supported file type.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File too large. Please upload a file less than 10MB in size.");
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload a file less than 10MB in size.",
      });
      return;
    }

    setFile(file);
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
          }
          return Math.min(newProgress, 90);
        });
      }, 300);
      
      const { error: uploadError } = await supabase.storage
        .from('user_files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase
        .from('user_uploads')
        .insert({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath
        });
      
      if (dbError) throw dbError;
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setFile(null);
        setPreview(null);
        
        toast({
          title: "Upload successful",
          description: "Your file has been uploaded successfully.",
        });
        
        navigate("/all-files");
      }, 500);
      
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError("Failed to upload the file. Please try again.");
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Could not upload the file. Please try again.",
      });
      setIsUploading(false);
    }
  };

  const handleVoiceCommand = (command: string) => {
    switch (command) {
      case "select":
        fileInputRef.current?.click();
        break;
      case "upload":
        handleUpload();
        break;
      case "clear":
        clearFile();
        break;
      case "cancel":
        if (isUploading) {
          setIsUploading(false);
          toast({
            title: "Cancelled",
            description: "The upload has been cancelled.",
          });
        }
        break;
      default:
        toast({
          description: `Command not recognized: ${command}`,
        });
    }
  };

  const downloadImage = () => {
    if (!preview) return;
    
    const a = document.createElement('a');
    a.href = preview;
    a.download = file?.name || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="mb-6 text-center text-3xl font-bold">Upload Files</h1>
        
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <VoiceUpload onCommand={handleVoiceCommand} />
              <p className="text-sm text-muted-foreground">Use voice commands to control uploads</p>
            </div>
            {preview && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={downloadImage}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            )}
          </div>
          
          <Tabs defaultValue="upload" className="mb-8" value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="files">My Files</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              {!preview && !file ? (
                <div 
                  className={`relative mb-6 flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/40 p-6 transition-colors hover:bg-muted/70 ${
                    isDragging ? "border-primary bg-primary/5" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={acceptedFileTypes.join(",")}
                    onChange={handleFileChange}
                  />
                  
                  <div className="text-center">
                    <UploadIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-2 text-lg font-medium">
                      Drag & drop your file here
                    </p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      or click to browse files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: JPG, PNG, GIF, WebP, PDF, TXT, XLS, XLSX (max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  {file?.type.startsWith('image/') ? (
                    <div className="relative min-h-[300px] overflow-hidden rounded-lg border bg-card shadow-sm">
                      <img
                        src={preview}
                        alt="Preview"
                        className="mx-auto max-h-[400px] max-w-full object-contain"
                      />
                      {!isUploading && (
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-gray-800 p-1 text-white opacity-70 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearFile();
                          }}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <Card className="relative min-h-[200px] flex items-center justify-center">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4 flex justify-center">
                          {file?.type === 'application/pdf' ? (
                            <FileText className="h-16 w-16 text-red-500" />
                          ) : file?.type.includes('spreadsheet') || file?.type.includes('excel') ? (
                            <FileCog className="h-16 w-16 text-green-500" />
                          ) : (
                            <FileText className="h-16 w-16 text-blue-500" />
                          )}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{file?.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {(file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0')} MB • {file?.type}
                        </p>
                        
                        {!isUploading && (
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-gray-200 p-1 text-gray-700 opacity-70 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearFile();
                            }}
                          >
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {uploadError && (
                <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {uploadError}
                </div>
              )}
              
              {file && (
                <Card className="mb-6 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="h-5 w-5" />
                        ) : file.type === 'application/pdf' ? (
                          <FileText className="h-5 w-5" />
                        ) : file.type.includes('spreadsheet') || file.type.includes('excel') ? (
                          <FileCog className="h-5 w-5" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div>
                        {isUploading ? (
                          <div className="text-right text-sm font-medium text-brand-600">
                            {uploadProgress}%
                          </div>
                        ) : (
                          <FileCheck className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    {isUploading && (
                      <div className="mt-3">
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              <div className="flex justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="min-w-[200px]"
                >
                  {isUploading ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="files">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Recent Files</h2>
                <Button onClick={() => navigate("/all-files")} variant="outline" size="sm" className="flex items-center gap-1">
                  <Files className="h-4 w-4" />
                  View All Files
                </Button>
              </div>
              <FileUploadList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Upload;
