import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ShieldCheck,
  UploadCloud,
  Database,
  Users,
  MessageSquare,
  HelpCircle,
  Server,
  Brain,
  LockKeyhole,
} from "lucide-react";

import Navbar from "../components/Navbar";
import "./Admin.css";

function Admin() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef(null);

  const isArabic = language === "ar";

  useEffect(() => {
    const updateLanguage = () => {
      const next = localStorage.getItem("language") || "en";
      setLanguage(next);
      document.documentElement.lang = next;
      document.documentElement.dir =
        next === "ar" ? "rtl" : "ltr";
    };

    updateLanguage();

    window.addEventListener(
      "amanai-language-change",
      updateLanguage
    );

    return () =>
      window.removeEventListener(
        "amanai-language-change",
        updateLanguage
      );
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setDarkMode(
        (localStorage.getItem("theme") || "light") === "dark"
      );
    };

    updateTheme();

    window.addEventListener(
      "amanai-theme-change",
      updateTheme
    );

    return () =>
      window.removeEventListener(
        "amanai-theme-change",
        updateTheme
      );
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/admin/dashboard",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          [
            "access_token",
            "role",
            "username",
            "email",
          ].forEach((key) => localStorage.removeItem(key));

          navigate("/login");
          return;
        }

        if (response.status === 403) {
          navigate("/chat");
          return;
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to load admin dashboard."
          );
        }

        setDashboard(data);
      } catch (err) {
        console.error("Admin dashboard error:", err);
        setError(
          isArabic
            ? "تعذر تحميل بيانات لوحة الإدارة."
            : "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate, isArabic]);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(
      isArabic ? "ar-JO" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const getStatusText = (status) =>
    status
      ? isArabic
        ? "يعمل"
        : "Online"
      : isArabic
      ? "غير متاح"
      : "Unavailable";

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setSelectedFile(file);
    setUploadMessage("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(null);
      setUploadMessage(
        isArabic
          ? "يرجى اختيار ملف CSV فقط."
          : "Please select a CSV file only."
      );
      event.target.value = "";
    }
  };

  const handleDatasetUpload = async () => {
    setError("");
    setUploadMessage("");

    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");

    if (!token) {
      navigate("/login");
      return;
    }

    if (role !== "admin") {
      navigate("/chat");
      return;
    }

    if (!selectedFile) {
      setUploadMessage(
        isArabic
          ? "يرجى اختيار ملف CSV أولًا."
          : "Please choose a CSV file first."
      );
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setUploadMessage(
        isArabic
          ? "يرجى رفع ملف CSV فقط."
          : "Please upload a CSV file only."
      );
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

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

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.status === 401) {
        [
          "access_token",
          "role",
          "username",
          "email",
        ].forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        navigate("/login");
        return;
      }

      if (response.status === 403) {
        navigate("/chat");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            (isArabic
              ? "فشل رفع مجموعة البيانات."
              : "Failed to upload the dataset.")
        );
      }

      setUploadMessage(
        isArabic
          ? `تم رفع البيانات بنجاح. تمت إضافة ${
              data.uploaded_documents ??
              data.documents ??
              0
            } مستند.`
          : `Dataset uploaded successfully. ${
              data.uploaded_documents ??
              data.documents ??
              0
            } documents added.`
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      console.error("Dataset upload error:", err);

      setUploadMessage(
        err.message ||
          (isArabic
            ? "تعذر رفع مجموعة البيانات."
            : "Unable to upload the dataset.")
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`admin-page ${
        darkMode ? "admin-dark" : ""
      } ${isArabic ? "admin-arabic" : ""}`}
    >
      <Navbar />

      <main className="admin-main">
        <div className="admin-container">
          <div className="admin-heading">
            <div className="admin-heading-icon">
              <ShieldCheck size={25} />
            </div>

            <div>
              <span className="admin-eyebrow">
                {isArabic
                  ? "مسؤول النظام"
                  : "Administrator"}
              </span>

              <h1>
                {isArabic
                  ? "لوحة تحكم AmanAI"
                  : "AmanAI Admin Dashboard"}
              </h1>

              <p>
                {isArabic
                  ? "راقب المستخدمين والمحادثات وقاعدة المعرفة وحالة النظام."
                  : "Monitor users, conversations, knowledge base, and system status."}
              </p>
            </div>
          </div>

          {loading && (
            <section className="admin-management">
              <div className="management-header">
                <h2>
                  {isArabic
                    ? "جاري تحميل لوحة التحكم..."
                    : "Loading dashboard..."}
                </h2>
              </div>
            </section>
          )}

          {!loading && error && (
            <section className="admin-management">
              <div className="management-header">
                <h2>
                  {isArabic
                    ? "حدث خطأ"
                    : "Something went wrong"}
                </h2>
                <p>{error}</p>
              </div>
            </section>
          )}

          {!loading && !error && dashboard && (
            <>
              <section className="admin-stats">
                {[
                  {
                    icon: Users,
                    ar: "إجمالي المستخدمين",
                    en: "Total Users",
                    value: dashboard.stats?.total_users,
                  },
                  {
                    icon: MessageSquare,
                    ar: "إجمالي المحادثات",
                    en: "Total Conversations",
                    value:
                      dashboard.stats?.total_conversations,
                  },
                  {
                    icon: HelpCircle,
                    ar: "الأسئلة المطروحة",
                    en: "Questions Asked",
                    value: dashboard.stats?.total_questions,
                  },
                  {
                    icon: ShieldCheck,
                    ar: "المسؤولون",
                    en: "Admins",
                    value: dashboard.stats?.total_admins,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="admin-stat-card"
                      key={item.en}
                    >
                      <div className="admin-stat-icon">
                        <Icon size={21} />
                      </div>

                      <div>
                        <span>
                          {isArabic ? item.ar : item.en}
                        </span>

                        <strong>
                          {item.value ?? 0}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </section>

              <div className="admin-dashboard-grid">
                <section className="admin-management">
                  <div className="management-header">
                    <span className="admin-eyebrow">
                      {isArabic
                        ? "النشاط"
                        : "Activity"}
                    </span>

                    <h2>
                      {isArabic
                        ? "الأسئلة اليومية"
                        : "Questions per Day"}
                    </h2>

                    <p>
                      {isArabic
                        ? "عدد الأسئلة خلال آخر 7 أيام."
                        : "Number of questions during the last 7 days."}
                    </p>
                  </div>

                  <div className="admin-activity-list">
                    {dashboard.activity?.length ? (
                      (() => {
                        const maxCount = Math.max(
                          ...dashboard.activity.map(
                            (item) =>
                              Number(item.count) || 0
                          ),
                          1
                        );

                        return dashboard.activity.map(
                          (item) => {
                            const count =
                              Number(item.count) || 0;

                            return (
                              <div
                                className="activity-row"
                                key={item.date}
                              >
                                <span className="activity-date">
                                  {formatDate(item.date)}
                                </span>

                                <div className="activity-bar-container">
                                  <div
                                    className="activity-bar"
                                    style={{
                                      width: `${
                                        (count /
                                          maxCount) *
                                        100
                                      }%`,
                                    }}
                                  />
                                </div>

                                <strong className="activity-count">
                                  {count}
                                </strong>
                              </div>
                            );
                          }
                        );
                      })()
                    ) : (
                      <div className="admin-empty">
                        {isArabic
                          ? "لا يوجد نشاط بعد."
                          : "No activity yet."}
                      </div>
                    )}
                  </div>
                </section>

                <section className="admin-management">
                  <div className="management-header">
                    <span className="admin-eyebrow">
                      {isArabic
                        ? "قاعدة المعرفة"
                        : "Knowledge Base"}
                    </span>

                    <h2>
                      {isArabic
                        ? "المعرفة الصحية"
                        : "Healthcare Knowledge Base"}
                    </h2>

                    <p>
                      {isArabic
                        ? "المعلومات المستخدمة حاليًا بواسطة نظام RAG."
                        : "Information currently used by the RAG system."}
                    </p>
                  </div>

                  <div className="knowledge-grid">
                    <div className="knowledge-item">
                      <Database size={20} />

                      <div>
                        <span>
                          {isArabic
                            ? "المستندات"
                            : "Documents"}
                        </span>

                        <strong>
                          {dashboard.knowledge_base
                            ?.documents ?? 0}
                        </strong>
                      </div>
                    </div>

                    <div className="knowledge-item">
                      <Brain size={20} />

                      <div>
                        <span>
                          {isArabic
                            ? "التصنيفات"
                            : "Categories"}
                        </span>

                        <strong>
                          {dashboard.knowledge_base
                            ?.categories ?? 0}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="admin-upload-card">
                    <div className="admin-upload-icon">
                      <UploadCloud size={28} />
                    </div>

                    <div className="admin-upload-content">
                      <h3>
                        {isArabic
                          ? "تحديث قاعدة المعرفة"
                          : "Update Knowledge Base"}
                      </h3>

                      <p>
                        {isArabic
                          ? "ارفع ملف CSV صحي لإضافة معلومات جديدة إلى نظام RAG."
                          : "Upload a healthcare CSV dataset to add new information to the RAG system."}
                      </p>

                      {selectedFile && (
                        <div className="admin-selected-file">
                          <Database size={15} />
                          <span>{selectedFile.name}</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="admin-file-input"
                      onChange={handleFileChange}
                    />

                    <div className="admin-upload-actions">
                      <button
                        type="button"
                        className="admin-file-button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        disabled={uploading}
                      >
                        <Database size={17} />
                        {isArabic
                          ? "اختيار ملف"
                          : "Choose CSV"}
                      </button>

                      <button
                        type="button"
                        className="admin-upload-button"
                        onClick={handleDatasetUpload}
                        disabled={uploading}
                      >
                        <UploadCloud size={18} />
                        {uploading
                          ? isArabic
                            ? "جاري الرفع..."
                            : "Uploading..."
                          : isArabic
                          ? "رفع البيانات"
                          : "Upload Dataset"}
                      </button>
                    </div>
                  </div>

                  {uploadMessage && (
                    <div
                      className={`admin-upload-message ${
                        /failed|unable|فشل|تعذر/i.test(
                          uploadMessage
                        )
                          ? "error"
                          : "success"
                      }`}
                    >
                      {uploadMessage}
                    </div>
                  )}
                </section>
              </div>

              <section className="admin-management">
                <div className="management-header">
                  <span className="admin-eyebrow">
                    {isArabic ? "حالة النظام" : "System"}
                  </span>

                  <h2>
                    {isArabic
                      ? "حالة مكونات النظام"
                      : "System Status"}
                  </h2>

                  <p>
                    {isArabic
                      ? "حالة الخدمات الأساسية المستخدمة في AmanAI."
                      : "Status of the core services used by AmanAI."}
                  </p>
                </div>

                <div className="system-status-grid">
                  {[
                    {
                      icon: Server,
                      label: "Database",
                      key: "database",
                    },
                    {
                      icon: Brain,
                      label: "RAG System",
                      key: "rag",
                    },
                    {
                      icon: Database,
                      label: "Knowledge Base",
                      key: "knowledge_base",
                    },
                    {
                      icon: LockKeyhole,
                      label: "Authentication",
                      key: "authentication",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        className="system-status-item"
                        key={item.key}
                      >
                        <div className="system-status-icon">
                          <Icon size={20} />
                        </div>

                        <div>
                          <span>{item.label}</span>
                          <strong>
                            {getStatusText(
                              dashboard.system?.[item.key]
                            )}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;