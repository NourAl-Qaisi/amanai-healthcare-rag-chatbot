from getpass import getpass

from backend.auth import (
    get_connection,
    hash_password
)


# =========================
# Admin Information
# =========================

username = "admin"
email = "admin@amanai.com"


# =========================
# Admin Password
# =========================

password = getpass("Enter admin password: ")


# =========================
# Database
# =========================

connection = get_connection()
cursor = connection.cursor()


try:

    # Check if admin email already exists
    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE email = ?
        """,
        (email,)
    )

    existing_user = cursor.fetchone()


    # =========================
    # If account already exists
    # =========================

    if existing_user:

        user_id = existing_user[0]

        cursor.execute(
            """
            UPDATE users
            SET
                username = ?,
                password_hash = ?,
                role = ?
            WHERE id = ?
            """,
            (
                username,
                hash_password(password),
                "admin",
                user_id
            )
        )

        connection.commit()

        print("===================================")
        print("Admin account updated successfully!")
        print("Email:", email)
        print("Role: admin")
        print("===================================")


    # =========================
    # If account doesn't exist
    # =========================

    else:

        password_hash = hash_password(password)

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
                "admin"
            )
        )

        connection.commit()

        print("===================================")
        print("Admin account created successfully!")
        print("Email:", email)
        print("Role: admin")
        print("===================================")


except Exception as error:

    print("===================================")
    print("Could not create/update admin account.")
    print("Reason:", error)
    print("===================================")


finally:

    connection.close()