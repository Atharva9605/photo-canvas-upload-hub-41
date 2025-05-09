
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Download, Trash2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useGeminiApi } from "@/hooks/useGeminiApi";
import { jsonToCSV } from "@/utils/csvUtils";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

interface CSVDataItem {
  id: string;
  file_name: string;
  data: any;
  created_at: string;
  updated_at: string | null;
}

const SavedCSVList = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState<CSVDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAllCsvData } = useGeminiApi();

  useEffect(() => {
    const fetchSavedData = async () => {
      try {
        setIsLoading(true);
        const data = await getAllCsvData();
        setCsvData(data as CSVDataItem[]);
      } catch (err) {
        console.error("Error fetching saved CSV data:", err);
        setError("Failed to load saved data");
        toast.error("Could not load your saved files");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedData();
  }, [getAllCsvData]);

  const handleEdit = (id: string) => {
    navigate(`/csv-editor/${id}`);
  };

  const handleDownloadXLSX = (item: CSVDataItem) => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(
        Array.isArray(item.data) ? item.data : [item.data]
      );
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');
      
      // Generate file name
      const fileName = item.file_name || `stock-data-${item.id}.xlsx`;
      
      // Write and download
      XLSX.writeFile(wb, fileName);
      
      toast.success("XLSX file downloaded successfully");
    } catch (error) {
      console.error("Error downloading XLSX:", error);
      toast.error("Failed to download the XLSX file");
    }
  };

  const handleDownloadCSV = (item: CSVDataItem) => {
    try {
      const csvString = jsonToCSV(Array.isArray(item.data) ? item.data : [item.data]);
      const fileName = item.file_name || `csv-data-${item.id}.csv`;
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download the CSV file");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  };

  const getRowCount = (data: any) => {
    if (Array.isArray(data)) return data.length;
    return data ? 1 : 0;
  };

  const getColumnCount = (data: any) => {
    if (Array.isArray(data) && data.length > 0) {
      return Object.keys(data[0]).length;
    }
    if (data && typeof data === 'object') {
      return Object.keys(data).length;
    }
    return 0;
  };

  const handleDelete = (id: string) => {
    // This would be implemented when the API supports deletion
    toast.info("Delete functionality will be implemented soon");
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Saved Stock Data</h1>
          <Button 
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1"
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload New File
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Your Stock Book Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <span className="ml-3">Loading your saved files...</span>
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Retry</Button>
              </div>
            ) : csvData.length === 0 ? (
              <div className="text-center p-12">
                <p className="text-muted-foreground mb-4">You don't have any saved files yet.</p>
                <Button onClick={() => navigate('/upload')}>
                  Upload Your First File
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.file_name || `StockData-${item.id.substring(0, 8)}`}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell>{formatDate(item.updated_at)}</TableCell>
                        <TableCell>{getRowCount(item.data)}</TableCell>
                        <TableCell>{getColumnCount(item.data)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(item.id)}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDownloadXLSX(item)}
                              title="Download XLSX"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive" 
                              title="Delete"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SavedCSVList;
