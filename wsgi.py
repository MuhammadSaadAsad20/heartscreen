"""
WSGI entry point for production servers (gunicorn).

Usage:  gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 1 --threads 4
"""
from web.server import app  # noqa: F401

if __name__ == "__main__":
    import os
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
