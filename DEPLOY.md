# Deploying HeartScreen for free

The app is ready to deploy. Everything below is already set up:

- `wsgi.py` — production entry point (`gunicorn wsgi:app`)
- `requirements-deploy.txt` — slim, pinned dependencies (so the saved models load)
- `Procfile`, `render.yaml` — for Render
- `Dockerfile` — for Hugging Face Spaces (or any container host)
- The server binds to `0.0.0.0` and honours the `$PORT` env var

Pick **one** of the two free options below. **Render is the simplest** for a Flask app.
Both are free and need no credit card.

A local git repository has already been created and committed for you, so you only
need to push it to the host.

---

## Option A — Render (recommended)

You need: a free **GitHub** account and a free **Render** account (render.com).

1. **Create an empty repo on GitHub** (e.g. `heartscreen`). Don't add a README.
2. **Push this project to it** (run in the project folder):
   ```bash
   git remote add origin https://github.com/<your-username>/heartscreen.git
   git branch -M main
   git push -u origin main
   ```
3. Go to **render.com** → sign in with GitHub → **New + → Blueprint**.
4. Select your `heartscreen` repo. Render reads `render.yaml` automatically and
   configures the free web service. Click **Apply / Create**.
5. Wait for the build (~2–4 min). Render gives you a public URL like
   `https://heartscreen.onrender.com`.

> Free Render services sleep after 15 minutes of inactivity; the first visit after
> that takes ~50 seconds to wake up. Fine for a demo.

---

## Option B — Hugging Face Spaces (Docker)

You need: a free **Hugging Face** account (huggingface.co). No GitHub required.

1. On huggingface.co → **New → Space**. Name it `heartscreen`,
   choose **Docker → Blank**, visibility **Public**, hardware **CPU basic (free)**.
2. At the **top of `README.md`**, add this front-matter block (required by HF), then save:
   ```yaml
   ---
   title: HeartScreen
   sdk: docker
   app_port: 7860
   pinned: false
   ---
   ```
3. Push the project to the Space's git remote (HF shows the exact URL; it looks like
   `https://huggingface.co/spaces/<user>/heartscreen`):
   ```bash
   git remote add space https://huggingface.co/spaces/<user>/heartscreen
   git push space main
   ```
   When prompted for a password, paste a **Hugging Face access token**
   (Settings → Access Tokens → New token, role *write*).
4. HF builds the `Dockerfile` and runs it. Your app appears at
   `https://<user>-heartscreen.hf.space`.

---

## After deploying

- Test the live URL: open it, go to **Predict**, click **Load sample patient**, predict.
- The model-comparison **Dashboard** and **Explore** pages should load their charts.
- If a build fails, check the host's build logs — the most common cause is a Python
  version mismatch; this repo pins **Python 3.12** (`.python-version` / `render.yaml`).

## Local production test (optional)

`gunicorn` does not run on Windows. To test the production server, use the dev server:
```bash
py -3.12 web/server.py    # http://localhost:5000
```
On macOS/Linux you can run the exact production command:
```bash
gunicorn wsgi:app --bind 0.0.0.0:8000 --workers 1 --threads 4
```
