#!/usr/bin/env bash
# Durcissement d'un VPS IONOS Ubuntu 24.04 neuf, dédié à VilleConnect.
# À lancer UNE fois, en root, APRÈS avoir copié votre clé SSH publique :
#   ssh-copy-id root@IP_DU_SERVEUR
#   ssh root@IP_DU_SERVEUR 'bash -s' < deploy/ionos/harden-server.sh
set -euo pipefail

DEPLOY_USER=${DEPLOY_USER:-villeconnect}

if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "Aucune clé SSH dans /root/.ssh/authorized_keys : arrêt (sinon vous seriez enfermé dehors)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get -y -q upgrade
apt-get -y -q install ufw fail2ban unattended-upgrades git curl ca-certificates

# Mises à jour de sécurité automatiques
dpkg-reconfigure -f noninteractive unattended-upgrades

# Utilisateur d'exploitation (connexion par clé uniquement)
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh && chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
usermod -aG sudo "$DEPLOY_USER"
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-$DEPLOY_USER

# SSH : plus de mot de passe, plus de root
cat > /etc/ssh/sshd_config.d/90-villeconnect.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
CONF
sshd -t && systemctl reload ssh

# Pare-feu : seulement SSH et le web
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Bannissement automatique des tentatives SSH répétées
cat > /etc/fail2ban/jail.d/sshd.local <<'CONF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
CONF
systemctl enable --now fail2ban

# Docker
if ! command -v docker >/dev/null; then curl -fsSL https://get.docker.com | sh; fi
usermod -aG docker "$DEPLOY_USER"
cat > /etc/docker/daemon.json <<'CONF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" },
  "live-restore": true
}
CONF
systemctl restart docker

# Mémoire d'appoint (évite un arrêt brutal si la RAM est pleine)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

timedatectl set-timezone UTC
echo
echo "Terminé. Reconnectez-vous désormais avec : ssh $DEPLOY_USER@<IP_DU_SERVEUR>"
echo "La connexion root et les mots de passe SSH sont désactivés."
