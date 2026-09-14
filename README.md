# AmanAI — Healthcare RAG Chatbot

AmanAI is a secure, domain-specific healthcare chatbot built using
Retrieval-Augmented Generation (RAG).

The system combines multilingual semantic search using Sentence Transformers
and FAISS with Google Gemini for response generation.



## 📌 Project Overview

AmanAI allows users to ask healthcare-related questions through a modern web
interface.

For healthcare questions, the system retrieves relevant information from a
custom healthcare knowledge base and uses Google Gemini to generate the final
response.

The chatbot is restricted to the healthcare domain and includes security
mechanisms to handle out-of-domain questions, prompt injection attempts, and
emergency-related requests.


## ✨ Features

- User Sign Up and Sign In
- JWT-based authentication
- Password hashing using bcrypt
- Role-based authorization
- Admin dashboard
- Healthcare dataset upload
- FAISS vector store rebuilding
- Arabic and English support
- Conversation history
- Follow-up questions
- New conversation
- Conversation deletion
- Prompt injection protection
- Out-of-domain request handling
- Emergency request handling


## 🏗️ System Architecture

```text
React Frontend
      ↓
FastAPI Backend
      ↓
Intent Detection
      ↓
Healthcare Question?
      ↓
Sentence Transformers
      ↓
FAISS Semantic Search
      ↓
Relevant Healthcare Documents
      ↓
Google Gemini
      ↓
Final Response
      ↓
React Frontend
```
Key Concept

FAISS handles retrieval, while Gemini handles generation.

🔄 RAG Pipeline

AmanAI uses a Retrieval-Augmented Generation architecture.

1. User Query

The user submits a healthcare question through the React frontend.

2. Intent Detection

The backend determines the type of request.

Supported intents include:

Greeting
Small Talk
Gratitude
Goodbye
Identity
Capabilities
Clarification
Healthcare
Out-of-Domain
Prompt Injection
Emergency
3. Embedding

Healthcare questions are converted into multilingual embeddings using:

paraphrase-multilingual-MiniLM-L12-v2

4. Retrieval

FAISS performs semantic similarity search against the healthcare knowledge
base and retrieves the most relevant documents.

5. Context

The retrieved documents are provided as healthcare context to the language
model.

6. Generation

Google Gemini generates the final response based on the retrieved context.

🌍 Arabic & English Support

AmanAI supports both Arabic and English.

The system retrieves information using multilingual embeddings and generates
the response in the same language as the user's question.

Arabic Question → Arabic Response

English Question → English Response

🔐 Security

The application includes several security mechanisms.

Authentication
JWT authentication
bcrypt password hashing
SQLite database
Token expiration
Authorization

The application supports two roles:

User
Admin

Administrative operations are protected by backend authorization.

Prompt Injection Protection

The chatbot detects prompt injection attempts and prevents users from
overriding the application's instructions.

Domain Restriction

The chatbot is restricted to healthcare-related requests.

Emergency Handling

Potential emergency requests are handled separately with safety-oriented
responses.

👤 User Features

Authenticated users can:

Create an account
Sign in
Ask healthcare questions
Receive Arabic or English responses
Continue conversations
View conversation history
Start a new conversation
Delete conversations
Log out
👑 Admin Features

Administrators can access the Admin Dashboard.

The dashboard allows administrators to:

Upload healthcare datasets
Process uploaded data
Rebuild the FAISS vector store
Update the chatbot knowledge base
Dataset Processing
CSV Dataset
    ↓
Data Processing
    ↓
Document Preparation
    ↓
Embeddings
    ↓
FAISS Index
    ↓
Updated Knowledge Base

🛠️ Tech Stack
Frontend
React
React Router
Vite
CSS
Lucide React
Backend
Python
FastAPI
Uvicorn
AI & RAG
Google Gemini
Sentence Transformers
FAISS
Retrieval-Augmented Generation
Data
Pandas
CSV
Pickle
Database & Security
SQLite
bcrypt
JWT
python-jose
📁 Project Structure
amanai-healthcare-rag-chatbot/
│
├── backend/
│   ├── auth.py
│   ├── create_admin.py
│   ├── intent.py
│   ├── llm.py
│   ├── main.py
│   └── rag.py
│
├── data/
│   ├── cleaned/
│   └── raw/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── AdminRoute.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       └── main.jsx
│
├── notebooks/
│   ├── 01_data_understanding.ipynb
│   └── 02_embeddings.ipynb
│
├── .gitignore
└── README.md
🧪 Testing

The application was tested across the main functional and security flows.

Testing included:

User Sign Up
User Sign In
English healthcare RAG
Arabic healthcare RAG
Intent detection
Out-of-domain requests
Prompt injection attempts
Emergency requests
Conversation history
New conversations
Conversation deletion
Admin authentication
User access restrictions
Admin dataset upload
Backend authorization
Multi-tab authentication
RTL / LTR interface behavior
🚀 Future Improvements
Automated testing with Pytest
API testing
Improved source citations
More healthcare datasets
Retrieval evaluation
Conversation summarization
Cloud deployment
Monitoring and analytics
⚠️ Medical Disclaimer

AmanAI is an educational software project and is not a replacement for
professional medical advice, diagnosis, or treatment.

Users should consult qualified healthcare professionals for medical decisions,
especially in emergency situations.

👩‍💻 Author

Nour Al-Qaisi

B.Sc. in Software Engineering

GitHub:
https://github.com/NourAl-Qaisi
