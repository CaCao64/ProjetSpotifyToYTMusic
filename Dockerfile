FROM node:18-slim

# Installer Python 3, pip et curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Créer un lien symbolique pour appeler python3 via "python"
RUN ln -s /usr/bin/python3 /usr/bin/python

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json requirements.txt ./

# Installer les dépendances Node et Python
RUN npm ci --only=production
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Copier les fichiers du projet
COPY . .

# Configurer le port par défaut
ENV PORT=3000
EXPOSE 3000

# Lancer le serveur
CMD ["node", "server.js"]
