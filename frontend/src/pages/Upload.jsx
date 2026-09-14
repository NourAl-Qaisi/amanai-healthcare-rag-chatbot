import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  HeartPulse,
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "./Upload.css";

function Upload() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadInfo, setUploadInfo] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setError("");
    setSuccess("");
    setUploadInfo(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(null);
      setError("Only CSV files are allowed.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const clearAdminSession = () => {
    ["access_token", "role", "username", "email"].forEach(
      (key) => sessionStorage.removeItem(key)
    );
  };

  const handleUpload = async () => {
    setError("");
    setSuccess("");
    setUploadInfo(null);

    if (!selectedFile) {
      setError("Please select a CSV file first.");
      return;
    }

    const adminToken = sessionStorage.getItem("access_token");
    const adminRole = sessionStorage.getItem("role");

    const userToken = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("role");

    let token = null;
    let role = null;

    if (adminToken && adminRole === "admin") {
      token = adminToken;
      role = adminRole;
    } else if (userToken) {
      token = userToken;
      role = userRole;
    }

    if (!token) {
      setError(
        "You must be logged in to upload a dataset."
      );
      navigate("/login");
      return;
    }

    if (role !== "admin") {
      setError(
        "Only administrators can upload datasets."
      );
      navigate("/chat");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setUploading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/upload_dataset",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        clearAdminSession();
        setError(
          "Your session has expired. Please log in again."
        );
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        setError(
          "Only administrators can upload datasets."
        );
        navigate("/chat");
        return;
      }

      if (!response.ok) {
        setError(
          data.detail || "Failed to upload the dataset."
        );
        return;
      }

      setSuccess(
        "Healthcare dataset uploaded successfully!"
      );

      setUploadInfo({
        documents:
          data.documents ??
          data.total_documents ??
          data.uploaded_documents ??
          0,
        embedding_dimension:
          data.embedding_dimension ?? "N/A",
      });

      console.log("Upload response:", data);

      setSelectedFile(null);

      const fileInput =
        document.getElementById("dataset-file");

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);

      setError(
        "Unable to connect to the server. Please make sure the backend is running."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-navbar">
        <div
          className="upload-brand"
          onClick={() => navigate("/")}
        >
          <div className="upload-brand-icon">
            <HeartPulse size={22} />
          </div>

          <div>
            <h2>AmanAI</h2>
            <span>Healthcare Intelligence</span>
          </div>
        </div>

        <button
          type="button"
          className="upload-back"
          onClick={() => navigate("/chat")}
        >
          <ArrowLeft size={17} />
          <span>Back to Chat</span>
        </button>
      </header>

      <main className="upload-main">
        <div className="upload-card">
          <div className="upload-icon">
            <UploadCloud size={31} />
          </div>

          <div className="upload-heading">
            <span className="upload-eyebrow">
              Knowledge Base
            </span>

            <h1>Upload Healthcare Data</h1>

            <p>
              Add a CSV dataset to the AmanAI
              healthcare knowledge base.
            </p>
          </div>

          <div className="upload-form">
            <label
              htmlFor="dataset-file"
              className={`file-drop-zone ${
                selectedFile ? "file-selected" : ""
              }`}
            >
              <input
                id="dataset-file"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                hidden
              />

              {selectedFile ? (
                <>
                  <CheckCircle2 size={34} />
                  <strong>{selectedFile.name}</strong>
                  <span>
                    CSV file selected successfully
                  </span>
                </>
              ) : (
                <>
                  <FileText size={34} />
                  <strong>Choose a CSV file</strong>
                  <span>
                    Click here to browse your computer
                  </span>
                </>
              )}
            </label>

            {error && (
              <div className="upload-message error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="upload-message success">
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </div>
            )}

            {uploadInfo && (
              <div className="upload-info">
                <div>
                  <strong>Documents</strong>
                  <span>{uploadInfo.documents}</span>
                </div>

                <div>
                  <strong>Embedding Dimension</strong>
                  <span>
                    {uploadInfo.embedding_dimension}
                  </span>
                </div>

                <div>
                  <strong>Status</strong>
                  <span>Vector Store Ready</span>
                </div>
              </div>
            )}

            <button
              type="button"
              className="upload-submit"
              onClick={handleUpload}
              disabled={uploading}
            >
              <UploadCloud size={19} />
              {uploading
                ? "Uploading..."
                : "Upload Dataset"}
            </button>

            {!uploadInfo && (
              <div className="upload-info">
                <div>
                  <strong>Supported format</strong>
                  <span>CSV</span>
                </div>

                <div>
                  <strong>Domain</strong>
                  <span>Healthcare</span>
                </div>

                <div>
                  <strong>Purpose</strong>
                  <span>Knowledge Base</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Upload;