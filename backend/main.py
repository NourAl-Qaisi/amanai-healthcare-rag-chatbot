from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field

import os
import shutil
import sqlite3
import json
import pandas as pd
from backend.llm import generate_answer
from backend.intent import classify_intent
from datetime import datetime, timedelta

from jose import jwt

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from backend.rag import (
    search_documents,
    rebuild_vector_store
)


from backend.auth import (
    create_users_table,
    create_chat_history_tables,
    get_connection,
    hash_password,
    verify_password,
    get_user_by_email
)


# =========================================================
# APP CONFIGURATION
# =========================================================

app = FastAPI(
    title="AmanAI Healthcare Chatbot",
    description="Healthcare RAG Chatbot",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# JWT CONFIGURATION
# =========================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "change-this-secret-key"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


# =========================================================
# DATABASE
# =========================================================

DATABASE = "backend/users.db"


def safe_value(value):
    """Convert pandas/NumPy NaN values to JSON-safe strings."""
    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass

    return value
def is_arabic(text: str) -> bool:
    """Return True when the text contains Arabic characters."""
    return any(
        "\u0600" <= char <= "\u06FF"
        for char in text
    )


# Create database tables when backend starts

create_users_table()

create_chat_history_tables()


# =========================================================
# PYDANTIC MODELS
# =========================================================

class SignupRequest(BaseModel):

    username: str
    email: str
    password: str


class LoginRequest(BaseModel):

    email: str
    password: str


class MessageRequest(BaseModel):

    user_message: str
    assistant_message: str
    sources: list = Field(default_factory=list)


# =========================================================
# JWT FUNCTIONS
# =========================================================

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None
):

    to_encode = data.copy()

    if expires_delta:

        expire = datetime.utcnow() + expires_delta

    else:

        expire = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# =========================================================
# GET CURRENT USER
# =========================================================

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security
    )
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")
        email = payload.get("email")
        role = payload.get("role")

        if user_id is None or email is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token."
            )

        return {
            "id": user_id,
            "email": email,
            "role": role
        }

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )


# =========================================================
# ADMIN AUTHORIZATION
# =========================================================

def get_current_admin(
    current_user: dict = Depends(
        get_current_user
    )
):

    if current_user.get("role") != "admin":

        raise HTTPException(
            status_code=403,
            detail="Admin access required."
        )

    return current_user


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():

    return {
        "message": "AmanAI Healthcare Chatbot API is running.",
        "status": "success"
    }


# =========================================================
# SIGN UP
# =========================================================

@app.post("/signup")
def signup(
    request: SignupRequest
):

    username = request.username.strip()

    email = request.email.strip().lower()

    password = request.password


    # -----------------------------------------------------
    # Validate username
    # -----------------------------------------------------

    if not username:

        raise HTTPException(
            status_code=400,
            detail="Username is required."
        )


    # -----------------------------------------------------
    # Validate email
    # -----------------------------------------------------

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Email is required."
        )


    # -----------------------------------------------------
    # Validate password
    # -----------------------------------------------------

    if not password:

        raise HTTPException(
            status_code=400,
            detail="Password is required."
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )


    # -----------------------------------------------------
    # Check if user already exists
    # -----------------------------------------------------

    existing_user = get_user_by_email(
        email
    )


    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )


    # -----------------------------------------------------
    # Hash password
    # -----------------------------------------------------

    password_hash = hash_password(
        password
    )


    # -----------------------------------------------------
    # Create database connection
    # -----------------------------------------------------

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    try:

        cursor.execute(
            """
            INSERT INTO users
            (
                username,
                email,
                password_hash,
                role
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                username,
                email,
                password_hash,
                "user"
            )
        )

        connection.commit()


    except sqlite3.IntegrityError:

        connection.close()

        raise HTTPException(
            status_code=400,
            detail="Username or email already exists."
        )


    connection.close()


    return {
        "message": "Account created successfully.",
        "username": username,
        "email": email
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/login")
def login(
    request: LoginRequest
):

    email = request.email.strip().lower()

    password = request.password


    # -----------------------------------------------------
    # Find user
    # -----------------------------------------------------

    user = get_user_by_email(
        email
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    # -----------------------------------------------------
    # Get user information
    # -----------------------------------------------------

    user_id = user[0]

    username = user[1]

    user_email = user[2]

    password_hash = user[3]

    role = user[4]


    # -----------------------------------------------------
    # Verify password
    # -----------------------------------------------------

    if not verify_password(
        password,
        password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )


    # -----------------------------------------------------
    # Create access token
    # -----------------------------------------------------

    access_token = create_access_token(
        {
            "user_id": user_id,
            "username": username,
            "email": user_email,
            "role": role
        }
    )


    return {
        "access_token": access_token,

        "token_type": "bearer",

        "user": {
            "id": user_id,
            "username": username,
            "email": user_email,
            "role": role
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/me")
def get_me(
    current_user: dict = Depends(
        get_current_user
    )
):

    return {
        "user": current_user
    }


# =========================================================
# SEARCH ENDPOINT
# =========================================================

@app.get("/search")
def search(
    query: str,
    top_k: int = 3,
    current_user: dict = Depends(
        get_current_user
    )
):

    # -----------------------------------------------------
    # Validate query
    # -----------------------------------------------------

    if not query.strip():

        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty."
        )


    # -----------------------------------------------------
    # Search FAISS
    # -----------------------------------------------------

    results = search_documents(
        query,
        top_k
    )


    # -----------------------------------------------------
    # Format results
    # -----------------------------------------------------

    formatted_results = []


    for result in results:

        document = result["document"]


        formatted_results.append(
            {
                "score": safe_value(result["score"]),

                "title": safe_value(document.get(
                    "title",
                    ""
                )),

                "content": safe_value(document.get(
                    "content_text",
                    ""
                )),

                "symptoms": safe_value(document.get(
                    "symptoms",
                    ""
                )),

                "treatments": safe_value(document.get(
                    "treatments",
                    ""
                )),

                "risk_factors": safe_value(document.get(
                    "risk_factors",
                    ""
                )),

                "prevention": safe_value(document.get(
                    "prevention",
                    ""
                ))
            }
        )


    return {
        "query": query,
        "results": formatted_results
    }

# =========================================================
# CONVERSATION-AWARE QUERY / SMART QUERY REWRITING
# =========================================================

def is_follow_up_question(text: str) -> bool:
    """Return True when the current question depends on earlier context."""
    normalized = text.lower().strip()

    follow_up_phrases = [
        "it",
        "this",
        "that",
        "they",
        "them",
        "he",
        "she",
        "its",
        "how is it",
        "how is this",
        "how is that",
        "how is it treated",
        "how is this treated",
        "what about treatment",
        "what about it",
        "and treatment",
        "and how is it treated",
        "what about symptoms",
        "what about causes",
        "what about prevention",
        "كيف يتم علاجه",
        "كيف يتم علاجها",
        "شو علاجه",
        "شو علاجها",
        "ما علاجه",
        "ما علاجها",
        "وكيف يتم علاجه",
        "وكيف يتم علاجها",
        "طيب وكيف",
        "طيب شو علاجه",
        "طيب شو علاجها",
        "وماذا عن العلاج",
        "وماذا عن علاجه",
        "وماذا عن علاجها",
    ]

    return any(phrase in normalized for phrase in follow_up_phrases)


def get_recent_user_questions(
    conversation_id: int | None,
    current_user: dict,
    limit: int = 6,
) -> list[str]:
    """Return recent user messages for a conversation owned by the current user."""
    if not conversation_id:
        return []

    connection = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM conversations
            WHERE id = ?
            AND user_id = ?
            """,
            (conversation_id, current_user["id"]),
        )

        if not cursor.fetchone():
            return []

        cursor.execute(
            """
            SELECT content
            FROM messages
            WHERE conversation_id = ?
            AND role = 'user'
            ORDER BY id DESC
            LIMIT ?
            """,
            (conversation_id, limit),
        )

        rows = cursor.fetchall()
        rows.reverse()

        return [
            row[0].strip()
            for row in rows
            if row[0] and row[0].strip()
        ]

    except Exception as error:
        print("Conversation context error:", error)
        return []

    finally:
        if connection:
            connection.close()


def get_recent_healthcare_question(
    conversation_id: int | None,
    current_user: dict,
    limit: int = 8,
) -> str | None:
    """
    Return the most recent previous question that is classified as healthcare.

    This prevents greetings, thanks, or out-of-domain messages from becoming
    the topic anchor for a healthcare follow-up question.
    """
    previous_questions = get_recent_user_questions(
        conversation_id,
        current_user,
        limit=limit,
    )

    for previous_question in reversed(previous_questions):
        try:
            if classify_intent(previous_question) == "healthcare":
                return previous_question
        except Exception:
            continue

    return None


def build_contextual_query(
    current_query: str,
    conversation_id: int | None,
    current_user: dict,
) -> str:
    """
    Add the most recent healthcare question to a genuine follow-up query.

    Example:
        Previous: What are the symptoms of migraine?
        Current:  How is it treated?
        Search:   How is it treated?
                  Previous healthcare question: What are the symptoms of migraine?
    """
    if not conversation_id:
        return current_query

    if not is_follow_up_question(current_query):
        return current_query

    previous_question = get_recent_healthcare_question(
        conversation_id,
        current_user,
    )

    if not previous_question:
        return current_query

    rewritten_query = (
        f"{current_query}\n\n"
        f"Previous healthcare question: {previous_question}"
    )

    return rewritten_query

def intent_response(query, arabic_text, english_text):
    return arabic_text if is_arabic(query) else english_text
# =========================================================
# CHAT / RAG ENDPOINT
# =========================================================

@app.get("/chat")
def chat(
    query: str,
    top_k: int = 3,
    conversation_id: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Process a healthcare question through intent handling, RAG, and Gemini."""
    query = query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    top_k = max(1, min(top_k, 10))

    # Build context for follow-up questions.
    contextual_query = build_contextual_query(
        current_query=query,
        conversation_id=conversation_id,
        current_user=current_user,
    )

    # Classify the current question.
    intent = classify_intent(query)

    # A question like "How is it treated?" is incomplete by itself,
    # but becomes a valid healthcare question when it follows a
    # healthcare question in the same conversation.
    if (
        intent == "clarification"
        and conversation_id
        and is_follow_up_question(query)
        and get_recent_healthcare_question(
            conversation_id,
            current_user,
        )
    ):
        intent = "healthcare"

    # -----------------------------------------------------
    # Intent Responses - always match the user's language
    # -----------------------------------------------------

    if intent == "greeting":
        answer = intent_response(
            query,
            "أهلًا وسهلًا! 👋 كيف يمكنني مساعدتك في سؤال صحي اليوم؟ 🩺",
            "Hello! 👋 How can I help you with a healthcare question today?",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "small_talk":
        answer = intent_response(
            query,
            "أنا بخير، شكرًا لسؤالك! 😊 كيف يمكنني مساعدتك اليوم؟ 🩺",
            "I'm doing great, thank you for asking! 😊 How can I help you today? 🩺",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "gratitude":
        answer = intent_response(
            query,
            "العفو! ❤️ أنا سعيدة بمساعدتك. 🩺",
            "You're very welcome! ❤️ I'm happy to help.",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "goodbye":
        answer = intent_response(
            query,
            "مع السلامة! 👋 ديري بالك على حالك. ❤️",
            "Goodbye! 👋 Take care! ❤️",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "identity":
        answer = intent_response(
            query,
            "أنا AmanAI 🤖، مساعد ذكاء اصطناعي متخصص بالمعلومات الصحية. أقدّم معلومات صحية اعتمادًا على قاعدة المعرفة المستخدمة في هذا المشروع.",
            "I'm AmanAI 🤖, a healthcare-focused AI assistant. I provide healthcare information based on the knowledge base used by this project.",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "capabilities":
        answer = intent_response(
            query,
            "أستطيع مساعدتك في فهم المواضيع الصحية، والأعراض، والعلاجات، وعوامل الخطورة، وطرق الوقاية، اعتمادًا على قاعدة المعرفة الصحية. 🩺",
            "I can help you understand healthcare topics, symptoms, treatments, risk factors, and prevention using the healthcare knowledge base. 🩺",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "clarification":
        answer = intent_response(
            query,
            "أكيد! 😊 ممكن توضحي أكثر شو المعلومة الصحية اللي بدك تعرفي عنها؟ مثلاً: الأعراض، الأسباب، العلاج، أو طرق الوقاية.",
            "Of course! 😊 Could you clarify what healthcare information you would like to know about? For example: symptoms, causes, treatment, or prevention.",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "out_of_domain":
        answer = intent_response(
            query,
            "آسف، أستطيع المساعدة فقط في الأسئلة المتعلقة بالرعاية الصحية والمعلومات الطبية. 🩺",
            "I'm sorry, but I can only help with healthcare-related questions and medical information. 🩺",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "prompt_injection":
        answer = intent_response(
            query,
            "لا أستطيع تنفيذ تعليمات تهدف إلى تجاوز قواعد الأمان أو تعليمات النظام. 🔐",
            "I can't follow instructions that attempt to override my safety rules or system instructions. 🔐",
        )
        return {"query": query, "answer": answer, "sources": []}

    if intent == "emergency":
        answer = intent_response(
            query,
            "قد تكون هذه حالة طبية طارئة. 🚨 يرجى طلب الرعاية الطبية الفورية أو الاتصال بخدمات الطوارئ المحلية. لا تعتمدي على هذا المساعد في حالات الطوارئ.",
            "This may be a medical emergency. 🚨 Please seek immediate medical attention or contact your local emergency services. Do not rely on this chatbot for emergency care.",
        )
        return {"query": query, "answer": answer, "sources": []}

    # -----------------------------------------------------
    # Retrieve documents from FAISS
    # -----------------------------------------------------
    results = search_documents(
        contextual_query,
        top_k,
    )

    MIN_RELEVANCE_SCORE = 0.55

    relevant_results = [
        result
        for result in results
        if result["score"] >= MIN_RELEVANCE_SCORE
    ]

    # -----------------------------------------------------
    # No relevant documents
    # -----------------------------------------------------
    if not relevant_results:
        if any("؀" <= char <= "ۿ" for char in query):
            answer = (
                "آسف، لم أتمكن من العثور على معلومات كافية "
                "وموثوقة في قاعدة المعرفة الصحية للإجابة عن "
                "سؤالك بشكل موثوق. يمكنك إعادة صياغة السؤال "
                "أو طرح سؤال صحي آخر. 🩺"
            )
        else:
            answer = (
                "I'm sorry, but I couldn't find enough relevant "
                "information in my healthcare knowledge base "
                "to answer this question reliably."
            )

        return {
            "query": query,
            "answer": answer,
            "sources": [],
        }

    # -----------------------------------------------------
    # Build RAG context
    # -----------------------------------------------------
    context_parts = []

    for result in relevant_results:
        document = result["document"]

        context_parts.append(
            f"""
Title:
{safe_value(document.get("title", ""))}

Category:
{safe_value(document.get("category", ""))}

Document Type:
{safe_value(document.get("document_type", ""))}

Content:
{safe_value(document.get("content_text", ""))}

Symptoms:
{safe_value(document.get("symptoms", ""))}

Treatments:
{safe_value(document.get("treatments", ""))}

Risk Factors:
{safe_value(document.get("risk_factors", ""))}

Prevention:
{safe_value(document.get("prevention", ""))}

Common Age Group:
{safe_value(document.get("common_age_group", ""))}

Severity Level:
{safe_value(document.get("severity_level", ""))}

Chronic:
{safe_value(document.get("is_chronic", ""))}

Contagious:
{safe_value(document.get("is_contagious", ""))}

Target Audience:
{safe_value(document.get("target_audience", ""))}

Evidence Level:
{safe_value(document.get("evidence_level", ""))}
"""
        )

    context = "\n\n".join(context_parts)

    # -----------------------------------------------------
    # Generate answer using Gemini
    # -----------------------------------------------------
    answer = generate_answer(
        query,
        context,
    )

    # -----------------------------------------------------
    # Sources
    # -----------------------------------------------------
    sources = [
        {
            "title": safe_value(
                result["document"].get(
                    "title",
                    "Healthcare Document",
                )
            ),
            "score": round(float(result["score"]), 3),
        }
        for result in relevant_results
    ]

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
    }

# =========================================================
# CHAT HISTORY
# =========================================================


# ---------------------------------------------------------
# Create New Conversation
# ---------------------------------------------------------

@app.post("/conversations")
def create_conversation(
    current_user: dict = Depends(
        get_current_user
    )
):

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()

    now = datetime.utcnow().isoformat()


    cursor.execute(
        """
        INSERT INTO conversations
        (
            user_id,
            title,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            current_user["id"],
            "New Conversation",
            now,
            now
        )
    )


    conversation_id = cursor.lastrowid

    connection.commit()

    connection.close()


    return {
        "id": conversation_id,
        "title": "New Conversation",
        "created_at": now,
        "updated_at": now
    }


# ---------------------------------------------------------
# Get User Conversations
# ---------------------------------------------------------

@app.get("/conversations")
def get_conversations(
    current_user: dict = Depends(
        get_current_user
    )
):

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            title,
            created_at,
            updated_at
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
        """,
        (
            current_user["id"],
        )
    )


    rows = cursor.fetchall()

    connection.close()


    conversations = []


    for row in rows:

        conversations.append(
            {
                "id": row[0],
                "title": row[1],
                "created_at": row[2],
                "updated_at": row[3]
            }
        )


    return {
        "conversations": conversations
    }


# ---------------------------------------------------------
# Save Messages To Conversation
# ---------------------------------------------------------

@app.post(
    "/conversations/{conversation_id}/messages"
)
def add_messages_to_conversation(
    conversation_id: int,
    request: MessageRequest,
    current_user: dict = Depends(
        get_current_user
    )
):

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    # -----------------------------------------------------
    # Check conversation ownership
    # -----------------------------------------------------

    cursor.execute(
        """
        SELECT
            id,
            title
        FROM conversations
        WHERE id = ?
        AND user_id = ?
        """,
        (
            conversation_id,
            current_user["id"]
        )
    )


    conversation = cursor.fetchone()


    if not conversation:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )


    now = datetime.utcnow().isoformat()


    # -----------------------------------------------------
    # Save user message
    # -----------------------------------------------------

    cursor.execute(
        """
        INSERT INTO messages
        (
            conversation_id,
            role,
            content,
            sources,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            conversation_id,
            "user",
            request.user_message,
            None,
            now
        )
    )


    # -----------------------------------------------------
    # Save assistant message
    # -----------------------------------------------------

    sources_json = json.dumps(
        request.sources,
        ensure_ascii=False
    )


    cursor.execute(
        """
        INSERT INTO messages
        (
            conversation_id,
            role,
            content,
            sources,
            created_at
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            conversation_id,
            "assistant",
            request.assistant_message,
            sources_json,
            now
        )
    )


    # -----------------------------------------------------
    # Update conversation title
    # -----------------------------------------------------

    current_title = conversation[1]


    if current_title == "New Conversation":

        title = request.user_message.strip()


        if len(title) > 50:

            title = title[:50] + "..."


        if not title:

            title = "New Conversation"


        cursor.execute(
            """
            UPDATE conversations
            SET
                title = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                title,
                now,
                conversation_id
            )
        )


    else:

        cursor.execute(
            """
            UPDATE conversations
            SET updated_at = ?
            WHERE id = ?
            """,
            (
                now,
                conversation_id
            )
        )


    connection.commit()

    connection.close()


    return {
        "message": "Messages saved successfully.",
        "conversation_id": conversation_id
    }


# ---------------------------------------------------------
# Get Conversation With Messages
# ---------------------------------------------------------

@app.get(
    "/conversations/{conversation_id}"
)
def get_conversation(
    conversation_id: int,
    current_user: dict = Depends(
        get_current_user
    )
):

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    # -----------------------------------------------------
    # Check conversation ownership
    # -----------------------------------------------------

    cursor.execute(
        """
        SELECT
            id,
            title,
            created_at,
            updated_at
        FROM conversations
        WHERE id = ?
        AND user_id = ?
        """,
        (
            conversation_id,
            current_user["id"]
        )
    )


    conversation = cursor.fetchone()


    if not conversation:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )


    # -----------------------------------------------------
    # Get messages
    # -----------------------------------------------------

    cursor.execute(
        """
        SELECT
            id,
            role,
            content,
            sources,
            created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY id ASC
        """,
        (
            conversation_id,
        )
    )


    rows = cursor.fetchall()

    connection.close()


    messages = []


    for row in rows:

        sources = []


        if row[3]:

            try:

                sources = json.loads(
                    row[3]
                )

            except json.JSONDecodeError:

                sources = []


        messages.append(
            {
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "sources": sources,
                "created_at": row[4]
            }
        )


    return {
        "conversation": {
            "id": conversation[0],
            "title": conversation[1],
            "created_at": conversation[2],
            "updated_at": conversation[3]
        },

        "messages": messages
    }


# ---------------------------------------------------------
# Delete Conversation
# ---------------------------------------------------------

@app.delete(
    "/conversations/{conversation_id}"
)
def delete_conversation(
    conversation_id: int,
    current_user: dict = Depends(
        get_current_user
    )
):

    connection = sqlite3.connect(
        DATABASE
    )

    cursor = connection.cursor()


    # -----------------------------------------------------
    # Check conversation ownership
    # -----------------------------------------------------

    cursor.execute(
        """
        SELECT id
        FROM conversations
        WHERE id = ?
        AND user_id = ?
        """,
        (
            conversation_id,
            current_user["id"]
        )
    )


    conversation = cursor.fetchone()


    if not conversation:

        connection.close()

        raise HTTPException(
            status_code=404,
            detail="Conversation not found."
        )


    # -----------------------------------------------------
    # Delete messages
    # -----------------------------------------------------

    cursor.execute(
        """
        DELETE FROM messages
        WHERE conversation_id = ?
        """,
        (
            conversation_id,
        )
    )


    # -----------------------------------------------------
    # Delete conversation
    # -----------------------------------------------------

    cursor.execute(
        """
        DELETE FROM conversations
        WHERE id = ?
        AND user_id = ?
        """,
        (
            conversation_id,
            current_user["id"]
        )
    )


    connection.commit()

    connection.close()


    return {
        "message": "Conversation deleted successfully."
    }


# =========================================================
# ADMIN ENDPOINT
# =========================================================

@app.get("/admin")
def admin_dashboard(
    current_admin: dict = Depends(
        get_current_admin
    )
):

    return {
        "message": "Welcome to the admin dashboard.",
        "user": current_admin
    }


# =========================================================
# UPLOAD HEALTHCARE DATASET
# =========================================================

@app.post("/upload_dataset")
def upload_dataset(
    file: UploadFile = File(...),
    current_admin: dict = Depends(
        get_current_admin
    )
):

    # -----------------------------------------------------
    # Validate file
    # -----------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed."
        )

    # -----------------------------------------------------
    # Create upload directory
    # -----------------------------------------------------

    upload_directory = "data/raw"

    os.makedirs(
        upload_directory,
        exist_ok=True
    )

    # -----------------------------------------------------
    # Save uploaded dataset
    # -----------------------------------------------------

    uploaded_file_path = os.path.join(
        upload_directory,
        "uploaded_healthcare_dataset.csv"
    )

    try:
        with open(
            uploaded_file_path,
            "wb"
        ) as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save dataset: {str(error)}"
        )

    # -----------------------------------------------------
    # Read uploaded CSV
    # -----------------------------------------------------

    try:
        uploaded_df = pd.read_csv(
            uploaded_file_path
        )
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read CSV file: {str(error)}"
        )

    # -----------------------------------------------------
    # Prepare uploaded dataset
    # -----------------------------------------------------

    try:

        # =================================================
        # Arabic Alternative Medicine Dataset
        # =================================================

        alternative_columns = [
            "Question Title",
            "Question",
            "Answer",
            "Doctor Name",
            "Consultation Number",
            "Date of Answer",
            "Hierarchical Diagnosis"
        ]

        if all(
            column in uploaded_df.columns
            for column in alternative_columns
        ):

            # -------------------------------------------------
            # Rename columns
            # -------------------------------------------------

            uploaded_df = uploaded_df.rename(
                columns={
                    "Question Title": "title",
                    "Question": "question",
                    "Answer": "answer",
                    "Doctor Name": "source_name",
                    "Consultation Number": "consultation_number",
                    "Date of Answer": "last_updated",
                    "Hierarchical Diagnosis": "category"
                }
            )

            # -------------------------------------------------
            # Create RAG content
            # -------------------------------------------------

            uploaded_df["content_text"] = (
                "Question:\n"
                + uploaded_df["question"]
                    .fillna("")
                    .astype(str)
                + "\n\nAnswer:\n"
                + uploaded_df["answer"]
                    .fillna("")
                    .astype(str)
            )

            # -------------------------------------------------
            # Add missing healthcare fields
            # -------------------------------------------------

            uploaded_df["doc_id"] = (
                "arabic_healthcare_"
                + uploaded_df.index.astype(str)
            )

            uploaded_df["document_type"] = "Healthcare Q&A"
            uploaded_df["symptoms"] = ""

            uploaded_df["treatments"] = (
                uploaded_df["answer"]
                .fillna("")
                .astype(str)
            )

            uploaded_df["risk_factors"] = ""
            uploaded_df["prevention"] = ""
            uploaded_df["common_age_group"] = ""
            uploaded_df["severity_level"] = ""
            uploaded_df["is_chronic"] = ""
            uploaded_df["is_contagious"] = ""
            uploaded_df["target_audience"] = "General public"
            uploaded_df["language"] = "ar"
            uploaded_df["source_url"] = ""
            uploaded_df["evidence_level"] = ""
            uploaded_df["review_status"] = "Uploaded"

            uploaded_df["word_count"] = (
                uploaded_df["content_text"]
                .str.split()
                .str.len()
            )

            uploaded_df["reading_level_score"] = ""

        # =================================================
        # Existing Healthcare Dataset Format
        # =================================================

        elif "content_text" in uploaded_df.columns:

            if "language" not in uploaded_df.columns:
                uploaded_df["language"] = "en"

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported dataset format. "
                    "The CSV must contain either the "
                    "existing healthcare schema or the "
                    "Alternative Medicine dataset columns."
                )
            )

        # -------------------------------------------------
        # Load original healthcare dataset
        # -------------------------------------------------

        base_dataset_path = os.path.join(
            upload_directory,
            "healthcare_rag_dataset.csv"
        )

        if not os.path.exists(
            base_dataset_path
        ):
            raise HTTPException(
                status_code=404,
                detail=(
                    "Original healthcare dataset was not found."
                )
            )

        base_df = pd.read_csv(
            base_dataset_path
        )

        # -------------------------------------------------
        # Align columns
        # -------------------------------------------------

        all_columns = list(
            dict.fromkeys(
                list(base_df.columns)
                + list(uploaded_df.columns)
            )
        )

        for column in all_columns:

            if column not in base_df.columns:
                base_df[column] = ""

            if column not in uploaded_df.columns:
                uploaded_df[column] = ""

        base_df = base_df[all_columns]
        uploaded_df = uploaded_df[all_columns]

        # -------------------------------------------------
        # Merge datasets
        # -------------------------------------------------

        combined_df = pd.concat(
            [
                base_df,
                uploaded_df
            ],
            ignore_index=True
        )

        # -------------------------------------------------
        # Remove duplicate documents
        # -------------------------------------------------

        if "content_text" in combined_df.columns:
            combined_df = combined_df.drop_duplicates(
                subset=["content_text"],
                keep="first"
            )

        # -------------------------------------------------
        # Save combined knowledge base
        # -------------------------------------------------

        combined_dataset_path = os.path.join(
            upload_directory,
            "healthcare_combined.csv"
        )

        combined_df.to_csv(
            combined_dataset_path,
            index=False,
            encoding="utf-8-sig"
        )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to prepare dataset: "
                + str(error)
            )
        )

    # -----------------------------------------------------
    # Rebuild FAISS Vector Store
    # -----------------------------------------------------

    try:

        result = rebuild_vector_store(
            combined_dataset_path
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to rebuild vector store: "
                + str(error)
            )
        )

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "message": (
            "Dataset uploaded and merged "
            "successfully."
        ),
        "filename": file.filename,
        "uploaded_documents": len(uploaded_df),
        "total_documents": result["documents"],
        "embedding_dimension": result["embedding_dimension"]
    }
# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.get("/admin/dashboard")
def admin_dashboard(
    current_admin: dict = Depends(get_current_admin)
):

    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    try:

        # =================================================
        # STATISTICS
        # =================================================

        # Total normal users
        cursor.execute("""
            SELECT COUNT(*) AS total_users
            FROM users
            WHERE role = 'user'
        """)

        total_users = (
            cursor.fetchone()["total_users"]
        )


        # Total admins
        cursor.execute("""
            SELECT COUNT(*) AS total_admins
            FROM users
            WHERE role = 'admin'
        """)

        total_admins = (
            cursor.fetchone()["total_admins"]
        )


        # Total conversations
        cursor.execute("""
            SELECT COUNT(*) AS total_conversations
            FROM conversations
        """)

        total_conversations = (
            cursor.fetchone()["total_conversations"]
        )


        # Total questions
        cursor.execute("""
            SELECT COUNT(*) AS total_questions
            FROM messages
            WHERE role = 'user'
        """)

        total_questions = (
            cursor.fetchone()["total_questions"]
        )


        # =================================================
        # QUESTIONS PER DAY
        # =================================================

        cursor.execute("""
            SELECT
                DATE(created_at) AS date,
                COUNT(*) AS count
            FROM messages
            WHERE role = 'user'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 7
        """)

        activity = [
            {
                "date": row["date"],
                "count": row["count"]
            }
            for row in cursor.fetchall()
        ]


        # =================================================
        # KNOWLEDGE BASE
        # =================================================

        documents_count = 0
        categories_count = 0

        documents_path = (
            "backend/vector_store/documents.pkl"
        )

        if os.path.exists(
            documents_path
        ):

            import pickle

            with open(
                documents_path,
                "rb"
            ) as file:

                documents = pickle.load(file)

            documents_count = len(
                documents
            )

            categories = set()

            for document in documents:

                category = document.get(
                    "category"
                )

                if category:

                    categories.add(
                        str(category).strip()
                    )

            categories_count = len(
                categories
            )


        # =================================================
        # SYSTEM STATUS
        # =================================================

        system_status = {

            "database":
                os.path.exists(
                    DATABASE
                ),

            "rag":
                os.path.exists(
                    "backend/vector_store/healthcare.index"
                ),

            "knowledge_base":
                documents_count > 0,

            "authentication":
                True
        }


        # =================================================
        # RESPONSE
        # =================================================

        return {

            "stats": {

                "total_users":
                    total_users,

                "total_admins":
                    total_admins,

                "total_conversations":
                    total_conversations,

                "total_questions":
                    total_questions
            },

            "activity":
                activity,

            "knowledge_base": {

                "documents":
                    documents_count,

                "categories":
                    categories_count
            },

            "system":
                system_status
        }


    finally:

        connection.close()
