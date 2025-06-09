def get_password_hash(password: str) -> str:
    # Minimal hash for testing; in production use passlib or bcrypt
    return "hashed-" + password
