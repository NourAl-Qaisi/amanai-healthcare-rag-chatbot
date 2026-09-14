import sqlite3
import bcrypt


DATABASE = "backend/users.db"


# =========================
# Database Connection
# =========================

def get_connection():
    return sqlite3.connect(DATABASE)


# =========================
# Create Users Table
# =========================

def create_users_table():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    """)

    # Check if an older database is missing the role column
    cursor.execute("PRAGMA table_info(users)")

    columns = [
        column[1]
        for column in cursor.fetchall()
    ]

    if "role" not in columns:

        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
            """
        )

    connection.commit()
    connection.close()


# =========================
# Create Chat History Tables
# =========================

def create_chat_history_tables():

    connection = get_connection()
    cursor = connection.cursor()


    # -------------------------
    # Conversations
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,

            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
        )
    """)


    # -------------------------
    # Messages
    # -------------------------

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            created_at TEXT NOT NULL,

            FOREIGN KEY (conversation_id)
            REFERENCES conversations(id)
            ON DELETE CASCADE
        )
    """)


    connection.commit()
    connection.close()


# =========================
# Password Hashing
# =========================

def hash_password(password):

    password_bytes = password.encode(
        "utf-8"
    )

    salt = bcrypt.gensalt()

    hashed_password = bcrypt.hashpw(
        password_bytes,
        salt
    )

    return hashed_password.decode(
        "utf-8"
    )


# =========================
# Password Verification
# =========================

def verify_password(
    password,
    password_hash
):

    password_bytes = password.encode(
        "utf-8"
    )

    hashed_bytes = password_hash.encode(
        "utf-8"
    )

    return bcrypt.checkpw(
        password_bytes,
        hashed_bytes
    )


# =========================
# Get User By Email
# =========================

def get_user_by_email(email):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            username,
            email,
            password_hash,
            role
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    user = cursor.fetchone()

    connection.close()

    return user