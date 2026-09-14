import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Send,
  Plus,
  User,
  Bot,
  ShieldCheck,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";

import Navbar from "../components/Navbar";
import "./Chat.css";

function Chat() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] =
    useState(() => {
      const id = localStorage.getItem(
        "active_conversation_id"
      );

      return id ? Number(id) : null;
    });

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] =
    useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isArabic = language === "ar";

  // --------------------------------------------------
  // LANGUAGE SYNC
  // --------------------------------------------------

  useEffect(() => {
    const handleLanguageChange = (event) => {
      const nextLanguage = event.detail;

      if (
        nextLanguage === "ar" ||
        nextLanguage === "en"
      ) {
        setLanguage(nextLanguage);
      }
    };

    window.addEventListener(
      "amanai-language-change",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "amanai-language-change",
        handleLanguageChange
      );
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      isArabic ? "rtl" : "ltr";

    localStorage.setItem(
      "language",
      language
    );
  }, [language, isArabic]);

  // --------------------------------------------------
  // THEME
  // --------------------------------------------------

  useEffect(() => {
    document.body.classList.toggle(
      "dark-mode",
      darkMode
    );

    document.documentElement.classList.toggle(
      "dark-mode",
      darkMode
    );

    localStorage.setItem(
      "theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const getToken = () =>
    localStorage.getItem("access_token");

  const getWelcomeMessage = (lang = language) =>
    lang === "ar"
      ? "مرحبًا! أنا AmanAI، رفيقك الذكي للرعاية الصحية. كيف يمكنني مساعدتك اليوم؟"
      : "Hello! I'm AmanAI, your intelligent healthcare companion. How can I help you today?";

  const getTextDirection = (text) => {
    if (!text) return "ltr";

    const arabicCharacters = text.match(
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g
    );

    return arabicCharacters &&
      arabicCharacters.length > 2
      ? "rtl"
      : "ltr";
  };

  const clearAuth = () => {
    [
      "access_token",
      "role",
      "username",
      "email",
      "active_conversation_id",
    ].forEach((key) => {
      localStorage.removeItem(key);
    });

    [
      "access_token",
      "role",
      "username",
      "email",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  // --------------------------------------------------
  // LOAD CONVERSATIONS
  // --------------------------------------------------

  const loadConversations = async () => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    setHistoryLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/conversations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load conversations."
        );
      }

      setConversations(
        data.conversations || []
      );
    } catch (error) {
      console.error(
        "History error:",
        error
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // --------------------------------------------------
  // OPEN CONVERSATION
  // --------------------------------------------------

  const openConversation = async (
    conversationId
  ) => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (response.status === 404) {
        localStorage.removeItem(
          "active_conversation_id"
        );

        setCurrentConversationId(null);

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to open conversation."
        );
      }

      setCurrentConversationId(
        data.conversation.id
      );

      localStorage.setItem(
        "active_conversation_id",
        String(data.conversation.id)
      );

      const loadedMessages =
        data.messages || [];

      setMessages(
        loadedMessages.length
          ? loadedMessages.map(
              (message) => ({
                id: message.id,
                role: message.role,
                text: message.content,
                sources:
                  message.sources || [],
              })
            )
          : [
              {
                id: "welcome",
                role: "assistant",
                text: getWelcomeMessage(),
                sources: [],
              },
            ]
      );
    } catch (error) {
      console.error(
        "Open conversation error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // RESTORE CHAT
  // --------------------------------------------------

  useEffect(() => {
    const restoreChat = async () => {
      if (!getToken()) {
        navigate("/login");
        return;
      }

      await loadConversations();

      const savedId = localStorage.getItem(
        "active_conversation_id"
      );

      if (savedId) {
        await openConversation(
          Number(savedId)
        );

        // Keep history visible after refresh.
        setSidebarOpen(true);
      } else {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            text: getWelcomeMessage(),
            sources: [],
          },
        ]);
      }
    };

    restoreChat();
  }, []);

  // --------------------------------------------------
  // CREATE CONVERSATION
  // --------------------------------------------------

  const createNewConversation =
    async () => {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return null;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/conversations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          handleLogout();
          return null;
        }

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to create conversation."
          );
        }

        setCurrentConversationId(
          data.id
        );

        localStorage.setItem(
          "active_conversation_id",
          String(data.id)
        );

        setConversations(
          (previous) => [
            data,
            ...previous,
          ]
        );

        return data.id;
      } catch (error) {
        console.error(
          "Create conversation error:",
          error
        );

        return null;
      }
    };

  // --------------------------------------------------
  // NEW CHAT
  // --------------------------------------------------

  const handleNewChat = () => {
    setCurrentConversationId(null);

    localStorage.removeItem(
      "active_conversation_id"
    );

    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: getWelcomeMessage(),
        sources: [],
      },
    ]);

    setInput("");

    // IMPORTANT:
    // Keep the history sidebar visible.
    setSidebarOpen(true);
  };

  // --------------------------------------------------
  // SAVE MESSAGES
  // --------------------------------------------------

  const saveMessages = async (
    conversationId,
    userMessage,
    assistantMessage,
    sources
  ) => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return false;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_message:
              userMessage,
            assistant_message:
              assistantMessage,
            sources: sources || [],
          }),
        }
      );

      if (response.status === 401) {
        handleLogout();
        return false;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to save messages."
        );
      }

      return true;
    } catch (error) {
      console.error(
        "Save history error:",
        error
      );

      return false;
    }
  };

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------

  const handleSend = async (event) => {
    event.preventDefault();

    if (
      !input.trim() ||
      loading
    ) {
      return;
    }

    const question = input.trim();

    setMessages(
      (previous) => [
        ...previous,
        {
          id: Date.now(),
          role: "user",
          text: question,
          sources: [],
        },
      ]
    );

    setInput("");
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      let conversationId =
        currentConversationId;

      if (!conversationId) {
        conversationId =
          await createNewConversation();

        if (!conversationId) {
          throw new Error(
            "Could not create conversation."
          );
        }
      }

      setCurrentConversationId(
        conversationId
      );

      localStorage.setItem(
        "active_conversation_id",
        String(conversationId)
      );

      const response = await fetch(
        `http://127.0.0.1:8000/chat?query=${encodeURIComponent(
          question
        )}&conversation_id=${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Something went wrong."
        );
      }

      const sources =
        data.sources || [];

      setMessages(
        (previous) => [
          ...previous,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: data.answer,
            sources,
          },
        ]
      );

      await saveMessages(
        conversationId,
        question,
        data.answer,
        sources
      );

      await loadConversations();

      setCurrentConversationId(
        conversationId
      );

      localStorage.setItem(
        "active_conversation_id",
        String(conversationId)
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      const direction =
        getTextDirection(question);

      setMessages(
        (previous) => [
          ...previous,
          {
            id: Date.now() + 1,
            role: "assistant",
            text:
              direction === "rtl"
                ? "عذرًا، لم أتمكن من معالجة طلبك. تأكدي من تشغيل الخادم وحاولي مرة أخرى."
                : "I'm sorry, I couldn't process your request. Please make sure the server is running and try again.",
            sources: [],
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // DELETE CONVERSATION
  // --------------------------------------------------

  const deleteConversation = async (
    conversationId
  ) => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/conversations/${conversationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        handleLogout();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to delete conversation."
        );
      }

      setConversations(
        (previous) =>
          previous.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          )
      );

      if (
        currentConversationId ===
        conversationId
      ) {
        handleNewChat();

        // Keep history visible.
        setSidebarOpen(true);
      }
    } catch (error) {
      console.error(
        "Delete conversation error:",
        error
      );
    }
  };

  // --------------------------------------------------
  // LANGUAGE TOGGLE
  // --------------------------------------------------

  const toggleLanguage = () => {
    const nextLanguage =
      isArabic ? "en" : "ar";

    setLanguage(nextLanguage);

    localStorage.setItem(
      "language",
      nextLanguage
    );

    document.documentElement.lang =
      nextLanguage;

    document.documentElement.dir =
      nextLanguage === "ar"
        ? "rtl"
        : "ltr";

    // Keep Navbar, Home, Admin, etc.
    // synchronized with Chat.
    window.dispatchEvent(
      new CustomEvent(
        "amanai-language-change",
        {
          detail: nextLanguage,
        }
      )
    );

    // Only change the welcome message
    // when there is no active conversation.
    if (!currentConversationId) {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          text: getWelcomeMessage(
            nextLanguage
          ),
          sources: [],
        },
      ]);
    }
  };

  return (
    <div
      className={`chat-page ${
        isArabic ? "arabic" : ""
      }`}
    >
      <Navbar />

      <div className="chat-layout">
        <aside
          className={`chat-sidebar ${
            sidebarOpen
              ? "sidebar-open"
              : "sidebar-closed"
          }`}
        >
          <div className="sidebar-header">
            <div>
              <span className="sidebar-eyebrow">
                {isArabic
                  ? "المحادثات"
                  : "Conversations"}
              </span>

              <h2>
                {isArabic
                  ? "سجل المحادثات"
                  : "Chat History"}
              </h2>
            </div>

            <button
              type="button"
              className="sidebar-new-chat"
              onClick={handleNewChat}
              title={
                isArabic
                  ? "محادثة جديدة"
                  : "New Chat"
              }
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="sidebar-divider" />

          <div className="conversation-list">
            {historyLoading ? (
              <div className="history-loading">
                <Loader2
                  size={20}
                  className="spin"
                />

                <span>
                  {isArabic
                    ? "جاري تحميل المحادثات..."
                    : "Loading history..."}
                </span>
              </div>
            ) : conversations.length ===
              0 ? (
              <div className="empty-history">
                <div className="empty-history-icon">
                  <MessageSquare
                    size={22}
                  />
                </div>

                <h3>
                  {isArabic
                    ? "لا توجد محادثات بعد"
                    : "No conversations yet"}
                </h3>

                <p>
                  {isArabic
                    ? "ابدئي محادثة جديدة وستظهر هنا."
                    : "Start a new conversation and it will appear here."}
                </p>
              </div>
            ) : (
              conversations.map(
                (conversation) => (
                  <div
                    key={
                      conversation.id
                    }
                    className={`conversation-item ${
                      currentConversationId ===
                      conversation.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      openConversation(
                        conversation.id
                      )
                    }
                  >
                    <div className="conversation-icon">
                      <MessageSquare
                        size={17}
                      />
                    </div>

                    <div className="conversation-info">
                      <span
                        className="conversation-title"
                        dir={getTextDirection(
                          conversation.title
                        )}
                      >
                        {
                          conversation.title
                        }
                      </span>
                    </div>

                    <button
                      type="button"
                      className="conversation-delete"
                      onClick={(event) => {
                        event.stopPropagation();

                        deleteConversation(
                          conversation.id
                        );
                      }}
                      title={
                        isArabic
                          ? "حذف المحادثة"
                          : "Delete conversation"
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              )
            )}
          </div>

          <div className="sidebar-footer">
            <ShieldCheck size={14} />

            <span>
              {isArabic
                ? "محادثاتك محفوظة بشكل آمن."
                : "Your conversations are stored securely."}
            </span>
          </div>
        </aside>

        <section className="chat-main">
          <section className="chat-header">
            <div className="assistant-status">
              <div className="assistant-avatar">
                <Bot size={25} />
              </div>

              <div>
                <h1>
                  {isArabic
                    ? "مساعد AmanAI"
                    : "AmanAI Assistant"}
                </h1>

                <div className="online-status">
                  <span />

                  {isArabic
                    ? "مساعد ذكاء اصطناعي للرعاية الصحية"
                    : "Healthcare AI Assistant"}
                </div>
              </div>
            </div>
          </section>

          <main className="chat-container">
            <div className="messages-container">
              {messages.map(
                (message) => (
                  <div
                    key={message.id}
                    className={`message-row ${
                      message.role ===
                      "user"
                        ? "user-message"
                        : "assistant-message"
                    }`}
                  >
                    <div className="message-avatar">
                      {message.role ===
                      "user" ? (
                        <User size={18} />
                      ) : (
                        <Bot size={18} />
                      )}
                    </div>

                    <div className="message-content">
                      <div
                        className="message-bubble"
                        dir={getTextDirection(
                          message.text
                        )}
                      >
                        {message.text}
                      </div>
                    </div>
                  </div>
                )
              )}

              {loading && (
                <div className="message-row assistant-message">
                  <div className="message-avatar">
                    <Bot size={18} />
                  </div>

                  <div className="message-content">
                    <div className="typing-bubble">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              className="chat-input-area"
              onSubmit={handleSend}
            >
              <input
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                placeholder={
                  isArabic
                    ? "اكتبي سؤالك الصحي هنا..."
                    : "Ask AmanAI a healthcare question..."
                }
                dir={getTextDirection(
                  input
                )}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !input.trim()
                }
                title={
                  isArabic
                    ? "إرسال"
                    : "Send"
                }
              >
                {loading ? (
                  <Loader2
                    size={19}
                    className="spin"
                  />
                ) : (
                  <Send size={19} />
                )}
              </button>
            </form>

            <div className="chat-disclaimer">
              <ShieldCheck size={14} />

              <span>
                {isArabic
                  ? "يقدم AmanAI معلومات صحية تثقيفية ولا يحل محل الاستشارة الطبية المتخصصة."
                  : "AmanAI provides informational healthcare responses and does not replace professional medical advice."}
              </span>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
  
}

export default Chat;