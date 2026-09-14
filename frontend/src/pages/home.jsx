import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  HeartPulse,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Database,
  LockKeyhole,
} from "lucide-react";

import Navbar from "../components/Navbar";
import "../App.css";

function Home() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  const isArabic = language === "ar";

  useEffect(() => {
    const handleLanguageChange = (event) => {
      if (event.detail === "ar" || event.detail === "en") {
        setLanguage(event.detail);
      }
    };

    window.addEventListener(
      "amanai-language-change",
      handleLanguageChange
    );

    return () =>
      window.removeEventListener(
        "amanai-language-change",
        handleLanguageChange
      );
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
    localStorage.setItem("language", language);
  }, [language, isArabic]);

  const goToChat = () => {
    navigate(
      localStorage.getItem("access_token")
        ? "/chat"
        : "/login"
    );
  };

  const scrollToLearnMore = () => {
    document
      .getElementById("learn-more")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`aman-app ${isArabic ? "arabic" : ""}`}>
      <Navbar />

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={16} />
              {isArabic
                ? "مساعد رعاية صحية مدعوم بالذكاء الاصطناعي"
                : "AI-Powered Healthcare Assistant"}
            </div>

            <h1>
              {isArabic ? (
                <>
                  الرعاية الصحية
                  <br />
                  <span>بثقة ووضوح.</span>
                </>
              ) : (
                <>
                  Healthcare
                  <br />
                  <span>with confidence.</span>
                </>
              )}
            </h1>

            <p className="hero-description">
              {isArabic
                ? "يساعدك AmanAI على فهم المعلومات الصحية من خلال محادثات ذكية وموثوقة وسهلة الفهم."
                : "AmanAI helps you understand healthcare information through intelligent, reliable, and easy-to-understand conversations."}
            </p>

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={goToChat}
                type="button"
              >
                {isArabic
                  ? "ابدأ محادثة"
                  : "Start a conversation"}
                <ArrowRight size={18} />
              </button>

              <button
                className="secondary-btn"
                onClick={scrollToLearnMore}
                type="button"
              >
                {isArabic ? "اعرف المزيد" : "Learn more"}
              </button>
            </div>

            <div className="trust-row">
              <div>
                <ShieldCheck size={18} />
                <span>
                  {isArabic ? "آمن" : "Secure"}
                </span>
              </div>

              <div>
                <Stethoscope size={18} />
                <span>
                  {isArabic
                    ? "متخصص بالصحة"
                    : "Healthcare focused"}
                </span>
              </div>

              <div>
                <Sparkles size={18} />
                <span>
                  {isArabic
                    ? "مدعوم بالذكاء الاصطناعي"
                    : "AI powered"}
                </span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="glow-circle" />

            <div className="robot-card">
              <div className="robot-head">
                <div className="robot-ear left-ear">
                  <HeartPulse size={17} />
                </div>

                <div className="robot-face">
                  <div className="robot-eyes">
                    <span />
                    <span />
                  </div>

                  <div className="robot-smile" />
                </div>

                <div className="robot-ear right-ear">
                  <HeartPulse size={17} />
                </div>
              </div>

              <div className="robot-neck" />

              <div className="robot-body">
                <div className="coat">
                  <div className="coat-collar left" />
                  <div className="coat-collar right" />

                  <div className="stethoscope">
                    <div className="scope-line" />

                    <div className="scope-head">
                      <HeartPulse size={15} />
                    </div>
                  </div>

                  <div className="medical-badge">
                    <HeartPulse size={17} />
                  </div>
                </div>
              </div>

              <div className="floating-heart">
                <HeartPulse size={28} />
              </div>
            </div>

            <div className="assistant-bubble">
              <div className="bubble-icon">
                <Sparkles size={17} />
              </div>

              <div>
                <strong>
                  {isArabic
                    ? "مرحبًا، أنا AmanAI 👋"
                    : "Hi, I'm AmanAI 👋"}
                </strong>

                <p>
                  {isArabic
                    ? "رفيقك الذكي للرعاية الصحية"
                    : "Your intelligent healthcare companion"}
                </p>
              </div>
            </div>

            <div className="ecg-line">
              <svg
                viewBox="0 0 500 100"
                preserveAspectRatio="none"
              >
                <path
                  d="
                    M0 55
                    L65 55
                    L85 55
                    L100 20
                    L115 80
                    L135 55
                    L205 55
                    L225 55
                    L240 30
                    L255 70
                    L275 55
                    L345 55
                    L365 55
                    L380 25
                    L395 75
                    L415 55
                    L500 55
                  "
                />
              </svg>
            </div>
          </div>
        </section>

        <section className="features" id="learn-more">
          <div className="feature-card">
            <div className="feature-icon">
              <Stethoscope size={23} />
            </div>

            <div>
              <h3>
                {isArabic
                  ? "متخصص بالرعاية الصحية"
                  : "Healthcare focused"}
              </h3>

              <p>
                {isArabic
                  ? "تم تصميم AmanAI لتقديم معلومات متعلقة بالرعاية الصحية بطريقة واضحة ومركزة."
                  : "Designed specifically to provide healthcare-related information in a clear and focused way."}
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Database size={23} />
            </div>

            <div>
              <h3>
                {isArabic
                  ? "قاعدة معرفة موثوقة"
                  : "Trusted knowledge base"}
              </h3>

              <p>
                {isArabic
                  ? "يعتمد AmanAI على قاعدة معرفة صحية مع نظام Retrieval-Augmented Generation لاسترجاع المعلومات ذات الصلة."
                  : "AmanAI uses a curated healthcare knowledge base with Retrieval-Augmented Generation to retrieve relevant information."}
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Sparkles size={23} />
            </div>

            <div>
              <h3>
                {isArabic
                  ? "مساعدة ذكية"
                  : "Intelligent assistance"}
              </h3>

              <p>
                {isArabic
                  ? "اطرح أسئلتك بطريقة طبيعية واحصل على إجابات صحية سهلة الفهم من مساعدك الذكي."
                  : "Ask questions naturally and receive easy-to-understand answers from your AI healthcare companion."}
              </p>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={23} />
            </div>

            <div>
              <h3>
                {isArabic
                  ? "حماية وأمان"
                  : "Secure by design"}
              </h3>

              <p>
                {isArabic
                  ? "يتضمن النظام مصادقة للمستخدمين وحماية من محاولات تجاوز نطاق المساعد."
                  : "The system includes user authentication and protection against attempts to bypass the assistant's healthcare scope."}
              </p>
            </div>
          </div>
        </section>

        <section className="home-disclaimer">
          <LockKeyhole size={17} />

          <p>
            {isArabic
              ? "AmanAI يقدم معلومات صحية تثقيفية ولا يحل محل الاستشارة الطبية المتخصصة."
              : "AmanAI provides informational healthcare responses and does not replace professional medical advice."}
          </p>
        </section>
      </main>

      <footer className="aman-footer">
        <div className="footer-brand">
          <div className="footer-icon">
            <HeartPulse size={18} />
          </div>

          <strong>AmanAI</strong>
        </div>

        <p>
          © 2026 AmanAI.{" "}
          {isArabic
            ? "جميع الحقوق محفوظة."
            : "All rights reserved."}
        </p>

        <span>Healthcare Intelligence</span>
      </footer>
    </div>
  );
}

export default Home;